var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var myapi = class extends ExtensionCommon.ExtensionAPI {
   getAPI(context) {
      let self = this;
      context.callOnClose(this);

      // keep track of windows manipulated by this API
      this.manipulatedWindows = [];

      return {
         myapi: {
            async hideemailfolder(windowId) {
               if (!windowId)
                  return false;

               //get the real window belonging to the WebExtebsion window ID
               let requestedWindow = context.extension.windowManager.get(windowId, context).window;
               if (!requestedWindow)
                  return false;

               self.manipulatedWindows.push(requestedWindow);
               requestedWindow.hideEmailFolderBackup = requestedWindow.gFolderTreeView._rebuild;
               requestedWindow.gFolderTreeView._rebuild = function(){
                  requestedWindow.hideEmailFolderBackup.call(requestedWindow.gFolderTreeView);
                  cleanTree();
               };
               requestedWindow.gFolderTreeView._rebuild();

               function cleanTree() {
                  for(let i = requestedWindow.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                    if (requestedWindow.gFolderTreeView._rowMap[i]._folder.parent === null && requestedWindow.gFolderTreeView._rowMap[i]._folder.name.includes("@")) {
                        requestedWindow.gFolderTreeView._rowMap.splice(i, 1);
                        requestedWindow.gFolderTreeView._tree.rowCountChanged(i, -1);
                        
                    }
                  }
               }
            },
         },
      };
   }

   close() {
      // This is called when the API shuts down. This API could be invoked multiple times in different contexts
      // and we therefore need to cleanup actions done by this API here.
      for (let manipulatedWindow of this.manipulatedWindows) {
         manipulatedWindow.gFolderTreeView._rebuild = manipulatedWindow.hideEmailFolderBackup;
         manipulatedWindow.gFolderTreeView._rebuild();
      }
   }

   onShutdown(isAppShutdown) {
      // This is called when the add-on or Thunderbird itself is shutting down.
      if (isAppShutdown) {
         return;
      }
      Services.obs.notifyObservers(null, "startupcache-invalidate", null);
   }
};
