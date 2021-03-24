var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var ovl_cardbookComposeMsg = {
	GenericSendMessage: function() {
		if (gSendFormat == Components.interfaces.nsIMsgCompSendFormat.AskUser) {
			let myFields = gMsgCompose.compFields;
			let allHtml = true;
			let allPlain = true;
			for (let field of ["to", "cc", "bcc"]) {
				if (myFields[field] && (allHtml || allPlain)) {
					let addresses = MailServices.headerParser.parseEncodedHeaderW(myFields[field]);
					for (let address of addresses) {
						if (allHtml || allPlain) {
							let card = cardbookRepository.cardbookUtils.getCardFromEmail(address.email);
							let format = cardbookRepository.cardbookUtils.getMailFormatFromCard(card);
							if (format == 2) {
								allPlain = false;
							} else if (format == 1) {
								allHtml = false;
							} else {
								allPlain = false;
								allHtml = false;
							}
						}
					}
				}
			}
			if (allPlain) {
				gSendFormat = Components.interfaces.nsIMsgCompSendFormat.PlainText;
			}
			if (allHtml) {
				gSendFormat = Components.interfaces.nsIMsgCompSendFormat.HTML;
			}
		}
	},

	LoadIdentity: function() {
		var mailWindow = Services.wm.getMostRecentWindow("msgcompose");
		var outerID = mailWindow.windowUtils.outerWindowID;
		cardbookRepository.composeMsgIdentity[outerID] = document.getElementById("msgIdentity").selectedItem.getAttribute("identitykey");
	},

	newInCardBook: function() {
		try {
			var myNewCard = new cardbookCardParser();
			cardbookWindowUtils.openEditionWindow(myNewCard, "CreateContact");
		}
		catch (e) {
			var errorTitle = "newInCardBook";
			Services.prompt.alert(null, errorTitle, e);
		}
	},

	setAB: function() {
		document.getElementById("tasksMenuAddressBook").removeAttribute("key");
		document.getElementById("key_addressbook").setAttribute("key", "");
		var exclusive = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
		var myPopup = document.getElementById("menu_NewPopup");
		if (exclusive) {
			document.getElementById('tasksMenuAddressBook').setAttribute('hidden', 'true');
			// this menu has no id, so we have to do manually
			myPopup.lastChild.remove();
		} else {
			document.getElementById('tasksMenuAddressBook').removeAttribute('hidden');
		}

		var myMenuItem = document.createXULElement("menuitem");
		myMenuItem.setAttribute("id", "newCardBookCardFromMsgMenu");
		myMenuItem.addEventListener("command", function(aEvent) {
				ovl_cardbookComposeMsg.newInCardBook();
				aEvent.stopPropagation();
			}, false);
		myMenuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("newCardBookCardMenuLabel"));
		myMenuItem.setAttribute("accesskey", cardbookRepository.extension.localeData.localizeMessage("newCardBookCardMenuAccesskey"));
		myPopup.appendChild(myMenuItem);
	},

	unloadMsg: function () {
		cardBookComposeMsgObserver.unregister();
	},

	loadMsg: function () {
		cardBookComposeMsgObserver.register();
		ovl_cardbookComposeMsg.setAB();
		setTimeout(function() {
			cardbookAutocomplete.setMsgCompletion();
			}, 50);
		setTimeout(function() {
			cardbookAutocomplete.loadCssRules();
			}, 500);
	}

};

// LoadIdentity
(function() {
	// Keep a reference to the original function.
	var _original = LoadIdentity;

	// Override a function.
	LoadIdentity = function() {
		// Execute original function.
		var rv = _original.apply(null, arguments);

		// Execute some action afterwards.
		ovl_cardbookComposeMsg.LoadIdentity();

		// return the original result
		return rv;
	};
})();

// GenericSendMessage
(function() {
	// Keep a reference to the original function.
	var _original = GenericSendMessage;

	// Override a function.
	GenericSendMessage = function() {

		let myFields = gMsgCompose.compFields;
		if (myFields) {
			Recipients2CompFields(myFields);
			// for lists		
			expandRecipients();
			ovl_cardbookComposeMsg.GenericSendMessage();
		}
		var rv = _original.apply(null, arguments);
		return rv;
	};
})();

