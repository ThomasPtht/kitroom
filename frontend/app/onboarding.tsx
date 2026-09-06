// app/onboarding.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useUserMe } from "@/hooks/useAuthHook";
import { Colors } from "@/constants/Colors";

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { data: userMe } = useUserMe();

  const handleAddFirstKit = () => {
    router.replace("/add");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image
            resizeMode="contain"
            source={require("../assets/images/icon.png")}
            style={styles.myIcon}
          />
        </View>

        <Text style={styles.title}>{t("onboarding.title")}</Text>
        <Text style={styles.subtitle}>
          {t("onboarding.greeting")}{" "}
          <Text style={styles.username}>{userMe?.username}</Text>
          {t("onboarding.subtitle")}
        </Text>

        <View style={styles.stepsContainer}>
          <View style={styles.stepCard}>
            <View style={styles.stepIconContainer}>
              <Feather name="camera" size={20} color={Colors.theme.primary} />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>{t("onboarding.step1Title")}</Text>
              <Text style={styles.stepDescription}>
                {t("onboarding.step1Description")}
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepIconContainer}>
              <Ionicons name="shirt" size={20} color={Colors.theme.primary} />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>{t("onboarding.step2Title")}</Text>
              <Text style={styles.stepDescription}>
                {t("onboarding.step2Description")}
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepIconContainer}>
              <AntDesign
                name="line-chart"
                size={20}
                color={Colors.theme.primary}
              />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>{t("onboarding.step3Title")}</Text>
              <Text style={styles.stepDescription}>
                {t("onboarding.step3Description")}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleAddFirstKit}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            {t("onboarding.addFirstKit")}
          </Text>
          <Feather name="arrow-right" size={18} color="#121212" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.theme.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(5, 199, 133, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(5, 199, 133, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  myIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "Outfit_800ExtraBold",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.theme.textMuted,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  username: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  stepsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  stepCard: {
    flexDirection: "row",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "rgba(127, 206, 175, 0.2)",
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(5, 199, 133, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: Colors.theme.textMuted,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: Colors.theme.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "700",
  },
});
