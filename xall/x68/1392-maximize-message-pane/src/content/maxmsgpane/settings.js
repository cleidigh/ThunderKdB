var gMMPSettings = null;
function initMMPSettings()
{
	gMMPSettings = new MMPSettings();
}
//window.addEventListener("load", initMMPSettings, false);
window.addEventListener("dialogaccept", function(event) {
	var ret = gMMPSettings.savePrefs();
	if (!ret) {
		event.preventDefault();
	}
});

window.addEventListener("dialogcancel", function(event) {
	var ret = gMMPSettings.cancelPrefs(event);
	if (!ret) {
		event.preventDefault();
	}
});

function MMPSettings()
{
	this.acceptKeyChange = null; //id of button that accepts input
	this.localeBundle = document.getElementById("localeBundle");
	this.closeDlg = true;
	this.elemIDsMP = [
		"MMPCollapseFolder",
		"MMPCollapseHeader",
		"MMPCollapseAttach",
		"MMPCollapseLtnToday",
		"MMPCollapseOther",
		"MMPToggleByMsgDClick",
		"MMPUseShortcut",
		"MMPToggleByHdr",
		"HdrMouseEvent",
		"MMPHdrMouseButton",
		"MMPToggleByTSplitter",
		"TSMouseEvent",
		"MMPRestoreByFolSelChange",
		//"MMPMaxWoSel",
		"TSActionList"
	];
	
	this.elemIDsFP = [
		"MMPToggleByFSplitter",
		"FSMouseEvent",
		"MMPUseFPShortcut"
		//"MMPShowFPClsButton"
	];
	
	this.elemIDsSKey = [
		"shortcut_key",
		"shortcut-modifier-accel",
		"shortcut-modifier-alt",
		"shortcut-modifier-ctrl",
		"shortcut-modifier-meta",
		"shortcut-modifier-shift",
		"fp_shortcut_key",
		"fp-shortcut-modifier-accel",
		"fp-shortcut-modifier-alt",
		"fp-shortcut-modifier-ctrl",
		"fp-shortcut-modifier-meta",
		"fp-shortcut-modifier-shift"
	];

	this.elemIDsMisc = [
		"MMPAutoRestart",
		"MMPWarnRestart"
	];
	
	this.elementIDs = [];
	this.elementIDs = this.elementIDs.concat(this.elemIDsMP,
																					 this.elemIDsFP,
																					 this.elemIDsSKey,
																					 this.elemIDsMisc);
	this.onLoad();
}

MMPSettings.prototype.needRestart = function(ids)
{
	if (ids.length == 0) return false;
	for (var i=0; i<ids.length; i++) {
		var restart = document.getElementById(ids[i]).getAttribute("restart");
		if (restart == "true") return true;
	}

	return false;
}

MMPSettings.prototype.savePrefs = function()
{
	if (!this.closeDlg){
		this.closeDlg = true;
		return false;
	}
	
	if (this.acceptKeyChange) this.cancelKeyChange(null);
	var changedIDs = new Array();

	for( var i = 0; i < this.elementIDs.length; i++ ) {
		var elementID = this.elementIDs[i];
		var element = document.getElementById(elementID);
		
		if (!element) continue;
		var eltType = element.localName;
		var pre, post;
		if (eltType == "radiogroup") {
			pre = gMMPPreferences.getIntPref(element.getAttribute("prefstring"), null);
			post = parseInt(element.value);
			gMMPPreferences.setIntPref(element.getAttribute("prefstring"), parseInt(element.value));
		} else if (eltType == "checkbox") {
			pre = gMMPPreferences.getBoolPref(element.getAttribute("prefstring"), null);
			post = element.checked;
			gMMPPreferences.setBoolPref(element.getAttribute("prefstring"), element.checked);
		} else if (eltType == "textbox" && element.preftype == "int") {
			pre = gMMPPreferences.getIntPref(element.getAttribute("prefstring"), null);
			post = parseInt(element.getAttribute("value"));
			gMMPPreferences.setIntPref(element.getAttribute("prefstring"), parseInt(element.getAttribute("value")) );
		} else if (eltType == "textbox") {
			pre = gMMPPreferences.copyUnicharPref(element.getAttribute("prefstring"), null);
			post = element.getAttribute("value");
			gMMPPreferences.setUnicharPref(element.getAttribute("prefstring"), element.value);
		} else if (eltType == "menulist") {
			if (element.getAttribute("id") == "TSActionList") {
				pre = gMMPPreferences.getBoolPref(element.getAttribute("prefstring"), null);
				post = element.selectedIndex == 0 ? false : true;
				gMMPPreferences.setBoolPref(element.getAttribute("prefstring"), post);
			} else {
				pre = gMMPPreferences.getIntPref(element.getAttribute("prefstring"), null);
				post = element.selectedIndex;
				gMMPPreferences.setIntPref(element.getAttribute("prefstring"), element.selectedIndex);
			}
		} else if (eltType == "label") {
			pre = gMMPPreferences.copyUnicharPref(element.getAttribute("prefstring"), null);
			post = element.getAttribute("skey");
			gMMPPreferences.setUnicharPref(element.getAttribute("prefstring"), element.getAttribute("skey"));
		}
		if (pre === null) pre = element.getAttribute("defaultpref");
		if (pre != post) changedIDs.push(elementID);
	}

	try {
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		var restart = "norestart";
		if (gMMPPreferences.getBoolPref("maxmsgpane.autorestart") && this.needRestart(changedIDs))
		  restart = "restart";
		observerService.notifyObservers(null, "mmp:setting_updated", restart);
	} catch(e) {
		dump(e);
	}

	return true;
}

MMPSettings.prototype.cancelPrefs = function()
{
	if (this.closeDlg) return true;
	else {
		this.closeDlg = true;
		return false;
	}
}

MMPSettings.prototype.onLoad = function()
{
	// initialize the default window values...
	for( var i = 0; i < this.elementIDs.length; i++ ) {
		var elementID = this.elementIDs[i];
		var element = document.getElementById(elementID);
		if (!element) continue;
		var eltType = element.localName;

		if (eltType == "radiogroup") {
			var selItem = gMMPPreferences.getIntPref(element.getAttribute("prefstring"), undefined);
			if (selItem !== undefined) {
				element.selectedItem = element.childNodes[selItem];
			} else {
				element.selectedItem = element.childNodes[element.getAttribute("defaultpref")];
				gMMPPreferences.setIntPref( element.getAttribute("prefstring"), element.getAttribute("defaultpref") );
			}
		} else if (eltType == "checkbox") {
			var checked = gMMPPreferences.getBoolPref(element.getAttribute("prefstring"), undefined);
			if (checked !== undefined) {
				element.checked = (checked == true);
			} else {
				element.checked = ( element.getAttribute("defaultpref") == "true" );
				gMMPPreferences.setBoolPref( element.getAttribute("prefstring"), element.checked );
			}
		} else if (eltType == "textbox") {
			var text = gMMPPreferences.copyUnicharPref(element.getAttribute("prefstring"), undefined);
			if (text !== undefined) {
				element.setAttribute("value", text);
			} else {
				element.setAttribute("value", element.getAttribute("defaultpref") );
			}
		} else if (eltType == "menulist") {
			var val = gMMPPreferences.getBoolPref(element.getAttribute("prefstring"), undefined);
			if (element.getAttribute("id") == "TSActionList") {
				if (val !== undefined) {
					element.selectedIndex = val ? 1 : 0; 
				} else {
					element.selectedIndex = element.getAttribute("defaultpref");
					val = element.selectedIndex == 0 ? false : true;
					gMMPPreferences.setBoolPref(element.getAttribute("prefstring"), val );
				}
			} else {
				if (val !== undefined) {
					element.selectedIndex = val;
				} else {
					element.selectedIndex = element.getAttribute("defaultpref");
					gMMPPreferences.setIntPref(element.getAttribute("prefstring"), element.selectedIndex );
				}
			}
		} else if (eltType == "label") {
			var val = gMMPPreferences.copyUnicharPref(element.getAttribute("prefstring"), undefined);
			if (val !== undefined) {
				this.setLabel(element, val);
				element.setAttribute("skey", val);
			} else {
				this.setLabel(element, element.getAttribute("defaultpref"));
				element.setAttribute("skey", element.getAttribute("defaultpref"));
				gMMPPreferences.setUnicharPref(element.getAttribute("prefstring"), element.getAttribute("defaultpref") );
			}
		}
	}
	this.initDisabled();
}

MMPSettings.prototype.initDefault = function(elemIDs) 
{
	// initialize the default window values...
	for( var i = 0; i < elemIDs.length; i++ ) {
		var elementID = elemIDs[i];
		var element = document.getElementById(elementID);
		if (!element) break;
		
		var eltType = element.localName;

		if (eltType == "radiogroup") {
			element.selectedItem = element.childNodes[element.getAttribute("defaultpref")];
		} else if (eltType == "checkbox") {
			element.checked = ( element.getAttribute("defaultpref") == "true" );
		} else if (eltType == "textbox") {
			element.setAttribute("value", element.getAttribute("defaultpref") );
		} else if (eltType == "menulist") {
			element.selectedIndex = element.getAttribute("defaultpref");
		} else if (eltType == "label") {
			this.setLabel(element, element.getAttribute("defaultpref"));
			element.setAttribute("skey", element.getAttribute("defaultpref") );
		} else if (eltType == "menuitem") {
			element.setAttribute("selected", element.getAttribute("defaultpref") );
		}
	}
	this.initDisabled();
}

MMPSettings.prototype.defaultMP = function()
{
	this.initDefault(this.elemIDsMP);
}

MMPSettings.prototype.defaultFP = function()
{
	this.initDefault(this.elemIDsFP);
}

MMPSettings.prototype.defaultShortcutKey = function()
{
	this.initDefault(this.elemIDsSKey);
}

MMPSettings.prototype.defaultMisc = function()
{
	this.initDefault(this.elemIDsMisc);
}


MMPSettings.prototype.initDisabled = function()
{
	var val = document.getElementById("MMPToggleByHdr").checked;
	if (val) {
		document.getElementById("radio_hdrsclk").removeAttribute("disabled");
		document.getElementById("radio_hdrdclk").removeAttribute("disabled");
		document.getElementById("MMPHdrMouseButton").removeAttribute("disabled");
	} else {
		document.getElementById("radio_hdrsclk").setAttribute("disabled", "true");
		document.getElementById("radio_hdrdclk").setAttribute("disabled", "true");
		document.getElementById("MMPHdrMouseButton").setAttribute("disabled", "true");
	}
	
	val = document.getElementById("MMPToggleByTSplitter").checked;
	if (val) {
		document.getElementById("tsplitter_sclk").removeAttribute("disabled");
		document.getElementById("tsplitter_dclk").removeAttribute("disabled");
		document.getElementById("tsplitter_action_label").removeAttribute("disabled");
		document.getElementById("TSActionList").removeAttribute("disabled");
	} else {
		document.getElementById("tsplitter_sclk").setAttribute("disabled","true");
		document.getElementById("tsplitter_dclk").setAttribute("disabled","true");
		document.getElementById("tsplitter_action_label").setAttribute("disabled","true");
		document.getElementById("TSActionList").setAttribute("disabled","true");
	}
	
	val = document.getElementById("MMPToggleByFSplitter").checked;
	if (val) {
		document.getElementById("fsplitter_sclk").removeAttribute("disabled");
		document.getElementById("fsplitter_dclk").removeAttribute("disabled");
	} else {
		document.getElementById("fsplitter_sclk").setAttribute("disabled","true");
		document.getElementById("fsplitter_dclk").setAttribute("disabled","true");
	}

	val = document.getElementById("MMPAutoRestart").checked;
	if (val) {
		document.getElementById("MMPWarnRestart").removeAttribute("disabled");
	} else {
		document.getElementById("MMPWarnRestart").setAttribute("disabled","true");
	}
}

//If aEvent == null then cancel key change
MMPSettings.prototype.controlKeyChange = function(aEvent)
{

	var buttonStr1 = this.localeBundle.getString("mmpset.chkey");
	var buttonStr2 = this.localeBundle.getString("mmpset.skey_cancel");
	var prompt = this.localeBundle.getString("mmpset.skey_prompt");
	var changeButton;
	var promptLabel;
	var buttonId = null;

	if (!aEvent) buttonId = this.acceptKeyChange;
	else buttonId = aEvent.originalTarget.getAttribute("id");
		
	if (buttonId == "change_key") {
		//Shortcut key for MP toggle
		changeButton = document.getElementById("change_key");
		promptLabel = document.getElementById("shortcut_key");
	} else if (buttonId == "fp_change_key") {
		//Shortcut key for FP toggle
		changeButton = document.getElementById("fp_change_key");
		promptLabel = document.getElementById("fp_shortcut_key");
	} else {
		return;
	}
	
	if (!this.acceptKeyChange) {
		changeButton.setAttribute("label", buttonStr2);
		this.acceptKeyChange = changeButton.getAttribute("id");
		promptLabel.setAttribute("value", prompt);
	} else {
		changeButton.setAttribute("label", buttonStr1);
		this.acceptKeyChange = null;
		var skey = promptLabel.getAttribute("skey");
		this.setLabel(promptLabel, skey);
	}
}

MMPSettings.prototype.cancelKeyChange = function(aEvent)
{
	if (this.acceptKeyChange != null) this.controlKeyChange(aEvent);
}

MMPSettings.prototype.changeKey = function(aEvent)
{
//	aEvent.preventBubble();
	aEvent.stopPropagation();
	if (!this.acceptKeyChange) return;

	var promptLabel;
	if (aEvent.originalTarget.getAttribute("id") == "change_key") {
		//Shortcut key for MP toggle
		promptLabel = document.getElementById("shortcut_key");		
	} else if (aEvent.originalTarget.getAttribute("id") == "fp_change_key") {
		//Shortcut key for FP toggle
		promptLabel = document.getElementById("fp_shortcut_key");
	} else {
		//illegal event
		return;
	}

	if (aEvent.keyCode != 0) {
		var keystr = this.keyCodeToVK(aEvent);
		if (keystr != null)
		  promptLabel.setAttribute("skey",keystr);
		else return;
	} else {
		promptLabel.setAttribute("skey",String.fromCharCode(aEvent.which).toUpperCase());
	}
	
	this.controlKeyChange(aEvent);
}

MMPSettings.prototype.setLabel = function(label, str)
{
	switch (str) {
	  case " ":
		label.setAttribute("value","SPACE");
		break;
	  default:
		var substr = null;
		var i = str.indexOf("VK_");
		if (i != -1) substr = str.substring(i+3, str.length);
		else substr = str;
		label.setAttribute("value",substr);
	}
}

MMPSettings.prototype.keyCodeToVK = function(event)
{
	var keyStr;
	switch (event.keyCode) {
	  case event.DOM_VK_CANCEL:		keyStr = "VK_CANCEL"; break;
	  case event.DOM_VK_HELP:		keyStr = "VK_HELP"; break;
	  case event.DOM_VK_BACK_SPACE:	keyStr = "VK_BACK_SPACE"; break;
	  case event.DOM_VK_TAB:		keyStr = "VK_TAB"; break;
	  case event.DOM_VK_CLEAR:		keyStr = "VK_CLEAR"; break;
	  case event.DOM_VK_RETURN:		keyStr = "VK_RETURN"; break;
	  case event.DOM_VK_ENTER:		keyStr = "VK_ENTER"; break;
	  case event.DOM_VK_PAUSE:		keyStr = "VK_PAUSE"; break;
	  case event.DOM_VK_CAPS_LOCK:	keyStr = "VK_CAPS_LOCK"; break;
	  case event.DOM_VK_ESCAPE:		keyStr = "VK_ESCAPE"; this.closeDlg = false; break;
	  case event.DOM_VK_PAGE_UP:	keyStr = "VK_PAGE_UP"; break;
	  case event.DOM_VK_PAGE_DOWN:	keyStr = "VK_PAGE_DOWN"; break;
	  case event.DOM_VK_END:		keyStr = "VK_END"; break;
	  case event.DOM_VK_HOME:		keyStr = "VK_HOME"; break;
	  case event.DOM_VK_LEFT:		keyStr = "VK_LEFT"; break;
	  case event.DOM_VK_UP:			keyStr = "VK_UP"; break;
	  case event.DOM_VK_RIGHT:		keyStr = "VK_RIGHT"; break;
	  case event.DOM_VK_DOWN:		keyStr = "VK_DOWN"; break;
	  case event.DOM_VK_PRINTSCREEN: keyStr = "VK_PRINTSCREEN"; break;
	  case event.DOM_VK_INSERT:		keyStr = "VK_INSERT"; break;
	  case event.DOM_VK_DELETE:		keyStr = "VK_DELETE"; break;
	  case event.DOM_VK_F1:			keyStr = "VK_F1"; break;
	  case event.DOM_VK_F2:			keyStr = "VK_F2"; break;
	  case event.DOM_VK_F3:			keyStr = "VK_F3"; break;
	  case event.DOM_VK_F4:			keyStr = "VK_F4"; break;
	  case event.DOM_VK_F5:			keyStr = "VK_F5"; break;
	  case event.DOM_VK_F6:			keyStr = "VK_F6"; break;
	  case event.DOM_VK_F7:			keyStr = "VK_F7"; break;
	  case event.DOM_VK_F8:			keyStr = "VK_F8"; break;
	  case event.DOM_VK_F9:			keyStr = "VK_F9"; break;
	  case event.DOM_VK_F10:		keyStr = "VK_F10"; break;
	  case event.DOM_VK_F11:		keyStr = "VK_F11"; break;
	  case event.DOM_VK_F12:		keyStr = "VK_F12"; break;
	  case event.DOM_VK_F13:		keyStr = "VK_F13"; break;
	  case event.DOM_VK_F14:		keyStr = "VK_F14"; break;
	  case event.DOM_VK_F15:		keyStr = "VK_F15"; break;
	  case event.DOM_VK_F16:		keyStr = "VK_F16"; break;
	  case event.DOM_VK_F17:		keyStr = "VK_F17"; break;
	  case event.DOM_VK_F18:		keyStr = "VK_F18"; break;
	  case event.DOM_VK_F19:		keyStr = "VK_F19"; break;
	  case event.DOM_VK_F20:		keyStr = "VK_F20"; break;
	  case event.DOM_VK_F21:		keyStr = "VK_F21"; break;
	  case event.DOM_VK_F22:		keyStr = "VK_F22"; break;
	  case event.DOM_VK_F23:		keyStr = "VK_F23"; break;
	  case event.DOM_VK_F24:		keyStr = "VK_F24"; break;
	  case event.DOM_VK_NUM_LOCK:	keyStr = "VK_NUM_LOCK"; break;
	  case event.DOM_VK_SCROLL_LOCK: keyStr = "VK_SCROLL_LOCK";	break;
	  default:						keyStr = null; break;
	}
	return keyStr;
}



