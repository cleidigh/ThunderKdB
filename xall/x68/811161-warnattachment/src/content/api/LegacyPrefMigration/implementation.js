// Basic helper for preferences migration

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const WARNATTACHMENT_EXTENSION_BASE_PREF_NAME = "extensions.warnattachment.";


var LegacyPrefMigration = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      LegacyPrefMigration: {
        async getPref(name) {
            try{
                if (name == "timeout"){
                    // timeout is the only non-char type for current versions
                    // of warnattachment
                    return Services.prefs.getIntPref(WARNATTACHMENT_EXTENSION_BASE_PREF_NAME + name);
                }

                return Services.prefs.getStringPref(WARNATTACHMENT_EXTENSION_BASE_PREF_NAME+name);

            } catch(ex){
                return undefined;
            }
        },

      },
    };
  }
};
