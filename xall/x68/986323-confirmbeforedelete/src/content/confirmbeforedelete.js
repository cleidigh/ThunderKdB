if (typeof MsgMoveMessage != "undefined" && typeof MsgMoveMessageOrig1234 == "undefined") {
    var MsgMoveMessageOrig1234 = MsgMoveMessage;
    MsgMoveMessage = function (aDestFolder) {
        if (CBD.isSubTrash(aDestFolder) != 0) {
            if (CBD.deleteLocked() || !CBD.confirmbeforedelete('mailyesno'))
                return;
        }
        MsgMoveMessageOrig1234.apply(this, arguments);
    };
}

if (typeof calendarViewController != "undefined" && typeof calendarViewControllerDeleteOccurrencesOrig == "undefined") {
    var calendarViewControllerDeleteOccurrencesOrig = calendarViewController.deleteOccurrences;
    calendarViewController.deleteOccurrences = function (aCount, aUseParentItems, aDoNotConfirm) {
        if (CBD.checkForCalendar())
            calendarViewControllerDeleteOccurrencesOrig.apply(this, arguments);
    };
}

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

// New controller for Message Window, landed in TB9
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

// On TB3 (where String.trim is "true") the check is done on gFolderTreeController.deleteFolder
if (!String.trim && typeof FolderPaneController != "undefined" && typeof folderPaneControllerDoCommandOrig == "undefined") {
    var folderPaneControllerDoCommandOrig = FolderPaneController.doCommand;
    FolderPaneController.doCommand = function (command) {
        if (!this.isCommandEnabled(command))
            return;
        switch (command) {
        case "cmd_delete":
        case "button_delete":
            if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock")) {
                alert(CBD.bundle.GetStringFromName("lockedFolder"));
                return;
            } else if (CBD.checkforfolder())
                folderPaneControllerDoCommandOrig.apply(this, arguments);
            break;
        default:
            folderPaneControllerDoCommandOrig.apply(this, arguments);
        }
    };
}

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

if (typeof MsgDeleteMessageFromMessageWindow != "undefined" && typeof MsgDeleteMessageFromMessageWindowOrig == "undefined") {
    var MsgDeleteMessageFromMessageWindowOrig = MsgDeleteMessageFromMessageWindow;
    MsgDeleteMessageFromMessageWindow = function (reallyDelete, fromToolbar) {
        var goon = CBD.checktrash(reallyDelete);
        if (goon)
            MsgDeleteMessageFromMessageWindowOrig.apply(this, arguments);
    };
}

if (typeof MsgEmptyTrash != "undefined" && typeof MsgEmptyTrashOrig221109 == "undefined") {
    var MsgEmptyTrashOrig221109 = MsgEmptyTrash;
    MsgEmptyTrash = function () {
        if (!CBD.areFoldersLockedWhenEmptyingTrash() && CBD.confirmbeforedelete('emptytrash'))
            MsgEmptyTrashOrig221109.apply(this, arguments);
    };
}

if (typeof MsgDeleteFolder != "undefined" && typeof MsgDeleteFolderOrig221109 == "undefined") {
    var MsgDeleteFolderOrig221109 = MsgDeleteFolder;
    MsgDeleteFolder = function () {
        if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock"))
            alert(CBD.bundle.GetStringFromName("lockedFolder"));
        else if (CBD.checkforfolder())
            MsgDeleteFolderOrig221109.apply(this, arguments);
    };
}

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

if (typeof gFolderTreeView != "undefined" && gFolderTreeView.drop && typeof DropInFolderTreeOrig == "undefined") {
    var DropInFolderTreeOrig = gFolderTreeView.drop;
    gFolderTreeView.drop = function (aRow, aOrientation) {
        let targetFolder = gFolderTreeView._rowMap[aRow]._folder;
        if (targetFolder.getFlag(0x00000100)) {
            if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
                alert(CBD.bundle.GetStringFromName("deleteLocked"));
            } else if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable")) {
                let dt = this._currentTransfer;
                // we only lock drag of messages
                let types = Array.from(dt.mozTypesAt(0));
                if (types.includes("text/x-moz-message")) {
                    let isMove = Cc["@mozilla.org/widget/dragservice;1"]
                            .getService(Ci.nsIDragService).getCurrentSession()
                            .dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE;
                            
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

var CBD = {

    prefs: null,
    bundle: null,

    init: function () {
        window.removeEventListener("load", CBD.init, false);
        CBD.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
        var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
        CBD.bundle = strBundleService.createBundle("chrome://confirmbeforedelete/locale/confirmbeforedelete.properties");

        try {
            if (document.getElementById("folderTree")) {
                var folderTree = document.getElementById("folderTree");
                folderTree.addEventListener("dragstart", function (event) {
                    if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock") && event.target.id != "folderTree") {
                        alert(CBD.bundle.GetStringFromName("lockedFolder"));
                        event.preventDefault();
                    }
                }, false);
            }
        } catch (e) {}
    },

    areFoldersLockedWhenEmptyingTrash: function () {
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
    },

    confirm: function (string) {
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
        var canceldefault = CBD.prefs.getBoolPref("extensions.confirmbeforedelete.default.cancel");
        if (canceldefault)
            // This is the prompt with "Cancel" as default
            var flags = prompts.BUTTON_TITLE_OK * prompts.BUTTON_POS_0 +
                prompts.BUTTON_TITLE_CANCEL * prompts.BUTTON_POS_1 + prompts.BUTTON_POS_1_DEFAULT;
        else
            // This is the prompt with "OK" as default
            var flags = prompts.BUTTON_TITLE_OK * prompts.BUTTON_POS_0 +
                prompts.BUTTON_TITLE_CANCEL * prompts.BUTTON_POS_1;
        var wintitle = CBD.bundle.GetStringFromName("wintitle");
        var button = prompts.confirmEx(window, wintitle, string, flags, "Button 0", "Button 1", "", null, {});
        if (button == 1)
            return false;
        else
            return true;
    },

    isSubTrash: function (msgFolder) {
        var rootFolder = msgFolder;
        var isTrash = false;
        while (!rootFolder.parent.isServer) {
            rootFolder = rootFolder.parent;
            if (rootFolder.flags & 0x00000100) {
                isTrash = true;
                break;
            }
        }
        if (!isTrash)
            isTrash = rootFolder.flags & 0x00000100;
        return isTrash;
    },

    checkforfolder: function () {
        var folder = GetSelectedMsgFolders()[0];
        var folderSubTrash = CBD.isSubTrash(folder);
        if (folderSubTrash && CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
            return CBD.confirmbeforedelete('folderyesno');
        else
            return true;
    },

    deleteLocked: function () {
        try {
            if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
                alert(CBD.bundle.GetStringFromName("deleteLocked"));
                return true;
            }
        } catch (e) {}
        return false;
    },

    checktrash: function (isButtonDeleteWithShift) {
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
            else if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
                return CBD.confirmbeforedelete('gotrash');
            else
                return true;
        } catch (e) {
            alert(e)
        }
    },

    confirmbeforedelete: function (type) {
        if (document.getElementById("folderTree")) {
            if (GetSelectedMsgFolders()[0].server.type == "nntp")
                return false;
        }
        var isTB3 = false;
        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULAppInfo);
        var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
            .getService(Components.interfaces.nsIVersionComparator);
        if (versionChecker.compare(appInfo.version, "2.9") >= 0)
            // Code for TB3
            isTB3 = true;
        if (type == "emptytrash" && !CBD.areFoldersLockedWhenEmptyingTrash() && (!CBD.prefs.getBoolPref("extensions.confirmbeforedelete.emptytrash.enable") || isTB3))
            return true;
        return CBD.confirm(CBD.bundle.GetStringFromName(type));
    },

    checkforshift: function () {
        if (CBD.prefs.getPrefType("mail.warn_on_shift_delete") || !CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
            return true;
        return CBD.confirmbeforedelete('mailyesno');
    },

    checkForCalendar: function () {
        if (!CBD.prefs.getBoolPref("extensions.confirmbeforedelete.calendar.enable"))
            return true;
        else
            return CBD.confirmbeforedelete('deleteCalendar');
    }
};

window.addEventListener("load", CBD.init, false);
