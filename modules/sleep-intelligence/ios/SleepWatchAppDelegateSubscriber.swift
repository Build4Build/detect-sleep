import ExpoModulesCore
import UIKit

public final class SleepWatchAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    WatchConnectivityManager.shared.activate()
    return true
  }
}
