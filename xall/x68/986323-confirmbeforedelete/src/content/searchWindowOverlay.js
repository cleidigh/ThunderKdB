var MsgDeleteSelectedMessagesOriginal = MsgDeleteSelectedMessages;
var MsgDeleteSelectedMessages = function (aCommandType) {
    var reallyDelete;
    if (aCommandType == Components.interfaces.nsMsgViewCommandType.deleteNoTrash)
        reallyDelete = CBD.ask(true);
    else
        reallyDelete = CBD.ask(false);
    if (reallyDelete)
        MsgDeleteSelectedMessagesOriginal.apply(this, arguments);
};

if (!CBD)
    var CBD = {};

CBD.ask = function (isButtonDeleteWithShift) {
    if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
        alert(CBD.bundle.GetStringFromName("deleteLocked"));
        return false;
    } else if (isButtonDeleteWithShift) {
        if (CBD.prefs.getPrefType("mail.warn_on_shift_delete") || CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
            return CBD.confirmbeforedelete('mailyesno');
        return true;
    } else if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
        let tagKey = CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
        let nbMsg = gFolderDisplay.selectedCount;
        for (let i = 0; i < nbMsg; i++) {
            let keyw = gFolderDisplay.selectedMessages[i].getStringProperty("keywords");
            if (gFolderDisplay.selectedMessages[i].getStringProperty("keywords").indexOf(tagKey) != -1) {
                var tagName = CBD.tagService.getTagForKey(tagKey);
                alert(CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + CBD.bundle.GetStringFromName("deleteTagLocked2"));
                return false;
            }
        }

    }

    if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable")) {
        let nbMsg = gFolderDisplay.selectedCount;
        for (let i = 0; i < nbMsg; i++) {
            if (gFolderDisplay.selectedMessages[i].folder.getFlag(0x00000100) || CBD.isSubTrash(gFolderDisplay.selectedMessages[i].folder)) {
                return CBD.confirmbeforedelete('mailyesno');
            }
        }
    }

    if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
        return CBD.confirmbeforedelete('gotrash');
    return true;
}