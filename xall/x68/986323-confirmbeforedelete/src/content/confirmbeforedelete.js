
// Menu move message to trash
if (typeof MsgMoveMessage != "undefined" && typeof MsgMoveMessageOrig1234 == "undefined") {
    var MsgMoveMessageOrig1234 = MsgMoveMessage;
    MsgMoveMessage = function (aDestFolder) {
        if (CBD.isSubTrash(aDestFolder) != 0) {
            if (CBD.deleteLocked() || !CBD.confirmbeforedelete('gotrash'))
                return;
        }
        MsgMoveMessageOrig1234.apply(this, arguments);
    };
}

// calendar
if (typeof calendarViewController != "undefined" && typeof calendarViewControllerDeleteOccurrencesOrig == "undefined") {
    var calendarViewControllerDeleteOccurrencesOrig = calendarViewController.deleteOccurrences;
    calendarViewController.deleteOccurrences = function (aCount, aUseParentItems, aDoNotConfirm) {
        if (CBD.checkForCalendar())
            calendarViewControllerDeleteOccurrencesOrig.apply(this, arguments);
    };
}
// Delete message
if (typeof DefaultController != "undefined" && typeof defaultControllerDoCommandOrig == "undefined") {
    var defaultControllerDoCommandOrig = DefaultController.doCommand;
    DefaultController.doCommand = function (command) {
        if (!this.isCommandEnabled(command))
            return;
        switch (command) {
        case "button_delete":
        case "cmd_delete":
            if (CBD.checktrash(false))
                defaultControllerDoCommandOrig.apply(this, arguments);
            break;
        case "cmd_shiftDelete":
            if (CBD.checktrash(true))
                defaultControllerDoCommandOrig.apply(this, arguments);
            break;
        default:
            defaultControllerDoCommandOrig.apply(this, arguments);
        }
    };
}

// case message in a new window
if (Array.isArray && typeof MessageWindowController != "undefined" && typeof MessageWindowControllerDoCommandOrig == "undefined") {
    var MessageWindowControllerDoCommandOrig = MessageWindowController.doCommand;
    MessageWindowController.doCommand = function (command) {
        if (!this.isCommandEnabled(command))
            return;
        switch (command) {
        case "button_delete":
        case "cmd_delete":
            if (CBD.checktrash(false))
                MessageWindowControllerDoCommandOrig.apply(this, arguments);
            break;
        case "cmd_shiftDelete":
            if (CBD.checktrash(true))
                MessageWindowControllerDoCommandOrig.apply(this, arguments);
            break;
        default:
            MessageWindowControllerDoCommandOrig.apply(this, arguments);
        }
    };
}

// case folder delete
if (typeof gFolderTreeController != "undefined" && gFolderTreeController.emptyTrash && typeof EmptyTrashTB3Orig == "undefined") {
    var EmptyTrashTB3Orig = gFolderTreeController.emptyTrash;
    gFolderTreeController.emptyTrash = function (aFolder) {
        if (!CBD.areFoldersLockedWhenEmptyingTrash())
            EmptyTrashTB3Orig.apply(this, arguments);
    };
    var DeleteFolderTB3Orig = gFolderTreeController.deleteFolder;
    gFolderTreeController.deleteFolder = function () {
        if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock")) {
            alert(CBD.bundle.GetStringFromName("lockedFolder"));
            return;
        }
        if (CBD.checkforfolder())
            DeleteFolderTB3Orig.apply(this, arguments);
    };
}

// Address Book
if (typeof AbDelete != "undefined" && typeof AbDeleteOrig110807 == "undefined") {
    var AbDeleteOrig110807 = AbDelete;
    AbDelete = function () {
        var selectedDir = GetSelectedDirectory();
        var isList = GetDirectoryFromURI(selectedDir).isMailList
            var types = GetSelectedCardTypes();
        if (types == kNothingSelected)
            return;
        var enableConfirm = CBD.prefs.getBoolPref("extensions.confirmbeforedelete.addressbook.enable");
        var param = isList ? "contactyesno2" : "contactyesno";
        if (types == kCardsOnly && enableConfirm && !CBD.confirmbeforedelete(param))
            return;
        AbDeleteOrig110807.apply(this, arguments);
    };
}

// case when message is dragged to trash
if (typeof gFolderTreeView != "undefined" && gFolderTreeView != null && gFolderTreeView.drop && typeof DropInFolderTreeOrig == "undefined") {
    var DropInFolderTreeOrig = gFolderTreeView.drop;
    gFolderTreeView.drop = function (aRow, aOrientation) {
        let targetFolder = gFolderTreeView._rowMap[aRow]._folder;
        if (targetFolder.getFlag(0x00000100)) { // trash flag
            if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
                alert(CBD.bundle.GetStringFromName("deleteLocked"));
            } else if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable") || CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
                let dt = this._currentTransfer;
                // we only lock drag of messages
                let types = Array.from(dt.mozTypesAt(0));
                if (types.includes("text/x-moz-message")) {
                    let isMove = Cc["@mozilla.org/widget/dragservice;1"]
                        .getService(Ci.nsIDragService).getCurrentSession()
                        .dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE;

                    if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
                        let tagKey = CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
                        let nbMsg = dt.mozItemCount;
                        let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
                        for (let i = 0; i < nbMsg; i++) {
                            let msgHdr = messenger.msgHdrFromURI(dt.mozGetDataAt("text/x-moz-message", i));
                            let keyw = msgHdr.getStringProperty("keywords");
                            if (gFolderDisplay.selectedMessages[i].getStringProperty("keywords").indexOf(tagKey) != -1) {
                                var tagName = CBD.tagService.getTagForKey(tagKey);
                                alert(CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + CBD.bundle.GetStringFromName("deleteTagLocked2"));
                                return;
                            }
                        }
                    }

                    if (CBD.confirmbeforedelete('gotrash')) {
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
                        cs.CopyMessages(sourceFolder, array, targetFolder, isMove, null, msgWindow, true);
                    }
                } else {
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

if (!CBD)
    var CBD = {};

CBD.areFoldersLockedWhenEmptyingTrash = function () {
    if (!CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock"))
        return false;
    try {
        var msgFolder = GetSelectedMsgFolders()[0];
        if (msgFolder) {
            var rootFolder = msgFolder.rootFolder;
            var len = {};
            if (rootFolder.getFoldersWithFlag)
                var trashFolder = rootFolder.getFoldersWithFlag(0x00000100, 1, len);
            else
                // TB3 syntax
                var trashFolder = msgFolder.getFolderWithFlags(0x00000100);
            if (trashFolder && trashFolder.hasSubFolders) {
                alert(CBD.bundle.GetStringFromName("cantEmptyTrash") + CBD.bundle.GetStringFromName("lockedFolder"));
                return true;
            }
        }
    } catch (e) {}
    return false;
}

CBD.checkforfolder = function () {
    var folder = GetSelectedMsgFolders()[0];
    var folderSubTrash = CBD.isSubTrash(folder);
    if (folderSubTrash && CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
        return CBD.confirmbeforedelete('folderyesno');
    else
        return true;
}

CBD.deleteLocked = function () {
    try {
        if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
            alert(CBD.bundle.GetStringFromName("deleteLocked"));
            return true;
        } else if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
            let tagKey = CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
            let nbMsg = gFolderDisplay.selectedCount;
            for (let i = 0; i < nbMsg; i++) {
                let keyw = gFolderDisplay.selectedMessages[i].getStringProperty("keywords");
                if (gFolderDisplay.selectedMessages[i].getStringProperty("keywords").indexOf(tagKey) != -1) {
                    var tagName = CBD.tagService.getTagForKey(tagKey);
                    alert(CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + CBD.bundle.GetStringFromName("deleteTagLocked2"));
                    return true;
                }
            }
        }
    } catch (e) {}
    return false;
}

CBD.checktrash = function (isButtonDeleteWithShift) {
    try {
        if (CBD.deleteLocked())
            return false;

        var msgFol = GetSelectedMsgFolders()[0];
        if (!msgFol)
            return true;
        if (isButtonDeleteWithShift)
            return CBD.checkforshift();

        var folderTrash = (msgFol.flags & 0x00000100);
        var folderSubTrash = CBD.isSubTrash(msgFol);
        var isTreeFocused = false;

        if (document.getElementById("folderTree") &&
            document.getElementById("folderTree").getAttribute("focusring") == "true")
            isTreeFocused = true;

        try {
            var prefDM = "mail.server." + msgFol.server.key + ".delete_model";
            if (!folderTrash && CBD.prefs.getPrefType(prefDM) > 0 && CBD.prefs.getIntPref(prefDM) == 2)
                folderTrash = true;
        } catch (e) {}

        if (folderTrash && CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
            return CBD.confirmbeforedelete('mailyesno');
        else if (folderSubTrash && isTreeFocused && CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
            return CBD.confirmbeforedelete('folderyesno');
        else if (!folderTrash && CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
            return CBD.confirmbeforedelete('gotrash');
        else
            return true;
    } catch (e) {
        alert(e)
    }
}

CBD.checkForCalendar = function () {
    if (!CBD.prefs.getBoolPref("extensions.confirmbeforedelete.calendar.enable"))
        return true;
    else
        return CBD.confirmbeforedelete('deleteCalendar');
}