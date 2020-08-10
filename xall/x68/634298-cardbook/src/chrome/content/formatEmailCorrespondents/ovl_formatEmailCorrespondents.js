if ("undefined" == typeof(ovl_formatEmailCorrespondents)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { DisplayNameUtils } = ChromeUtils.import("resource:///modules/DisplayNameUtils.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var ovl_formatEmailCorrespondents = {
		getIdentityForEmail: function(aEmail) {
			let emailAddress = aEmail.toLowerCase();
			for (let identity of fixIterator(MailServices.accounts.allIdentities, Components.interfaces.nsIMsgIdentity)) {
				if (!identity.email) {
					continue;
				}
				if (emailAddress == identity.email.toLowerCase()) {
					return identity;
				}
			}
			return null;
		},
		
		getCardBookDisplayNameFromEmail: function(aEmail, aDefaultDisplay) {
			var found = false;
			var myResult = "";
			if (aEmail) {
				var myTestString = aEmail.toLowerCase();
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[1] && account[5] && account[6] != "SEARCH") {
						var myDirPrefId = account[4];
						if (cardbookRepository.cardbookCardEmails[myDirPrefId]) {
							if (cardbookRepository.cardbookCardEmails[myDirPrefId][myTestString]) {
								myResult = cardbookRepository.cardbookCardEmails[myDirPrefId][myTestString][0].fn;
								found = true;
								break;
							}
						}
					}
				}
			}
			if (found) {
				if (myResult) {
					return {found: found, result: myResult};
				} else {
					return {found: found, result: aEmail};
				}
			} else {
				if (aDefaultDisplay) {
					return {found: found, result: aDefaultDisplay};
				} else {
					return {found: found, result: aEmail};
				}
			}
		},

		getDisplayNameColumn: function(aEmails, aContext) {
			var showCondensedAddresses = cardbookRepository.cardbookPreferences.getBoolPref("mail.showCondensedAddresses");
			var exclusive = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
			var results = [];
			let addresses = MailServices.headerParser.parseEncodedHeader(aEmails);
			for (let address of addresses) {
				var identity = ovl_formatEmailCorrespondents.getIdentityForEmail(address.email);
				if (identity) {
					results.push(identity.fullName);
				} else if (showCondensedAddresses) {
					var myCardBookResult = {};
					myCardBookResult = ovl_formatEmailCorrespondents.getCardBookDisplayNameFromEmail(address.email, address.name);
					if (exclusive) {
						results.push(myCardBookResult.result);
					} else {
						if (!myCardBookResult.found) {
							var card = DisplayNameUtils.getCardForEmail(address.email).card;
							if (card) {
								if (card.getProperty("PreferDisplayName", "1") == "1") {
									var displayName = card.displayName || null;
								}
							}
							if (displayName) {
								results.push(displayName);
							} else {
								if (address.name) {
									results.push(address.name);
								} else {
									results.push(address.email);
								}
							}
						} else {
							results.push(myCardBookResult.result);
						}
					}
				} else {
					if (address.name) {
						results.push(address.name);
					} else {
						results.push(address.email);
					}
				}
			}

			
			
			return results.join(", ");
		}
	};
};

function cardbookSenderHandler() {
};

cardbookSenderHandler.prototype = {
	getCellText: function(row, col) {
		//get the message's header so that we can extract the date field
		if (gDBView.isContainer(row) && gDBView.viewFlags & Components.interfaces.nsMsgViewFlagsType.kGroupBySort) {
			return "";
		} else {
			var hdr = gDBView.getMsgHdrAt(row);
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");
		}
	},
	getSortStringForRow: function(hdr) {return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");},
	isString:            function() {return true;},
	getCellProperties:   function(row, col, props){},
	getRowProperties:    function(row, props){},
	getImageSrc:         function(row, col) {return null;},
	getSortLongForRow:   function(hdr) {return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");}
};

function cardbookRecipientsHandler() {
};

cardbookRecipientsHandler.prototype = {
	getCellText: function(row, col) {
		//get the message's header so that we can extract the date field
		if (gDBView.isContainer(row) && gDBView.viewFlags & Components.interfaces.nsMsgViewFlagsType.kGroupBySort) {
			return "";
		} else {
			var hdr = gDBView.getMsgHdrAt(row);
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");
		}
	},
	getSortStringForRow: function(hdr) {return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");},
	isString:            function() {return true;},
	getCellProperties:   function(row, col, props){},
	getRowProperties:    function(row, props){},
	getImageSrc:         function(row, col) {return null;},
	getSortLongForRow:   function(hdr) {return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");}
};

function cardbookCorrespondentHandler() {
};

cardbookCorrespondentHandler.prototype = {
	getCellText: function(row, col) {
		//get the message's header so that we can extract the date field
		if (gDBView.isContainer(row) && gDBView.viewFlags & Components.interfaces.nsMsgViewFlagsType.kGroupBySort) {
			return "";
		} else {
			var hdr = gDBView.getMsgHdrAt(row);
			if (cardbookRepository.isOutgoingMail(hdr)) {
				return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");
			} else {
				return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");
			}
		}
	},
	getSortStringForRow: function(hdr) {
		var hdr = gDBView.getMsgHdrAt(row);
		if (cardbookRepository.isOutgoingMail(hdr)) {
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");
		} else {
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");
		}
	},
	isString:            function() {return true;},
	getCellProperties:   function(row, col, props){
		var hdr = gDBView.getMsgHdrAt(row);
		if (cardbookRepository.isOutgoingMail(hdr)) {
			return "outgoing";
		} else {
			return "incoming";
		}
	},
	getRowProperties:    function(row, props){},
	getImageSrc:         function(row, col) {return null;},
	getSortLongForRow:   function(hdr) {
		var hdr = gDBView.getMsgHdrAt(row);
		if (cardbookRepository.isOutgoingMail(hdr)) {
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");
		} else {
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");
		}
	}
};

window.document.addEventListener("DOMOverlayLoaded_cardbook@vigneau.philippe", function(e) {
	var myFormatObserver = {
		register: function() {
			Services.obs.addObserver(this, "MsgCreateDBView", false);
		},
		
		unregister: function() {
			Services.obs.removeObserver(this, "MsgCreateDBView");
		},
		
		observe: function(aSubject, aTopic, aData) {
			switch (aTopic) {
				case "MsgCreateDBView":
					if (gDBView) {
						gDBView.addColumnHandler("senderCol", new cardbookSenderHandler());
						gDBView.addColumnHandler("recipientCol", new cardbookRecipientsHandler());
						gDBView.addColumnHandler("correspondentCol", new cardbookCorrespondentHandler());
					}
					break;
			}
		}
	};
	
	myFormatObserver.register();
	
	window.document.removeEventListener('DOMOverlayLoaded_cardbook@vigneau.philippe', arguments.callee, true);
}, false);

// for displaying the undo and redo
// DisplayNameUtils.formatDisplayName
(function() {
	// for the standalone window, does not exist
	if ("undefined" != typeof(DisplayNameUtils.formatDisplayName)) {
		// Keep a reference to the original function.
		var _original = DisplayNameUtils.formatDisplayName;
		
		// Override a function.
		DisplayNameUtils.formatDisplayName = function() {
			
			var showCondensedAddresses = cardbookRepository.cardbookPreferences.getBoolPref("mail.showCondensedAddresses");
			var exclusive = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
			var identity = ovl_formatEmailCorrespondents.getIdentityForEmail(arguments[0]);
			if (identity) {
				return _original.apply(null, arguments);
			} else if (showCondensedAddresses) {
				var myCardBookResult = {};
				myCardBookResult = ovl_formatEmailCorrespondents.getCardBookDisplayNameFromEmail(arguments[0], arguments[1]);
				if (exclusive) {
					if (myCardBookResult.found) {
						return myCardBookResult.result;
					} else {
						return MailServices.headerParser.makeMailboxObject(arguments[1], arguments[0]).toString();
					}
				} else {
					if (!myCardBookResult.found) {
						return _original.apply(null, arguments);
					} else {
						return myCardBookResult.result;
					}
				}
			}
		};
	}
})();
