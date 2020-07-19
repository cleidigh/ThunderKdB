var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      myapi: {
        async sendLater() {

          let recentWindow = Services.wm.getMostRecentWindow("msgcompose");
          if (recentWindow) {

            recentWindow.SendMessageLater();

          }
        }
      }
    }
  }
}
