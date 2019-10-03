var s3menuwizard = {};
s3menuwizard.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.s3menuwizard.");
s3menuwizard.from_settings = false;

//------------------------------------------------------------------------------
s3menuwizard.dialog_init = function() {
	window.innerHeight = window.document.documentElement.clientHeight;
	var params = (window.arguments && window.arguments[0]);
	if (params && params.from_settings) {
		s3menuwizard.from_settings = true;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.ondialogaccept = function() {
	s3menuwizard.advertisement_on();
}
//------------------------------------------------------------------------------
s3menuwizard.ondialogcancel = function(event) {
	window.close();
}
//------------------------------------------------------------------------------
s3menuwizard.ondialogcancel_button = function(event) {
	window.close();
}
//------------------------------------------------------------------------------
s3menuwizard.advertisement_on = function() {
	if (s3menuwizard.from_settings) {
		window.result = 'on';
	} else {
		s3menuwizard.prefs.setCharPref("advertisement", "on");
	}
	window.close();
}
//------------------------------------------------------------------------------
s3menuwizard.advertisement_off = function() {
	if (s3menuwizard.from_settings) {
		window.result = 'off';
	} else {
		s3menuwizard.prefs.setCharPref("advertisement", "off2");
	}
	window.close();
}
//------------------------------------------------------------------------------
