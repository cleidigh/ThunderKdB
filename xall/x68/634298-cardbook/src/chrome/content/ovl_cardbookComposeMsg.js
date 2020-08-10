var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ConversionHelper } = ChromeUtils.import("chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

var ovl_cardbookComposeMsg = {
	LoadIdentity: function() {
		var outerID = GetCurrentEditorElement().outerWindowID;
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
		myMenuItem.setAttribute("label", ConversionHelper.i18n.getMessage("newCardBookCardMenuLabel"));
		myMenuItem.setAttribute("accesskey", ConversionHelper.i18n.getMessage("newCardBookCardMenuAccesskey"));
		myPopup.appendChild(myMenuItem);
	},

	loadMsg: function () {
		cardbookLocales.updateDocument();
		cardBookComposeMsgObserver.register();
		ovl_cardbookComposeMsg.setAB();
		cardbookAutocomplete.setMsgCompletion();
		cardbookAutocomplete.loadCssRules();
		window.document.removeEventListener('DOMOverlayLoaded_cardbook@vigneau.philippe', arguments.callee, true);
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

// translations
window.document.addEventListener("DOMOverlayLoaded_cardbook@vigneau.philippe", function(e) {
	ovl_cardbookComposeMsg.loadMsg();
}, false);
