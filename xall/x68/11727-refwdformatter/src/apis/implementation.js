/// This code is from here: [sample-extensions/legacyPrefMigration at master · thundernest/sample-extensions](https://github.com/thundernest/sample-extensions/tree/master/legacyPrefMigration)
///////////////////////////////////////

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      myapi: {
        async getPref(name) {
          try {
            return Services.prefs.getBoolPref(name);
          } catch (ex) {
            return undefined;
          }
        },
      },
    };
  }
};
