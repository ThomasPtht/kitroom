import { JerseyData } from "@/services/jersey.service";
import { useQueryClient } from "@tanstack/react-query";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  FlatList,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import {
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  Ionicons,
} from "@expo/vector-icons";
import { useState, useRef } from "react";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import { captureRef } from "react-native-view-shot";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useDeleteJersey, useJerseyLikes } from "@/hooks/useJerseyHook";

interface JerseyDetailProps {
  jersey: JerseyData & { likesCount?: number };
  onClose: () => void;
}

// Helper function to format strings nicely (e.g. "Very_Good" -> "Very good")
export const formatText = (text: string) => {
  if (!text) return "";
  const clean = text.replace(/_/g, " ").toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

export default function JerseyDetail({ jersey, onClose }: JerseyDetailProps) {
  const { t } = useTranslation();
  const [showBackImage, setShowBackImage] = useState(false);
  const activeImageUrl = showBackImage
    ? jersey.backImageUrl || jersey.frontImageUrl || jersey.frontImageUri
    : jersey.frontImageUrl || jersey.frontImageUri;

  const [showLikesModal, setShowLikesModal] = useState(false);
  const { data: likersList, isLoading: isLoadingLikers } = useJerseyLikes(
    jersey.id as string,
    showLikesModal,
  );

  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  const router = useRouter();

  const queryClient = useQueryClient();

  const { mutate: deleteJersey, isLoading: isDeleting } = useDeleteJersey();

  const handleUserPress = (likerUsername: string) => {
    setShowLikesModal(false);
    setTimeout(() => {
      onClose();
      router.push(`/locker/${likerUsername}`);
    }, 150); // laisse le temps à l'animation de fermeture du modal de se terminer
  };

  const handleDelete = () => {
    Alert.alert(
      t("jerseyDetail.alerts.deleteTitle"),
      t("jerseyDetail.alerts.deleteMessage"),
      [
        { text: t("jerseyDetail.alerts.cancel"), style: "cancel" },
        {
          text: t("jerseyDetail.alerts.delete"),
          style: "destructive",
          onPress: () => {
            deleteJersey(jersey.id as string, {
              onSuccess: () => {
                onClose();
                Toast.show({
                  type: "success",
                  text1: t("jerseyDetail.alerts.toastDeletedTitle"),
                  text2: t("jerseyDetail.alerts.toastDeletedMessage"),
                  position: "bottom",
                });
              },
              onError: (error) => {
                console.error("Error deleting jersey:", error);
                Alert.alert(
                  t("jerseyDetail.alerts.errorTitle"),
                  t("jerseyDetail.alerts.errorMessage"),
                );
              },
            });
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    try {
      setIsSharing(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
      });

      setIsSharing(false);

      const shareMessage = t("jerseyDetail.shareMessage");

      await Share.share({
        message: shareMessage,
        url: uri,
        title: t("jerseyDetail.shareTitle"),
      });
    } catch (error) {
      console.error("Error sharing jersey card:", error);
      Alert.alert(
        t("jerseyDetail.alerts.shareErrorTitle"),
        t("jerseyDetail.alerts.shareErrorMessage"),
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar with Back / Code */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <AntDesign name="close" size={14} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.topRightInfo}>
          {jersey.isOfficial !== null && jersey.isOfficial !== undefined && (
            <View
              style={[
                styles.officialBadge,
                jersey.isOfficial ? styles.officialTrue : styles.officialFalse,
              ]}
            >
              <Text
                style={[
                  styles.officialText,
                  { color: jersey.isOfficial ? "#05C785" : "#FFA500" },
                ]}
              >
                {jersey.isOfficial
                  ? t("jerseyDetail.official")
                  : t("jerseyDetail.replica")}
              </Text>
            </View>
          )}
          {/* {jersey.version && (
            <Text style={styles.topCode}>
              {String(jersey.version).toUpperCase()}
            </Text>
          )} */}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Container of the jersey image with gradient and watermark */}
        <View ref={cardRef} collapsable={false} style={styles.imageContainer}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.12)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.6 }}
            style={styles.glowBackground}
          />

          {isSharing && (
            <View style={styles.cardHeaderContext}>
              <Text style={styles.cardContextSubtitle}>
                {t("jerseyDetail.myCollection")}
              </Text>
              <Text style={styles.cardContextTitle}>
                {jersey.club?.name || t("jerseyDetail.footballKit")}{" "}
                {jersey.season ? `• ${jersey.season}` : ""}
              </Text>
            </View>
          )}

          {activeImageUrl ? (
            <Image
              source={{ uri: activeImageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.placeholder}>{t("jerseyDetail.noImage")}</Text>
          )}

          {jersey.backImageUrl && (
            <View style={styles.imageToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  !showBackImage && styles.toggleBtnActive,
                ]}
                onPress={() => setShowBackImage(false)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    !showBackImage && styles.toggleTextActive,
                  ]}
                >
                  {t("jerseyDetail.front")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  showBackImage && styles.toggleBtnActive,
                ]}
                onPress={() => setShowBackImage(true)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    showBackImage && styles.toggleTextActive,
                  ]}
                >
                  {t("jerseyDetail.backSide")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isSharing && (
            <View style={styles.watermarkContainer}>
              <Text style={styles.watermarkBrand}>KITOYA</Text>
              <Text style={styles.watermarkUrl}>Kitoya.app</Text>
            </View>
          )}
        </View>

        {/* Header Info: Season, Club & Community Likes */}
        <View style={styles.headerInfoContainer}>
          <View style={styles.headerInfo}>
            <Text style={styles.season}>
              {jersey.season ? jersey.season.toUpperCase() : ""}
            </Text>
            <Text style={styles.clubName}>
              {jersey.club?.name || t("jerseyDetail.clubUnknown")}
            </Text>
          </View>

          {/* Like badge */}
          {(jersey.likesCount ?? 0) > 0 && (
            <TouchableOpacity
              style={styles.likesBadge}
              onPress={() => setShowLikesModal(true)}
            >
              <Ionicons name="heart" size={13} color="#05C785" />
              <Text style={styles.likesCountText}>{jersey.likesCount}</Text>
              <Text style={styles.likesLabelText}>
                {jersey.likesCount === 1
                  ? t("jerseyDetail.likes")
                  : t("jerseyDetail.likes_plural")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Badges / Tags row */}
        <View style={styles.badgesRow}>
          {jersey.type && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {t(`addJersey.types.${jersey.type}`)}
              </Text>
            </View>
          )}
          {jersey.version && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {" "}
                {t(`addJersey.versions.${jersey.version}`)}
              </Text>
            </View>
          )}
          {jersey.size && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {t("jerseyDetail.sizePrefix")} {jersey.size}
              </Text>
            </View>
          )}
        </View>

        {/* Story / Description Section */}
        {jersey.description && (
          <View style={styles.storySection}>
            <Text style={styles.storyTitle}>
              {t("jerseyDetail.storyTitle")}
            </Text>
            <Text style={styles.storyText}>{jersey.description}</Text>
          </View>
        )}

        {/* Specifications Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>
            {t("jerseyDetail.specsTitle")}
          </Text>

          {jersey.playerName && (
            <View style={styles.row}>
              <Text style={styles.label}>{t("jerseyDetail.player")}</Text>
              <Text style={styles.value}>{jersey.playerName}</Text>
            </View>
          )}
          {jersey.number !== null && jersey.number !== undefined && (
            <View style={styles.row}>
              <Text style={styles.label}>{t("jerseyDetail.number")}</Text>
              <Text style={styles.value}>{jersey.number}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>{t("jerseyDetail.brand")}</Text>
            <Text style={styles.value}>{jersey.brand}</Text>
          </View>
          {jersey.version && (
            <View style={styles.row}>
              <Text style={styles.label}>{t("jerseyDetail.version")}</Text>
              <Text style={styles.value}>
                {t(`addJersey.versions.${jersey.version}`, {
                  defaultValue: formatText(jersey.version),
                })}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>{t("jerseyDetail.condition")}</Text>
            <Text style={styles.value}>
              {t(`addJersey.conditions.${jersey.condition}`, {
                defaultValue: formatText(jersey.condition || ""),
              })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("jerseyDetail.size")}</Text>
            <Text style={styles.value}>
              {jersey.size || t("jerseyDetail.na")}
            </Text>
          </View>
        </View>

        {jersey.purchasePrice !== null &&
          jersey.purchasePrice !== undefined && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Feather name="tag" size={13} color="#05C785" />
                <Text style={styles.cardSectionTitle}>
                  {t("jerseyDetail.purchaseInfo")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>
                  {t("jerseyDetail.purchasePrice")}
                </Text>
                <Text style={styles.priceValue}>{jersey.purchasePrice} €</Text>
              </View>
            </View>
          )}

        {/* Share Button */}
        <TouchableOpacity
          style={[styles.shareButton, isSharing && { opacity: 0.7 }]}
          onPress={handleShare}
          disabled={isSharing}
        >
          <EvilIcons name="share-google" size={22} color="#1E1A16" />
          <Text style={styles.shareButtonText}>
            {isSharing
              ? t("jerseyDetail.shareCard")
              : t("jerseyDetail.shareKit")}
          </Text>
        </TouchableOpacity>

        {/* Edit and Delete Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.editButton]}
            onPress={() => {
              onClose();
              router.push({
                pathname: "/add",
                params: { jerseyId: jersey.id },
              });
            }}
          >
            <Feather name="edit-2" size={15} color="#05C785" />
            <Text style={styles.editButtonText}>
              {t("jerseyDetail.editButton")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && { opacity: 0.5 }]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Feather name="trash-2" size={15} color="#A66363" />
            <Text style={styles.deleteButtonText}>
              {t("jerseyDetail.deleteButton")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
        visible={showLikesModal}
        onRequestClose={() => setShowLikesModal(false)}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("jerseyDetail.likedBy")}</Text>
              <TouchableOpacity onPress={() => setShowLikesModal(false)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {isLoadingLikers ? (
              <ActivityIndicator
                color="#05C785"
                style={{ marginVertical: 20 }}
              />
            ) : (
              <FlatList
                data={likersList ?? []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.likerRow}
                    onPress={() => handleUserPress(item.username)}
                  >
                    <View style={styles.likerAvatar}>
                      <Ionicons name="person" size={16} color="#05C785" />
                    </View>
                    <Text style={styles.likerUsername}>@{item.username}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyLikesText}>
                    {t("jerseyDetail.noLikesYet")}
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050806",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    zIndex: 10,
  },
  backButton: {
    marginRight: 15,
    backgroundColor: "#151515",
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(127, 206, 175, 0.2)",
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  topRightInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topCode: {
    color: "#05C785",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  officialBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  officialTrue: {
    borderColor: "#05C785",
    backgroundColor: "#161E1A",
  },
  officialFalse: {
    borderColor: "#FFA500",
    backgroundColor: "#1E1A16",
  },
  officialText: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imageContainer: {
    backgroundColor: "#050806",
    borderColor: "rgba(127, 206, 175, 0.45)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    shadowColor: "rgba(127, 206, 175, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  glowBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: "100%",
    height: 300,
    zIndex: 1,
  },
  placeholder: {
    color: "#8E8E93",
    paddingVertical: 120,
    zIndex: 1,
  },
  imageToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#151515",
    borderRadius: 20,
    padding: 3,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "rgba(127, 206, 175, 0.2)",
    zIndex: 1,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  toggleBtnActive: {
    backgroundColor: "#05C785",
  },
  toggleText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "bold",
  },
  toggleTextActive: {
    color: "#121212",
  },
  watermarkContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(127, 206, 175, 0.2)",
    zIndex: 1,
  },
  watermarkBrand: {
    color: "#05C785",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  watermarkUrl: {
    color: "#8E8E93",
    fontSize: 11,
    fontWeight: "500",
  },
  headerInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  season: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#05C785",
    letterSpacing: 1,
    marginBottom: 4,
  },
  clubName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  likesBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "rgba(127, 206, 175, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  likesCountText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  likesLabelText: {
    color: "#05C785",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "rgba(127, 206, 175, 0.3)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  badgeText: {
    color: "#05C785",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  storySection: {
    marginBottom: 20,
  },
  storyTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#05C785",
    letterSpacing: 1,
    marginBottom: 8,
  },
  storyText: {
    color: "#AAAAAA",
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "rgba(127, 206, 175, 0.2)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#05C785",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    alignItems: "center",
  },
  label: {
    color: "#888888",
    fontSize: 14,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  priceValue: {
    color: "#05C785",
    fontSize: 15,
    fontWeight: "bold",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05C785",
    padding: 16,
    borderRadius: 16,
    gap: 2,
    marginTop: 10,
    shadowColor: "rgba(5, 199, 133, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  shareButtonText: {
    color: "#1E1A16",
    fontSize: 14,
    fontWeight: "bold",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#261C1C",
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  editButtonText: {
    color: "#05C785",
    fontSize: 14,
    fontWeight: "500",
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#261C1C",
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  deleteButtonText: {
    color: "#A66363",
    fontSize: 14,
    fontWeight: "500",
  },
  cardHeaderContext: {
    width: "100%",
    marginBottom: 12,
    zIndex: 1,
  },
  cardContextSubtitle: {
    color: "#05C785",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  cardContextTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  likesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  likesButtonText: {
    color: "#05C785",
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#161616",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  likerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  likerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(5, 199, 133, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  likerUsername: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  emptyLikesText: {
    color: "#666666",
    textAlign: "center",
    paddingVertical: 20,
  },
});
