/*
 * Copy Patch Thunderbird Add-On
 *
 * Copyright (c) Jan Kiszka, 2019
 *
 * Authors:
 *  Jan Kiszka <jan.kiszka@web.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var EXPORTED_SYMBOLS = ["copyPatchInit", "copyPatchDestroy"];

const MENUITEM_MESSAGEPOPUP = "copypatch.messageMenuPopup.copyToClipboard";
const MENUITEM_OTHERACTION = "copypatch.otherAction.copyToClipboard";
const KEYSET_COPYPATCH = "copypatchKeys";
const KEY_COPYPATCH = "key_copyPatch";
const CMD_COPYPATCH = "cmd_copyPatch";

Components.utils.import("resource:///modules/jsmime.jsm");

class CopyPatchAddon {
    constructor(window)
    {
        var doc = window.document;

        this.window = window;

        this.mailContent = doc.getElementById("mailContent");

        var newCmd = doc.createElement("command");
        newCmd.setAttribute("id", CMD_COPYPATCH);
        newCmd.setAttribute("oncommand", "goDoCommand('"+ CMD_COPYPATCH + "')");
        newCmd.setAttribute("disabled", "false");
        doc.getElementById("mailToolbarItems").appendChild(newCmd);

        var newKey = doc.createElement("key");
        newKey.setAttribute("id", KEY_COPYPATCH);
        newKey.setAttribute("key", "p");
        newKey.setAttribute("modifiers", "accel,shift");
        newKey.setAttribute("command", CMD_COPYPATCH);
        var newKeyset = doc.createElement("keyset");
        newKeyset.setAttribute("id", KEYSET_COPYPATCH);
        newKeyset.appendChild(newKey);
        doc.getElementById("mailKeys").appendChild(newKeyset);

        this.createMenuItem(MENUITEM_MESSAGEPOPUP, "openFeedMessage", KEY_COPYPATCH);
        this.createMenuItem(MENUITEM_OTHERACTION, "viewSourceMenuItem", null);

        window.controllers.appendController(this);
    }

    createMenuItem(id, anchor, key)
    {
        var doc = this.window.document;

        var newItem = doc.createElement("menuitem");
        newItem.setAttribute("id", id);
        newItem.setAttribute("label", "Copy as Patch");
        newItem.setAttribute("accesskey", "p");
        if (key)
            newItem.setAttribute("key", key);
        newItem.setAttribute("command", CMD_COPYPATCH);

        var anchorItem = doc.getElementById(anchor).nextSibling;
        anchorItem.parentNode.insertBefore(newItem, anchorItem);
    }

    removeElement(id)
    {
        var elem = this.window.document.getElementById(id);
        elem.parentNode.removeChild(elem);
    }

    destroy()
    {
        this.window.controllers.removeController(this);

        this.removeElement(MENUITEM_MESSAGEPOPUP);
        this.removeElement(MENUITEM_OTHERACTION);
        this.removeElement(KEYSET_COPYPATCH);
        this.removeElement(CMD_COPYPATCH);
    }

    // nsIController methods
    supportsCommand(cmd)
    {
        return (cmd == CMD_COPYPATCH) ? true : false;
    }

    isCommandEnabled(cmd)
    {
        var win = this.window;

        if (cmd != CMD_COPYPATCH)
            return false;

        if (win.document.URL == "chrome://messenger/content/messenger.xul")
            return this.mailContent.getAttribute("selected") == "true" &&
                win.GetNumSelectedMessages() > 0;
        else
            return true;
    }

    doCommand(cmd)
    {
        var win = this.window;

        if (cmd != CMD_COPYPATCH || !this.isCommandEnabled(cmd))
            return;

        var selectedMsg = win.gFolderDisplay.selectedMessage;
        var msgURI = selectedMsg.folder.getUriForMsg(selectedMsg);

        var msgStream =
            Components.classes["@mozilla.org/network/sync-stream-listener;1"]
                .createInstance();
        var consumer =
            msgStream.QueryInterface(Components.interfaces.nsIInputStream);
        var scriptInput =
            Components.classes["@mozilla.org/scriptableinputstream;1"]
                .createInstance();
        var scriptInputStream = scriptInput.QueryInterface(
            Components.interfaces.nsIScriptableInputStream);
        scriptInputStream.init(consumer);

        var service = win.messenger.messageServiceFromURI(msgURI);
        service.streamMessage(msgURI, msgStream, win.msgWindow, null, false, null);

        var patch = "";
        var done = false;
        var emitter = {
            startPart: function(partNum, headers)
            {
                if (done)
                    return;

                var author = headers.get("from")[0];

                /*
                 * Strip "[ext]" tag in front of the sender name, proudly
                 * presented by Siemens IT for emails with Siemens addresses
                 * coming in via external lists.
                 */
                var name = author.name.replace(/^\[ext\] /, "")

                patch += "From: " + name + " <" + author.email + ">\n";
                patch += "Date: " + headers.get("date") + "\n";
                patch += "Subject: " + headers.get("subject") + "\n\n";
            },

            deliverPartData: function(partNum, data)
            {
                if (done)
                    return;

                /* Strip Windows line-feeds */
                patch += data.replace(/\r/g, "");
            },

            endPart: function(partNum)
            {
                if (done)
                    return;

                /* Get rid of O365 unsafe links */
                patch = patch.replace(
                    /https:\/\/[^\.]+\.safelinks\.protection\.outlook\.com\/\?url=([^&]*)&[^>\s]*/g,
                    function(match, p1, offset, string) {
                        return decodeURIComponent(p1);
                    });

                /* Cut off mailing list signatures after git's default */
                patch = patch.replace(/(^-- \n[0-9\.]+\n)[^]*/m, "$1");

                /*
                 * Warn if signed-offs are present but the author didn't
                 * provide one.
                 */
                if (patch.indexOf("\nSigned-off-by: ") >= 0) {
                    var msg = patch.split("\n---\n")[0];
                    var lastFrom = null;

                    var lastFromStart = msg.lastIndexOf("From: ");
                    if (lastFromStart > 0 && msg.charAt(lastFromStart - 1) != "\n")
                        lastFromStart = -1;
                    if (lastFromStart >= 0) {
                        var lastFromEnd = msg.indexOf("\n", lastFromStart);
                        if (lastFromEnd >= 0)
                            lastFrom = msg.substring(lastFromStart + 6, lastFromEnd);
                    }
                    if (lastFrom == null || msg.indexOf("\nSigned-off-by: " + lastFrom) < 0)
                        win.alert("WARNING: Author did not sign off the patch or email addresses differ.");
                }

                var clipboardHelper =
                    Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                        .getService(Components.interfaces.nsIClipboardHelper);
                clipboardHelper.copyString(patch);

                done = true;
            },
        };

        var opts = {
            bodyformat: "decode",
            strformat: "unicode",
        };
        var parser = new jsmime.MimeParser(emitter, opts);

        while (scriptInputStream.available()) {
            var data = scriptInputStream.read(scriptInputStream.available());
            parser.deliverData(data);
        }
        parser.deliverEOF();
    }
}

var windowMap = new Map();

function copyPatchInit(window)
{
    if (window.document.URL == "chrome://messenger/content/messenger.xul" ||
        window.document.URL == "chrome://messenger/content/messageWindow.xul") {
        var addon = new CopyPatchAddon(window);
        windowMap.set(window, addon);
    }
}

function copyPatchDestroy(window)
{
    var addon = windowMap.get(window);
    if (addon) {
        addon.destroy();
        windowMap.delete(window);
    }
}
