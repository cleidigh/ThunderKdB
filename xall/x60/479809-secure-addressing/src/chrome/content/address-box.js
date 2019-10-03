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


Components.utils.import("chrome://secure-addressing/content/memcache.js");
Components.utils.import("chrome://secure-addressing/content/log.js");

SecureAddressing.addressBox = {

    addrOnChange: function(obj) {
        let csauto = SaGetPrefBool("custom_autocompletion");
        if (csauto) {
            updateSendCommands(true)
        } else {
            onRecipientsChanged();
        }
        let idx = obj.id.replace("addressCol2#", "");
        SecureAddressing.addressBox.changed[idx] = true;
    },

    addrOnInput: function(obj) {
        let csauto = SaGetPrefBool("custom_autocompletion");
        if (csauto) {
            updateSendCommands(true)
        } else {
            onRecipientsChanged();
        }
        let idx = obj.id.replace("addressCol2#", "");
        SecureAddressing.addressBox.changed[idx] = true;
    },

    addrOnBlur: function(obj) {
        let csauto = SaGetPrefBool("custom_autocompletion");
        if (!csauto) {
            return;
        }
        let email = obj.value;
        if (email == "") {
            return;
        }
        email = email.replace(/.* >> /, "");
        obj.value = email;
        var callback = function(param, data, error) {
            if (error) {
                return;
            }
            disp = createDisplayString(data);
            obj.value = disp;
        };
        memcacheSearchForDisplay(email, callback, 0);
    },

    init: function() {
        let csauto = SaGetPrefBool("custom_autocompletion");
        if (csauto) {
            let box = document.getElementById("addressCol2#1");
            box.setAttribute("autocompletesearch", "basic-autocomplete");
            box.setAttribute("forcecomplete", "false");
            box.addEventListener("blur", 
                function() {SecureAddressing.addressBox.addrOnBlur(this);});
            box.addEventListener("input", 
                function() {SecureAddressing.addressBox.addrOnInput(this);});
            box.addEventListener("change", 
                function() {SecureAddressing.addressBox.addrOnChange(this);});
            dbg("changed attr for custom autocompletion\n");
        }
        try {
            SecureAddressing.addressBox.addLdapNameOnReply.run();
        } catch(e) {
            dbg("addLdapNameOnReply error: " + e);
        }
        SecureAddressing.addressBox.changed = new Array();
    },

    addLdapNameOnReply: {
        run: function() {
            var interval = setInterval(function() {
                clearInterval(interval);
                interval = null;
                let elem = document.getElementsByClassName('textbox-addressingWidget');
                for (var i = 0; i < elem.length; i++) {
                    if (!elem[i].value) {
                        continue;
                    }
                    var callback = function(obj, data, error) {
                        if (error) {
                            return;
                        }
                        if (!data.name) {
                            return;
                        }
                        try {
                            obj.value = createDisplayString(data);
                        } catch(e) {
                            err("error = " + e + "\n");
                        }
                    };
                    memcacheSearchForDisplay(elem[i].value, callback, elem[i]);
                }
            }, 1000);
        }
    },
};

window.addEventListener("load", SecureAddressing.addressBox.init, false);
document.getElementById("msgcomposeWindow").
    addEventListener("compose-window-reopen", SecureAddressing.addressBox.init, false);


