// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-common.js", window, "UTF-8");

if (!CBD)
    var CBD = {};

function onLoad(activatedWhileWindowOpen) {
    window.CBD.init();
    
    
    // Delete message
    if (typeof window.nsSearchResultsController != "undefined" && typeof searchResultsControllerDoCommandOrig == "undefined") {
        var searchResultsControllerDoCommandOrig = window.nsSearchResultsController.doCommand;
        window.nsSearchResultsController.doCommand = function (command) {
            if (!this.isCommandEnabled(command))
                return;
            switch (command) {
            case "button_delete":
            case "cmd_delete":
                if (CBD.checkdelete(false))
                    searchResultsControllerDoCommandOrig.apply(this, arguments);
                break;
            case "cmd_shiftDelete":
                if (CBD.checkdelete(true))
                    searchResultsControllerDoCommandOrig.apply(this, arguments);
                break;
            default:
                searchResultsControllerDoCommandOrig.apply(this, arguments);
            }
        };
    }
}

function onUnload(deactivatedWhileWindowOpen) {
  if (!deactivatedWhileWindowOpen) {
    return
  }
}

CBD.checkdelete = function (isButtonDeleteWithShift) {
    try {
        if (window.CBD.deleteLocked())
            return false;

        // cannot use window.CBD.checkforshift because in search window default TB window confirmation popup does show when mail.warn_on_shift_delete is true
        if (isButtonDeleteWithShift) {
            if ((window.CBD.prefs.getPrefType("mail.warn_on_shift_delete") > 0 && window.CBD.prefs.getBoolPref("mail.warn_on_shift_delete")) 
                || window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
                return window.CBD.confirmbeforedelete('mailyesno');
            return true;
        }

        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable")) {
            let nbMsg = window.gFolderDisplay.selectedCount;
            for (let i = 0; i < nbMsg; i++) {
                if (window.gFolderDisplay.selectedMessages[i].folder.getFlag(0x00000100) || window.CBD.isSubTrash(window.gFolderDisplay.selectedMessages[i].folder)) {
                    return window.CBD.confirmbeforedelete ('mailyesno');
                }
            }
        }
        
        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
            return window.CBD.confirmbeforedelete ('gotrash');
        else
            return true;
    } catch (e) {
        window.alert(e);
    }
}

