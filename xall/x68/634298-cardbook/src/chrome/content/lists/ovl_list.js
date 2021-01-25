var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
var { MimeParser } = ChromeUtils.import("resource:///modules/mimeParser.jsm");

var ovl_list = {
	expandRecipientsFromCardBook: function () {
		var myFields = window.gMsgCompose.compFields;
		for (let field of ["to", "cc", "bcc"]) {
			if (myFields[field]) {
				if (myFields[field]) {
					var myConversion = new cardbookListConversion(myFields[field], window.gMsgCompose.identity.key);
					myFields[field] = cardbookRepository.arrayUnique(myConversion.emailResult).join(", ");
				}
			}
		}
	},

	doesListExist: function (aName) {
		for (let j in cardbookRepository.cardbookCards) {
			var myCard = cardbookRepository.cardbookCards[j];
			if (myCard.isAList && myCard.fn == aName) {
				return true;
			}
		}
		return false;
	},

	mailListNameExists: function () {
		gSendLocked = true;
		if (!gMsgCompose) {
			return;
		}
		const addressRows = [ "toAddrContainer", "ccAddrContainer", "bccAddrContainer", "newsgroupsAddrContainer" ];
		
		for (let parentID of addressRows) {
			if (!gSendLocked) {
				break;
			}
			let parent = document.getElementById(parentID);
			if (!parent) {
				continue;
			}
			for (let address of parent.querySelectorAll(".address-pill")) {
				let listNames = MimeParser.parseHeaderField(address.fullAddress, MimeParser.HEADER_ADDRESS);
				let isMailingList = listNames.length > 0 && ovl_list.doesListExist(listNames[0].name);
				if (!cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive") && !isMailingList) {
					isMailingList = listNames.length > 0 && MailServices.ab.mailListNameExists(listNames[0].name);
				}
				if (isValidAddress(address.emailAddress) || isMailingList || address.emailInput.classList.contains("news-input")) {
					gSendLocked = false;
					break;
				}
			}
		}
	}
};

// expandRecipients
(function() {
	// Keep a reference to the original function.
	var _original = expandRecipients;
	
	// Override a function.
	expandRecipients = function() {
		// Execute original function.
		var rv = _original.apply(null, arguments);
		
		// Execute some action afterwards.
		ovl_list.expandRecipientsFromCardBook();

		// return the original result
		return rv;
	};

})();

// updateSendLock
(function() {
	// Keep a reference to the original function.
	var _original = updateSendLock;
	
	// Override a function.
	updateSendLock = function() {
		// Execute original function.
		var rv = _original.apply(null, arguments);
		
		// Execute some action afterwards.
		ovl_list.mailListNameExists();
	};

})();
