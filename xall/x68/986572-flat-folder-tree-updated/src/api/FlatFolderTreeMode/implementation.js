var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var { iteratorUtils } = Components.utils.import("resource:///modules/iteratorUtils.jsm");


var FlatFolderTreeMode = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    let win = Services.wm.getMostRecentWindow("mail:3pane");
    let gFolderTreeView = win.gFolderTreeView;
    const IFolderTreeMode = win.IFolderTreeMode;
    const ftvItem = win.ftvItem;

    return {
      FlatFolderTreeMode: {
        __FlatFolderTree_init: function() {
          this.__proto__ = IFolderTreeMode;
          gFolderTreeView.registerFolderTreeMode('flat', this, "Flattened Folders");

          if (gFolderTreeView.mode != "flat") {
            gFolderTreeView.mode = "flat";
          }
          gFolderTreeView._rebuild();

          console.log("FlatFolderTreeMode initialized");
        },

        setFolderProperty: function(folder, value) {
          let f = context.extension.folderManager.get(folder["accountId"], folder["path"]);
          f.setStringProperty("FFTState", value);
          if (gFolderTreeView.mode != "flat") {
            gFolderTreeView.mode = "flat";
          }
          gFolderTreeView._rebuild();
        },
        // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1520427
        setParentProperty: function(folder, value) {
          let f = context.extension.folderManager.get(folder["accountId"], folder["path"]).parent;
          if (!f) {
            return;
          }

          f.setStringProperty("FFTState", value);
          if (gFolderTreeView.mode != "flat") {
            gFolderTreeView.mode = "flat";
          }
          gFolderTreeView._rebuild();
        },
        getFolderProperty: async function(folder) {
          let f = context.extension.folderManager.get(folder["accountId"], folder["path"]);
          return f.getStringProperty("FFTState");
        },


        generateMap: function ftv_flat_generateMap(ftv) {
            let accounts = gFolderTreeView._sortedAccounts();

            let accountMap = [];

            function get_children(folder, parent, level)
            {
                var children = [];
                var child;

                for (var subFolder of fixIterator(folder.subFolders, Components.interfaces.nsIMsgFolder)) {
                 if(subFolder.getStringProperty('FFTState') == 'Broken' && subFolder.hasSubFolders) {
                     children = children.concat(get_children(subFolder, folder, level));
                    } else if(subFolder.getStringProperty('FFTState') == 'Promoted' && subFolder.hasSubFolders) {
                     child = new ftvItem(subFolder);
                     child._parent = parent;
                     child._level = level + 1;
                     child._children = [];
                     children.push(child);
                     children = children.concat(get_children(subFolder, folder, level));
                    } else {
                        child = new ftvItem(subFolder);
                        child._parent = parent;
                        child._level = level + 1;
                        children.push(child);
                    }
                }

                children.sort(function (a, b) {
                    let sortKey = a._folder.compareSortKeys(b._folder);
                    if (sortKey)
                        return sortKey;
                    return a.text.toLowerCase() > b.text.toLowerCase();
                });

                return children;
            }

            for (var account of accounts)
            {
                let a = new ftvItem(account.incomingServer.rootFolder);
                a._children = get_children(a._folder, a._folder, 0);
                accountMap.push(a);
            }

            return accountMap;
        },
        getParentOfFolder: function(aFolder) {
            return aFolder.parent;
        },
        getFolderForMsgHdr: function IFolderTreeMode_getFolderForMsgHdr(aMsgHdr) {
            return aMsgHdr.folder;
        },
        onFolderAdded: function IFolderTreeMode_onFolderAdded(aParent, aFolder) {
            gFolderTreeView.addFolder(aParent, aFolder);
        },

      },
    };
  }
};
