if (!CBD)
    var CBD = {};

CBD.prefs = null;
CBD.bundle = null;
CBD.tagService = null;

CBD.init = function () {
    CBD.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
    CBD.bundle = strBundleService.createBundle("chrome://confirmbeforedelete/locale/confirmbeforedelete.properties");
    CBD.tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);

    try {
        if (document.getElementById("folderTree")) {
            var folderTree = document.getElementById("folderTree");
            folderTree.addEventListener("dragstart", function (event) {
                if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock") && event.target.id != "folderTree") {
                    window.alert(CBD.bundle.GetStringFromName("lockedFolder"));
                    event.preventDefault();
                }
            }, false);
        }
    } catch (e) {}
},

CBD.confirm = function (string) {
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
}

CBD.isSubTrash = function (msgFolder) {
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
}

CBD.confirmbeforedelete = function (type) {
    if (document.getElementById("folderTree")) {
        if (window.GetSelectedMsgFolders()[0].server.type == "nntp")
            return false;
    }
    return CBD.confirm(CBD.bundle.GetStringFromName(type));
}

CBD.checkforshift = function () {
    if (CBD.prefs.getPrefType("mail.warn_on_shift_delete") > 0 || !CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
        return true;
    return CBD.confirmbeforedelete('mailyesno');
}

CBD.deleteLocked = function () {
    try {
        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
            window.alert(window.CBD.bundle.GetStringFromName("deleteLocked"));
            return true;
        } else if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
            let tagKey = window.CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
            let nbMsg = window.gFolderDisplay.selectedCount;
            for (let i = 0; i < nbMsg; i++) {
                let keyw = window.gFolderDisplay.selectedMessages[i].getStringProperty("keywords");
                if (window.gFolderDisplay.selectedMessages[i].getStringProperty("keywords").indexOf(tagKey) != -1) {
                    var tagName = window.CBD.tagService.getTagForKey(tagKey);
                    window.alert(window.CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
                    return true;
                }
            }
        }
    } catch (e) {
        window.alert(e);
    }
    return false;
}

CBD.checktrash = function (isButtonDeleteWithShift) {
    try {
        if (CBD.deleteLocked())
            return false;

        var msgFol = window.GetSelectedMsgFolders()[0];
        if (!msgFol)
            return true;
        if (isButtonDeleteWithShift)
            return window.CBD.checkforshift();

        var folderTrash = (msgFol.flags & 0x00000100);
        var folderSubTrash = window.CBD.isSubTrash(msgFol);
        var isTreeFocused = false;

        if (document.getElementById("folderTree") &&
            document.getElementById("folderTree").getAttribute("focusring") == "true")
            isTreeFocused = true;

        try {
            var prefDM = "mail.server." + msgFol.server.key + ".delete_model";
            if (!folderTrash && window.CBD.prefs.getPrefType(prefDM) > 0 && window.CBD.prefs.getIntPref(prefDM) == 2)
                folderTrash = true;
        } catch (e) {}

        if (folderTrash && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
            return window.CBD.confirmbeforedelete('mailyesno');
        else if (folderSubTrash && isTreeFocused && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
            return window.CBD.confirmbeforedelete('folderyesno');
        else if (!folderTrash && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
            return window.CBD.confirmbeforedelete('gotrash');
        else
            return true;
    } catch (e) {
        window.alert(e);
    }
}
