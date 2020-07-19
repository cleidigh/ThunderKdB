// JavaScript

"use strict";


const Cc = Components.classes;
const Ci = Components.interfaces;
// const Cu = Components.utils;
const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.grammarchecker.");


var oDialogControl = {
    load: function () {
        try {
            // center window
            document.getElementById('grammalecte-spelloptions-window').centerWindowOnScreen();
            // main spelling dictionary
            let sMainDicName = prefs.getCharPref('sMainDicName');
            console.log("spelling dictionary:", sMainDicName);
            if (sMainDicName == "fr-classic.json") {
                document.getElementById("classic").checked = true;
            }
            else if (sMainDicName == "fr-reform.json") {
                document.getElementById("reform").checked = true;
            }
            else if (sMainDicName == "fr-allvars.json") {
                document.getElementById("allvars").checked = true;
            }
            // personal dictionary
            document.getElementById('personal_dic').checked = prefs.getBoolPref('bPersonalDictionary');
            // listen
            this.listen();
        }
        catch (e) {
            console.error(e);
        }
    },
    listen: function () {
        document.addEventListener("dialogaccept", (event) => {
            oDialogControl.setDictionaries();
        });
        document.getElementById("classic").addEventListener("click", (event) => {
            oDialogControl.changeMainDicUI("classic");
        });
        document.getElementById("reform").addEventListener("click", (event) => {
            oDialogControl.changeMainDicUI("reform");
        });
        document.getElementById("allvars").addEventListener("click", (event) => {
            oDialogControl.changeMainDicUI("allvars");
        });
    },
    changeMainDicUI (sDic) {
        document.getElementById("classic").checked = ("classic" === sDic);
        document.getElementById("reform").checked = ("reform" === sDic);
        document.getElementById("allvars").checked = ("allvars" === sDic);
    },
    setDictionaries: function () {
        //oSpellControl.init();
        // main spelling dictionary
        let sMainDicName = "";
        if (document.getElementById("classic").checked) {
            sMainDicName = "fr-classic.json";
        }
        else if (document.getElementById("reform").checked) {
            sMainDicName = "fr-reform.json";
        }
        else if (document.getElementById("allvars").checked) {
            sMainDicName = "fr-allvars.json";
        }
        console.log("selected spelling dictionary:", sMainDicName);
        prefs.setCharPref("sMainDicName", sMainDicName);
        // personal dictionary
        let bActivate = document.getElementById('personal_dic').checked;
        prefs.setBoolPref("bPersonalDictionary", bActivate);
    }
};
