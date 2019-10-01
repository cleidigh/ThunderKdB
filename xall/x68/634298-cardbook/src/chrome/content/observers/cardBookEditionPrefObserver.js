if ("undefined" == typeof(cardBookEditionPrefObserver)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

	var cardBookEditionPrefObserver = {
		register: function() {
			cardBookPrefObserverRepository.registerAll(this);
		},
		
		unregister: function() {
			cardBookPrefObserverRepository.unregisterAll(this);
		},
		
		observe: function(aSubject, aTopic, aData) {
			switch (aData) {
				case "mailPopularityTabView":
				case "advancedTabView":
					wdw_cardEdition.showCorrectTabs();
					break;
			}
		}
	};
};
