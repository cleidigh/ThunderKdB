var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var recentWindow = Services.wm.getMostRecentWindow("mail:3pane");

var toggleMessagePaneApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      toggleMessagePaneApi: {
        async toggleMessagePane() {
          if (recentWindow) {
            recentWindow.addEventListener('DOMContentLoaded', (event) => {
              let toggleMessagePaneButton = recentWindow.document.getElementById("togglemessagepane_dillinger-browserAction-toolbarbutton");
              if (toggleMessagePaneButton == null) return;
              toggleMessagePaneButton.setAttribute("observes", "button_next");
              toggleMessagePaneButton.setAttribute("tooltiptext", "Toggle Message Pane");
              toggleMessagePaneButton.setAttribute("oncommand", "goDoCommand('cmd_toggleMessagePane')");
            });
          }
        },
      },
    };
  }
};
