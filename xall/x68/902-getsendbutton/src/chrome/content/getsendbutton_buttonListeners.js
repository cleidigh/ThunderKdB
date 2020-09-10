var GetSendButton_status = {

  startup: function() {
    this.observerService = Components.classes[
        "@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
    this.observerService.addObserver(this, "mail:updateToolbarItems",
      false);
    this.observerService.addObserver(this, "network:offline-status-changed");

    this.registerFolderListener();
    this.setElementStatus();
    this.setElementOfflineStatus();
  },

  shutdown: function() {
    this.observerService.removeObserver(this, "mail:updateToolbarItems");
    this.observerService.removeObserver(this, "network:offline-status-changed");
  },

  observe: function(aSubject, aTopic, aState) {
    switch (aTopic) {
      case "mail:updateToolbarItems":
        this.setElementStatus();
        this.setElementOfflineStatus();
        this.setGetMsgButtonTooltip();
        break;
      case "network:offline-status-changed":
        this.setElementOfflineStatus(aState == "offline");
        break;
      }
  },

  registerFolderListener: function() {
    // const MSG_FOLDER_FLAG_QUEUE = 0x0800;
    let folderListener = {
      OnItemIntPropertyChanged: function(parentItem, item, viewString) {
        if (parentItem instanceof Components.interfaces.nsIMsgFolder) {
          if (item == "TotalMessages") {
            if (parentItem.flags & 0x0800) {
              GetSendButton_status.setElementStatus();
              // console.log("GetSendButton: parentItem: " + parentItem);
              // console.log("GetSendButton: parentItem.flags: " + parentItem.flags);
              // console.log("GetSendButton: item: " + item);
              // console.log("GetSendButton: viewString: " + viewString);
            }
          }
        }
      }
    }

    let mailSession =
      Components.classes["@mozilla.org/messenger/services/session;1"]
      .getService(Components.interfaces.nsIMsgMailSession);
    let notifyFlags =
      Components.interfaces.nsIFolderListener.intPropertyChanged;
    mailSession.AddFolderListener(folderListener, notifyFlags);
  },

  setElementStatus: function() {
    let GetSendButton_sendAllButton = document.getElementById(
      "GetSendButton_S_all");
  
    // GetSendButton_sendAllButton exists only, 
    // if the button is in the toolbar
    if (GetSendButton_sendAllButton) {
      // if there are unsent messages
      if (MailOfflineMgr.haveUnsentMessages()) {
        GetSendButton_sendAllButton.removeAttribute("disabled");
      } else {
        GetSendButton_sendAllButton.setAttribute("disabled", true);
      }
    }

    let GetSendButton_sendAllMenuPopup = document.getElementById(
      "GetSendButton_messenger_menupopup_sendUnsent");

    // GetSendButton_sendAllMenuPopup exists only, 
    // if the button is in the toolbar
    if (GetSendButton_sendAllMenuPopup) {
      // if there are unsent messages
      if (MailOfflineMgr.haveUnsentMessages()) {
        GetSendButton_sendAllMenuPopup.removeAttribute("disabled");
      } else {
        GetSendButton_sendAllMenuPopup.setAttribute("disabled", true);
      }
    }
  },

  setElementOfflineStatus: function(isOffline) {
    let GetSendButton_popupItemSyncAll = document.getElementById(
      "GetSendButton_messenger_menupopup_SyncAll");
    let GetSendButton_popupItemSyncFlagged = document.getElementById(
      "GetSendButton_messenger_menupopup_SyncFlagged");
    let GetSendButton_popupItemSyncSelected = document.getElementById(
      "GetSendButton_messenger_menupopup_SyncSelected");

    // The popup menu items exist only, 
    // if the button is in the toolbar, so ask for the first item
    if (GetSendButton_popupItemSyncAll) {
      if (DefaultController.isCommandEnabled("cmd_synchronizeOffline")) {
        GetSendButton_popupItemSyncAll.removeAttribute("disabled");
      } else {
        GetSendButton_popupItemSyncAll.setAttribute("disabled", true);
      }
      if (DefaultController.isCommandEnabled("cmd_downloadFlagged")) {
        GetSendButton_popupItemSyncFlagged.removeAttribute("disabled");
      } else {
        GetSendButton_popupItemSyncFlagged.setAttribute("disabled", true);
      }
      if (DefaultController.isCommandEnabled("cmd_downloadSelected")) {
        GetSendButton_popupItemSyncSelected.removeAttribute("disabled");
      } else {
        GetSendButton_popupItemSyncSelected.setAttribute("disabled", true);
      }
    }
  },

  setGetMsgButtonTooltip: function() {

    var msgButton = document.getElementById("button-getsendbutton");
    // The button is not found in the document if isn't on the toolbar but available
    // in the Customize palette. In that case we do not need to update its tooltip.
    if (!msgButton)
      return;

    let prefGetSendButtonOnlySingleAccount =
      Services.prefs.getBoolPref(
        "extensions.getsendbutton.GetSendButton_OnlySingleAccount", true);
    let prefGetSendButtonPass =
      Services.prefs.getBoolPref(
        "extensions.getsendbutton.GetSendButton_AskPasswords", true);

    if (!prefGetSendButtonOnlySingleAccount) {
      if (prefGetSendButtonPass) {
        // should set the tooltip to "really all accounts - ask for passwords"
        msgButton.tooltipText = "";
      } else {
        // should set the tooltip to "only auth. accounts - don't ask for passwords"
        msgButton.tooltipText = "";
      }
      return;
    }

    // go further in case of only one explicit account

    var selectedFolders = GetSelectedMsgFolders();
    var folders;
    if (selectedFolders.length)
      folders = selectedFolders;
    else
      folders = [ GetDefaultAccountRootFolder() ];

    var bundle = document.getElementById("bundle_messenger");
    var listSeparator = bundle.getString("getMsgButtonTooltip.listSeparator");

    // Push the usernames through a Set() to remove duplicates.
    var names = new Set(folders.map(v => v.server.prettyName));
    var tooltipNames = Array.from(names).join(listSeparator);
    msgButton.tooltipText = bundle.getFormattedString("getMsgButtonTooltip",
                                                      [ tooltipNames ]);
  }

}

/* eventListeners are now called from WindowListener API *
window.addEventListener("load", function(e) {
  GetSendButton_status.startup();
}, false);
window.addEventListener("unload", function(e) {
  GetSendButton_status.shutdown();
}, false);
**********************************************************/
