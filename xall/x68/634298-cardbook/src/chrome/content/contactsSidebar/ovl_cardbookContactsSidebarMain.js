// toggleAddressPicker
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

(function() {
	// Keep a reference to the original function.
	var _original = toggleAddressPicker;
	
	// Override a function.
	toggleAddressPicker = function() {
		// Execute original function.
		var rv = _original.apply(null, arguments);
		
		// Execute some action afterwards.
		if (cardbookPreferences.getBoolPref("extensions.cardbook.autocompletion")) {
			var sidebar = document.getElementById("sidebar");
			sidebar.setAttribute("src", "chrome://cardbook/content/contactsSidebar/wdw_cardbookContactsSidebar.xul");
		}
		
		// return the original result
		return rv;
	};

})();
