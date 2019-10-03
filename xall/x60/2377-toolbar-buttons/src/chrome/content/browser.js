toolbar_buttons.toolbar_button_loader(toolbar_buttons.interfaces, {
	Clipboard:Cc['@mozilla.org/widget/clipboard;1'].getService(Ci.nsIClipboard),
	NavBookmarksService:Cc['@mozilla.org/browser/nav-bookmarks-service;1'].getService(Ci.nsINavBookmarksService),
	Transferable:function() { return Cc['@mozilla.org/widget/transferable;1'].createInstance(Ci.nsITransferable); }
});
toolbar_buttons.toolbar_button_loader(toolbar_buttons, {
		bookmarkNoPopup: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var uri = toolbar_buttons.interfaces.IOService.newURI(
			win.content.document.location.href, null, null);
		var title = win.content.document.title;
		if (title === "") {
			title = win.content.document.location.href;
		}
		toolbar_buttons.interfaces.NavBookmarksService.insertBookmark(
			toolbar_buttons.interfaces.NavBookmarksService.bookmarksMenuFolder,
			uri, toolbar_buttons.interfaces.NavBookmarksService.DEFAULT_INDEX, title);
	},
	bookmarksMenuButtonPopupShowing: function(event) {
		var win = event.target.ownerDocument.defaultView;
		try { // Firefox
			win.BookmarkingUI.onMainMenuPopupShowing(event);
		} catch(e) { // SeaMonkey
			win.BookmarksMenu.onPopupShowing(event, '');
		}
		if (!event.target.parentNode._placesView && event.target.parentNode.tagName == 'toolbarbutton') {
			new win.PlacesMenu(event, 'place:folder=BOOKMARKS_MENU');
		}
	},
	BrowserCloseAllTabs: function(event) {
		var win = event.target.ownerDocument.defaultView;
		win.gBrowser.removeAllTabsBut(win.gBrowser.addTab("about:blank"));
	},
	clickBookmarkManager: function(event) {
		var win = event.target.ownerDocument.defaultView;
		if(event.button == 1) {
			var browser = win.getBrowser();
			browser.selectedTab = browser.addTab("chrome://browser/content/places/places.xul");
		}
	},
	clipboardLink: {
		getText: function() {
			var clip = toolbar_buttons.interfaces.Clipboard;
			var trans = toolbar_buttons.interfaces.Transferable();
			trans.addDataFlavor("text/unicode");
			clip.getData(trans, clip.kGlobalClipboard);
			var str = {}, strLength = {};
			trans.getTransferData("text/unicode", str, strLength);
			if (str) {
				var pastetext = str.value.QueryInterface(Ci.nsISupportsString);
				if (pastetext) {
					return pastetext.data.substring(0, strLength.value / 2);
				}
			}
			return '';
		},
		open: function(event) {
			if (event.button == 1) {
				this.OpenNewTab(event);
			}
		},
		openCommand: function (event) {
			var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
			var mode = prefs.getIntPref("clipboard.open.mode");
			if(mode == 2) {
				this.OpenWindow(event);
			} else if(mode == 1) {
				this.OpenNewTab(event);
			} else {
				this.OpenLink(event);
			}
		},
		OpenNewTab: function(event) {
			var win = event.target.ownerDocument.defaultView;
			try {
				var browser = win.getBrowser();
				browser.selectedTab = browser.addTab(this.getText());
			} catch (e) {} // no clipboard data
		},
		OpenLink: function(event) {
			var win = event.target.ownerDocument.defaultView;
			try {
				win.loadURI(this.getText());
			} catch (e) {} // no clipboard data
	
		},
		OpenWindow: function(event) {
			var win = event.target.ownerDocument.defaultView;
			try {
				win.openNewWindowWith(this.getText(), win.content.document, null, false);
			} catch (e) {} // no clipboard data
		}
	},
	cloneTab: function(event) {
		var win = event.target.ownerDocument.defaultView;
		win.gBrowser.duplicateTab(win.gBrowser.selectedTab);
	},
	closeOtherTabs: function(event) {
		var win = event.target.ownerDocument.defaultView;
		win.gBrowser.removeAllTabsBut(win.gBrowser.mCurrentTab);
	},
	disableStyle: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var viewStyle = win.getMarkupDocumentViewer().authorStyleDisabled;
		try {
			if(viewStyle) {
				win.gPageStyleMenu.switchStyleSheet('');
			} else {
				win.gPageStyleMenu.disableStyle();
			}
		} catch(e) {
			// this works in SeaMonkey and older versions of Firefox
			win.setStyleDisabled(!viewStyle);
		}
	},
	doRenameTab: function(event) {
		var thisTab = toolbar_buttons.renameTabObj;
		thisTab.labelNode.style.display = "block";
		var label = thisTab.textBox.value;
		thisTab.textBox.parentNode.removeChild(thisTab.textBox);
		thisTab.label = label;
		toolbar_buttons.renameTabObj = null;
	},
	fullScreenMode: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var alertNone = toolbar_buttons.interfaces.ExtensionPrefBranch
			.getBoolPref("full.screen");
		if (alertNone === false) {
			var stringBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://toolbar-buttons/locale/button.properties");
			var title = stringBundle.GetStringFromName("full-screen");
			var message = stringBundle.GetStringFromName("full-screen.message");
			var checkbox = stringBundle.GetStringFromName("full-screen.checkbox");
			var check = {value: false};
			toolbar_buttons.interfaces.PromptService
				.alertCheck(win, title, message, checkbox, check);
			toolbar_buttons.interfaces.ExtensionPrefBranch
				.setBoolPref("full.screen", check.value);
		}
		win.BrowserFullScreen();
	},
	goClearBrowserCache: function() {
		var stringBundle = toolbar_buttons.interfaces.StringBundleService
			.createBundle("chrome://toolbar-buttons/locale/button.properties");
		var question = stringBundle.GetStringFromName("tb-clear-cache.question");
		var title = stringBundle.GetStringFromName("tb-clear-cache.label");
		var prompt = toolbar_buttons.interfaces.ExtensionPrefBranch.getBoolPref("clear.cache.check");
		if(!prompt || toolbar_buttons.interfaces.PromptService.confirm(null, title, question)) {
			// copied from chrome://browser/content/sanitize.js
		    var cache = Cc["@mozilla.org/netwerk/cache-storage-service;1"].
		                getService(Ci.nsICacheStorageService);
		    try {
		      // Cache doesn't consult timespan, nor does it have the
		      // facility for timespan-based eviction.  Wipe it.
		      cache.clear();
		    } catch(er) {}
		
		    var imageCache = Cc["@mozilla.org/image/tools;1"].
		                     getService(Ci.imgITools).getImgCacheForDocument(null);
		    try {
		      imageCache.clearCache(false); // true=chrome, false=content
		    } catch(er) {}
	    }
	},
	hideImages: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var test = win._content.document.getElementById("__zapImg");
		if(test) {
			test.parentNode.removeChild(test);
		} else {
			var style = win._content.document.createElement("style");
			style.setAttribute("type", "text/css");
			style.setAttribute("id", "__zapImg");
			style.innerHTML = "img, embed, object { visibility: hidden !important; } "
							+ "html * { background-image: none !important; }";
			var head = win._content.document.getElementsByTagName("head")[0];
			head.appendChild(style);
		}
	},
	hideURLText: function(item) {
		var doc = item.ownerDocument;
		var urlbar = doc.getElementById("urlbar");
		var comStyle = doc.defaultView.getComputedStyle(urlbar, "").getPropertyValue("background-color");
		if (urlbar.style.color == comStyle) {
			item.checked = false;
			urlbar.style.color = "";
		} else {
			item.checked = true;
			urlbar.style.color = comStyle;
		}
		return false;
	},
	JavaToggle: {
		/*
		 * Credit for much of this code belongs to Prefbar, and is used
		 * under the terms of the GPL
		 */
	
		//Java(TM) Plug-in                  <-- Linux
		//IcedTea NPR Web Browser Plugin    <-- Linux (http://icedtea.classpath.org/)
		//Java Embedding Plugin 0.9.7.2     <-- Mac OS X
		//InnoTek OS/2 Kit for Java Plug-in <-- OS/2
		//Java(TM) Platform SE 6 U16        <-- Windows
		//Java Deployment Toolkit 6.0.160.1 <-- Don't match for this!
		prefbarRegExJava: /(^| )(java|icedtea).*(platform|plug-?in)/i,
	
		toggle: function(event) {
			var doc = event.target.ownerDocument;
			var state = this.status(),
				button = doc.getElementById("java-toggle"),
				prefs = toolbar_buttons.interfaces.PrefBranch;
			prefs.setBoolPref("security.enable_java", !state);
			toolbar_buttons.PluginHelper.SetPluginEnabled(this.prefbarRegExJava, !state, "Java");
			toolbar_buttons.setButtonStatus(button, !state);
			toolbar_buttons.checkBrowserReload(button.ownerDocument.defaultView);
		},
	
		status: function() {
			var prefs = toolbar_buttons.interfaces.PrefBranch, state = true;
			try {
				state = prefs.getBoolPref("security.enable_java");
			} catch(e) {}
			return state && toolbar_buttons.PluginHelper.GetPluginEnabled(this.prefbarRegExJava);
		}
	},
	loadAddonsBar: function(doc, show) {
		var win = doc.defaultView;
		if(!doc.getElementById("tb-addon-bar") && (doc.getElementById('statusbar-toggle') || doc.getElementById('statusbar-toggle-menu-item'))) {
			var stringBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://toolbar-buttons/locale/button.properties");
			var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
			
			var addonbar = doc.createElement('toolbar');
			addonbar.id = "tb-addon-bar";
			addonbar.setAttribute("class", "toolbar-primary chromeclass-toolbar");
			addonbar.setAttribute("toolbarname", stringBundle.GetStringFromName("statusbar-toggle-toolbar-name"));
			addonbar.setAttribute("hidden", "true");
			addonbar.setAttribute("context", "toolbar-context-menu");
			addonbar.setAttribute("toolboxid", "navigator-toolbox");
			addonbar.setAttribute("mode", "icons");
			addonbar.setAttribute("iconsize", "small");
			addonbar.setAttribute("customizable", "true");
			if(show) {
				addonbar.setAttribute("collapsed", false);
				prefs.setBoolPref('statusbar-toggle.collapsed', false);
			} else {
				addonbar.setAttribute("collapsed", prefs.getBoolPref('statusbar-toggle.collapsed'));
			}
					
			doc.getElementById('browser-bottombox').appendChild(addonbar);
			addonbar._delegatingToolbar = "tb-addon-bar";
			CustomizableUI.registerArea("tb-addon-bar", {
				legacy: false,
				type: CustomizableUI.TYPE_TOOLBAR,
				defaultPlacements: [],
				defaultCollapsed: false
			}, true);
			addonbar.setAttribute("hidden", "false");
			var tb = toolbar_buttons;
			var observer = function(mutations) {
				if(prefs.getBoolPref('statusbar-toggle.collapsed') != addonbar.collapsed) {
					prefs.setBoolPref('statusbar-toggle.collapsed', addonbar.collapsed);
					tb.setButtonStatus(doc.getElementById('statusbar-toggle'), addonbar.collapsed || addonbar.hidden);
				}
			};
			var mutationObserver = new win.MutationObserver(observer);
			mutationObserver.observe(addonbar, { attributes: true, subtree: false });
			prefs.addObserver("statusbar-toggle.collapsed", {
				observe: function(subject, topic, data) {
					if (topic != "nsPref:changed") {
						return;
					}
					var value = prefs.getBoolPref('statusbar-toggle.collapsed');
					if(value != addonbar.collapsed) {
						addonbar.collapsed = value;
					}
				}
			}, false);
		}
		toolbar_buttons.loadToggleToolbar(doc, "statusbar-toggle", "tb-addon-bar");
	},
	loadHigherFolders: function(popup) {
		var doc = popup.ownerDocument;
		var win = doc.defaultView;
		while (popup.lastChild && popup.lastChild.nodeName != 'menuseparator') {
			popup.removeChild(popup.lastChild);
		}
		var item = null, location = win.content.document.location,
			pathname = location.pathname;
		if(!pathname) {
			item = doc.createElement("menuitem");
			var stringBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://toolbar-buttons/locale/button.properties");
			var empty = stringBundle.GetStringFromName("empty");
			item.setAttribute("label", empty);
			item.setAttribute("disabled", true);
			popup.appendChild(item);
		} else {
			pathname = toolbar_buttons.trimFolderPath(pathname);
			do {
				item = doc.createElement("menuitem");
				item.setAttribute("label", location.host + pathname);
				item.addEventListener("command", function() {
					win.loadURI(location.protocol + "//" + location.host + pathname);
				}, false);
				item.addEventListener("click", function(event) {
						toolbar_buttons.openPageTab(location.protocol + "//" + location.host + pathname, event);
				}, false);
				popup.appendChild(item);
				pathname = toolbar_buttons.trimFolderPath(pathname);
			} while (pathname);
			if(location.pathname == "/" && location.hash == "") {
				item.setAttribute("disabled", true);
			}
		}
	},
	openBookmarkManager: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		if (prefs.getBoolPref("bookmark.manager.tab")) {
			var browser = win.getBrowser();
			browser.selectedTab = browser.addTab("chrome://browser/content/places/places.xul");
		} else {
			win.PlacesCommandHook.showPlacesOrganizer('AllBookmarks');
		}	
	},
	openCookieTab: function(event) {
		var win = event.target.ownerDocument.defaultView;
		if(event.button == 1) {
			win.getBrowser().selectedTab = win.getBrowser().addTab("chrome://browser/content/preferences/cookies.xul");;
		}
	},
	OpenLinkPref: function(pref, event) {
		var win = event.target.ownerDocument.defaultView;
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var changed = prefs.prefHasUserValue(pref);
		if (changed != true) {
			var stringBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://toolbar-buttons/locale/button.properties");
			var message = stringBundle.GetStringFromName("change-default-page.message");
			var title = stringBundle.GetStringFromName("change-default-page.title");
			toolbar_buttons.interfaces.PromptService.alert(null, title, message);
		} else {
			var url = prefs.getCharPref(pref).split('|');
			toolbar_buttons.openPage(url[0], event);
			if(url.length > 1) {
				var browser = win.getBrowser();
				for(var i=1, max=url.length; i<max; i++){
					browser.addTab(url[i]);
				}
			}
		}
	},
	openOptionsTab: function(event) {
		toolbar_buttons.openPageTab('chrome://browser/content/preferences/preferences.xul', event);
	},
	openPasswordsTab: function(event) {
		var win = event.target.ownerDocument.defaultView;
		if(event.button == 1) {
			win.getBrowser().selectedTab = win.getBrowser().addTab("chrome://passwordmgr/content/passwordManager.xul");
		}
	},
	personalBookmakrsMenuButon: function(item, event) {
		var win = item.ownerDocument.defaultView;
		if (!item.parentNode._placesView && event.target.parentNode.tagName == 'toolbarbutton') {
			new win.PlacesMenu(event, 'place:folder=TOOLBAR');
		}
	},
	readMail: function(event) {
		try {
			Cc["@mozilla.org/browser/shell-service;1"].getService(Ci.nsIShellService).openApplication(Ci.nsIShellService.APPLICATION_MAIL);
		} catch (e) {
			toolbar_buttons.initApp(event, "Mail");
		}
	},
	readNews: function(event) {
		try {
			Cc["@mozilla.org/browser/shell-service;1"].getService(Ci.nsIShellService).openApplication(Ci.nsIShellService.APPLICATION_NEWS);
		} catch (e) {
			toolbar_buttons.initApp(event, "News");
		}
	},
	renameAllTabsBlank: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var tabs = win.gBrowser.mTabContainer.childNodes;
		for (var i = 0; i < tabs.length; i++) {
			var tab = tabs[i];
			tab.label = "";
			tab.removeAttribute("image");
		}
	},
	renameTab: function(event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		if(toolbar_buttons.renameTabObj)
			return;
		var thisTab = win.getBrowser().selectedTab;
		thisTab.labelNode = doc.getAnonymousElementByAttribute(thisTab, "class", "tab-text");
		if(thisTab.labelNode == null) {
			thisTab.labelNode = doc.getAnonymousElementByAttribute(thisTab, "class", "tab-text tab-label");
		}
		var thisTitle = thisTab.label;
		thisTab.labelNode.style.display = "none";
		var textBox = doc.createElement("textbox");
		thisTab.textBox = thisTab.labelNode.parentNode.appendChild(textBox);
		thisTab.textBox.focus();
		thisTab.textBox.value = thisTitle;
		thisTab.textBox.addEventListener("blur", toolbar_buttons.doRenameTab, true);
		thisTab.textBox.addEventListener("keypress", toolbar_buttons.renameTabInput, true);
		toolbar_buttons.renameTabObj = thisTab;
	},
	renameTabBlank: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var thisTab = win.getBrowser().selectedTab;
		thisTab.label = "";
		thisTab.removeAttribute("image");
	},
	renameTabInput: function(event) {
		var thisTab = toolbar_buttons.renameTabObj;
		if (event.keyCode == event.DOM_VK_RETURN)
			thisTab.focus();
	},
	saveFrame: function(event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		try {
			win.saveFrameDocument();
		} catch(e) {
			// Firefox 4
			var focusedWindow = doc.commandDispatcher.focusedWindow;
			if (win.isContentFrame(focusedWindow)) {
				win.saveDocument(focusedWindow.document);
			}
		}
	},
	SearchResizeLoad: function(doc) {
		var searchBar = doc.getElementById("search-container");
		if((!doc.getElementById('tb-search-resize')
				&& !doc.getElementById('tb-search-plus')
				&& !doc.getElementById('tb-search-minus')) || !searchBar)
			return;
		searchBar.style.maxWidth = searchBar.width + 'px';
	},
	setAnimationState: function(doc, state) {
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		prefs.setBoolPref("browser.blink_allowed", state);
		prefs.setCharPref("image.animation_mode", state ? "normal" : "none");
		toolbar_buttons.cssFileToUserContent(doc, "chrome://toolbar-buttons/content/files/marquee.css", state, false, "stop-animation");
		toolbar_buttons.setButtonStatus(doc.getElementById("stop-animation"), state);
	},
	setCookieMenuItem: function(item) {
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		var cookieState = prefs.getIntPref("network.cookie.cookieBehavior");
		for(var menuitem in item.childNodes) {
			if(item.childNodes[menuitem].getAttribute('value') == cookieState) {
				item.childNodes[menuitem].setAttribute('checked', 'true');
				return;
			}
		}
	},
	setCookieValue: function(event) {
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		if(event.originalTarget.hasAttribute('value')) {
			prefs.setIntPref("network.cookie.cookieBehavior", event.originalTarget.getAttribute('value'));
		}
	},
	setHowLinksOpen: function() {
		var prefs = toolbar_buttons.interfaces.PrefBranch,
			setting = prefs.getIntPref("browser.link.open_newwindow"),
			next = [3, 2, 3, 1];
		prefs.setIntPref("browser.link.open_newwindow.restriction", 0);
		prefs.setIntPref("browser.link.open_newwindow", next[setting]);
		prefs.setIntPref("browser.link.open_external", next[setting]);
	},
	stopAll: function(event) {
		var win = event.target.ownerDocument.defaultView;
		for (var i = 0; i < win.gBrowser.mTabContainer.childNodes.length; i++) {
			win.gBrowser.browsers[i].stop();
		}
	},
	tabListDropDown: function(item) {
		var doc = item.ownerDocument;
		while (item.firstChild) {
			item.removeChild(item.firstChild);
		}
		var tabcontainer = doc.getElementById("content").mTabContainer;
		var tabs = tabcontainer.childNodes;
		//tabcontainer._stopAnimation();
		for ( var i = 0; i < tabs.length; i++) {
			var menuItem = doc.createElement("menuitem");
			var curTab = tabs[i];
			if (curTab.selected) {
				menuItem.setAttribute("selected", "true");
			}
			menuItem.setAttribute("class", "menuitem-iconic alltabs-item");
			menuItem.setAttribute("label", curTab.label);
			menuItem.setAttribute("crop", curTab.getAttribute("crop"));
			menuItem.setAttribute("image", curTab.getAttribute("image"));
			if (curTab.hasAttribute("busy")) {
				menuItem.setAttribute("busy", curTab.getAttribute("busy"));
			}
			var URI = curTab.linkedBrowser.currentURI.spec;
			menuItem.setAttribute("statustext", URI);
			/*try {
				curTab.mCorrespondingMenuitem = menuItem;
				curTab.addEventListener("DOMAttrModified", item, false);
			} catch (e) {
			}*/
			menuItem.tab = curTab;
			menuItem.addEventListener("command",
				function() {
					var tabcontainer = doc.getElementById("content").mTabContainer;
					tabcontainer.selectedItem = this.tab;
					tabcontainer.mTabstrip.scrollBoxObject.ensureElementIsVisible(this.tab);
				}, false);
			item.appendChild(menuItem);
		}
	},
	toggleCookies: function(button) {
		toolbar_buttons.prefToggleNumber(button, 'network.cookie.cookieBehavior', [1,2,3,0]);
	},
	toggleImages: function(button) {
		toolbar_buttons.prefToggleNumber(button, 'permissions.default.image', [1,2,3,1]);
		toolbar_buttons.checkBrowserReload(button.ownerDocument.defaultView);
	},
	toggleJavaScript: function(button) {
		toolbar_buttons.prefToggleStatus(button, "javascript.enabled");
		toolbar_buttons.checkBrowserReload(button.ownerDocument.defaultView);
	},
	toggleMinimumFontSize: function() {
		var extPrefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		var promptService = toolbar_buttons.interfaces.PromptService;
		var strBundle = toolbar_buttons.interfaces.StringBundleService
			.createBundle("chrome://toolbar-buttons/locale/button.properties");
		try {
			prefs.getIntPref("font.minimum-size.x-western");
		} catch (e) {
			prefs.setIntPref("font.minimum-size.x-western", 0);
		}
		if (prefs.getIntPref("font.minimum-size.x-western") == 0 &&
				extPrefs.getIntPref("minimum.font.size") == 0) {
			var message = strBundle.GetStringFromName("min-font-message");
			var title = strBundle.GetStringFromName("min-font-title");
			var check = {value: false};
			var input = {value: "14"};
			var result = promptService.prompt(null, title, message, input, null, check);
			if (result) {
				extPrefs.setIntPref("minimum.font.size", input.value.replace(/[^0-9]/, ""));
			} else {
				return;
			}
		} else if (extPrefs.getIntPref("minimum.font.size") == 0) {
			extPrefs.setIntPref("minimum.font.size", prefs.getIntPref("font.minimum-size.x-western"));
		}
		if (prefs.getIntPref("font.minimum-size.x-western") == 0) {
			prefs.setIntPref("font.minimum-size.x-western", extPrefs.getIntPref("minimum.font.size"));
		} else {
			prefs.setIntPref("font.minimum-size.x-western", 0);
		}
	},
	togglePopUp: function(event) {
		var doc = event.target.ownerDocument;
		var blockPopUp = toolbar_buttons.interfaces.PrefBranch.getBoolPref("dom.disable_open_during_load");
		var button = doc.getElementById("tb-toggle-popup-blocker");
		if (blockPopUp === true) {
			//toolbar_buttons.interfaces.PrefBranch.setCharPref("dom.disable_open_during_load","change click dblclick mouseup reset submit");
			toolbar_buttons.interfaces.PrefBranch.setIntPref("privacy.popups.disable_from_plugins", 0);
		} else {
			//toolbar_buttons.interfaces.PrefBranch.setCharPref("dom.popup_allowed_events","");
			toolbar_buttons.interfaces.PrefBranch.setIntPref("privacy.popups.disable_from_plugins", 2);
		}
		toolbar_buttons.interfaces.PrefBranch.setBoolPref("dom.disable_open_during_load", !blockPopUp);
		toolbar_buttons.setButtonStatus(button, !blockPopUp);
	},
	toJavaScriptConsole: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var extPrefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		if(prefs.getBoolPref('devtools.errorconsole.enabled')) {
			win.toJavaScriptConsole();
		} else {
			if(extPrefs.getIntPref("javascript.console.open") == 1) {
				win.HUDService.toggleBrowserConsole();
			} else {
				win.gDevToolsBrowser.selectToolCommand(win.gBrowser, "webconsole");
			}
		}	
	},
	toogleAddonsBar: function(event) {
		var doc = event.target.ownerDocument;
		if(doc.getElementById("tb-addon-bar")) {
			toolbar_buttons.toggleToolbar(event, 'tb-addon-bar');
		} else {
			toolbar_buttons.loadAddonsBar(doc, true);
		}
	},
	TranslatePage: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var to = toolbar_buttons.interfaces.ExtensionPrefBranch.getCharPref("translate.lang");
		var translator = toolbar_buttons.interfaces.ExtensionPrefBranch.getCharPref("translate.service");
		
		/*if(translator == "bing") {
			var doc = win.getBrowser().contentDocument;
			var script = doc.createElement('script');
			script.type = 'text/javascript';
			script.src = 'http://labs.microsofttranslator.com/bookmarklet/default.aspx?f=js&to=' + to; 
			doc.body.insertBefore(script, doc.body.firstChild);	
		} else*/ if(translator == "promt") {
			var pto = toolbar_buttons.interfaces.ExtensionPrefBranch.getCharPref("translate.promt");
			var targetURI = win.getWebNavigation().currentURI.spec;
			var service = 'http://www.online-translator.com/siteTranslation/autolink/?direction=' + pto + '&template=General&sourceURL=' + encodeURIComponent(targetURI);
			win.loadURI(service);
		} else {
			var service = "http://translate.google.com/translate?u=";
			var targetURI = win.getWebNavigation().currentURI.spec;
			var langs = "&tl=" + to;
			if (targetURI.indexOf("translate.google.com") > 0 ||
					targetURI.indexOf("64.233.179") > 0) {
				win.BrowserReload();
			} else {
				win.loadURI(service + encodeURIComponent(targetURI) + langs);
			}
		}
	},
	trimFolderPath: function(pathname) {
		if (pathname.indexOf("index") != -1) {
			pathname = pathname.substring(0, pathname.indexOf("index"));
		}
		return pathname.substring(0, pathname.substring(0, pathname.length - 1).lastIndexOf("/") + 1);
	},
	upOneFolder: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var location = win.content.document.location,
			pathname = location.pathname;
		if(pathname == "/" && location.hash == "") {
			return;
		}
		pathname = toolbar_buttons.trimFolderPath(pathname);
		win.content.document.location = location.protocol + "//" + location.host + pathname;
	},
	viewCookieExceptions: function(event) {
		if(event.button == 1) {
			toolbar_buttons.openPermissions(event, "cookie",
					"cookiepermissionstitle", "cookiepermissionstext");
		}
	},
	viewCookies: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var wm = toolbar_buttons.interfaces.WindowMediator;
		var cookieWin = wm.getMostRecentWindow("Browser:Cookies");
		if (cookieWin) {
			cookieWin.gCookiesWindow.setFilter(toolbar_buttons.getETDL(event));
			cookieWin.focus();
		} else {
			win.openDialog("chrome://browser/content/preferences/cookies.xul",
					"Browser:Cookies", "", {filterString : toolbar_buttons.getETDL(event)});
		}
	},
	viewImageExceptions: function(event) {
		if(event.button == 1) {
			toolbar_buttons.openPermissions(event, "image",
					"imagepermissionstitle", "imagepermissionstext");
		}
	},
	ViewPageSourceNow: function(event) {
		var win = event.target.ownerDocument.defaultView;
		if (event.button == 1) {
			var focusedWindow = win.content;
			var docCharset = "charset=" + focusedWindow.document.characterSet;
			var reference = focusedWindow.getSelection();
			if (!reference.isCollapsed) {
				win.openDialog("chrome://global/content/viewPartialSource.xul",
								"_blank", "scrollbars,resizable,chrome,dialog=no,centerscreen",
								null, docCharset, reference, "selection");
			} else {
				var sourceURL = "view-source:" + win.content.document.location.href;
				win.gBrowser.selectedTab = win.gBrowser.addTab(sourceURL);
			}
		} else if (event.button == 2) {
			var url = win.content.document.location.href;
			win.openWebPanel(url, "view-source:" + url);
		} else if (event.button != 0) {
			win.BrowserViewSourceOfDocument(win.content.document);
		}
	},
	viewPasswords: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var wm = toolbar_buttons.interfaces.WindowMediator;
		var passwordWin = wm.getMostRecentWindow("Toolkit:PasswordManager");
		if (passwordWin) {
			passwordWin.gCookiesWindow.setFilter(toolbar_buttons.getETDL(event));
			passwordWin.focus();
		} else {
			win.openDialog("chrome://passwordmgr/content/passwordManager.xul",
					"Toolkit:PasswordManager", "", {filterString : toolbar_buttons.getETDL(event)});
		}
	},
	viewPopupExceptions: function(event) {
		if(event.button == 1) {
			toolbar_buttons.openPermissions(event, "popup",
					"popuppermissionstitle", "popuppermissionstext");
		}
	}
});
