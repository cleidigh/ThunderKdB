var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBImage = {
	cardbookImageDatabaseVersion: "1",
	cardbookImageDatabaseName: "CardBookImage",
	doUpgrade: false,

	// first step for getting the images
	openImageDB: function() {
		// generic output when errors on DB
		cardbookRepository.cardbookImageDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Image Database error : " + e.value, "Error");
		};

		var request = indexedDB.open(cardbookIDBImage.cardbookImageDatabaseName, cardbookIDBImage.cardbookImageDatabaseVersion);
	
		// when version changes
		// for the moment delete all and recreate one new empty
		request.onupgradeneeded = function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cardbookRepository.cardbookImageDatabase.onerror;
			if (e.oldVersion < 1) {
				for (let media of cardbookRepository.allColumns.media) {
					if (db.objectStoreNames.contains(media)) {
						db.deleteObjectStore(media);
					}
					let store = db.createObjectStore(media, {keyPath: "cbid", autoIncrement: false});
					store.createIndex("dirPrefIdIndex", "dirPrefId", { unique: false });
				}
				cardbookIDBImage.doUpgrade = true;
			}
		};

		// when success, call the observer for starting the load cache and maybe the sync
		request.onsuccess = function(e) {
			cardbookRepository.cardbookImageDatabase.db = e.target.result;
			if (cardbookIDBImage.doUpgrade) {
				let cacheDir = cardbookRepository.getLocalDirectory();
				let dirIterator1 = new OS.File.DirectoryIterator(cacheDir.path);
				let ABlist = [];
				let imagelist = {};
				dirIterator1.forEach(entry => {
					if (entry.isDir) {
						ABlist.push(entry.name);
					}
				}).then( async function findImageFiles() {
					for (let name of ABlist) {
						let ABDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
						ABDir.initWithPath(cacheDir.path);
						ABDir.append(name);
						ABDir.append("mediacache");
						if (ABDir.exists() && ABDir.isDirectory()) {
							imagelist[name] = [];
							let dirIterator2 = new OS.File.DirectoryIterator(ABDir.path);
							await dirIterator2.forEach(entry => {
								if (!entry.isDir) {
									let imageFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
									imageFile.initWithPath(ABDir.path);
									imageFile.append(entry.name);
									imagelist[name].push(imageFile.path);
								}
							});
						}
					}
				}).then( async function read() {
					for (let name of ABlist) {
						if (imagelist[name]) {
							for (let imageFilePath of imagelist[name]) {
								let imageFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
								imageFile.initWithPath(imageFilePath);
								if (imageFile.exists() && imageFile.isFile()) {
									let base64 = await cardbookRepository.cardbookUtils.getImageFromURI("", "", "file://" + imageFile.path);
									let filenameArray = imageFile.leafName.split(".");
									let uid = filenameArray[0];
									let extension =  filenameArray[filenameArray.length-1];
									cardbookIDBImage.addImage( "photo", "Migration", {cbid: name+"::"+uid, dirPrefId: name, extension: extension, content: base64});
								}
							}
						}
					}
				}).then( () => {
					cardbookIDBImage.doUpgrade = false;
				});
			}                 
			cardbookRepository.cardbookUtils.notifyObservers("imageDBOpen");
		};
		
		// when error, call the observer for starting the load cache and maybe the sync
		request.onerror = function(e) {
			cardbookRepository.cardbookUtils.notifyObservers("imageDBOpen");
			cardbookRepository.cardbookImageDatabase.onerror(e);
		};
	},

	// check if the image is in a wrong encryption state
	// then decrypt the image if possible
	checkImage: async function(aDB, aDirPrefName, aImage) {
		try {
			var stateMismatched = cardbookIndexedDB.encryptionEnabled != 'encrypted' in aImage;
			var versionMismatched = aImage.encryptionVersion && aImage.encryptionVersion != cardbookEncryptor.VERSION;
			if (stateMismatched || versionMismatched) {
				if ('encrypted' in aImage) {
					aImage = await cardbookEncryptor.decryptImage(aImage);
				}
				cardbookIDBImage.addImage(aDB, aDirPrefName, aImage);
			} else {
				if ('encrypted' in aImage) {
					aImage = await cardbookEncryptor.decryptImage(aImage);
				}
			}
			return aImage;
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
			throw new Error("failed to decrypt the image : " + e);
		}
	},

	// add or override the image to the cache
	addImage: async function(aDB, aDirPrefName, aImage, aCardName, aCallback, aMode) {
		var storedImage = cardbookIndexedDB.encryptionEnabled ? (await cardbookEncryptor.encryptImage(aImage)) : aImage;
 		var db = cardbookRepository.cardbookImageDatabase.db;
		var transaction = db.transaction([aDB], "readwrite");
		var store = transaction.objectStore(aDB);
		var cursorRequest = store.put(storedImage);
		cursorRequest.onsuccess = function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Image for " + aCardName + " written to encrypted ImageDB (" + aDB + ")");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Image for " + aCardName + " written to ImageDB (" + aDB + ")");
			}
			if (aMode) {
				cardbookActions.fetchCryptoActivity(aMode);
			}
			if (aCallback) {
				aCallback;
			}
		};
		
		cursorRequest.onerror = function(e) {
			if (aMode) {
				cardbookActions.fetchCryptoActivity(aMode);
			}
			cardbookRepository.cardbookImageDatabase.onerror(e);
		};
 	},

	// delete the image
	removeImage: async function(aDB, aDirPrefName, aImage, aCardName) {
		return new Promise( function(resolve, reject) {
			var db = cardbookRepository.cardbookImageDatabase.db;
			var transaction = db.transaction([aDB], "readwrite");
			var store = transaction.objectStore(aDB);
			var cursorRequest = store.delete(aImage.cbid);
			cursorRequest.onsuccess = function(e) {
				if (cardbookIndexedDB.encryptionEnabled) {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Image " + aCardName + " deleted from encrypted ImageDB (" + aDB + ")");
				} else {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Image " + aCardName + " deleted from ImageDB (" + aDB + ")");
				}
				resolve();
			};
			cursorRequest.onerror = function(e) {
				reject();
				cardbookRepository.cardbookImageDatabase.onerror;
			};
		});
	},

	getImage: function(aDB, aDirPrefName, aImageId, aCardName) {
		return new Promise( function(resolve, reject) {
			var db = cardbookRepository.cardbookImageDatabase.db;
			var transaction = db.transaction([aDB], "readonly");
			var store = transaction.objectStore(aDB);
			var cursorRequest = store.get(aImageId);
			cursorRequest.onsuccess = async function(e) {
				var result = e.target.result;
				if (result) {
					let image = await cardbookIDBImage.checkImage(aDB, aDirPrefName, result, aCardName);
					resolve(image);
				} else {
					reject();
				}
			};
			cursorRequest.onerror = function(e) {
				cardbookRepository.cardbookImageDatabase.onerror;
				reject();
			};
		});
	},
	
	encryptImages: async function() {
		var db = cardbookRepository.cardbookImageDatabase.db;
		for (let media of cardbookRepository.allColumns.media) {
			var imagesTransaction = db.transaction([media], "readonly");
			return cardbookIndexedDB.migrateItems(
				cardbookRepository.cardbookImageDatabase,
				imagesTransaction.objectStore(media),
				async image => {
					try {
						cardbookIDBImage.addImage(media, cardbookRepository.cardbookPreferences.getName(image.dirPrefId), image, "unknown", null, "encryption");
					}
					catch(e) {
						cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
					}
				},
				image => !("encrypted" in image),
				() => cardbookActions.finishCryptoActivityOK("encryption")
			);
		}
	},

	decryptImages: async function() {
		var db = cardbookRepository.cardbookImageDatabase.db;
		for (let media of cardbookRepository.allColumns.media) {
			var imagesTransaction = db.transaction([media], "readonly");
			return cardbookIndexedDB.migrateItems(
				cardbookRepository.cardbookImageDatabase,
				imagesTransaction.objectStore(media),
				async image => {
					try {
						image = await cardbookEncryptor.decryptImage(image);
						cardbookIDBImage.addImage(media, cardbookRepository.cardbookPreferences.getName(image.dirPrefId), image, "unknown", null, "decryption");
					}
					catch(e) {
						cardbookActions.fetchCryptoActivity("decryption");
						cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
					}
				},
				image => ("encrypted" in image),
				() => cardbookActions.finishCryptoActivityOK("decryption")
			);
		}
	},

	upgradeImages: async function() {
		var db = cardbookRepository.cardbookImageDatabase.db;
		for (let media of cardbookRepository.allColumns.media) {
			var imagesTransaction = db.transaction([media], "readonly");
			return cardbookIndexedDB.migrateItems(
				cardbookRepository.cardbookImageDatabase,
				imagesTransaction.objectStore(media),
				async image => {
					try {
						image = await cardbookEncryptor.decryptCard(image);
						cardbookIDBImage.addImage(media, cardbookRepository.cardbookPreferences.getName(image.dirPrefId), image, "unknown", null, "encryption");
					}
					catch(e) {
						cardbookActions.fetchCryptoActivity("encryption");
						cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
					}
				},
				image => ("encrypted" in image && image.encryptionVersion != cardbookEncryptor.VERSION),
				() => cardbookActions.finishCryptoActivityOK("encryption")
			);
		}
	}
};
