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


/*
  most part of this file is derived from Auto Address Cleaner by markopee
  https://addons.mozilla.org/en-US/thunderbird/addon/auto-address-cleaner/
*/

Components.utils.import("chrome://secure-addressing/content/memcache.js");
Components.utils.import("chrome://secure-addressing/content/prefs.js");
Components.utils.import("chrome://secure-addressing/content/log.js");

SecureAddressing.stripAddress = {

    aacObserver: {
        observerService: null,
        initialize: function() {
            let sasa = SecureAddressing.stripAddress;
            sasa.aacObserver.observerService = Components.classes["@mozilla.org/observer-service;1"]
                                          .getService(Components.interfaces.nsIObserverService);
            sasa.aacObserver.observerService.addObserver(sasa.aacObserver, "mail:composeOnSend", false, true);
            removeEventListener("load", sasa.aacObserver.initialize, false);
        },
        observe: function (subject, topic, data) {
            let sasa = SecureAddressing.stripAddress;
            sasa.autoAddressCleanerMain(GenericSendMessage.arguments[0]);
        },
        complete: function() {
            let sasa = SecureAddressing.stripAddress;
            sasa.aacObserver.observerService.removeObserver(sasa.aacObserver, "mail:composeOnSend");
            removeEventListener("unload", sasa.aacObserver.initialize, false);
        }
    },

    autoAddressCleanerMain: function(msgType) {
        if (!(gMsgCompose && gMsgCompose.compFields)) {
            return;
        }
        if (!(SaGetPrefBool("strip_display_name"))) {
            return;
        }
        if (msgType == nsIMsgCompDeliverMode.Save ||
            msgType == nsIMsgCompDeliverMode.SaveAsDraft ||
            msgType == nsIMsgCompDeliverMode.AutoSaveAsDraft ||
            msgType == nsIMsgCompDeliverMode.SaveAsTemplate) { 
            //do nothing
        } else {
            if (gMsgCompose.compFields.to) {
                gMsgCompose.compFields.to = SecureAddressing.stripAddress.
                                            stripDisplayName(gMsgCompose.compFields.to);
            }
            if (gMsgCompose.compFields.cc) {
                gMsgCompose.compFields.cc = SecureAddressing.stripAddress.
                                            stripDisplayName(gMsgCompose.compFields.cc);
            }
            if (gMsgCompose.compFields.bcc) {
                gMsgCompose.compFields.bcc = SecureAddressing.stripAddress.
                                            stripDisplayName(gMsgCompose.compFields.bcc);
            }
        }
    },

    stripDisplayName: function(addresses) {
        var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
                              .getService(Components.interfaces.nsIMsgHeaderParser);
    
        var strippedAddresses = {};
        var fullNames = {};
        var names = {};
        var numAddresses =  0;
    
        msgHeaderParser.parseHeadersWithArray(addresses, strippedAddresses,
                          names, fullNames, numAddresses);

        return strippedAddresses.value.join(",");
    },
}

addEventListener("load", SecureAddressing.stripAddress.aacObserver.initialize, false);
addEventListener("unload", SecureAddressing.stripAddress.aacObserver.complete, false);
