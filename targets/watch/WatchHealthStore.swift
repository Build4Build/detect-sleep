import Foundation
import HealthKit

@MainActor
final class WatchHealthStore: ObservableObject {
    @Published private(set) var latestSnapshot: WatchSleepSnapshot?
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private let healthStore = HKHealthStore()
    private let accessRequestedKey = "sleep-detector-watch-health-requested"

    var hasRequestedAccess: Bool {
        UserDefaults.standard.bool(forKey: accessRequestedKey)
    }

    func requestAccessAndRefresh() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            errorMessage = "Health data is unavailable on this Watch."
            return
        }

        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await healthStore.requestAuthorization(toShare: [], read: readableTypes())
            UserDefaults.standard.set(true, forKey: accessRequestedKey)
            try await refresh()
        } catch {
            errorMessage = "Health access failed: \(error.localizedDescription)"
        }
    }

    func refreshIfAuthorized() async {
        guard hasRequestedAccess else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await refresh()
        } catch {
            errorMessage = "Could not refresh sleep data: \(error.localizedDescription)"
        }
    }

    private func refresh() async throws {
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return }
        let end = Date()
        let start = Calendar.current.date(byAdding: .hour, value: -36, to: end) ?? end.addingTimeInterval(-36 * 3600)
        let samples = try await categorySamples(type: sleepType, start: start, end: end)
        guard let snapshot = try await makeSnapshot(from: samples, start: start, end: end) else {
            latestSnapshot = nil
            return
        }
        latestSnapshot = snapshot
        WatchTransferService.shared.enqueue(snapshot)
    }

    private func readableTypes() -> Set<HKObjectType> {
        var types = Set<HKObjectType>()
        if let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(type) }
        if let type = HKObjectType.quantityType(forIdentifier: .restingHeartRate) { types.insert(type) }
        if let type = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN) { types.insert(type) }
        if let type = HKObjectType.quantityType(forIdentifier: .respiratoryRate) { types.insert(type) }
        if let type = HKObjectType.quantityType(forIdentifier: .appleSleepingWristTemperature) { types.insert(type) }
        return types
    }

    private func categorySamples(
        type: HKCategoryType,
        start: Date,
        end: Date
    ) async throws -> [HKCategorySample] {
        try await withCheckedThrowingContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: samples as? [HKCategorySample] ?? [])
                }
            }
            healthStore.execute(query)
        }
    }

    private func quantityAverage(
        identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        start: Date,
        end: Date
    ) async throws -> Double? {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else { return nil }
        return try await withCheckedThrowingContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .discreteAverage) {
                _, result, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: result?.averageQuantity()?.doubleValue(for: unit))
                }
            }
            healthStore.execute(query)
        }
    }

    private func makeSnapshot(
        from samples: [HKCategorySample],
        start queryStart: Date,
        end queryEnd: Date
    ) async throws -> WatchSleepSnapshot? {
        let allSleepSamples = samples.filter { sample in
            guard let value = HKCategoryValueSleepAnalysis(rawValue: sample.value) else { return false }
            return value == .asleepUnspecified || value == .asleepCore || value == .asleepDeep || value == .asleepREM
        }.sorted { $0.startDate < $1.startDate }
        let sleepSamples = latestSleepEpisode(from: allSleepSamples)
        guard let first = sleepSamples.first, let last = sleepSamples.last else { return nil }

        let sleepStart = first.startDate
        let sleepEnd = last.endDate
        let episodeSamples = samples.filter {
            $0.endDate > sleepStart && $0.startDate < sleepEnd
        }
        let hasDetailedStages = episodeSamples.contains {
            $0.value == HKCategoryValueSleepAnalysis.asleepCore.rawValue ||
                $0.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue ||
                $0.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue
        }
        let totalSleep = mergedDuration(sleepSamples.map { ($0.startDate, $0.endDate) })
        func minutes(for value: HKCategoryValueSleepAnalysis) -> Double {
            if value == .asleepUnspecified && hasDetailedStages { return 0 }
            let intervals = episodeSamples
                .filter { $0.value == value.rawValue }
                .map {
                    let start = max($0.startDate, sleepStart)
                    let end = min($0.endDate, sleepEnd)
                    return (start, end)
                }
                .filter { $0.1 > $0.0 }
            return mergedDuration(intervals)
        }

        async let restingHeartRate = quantityAverage(
            identifier: .restingHeartRate,
            unit: HKUnit.count().unitDivided(by: .minute()),
            start: sleepStart,
            end: sleepEnd
        )
        async let hrv = quantityAverage(
            identifier: .heartRateVariabilitySDNN,
            unit: .secondUnit(with: .milli),
            start: sleepStart,
            end: sleepEnd
        )
        async let respiratoryRate = quantityAverage(
            identifier: .respiratoryRate,
            unit: HKUnit.count().unitDivided(by: .minute()),
            start: sleepStart,
            end: sleepEnd
        )
        async let wristTemperature = quantityAverage(
            identifier: .appleSleepingWristTemperature,
            unit: .degreeCelsius(),
            start: max(queryStart, sleepStart),
            end: min(queryEnd, sleepEnd)
        )

        let metrics = try await (restingHeartRate, hrv, respiratoryRate, wristTemperature)
        return WatchSleepSnapshot(
            schemaVersion: 1,
            id: UUID().uuidString,
            generatedAt: Date(),
            sleepStart: sleepStart,
            sleepEnd: sleepEnd,
            totalSleepMinutes: totalSleep,
            awakeMinutes: minutes(for: .awake),
            coreMinutes: minutes(for: .asleepCore),
            deepMinutes: minutes(for: .asleepDeep),
            remMinutes: minutes(for: .asleepREM),
            unspecifiedMinutes: minutes(for: .asleepUnspecified),
            restingHeartRate: metrics.0,
            heartRateVariabilityMs: metrics.1,
            respiratoryRate: metrics.2,
            wristTemperatureCelsius: metrics.3,
            source: "apple-watch-healthkit"
        )
    }

    private func mergedDuration(_ intervals: [(Date, Date)]) -> Double {
        let sorted = intervals.sorted { $0.0 < $1.0 }
        guard var current = sorted.first else { return 0 }
        var seconds = 0.0
        for interval in sorted.dropFirst() {
            if interval.0 <= current.1 {
                current.1 = max(current.1, interval.1)
            } else {
                seconds += current.1.timeIntervalSince(current.0)
                current = interval
            }
        }
        seconds += current.1.timeIntervalSince(current.0)
        return seconds / 60
    }

    /** Selects the most recent episode instead of combining separate nights. */
    private func latestSleepEpisode(from samples: [HKCategorySample]) -> [HKCategorySample] {
        guard let first = samples.first else { return [] }
        let maximumGap: TimeInterval = 3 * 60 * 60
        var episodes: [[HKCategorySample]] = [[first]]
        for sample in samples.dropFirst() {
            let previousEnd = episodes[episodes.count - 1]
                .map(\.endDate)
                .max() ?? sample.startDate
            if sample.startDate.timeIntervalSince(previousEnd) <= maximumGap {
                episodes[episodes.count - 1].append(sample)
            } else {
                episodes.append([sample])
            }
        }
        return episodes.max {
            ($0.map(\.endDate).max() ?? .distantPast) <
                ($1.map(\.endDate).max() ?? .distantPast)
        } ?? []
    }
}
