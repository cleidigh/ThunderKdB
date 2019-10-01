//"use strict";
var EXPORTED_SYMBOLS = [ 'MenuOnTop_Shim' ],
    MenuOnTop_Shim = {
  //
		setDefaultPrefs: function setDefaultPrefs(prefBranch, defaultPREFS) {
			Components.utils.import("resource://gre/modules/Services.jsm");
			let branch = Services.prefs.getDefaultBranch(prefBranch);
			// replace Iterator
			for (let [key, val] in Iterator( defaultPREFS )) {
				// use x_y to create pref x.y
				key = key.replace(/_/g,'.');
				
				switch (typeof val) {
					case "boolean":
						branch.setBoolPref(key, val);
						break;
					case "number":
						branch.setIntPref(key, val);
						break;
					case "string":
						branch.setStringPref(key, val);
						break;
				}
			}			
		},
		
		stopWindows: function stopWindows() {
			if(windows)
				for each (var window in windows) {
					try{
						stop(window);
					} catch (e){}
				}			
		}
}