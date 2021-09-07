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
			case "fieldsNameList":
				wdw_cardEdition.setEditionFields();
				wdw_cardEdition.loadEditionFields();
				wdw_cardEdition.loadFieldSelector();
				break;
			case "accountShown":
				wdw_cardEdition.changePreviousNext();
				break;
		}
	}
};

var cardBookEditionObserver = {
	register: function() {
		cardBookObserverRepository.registerAll(this);
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
	},
	
	observe: function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.mailMode":
				wdw_cardEdition.cancelPreviousNext();
				break;
			case "cardbook.cardbookMode":
				wdw_cardEdition.changePreviousNext();
				break;
		}
	}
};
