var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


var FolderUtils = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      FolderUtils: {
        // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1520427
        getParent: async function(folder) {
          let f = context.extension.folderManager.get(folder["accountId"], folder["path"]).parent;
          if (f) {
            return context.extension.folderManager.convert(f);
          }
        },
      },
    };
  }
};
