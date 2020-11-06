var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

var ovl_lightningAttendees = {
	unloadAttendees: function () {
		cardBookLightningObserver.unregister();
	},

	loadAttendees: function () {
		cardBookLightningObserver.register();
		setTimeout(function() {
			cardbookAutocomplete.setLightningCompletion();
			}, 50);
		setTimeout(function() {
			cardbookAutocomplete.loadCssRules();
			}, 500);
	}

};