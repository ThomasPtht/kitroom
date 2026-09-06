import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Share,
  Modal,
  FlatList,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useJerseyLikes, useToggleLikeJersey } from "@/hooks/useJerseyHook";
import { useLocker } from "@/hooks/useLocker";
import { calculateRank } from "@/lib/ranks";
import { useTranslation } from "react-i18next";
import { useUserMe } from "@/hooks/useAuthHook";

export default function PublicLockerScreen() {
  const { t } = useTranslation();
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();

  const { data: profileData, isLoading } = useLocker(username as string);
  const { mutate: toggleLike } = useToggleLikeJersey();

  const { data: userMe } = useUserMe();
  const isOwnLocker = userMe?.username === username;

  // State to track which jerseys have been liked by the current user
  const [likesModalJerseyId, setLikesModalJerseyId] = useState<string | null>(
    null,
  );

  const { data: likersList, isLoading: isLoadingLikers } = useJerseyLikes(
    likesModalJerseyId ?? "",
    !!likesModalJerseyId,
  );

  const handleUserPress = (likerUsername: string) => {
    setLikesModalJerseyId(null);
    router.push(`/locker/${likerUsername}`);
  };

  // Local state to track which side (front/back) is displayed for each jersey { [jerseyId]: boolean }
  const [showBackImage, setShowBackImage] = useState<{
    [key: string]: boolean;
  }>({});

  const currentRank = calculateRank(profileData?.jerseys || null);

  const toggleImageSide = (jerseyId: string) => {
    setShowBackImage((prev) => ({
      ...prev,
      [jerseyId]: !prev[jerseyId],
    }));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t("publicLocker.shareMessage", { username }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.theme.primary} />
      </View>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={Colors.theme.textMuted}
          />
          <Text style={styles.errorText}>{t("publicLocker.notFound")}</Text>
          <TouchableOpacity
            style={styles.backButtonSimple}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>
              {t("publicLocker.backButton")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar: Back Button, Share Button + Public Locker Badge */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.rightGroup}>
          <View style={styles.publicBadge}>
            <Ionicons
              name="globe-outline"
              size={14}
              color={Colors.theme.primary}
            />
            <Text style={styles.publicBadgeText}>
              {t("publicLocker.badge")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareIconButton}
          >
            <Feather name="share-2" size={16} color={Colors.theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons
              name="shirt-outline"
              size={36}
              color={Colors.theme.primary}
            />
          </View>

          <View style={styles.identityContainer}>
            <Text style={styles.name}>
              {profileData.fullName || profileData.username}
            </Text>
            <Text style={styles.handle}>@{profileData.username}</Text>
            {profileData.location && (
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={Colors.theme.textMuted}
                />
                <Text style={styles.locationText}>{profileData.location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bio */}
        {profileData.bio && <Text style={styles.bio}>{profileData.bio}</Text>}

        {/* Stats Cards (Kits / Clubs) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t("publicLocker.stats.kits")}</Text>
            <Text style={styles.statValue}>{profileData.kitsCount ?? 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              {t("publicLocker.stats.clubs")}
            </Text>
            <Text style={styles.statValue}>{profileData.clubsCount ?? 0}</Text>
          </View>
        </View>

        {/* Collector Rank Badge */}
        <View style={styles.rankRow}>
          <Ionicons
            name="trophy-outline"
            size={14}
            color={Colors.theme.primary}
          />
          <Text style={styles.rankText}>
            <Text style={styles.rankHighlight}>
              {currentRank.toUpperCase()}
            </Text>{" "}
            {t("publicLocker.collectorRank")}
          </Text>
        </View>

        {/* Section Shared Kits */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t("publicLocker.sharedKits")}
          </Text>
          <Text style={styles.sectionCount}>
            {profileData.jerseys?.length || 0} {t("publicLocker.exhibits")}
          </Text>
        </View>

        {/* Jerseys Grid */}
        <View style={styles.jerseysGrid}>
          {profileData.jerseys?.map((jersey: any) => {
            const hasBack = !!(jersey.backImageUrl || jersey.backImage);
            const isShowingBack = showBackImage[jersey.id] && hasBack;
            const currentImage = isShowingBack
              ? jersey.backImageUrl || jersey.backImage
              : jersey.frontImageUrl || jersey.frontImage;

            return (
              <View key={jersey.id} style={styles.jerseyCard}>
                <View style={styles.jerseyImageContainer}>
                  <Image
                    source={{ uri: currentImage }}
                    style={styles.jerseyImage}
                    resizeMode="cover"
                  />

                  {/* Type tag at the top right of the image */}
                  <View style={styles.imageTagBadge}>
                    <Text style={styles.imageTagText}>
                      {jersey.club?.name
                        ? jersey.club.name.substring(0, 3).toUpperCase()
                        : "KIT"}
                      -{jersey.season?.slice(-2) || "XX"}-
                      {jersey.type?.charAt(0).toUpperCase() || "H"}
                    </Text>
                  </View>

                  {/* Button to toggle Front / Back (if a back image exists) */}
                  {hasBack && (
                    <TouchableOpacity
                      style={styles.flipButtonMini}
                      onPress={() => toggleImageSide(jersey.id)}
                    >
                      <Ionicons
                        name="repeat-outline"
                        size={13}
                        color="#FFFFFF"
                      />
                      <Text style={styles.flipButtonText}>
                        {isShowingBack
                          ? t("publicLocker.buttons.front")
                          : t("publicLocker.buttons.back")}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Like button at the bottom left of the image */}
                  <TouchableOpacity
                    style={[
                      styles.likeButtonMini,
                      jersey.hasLiked ? styles.likedBg : styles.unlikedBg,
                    ]}
                    onPress={() => {
                      if (isOwnLocker) {
                        setLikesModalJerseyId(jersey.id); // sur son propre locker : ouvre juste la liste
                      } else {
                        toggleLike(jersey.id); // sinon, comportement normal de like
                      }
                    }}
                    onLongPress={() => setLikesModalJerseyId(jersey.id)} // appui long : voir la liste, même sur locker des autres
                    disabled={isOwnLocker && false} // le bouton reste actif pour ouvrir la liste, juste le like est bloqué
                  >
                    <Ionicons
                      name="heart"
                      size={14}
                      color={
                        jersey.hasLiked ? "#05C785" : Colors.theme.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.likeCountMiniText,
                        jersey.hasLiked
                          ? styles.likedTextColor
                          : styles.unlikedTextColor,
                      ]}
                    >
                      {jersey.likesCount ?? 0}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Text info below the card */}
                <View style={styles.jerseyInfo}>
                  <Text style={styles.jerseyClubName} numberOfLines={1}>
                    {jersey.club?.name}
                  </Text>
                  <Text style={styles.jerseySeasonType}>
                    {jersey.season}{" "}
                    {jersey.type
                      ? `/ ${t(`addJersey.types.${jersey.type.toUpperCase()}`)}`
                      : ""}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Modal
        visible={!!likesModalJerseyId}
        onRequestClose={() => setLikesModalJerseyId(null)}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("publicLocker.likedBy")}</Text>
              <TouchableOpacity onPress={() => setLikesModalJerseyId(null)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {isLoadingLikers ? (
              <ActivityIndicator
                color={Colors.theme.primary}
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
                      <Ionicons
                        name="person"
                        size={16}
                        color={Colors.theme.primary}
                      />
                    </View>
                    <Text style={styles.likerUsername}>@{item.username}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyLikesText}>
                    {t("publicLocker.noLikesYet")}
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
    backgroundColor: Colors.theme.background || "#050806",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#050806",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  backButtonSimple: {
    backgroundColor: Colors.theme.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.theme.primary,
  },
  backButtonText: {
    color: Colors.theme.primary,
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.theme.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shareIconButton: {
    width: 30,
    height: 30,
    borderRadius: 18,
    backgroundColor: Colors.theme.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.theme.primary,
  },
  publicBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(5, 199, 133, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(5, 199, 133, 0.3)",
  },
  publicBadgeText: {
    color: Colors.theme.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.theme.surface,
    borderWidth: 1,
    borderColor: Colors.theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  identityContainer: {
    flex: 1,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 2,
  },
  handle: {
    color: Colors.theme.textMuted,
    fontSize: 14,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    color: Colors.theme.textMuted,
    fontSize: 12,
  },
  bio: {
    color: "#D1D5DB",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statLabel: {
    color: Colors.theme.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 28,
  },
  rankText: {
    color: Colors.theme.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  rankHighlight: {
    color: Colors.theme.primary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.theme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionCount: {
    color: Colors.theme.textMuted,
    fontSize: 12,
  },
  jerseysGrid: {
    gap: 20,
  },
  jerseyCard: {
    backgroundColor: Colors.theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  jerseyImageContainer: {
    width: "100%",
    height: 320,
    borderRadius: 14,
    backgroundColor: "#000",
    overflow: "hidden",
    position: "relative",
  },
  jerseyImage: {
    width: "100%",
    height: "100%",
  },
  imageTagBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(5, 199, 133, 0.4)",
  },
  imageTagText: {
    color: Colors.theme.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  flipButtonMini: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  flipButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  likeButtonMini: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  unlikedBg: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  likedBg: {
    backgroundColor: "rgba(5, 199, 133, 0.2)",
    borderColor: "rgba(5, 199, 133, 0.4)",
  },
  likeCountMiniText: {
    fontSize: 12,
    fontWeight: "700",
  },
  unlikedTextColor: {
    color: "#FFFFFF",
  },
  likedTextColor: {
    color: "#05C785",
  },
  jerseyInfo: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  jerseyClubName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  jerseySeasonType: {
    color: Colors.theme.textMuted,
    fontSize: 12,
    textTransform: "capitalize",
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
    color: Colors.theme.textMuted,
    textAlign: "center",
    paddingVertical: 20,
  },
});
