var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { BrowserUtils } = ChromeUtils.import("resource://gre/modules/BrowserUtils.jsm");
var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

var restartButtonApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      restartButtonApi: {
        async restartButton() {
          if (xulAppInfo.version >= "91.0") {
            MailUtils.restartApplication();
          } else {
            BrowserUtils.restartApplication();
          }
        },
        async loadButton() {
          let recentWindow = Services.wm.getMostRecentWindow("mail:3pane");
          if (recentWindow) {
            recentWindow.addEventListener('DOMContentLoaded', (event) => {
              let restartButton = recentWindow.document.getElementById("restartbutton_dillinger-browserAction-toolbarbutton");
              if (restartButton == null) return;
              restartButton.setAttribute("tooltiptext", "Restart Thunderbird");
            });
          }
        },
      },
    };
  }
};
