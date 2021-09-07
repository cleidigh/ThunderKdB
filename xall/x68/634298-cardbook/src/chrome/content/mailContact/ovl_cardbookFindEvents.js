if ("undefined" == typeof(ovl_cardbookFindEvents)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_cardbookFindEvents = {

		findEventsFromEmail: function(emailAddressNode) {
			var myEmailNode = emailAddressNode.closest("mail-emailaddress");
			var myEmail = myEmailNode.getAttribute('emailAddress');
			if (ovl_cardbookMailContacts) {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(myEmail, ovl_cardbookMailContacts.getIdentityKey());
			} else {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(myEmail);
			}
			if (isEmailRegistered) {
				var myCard = cardbookRepository.cardbookUtils.getCardFromEmail(myEmail);
				ovl_cardbookFindEvents.findEvents(null, [myEmail], myEmail, "mailto:" + myEmail, myCard.fn);
			} else {
				var myDisplayName = myEmailNode.getAttribute('displayName');
				ovl_cardbookFindEvents.findEvents(null, [myEmail], myEmail, "mailto:" + myEmail, myDisplayName);
			}
		},

		findAllEventsFromContact: function(emailAddressNode) {
			var myEmailNode = emailAddressNode.closest("mail-emailaddress");
			var myEmail = myEmailNode.getAttribute('emailAddress');
			if (ovl_cardbookMailContacts) {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(myEmail, ovl_cardbookMailContacts.getIdentityKey());
			} else {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(myEmail);
			}
	
			if (isEmailRegistered) {
				var myCard = cardbookRepository.cardbookUtils.getCardFromEmail(myEmail);
				ovl_cardbookFindEvents.findEvents([myCard], null, myCard.fn, "mailto:" + myEmail, myCard.fn);
			}
		},

		findEvents: function (aListOfSelectedCard, aListOfSelectedEmails, aDisplayName, aAttendeeId, aAttendeeName) {
			var listOfEmail = [];
			if (aListOfSelectedCard) {
				for (var i = 0; i < aListOfSelectedCard.length; i++) {
					if (!aListOfSelectedCard[i].isAList) {
						for (var j = 0; j < aListOfSelectedCard[i].email.length; j++) {
							listOfEmail.push(aListOfSelectedCard[i].email[j][0][0].toLowerCase());
						}
					} else {
						listOfEmail.push(aListOfSelectedCard[i].fn.replace('"', '\"'));
					}
				}
			} else if (aListOfSelectedEmails) {
				listOfEmail = JSON.parse(JSON.stringify(aListOfSelectedEmails));
			}
			var myArgs = {listOfEmail: listOfEmail, displayName: aDisplayName, attendeeId: aAttendeeId, attendeeName: aAttendeeName};
			var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/lightning/wdw_cardbookEventContacts.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
		}
	};
};
