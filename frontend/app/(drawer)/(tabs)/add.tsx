import { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Colors } from "@/constants/Colors";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  useCreateJersey,
  useJerseys,
  useSports,
  useUpdateJersey,
} from "@/hooks/useJerseyHook";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import Toast from "react-native-toast-message";
import { searchClubs } from "@/services/football.service";
import { AntDesign } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { BRANDS } from "@/constants/Jerseys";
import { useDebounce } from "@/hooks/useDebounce";
import { useTranslation } from "react-i18next";

const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];
const JERSEY_TYPE_KEYS = [
  "HOME",
  "AWAY",
  "THIRD",
  "FOURTH",
  "SPECIAL",
  "GOALKEEPER",
  "TRAINING",
] as const;
const KIT_CONDITION_KEYS = [
  "NEW_WITH_TAGS",
  "EXCELLENT",
  "VERY_GOOD",
  "GOOD",
  "FAIR",
] as const;
const KIT_VERSION_KEYS = [
  "REPLICA",
  "AUTHENTIC",
  "PLAYER_ISSUE",
  "MATCH_WORN",
] as const;

// Internationalized Zod Schema
const getJerseySchema = (t: (key: string) => string) =>
  z.object({
    clubId: z.string().optional().nullable(),
    clubName: z
      .string()
      .min(2, { message: t("addJersey.validation.clubRequired") }),
    season: z
      .string()
      .min(4, { message: t("addJersey.validation.seasonRequired") }),
    size: z
      .string()
      .min(1, { message: t("addJersey.validation.sizeRequired") }),
    type: z
      .string()
      .min(1, { message: t("addJersey.validation.typeRequired") }),
    purchasePrice: z.number().optional().nullable(),
    isOfficial: z.boolean().default(true),
    playerName: z.string().optional(),
    number: z.string().optional(),
    frontImageUri: z
      .string()
      .min(1, { message: t("addJersey.validation.frontImageRequired") }),
    backImageUri: z.string().optional().nullable(),
    description: z.string().optional(),
    version: z
      .string()
      .min(1, { message: t("addJersey.validation.versionRequired") }),
    condition: z
      .string()
      .min(1, { message: t("addJersey.validation.conditionRequired") }),
    brand: z
      .string()
      .min(1, { message: t("addJersey.validation.brandRequired") }),
  });

type JerseyFormValues = z.infer<ReturnType<typeof getJerseySchema>>;

export default function TabAddScreen() {
  const { t } = useTranslation();
  const { jerseyId } = useLocalSearchParams<{ jerseyId?: string }>();
  const isEditing = !!jerseyId;

  // ==========================================
  //  DATA & EXTERNAL HOOKS (API, React Query)
  // ==========================================
  const { data: jerseys } = useJerseys();
  const { data: sports } = useSports();
  const { mutateAsync: createJersey, isPending: isCreating } =
    useCreateJersey();
  const { mutateAsync: updateJersey, isPending: isUpdating } =
    useUpdateJersey();
  const isPending = isCreating || isUpdating;

  const existingJersey = isEditing
    ? jerseys?.find((j) => j.id === jerseyId)
    : null;

  const footballSportId = sports?.find(
    (s: { name: string }) => s.name.toLowerCase() === "football",
  )?.id;

  // ==========================================
  //  LOCAL STATES (UI, Images, Search)
  // ==========================================
  const [frontImage, setFrontImage] = useState<string>("");
  const [backImage, setBackImage] = useState<string | null>(null);

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedSportId, setSelectedSportId] = useState<string>("");

  const [clubSearchInput, setClubSearchInput] = useState<string>("");
  const debouncedClubSearch = useDebounce(clubSearchInput, 500);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [isBrandDropdownVisible, setIsBrandDropdownVisible] = useState(false);

  // ==========================================
  // FORM (React Hook Form & Zod)
  // ==========================================
  const schema = useMemo(() => getJerseySchema(t), [t]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<JerseyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clubId: "",
      clubName: "",
      season: "",
      size: "",
      type: "",
      purchasePrice: null,
      isOfficial: true,
      playerName: "",
      number: undefined,
      frontImageUri: "",
      backImageUri: null,
      description: "",
      condition: "",
      version: "",
      brand: "",
    },
  });

  // ==========================================
  // EFFECTS MANAGEMENT (Side Effects & API Callbacks)
  // ==========================================

  // Synchronize default sport (Football)
  useEffect(() => {
    if (footballSportId) setSelectedSportId(footballSportId);
  }, [footballSportId]);

  // Load existing data in edit mode
  useEffect(() => {
    if (!existingJersey) return;

    reset({
      clubId: existingJersey.club?.id || "",
      clubName: existingJersey.club?.name || "",
      season: existingJersey.season || "",
      size: existingJersey.size || "",
      type: existingJersey.type || "",
      purchasePrice: existingJersey.purchasePrice ?? null,
      isOfficial: existingJersey.isOfficial ?? true,
      playerName: existingJersey.playerName || "",
      number: existingJersey.number ? String(existingJersey.number) : undefined,
      frontImageUri: existingJersey.frontImageUrl || "",
      backImageUri: existingJersey.backImageUrl || null,
      description: existingJersey.description || "",
      condition: existingJersey.condition || "",
      version: existingJersey.version || "",
      brand: existingJersey.brand || "",
    });

    setFrontImage(existingJersey.frontImageUrl || "");
    setBackImage(existingJersey.backImageUrl || null);
    setSelectedClubId(existingJersey.club?.id || "");
    if (existingJersey.sport?.id) setSelectedSportId(existingJersey.sport.id);
  }, [existingJersey]);

  // Reset form upon screen blur (if not editing)
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!isEditing) {
          reset();
          setFrontImage("");
          setBackImage(null);
          setSelectedClubId("");
          setClubSearchInput("");
          setSuggestions([]);
          setIsDropdownVisible(false);
          setIsBrandDropdownVisible(false);
        }
      };
    }, [isEditing]),
  );

  // Dynamic club search
  useFocusEffect(
    useCallback(() => {
      const fetchClubs = async () => {
        if (
          !selectedSportId ||
          !debouncedClubSearch ||
          debouncedClubSearch.trim().length < 3
        ) {
          setSuggestions([]);
          setIsDropdownVisible(false);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        try {
          const results = await searchClubs(
            debouncedClubSearch,
            selectedSportId,
          );
          setSuggestions(results);
          setIsDropdownVisible(results.length > 0);
        } catch (error) {
          console.error("Club search error", error);
          setSuggestions([]);
          setIsDropdownVisible(false);
        } finally {
          setIsLoading(false);
        }
      };
      fetchClubs();
    }, [debouncedClubSearch, selectedSportId]),
  );

  useEffect(() => {
    // if we arrive on the screen without a jerseyId (add mode), we reset the form to its default values to avoid any leftover data from previous edits
    if (!isEditing) {
      reset({
        clubId: "",
        clubName: "",
        season: "",
        size: "",
        type: "",
        purchasePrice: null,
        isOfficial: true,
        playerName: "",
        number: undefined,
        frontImageUri: "",
        backImageUri: null,
        description: "",
        condition: "",
        version: "",
        brand: "",
      });
      setFrontImage("");
      setBackImage(null);
      setSelectedClubId("");
      setClubSearchInput("");
    }
  }, [jerseyId]);

  // ==========================================
  // ACTION HANDLERS (Images & Submission)
  // ==========================================
  const isValidUuid = (value?: string | null) => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  };

  const applySelectedImage = (uri: string, target: "front" | "back") => {
    if (target === "front") {
      setFrontImage(uri);
      setValue("frontImageUri", uri, { shouldValidate: true });
    } else {
      setBackImage(uri);
      setValue("backImageUri", uri, { shouldValidate: true });
    }
  };

  const pickImage = async (target: "front" | "back") => {
    Alert.alert(
      t("addJersey.alerts.addImageTitle"),
      t("addJersey.alerts.addImageMessage"),
      [
        {
          text: t("addJersey.alerts.takePhoto"),
          onPress: async () => {
            const { status } =
              await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Toast.show({
                type: "error",
                text1: t("addJersey.alerts.cameraPermissionTitle"),
              });
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled)
              applySelectedImage(result.assets[0].uri, target);
          },
        },
        {
          text: t("addJersey.alerts.chooseGallery"),
          onPress: async () => {
            const { status } =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Toast.show({
                type: "error",
                text1: t("addJersey.alerts.galleryPermissionTitle"),
              });
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled)
              applySelectedImage(result.assets[0].uri, target);
          },
        },
        { text: t("addJersey.alerts.cancel"), style: "cancel" },
      ],
    );
  };

  const handleBrandSearch = (text: string) => {
    if (text.length >= 2) {
      const filtered = BRANDS.filter((brand) =>
        brand.toLowerCase().includes(text.toLowerCase()),
      );
      setBrandSuggestions(filtered);
      setIsBrandDropdownVisible(filtered.length > 0);
    } else {
      setBrandSuggestions([]);
      setIsBrandDropdownVisible(false);
    }
  };

  const onSubmit = async (data: JerseyFormValues) => {
    const formData = new FormData();

    if (selectedSportId) formData.append("sportId", selectedSportId);
    if (selectedClubId && isValidUuid(selectedClubId))
      formData.append("clubId", selectedClubId);

    const fieldsToIgnore = [
      "frontImageUri",
      "backImageUri",
      "sportId",
      "clubId",
    ];
    Object.entries(data).forEach(([key, value]) => {
      if (
        !fieldsToIgnore.includes(key) &&
        value !== undefined &&
        value !== null
      ) {
        formData.append(key, String(value));
      }
    });

    const frontChanged =
      !isEditing || frontImage !== existingJersey?.frontImageUrl;
    const backChanged =
      !isEditing || backImage !== existingJersey?.backImageUrl;

    if (frontImage && frontChanged) {
      formData.append("frontImage", {
        uri: frontImage,
        name: "front.jpg",
        type: "image/jpeg",
      } as any);
    }
    if (backImage && backChanged) {
      formData.append("backImage", {
        uri: backImage,
        name: "back.jpg",
        type: "image/jpeg",
      } as any);
    }

    try {
      if (isEditing) {
        await updateJersey({ id: jerseyId!, data: formData });
        Toast.show({
          type: "success",
          text1: t("addJersey.toasts.updateSuccessTitle"),
          position: "bottom",
        });
      } else {
        await createJersey(formData);
        Toast.show({
          type: "success",
          text1: t("addJersey.toasts.successTitle"),
          position: "bottom",
        });
      }

      reset();
      setFrontImage("");
      setBackImage(null);
      setSelectedClubId("");
      router.navigate("/(drawer)/(tabs)/dressing");
    } catch (error) {
      const err = error as any;
      if (err.response?.status === 403) {
        Alert.alert(
          t("addJersey.alerts.limitReachedTitle"),
          t("addJersey.alerts.limitReachedMessage"),
          [
            { text: t("addJersey.alerts.cancel"), style: "cancel" },
            {
              text: t("addJersey.alerts.upgrade"),
              onPress: () => router.push("/upgrade"),
            },
          ],
        );
        return;
      }

      console.log(
        "❌ DÉTAIL ERREUR 400 :",
        JSON.stringify(err.response?.data, null, 2),
      );
      Toast.show({
        type: "error",
        text1: t("addJersey.toasts.errorTitle"),
        position: "bottom",
      });

      console.error("Error saving jersey:", error);
    }
  };

  // ==========================================
  // 7. VISUAL RENDERING (JSX)
  // ==========================================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>
          {isEditing ? t("addJersey.editTitle") : t("addJersey.title")}
        </Text>

        <Text style={styles.imageHint}>{t("addJersey.imageHint")}</Text>

        {/* Image selection */}
        <View style={styles.imagePickerRow}>
          <TouchableOpacity
            style={[
              styles.imagePickerHalf,
              frontImage && styles.imagePickerFilled,
            ]}
            onPress={() => pickImage("front")}
          >
            {frontImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: frontImage }}
                  style={styles.imagePreview}
                />
                <View style={styles.overlay}>
                  <AntDesign
                    name="check-circle"
                    size={24}
                    color={Colors.theme.primary}
                  />
                  <Text style={styles.changeText}>{t("addJersey.change")}</Text>
                </View>
              </View>
            ) : (
              <>
                <FontAwesome name="camera" size={20} color="#8E8E93" />
                <Text style={styles.imagePickerText}>
                  {t("addJersey.frontView")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.imagePickerHalf,
              backImage && styles.imagePickerFilled,
            ]}
            onPress={() => pickImage("back")}
          >
            {backImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: backImage }}
                  style={styles.imagePreview}
                />
                <View style={styles.overlay}>
                  <AntDesign
                    name="check-circle"
                    size={24}
                    color={Colors.theme.primary}
                  />
                  <Text style={styles.changeText}>{t("addJersey.change")}</Text>
                </View>
              </View>
            ) : (
              <>
                <FontAwesome name="camera" size={20} color="#8E8E93" />
                <Text style={styles.imagePickerText}>
                  {t("addJersey.backView")}
                </Text>
                <Text style={styles.imagePickerSubtext}>
                  {t("addJersey.optional")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {errors.frontImageUri && (
          <Text style={styles.errorText}>{errors.frontImageUri.message}</Text>
        )}

        {/* Club input & Dropdown */}
        <Text style={styles.label}>{t("addJersey.clubLabel")}</Text>
        <Controller
          control={control}
          name="clubName"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.clubName && styles.inputError]}
              placeholder={t("addJersey.clubPlaceholder")}
              placeholderTextColor="#8E8E93"
              value={value}
              onChangeText={(text) => {
                onChange(text);
                setClubSearchInput(text);
                setSelectedClubId(""); // Reset selected club ID when user types
                setIsLoading(true); // Start loading when user types
              }}
            />
          )}
        />
        {errors.clubName && (
          <Text style={styles.errorText}>{errors.clubName.message}</Text>
        )}

        {/* if no club is found, show a message to the user */}
        {!errors.clubName &&
          !isLoading &&
          clubSearchInput === debouncedClubSearch &&
          clubSearchInput.trim().length >= 3 &&
          suggestions.length === 0 &&
          !selectedClubId && (
            <Text style={styles.errorText}>{t("addJersey.clubNotFound")}</Text>
          )}

        {isDropdownVisible && suggestions.length > 0 && (
          <View style={styles.dropdown}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
            >
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setValue("clubName", item.name);
                    setSelectedClubId(item.id);
                    setIsDropdownVisible(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{item.name}</Text>
                  <Text style={styles.dropdownChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Season input */}
        <Text style={styles.label}>{t("addJersey.seasonLabel")}</Text>
        <Controller
          control={control}
          name="season"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.season && styles.inputError]}
              placeholder={t("addJersey.seasonPlaceholder")}
              placeholderTextColor="#8E8E93"
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.season && (
          <Text style={styles.errorText}>{errors.season.message}</Text>
        )}

        {/* Brand selector & Dropdown */}
        <View style={{ position: "relative", zIndex: 50 }}>
          <Text style={styles.label}>{t("addJersey.brandLabel")}</Text>
          <Controller
            control={control}
            name="brand"
            render={({ field: { onChange, value } }) => (
              <View style={{ position: "relative" }}>
                <TextInput
                  style={[styles.input, errors.brand && styles.inputError]}
                  placeholder={t("addJersey.brandPlaceholder")}
                  placeholderTextColor="#8E8E93"
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    handleBrandSearch(text);
                  }}
                />
                {isBrandDropdownVisible && brandSuggestions.length > 0 && (
                  <View style={styles.brandDropdown}>
                    <ScrollView
                      nestedScrollEnabled
                      style={{ maxHeight: 150 }}
                      keyboardShouldPersistTaps="handled"
                    >
                      {brandSuggestions.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={styles.dropdownItem}
                          onPress={() => {
                            onChange(item);
                            setIsBrandDropdownVisible(false);
                          }}
                        >
                          <Text style={styles.dropdownText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          />
          {errors.brand && (
            <Text style={styles.errorText}>{errors.brand.message}</Text>
          )}
        </View>

        {/* Size selector */}
        <Text style={styles.label}>{t("addJersey.sizeLabel")}</Text>
        <Controller
          control={control}
          name="size"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipRow}>
              {SIZES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, value === s && styles.chipSelected]}
                  onPress={() => onChange(s)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      value === s && styles.chipTextSelected,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.size && (
          <Text style={styles.errorText}>{errors.size.message}</Text>
        )}

        {/* Type selector */}
        <Text style={styles.label}>{t("addJersey.kitTypeLabel")}</Text>
        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipRow}>
              {JERSEY_TYPE_KEYS.map((tKey) => (
                <TouchableOpacity
                  key={tKey}
                  style={[styles.chip, value === tKey && styles.chipSelected]}
                  onPress={() => onChange(tKey)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      value === tKey && styles.chipTextSelected,
                    ]}
                  >
                    {t(`addJersey.types.${tKey}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.type && (
          <Text style={styles.errorText}>{errors.type.message}</Text>
        )}

        {/* Version */}
        <Text style={styles.label}>{t("addJersey.versionLabel")}</Text>
        <Controller
          control={control}
          name="version"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipRow}>
              {KIT_VERSION_KEYS.map((vKey) => (
                <TouchableOpacity
                  key={vKey}
                  style={[styles.chip, value === vKey && styles.chipSelected]}
                  onPress={() => onChange(vKey)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      value === vKey && styles.chipTextSelected,
                    ]}
                  >
                    {t(`addJersey.versions.${vKey}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.version && (
          <Text style={styles.errorText}>{errors.version.message}</Text>
        )}

        {/* Condition */}
        <Text style={styles.label}>{t("addJersey.conditionLabel")}</Text>
        <Controller
          control={control}
          name="condition"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipRow}>
              {KIT_CONDITION_KEYS.map((cKey) => (
                <TouchableOpacity
                  key={cKey}
                  style={[styles.chip, value === cKey && styles.chipSelected]}
                  onPress={() => onChange(cKey)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      value === cKey && styles.chipTextSelected,
                    ]}
                  >
                    {t(`addJersey.conditions.${cKey}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.condition && (
          <Text style={styles.errorText}>{errors.condition.message}</Text>
        )}

        <View style={styles.separator} />

        {/* Player */}
        <Text style={styles.label}>{t("addJersey.playerLabel")}</Text>
        <Controller
          control={control}
          name="playerName"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder={t("addJersey.playerPlaceholder")}
              placeholderTextColor="#8E8E93"
              onChangeText={onChange}
              value={value}
            />
          )}
        />

        {/* Jersey Number */}
        <Text style={styles.label}>{t("addJersey.numberLabel")}</Text>
        <Controller
          control={control}
          name="number"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder={t("addJersey.numberPlaceholder")}
              placeholderTextColor="#8E8E93"
              keyboardType="number-pad"
              onChangeText={(text) => onChange(text === "" ? undefined : text)}
              value={value ?? ""}
            />
          )}
        />

        {/* Purchase Price */}
        <Text style={styles.label}>{t("addJersey.priceLabel")}</Text>
        <Controller
          control={control}
          name="purchasePrice"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder={t("addJersey.pricePlaceholder")}
              placeholderTextColor="#8E8E93"
              keyboardType="numeric"
              onChangeText={(text) =>
                onChange(text ? parseFloat(text.replace(",", ".")) : null)
              }
              value={value !== null && value !== undefined ? String(value) : ""}
            />
          )}
        />

        {/* Description */}
        <Text style={styles.label}>{t("addJersey.descriptionLabel")}</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              placeholder={t("addJersey.descriptionPlaceholder")}
              placeholderTextColor="#8E8E93"
              multiline
              onChangeText={onChange}
              value={value}
            />
          )}
        />

        {/* Official Switch */}
        <View style={styles.switchRow}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.labelInline}>
              {t("addJersey.officialLabel")}
            </Text>
            <Text style={styles.subLabel}>
              {t("addJersey.officialSubLabel")}
            </Text>
          </View>
          <Controller
            control={control}
            name="isOfficial"
            render={({ field: { onChange, value } }) => (
              <Switch
                value={value ?? true}
                onValueChange={onChange}
                trackColor={{ false: "#2C2C2E", true: Colors.theme.primary }}
                thumbColor="#FFFFFF"
              />
            )}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (isPending || !selectedClubId) && styles.submitButtonDisabled,
          ]}
          disabled={isPending || !selectedClubId}
          onPress={handleSubmit((data) => onSubmit(data))}
        >
          <Text style={styles.submitButtonText}>
            {isPending
              ? t("addJersey.submitting")
              : isEditing
                ? t("addJersey.saveChanges")
                : t("addJersey.submit")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// 8. STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.theme.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  heading: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 25,
    letterSpacing: 1,
  },
  imageHint: {
    color: "#8E8E93",
    fontSize: 12,
    marginBottom: 10,
    fontStyle: "italic",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  labelInline: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  subLabel: { color: "#8E8E93", fontSize: 12, marginTop: 2 },
  input: {
    backgroundColor: Colors.theme.surface,
    color: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    marginBottom: 4,
  },
  inputError: { borderColor: "#FF3B30" },
  errorText: { color: "#FF3B30", fontSize: 12, marginTop: 4, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: Colors.theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  chipSelected: {
    backgroundColor: Colors.theme.primary,
    borderColor: Colors.theme.primary,
  },
  chipText: { color: "#8E8E93", fontWeight: "600", fontSize: 14 },
  chipTextSelected: { color: "#000000" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 4,
  },
  switchTextContainer: { flex: 1, paddingRight: 16 },
  separator: { height: 1, backgroundColor: "#1A1A1A", marginVertical: 20 },
  submitButton: {
    backgroundColor: Colors.theme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 25,
  },
  submitButtonText: { color: "#000000", fontSize: 16, fontWeight: "700" },
  submitButtonDisabled: { opacity: 0.2 },
  imagePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  imagePickerHalf: {
    width: "48%",
    height: 120,
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2C2C2E",
    borderStyle: "dashed",
  },
  dropdown: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 10,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#2C2C2E",
    maxHeight: 200,
  },
  brandDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#2C2C2E",
    maxHeight: 180,
    zIndex: 1000,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2E",
  },
  dropdownText: {
    fontSize: 16,
    color: "#ffffff",
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 20,
    color: "#C7C7CC",
    marginLeft: 8,
  },
  imagePickerFilled: {
    borderWidth: 1,
    borderColor: Colors.theme.primary,
    padding: 0,
  },
  imagePreviewContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: { width: "100%", height: "100%", borderRadius: 14 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  changeText: { color: "#FFF", fontSize: 10, marginTop: 4, fontWeight: "bold" },
  imagePickerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },
  imagePickerSubtext: { color: "#8E8E93", fontSize: 11 },
});
