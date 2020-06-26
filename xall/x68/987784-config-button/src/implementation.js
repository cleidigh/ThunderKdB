var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

var configButtonApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      configButtonApi: {
        async configButton() {
          let recentWindow = Services.wm.getMostRecentWindow("mail:3pane");
          if (recentWindow) {
            if (xulAppInfo.version >= "73.0") {
              recentWindow.openDialog("chrome://global/content/config.xhtml","","centerscreen,resizable");
            } else {
              recentWindow.openDialog("chrome://global/content/config.xul","","centerscreen,resizable");
            }
          }
        },
      },
    };
  }
};
