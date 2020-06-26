var RCBFOptions = {
    prefBranch: null,
    mapping: [
        ["rcbf-allow-box", "extensions.remote-content-by-folder.allow_regexp", "string"],
        ["rcbf-block-box", "extensions.remote-content-by-folder.block_regexp", "string"],
        ["rcbf-block-first-pref", "extensions.remote-content-by-folder.block_first", "bool"],
    ],
        
    LoadPrefs: function() {
        if (! RCBFOptions.prefBranch) {
            RCBFOptions.prefBranch =
                Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
        }

        RCBFOptions.mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                elt.value = RCBFOptions.prefBranch.getIntPref(pref);
                break;
            case "bool":
                elt.checked = RCBFOptions.prefBranch.getBoolPref(pref);
                break;
            case "string":
                elt.value = RCBFOptions.prefBranch.getStringPref(pref);
                break;
            case "char":
                elt.value = RCBFOptions.prefBranch.getCharPref(pref);
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
                RCBFOptions.prefBranch.setIntPref(pref, elt.value);
                break;
            case "bool":
                RCBFOptions.prefBranch.setBoolPref(pref, elt.checked);
                break;
            case "string":
                RCBFOptions.prefBranch.setStringPref(pref, elt.value);
                break;
            case "char":
                RCBFOptions.prefBranch.setCharPref(pref, elt.value);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
        return true;
    },

    SetOnLoad: function() {
        window.removeEventListener("load", RCBFOptions.SetOnLoad, false);
        document.addEventListener("dialogextra1", function(event) {
            RCBFOptions.LoadPrefs();
        });
        document.addEventListener("dialogaccept", function(event) {
            if (! RCBFOptions.ValidatePrefs())
                event.preventDefault();
        });
        RCBFOptions.LoadPrefs();
    },
};

window.addEventListener("load", RCBFOptions.SetOnLoad, false);
