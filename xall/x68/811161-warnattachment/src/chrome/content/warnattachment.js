/**
 * warnAttachment.js
 *
 * Overwrite the attachment handler to warn against dangerous file extensions
 * and block the most harmful ones.
 *
 * Jens Dede, 2019
 *
 */

var openAttachmentOriginal;


if (
    window.location.href == "chrome://messenger/content/messenger.xul" ||
    window.location.href == "chrome://messenger/content/messageWindow.xul"
) {

    openAttachmentOriginal = AttachmentInfo.prototype.open;
    var openAttachment = function(attachment) {

        attachment = this;

        // Translation
        var stringsBundle = document.getElementById("warnAttachmentStringbundle");

        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch("extensions.warnattachment.");

        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService);
        var blockedExt = prefs.getCharPref("blocked").toLowerCase().replace(/\s+/g, '').split(",");
        var warnExt = prefs.getCharPref("warn").toLowerCase().replace(/\s+/g, '').split(",");

        var timeout = prefs.getIntPref("timeout");

        // Get extension of current opened file
        var attName = attachment.displayName ? attachment.displayName : attachment.name;
        var ext = attName.substring(attName.lastIndexOf(".")).toLowerCase();

        // Blocked?
        for (var i = 0; i<blockedExt.length; i++){
            if ("." + blockedExt[i].toLowerCase() == ext) {
                prompts.alert(null,
                    stringsBundle.getString('blockTitle'),
                    getBlocking()
                );
                // Do nothing
                return;
            }
        }

        // Warn?
        for (var i = 0; i<warnExt.length; i++){
            if ("." + warnExt[i].toLowerCase() == ext){

                var result = warningDialog(
                    stringsBundle.getString('warningTitle'),
                    getWarning(),
                    timeout
                    );

                // version w/o timeout
                //var result = prompts.confirm(null,
                //    stringsBundle.getString('warningTitle'),
                //    getWarning()
                //);

                if(result == 1){
                    // User agreed: Open normally
                    openAttachmentOriginal.apply(this, arguments);
                }
                return;
            }
        }
        // Not an dangerous extension: Open normally
        openAttachmentOriginal.apply(this, arguments);
    };
    AttachmentInfo.prototype.open = openAttachment;
}

/**
 * Returns either the user default warning message or the default one.
 */
function getWarning() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch("extensions.warnattachment.");

    var stringsBundle = document.getElementById("warnAttachmentStringbundle");

    var msg = prefs.getStringPref("user_warning_msg");

    if (msg == "") {
        return stringsBundle.getString("warningText");
    }
    return msg;
}


/*
 * Returns either the user default blocking message or the default one.
 */
function getBlocking() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch("extensions.warnattachment.");

    var stringsBundle = document.getElementById("warnAttachmentStringbundle");

    var msg = prefs.getStringPref("user_blocked_msg");

    if (msg == "") {
        return stringsBundle.getString("blockText");
    }
    return msg;
}

/**
 * Create a warning dialog
 * @param title     The title of the dialog
 * @param text      The info text of the dialog
 * @param timeout   The timeout in milliseconds
 */
function warningDialog(title, text, timeout) {
    var result = {
        value: -1
    };
    openDialog(
        "chrome://warnattachment/content/warningdialog.xul",
        "",
        "chrome,dialog,modal,centerscreen,resizable",
        title,
        text,
        timeout,
        result
    );
    return result.value;
}

