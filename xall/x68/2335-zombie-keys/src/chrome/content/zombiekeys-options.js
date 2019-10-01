 "use strict";
 
 
ZombieKeys.Options = {
	selectItem: function(layout) {
		let lst = document.getElementById('Layouts');
		if (lst) {
			for (let i=0; i<lst.itemCount; i++) {
				let item = lst.getItemAtIndex(i);
				if (item && item.value == layout) {
					lst.selectItem (item);
					break;
				}
			}
		}
	},

	selectLayout: function(locale, win) {
		let img = document.getElementById('layoutImage');
		if (img)
			img.className = "layout-" + locale;
		ZombieKeys.Options.accept();
		ZombieKeys.Util.logDebug("Changed locale to " + ZombieKeys.getCurrentLocale());
	} ,
		
	load : function() {
		debugger;
		ZombieKeys.Options.selectItem(ZombieKeys.getCurrentLocale());
    document.getElementById('btnCustomize').collapsed = !ZombieKeys.Preferences.isDebug;
		
		window.addEventListener('dialogaccept', 
			function () { 
				ZombieKeys.Options.accept(); 
			}
		);
		window.addEventListener('dialogcancel', 
			function () { 
				ZombieKeys.Options.close(); 
			}
		);
		setTimeout( 
			function() { 
				window.sizeToContent();
				let prefPane = document.getElementById('zombiePrefs'),
				    prefHeight = Math.floor(prefPane.getBoundingClientRect().height),
						dlgButtonHeight = 55;
						
				if (window.innerHeight < prefHeight + dlgButtonHeight) {
					let deltaHeight = prefHeight + dlgButtonHeight - window.innerHeight;
					window.resizeBy(deltaHeight, 0);
				}
			}, 200
		);
		
		
	} ,
	
  setDebug : function(cb) {
    document.getElementById('btnCustomize').collapsed = !cb.checked;
  } ,
  
	get selectedLocale() {
		let lst = document.getElementById('Layouts');
		if (lst) {
			for (let i=0; i<lst.childNodes.length; i++) {
				if (lst.childNodes[i].selected) {
					return lst.getItemAtIndex(i).value;
				}
			}
		}
		return null;
	} ,
	
	get selectedLocaleLabel() {
		let lst = document.getElementById('Layouts');
		return lst.selectedItem.label;
	} ,

	accept : function () {
		const util = ZombieKeys.Util;
		let val = this.selectedLocale;
		util.logDebug("Options.accept()\nSelected Locale = " + val);
		if (val) {
			Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch)
				.setCharPref('extensions.zombiekeys.currentLayout', val);
		}
	} ,

	close : function () {
		const util = ZombieKeys.Util;
		util.logDebug("Options.close()")
		ZombieKeys.Util.logDebug("Current locale remains=" + ZombieKeys.getCurrentLocale());
		ZombieKeys.DisableListeners = false;
	} , 
	
	startCustomize : function() {
	  // make sure current layout is really selected
    document.getElementById('prefEditLayout').setAttribute("collapsed", false);
    document.getElementById('prefSelectLayout').collapsed = true;
		// Label
		document.getElementById('currentLayoutName').value = this.selectedLocaleLabel;
		this.fillDeadkeysList();
	} ,
	
	endCustomize : function() {
    document.getElementById('prefEditLayout').collapsed = true;
    document.getElementById('prefSelectLayout').collapsed = false;
		ZombieKeys.DisableListeners = false;
	} ,
	
	deadKeyTitle: function(id) {
	  switch(id) {
		  case 1: return 'grave';
			case 2: return 'acute';
			case 3: return 'circumflex';
			case 4: return 'tilde';
			case 5: return 'umlaut';
			case 6: return 'ring';
			case 7: return 'sharp s';
			case 8: return 'stroke';
			case 9: return 'caron';
			case 10: return 'cedilla';
			case 11: return 'breve';
			case 12: return 'ogonec';
			case 13: return 'macron';
			case 14: return 'overdot';
			case 15: return 'underdot';
			case 16: return 'double accute';
			case 17: return 'circle';
			case 18: return 'greek'; 
			default: return 'unknown?';
		}                  
	},
	
	getDeadKeyLabel: function(dK, arrayIndex) {
		let keyCode = dK.keyCode,
		    theKey = dK.key,
		    theOtherKey = dK.otherKey ? dK.otherKey : '',
		    itemLabel = dK.id + " - " + this.deadKeyTitle(dK.id) + " (" + keyCode + ") " + theKey,
		    modifiers = ZombieKeys.DeadKeys[arrayIndex].modifiers;
		if (theOtherKey)
			itemLabel += "[" + theOtherKey + "]";
		if (modifiers.ctrlKey) itemLabel += '  + CTRL';
		if (modifiers.altKey) itemLabel += '  + Alt';
		if (modifiers.shiftKey) itemLabel += '  + Shift';
    return itemLabel;	
	},
	
	fillDeadkeysList: function() {
		// refill listbox
		let locale = this.selectedLocale,
		    list = document.getElementById('deadKeyList');
		while (list.itemCount)
		  list.removeItemAt(0);
		// initialize the current instance (of options window)
		ZombieKeys.initLocale(locale); 
		// get key map
		let deadKeysList = ZombieKeys.currentLayout.map_deadKeys;
		for (let i=0; i<deadKeysList.length; i++) {
		  let dK = deadKeysList[i];
		  list.appendItem(this.getDeadKeyLabel(dK, i), dK.id);  // examples would be nice...
		}
	} ,
	
	resetKey : function() {
	
	} ,
	
	defineKey : function() {
	
	} ,
	
	showInstructions : function(show) {
	  document.getElementById('pressKeyAgainInstructions').collapsed = true;
	  document.getElementById('pressKeyInstructions').collapsed = !show;
		ZombieKeys.DisableListeners = !show;
	} ,
	
	showInstructionsAgain : function(show) {
	  document.getElementById('pressKeyInstructions').collapsed = true;
	  document.getElementById('pressKeyAgainInstructions').collapsed = !show;
		ZombieKeys.DisableListeners = !show;
	} ,
	
	
	captureKeyCode : function(again) {
	  if (!again)
		  this.showInstructions(true);
		else
			this.showInstructionsAgain(true);	
		let input = document.getElementById('pushKey');
		input.addEventListener('keyup',	this.keyUpHandler, false);
		input.value='';
		input.focus(); // listen for the key!
	} ,
	
	keyUpHandler : function(event) {
		if (event.keyCode<20)
			return; // ignore CTRL,SHIFT and ALT
		let alt = (event.altKey) ? true : false,
		    ctrl = (event.ctrlKey) ? true : false,
		    shift = (event.shiftKey) ? true : false,
		    isDebug = ZombieKeys.Preferences.isDebugOption('keyUpHandler');
		if (isDebug) {ZombieKeys.logKey("pushKey up: ", event);}
		document.getElementById('txtKeyCode').value = event.keyCode;
		event.target.removeEventListener('keyup', ZombieKeys.Options.keyUpHandler);
		// when pressing again, we ignore accelerators!
		if (document.getElementById('pressKeyAgainInstructions').collapsed) {
			document.getElementById('chkShift').checked = shift;
			document.getElementById('chkAlt').checked = alt;
			document.getElementById('chkCTRL').checked = ctrl;
		}
		let code = (event.charCode) ? event.charCode : event.keyCode,
		    shiftCode = 0;
		// Simple ASCII shift calculations. a-A .. Z-z
		if (code>64 && code<91)
			shiftCode = code + 32;
		else if (code>96 && code<123)
			shiftCode = code - 32;
		else
		  shiftCode = code;  // we can't say what else is on the key as it is language dependant.
		try {
		  if (shiftCode != code) {
				document.getElementById('pushKey').value =  String.fromCharCode(shift ? code : shiftCode);
				document.getElementById('otherKey').value = String.fromCharCode(!shift ? code : shiftCode);
			}
		}
		catch (ex) {;}
	  ZombieKeys.Options.showInstructions(false);
		ZombieKeys.DisableListeners = false;
		// nothing in pushKey, so accelerators made keypress fail 
		// (we have captured the keyCode, but have no symbol to display)
		if (document.getElementById('pushKey').value =='') {
		  // ask to press key again without accelerators.
			window.setTimeout (	function() { ZombieKeys.Options.captureKeyCode(true);}, 50);
		}
		else
			document.getElementById('otherKey').focus();		
	} ,
	
	selectDeadKey : function(lb) {
	  let index = lb.selectedIndex,
		    element = lb.selectedItem,
		    idx = parseInt(element.value),  // the number
		    dK = ZombieKeys.currentLayout.map_deadKeys[index], // get deadKey
		    theKey = dK.key,
		    theOtherKey = dK.otherKey ? dK.otherKey : '';
		document.getElementById('txtKeyCode').value = dK.keyCode;
		document.getElementById('pushKey').value = theKey;
		document.getElementById('otherKey').value = theOtherKey;
		// this could well already be the "effective" (localized) modifiers:
		
		let modifiers = ZombieKeys.DeadKeys[index].modifiers;
		document.getElementById('chkCTRL').checked = modifiers.ctrlKey;
		document.getElementById('chkAlt').checked = modifiers.altKey;
		document.getElementById('chkShift').checked = modifiers.shiftKey;
		// let defaultMods = ZombieKeys.DeadKeys[idx].modifiers;
		// let itemLabel = dK.id + " - " + this.deadKeyTitle(dK.id) + " (" + keyCode + ") " + theKey;
	}
		
}
