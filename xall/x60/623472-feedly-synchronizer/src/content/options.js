// Feedly Synchronizer AddOn for Mozilla Thunderbird
// Developed by Antonio Miras Aróstegui
// Published under Mozilla Public License, version 2.0 (https://www.mozilla.org/MPL/2.0/)

Components.utils.import("resource:///modules/mailServices.js");
Components.utils.import("resource:///modules/iteratorUtils.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

let addonId = "FeedlySync@AMArostegui";
let loadedModules = false;
let instantApply = null;
let services = null;
let selectedName = null;
let selectedKey = null;

function include(src, uriSpec) {
	let uri = services.Services.io.newURI(src, null, services.Services.io.newURI(uriSpec, null, null));
	services.Services.scriptloader.loadSubScript(uri.spec, this);
}

function loadModules(addon) {
	services = {};
	Components.utils.import("resource://gre/modules/Services.jsm", services);

	// As __SCRIPT_URI_SPEC__ is not available within this scope, it needs to be calculated.
	// addon.getResourceURI() won't give the right URI when the addon is packed on a XPI
	// so I rely on the URI of the ICON file. I can't think of a better way to do this.
	let index = addon.iconURL.lastIndexOf("/");
	let resourceUri = addon.iconURL.substring(0, index + 1);
	let addonUriSpec = resourceUri + "bootstrap.js";

	include("src/fsprefs.js", addonUriSpec);
	include("packages/prefs.js", addonUriSpec);
	include("src/utils.js", addonUriSpec);
	include("packages/l10n.js", addonUriSpec);

	let uriResolver = {
		getResourceURI: function(filePath) {
			return addonUriSpec + "/../" + filePath;
		}
	};
	l10n(uriResolver, "FeedlySync.properties");

	loadedModules = true;
	onLoadAccounts();
}

function onLoadAccounts(onNewAccount) {
	if (!loadedModules) {
		AddonManager.getAddonByID(addonId, loadModules);
		return;
	}
	if (instantApply === null)
		instantApply = services.Services.prefs.getBoolPref("browser.preferences.instantApply");

	// Remove all elements from combobox
	log.writeLn("Options.onLoadAccounts");
	let popup = document.getElementById("accountPopup");
	if (popup === null)
		return;
	while (popup.firstChild)
	    popup.removeChild(popup.firstChild);

	let prefAccount = getPref("synch.account");

	// Get all RSS accounts
	let accounts = [];
	let sel = -1;
	for (var account of fixIterator(MailServices.accounts.accounts,
			Components.interfaces.nsIMsgAccount)) {
		let server = account.incomingServer;
		if (server) {
			if ("rss" == server.type) {
				accounts.push(account);
				if (prefAccount == account.key)
					sel = accounts.length - 1;
			}
		}
	}

	// No RSS accounts or nothing selected yet. Insert dummy node
	if (sel === -1) {
		let menuItem = document.createElement("menuitem");
		menuItem.setAttribute("label", _("syncAccountNone", retrieveLocale()));
		menuItem.setAttribute("value", "");
		menuItem.setAttribute("oncommand", "onSelected('', '')");
		popup.appendChild(menuItem);
		log.writeLn("Options.onLoadAccounts. No RSS accounts or nothing selected yet. Insert dummy node");
	}

	// Populate combobox
	for (let i = 0; i < accounts.length; i++) {
		let server = accounts[i].incomingServer;
		let menuItem = document.createElement("menuitem");
		menuItem.setAttribute("label", server.prettyName);
		menuItem.setAttribute("value", accounts[i].key);
		menuItem.setAttribute("oncommand", "onSelected('" + server.prettyName + "', '" + accounts[i].key + "')");
		popup.appendChild(menuItem);
	}

	// Default server if nothing selected
	if (sel === -1) {
		// New button clicked. New account is supposed to be selected
		if (onNewAccount != null) {
			sel = accounts.length;
			let prettyName = accounts[accounts.length - 1].incomingServer.prettyName;
			let key = accounts[accounts.length - 1].key;
			onSelected(prettyName, key);
			log.writeLn("Options.onLoadAccounts. Newly created account selected");
		}
		else
			sel = 0;
	}

	log.writeLn("Options.onLoadAccounts. Selected Folder = " + sel + " Folder Count = " + accounts.length);

	let list = document.getElementById("accountList");
	if (list === null)
		return;
	list.selectedIndex = sel;
}

function writeAccount(account) {
	let oldKey = getPref("synch.account");
	if (oldKey !== account)
		setPref("synch.account", account);
}

function onSelected(selPrettyName, selKey) {
	log.writeLn("Options.onSelected. Selected = " + selPrettyName + " (" + selKey + ") " + "InstantApply = " + instantApply);
	if (instantApply)
		writeAccount(selKey);
	else {
		selectedName = selPrettyName;
		selectedKey = selKey;
	}
}

function onNewAccount() {
	log.writeLn("Options.onNewAccount");
	window.openDialog("chrome://messenger-newsblog/content/feedAccountWizard.xul",
			"", "chrome,modal,titlebar,centerscreen");
	onLoadAccounts(true);
}

function onDialogAccept() {
	if (!instantApply) {
		log.writeLn("Options.onDialogAccept. Selected = " + selectedName + " Key = " + selectedKey);
		if (selectedKey !== null)
			writeAccount(selectedKey);
	}
}

function onUnload() {
	l10n.unload();
}