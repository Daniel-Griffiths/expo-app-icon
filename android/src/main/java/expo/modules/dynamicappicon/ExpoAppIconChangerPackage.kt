package expo.modules.dynamicappicon

import android.content.Context
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener

class ExpoAppIconChangerPackage : Package {
    override fun createReactActivityLifecycleListeners(
            activityContext: Context
    ): List<ReactActivityLifecycleListener> {
        return listOf(ExpoAppIconChangerReactActivityLifecycleListener())
    }
}
