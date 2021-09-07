var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
var { MimeParser } = ChromeUtils.import("resource:///modules/mimeParser.jsm");

var ovl_list = {
	expandRecipientsFromCardBook: function () {
		let myFields = window.gMsgCompose.compFields;
		for (let field of ["to", "cc", "bcc"]) {
			if (myFields[field]) {
				let myConversion = new cardbookListConversion(myFields[field], window.gMsgCompose.identity.key);
				myFields[field] = cardbookRepository.arrayUnique(myConversion.emailResult).join(", ");
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
			// loop through all pills to update all the pill.classlist
			// if (!gSendLocked) {
			// 	break;
			// }
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
					address.classList.toggle("error", false);
					gSendLocked = false;
					// break;
				}
			}
		}
	},

	isInAddressBook: async function () {
		const addressRows = [ "toAddrContainer", "ccAddrContainer", "bccAddrContainer", "newsgroupsAddrContainer" ];
		for (let parentID of addressRows) {
			let parent = document.getElementById(parentID);
			if (!parent) {
				continue;
			}
			for (let address of parent.querySelectorAll(".address-pill")) {
				let isEmailRegistered = cardbookRepository.isEmailRegistered(address.emailAddress);
				if (isEmailRegistered) {
					address.removeAttribute("tooltiptext");
					address.pillIndicator.hidden = true;
				} else if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
					address.setAttribute(
						"tooltiptext",
						await document.l10n.formatValue("pill-tooltip-not-in-address-book", {
							email: address.fullAddress,
						})
						);
					address.pillIndicator.hidden = false;
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

// calculateHeaderHeight
(function() {
	// Keep a reference to the original function.
	var _original = calculateHeaderHeight;
	
	// Override a function.
	calculateHeaderHeight = function() {
		// Execute original function.
		var rv = _original.apply(null, arguments);
		
		// Execute some action afterwards.
		// the function customElements.get("mail-address-pill").prototype.updatePillStatus is async
		// with no way to update it
		if ("undefined" == typeof(setTimeout)) {
			var { setTimeout } = ChromeUtils.import("resource://gre/modules/Timer.jsm");
		}
		setTimeout(function() {
			ovl_list.isInAddressBook();
			}, 500);
	

	};

})();
