// Import any needed modules.
var {
    Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-common.js", window, "UTF-8");

if (!CBD)
    var CBD = {};

function onLoad(activatedWhileWindowOpen) {
    window.CBD.init();

    // Address Book
    if (typeof window.AbDelete != "undefined" && typeof AbDeleteOrig == "undefined") {
        var AbDeleteOrig = window.AbDelete;
        window.AbDelete = function () {
            let types = window.GetSelectedCardTypes();
            if (types == window.kNothingSelected) {
                return;
            }

            var enableConfirm = window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.addressbook.enable");
            if (!enableConfirm) {
                // Delete cards from address books or mailing lists.
                window.gAbView.deleteSelectedCards();
                return;
            }

            AbDeleteOrig.apply(this, arguments);
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
