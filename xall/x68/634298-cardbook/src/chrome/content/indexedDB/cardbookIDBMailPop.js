var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBMailPop = {
	cardbookMailPopDatabaseVersion: "1",
	cardbookMailPopDatabaseName: "CardBookMailPop",
	doUpgrade: false,

	// first step for getting the mail popularities
	openMailPopDB: function() {
		// generic output when errors on DB
		cardbookRepository.cardbookMailPopDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Mail popularity Database error : " + e.value, "Error");
		};

		var request = indexedDB.open(cardbookIDBMailPop.cardbookMailPopDatabaseName, cardbookIDBMailPop.cardbookMailPopDatabaseVersion);
	
		// when version changes
		// It's an assumed choice not to have the email as the key of the indexedDB DB
		// in order not to provide unencrypted emails in an encrypted DB
		request.onupgradeneeded = function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cardbookRepository.cardbookMailPopDatabase.onerror;
			if (e.oldVersion < 1) {
				if (db.objectStoreNames.contains("mailPop")) {
					db.deleteObjectStore("mailPop");
				}
				let store = db.createObjectStore("mailPop", {keyPath: "mailPopId", autoIncrement: true});
				cardbookIDBMailPop.doUpgrade = true;
			}
		};

		// when success, call the observer for starting the load cache and maybe the sync
		request.onsuccess = function(e) {
			cardbookRepository.cardbookMailPopDatabase.db = e.target.result;
			if (cardbookIDBMailPop.doUpgrade) {
				let cacheDir = cardbookRepository.getLocalDirectory();
				cacheDir.append(cardbookRepository.cardbookMailPopularityFile);
				let promise = OS.File.read(cacheDir.path);
				promise = promise.then(
					function onSuccess(array) {
						let decoder = new TextDecoder();
						let content = decoder.decode(array);
						let re = /[\n\u0085\u2028\u2029]|\r\n?/;
						let fileContentArray = content.split(re);
						for (let line of fileContentArray) {
							let lineArray = line.split(":");
							let email = lineArray[0];
							let count = lineArray[1];
							if (email && count) {
								cardbookIDBMailPop.addMailPop( {email: email, count: count} );
							}
						}
					},
					function onError() {
					}
				);
				cardbookIDBMailPop.doUpgrade = false;
			}
			cardbookRepository.cardbookUtils.notifyObservers("mailPopDBOpen");
		};
		
		// when error, call the observer for starting the load cache and maybe the sync
		request.onerror = function(e) {
			cardbookRepository.cardbookUtils.notifyObservers("mailPopDBOpen");
			cardbookRepository.cardbookMailPopDatabase.onerror(e);
		};
	},


	// check if the mail popularity is in a wrong encryption state
	// then decrypt the mail popularity if possible
	checkMailPop: async function(aMailPop) {
		try {
			var stateMismatched = cardbookIndexedDB.encryptionEnabled != 'encrypted' in aMailPop;
			var versionMismatched = aMailPop.encryptionVersion && aMailPop.encryptionVersion != cardbookEncryptor.VERSION;
			if (stateMismatched || versionMismatched) {
				if ('encrypted' in aMailPop) {
					aMailPop = await cardbookEncryptor.decryptMailPop(aMailPop);
				}
				cardbookIDBMailPop.addMailPop(aMailPop);
			} else {
				if ('encrypted' in aMailPop) {
					aMailPop = await cardbookEncryptor.decryptMailPop(aMailPop);
				}
			}
			return aMailPop;
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
			throw new Error("failed to decrypt the mail popularity : " + e);
		}
	},

	updateMailPop: async function(aEmail, aCount) {
		aEmail = aEmail.toLowerCase();

		if (aCount && cardbookRepository.cardbookMailPopularityIndex[aEmail] && aCount == cardbookRepository.cardbookMailPopularityIndex[aEmail].count) {
			return;
		}
		let mailPop;
		if (aCount && aCount != "0") {
			aCount = parseInt(aCount);
			if (cardbookRepository.cardbookMailPopularityIndex[aEmail]) {
				mailPop = {email: aEmail, count: aCount, mailPopId: cardbookRepository.cardbookMailPopularityIndex[aEmail].mailPopId};
			} else {
				mailPop = {email: aEmail, count: aCount};
			}
			cardbookIDBMailPop.addMailPop(mailPop);
		} else if (aCount && aCount == "0") {
			cardbookIDBMailPop.removeMailPop(aEmail);
		} else {
			if (cardbookRepository.cardbookMailPopularityIndex[aEmail]) {
				mailPop = {email: aEmail, count: cardbookRepository.cardbookMailPopularityIndex[aEmail].count + 1, mailPopId: cardbookRepository.cardbookMailPopularityIndex[aEmail].mailPopId};
			} else {
				mailPop = {email: aEmail, count: 1};
			}
			cardbookIDBMailPop.addMailPop(mailPop);
		}
	},

	// add or override the mail popularity to the cache
	addMailPop: async function(aMailPop, aMode) {
		if (aMailPop.count == "0") {
			return
		}
		aMailPop.email = aMailPop.email.toLowerCase();
		aMailPop.count = parseInt(aMailPop.count);
		var db = cardbookRepository.cardbookMailPopDatabase.db;
		if (!aMailPop.mailPopId) {
			aMailPop.mailPopId = cardbookIDBMailPop.getMailPopId();
		}
		var storedMailPop = cardbookIndexedDB.encryptionEnabled ? (await cardbookEncryptor.encryptMailPop(aMailPop)) : aMailPop;
		var transaction = db.transaction(["mailPop"], "readwrite");
		var store = transaction.objectStore("mailPop");
		var cursorRequest = store.put(storedMailPop);

		cursorRequest.onsuccess = function(e) {
			cardbookIDBMailPop.addMailPopToIndex(aMailPop);
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Mail popularity " + aMailPop.email + " written to encrypted MailPopDB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Mail popularity " + aMailPop.email + " written to MailPopDB");
			}
			if (aMode) {
				cardbookActions.fetchCryptoActivity(aMode);
			}
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookMailPopDatabase.onerror(e);
		};
	},

	// delete the mail popularity
	removeMailPop: function(aEmail) {
		aEmail = aEmail.toLowerCase();
		if (cardbookRepository.cardbookMailPopularityIndex[aEmail]) {
			var mailPopId = cardbookRepository.cardbookMailPopularityIndex[aEmail].mailPopId;
		} else {
			return;
		}
		var db = cardbookRepository.cardbookMailPopDatabase.db;
		var transaction = db.transaction(["mailPop"], "readwrite");
		var store = transaction.objectStore("mailPop");
		var cursorDelete = store.delete(mailPopId);
		
		cursorDelete.onsuccess = async function(e) {
			if (cardbookRepository.cardbookMailPopularityIndex[aEmail]) {
				delete cardbookRepository.cardbookMailPopularityIndex[aEmail];
			}
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Mail popularity " + aEmail + " deleted from encrypted MailPopDB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Mail popularity " + aEmail + " deleted from MailPopDB");
			}
		};
		cursorDelete.onerror = function(e) {
			cardbookRepository.cardbookMailPopDatabase.onerror(e);
		};
	},

	// once the DB is open, this is the second step 
	loadMailPop: function() {
		var db = cardbookRepository.cardbookMailPopDatabase.db;
		var transaction = db.transaction(["mailPop"], "readonly");
		var store = transaction.objectStore("mailPop");
		var cursorRequest = store.getAll();
	
		const handleMailPop = async mailPop => {
			try {
				mailPop = await cardbookIDBMailPop.checkMailPop(mailPop);
			} catch(e) {}
			if (mailPop.email && mailPop.count) {
				cardbookIDBMailPop.addMailPopToIndex(mailPop);
			}
		};

		cursorRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result) {
				for (var mailPop of result) {
					handleMailPop(mailPop);
				}
			}
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookMailPopDatabase.onerror(e);
		};
	},

	getMailPopId: function() {
		cardbookRepository.cardbookMailPopularityLastIndex++;
		return cardbookRepository.cardbookMailPopularityLastIndex;
	},
	
	addMailPopToIndex: function(aMailPop) {
		cardbookRepository.cardbookMailPopularityIndex[aMailPop.email] = {count: aMailPop.count, mailPopId: aMailPop.mailPopId};
		if (aMailPop.mailPopId > cardbookRepository.cardbookMailPopularityLastIndex) {
			cardbookRepository.cardbookMailPopularityLastIndex = aMailPop.mailPopId;
		}
	},
	
	encryptMailPops: async function() {
		var db = cardbookRepository.cardbookMailPopDatabase.db;
		var mailPopsTransaction = db.transaction(["mailPop"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookMailPopDatabase,
			mailPopsTransaction.objectStore("mailPop"),
			async mailPop => {
				try {
					cardbookIDBMailPop.addMailPop(mailPop, "encryption");
				}
				catch(e) {
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
				}
			},
			mailPop => !("encrypted" in mailPop),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	},

	decryptMailPops: async function() {
		var db = cardbookRepository.cardbookMailPopDatabase.db;
		var mailPopsTransaction = db.transaction(["mailPop"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookMailPopDatabase,
			mailPopsTransaction.objectStore("mailPop"),
			async mailPop => {
				try {
					mailPop = await cardbookEncryptor.decryptMailPop(mailPop);
					cardbookIDBMailPop.addMailPop(mailPop, "decryption");
				}
				catch(e) {
					cardbookActions.fetchCryptoActivity("decryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
				}
			},
			mailPop => ("encrypted" in mailPop),
			() => cardbookActions.finishCryptoActivityOK("decryption")
		);
	},

	upgradeMailPops: async function() {
		var db = cardbookRepository.cardbookMailPopDatabase.db;
		var mailPopsTransaction = db.transaction(["mailPop"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookMailPopDatabase,
			mailPopsTransaction.objectStore("mailPop"),
			async mailPop => {
				try {
					mailPop = await cardbookEncryptor.decryptMailPop(mailPop);
					cardbookIDBMailPop.addMailPop(mailPop, "encryption");
				}
				catch(e) {
					cardbookActions.fetchCryptoActivity("encryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
				}
			},
			mailPop => ("encrypted" in mailPop && mailPop.encryptionVersion != cardbookEncryptor.VERSION),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	}
};
