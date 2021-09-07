var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

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