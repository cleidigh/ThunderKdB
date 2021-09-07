var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBPrefDispName = {
	cardbookPrefDispNameDatabaseVersion: "1",
	cardbookPrefDispNameDatabaseName: "CardBookPrefDispName",
	doUpgrade: false,

	// first step for getting the emails
	openPrefDispNameDB: function() {
		// generic output when errors on DB
		cardbookRepository.cardbookPrefDispNameDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Prefer display name Database error : " + e.value, "Error");
		};

		var request = indexedDB.open(cardbookIDBPrefDispName.cardbookPrefDispNameDatabaseName, cardbookIDBPrefDispName.cardbookPrefDispNameDatabaseVersion);
	
		// when version changes
		// It's an assumed choice not to have the email as the key of the indexedDB DB
		// in order not to provide unencrypted emails in an encrypted DB
		request.onupgradeneeded = function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cardbookRepository.cardbookPrefDispNameDatabase.onerror;
			if (e.oldVersion < 1) {
				if (db.objectStoreNames.contains("prefDispName")) {
					db.deleteObjectStore("prefDispName");
				}
				let store = db.createObjectStore("prefDispName", {keyPath: "prefDispNameId", autoIncrement: true});
				cardbookIDBPrefDispName.doUpgrade = true;
			}
		};

		// when success, call the observer for starting the load cache and maybe the sync
		request.onsuccess = function(e) {
			cardbookRepository.cardbookPrefDispNameDatabase.db = e.target.result;
			if (cardbookIDBPrefDispName.doUpgrade) {
				let cacheDir = cardbookRepository.getLocalDirectory();
				cacheDir.append(cardbookRepository.cardbookPreferDisplayNameFile);
				let promise = OS.File.read(cacheDir.path);
				promise = promise.then(
					function onSuccess(array) {
						let decoder = new TextDecoder();
						let content = decoder.decode(array);
						let re = /[\n\u0085\u2028\u2029]|\r\n?/;
						let fileContentArray = content.split(re);
						for (let email of fileContentArray) {
							cardbookIDBPrefDispName.addPrefDispName({email: email});
						}
					},
					function onError() {
					}
				);
				cardbookIDBPrefDispName.doUpgrade = false;
			}
			cardbookRepository.cardbookUtils.notifyObservers("prefDispNameDBOpen");
		};
		
		// when error, call the observer for starting the load cache and maybe the sync
		request.onerror = function(e) {
			cardbookRepository.cardbookUtils.notifyObservers("prefDispNameDBOpen");
			cardbookRepository.cardbookPrefDispNameDatabase.onerror(e);
		};
	},


	// check if the prefer display name is in a wrong encryption state
	// then decrypt the prefer display name if possible
	checkPrefDispName: async function(aPrefDispName) {
		try {
			var stateMismatched = cardbookIndexedDB.encryptionEnabled != 'encrypted' in aPrefDispName;
			var versionMismatched = aPrefDispName.encryptionVersion && aPrefDispName.encryptionVersion != cardbookEncryptor.VERSION;
			if (stateMismatched || versionMismatched) {
				if ('encrypted' in aPrefDispName) {
					aPrefDispName = await cardbookEncryptor.decryptPrefDispName(aPrefDispName);
				}
				cardbookIDBPrefDispName.addPrefDispName(aPrefDispName);
			} else {
				if ('encrypted' in aPrefDispName) {
					aPrefDispName = await cardbookEncryptor.decryptPrefDispName(aPrefDispName);
				}
			}
			return aPrefDispName;
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
			throw new Error("failed to decrypt the prefer display name : " + e);
		}
	},

	// add or override the prefer display name to the cache
	addPrefDispName: async function(aPrefDispName, aMode) {
		aPrefDispName.email = aPrefDispName.email.toLowerCase();
		if (!aPrefDispName.mailPopId) {
			aPrefDispName.prefDispNameId = cardbookIDBPrefDispName.getPrefDispNameId();
		}
		var db = cardbookRepository.cardbookPrefDispNameDatabase.db;
		var storedPrefDispName = cardbookIndexedDB.encryptionEnabled ? (await cardbookEncryptor.encryptPrefDispName(aPrefDispName)) : aPrefDispName;
		var transaction = db.transaction(["prefDispName"], "readwrite");
		var store = transaction.objectStore("prefDispName");
		var cursorRequest = store.put(storedPrefDispName);

		cursorRequest.onsuccess = function(e) {
			cardbookIDBPrefDispName.addPrefDispNameToIndex(aPrefDispName);
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Prefer display name " + aPrefDispName + " written to encrypted PrefDispNameDB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Prefer display name " + aPrefDispName + " written to PrefDispNameDB");
			}
			if (aMode) {
				cardbookActions.fetchCryptoActivity(aMode);
			}
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookPrefDispNameDatabase.onerror(e);
		};
	},

	// delete the prefer display name
	removePrefDispName: function(aEmail) {
		aEmail = aEmail.toLowerCase();
		if (cardbookRepository.cardbookPreferDisplayNameIndex[aEmail]) {
			var prefDispNameId = cardbookRepository.cardbookPreferDisplayNameIndex[aEmail].prefDispNameId;
		} else {
			return;
		}
		var db = cardbookRepository.cardbookPrefDispNameDatabase.db;
		var transaction = db.transaction(["prefDispName"], "readwrite");
		var store = transaction.objectStore("prefDispName");
		var cursorDelete = store.delete(prefDispNameId);
		
		cursorDelete.onsuccess = async function(e) {
			if (cardbookRepository.cardbookPreferDisplayNameIndex[aEmail]) {
				delete cardbookRepository.cardbookPreferDisplayNameIndex[aEmail];
			}
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Prefer display name " + aEmail + " deleted from encrypted PrefDispNameDB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Prefer display name " + aEmail + " deleted from PrefDispNameDB");
			}
		};
		cursorDelete.onerror = function(e) {
			cardbookRepository.cardbookPrefDispNameDatabase.onerror(e);
		};
	},

	// once the DB is open, this is the second step 
	loadPrefDispName: function() {
		var db = cardbookRepository.cardbookPrefDispNameDatabase.db;
		var transaction = db.transaction(["prefDispName"], "readonly");
		var store = transaction.objectStore("prefDispName");
		var cursorRequest = store.getAll();
	
		const handlePrefDispName = async prefDispName => {
			try {
				prefDispName = await cardbookIDBPrefDispName.checkPrefDispName(prefDispName);
			} catch(e) {}
			if (prefDispName) {
				cardbookIDBPrefDispName.addPrefDispNameToIndex(prefDispName);
			}
		};

		cursorRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result) {
				for (var prefDispName of result) {
					handlePrefDispName(prefDispName);
				}
			}
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookPrefDispNameDatabase.onerror(e);
		};
	},

	getPrefDispNameId: function() {
		cardbookRepository.cardbookPreferDisplayNameLastIndex++;
		return cardbookRepository.cardbookPreferDisplayNameLastIndex;
	},
	
	addPrefDispNameToIndex: function(aPrefDispName) {
		cardbookRepository.cardbookPreferDisplayNameIndex[aPrefDispName.email] = {prefDispNameId: aPrefDispName.prefDispNameId};
		if (aPrefDispName.prefDispNameId > cardbookRepository.cardbookPreferDisplayNameLastIndex) {
			cardbookRepository.cardbookPreferDisplayNameLastIndex = aPrefDispName.prefDispNameId;
		}
	},
	
	encryptPrefDispNames: async function() {
		var db = cardbookRepository.cardbookPrefDispNameDatabase.db;
		var prefDispNamesTransaction = db.transaction(["prefDispName"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookPrefDispNameDatabase,
			prefDispNamesTransaction.objectStore("prefDispName"),
			async prefDispName => {
				try {
					cardbookIDBPrefDispName.addPrefDispName(prefDispName, "encryption");
				}
				catch(e) {
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
				}
			},
			prefDispName => !("encrypted" in prefDispName),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	},

	decryptPrefDispNames: async function() {
		var db = cardbookRepository.cardbookPrefDispNameDatabase.db;
		var prefDispNamesTransaction = db.transaction(["prefDispName"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookPrefDispNameDatabase,
			prefDispNamesTransaction.objectStore("prefDispName"),
			async prefDispName => {
				try {
					prefDispName = await cardbookEncryptor.decryptPrefDispName(prefDispName);
					cardbookIDBPrefDispName.addPrefDispName(prefDispName, "decryption");
				}
				catch(e) {
					cardbookActions.fetchCryptoActivity("decryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
				}
			},
			prefDispName => ("encrypted" in prefDispName),
			() => cardbookActions.finishCryptoActivityOK("decryption")
		);
	},

	upgradePrefDispNames: async function() {
		var db = cardbookRepository.cardbookPrefDispNameDatabase.db;
		var prefDispNamesTransaction = db.transaction(["prefDispName"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookPrefDispNameDatabase,
			prefDispNamesTransaction.objectStore("prefDispName"),
			async prefDispName => {
				try {
					prefDispName = await cardbookEncryptor.decryptPrefDispName(prefDispName);
					cardbookIDBPrefDispName.addPrefDispName(prefDispName, "encryption");
				}
				catch(e) {
					cardbookActions.fetchCryptoActivity("encryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
				}
			},
			prefDispName => ("encrypted" in prefDispName && prefDispName.encryptionVersion != cardbookEncryptor.VERSION),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	}
};
