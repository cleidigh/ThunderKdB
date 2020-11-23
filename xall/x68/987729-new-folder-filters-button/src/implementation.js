var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var ffb_api = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      ffb_api: {
        async filter_folders() {
          Services.wm.getMostRecentWindow("mail:3pane").goDoCommand('cmd_applyFilters');
          },
        },
      };
    }
}; 
