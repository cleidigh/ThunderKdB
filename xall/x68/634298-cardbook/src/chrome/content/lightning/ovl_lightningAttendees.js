if ("undefined" == typeof(ovl_lightningAttendees)) {
	var ovl_lightningAttendees = {
		onLoad: function() {
			var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
			cardBookLightningObserver.register();
			cardbookAutocomplete.setLightningCompletion();
			cardbookAutocomplete.loadCssRules();
			window.document.removeEventListener('DOMOverlayLoaded_cardbook@vigneau.philippe', arguments.callee, true);
		}
	}
};
window.document.addEventListener("DOMOverlayLoaded_cardbook@vigneau.philippe", function(e) { ovl_lightningAttendees.onLoad(e); }, false);
