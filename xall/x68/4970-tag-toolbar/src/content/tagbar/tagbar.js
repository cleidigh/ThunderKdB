//class TagToolbar
function TagToolbar(parentWin)
{
	this.localeBundle = document.getElementById("TTBBundle");
	this.messengerBundle = document.getElementById("bundle_messenger");
	var menuLabel = this.messengerBundle.getString("mailnews.tags.remove");
	var menu = document.getElementById("tag-toolbar-remove-tag");
	if (menu) menu.setAttribute("label", menuLabel);
	this.openedMenuButton = null;
	//this.memToolbarCollapsed = false;
	this.disabled = false;
	this.parent = parentWin;
	if (document.getElementById("mail-bar3")) {
		this.mailBar = "mail-bar3";
	} else {
		this.mailBar = "composeToolbar2";
	}
	this.curcat = 0;
	this.catcol = false;
	this.akey = true;
	this.dispMode = "text";
	
	//this.mailToolbox = "mail-toolbox";
	this.toolbarManager = new TTBToolbarManager("mail-toolbox");
	//display options
	this.inToolbar = false;
	//this.recallTagToolbarPersist();

	this.searching = false;
	this.searchResult = "";
	this.categoryManager = null;
	this.waitingForFolderUpdate = false;
	this.additionalToolbars = new Array();
	this.prevWidth = 0;
}

TagToolbar.prototype.recallTagToolbarPersist = function()
{
	var topContainer = document.getElementById("tag-toolbar-container");
	if (topContainer) {
		if (this.inToolbar) return;
		this.inToolbar = true;
		if (this.parent) {
			this.curcat = this.parent.gTagToolbar.curcat;
			this.catcol = this.parent.gTagToolbar.catcol;
			this.akey = this.parent.gTagToolbar.akey;
			this.dispMode = this.parent.gTagToolbar.dispMode;
		} else {
			this.curcat = gTTBPreferences.getIntPref("ttb.curcat",0);
			//this.curcat = parseInt(topContainer.getAttribute("curcat"));
			this.catcol = gTTBPreferences.getBoolPref("ttb.catcol",false);
			//this.catcol = topContainer.getAttribute("catcol") == "true";
			this.dispMode = gTTBPreferences.copyUnicharPref("ttb.dispmode","text");
			//this.dispMode = topContainer.getAttribute("dispMode");
			this.akey = gTTBPreferences.getBoolPref("ttb.akey",true);
			//this.akey = topContainer.getAttribute("akey") == "true";
		}
	} else {
		this.inToolbar = false;
	}
/*
	var toolbar = document.getElementById("tag-toolbar");
	if (toolbar) this.memToolbarCollapsed = toolbar.collapsed;
*/
}

TagToolbar.prototype.buildCatList = function()
{
	var menulist = document.getElementById("TTBCatList");
	var menupopup = document.getElementById("tag-toolbar-swcat-popup");
	if (!menulist) {
		var topContainer = document.getElementById("tag-toolbar-container");
		var container = document.getElementById("tag-toolbar-container-box");
		if (!container) return;
		for (var i = container.childNodes.length; i > 0; --i) {
			var node = container.childNodes[i];
			if (node) {
				node.removeChild(node.firstChild);
				container.removeChild(node);
			}
		}
		menulist = document.createElement("menulist");
		menulist.setAttribute("id", "TTBCatList");
		menulist.setAttribute("oncommand", "gTagToolbar.changeCat(event.target.value)");
		menulist.setAttribute("tooltiptext", this.localeBundle.getString("tagbar.cat_tip"));
		topContainer.insertBefore(menulist, container);
		if (this.catcol) menulist.setAttribute("collapsed", "true");
		else menulist.removeAttribute("collapsed");

		var me = this;
		var func = function(event) {
			me.onScrollCatList(event);
		}
		menulist.addEventListener("DOMMouseScroll", func, true);
	}
	menulist.removeAllItems();
	var menuName = this.localeBundle.getString("tagbar.cat_all");
	menulist.appendItem(menuName, "catall");

	var childMenus = menupopup.childNodes;
	var menuNum = childMenus.length;
	for (var i=menuNum-1; i>=0; i--) {
		var node = childMenus[i];
		if (node) menupopup.removeChild(node);
	}
	
	//Category All
	var menuitem = document.createElement("menuitem");
	menuitem.setAttribute("id", "tag-toolbar-swcat-popup0");
	menuitem.setAttribute("label", menuName);
	menuitem.setAttribute("type", "radio");
	menuitem.setAttribute("name", "TTBCatType");
	menuitem.setAttribute("value", "catall");
	menuitem.setAttribute("catno", "0");
	menuitem.setAttribute("catkey", "catall");
	menupopup.appendChild(menuitem);
	
	this.categoryManager = new TTBCategoryManager();
	var catsNum = this.categoryManager.size();
	var catno = 1;
	for (var i=0; i<catsNum; i++) {
		var cat = this.categoryManager.getCategoryAt(i);
		if (cat.name == "") continue;
		
		menulist.appendItem(cat.name, cat.key);
		menuitem = menuitem.cloneNode(true);
		menuitem.setAttribute("id", "tag-toolbar-swcat-popup"+catno);
		menuitem.setAttribute("label", cat.name);
		menuitem.setAttribute("value", cat.key);
		menuitem.setAttribute("catno", catno.toString());
		menupopup.appendChild(menuitem);
		catno++;
	}
	
	var separator = document.createElement("menuseparator");
	menulist.menupopup.appendChild(separator);
	menuName = this.localeBundle.getString("tagbar.edit_cats");
	var editItem = menulist.appendItem(menuName, "TTBEdit");
	var catIndex = this.curcat;
//	if (catsStr == "" || catIndex > this.catsArray.length) catIndex = 0; //invalid catIndex
	if (catsNum <= 0  || catsNum < catIndex) catIndex = 0; //invalid catIndex
	this.changeCatByIndex(catIndex);
	//this.recallCategoryForFolder();
}

TagToolbar.prototype.onCategoryPopupShowing = function(target)
{
	var childMenus = target.childNodes;
	var menuNum = childMenus.length;
	for (var i=0; i<menuNum; i++) {
		var node = childMenus[i];
		if (i == this.curcat) node.setAttribute("checked", "true");
		else node.removeAttribute("checked");
	}
}

TagToolbar.prototype.changeCat = function(value)
{
	if (value == "TTBEdit") {
		this.editCat();
	} else {
		var menulist = document.getElementById("TTBCatList");
		this.curcat = menulist.selectedIndex;
		this.rememberCategoryForFolder();
		this.initTagToolbarContainer();
	}
}

TagToolbar.prototype.changeCatByIndex = function(index)
{
	if (index < 0) index = 0;
	var menulist = document.getElementById("TTBCatList");
	try {
		menulist.selectedIndex = index;
		if (!menulist.selectedItem
			|| menulist.selectedItem.getAttribute("value") == "TTBEdit"){
			index = 0;
			menulist.selectedIndex = 0;
		}
	} catch(e) {
		index = 0;
		menulist.selectedIndex = 0;
	}
	this.curcat = index;
	this.rememberCategoryForFolder();
	this.initTagToolbarContainer();
}

TagToolbar.prototype.changeCatByKey = function(key)
{
	if (key != "catall" && !this.categoryManager.getCategoryByKey(key)) {
		return;
	}
	var menulist = document.getElementById("TTBCatList");
	menulist.value = key;
	this.changeCat("");
}

TagToolbar.prototype.invalidateXULCache = function() {
	var invalidateCache = gTTBPreferences.getBoolPref("ttb.debug.invalidateCache", true);
	if (invalidateCache) {
		//Workaround for disappearance of tagbar (experimental)
		//Refer https://developer.thunderbird.net/add-ons/tips-and-tricks
		Components.classes["@mozilla.org/xre/app-info;1"].
    getService(Components.interfaces.nsIXULRuntime).invalidateCachesOnRestart();
    gTTBPreferences.setBoolPref("nglayout.debug.disable_xul_cache", true);
	} else {
		gTTBPreferences.setBoolPref("nglayout.debug.disable_xul_cache", false);
	}
}

TagToolbar.prototype.initTagToolbar = function()
{
	this.recallTagToolbarPersist();
	
	var me = this;
	var listener = {
	  observe : function(aSubject, aTopic, aData) {
		  if (aTopic == 'nsPref:changed') {
			  me.initTagToolbarContainer();
		  } else if (aTopic == "ttb:setting_updated") {
			  me.buildCatList();
			  me.invalidateXULCache();
		  } else if (aTopic == "ttb:tag_compose") {
				//aSubject.QueryInterface(Components.interfaces.nsISupportsArray);
				var tags = aData.split(" ");
				var key = tags.shift();
				var cnt = aSubject.wrappedJSObject.folders.length;
				for (var i=0; i<cnt; i++) {
					var msgFolder = aSubject.wrappedJSObject.folders[i].QueryInterface(Components.interfaces.nsIMsgFolder);
					TTBFolderListener.registerTags(key, tags, msgFolder.URI);
				}
		  } else if (aTopic == "ttb:tag_compose_done") {
		  	//aSubject.QueryInterface(Components.interfaces.nsISupportsArray);
				var cnt = aSubject.wrappedJSObject.folders.length;
				for (var i=0; i<cnt; i++) {
					var msgFolder = aSubject.wrappedJSObject.folders[i].QueryInterface(Components.interfaces.nsIMsgFolder);
					//open IMAP folders
					if (msgFolder.URI.match(/^imap/)) {
    	 			dump("Load: "+msgFolder.URI+"\n");
    	 			msgFolder.startFolderLoading();
	    			msgFolder.updateFolder(msgWindow);
					}
				}
		  }
	  }
	};
	
	try {
		var observerService = Components.classes["@mozilla.org/observer-service;1"].
	  							getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(listener, "ttb:tag_compose", false);
		observerService.addObserver(listener, "ttb:tag_compose_done", false);
	} catch(e) {
		dump(e+"\n");
	}
	
	this.syncTagToolbar();	
	if (!this.inToolbar) return;
	
	try {
		//use sample in http://developer.mozilla.org/ja/docs/Code_snippets:Preferences
		var prefService = Components.classes["@mozilla.org/preferences-service;1"]
			  .getService(Components.interfaces.nsIPrefService);
		var branch = prefService.getBranch('mailnews.tags.');
		//branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
		branch.QueryInterface(Components.interfaces.nsIPrefBranch);
		branch.addObserver("", listener, false);
		
		var observerService = Components.classes["@mozilla.org/observer-service;1"].
		  getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(listener, "ttb:setting_updated", false);
	} catch(e) {
		dump(e+"\n");
	}
	
	window.addEventListener("resize", this.resizeFunc, false);

	var toolbar = document.getElementById("tag-toolbar");
	if (toolbar) {
		if (toolbar.collapsed) {
			toolbar.setAttribute("collapsed", "true");
			document.getElementById("TTB:ShowToolBar").removeAttribute("checked");
		} else {
			toolbar.removeAttribute("collapsed");
			document.getElementById("TTB:ShowToolBar").setAttribute("checked", "true");
		}
	} else {
	  	document.getElementById("TTB:ShowToolBar").removeAttribute("checked");
	}

	if (!this.parent) {
		try {
			//var threadTree = GetThreadTree();
			var threadTree = document.getElementById("threadTree");
			if (threadTree) this.buildCatList();
			var func1 = function() {
				me.initTagToolbarContainer();
			}
			threadTree.addEventListener("select", func1, true);
		} catch(e) {
			dump(e+"\n");
		}

		try {
			//var folderTree = GetFolderTree();
			var folderTree = document.getElementById("folderTree");
			var func2 = function() {
				me.recallCategoryForFolder();
			}
			var rememberCat = gTTBPreferences.getBoolPref("ttb.remember_cat",true);
			if (folderTree && rememberCat) folderTree.addEventListener("select", func2, true);

		} catch(e) {
			dump(e+"\n");
		}
	} else { //open message by new window
		var toolbar = document.getElementById("tag-toolbar");
		if (toolbar) {
			//var openerToolbar = this.parent.document.getElementById("tag-toolbar");
			//var openerObj = this.parent.gTagToolbar;
			/*
			if (openerToolbar){
				if (openerToolbar.collapsed) {
					toolbar.setAttribute("collapsed", "true");
					document.getElementById("TTB:ShowToolBar").removeAttribute("checked");
				} else {
					toolbar.removeAttribute("collapsed");
					document.getElementById("TTB:ShowToolBar").setAttribute("checked", "true");
				}
			}
			*/
			this.buildCatList();
			var browser = document.getElementById("messagepane");
			if (browser) {
				var func = function() {
					me.updateTagToolbar();
				}
				browser.addEventListener("load", func, true);
			}
		} else {
			document.getElementById("TTB:ShowToolBar").removeAttribute("checked");
		}
	}

	var dispDeck = document.getElementById("displayDeck");
	if (dispDeck) {
		var func = function(event) {
			me.onDeckChange(event);
		}
		dispDeck.addEventListener("select",func,true);
	}
	
	var tabmail = document.getElementById("tabmail");
	if (tabmail) {
		var me = this;
		var monitor = {
			onTabTitleChanged: function(aTab){},
			onTabSwitched: function(aTab, aOldTab){
				var tabMode = me.getCurrentTabMode();
				me.onDeckChange(null);
//				me.updateTagToolbar();					
			}
		};
  	tabmail.registerTabMonitor(monitor);
	}
}

TagToolbar.prototype.recallCategoryForFolder = function()
{
	if (this.parent) return;
	if (this.dispMode == "category") return;
	var folder = GetFirstSelectedMsgFolder();
	if (folder) {
		var key = folder.getStringProperty("ttbcat");
		if (key) this.changeCatByKey(key);
		else this.changeCatByIndex(this.curcat);
	} else {
		this.changeCatByIndex(this.curcat);
	}
}

TagToolbar.prototype.rememberCategoryForFolder = function()
{
	if (this.parent) return;
	if (this.dispMode == "category") return;

	var folder = GetFirstSelectedMsgFolder();
	if (folder) {
		var menulist = document.getElementById("TTBCatList");
		folder.setStringProperty("ttbcat", menulist.getAttribute("value"));
	}
}

TagToolbar.prototype.onDeckChange = function(event)
{
	var panel = "";
	if (event) {
		var targetId = event.target.id;
		if (targetId != "displayDeck") return;
	 	panel = event.target.selectedPanel.id;
	} else { //tab
		panel = this.getCurrentTabMode();
		if (panel != "glodaSearch-result" && panel != "calendar" && panel != "tasks") panel = "showTagbar";
	}

	var toolbar = document.getElementById("tag-toolbar");
	if (panel == "threadPaneBox" || panel == "accountCentralBox" || panel == "showTagbar") {
		document.getElementById("TTB:ShowToolBar").removeAttribute("disabled");
		document.getElementById("tag-toolbar-container").removeAttribute("collapsed");
		document.getElementById("TTBCatList").removeAttribute("disabled");
		document.getElementById("TTB:TagStatus").removeAttribute("disabled");
		//if (toolbar.collapsed != this.memToolbarCollapsed) this.toggleTagToolbar(true);
		toolbar.removeAttribute("hidden");
		this.disabled = false;
		this.updateTagToolbar();
	} else {
		document.getElementById("TTB:ShowToolBar").setAttribute("disabled", "true");
		document.getElementById("tag-toolbar-container").setAttribute("collapsed", true); //avoid access key conflict
		document.getElementById("TTBCatList").setAttribute("disabled", "true");
		document.getElementById("TTB:TagStatus").setAttribute("disabled", "true");
		//if (!this.disabled) this.memToolbarCollapsed = toolbar.collapsed;
		if (!this.disabled) toolbar.setAttribute("hidden", true);
		//if (!toolbar.collapsed) this.toggleTagToolbar(true);
		this.disabled = true;
	}
}

TagToolbar.prototype.getCurrentTabMode = function() {
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

TagToolbar.prototype.syncTagToolbar = function()
{
	var master = document.getElementById(this.mailBar);
	var toolbar = document.getElementById("tag-toolbar");
	if (gTTBPreferences.getBoolPref("ttb.always_show_small_icons", true)) {
		toolbar.setAttribute("iconsize", "small");
	} else if (toolbar && master) {
		var val = master.getAttribute("mode");
		toolbar.setAttribute("mode", val);
		val = master.getAttribute("iconsize");
		toolbar.setAttribute("iconsize", val);
	}
}

TagToolbar.prototype.updateTagToolbar = function()
{
//	if (!document.getElementById("tag-toolbar-container")) return;
	this.syncTagToolbar(); 
	this.recallTagToolbarPersist();
	if (this.inToolbar) {
		this.buildCatList();
		this.searching = !this.searching;
		this.invokeSearch(true);
	} else {
		this.toolbarManager.clear();
	}
}

TagToolbar.prototype.addNewTag = function()
{
	var args = {result: "", okCallback: this.addNewTagToCurrentCategory};
	var dialog = window.openDialog("chrome://messenger/content/newTagDialog.xul",
								   "",
								   "chrome,titlebar,modal",
								   args);
	this.buildCatList();
}

TagToolbar.prototype.addNewTagToCurrentCategory = function(name, color)
{
	AddTagCallback(name, color);
	var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
                             .getService(Components.interfaces.nsIMsgTagService);
	var newTagKey = tagService.getKeyForTag(name);
	var menulist = document.getElementById("TTBCatList");
	var categoryManager = new TTBCategoryManager();
	try {
		var catNum = menulist.selectedIndex - 1;
		if (catNum < 0) return true;
		categoryManager.appendNewTagToCategory(menulist.value, newTagKey);
	} catch(e) {
		dump("TTBEx:"+e+"\n");
	}

	return true;
}

TagToolbar.prototype.changeSearchOption = function(elem)
{
	if (elem.getAttribute("checked")) {
		elem.removeAttribute("checked");
	} else {
		elem.setAttribute("checked", "true");
	}
	this.searchTags();
}

TagToolbar.prototype.searchTags = function()
{
	var word = document.getElementById("tag-toolbar-searchbox").value;
	var color = document.getElementById("tag-toolbar-find-colorbutton").getAttribute("color");

	if (!word && color == "NONE") {
		document.getElementById("tag-toolbar-query-savebutton").setAttribute("disabled", true);
	} else {
		document.getElementById("tag-toolbar-query-savebutton").removeAttribute("disabled");
	}
	
	var casesens = 
		document.getElementById("tag-toolbar-search-case").getAttribute("checked") == "true";
	var regexp = 
		document.getElementById("tag-toolbar-search-regexp").getAttribute("checked") == "true";
	var searcher = new TTBTagSearcher(word, color, regexp, casesens);
	var hits = searcher.searchTags();
	if (hits.length > 0) this.searchResult = hits;
	else this.searchResult = null;
	this.initTagToolbarContainer();
}

TagToolbar.prototype.invokeSearch = function() {
	this.searching = !this.searching;
	var container = document.getElementById("tag-toolbar-searchbox-container");
	if (!container) return;
	if (this.searching) {
		container.removeAttribute("collapsed");
		document.getElementById("tag-toolbar-query-savebutton").setAttribute("disabled", true);
	}	else {
		container.setAttribute("collapsed", "true");
	}
	
	var startButton = document.getElementById("tag-toolbar-find-startbutton");
	if (startButton) {
		if (this.searching) startButton.setAttribute("checked", "true");
		else startButton.removeAttribute("checked");
	}
	var menu = document.getElementById("tagtoolbar-search-tag");
	if (this.searching) {
		document.getElementById("TTBCatList").setAttribute("collapsed", "true");
		document.getElementById("tagtoolbar-search-tag").setAttribute("checked", "true");
		this.clearQuery();
	} else {
		if (this.catcol) document.getElementById("TTBCatList").setAttribute("collapsed", "ture");
		else document.getElementById("TTBCatList").removeAttribute("collapsed");
		document.getElementById("tagtoolbar-search-tag").removeAttribute("checked");
		this.buildCatList();
	}
}

TagToolbar.prototype.clearQuery = function()
{
	document.getElementById("tag-toolbar-searchbox").value = "";
	var colorpickerButton = document.getElementById("tag-toolbar-find-colorbutton");
	colorpickerButton.setAttribute("color", "NONE");
	document.getElementById("tag-toolbar-find-colorbutton-content").style.backgroundColor = "";
	this.searchTags();
}

TagToolbar.prototype.saveQueryAsCategory = function() 
{
	var word = document.getElementById("tag-toolbar-searchbox").value;
	var color = document.getElementById("tag-toolbar-find-colorbutton").getAttribute("color");
	var casesens = 
		document.getElementById("tag-toolbar-search-case").getAttribute("checked") == "true";
	var regexp = 
		document.getElementById("tag-toolbar-search-regexp").getAttribute("checked") == "true";

	if (!word && color == "NONE") return;
	var searcher = new TTBTagSearcher(word, color, regexp, casesens);
	searcher.saveQueryAsCategory();
}

TagToolbar.prototype.showColorPicker = function()
{
	var colorpickerButton = document.getElementById("tag-toolbar-find-colorbutton");
	var orgColor = colorpickerButton.getAttribute("color");
	var colorObj = { color: orgColor, cancel: false };
	window.openDialog("chrome://tagbar/content/colorPicker.xul", "_blank", "chrome,close,titlebar,modal", colorObj);

	if (colorObj.cancel) return;
	var color = colorObj.color.toUpperCase();
	colorpickerButton.setAttribute("color", color);
	if (color == "NONE") color = "";
	document.getElementById("tag-toolbar-find-colorbutton-content").style.backgroundColor = color;
	this.searchTags();	
}

TagToolbar.prototype.initTagToolbarContainer = function(container)
{
	var menulist = document.getElementById("TTBCatList");
	if (!container) container = document.getElementById("tag-toolbar-container-box");
	if (!container) return;

	var isPopup = container.localName == "menupopup";
	var endNum = 0;
	var oldTags = container.childNodes;
	var oldTagsNum = oldTags.length;
	for (var i = oldTagsNum-1; i >= endNum; i--) {
		var node = oldTags[i];
		if (node) container.removeChild(node);
	}

	var topContainer = document.getElementById("tag-toolbar-container");
	var mode = this.dispMode;
	if (this.searching || !mode || isPopup) mode = "text";

	if (this.searching) {
		menulist.setAttribute("collapsed", "true");
	} else if (!isPopup) {
		if (this.catcol) menulist.setAttribute("collapsed", "true");
		else menulist.removeAttribute("collapsed");
	}
	
	//put categories on toolbar
	if (mode == "category") {
		menulist.setAttribute("collapsed", "true");
		this.addCategoriesToTagToolbarContainer(container);
		this.resizeFunc();
		return;
	}
	
	var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
	  .getService(Components.interfaces.nsIMsgTagService);
	var tagArray = tagService.getAllTags({});
	var tagCount = tagArray.length;

	var msgHdr = null;
	var curKeys = null;
	try {
		msgHdr = gDBView.hdrForFirstSelectedMessage;
		curKeys = msgHdr.getStringProperty("keywords");
		if (msgHdr.label)
		  curKeys += " $label" + msgHdr.label;
	} catch(e) {
		msgHdr = null;
	}

	var useColorButton = this.dispMode == "color";
	var tagsInOrder;
	var isAll = false;
	if (this.searching) {
		tagsInOrder = this.searchResult;
	} else {
		var catKey = isPopup ? container.parentNode.getAttribute("value")
		  : menulist.selectedItem.getAttribute("value");
		if (catKey == "catall") {
			isAll = true;
			tagsInOrder = "null";
		} else {
			var cat = this.categoryManager.getCategoryByKey(catKey);
			tagsInOrder = cat.tags;
		}
	}

	var isQuery = false;
	if (!isAll) {
		var casesens = 
			document.getElementById("tag-toolbar-search-case").getAttribute("checked") == "true";
		var regexp = 
			document.getElementById("tag-toolbar-search-regexp").getAttribute("checked") == "true";
		var searcher = new TTBTagSearcher("", "", regexp, casesens);
		var query = tagsInOrder ? tagsInOrder[0] : "";
		var tagKeys = searcher.queryToTagKeys(query);
		if (tagKeys) {
			tagsInOrder = tagKeys;
			isQuery = true;
		}
	}

	var sortedTagArray = this.sortTagArray(tagArray, tagsInOrder);
	for (var i = 0; i < tagCount; ++i) {
		if (!tagsInOrder) break;
		var taginfo = sortedTagArray[i];
		if (!isAll && tagsInOrder.indexOf(taginfo.key) < 0) continue;
		var button = isPopup ? document.createElement("menuitem")
		  : document.createElement("toolbarbutton");
		var orgIndex = tagArray.indexOf(taginfo);
		this.setMessageTagLabelToTagToolbar(button, orgIndex + 1, taginfo.tag,
											taginfo.color, useColorButton, this.akey);
		button.setAttribute("observes", "TTB:TagStatus");
		container.appendChild(button);
		button.setAttribute("value", taginfo.key);
		if(isPopup) {
			button.setAttribute("type", "checkbox");
			button.setAttribute("autocheck", "false");
		}

		if (msgHdr || window.opener) {
			var attached = (" " + curKeys + " ").indexOf(" " + taginfo.key + " ") > -1;
			if (attached) {
				button.setAttribute("checked", "true");
			}
		}
		button.setAttribute('oncommand', 'gTagToolbar.toggleMessageTagToolbar(event.target);');
	}

	var tagsStr = "null";
	if (tagsInOrder && tagsInOrder != "null") {
		tagsStr = tagsInOrder.join(this.categoryManager.delimiter);
	}
	
	var menuLabel = this.localeBundle.getString("tagbar.add_all_tags");
	var cmd = 'gTagToolbar.toggleAllTagsInCat("'+tagsStr+'",true'+');'
	var tip = this.localeBundle.getString("tagbar.add_all_tags_tip");
	var menu;
	var refNode = container.firstChild;
	var menuPopup;
	if (isPopup) {
		var sep = document.createElement("menuseparator");
		container.appendChild(sep);
		menu = document.createElement("menuitem");
		menu.setAttribute("observes", "TTB:TagStatus");
		container.appendChild(menu);
	} else {
		var toolbarbutton = document.createElement("toolbarbutton"); 
		toolbarbutton.setAttribute("id", "tag-toolbar-toggleincat-button");
		toolbarbutton.setAttribute("type", "menu");
		toolbarbutton.setAttribute("observes", "TTB:TagStatus");
		toolbarbutton.setAttribute("tooltiptext", this.localeBundle.getString("tagbar.add_remove_all_tip"));
		menuPopup = document.createElement("menupopup");
		menu = document.createElement("menuitem");
		menu.setAttribute("observes", "TTB:TagStatus");
		menuPopup.appendChild(menu);
		toolbarbutton.appendChild(menuPopup);
		container.insertBefore(toolbarbutton, refNode);
	}
	menu.setAttribute("label", menuLabel);
	menu.setAttribute("tooltiptext", tip);
	menu.setAttribute("oncommand",cmd);

	menuLabel = this.localeBundle.getString("tagbar.remove_all_tags");
	tip = this.localeBundle.getString("tagbar.remove_all_tags_tip");
	cmd = 'gTagToolbar.toggleAllTagsInCat("'+tagsStr+'",false'+');'
	if (isPopup) {
		menu = document.createElement("menuitem");
		menu.setAttribute("observes", "TTB:TagStatus");
		container.appendChild(menu);
	} else {
		menu = document.createElement("menuitem");
		menu.setAttribute("observes", "TTB:TagStatus");
		menuPopup.appendChild(menu);
	}
	menu.setAttribute("label", menuLabel);
	menu.setAttribute("tooltiptext", tip);
	menu.setAttribute("oncommand",cmd);
		
	if (isPopup && !isQuery) {
		var newTagMenu = document.getElementById("tagtoolbar-new-tag");
		if (newTagMenu) {
			var sep = document.createElement("menuseparator");
			container.appendChild(sep);
			var menuLabel = newTagMenu.label;
			var cmd = 'gTagToolbar.addNewTagFromCatMenu(this);'
			var menu = document.createElement("menuitem");
			menu.setAttribute("label", menuLabel);
			menu.setAttribute("oncommand",cmd);
			container.appendChild(menu);
		}
	} else {
		this.resizeFunc();
	}
	
	if (msgHdr || window.opener) {
	  document.getElementById("TTB:TagStatus").removeAttribute("disabled");
	} else {
	  document.getElementById("TTB:TagStatus").setAttribute("disabled", "true");
	}
}

TagToolbar.prototype.toggleAllTagsInCat = function(tagsStr, add) 
{
	var tags = "null";
	if (tagsStr != "null") {
		tags = tagsStr.split(this.categoryManager.delimiter);
	}
	var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
	  .getService(Components.interfaces.nsIMsgTagService);
	var tagArray = tagService.getAllTags({});
	var tagCount = tagArray.length;
	var allKeys = "";
	for (var i = 0; i < tagCount; ++i) {
		var taginfo = tagArray[i];
		if (tags == "null" || tags.indexOf(taginfo.key) != -1) {
			if (i) allKeys += " ";
			allKeys += taginfo.key;
			if (add) this.categoryManager.unshiftRecentTag(taginfo.key);
		}
	}
	ToggleMessageTag(allKeys, add);
}

TagToolbar.prototype.addNewTagFromCatMenu = function(target)
{
	if (this.dispMode == "category" && this.openedMenuButton) {
		var container = document.getElementById("tag-toolbar-container");
		if (container) container.removeEventListener("mouseover", this.autoOpenMenu, true);
	}

	var cat = target.parentNode.parentNode;
	var catNo = cat.getAttribute("catno");
	var catList = document.getElementById("TTBCatList");
	catList.selectedIndex = parseInt(catNo);
	this.addNewTag();
}

TagToolbar.prototype.setMessageTagLabelToTagToolbar = function(button, index, name, color, useColorButton, showAccessKey)
{
	var isMenu = button.localName == "menuitem";
	var label = "";
	// if a <key> is defined for this tag, use its key as the accesskey
	// (the key for the tag at index n needs to have the id key_tag<n>)
	if (index && showAccessKey) {
		var shortcutkey = document.getElementById("key_tag" + index);
		var accesskey = shortcutkey ? shortcutkey.getAttribute("key") : null;
		if (accesskey) {
			button.setAttribute("accesskey", accesskey);
			label = this.messengerBundle.getFormattedString("mailnews.tags.format",
															[accesskey, name]);
		} else {
			label = isMenu ? "  "+name : name;
		}
	} else {
		label = name;
	}

	var buttonContent = null;
	if (!isMenu && useColorButton) {
		var childNodes = button.getElementsByTagName("spacer");
		if (childNodes.length > 0) buttonContent = childNodes[0];
		else buttonContent = document.createElement("spacer");
		buttonContent.setAttribute("class", "tagbar-color-box");
		if (color) buttonContent.style.backgroundColor = color;
	} else {
		button.setAttribute("label",label);
		//if (color) button.setAttribute("class", "lc-" + color.substr(1));
		if (color) button.style.color = color;
	}

	if (buttonContent) {
		buttonContent.setAttribute("observes", "TTB:TagStatus");
		button.appendChild(buttonContent);
	}
	button.setAttribute("tooltiptext", name);
	var classes = button.getAttribute("class").split(" ");
	if (classes.indexOf("tagbar-item") == -1)
	  button.setAttribute("class", button.getAttribute("class") + " tagbar-item");
	button.setAttribute("name", name);
	if (index) button.setAttribute("index", index);
	if (color) button.setAttribute("tagcolor", color);
}

TagToolbar.prototype.addCategoriesToTagToolbarContainer = function(container, toMenupopup)
{
	var msgHdr = null;
	try {
		msgHdr = gDBView.hdrForFirstSelectedMessage;
	} catch(e) {
	}
	
	//add "All" category
	var elemName = toMenupopup ? "menu" : "toolbarbutton";
	var allbutton = document.createElement(elemName);
	this.setMessageTagLabelToTagToolbar(allbutton, null,
										this.localeBundle.getString("tagbar.cat_all"),
										null, false, false);
	if (!toMenupopup) allbutton.setAttribute("type", "menu");
	allbutton.setAttribute("value", "catall");
	allbutton.setAttribute("catno","0");
	allbutton.setAttribute("observes", "TTB:TagStatus");
	var popup = document.createElement("menupopup");
	var commandStr = "if (event.target == this) gTagToolbar.initTagToolbarContainer(this);";
	popup.setAttribute("onpopupshowing", commandStr);
	allbutton.appendChild(popup);
	container.appendChild(allbutton);

	if (msgHdr || window.opener)
	  document.getElementById("TTB:TagStatus").removeAttribute("disabled");
	else
	  document.getElementById("TTB:TagStatus").setAttribute("disabled", "true");


	//add user's categories
	var catNo = 1;
	var catsNum = this.categoryManager.size();
	for (var i=0; i<catsNum; i++) {
		var cat = this.categoryManager.getCategoryAt(i); 
		if (cat.name == "") continue;
		//var button = allbutton.cloneNode(true);
		var button = document.createElement(elemName); //new
		if (!toMenupopup) button.setAttribute("type", "menu");
		button.setAttribute("class", "");
		this.setMessageTagLabelToTagToolbar(button, null, cat.name,
											null, false, false);
		button.setAttribute("value", cat.key);
		button.setAttribute("catno", catNo.toString());
		button.setAttribute("observes", "TTB:TagStatus"); // new
		if (this.categoryManager.isSearchQuery(cat.tags[0])) {
			var searcher = new TTBTagSearcher(cat.tags[0]);
			if (searcher.color.indexOf("#") == 0) button.style.color = searcher.color;
			button.setAttribute("query", "true");
			if (!toMenupopup) {
				button.addEventListener("mouseover", this.setTooltipForSavedCategory, true);
				button.addEventListener("mouseout", this.setTooltipForSavedCategory, true);
			}
		}	else {
			button.setAttribute("query", "false");
		}
		var popup = document.createElement("menupopup");
		var commandStr = "if (event.target == this) gTagToolbar.initTagToolbarContainer(this);";
		popup.setAttribute("onpopupshowing", commandStr);
		button.appendChild(popup);

		container.appendChild(button);
		catNo++;
	}
}

TagToolbar.prototype.setTooltipForSavedCategory = function(aEvent)
{
	var button = aEvent.target;
	if (aEvent.type == "mouseover") {
		var catMgr = new TTBCategoryManager();
		var key = button.getAttribute("value");
		var cat = catMgr.getCategoryByKey(key);
		if (!cat) return;
	
		var localeBundle = document.getElementById("TTBBundle");
		var yesStr = localeBundle.getString("tagbar.yes");
		var noStr = localeBundle.getString("tagbar.no");
		var naStr = localeBundle.getString("tagbar.na");
		var defStr = localeBundle.getString("tagbar.default");
		var query = cat.tags[0];
		var searcher = new TTBTagSearcher(query);
		button.removeAttribute("tooltiptext");
		button.setAttribute("tooltip","tagtoolbar-searchcat-tip");
		var tip = document.getElementById("tagtoolbar-searchcat-tip"); 
		//button.setAttribute("tooltip","tagtoolbar-searchcat-tip");
		var tiptext = document.getElementById("tagtoolbar-searchcat-tip-text");//vbox
		var tipNodes = tiptext.childNodes;
		var tipNode = tipNodes[0];
		var val = searcher.word ? searcher.word : "";
		tipNode.childNodes[1].setAttribute("value", val);

		tipNode = tipNodes[1];
		val = searcher.regexp ? yesStr : noStr;
		tipNode.childNodes[1].setAttribute("value", val);

		tipNode = tipNodes[2];
		val = searcher.casesense ? yesStr : noStr;
		tipNode.childNodes[1].setAttribute("value", val);

		tipNode = tipNodes[3];
		var color = searcher.color;
		if (color == "NONE") {
			val = naStr;
			color = "";
		}	else if (color == "") {
			val = defStr;
		} else {
			val = color;
		}

		tipNode.childNodes[1].setAttribute("value", val);
		tipNode.childNodes[2].style.backgroundColor = color;	
	} else if (aEvent.type == "mouseout"){
		button.removeAttribute("tooltip");
	}
}

TagToolbar.prototype.toggleMessageTagToolbar = function(target)
{
	if (this.dispMode == "category" && this.openedMenuButton) {
		var container = document.getElementById("tag-toolbar-container");
		if (container) container.removeEventListener("mouseover", this.autoOpenMenu, true);
	}
	
	var key = target.getAttribute("value");
	
	if (target.getAttribute("checked") == "true") target.removeAttribute("checked");
	else target.setAttribute("checked", "true");
	var addKey = target.getAttribute("checked") == "true";
	try {
		ToggleMessageTag(key, addKey);
		if (addKey) this.categoryManager.unshiftRecentTag(key);
	} catch(e) {
		dump(e+"\n");
	}
}

TagToolbar.prototype.toggleTagToolbar = function()
{
	var toolbar = document.getElementById("tag-toolbar");
	if (toolbar) {
		var col = toolbar.getAttribute("collapsed") == "true";
		if (col) {
			toolbar.removeAttribute("collapsed");
			document.getElementById("TTB:ShowToolBar").setAttribute("checked", "true");
		} else {
			toolbar.setAttribute("collapsed", "true");
			document.getElementById("TTB:ShowToolBar").removeAttribute("checked");
		}
	}
	this.initTagToolbarContainer();
}

TagToolbar.prototype.sortTagArray = function(tagArray, order) {
	var sortedTagArray = tagArray.slice(0);
	if (order == "null") return sortedTagArray;
	else if (!order) return [];
	var sortFunc = function(a, b) {
		var aindex = order.indexOf(a.key);
		var bindex = order.indexOf(b.key);
		var ret = 0;
		if (aindex == -1 && bindex != -1) ret = 1;
		else if (aindex != -1 && bindex == -1) ret = -1;
		else ret = aindex - bindex;

		return ret;
	};

	sortedTagArray.sort(sortFunc);

	return sortedTagArray;
}

TagToolbar.prototype.editCat = function()
{
	var menulist = document.getElementById("TTBCatList");
	menulist.selectedIndex = this.curcat;
	window.openDialog("chrome://tagbar/content/settings.xul", "ttb-settings", "chrome,resizable", "cattab");
}

TagToolbar.prototype.initTagToolbarPopupMenu = function()
{
	var catList = document.getElementById("TTBCatList");
	var showCatMenu = document.getElementById("tagtoolbar-show-category");
	if (catList.collapsed) showCatMenu.removeAttribute("checked");
	else showCatMenu.setAttribute("checked", "true");
	if (this.dispMode == "category") {
		showCatMenu.setAttribute("disabled", "true");
		document.getElementById("tag-toolbar-swcat").setAttribute("disabled", "true");
	} else {
		showCatMenu.removeAttribute("disabled");
		document.getElementById("tag-toolbar-swcat").removeAttribute("disabled");
	}
}

TagToolbar.prototype.toggleCatList = function()
{
	var catList = document.getElementById("TTBCatList");
	if (catList.collapsed) catList.removeAttribute("collapsed");
	else catList.setAttribute("collapsed", "true");
	this.catcol = catList.collapsed;
	this.resizeFunc();
}

TagToolbar.prototype.onScrollCatList = function(event)
{
	var menulist = document.getElementById("TTBCatList");
	var index = menulist.selectedIndex;
	if (index == -1) return;
	
	if (event.detail > 0) {
		if (index < this.categoryManager.size()) menulist.selectedIndex = ++index;
	} else {
		if (index > 0) menulist.selectedIndex = --index;
	}
	this.changeCatByIndex(menulist.selectedIndex);
}

TagToolbar.prototype.switchTagDisplay = function(target)
{
	if (target.id == "tag-toolbar-disp-akey") {
		if (target.getAttribute("checked")) target.removeAttribute("checked");
		else target.setAttribute("checked", "true");
		this.akey = target.getAttribute("checked") == "true";
	} else {
		this.dispMode = target.getAttribute("dispType");
	}
	this.initTagToolbarContainer();
}

TagToolbar.prototype.initTagDisplayMenu = function()
{
	switch (this.dispMode) {
		case "text":
			document.getElementById("tag-toolbar-disp-text").setAttribute("checked", "true");
			document.getElementById("tag-toolbar-disp-color").removeAttribute("checked");
			document.getElementById("tag-toolbar-disp-cat").removeAttribute("checked");
			break;
	    case "color":
			document.getElementById("tag-toolbar-disp-text").removeAttribute("checked");
			document.getElementById("tag-toolbar-disp-color").setAttribute("checked", "true");
			document.getElementById("tag-toolbar-disp-cat").removeAttribute("checked");
	    	break;
	    case "category":
   			document.getElementById("tag-toolbar-disp-text").removeAttribute("checked");
			document.getElementById("tag-toolbar-disp-color").removeAttribute("checked");
			document.getElementById("tag-toolbar-disp-cat").setAttribute("checked", "true");
	    	break;
	}
	
	var akeyMenu = document.getElementById("tag-toolbar-disp-akey");
	if (this.akey) akeyMenu.setAttribute("checked", "true");
	else akeyMenu.removeAttribute("checked");

	if (this.dispMode == "color")
	  akeyMenu.setAttribute("disabled", "true"); 
	else
	  akeyMenu.removeAttribute("disabled");
}

TagToolbar.prototype.finalize = function() {
	var container = document.getElementById("tag-toolbar-container");
	if (container) {
		gTTBPreferences.setIntPref("ttb.curcat",this.curcat);
		gTTBPreferences.setBoolPref("ttb.catcol",this.catcol);
		gTTBPreferences.setUnicharPref("ttb.dispmode",this.dispMode);
		gTTBPreferences.setBoolPref("ttb.akey",this.akey);

	  //container.setAttribute("curcat", this.curcat.toString());
  	//container.setAttribute("catcol", this.catcol.toString());
   	//container.setAttribute("dispMode", this.dispMode);
   	//container.setAttribute("akey", this.akey.toString());
	}

	/*
	if (this.disabled) {
		var toolbar = document.getElementById("tag-toolbar");
		if (toolbar.collapsed != this.memToolbarCollapsed) this.toggleTagToolbar();
	}
	*/
	this.categoryManager.syncTagsInCategory(); //remove tags deleted in this session from categories
}

TagToolbar.prototype.resizeFunc = function(event)
{	
	if (event && event.type == 'focus') 
	  window.removeEventListener('focus', gTagToolbar.resizeFunc, false);
	var buttons = document.getElementById("tag-toolbar-container-box");
	if (!buttons) return;
	var chevron = document.getElementById("tag-toolbar-container-chevron");
	//var width = window.innerWidth;
	var	width = document.getElementById(gTagToolbar.mailBar).boxObject.width;
	if (width == 0) {
      window.addEventListener('focus', gTagToolbar.resizeFunc, false);
      return;
  }

  if (event && gTagToolbar.prevWidth == width) return;
  gTagToolbar.prevWidth = width;
	var container = document.getElementById("tag-toolbar-container");
	var childNodes = buttons.childNodes;
	var childNum = childNodes.length;
	if (childNum == 0) {
      chevron.setAttribute("collapsed", "true");
      return;
  }
    
 	window.removeEventListener('resize', gTagToolbar.resizeFunc, false); 	
	var myToolbar = buttons.parentNode.parentNode;
	var toolbarItems = myToolbar.childNodes;
	var toolbarItemNum = toolbarItems.length;
	for (var i = toolbarItemNum-1; i >= 0; i--){
		var anItem = toolbarItems[i];
		if (anItem.id == "tag-toolbar-container") {
			break;
		}
		width -= anItem.boxObject.width;
	}

	var chevronWidth = 0;
	chevron.removeAttribute("collapsed");
	chevronWidth = chevron.boxObject.width;
	chevron.setAttribute("collapsed", "true");
	var overflowed = false;
	
	var isLTR = true;
	try {
		isLTR=window.getComputedStyle(document.getElementById(gTagToolbar.mailBar),'').direction=='ltr';
	} catch(e) {
	}
/*	
	var toolbarNum = gTTBPreferences.getIntPref("ttb.max_toolbars",1);
	var toolbox = document.getElementById(gTagToolbar.mailToolbox);
	var toolbar = null;
	while (gTagToolbar.additionalToolbars.length > 0) {
		toolbar = gTagToolbar.additionalToolbars.pop();
		toolbox.removeChild(toolbar);
	}
	*/
	var toolbar = null;
	gTagToolbar.toolbarManager.init();
	for (var i=0; i<childNum; i++) {
		var button = childNodes[i];

		if (i == childNum - 1) chevronWidth = 0;
		//if (overflowed) button.setAttribute("collapsed", "true");
		//else button.removeAttribute("collapsed");
		button.removeAttribute("collapsed");
		var boxObject = button.boxObject;
		var offset = isLTR ? boxObject.x
		  : width - boxObject.x;
		if (toolbar) {
			offset = toolbar.firstChild.boxObject.width;
		}
		if (offset + boxObject.width + chevronWidth > width) {
			//overflowed = true;
			var newToolbar = gTagToolbar.toolbarManager.nextToolbar();
			if (newToolbar) {
			//if (gTagToolbar.additionalToolbars.length + 1 < toolbarNum) {
				
				/*toolbar = document.createElement("toolbar");
				toolbar.setAttribute("class","chromeclass-toolbar");
				toolbar.setAttribute("context","toolbar-context-menu");
				toolbar.setAttribute("fullscreentoolbar","true");
				toolbar.setAttribute("mode","full");
				toolbar.setAttribute("customizable","false");
				toolbar.setAttribute("iconsize","small");
				toolbar.setAttribute("collapsed","false");
				toolbar.setAttribute("persist","collapsed");
				gTagToolbar.additionalToolbars.push(toolbar);
				toolbox.appendChild(toolbar);
				var hbox = document.createElement("hbox");
				hbox.setAttribute("class","tagbar-container-box");
				toolbar.appendChild(hbox);
				*/
				//width = window.innerWidth;
				width = document.getElementById(gTagToolbar.mailBar).boxObject.width;
				toolbar = newToolbar;
			} else {
				overflowed = true;
			}
			// This button doesn't fit. Show it in the menu. Hide it in the toolbar.
			//if (!button.collapsed) button.setAttribute("collapsed", "true");
		}
		
		if (toolbar) {
			if (overflowed) button.setAttribute("overflowed", "true");
			else toolbar.firstChild.appendChild(button.cloneNode(true));
			button.setAttribute("collapsed", "true");
		} else if (overflowed) {
			button.setAttribute("collapsed", "true");
			button.setAttribute("overflowed", "true");
		}
		
	}
	
	gTagToolbar.toolbarManager.compact();
//	if (overflowed && chevron.collapsed) {
	if (overflowed) {
		if (toolbar) {
			chevron = chevron.cloneNode(true);
			toolbar.appendChild(chevron);
		}
		chevron.removeAttribute("collapsed");
//		if (disabled) chevron.setAttribute("disabled", "true");
//		else chevron.removeAttribute("disabled");
//		var overflowPadder = document.getElementById("tag-toolbar-overflow-padder");
//		offset = isLTR ? buttons.boxObject.width
//		  : width - buttons.boxObject.x - buttons.boxObject.width;
//		overflowPadder.width = width - chevron.boxObject.width - offset;
	}
	window.addEventListener('resize', gTagToolbar.resizeFunc, false); 	
}

TagToolbar.prototype.initChevronMenu = function(popup)
{
	var buttons = document.getElementById("tag-toolbar-container-box");
	if (!buttons)
	  return;

	var childNodes = popup.childNodes;
	var childNum = childNodes.length;
	for (var i = childNum-1; i >= 0; i--) {
		var node = childNodes[i];
		if (node) popup.removeChild(node);
	}
	childNodes = buttons.childNodes;
	childNum = childNodes.length;
	
	var mode = this.searching ? "text" : this.dispMode;
	for (var i=0; i<childNum; i++) {
		var button = childNodes[i];
		if (!button.collapsed || button.id == "TTBCatList") continue;
		if (!button.getAttribute("overflowed")) continue;
		var tagName = mode == "category" ? "menu" : "menuitem";
		var menuitem = document.createElement(tagName);
		menuitem.setAttribute("label", button.getAttribute("tooltiptext"));
		menuitem.setAttribute("value", button.getAttribute("value"));
		var color = button.getAttribute("tagcolor");
		var index = button.getAttribute("index");
		var name = button.getAttribute("name");
		this.setMessageTagLabelToTagToolbar(menuitem, index, name, color, false, this.akey)
		if (tagName == "menuitem") {
			menuitem.setAttribute("type", "checkbox");
			menuitem.setAttribute("autocheck", "false");
			if (button.checked)	menuitem.setAttribute("checked", "true");
			else menuitem.removeAttribute("checked");
		}

		if (mode == "category") {
			menuitem.setAttribute("tags", button.getAttribute("tags"));
			var popups = button.getElementsByTagName("menupopup");
			if (popups.length > 0) menuitem.appendChild(popups[0].cloneNode(true));
		} else {
			menuitem.setAttribute('oncommand',
								  'gTagToolbar.toggleMessageTagToolbar(event.target);');
		}
		popup.appendChild(menuitem);
	}
}

TagToolbar.prototype.autoOpenMenu = function(event)
{
	var target = event.target;
	if (gTagToolbar.openedMenuButton != target &&
		target.nodeName == "toolbarbutton" &&
		target.type == "menu") {
		gTagToolbar.openedMenuButton.open = false;
		target.open = true;
	}
}

TagToolbar.prototype.setOpenedMenu = function(event)
{
	if (this.dispMode != "category") return;
	if (event.target.parentNode.localName == 'toolbarbutton') {
		if (!this.openedMenuButton) {
			event.currentTarget.addEventListener("mouseover", this.autoOpenMenu, true);
		}
		this.openedMenuButton = event.target.parentNode;
	}
}

TagToolbar.prototype.unsetOpenedMenu = function(event)
{
	if (this.dispMode != "category") return;
	if (event.target.parentNode.localName == 'toolbarbutton') {
		event.currentTarget.removeEventListener("mouseover", this.autoOpenMenu, true);
		this.openedMenuButton = null;
	}
}

TagToolbar.prototype.addTagsToLatestSentMsg = function(tags, msgFolder, subject, dateSec)
{
	if (this.waitingForFolderUpdate) {
		var me = this;
		var func = function() {
			me.addTagsToLatestSentMsg(tags, msgFolder, subject, dateSec);
		}
		setTimeout(func, 1000);
		return;
	}
	const MSG_FLAG_HAS_RE = 0x000010;
	//var messageenumerator = msgFolder.getMessages(msgWindow);
	var messageenumerator = msgFolder.messages;
 	var latest = null;
 	var prevDateDiff = Infinity;
 	while ( messageenumerator.hasMoreElements() ) {
 		var msgHdr = messageenumerator.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
    var msgSubject = "";
    //if(msgHdr.flags & MSG_FLAG_HAS_RE)
    //  msgSubject = "Re: ";
    if (msgHdr.mime2DecodedSubject)
    	msgSubject = msgHdr.mime2DecodedSubject;
      //msgSubject += msgHdr.mime2DecodedSubject;
 		var cmpSubject = subject;
		if(msgHdr.flags & MSG_FLAG_HAS_RE)
			cmpSubject = cmpSubject.replace(/^re: /i, ""); //remove RE:

    if (cmpSubject != msgSubject) continue;
    
		var date = msgHdr.dateInSeconds;
		var dateDiff = Math.abs(dateSec - date);
		if (dateDiff < prevDateDiff) {
			prevDate = dateDiff;
			latest = msgHdr;
		}
	}

	if (!latest) {
		dump("no msg\n");
		return;
	}
	//if (Math.abs(dateSec - msgHdr.dateInSeconds) > 60) return;
	
//	var msg = Components.classes["@mozilla.org/supports-array;1"]
//   	              .createInstance(Components.interfaces.nsISupportsArray);
  var msg = Components.classes["@mozilla.org/array;1"]
                      .createInstance(Components.interfaces.nsIMutableArray);
   	              

	for (var i=0; i<tags.length; i++) {
		//msg.Clear();
		msg.clear();
		//msg.AppendElement(latest);
		msg.appendElement(latest, false);
		msgHdr.folder.addKeywordsToMessages(msg, tags[i]);
		this.categoryManager.unshiftRecentTag(tags[i]);
	}
}

TagToolbar.prototype.addTagsToNewMsg = function(msgHdr, tags) 
{
	dump("Add tags: " + tags +"\n");
	var curKeys = msgHdr.getStringProperty("keywords");
  if (curKeys) {
  	dump("Already has tags. Skipped.\n")
  	return;
  }
  
  var msg = Components.classes["@mozilla.org/array;1"]
                      .createInstance(Components.interfaces.nsIMutableArray);

	msg.clear();
	msg.appendElement(msgHdr, false);
	msgHdr.folder.addKeywordsToMessages(msg, tags.join(" "));
	this.categoryManager.unshiftRecentTags(tags);
  /*
	for (var i=0; i<tags.length; i++) {
		msg.clear();
		msg.appendElement(msgHdr, false);
		msgHdr.folder.addKeywordsToMessages(msg, tags[i]);
		this.categoryManager.unshiftRecentTag(tags[i]);
	}
	*/	
}

TagToolbar.prototype.onTagCategoryButtonPopupShowing = function(container) 
{
	var endNum = 0;
	var oldTags = container.childNodes;
	var oldTagsNum = oldTags.length;
	for (var i = oldTagsNum-1; i >= endNum; i--) {
		var node = oldTags[i];
		if (node) container.removeChild(node);
	}
	
	this.addCategoriesToTagToolbarContainer(container, true);
}

// Manage extra tag toolbars except for the 1st one (id = "tag-toolbar")
function TTBToolbarManager(toolbox)
{
	this.toolbars = new Array();
	this.index = 0;
	this.maxNum = 0;
	this.init();
	this.toolbox = document.getElementById(toolbox);
}

TTBToolbarManager.prototype.init = function()
{
	//subtract one toolbar (default toolbar)
	this.maxNum = gTTBPreferences.getIntPref("ttb.max_toolbars",1) - 1;
	if (this.maxNum < 0) this.maxNum = 100;
	this.index = 0;
	if (this.maxNum >= 0) {
		this.truncToolbars(this.maxNum);
/*		while (this.toolbars.length > this.maxNum) {
			var toolbar = this.toolbars.pop();
			this.toolbox.removeChild(toolbar);
		}*/
	}
	
	for (var i=0; i<this.toolbars.length; i++) {
		var toolbar = this.toolbars[i];
		//var child = toolbar.firstChild;
		//if (child) toolbar.removeChild(child);
		var children = toolbar.childNodes;
		for (var j=0; j<children.length; j++) toolbar.removeChild(children[j]);
	}
}

TTBToolbarManager.prototype.nextToolbar = function()
{
	if (this.index >= this.maxNum) return null;
	
	var toolbar = this.toolbars[this.index]; //reuse toolbar
	if (!toolbar) { 
		toolbar = document.createElement("toolbar");
		toolbar.setAttribute("class","chromeclass-toolbar tagtoolbar");
		toolbar.setAttribute("context","toolbar-context-menu");
		toolbar.setAttribute("fullscreentoolbar","true");
		toolbar.setAttribute("mode","full");
		toolbar.setAttribute("customizable","false");
		toolbar.setAttribute("iconsize","small");
		toolbar.setAttribute("collapsed","false");
		toolbar.setAttribute("persist","collapsed");
		
		// if this.index == 0, only default toolbar exists. So get it by getElementById().
		var beforeToolbar = this.index > 0 ? this.toolbars[this.index-1] : document.getElementById("tag-toolbar");

		if (beforeToolbar && beforeToolbar.nextSibling) {
			this.toolbox.insertBefore(toolbar,beforeToolbar.nextSibling);
		} else {
			this.toolbox.appendChild(toolbar);
		}
		this.toolbars.push(toolbar);
	}

	var hbox = document.createElement("hbox");
	hbox.setAttribute("class","tagbar-container-box");
	toolbar.appendChild(hbox);
	
	this.index++;
	
	return toolbar;
}

TTBToolbarManager.prototype.compact = function()
{
	this.truncToolbars(this.index);
	/*while (this.toolbars.length > this.index) {
		var toolbar = this.toolbars.pop();
		this.toolbox.removeChild(toolbar);
	}*/
}

TTBToolbarManager.prototype.clear = function()
{
	this.truncToolbars(0);
}

TTBToolbarManager.prototype.truncToolbars = function(num)
{
	while (this.toolbars.length > num) {
		var toolbar = this.toolbars.pop();
		this.toolbox.removeChild(toolbar);
	}	
}

var TTBFolderListener = {
	msgKeys: [],
	registered: false,

	registerTags: function(key, tags, uri) {
		if (key.charAt(0) != "D") return;
		//var obj = this.msgKeys[key+uri];
		var obj = this.msgKeys[key];
		if (obj) {
			obj.tags = tags;
			if (obj.msgHdr && obj.tags) {
				gTagToolbar.addTagsToNewMsg(obj.msgHdr, obj.tags);
			}
		} else {
			//this.msgKeys[key+uri] = { msgHdr: null, tags: tags };
			this.msgKeys[key] = { msgHdr: null, tags: tags };
		}
	},
	
	registerMsgHdr: function(key, msgHdr) {
		if (key.charAt(0) != "D") return;
		var uri = msgHdr.folder.URI;
		//var obj = this.msgKeys[key+uri];
		var obj = this.msgKeys[key];
		if (obj) {
			obj.msgHdr = msgHdr;
			if (obj.msgHdr && obj.tags) {
				gTagToolbar.addTagsToNewMsg(obj.msgHdr, obj.tags);
			}
		} else {
			//this.msgKeys[key+uri] = { msgHdr: msgHdr, tags: null };
			this.msgKeys[key] = { msgHdr: msgHdr, tags: null };
		}		
	},
	
	//New Mail Listener
	msgAdded: function(msgHdr) {
		var key = msgHdr.getStringProperty("x-tagtoolbar-keys");
		//if (!key) key = this.getXTagToolbarKeyFromMsgHeader(msgHdr);
		if (!key) return true;
		if (key.charAt(0) == "D") {
			this.registerMsgHdr(key, msgHdr);
		} else if (key.charAt(0) == "T") {
			var tags = key.substring(1).split(" ");
			gTagToolbar.addTagsToNewMsg(msgHdr, tags);
		}
	}
};
