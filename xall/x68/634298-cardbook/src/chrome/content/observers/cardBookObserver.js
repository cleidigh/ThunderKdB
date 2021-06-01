var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var cardBookObserver = {
	
	DBOpen: false,
	catDBOpen: false,
	undoDBOpen: false,
	mailPopDBOpen: false,
	imageDBOpen: false,
	
	register: function() {
		cardBookObserverRepository.registerAll(this);
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
	},
	
	upgradeDBs: function() {
		if (this.mailPopDBOpen && this.catDBOpen && this.DBOpen && this.undoDBOpen && this.imageDBOpen) {
			cardbookIndexedDB.upgradeDBs();
		}
	},
	
	observe: function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.preferencesChanged":
				if (!("undefined" == typeof(ovl_cardbook))) {
					ovl_cardbook.reloadCardBookQFB();
				}
				break;
			case "cardbook.undoDBOpen":
				this.undoDBOpen = true;
				this.upgradeDBs();
				break;
			case "cardbook.imageDBOpen":
				this.imageDBOpen = true;
				this.upgradeDBs();
				break;
			case "cardbook.mailPopDBOpen":
				this.mailPopDBOpen = true;
				this.upgradeDBs();
				cardbookIDBMailPop.loadMailPop();
				break;
			case "cardbook.catDBOpen":
				this.catDBOpen = true;
				this.upgradeDBs();
				cardbookIDBCard.openCardDB();
				break;
			case "cardbook.DBOpen":
				this.DBOpen = true;
				if (!("undefined" == typeof(ovl_cardbook))) {
					ovl_cardbook.reloadCardBookQFB();
				}
				this.upgradeDBs();
				cardbookIDBSearch.openSearchDB();
				break;
			case "cardbook.searchDBOpen":
				cardbookRepository.cardbookSynchronization.loadComplexSearchAccounts();
				break;
			case "cardbook.complexSearchInitLoaded":
				cardbookRepository.cardbookSynchronization.loadAccounts();
				break;
			case "cardbook.syncFisnished":
				if (!("undefined" == typeof(ovl_cardbookMailContacts))) {
					ovl_cardbookMailContacts.refreshBlueStars();
				}
				break;
			case "cardbook.cardCreated":
			case "cardbook.cardModified":
			case "cardbook.cardsDeleted":
			case "cardbook.cardsDragged":
			case "cardbook.cardsMerged":
			case "cardbook.cardsImportedFromDir":
			case "cardbook.cardsImportedFromFile":
			case "cardbook.cardsPasted":
			case "cardbook.categoryConvertedToList":
			case "cardbook.categoryCreated":
			case "cardbook.categoryDeleted":
			case "cardbook.categoryRenamed":
			case "cardbook.categorySelected":
			case "cardbook.categoryUnselected":
			case "cardbook.displayNameGenerated":
			case "cardbook.emailCollectedByFilter":
			case "cardbook.emailDeletedByFilter":
			case "cardbook.listConvertedToCategory":
			case "cardbook.listCreatedFromNode":
			case "cardbook.nodeDeleted":
			case "cardbook.nodeRenamed":
			case "cardbook.outgoingEmailCollected":
			case "cardbook.redoActionDone":
			case "cardbook.undoActionDone":
				// for the yellow star
				if (!("undefined" == typeof(ReloadMessage))) {
					ReloadMessage();
				}
				// for the quick filter bar
				if (!("undefined" == typeof(ovl_cardbook))) {
					ovl_cardbook.reloadCardBookQFB();
				}
				break;
		}
	}
};
