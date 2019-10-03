var profileSwitcherUtils = {
	
	is13 : function() {
		try {
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        	.getService(Components.interfaces.nsIXULAppInfo);
			var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                               .getService(Components.interfaces.nsIVersionComparator);
			if (versionChecker.compare(appInfo.version, "13") >= 0) 
				return true;
		}
		catch(e) {}
		return false;
	},

	os : function() {
		return navigator.platform.toLowerCase();
	},

	openFPsync : function(fp) {
		let done = false;	
		let rv, result;
		fp.open(result => {
			rv = result;
			done = true;
		});
		let thread = Components.classes["@mozilla.org/thread-manager;1"].getService().currentThread;
		while (!done) {
			thread.processNextEvent(true);
		}
		return rv;
	}

};


