var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var toggleMessagePaneApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      toggleMessagePaneApi: {
        async toggleMessagePane() {
          let recentWindow = Services.wm.getMostRecentWindow("mail:3pane");
          if (recentWindow) {
            recentWindow.MsgToggleMessagePane();
          }
        },
      },
    };
  }
};
