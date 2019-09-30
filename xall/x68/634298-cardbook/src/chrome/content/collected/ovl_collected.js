if ("undefined" == typeof(ovl_collected)) {
	var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var ovl_collected = {
		
		addCollectedContact: function (aIdentity, aEmailsCollections, aDisplayName, aEmail) {
			cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : start of emails identitiy : " + aIdentity);
			cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : start of emails collection : " + aEmailsCollections.toSource());
			if (!aEmail) {
				return;
			} else if (aEmail.includes("{{") && aEmail.includes("}}")) {
				return;
			}
			if (aDisplayName) {
				if (aDisplayName.includes("{{") && aDisplayName.includes("}}")) {
					return;
				}
			}
			var myTopic = "outgoingEmailCollected";
			var myActionId = cardbookActions.startAction(myTopic);
			if (!cardbookRepository.isEmailRegistered(aEmail, aIdentity)) {
				for (var i = 0; i < aEmailsCollections.length; i++) {
					var dirPrefId = aEmailsCollections[i][2];
					if (!cardbookPreferences.getReadOnly(dirPrefId)) {
						if (aEmailsCollections[i][0] == "true") {
							if ((aIdentity == aEmailsCollections[i][1]) || ("allMailAccounts" == aEmailsCollections[i][1])) {
								var dirPrefIdName = cardbookPreferences.getName(dirPrefId);
								cardbookLog.updateStatusProgressInformationWithDebug2(dirPrefIdName + " : debug mode : trying to collect contact " + aDisplayName + " (" + aEmail + ")");
								cardbookUtils.addCardFromDisplayAndEmail(dirPrefId, aDisplayName, aEmail, aEmailsCollections[i][3], myActionId);
							}
						}
					}
				}
			} else {
				// if the contact is already registered, let's have a look if it's not possible to collect some informations
				if (cardbookRepository.isEmailRegistered(aEmail) && aDisplayName) {
					var myCard = cardbookUtils.getCardFromEmail(aEmail);
					if (myCard.fn.toLowerCase() == aEmail.toLowerCase() && aDisplayName.toLowerCase() != aEmail.toLowerCase()) {
						var myNewCard = new cardbookCardParser();
						cardbookUtils.cloneCard(myCard, myNewCard);
						myNewCard.fn = aDisplayName;
						cardbookRepository.saveCard(myCard, myNewCard, myActionId, true);
					}
				}
			}
			cardbookActions.endAction(myActionId);
		},
	
		collectToCardBook: function () {
			var resultEmailsCollections = [];
			resultEmailsCollections = cardbookPreferences.getAllEmailsCollections();
			if (resultEmailsCollections && resultEmailsCollections.length != 0) {
				var myFields = gMsgCompose.compFields;
				var listToCollect = ["to", "cc", "bcc", "followupTo"];
				for (var i = 0; i < listToCollect.length; i++) {
					if (myFields[listToCollect[i]]) {
						if (myFields[listToCollect[i]]) {
							var addresses = {}, names = {}, fullAddresses = {};
							MailServices.headerParser.parseHeadersWithArray(myFields[listToCollect[i]], addresses, names, fullAddresses);
							for (var j = 0; j < addresses.value.length; j++) {
								ovl_collected.addCollectedContact(gMsgCompose.identity.key, resultEmailsCollections, names.value[j], addresses.value[j]);
								cardbookMailPopularity.updateMailPopularity(addresses.value[j]);
							}
						}
					}
				}
			} else {
				var myFields = gMsgCompose.compFields;
				var listToCollect = ["to", "cc", "bcc", "followupTo"];
				for (var i = 0; i < listToCollect.length; i++) {
					if (myFields[listToCollect[i]]) {
						if (myFields[listToCollect[i]]) {
							var addresses = {}, names = {}, fullAddresses = {};
							MailServices.headerParser.parseHeadersWithArray(myFields[listToCollect[i]], addresses, names, fullAddresses);
							for (var j = 0; j < addresses.value.length; j++) {
								cardbookMailPopularity.updateMailPopularity(addresses.value[j]);
							}
						}
					}
				}
			}
		}
	};
};
// collect emails
window.addEventListener("compose-send-message", function(e) { ovl_collected.collectToCardBook(e); }, true);
