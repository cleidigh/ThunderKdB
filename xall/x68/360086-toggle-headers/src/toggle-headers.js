var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var toggleHeadersApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      toggleHeadersApi: {
        async toggleHeaders() {
          let window = Services.wm.getMostRecentWindow("mail:3pane");

          // Get the preferences mail branch...
      	  let mailPrefs = Components
              .classes["@mozilla.org/preferences-service;1"]
              .getService(Components.interfaces.nsIPrefService)
              .getBranch("mail.");

          let currentHeaderSetting = mailPrefs.getIntPref("show_headers");

          // Switch from normal to all headers.
          if (currentHeaderSetting == 1) {
            window.goDoCommand('cmd_viewAllHeader');
          }
          // Switch from all to normal headers.
          else if (currentHeaderSetting == 2) {
            window.goDoCommand('cmd_viewNormalHeader');
          }

          // Get all current windows to reload the message in them.
          let windows = Services.wm.getEnumerator(null)
          while (windows.hasMoreElements()) {
            let currentWindow = windows.getNext()
            
            // The main window has already been reloaded.
            if (currentWindow != window) {
              currentWindow.ReloadMessage();
            }
          }
        },
      }
    }
  }
};
