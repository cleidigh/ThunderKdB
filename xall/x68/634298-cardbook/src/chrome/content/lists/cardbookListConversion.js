if ("undefined" == typeof(cardbookListConversion)) {
	var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");
	if ("undefined" == typeof(cardbookPreferences)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookPreferences", "chrome://cardbook/content/preferences/cardbookPreferences.js");
	}

	function cardbookListConversion(aEmails, aIdentity) {
		this.emailResult = [];
		this.recursiveList = [];
		this._convert(aEmails, aIdentity);
	}
	
	cardbookListConversion.prototype = {
		_verifyRecursivity: function (aList) {
			for (var i = 0; i < this.recursiveList.length; i++) {
				if (this.recursiveList[i] == aList) {
					cardbookUtils.formatStringForOutput("errorInfiniteLoopRecursion", [this.recursiveList.toSource()], "Warning");
					return false;
				}
			}
			this.recursiveList.push(aList);
			return true;
		},
		
		_getEmails: function (aCard, aOnlyEmail) {
			if (aCard.isAList) {
				var myList = aCard.fn;
				if (this._verifyRecursivity(myList)) {
					this._convert(MailServices.headerParser.makeMimeAddress(myList, myList));
				}
			} else {
				var listOfEmail = []
				listOfEmail = cardbookUtils.getMimeEmailsFromCards([aCard], aOnlyEmail).join(", ");
				if (listOfEmail != "") {
					this.emailResult.push(listOfEmail);
				}
			}
		},
		
		_convert: function (aEmails, aIdentity) {
			var memberCustom = cardbookPreferences.getStringPref("extensions.cardbook.memberCustom");
			var useOnlyEmail = cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			var addresses = {}, names = {}, fullAddresses = {};
			MailServices.headerParser.parseHeadersWithArray(aEmails, addresses, names, fullAddresses);
			for (var i = 0; i < addresses.value.length; i++) {
				if (addresses.value[i].includes("@")) {
					if (useOnlyEmail) {
						// we are forced to collect here because after the display name is removed
						var resultEmailsCollections = [];
						resultEmailsCollections = cardbookPreferences.getAllEmailsCollections();
						if (resultEmailsCollections && resultEmailsCollections.length != 0) {
							ovl_collected.addCollectedContact(aIdentity, resultEmailsCollections, names.value[i], addresses.value[i]);
						}
						
						this.emailResult.push(addresses.value[i]);
					} else {
						this.emailResult.push(MailServices.headerParser.makeMimeAddress(names.value[i], addresses.value[i]));
					}
				// for Mail Merge compatibility
				} else if (fullAddresses.value[i].includes("{{") && fullAddresses.value[i].includes("}}")) {
					this.emailResult.push(fullAddresses.value[i]);
				} else {
					var found = false;
					for (j in cardbookRepository.cardbookCards) {
						var myCard = cardbookRepository.cardbookCards[j];
						if (myCard.isAList && myCard.fn == names.value[i]) {
							found = true;
							this.recursiveList.push(names.value[i]);
							if (myCard.version == "4.0") {
								for (var k = 0; k < myCard.member.length; k++) {
									if (myCard.member[k].startsWith("mailto:")) {
										var email = myCard.member[k].replace("mailto:", "");
										this.emailResult.push([email.toLowerCase()]);
									} else {
										var uid = myCard.member[k].replace("urn:uuid:", "");
										if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid]) {
											var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid];
											this._getEmails(myTargetCard, useOnlyEmail);
										}
									}
								}
							} else if (myCard.version == "3.0") {
								for (var k = 0; k < myCard.others.length; k++) {
									var localDelim1 = myCard.others[k].indexOf(":",0);
									if (localDelim1 >= 0) {
										var header = myCard.others[k].substr(0,localDelim1);
										var trailer = myCard.others[k].substr(localDelim1+1,myCard.others[k].length);
										if (header == memberCustom) {
											if (trailer.startsWith("mailto:")) {
												var email = trailer.replace("mailto:", "");
												this.emailResult.push([email.toLowerCase()]);
											} else {
												var uid = trailer.replace("urn:uuid:", "");
												if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid]) {
													var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid];
													this._getEmails(myTargetCard, useOnlyEmail);
												}
											}
										}
									}
								}
							}
							break;
						}
					}
					if (!found) {
						this.emailResult.push(fullAddresses.value[i]);
					}
				}
			}
		}
	};
};
