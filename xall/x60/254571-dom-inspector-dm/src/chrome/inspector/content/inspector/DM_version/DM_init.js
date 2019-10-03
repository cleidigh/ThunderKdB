
function DM_init() {
	
	if( !Services.prefs.prefHasUserValue( "inspector.dom.showAnon" ) ){
		// pref("inspector.blink.border-color", "#CC0000");  etc ...
		// pref("inspector.dom.showAnon", true); 
	
		Services.prefs.setCharPref("inspector.blink.border-color", "#CC0000");
		Services.prefs.setIntPref( "inspector.blink.border-width", 2);
		Services.prefs.setIntPref( "inspector.blink.duration", 1200);
		Services.prefs.setBoolPref("inspector.blink.on", true);
		Services.prefs.setIntPref( "inspector.blink.speed", 100);
		Services.prefs.setBoolPref("inspector.blink.invert", false);
		Services.prefs.setBoolPref("inspector.dom.showAnon", true );
		Services.prefs.setBoolPref("inspector.dom.showWhitespaceNodes", true);
		Services.prefs.setBoolPref("inspector.dom.showAccessibleNodes", true);
		Services.prefs.setBoolPref("inspector.dom.showProcessingInstructions", true); 
	}

};

