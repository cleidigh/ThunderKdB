var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIndexedDB.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCard.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCat.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBUndo.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBImage.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBMailPop.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBPrefDispName.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBSearch.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookEncryptor.js", this);

var cardbookSynchro = {

	lTimerSync: null,
	
	lEventTimerSync : { notify: function(lTimerSync) {
		if (!cardbookRepository.firstLoad) {
			// observers are needed not only UI but also for synchro
			// there is no unregister launched
			cardBookObserver.register();

			// once openDB is finished, it will fire an event
			// and then load the cache and maybe sync the accounts
			cardbookIDBCat.openCatDB();

			// query for some undos
			cardbookIDBUndo.openUndoDB();

			// query for some undos
			cardbookIDBImage.openImageDB();

			// mail popularity
			cardbookIDBMailPop.openMailPopDB();

			// prefer display name
			cardbookIDBPrefDispName.openPrefDispNameDB();

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

cardbookSynchro.runBackgroundSync();
