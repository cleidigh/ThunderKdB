// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-common.js", window, "UTF-8");

if (!CBD)
    var CBD = {};

function onLoad(activatedWhileWindowOpen) {
    
    window.CBD.init();
    
    // Delete message
    if (typeof window.DefaultController != "undefined" && typeof defaultControllerDoCommandOrig == "undefined") {
        var defaultControllerDoCommandOrig = window.DefaultController.doCommand;
        window.DefaultController.doCommand = function (command) {
            if (!this.isCommandEnabled(command))
                return;
            switch (command) {
            case "button_delete":
            case "cmd_delete":
                if (window.CBD.checktrash(false))
                    defaultControllerDoCommandOrig.apply(this, arguments);
                break;
            case "cmd_shiftDelete":
                if (window.CBD.checktrash(true))
                    defaultControllerDoCommandOrig.apply(this, arguments);
                break;
            default:
                defaultControllerDoCommandOrig.apply(this, arguments);
            }
        };
    }
    
    // Menu move message to trash
    if (typeof window.MsgMoveMessage != "undefined" && typeof MsgMoveMessageOrig == "undefined") {
        var MsgMoveMessageOrig = window.MsgMoveMessage;
        window.MsgMoveMessage = function (aDestFolder) {
            if (window.CBD.isSubTrash(aDestFolder) != 0) {
                if (window.CBD.deleteLocked() || !window.CBD.confirmbeforedelete ('gotrash'))
                    return;
            }
            MsgMoveMessageOrig.apply(this, arguments);
        };
    }
    
    // case folder delete
    if (typeof window.gFolderTreeController != "undefined" && window.gFolderTreeController.emptyTrash && typeof EmptyTrashOrig == "undefined") {
        var EmptyTrashOrig = window.gFolderTreeController.emptyTrash;
        window.gFolderTreeController.emptyTrash = function (aFolder) {
            if (!CBD.areFoldersLockedWhenEmptyingTrash())
                EmptyTrashOrig.apply(this, arguments);
        };
        var DeleteFolderOrig = window.gFolderTreeController.deleteFolder;
        window.gFolderTreeController.deleteFolder = function () {
            if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock")) {
                window.alert(window.CBD.bundle.GetStringFromName("lockedFolder"));
                return;
            }
            let folders = window.gFolderTreeView.getSelectedFolders();
            let folder = folders[0];
            
            if( folder.incomingServerType == "imap" ) {
                //confirmation popup is in DeleteFolderOrig for imap
                DeleteFolderOrig.apply(this, arguments);
            } else {
                if (CBD.checkforfolder())
                    DeleteFolderOrig.apply(this, arguments);
            }
        };
    }
    
    // case when message is dragged to trash
    if (typeof window.gFolderTreeView != "undefined" && window.gFolderTreeView != null && window.gFolderTreeView.drop && typeof DropInFolderTreeOrig == "undefined") {
        var DropInFolderTreeOrig = window.gFolderTreeView.drop;
        window.gFolderTreeView.drop = function (aRow, aOrientation) {
            let targetFolder = window.gFolderTreeView._rowMap[aRow]._folder;
            if (targetFolder.getFlag(0x00000100)) { // trash flag
                if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
                    window.alert(window.CBD.bundle.GetStringFromName("deleteLocked"));
                } else if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable") || window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")
                    || window.CBD.prefs.getBoolPref("mailnews.confirm.moveFoldersToTrash") ) {
                    let dt = this._currentTransfer;
                    // we only lock drag of messages
                    let types = Array.from(dt.mozTypesAt(0));
                    if (types.includes("text/x-moz-message")) {
                        let isMove = Cc["@mozilla.org/widget/dragservice;1"]
                            .getService(Ci.nsIDragService).getCurrentSession()
                            .dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE;
    
                        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
                            let tagKey = window.CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
                            let nbMsg = dt.mozItemCount;
                            let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
                            for (let i = 0; i < nbMsg; i++) {
                                let msgHdr = messenger.msgHdrFromURI(dt.mozGetDataAt("text/x-moz-message", i));
                                let keyw = msgHdr.getStringProperty("keywords");
                                if (window.gFolderDisplay.selectedMessages[i].getStringProperty("keywords").indexOf(tagKey) != -1) {
                                    var tagName = window.CBD.tagService.getTagForKey(tagKey);
                                    window.alert(window.CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
                                    return;
                                }
                            }
                        }
    
                        if (!window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable")){
                            DropInFolderTreeOrig.apply(this, arguments);
                        } else {
                            if( window.CBD.confirmbeforedelete('gotrash')) {
                                // copy code of folderPane.js because getCurrentSession become null after showing popup
                                let count = dt.mozItemCount;
                                let array = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
        
                                let sourceFolder;
                                let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
        
                                for (let i = 0; i < count; i++) {
                                    let msgHdr = messenger.msgHdrFromURI(dt.mozGetDataAt("text/x-moz-message", i));
                                    if (!i)
                                        sourceFolder = msgHdr.folder;
                                    array.appendElement(msgHdr);
                                }
                                let prefBranch = Services.prefs.getBranch("mail.");
        
                                if (!sourceFolder.canDeleteMessages)
                                    isMove = false;
        
                                let cs = MailServices.copy;
                                prefBranch.setCharPref("last_msg_movecopy_target_uri", targetFolder.URI);
                                prefBranch.setBoolPref("last_msg_movecopy_was_move", isMove);
                                // ### ugh, so this won't work with cross-folder views. We would
                                // really need to partition the messages by folder.
                                cs.CopyMessages(sourceFolder, array, targetFolder, isMove, null, window.msgWindow, true);
                            }
                        }
                    } else {
                        if( window.CBD.prefs.getBoolPref("mailnews.confirm.moveFoldersToTrash") && !window.CBD.confirmbeforedelete('gotrashfolder') )
                            return;
                        DropInFolderTreeOrig.apply(this, arguments);
                    }
                } else {
                    DropInFolderTreeOrig.apply(this, arguments);
                }
            } else {
                DropInFolderTreeOrig.apply(this, arguments);
            }
        }
    }
    
    // calendar
    if (typeof window.calendarViewController != "undefined" && typeof calendarViewControllerDeleteOccurrencesOrig == "undefined") {
        var calendarViewControllerDeleteOccurrencesOrig = window.calendarViewController.deleteOccurrences;
        window.calendarViewController.deleteOccurrences = function (aCount, aUseParentItems, aDoNotConfirm) {
            if (CBD.checkForCalendar())
                calendarViewControllerDeleteOccurrencesOrig.apply(this, arguments);
        };
    }
}

function onUnload(deactivatedWhileWindowOpen) {
  // Cleaning up the window UI is only needed when the
  // add-on is being deactivated/removed while the window
  // is still open. It can be skipped otherwise.
  if (!deactivatedWhileWindowOpen) {
    return
  }
}


CBD.areFoldersLockedWhenEmptyingTrash = function () {
    if (!window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock"))
        return false;
    try {
        var msgFolder = window.GetSelectedMsgFolders()[0];
        if (msgFolder) {
            var rootFolder = msgFolder.rootFolder;
            var len = {};
            if (rootFolder.getFoldersWithFlag)
                var trashFolder = rootFolder.getFoldersWithFlag(0x00000100, 1, len);
            else
                var trashFolder = msgFolder.getFolderWithFlags(0x00000100);
            if (trashFolder && trashFolder.hasSubFolders) {
                window.alert(window.CBD.bundle.GetStringFromName("cantEmptyTrash") + window.CBD.bundle.GetStringFromName("lockedFolder"));
                return true;
            }
        }
    } catch (e) {}
    return false;
}

CBD.checkforfolder = function () {
    var folder = window.GetSelectedMsgFolders()[0];
    var folderSubTrash = window.CBD.isSubTrash(folder);
    if (folderSubTrash && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
        return window.CBD.confirmbeforedelete ('folderyesno');
    else
        return true;
}

CBD.checkForCalendar = function () {
    if (!window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.calendar.enable"))
        return true;
    else
        return window.CBD.confirmbeforedelete('deleteCalendar');
}

