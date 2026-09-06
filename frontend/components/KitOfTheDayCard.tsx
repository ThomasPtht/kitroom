import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useJerseyOfTheDay, useToggleLikeJersey } from "@/hooks/useJerseyHook";
import KitOfTheDayModal from "./KitOfTheDayModal";
import { useTranslation } from "react-i18next";
import { useUserMe } from "@/hooks/useAuthHook";

// Helper to format types/conditions cleanly (e.g. "HOME_KIT" -> "Home kit")
export const formatText = (text: string | null | undefined) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function KitOfTheDayCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: jersey, isLoading, isError } = useJerseyOfTheDay();
  const [imageFailed, setImageFailed] = useState(false);
  const { mutate: toggleLike, isPending: isLiking } = useToggleLikeJersey();

  const { data: userMe } = useUserMe();

  const isOwnJersey = userMe?.username === jersey?.user.username;

  // State to control modal visibility
  const [isModalVisible, setIsModalVisible] = useState(false);

  const imageUri = useMemo(() => {
    return jersey?.frontImageUrl?.trim() || jersey?.frontImage?.trim() || "";
  }, [jersey?.frontImageUrl, jersey?.frontImage]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.theme.primary} />
      </View>
    );
  }

  if (isError || !jersey || !jersey.user) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={14} color={Colors.theme.primary} />
          <Text style={styles.headerTitle}>{t("kitOfTheDay.headerTitle")}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.placeholderContent}>
            <Ionicons
              name="shirt-outline"
              size={28}
              color={Colors.theme.primary}
            />
            <Text style={styles.placeholderTitle}>
              {t("kitOfTheDay.noKitTitle")}
            </Text>
            <Text style={styles.placeholderText}>
              {t("kitOfTheDay.noKitText")}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const generateTag = () => {
    const club = jersey.club.name.substring(0, 3).toUpperCase();
    const season = jersey.season ? jersey.season.slice(-2) : "XX";
    const type = jersey.type ? jersey.type.charAt(0).toUpperCase() : "X";
    return `${club}-${season}-${type}`;
  };

  const handleAuthorPress = (e: any) => {
    e.stopPropagation(); // Prevent card press / modal opening

    // Keep the locker visibility check only for navigation, not for KOTD display.
    if (jersey.user.isPublic === false) {
      Alert.alert(
        t("kitOfTheDay.privateLockerTitle"),
        t("kitOfTheDay.privateLockerMessage"),
      );
      return;
    }

    router.push({
      pathname: "/locker/[username]",
      params: { username: jersey.user.username },
    });
  };

  return (
    <>
      <View style={styles.wrapper}>
        {/* Title Header */}
        <View style={styles.header}>
          <Ionicons name="sparkles" size={14} color={Colors.theme.primary} />
          <Text style={styles.headerTitle}>{t("kitOfTheDay.headerTitle")}</Text>
        </View>

        {/* Main card container */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => setIsModalVisible(true)} // Open modal on card press
        >
          {/* Main content (Image + Info) */}
          <View style={styles.mainContent}>
            {/* Image Container */}
            <View style={styles.imageContainer}>
              {imageUri && !imageFailed ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <View style={styles.imageFallback}>
                  <Ionicons name="shirt-outline" size={24} color="#8E8E93" />
                </View>
              )}
            </View>

            {/* Info container */}
            <View style={styles.infoContainer}>
              <View>
                <Text style={styles.tag}>{generateTag()}</Text>
                <Text style={styles.clubName} numberOfLines={1}>
                  {jersey.club.name}
                </Text>
                <Text style={styles.seasonType}>
                  {jersey.season} / {formatText(jersey.type)}
                </Text>

                <Text style={styles.story} numberOfLines={2}>
                  {jersey.story}
                </Text>
              </View>

              <Text style={styles.readMore}>
                {t("kitOfTheDay.viewDetails")}
              </Text>
            </View>
          </View>

          {/* Divider line */}
          <View style={styles.divider} />

          {/* Card footer (Author + Like) */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.authorContainer}
              activeOpacity={0.7}
              onPress={handleAuthorPress}
            >
              <View style={styles.iconTshirtContainer}>
                <Ionicons
                  name="shirt-outline"
                  size={16}
                  color={Colors.theme.primary}
                />
              </View>
              <Text style={styles.authorText}>
                {t("kitOfTheDay.fromLockerPrefix")}
                <Text style={styles.authorUsername}>
                  @{jersey.user.username}
                </Text>
                {t("kitOfTheDay.fromLockerSuffix")}
              </Text>
            </TouchableOpacity>

            {/* Like button (Disabled during action) */}
            <TouchableOpacity
              style={[
                styles.likeButtonFooter,
                jersey.hasLiked
                  ? styles.likedBackground
                  : styles.notLikedBackground,
              ]}
              activeOpacity={0.7}
              disabled={isLiking || isOwnJersey} // Disable if liking or if it's the user's own jersey
              onPress={() => {
                if (!isOwnJersey) toggleLike(jersey.id);
              }}
            >
              <Ionicons
                name="heart"
                size={16}
                color={jersey.hasLiked ? "#05C785" : Colors.theme.textMuted}
              />
              <Text
                style={[
                  styles.likesCountText,
                  jersey.hasLiked ? styles.likedText : styles.notLikedText,
                ]}
              >
                {jersey.likesCount ?? 0}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>

      {/* Detail Modal */}
      <KitOfTheDayModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        jersey={jersey}
        onToggleLike={(id) => toggleLike(id)}
        isOwnJersey={isOwnJersey}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 20,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: Colors.theme.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.5,
  },
  card: {
    backgroundColor: "rgba(10,12,11,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    overflow: "hidden",
  },
  mainContent: {
    flexDirection: "row",
    padding: 12,
    gap: 16,
  },
  placeholderContent: {
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  placeholderText: {
    color: Colors.theme.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  imageContainer: {
    width: 96,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151515",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  tag: {
    color: Colors.theme.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    opacity: 0.8,
    marginBottom: 4,
  },
  clubName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  seasonType: {
    color: Colors.theme.textMuted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
    textTransform: "none",
  },
  story: {
    color: "#C9CDD1",
    fontSize: 12,
    lineHeight: 18,
  },
  readMore: {
    color: Colors.theme.primary,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    opacity: 1,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconTshirtContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(5, 199, 133, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  authorText: {
    color: Colors.theme.textMuted,
    fontSize: 13,
  },
  authorUsername: {
    color: Colors.theme.primary,
    fontWeight: "600",
  },
  likeButtonFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  notLikedBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  likedBackground: {
    backgroundColor: "rgba(5, 199, 133, 0.15)",
    borderColor: "rgba(5, 199, 133, 0.3)",
  },
  likesCountText: {
    fontSize: 13,
    fontWeight: "700",
  },
  notLikedText: {
    color: Colors.theme.textMuted,
  },
  likedText: {
    color: "#05C785",
  },
  loadingContainer: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
});
