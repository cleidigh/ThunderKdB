CBD.prefs = null;
CBD.bundle = null;
CBD.tagService = null;

CBD.init = function () {
    window.removeEventListener("load", CBD.init, false);
    CBD.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
    CBD.bundle = strBundleService.createBundle("chrome://confirmbeforedelete/locale/confirmbeforedelete.properties");
    CBD.tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);

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
        if (GetSelectedMsgFolders()[0].server.type == "nntp")
            return false;
    }
    return CBD.confirm(CBD.bundle.GetStringFromName(type));
}

CBD.checkforshift = function () {
    if (CBD.prefs.getPrefType("mail.warn_on_shift_delete") || !CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
        return true;
    return CBD.confirmbeforedelete('mailyesno');
}

window.addEventListener("load", CBD.init, false);