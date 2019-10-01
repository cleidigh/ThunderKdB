var RTMMOptions = {
    prefBranch: null,
    mapping: [
        ["rtmm-use_bcc-checkbox", "extensions.reply-to-multiple-messages.use_bcc", "bool"],
        ["rtmm-hide_references-checkbox", "extensions.reply-to-multiple-messages.hide_references", "bool"],
        ["rtmm-dumplevel-menu", "extensions.reply-to-multiple-messages.logging.dump", "char"],
        ["rtmm-consolelevel-menu", "extensions.reply-to-multiple-messages.logging.console", "char"],
    ],
        
    LoadPrefs: function() {
        // When the add-on is first installed loading default preferences fails,
        // so we need to redo it here just in case.
        var {DefaultPreferencesLoader} = ChromeUtils.import(
            "chrome://reply-to-multiple-messages/content/" +
            "defaultPreferencesLoader.jsm");
        var loader = new DefaultPreferencesLoader();
        loader.parseUri("chrome://reply-to-multiple-messages/content/prefs.js");

        if (! RTMMOptions.prefBranch) {
            RTMMOptions.prefBranch =
                Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
        }

        RTMMOptions.mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                elt.value = RTMMOptions.prefBranch.getIntPref(pref);
                break;
            case "bool":
                elt.checked = RTMMOptions.prefBranch.getBoolPref(pref);
                break;
            case "string":
                elt.value = RTMMOptions.prefBranch.getStringPref(pref);
                break;
            case "char":
                elt.value = RTMMOptions.prefBranch.getCharPref(pref);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
    },

    ValidatePrefs: function(event) {
        RTMMOptions.mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                RTMMOptions.prefBranch.setIntPref(pref, elt.value);
                break;
            case "bool":
                RTMMOptions.prefBranch.setBoolPref(pref, elt.checked);
                break;
            case "string":
                RTMMOptions.prefBranch.setStringPref(pref, elt.value);
                break;
            case "char":
                RTMMOptions.prefBranch.setCharPref(pref, elt.value);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
        return true;
    },

    SetOnLoad: function() {
        window.removeEventListener("load", RTMMOptions.SetOnLoad, false);
        document.addEventListener("dialogextra1", function(event) {
            RTMMOptions.LoadPrefs();
        });
        document.addEventListener("dialogaccept", function(event) {
            if (! RTMMOptions.ValidatePrefs())
                event.preventDefault();
        });
        RTMMOptions.LoadPrefs();
    },
};

window.addEventListener("load", RTMMOptions.SetOnLoad, false);
