import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { formatText } from "./KitOfTheDayCard";
import { useTranslation } from "react-i18next";

interface KitOfTheDayModalProps {
  visible: boolean;
  onClose: () => void;
  jersey: any;
  onToggleLike: (id: string) => void;
  isOwnJersey: boolean;
}

export default function KitOfTheDayModal({
  visible,
  onClose,
  jersey,
  onToggleLike,
  isOwnJersey,
}: KitOfTheDayModalProps) {
  const { t } = useTranslation();

  if (!jersey) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Barre de fermeture */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t("kitOfTheDayModal.headerTitle")}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Image grand format */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: jersey.frontImageUrl || jersey.frontImage }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>

          {/* Infos principales & Like */}
          <View style={styles.metaRow}>
            <View style={styles.metaInfo}>
              <Text style={styles.seasonTypeHeader}>
                {jersey.season} /{" "}
                {t(`addJersey.types.${jersey.type}`).toUpperCase()}
              </Text>
              <Text style={styles.clubName}>{jersey.club.name}</Text>

              {/* Badges (Style similaire au screenshot) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesContainer}
              >
                {jersey.version && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {t(`addJersey.versions.${jersey.version}`).toUpperCase()}
                    </Text>
                  </View>
                )}
                {jersey.brand && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {jersey.brand.toUpperCase()}
                    </Text>
                  </View>
                )}
                {jersey.sport?.name && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {jersey.sport.name.toUpperCase()}
                    </Text>
                  </View>
                )}
                {jersey.isGrail && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {t("kitOfTheDayModal.grail")}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Propriétaire du maillot */}
              {jersey.user?.username && (
                <View style={styles.modalOwnerContainer}>
                  <View style={styles.iconTshirtContainer}>
                    <Ionicons
                      name="shirt-outline"
                      size={14}
                      color={Colors.theme.primary}
                    />
                  </View>
                  <Text style={styles.modalOwnerText}>
                    {t("kitOfTheDayModal.from")}{" "}
                    <Text style={styles.modalOwnerName}>
                      @{jersey.user.username}
                    </Text>
                    {t("kitOfTheDayModal.lockerSuffix")}
                  </Text>
                </View>
              )}
            </View>

            {/* Bouton Like unifié */}
            <TouchableOpacity
              style={[
                styles.likeButtonFooter,
                jersey.hasLiked
                  ? styles.likedBackground
                  : styles.notLikedBackground,
              ]}
              activeOpacity={0.7}
              disabled={isOwnJersey} // Désactive le bouton si c'est le maillot de l'utilisateur
              onPress={() => {
                if (!isOwnJersey) onToggleLike(jersey.id);
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

          {/* Story complète */}
          <View style={styles.storySection}>
            <Text style={styles.storyTitle}>
              {t("kitOfTheDayModal.storyTitle")}
            </Text>
            <Text style={styles.storyFullText}>{jersey.story}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.theme.background || "#050806",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitle: {
    color: Colors.theme.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  closeButton: {
    backgroundColor: "#151515",
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(127, 206, 175, 0.2)",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imageContainer: {
    width: "100%",
    height: 350,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  metaInfo: {
    flex: 1,
    paddingRight: 10,
  },
  seasonTypeHeader: {
    color: Colors.theme.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clubName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.theme.primary,
    backgroundColor: "rgba(5, 199, 133, 0.05)",
  },
  badgeText: {
    color: Colors.theme.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  modalOwnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  iconTshirtContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(5, 199, 133, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOwnerText: {
    color: Colors.theme.textMuted,
    fontSize: 13,
  },
  modalOwnerName: {
    color: Colors.theme.primary,
    fontWeight: "600",
  },
  likeButtonFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  storySection: {
    backgroundColor: Colors.theme.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(127, 206, 175, 0.2)",
  },
  storyTitle: {
    color: Colors.theme.primary,
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 10,
  },
  storyFullText: {
    color: "#D1D5DB",
    fontSize: 15,
    lineHeight: 24,
  },
});
