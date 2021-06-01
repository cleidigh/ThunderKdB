var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIndexedDB = {

	get encryptionEnabled() {
		return cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.localDataEncryption", false);
	},

	// remove an account
	removeAccount: function(aDirPrefId, aDirPrefName) {
		// cards
		var db = cardbookRepository.cardbookDatabase.db;
		var transaction = db.transaction(["cards"], "readwrite");
		var store = transaction.objectStore("cards");
		var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
		var cursorRequest = store.delete(keyRange);
	
		cursorRequest.onsuccess = async function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from encrypted DB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from DB");
			}
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookDatabase.onerror(e);
		};

		// categories
		var db = cardbookRepository.cardbookCatDatabase.db;
		var transaction = db.transaction(["categories"], "readwrite");
		var store = transaction.objectStore("categories");
		var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
		var cursorRequest = store.delete(keyRange);
	
		cursorRequest.onsuccess = async function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from encrypted CatDB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from CatDB");
			}
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookCatDatabase.onerror(e);
		};

		// images
		for (let media of cardbookRepository.allColumns.media) {
			var db = cardbookRepository.cardbookImageDatabase.db;
			var transaction = db.transaction([media], "readwrite");
			var store = transaction.objectStore(media);
			var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
			var cursorRequest = store.delete(keyRange);
		
			cursorRequest.onsuccess = async function(e) {
				if (cardbookIndexedDB.encryptionEnabled) {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from encrypted ImageDB (" + media + ")");
				} else {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from ImageDB (" + media + ")");
				}
			};
	
			cursorRequest.onerror = function(e) {
				cardbookRepository.cardbookCatDatabase.onerror(e);
			};
		}
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

	encryptDBs: async function() {
		cardbookActions.initCryptoActivity("encryption");
		Promise.all([
			cardbookIDBCat.encryptCategories(),
			cardbookIDBCard.encryptCards(),
			cardbookIDBUndo.encryptUndos(),
			cardbookIDBImage.encryptImages(),
			cardbookIDBMailPop.encryptMailPops()
		]);
	},

	decryptDBs: async function() {
		cardbookActions.initCryptoActivity("decryption");
		Promise.all([
			cardbookIDBCat.decryptCategories(),
			cardbookIDBCard.decryptCards(),
			cardbookIDBUndo.decryptUndos(),
			cardbookIDBImage.decryptImages(),
			cardbookIDBMailPop.decryptMailPops()
		]);
	},

	upgradeDBs: async function() {
		var lastValidatedVersion = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.localDataEncryption.validatedVersion", "");
		if (lastValidatedVersion != cardbookEncryptor.VERSION) {
			cardbookActions.initCryptoActivity("encryption");
			Promise.all([
				cardbookIDBCat.upgradeCategories(),
				cardbookIDBCard.upgradeCards(),
				cardbookIDBUndo.upgradeUndos(),
				cardbookIDBImage.upgradeImages(),
				cardbookIDBMailPop.upgradeMailPops()
			]).then(() => {
				cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.localDataEncryption.validatedVersion", String(cardbookEncryptor.VERSION));
			});
		}
	}
};
