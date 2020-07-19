var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

//Define API
var newTabButtonApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      newTabButtonApi: {
        openNewTab: async function (active) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          if (rw) {
            let focusedPane = rw.gFolderDisplay.focusedPane;
            if (focusedPane && focusedPane.getAttribute("id") == "folderTree") {
              rw.MsgOpenNewTabForFolder(!active);
            } else if (rw.gDBView) {
              let selectedMessages = rw.gFolderDisplay.selectedMessages;
              if (selectedMessages.length) {
                let numMessages = selectedMessages.length;
                for (let i = 0; i < numMessages; i++) {
                  rw.document.getElementById("tabmail").openTab("message", {
                    msgHdr: selectedMessages[i],
                    viewWrapperToClone: rw.gFolderDisplay.view,
                    background: (i !== numMessages - 1) || !active
                  });
                }
              }
            }
          }
        }
      }
    };
  }
}