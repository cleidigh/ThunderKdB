// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookObserverRepository.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookLightningObserver.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/autocomplete/cardbookAutocompleteSearch.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/autocomplete/cardbookAutocomplete.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/lightning/ovl_lightningAttendees.js", window, "UTF-8");

function onUnload(wasAlreadyOpen) {
	window.ovl_lightningAttendees.unloadAttendees();
};

function onLoad(wasAlreadyOpen) {
	WL.injectCSS("chrome://cardbook/content/skin/cardbookAutocomplete.css");
	window.ovl_lightningAttendees.loadAttendees();
};
