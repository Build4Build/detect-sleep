import ExpoModulesCore
import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

private struct SleepFeatures: Decodable {
  let startTime: Double
  let endTime: Double
  let durationMinutes: Double
  let startMinuteOfDay: Int
  let endMinuteOfDay: Int
  let historicalSessionCount: Int
  let historicalBedtimeMinute: Int?
  let historicalWakeMinute: Int?
  let healthKitOverlapRatio: Double?
  let watchLowMotionRatio: Double?
  let watchHeartRateDropPercent: Double?
}

private struct EncodedAssessment: Encodable {
  let classification: String
  let confidence: Int
  let suggestedStartOffsetMinutes: Int
  let suggestedEndOffsetMinutes: Int
  let explanation: String
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
private enum ModelSleepLikelihood {
  case likelySleep
  case uncertain
  case unlikelySleep
}

@available(iOS 26.0, *)
@Generable
private struct ModelSleepAssessment {
  @Guide(description: "Whether the supplied evidence most likely represents sleep. Prefer uncertain when only app inactivity is present.")
  var classification: ModelSleepLikelihood

  @Guide(description: "A conservative confidence from 0 to 100 based only on supplied evidence.")
  var confidence: Int

  @Guide(description: "Suggested adjustment to the start in minutes, between -90 and 90. Use 0 without independent boundary evidence.")
  var suggestedStartOffsetMinutes: Int

  @Guide(description: "Suggested adjustment to the end in minutes, between -90 and 90. Use 0 without independent boundary evidence.")
  var suggestedEndOffsetMinutes: Int

  @Guide(description: "One short sentence explaining the strongest evidence and uncertainty. Do not diagnose a medical condition.")
  var explanation: String
}
#endif

public final class SleepIntelligenceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SleepIntelligence")

    AsyncFunction("getAvailability") { () -> [String: Any] in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        let available = SystemLanguageModel.default.isAvailable
        return [
          "available": available,
          "reason": available ? "available" : "model-not-ready"
        ]
      }
      #endif
      return ["available": false, "reason": "unsupported-os"]
    }

    AsyncFunction("analyzeCandidate") { (featuresJSON: String) async throws -> String in
      let data = Data(featuresJSON.utf8)
      let features = try JSONDecoder().decode(SleepFeatures.self, from: data)

      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        return try await Self.analyzeWithSystemModel(features, featuresJSON: featuresJSON)
      }
      #endif

      throw Exception(name: "ModelUnavailable", description: "Apple Foundation Models requires a supported Apple Intelligence device and operating system.")
    }

    AsyncFunction("consumeWatchSnapshots") { () -> [String] in
      WatchConnectivityManager.shared.consumeSnapshots()
    }

    Function("getWatchState") { () -> [String: Any] in
      WatchConnectivityManager.shared.state()
    }
  }

  #if canImport(FoundationModels)
  @available(iOS 26.0, *)
  private static func analyzeWithSystemModel(
    _ features: SleepFeatures,
    featuresJSON: String
  ) async throws -> String {
    guard SystemLanguageModel.default.isAvailable else {
      throw Exception(name: "ModelUnavailable", description: "The on-device Apple model is not ready on this device.")
    }

    let instructions = """
      You assess sleep-pattern evidence entirely on device. App inactivity alone only means the user left this app; it is weak evidence and must remain uncertain. Apple Health sleep stages and sustained Apple Watch low-motion data are independent evidence. Never infer a diagnosis, stress disorder, or anxiety disorder. Never invent measurements. Return conservative boundary adjustments and confidence.
      """
    let prompt = "Assess this candidate using only the supplied validated numeric feature JSON:\n\(featuresJSON)"
    let session = LanguageModelSession(model: .default, instructions: instructions)
    let response = try await session.respond(to: prompt, generating: ModelSleepAssessment.self)
    let content = response.content
    let classification: String
    switch content.classification {
    case .likelySleep: classification = "likely-sleep"
    case .uncertain: classification = "uncertain"
    case .unlikelySleep: classification = "unlikely-sleep"
    }
    let encoded = EncodedAssessment(
      classification: classification,
      confidence: min(100, max(0, content.confidence)),
      suggestedStartOffsetMinutes: min(90, max(-90, content.suggestedStartOffsetMinutes)),
      suggestedEndOffsetMinutes: min(90, max(-90, content.suggestedEndOffsetMinutes)),
      explanation: content.explanation
    )
    let data = try JSONEncoder().encode(encoded)
    return String(decoding: data, as: UTF8.self)
  }
  #endif
}
