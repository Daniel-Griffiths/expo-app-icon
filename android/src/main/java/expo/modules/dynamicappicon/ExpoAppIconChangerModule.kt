package expo.modules.dynamicappicon

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoAppIconChangerModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("ExpoAppIconChanger")

        Function("setAppIcon") { name: String? ->
            try {
                SharedObject.packageName = context.packageName
                SharedObject.pm = pm
                SharedObject.shouldChangeIcon = true

                var result: String

                // The default icon is served by a dedicated alias so the real
                // MainActivity is never disabled (see the config plugin).
                val defaultIcon = context.packageName + ".MainActivity" + "DEFAULT"

                if (name == null) {
                    // Resetting to default icon if nothing passed
                    var currentIcon =
                            if (!SharedObject.icon.isEmpty()) SharedObject.icon
                            else defaultIcon

                    SharedObject.classesToKill.add(currentIcon)
                    SharedObject.icon = defaultIcon
                    result = "DEFAULT"
                } else {
                    var newIcon = context.packageName + ".MainActivity" + name
                    var currentIcon =
                            if (!SharedObject.icon.isEmpty()) SharedObject.icon
                            else defaultIcon

                    if (currentIcon == newIcon) {
                        return@Function name
                    }

                    SharedObject.classesToKill.add(currentIcon)
                    SharedObject.icon = newIcon
                    result = name
                }

                // background the app to trigger icon change
                try {
                    currentActivity.moveTaskToBack(true)
                } catch (e: Exception) {
                    // do nothing
                }

                return@Function result
            } catch (e: Exception) {
                return@Function false
            }
        }

        Function("getAppIcon") {
            val componentClass: String = currentActivity.componentName.className
            val currentIcon: String =
                    if (SharedObject.icon.isNotEmpty()) SharedObject.icon else componentClass
            val parts = currentIcon.split("MainActivity")
            val currentIconName = if (parts.size > 1) parts[1] else ""

            return@Function if (currentIconName.isEmpty() || currentIconName == "DEFAULT") "DEFAULT"
            else currentIconName
        }
    }

    private val context: Context
        get() = requireNotNull(appContext.reactContext) { "React Application Context is null" }

    private val currentActivity
        get() = requireNotNull(appContext.activityProvider?.currentActivity)

    private val pm
        get() = requireNotNull(currentActivity.packageManager)
}
