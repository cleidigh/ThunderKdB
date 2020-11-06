if ("undefined" == typeof(ovl_cardbookMailContacts)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var ovl_cardbookMailContacts = {
		knownContacts: false,

		getIdentityKey: function() {
			var result = "";
			if (gFolderDisplay && gFolderDisplay.selectedCount == 1) {
				var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
				if (gFolderDisplay && gFolderDisplay.selectedMessage && gFolderDisplay.selectedMessage.folder && gFolderDisplay.selectedMessage.folder.server) {
					var identity = accountManager.getFirstIdentityForServer(gFolderDisplay.selectedMessage.folder.server);
					if (identity) {
						result = identity.key;
					}
				}
			}
			return result;
		},

		refreshBlueStars: function() {
			var nodes = document.querySelectorAll("mail-emailaddress");
			for (let node of nodes) {
				if (node.getAttribute('emailAddress')) {
					UpdateEmailNodeDetails(node.getAttribute('emailAddress'), node);
				}
			}
		},
		
		addToCardBookMenuSubMenu: function(aMenuName, aCallbackFunction) {
			cardbookWindowUtils.addToCardBookMenuSubMenu(aMenuName, ovl_cardbookMailContacts.getIdentityKey(), aCallbackFunction);
		},

		isEmailRegistered: function(aEmail) {
			return cardbookRepository.isEmailRegistered(aEmail, ovl_cardbookMailContacts.getIdentityKey());
		},

		addToCardBook: function(aDirPrefId, aEmailNode) {
			try {
				var myNewCard = new cardbookCardParser();
				myNewCard.dirPrefId = aDirPrefId;
				if (aEmailNode) {
					var myEmailNode = aEmailNode;
				} else {
					var myEmailNode = document.popupNode.closest("mail-emailaddress");
				}
				var myEmail = myEmailNode.getAttribute('emailAddress');
				myNewCard.email.push([[myEmail], [], "", []]);
				myNewCard.fn = myEmailNode.getAttribute('displayName');
				if (myNewCard.fn == "") {
					myNewCard.fn = myEmail.substr(0, myEmail.indexOf("@")).replace("."," ").replace("_"," ");
				}
				var myDisplayNameArray = myNewCard.fn.split(" ");
				if (myDisplayNameArray.length > 1) {
					myNewCard.lastname = myDisplayNameArray[myDisplayNameArray.length - 1];
					var removed = myDisplayNameArray.splice(myDisplayNameArray.length - 1, 1);
					myNewCard.firstname = myDisplayNameArray.join(" ");
				}
				cardbookWindowUtils.openEditionWindow(myNewCard, "AddEmail");
			}
			catch (e) {
				var errorTitle = "addToCardBook";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		mailContextAddToCardBook: function(aDirPrefId) {
			try {
				var myNewCard = new cardbookCardParser();
				myNewCard.dirPrefId = aDirPrefId;
				var url = gContextMenu.linkURL;
				var myEmail = getEmail(url);
				myNewCard.email.push([[myEmail], [], "", []]);
				cardbookWindowUtils.openEditionWindow(myNewCard, "AddEmail");
			}
			catch (e) {
				var errorTitle = "mailContextAddToCardBook";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		editOrViewContact: function(aEmailNode) {
			if (aEmailNode) {
				var myEmailNode = aEmailNode;
			} else {
				var myEmailNode = document.popupNode.closest("mail-emailaddress");
			}
			var myEmail = myEmailNode.getAttribute('emailAddress');
			var isEmailRegistered = ovl_cardbookMailContacts.isEmailRegistered(myEmail);
	
			if (isEmailRegistered) {
				var myCard = cardbookRepository.cardbookUtils.getCardFromEmail(myEmail);
				var myOutCard = new cardbookCardParser();
				cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
				if (myOutCard.isAList) {
					var myType = "List";
				} else {
					var myType = "Contact";
				}
				if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					cardbookWindowUtils.openEditionWindow(myOutCard, "View" + myType);
				} else {
					cardbookWindowUtils.openEditionWindow(myOutCard, "Edit" + myType);
				}
			}
		},

		deleteContact: function() {
			var myEmailNode = document.popupNode.closest("mail-emailaddress");
			var myEmail = myEmailNode.getAttribute('emailAddress');
			var isEmailRegistered = ovl_cardbookMailContacts.isEmailRegistered(myEmail);
	
			if (isEmailRegistered) {
				var myCard = cardbookRepository.cardbookUtils.getCardFromEmail(myEmail);
				wdw_cardbook.deleteCardsAndValidate([myCard]);
			}
		},

		hideOldAddressbook: function (aExclusive) {
			if (aExclusive) {
				document.getElementById("addToAddressBookItem").setAttribute("hidden", true);
				document.getElementById("editContactItem").setAttribute("hidden", true);
				document.getElementById("viewContactItem").setAttribute("hidden", true);
				document.getElementById("editCardBookSeparator").setAttribute("hidden", true);
			} else {
				document.getElementById("editCardBookSeparator").setAttribute("hidden", false);
			}
		},
		
		hideOrShowLightningEntries: function () {
			document.getElementById("findEventsFromEmailMessenger").removeAttribute('hidden');
			if (ovl_cardbookMailContacts.knownContacts) {
				document.getElementById("findAllEventsFromContactMessenger").removeAttribute('hidden');
			}
		},
		
		hideOrShowNewAddressbook: function (aValue) {
			ovl_cardbookMailContacts.knownContacts = aValue;
			if (aValue) {
				document.getElementById("addToCardBookMenu").setAttribute("hidden", true);
				document.getElementById("editInCardBookMenu").removeAttribute('hidden');
				document.getElementById("deleteInCardBookMenu").removeAttribute('hidden');
				document.getElementById("findAllEmailsFromContactMessenger").removeAttribute('hidden');
			} else {
				var count = 0;
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[1] && account[5] && (account[6] != "SEARCH") && !account[7]) {
						count++;
					}
				}
				if (count !== 0) {
					document.getElementById("addToCardBookMenu").removeAttribute('hidden');
				} else {
					document.getElementById("addToCardBookMenu").setAttribute("hidden", true);
				}
				document.getElementById("editInCardBookMenu").setAttribute("hidden", true);
				document.getElementById("deleteInCardBookMenu").setAttribute("hidden", true);
				document.getElementById("findAllEmailsFromContactMessenger").setAttribute("hidden", true);
			}

			document.getElementById("findEventsFromEmailMessenger").setAttribute("hidden", true);
			document.getElementById("findAllEventsFromContactMessenger").setAttribute("hidden", true);
			ovl_cardbookMailContacts.hideOrShowLightningEntries();
		}
	};
};

// for the contact menu popup
// setupEmailAddressPopup
(function() {
	// Keep a reference to the original function.
	var _original = setupEmailAddressPopup;
	
	// Override a function.
	setupEmailAddressPopup = function() {

		// Execute original function.
		var rv = _original.apply(null, arguments);
		
		// Execute some action afterwards.
		var exclusive = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
		ovl_cardbookMailContacts.hideOldAddressbook(exclusive);

		var myEmailNode = arguments[0].closest("mail-emailaddress");
		var myEmail = myEmailNode.getAttribute('emailAddress');
		var isEmailRegistered = ovl_cardbookMailContacts.isEmailRegistered(myEmail);
		ovl_cardbookMailContacts.hideOrShowNewAddressbook(isEmailRegistered);

		if (isEmailRegistered) {
			var myCard = cardbookRepository.cardbookUtils.getCardFromEmail(myEmail);
			document.getElementById("editInCardBookMenu").setAttribute("cardbookId", myCard.dirPrefId+"::"+myCard.uid);
			if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
				document.getElementById('editInCardBookMenu').label=cardbookRepository.extension.localeData.localizeMessage("viewInCardBookMenuLabel");
			} else {
				document.getElementById('editInCardBookMenu').label=cardbookRepository.extension.localeData.localizeMessage("editInCardBookMenuLabel");
			}
			
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(myCard, 'IMPPCardsMenuPopup');
		} else {
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(null, 'IMPPCardsMenuPopup');
		}
		var emailAddressPlaceHolder = document.getElementById("emailAddressPlaceHolder");
		emailAddressPlaceHolder.setAttribute("label", MailServices.headerParser.makeMimeAddress(myEmailNode.getAttribute("displayName"), myEmailNode.getAttribute('emailAddress')));

		if (document.documentElement.getAttribute("windowtype") == "mail:messageWindow") {
			document.getElementById('findEmailsFromEmailMessenger').setAttribute('hidden', 'true');
			document.getElementById('findAllEmailsFromContactMessenger').setAttribute('hidden', 'true');
			document.getElementById('findEventsFromEmailMessenger').setAttribute('hidden', 'true');
			document.getElementById('findAllEventsFromContactMessenger').setAttribute('hidden', 'true');
			document.getElementById('findCardBookSeparator2').setAttribute('hidden', 'true');
		} else {
			document.getElementById('findEmailsFromEmailMessenger').removeAttribute('hidden');
			document.getElementById('findAllEmailsFromContactMessenger').removeAttribute('hidden');
			document.getElementById('findEventsFromEmailMessenger').removeAttribute('hidden');
			document.getElementById('findAllEventsFromContactMessenger').removeAttribute('hidden');
			document.getElementById('findCardBookSeparator2').removeAttribute('hidden');
		}
		
		// return the original result
		return rv;
	};

})();

// for the yellow star
// UpdateEmailNodeDetails
(function() {
	// Keep a reference to the original function.
	var _original = UpdateEmailNodeDetails;

	// Override a function.
	UpdateEmailNodeDetails = function() {

		// one case where the standard function did not work
		var rv = "";
		try {
			rv = _original.apply(null, arguments);
		} catch (e) {}

		// Execute some action afterwards.
		var exclusive = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
		var showCondensedAddresses = cardbookRepository.cardbookPreferences.getBoolPref("mail.showCondensedAddresses");
		var myEmailAddress = arguments[1].getAttribute("emailAddress");
		var isEmailRegistered = ovl_cardbookMailContacts.isEmailRegistered(myEmailAddress);
		if (showCondensedAddresses) {
			if (exclusive) {
				arguments[1].setAttribute("hascard", isEmailRegistered.toString());
			} else if (isEmailRegistered) {
				arguments[1].setAttribute("hascard",isEmailRegistered.toString());
			}
		} else {
			if (exclusive) {
				arguments[1].setAttribute("hascard", isEmailRegistered.toString());
			} else if (isEmailRegistered) {
				arguments[1].setAttribute("hascard", isEmailRegistered.toString());
			}
		}
		return rv;
	};

})();

// nothing happens when click the yellow star
// 	
(function() {
	// Keep a reference to the original function.
	var _original = onClickEmailStar;
	
	// Override a function.
	onClickEmailStar = function() {
		
		if (arguments[1].getAttribute("hascard") == "true") {
			if (ovl_cardbookMailContacts.isEmailRegistered(arguments[1].getAttribute('emailAddress'))) {
				ovl_cardbookMailContacts.editOrViewContact(arguments[1]);
			} else {
				var rv = _original.apply(null, arguments);
			}
		} else {
			var myAccount = cardbookRepository.cardbookUtils.getFirstAvailableAccount();
			if (myAccount != "-1") {
				ovl_cardbookMailContacts.addToCardBook(myAccount, arguments[1]);
			} else {
				var rv = _original.apply(null, arguments);
			}
		}
	};

})();

// for adding a contact from an email address
// fillMailContextMenu
(function() {
	// Keep a reference to the original function.
	var _original = fillMailContextMenu;

	// Override a function.
	fillMailContextMenu = function() {

		var rv = _original.apply(null, arguments);

		// Execute some action afterwards.
		if (gContextMenu) {
			gContextMenu.showItem("mailContext-addToCardBookMenu", gContextMenu.onMailtoLink && !gContextMenu.inThreadPane);
			if (gContextMenu.onMailtoLink && !gContextMenu.inThreadPane) {
				if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
					gContextMenu.showItem("mailContext-addemail", false);
				}
			}
		}
		
		return rv;
	};

})();
