//Components.utils.import("resource:///modules/iteratorUtils.jsm"); // for fixIterator
//Components.utils.import("resource://gre/modules/NetUtil.jsm");
//Components.utils.import("resource://gre/modules/FileUtils.jsm");

//For TB68
var {toArray, fixIterator} = ChromeUtils.import("resource:///modules/iteratorUtils.jsm"); // for fixIterator
var gENFSettings = {
	acceptKeyChange: null, //id of button that accepts input
	closeDlg: true,
	accountMgr: null,
	prefix: "",
	elementIDs: [],
	
	init: function() {
		this.prefix = "ENF";
		this.elementIDs = [
			"Email",
			"FwdMode",
			"IdList",
			"SendInterval",
			"SaveInSent",
			"MarkAsForward",
			"DelOrgMsg",
			"ShowConfirm",
			"AccType",
			"AlertLimit",
			"NoteTitle",
			"RmReFwd",
			"RmMLTag",
			"Notebook",
			"NoteTags",
			"MsgTags",
			"EnTags",
			"Header",
			"Footer",
			"MemoMailLink",
			"HeaderHTML",
			"FooterHTML",
			"AttFwdMode",
			"AttExtFilter",
			"AttSizeFilter",
			"SkeyEnable",
			"Skey",
			"SkeyAlt",
			"SkeyCtrl",
			"SkeyMeta",
			"RemSkeyEnable",
			"RemSkey",
			"RemSkeyAlt",
			"RemSkeyCtrl",
			"RemSkeyMeta",
			"PreviewMode"
		];

		window.addEventListener("dialogaccept",function(){gENFSettings.savePrefs();});
		window.addEventListener("dialogcancel",function(){gENFSettings.cancelPrefs();});
	},
	
	savePrefs: function() {
		if (!this.closeDlg){
			this.closeDlg = true;
			return false;
		}
		if (this.acceptKeyChange) this.cancelKeyChange(null);
		for( var i = 0; i < this.elementIDs.length; i++ ) {
			var elementID = this.elementIDs[i];
			var element = document.getElementById(this.prefix+elementID);
			if (!element) break;
			
			var eltType = element.localName;
			var prefstr = document.getElementById(element.getAttribute("preference")).getAttribute("name");
			var type = document.getElementById(element.getAttribute("preference")).getAttribute("type");

			var val = null;
			if (eltType == "radiogroup") {
				val = element.value;
			} else if (eltType == "checkbox") {
				val = element.checked;
			} else if (eltType == "textbox" || eltType == "input" || eltType == "textarea") {
		  	val = element.value;
			} else if (eltType == "button") {
		  	val = element.value;
			} else if (eltType == "menulist") {
		  	val = element.value;
			} else if (eltType == "label") { //for shortcut key
				val = element.getAttribute("skey");
			}
			
			if (type == "int") {
				gENFPreferences.setIntPref(prefstr, parseInt(val));
			} else if (type == "bool") {
				gENFPreferences.setBoolPref(prefstr, val);
			} else if (type == "unichar") {
				gENFPreferences.setUnicharPref(prefstr, val);
			}
		}
		this.saveMemoText();
		return true;
	},
	
	saveMemoText: function() {
		this.writeStringToFile(this.prefix+"Header.txt", document.getElementById(this.prefix+"HeaderText").value);
		this.writeStringToFile(this.prefix+"Footer.txt", document.getElementById(this.prefix+"FooterText").value);
	},
	
	cancelPrefs: function() {
		if (this.closeDlg) {
			return true;
		}else {
			this.closeDlg = true;
			return false;
		}
	},
	
	onLoad: function() {
		this.init();
		this.accountMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
		this.fillIdentityListPopup(document.getElementById(this.prefix+"IdListPopup"));
		
		for( var i = 0; i < this.elementIDs.length; i++ ) {
			var elementID = this.elementIDs[i];
			var element = document.getElementById(this.prefix + elementID);
			if (!element) break;
			
			var eltType = element.localName;
			var prefstr = document.getElementById(element.getAttribute("preference")).getAttribute("name");
			var type = document.getElementById(element.getAttribute("preference")).getAttribute("type");
			var val = null;
			
			if (type == "int") {
				val = gENFPreferences.getIntPref(prefstr, 0);
			} else if (type == "bool") {
				val = gENFPreferences.getBoolPref(prefstr, false);
			} else if (type == "unichar") {
				val = gENFPreferences.copyUnicharPref(prefstr, "");
			}

			if (eltType == "radiogroup") {
		  	element.value = val;
			} else if (eltType == "checkbox") {
		  	if (val) {
		  		element.setAttribute("checked", true);
		  	} else {
		  		element.removeAttribute("checked");
		  	}
			} else if (eltType == "textbox" || eltType == "input" || eltType == "textarea") {
		  	element.value = val;
			} else if (eltType == "button") {
				element.value = val ? val : "";
			} else if (eltType == "menulist") {
				element.value = val ? val : null;
				if (!element.value) element.selectedIndex = 0;
			} else if (eltType == "label") {
				this.setLabel(element, val);
				element.setAttribute("skey", val);
			}
		}
		
		this.onChangeAccountType();
		//this.onToggleUseFolderName(document.getElementById("ENFUseFolderName"));
		if (gENFPreferences.getBoolPref("extensions.enforward.use_folder_name", false)) {//convert old pref
			document.getElementById(this.prefix+"Notebook").setAttribute("value", "%F");
			gENFPreferences.setBoolPref("extensions.enforward.use_folder_name", false);
		}
		
		this.loadMemoText();
	},
	
	loadMemoText: function() {
		document.getElementById(this.prefix+"HeaderText").value = this.loadFileToString(this.prefix+"Header.txt");
		document.getElementById(this.prefix+"FooterText").value = this.loadFileToString(this.prefix+"Footer.txt");	
	},
	
	onChangeAccountType: function() {
		var accType = document.getElementById(this.prefix+"AccType").getAttribute("value");
		var maxSize = gENForwardUtils.getMaxSize(accType);
		var maxSend = gENForwardUtils.getMaxSend(accType);
		var todaySent = gENForwardUtils.checkLimitExpires(true) ? 0 : gENFPreferences.getIntPref("extensions.enforward.sent_times", 0);
		
		document.getElementById(this.prefix+"NoteSize").setAttribute("value", maxSize);
		document.getElementById(this.prefix+"SentNotes").setAttribute("value", todaySent+"/"+maxSend);
/*
		var progress = (todaySent * 100) / maxSend;
		if (progress > 100) progress = 100;
		document.getElementById(this.prefix+"SentNotesMeter").setAttribute("value", progress);
*/
	},
	
/*	
	onToggleUseFolderName: function(targ) {
		var notebookNameField = document.getElementById("ENFNotebook");
		if (targ.checked) notebookNameField.setAttribute("disabled", true);
		else notebookNameField.removeAttribute("disabled");
	},
*/	
	editTagList: function(event) {
		var tags = event.target.value;
		var tagsArray = tags == "" ? [] : tags.split(" ");
		var callback = {tags: tagsArray, isOK: false};
		window.openDialog("chrome://enforward/content/ENFTagList.xul", "enforward-taglist", "chrome,modal,dialog,centerscreen", callback);
		if (callback.isOK) {
			event.target.value = callback.tags.join(" ");
			var pref = document.getElementById(event.target.getAttribute("preference"));
			if (pref.instantApply) {
				gENFPreferences.setUnicharPref(pref.getAttribute("name"), event.target.value);
			}
		}
	},
	
	writeStringToFile: function(name, str) {
		gENForwardUtils.writeStringToFile(name, str);
	},
	
	loadFileToString: function(name) {
		return gENForwardUtils.loadFileToString(name);
	},
	
	//If aEvent == null then cancel key change
	controlKeyChange: function(aEvent) {
		var promptLabel = "";
		var buttonId = null;
	
		if (!aEvent) buttonId = this.acceptKeyChange;
		else buttonId = aEvent.originalTarget.getAttribute("id");
			
		if (buttonId == this.prefix+"SkeyChangeButton") {
			//Shortcut key for Forward
			promptLabel = document.getElementById(this.prefix+"Skey");
		} else if (buttonId == this.prefix+"RemSkeyChangeButton") {
			//Shortcut key for Forward with Reminder
			promptLabel = document.getElementById(this.prefix+"RemSkey");
		} else {
			return;
		}
		var changeButton = document.getElementById(buttonId);

		if (!this.acceptKeyChange) {
			changeButton.setAttribute("label", "Cancel");
			this.acceptKeyChange = changeButton.getAttribute("id");
			promptLabel.setAttribute("value", "Press Key Now!");
		} else {
			changeButton.setAttribute("label", "Change");
			this.acceptKeyChange = null;
			var skey = promptLabel.getAttribute("skey");
			this.setLabel(promptLabel, skey);
		}
	},

	cancelKeyChange: function(aEvent) {
		if (this.acceptKeyChange != null) this.controlKeyChange(aEvent);
	},

	changeKey: function(aEvent) {
		aEvent.stopPropagation();
		if (!this.acceptKeyChange) return;
	
		var buttonId = aEvent.originalTarget.getAttribute("id");
		var promptLabel;
		
		if (buttonId == this.prefix+"SkeyChangeButton") {
			//Shortcut key for Forward
			promptLabel = document.getElementById(this.prefix+"Skey");
		} else if (buttonId == this.prefix+"RemSkeyChangeButton") {
			//Shortcut key for Forward with Reminder
			promptLabel = document.getElementById(this.prefix+"RemSkey");
		} else {
			return;
		}
	
		if (aEvent.keyCode != 0) {
			var keystr = this.keyCodeToVK(aEvent);
			if (keystr != null) {
			  promptLabel.setAttribute("skey",keystr);
			} else {
				promptLabel.setAttribute("value", "Invalid Key");
				setTimeout(
					function() {promptLabel.setAttribute("value", "Press Key Now!");},
					1000
				);
				return;
			}
		} else {
			promptLabel.setAttribute("skey",String.fromCharCode(aEvent.which).toUpperCase());
		}
		
		var pref = document.getElementById(promptLabel.getAttribute("preference"));
		if (pref.instantApply) {
			gENFPreferences.setUnicharPref(pref.getAttribute("name"), promptLabel.getAttribute("skey"));
		}
		this.controlKeyChange(aEvent);
	},

	setLabel: function(label, str) {
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
	},

	keyCodeToVK: function(event) {
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
	},
	
	fillIdentityListPopup: function(popup) {
		var accounts = toArray(fixIterator(this.accountMgr.accounts, Components.interfaces.nsIMsgAccount));
	
		for (var acc = 0; acc < accounts.length; acc++) {
			var account = accounts[acc];
			var identities = toArray(fixIterator(account.identities,
		                                         Components.interfaces.nsIMsgIdentity));
			var server = account.incomingServer;
			for (var i = 0; i < identities.length; i++) {
				var identity = identities[i];
				var item = document.createElement("menuitem");
				item.className = "identity-popup-item";
				item.setAttribute("label", identity.identityName);
				//item.setAttribute("value", identity.key);
				item.setAttribute("value", account.key+"/"+identity.key);
				item.setAttribute("accountkey", account.key);
				item.setAttribute("accountname", " - " + server.prettyName);
				popup.appendChild(item);
		  }
		}
	}
};
