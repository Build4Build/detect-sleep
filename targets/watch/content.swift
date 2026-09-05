import SwiftUI

struct ContentView: View {
    @StateObject private var health = WatchHealthStore()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Label("Sleep Detector", systemImage: "bed.double.fill")
                        .font(.headline)

                    if health.isLoading {
                        ProgressView("Reading Health…")
                    } else if let snapshot = health.latestSnapshot {
                        Text(snapshot.formattedDuration)
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                        Text("Last recorded sleep")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        stageRow("Core", minutes: snapshot.coreMinutes, color: .blue)
                        stageRow("Deep", minutes: snapshot.deepMinutes, color: .indigo)
                        stageRow("REM", minutes: snapshot.remMinutes, color: .cyan)

                        if let hrv = snapshot.heartRateVariabilityMs {
                            metricRow("HRV", value: String(format: "%.0f ms", hrv))
                        }
                        if let heartRate = snapshot.restingHeartRate {
                            metricRow("Resting HR", value: String(format: "%.0f bpm", heartRate))
                        }

                        Text("Recovery signals are wellness observations, not a stress or anxiety diagnosis.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("Allow Health access to use Apple Watch sleep stages for more precise reports.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if let error = health.errorMessage {
                        Text(error)
                            .font(.caption2)
                            .foregroundStyle(.red)
                    }

                    Button(health.hasRequestedAccess ? "Refresh" : "Allow Health Access") {
                        Task { await health.requestAccessAndRefresh() }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(health.isLoading)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
            }
            .navigationTitle("Sleep")
        }
        .task {
            WatchTransferService.shared.activate()
            await health.refreshIfAuthorized()
        }
    }

    private func stageRow(_ label: String, minutes: Double, color: Color) -> some View {
        HStack {
            Circle().fill(color).frame(width: 7, height: 7)
            Text(label).font(.caption)
            Spacer()
            Text(formatMinutes(minutes)).font(.caption.monospacedDigit())
        }
    }

    private func metricRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label).font(.caption)
            Spacer()
            Text(value).font(.caption.monospacedDigit())
        }
    }

    private func formatMinutes(_ minutes: Double) -> String {
        let total = max(0, Int(minutes.rounded()))
        return "\(total / 60)h \(total % 60)m"
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
