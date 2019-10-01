//"use strict";


var EXPORTED_SYMBOLS = [ 'MenuOnTop_Shim' ],
    MenuOnTop_Shim = {
  //
		setDefaultPrefs: function setDefaultPrefs(prefBranch, defaultPREFS) {
			function makePref(key, val) {
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
			
			var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
			let branch = Services.prefs.getDefaultBranch(prefBranch);
			
			for (let key in defaultPREFS) {
				makePref(key, defaultPREFS[key]);
			}
		},
		
		stopWindows: function stopWindows() {
			if (typeof windows != 'undefined')
				for (var window of windows) {
					try{
						stop(window);
					} catch (e){}
				}			
		}
}