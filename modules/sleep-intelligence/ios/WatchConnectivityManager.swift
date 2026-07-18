import Foundation
import WatchConnectivity

final class WatchConnectivityManager: NSObject, WCSessionDelegate, @unchecked Sendable {
  static let shared = WatchConnectivityManager()

  private let appGroup = "group.com.sleepdetector.app"
  private let snapshotsKey = "sleep-detector-watch-snapshot-queue-v1"
  private let queue = DispatchQueue(label: "com.sleepdetector.watch-connectivity")

  private override init() {
    super.init()
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    if session.activationState != .activated {
      session.activate()
    }
  }

  func state() -> [String: Any] {
    guard WCSession.isSupported() else {
      return ["supported": false, "paired": false, "installed": false]
    }
    let session = WCSession.default
    return [
      "supported": true,
      "paired": session.isPaired,
      "installed": session.isWatchAppInstalled,
    ]
  }

  func consumeSnapshots() -> [String] {
    queue.sync {
      let defaults = sharedDefaults()
      let snapshots = defaults.stringArray(forKey: snapshotsKey) ?? []
      defaults.removeObject(forKey: snapshotsKey)
      return snapshots
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {}

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    guard userInfo["kind"] as? String == "sleep-health-snapshot",
          userInfo["schemaVersion"] as? Int == 1,
          let payload = userInfo["payload"] as? String else { return }

    queue.async { [snapshotsKey] in
      let defaults = self.sharedDefaults()
      var snapshots = defaults.stringArray(forKey: snapshotsKey) ?? []
      if !snapshots.contains(payload) {
        snapshots.append(payload)
      }
      defaults.set(Array(snapshots.suffix(30)), forKey: snapshotsKey)
    }
  }

  private func sharedDefaults() -> UserDefaults {
    UserDefaults(suiteName: appGroup) ?? .standard
  }
}
