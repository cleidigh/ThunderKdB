// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-common.js", window, "UTF-8");

if (!CBD)
    var CBD = {};

function onLoad(activatedWhileWindowOpen) {
    
    window.CBD.init();
    
    // case message in a new window
    if (Array.isArray && typeof window.MessageWindowController != "undefined" && typeof MessageWindowControllerDoCommandOrig == "undefined") {
        var MessageWindowControllerDoCommandOrig = window.MessageWindowController.doCommand;
        window.MessageWindowController.doCommand = function (command) {
            if (!this.isCommandEnabled(command))
                return;
            switch (command) {
            case "button_delete":
            case "cmd_delete":
                if (window.CBD.checktrash(false))
                    MessageWindowControllerDoCommandOrig.apply(this, arguments);
                break;
            case "cmd_shiftDelete":
                if (window.CBD.checktrash(true))
                    MessageWindowControllerDoCommandOrig.apply(this, arguments);
                break;
            default:
                MessageWindowControllerDoCommandOrig.apply(this, arguments);
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
}

function onUnload(deactivatedWhileWindowOpen) {
  // Cleaning up the window UI is only needed when the
  // add-on is being deactivated/removed while the window
  // is still open. It can be skipped otherwise.
  if (!deactivatedWhileWindowOpen) {
    return
  }
}
