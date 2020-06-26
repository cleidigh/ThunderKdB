/* *******************
 * browser.js
 * Firefox/Mozilla specific code for QuickNote   <http://quicknote.mozdev.org/>
 * Used in overlay.xul (F/M specific overlays)
 * Requires overlay.js (common overlay code)
 *
 * Author: Jed Brown (quicknote@jedbrown.net)
 * Contributor(s):
 *   Nickolay Ponomarev (asqueella@gmail.com)
 *   Someone from Download Manager Tweak <dmextension.mozdev.org> team
 ******************** */

var QNbrowser = {

	initOverlay : function(){
		var menu = document.getElementById("contentAreaContextMenu");
		menu.addEventListener("popupshowing",QNbrowser.contextPopupShowing,false);
		QNbrowser.autoStart();
		QNover.updateKeys();
	},

	qntoolbarbutton: function() {
		window.removeEventListener('load', QNbrowser.qntoolbarbutton, false);
		var firstRun = QN_globalvar.qnprefs.getBoolPref('firststart');
		if (firstRun) {
			var myId = "quicknote-button";	// ID of button to add
			var afterId = "search-container";		// ID of element to insert after
			var toolBar = document.getElementById("nav-bar");
			var curSet = toolBar.currentSet.split(",");

			if (curSet.indexOf(myId) == -1) {
				var pos = curSet.indexOf(afterId) + 1 || curSet.length;
				var set = curSet.slice(0, pos).concat(myId).concat(curSet.slice(pos));

				toolBar.setAttribute("currentset", set.join(","));
				toolBar.currentSet = set.join(",");
				document.persist(toolBar.id, "currentset");
			}
			QN_globalvar.qnprefs.setBoolPref('firststart', false);
			QN_globalvar.qnprefs.setBoolPref('showinaddonsbar', false);
		}
		//Compare addon version
		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		AddonManager.getAddonByID("{C0CB8BA3-6C1B-47e8-A6AB-1FAB889562D9}", function(addon) {
			Components.utils.import("resource://gre/modules/Services.jsm");
			var prevVersion = QN_globalvar.qnprefs.getCharPref('lastVersion');
			if (Services.vc.compare(prevVersion, addon.version) < 0) {
				var url = "chrome://quicknote/content/update.xhtml";
				gBrowser.loadOneTab(url, { relatedToCurrent: false, inBackground: false });
				QN_globalvar.qnprefs.setCharPref('lastVersion', addon.version);
			}
		});
	},

	autoStart : function() {
		if(QN_globalvar.qnprefs.getBoolPref("autostart")){
				QNbrowser.openQuickNote(true);
		}
	},

	// Opens QuickNote depending on set pref
	openQuickNote : function(aForceOpen, aText) {
		var openMethod = QN_globalvar.qnprefs.getIntPref("openqn");
		if(openMethod==0) {toggleSidebar("viewQuickNoteSidebar", aForceOpen);}
		if(openMethod==1) {
		if(QNover.getQNWinByType("quicknote:mainwindow")!=null){QNover.getQNWinByType("quicknote:mainwindow").close();}
		else{QNover.openQNFloat(aText);}
		}
		if(openMethod==2) {var nt=0
		for(var i=0;i < gBrowser.browsers.length;i++) {
			if (gBrowser.browsers[i].contentDocument.location=="chrome://quicknote/content/quicknote.xul") {nt=1;gBrowser.removeTab(gBrowser.mTabContainer.childNodes[i])}
		}
		if(nt==0){QNbrowser.openQuickNoteInTab()}
		}
	},

	// Open QuickNote as a tab
	openQuickNoteInTab : function(aDoc){
		if(QNover.getQNWinByType("quicknote:mainwindow")!=null){QNover.getQNWinByType("quicknote:mainwindow").close();};
		if(document.getElementById('viewQuickNoteSidebar').hasAttribute('checked')){toggleSidebar();};
		var nt=0
		for(var i=0;i < gBrowser.browsers.length;i++) {
			if (gBrowser.browsers[i].contentDocument.location=="chrome://quicknote/content/quicknote.xul") {nt=nt+1;
					gBrowser.mTabContainer.childNodes[i].id="QnTab"
					gBrowser.selectedTab = document.getElementById("QnTab");
					gBrowser.mTabContainer.childNodes[i].id=null
			}
		}
		// If no QuickNote tab is open, then create one
		if (nt==0){
			var QuickNoteTab = gBrowser.addTab('chrome://quicknote/content/quicknote.xul');
			if (!QN_globalvar.qnprefs.getBoolPref("tabBackground"))
				 gBrowser.selectedTab = QuickNoteTab;
			else
				var backgroundTab = gBrowser.selectedTab;
				gBrowser.selectedTab = backgroundTab;
		}
	},

	// Called before closing sidebar. Used to show the save confirmation dialog.
	// Throws an exception if closing was cancelled.
	onBeforeToggleSidebar : function(){
		if(QNover.getQNWinByType("quicknote:mainwindow")!=null){QNover.getQNWinByType("quicknote:mainwindow").close();};
	 for(var i=0;i < gBrowser.browsers.length;i++) {
			if (gBrowser.browsers[i].contentDocument.location=="chrome://quicknote/content/quicknote.xul") {gBrowser.removeTab(gBrowser.mTabContainer.childNodes[i])}
	 }
		if(document.getElementById('viewQuickNoteSidebar').hasAttribute('checked'))
			return; // the sidebar is being opened

		QNqn.setupDocument(document.getElementById("sidebar").contentDocument);
		if(!QNqn.onClose())
		{
			var stringBundle=document.getElementById("qnstrings");
			throw stringBundle.getString("throw.dontclose");
		}
	},

	ActivateQNTab : function() {
		var tempTab = gBrowser.mTabContainer.firstChild;
		var index = 0;
		while (tempTab) {
			if (gBrowser.browsers[index].contentDocument.location=="chrome://quicknote/content/quicknote.xul") {
				gBrowser.selectedTab = tempTab;
				return true;
			}
			index ++;
			tempTab = tempTab.nextSibling;
		}
		return false;
	},

	SendSelectedTextToQN : function(aText) {
		// QuickNote tab that catches the text:
		var tabtosendto = QN_globalvar.qnprefs.getIntPref("totabint");
		// First, check for sidebar in current window
		var qndoc = QNqn.FindQNSidebar(document);
		// Then check for an existing floating window
		if(!qndoc) {
			qndoc = QNqn.FindQNFloat();
			if(qndoc) {
				var qnWindow = qndoc.defaultView;
				qnWindow.focus();
			}
		}
		// Finally try to find a QN tab in current window
		if(!qndoc) {
			qndoc = QNqn.FindQNTab(document);
			if(qndoc) {
				QNbrowser.ActivateQNTab(document)
			}
		}

		if(qndoc) {
			QNqn.setupDocument(qndoc);
			QNqn.catchText(aText);

		} else {
			QNover.sendText(aText);
			QNbrowser.openQuickNote(true);
		}

	},

// determine which context menu items are shown
	contextPopupShowing : function() {
		QNover.updateKeys();
		var isTextSelectionQN = false;

		if(gContextMenu)
			isTextSelectionQN = (gContextMenu.isTextSelected || gContextMenu.onTextInput&&gContextMenu.target.value.substring(gContextMenu.target.selectionStart,gContextMenu.target.selectionEnd)!="");

		var qnmenuitem = document.getElementById("quicknote-contexttab");
		if(qnmenuitem)
			qnmenuitem.hidden = !isTextSelectionQN;

		var isTextSelectionLinkQN = false;

		if(gContextMenu)
			isTextSelectionLinkQN = gContextMenu.onLink;

		var qnmenuitemlink = document.getElementById("quicknote-contexttablink");
		if(qnmenuitemlink)
			qnmenuitemlink.hidden = !isTextSelectionLinkQN;
	},

	QN_onGlobalKeyPress : function(event) {
		if((event.keyCode == event.DOM_VK_F7) && event.ctrlKey== true) {QNbrowser.openQuickNote();}
	}

};

var init = function ()
{
	QNbrowser.initOverlay();
	QNbrowser.qntoolbarbutton();
}

window.addEventListener("load", function () {init();}, false);
window.addEventListener("keyup", QNbrowser.QN_onGlobalKeyPress, false);