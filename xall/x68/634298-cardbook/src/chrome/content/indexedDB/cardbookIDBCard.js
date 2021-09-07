var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBCard = {
	cardbookDatabaseVersion: "7",
	cardbookDatabaseName: "CardBook",

	// first step in the initial load data
	openCardDB: function() {
		// generic output when errors on DB
		cardbookRepository.cardbookDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Database error : " + e.value, "Error");
		};

		var request = indexedDB.open(cardbookIDBCard.cardbookDatabaseName, cardbookIDBCard.cardbookDatabaseVersion);

		// when version changes
		// for the moment delete all and recreate one new empty
		request.onupgradeneeded = function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cardbookRepository.cardbookDatabase.onerror;
		
			if (e.oldVersion < 1) {
				let store = db.createObjectStore("cards", {keyPath: "cbid", autoIncrement: false});
				store.createIndex("cacheuriIndex", "cacheuri", { unique: false });
			}
			if (e.oldVersion < 7) {
				let store = request.transaction.objectStore("cards");
				store.createIndex("dirPrefIdIndex", "dirPrefId", { unique: false });
			}
		};
		
		// when success, call the observer for starting the load cache and maybe the sync
		request.onsuccess = function(e) {
			cardbookRepository.cardbookDatabase.db = e.target.result;
			cardbookRepository.cardbookUtils.notifyObservers("DBOpen");
		};
		
		// when error, call the observer for starting the load cache and maybe the sync
		request.onerror = function(e) {
			cardbookRepository.cardbookUtils.notifyObservers("DBOpen");
			cardbookRepository.cardbookDatabase.onerror(e);
		};
	},

	// check if the card is in a wrong encryption state
	// then decrypt the card if possible
	checkCard: async function(aDirPrefName, aCard) {
		try {
			var stateMismatched = cardbookIndexedDB.encryptionEnabled != 'encrypted' in aCard;
			var versionMismatched = aCard.encryptionVersion && aCard.encryptionVersion != cardbookEncryptor.VERSION;
			if (stateMismatched || versionMismatched) {
				if ('encrypted' in aCard) {
					aCard = await cardbookEncryptor.decryptCard(aCard);
				}
				cardbookIDBCard.addCard(aDirPrefName, aCard);
			} else {
				if ('encrypted' in aCard) {
					aCard = await cardbookEncryptor.decryptCard(aCard);
				}
			}
			return aCard;
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
			throw new Error("failed to decrypt the card : " + e);
		}
	},

	// add or override the contact to the cache
	addCard: async function(aDirPrefName, aCard, aMode) {
		var storedCard = cardbookIndexedDB.encryptionEnabled ? (await cardbookEncryptor.encryptCard(aCard)) : aCard;
		var db = cardbookRepository.cardbookDatabase.db;
		var transaction = db.transaction(["cards"], "readwrite");
		var store = transaction.objectStore("cards");
		var cursorRequest = store.put(storedCard);
		cursorRequest.onsuccess = function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Contact " + aCard.fn + " written to encrypted DB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Contact " + aCard.fn + " written to DB");
			}
			if (aMode) {
				cardbookActions.fetchCryptoActivity(aMode);
			}
		};
		
		cursorRequest.onerror = function(e) {
			if (aMode) {
				cardbookActions.fetchCryptoActivity(aMode);
			}
			cardbookRepository.cardbookDatabase.onerror(e);
		};
	},

	// delete the contact
	removeCard: function(aDirPrefName, aCard) {
		var db = cardbookRepository.cardbookDatabase.db;
		var transaction = db.transaction(["cards"], "readwrite");
		var store = transaction.objectStore("cards");
		var cursorRequest = store.delete(aCard.cbid);
		cursorRequest.onsuccess = function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Contact " + aCard.fn + " deleted from encrypted DB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Contact " + aCard.fn + " deleted from DB");
			}
		};
		
		cursorRequest.onerror = cardbookRepository.cardbookDatabase.onerror;
	},

	// Check if a card is present in the database
	checkCardForUndoAction: function(aMessage, aCard, aActionId) {
		return new Promise( function(resolve, reject) {
			var db = cardbookRepository.cardbookDatabase.db;
			var transaction = db.transaction(["cards"], "readonly");
			var store = transaction.objectStore("cards");
			var cursorRequest = store.get(aCard.cbid);
		
			cursorRequest.onsuccess = async function(e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aMessage);
				cardbookRepository.cardbookUtils.addTagCreated(aCard);
				var card = e.target.result;
				if (card) {
					aCard.etag = card.etag;
				}
				await cardbookRepository.saveCardFromMove({}, aCard, aActionId, false);
				cardbookRepository.cardbookUtils.notifyObservers(cardbookRepository.currentAction[aActionId].actionCode);
				resolve();
			};
			
			cursorRequest.onerror = function(e) {
				reject();
				cardbookRepository.cardbookDatabase.onerror(e);
			};
		});
	},
	
	// once the DB is open, this is the second step for the AB
	// which use the DB caching
	loadCards: function(aDirPrefId, aDirPrefName, aCallback) {
		var cb = aCallback;
		var db = cardbookRepository.cardbookDatabase.db;
		var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
		var transaction = db.transaction(["cards"], "readonly");
		var store = transaction.objectStore("cards");
		var countRequest = store.count(keyRange);
		var cursorRequest = store.getAll(keyRange);
	
		transaction.oncomplete = function() {
			cb(aDirPrefId);
		};

		countRequest.onsuccess = function(e) {
			cardbookRepository.cardbookServerCardSyncTotal[aDirPrefId] = countRequest.result;
		};

		countRequest.onerror = function(e) {
			cardbookRepository.cardbookDatabase.onerror(e);
		};

		const handleCard = async card => {
			try {
				card = await cardbookIDBCard.checkCard(aDirPrefName, card);
			}
			catch(e) {
				cardbookRepository.cardbookServerCardSyncDone[aDirPrefId]++;
				return;
			}
			if (!card.deleted) {
				await cardbookRepository.addCardToRepository(card, false, card.cacheuri);
				cardbookRepository.cardbookUtils.formatStringForOutput("cardLoadedFromCacheDB", [aDirPrefName, card.fn]);
			} else {
				if (cardbookRepository.cardbookFileCacheCards[aDirPrefId]) {
					cardbookRepository.cardbookFileCacheCards[aDirPrefId][card.cacheuri] = card;
				} else {
					cardbookRepository.cardbookFileCacheCards[aDirPrefId] = {};
					cardbookRepository.cardbookFileCacheCards[aDirPrefId][card.cacheuri] = card;
				}
			}
			cardbookRepository.cardbookServerCardSyncDone[aDirPrefId]++;
		};

		cursorRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result) {
				for (var card of result) {
					Services.tm.currentThread.dispatch({ run: function() {
						handleCard(card);
					}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
				}
			}
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookDatabase.onerror(e);
		};
	},

	// when all contacts were loaded from the cache
	// tells that it is finished
	cardsComplete: function(aDirPrefId) {
		cardbookRepository.cardbookDBCardResponse[aDirPrefId]++;
	},
	
	encryptCards: async function() {
		var db = cardbookRepository.cardbookDatabase.db;
		var cardsTransaction = db.transaction(["cards"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookDatabase,
			cardsTransaction.objectStore("cards"),
			async card => {
				try {
					cardbookIDBCard.addCard(cardbookRepository.cardbookPreferences.getName(card.dirPrefId), card, "encryption");
				}
				catch(e) {
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
				}
			},
			card => !("encrypted" in card),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	},

	decryptCards: async function() {
		var db = cardbookRepository.cardbookDatabase.db;
		var cardsTransaction = db.transaction(["cards"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookDatabase,
			cardsTransaction.objectStore("cards"),
			async card => {
				try {
					card = await cardbookEncryptor.decryptCard(card);
					cardbookIDBCard.addCard(cardbookRepository.cardbookPreferences.getName(card.dirPrefId), card, "decryption");
				}
				catch(e) {
					cardbookActions.fetchCryptoActivity("decryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
				}
			},
			card => ("encrypted" in card),
			() => cardbookActions.finishCryptoActivityOK("decryption")
		);
	},

	upgradeCards: async function() {
		var db = cardbookRepository.cardbookDatabase.db;
		var cardsTransaction = db.transaction(["cards"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookDatabase,
			cardsTransaction.objectStore("cards"),
			async card => {
				try {
					card = await cardbookEncryptor.decryptCard(card);
					cardbookIDBCard.addCard(cardbookRepository.cardbookPreferences.getName(card.dirPrefId), card, "encryption");
				}
				catch(e) {
					cardbookActions.fetchCryptoActivity("encryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
				}
			},
			card => ("encrypted" in card && card.encryptionVersion != cardbookEncryptor.VERSION),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	}
};
