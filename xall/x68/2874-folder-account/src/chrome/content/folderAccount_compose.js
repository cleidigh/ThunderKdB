Services.scriptloader.loadSubScript("chrome://folderaccount/content/scripts/notifyTools/notifyTools.js", window);

var folderAccountCompose = {

  // Global variables
  prefs: Services.prefs,

  getPrefs: function (folderURI, blob) {

    // Retrieve the account from the preferences hive
    // Look at the samples below to see how blob is used...

    var acct = "";

    // If a folder has no prefs set, look at parent, then grandparent, et al until something is found or we run out of ancestors
    // folderURI = mailbox://somename@someaddr.com/folder/subfolder/subsubfolder/...

    // user_pref("extensions.folderaccount.mailbox://myemail@xxx.com/test%205ddr/Subfolder%20Level%201", "id1");
    // user_pref("extensions.folderaccount.mailbox://myemail@xxx.com/test%205ddr/Subfolder%20Level%201/gggg", "id2");

    // To retrieve this, we'd set blob to "to."
    // user_pref("extensions.folderaccount.to.mailbox://myemail@xxx.com/test%205ddr/Subfolder%20Level%201", "joe@smith.com");

    var ct = folderURI.split('/').length;
    while (ct > 3) {
      try {
        acct = folderAccountCompose.prefs.getCharPref("extensions.folderaccount." + blob + folderURI);
        break; // We got our value, let's leave this loop
      } catch (e) {} // Nothing to do, just leave acct at default value
      folderURI = folderURI.substring(0, folderURI.lastIndexOf('/')); // Point folderURI at the parent folder
      ct = folderURI.split('/').length;
    }
    return (acct);
  },

  changeComposeDetails: function (details) {

    var folderURI = "";
    var mediator = Services.wm;

    // Now cycle through all windows until we find one that understands GetSelectedFolderURI()
    // Known bug: if there is more than one "main" window open, we can't tell which one opened the compose window.

    var enumerator = mediator.getEnumerator(null);
    while (enumerator.hasMoreElements()) {
      var domWindow = enumerator.getNext();
      try {
        if (domWindow.gFolderDisplay && domWindow.gFolderDisplay.displayedFolder) {
          folderURI = domWindow.gFolderDisplay.displayedFolder.URI;
          break;
        }
      } catch (e) {} // If there's an error here, it's not what we want, so we need do nothing
    }

    let newDetails = {};
    
    // To:
    // Do NOT overwrite To: address if the message is new and already has one: 
    // The user probably selected an addr from the address book and wants to use that one.

    if (details.type == "new" && details.to.length == 0) {
      // Only set the To: address on a new message.  For forwards, or Reply All, 
      // more likely than not the user will want to use a non-default To address.
      try {
        var To = folderAccountCompose.getPrefs(folderURI, "to.");
        if (To) {
          newDetails.to = To;
        }
      } catch (e) {} // Nothing to do, just leave to: at default value
    }

    // Reply-To: Set everytime
    // (by Jakob)

    if ((details.type == "new" || folderAccountCompose.getPrefs(folderURI, "replyToOnReplyForward.")) 
        && details.replyTo.length == 0) {
      try {
        var replyTo = folderAccountCompose.getPrefs(folderURI, "replyTo.");
        if (replyTo) {
          newDetails.replyTo = replyTo;
        }
      } catch (e) {} // Nothing to do, just leave to: at default value
    }

    // Set CC for Replies
    
    if (details.type == "reply" && details.cc.length == 0) { 
      try {
        var To = folderAccountCompose.getPrefs(folderURI, "to.");
        var addToCcOnReply = folderAccountCompose.getPrefs(folderURI, "addToCcOnReply.");
        if (addToCcOnReply == "true") {
          newDetails.cc = To;
        }
      } catch (e) {} // Nothing to do, just leave cc: at default value
    }

    // FROM:    
    // Make sure we are using the desired identity

    var FromID = folderAccountCompose.getPrefs(folderURI, "");

    var overrideReturnAddress = folderAccountCompose.getPrefs(folderURI, "overrideReturnAddress.");

    var override = true;
    // No override if this is a reply or reply-all and overrideReturnAddress is true
    if (details.type == "reply" && overrideReturnAddress == "true")
      override = false;

    // Assume the user always wants the default From, for all sorts of messages, 
    // unless they have specified one

    if (FromID && override) {
      newDetails.identityId = FromID;
    }

    return newDetails;
  },

  folderAccountStateListener: {
    NotifyComposeBodyReady: function () {},

    NotifyComposeFieldsReady: function () {
      // let wndwId = WL.extension.windowManager.wrapWindow(window).id; // , windowId: wndwId}
      let tabId = WL.extension.tabManager.getWrapper(window).id;
      window.notifyTools.notifyBackground({ command: "getComposeDetails", tabId: tabId }).then((details) => {
        let changedDetails = folderAccountCompose.changeComposeDetails(details); // { bcc: `tabId.${tabId}@example.com` }
        window.notifyTools.notifyBackground({ command: "setComposeDetails", tabId: tabId, details: changedDetails });
      });
    },

    ComposeProcessDone: function (aResult) {},
    SaveInFolderDone: function (folderURI) {}
  },
  
  /**
  * This is called when the var gMsgCompose is init. We now take
  * the extraArguments value and listen for state changes so
  * we know when the editor is finished.
  */
  windowInit: function()
  {
    window.gMsgCompose.RegisterStateListener(folderAccountCompose.folderAccountStateListener);
  }

};

function onLoad(activatedWhileWindowOpen) {
  window.addEventListener("compose-window-init", function() { folderAccountCompose.windowInit(); }, true);
}

function onUnload(deactivatedWhileWindowOpen) {}
