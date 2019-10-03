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

SecureAddressing.addFilter = function() {
    var mimeConverter = Components.classes["@mozilla.org/messenger/mimeconverter;1"]
                         .getService(Components.interfaces.nsIMimeConverter);
    let actionName = document.getElementById("secure-addressing-sb-filter")
                             .getString('actionString');

    var modifySubject = {
        id: "secure-addressing@matsuba.net#modifySubject",
        name: actionName,
        apply: function(msgHdrs, actionValue, copyListener, filterType, msgWindow) {
            let regex;
            try {
                regex = new RegExp(actionValue);
            } catch(e) {}
            for (let i = 0; i < msgHdrs.length; i++) {
                let msgHdr = msgHdrs.queryElementAt(i, Components.interfaces.nsIMsgDBHdr);
                let subject = msgHdr.mime2DecodedSubject;
                try {
                    if (regex) {
                        subject = subject.replace(regex, "");
                    } else {
                        subject = subject.replace(actionValue, "");
                    }
                } catch(e) {}
                /*
                  subject = subject.replace(/^\[h!\]/, "");
                  subject = subject.replace(/^\[!!\]/, "");
                  subject = subject.replace(/^\[!\]/, "");
                */
                let converted = mimeConverter.encodeMimePartIIStr_UTF8(subject, false, "UTF-8", 0, 72);
                //dbg("subject = " + converted + "\n");
                msgHdr.subject = converted;
            }
        },
        isValidForType: function(type, scope) { return true; },
        validateActionValue: function(value, folder, type) { return null; },
        allowDuplicates: true,
        isAsync: false,
        needsBody: false,
    };
    
    let filterService = Components.classes["@mozilla.org/messenger/services/filters;1"]
                                     .getService(Components.interfaces.nsIMsgFilterService);
    let cas = filterService.getCustomActions();
    let found = false;
    while (cas.hasMoreElements()) {
        let ca = cas.getNext();
        if (ca instanceof Components.interfaces.nsIMsgFilterCustomAction) {
            if (ca.id == modifySubject.id) {
                found = true;
                break;
            }
        }
    }
    if (!found) {
        filterService.addCustomAction(modifySubject);
    }

};
    
window.addEventListener("load", SecureAddressing.addFilter, false);
