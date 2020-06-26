var QNtb = {
	// do the init on load
	initOverlay: function() {
		var menu = document.getElementById("mailContext");
		if (menu != null) {
			menu.addEventListener("popupshowing",QNtb.contextPopupShowing,false);
		}
		var menu = document.getElementById("msgComposeContext");
		if (menu != null) {
			menu.addEventListener("popupshowing",QNtb.contextPopupShowingCompose,false);
		}
		var menu = document.getElementById("contentAreaContextMenu");
		if (menu != null) {
			menu.addEventListener("popupshowing",QNtb.contextPopupShowing,false);
		}
		if (QN_globalvar.qnprefs.getBoolPref("autostart", true)) {
			QNtb.openQuickNote();
		}
	},

	qntoolbarbuttontb: function() {
		window.removeEventListener('load', QNtb.qntoolbarbuttontb, false);
		var firstRun = QN_globalvar.qnprefs.getBoolPref('firststartmail');
		if (navigator.userAgent.search(/SeaMonkey/gi) >= 0) {
		if (firstRun) {
			var myId = "quicknote-buttonsm"; // ID of button to add
			var afterId = "button-mark";		// ID of element to insert after
			var toolBar = document.getElementById('msgToolbar');
			var curSet = toolBar.currentSet.split(",");

			if (curSet.indexOf(myId) == -1) {
				var pos = curSet.indexOf(afterId) + 1 || curSet.length;
				var set = curSet.slice(0, pos).concat(myId).concat(curSet.slice(pos));

				toolBar.setAttribute("currentset", set.join(","));
				toolBar.currentSet = set.join(",");
				Services.xulStore.persist(toolBar.id, "currentset");
			}
			QN_globalvar.qnprefs.setBoolPref('firststartmail', false);
			}
		}
		if (navigator.userAgent.search(/Thunderbird/gi) >= 0) {
		if (firstRun) {
			var myId = "quicknote-buttontb"; // ID of button to add
			var afterId = "qfb-show-filter-bar";		// ID of element to insert after
			var toolBar = document.getElementById("mail-bar3");
			var curSet = toolBar.currentSet.split(",");

			if (curSet.indexOf(myId) == -1) {
				var pos = curSet.indexOf(afterId) + 1 || curSet.length;
				var set = curSet.slice(0, pos).concat(myId).concat(curSet.slice(pos));

				toolBar.setAttribute("currentset", set.join(","));
				toolBar.currentSet = set.join(",");
				//document.persist(toolBar.id, "currentset");
				Services.xulStore.persist(toolBar, "currentset");
			}

			QN_globalvar.qnprefs.setBoolPref('firststartmail', false);
		}
		//Compare addon version
		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		AddonManager.getAddonByID("QuickNote-T@Toshi_").then(function(addon) {
			Components.utils.import("resource://gre/modules/Services.jsm");
			var prevVersion = QN_globalvar.qnprefs.getCharPref('lastVersion');
			if (Services.vc.compare(prevVersion, addon.version) < 0) {
				Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator)
									.getMostRecentWindow("mail:3pane").document.getElementById("tabmail")
									.openTab("contentTab", {contentPage: "chrome://quicknote/content/update.xhtml"});
				QN_globalvar.qnprefs.setCharPref('lastVersion', addon.version);
			}
		});
	 }
	},

	qntoolbarbuttoncompose: function() {
		window.removeEventListener('load', QNtb.qntoolbarbuttoncompose, false);
		var firstRun = QN_globalvar.qnprefs.getBoolPref('firststartcmp');
		if (firstRun) {
			var myId = "quicknote-composebutton"; // ID of button to add
			var afterId = "button-save";		// ID of element to insert after
			var toolBar = document.getElementById('composeToolbar2') || document.getElementById('composeToolbar');
			if (toolBar != null) {
				var curSet	= toolBar.currentSet.split(",");
				if (curSet.indexOf(myId) == -1) {
					var pos = curSet.indexOf(afterId) + 1 || curSet.length;
					var set = curSet.slice(0, pos).concat(myId).concat(curSet.slice(pos));
					toolBar.setAttribute("currentset", set.join(","));
					toolBar.currentSet = set.join(",");
					document.persist(toolBar.id, "currentset");
				}
				QN_globalvar.qnprefs.setBoolPref('firststartcmp', false);
			}
		}
	},

	getQNWinByType : function(type) {
		var windowmanager;
		if (!windowmanager) {
			windowmanager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService();
			windowmanager = windowmanager.QueryInterface( Components.interfaces.nsIWindowMediator);
		}
		return windowmanager.getMostRecentWindow(type);
	},

	contextPopupShowing: function() {
		var isTextSelectionQN = false;
		if (gContextMenu) {
			isTextSelectionQN = gContextMenu.isContentSelected;

			var selection = document.commandDispatcher.focusedWindow.getSelection().toString().replace(/(\n|\r|\t)+/g, " ").trim();
			isTextSelectionQN = (selection != "");
		}

		var qnmenuitem = document.getElementById("quicknote-mail-context");
		if (qnmenuitem) qnmenuitem.hidden = !isTextSelectionQN;

		var isTextSelectionLinkQN = false;
		if (gContextMenu) isTextSelectionLinkQN = gContextMenu.onLink;

		var qnmenuitemlink = document.getElementById("quicknote-mail-linkcontext");
		if (qnmenuitemlink) qnmenuitemlink.hidden = !isTextSelectionLinkQN;
	},

	contextPopupShowingCompose: function() {
		var selection = document.commandDispatcher.focusedWindow.getSelection().toString().replace(/(\n|\r|\t)+/g, " ").trim();
		if (selection == "") {
			document.getElementById("quicknote-mail-context").hidden = true;
		} else {
			document.getElementById("quicknote-mail-context").hidden = false;
		}
	},
	myqncounter : 0,

////////////////////////////////////////////////////////////////////////////////
//This gets the selected text (aText) from the contentArea and
//adds it to one of the tabs (respects the value of quicknote.totabint).
//If there is a QN window open already, we're focusing it. Otherwise
//we open a new window.
////////////////////////////////////////////////////////////////////////////////
	SendSelectedTextToQNTb: function(aText) {
		// QuickNote tab that catches the text:
		var tabtosendto = QN_globalvar.qnprefs.getIntPref("totabint");
		if (QN_globalvar.qnprefs.getIntPref("openqn") == 1) {
			// Check for an existing floating window
			var qndoc = QNqn.FindQNFloat();
			if (qndoc) {
				var qnWindow = qndoc.defaultView;
				qnWindow.focus();
				QNqn.setupDocument(qndoc);
				QNqn.catchText(aText);
			} else QNtb.openQNFloat(aText);
		}
		if (QN_globalvar.qnprefs.getIntPref("openqn") == 2) {
			var tb = 0;
			var tabmail = document.getElementById("tabmail");
			for (let i = 0; i < tabmail.tabInfo.length; i++) {
				var tab = tabmail.tabInfo[i];
				if (tab.mode.type == "contentTab" && tab.browser.contentDocument.location == "chrome://quicknote/content/quicknote.xhtml") {
					tb = 1;
					document.getElementById("tabmail").switchToTab(i);
					var target = QN_globalvar.qnprefs.getIntPref("totabint");
					if (aText) {
						var Pad = tab.browser.contentDocument.getElementById("Pad" + target);
						if (QN_globalvar.qnprefs.getBoolPref("cursorposstart")) {
							Pad.value = aText + "\n" + "\n" + Pad.value;Pad.setSelectionRange(aText.length, aText.length);
						} else {
							Pad.value = Pad.value + "\n" + "\n" + aText;Pad.setSelectionRange(Pad.textLength, Pad.textLength);
						}
					}
				}
			}
		if (tb == 0) QNtb.openQuickNoteInTab(aText);
		}
	},

	qnCopyToTb: function() {
		var copiedToQN;
		var qnshowurl = QN_globalvar.qnprefs.getBoolPref("showUrl");
		if (gContextMenu.target.tagName != "TEXTAREA" && gContextMenu.target.tagName != "INPUT") {
			copiedToQN= document.commandDispatcher.focusedWindow.getSelection().toString();
		} else {
			copiedToQN = gContextMenu.target.value.substring(gContextMenu.target.selectionStart, gContextMenu.target.selectionEnd);
		}
		var copiedToQN2 = copiedToQN + "--" + window.location.href;
		if (!qnshowurl || qnshowurl == false) {
			//alert("Cool Sent text");
			QNtb.SendSelectedTextToQNTb(copiedToQN);
		} else {
			//alert("Cool Sent text and refererer");
			QNtb.SendSelectedTextToQNTb(copiedToQN2);
		}
	},

	qnCopyToTbCompose: function() {
		var copiedToQN
		var qnshowurl = QN_globalvar.qnprefs.getBoolPref("showUrl");
		copiedToQN = document.commandDispatcher.focusedWindow.getSelection().toString();
		if (!qnshowurl || qnshowurl == true) copiedToQN = copiedToQN + "--" + window.location.href;
		//alert("Cool Sent text");
		var qndoc = QNqn.FindQNFloat();
		if (qndoc) {
			var qnWindow = qndoc.defaultView;
			qnWindow.focus();
			QNqn.setupDocument(qndoc);
			QNqn.catchText(copiedToQN);
		} else {
			QNtb.openQNFloat(copiedToQN);
		}
	},

////////////////////////////////////////////////////////////////////////////////
// Send selected link to QuickNote
// If qnshowurl is true, it will also send the Referer URL.
////////////////////////////////////////////////////////////////////////////////
	qnCopyLinkToTb: function() {
		var qnshowurl = QN_globalvar.qnprefs.getBoolPref("showUrl");
		var focusedWindow = document.commandDispatcher.focusedWindow;
		if (focusedWindow == window){
			focusedWindow = _content;
		}
		var docCharset = null;
		if (focusedWindow) {
			docCharset = "charset=" + focusedWindow.document.characterSet;
		}
		var elem = document.popupNode;
		var copiedLinkToQN = null;

		if (elem) {
			//if(elem instanceof Components.interfaces.nsIDOMHTMLAnchorElement && elem.href){
			if (ChromeUtils.getClassName(elem) === "HTMLAnchorElement" && elem.href) {
				copiedLinkToQN = elem.href;
			}else{
				copiedLinkToQN = elem.parentNode;
			}
		}
		var copiedLinkToQN2 = copiedLinkToQN + "\n --" + focusedWindow.location.href;
		if (!qnshowurl || qnshowurl == false) {
			//alert("Cool Sent text");
			QNtb.SendSelectedTextToQNTb(copiedLinkToQN);
		} else {
			//alert("Cool Sent text and refererer");
			QNtb.SendSelectedTextToQNTb(copiedLinkToQN2);
		}
	},

	openQuickNote: function(aText) {
		var openMethod = QN_globalvar.qnprefs.getIntPref("openqn", 1);

		if (openMethod == 1) {
			if (QNtb.getQNWinByType("quicknote:mainwindow") != null) QNtb.getQNWinByType("quicknote:mainwindow").close();
			else QNtb.openQNFloat(aText);
		}
		if (openMethod == 2) {
			try {
				var tb = 0;
				var tabmail = document.getElementById("tabmail");
				for (let i = 0; i < tabmail.tabInfo.length; i++) {
					var tab = tabmail.tabInfo[i];
					if (tab.mode.type == "contentTab" && tab.browser.contentDocument.location == "chrome://quicknote/content/quicknote.xhtml") {
						document.getElementById("tabmail").closeTab(document.getElementById("tabmail").tabContainer.childNodes[i]);
						tb = 1;
					}
				}
				if (tb == 0) QNtb.openQuickNoteInTab();
			}
			catch(evt) {
				if (QNtb.getQNWinByType("quicknote:mainwindow") != null) QNtb.getQNWinByType("quicknote:mainwindow").close();
				else QNtb.openQNFloat(aText);
			}
		}
	},

	openQNFloat : function(aText) {
		if (QN_globalvar.qnprefs.getBoolPref("dependent", false)) window.openDialog("chrome://quicknote/content/quicknote.xhtml", "_blank", "chrome,all,dialog=no,dependent", aText);
		else window.openDialog("chrome://quicknote/content/quicknote.xhtml", "_blank", "chrome,all,dialog=no", aText);
		window.parent.addEventListener("unload", function(event) {
			if (QN_globalvar.qnprefs.getBoolPref("closechild")) {
				if (QNtb.getQNWinByType("quicknote:mainwindow") != null) {
					QNtb.getQNWinByType("quicknote:mainwindow").close();
				}
			}
		}, false);
	},

	// Open QuickNote as a tab
	openQuickNoteInTab: function(aText) {
		if (QNtb.getQNWinByType("quicknote:mainwindow") != null) QNtb.getQNWinByType("quicknote:mainwindow").close();
		var tb = 0;
		var tabmail = document.getElementById("tabmail");
		for (let i = 0; i < tabmail.tabInfo.length; i++) {
			var tab = tabmail.tabInfo[i];
			if (tab.mode.type == "contentTab" && tab.browser.contentDocument.location == "chrome://quicknote/content/quicknote.xhtml") {
				document.getElementById("tabmail").switchToTab(i);
				tb = 1;
			}
		}
		if (tb == 0) {
			if (QN_globalvar.qnprefs.getBoolPref("tabBackground") == false) {
				var qntbtab = document.getElementById("tabmail").openTab("contentTab", {contentPage: 'chrome://quicknote/content/quicknote.xhtml'});
			} else {
				var qntbtab = document.getElementById("tabmail").openTab("contentTab", {contentPage: 'chrome://quicknote/content/quicknote.xhtml', background: true});
			}
			if (aText) {
				setTimeout(function() {
					var target = QN_globalvar.qnprefs.getIntPref("totabint");
					var Pad = qntbtab.browser.contentDocument.getElementById("Pad" + target);
					var tabmail = document.getElementById("tabmail");
					for (let i = 0; i < tabmail.tabInfo.length; i++) {
						var tab = tabmail.tabInfo[i];
						var cibn = function() {
							if (qntbtab.browser.contentDocument != undefined) {
								qntbtab.browser.contentDocument.getElementById("Pad"+target).focus();
							}
						}
						if (tab.mode.type == "contentTab" && tab.browser.contentDocument.location == "chrome://quicknote/content/quicknote.xhtml") {
							document.getElementById("tabmail").tabContainer.childNodes[i].addEventListener("select", cibn, false);
						}
					}
					qntbtab.browser.contentDocument.getElementById("qntabs").selectedIndex = target-1;
					document.getElementById("tabmail").addEventListener("select", cibn, false);
					if (QN_globalvar.qnprefs.getIntPref("autosave") == "-1") {
						qntbtab.browser.contentDocument.getElementById('save' + target).removeAttribute('disabled');
					}
					if (QN_globalvar.qnprefs.getBoolPref("cursorposstart")) {
						Pad.value = aText + "\n" + "\n" + Pad.value;Pad.setSelectionRange(aText.length, aText.length);
					} else {
						Pad.value = Pad.value + "\n" + "\n" + aText;Pad.setSelectionRange(Pad.textLength, Pad.textLength);
					}
				}, 100);
			}
		}
	},

	openQNOptions: function() {
		window.openDialog('chrome://quicknote/content/qnsettings.xhtml', 'QuickNote - Settings', 'chrome,toolbar,centerscreen,resizable');
	},

	qnclosewin: function(event) {
		if ((event.keyCode == event.DOM_VK_F7) && event.ctrlKey == true) {
			if (QNtb.getQNWinByType("quicknote:mainwindow") != null) QNtb.getQNWinByType("quicknote:mainwindow").close();
		}
	},

	QN_onGlobalKeyUp: function(event) {
		if ((event.keyCode == event.DOM_VK_F7) && event.ctrlKey== true) QNtb.openQuickNote();
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

		QNtb.updateKey('quicknote-tbopenfloat', choice == 1);
		QNtb.updateKey('quicknote-tbopenfloattb', choice == 1);
		QNtb.updateKey('quicknote-statustbopenfloat', choice == 1);
		QNtb.updateKey('quicknote-tbcomposeopenfloat', choice == 1);
   
		QNtb.updateKey('quicknote-tbopentab', choice == 2);
		QNtb.updateKey('quicknote-tbopentabtb', choice == 2);
		QNtb.updateKey('quicknote-statustbopentab', choice == 2);
	},

	//Display QN icon on status bar 
	qnaddonstatustb: function(){
		var panel = document.getElementById("quicknote-statuspanel"); 
		if (panel != null) {
			if (QN_globalvar.qnprefs.getBoolPref("showinaddonsbar", false)) panel.hidden = false;
			else panel.hidden = true;
		}
	}
};

var init = function () {
	QNtb.initOverlay();
	QNtb.qntoolbarbuttontb();
	QNtb.qntoolbarbuttoncompose();
}

window.addEventListener("load", function () {init();}, false);
window.addEventListener("focus", QNtb.qnaddonstatustb, false);
window.addEventListener("keyup", QNtb.QN_onGlobalKeyUp, false);
