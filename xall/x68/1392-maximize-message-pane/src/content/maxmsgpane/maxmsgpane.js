/* constants for layout 
const kStandardPaneConfig = 0;
const kWidePaneConfig = 1;
const kVerticalPaneConfig = 2;
*/
var gMaxMsgPane = null;

function initMMP()
{
	gMaxMsgPane = new MaxMsgPane();
}
window.addEventListener("load", initMMP, false);

function finalizeMMP()
{
	if (gMaxMsgPane.isMaxMsgPane) {
		gMaxMsgPane.toggleMaxMessagePane();
	}
}
//Cancel maximization when Thunderbird is finished.
window.addEventListener("unload", finalizeMMP, false);

//Overwrite original function
var MMP_ThreadPaneDoubleClickOrg = ThreadPaneDoubleClick;
ThreadPaneDoubleClick = function()
{
  const nsMsgFolderFlags = Components.interfaces.nsMsgFolderFlags;
  if (IsSpecialFolderSelected(nsMsgFolderFlags.Drafts, true)) {
		MMP_ThreadPaneDoubleClickOrg.apply(this,arguments);
		return;
  } else if(IsSpecialFolderSelected(nsMsgFolderFlags.Templates, true)) {
		MMP_ThreadPaneDoubleClickOrg.apply(this,arguments);
		return;
  } else {
		if (gMaxMsgPane.maxByMsgDblClick) gMaxMsgPane.toggleMaxMessagePane();
		else MMP_ThreadPaneDoubleClickOrg.apply(this,arguments);
		return;
  }
}

function MaxMsgPane()
{
	this.colMsgPane = false; //wheather the message pane is collapsed or not in previous setting.
	this.isMaxMsgPane = false; //wheather the message pane is maximized.
	this.maxByMsgDblClick = false;
	this.collapseList = new Array();
	this.delaySettings = false;
	this.clickPosX = -1;
	this.clickPosY = -1;
	this.localeBundle = document.getElementById("MMP:localeBundle");
	this.needFPShow = false;
	this.folselDisabled = false;

	//IDs to be collapsed
	this.idList = [
			//"mailContent", 
			"folderpane_splitter",
			"threadpane-splitter",
			"messengerBox",
			"displayDeck",
			"threadContentArea",
			"messagepanebox",
			"folderPaneBox",
			"msgHeaderView",
			"attachmentView",
			"today-pane-panel" //lightning
	];

	this.usrIdList = [];

	this.init();
}

MaxMsgPane.prototype.initMenus = function()
{
	/* Removed TB68
	var aLabel = this.localeBundle.getString("mmp.layoutmenu.fpmin");
	this.addMenuItem("mmp_menu_fpmin", aLabel, "MMP:key_MinFolderPane",
							"MMP:FPShow", function(){gMaxMsgPane.toggleFolderPane();});
	aLabel = this.localeBundle.getString("mmp.layoutmenu.mpmax");
	this.addMenuItem("mmp_menu_mpmax", aLabel, "MMP:key_MaxMsgPane",
							"MMP:MPMax", function(){gMaxMsgPane.toggleMaxMessagePane();});
	*/
}

MaxMsgPane.prototype.init = function()
{							
	/* Removed TB68
	this.initMenus();
  */
	this.applyMMPSettings();
	
	//Keyboard shortcut
	var def_skey = "VK_F8";
	var def_mod = [false, false, false, false, true]; //[accel, alt, ctrl, meta, shift]
	this.setShortcutKey("MMP:key_MaxMsgPane","maxmsgpane.",def_skey,def_mod);
	def_skey = "VK_F9";
	def_mod = [false, false, false, false, false];
	this.setShortcutKey("MMP:key_MinFolderPane","maxmsgpane.fp_",def_skey,def_mod);

	this.addMMPCommand();

	/* Removed TB68
	var messagePaneLayout = document.getElementById("menu_MessagePaneLayout");
	//var popupNode = messagePaneLayout.firstChild;
	var popupNode = messagePaneLayout.getElementsByTagName("menupopup")[0];
	//popupNode.setAttribute("onpopupshown","gMaxMsgPane.initMessagePaneTogglingMenu();");
	popupNode.addEventListener("popupshown", function(){gMaxMsgPane.initMessagePaneTogglingMenu();}, false);
	*/
	
	var me = this;
	var ftFunc = function(event) {
		var mode = me.getCurrentTabMode();
		if (mode == "folder") {
			if (me.folselDisabled) {
				me.folselDisabled = false;
			} else {
				me.restoreMaxByFolderSelectionChange();
			}
		}
	}
	//var folderTree = GetFolderTree();
	var folderTree = document.getElementById("folderTree");
	folderTree.addEventListener("select",ftFunc,true);
	
	var fpFunc = function(event) {
		me.notifyLayoutChangeByEvent(event);
	}
	var splt = document.getElementById("folderpane_splitter");
	splt.addEventListener("command",fpFunc,true);

	var mpFunc = function(event) {
		me.notifyLayoutChangeByEvent(event);
	}
	//var msgPane = GetMessagePane();
	//var msgPane = document.getElementById("displayDeck");
	document.getElementById("messengerWindow").addEventListener("messagepane-hide",mpFunc,true);
	document.getElementById("messengerWindow").addEventListener("messagepane-unhide",mpFunc,true);

	var deckFunc = function(event) {
		me.restoreMaxByDeckChange(event);
	}
	var dispDeck = document.getElementById("displayDeck");
	dispDeck.addEventListener("select",deckFunc,true);
	this.notifyLayoutChange();

	var tabmail = document.getElementById("tabmail");
	var monitor = {
		onTabTitleChanged: function(aTab){},
		onTabSwitched: function(aTab, aOldTab){
			var mode = me.getCurrentTabMode();
			if (mode == "folder") {
				me.enableMMP("ALL");
				me.notifyLayoutChange();
				if (me.isMaxMsgPane) {
					//XXX:
					//max is restored when switching tab.
					//the following is a workaround
					me.keepMaximizing();
				} else if (me.needFPShow) {
					me.toggleFolderPane(true);
				}
				me.needFPShow = false;
			} else if (mode == "glodaSearch") {
				me.enableMMP("MP");
				if (me.isMaxMsgPane) {
					me.toggleMaxMessagePane();
					if (!document.getElementById("folderPaneBox").collapsed) {
						document.getElementById("folderPaneBox").collapsed = true;
						me.needFPShow = true;
					} else {
						me.needFPShow = false;
					}
				}
				me.folselDisabled = true;
				//document.getElementById("threadPaneBox").collapsed = false;
				//document.getElementById("threadContentArea").collapsed = false;
			} else { //mode == "message"
				me.enableMMP(null);
				me.folselDisabled = true;
			}
		}
	};
	tabmail.registerTabMonitor(monitor);

	var settingObserver = {
  	observe:function(aSubject, aTopic, aData){
    	if(aTopic == "mmp:setting_updated"){
				me.delaySettings = me.isMaxMsgPane;
				if (!me.delaySettings) me.applyMMPSettings();
				var restartFunc = function() {
					me.restartTB();
				}
				if (aData == "restart") setTimeout(restartFunc, 0); //wait for dialog closing
    	}
  	}
	}

	var settingObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	settingObserverService.addObserver(settingObserver, "mmp:setting_updated", false);
}

MaxMsgPane.prototype.addMenuItem = function(id, label, key, observe, cmd)
{
	/*
	//For menu bar
	var messagePaneLayout = document.getElementById("menu_MessagePaneLayout");
	if (messagePaneLayout) {
		//var popupNode = messagePaneLayout.firstChild;
		var popupNode = messagePaneLayout.getElementsByTagName("menupopup")[0];
		var itemNode = document.createElement( "menuitem" );
		itemNode.setAttribute("id", id);
		itemNode.setAttribute("type", "checkbox");
		itemNode.setAttribute("autoCheck", "false");
		itemNode.setAttribute("label",label);
		itemNode.setAttribute("key", key);
		itemNode.addEventListener("command", cmd, false);
		itemNode.setAttribute("observes", observe);

		popupNode.appendChild(itemNode);
	}
	
	//For app-menu TB68
	var panelView = document.getElementById("appMenu-preferencesLayoutView");
	if (panelView) {
		panelBox = panelView.firstChild;
		var itemNode = document.createElement("toolbarbutton");
		itemNode.setAttribute("id","app_"+id);
		itemNode.setAttribute("class","subviewbutton subviewbutton-iconic");
		itemNode.setAttribute("type","checkbox");
		itemNode.setAttribute("label",label);
		itemNode.setAttribute("key",key);
		itemNode.addEventListener("command", cmd, false);
		itemNode.setAttribute("observes", observe);
		
		panelBox.appendChild(itemNode);
	}
	*/
}

MaxMsgPane.prototype.applyMMPSettings = function()
{
	try {
		var usrIdListPref = gMMPPreferences.copyUnicharPref("maxmsgpane.usr_idlist", "");
		usrIdListPref = usrIdListPref.replace(/\s/g,"");
		this.usrIdList = usrIdListPref.split(",");
		if (usrIdListPref) this.idList = this.idList.concat(this.usrIdList);
	} catch(e) {
	}
	
	for (var i = 0; i < this.idList.length; i++) {
		var elem = new Array(2);
		elem[1] = true;
		this.collapseList[this.idList[i]] = elem;
	}
	
	this.collapseList["today-pane-panel"][1] = gMMPPreferences.getBoolPref("maxmsgpane.collapse_ltntoday", false);

	this.collapseList["folderPaneBox"][1] = gMMPPreferences.getBoolPref("maxmsgpane.collapse_folder", false);
	//this.collapseList["ltnModeBox"][1] = gMMPPreferences.getBoolPref("maxmsgpane.collapse_folder", false);

	this.collapseList["folderpane_splitter"][1] = false;
	this.collapseList["threadpane-splitter"][1] = false;
	
	//this.collapseList["searchBox"][1] = gMMPPreferences.getBoolPref("maxmsgpane.collapse_search", false);

	this.collapseList["msgHeaderView"][1] = gMMPPreferences.getBoolPref("maxmsgpane.collapse_header", false);

	this.collapseList["attachmentView"][1] = gMMPPreferences.getBoolPref("maxmsgpane.collapse_attach", false);
	
	this.collapseList["messagepanebox"][1] = false;
	
	this.maxByMsgDblClick = gMMPPreferences.getBoolPref("maxmsgpane.msg_dclicked", false);

	//Shortcut for Message Pane
	var	useShortcut = gMMPPreferences.getBoolPref("maxmsgpane.use_shortcut", true);
	document.getElementById("MMP:key_MaxMsgPane").setAttribute("disabled",(!useShortcut).toString());

	//Shortcut for Folder Pane
	useShortcut = gMMPPreferences.getBoolPref("maxmsgpane.fp_use_shortcut", true);
	document.getElementById("MMP:key_MinFolderPane").setAttribute("disabled",(!useShortcut).toString());

	//Close button for the folder pane
	/* Removed MMP 1.3.00. No space to put the close button
	if (gMMPPreferences.getBoolPref("maxmsgpane.fp_close_button", true))
	  document.getElementById("MMP_button-closefolder").setAttribute("collapsed","false");
	else
	  document.getElementById("MMP_button-closefolder").setAttribute("collapsed","true");
	*/
}

MaxMsgPane.prototype.setShortcutKey = function(keyId, prefix, def_skey, def_mod)
{
	var modifiers = new Array();
	if (gMMPPreferences.getBoolPref(prefix + 'accel_key', def_mod[0])) {
		modifiers.push('accel');
	}

	if (gMMPPreferences.getBoolPref(prefix + 'alt_key', def_mod[1])) {
	  modifiers.push('alt');
	}

	if (gMMPPreferences.getBoolPref(prefix + 'ctrl_key', def_mod[2])) {
	  modifiers.push('control');
	}

	if (gMMPPreferences.getBoolPref(prefix + 'meta_key', def_mod[3])) {
		  modifiers.push('meta');
	}

	if (gMMPPreferences.getBoolPref(prefix + 'shift_key', def_mod[4])) {
	  modifiers.push('shift');
	}

	var modifierString = modifiers.length > 0 ? modifiers.join(' ') : null;
	
	var skey = gMMPPreferences.copyUnicharPref(prefix + 'key', def_skey);

	if (modifierString)
	  document.getElementById(keyId).setAttribute('modifiers', modifierString);
	var keyAttr = 'key';
	if (skey.indexOf("VK_") == 0) keyAttr = 'keycode';
	document.getElementById(keyId).setAttribute(keyAttr, skey);
}

MaxMsgPane.prototype.addMMPCommand = function()
{
	var use_tsplitter = gMMPPreferences.getBoolPref("maxmsgpane.tsplitter", true);
	var hide_MP = gMMPPreferences.getBoolPref("maxmsgpane.tsplitter_hide", false);

	if (use_tsplitter) {
		var mouseEvent = gMMPPreferences.getIntPref("maxmsgpane.tsplitter_toggle_event", 1);
		var tsplitter = document.getElementById("threadpane-splitter");
		var cmd = hide_MP ? function(event){gMaxMsgPane.toggleFromTSplitter(event, true);}
		                  : function(event){gMaxMsgPane.toggleFromTSplitter(event, false);};
		if (mouseEvent == 0) {
			tsplitter.addEventListener("mousedown", function(event){gMaxMsgPane.getClickPos(event);}, false);
			tsplitter.addEventListener("click", cmd, false);
		} else if (mouseEvent == 1) {
			tsplitter.addEventListener("mousedown", function(event){gMaxMsgPane.getClickPos(event);}, false);
			tsplitter.addEventListener("dblclick", cmd, false);
		}
	}

	var use_fsplitter = gMMPPreferences.getBoolPref("maxmsgpane.fsplitter", true);
	if (use_fsplitter) {
		var mouseEvent = gMMPPreferences.getIntPref("maxmsgpane.fsplitter_toggle_event", 1);
		var fsplitter = document.getElementById("folderpane_splitter");
		if (mouseEvent == 0) {
			fsplitter.addEventListener("mousedown", function(event){gMaxMsgPane.getClickPos(event);}, false);
			fsplitter.addEventListener("click", function(event){gMaxMsgPane.toggleFromFSplitter(event);}, false);
		} else if (mouseEvent == 1) {
			fsplitter.addEventListener("mousedown", function(event){gMaxMsgPane.getClickPos(event);}, false);
			fsplitter.addEventListener("dblclick", function(event){gMaxMsgPane.toggleFromFSplitter(event);}, false);
		}
	}

	var useHdr = gMMPPreferences.getBoolPref("maxmsgpane.hdr", true);
	if (useHdr) {
		var hdr_view = document.getElementById("msgHeaderView");
		var setInt = gMMPPreferences.getIntPref("maxmsgpane.hdr_toggle_event", 1);
		if (setInt == 0) {
			hdr_view.addEventListener("mousedown", function(event){gMaxMsgPane.getClickPos(event);}, false);
			hdr_view.addEventListener("click", function(event){gMaxMsgPane.toggleFromHdrView(event);}, false);
		} else if (setInt == 1) {
			hdr_view.addEventListener("mousedown", function(event){gMaxMsgPane.getClickPos(event);}, false);
			hdr_view.addEventListener("dblclick", function(event){gMaxMsgPane.toggleFromHdrView(event);}, false);
		}
	}
}

MaxMsgPane.prototype.restoreMaxByDeckChange = function(aEvent)
{
	var targetId = aEvent.target.id;
	if (targetId != "displayDeck") return;

	if (this.isMaxMsgPane && aEvent.target.selectedPanel.id != "threadPaneBox") {
	  this.toggleMaxMessagePane();
	}	else {
		this.notifyLayoutChange();
	}
}

MaxMsgPane.prototype.notifyLayoutChangeByEvent = function(aEvent)
{
	//var targetId = aEvent.target.id;
//	if (targetId != "folderPaneBox" && targetId != "messagepanebox")
	//  return;

//	if (aEvent.attrName == "collapsed") this.notifyLayoutChange();
	this.notifyLayoutChange();

}

//search box, attachment view, message header are shown when the message selection
//is changed with maximized.
//so these component collapsed again if needed.
MaxMsgPane.prototype.hideComponentAgain = function()
{
	if (this.isMaxMsgPane) {
		//attachments view
		var	collapse_attach = gMMPPreferences.getBoolPref("maxmsgpane.collapse_attach", false);
		var attachBox = document.getElementById("attachmentView");
		if (collapse_attach){
			attachBox.collapsed = true;
		} else {
			try {
				if (gDBView) {
					var msgKey = gDBView.keyForFirstSelectedMessage;
					var msgHdr = gDBView.hdrForFirstSelectedMessage;
					if (msgKey && msgHdr) {
						//var hasAttach = msgHdr.folder.getMsgDatabase(msgWindow).HasAttachments(msgKey);
						var hasAttach = msgHdr.folder.msgDatabase.HasAttachments(msgKey);
						attachBox.collapsed = !hasAttach;
					}
				}
			} catch(e) {
				attachBox.collapsed = true;
			}
		}
	
		//headers view
		var collapse = gMMPPreferences.getBoolPref("maxmsgpane.collapse_header", false);
		var header = document.getElementById("msgHeaderView");
		if (header.collapsed != collapse) header.collapsed = collapse;
	}
}

MaxMsgPane.prototype.restoreMaxByFolderSelectionChange = function()
{
	if (!this.isMaxMsgPane) return; 

	var	restore = gMMPPreferences.getBoolPref("maxmsgpane.folsel_restore", false);
	if (restore) {
		this.toggleMaxMessagePane();
	} else {
		//XXX:
		//max is restored when changing folder selection.
		//the following is a workaround
		this.keepMaximizing();
	}
}

MaxMsgPane.prototype.keepMaximizing = function()
{
	if (!document.getElementById("displayDeck").collapsed) {
		document.getElementById("displayDeck").collapsed = true;
		GetMessagePane().flex = 1;
		this.notifyLayoutChange();
	}	
}

MaxMsgPane.prototype.getClickPos = function(aEvent)
{
	this.clickPosX = aEvent.screenX;
	this.clickPosY = aEvent.screenY;
}

MaxMsgPane.prototype.doMMPCommand = function(value)
{
	switch (value) {
	  case "MP": this.toggleMaxMessagePane(); break;
	  case "FP": this.toggleFolderPane(); break;
	  case "TP": MsgToggleMessagePane(); break;
	  default: break;
	}

	return;
}

MaxMsgPane.prototype.toggleMaxMessagePane = function()
{
	var paneConfig = gMMPPreferences.getIntPref("mail.pane_config.dynamic", kStandardPaneConfig);
	var toggled = false;
	var me = this;
	
	//toggle
	var hideFunc = function() {
		me.hideComponentAgain();
	}
	if (this.isMaxMsgPane) {
		try {
			var browser = document.getElementById("messagepane");
			browser.removeEventListener("load", hideFunc, true);
		} catch(e) {
		}

		toggled = this.restorePanes();
		SetFocusThreadPane();
					
	} else {
		toggled = this.maximizeMessagePane();
		if (toggled) {
			if (!this.colMsgPane) {
				SetFocusMessagePane();
				GetMessagePaneFrame().focus();
			} else {
				//wait until the message pane is rebuilt.
				var func = function() {
					SetFocusMessagePane();
					GetMessagePaneFrame().focus();
				}
				setTimeout(func, 500);
			}
	
			try {
				var browser = document.getElementById("messagepane");
				browser.addEventListener("load", hideFunc, true);
			} catch(e) {
			}
		}
	}

	if (toggled) {
		//sync Lightning's elements
		var ltnToday = document.getElementById("today-pane-panel");
		var ltnTodaySplit = document.getElementById("today-splitter");
		if (ltnToday) {
			if (ltnToday.collapsed) {
				if (ltnTodaySplit) ltnTodaySplit.setAttribute("state", "collapsed");
			} else {
				if (ltnTodaySplit) ltnTodaySplit.removeAttribute("state");
			}
		}
		this.notifyLayoutChange();
	}
}

MaxMsgPane.prototype.outputMessageToStatusBar = function(str)
{
	document.getElementById("statusText").setAttribute("label",str);
}

MaxMsgPane.prototype.disableMessagePaneToggling = function(disable)
{
	if (disable) {
		document.getElementById("key_toggleMessagePane").setAttribute("disabled",true);
		document.getElementById("MMP:MPShow").setAttribute("disabled",true);
		document.getElementById("MMP:MPMin").setAttribute("disabled",true);
	} else {
		document.getElementById("key_toggleMessagePane").removeAttribute("disabled");
		document.getElementById("MMP:MPShow").removeAttribute("disabled");
		document.getElementById("MMP:MPMin").removeAttribute("disabled");
	}

	try {
		//the following does not exist in Lightning's both calendar and task modes (from 0.8)
		if (disable) {
			document.getElementById("menu_showMessage").setAttribute("disabled",true);
		} else {
			document.getElementById("menu_showMessage").removeAttribute("disabled");
		}
	} catch(e) {
		dump("menu_showMessage does not exist.\n");
	}
}

MaxMsgPane.prototype.initMessagePaneTogglingMenu = function()
{
	if (this.isMaxMsgPane) {
		document.getElementById("menu_showMessage").setAttribute("disabled","true");
	} else {
		document.getElementById("menu_showMessage").removeAttribute("disabled");
	}
}

MaxMsgPane.prototype.toggleFromHdrView = function(aEvent)
{
//	if (aEvent.which != 1) return; //left-click only
	
	if (aEvent.which == 3) return; //left/middle-click only
	if (gMMPPreferences.getBoolPref("maxmsgpane.forbid_lmb_on_hdr", false) && aEvent.which ==1) return;

	if (aEvent.originalTarget.localName == "image") return; //+ was clicked
	if (aEvent.originalTarget.localName == "menuitem") return; //context menu item was clicked
	if (aEvent.originalTarget.localName == "button") return; //edit button (draft message)
	if (aEvent.originalTarget.localName == "toolbarbutton") return; //edit button (draft message)
	if (aEvent.originalTarget.localName == "label") return;
/*
	//URL of RSS message
	if (aEvent.originalTarget.localName == "label"
		&& aEvent.originalTarget.getAttribute("class").search(/headerValueUrl/) != -1) return;
  //more link
	if (aEvent.originalTarget.localName == "label"
		&& aEvent.originalTarget.getAttribute("class") == "moreIndicator") return;
	if (aEvent.originalTarget.localName == "label"
		&& aEvent.originalTarget.getAttribute("class") == "messageIdDisplayButton") return;
*/
	var x = aEvent.screenX;
	var y = aEvent.screenY;
	if (this.clickPosX != x || this.clickPosY != y) return;

	this.doMMPCommand("MP");
	return;
}

MaxMsgPane.prototype.toggleFromTSplitter = function(aEvent, hideMP)
{
	if (aEvent.which == 3) return; //left/middle-click only
	var x = aEvent.screenX;
	var y = aEvent.screenY;
	if (this.clickPosX != x || this.clickPosY != y) return;
	
	if (hideMP) {
		if (!this.isMaxMsgPane) this.doMMPCommand("TP");
	} else {
		this.doMMPCommand("MP");
	}
}

MaxMsgPane.prototype.toggleFromFSplitter = function(aEvent)
{
	if (aEvent.which == 3) return; //left/middle-click only
	var x = aEvent.screenX;
	var y = aEvent.screenY;
	if (this.clickPosX != x || this.clickPosY != y) return;
	this.doMMPCommand("FP");
}

MaxMsgPane.prototype.maximizeMessagePane = function(force)
{
	var paneConfig = gMMPPreferences.getIntPref("mail.pane_config.dynamic", kStandardPaneConfig);
	var threadPaneBox = document.getElementById("threadPaneBox");

	//unable to maximize if folderpane exists on wide pane layout
	if (paneConfig == kWidePaneConfig && !this.collapseList["folderPaneBox"][1]) {
		if (!document.getElementById("folderPaneBox").collapsed)
		  return false;
	}

	//other deck is selected
	if (document.getElementById("displayDeck").selectedPanel != threadPaneBox) return false;

	this.updateCollapseList(paneConfig);

	GetMessagePane().flex = 1;
	document.getElementById("mailContent").setAttribute("flex","1");

	this.collapse(true);
	if (paneConfig == kWidePaneConfig)
	  document.getElementById("mailContent").setAttribute("flex","0");

	try {
		if (IsMessagePaneCollapsed()) {
			MsgToggleMessagePane();
			this.colMsgPane = true;
		} else {
			this.colMsgPane = false;
		}
	} catch(e) {
	};

	this.isMaxMsgPane = true;

	return true;
}

MaxMsgPane.prototype.updateCollapseList = function(paneConfig)
{
	//save current status
	var id;
	for ( id in this.collapseList ){
		var elem = this.collapseList[id];
		if (!elem[1]) continue;
		try {
			elem[0] = document.getElementById(id).collapsed == true;
		} catch(e) {
		}
	}

	if (paneConfig == kWidePaneConfig) {
		//this.collapseList["mailContent"][1] = false;
		this.collapseList["messengerBox"][1] = true;
		this.collapseList["displayDeck"][1] = false;
	} else if (paneConfig == kVerticalPaneConfig){
		this.collapseList["threadContentArea"][1] = true;
//		this.collapseList["mailContent"][1] = false;
		this.collapseList["messengerBox"][1] = false;
		this.collapseList["displayDeck"][1] = false;
	} else if (paneConfig == kStandardPaneConfig) {
		this.collapseList["messengerBox"][1] = false;
//		this.collapseList["mailContent"][1] = false;
		this.collapseList["displayDeck"][1] = true;
	} else {
		this.collapseList["messengerBox"][1] = (this.usrIdList.indexOf("messengerBox") != -1);
		this.collapseList["displayDeck"][1] = (this.usrIdList.indexOf("displayDeck") != -1);
	}
}

MaxMsgPane.prototype.collapse = function(maximize)
{
	var index = maximize ? 1 : 0;
	var id;
	for (id in this.collapseList) {
		if (!this.collapseList[id][1]) continue;
		try {
			document.getElementById(id).collapsed = this.collapseList[id][index];
		} catch(e) {
		}
	}
}

MaxMsgPane.prototype.toggleFolderPane = function(forceShow)
{
	//var ltn = document.getElementById("ltnModeBox");
	var fp = document.getElementById("folderPaneBox");
	//var focusedPane = WhichPaneHasFocus();
	var focusedPane = window.WhichPaneHasFocus ? WhichPaneHasFocus() : gFolderDisplay.focusedPane;
	//var folderTree = GetFolderTree();
	var folderTree = document.getElementById("folderTree");
	//var col = ltn ? ltn.collapsed : fp.collapsed;
	var col = fp.collapsed;

	if (col) {
		//if (ltn) ltn.collapsed = false;
		fp.collapsed = false;
		document.getElementById("folderpane_splitter").setAttribute("state", "");
		//SetFocusFolderPane();
		folderTree.focus();
	} else {
		//if (ltn) ltn.collapsed = true;
		fp.collapsed = true;
		document.getElementById("folderpane_splitter").setAttribute("state", "collapsed");
		if (focusedPane == folderTree) SetFocusThreadPane();
	}

	this.notifyLayoutChange();
}

MaxMsgPane.prototype.restorePanes = function()
{
	this.isMaxMsgPane = false;
	this.collapse(false);
	//XXX:
	//sometime TB restores max (folder change, tab switch).
	//failed to restore thread pane in the case.
	//the following is a workaround
	//if (document.getElementById("threadContentArea").collapsed) {
	//	document.getElementById("threadContentArea").collapsed = false;
	//}
	
	document.getElementById("mailContent").setAttribute("flex","1");
	
	try {
		if (this.colMsgPane) MsgToggleMessagePane();
	} catch(e) {
	};
	
	var paneConfig = gMMPPreferences.getIntPref("mail.pane_config.dynamic", kStandardPaneConfig);
	switch (paneConfig) {
	  case kStandardPaneConfig:
		GetMessagePane().flex = 1;
		break;
	  case kWidePaneConfig:
		//GetMessagePane().flex = null;
		//document.getElementById("mailContent").setAttribute("collapsed","false");
		break;
	  case kVerticalPaneConfig:
		//GetMessagePane().flex = null;
		break;
	  default:
		break;
	}

	try {
		if (gDBView) {
			var msgKey = gDBView.keyForFirstSelectedMessage;
			var msgHdr = gDBView.hdrForFirstSelectedMessage;
			if (msgKey && msgHdr) {
				var hasAttach = msgHdr.folder.getMsgDatabase(msgWindow).HasAttachments(msgKey);
				document.getElementById("attachmentView").collapsed = !hasAttach;
			}
		}
	} catch(e) {
	}
	
	if (this.delaySettings) {
		this.applyMMPSettings();
		this.delaySettings = false;
	}

	return true;
}

MaxMsgPane.prototype.changeLayout = function(newLayout)
{
	if (this.isMaxMsgPane) {
		this.toggleMaxMessagePane(); //Cancel maximization
		ChangeMailLayout(newLayout);
		this.toggleMaxMessagePane(); //Maximize again
	} else {
		ChangeMailLayout(newLayout);
	}
}

MaxMsgPane.prototype.notifyLayoutChange = function()
{
	if (this.isMaxMsgPane) {
		document.getElementById("MMP:MPMax").setAttribute("checked", "true");
	} else {
		document.getElementById("MMP:MPMax").removeAttribute("checked");
	}

	var fp = document.getElementById("folderPaneBox");
	//var ltn = document.getElementById("ltnModeBox");
	//var chk = ltn ? ltn.collapsed : fp.collapsed;
	var chk = fp.collapsed;
	if (chk) {
		document.getElementById("MMP:FPShow").removeAttribute("checked");
		document.getElementById("MMP:FPMin").setAttribute("checked", "true");
	} else {
		document.getElementById("MMP:FPShow").setAttribute("checked", "true");
		document.getElementById("MMP:FPMin").removeAttribute("checked");
	}
	
	//chk = GetMessagePane().collapsed;
	if (!gMessageDisplay.visible) {
		document.getElementById("MMP:MPShow").removeAttribute("checked");
		document.getElementById("MMP:MPMin").setAttribute("checked", "true");
	} else {
		document.getElementById("MMP:MPShow").setAttribute("checked", "true");
		document.getElementById("MMP:MPMin").removeAttribute("checked");
	}
	switch (document.getElementById("displayDeck").selectedPanel.id) {
	  case "threadPaneBox": //Thread Pane
			this.disableMessagePaneToggling(this.isMaxMsgPane);
			//document.getElementById("MMP:MPMax").setAttribute("disabled","false");
			document.getElementById("MMP:MPMax").removeAttribute("disabled");
			break;
	  case "accountCentralBox": //Account Central
			this.disableMessagePaneToggling(true);
			document.getElementById("MMP:MPMax").setAttribute("disabled","true");
			break;
	  default: //Other deck
			this.disableMessagePaneToggling(true);
			document.getElementById("MMP:MPMax").setAttribute("disabled","true");
			break;
	}	
}

MaxMsgPane.prototype.restartTB = function()
{
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	var	warn = gMMPPreferences.getBoolPref("maxmsgpane.warn_restart", true);

  if (warn) {
	  var checkValue = {value:false};
    var buttonPressed = promptService.confirmEx(window, 
              this.localeBundle.getString("mmp.confirm_title"),
              this.localeBundle.getString("mmp.confirm_msg"),
              (promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0) +
              (promptService.BUTTON_TITLE_CANCEL * promptService.BUTTON_POS_1),
              this.localeBundle.getString("mmp.restart_button"),
              null, null,
              this.localeBundle.getString("mmp.not_show"),
              checkValue);
		if (buttonPressed != 0) {
    	return;
    }
    if (checkValue.value) {
	    gMMPPreferences.setBoolPref("maxmsgpane.warn_restart", false);
    }
	}
	
	var appStartup = Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(Components.interfaces.nsIAppStartup);
	appStartup.quit(appStartup.eAttemptQuit | appStartup.eRestart);
}

MaxMsgPane.prototype.getCurrentTabMode = function()
{
	var type = null;
	var tabmail = document.getElementById("tabmail");
	//if (tabmail && tabmail.tabContainer.selectedItem) {
	if (tabmail && tabmail.tabContainer.selectedIndex >= 0) {
		var tab = tabmail.tabInfo[tabmail.tabContainer.selectedIndex];
		type = tab.mode.type;
		//if (type == "glodaSearch" && (tab.query || tab.searcher || tab.collection)) {
		if (type == "glodaSearch" && tab.collection) { //distinguish gloda search result
			type = "glodaSearch-result";
		}
	}
		
	return type;
}

MaxMsgPane.prototype.enableMMP = function(op)
{
	if (op == "ALL") {
		document.getElementById("MMP:MPMax").removeAttribute("disabled");
		document.getElementById("MMP:MPMin").removeAttribute("disabled");
		document.getElementById("MMP:MPShow").removeAttribute("disabled");
		document.getElementById("MMP:FPShow").removeAttribute("disabled");
		document.getElementById("MMP:FPMin").removeAttribute("disabled");
	} else if (op == "MP") {
		document.getElementById("MMP:MPMax").removeAttribute("disabled");
		document.getElementById("MMP:MPMin").removeAttribute("disabled");
		document.getElementById("MMP:MPShow").removeAttribute("disabled");
		document.getElementById("MMP:FPShow").setAttribute("disabled", true);
		document.getElementById("MMP:FPMin").setAttribute("disabled", true);
	} else if (op == "FP") {
		document.getElementById("MMP:MPMax").setAttribute("disabled", true);
		document.getElementById("MMP:MPMin").setAttribute("disabled", true);
		document.getElementById("MMP:MPShow").setAttribute("disabled", true);
		document.getElementById("MMP:FPShow").removeAttribute("disabled");
		document.getElementById("MMP:FPMin").removeAttribute("disabled");
	} else {
		document.getElementById("MMP:MPMax").setAttribute("disabled", true);
		document.getElementById("MMP:MPMin").setAttribute("disabled", true);
		document.getElementById("MMP:MPShow").setAttribute("disabled", true);
		document.getElementById("MMP:FPShow").setAttribute("disabled", true);
		document.getElementById("MMP:FPMin").setAttribute("disabled", true);
	}
	
	if (document.getElementById("MMP:MPMax").getAttribute("disabled") &&
			document.getElementById("MMP:MPShow").getAttribute("disabled") &&
			document.getElementById("MMP:FPShow").getAttribute("disabled")) {
		document.getElementById("MMP:ALL").setAttribute("disabled", true);		
	} else {
		document.getElementById("MMP:ALL").removeAttribute("disabled");
	}
	
}
