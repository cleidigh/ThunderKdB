if ("undefined" == typeof(cardbookCollection)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var EXPORTED_SYMBOLS = ["cardbookCollection"];
	var cardbookCollection = {
		
		addCollectedContact: async function (aIdentity, aAddresses) {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : start of emails identity : " + aIdentity);
			let resultEmailsCollections = [];
			resultEmailsCollections = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : start of emails collection : " + resultEmailsCollections.toSource());
			if (resultEmailsCollections.length == 0) {
				return;
			}
			let myTopic = "outgoingEmailCollected";
			let myActionId = cardbookActions.startAction(myTopic);
			let addresses = MailServices.headerParser.parseEncodedHeaderW(aAddresses);
			for (let address of addresses) {
				if (!address.email) {
					return;
				} else if (address.email.includes("{{") && address.email.includes("}}")) {
					return;
				}
				if (address.displayName) {
					if (address.displayName.includes("{{") && address.displayName.includes("}}")) {
						return;
					}
				}
				 if (!cardbookRepository.isEmailRegistered(address.email)) {
					for (let i = 0; i < resultEmailsCollections.length; i++) {
						let dirPrefId = resultEmailsCollections[i][2];
						// check for the address book
						let account = cardbookRepository.cardbookAccounts.filter(child => dirPrefId == child[4]);
						if (account.length == 0) {
							cardbookRepository.cardbookLog.updateStatusProgressInformation("Email collection : wrong dirPrefId : " + dirPrefId, "Error");
							continue;
						}
						if (!cardbookRepository.cardbookPreferences.getReadOnly(dirPrefId)) {
							if (resultEmailsCollections[i][0] == "true") {
								if ((aIdentity == resultEmailsCollections[i][1]) || ("allMailAccounts" == resultEmailsCollections[i][1])) {
									let dirPrefIdName = cardbookRepository.cardbookPreferences.getName(dirPrefId);
									cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(dirPrefIdName + " : debug mode : trying to collect contact " + address.displayName + " (" + address.email + ")");
									await cardbookRepository.cardbookUtils.addCardFromDisplayAndEmail(dirPrefId, address.displayName, address.email, resultEmailsCollections[i][3], myActionId);
								}
							}
						}
					}
				} else {
					// if the contact is already registered, let's have a look if it's not possible to collect some informations
					if (cardbookRepository.isEmailRegistered(address.email) && address.displayName) {
						let myCard = cardbookRepository.cardbookUtils.getCardFromEmail(address.email);
						if (myCard.fn.toLowerCase() == address.email.toLowerCase() && address.displayName.toLowerCase() != address.email.toLowerCase()) {
							let myNewCard = new cardbookCardParser();
							cardbookRepository.cardbookUtils.cloneCard(myCard, myNewCard);
							myNewCard.fn = address.displayName;
							await cardbookRepository.saveCardFromUpdate(myCard, myNewCard, myActionId, true);
						}
					}
				}
			}
			await cardbookActions.endAction(myActionId);
		}
	};
};
