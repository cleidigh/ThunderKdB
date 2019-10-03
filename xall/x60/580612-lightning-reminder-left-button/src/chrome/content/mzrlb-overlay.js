"use strict";

var miczLightningReminderLeftButtons = {

	onLoad:function(){
		window.removeEventListener("load", miczLightningReminderLeftButtons.onLoad, false);
	    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		prefs = prefs.getBranch("extensions.LightningReminderLeftButtons.");
		let SwapButtons = prefs.getBoolPref("SwapButtons");

		if(!SwapButtons){
			document.getElementById("alarm-actionbar").align="left";
		}else{
			let mzlrlb_element=document.getElementById("alarm-snooze-all-button");
			document.getElementById("alarm-actionbar").removeChild(document.getElementById("alarm-snooze-all-button"));
			document.getElementById("alarm-actionbar").appendChild(mzlrlb_element);
		}
	}

};

window.addEventListener("load", miczLightningReminderLeftButtons.onLoad, false);
