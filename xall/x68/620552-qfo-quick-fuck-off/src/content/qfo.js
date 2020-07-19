/* ***** BEGIN LICENSE BLOCK *****
 * Copyright © 2015-2019 tux. <mozilla@tuxproject.de>
 *
 * This work is free. You can redistribute it and/or modify it under the
 * terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.
 *
 * ***** END LICENSE BLOCK ***** */

var QFO = {
    ops: [ "this", "that", "everything", "everyone", "thanks", "flying", "fascinating", "cool", "what", "because", "bye", "diabetes", "bucket", "family", "zayn", "thumbs", "retard", "me", "sake", "pulp/english", "give", "looking", "no", "single", "zero", "horse", "shit", "too", "bag", "ridiculous", "jinglebells", "ratsarse" ],
    opsWithName: [ "yoda", "you", "off", "donut", "shakespeare", "linus", "king", "outside", "madison", "nugget", "bus", "shutup", "bm", "gfy", "back", "anyway", "keep", "look", "think", "cocksplat", "problem", "deraadt", "blackadder" ],

    insertFuckOff: function() {
        // inserts a recent FUCK OFF! at the cursor position
        let editor = GetCurrentEditor();
        let editor_type = GetCurrentEditorType();

        let client = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);

        let ourText = "";   // the REST reply
        let params = "";    // optional REST parameters
        let operation = ""; // what to do
        let url = "";       // the REST URL
        let toName = "";    // if the recipient has a name, it goes here

        if (QFO.isShout()) {
            params = "?shoutcloud"
        }

        let accountname = gCurrentIdentity.fullName.split(" ")[0];  // gCurrentIdentity is set in the MsgWindow
        let recipient = gMsgCompose.compFields.to.trim();           // so is gMsgCompose

        // let's find out which recipient we need.
        // when Thunderbird replies to a couple of names, the first one is (usually) the most relevant.
        // when we only reply to one guy, we still need to grab his name.
        //   ex.:  "NAME more names" <some@guy.net>
        //         "more names, NAME" <some@guy.net>
        //         no@name.net
        //         NICKNAME <some@guy.net>
        //         ALIAS
        // however, some Tb versions (?) seem to remove the enclosing "s anyway.

        if (recipient && !recipient.match(/^[A-Z0-9._%-+]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/ig)) {
            // we have a name for the e-mail address.
            // match either the name part in front of the first e-mail address or the alias.
            let nameRegex = /"?([\sA-Z0-9-]+)"?(?=\s<[A-Z0-9._%-+]+@[A-Z0-9.-]+\.[A-Z]{2,6}>)|^([\sA-Z0-9-]+)$/ig;
            let names = nameRegex.exec(recipient);
            let tempName = "";

            if (typeof names[1] != "undefined" || typeof names[2] != "undefined") {
                // we have a name :-)
                if (names[1]) tempName = names[1];      // the first group (full addressee) matched
                else if (names[2]) tempName = names[2]; // the second group (only an alias) matched

                if (tempName.split(",").length == 2) {
                    // if there's exactly one comma, the last part is probably the name
                    tempName = tempName.split(",")[1];
                }

                toName = tempName;
            }
        }

        if (toName.length > 0) {
            // there seems to be a recipient name. throw a dice whether to use it.
            if (Math.round(Math.random()) == 1) {
                // no, we won't.
                operation = QFO.ops[Math.floor(Math.random()*QFO.ops.length)];
            }
            else {
                // yes, we will.
                operation = QFO.opsWithName[Math.floor(Math.random()*QFO.opsWithName.length)]+"/"+toName;
            }
        }
        else {
            // just do it without a name
            operation = QFO.ops[Math.floor(Math.random()*QFO.ops.length)];
        }

        url = "https://foaas.com/"+operation+"/"+accountname + params;

        // build the AJAX callbacks
        client.onload = function(aEvent) {
            // // the request succeeded. put things into the editor window
            editor.beginTransaction();

            ourText = client.responseText;
            if (editor_type == "textmail" || editor_type == "text" || QFO.isAlwaysPlain()) {
                editor.insertText(ourText);
            } else {
                editor.insertHTML(ourText);
            }

            editor.endTransaction();
        };

        client.onError = function(aEvent) {
            // oops.
            editor.beginTransaction();

            if (QFO.isShout()) {
                editor.insertText("FUCK \"FUCK OFF AS A SERVICE!\"!");
            }
            else {
                editor.insertText("Fuck \"Fuck Off As A Service!\"!");
            }

            editor.endTransaction();
        };

        // send the AJAX request ;-)
        client.open("GET", url, true);

        if (editor_type == "textmail" || editor_type == "text" || QFO.isAlwaysPlain()) {
            client.setRequestHeader("Accept", "text/plain");
        }
        else {
            client.setRequestHeader("Accept", "text/html");
        }

        client.send();
    },

    isShout: function() {
        // returns the current setting of the SHOUTCLOUD
        let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        let prefServiceBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");

        if (prefServiceBranch.getPrefType('extensions.qfo.shoutcloud')) {
            // key exists!
            let prefs = prefService.getBranch("extensions.qfo.");
            return prefs.getBoolPref("shoutcloud"); // get the pref
        }
        return false;
    },

    isAlwaysPlain: function() {
        // do we always want to have plaintext?
        let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        let prefServiceBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");

        if (prefServiceBranch.getPrefType('extensions.qfo.plaintext')) {
            // key exists!
            let prefs = prefService.getBranch("extensions.qfo.");
            return prefs.getBoolPref("plaintext"); // get the pref
        }
        return false;
    }
}
