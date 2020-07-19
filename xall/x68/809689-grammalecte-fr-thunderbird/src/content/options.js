// JavaScript

"use strict";


const Cc = Components.classes;
const Ci = Components.interfaces;
// const Cu = Components.utils;
const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.grammarchecker.");


var oOptControl = {

    load: function () {
        try {
            document.getElementById('check_signature').checked = prefs.getBoolPref('bCheckSignature');
        }
        catch (e) {
            console.error(e);
        }
        this.listen();
    },

    listen: function () {
        document.addEventListener("dialogaccept", (event) => {
            this.save();
        });
    },

    save: function () {
        try {
            prefs.setBoolPref('bCheckSignature', document.getElementById('check_signature').checked);
        }
        catch (e) {
            console.error(e);
        }
    }
}

oOptControl.load();
