if ("undefined" == typeof(ovl_lightningAttendees)) {
	var ovl_lightningAttendees = {
		onLoad: function() {
			cardBookLightningObserver.register();
			cardbookAutocomplete.setLightningCompletion();
			cardbookAutocomplete.loadCssRules();
			window.removeEventListener('load', arguments.callee, true);
		}
	}
};
window.addEventListener("load", function(e) { ovl_lightningAttendees.onLoad(e); }, false);
