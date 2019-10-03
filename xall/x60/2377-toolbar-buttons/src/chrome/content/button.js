toolbar_buttons.toolbar_button_loader(toolbar_buttons.interfaces, {
	AppStartup:Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup),
	EffectiveTLDService:Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService),
	ExtensionPrefBranch:Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).getBranch("extension.tbutton."),
	ExternalProtocolService:Cc['@mozilla.org/uriloader/external-protocol-service;1'].getService(Ci.nsIExternalProtocolService),
	FilePicker: function() { return Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker); },
	IOService:Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService),
	LocalFile:function() { return Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile); },
	ObserverService:Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),
	PluginHost:Cc["@mozilla.org/plugin/host;1"].getService(Ci.nsIPluginHost),
	PrefBranch:Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefBranch),
	PrefService:Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService),
	Process: function() { return Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess); },
	PromptService:Cc['@mozilla.org/embedcomp/prompt-service;1'].getService(Ci.nsIPromptService),
	Properties:Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties),
	ScriptableInputStream:Cc["@mozilla.org/scriptableinputstream;1"].getService(Ci.nsIScriptableInputStream),
	StringBundleService:Cc['@mozilla.org/intl/stringbundle;1'].getService(Ci.nsIStringBundleService),
	StyleSheetService:Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService),
	SupportsPRBool:function() { return Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool); },
	WindowMediator:Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator),
	XULAppInfo:function() { return Cc["@mozilla.org/xre/app-info;1"].createInstance(Ci.nsIXULAppInfo); }
});
toolbar_buttons.toolbar_button_loader(toolbar_buttons, {
		aboutAboutMenu: function(item) {
		var doc = item.ownerDocument;
		if (item.firstChild) {
			return;
		}
		if(item.tagName == 'panelview') {
			// these lines take care working well with the Panel
			var itemType = 'toolbarbutton';
			item.classList.add('mozbutton-panelview')
			var vbox = doc.createElement('vbox');
			item.appendChild(vbox);
			item = vbox;
			var className = 'subviewbutton';
		} else {
			var itemType = 'menuitem';
			var className = '';
		}
		var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		var gProtocols = [];
		for (var cid in Cc) {
			var result = cid.match(/@mozilla.org\/network\/protocol\/about;1\?what\=(.*)$/);
			if (result) {
				var aboutType = result[1];
				var contract = "@mozilla.org/network/protocol/about;1?what=" + aboutType;
				try {
					var am = Cc[contract].getService(Ci.nsIAboutModule);
					var uri = ios.newURI("about:"+aboutType, null, null);
					var flags = am.getURIFlags(uri);
					if (!(flags & Ci.nsIAboutModule.HIDE_FROM_ABOUTABOUT)) {
						gProtocols.push(aboutType);
					}
				} catch (e) {
					// getService might have thrown if the component doesn't actually
					// implement nsIAboutModule
				}
			}
		}
		gProtocols.sort().forEach(function(aProtocol) {
			var uri = "about:" + aProtocol;
			var menuItem = doc.createElement(itemType);
			menuItem.setAttribute("label", uri);
			if(className) {
				menuItem.classList.add(className);
			}
			menuItem.addEventListener("click", function(event) {
					toolbar_buttons.openPageInTab(uri, event);
				}, false);
			item.appendChild(menuItem);
		});
	},
	addDictionaries: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var uri = win.formatURL("browser.dictionaries.download.url", true);
	
		var locale = "-";
		try {
		  locale = win.gPrefService.getComplexValue("intl.accept_languages", Ci.nsIPrefLocalizedString).data;
		}
		catch (e) { }
	
		var version = "-";
		try {
		  version = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).version;
		}
		catch (e) { }
	
		uri = uri.replace(/%LOCALE%/, win.escape(locale)).replace(/%VERSION%/, version);
	
		var newWindowPref = win.gPrefService.getIntPref("browser.link.open_newwindow");
		var where = newWindowPref == 3 ? "tab" : "window";
	
		win.openUILinkIn(uri, where);
	},
	addDictionaryList: function(item) {
		var doc = item.ownerDocument;
		while (item.firstChild && item.firstChild.nodeName != 'menuseparator') {
			item.removeChild(item.firstChild);
		}
		var sep = item.firstChild;
		try {
			var prefs = toolbar_buttons.interfaces.PrefBranch;
			var current = prefs.getCharPref("spellchecker.dictionary");
			var spellclass = "@mozilla.org/spellchecker/myspell;1";
			if ("@mozilla.org/spellchecker/hunspell;1" in Cc) {
				spellclass = "@mozilla.org/spellchecker/hunspell;1";
			} else if ("@mozilla.org/spellchecker/engine;1" in Cc) {
				spellclass = "@mozilla.org/spellchecker/engine;1";
			}
			var spellchecker = Cc[spellclass].createInstance(Ci.mozISpellCheckingEngine);
			var editorSpellChecker = Cc['@mozilla.org/editor/editorspellchecker;1'].createInstance(Ci.nsIEditorSpellCheck);
			
			var o1 = {};
			var o2 = {};
			
			spellchecker.getDictionaryList(o1, o2);
			var dictList = o1.value;
			var count	= o2.value;
			
			var languageBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://global/locale/languageNames.properties");
			var regionBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://global/locale/regionNames.properties");
	
			for (var i = 0; i < count; i++) {
				var menuitem = doc.createElement("menuitem");
				var language = dictList[i];
				if (language == current) {
					menuitem.style.fontWeight = "900";
					menuitem.setAttribute("checked", true);
				}
				menuitem.setAttribute("name", "dictionary");
				menuitem.setAttribute("type", "radio");
				menuitem.setAttribute("label", toolbar_buttons.getDictionaryName(language, languageBundle, regionBundle));
				menuitem.language = language;
				menuitem.addEventListener("command", function() {				
					 // this is done by SetCurrentDictionary so if that works, this is not needed
					 prefs.setCharPref("spellchecker.dictionary", this.language);
				}, false);
				item.insertBefore(menuitem, sep);
			}
		} catch(e) {
			var menuitem = doc.createElement("menuitem");
			var stringBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://toolbar-buttons/locale/button.properties");
			var empty = stringBundle.GetStringFromName("empty");
			menuitem.setAttribute("label", empty);
			menuitem.setAttribute("disabled", true);
			item.insertBefore(menuitem, sep);
		}
	},
	allMenusAddItem: function(menu, item, showIcons) {
		if(!menu.firstChild) {
			return;
		}
		var node = menu.cloneNode(false);
		node.setAttribute('hidden', false);
		if(showIcons) {
			node.classList.add('menu-iconic');
			node.classList.add('menuitem-iconic');
		}
		item.appendChild(node);
		node.cloneTarget = menu;
		if(menu.firstChild) {
			node.appendChild(menu.firstChild);
		}
		menu.style.visibility = 'visible';
	},
	allMenusReturnPopups: function(item, event) {
		if(event.originalTarget != item) {
			return;
		}
		var nodes = item.childNodes;
		for(var i = 0; i < nodes.length; i++) {
			if(nodes[i].cloneTarget && nodes[i].firstChild) {
				nodes[i].cloneTarget.appendChild(nodes[i].firstChild);
			}
		}
	},
	allMenusStartUp: function(doc) {
		var menubar = doc.getElementById('main-menubar') || doc.getElementById('mail-menubar');
		var fileName = doc.location.href.match(/([a-zA-Z]+).xul$/)[1];
		if(!menubar) {
			return;
		}
		var toolbar = doc.getElementById('toolbar-menubar') || doc.getElementById('mail-toolbar-menubar2') || doc.getElementById('compose-toolbar-menubar2');
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var prefsBranch = toolbar_buttons.interfaces.PrefBranch;
		prefs.setBoolPref('all-menus._menus.'+ fileName + '.' + menubar.id, menubar.collapsed);
	
		/* if(!toolbar.getAttribute('toolbarname') && toolbar.getAttribute('grippytooltiptext')) {
			toolbar.setAttribute('toolbarname', toolbar.getAttribute('grippytooltiptext'));
		} */
		for (var i = 0; i < menubar.childNodes.length; i++) {
			var label = menubar.childNodes[i].getAttribute('label');
			var menuId = menubar.childNodes[i].id;
			if(!label || !menuId) {
				continue;
			}
			prefs.setCharPref('all-menus.'+ fileName + '.' + menubar.id +'.label.' + menuId, label);
			var collapsedPref = 'all-menus.'+ fileName + '.' + menubar.id +'.collapsed.' + menuId;
			if(prefs.getPrefType(collapsedPref)) {
				menubar.childNodes[i].setAttribute('hidden', prefs.getBoolPref(collapsedPref));
			} else {
				prefs.setBoolPref(collapsedPref, false);
			}
			var inMenuPref = 'all-menus.' + fileName + '.' + menubar.id +'.in-menu.' + menuId;
			if(!prefs.getPrefType(inMenuPref)) {
				prefs.setBoolPref(inMenuPref, true);
			}
		}	
		var hiddenWatcher = new toolbar_buttons.settingWatcher(prefs.root + 'all-menus.'+ fileName + '.' + menubar.id +'.collapsed.', function(subject, topic, data) {
			doc.getElementById(data).setAttribute('hidden', prefsBranch.getBoolPref(subject.root + data));
		});
		hiddenWatcher.startup();
	},
	changeTextDirection: function(event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		try {
			var browser = win.gBrowser.mCurrentBrowser;
		} catch (e) {
			var browser = doc.getElementById("messagepane");
		}
		toolbar_buttons.SwitchDocumentDirection(browser.contentWindow);
	},
	getDictionaryName: function(langId, languageBundle, regionBundle) {
		// copied out of Firefox, with minor change to use GetStringFromName
		var langLabel;
		try	{
			var isoStrArray = langId.split(/[-_]/);
			if (languageBundle && isoStrArray[0]) {
				langLabel = languageBundle.GetStringFromName(isoStrArray[0].toLowerCase());
			}
	
			if (regionBundle && langLabel && isoStrArray.length > 1 && isoStrArray[1]) {
				var menuStr2 = regionBundle.GetStringFromName(isoStrArray[1].toLowerCase());
				if (menuStr2) {
					langLabel += "/" + menuStr2;
				}
			}
	
			if (langLabel && isoStrArray.length > 2 && isoStrArray[2]) {
				langLabel += " (" + isoStrArray[2] + ")";
			}
		
			if (!langLabel) {
				langLabel = langId;
			}
		} catch (ex) {
			// getString throws an exception when a key is not found in the
			// bundle. In that case, just use the original dictList string.
			langLabel = langId;
		}
		return langLabel;
	},
	loadAllMenusMenu: function(item, event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		if(item.id != 'tb-all-menus-popup') {
			return;
		}
		while(item.firstChild) {
			item.removeChild(item.firstChild);
		}
		var fileName = doc.location.href.match(/([a-zA-Z]+).xul$/)[1];
		var menubar = doc.getElementById('main-menubar') || doc.getElementById('mail-menubar');
		if(!menubar) {
			return;
		}
		var toolbar = doc.getElementById('toolbar-menubar') || doc.getElementById('mail-toolbar-menubar2') || doc.getElementById('compose-toolbar-menubar2');
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var showIcons = prefs.getBoolPref('all-menus.icons');
		item.parentNode.setAttribute('show_icons', showIcons);
		for (var i = 0; i < menubar.childNodes.length; i++) {
			var menuId = menubar.childNodes[i].id;
			var inMenuPref = 'all-menus.' + fileName + '.' + menubar.id +'.in-menu.' + menuId;
			if(prefs.getPrefType(inMenuPref)) {
				if(prefs.getBoolPref(inMenuPref)) {
					toolbar_buttons.allMenusAddItem(menubar.childNodes[i], item, showIcons);
				}
			} else {
				toolbar_buttons.allMenusAddItem(menubar.childNodes[i], item, showIcons);
			}
		}
		var stringBundle = toolbar_buttons.interfaces.StringBundleService
			.createBundle("chrome://toolbar-buttons/locale/button.properties");
		if(prefs.getBoolPref('all-menus.settings')) {
			var menuseparator = doc.createElement('menuseparator');
			item.appendChild(menuseparator);
			if(item.parentNode.parentNode != toolbar) {
				var menubarCheck = doc.createElement('menuitem');
				menubarCheck.setAttribute("label", stringBundle.GetStringFromName("tb-all-menus.menubar"));
				var visibility = !(toolbar.getAttribute('autohide') == 'true' || toolbar.getAttribute('hidden') == 'true');
				menubarCheck.setAttribute("checked", visibility);
				menubarCheck.addEventListener("command", function(event) {
					try {
						CustomizableUI.setToolbarVisibility(toolbar.id, !visibility);
					} catch(e) {
						if(toolbar.hasAttribute('hidden')) {
							toolbar.setAttribute("hidden", visibility);
							toolbar.removeAttribute("autohide");
							doc.persist(toolbar.id, "hidden");
							doc.persist(toolbar.id, "autohide");
						} else {
							toolbar.setAttribute("autohide", visibility);
							doc.persist(toolbar.id, "hidden");
						}
					}
				}, true);
				item.appendChild(menubarCheck);
			}
			var menubarSettings = doc.createElement('menuitem');
			menubarSettings.setAttribute("label", stringBundle.GetStringFromName("tb-all-menus.settings"));
			menubarSettings.addEventListener("command", function(event) {
				var ary = Cc["@mozilla.org/supports-array;1"].createInstance(Ci.nsISupportsArray);
				var supportsStringPanel = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
				supportsStringPanel.data = "prefpane-tb-all-menus-tooltip";
				ary.AppendElement(supportsStringPanel);
				var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
				ww.openWindow(win, "chrome://toolbar-buttons/content/options.xul", "", "chrome,centerscreen,toolbar", ary);
			}, true);
			item.appendChild(menubarSettings);
		}
	},
	loadDocumentColors: function(doc) {
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		var obj = {};
		var children = prefs.getChildList("browser.display.document_color_us", obj);
		if(obj.value == 0) {
			toolbar_buttons.loadPrefWatcher(doc, "browser.display.use_document_colors", "use-document-colors");
		} else {
			toolbar_buttons.loadPrefWatcher(doc, "browser.display.document_color_use", "use-document-colors");
		}
	},
	openDomInspector: function(event, aDocument) {
		var win = event.target.ownerDocument.defaultView;
		try {
			win.inspectDOMDocument(aDocument);
		} catch(e) {
			try {
				win.BrowserToolboxProcess.init();
			} catch(e) {
				toolbar_buttons.wrongVersion(event);
			}
		}
	},
	openMigrateWindow: function(event) {
		var win = event.target.ownerDocument.defaultView;
		win.openDialog("chrome://browser/content/migration/migration.xul",
				"Browser:MigrationWizard", "", null);
	},
	profileFolder: function() {
		var file = toolbar_buttons.interfaces.Properties.get('ProfD', Ci.nsIFile)
			.QueryInterface(Ci.nsILocalFile);
		try {
			file.launch();
		} catch(e) {
			var uri = toolbar_buttons.interfaces.IOService.newFileURI(file);
			toolbar_buttons.interfaces.ExternalProtocolService.loadUrl(uri);
		}
	},
	reloadPAC: function() {
		Cc['@mozilla.org/network/protocol-proxy-service;1'].getService().reloadPAC();
	},
	setProxyButtonState: function(doc, state) {
		var prefs = toolbar_buttons.interfaces.PrefBranch,
			button = doc.getElementById("reload-proxy");
		if(!button)
			return;
		if(prefs.getIntPref("network.proxy.type") == 2
				&& prefs.getCharPref("network.proxy.autoconfig_url") != "") {
			button.removeAttribute("disabled");
		} else {
			button.setAttribute("disabled", true);
		}
	},
	setProxyMenuItem: function(event, item) {
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		var proxyState = prefs.getIntPref("network.proxy.type");
		for(var menuitem in item.childNodes) {
			if(item.childNodes[menuitem].getAttribute('value') == proxyState) {
				item.childNodes[menuitem].setAttribute('checked', 'true');
				return;
			}
		}
	},
	setProxyValue: function(event) {
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		prefs.setIntPref("network.proxy.type", event.originalTarget.getAttribute('value'));
	},
	SwitchDocumentDirection: function(aWindow) {
	  /* taken from Firefox, because Thunderbird does not have it as well */
	  // document.dir can also be "auto", in which case it won't change
	  if (aWindow.document.dir == "ltr" || aWindow.document.dir == "") {
	    aWindow.document.dir = "rtl";
	  } else if (aWindow.document.dir == "rtl") {
	    aWindow.document.dir = "ltr";
	  }
	  for (var run = 0; run < aWindow.frames.length; run++)
	    toolbar_buttons.SwitchDocumentDirection(aWindow.frames[run]);
	},
	toggleDocumentColors: function(button) {
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		var obj = {};
		var children = prefs.getChildList("browser.display.document_color_us", obj); // I droped the last letter, not sure if this includes itself
		if(obj.value == 0) {
			toolbar_buttons.prefToggleStatus(button, "browser.display.use_document_colors");
		} else {
			toolbar_buttons.prefToggleNumber(button, "browser.display.document_color_use",  [2, 2, 1]);
		}
	},
	toggleDocumentFonts: function(button) {
		toolbar_buttons.prefToggleNumber(button, "browser.display.use_document_fonts", [1,0,0]);
	},
	toggleStatusBar: function(event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		if(doc.getElementById("addon-bar")) {
			toolbar_buttons.toggleToolbar(event, 'addon-bar');
		} else {
			win.goToggleToolbar('status-bar','toggle_taskbar');
		}
	},
	toggleTheProxy: function() {
		var prefs = toolbar_buttons.interfaces.PrefBranch,
			extPrefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var proxyState = prefs.getIntPref("network.proxy.type");
		var defaultState = toolbar_buttons.interfaces.PrefService.getDefaultBranch(null).getIntPref("network.proxy.type");
		var customState = extPrefs.getIntPref("toggle.proxy");
		if(customState == defaultState) {
			defaultState = 0;
		}
		if (proxyState == customState) {
			prefs.setIntPref("network.proxy.type", defaultState);
		} else {
			prefs.setIntPref("network.proxy.type", customState);
		}
	},
	openPageInTab: function(url, event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		try {
			var browser = win.getBrowser();
			browser.selectedTab = browser.addTab(url);
		} catch (e) {
			var tabmail = doc.getElementById('tabmail');
			if (tabmail) {
				tabmail.openTab('contentTab', {contentPage: url});
			} else {
				win.openDialog(url, '', 'chrome,centerscreen');
			}
		}
	},
	loadToggleToolbar: function(doc, button_id, toolbar_id) {
		var toolbar = doc.getElementById(toolbar_id);
		var win = doc.defaultView;
		if(toolbar) {
			toolbar_buttons.setToggleToolbar(doc, toolbar_id, button_id);
			var tb = toolbar_buttons;
			var observer = function(mutations) {
				/*var attribute = false;
				for(var mut in mutations) {
					if(mut.type && mut.type == "attributes") {
						attribute = true;
						break;
					}
				}
				if(!attribute) return;
				var attributeName = false;
				for(var attr in mutations) {
					if(attr.attributeName && (attr.attributeName == "collapsed" || attr.attributeName == "hidden")) {
						attributeName = true;
						break;
					}
				}
				if(!attributeName) return;*/
				var button = doc.getElementById(button_id);
				if(button == null){
					return;
				}
				tb.setButtonStatus(button, toolbar.collapsed || toolbar.hidden);
			};
			var mutationObserver = new win.MutationObserver(observer);
			mutationObserver.observe(toolbar, { attributes: true, subtree: false });
		}
	},
	setButtonStatus: function(button, status) {
		var doc = button.ownerDocument;
		button.setAttribute("activated", status);
		var menu_item = doc.getElementById(button.id + '-menu-item');
		if(menu_item) {
			menu_item.setAttribute("activated", status);
		}
		if(button.parentNode.getAttribute("mode") == "text") {
			button.setAttribute("type", "checkbox");
			button.setAttribute("checked", Boolean(status));
		} else {
			button.removeAttribute("checked");
		}
	},
	OpenAddonsMgr: function(event, type, typeUrl) {
		var win = event.target.ownerDocument.defaultView;
		var extensionManager = toolbar_buttons.interfaces.WindowMediator
						.getMostRecentWindow("Extension:Manager");
		if (extensionManager) {
			extensionManager.focus();
			extensionManager.showView(type);
		} else {
			var addonManager = toolbar_buttons.interfaces.WindowMediator
				.getMostRecentWindow("Addons:Manager");
			if (addonManager) {
				addonManager.focus();
				addonManager.gViewController.loadView(typeUrl);
			} else {
				var contents = toolbar_buttons.getUrlContents("chrome://mozapps/content/extensions/extensions.xul");
				var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
	                   .getService(Components.interfaces.nsIWindowWatcher);
				var extWin = ww.openWindow(win, "chrome://mozapps/content/extensions/extensions.xul",
				                        "Addons:Manager", "chrome,centerscreen,width=850,height=550", null);
				extWin.addEventListener("load", function() { extWin.gViewController.loadView(typeUrl); }, false);
			}
		}
	},
	openAddonsExceptions: function(event) {
			toolbar_buttons.openPermissions(event, "install",
					"addons_permissions_title", "addonspermissionstext");
	},
	realNavigate: function(event, dirPrev) {
		var win = event.target.ownerDocument.defaultView;
		var dir;
		if (dirPrev) {
			if (event && event.shiftKey) {
				dir = win.nsMsgNavigationType.previousUnreadMessage;
			} else {
				dir = win.nsMsgNavigationType.previousMessage;
			}
		} else {
			if (event && event.shiftKey) {
				dir = win.nsMsgNavigationType.nextUnreadMessage;
			} else {
				dir = win.nsMsgNavigationType.nextMessage;
			}
		}
		return win.GoNextMessage(dir, false);
	},
	showAMenu: function(aEvent) {
		var doc = aEvent.target.ownerDocument;
		var aMenu = null;
		for (var i = 0; i < arguments.length; i++) {
			aMenu = doc.getElementById(arguments[i]);
			if (aMenu) {
				break;
			}
		}
		if (!aMenu) {
			toolbar_buttons.wrongVersion(event);
		}
		var popup = aMenu.firstChild;
		/* what we do is move the popup to our self, and then when finished move it
		 * back again, this is better then cloning because we get all event Listeners too
		 */
		aEvent.target.addEventListener('popuphidden', function showAMenuPopupHidding(event) {
			if(event.originalTarget == popup) {
				aEvent.target.removeEventListener('popuphidden', showAMenuPopupHidding, false);
				aMenu.appendChild(popup);
			}
		}, false);
		aEvent.target.appendChild(popup);
		aMenu.style.visibility = 'visible';
		if(aEvent.target.nodeName == 'menuitem' || aEvent.target.nodeName == 'menu') {
			aEvent.target.firstChild.openPopup(aEvent.target, "end_before");
		} else {
			aEvent.target.firstChild.openPopup(aEvent.target, "after_start");
		}
	},
	settingWatcher: function(pref, func) {
		this.prefs = toolbar_buttons.interfaces.PrefService.getBranch(pref);
		this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this.pref = pref;
		this.func = func;
	
		this.startup = function() {
			this.prefs.addObserver("", this, false);
		};
	
		this.shutdown = function() {
			this.prefs.removeObserver("", this);
		};
	
		this.observe = function(subject, topic, data) {
			if (topic != "nsPref:changed") {
				return;
			}
			try {
				this.func(subject, topic, data);
			} catch(e) {} // button might not exist
		};
	},
	installAddons: function(event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		var stringBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://toolbar-buttons/locale/button.properties");
		var title = stringBundle.GetStringFromName("installaddons");
		var fp = toolbar_buttons.interfaces.FilePicker();
		fp.init(win, title, fp.modeOpenMultiple);
		fp.appendFilter(stringBundle.GetStringFromName("installaddons-addons"), "*.xpi; *.jar");
		fp.appendFilter(stringBundle.GetStringFromName("installaddons-extensions"), "*.xpi");
		fp.appendFilter(stringBundle.GetStringFromName("installaddons-themes"), "*.jar");
		fp.appendFilters(fp.filterAll);
	
		// taken from /mozilla/toolkit/mozapps/extensions/content/extensions.js
		if (fp.show() != fp.returnOK) {
			return;
		}
		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		
		var files = fp.files;
		var installs = [];
	
		function getBrowserElement() {
			return win.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIDocShell)
						.chromeEventHandler;
		}
	
		function buildNextInstall() {
			if (!files.hasMoreElements()) {
				if (installs.length > 0) {
					// Display the normal install confirmation for the installs
					AddonManager.installAddonsFromWebpage("application/x-xpinstall", getBrowserElement(), null, installs);
				}
				return;
			}
			var file = files.getNext();
			AddonManager.getInstallForFile(file, function cmd_installFromFile_getInstallForFile(aInstall) {
				installs.push(aInstall);
				buildNextInstall();
			});
		}
	
		buildNextInstall();
	},
	clearBar: function(event, bar) {
		var doc = event.target.ownerDocument;
		var item = doc.getElementById(bar + "bar"), toolbar = item;
		if(item) {
			do {
				toolbar = toolbar.parentNode;
			} while(toolbar && toolbar.nodeName != "toolbar");
			if(toolbar && toolbar.collapsed)
				toolbar.collapsed = !toolbar.collapsed;
			item.value = "";
			item.focus();
		} else {
			var stringBundle = toolbar_buttons.interfaces.StringBundleService
					.createBundle("chrome://toolbar-buttons/locale/button.properties");
			var title = stringBundle.GetStringFromName("bar-missing-title"), name = "";
			// lousy because the code for matching strings is not smart enough
			if(bar == "search") {
				name = stringBundle.GetStringFromName("bar-missing-search");
			} else {
				name = stringBundle.GetStringFromName("bar-missing-url");
			}
			var error = stringBundle.formatStringFromName("bar-missing-error", [name], 1);
			toolbar_buttons.interfaces.PromptService.alert(doc.defaultView, title, error);
		}
	},
	openLinkFromPrefTab: function(name, event) {
		var win = event.target.ownerDocument.defaultView;
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var url = prefs.getCharPref(name);
		if (event.button == 1) {
			var browser = win.getBrowser();
			browser.selectedTab = browser.addTab(url);
		}
	},
	OpenMailLink: function(name) {
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var url = prefs.getCharPref(name);
		var uri = toolbar_buttons.interfaces.IOService
				  .newURI(url, null, null);
		toolbar_buttons.interfaces.ExternalProtocolService.loadUrl(uri);
	},
	loadContectBlocker: function(doc, fullPref, prefName, button_id, sheet, func) {
		var prefWatch = new toolbar_buttons.PreferenceWatcher();
		prefWatch.startup(doc, fullPref, button_id, func ? func : function(event, state) {
			var button = doc.getElementById(button_id);
			if(button) {
				toolbar_buttons.cssFileToUserContent(doc, sheet, state, false, button_id);
				toolbar_buttons.setButtonStatus(button, state);
			}
		});
		toolbar_buttons.loadUserContentSheet(doc, sheet, prefName, button_id);
		doc.defaultView.addEventListener("unload", function(e) {
			prefWatch.shutdown();
		}, false);
	},
	openPageTab: function(url, event) {
		var win = event.target.ownerDocument.defaultView;
		try {
			if (event.button == 1) {
				var browser = win.getBrowser();
				browser.selectedTab = browser.addTab(url);
			}
		} catch(e) {}
	},
	cssFileToUserContent: function(doc, aCssFile, remove, toggle, button_id) {
		var sss = toolbar_buttons.interfaces.StyleSheetService,
			ios = toolbar_buttons.interfaces.IOService;
		var url = ios.newURI(aCssFile, null, null),
			button = doc.getElementById(button_id);
		if (sss.sheetRegistered(url, sss.USER_SHEET)) {
			if (!button || remove || toggle) {
				sss.unregisterSheet(url, sss.USER_SHEET);
				return true;
			}
		} else {
			if (button && (!remove || toggle)) {
				sss.loadAndRegisterSheet(url, sss.USER_SHEET);
				return false;
			}
		}
		return false;
	},
	openLinkFromPref: function(name, event) {
		var win = event.target.ownerDocument.defaultView;
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var url = prefs.getCharPref(name);
		if (prefs.getBoolPref("always.new.tab")) {
			var browser = win.getBrowser();
			browser.selectedTab = browser.addTab(url);
		} else {
			win.loadURI(url);
		}
	},
	toggleToolbar: function(aEvent, toolbar_id) {
		var doc = aEvent.target.ownerDocument;
		var win = doc.defaultView;
		if(!aEvent || !aEvent.originalTarget || toolbar_id != aEvent.originalTarget.parentNode.id) {
			var toolbar = doc.getElementById(toolbar_id);
			if(toolbar.collapsed || toolbar.hidden) {
				if (toolbar.hasAttribute('hidden')) {
					toolbar.setAttribute('hidden', 'false');
					toolbar.setAttribute('collapsed', 'false');
				} else {
					toolbar.setAttribute('collapsed', 'false');
				}
			} else {
				if (toolbar.hasAttribute('hidden')) {
					toolbar.setAttribute('hidden', 'true');
				} else {
					toolbar.setAttribute('collapsed', 'true');
				}
			}
		}
	},
	stopContent: function(button, pref) {
		toolbar_buttons.extensionPrefToggleStatus(button, pref);
	},
	openPage: function(url, event) {
		var win = event.target.ownerDocument.defaultView;
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		try {
			if (prefs.getBoolPref("always.new.tab")) {
				var browser = win.getBrowser();
				browser.selectedTab = browser.addTab(url);
			} else {
				win.loadURI(url);
			}
		} catch(e) {
			var uri = toolbar_buttons.interfaces.IOService.newURI(url, null, null);
			toolbar_buttons.interfaces.ExternalProtocolService.loadUrl(uri);
		}
	},
	deleteSessionCookie: function() {
		var cookieEnumeration = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager2).enumerator;
		var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager2);
		while(cookieEnumeration.hasMoreElements()) {
			var cookieObject = cookieEnumeration.getNext().QueryInterface(Components.interfaces.nsICookie2);
			if(cookieObject.isSession) {
				cookieManager.remove(cookieObject.host, cookieObject.name, cookieObject.path, false);
			}
		}
	},
	prefToggleStatus: function(button, pref) {
		var prefs = toolbar_buttons.interfaces.PrefBranch,
			state = prefs.getBoolPref(pref);
		prefs.setBoolPref(pref, !state);
		toolbar_buttons.setButtonStatus(button, !state);
		return !state;
	},
	restartMozilla: function() {
		// aks the user if they realy do want to restart
		if (toolbar_buttons.interfaces.ExtensionPrefBranch.getBoolPref("restart") !== true) {
			var stringBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://toolbar-buttons/locale/button.properties");
			var restartQuestion = stringBundle.GetStringFromName("restart-question");
			var dontAsk = stringBundle.GetStringFromName("dont-ask");
			var restartTitle = stringBundle.GetStringFromName("restart");
			var check = {value: false};
			var result = toolbar_buttons.interfaces.PromptService.confirmCheck(null,
					restartTitle, restartQuestion, dontAsk, check);
			toolbar_buttons.interfaces.ExtensionPrefBranch.setBoolPref("restart", check.value);
			if (result === false) {
				return;
			}
		}
		// now ask all other interested parties
		var cancelQuit = toolbar_buttons.interfaces.SupportsPRBool();
		toolbar_buttons.interfaces.ObserverService.notifyObservers(cancelQuit,
				"quit-application-requested", "restart");
	
		// Something aborted the quit process.
		if (cancelQuit.data) {
			return;
		} else {
			var restart = toolbar_buttons.interfaces.AppStartup;
			restart.quit(restart.eRestart | restart.eAttemptQuit).focus();
		}
	},
	viewAddonsExceptions: function(event) {
		if(event.button == 1) {
			toolbar_buttons.openPermissions(event, "install",
					"addons_permissions_title", "addonspermissionstext");
		}
	},
	searchBarSize: function(event, opp) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		var stringBundle = toolbar_buttons.interfaces.StringBundleService
			.createBundle("chrome://toolbar-buttons/locale/button.properties");
		var item = doc.getElementById("search-container"), toolbar = item, size;
		if(item) {
			do {
				toolbar = toolbar.parentNode;
			} while(toolbar && toolbar.nodeName != "toolbar");
			if(toolbar && toolbar.collapsed)
				toolbar.collapsed = !toolbar.collapsed;
			if(isNaN(opp)) {
				var input = {value: item.width};
				var result = toolbar_buttons.interfaces.PromptService.prompt(null, stringBundle.GetStringFromName("search-bar-size-title"),
						stringBundle.GetStringFromName("search-bar-size-message"), input, null, {value: false});
				size = input.value;
				if(result && size){
					size = Math.round(Number(size));
					if(isNaN(size)) {
						toolbar_buttons.interfaces.PromptService.alert(win, stringBundle.GetStringFromName("error"),
								stringBundle.GetStringFromName("search-bar-numbers"));
						return false;
					}
				} else {
					return false;
				}
			} else {
				size = Number(item.width) + (opp * 10);
			}
			if(size > -1){
				item.width = size;
				// incase the search bar is not on the same bar as the address bar
				item.style.maxWidth = size + 'px';
			} else {
				toolbar_buttons.interfaces.PromptService.alert(win, stringBundle.GetStringFromName("error"),
						stringBundle.formatStringFromName("search-bar-size", [size], 1));
			}
	
		} else {
			var title = stringBundle.GetStringFromName("bar-missing-title");
			// lousy because the code for matching strings is not smart enough
			var name = stringBundle.GetStringFromName("bar-missing-search");
			var error = stringBundle.formatStringFromName("bar-missing-error", [name], 1);
			toolbar_buttons.interfaces.PromptService.alert(win, title, error);
		}
		return true;
	},
	loadPrefWatcher: function(doc, pref, button_id, func) {
		var win = doc.defaultView;
		win.setTimeout(function() {
			var prefWatch = new toolbar_buttons.PreferenceWatcher();
			prefWatch.startup(doc, pref, button_id, func);
			win.addEventListener("unload", function loadPrefUnload(e) {
				win.removeEventListener("unload", loadPrefUnload, false);
				prefWatch.shutdown();
			}, false);
		}, 0);
	},
	PluginHelper: {
		/*
		 * Credit for much of this code belongs to Prefbar, and is used under the
		 * terms of the GPL
		 */
		GetPluginTags: function() {
			return toolbar_buttons.interfaces.PluginHost.getPluginTags({});
		},
	
		GetPluginEnabled: function(aRegEx) {
			var plugins = this.GetPluginTags();
			if (!plugins)
				return false;
			for ( var i = 0; i < plugins.length; i++) {
				if (plugins[i].name.match(aRegEx) && !plugins[i].disabled)
					return true;
			}
			return false;
		},
	
		SetPluginEnabled: function(aRegEx, aValue, aName) {
			if (!aName)
				aName = aRegEx.toString().replace(/[^a-z ]/gi, "");
			var filenames = {};
			var stringBundle = toolbar_buttons.interfaces.StringBundleService
					.createBundle("chrome://toolbar-buttons/locale/button.properties");
			var title = stringBundle.GetStringFromName("plugin-error");
			var plugins = this.GetPluginTags();
			if (!plugins)
				return;
			var found = false;
			for ( var i = 0; i < plugins.length; i++) {
				if (plugins[i].name.match(aRegEx)) {
					plugins[i].disabled = !aValue;
					var filename = plugins[i].filename;
					// https://www.mozdev.org/bugs/show_bug.cgi?id=22582
					if (filename in filenames) {
						var message = stringBundle.formatStringFromName("mutiple-plugin-installed", [ aName ], 1);
						toolbar_buttons.interfaces.PromptService.alert(null, title, message);
					}
					filenames[filename] = true;
					found = true;
				}
			}
	
			if (!found) {
				var lastWindow = toolbar_buttons.interfaces.WindowMediator
						.getMostRecentWindow(null);
				var message = stringBundle.formatStringFromName("plugin-not-found", [ aName ], 1);
				toolbar_buttons.interfaces.PromptService.alert(lastWindow, title, message);
			}
		},
	},
	openPermissions: function(event, type, title, text) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		var bundlePreferences = toolbar_buttons.interfaces.StringBundleService
			.createBundle("chrome://browser/locale/preferences/preferences.properties");
		var params = { blockVisible   : true,
					   sessionVisible : true,
					   allowVisible   : true,
					   prefilledHost  : toolbar_buttons.getETDL(event),
					   permissionType : type,
					   windowTitle	: bundlePreferences.GetStringFromName(title),
					   introText	  : bundlePreferences.GetStringFromName(text) };
		win.openDialog("chrome://browser/content/preferences/permissions.xul",
				"Browser:Permissions", "", params);
	},
	checkBrowserReload: function(win) {
		if (toolbar_buttons.interfaces.ExtensionPrefBranch.getBoolPref("do.reload")) {
			win.BrowserReload();
		}
	},
	initApp: function(event, Application) {
		var win = event.target.ownerDocument.defaultView;
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		if (Application == "News" && prefs.getCharPref("readnews.path") != "") {
			var appPath = prefs.getCharPref("readnews.path");
		} else if (Application == "Mail" && prefs.getCharPref("readmail.path") != "") {
			var appPath = prefs.getCharPref("readmail.path");
		} else {
			var appPath = toolbar_buttons.getAppPath(Application);
		}
		if (appPath) {
			try {
				var appFile = toolbar_buttons.interfaces.LocalFile();
				appFile.initWithPath(appPath);
				var process = toolbar_buttons.interfaces.Process();
				process.init(appFile);
				process.run(false, [], 0);
				return;
			} catch(e) {}
		}
		try {
			win.toMessengerWindow(); // if this is SeaMonkey, this might be a good fall back?
		} catch(e) {
			var stringBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://toolbar-buttons/locale/button.properties");
			var title = stringBundle.GetStringFromName("no-path-title");
			var error = stringBundle.GetStringFromName("no-path-message-version");
			toolbar_buttons.interfaces.PromptService.alert(win, title, error);
		}
	},
	prefToggleNumber: function(button, pref, next) {
		var prefs = toolbar_buttons.interfaces.PrefBranch,
			setting = prefs.getIntPref(pref);
		prefs.setIntPref(pref, next[setting]);
		toolbar_buttons.setButtonStatus(button, next[setting]);
		return next[setting];
	},
	wrongVersion: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var XulAppInfo = toolbar_buttons.interfaces.XULAppInfo();
		var stringBundle = toolbar_buttons.interfaces.StringBundleService
				.createBundle("chrome://toolbar-buttons/locale/button.properties");
		var title = stringBundle.GetStringFromName("wrong-version-title");
		var error = stringBundle.formatStringFromName("wrong-version", 
				[event.target.label, XulAppInfo.name, XulAppInfo.version], 3);
		toolbar_buttons.interfaces.PromptService.alert(win, title, error);
	},
	showOnlyThisFrame: function(event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		var focusedWindow = doc.commandDispatcher.focusedWindow;
		if (win.isContentFrame(focusedWindow)) {
			var doc = focusedWindow.document;
			var frameURL = doc.location.href;
			//win.urlSecurityCheck(frameURL, win.gBrowser.contentPrincipal,
			//				 Ci.nsIScriptSecurityManager.DISALLOW_INHERIT_PRINCIPAL);
			var referrer = doc.referrer;
			win.gBrowser.loadURI(frameURL, referrer ? win.makeURI(referrer) : null);
		}
	},
	openMessengerWindowOrTab: function(url, event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		if(!event.button || event.button == 0) {
			win.openDialog(url, '', 'chrome,centerscreen');
		} else if(event.button == 1) {
			var tabmail = doc.getElementById('tabmail');
			if(tabmail) {
				tabmail.openTab('contentTab', {contentPage: url});
			} else {
				win.openDialog(url, '', 'chrome,centerscreen');
			}
		}
	},
	deleteAllCookies: function() {
		var stringBundle = toolbar_buttons.interfaces.StringBundleService
			.createBundle("chrome://toolbar-buttons/locale/button.properties");
		var question = stringBundle.GetStringFromName("stop-cookies-delete.question");
		var title = stringBundle.GetStringFromName("stop-cookies-delete.title");
		var prompt = toolbar_buttons.interfaces.ExtensionPrefBranch.getBoolPref("delete.cookies.check");
		if(!prompt || toolbar_buttons.interfaces.PromptService.confirm(null, title, question)) {
		    var cookieMgr = Components.classes["@mozilla.org/cookiemanager;1"]
		                          .getService(Ci.nsICookieManager);
		    cookieMgr.removeAll();
		}
	},
	getETDL: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var eTLDService = toolbar_buttons.interfaces.EffectiveTLDService;
	
		var eTLD;
		var uri = win.content.document.documentURIObject;
		try {
			eTLD = eTLDService.getBaseDomain(uri);
		} catch (e) {
			// getBaseDomain will fail if the host is an IP address or is empty
			eTLD = uri.asciiHost;
		}
		return eTLD;
	},
	PreferenceWatcher: function() {
		this.prefs = null;
		this.button = null;
		this.pref = null;
		this.func = null;
	
		this.startup = function(doc, pref, button, func) {
			this.prefs = toolbar_buttons.interfaces.PrefService.getBranch(pref);
			this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
			this.prefs.addObserver("", this, false);
			this.doc = doc;
			if(button)
				this.button = doc.getElementById(button);
			this.button_id = button;
			this.func = func;
			this.pref = pref;
			try {
				this.setStatus();
			} catch(e) {} // pref might not exist
		};
	
		this.shutdown = function() {
			this.prefs.removeObserver("", this);
		};
	
		this.setStatus = function() {
			if(!this.button)
				return
			// remove the checked state of any old buttons
			this.button.removeAttribute("checked");
			var prefs = toolbar_buttons.interfaces.PrefBranch, state = null;
			switch(prefs.getPrefType(this.pref)) {
				case prefs.PREF_BOOL:
					state = prefs.getBoolPref(this.pref);
					break;
				case prefs.PREF_INT:
					state = prefs.getIntPref(this.pref);
					break;
				case prefs.PREF_STRING:
					state = prefs.getCharPref(this.pref);
					break;
				default:
					return;
			}
			if(this.func) {
				this.func(this.doc, state);
			} else {
				toolbar_buttons.setButtonStatus(this.button, state);
			}
		};
	
		this.observe = function(subject, topic, data) {
			if (topic != "nsPref:changed") {
				return;
			}
			try {
				if(!this.button)
					this.button = this.doc.getElementById(this.button_id);
				this.setStatus();
			} catch(e) {} // button might not exist
		};
	},
	getAppPath: function(Application) {
		try {
			var wrk = Components.classes['@mozilla.org/windows-registry-key;1']
					.createInstance(Components.interfaces.nsIWindowsRegKey);
			wrk.open(wrk.HKEY_CURRENT_USER, "SOFTWARE\\Clients\\" + Application + "\\", wrk.ACCESS_READ);
			var appName = wrk.readStringValue("");
			wrk.close();
			wrk.open(wrk.HKEY_CURRENT_USER, "SOFTWARE\\Clients\\" + Application + "\\" + appName + "\\shell\\open\\command", wrk.ACCESS_READ);
			var appPath = wrk.readStringValue("");
			wrk.close();
			if (appPath.match(/".*" .*/)) {
				appPath = appPath.match(/"(.*)" .*/)[1];
			}
			return appPath;
		} catch (e) {
			return false;
		}
	},
	extensionPrefToggleStatus: function(button, pref) {
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch,
			state = prefs.getBoolPref(pref);
		prefs.setBoolPref(pref, !state);
		toolbar_buttons.setButtonStatus(button, !state);
		return !state;
	},
	setToggleToolbar: function(doc, toolbar_id, button_id) {
		var button = doc.getElementById(button_id);
		if(button) {
			var toolbar = doc.getElementById(toolbar_id);
			toolbar_buttons.setButtonStatus(button, toolbar.collapsed || toolbar.hidden);
		}
	},
	loadUserContentSheet: function(doc, sheet, pref, button_id) {
		var sss = toolbar_buttons.interfaces.StyleSheetService,
			ios = toolbar_buttons.interfaces.IOService,
			prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var url = ios.newURI(sheet, null, null);
		try {
			if (!prefs.getBoolPref(pref)
					&& doc.getElementById(button_id)
					&& !sss.sheetRegistered(url, sss.USER_SHEET)) {
				sss.loadAndRegisterSheet(url, sss.USER_SHEET);
			}
		} catch (e) {
		}
	},
	getUrlContents: function(aURL){
		var ioService = toolbar_buttons.interfaces.IOService;
		var scriptableStream = toolbar_buttons.interfaces.ScriptableInputStream;
		var channel=ioService.newChannel(aURL,null,null);
		var input = channel.open();
		scriptableStream.init(input);
		var str = scriptableStream.read(input.available());
		scriptableStream.close();
		input.close();
		return str;
	}
});
