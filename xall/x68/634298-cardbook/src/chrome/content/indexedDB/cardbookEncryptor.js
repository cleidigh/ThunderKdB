if ("undefined" == typeof(cardbookEncryptor)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var cardbookEncryptor = {
		VERSION: 2,
		encryptionPrefix: "chrome://cardbook/encryption",

		IV_PREFIX_SIZE: 8,
		IV_COUNTER_SIZE: 8,

		encryptImage: async function (aImage) {
			var [encrypted, iv] = await cardbookEncryptor.encryptString(JSON.stringify(aImage));
			return {
				cbid:      aImage.cbid,
				dirPrefId: aImage.dirPrefId,
				encrypted,
				iv,
				encryptionVersion: this.VERSION
			};
		},

		decryptImage: async function (aImage) {
			var decryptedImage = JSON.parse(await cardbookEncryptor.decryptString(aImage.encrypted, aImage.iv));
			return decryptedImage;
		},

		encryptMailPop: async function (aMailPop) {
			var [encrypted, iv] = await cardbookEncryptor.encryptString(JSON.stringify(aMailPop));
			return {
				mailPopId:      aMailPop.mailPopId,
				encrypted,
				iv,
				encryptionVersion: this.VERSION
			};
		},

		decryptMailPop: async function (aMailPop) {
			var decryptedMailPop = JSON.parse(await cardbookEncryptor.decryptString(aMailPop.encrypted, aMailPop.iv));
			return decryptedMailPop;
		},

		encryptCategory: async function (aCategory) {
			var [encrypted, iv] = await this.encryptString(JSON.stringify(aCategory));
			return {
				cbid:      aCategory.cbid,
				cacheuri:  aCategory.cacheuri,
				encrypted,
				iv,
				encryptionVersion: this.VERSION
			};
		},

		decryptCategory: async function (aCategory) {
			var decryptedCategory = JSON.parse(await this.decryptString(aCategory.encrypted, aCategory.iv));
			return decryptedCategory;
		},

		encryptCard: async function (aCard) {
			var [encrypted, iv] = await this.encryptString(JSON.stringify(aCard));
			return {
				cbid:      aCard.cbid,
				cacheuri:  aCard.cacheuri,
				dirPrefId: aCard.dirPrefId,
				encrypted,
				iv,
				encryptionVersion: this.VERSION
			};
		},

		decryptCard: async function (aCard) {
			var decryptedCard = JSON.parse(await this.decryptString(aCard.encrypted, aCard.iv));
			return decryptedCard;
		},

		encryptUndoItem: async function (aItem) {
			var [encrypted, iv] = await this.encryptString(JSON.stringify(aItem));
			return {
				undoId:    aItem.undoId,
				encrypted,
				iv,
				encryptionVersion: this.VERSION
			};
		},

		decryptUndoItem: async function (aItem) {
			return JSON.parse(await this.decryptString(aItem.encrypted, aItem.iv));
		},


		encryptString: async function (aInput) {
			var data = (new TextEncoder()).encode(aInput);
			var [encryptedData, iv] = await this.encrypt(data);
			return [
				Array.from(new Uint8Array(encryptedData), function (aChar) {
					return String.fromCharCode(aChar);
				}).join(""),
				iv
			];
		},

		decryptString: async function (aEncrypted, aIv) {
			var data = Uint8Array.from(aEncrypted.split(""), function (aChar) {
				return aChar.charCodeAt(0);
			});
			var decryptedData = await this.decrypt(data, aIv);
			return (new TextDecoder()).decode(new Uint8Array(decryptedData));
		},

		get crypto() {
			if ("undefined" !== typeof(crypto)) {
				return crypto;
			}
			var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
			return Services.wm.getMostRecentWindow("mail:3pane").crypto;
		},

		init: async function () {
			var key = await this.getStoredKey(this.VERSION);
			if (!key) {
				this.resetKey(this.VERSION);
			} else {
				this.loadCount();
				this.localizeLogin(this.VERSION);
			}
		},

		resetKey: async function (version) {
			var key = await this.generateKey(version);
			var exportedKey = await this.crypto.subtle.exportKey("jwk", key);
			var iv = this.crypto.getRandomValues(new Uint8Array(this.IV_PREFIX_SIZE));
			this.counter = new Uint8Array(this.IV_COUNTER_SIZE);
			this.saveCount();
			this.storeKey(JSON.stringify({ key: exportedKey, iv: Array.from(iv) }), this.VERSION);
		},

		getLoginName: function (version) {
			return (version ? this.encryptionPrefix + "/" + version : "cardbook");
		},

		getStoredLogin: function (version) {
			try {
				var foundLogins = Services.logins.findLogins(this.getLoginName(version), null, "");
				if (foundLogins.length > 0) {
					return foundLogins[0];
				}
			}
			catch(e) {}
			return null;
		},

		getStoredKey: async function (version) {
			try {
				var login = this.getStoredLogin(version);
				if (login) {
					var key = JSON.parse(login.password);
					var iv = key.iv ? Uint8Array.from(key.iv) : null;
					key = iv ? key.key : key;
					key = await this.crypto.subtle.importKey(
						"jwk",
						key,
						{ name: version > 1 ? "AES-GCM" : "AES-CTR" },
						false,
						["encrypt", "decrypt"]
					);
					return { key, iv };
				}
			}
			catch(e) {}
			return null;
		},

		storeKey: function (key, version) {
			var newLogin = Components.classes["@mozilla.org/login-manager/loginInfo;1"].createInstance(Components.interfaces.nsILoginInfo);
			newLogin.init(this.getLoginName(version), null, cardbookRepository.extension.localeData.localizeMessage("keyDescription"), "", key, "", "");
			var modified = false;
			try {
				var foundLogin = this.getStoredLogin(version);
				if (foundLogin) {
					Services.logins.modifyLogin(foundLogin, newLogin);
					modified = true;
				}
			}
			catch(e) {}
			if (!modified) {
				Services.logins.addLogin(newLogin);
			}
		},

		localizeLogin: function (version) {
			var correctLogins = Services.logins.findLogins(this.getLoginName(version), null, cardbookRepository.extension.localeData.localizeMessage("keyDescription"));
			if (correctLogins.length > 0) {
				return;
			}
			var uncorrectLogins = Services.logins.findLogins(this.getLoginName(version), null, "");
			if (uncorrectLogins.length == 0) {
				return;
			} else {
				var baseLogin = uncorrectLogins[0];
			}
			var newLogin = Components.classes["@mozilla.org/login-manager/loginInfo;1"].createInstance(Components.interfaces.nsILoginInfo);
			newLogin.init(baseLogin.hostname, null, cardbookRepository.extension.localeData.localizeMessage("keyDescription"), "", baseLogin.password, "", "");
			Services.logins.modifyLogin(baseLogin, newLogin);
		},

		generateKey: async function (version) {
			var algorithm = {
					name: version > 1 ? "AES-GCM" : "AES-CTR",
					length: 256
			};
			return this.crypto.subtle.generateKey(
				algorithm,
				true,
				["encrypt", "decrypt"]
			);
		},

		generateIV: function (aIvA, aIvB) {
			if (!aIvB) {
				aIvB = this.incrementCount();
				this.saveCount();
			}
			return Uint8Array.from([...aIvA, ...aIvB]);
		},

		incrementCount: function () {
			let increment = slot => {
				if (slot >= this.counter.length) {
					return true;
				}
				let result = ++this.counter[slot];
				if (result <= 255) {
					return false;
				}
				this.counter[slot] = +0;
				return increment(slot + 1);
			}
			let overflow = increment(0);
			if (overflow) {
				this.counter.fill(0);
			}
			return this.counter;
		},

		saveCount: function() {
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.localDataEncryption.counter", JSON.stringify(Array.from(this.counter)));
		},

		loadCount: function() {
			var counter = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.localDataEncryption.counter", "");
			if (counter) {
				try {
					counter = JSON.parse(counter);
					if (Array.isArray(counter)) {
						this.counter = Uint8Array.from(counter);
						return;
					}
				}
				catch(e) {
				}
			}
			this.counter = new Uint8Array(this.IV_COUNTER_SIZE);
		},

		encrypt: async function (aInput) {
			var key = await this.getStoredKey(this.VERSION);
			if (!key) throw new Error("failed to get secret key for encryption");
			var algorithm, iv;
			var iv = this.generateIV(key.iv);
			var encrypted = await this.crypto.subtle.encrypt(
				{
					name: "AES-GCM",
					iv
				},
				key.key,
				aInput
			);
			return [encrypted, Array.from(iv.slice(8, 16))];
		},

		decrypt: async function (aEncrypted, aIv) {
			var key = await this.getStoredKey(this.VERSION);
			if (!key) throw new Error("failed to get secret key for decryption");
			var algorithm;
			if (!aIv) { // backward compatibility: encrypted with an old version
				key = await this.getStoredKey(null);
				algorithm = {
					name:    "AES-CTR",
					counter: new Uint8Array(16),
					length:  128
				};
			} else {
				algorithm = {
					name: "AES-GCM",
					iv:   this.generateIV(key.iv, aIv)
				};
			}
			try {
				var result = this.crypto.subtle.decrypt(
					algorithm,
					key.key,
					aEncrypted
				);
				return result;
			}
			catch(e) {
				throw new Error("mismatched secret key: you need to clear all encrypted local data.");
			}
		}
	};
	cardbookEncryptor.init();
};
