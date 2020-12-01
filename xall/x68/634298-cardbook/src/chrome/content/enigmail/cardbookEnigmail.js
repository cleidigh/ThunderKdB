var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
// test waiting var { EnigmailKeyRing } = ChromeUtils.import("chrome://openpgp/content/modules/keyRing.jsm");
// test waiting var { uidHelper } = ChromeUtils.import("chrome://openpgp/content/modules/uidHelper.jsm");
// test waiting var EnigmailWkdLookup = ChromeUtils.import("chrome://openpgp/content/modules/wkdLookup.jsm").EnigmailWkdLookup;
// test waiting var { EnigmailKeyserverURIs } = ChromeUtils.import("chrome://openpgp/content/modules/keyserverUris.jsm");
// test waiting var { EnigmailKeyServer } = ChromeUtils.import( "chrome://openpgp/content/modules/keyserver.jsm");
// test waiting var { EnigmailKey } = ChromeUtils.import("chrome://openpgp/content/modules/key.jsm");
// test waiting 
// test waiting var cardbookEnigmail = {
// test waiting 	crc_table: [0x00000000, 0x00864cfb, 0x018ad50d, 0x010c99f6, 0x0393e6e1, 0x0315aa1a, 0x021933ec, 0x029f7f17, 0x07a18139, 0x0727cdc2, 0x062b5434, 0x06ad18cf, 0x043267d8, 0x04b42b23,
// test waiting 	  0x05b8b2d5, 0x053efe2e, 0x0fc54e89, 0x0f430272, 0x0e4f9b84, 0x0ec9d77f, 0x0c56a868, 0x0cd0e493, 0x0ddc7d65, 0x0d5a319e, 0x0864cfb0, 0x08e2834b, 0x09ee1abd, 0x09685646, 0x0bf72951,
// test waiting 	  0x0b7165aa, 0x0a7dfc5c, 0x0afbb0a7, 0x1f0cd1e9, 0x1f8a9d12, 0x1e8604e4, 0x1e00481f, 0x1c9f3708, 0x1c197bf3, 0x1d15e205, 0x1d93aefe, 0x18ad50d0, 0x182b1c2b, 0x192785dd, 0x19a1c926,
// test waiting 	  0x1b3eb631, 0x1bb8faca, 0x1ab4633c, 0x1a322fc7, 0x10c99f60, 0x104fd39b, 0x11434a6d, 0x11c50696, 0x135a7981, 0x13dc357a, 0x12d0ac8c, 0x1256e077, 0x17681e59, 0x17ee52a2, 0x16e2cb54,
// test waiting 	  0x166487af, 0x14fbf8b8, 0x147db443, 0x15712db5, 0x15f7614e, 0x3e19a3d2, 0x3e9fef29, 0x3f9376df, 0x3f153a24, 0x3d8a4533, 0x3d0c09c8, 0x3c00903e, 0x3c86dcc5, 0x39b822eb, 0x393e6e10,
// test waiting 	  0x3832f7e6, 0x38b4bb1d, 0x3a2bc40a, 0x3aad88f1, 0x3ba11107, 0x3b275dfc, 0x31dced5b, 0x315aa1a0, 0x30563856, 0x30d074ad, 0x324f0bba, 0x32c94741, 0x33c5deb7, 0x3343924c, 0x367d6c62,
// test waiting 	  0x36fb2099, 0x37f7b96f, 0x3771f594, 0x35ee8a83, 0x3568c678, 0x34645f8e, 0x34e21375, 0x2115723b, 0x21933ec0, 0x209fa736, 0x2019ebcd, 0x228694da, 0x2200d821, 0x230c41d7, 0x238a0d2c,
// test waiting 	  0x26b4f302, 0x2632bff9, 0x273e260f, 0x27b86af4, 0x252715e3, 0x25a15918, 0x24adc0ee, 0x242b8c15, 0x2ed03cb2, 0x2e567049, 0x2f5ae9bf, 0x2fdca544, 0x2d43da53, 0x2dc596a8, 0x2cc90f5e,
// test waiting 	  0x2c4f43a5, 0x2971bd8b, 0x29f7f170, 0x28fb6886, 0x287d247d, 0x2ae25b6a, 0x2a641791, 0x2b688e67, 0x2beec29c, 0x7c3347a4, 0x7cb50b5f, 0x7db992a9, 0x7d3fde52, 0x7fa0a145, 0x7f26edbe,
// test waiting 	  0x7e2a7448, 0x7eac38b3, 0x7b92c69d, 0x7b148a66, 0x7a181390, 0x7a9e5f6b, 0x7801207c, 0x78876c87, 0x798bf571, 0x790db98a, 0x73f6092d, 0x737045d6, 0x727cdc20, 0x72fa90db, 0x7065efcc,
// test waiting 	  0x70e3a337, 0x71ef3ac1, 0x7169763a, 0x74578814, 0x74d1c4ef, 0x75dd5d19, 0x755b11e2, 0x77c46ef5, 0x7742220e, 0x764ebbf8, 0x76c8f703, 0x633f964d, 0x63b9dab6, 0x62b54340, 0x62330fbb,
// test waiting 	  0x60ac70ac, 0x602a3c57, 0x6126a5a1, 0x61a0e95a, 0x649e1774, 0x64185b8f, 0x6514c279, 0x65928e82, 0x670df195, 0x678bbd6e, 0x66872498, 0x66016863, 0x6cfad8c4, 0x6c7c943f, 0x6d700dc9,
// test waiting 	  0x6df64132, 0x6f693e25, 0x6fef72de, 0x6ee3eb28, 0x6e65a7d3, 0x6b5b59fd, 0x6bdd1506, 0x6ad18cf0, 0x6a57c00b, 0x68c8bf1c, 0x684ef3e7, 0x69426a11, 0x69c426ea, 0x422ae476, 0x42aca88d,
// test waiting 	  0x43a0317b, 0x43267d80, 0x41b90297, 0x413f4e6c, 0x4033d79a, 0x40b59b61, 0x458b654f, 0x450d29b4, 0x4401b042, 0x4487fcb9, 0x461883ae, 0x469ecf55, 0x479256a3, 0x47141a58, 0x4defaaff,
// test waiting 	  0x4d69e604, 0x4c657ff2, 0x4ce33309, 0x4e7c4c1e, 0x4efa00e5, 0x4ff69913, 0x4f70d5e8, 0x4a4e2bc6, 0x4ac8673d, 0x4bc4fecb, 0x4b42b230, 0x49ddcd27, 0x495b81dc, 0x4857182a, 0x48d154d1,
// test waiting 	  0x5d26359f, 0x5da07964, 0x5cace092, 0x5c2aac69, 0x5eb5d37e, 0x5e339f85, 0x5f3f0673, 0x5fb94a88, 0x5a87b4a6, 0x5a01f85d, 0x5b0d61ab, 0x5b8b2d50, 0x59145247, 0x59921ebc, 0x589e874a,
// test waiting 	  0x5818cbb1, 0x52e37b16, 0x526537ed, 0x5369ae1b, 0x53efe2e0, 0x51709df7, 0x51f6d10c, 0x50fa48fa, 0x507c0401, 0x5542fa2f, 0x55c4b6d4, 0x54c82f22, 0x544e63d9, 0x56d11cce, 0x56575035,
// test waiting 	  0x575bc9c3, 0x57dd8538
// test waiting 	],
// test waiting 
// test waiting 	createcrc24: function(input) {
// test waiting 		var crc = 0xB704CE;
// test waiting 		var index = 0;
// test waiting 		while (input.length - index > 16) {
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 1]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 2]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 3]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 4]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 5]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 6]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 7]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 8]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 9]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 10]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 11]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 12]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 13]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 14]) & 0xff];
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index + 15]) & 0xff];
// test waiting 			index += 16;
// test waiting 		}
// test waiting 		for (var j = index; j < input.length; j++) {
// test waiting 			crc = crc << 8 ^ cardbookEnigmail.crc_table[(crc >> 16 ^ input[index++]) & 0xff];
// test waiting 		}
// test waiting 		return crc & 0xffffff;
// test waiting 	},
// test waiting 
// test waiting 	str2Uint8Array: function(str) {
// test waiting 		var buf = new ArrayBuffer(str.length);
// test waiting 		var bufView = new Uint8Array(buf);
// test waiting 		for (var i = 0, strLen = str.length; i < strLen; i++) {
// test waiting 			bufView[i] = str.charCodeAt(i);
// test waiting 		}
// test waiting 		return bufView;
// test waiting 	},
// test waiting 
// test waiting 	bytesToArmor: function(str) {
// test waiting 		let crc;
// test waiting 		if (typeof(str) === "string") {
// test waiting 			crc = cardbookEnigmail.createcrc24(cardbookEnigmail.str2Uint8Array(str));
// test waiting 		} else {
// test waiting 			crc = cardbookEnigmail.createcrc24(str);
// test waiting 		}
// test waiting 		let crcAsc = String.fromCharCode(crc >> 16) + String.fromCharCode(crc >> 8 & 0xFF) + String.fromCharCode(crc & 0xFF);
// test waiting 		let s = btoa(str).replace(/(.{72})/g, "$1\n") + "=" + btoa(crcAsc);
// test waiting 		return s;
// test waiting 	},
// test waiting 
// test waiting 	passphrasePromptCallback: function (win, keyId, resultFlags) {
// test waiting 		let p = {};
// test waiting 		p.value = "";
// test waiting 		let dummy = {};
// test waiting 		if (!Services.prompt.promptPassword(
// test waiting 			win,
// test waiting 			"",
// test waiting 			l10n.formatValueSync("passphrase-prompt", {
// test waiting 			key: keyId,
// test waiting 			}),
// test waiting 			p,
// test waiting 			null,
// test waiting 			dummy
// test waiting 			)) {
// test waiting 			resultFlags.canceled = true;
// test waiting 			return "";
// test waiting 		}
// test waiting 		resultFlags.canceled = false;
// test waiting 		return p.value;
// test waiting 	},
// test waiting 
// test waiting 	importKey: function (aValue) {
// test waiting 		let keyValue = aValue;
// test waiting 		if (!keyValue.startsWith("-----BEGIN")) {
// test waiting 			keyValue = "-----BEGIN PGP PUBLIC KEY BLOCK-----\r\n\r\n" + keyValue;
// test waiting 			keyValue = keyValue + "\r\n-----END PGP PUBLIC KEY BLOCK-----";
// test waiting 		}
// test waiting 		let errorMsgObj = {};
// test waiting 		let resultKeys = {};
// test waiting 		let exitCode = EnigmailKeyRing.importKey(
// test waiting 			window,
// test waiting 			false, // interactive, we already asked for confirmation
// test waiting 			keyValue,
// test waiting 			false, // importBinary
// test waiting 			null, // expected keyId, ignored
// test waiting 			errorMsgObj,
// test waiting 			resultKeys,
// test waiting 			false, // minimize
// test waiting 			[], // filter
// test waiting 			false, // isSecret,
// test waiting 			true, // allow prompt for permissive
// test waiting 			cardbookEnigmail.passphrasePromptCallback
// test waiting 			);
// test waiting 		
// test waiting 		if (exitCode !== 0) {
// test waiting 			document.l10n.formatValue("import-keys-failed").then(value => {
// test waiting 					EnigmailDialog.alert(window, value + "\n\n" + errorMsgObj.value);
// test waiting 			});
// test waiting 		} else {
// test waiting 			EnigmailDialog.keyImportDlg(window, resultKeys.value);
// test waiting 		}
// test waiting 	},
// test waiting 
// test waiting 	searchForOnlineKey: function (aListOfSelectedCard, aListOfSelectedEmails) {
// test waiting 		let listOfEmail = [];
// test waiting 		if (aListOfSelectedCard) {
// test waiting 			for (let card of aListOfSelectedCard) {
// test waiting 				if (!card.isAList) {
// test waiting 					for (let emailLine of card.email) {
// test waiting 						listOfEmail.push(emailLine[0][0].toLowerCase());
// test waiting 					}
// test waiting 				} else {
// test waiting 					listOfEmail.push(card.fn.replace('"', '\"'));
// test waiting 				}
// test waiting 			}
// test waiting 		} else if (aListOfSelectedEmails) {
// test waiting 			listOfEmail = JSON.parse(JSON.stringify(aListOfSelectedEmails));
// test waiting 		}
// test waiting 
// test waiting 		for (let email of listOfEmail) {
// test waiting 			let result = { value: email.trim().toLowerCase() };
// test waiting 			if (uidHelper.looksLikeEmail(result.value)) {
// test waiting 				if (!EnigmailDialog.promptValue(window, l10n.formatValueSync("openpgp-key-man-discover-prompt"), result)) {
// test waiting 					continue;
// test waiting 				}
// test waiting 				if (uidHelper.looksLikeEmail(result.value)) {
// test waiting 					KeyLookupHelper.lookupAndImportByEmail(window, result.value, true, null);
// test waiting 				}
// test waiting 			}
// test waiting 		}
// test waiting 	},
// test waiting 
// test waiting 	searchForOnlineKeyEdit: async function (aListOfSelectedEmails) {
// test waiting 		for (let email of aListOfSelectedEmails) {
// test waiting 			email = email.trim().toLowerCase();
// test waiting 			if (uidHelper.looksLikeEmail(email)) {
// test waiting 				// can't get only one key
// test waiting 				// let wkdKeys = await EnigmailWkdLookup.downloadKey(email);
// test waiting 				// if (wkdKeys && "keyData" in wkdKeys) {
// test waiting 				// 	let keyList = EnigmailKey.getKeyListFromKeyBlock(wkdKeys.keyData, {}, false, true, false);
// test waiting 				// 	if (keyList.length > 0) {
// test waiting 				// 		let asciiValue = cardbookEnigmail.bytesToArmor(wkdKeys.keyData);
// test waiting 				// 		wdw_cardEdition.addKeyToEdit(asciiValue);
// test waiting 				// 	}
// test waiting 				// } else {
// test waiting 				let defKs = EnigmailKeyserverURIs.getDefaultKeyServer();
// test waiting 				if (!defKs) {
// test waiting 					return;
// test waiting 				}
// test waiting 				let vks = await EnigmailKeyServer.downloadNoImport(email, defKs);
// test waiting 				if (vks && "keyData" in vks) {
// test waiting 					let keyList = EnigmailKey.getKeyListFromKeyBlock(vks.keyData, {}, false, true, false);
// test waiting 					if (keyList.length > 0) {
// test waiting 						wdw_cardEdition.addKeyToEdit(vks.keyData);
// test waiting 					}
// test waiting 				}
// test waiting     			// }
// test waiting 			}
// test waiting 		}
// test waiting 	},
// test waiting 
// test waiting 	searchForThKeyEdit: function (aListOfSelectedEmails) {
// test waiting 		for (let email of aListOfSelectedEmails) {
// test waiting 			email = email.trim().toLowerCase();
// test waiting 			if (uidHelper.looksLikeEmail(email)) {
// test waiting 				let keyList = EnigmailKeyRing.getKeysByEmail(email);
// test waiting 				for (let key of keyList) {
// test waiting 					let keyIdArray = [ "0x" + key.keyId ];
// test waiting 					let exitCodeObj = {};
// test waiting 					let errorMsgObj = {};
// test waiting 					let keyData = EnigmailKeyRing.extractKey(0, keyIdArray, null, exitCodeObj, errorMsgObj);
// test waiting 					if (exitCodeObj.value === 0) {
// test waiting 						wdw_cardEdition.addKeyToEdit(keyData);
// test waiting 					}
// test waiting 				}
// test waiting 			}
// test waiting 		}
// test waiting 	}
// test waiting };
