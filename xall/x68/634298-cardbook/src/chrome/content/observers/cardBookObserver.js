var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

var cardBookObserver = {
	
	DBOpen: false,
	undoDBOpen: false,
	
	register: function() {
		cardBookObserverRepository.registerAll(this);
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
	},
	
	observe: function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.preferencesChanged":
				if (!("undefined" == typeof(ovl_cardbook))) {
					ovl_cardbook.reloadCardBookQFB();
				}
				break;
			case "cardbook.DBOpen":
				this.DBOpen = true;
				if (!("undefined" == typeof(ovl_cardbook))) {
					ovl_cardbook.reloadCardBookQFB();
				}
				if (this.DBOpen && this.undoDBOpen) {
					cardbookIndexedDB.upgradeDBs();
				}
				cardbookRepository.cardbookSynchronization.loadComplexSearchAccounts();
				break;
			case "cardbook.undoDBOpen":
				this.undoDBOpen = true;
				if (this.DBOpen && this.undoDBOpen) {
					cardbookIndexedDB.upgradeDBs();
				}
				break;
			case "cardbook.complexSearchInitLoaded":
				cardbookRepository.cardbookSynchronization.loadAccounts();
				break;
			case "cardbook.syncFisnished":
				ovl_cardbookMailContacts.refreshBlueStars();
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

var cardboookModeMutationObserver = {
	register: function() {
		var observer = new MutationObserver(function handleMutations(mutations) {
			cardbookRepository.cardbookUtils.notifyObservers(document.getElementById("cardboookModeBroadcasterTab").getAttribute("mode") + "Mode");
		});
		observer.observe(document.getElementById("cardboookModeBroadcasterTab"), {
			attributes: true,
			subtree: true,
			attributeFilter: ["mode"]
		});
	}
};
