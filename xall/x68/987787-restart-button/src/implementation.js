var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var restartButtonApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      restartButtonApi: {
        async restartButton() {
          let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(
            Ci.nsISupportsPRBool
          );
          
          Services.obs.notifyObservers(
            cancelQuit,
            "quit-application-requested",
            "restart"
          );
          
          if (cancelQuit.data) {
            return;
          }
          
          let flags = Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart;
          
          Services.startup.quit(flags);
        },
      },
    };
  }
};

