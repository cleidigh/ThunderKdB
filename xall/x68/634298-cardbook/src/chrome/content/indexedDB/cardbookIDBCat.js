var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBCat = {
	cardbookCatDatabaseVersion: "3",
	cardbookCatDatabaseName: "CardBookCat",

	// first step for getting the categories
	openCatDB: function() {
		// generic output when errors on DB
		cardbookRepository.cardbookCatDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Cat Database error : " + e.value, "Error");
		};

		var request = indexedDB.open(cardbookIDBCat.cardbookCatDatabaseName, cardbookIDBCat.cardbookCatDatabaseVersion);
	
		// when version changes
		// for the moment delete all and recreate one new empty
		request.onupgradeneeded = function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cardbookRepository.cardbookCatDatabase.onerror;

			if (db.objectStoreNames.contains("categories")) {
				db.deleteObjectStore("categories");
			}
			var store = db.createObjectStore("categories", {keyPath: "cbid", autoIncrement: false});
			store.createIndex("dirPrefIdIndex", "dirPrefId", { unique: false });
		};

		// when success, call the observer for starting the load cache and maybe the sync
		request.onsuccess = function(e) {
			cardbookRepository.cardbookCatDatabase.db = e.target.result;
			cardbookRepository.cardbookUtils.notifyObservers("catDBOpen");
		};
		
		// when error, call the observer for starting the load cache and maybe the sync
		request.onerror = function(e) {
			cardbookRepository.cardbookUtils.notifyObservers("catDBOpen");
			cardbookRepository.cardbookCatDatabase.onerror(e);
		};
	},


	// check if the category is in a wrong encryption state
	// then decrypt the category if possible
	checkCategory: async function(aDirPrefName, aCategory) {
		try {
			var stateMismatched = cardbookIndexedDB.encryptionEnabled != 'encrypted' in aCategory;
			var versionMismatched = aCategory.encryptionVersion && aCategory.encryptionVersion != cardbookEncryptor.VERSION;
			if (stateMismatched || versionMismatched) {
				if ('encrypted' in aCategory) {
					aCategory = await cardbookEncryptor.decryptCategory(aCategory);
				}
				cardbookIDBCat.addCategory(aDirPrefName, aCategory);
			} else {
				if ('encrypted' in aCategory) {
					aCategory = await cardbookEncryptor.decryptCategory(aCategory);
				}
			}
			return aCategory;
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
			throw new Error("failed to decrypt the category : " + e);
		}
	},

	// add or override the category to the cache
	addCategory: async function(aDirPrefName, aCategory, aMode) {
		var storedCategory = cardbookIndexedDB.encryptionEnabled ? (await cardbookEncryptor.encryptCategory(aCategory)) : aCategory;
		var db = cardbookRepository.cardbookCatDatabase.db;
		var transaction = db.transaction(["categories"], "readwrite");
		var store = transaction.objectStore("categories");
		var cursorRequest = store.put(storedCategory);
		cursorRequest.onsuccess = function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Category " + aCategory.name + " written to encrypted CatDB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Category " + aCategory.name + " written to CatDB");
			}
			if (aMode) {
				cardbookActions.fetchCryptoActivity(aMode);
			}
		};
		
		cursorRequest.onerror = function(e) {
			if (aMode) {
				cardbookActions.fetchCryptoActivity(aMode);
			}
			cardbookRepository.cardbookCatDatabase.onerror(e);
		};
	},

	// delete the category
	removeCategory: function(aDirPrefName, aCategory) {
		var db = cardbookRepository.cardbookCatDatabase.db;
		var transaction = db.transaction(["categories"], "readwrite");
		var store = transaction.objectStore("categories");
		var cursorRequest = store.delete(aCategory.cbid);
		cursorRequest.onsuccess = function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Category " + aCategory.name + " deleted from encrypted CatDB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Category " + aCategory.name + " deleted from CatDB");
			}
		};
		cursorRequest.onerror = cardbookRepository.cardbookCatDatabase.onerror;
	},

	// Check if a category is present in the database
	checkCatForUndoAction: function(aMessage, aCategory, aActionId) {
		var db = cardbookRepository.cardbookCatDatabase.db;
		var transaction = db.transaction(["categories"], "readonly");
		var store = transaction.objectStore("categories");
		var cursorRequest = store.get(aCategory.cbid);
	
		cursorRequest.onsuccess = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aMessage);
			cardbookRepository.cardbookUtils.addTagCreated(aCategory);
			var category = e.target.result;
			if (category) {
				aCategory.etag = category.etag;
			}
			cardbookRepository.saveCategory({}, aCategory, aActionId);
			cardbookRepository.cardbookUtils.notifyObservers(cardbookRepository.currentAction[aActionId].actionCode);
		};
		
		cursorRequest.onerror = cardbookRepository.cardbookCatDatabase.onerror;
	},
	
	// once the DB is open, this is the second step for the AB
	// which use the DB caching
	loadCategories: function(aDirPrefId, aDirPrefName, aCallback) {
		var cb = aCallback;
		var db = cardbookRepository.cardbookCatDatabase.db;
		var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
		var transaction = db.transaction(["categories"], "readonly");
		var store = transaction.objectStore("categories");
		var countRequest = store.count(keyRange);
		var cursorRequest = store.getAll(keyRange);
	
		transaction.oncomplete = function() {
			cb(aDirPrefId);
		};

		countRequest.onsuccess = function(e) {
			cardbookRepository.cardbookServerCatSyncTotal[aDirPrefId] = countRequest.result;
		};

		countRequest.onerror = function(e) {
			cardbookRepository.cardbookCatDatabase.onerror(e);
		};

		const handleCategory = async category => {
			try {
				category = await cardbookIDBCat.checkCategory(aDirPrefName, category);
			}
			catch(e) {
				cardbookRepository.cardbookServerCatSyncDone[aDirPrefId]++;
				return;
			}
			if (!category.deleted && category.name != cardbookRepository.cardbookUncategorizedCards) {
				cardbookRepository.addCategoryToRepository(category, false, aDirPrefId);
				cardbookRepository.cardbookUtils.formatStringForOutput("categoryLoadedFromCacheDB", [aDirPrefName, category.name]);
			} else {
				if (cardbookRepository.cardbookFileCacheCategories[aDirPrefId]) {
					cardbookRepository.cardbookFileCacheCategories[aDirPrefId][category.href] = category;
				} else {
					cardbookRepository.cardbookFileCacheCategories[aDirPrefId] = {};
					cardbookRepository.cardbookFileCacheCategories[aDirPrefId][category.href] = category;
				}
			}
			cardbookRepository.cardbookServerCatSyncDone[aDirPrefId]++;
		};

		cursorRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result) {
				for (var category of result) {
					handleCategory(category);
				}
			}
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookCatDatabase.onerror(e);
		};
	},

	// when all categories were loaded from the cache
	// tells that it is finished
	catsComplete: function(aDirPrefId) {
		cardbookRepository.cardbookDBCatResponse[aDirPrefId]++;
	},
	
	encryptCategories: async function() {
		var db = cardbookRepository.cardbookCatDatabase.db;
		var categoriesTransaction = db.transaction(["categories"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookCatDatabase,
			categoriesTransaction.objectStore("categories"),
			async category => {
				try {
					cardbookIDBCat.addCategory(cardbookRepository.cardbookPreferences.getName(category.dirPrefId), category, "encryption");
				}
				catch(e) {
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
				}
			},
			category => !("encrypted" in category),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	},

	decryptCategories: async function() {
		var db = cardbookRepository.cardbookCatDatabase.db;
		var categoriesTransaction = db.transaction(["categories"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookCatDatabase,
			categoriesTransaction.objectStore("categories"),
			async category => {
				try {
					category = await cardbookEncryptor.decryptCategory(category);
					cardbookIDBCat.addCategory(cardbookRepository.cardbookPreferences.getName(category.dirPrefId), category, "decryption");
				}
				catch(e) {
					cardbookActions.fetchCryptoActivity("decryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
				}
			},
			category => ("encrypted" in category),
			() => cardbookActions.finishCryptoActivityOK("decryption")
		);
	},

	upgradeCategories: async function() {
		var db = cardbookRepository.cardbookCatDatabase.db;
		var categoriesTransaction = db.transaction(["categories"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookCatDatabase,
			categoriesTransaction.objectStore("categories"),
			async category => {
				try {
					category = await cardbookEncryptor.decryptCard(category);
					cardbookIDBCat.addCategory(cardbookRepository.cardbookPreferences.getName(category.dirPrefId), category, "encryption");
				}
				catch(e) {
					cardbookActions.fetchCryptoActivity("encryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
				}
			},
			category => ("encrypted" in category && category.encryptionVersion != cardbookEncryptor.VERSION),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	}
};
