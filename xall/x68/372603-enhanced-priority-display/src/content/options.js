var EPDOptions = {
    idPrefix: "EnhancedPriorityDisplay-",
    prefBranch: null,
    mapping: [
        ["iconify-checkbox", "Iconify", "bool"],
        ["style-high-checkbox", "StyleHigh", "bool"],
        ["style-low-checkbox", "StyleLow", "bool"],
        ["shade-high-checkbox", "ShadeHigh", "bool"],
        ["shade-low-checkbox", "ShadeLow", "bool"],
        ["highest-icon-textbox", "HighestIcon", "string"],
        ["high-icon-textbox", "HighIcon", "string"],
        ["low-icon-textbox", "LowIcon", "string"],
        ["lowest-icon-textbox", "LowestIcon", "string"],
        ["dump-level-menu", "logging.dump", "char"],
        ["console-level-menu", "logging.console", "char"],
    ],
        
    LoadPrefs: function() {
        if (! EPDOptions.prefBranch) {
            var prefService =
                Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
            EPDOptions.prefBranch = prefService.getBranch(
                "extensions.EnhancedPriorityDisplay.");
        }

        EPDOptions.mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(EPDOptions.idPrefix + elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                elt.value = EPDOptions.prefBranch.getIntPref(pref);
                break;
            case "bool":
                elt.checked = EPDOptions.prefBranch.getBoolPref(pref);
                break;
            case "string":
                elt.value = EPDOptions.prefBranch.getStringPref(pref);
                break;
            case "char":
                elt.value = EPDOptions.prefBranch.getCharPref(pref);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
    },

    ValidatePrefs: function(event) {
        EPDOptions.mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(EPDOptions.idPrefix + elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                EPDOptions.prefBranch.setIntPref(pref, elt.value);
                break;
            case "bool":
                EPDOptions.prefBranch.setBoolPref(pref, elt.checked);
                break;
            case "string":
                EPDOptions.prefBranch.setStringPref(pref, elt.value);
                break;
            case "char":
                EPDOptions.prefBranch.setCharPref(pref, elt.value);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
        return true;
    },

    SetOnLoad: function() {
        window.removeEventListener("load", EPDOptions.SetOnLoad, false);
        document.addEventListener("dialogextra1", function(event) {
            EPDOptions.LoadPrefs();
        });
        document.addEventListener("dialogaccept", function(event) {
            if (! EPDOptions.ValidatePrefs())
                event.preventDefault();
        });
        EPDOptions.LoadPrefs();
    },
};

window.addEventListener("load", EPDOptions.SetOnLoad, false);
