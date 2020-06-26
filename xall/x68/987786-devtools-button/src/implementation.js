var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

var devToolsButtonApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      devToolsButtonApi: {
        async devToolsButton() {
          let recentWindow = Services.wm.getMostRecentWindow("mail:3pane");
          if (recentWindow) {
            if (xulAppInfo.version >= "72.0") {
              recentWindow.BrowserToolboxLauncher.init();
            } else {
              recentWindow.BrowserToolboxProcess.init();
            }
          }
        },
      },
    };
  }
};
