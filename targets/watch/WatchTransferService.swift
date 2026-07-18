import Foundation
import WatchConnectivity

final class WatchTransferService: NSObject, WCSessionDelegate {
    static let shared = WatchTransferService()
    private let pendingKey = "sleep-detector-pending-watch-payloads-v1"
    private let lock = NSLock()

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

    func enqueue(_ snapshot: WatchSleepSnapshot) {
        activate()
        guard let payloadData = try? JSONEncoder.sleepDetector.encode(snapshot),
              let payload = String(data: payloadData, encoding: .utf8) else { return }
        lock.lock()
        var pending = UserDefaults.standard.stringArray(forKey: pendingKey) ?? []
        if !pending.contains(payload) { pending.append(payload) }
        UserDefaults.standard.set(Array(pending.suffix(5)), forKey: pendingKey)
        flushLocked()
        lock.unlock()
    }

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        guard activationState == .activated, error == nil else { return }
        lock.lock()
        flushLocked()
        lock.unlock()
    }

    private func flushLocked() {
        guard WCSession.default.activationState == .activated else { return }
        let pending = UserDefaults.standard.stringArray(forKey: pendingKey) ?? []
        pending.forEach { payload in
            WCSession.default.transferUserInfo([
                "kind": "sleep-health-snapshot",
                "schemaVersion": 1,
                "payload": payload,
            ])
        }
        UserDefaults.standard.removeObject(forKey: pendingKey)
    }
}

extension JSONEncoder {
    static var sleepDetector: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .millisecondsSince1970
        return encoder
    }
}
