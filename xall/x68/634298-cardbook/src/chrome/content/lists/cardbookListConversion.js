if ("undefined" == typeof(cardbookListConversion)) {
	var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	function cardbookListConversion(aEmails, aIdentity, aOnlyEmail) {
		this.emailResult = [];
		this.recursiveList = [];
		this._convert(aEmails, aIdentity, aOnlyEmail);
	}
	
	cardbookListConversion.prototype = {
		_verifyRecursivity: function (aListName) {
			if (this.recursiveList.includes(aListName)) {
				cardbookRepository.cardbookUtils.formatStringForOutput("errorInfiniteLoopRecursion", [this.recursiveList.toSource()], "Warning");
				return false;
			} else {
				this.recursiveList.push(aListName);
				return true;
			}
		},
		
		_getEmails: function (aCard, aIdentity, aOnlyEmail) {
			if (aCard.isAList) {
				let myList = aCard.fn;
				if (this._verifyRecursivity(myList)) {
					this._convert(MailServices.headerParser.makeMimeAddress(myList, myList), aIdentity, aOnlyEmail);
				}
			} else {
				let listOfEmail = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([aCard], aOnlyEmail);
				this.emailResult = this.emailResult.concat(listOfEmail);
			}
		},
		
		_convert: function (aEmails, aIdentity, aOnlyEmail) {
			let memberCustom = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.memberCustom");
			let useOnlyEmail = aOnlyEmail || cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			let addresses = MailServices.headerParser.parseEncodedHeaderW(aEmails);
			for (let address of addresses) {
				let fullAddress = MailServices.headerParser.makeMimeAddress(address.name, address.email);
				if (address.email.includes("@")) {
					if (useOnlyEmail) {
						this.emailResult.push(address.email);
					} else {
						this.emailResult.push(MailServices.headerParser.makeMimeAddress(address.name, address.email));
					}
				// for Mail Merge compatibility
				} else if (fullAddress.includes("{{") && fullAddress.includes("}}")) {
					this.emailResult.push(fullAddress);
				} else {
					let found = false;
					for (let j in cardbookRepository.cardbookCards) {
						let myCard = cardbookRepository.cardbookCards[j];
						if (myCard.isAList && myCard.fn == address.name) {
							found = true;
							if (!this.recursiveList.includes(address.name)) {
								this.recursiveList.push(address.name);
							}
							let myMembers = cardbookRepository.cardbookUtils.getMembersFromCard(myCard);
							for (let email of myMembers.mails) {
								this.emailResult.push(email.toLowerCase());
							}
							for (let card of myMembers.uids) {
								this._getEmails(card, aIdentity, useOnlyEmail);
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
