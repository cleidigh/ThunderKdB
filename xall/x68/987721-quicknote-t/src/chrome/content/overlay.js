var QNover = {
	observe: function(subject, topic, data) {
		if (topic == 'nsPref:changed') {
			QNover.qnaddonstatus();
		}
	},

	// Show CTRL+F7 in Tools menu
	updateKey: function(name, select) {
		var menu = document.getElementById(name);
		if (menu) {
			if (!select) menu.removeAttribute('key');
			else menu.setAttribute('key', 'key_qnfocus');
		}
	},

	updateKeys : function() {
		var choice = QN_globalvar.qnprefs.getIntPref("openqn");
		QNover.updateKey('quicknote-fopensidebar', choice == 0);
		QNover.updateKey('quicknote-fopensidebarb', choice == 0);
		QNover.updateKey('quicknote-fopensidebartb', choice == 0);
		QNover.updateKey('quicknote-fopensidebars', choice == 0);

		QNover.updateKey('quicknote-fopenfloat', choice == 1);
		QNover.updateKey('quicknote-fopenfloatb', choice == 1);
		QNover.updateKey('quicknote-fopenfloattb', choice == 1);
		QNover.updateKey('quicknote-fopenfloats', choice == 1);

		QNover.updateKey('quicknote-fopentab', choice == 2);
		QNover.updateKey('quicknote-fopentabb', choice == 2);
		QNover.updateKey('quicknote-fopentabtb', choice == 2);
		QNover.updateKey('quicknote-fopentabs', choice == 2);

		//QNover.updateKey('quicknote-smopensidebar', choice == 0);
		//QNover.updateKey('quicknote-smopensidebartb', choice == 0);

		QNover.updateKey('quicknote-smopenfloat', choice == 1);
		QNover.updateKey('quicknote-smopenfloattb', choice == 1);

		QNover.updateKey('quicknote-smopentab', choice == 2);
		QNover.updateKey('quicknote-smopentabttb', choice == 2);

		QNover.updateKey('quicknote-tbopenfloat', choice == 1);
		QNover.updateKey('quicknote-tbopenfloattb', choice == 1);

		QNover.updateKey('quicknote-tbopentab', choice == 2);
		QNover.updateKey('quicknote-tbopentabtb', choice == 2);
	},

	//////////////////////////////////////////////////////////////////////
	// Send selected link to QuickNote
	// If qnshowurl is true, it will also send the Referer URL.
	// Thanks to the downloadwith extension for part of this link code.
	//////////////////////////////////////////////////////////////////////
	qnCopyLinkTo : function() {
		var qnshowurl = QN_globalvar.qnprefs.getBoolPref("showUrl");
		var focusedWindow = document.commandDispatcher.focusedWindow;
		if (focusedWindow == window) {
			focusedWindow = _content;
		}
		var docCharset = null;
		if (focusedWindow) {
			docCharset = "charset=" + focusedWindow.document.characterSet;
		}
		var elem = document.popupNode;
		var copiedLinkToQN = null;

		if (elem) {
			//if (elem instanceof Components.interfaces.nsIDOMHTMLAnchorElement && elem.href) {
			if (ChromeUtils.getClassName(elem) === "HTMLAnchorElement" && elem.href) {
				copiedLinkToQN = elem.href;
			}else{
				copiedLinkToQN = elem.parentNode;
			}
		}
		var copiedLinkToQN2 = copiedLinkToQN + "\n --" + focusedWindow.location.href;
		if (!qnshowurl || qnshowurl == false) {
			QNbrowser.SendSelectedTextToQN(copiedLinkToQN);
		} else {
			QNbrowser.SendSelectedTextToQN(copiedLinkToQN2);
		}
	},

	//////////////////////////////////////////////////////////////
	// Send selected text to QuickNote
	// If qnshowurl is true, it will also send the Referer URL.
	//////////////////////////////////////////////////////////////
	qnCopyTo : function() {
		var copiedToQN
		var qnshowurl = QN_globalvar.qnprefs.getBoolPref("showUrl");
		if (gContextMenu.target.tagName!="TEXTAREA"&&gContextMenu.target.tagName!="INPUT") {
			copiedToQN= document.commandDispatcher.focusedWindow.getSelection().toString();
		} else {
			copiedToQN=gContextMenu.target.value.substring(gContextMenu.target.selectionStart, gContextMenu.target.selectionEnd);
		}
		var copiedToQN2 = copiedToQN + "--" + window.location.href;
		if (!qnshowurl || qnshowurl == false) {
			QNbrowser.SendSelectedTextToQN(copiedToQN);
		} else {
			QNbrowser.SendSelectedTextToQN(copiedToQN2);
		}
	},

	/////////////////////////////////////////////////////////////////////
	// opens a new floating window
	// if aText != undefined then it also "sends" the text to the window
	/////////////////////////////////////////////////////////////////////
	openQNFloat : function(aText) {
		if (navigator.userAgent.search(/Firefox/gi) > 0) {
			var numTabs = gBrowser.mTabContainer.childNodes.length;
			var tempTab = null;
			for (let i = 0; i < gBrowser.browsers.length; i++) {
				if (gBrowser.browsers[i].contentDocument.location == "chrome://quicknote/content/quicknote.xul") { gBrowser.removeTab(gBrowser.mTabContainer.childNodes[i]); }
			}
			if (document.getElementById('viewQuickNoteSidebar').hasAttribute('checked')) toggleSidebar();
		}
		var win = QNover.getQNWinByType("quicknote:mainwindow");
		if (win) {
			win.focus();
		} else {
			if (QN_globalvar.qnprefs.getBoolPref("dependent")) {
				window.openDialog("chrome://quicknote/content/quicknote.xul", "_blank", "chrome,all,dialog=no,dependent", aText);
			} else {
				window.openDialog("chrome://quicknote/content/quicknote.xul", "_blank", "chrome,all,dialog=no", aText);
			}
			window.parent.addEventListener("close", function() {
				if (QN_globalvar.qnprefs.getBoolPref("closechild")) {
					if (QNover.getQNWinByType("quicknote:mainwindow") != null) {
						QNover.getQNWinByType("quicknote:mainwindow").close();
					}
				}
			}, false);
		}
	},

	//Close opened QuickNote by shortcut
	qnclosewin : function(event) {
		if ((event.keyCode == event.DOM_VK_F7) && event.ctrlKey == true) {
			if (QNover.getQNWinByType("quicknote:mainwindow") != null) {
				QNover.getQNWinByType("quicknote:mainwindow").close();
			}
		}
	},

	 //Open QuickNote Options!
	 openQNOptions: function() {
		window.openDialog('chrome://quicknote/content/qnsettings.xhtml', 'QuickNote - Settings', 'chrome,toolbar,centerscreen,resizable');
	},

	//Open links in new tab!
	openLink : function(URL) {
		try {
			var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
			var win = wm.getMostRecentWindow("navigator:browser");
			win.gBrowser.selectedTab = win.gBrowser.addTab(URL);
		} catch (err) {
			try {
				var eps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].
					getService(Components.interfaces.nsIExternalProtocolService);
				var ios = Components.classes["@mozilla.org/network/io-service;1"].
					getService(Components.interfaces.nsIIOService);
				eps.loadURI(ios.newURI(URL, null, null));
			} catch (err) {
			}
		}
	},

	///////////////////////////////////////////////////////////////////////////
	// Desc: Checks all open windows for the one we are looking for
	// Parameters: type	- this is the name of the window we are looking for
	// Returns: the type of window as an object.
	// Have to add here because Mozilla Suite won't inherit quicknote.js :(
	///////////////////////////////////////////////////////////////////////////
	getQNWinByType : function(type) {
		var windowmanager;
		if (!windowmanager) {
			windowmanager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService();
			windowmanager = windowmanager.QueryInterface( Components.interfaces.nsIWindowMediator);
		}
		return windowmanager.getMostRecentWindow(type);
	},

	// Sets a to be caught by CatchText
	sendText : function(aText) {
		var qns = Components.classes["@mozilla.org/pref-localizedstring;1"].createInstance(Components.interfaces.nsIPrefLocalizedString);
		qns.data = aText;
		QN_globalvar.qnprefs.setComplexValue("senttext", Components.interfaces.nsIPrefLocalizedString, qns);
	},

	//Display QN menu in Firefox button
	qnsbh : function(){
		var button = document.getElementById("quicknote-toolsmenubut"); 
		if (QN_globalvar.qnprefs.getBoolPref("showinfirefoxbutton")) button.hidden = false;
		else button.hidden = true;
	},

	//Display QN icon on status bar
	qnaddonstatus : function(){
		var panel = document.getElementById("quicknote-statuspanel"); 
		if (panel != null) {
			if (QN_globalvar.qnprefs.getBoolPref("showinaddonsbar", false)) panel.hidden = false;
			else panel.hidden = true;
		}
	},

	//Gets addon version 
	initNum : function() {
		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		AddonManager.getAddonByID("QuickNote-T@Toshi_").then(function(addon) {
			document.getElementById("vernumb").value = addon.version;
		});
	/*try {
		// Firefox 4 and later; Gecko 2 and later
		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		AddonManager.getAddonByID("QuickNote-T@Toshi_", function(addon) {
			document.getElementById("vernumb").value = addon.version;
		});
	 } catch (ex) {
		// Firefox 3.6 and before; Gecko 1.9.2 and before
		var em = Components.classes["@mozilla.org/extensions/manager;1"]
						 .getService(Components.interfaces.nsIExtensionManager);
		var addon = em.getItemForID("QuickNote-T@Toshi_");
			document.getElementById("vernumb").value = addon.version;
	 }*/
	}
};

QN_globalvar.qnprefs.addObserver('', QNover, false);

window.addEventListener("unload", function() { QN_globalvar.qnprefs.removeObserver('', QNover, false); }, false);
window.addEventListener("load", QNover.qnaddonstatus, false);
