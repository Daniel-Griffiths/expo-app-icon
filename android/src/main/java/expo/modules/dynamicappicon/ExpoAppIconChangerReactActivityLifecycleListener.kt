package expo.modules.dynamicappicon

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import expo.modules.core.interfaces.ReactActivityLifecycleListener

object SharedObject {
    var packageName: String = ""
    var classesToKill = ArrayList<String>()
    var icon: String = ""
    var pm: PackageManager? = null
    var shouldChangeIcon: Boolean = false
}

class ExpoAppIconChangerReactActivityLifecycleListener : ReactActivityLifecycleListener {
    private var currentActivity: Activity? = null
    private val handler = Handler(Looper.getMainLooper())

    override fun onPause(activity: Activity) {
        currentActivity = activity
        // Apply icon change immediately when app goes to background
        if (SharedObject.shouldChangeIcon) {
            applyIconChange(activity)
            // Force close the app after icon change to ensure clean restart
            handler.postDelayed(
                    { forceCloseApp(activity) },
                    500
            ) // Small delay to ensure icon change completes
        }
    }

    override fun onResume(activity: Activity) {
        currentActivity = activity
        // Repair any non-icon activities that were incorrectly disabled by older versions
        repairIncorrectlyDisabledActivities(activity)
    }

    override fun onDestroy(activity: Activity) {
        if (SharedObject.shouldChangeIcon) {
            applyIconChange(activity)
        }
        if (currentActivity === activity) {
            currentActivity = null
        }
    }

    private fun forceCloseApp(activity: Activity) {
        try {
            // Force close the app process to ensure clean restart
            activity.finishAffinity()
            android.os.Process.killProcess(android.os.Process.myPid())
        } catch (e: Exception) {
            Log.e("IconChange", "Error force closing app", e)
        }
    }

    private fun applyIconChange(activity: Activity) {
        SharedObject.icon.takeIf { it.isNotEmpty() }?.let { icon ->
            val pm = SharedObject.pm ?: return
            val newComponent = ComponentName(SharedObject.packageName, icon)

            if (!doesComponentExist(newComponent)) {
                SharedObject.shouldChangeIcon = false
                return
            }

            try {
                // Get all launcher activities and disable all icon aliases except the new one
                val packageInfo =
                        pm.getPackageInfo(
                                SharedObject.packageName,
                                PackageManager.GET_ACTIVITIES or
                                        PackageManager.GET_DISABLED_COMPONENTS
                        )

                // Only disable activities that are icon aliases (named MainActivity*).
                // The bare MainActivity is deliberately excluded: it must stay
                // enabled so tools that launch it by explicit component (e.g. the
                // Expo dev client) keep working. Its launcher role is owned by the
                // DEFAULT alias instead (see the config plugin).
                val mainActivityPrefix = "${SharedObject.packageName}.MainActivity"
                val bareMainActivity = "${SharedObject.packageName}.MainActivity"

                packageInfo.activities?.forEach { activityInfo ->
                    val componentName = ComponentName(SharedObject.packageName, activityInfo.name)
                    val state = pm.getComponentEnabledSetting(componentName)

                    // Only manage the icon aliases, leave MainActivity and other activities alone
                    val isIconAlias = activityInfo.name.startsWith(mainActivityPrefix) &&
                            activityInfo.name != bareMainActivity

                    if (isIconAlias &&
                                    activityInfo.name != icon &&
                                    state != PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                    ) {
                        pm.setComponentEnabledSetting(
                                componentName,
                                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                                PackageManager.DONT_KILL_APP
                        )
                        Log.i("IconChange", "Disabled component: ${activityInfo.name}")
                    }
                }

                // Enable the new icon
                pm.setComponentEnabledSetting(
                        newComponent,
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                        PackageManager.DONT_KILL_APP
                )
                Log.i("IconChange", "Enabled new icon: $icon")
            } catch (e: Exception) {
                Log.e("IconChange", "Error during icon change", e)
            } finally {
                SharedObject.shouldChangeIcon = false
            }

            // Ensure at least one component is enabled
            ensureAtLeastOneComponentEnabled(activity)
        }
    }

    private fun ensureAtLeastOneComponentEnabled(context: Context) {
        val pm = SharedObject.pm ?: return
        val packageInfo =
                pm.getPackageInfo(
                        SharedObject.packageName,
                        PackageManager.GET_ACTIVITIES or PackageManager.GET_DISABLED_COMPONENTS
                )

        val hasEnabledComponent =
                packageInfo.activities?.any { activityInfo ->
                    val componentName = ComponentName(SharedObject.packageName, activityInfo.name)
                    pm.getComponentEnabledSetting(componentName) ==
                            PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                }
                        ?: false

        if (!hasEnabledComponent) {
            // Fall back to the DEFAULT alias (the launcher), not the bare
            // MainActivity, which intentionally has no launcher filter.
            val defaultAlias = "${SharedObject.packageName}.MainActivityDEFAULT"
            val defaultComponent = ComponentName(SharedObject.packageName, defaultAlias)
            try {
                pm.setComponentEnabledSetting(
                        defaultComponent,
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                        PackageManager.DONT_KILL_APP
                )
                Log.i("IconChange", "No active component found. Re-enabling $defaultAlias")
            } catch (e: Exception) {
                Log.e("IconChange", "Error enabling fallback DEFAULT alias", e)
            }
        }
    }

    /**
     * Repair activities that were incorrectly disabled by older versions of this library.
     * Re-enables any non-icon-alias activities that are currently disabled.
     */
    private fun repairIncorrectlyDisabledActivities(activity: Activity) {
        val pm = activity.packageManager
        val packageName = activity.packageName

        try {
            val packageInfo =
                    pm.getPackageInfo(
                            packageName,
                            PackageManager.GET_ACTIVITIES or PackageManager.GET_DISABLED_COMPONENTS
                    )

            val mainActivityPrefix = "${packageName}.MainActivity"
            val bareMainActivity = "${packageName}.MainActivity"

            packageInfo.activities?.forEach { activityInfo ->
                // The bare MainActivity is not an icon alias and must stay enabled,
                // so a previously-disabled MainActivity gets repaired here too.
                val isIconAlias = activityInfo.name.startsWith(mainActivityPrefix) &&
                        activityInfo.name != bareMainActivity

                // If it's NOT an icon alias, it should never have been disabled by us
                if (!isIconAlias) {
                    val componentName = ComponentName(packageName, activityInfo.name)
                    val state = pm.getComponentEnabledSetting(componentName)

                    // Re-enable if it was explicitly disabled
                    if (state == PackageManager.COMPONENT_ENABLED_STATE_DISABLED) {
                        pm.setComponentEnabledSetting(
                                componentName,
                                PackageManager.COMPONENT_ENABLED_STATE_DEFAULT,
                                PackageManager.DONT_KILL_APP
                        )
                        Log.i("IconChange", "Repaired incorrectly disabled activity: ${activityInfo.name}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("IconChange", "Error repairing disabled activities", e)
        }
    }

    /** Check if a component exists in the manifest (including disabled ones). */
    private fun doesComponentExist(componentName: ComponentName): Boolean {
        return try {
            val packageInfo =
                    SharedObject.pm?.getPackageInfo(
                            SharedObject.packageName,
                            PackageManager.GET_ACTIVITIES or PackageManager.GET_DISABLED_COMPONENTS
                    )

            val activityExists =
                    packageInfo?.activities?.any { it.name == componentName.className } == true

            activityExists
        } catch (e: Exception) {
            false
        }
    }
}
