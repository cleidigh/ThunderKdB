(function() {
	var project = com.namespace("com.github.shimamu.asbcustom.customPrefs");

	var prefs = {
		orgPrefs: Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(""),
			copyUnicharPref: function(key, defaultVal) {

				if (defaultVal === undefined) {
					defaultVal = "";
				}
				var val = undefined;
				try {
					val = this.orgPrefs.getComplexValue(key, Components.interfaces.nsIPrefLocalizedString).data;
				} catch(e) {
					console.log(e);
				}
				if (val !== undefined && val !== "") {
					return val;
				} else {
					return defaultVal;
				}
			},
			setUnicharPref: function(key, val) {
				var str = Components.classes["@mozilla.org/supports-string;1"]
					.createInstance(Components.interfaces.nsISupportsString);
				str.data = val;
				this.orgPrefs.setComplexValue(key, Components.interfaces.nsIPrefLocalizedString, str);
			},
			getBoolPref: function(key, defaultVal) {
				try {
					var tmpVal = this.orgPrefs.getBoolPref(key);
					if (tmpVal || tmpVal === "true") {
						return true;
					} else {
						return false;
					}
				} catch(e) {
					return defaultVal;
				}
			},
			setBoolPref: function(key, val) {
				if (val || val === "true") {
					this.orgPrefs.setBoolPref(key, true);
				} else {
					this.orgPrefs.setBoolPref(key, false);
				}
			},
			getIntPref: function(key, defaultVal) {
				try {
					return this.orgPrefs.getIntPref(key);
				} catch(e) {
					return defaultVal;
				}
			},
			setIntPref: function(key, val) {
				this.orgPrefs.setIntPref(key, val);
			},
	};

	project.prefs = prefs;
}());
