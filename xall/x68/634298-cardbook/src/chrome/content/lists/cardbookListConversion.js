if ("undefined" == typeof(cardbookListConversion)) {
	var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	function cardbookListConversion(aEmails, aIdentity) {
		this.emailResult = [];
		this.recursiveList = [];
		this._convert(aEmails, aIdentity);
	}
	
	cardbookListConversion.prototype = {
		_verifyRecursivity: function (aList) {
			for (var i = 0; i < this.recursiveList.length; i++) {
				if (this.recursiveList[i] == aList) {
					cardbookRepository.cardbookUtils.formatStringForOutput("errorInfiniteLoopRecursion", [this.recursiveList.toSource()], "Warning");
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
				listOfEmail = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([aCard], aOnlyEmail).join(", ");
				if (listOfEmail != "") {
					this.emailResult.push(listOfEmail);
				}
			}
		},
		
		_convert: function (aEmails, aIdentity) {
			var memberCustom = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.memberCustom");
			var useOnlyEmail = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			let addresses = MailServices.headerParser.parseEncodedHeader(aEmails);
			for (let address of addresses) {
				let fullAddress = MailServices.headerParser.makeMimeAddress(address.name, address.email);
				if (address.email.includes("@")) {
					if (useOnlyEmail) {
						// we are forced to collect here because after the display name is removed
						var resultEmailsCollections = [];
						resultEmailsCollections = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
						if (resultEmailsCollections && resultEmailsCollections.length != 0) {
							ovl_collected.addCollectedContact(aIdentity, resultEmailsCollections, address.name, address.email);
						}
						
						this.emailResult.push(address.email);
					} else {
						this.emailResult.push(MailServices.headerParser.makeMimeAddress(address.name, address.email));
					}
				// for Mail Merge compatibility
				} else if (fullAddress.includes("{{") && fullAddress.includes("}}")) {
					this.emailResult.push(fullAddress);
				} else {
					var found = false;
					for (j in cardbookRepository.cardbookCards) {
						var myCard = cardbookRepository.cardbookCards[j];
						if (myCard.isAList && myCard.fn == address.name) {
							found = true;
							this.recursiveList.push(address.name);
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
						this.emailResult.push(fullAddress);
					}
				}
			}
		}
	};
};
