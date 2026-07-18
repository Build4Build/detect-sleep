import Foundation

struct WatchSleepSnapshot: Codable, Identifiable {
    let schemaVersion: Int
    let id: String
    let generatedAt: Date
    let sleepStart: Date
    let sleepEnd: Date
    let totalSleepMinutes: Double
    let awakeMinutes: Double
    let coreMinutes: Double
    let deepMinutes: Double
    let remMinutes: Double
    let unspecifiedMinutes: Double
    let restingHeartRate: Double?
    let heartRateVariabilityMs: Double?
    let respiratoryRate: Double?
    let wristTemperatureCelsius: Double?
    let source: String

    var formattedDuration: String {
        let total = max(0, Int(totalSleepMinutes.rounded()))
        return "\(total / 60)h \(total % 60)m"
    }
}
