// JavaScript

const Cc = Components.classes;
const Ci = Components.interfaces;
// const Cu = Components.utils;
const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.grammarchecker.");


var oOptControl = {
    oOptions: null,
    load: function () {
        this._setDialogOptions(false);
        this.listen();
    },
    listen: function () {
        document.addEventListener("dialogaccept", (event) => {
            this.save();
        });
        document.addEventListener("dialogextra1", (event) => {
            this.reset();
        });
    },
    _setDialogOptions: function (bDefaultOptions=false) {
        try {
            sOptions = bDefaultOptions ? prefs.getCharPref("sGCDefaultOptions") : prefs.getCharPref("sGCOptions");
            this.oOptions = JSON.parse(sOptions);
            for (let sParam in this.oOptions) {
                if (document.getElementById("option_"+sParam) !== null) {
                    document.getElementById("option_"+sParam).checked = this.oOptions[sParam];
                }
            }
        }
        catch (e) {
            console.error(e);
        }
    },
    save: function () {
        try {
            for (let xNode of document.getElementsByClassName("option")) {
                this.oOptions[xNode.id.slice(7)] = xNode.checked;
            }
            prefs.setCharPref("sGCOptions", JSON.stringify(this.oOptions));
        }
        catch (e) {
            console.error(e);
        }
    },
    reset: function () {
        this._setDialogOptions(true);
    }
}

oOptControl.load();
