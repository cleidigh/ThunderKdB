var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/cardbookIndexedDB.js", this);

var cardbookSynchro = {

	lTimerSync: null,
	
	lEventTimerSync : { notify: function(lTimerSync) {
		if (!cardbookRepository.firstLoad) {
			// observers are needed not only UI but also for synchro
			// there is no unregister launched
			cardBookObserver.register();
			cardboookModeMutationObserver.register();
			

			// once openDB is finished, it will fire an event
			// and then load the cache and maybe sync the accounts
			cardbookIndexedDB.openDB();

			// query for some undos
			cardbookIndexedDB.openUndoDB();
			
			cardbookRepository.firstLoad = true;
		}
		}
	},
	
	runBackgroundSync: function () {
		cardbookSynchro.lTimerSync = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		cardbookSynchro.lTimerSync.initWithCallback(cardbookSynchro.lEventTimerSync, 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
	}
};

// otherwise indexedDB cannot be opened
var cookieBehavior = Services.prefs.getIntPref("network.cookie.cookieBehavior", 2);
if (cookieBehavior == 2) {
	Services.prefs.setIntPref("network.cookie.cookieBehavior", 1);
}

cardbookRepository.cardbookMailPopularity.loadMailPopularity();
cardbookRepository.cardbookPreferDisplayName.loadPreferDisplayName();

cardbookSynchro.runBackgroundSync();
