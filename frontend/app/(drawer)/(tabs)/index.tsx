import CardCollection from "@/components/CardCollection";
import KitOfTheDayCard from "@/components/KitOfTheDayCard";
import { Colors } from "@/constants/Colors";
import {
  useJerseyCount,
  useJerseys,
  useMostRepresentedClub,
} from "@/hooks/useJerseyHook";
import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";

export default function TabOneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: jerseys, isLoading } = useJerseys();
  const { data: count } = useJerseyCount();
  const { data: club, isLoading: isClubLoading } = useMostRepresentedClub();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* New Archive Acquisition CTA Card */}
        <TouchableOpacity
          style={styles.archiveCard}
          activeOpacity={0.8}
          onPress={() => router.push("/add")}
        >
          <Text style={styles.archiveTitle}>{t("home.archiveCard.title")}</Text>
          <Text style={styles.archiveSubtitle}>
            {t("home.archiveCard.subtitle")}
          </Text>
          <View style={styles.scanButton}>
            <FontAwesome name="camera" size={14} color="#000000" />
            <Text style={styles.scanButtonText}>
              {t("home.archiveCard.button")}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Last added to Locker section */}
        <Text style={styles.lastAdded}>{t("home.lastAdded")}</Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.theme.primary} />
        ) : jerseys && jerseys.length > 0 ? (
          <View style={styles.cardsRow}>
            {jerseys.slice(0, 3).map((jersey) => (
              <CardCollection
                onPress={() => router.push(`/(drawer)/(tabs)/dressing`)}
                key={jersey.id}
                jersey={jersey}
                width="30%"
                size="small"
              />
            ))}
          </View>
        ) : (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="shirt-outline" size={28} color="#05C785" />
            </View>
            <Text style={styles.emptyTitle}>{t("home.empty.title")}</Text>
            <Text style={styles.emptySubtitle}>{t("home.empty.subtitle")}</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              activeOpacity={0.8}
              onPress={() => {
                router.push("/(drawer)/(tabs)/add");
              }}
            >
              <Feather name="upload" size={16} color="#05C785" />
              <Text style={styles.uploadButtonText}>
                {t("home.empty.button")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <KitOfTheDayCard />

        <Text style={styles.collectionTitle}>{t("home.stats.title")}</Text>
        <View style={styles.containerStats}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t("home.stats.totalKits")}</Text>
            <View style={styles.statValueContainer}>
              <Ionicons
                name="shirt-outline"
                size={32}
                color={Colors.theme.primary}
              />
              <Text style={styles.statValue}>{count ?? 0}</Text>
            </View>
          </View>

          {/* Carte Top Team */}
          <View style={styles.statCard}>
            {club?.logoUrl && (
              <Image
                source={{ uri: club.logoUrl }}
                style={styles.bgLogo}
                resizeMode="contain"
              />
            )}

            <Text style={styles.statLabel}>{t("home.stats.topTeam")}</Text>

            {isClubLoading ? (
              <ActivityIndicator size="small" color={Colors.theme.primary} />
            ) : count === 0 ? (
              <TouchableOpacity
                onPress={() => router.push("/add")}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <Text
                  style={[
                    styles.statValue,
                    {
                      fontSize: 12,
                      color: Colors.theme.primary,
                      textAlign: "center",
                    },
                  ]}
                >
                  {t("home.stats.addFirstKit")}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={[styles.statValue, { fontSize: 20 }]}>
                  {club?.name}
                </Text>
                <Text style={styles.statSubValue}>
                  {club?.count === 1 ? "1 kit" : `${club?.count ?? 0} kits`}
                </Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.theme.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  archiveCard: {
    backgroundColor: Colors.theme.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.theme.primary,
    shadowColor: Colors.theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  archiveTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  archiveSubtitle: {
    color: Colors.theme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  scanButton: {
    flexDirection: "row",
    backgroundColor: Colors.theme.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 8,
  },
  scanButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
  },
  lastAdded: {
    color: "rgb(161 161 170)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 10,
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
    marginTop: 10,
  },
  containerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginTop: 10,
    paddingHorizontal: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.theme.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "48%",
    height: 120,
    overflow: "hidden",
  },
  statLabel: {
    color: Colors.theme.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  statValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  statSubValue: {
    color: Colors.theme.primary,
    fontSize: 14,
    marginTop: 4,
  },
  statValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  collectionTitle: {
    color: "rgb(161 161 170)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  bgLogo: {
    position: "absolute",
    width: 110,
    height: 110,
    opacity: 0.1,
  },
  emptyContainer: {
    borderWidth: 1.5,
    borderColor: "#05C785",
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141C17",
    marginVertical: 10,
  },
  emptyIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#161E1A",
    borderWidth: 1,
    borderColor: "#05C785",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161E1A",
    borderWidth: 1,
    borderColor: "#05C785",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  uploadButtonText: {
    color: "#05C785",
    fontSize: 14,
    fontWeight: "bold",
  },
});
