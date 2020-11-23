/*
 * Copy Patch Thunderbird Add-On
 *
 * Copyright (c) Jan Kiszka, 2019-2020
 *
 * Authors:
 *  Jan Kiszka <jan.kiszka@web.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");

function do_getSelectedMessage(windowId)
{
    let win = Services.wm.getOuterWindowWithId(windowId);

    if (win.GetNumSelectedMessages() === 0) {
        return null;
    }

    let selectedMsg = win.gFolderDisplay.selectedMessage;
    let msgURI = selectedMsg.folder.getUriForMsg(selectedMsg);

    let msgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
    let consumer = msgStream.QueryInterface(Components.interfaces.nsIInputStream);
    let scriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
    let scriptInputStream = scriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
    scriptInputStream.init(consumer);

    let service = win.messenger.messageServiceFromURI(msgURI);
    service.streamMessage(msgURI, msgStream, win.msgWindow, null, false, null);

    let msgHeader;
    let msgBody = "";
    let done = false;
    let emitter = {
        startPart: function(partNum, header)
        {
            if (!msgHeader) {
                msgHeader = header;
            }
        },

        deliverPartData: function(partNum, data)
        {
            if (!done) {
                msgBody += data;
            }
        },

        endPart: function(partNum)
        {
            done = true;
        },
    };

    let opts = {
        bodyformat: "decode",
        strformat: "unicode",
    };
    let parser = new jsmime.MimeParser(emitter, opts);

    while (scriptInputStream.available()) {
        let data = scriptInputStream.read(scriptInputStream.available());
        parser.deliverData(data);
    }
    parser.deliverEOF();

    let hdr = {
        from:           msgHeader.get("from"),
        replyTo:        msgHeader.get("reply-to"),
        date:           msgHeader.get("date"),
        subject:        msgHeader.get("subject")
    };
    return {header: hdr, body: msgBody};
}

var CopyPatch = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        return {
            CopyPatch: {
                async getSelectedMessage(windowId) {
                    return do_getSelectedMessage(windowId);
                },
            }
        }
    }
};
