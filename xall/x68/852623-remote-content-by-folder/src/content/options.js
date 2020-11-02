var RCBFOptions = {
    prefBranch: null,
    mapping: [
        ["rcbf-allow-box", "extensions.remote-content-by-folder.allow_regexp", "string"],
        ["rcbf-block-box", "extensions.remote-content-by-folder.block_regexp", "string"],
        ["rcbf-block-first-pref", "extensions.remote-content-by-folder.block_first", "bool"],
    ],

    LoadPrefs: async function() {
      /*  if (! RCBFOptions.prefBranch) {
            RCBFOptions.prefBranch =
                Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
        }   */

        browser.rcmbf_optAPI.LoadPrefs();
        RCBFOptions.mapping.forEach(async function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                elt.value = await browser.rcmbf_optAPI.getIntPref(pref);
                break;
            case "bool":
                elt.checked = await browser.rcmbf_optAPI.getBoolPref(pref);
                break;
            case "string":
                elt.value = await browser.rcmbf_optAPI.getStringPref(pref);
                break;
            case "char":
                elt.value = await browser.rcmbf_optAPI.getCharPref(pref);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
    },

    ValidatePrefs: function(event) {
        RCBFOptions.mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                browser.rcmbf_optAPI.setIntPref(pref, elt.value);
                break;
            case "bool":
                browser.rcmbf_optAPI.setBoolPref(pref, elt.checked);
                break;
            case "string":
                browser.rcmbf_optAPI.setStringPref(pref, elt.value);
                break;
            case "char":
                browser.rcmbf_optAPI.setCharPref(pref, elt.value);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
        return true;
    },

    SetOnLoad: function() {

        var btn_save = document.getElementById("btn_save");
        var btn_cancel= document.getElementById("btn_cancel");
        window.removeEventListener("load", RCBFOptions.SetOnLoad, false);
        btn_cancel.addEventListener("click", function(event) {
            RCBFOptions.LoadPrefs();
        });
        btn_save.addEventListener("click", function(event) {
            if (! RCBFOptions.ValidatePrefs())
                event.preventDefault();
        });
        RCBFOptions.LoadPrefs();
    },
};

window.addEventListener("load", RCBFOptions.SetOnLoad, false);
