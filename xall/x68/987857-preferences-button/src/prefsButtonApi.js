var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { BrowserUtils } = ChromeUtils.import("resource://gre/modules/BrowserUtils.jsm");

var prefsButtonApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      prefsButtonApi: {
        async prefsButton() {
          let recentWindow = Services.wm.getMostRecentWindow("mail:3pane");
          if (recentWindow) {
            recentWindow.openOptionsDialog();
          }
        },
        async loadButton() {
          let recentWindow = Services.wm.getMostRecentWindow("mail:3pane");
          if (recentWindow) {
            recentWindow.addEventListener('DOMContentLoaded', (event) => {
              let prefsButton = recentWindow.document.getElementById("prefsbutton_dillinger-browserAction-toolbarbutton");
              if (prefsButton == null) return;
              prefsButton.setAttribute("tooltiptext", "Preferences");
              //let targetToolbar = recentWindow.document.getElementById("tabbar-toolbar");
              //targetToolbar.appendChild(prefsButton);
            });
          }
        },
      },
    };
  }
};
