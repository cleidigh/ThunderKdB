if ("undefined" == typeof(cardbookIndexedDB)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	if ("undefined" == typeof(cardbookPreferences)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookPreferences", "chrome://cardbook/content/preferences/cardbookPreferences.js");
	}
	if ("undefined" == typeof(cardbookLog)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookLog", "chrome://cardbook/content/cardbookLog.js");
	}
	if ("undefined" == typeof(cardbookEncryptor)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookEncryptor", "chrome://cardbook/content/cardbookEncryptor.js");
	}
	
	var EXPORTED_SYMBOLS = ["cardbookIndexedDB"];
	var cardbookIndexedDB = {

		get encryptionEnabled() {
			return cardbookPreferences.getBoolPref("extensions.cardbook.localDataEncryption", false);
		},

		// first step in the initial load data
		openDB: function () {
			// generic output when errors on DB
			cardbookRepository.cardbookDatabase.onerror = function(e) {
				cardbookLog.updateStatusProgressInformation("Database error : " + e.value, "Error");
			};

			var request = indexedDB.open(cardbookRepository.cardbookDatabaseName, cardbookRepository.cardbookDatabaseVersion);
		
			// when version changes
			// for the moment delete all and recreate one new empty
			request.onupgradeneeded = function(e) {
				var db = e.target.result;
				e.target.transaction.onerror = cardbookRepository.cardbookDatabase.onerror;

				if (db.objectStoreNames.contains("cards")) {
					db.deleteObjectStore("cards");
				}
				var store = db.createObjectStore("cards", {keyPath: "cbid", autoIncrement: false});
				store.createIndex("cacheuriIndex", "cacheuri", { unique: false });
			};

			// when success, call the observer for starting the load cache and maybe the sync
			request.onsuccess = function(e) {
				cardbookRepository.cardbookDatabase.db = e.target.result;
				cardbookUtils.notifyObservers("DBOpen");
			};

			// when error, call the observer for starting the load cache and maybe the sync
			request.onerror = function(e) {
				cardbookUtils.notifyObservers("DBOpen");
				cardbookRepository.cardbookDatabase.onerror(e);
			};
		},

		// check if the card is in a wrong encryption state
		// then decrypt the card if possible
		checkCard: async function (aDirPrefName, aCard) {
			try {
				var stateMismatched = cardbookIndexedDB.encryptionEnabled != 'encrypted' in aCard;
				var versionMismatched = aCard.encryptionVersion && aCard.encryptionVersion != cardbookEncryptor.VERSION;
				if (stateMismatched || versionMismatched) {
					if ('encrypted' in aCard) {
						aCard = await cardbookEncryptor.decryptCard(aCard);
					}
					cardbookIndexedDB.addCard(aDirPrefName, aCard);
				} else {
					if ('encrypted' in aCard) {
						aCard = await cardbookEncryptor.decryptCard(aCard);
					}
				}
				return aCard;
			}
			catch(e) {
				cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
				throw new Error("failed to decrypt the card : " + e);
			}
		},

		// add or override the contact to the cache
		addCard: async function (aDirPrefName, aCard, aMode) {
			var storedCard = cardbookIndexedDB.encryptionEnabled ? (await cardbookEncryptor.encryptCard(aCard)) : aCard;
			var db = cardbookRepository.cardbookDatabase.db;
			var transaction = db.transaction(["cards"], "readwrite");
			var store = transaction.objectStore("cards");
			var cursorRequest = store.put(storedCard);
			cursorRequest.onsuccess = function(e) {
				if (cardbookIndexedDB.encryptionEnabled) {
					cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Contact " + aCard.fn + " written to encrypted DB");
				} else {
					cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Contact " + aCard.fn + " written to DB");
				}
				if (aMode) {
					cardbookActions.fetchCryptoActivity(aMode);
				}
			};
			
			cursorRequest.onerror = function(e) {
				if (aMode) {
					cardbookActions.fetchCryptoActivity(aMode);
				}
				cardbookRepository.cardbookDatabase.onerror();
			};
		},

		// delete the contact
		removeCard: function (aDirPrefName, aCard) {
			var db = cardbookRepository.cardbookDatabase.db;
			var transaction = db.transaction(["cards"], "readwrite");
			var store = transaction.objectStore("cards");
			var cursorRequest = store.delete(aCard.cbid);
			cursorRequest.onsuccess = function(e) {
				if (cardbookIndexedDB.encryptionEnabled) {
					cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Contact " + aCard.fn + " deleted from encrypted DB");
				} else {
					cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Contact " + aCard.fn + " deleted from DB");
				}
			};
			
			cursorRequest.onerror = cardbookRepository.cardbookDatabase.onerror;
		},

		// add the contact to the cache only if it is missing
		addCardIfMissing: function (aDirPrefName, aCard) {
			var db = cardbookRepository.cardbookDatabase.db;
			var transaction = db.transaction(["cards"], "readonly");
			var store = transaction.objectStore("cards");
			var cursorRequest = store.get(aCard.cbid);
		
			cursorRequest.onsuccess = function(e) {
				if (!(e.target.result != null)) {
					cardbookIndexedDB.addCard(aDirPrefName, aCard);
				}
			};
			
			cursorRequest.onerror = cardbookRepository.cardbookDatabase.onerror;
		},
		
		// Check if a card is present in the database
		checkCardForUndoAction: function (aMessage, aCard, aActionId) {
			var db = cardbookRepository.cardbookDatabase.db;
			var transaction = db.transaction(["cards"], "readonly");
			var store = transaction.objectStore("cards");
			var cursorRequest = store.get(aCard.cbid);
		
			cursorRequest.onsuccess = function(e) {
				cardbookLog.updateStatusProgressInformationWithDebug2(aMessage);
				cardbookUtils.addTagCreated(aCard);
				var card = e.target.result;
				if (card) {
					aCard.etag = card.etag;
				}
				cardbookRepository.saveCard({}, aCard, aActionId, false);
				cardbookUtils.notifyObservers(cardbookRepository.currentAction[aActionId].actionCode);
			};
			
			cursorRequest.onerror = cardbookRepository.cardbookDatabase.onerror;
		},
		
		// once the DB is open, this is the second step for the AB
		// which use the DB caching
		loadCards: function (aDirPrefId, aDirPrefName, aMode, aCallback) {
			var cb = aCallback;
			var myMode = aMode;
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
				cardbookRepository.cardbookServerSyncTotal[aDirPrefId] = countRequest.result;
			};

			countRequest.onerror = function(e) {
				cardbookRepository.cardbookDatabase.onerror(e);
			};

			const handleCard = async card => {
				try {
					card = await cardbookIndexedDB.checkCard(aDirPrefName, card);
				}
				catch(e) {
					cardbookRepository.cardbookServerSyncDone[aDirPrefId]++;
					return;
				}
				if (!card.deleted) {
					cardbookRepository.addCardToRepository(card, myMode, card.cacheuri);
					cardbookUtils.formatStringForOutput("cardLoadedFromCacheDB", [aDirPrefName, card.fn]);
				} else {
					if (cardbookRepository.cardbookFileCacheCards[aDirPrefId]) {
						cardbookRepository.cardbookFileCacheCards[aDirPrefId][card.cacheuri] = card;
					} else {
						cardbookRepository.cardbookFileCacheCards[aDirPrefId] = {};
						cardbookRepository.cardbookFileCacheCards[aDirPrefId][card.cacheuri] = card;
					}
				}
				cardbookRepository.cardbookServerSyncDone[aDirPrefId]++;
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

		// remove an account
		removeAccount: function (aDirPrefId, aDirPrefName) {
			var db = cardbookRepository.cardbookDatabase.db;
			var transaction = db.transaction(["cards"], "readwrite");
			var store = transaction.objectStore("cards");
			var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
			var cursorRequest = store.delete(keyRange);
		
			cursorRequest.onsuccess = async function(e) {
				if (cardbookIndexedDB.encryptionEnabled) {
					cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from encrypted DB");
				} else {
					cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from DB");
				}
			};

			cursorRequest.onerror = function(e) {
				cardbookRepository.cardbookDatabase.onerror(e);
			};
		},

		// when all contacts were loaded from the cache
		// tells that it is finished
		itemsComplete: function (aDirPrefId) {
			cardbookRepository.cardbookDBResponse[aDirPrefId]++;
		},
		
		// load all contacts for an addressbook
		loadDB: function (aDirPrefId, aDirPrefName, aMode) {
			cardbookIndexedDB.loadCards(aDirPrefId, aDirPrefName, aMode, cardbookIndexedDB.itemsComplete);
		},

		// first step for getting the undos
		openUndoDB: function () {
			// generic output when errors on DB
			cardbookRepository.cardbookActionsDatabase.onerror = function(e) {
				cardbookLog.updateStatusProgressInformation("Undo Database error : " + e.value, "Error");
			};

			var request = indexedDB.open(cardbookRepository.cardbookActionsDatabaseName, cardbookRepository.cardbookActionsDatabaseVersion);
		
			// when version changes
			// for the moment delete all and recreate one new empty
			request.onupgradeneeded = function(e) {
				var db = e.target.result;
				e.target.transaction.onerror = cardbookRepository.cardbookActionsDatabase.onerror;

				if (db.objectStoreNames.contains("cardUndos")) {
					db.deleteObjectStore("cardUndos");
				}
				var store = db.createObjectStore("cardUndos", {keyPath: "undoId", autoIncrement: false});
			};

			request.onsuccess = function(e) {
				cardbookRepository.cardbookActionsDatabase.db = e.target.result;
				cardbookRepository.currentUndoId = Number(cardbookPreferences.getStringPref("extensions.cardbook.currentUndoId"));
				cardbookActions.setUndoAndRedoMenuAndButton();
				cardbookUtils.notifyObservers("undoDBOpen");
			};

			request.onerror = function(e) {
				cardbookRepository.cardbookActionsDatabase.onerror(e);
			};
		},

		// check if the card is in a wrong encryption state
		// then decrypt the card if possible
		checkUndoItem: async function (aItem) {
			try {
				var stateMismatched = cardbookIndexedDB.encryptionEnabled != 'encrypted' in aItem;
				var versionMismatched = aItem.encryptionVersion && aItem.encryptionVersion != cardbookEncryptor.VERSION;
				if (stateMismatched || versionMismatched) {
					if ('encrypted' in aItem) {
						aItem = await cardbookEncryptor.decryptUndoItem(aItem);
					}
					cardbookIndexedDB.addUndoItem(aItem.undoId, aItem.undoCode, aItem.undoMessage, aItem.oldCards, aItem.newCards, true);
				} else {
					if ('encrypted' in aItem) {
						aItem = await cardbookEncryptor.decryptUndoItem(aItem);
					}
				}
				return aItem;
			}
			catch(e) {
				cardbookLog.updateStatusProgressInformation("debug mode : Undo decryption failed e : " + e, "Error");
				throw new Error("failed to decrypt the undo : " + e);
			}
		},

		// remove an undo action
		removeUndoItem: function (aUndoId) {
			var db = cardbookRepository.cardbookActionsDatabase.db;
			var transaction = db.transaction(["cardUndos"], "readwrite");
			var store = transaction.objectStore("cardUndos");
			var keyRange = IDBKeyRange.upperBound(aUndoId);
			var cursorRequest = store.delete(keyRange);
			cursorRequest.onsuccess = function(e) {
				if (cardbookIndexedDB.encryptionEnabled) {
					cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo(s) less than " + aUndoId + " deleted from encrypted undoDB");
				} else {
					cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo(s) less than " + aUndoId + " deleted from undoDB");
				}
			};
			
			cursorRequest.onerror = cardbookRepository.cardbookActionsDatabase.onerror;
		},

		// add an undo action
		addUndoItem: async function (aUndoId, aUndoCode, aUndoMessage, aOldCards, aNewCards, aExactId, aMode) {
			var undoItem = {undoId : aUndoId, undoCode : aUndoCode, undoMessage : aUndoMessage, oldCards: aOldCards, newCards: aNewCards};
			var storedItem = cardbookIndexedDB.encryptionEnabled ? (await cardbookEncryptor.encryptUndoItem(undoItem)) : undoItem;
			var db = cardbookRepository.cardbookActionsDatabase.db;
			var transaction = db.transaction(["cardUndos"], "readwrite");
			var store = transaction.objectStore("cardUndos");
			if (aExactId) {
				var keyRange = IDBKeyRange.only(aUndoId);
			} else {
				var keyRange = IDBKeyRange.lowerBound(aUndoId);
			}
			var cursorDeleteRequest = store.delete(keyRange);
			cursorDeleteRequest.onsuccess = function(e) {
				if (cardbookIndexedDB.encryptionEnabled) {
					if (aExactId) {
						cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo " + aUndoId + " deleted from encrypted undoDB");
					} else {
						cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undos more than " + aUndoId + " deleted from encrypted undoDB");
					}
				} else {
					if (aExactId) {
						cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo " + aUndoId + " deleted from undoDB");
					} else {
						cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undos more than " + aUndoId + " deleted from undoDB");
					}
				}

				var cursorAddRequest = store.put(storedItem);
				cursorAddRequest.onsuccess = function(e) {
					cardbookRepository.currentUndoId = aUndoId;
					cardbookActions.saveCurrentUndoId();
					cardbookActions.setUndoAndRedoMenuAndButton();
					if (cardbookIndexedDB.encryptionEnabled) {
						cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo " + aUndoId + " written to encrypted undoDB");
					} else {
						cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo " + aUndoId + " written to undoDB");
					}
					var maxUndoChanges = cardbookPreferences.getStringPref("extensions.cardbook.maxUndoChanges");
					var undoIdToDelete = aUndoId - maxUndoChanges;
					if (undoIdToDelete > 0) {
						cardbookIndexedDB.removeUndoItem(undoIdToDelete);
					}
					if (aMode) {
						cardbookActions.fetchCryptoActivity(aMode);
					}
				};
				
				cursorAddRequest.onerror = function(e) {
					if (aMode) {
						cardbookActions.fetchCryptoActivity(aMode);
					}
					cardbookRepository.cardbookActionsDatabase.onerror();
				};
			};

			cursorDeleteRequest.onerror = function(e) {
				if (aMode) {
					cardbookActions.fetchCryptoActivity(aMode);
				}
				cardbookRepository.cardbookActionsDatabase.onerror();
			};
		},

		// set the menu label for the undo and redo menu entries
		setUndoAndRedoMenuAndButton: function (aMenuName, aButtonName, aUndoId) {
			// CardBook tab not open or db not open
			// for the standalone window it was unpossible to use the menus menu_undo et menu_redo
			// so menu_undo1 and menu_redo1 were used
			if (!document.getElementById(aMenuName)) {
				if (!document.getElementById(aMenuName + "1")) {
					return;
				} else {
					var myMenu = document.getElementById(aMenuName + "1");
				}
			} else {
				var myMenu = document.getElementById(aMenuName);
			}
			if (!cardbookRepository.cardbookActionsDatabase.db) {
				return;
			}
			var db = cardbookRepository.cardbookActionsDatabase.db;
			var transaction = db.transaction(["cardUndos"], "readonly");
			var store = transaction.objectStore("cardUndos");
			var keyRange = IDBKeyRange.bound(aUndoId, aUndoId);
			var cursorRequest = store.getAll(keyRange);

			const handleItem = async item => {
				try {
					item = await cardbookIndexedDB.checkUndoItem(item);
				}
				catch(e) {
					return;
				}
				myMenu.removeAttribute('disabled');
				myMenu.setAttribute('label', cardbookRepository.strBundle.formatStringFromName(aMenuName + ".long.label", [item.undoMessage], 1));
				if (document.getElementById(aButtonName)) {
					document.getElementById(aButtonName).removeAttribute('disabled');
				}
			};

			cursorRequest.onsuccess = async function(e) {
				var result = e.target.result;
				if (result && result.length != 0) {
					for (var item of result) {
						handleItem(item);
					}
				} else {
					myMenu.setAttribute('disabled', 'true');
					myMenu.setAttribute('label', cardbookRepository.strBundle.GetStringFromName(aMenuName + ".short.label"));
					if (document.getElementById(aButtonName)) {
						document.getElementById(aButtonName).setAttribute('disabled', 'true');
					}
				}
			};
			
			cursorRequest.onerror = function(e) {
				cardbookRepository.cardbookActionsDatabase.onerror(e);
			};
		},

		// do the undo action
		executeUndoItem: function () {
			var db = cardbookRepository.cardbookActionsDatabase.db;
			var transaction = db.transaction(["cardUndos"], "readonly");
			var store = transaction.objectStore("cardUndos");
			var keyRange = IDBKeyRange.bound(cardbookRepository.currentUndoId, cardbookRepository.currentUndoId);
			var cursorRequest = store.getAll(keyRange);
		
			const handleItem = async item => {
				try {
					item = await cardbookIndexedDB.checkUndoItem(item);
				}
				catch(e) {
					return;
				}
				var myTopic = "undoActionDone";
				var myActionId = cardbookActions.startAction(myTopic, [item.undoMessage]);
				for (let myCardToDelete of item.newCards) {
					let myCardToCreate1 = item.oldCards.find(child => child.cbid == myCardToDelete.cbid);
					if (!myCardToCreate1) {
						let myCardToCreate2 = cardbookRepository.cardbookDisplayCards[myCardToDelete.dirPrefId].cards.find(child => child.cbid == myCardToDelete.cbid);
						if (myCardToCreate2.created === true) {
							cardbookUtils.addTagCreated(myCardToDelete);
							cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing undo " + cardbookRepository.currentUndoId + " deleting myCardToDelete.cbid : " + myCardToDelete.cbid);
							cardbookRepository.deleteCards([myCardToDelete], myActionId);
						} else {
							cardbookUtils.addTagDeleted(myCardToDelete);
							myCardToDelete.etag = myCardToCreate2.etag;
							cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing undo " + cardbookRepository.currentUndoId + " deleting myCardToDelete.cbid : " + myCardToDelete.cbid);
							cardbookRepository.deleteCards([myCardToDelete], myActionId);
						}
					}
				}
				for (let myCardToCreate of item.oldCards) {
					let myCardToDelete = cardbookRepository.cardbookDisplayCards[myCardToCreate.dirPrefId].cards.find(child => child.cbid == myCardToCreate.cbid);
					if (!myCardToDelete) {
						var myMessage = "debug mode : executing undo " + cardbookRepository.currentUndoId + " adding myCardToCreate.cbid : " + myCardToCreate.cbid;
						cardbookIndexedDB.checkCardForUndoAction(myMessage, myCardToCreate, myActionId);
					} else {
						cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing undo " + cardbookRepository.currentUndoId + " updating myCardToCreate.cbid : " + myCardToCreate.cbid);
						cardbookUtils.addTagUpdated(myCardToCreate);
						myCardToCreate.etag = myCardToDelete.etag;
						cardbookRepository.saveCard(myCardToDelete, myCardToCreate, myActionId, false);
					}
				}
				cardbookRepository.currentUndoId--;
				cardbookActions.saveCurrentUndoId();
				cardbookActions.setUndoAndRedoMenuAndButton();
				cardbookActions.endAction(myActionId);
			};

			cursorRequest.onsuccess = async function(e) {
				var result = e.target.result;
				if (result) {
					for (var item of result) {
						handleItem(item);
					}
				}
			};

			cursorRequest.onerror = function(e) {
				cardbookRepository.cardbookActionsDatabase.onerror(e);
			};
		},

		// do the redo action
		executeRedoItem: function () {
			var db = cardbookRepository.cardbookActionsDatabase.db;
			var transaction = db.transaction(["cardUndos"], "readonly");
			var store = transaction.objectStore("cardUndos");
			var nextUndoId = cardbookRepository.currentUndoId;
			nextUndoId++;
			var keyRange = IDBKeyRange.bound(nextUndoId, nextUndoId);
			var cursorRequest = store.getAll(keyRange);
		
			const handleItem = async item => {
				try {
					item = await cardbookIndexedDB.checkUndoItem(item);
				}
				catch(e) {
					return;
				}
				var myTopic = "redoActionDone";
				var myActionId = cardbookActions.startAction(myTopic, [item.undoMessage]);
				for (let myCardToDelete of item.oldCards) {
					let myCardToCreate1 = item.newCards.find(child => child.cbid == myCardToDelete.cbid);
					if (!myCardToCreate1) {
						let myCardToCreate2 = cardbookRepository.cardbookDisplayCards[myCardToDelete.dirPrefId].cards.find(child => child.cbid == myCardToDelete.cbid);
						if (myCardToCreate2.created === true) {
							cardbookUtils.addTagCreated(myCardToDelete);
							cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing redo " + cardbookRepository.currentUndoId + " deleting myCardToDelete.cbid : " + myCardToDelete.cbid);
							cardbookRepository.deleteCards([myCardToDelete], myActionId);
						} else {
							cardbookUtils.addTagDeleted(myCardToDelete);
							myCardToDelete.etag = myCardToCreate2.etag;
							cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing redo " + cardbookRepository.currentUndoId + " deleting myCardToDelete.cbid : " + myCardToDelete.cbid);
							cardbookRepository.deleteCards([myCardToDelete], myActionId);
						}
					}
				}
				for (let myCardToCreate of item.newCards) {
					let myCardToDelete = cardbookRepository.cardbookDisplayCards[myCardToCreate.dirPrefId].cards.find(child => child.cbid == myCardToCreate.cbid);
					if (!myCardToDelete) {
						var myMessage = "debug mode : executing undo " + cardbookRepository.currentUndoId + " adding myCardToCreate.cbid : " + myCardToCreate.cbid;
						cardbookIndexedDB.checkCardForUndoAction(myMessage, myCardToCreate, myActionId);
					} else {
						cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing redo " + cardbookRepository.currentUndoId + " updating myCardToCreate.cbid : " + myCardToCreate.cbid);
						cardbookUtils.addTagUpdated(myCardToCreate);
						myCardToCreate.etag = myCardToDelete.etag;
						cardbookRepository.saveCard(myCardToDelete, myCardToCreate, myActionId, false);
					}
				}
				cardbookRepository.currentUndoId++;
				cardbookActions.saveCurrentUndoId();
				cardbookActions.setUndoAndRedoMenuAndButton();
				cardbookActions.endAction(myActionId);
			};

			cursorRequest.onsuccess = async function(e) {
				var result = e.target.result;
				if (result) {
					for (var item of result) {
						handleItem(item);
					}
				}
			};

			cursorRequest.onerror = function(e) {
				cardbookRepository.cardbookActionsDatabase.onerror(e);
			};
		},

		migrateItems: async function(aDatabase, aStore, aMigrateItem, aShouldMigrateItem, aOnComplete) {
			var getAllRequest = aStore.getAll();
			var toBeMigrated = [];

			getAllRequest.onsuccess = async function(e) {
				var result = e.target.result;
				if (result) {
					for (var item of result) {
						if (aShouldMigrateItem(item)) {
							toBeMigrated.push(item);
						}
					}
					cardbookActions.fetchCryptoCount(toBeMigrated.length);
					for (var item of toBeMigrated) {
						aMigrateItem(item);
					}
					if (toBeMigrated.length == 0) {
						aOnComplete();
					}
				}
			};
            
			getAllRequest.onerror = (e) => {
				cardbookActions.finishCryptoActivity();
				aDatabase.onerror(e);
			};
		},

		encryptCards: async function() {
			var db = cardbookRepository.cardbookDatabase.db;
			var cardsTransaction = db.transaction(["cards"], "readonly");
			return this.migrateItems(
				cardbookRepository.cardbookDatabase,
				cardsTransaction.objectStore("cards"),
				async card => {
					try {
						cardbookIndexedDB.addCard(cardbookPreferences.getName(card.dirPrefId), card, "encryption");
					}
					catch(e) {
						cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
					}
				},
				card => !("encrypted" in card),
				() => cardbookActions.finishCryptoActivityOK("encryption")
			);
		},

		decryptCards: async function() {
			var db = cardbookRepository.cardbookDatabase.db;
			var cardsTransaction = db.transaction(["cards"], "readonly");
			return this.migrateItems(
				cardbookRepository.cardbookDatabase,
				cardsTransaction.objectStore("cards"),
				async card => {
					try {
						card = await cardbookEncryptor.decryptCard(card);
						cardbookIndexedDB.addCard(cardbookPreferences.getName(card.dirPrefId), card, "decryption");
					}
					catch(e) {
						cardbookActions.fetchCryptoActivity("decryption");
						cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
					}
				},
				card => ("encrypted" in card),
				() => cardbookActions.finishCryptoActivityOK("decryption")
			);
		},

		upgradeCards: async function() {
			var db = cardbookRepository.cardbookDatabase.db;
			var cardsTransaction = db.transaction(["cards"], "readonly");
			return this.migrateItems(
				cardbookRepository.cardbookDatabase,
				cardsTransaction.objectStore("cards"),
				async card => {
					try {
						card = await cardbookEncryptor.decryptCard(card);
						cardbookIndexedDB.addCard(cardbookPreferences.getName(card.dirPrefId), card, "encryption");
					}
					catch(e) {
						cardbookActions.fetchCryptoActivity("encryption");
						cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
					}
				},
				card => ("encrypted" in card && card.encryptionVersion != cardbookEncryptor.VERSION),
				() => cardbookActions.finishCryptoActivityOK("encryption")
			);
		},

		encryptUndos: async function() {
			var undoDB = cardbookRepository.cardbookActionsDatabase.db;
			var undoTransaction = undoDB.transaction(["cardUndos"], "readonly");
			return this.migrateItems(
				cardbookRepository.cardbookActionsDatabase,
				undoTransaction.objectStore("cardUndos"),
				async item => {
					try {
						cardbookIndexedDB.addUndoItem(item.undoId, item.undoCode, item.undoMessage, item.oldCards, item.newCards, true, "encryption");
					}
					catch(e) {
						cardbookLog.updateStatusProgressInformation("debug mode : Undo encryption failed e : " + e, "Error");
					}
				},
				item => !("encrypted" in item),
				() => cardbookActions.finishCryptoActivityOK("encryption")
			);
		},

		decryptUndos: async function() {
			var undoDB = cardbookRepository.cardbookActionsDatabase.db;
			var undoTransaction = undoDB.transaction(["cardUndos"], "readonly");
			return this.migrateItems(
				cardbookRepository.cardbookActionsDatabase,
				undoTransaction.objectStore("cardUndos"),
				async item => {
					try {
						item = await cardbookEncryptor.decryptUndoItem(item);
						cardbookIndexedDB.addUndoItem(item.undoId, item.undoCode, item.undoMessage, item.oldCards, item.newCards, true, "decryption");
					}
					catch(e) {
						cardbookActions.fetchCryptoActivity("decryption");
						cardbookLog.updateStatusProgressInformation("debug mode : Undo decryption failed e : " + e, "Error");
					}
				},
				item => ("encrypted" in item),
				() => cardbookActions.finishCryptoActivityOK("decryption")
			);
		},

		upgradeUndos: async function() {
			var undoDB = cardbookRepository.cardbookActionsDatabase.db;
			var undoTransaction = undoDB.transaction(["cardUndos"], "readonly");
			return this.migrateItems(
				cardbookRepository.cardbookActionsDatabase,
				undoTransaction.objectStore("cardUndos"),
				async item => {
					try {
						item = await cardbookEncryptor.decryptUndoItem(item);
						cardbookIndexedDB.addUndoItem(item.undoId, item.undoCode, item.undoMessage, item.oldCards, item.newCards, true, "encryption");
					}
					catch(e) {
						cardbookActions.fetchCryptoActivity("encryption");
						cardbookLog.updateStatusProgressInformation("debug mode : Undo encryption failed e : " + e, "Error");
					}
				},
				item => ("encrypted" in item && item.encryptionVersion != cardbookEncryptor.VERSION),
				() => cardbookActions.finishCryptoActivityOK("encryption")
			);
		},

		encryptDBs: async function() {
			cardbookActions.initCryptoActivity("encryption");
			Promise.all([
				this.encryptCards(),
				this.encryptUndos()
			]);
		},

		decryptDBs: async function() {
			cardbookActions.initCryptoActivity("decryption");
			Promise.all([
				this.decryptCards(),
				this.decryptUndos()
			]);
		},

		upgradeDBs: async function() {
			var lastValidatedVersion = cardbookPreferences.getStringPref("extensions.cardbook.localDataEncryption.validatedVersion", "");
			if (lastValidatedVersion != cardbookEncryptor.VERSION) {
				cardbookActions.initCryptoActivity("encryption");
				Promise.all([
					this.upgradeCards(),
					this.upgradeUndos()
				]).then(() => {
					cardbookPreferences.setStringPref("extensions.cardbook.localDataEncryption.validatedVersion", String(cardbookEncryptor.VERSION));
				});
			}
		}
	};
};
