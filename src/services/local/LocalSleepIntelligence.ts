import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import {
  LocalModelAssessment,
  LocalModelAvailability,
  SleepAnalysisFeatures,
} from "../../types";

interface NativeSleepIntelligenceModule {
  getAvailability(): Promise<LocalModelAvailability>;
  analyzeCandidate(featuresJson: string): Promise<string>;
}

const nativeModule =
  Platform.OS === "ios"
    ? requireOptionalNativeModule<NativeSleepIntelligenceModule>(
        "SleepIntelligence",
      )
    : null;

export const LocalSleepIntelligence = {
  async getAvailability(): Promise<LocalModelAvailability> {
    if (Platform.OS !== "ios") {
      return { available: false, reason: "unsupported-platform" };
    }
    if (!nativeModule) {
      return { available: false, reason: "native-module-unavailable" };
    }
    try {
      return await nativeModule.getAvailability();
    } catch {
      return { available: false, reason: "unknown" };
    }
  },

  async analyze(
    features: SleepAnalysisFeatures,
  ): Promise<LocalModelAssessment> {
    if (!nativeModule)
      throw new Error("The native on-device model module is unavailable.");
    const response = await nativeModule.analyzeCandidate(
      JSON.stringify(features),
    );
    const parsed = JSON.parse(response) as Partial<LocalModelAssessment>;
    if (
      typeof parsed.classification !== "string" ||
      typeof parsed.confidence !== "number" ||
      typeof parsed.suggestedStartOffsetMinutes !== "number" ||
      typeof parsed.suggestedEndOffsetMinutes !== "number" ||
      typeof parsed.explanation !== "string"
    ) {
      throw new Error(
        "The on-device model returned an invalid sleep assessment.",
      );
    }
    return parsed as LocalModelAssessment;
  },
};
