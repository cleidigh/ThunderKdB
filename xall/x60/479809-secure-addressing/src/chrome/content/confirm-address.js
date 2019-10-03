/**
 *
 *  Secure Addressing
 *
 *  Copyright (C) 2014 Hiroya Matsuba
 *
 *   This file is part of Secure Addressing
 *
 *   Secure Addressing is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   Secure Addressing is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with Foobar.  If not, see <http://www.gnu.org/licenses/>.
 *
**/


Components.utils.import("chrome://secure-addressing/content/log.js");
Components.utils.import("chrome://secure-addressing/content/prefs.js");
Components.utils.import("chrome://secure-addressing/content/memcache.js");

SecureAddressing.confirmAddress = {

    collectAddress: function(all) {
        let collect = SaGetPrefBool("collect_address");
        if (!collect) {
            return;
        }

        try {
            let abManager = Components.classes["@mozilla.org/abmanager;1"]
                            .getService(Components.interfaces.nsIAbManager);
            let abURI = SaGetPref("collect_addressbook");
            let ab = abManager.getDirectory(abURI);
            let nowobj = new Date();
            let nowstr = nowobj.toISOString();
            if (ab instanceof Components.interfaces.nsIAbDirectory) {
                dbg("all.length = " + all.length);
                for(let i = 0; i < all.length; i++) {
                    let en = extractEmailName(all[i].email);
                    let email = en[0];
                    let name = en[1];
                    if ((!name) || (email == name)) {
                        name = "";
                    }
                    dbg("collect " + email);
                    let q = "?(or(PrimaryEmail,=," + email + "))";
                    let qab = abManager.getDirectory(ab.URI + q);
                    let results = qab.childCards;
                    let found = false;
                    while (results.hasMoreElements()) {
                        dbg("updating card: " + email + "\n");
                        let card = results.getNext();
                        if (card instanceof Components.interfaces.nsIAbCard) {
                            card.setProperty("DisplayName", name);
                            card.setProperty("Custom4", nowstr);
                            ab.modifyCard(card);
                        }
                        found = true;
                    }
                    if (found) {
                        continue;
                    }
                    
                    let card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
                        .createInstance(Components.interfaces.nsIAbCard);
                    card.primaryEmail = email;
                    card.displayName = name;
                    card.setProperty("Custom4", nowstr);
                    dbg("adding email = " + email + ", name = " + name + "\n");
                    ab.addCard(card);
                }
            }
        } catch(e) {
            return;
        }
        return;
    },
    
    SaConfirmAddress: function() {
        
        var all = [];
        let cclist = [];
        let bcclist = [];
        let row = 1;
        let all_internal = true;
        let msgComposeType = Components.interfaces.nsIMsgCompType;
        let replying = false;
        if (gComposeType == msgComposeType.Reply ||
            gComposeType == msgComposeType.ReplyAll ||
            gComposeType == msgComposeType.ReplyToSender ||
            gComposeType == msgComposeType.ReplyToGroup ||
            gComposeType == msgComposeType.ReplyToSenderAndGroup) {
            replying = true;
        }
        dbg("doCcList = " + gCurrentIdentity.doCcList);
        dbg("doBccList = " + gCurrentIdentity.doBccList);
        if (gCurrentIdentity.doCc) {
            cclist = gCurrentIdentity.doCcList.split(",");
        } 
        if (gCurrentIdentity.doBcc) {
            bcclist = gCurrentIdentity.doBccList.split(",");
        }

        while(true){
            let addrBox = document.getElementById("addressCol2#" + row);
            let addrTypeMenu = document.getElementById("addressCol1#" + row);
            let changed = SecureAddressing.addressBox.changed[row];
            let safereply = replying && (!changed);
            if(addrBox == null){
                break;
            }else{
                row++;
            }
            let val = addrBox.value;
            if (val == null) {
                val = addrBox.getAttribute("value");
            }
            if ((val == null) || (val == "")) {
                continue;
            }
            let recipients;
            let headerParser = MailServices.headerParser;

            if (headerParser.reformatUnquotedAddresses) {
                try {
                    let quoted = MailServices.headerParser.reformatUnquotedAddresses(val);
                    dbg("quoted = " + quoted);
                    recipients = [quoted];
                } catch (ex) {
                    recipients = [val];
                }
            } else {
                try {
                    let structured = headerParser.makeFromDisplayAddress(val, {});
                    recipients = [];
                    for (let i = 0; i < structured.length; i++) {
                        fullValue = structured[i];
                        let rcpt = headerParser.makeMimeAddress(fullValue.name, fullValue.email);
                        recipients.push(rcpt);
                    }
                    /*
                    recipients = [headerParser.makeMimeAddress(fullValue.name,
                                                               fullValue.email) for
                                 (fullValue of
                                    headerParser.makeFromDisplayAddress(val, {}))];
                    */
                } catch (ex) {
                    recipients = [val];
                }
            }

            for(let k = 0; k < recipients.length; k++) {
                let recipient = recipients[k];
                dbg("recipient = " + recipient);

                let em = extractEmails(recipient);
                let internal = isInDomain(em);
                if (!internal) {
                    all_internal = false;
                }
                let t = addrTypeMenu.selectedItem.getAttribute("value");
                if (t == "addr_to") {
                    addrType = "To";
                }
                if (t == "addr_cc") {
                    addrType = "Cc";
                    let i;
                    for(i = 0; i < cclist.length; i++) {
                        let ccemail = extractEmails(cclist[i]);
                        if (em == ccemail) {
                            dbg("hit cc = " + ccemail);
                            break;
                        }
                    }
                    if (i != cclist.length) {
                        continue;
                    }
                }
                if (t == "addr_bcc") {
                    let i;
                    for(i = 0; i < bcclist.length; i++) {
                        let bccemail = extractEmails(bcclist[i]);
                        if (em == bccemail) {
                            dbg("hit bcc = " + bccemail);
                            break;
                        }
                    }
                    if (i != bcclist.length) {
                        continue;
                    }
                    addrType = "Bcc";
                }
                if (t == "addr_reply") {
                    continue;
                }
                let rcpt = {email: recipient, type: addrType, safe: safereply};
                all.push(rcpt);
            }
        }
        
        let bucket = document.getElementById("attachmentBucket");
        let confirmwin = SaGetPrefBool("confirmation_window");
        let nowininternal = SaGetPrefBool("nowin_internal");
        let skip = nowininternal && all_internal;
        if (skip) {
            dbg("skipping dialog because all recipients are in our domain");
        }
        if (all.length == 0) {
            skip = true;
        }

        var param = {out: false};
        if ((confirmwin) && (!skip)) {
            window.openDialog("chrome://secure-addressing/content/confirm-address-win.xul",
                              "ConfirmAddressDialog", "resizable,chrome,modal,titlebar,centerscreen",
                              param, all, bucket);
        } else {
            param.out = true;
        }

        if (param.out) {
            SecureAddressing.confirmAddress.collectAddress(all);
        }

        return param.out;
    },

    init: function() {
    },

};

window.addEventListener("load", SecureAddressing.confirmAddress.init, false);
document.getElementById("msgcomposeWindow").
    addEventListener("compose-window-reopen", SecureAddressing.confirmAddress.init, false);

var SendMessage = function() {
    if (!SecureAddressing.confirmAddress.SaConfirmAddress()) {
        return;
    }
    var sendInBackground = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch)
                .getBoolPref("mailnews.sendInBackground");
    GenericSendMessage(sendInBackground
                ?       nsIMsgCompDeliverMode.Background
                :       nsIMsgCompDeliverMode.Now);
};

var SendMessageWithCheck = function() {
    if (!SecureAddressing.confirmAddress.SaConfirmAddress()) {
        return;
    }

    var warn = getPref("mail.warn_on_send_accel_key");
    if (warn) {
        var checkValue = {value:false};
        var bundle = document.getElementById("bundle_composeMsgs");
        var buttonPressed = Services.prompt.confirmEx(window,
                               bundle.getString('sendMessageCheckWindowTitle'),
                               bundle.getString('sendMessageCheckLabel'),
                               (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) +
                                 (Services.prompt.BUTTON_TITLE_CANCEL * Services.prompt.BUTTON_POS_1),
                               bundle.getString('sendMessageCheckSendButtonLabel'),
                               null, null,
                               bundle.getString('CheckMsg'),
                               checkValue);

        if (buttonPressed !== 0) {
            return;
        }
        if (checkValue.value) {
            var branch = Components.classes["@mozilla.org/preferences-service;1"]
                                        .getService(Components.interfaces.nsIPrefBranch);
            branch.setBoolPref("mail.warn_on_send_accel_key", false);
        }
    }       
    var sendInBackground = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch)
                .getBoolPref("mailnews.sendInBackground");
    GenericSendMessage(Services.io.offline
                ? nsIMsgCompDeliverMode.Later
                : (sendInBackground
                     ? nsIMsgCompDeliverMode.Background
                     : nsIMsgCompDeliverMode.Now));

};

var SendMessageLater = function() {
    if (!SecureAddressing.confirmAddress.SaConfirmAddress()) {
        return;
    }
    GenericSendMessage(nsIMsgCompDeliverMode.Later);
};

