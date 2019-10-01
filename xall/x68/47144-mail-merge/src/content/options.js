"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

window.addEventListener("dialogaccept", function(event) { mailmerge.accept(event); });
window.addEventListener("dialogcancel", function(event) { mailmerge.cancel(event); });
window.addEventListener("dialoghelp", function(event) { mailmerge.help(event); });

var mailmerge = {
	
	load: function() {
		
		mailmerge.init();
		
	},
	
	unload: function() {
		
	},
	
	init: function() {
		
		var prefs = Services.prefs.getBranch("extensions.mailmerge.");
		
		document.getElementById("mailmerge-options-debug").checked = prefs.getBoolPref("debug");
		document.getElementById("mailmerge-options-recipientsreminder").checked = prefs.getBoolPref("recipientsreminder");
		document.getElementById("mailmerge-options-variablesreminder").checked = prefs.getBoolPref("variablesreminder");
		
	},
	
	accept: function(event) {
		
		var prefs = Services.prefs.getBranch("extensions.mailmerge.");
		
		prefs.setBoolPref("debug", document.getElementById("mailmerge-options-debug").checked);
		prefs.setBoolPref("recipientsreminder", document.getElementById("mailmerge-options-recipientsreminder").checked);
		prefs.setBoolPref("variablesreminder", document.getElementById("mailmerge-options-variablesreminder").checked);
		
	},
	
	cancel: function(event) {
		
	},
	
	help: function(event) {
		
		window.openDialog("chrome://mailmerge/content/about.xul", "_blank", "chrome,dialog,modal,centerscreen", null);
		
	},
	
	reset: function() {
		
		var prefs = Services.prefs.getBranch("extensions.mailmerge.");
		
		prefs.clearUserPref("debug");
		prefs.clearUserPref("recipientsreminder");
		prefs.clearUserPref("variablesreminder");
		
		mailmerge.init();
		
	}
	
}
