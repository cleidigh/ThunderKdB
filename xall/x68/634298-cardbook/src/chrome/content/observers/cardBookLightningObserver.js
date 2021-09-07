var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardBookLightningObserver = {
	register: function() {
		cardBookObserverRepository.registerAll(this);
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
	},
	
	observe: function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.addressbookCreated":
			case "cardbook.addressbookDeleted":
			case "cardbook.addressbookModified":
			case "cardbook.preferencesChanged":
				cardbookAutocomplete.loadCssRules();
				break;
		}
	}
};
