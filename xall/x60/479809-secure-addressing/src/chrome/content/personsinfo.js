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

SecureAddressing.personsInfo = {

    getMessageBody: function(aMessageHeader) {  
        let messenger = Components.classes["@mozilla.org/messenger;1"]  
                                .createInstance(Components.interfaces.nsIMessenger);  
        let listener = Components.classes["@mozilla.org/network/sync-stream-listener;1"]  
                               .createInstance(Components.interfaces.nsISyncStreamListener);  
        let uri = aMessageHeader.folder.getUriForMsg(aMessageHeader);  
        messenger.messageServiceFromURI(uri).streamMessage(uri, listener, null, null, false, "");  
        let folder = aMessageHeader.folder;  
        return folder.getMsgTextFromStream(listener.inputStream,  
                                         aMessageHeader.Charset,  
                                         65536,  
                                         32768,  
                                         false,  
                                         true,  
                                         { });  
    },  

    showAllPersonsInfo: function(event) {
        if (!gFolderDisplay) {
            return;
        }

        let msgs = gFolderDisplay.selectedMessages;
        let msgHdr = msgs[0];
        let s = SecureAddressing.personsInfo.getMessageBody(msgHdr);
        let email_body = s.match(/([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)/g);
        if (!email_body) {
            email_body = [];
        }
        var email_from = extractEmails(msgHdr.author).split(", ");
        var email_to = extractEmails(msgHdr.recipients).split(", ");
        var email_cc = extractEmails(msgHdr.ccList).split(", ");
        
        window.openDialog("chrome://secure-addressing/content/personsinfo-win.xul",
                          "ConfirmAddressDialog", "chrome,titlebar,centerscreen", 
                          email_from, email_to, email_cc, email_body);
    },

    insertButton: function() {
        let added = SaGetPrefBool("infobtn_added");
        let tb = document.getElementById("header-view-toolbar");
        if (!added) {        
            tb.insertItem("personsinfo", null, null, false);
            tb.setAttribute("currentset", tb.currentSet);
            let cur = tb.currentSet;
            document.persist(tb.id, "currentset");
            SaSetPrefBool("infobtn_added", true);
        }
    },

};

window.addEventListener("load", SecureAddressing.personsInfo.insertButton, false);
