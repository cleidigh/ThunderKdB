 "use strict";

if (!ZombieKeys.Preferences) ZombieKeys.Preferences =
{
	service: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),

	get isDebug() {
		return this.service.getBoolPref("extensions.zombiekeys.debug");
	},

	isDebugOption: function(option) { // granular debugging
		if(!this.isDebug) return false;
		try {return this.service.getBoolPref("extensions.zombiekeys.debug." + option);}
		catch(e) {return false;}
	},

	isPreference: function(option) {
		try {return this.service.getBoolPref("extensions.zombiekeys." + option);}
		catch(e) {return false;}
	},

	getBoolPref: function(option) {
		return this.isPreference(option);
	},
	
	// Tb 63 compatibility.
	loadPreferences: function zk_loadPreferences() {
		const util = ZombieKeys.Util;
		if (typeof Preferences == 'undefined') {
			util.logDebug("Skipping loadPreferences - Preferences object not defined");
			return; // older versions of Thunderbird do not need this.
		}		
		let myprefs = document.getElementsByTagName("preference");
		if (myprefs.length) {
			let prefArray = [];
			for (let i=0; i<myprefs.length; i++) {
				let it = myprefs.item(i),
				    p = { id: it.id, name: it.getAttribute('name'), type: it.getAttribute('type') };
				if (it.getAttribute('instantApply') == "true") p.instantApply = true;
				prefArray.push(p);
			}
			if (Preferences)
				Preferences.addAll(prefArray);
		}							
	}	

}