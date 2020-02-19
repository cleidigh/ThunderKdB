"use strict";


var MenuOnTop = Components.utils.import("chrome://menuontopmod/content/menuontop.jsm", {}).MenuOnTop; 


MenuOnTop.Options = {
	_prefService : null,
	bypassObserver: false,
  isLoaded: false,
	observe : function observe(aSubject, aTopic, aData) {
		if (this.bypassObserver) 
			return; // avoid too many css changes
		if ("nsPref:changed" == aTopic) {
			// let newValue = aSubject.getIntPref(aData);
			if (aData.toString() == "extensions.menuontop.statusIcon") // don't reload CSS when toggling icon
				return;
			this.apply();
		}
	},
	get prefService() {
		if (!this._prefService) {
			const Ci = Components.interfaces;
			this._prefService =
				 Components.classes["@mozilla.org/preferences-service;1"].getService( 
				   Ci.nsIPrefBranch);
		}
		return this._prefService;
	},

  onLoad: function onLoad() {
    const util = MenuOnTop.Util,
          prefs = MenuOnTop.Preferences,
          tabsInTitlebar = util.getTabInTitle();
//		MenuOnTop.ensureMenuBarVisible(util.MainWindow); // more for testing, but it might have its place!
	  // alert('test');
    if (prefs.isDebug) debugger;
		util.logDebug ("MenuOnTop.Options.onLoad()");
		// add an event listener that reacts to changing all preferences by reloading the CSS
		let Ci = Components.interfaces;
		this.prefService.QueryInterface(Ci.nsIPrefBranch);
		// this.prefService.QueryInterface(Ci.nsIPrefBranch2);
		// => 'this' implements observe() interface
		this.prefService.addObserver('extensions.menuontop.', this, false);
		if (util.ApplicationName =='Interlink') { // not supported
			document.getElementById('tabsInTitle').disabled = true;
			document.getElementById('moveBar').disabled = true;
		}
		else { 
			document.getElementById('tabsInTitle').checked = tabsInTitlebar;
			document.getElementById('moveBar').disabled = !tabsInTitlebar;
		}
		
    MenuOnTop.Options.enableCustomMenuControls();
			
    // populate version - simple first
    document.getElementById('lblVersion').value = prefs.getStringPref('version');
    // populate version - complete
    let w = window;
    w.setTimeout (function () {
			  let mot_isDebug = prefs.isDebug;
				Components.utils.import("resource://gre/modules/AddonManager.jsm");
				// let promise = 
				AddonManager.getAddonByID(MenuOnTop.Id).then(
					function mot_gotAddon(addon) {
						util.logDebug('getAddonByID promise - success');
						w.document.getElementById('lblVersion').value = addon.version;
						// return promise;
					}
					,
					function mot_failedAddon(ex) {
						Services.prompt.alert(null, 'MenuOnTop', ' AddonManager.getAddonByID promise failed!\n' + ex.toString()); 
						util.logDebug('getAddonByID promise - failed');
						// return null;
					}
				);
    }, 250); // delay is just for effect
    
	},
  
  showVersionHistory: function showVersionHistory() {
    MenuOnTop.Util.showHistory(MenuOnTop.Preferences.getStringPref('version'));
  } ,
	
  onSelectionChange: function onSelectionChange(evt) {
    const util = MenuOnTop.Util,
          doc = MenuOnTop.TopMenu.document;
    let i = 0, 
      listBox = doc.getElementById('bookmarksList'),
      idx = listBox.selectedIndex,
      target = null;
    if (idx>=0) {
      let entry = MenuOnTop.TopMenu.Entries[idx];
      doc.getElementById('linkLabel').value = entry.label;
      doc.getElementById('linkURL').value = entry.url;
      doc.getElementById('linkType').value = entry.bookmarkType;
    }
  }, 
  
	onUnload: function onUnload() {
		MenuOnTop.Util.logDebug ("MenuOnTop.Options.onClose()");
	  this.prefService.QueryInterface(Components.interfaces.nsIPrefBranch);
    this.prefService.removeObserver('extensions.menuontop.', this);
	},
	
	onStatusCheck: function onStatusCheck(chk) {
		let win = MenuOnTop.Util.MainWindow;
		if (chk.checked)
			MenuOnTop.showAddonButton(win);
		else
			MenuOnTop.hideAddonButton(win);			
	},
  
  enableCustomMenuControls: function enableCustomMenuControls() {
    let isActive = MenuOnTop.Preferences.isCustomMenu,
        doc = MenuOnTop.TopMenu.document,
        bookmarksList = doc.getElementById('bookmarksList'),
        txtCustomMenu = doc.getElementById('txtCustomMenu'),
        motToolbar = doc.getElementById('motToolbar'),
        btnSelectAvatar = doc.getElementById('btnSelectAvatar'),
        iconSize = doc.getElementById('customMenuIconSize'),
        customFont = doc.getElementById('customMenuFont'),
        customFontSize = doc.getElementById('txtCustomMenuSize'),
        customFontBold = doc.getElementById('chkCustomMenuBold'),
				customMenuPort = doc.getElementById('customMenuPort');
        
    
    txtCustomMenu.disabled = !isActive;
    bookmarksList.disabled = !isActive;
    motToolbar.disabled = !isActive;
    iconSize.disabled = !isActive;
    btnSelectAvatar.disabled = !isActive;
    customFont.disabled = !isActive;
		customMenuPort.disabled = !isActive;
    customFontSize.disabled = !isActive;
    customFontBold.disabled = !isActive;
  },
  
  onCustomMenu: function onCustomMenu(chk) {
		let win = MenuOnTop.Util.MainWindow,
        doc = MenuOnTop.TopMenu.document,
        prefs = MenuOnTop.Preferences,
        options = MenuOnTop.Options,
        txtCustomMenu = doc.getElementById('txtCustomMenu'),
        isActive = chk.checked;
    // before we set this, we need to put a label 
    if (isActive) {
      if (!prefs.customMenuTitle) {
        // make sure the label is not empty!
        // Unfortuntately, nsIProfile is deprecated, so we cannot set it to profile name
        // let profile=Components.classes["@mozilla.org/profile/manager;1"].getService(Components.interfaces.nsIProfile);
        // profile.currentProfile;  // should set txtCustomMenu already
        prefs.customMenuTitle='MenuOnTop'; 
        options.updateCustomMenuLabel(txtCustomMenu);
      }
    }
        
    prefs.isCustomMenu = chk.checked;  // updates the main menu UI
    options.enableCustomMenuControls();
    MenuOnTop.showCustomMenu(win, isActive); // fromOptions param to force repopulating listbox
    
    if (isActive && prefs.isCustomMenuIcon) { // repaint avatar
      MenuOnTop.setCustomIcon(prefs.customMenuIconURL);
    }
  } ,
  
  updateCustomMenuLabel: function updateCustomMenuLabel(txtbox) {
		const prefs = MenuOnTop.Preferences,
		      util = MenuOnTop.Util;
    let win = MenuOnTop.Util.MainWindow,
        doc = win.document,
        menu = doc.getElementById(MenuOnTop.CustomMenuId);
    if (menu) {
			if (!txtbox) {
				txtbox = document.getElementById('txtCustomMenu');
			}
			prefs.customMenuTitle = txtbox.value; // update pref
			util.logDebug('updateCustomMenuLabel(): ' + txtbox.value);
      menu.setAttribute("label", prefs.customMenuLabelTitle); // recreate label
		}
  } ,
  
  onCustomIconToggle: function onCustomIconToggle(chk) {
    
  } ,
  
  onCustomMenuIcon: function onCustomMenuIcon() {
		const Ci = Components.interfaces,
          Cc = Components.classes,
          nsIFilePicker = Ci.nsIFilePicker,
          util = MenuOnTop.Util,
          prefs = MenuOnTop.Preferences,
					NSIFILE = Ci.nsILocalFile || Ci.nsIFile;
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    
		// callback, careful, no "this"
    let fpCallback = function fpCallback_done(aResult) {
      if (aResult == nsIFilePicker.returnOK) {
        try {
          if (fp.file) {
					  let file = fp.file.parent.QueryInterface(NSIFILE);
						if (!prefs.isCustomMenuIcon)
              prefs.isCustomMenuIcon=true;
            if (prefs.customMenuIconSize<16)
              prefs.customMenuIconSize=16;
						try {
							let fileURL = fp.fileURL,
                  iconURL = fileURL.asciiSpec;
              prefs.setStringPref('customMenu.icon.url', iconURL);
              MenuOnTop.setCustomIcon(iconURL);
							prefs.setStringPref('customMenu.icon.defaultPath', file.path);
						}
						catch(ex) { ;	}
          }
        } catch (ex) { ; }
      }
    };


    fp.init(window, "Select an icon file", nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterImages);
		// needs to be initialized with something that makes sense (UserProfile/QuickFolders)
		
		//Error: NS_ERROR_XPC_BAD_CONVERT_JS: Could not convert JavaScript argument arg 0 [nsIFilePicker.displayDirectory]
		const {OS} = (typeof ChromeUtils.import == "undefined") ?
		  Components.utils.import("resource://gre/modules/osfile.jsm", {}) :
		  ChromeUtils.import("resource://gre/modules/osfile.jsm", {});
		let localFile = Cc["@mozilla.org/file/local;1"].createInstance(NSIFILE),
		    lastPath = prefs.getStringPref('customMenu.icon.defaultPath'),
        // default to extensions/menuontop/
        defaultPath = OS.Path.join(OS.Constants.Path.profileDir, "extensions", "menuOnTop@agrude.com", "avatars");
		localFile.initWithPath(lastPath || defaultPath); // default to menuontop avatars folder
    fp.displayDirectory = localFile; // gLastOpenDirectory.path
    fp.open(fpCallback);		
  } ,  
  
  onIconSizeChange: function onIconSizeChange(txt) {
		window.setTimeout(function() {
			let prefs = window.MenuOnTop.Preferences,
					maxHeight = prefs.getIntPref('maxHeight');
			try {
				let icSize = parseInt(txt.value, 10);
				if (icSize > maxHeight) {
					document.getElementById('txtMaxHeight').value = icSize;
					prefs.setIntPref('maxHeight', icSize);
				}
			}
			catch(ex) { ; }
		}, 100); // for some reason value == "0" during onchange event
  } ,
	
	accept: function accept() {
		this.apply();
	},
	
	apply: function apply() {
		let win = MenuOnTop.Util.MainWindow;
		MenuOnTop.resetCSS(win);
		MenuOnTop.loadCSS(win);
	},
  
  toggleTabsInTitle: function toggleTabsInTitle(checkbox) {
    let util = MenuOnTop.Util;
    util.setTabInTitle(!util.getTabInTitle());
    let isToggle = util.getTabInTitle();
    checkbox.checked = isToggle;
    document.getElementById('moveBar').disabled = !isToggle;
  },
  
  toggleRiseOfTools: function toggleRiseOfTools(checkbox) {
    // let the observer handle it...
    /*
    const prefs = MenuOnTop.Preferences,
		      util = MenuOnTop.Util;
    let newFlag = !prefs.getBoolPref('riseOfTools');
    prefs.setBoolPref('riseOfTools', newFlag);
    this.apply();
    */
  },
  
  onTabSelect: function onTabSelect(cl, event) {
    let el = event.target;
    if (!MenuOnTop.Options.isLoaded) {
      if (el.selectedPanel && el.selectedPanel.id == 'mot-Options-advanced') {
        MenuOnTop.TopMenu.loadCustomMenu(true);
        MenuOnTop.Options.isLoaded = true;
      }
    }
  },
  
  onEdit: function onEdit(txt) {
    MenuOnTop.TopMenu.onEdit(txt);
  },
	
	sanitizeCSS: function sanitizeCSS(el) {
		let val = el.value,
		    colon = val.indexOf(':');
		if (colon>=0) val = val.substr(colon+1);
		let semicolon = val.indexOf(';');
		if (semicolon>0) val = val.substr(0,semicolon);
		el.value = val.trim ? val.trim() : val;
	},
	
	
	selectBorderStyle: function selectBorderStyle(sel) {
		this.apply();
	},
	
	
	selectScheme: function selectScheme(event, el) {
	  // set a value and notify the bound preference via an input event; thanks to John-Galt !!
	  function setElementValue(id, val) {
			let doc = window.document,
			    element = doc.getElementById(id);
      if (element.getAttribute('type')=='color') {
				// convert rgb and system colors to hex for the dumbed down html:input type color
        element.value = util.getSystemColor(val, doc); 
			}
      else if (element.tagName=='colorpicker') 
        element.color = val;
			else if (typeof val == 'boolean')
				element.checked = val;
			else
				element.value = val;
			
			let evt = doc.createEvent("UIEvents")
			evt.initUIEvent('input', true, true, doc.defaultView, 1);
			element.dispatchEvent(evt);
		}
    const prefs = MenuOnTop.Preferences,
		      util = MenuOnTop.Util,
					options = MenuOnTop.Options;
		this.bypassObserver = true
		let target = event.target,
		    sel = target.value,
		    selection = parseInt(sel, 10),
        isChangeLayout = !prefs.isColorOnly;
	  if (selection<0)
			return;
		function setMaxHeight (nMax) {
			let nmax = nMax;
			if (nmax < prefs.customMenuIconSize && prefs.isCustomMenuIcon)
				nmax = prefs.customMenuIconSize;
			setElementValue('txtMaxHeight', nmax);
		}
		switch(selection) {
			case 0:  // default - Australis
			  let defPrefs = MenuOnTop.defaultPREFS;
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', defPrefs.negativeMargin);
          setElementValue('txtMenuMarginTop', defPrefs.menuMarginTop);
          setElementValue('txtTabbarMargin', defPrefs.tabbarMargin);
          setMaxHeight(defPrefs.maxHeight);
          setElementValue('txtMenuIconSmall', defPrefs.iconSizeSmall);
					setElementValue('txtMenuBorderWidth', defPrefs.menuBorderWidth);
        }
				setElementValue('chkMenuShadow', defPrefs.textShadow);
				setElementValue('txtMenuBackgroundDefault',  defPrefs.menuBackground);
				setElementValue('txtMenuFontColorDefault',  defPrefs.menuFontColor);
				setElementValue('txtMenuBackgroundHover',  defPrefs.menuBackgroundHover);
				setElementValue('txtMenuFontColorHover',  defPrefs.menuFontColorHover);
				setElementValue('txtMenuBackgroundActive',  defPrefs.menuBackgroundActive);
				setElementValue('txtMenuFontColorActive',  defPrefs.menuFontColorActive);
				setElementValue('txtMenuBorderColor', 'transparent');
				setElementValue('chkMenubarTransparent', defPrefs.menubarTransparent);
				break;
			case 1:  // dark - TT deepdark
        if (isChangeLayout) {
          setMaxHeight(22);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 0);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 16);
					setElementValue('txtMenuBorderWidth', '0');
        }
				setElementValue('chkMenuShadow', true);
				// from Bloomind's TT deepdark, slighly tweaked start point to make it brighter & more apparent (we are missing borders)
				setElementValue('txtNegativeMargin', 1);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(rgb(88, 88, 88), rgb(35, 35, 35) 45%, rgb(33, 33, 33) 48%, rgb(24, 24, 24))'); 
				setElementValue('txtMenuFontColorDefault', 'rgba(220, 220, 220, 0.8)');
        // text-shadow: 0px 0px 3px rgb(0, 173, 238);
				setElementValue('txtMenuBackgroundHover',  'linear-gradient(rgb(88, 88, 88), rgb(35, 35, 35) 45%, rgb(33, 33, 33) 48%, rgb(24, 24, 24))'); 
				setElementValue('txtMenuFontColorHover', 'rgb(0, 173, 238)'); // blue on hover
				setElementValue('txtMenuBackgroundActive',  'linear-gradient(rgb(45,45,45))'); 
				setElementValue('txtMenuFontColorActive', 'rgba(255, 255, 255, 0.9)');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
			case 2:  // bright - Nautipolis
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuRadius', '6');
          setMaxHeight(20);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 16);
					setElementValue('txtMenuBorderWidth', '0');
        }
				setElementValue('chkMenuShadow', false);
        setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(255, 255, 255, 0.85), rgba(215, 215, 215, 0.9))');
				setElementValue('txtMenuFontColorDefault', 'rgb(15,15,15)');
				setElementValue('txtMenuBackgroundHover',  'rgb(204, 204, 255)');
				setElementValue('txtMenuFontColorHover', 'rgb(0,0,0)');
				setElementValue('txtMenuBackgroundActive',  'linear-gradient(to bottom, rgba(255, 255, 255, 0.85), rgba(215, 215, 215, 0.9))');
				setElementValue('txtMenuFontColorActive', 'rgb(15,15,15)');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
			case 3:  // Nuvola - silver
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuMarginTop', 5);
          setMaxHeight(22);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 24);
					setElementValue('txtMenuBorderWidth', '0');
        }
				setElementValue('chkMenuShadow', false);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(#f4f4f9,#c0c1ca)');
				setElementValue('txtMenuFontColorDefault', 'rgb(0, 0, 0)');
				setElementValue('txtMenuFontColorHover', 'rgba(255,255,255,0.9)');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
			case 4:  // orange - Lantana
        if (isChangeLayout) {
          setMaxHeight(22);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 0);
					setElementValue('txtMenuBorderWidth', '0');
        }
				setElementValue('chkMenuShadow', true);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(252,219,143,0.9) 0%,rgba(249,156,62,0.9) 49%,rgba(229,143,45,0.9) 52%,rgba(234,122,37,1) 100%)');
				setElementValue('txtMenuFontColorDefault', 'rgba(102,10,4,0.9)');
				setElementValue('txtMenuFontColorHover', 'rgba(102,51,0,0.9)');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
			case 5:  // fudge - Charamel
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuMarginTop', 8);
          setMaxHeight(24);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 24);
					setElementValue('txtMenuBorderWidth', '0');
        }
				setElementValue('chkMenuShadow', true);
				setElementValue('chkMenubarTransparent', true);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(234,225,209,0.9) 0%,rgba(232,217,195,0.93) 34%,rgba(229,198,156,1) 100%)');
				setElementValue('txtMenuFontColorDefault', 'rgb(127, 83, 44)');
				setElementValue('txtMenuFontColorHover', '#663300');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
			case 6:  // Noja Extreme - needs white shadow!
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuMarginTop', 12);
          setMaxHeight(26);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 24);
					setElementValue('txtMenuBorderWidth', '0');
        }
				setElementValue('chkMenuShadow', false);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(255,255,255,1) 0%,rgba(184,185,197,1) 27%,rgba(184,185,197,1) 48%,rgba(210,212,219,1) 65%,rgba(245,245,255,1) 100%)');
				setElementValue('txtMenuFontColorDefault', 'rgb(0,0,0)');
				setElementValue('txtMenuFontColorHover', '#000066');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
			case 7:  // Walnut 2
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 0);
          setElementValue('txtMenuMarginTop', 6);
          setElementValue('txtMenuRadius', '6');
          setMaxHeight(21);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 16);
					setElementValue('txtMenuBorderWidth', '0');
        }
				setElementValue('chkMenuShadow', false);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(228, 208, 155, 0.95), rgba(228, 208, 155, 0.5))');
				setElementValue('txtMenuFontColorDefault', 'rgb(15,15,15)');
				setElementValue('txtMenuBackgroundHover',  'linear-gradient(to bottom, rgb(220,180,110), rgb(220,180,110))');
				setElementValue('txtMenuFontColorHover', 'rgb(105,41,3)');
				setElementValue('txtMenuBackgroundActive', 'linear-gradient(to bottom, rgb(105,41,3), rgb(105,41,3))');
				setElementValue('txtMenuFontColorActive', 'rgb(255,255,255)');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
			case 8:  // small icons - Littlebird
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 0);
          setElementValue('txtMenuMarginTop', 2);
          setMaxHeight(20);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 16);
					setElementValue('txtMenuBorderWidth', '0');
        }
				setElementValue('chkMenuShadow', true);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(255, 255, 255, 0.85), rgba(215, 215, 215, 0.9))');
				setElementValue('txtMenuFontColorDefault', 'rgb(15,15,15)');
				setElementValue('txtMenuFontColorHover', '#000066'); 
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
      case 9: // Australis Redesign
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuMarginTop', 5);
          setElementValue('txtMenuRadius', '5');
          setMaxHeight(24);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 24);
					setElementValue('txtMenuBorderWidth', '1');
        }
				setElementValue('chkMenuShadow', false);
				setElementValue('txtMenuBackgroundDefault',  '#EAF2FB');
				setElementValue('txtMenuFontColorDefault', 'rgb(51, 102, 153)');
				setElementValue('txtMenuBackgroundHover',  '#ffffff');
				setElementValue('txtMenuFontColorHover', '#113366'); 
				setElementValue('txtMenuBackgroundHover',  '#ffffff');
				setElementValue('txtMenuFontColorActive', '#113366');
				setElementValue('txtMenuBorderColor', '#7A8D9B');
				break;	
			case 10:  // phoenity (shredder)
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 4);
          setElementValue('txtMenuMarginTop', 4);
          setElementValue('txtMenuRadius', '4');
          setMaxHeight(22);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 24);
					setElementValue('txtMenuBorderWidth', '0');
        }
				setElementValue('chkMenuShadow', false);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(206,206,206,1) 0%,rgba(212,212,212,1) 45%,rgba(206,206,206,1) 45%,rgba(199,199,199,1) 100%)');
				setElementValue('txtMenuFontColorDefault', 'rgba(0, 0, 25, 1)');
				setElementValue('txtMenuFontColorHover', '#0784FF');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
      case 11:  // Morgana - purple
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, #c040a4 0%,#961072 50%,#d5279b 100%)');
				setElementValue('txtMenuFontColorDefault', '#F0F0FF');
				setElementValue('txtMenuFontColorHover', '#FF99FF');
        break;
			case 12:  // Mountain - blue
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuMarginTop', 5);
          setElementValue('txtMenuRadius', '6');
          setMaxHeight(22);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 24);
        }
				setElementValue('chkMenuShadow', true);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(4,160,238,0.8) 0%,rgba(2,79,138,0.8) 47%,rgba(0,53,118,0.8) 100%)');
				setElementValue('txtMenuFontColorDefault', '#F0F0FF');
				setElementValue('txtMenuBackgroundHover',  'linear-gradient(to bottom, rgba(4,160,238,0.8) 0%,rgba(2,79,138,0.8) 47%,rgba(0,53,118,0.8) 100%)');
				setElementValue('txtMenuFontColorHover', 'rgba(250, 255, 255, 0.95)');
				setElementValue('txtMenuBackgroundActive',  'linear-gradient(to bottom, rgba(4,160,238,0.8) 0%,rgba(2,79,138,0.8) 47%,rgba(0,53,118,0.8) 100%)');
				setElementValue('txtMenuFontColorActive', 'rgba(225, 245, 255, 0.95)');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
			case 13:  // Parakeet - green
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuMarginTop', 5);
          setElementValue('txtMenuRadius', '9');
          setMaxHeight(22);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 24);
        }
				setElementValue('chkMenuShadow', true);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(3,185,173,0.8) 0%,rgba(2,105,108,0.8) 47%,rgba(0,78,92,0.8) 100%)');
				setElementValue('txtMenuFontColorDefault', 'rgba(225, 255, 250, 0.95)');
				setElementValue('txtMenuFontColorHover', '#55FF7B');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;	
      case 14:  // Lime - green
				setElementValue('txtMenuBackgroundDefault', 'linear-gradient(to bottom, rgba(223,242,84,0.86) 0%,rgba(155,239,76,0.81) 53%,rgba(135,174,68,0.81) 100%)');
				setElementValue('txtMenuFontColorDefault', '#003300');
				setElementValue('txtMenuFontColorHover', '#006600');
        break;
      case 15:  // Sunflower - yellow
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(249,248,146,0.86) 0%,rgba(247,247,44,0.81) 50%,rgba(234,184,18,0.81) 100%)');
				setElementValue('txtMenuFontColorDefault', '#330000');
				setElementValue('txtMenuFontColorHover', '#663300');
        break;
			case 16:  // Tangerine - orange
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuMarginTop', 5);
          setElementValue('txtMenuRadius', '9');
          setMaxHeight(22);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 24);
					setElementValue('txtMenuBorderWidth', '1');
        }
				setElementValue('chkMenuShadow', true);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(255,183,107,1) 0%,rgba(255,167,61,1) 11%,rgba(255,124,0,1) 51%,rgba(255,127,4,1) 100%)');
				setElementValue('txtMenuFontColorDefault', 'rgba(225, 255, 250, 0.99)');
				setElementValue('txtMenuFontColorHover', '#660000');
				setElementValue('txtMenuBorderColor', 'rgba(255,255,255,0.7)');
				break;	
			case 25:  // Fire - orange
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuMarginTop', 5);
          setElementValue('txtMenuRadius', '9');
          setMaxHeight(22);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 24);
					setElementValue('txtMenuBorderWidth', '1');
					options.selectBorderStyle("solid");
        }
				setElementValue('chkMenuShadow', true);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(254,189,0,1) 0%,rgba(255,142,0,1) 66%,rgba(239,71,3,1) 100%)');
				setElementValue('txtMenuFontColorDefault', 'rgba(225, 255, 250, 0.99)');
				setElementValue('txtMenuFontColorHover', '#660000');
				setElementValue('txtMenuBorderColor', 'rgba(124,0,4,0.9)');
				break;	
				
			case 17:  // robin - red
        if (isChangeLayout) {
          setElementValue('txtNegativeMargin', 2);
          setElementValue('txtMenuMarginTop', 7);
          setElementValue('txtMenuRadius', '6');
          setMaxHeight(22);
          setElementValue('txtMenuIconSmall', 16);
          setElementValue('txtMenuIconNormal', 0);
        }
				setElementValue('chkMenuShadow', true);
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(237,4,8,0.8) 0%,rgba(137,13,2,0.8) 45%,rgba(117,23,0,0.8) 100%)');
				setElementValue('txtMenuFontColorDefault', 'rgba(255, 240, 255, 1)');
				setElementValue('txtMenuFontColorHover', '#FFFFCC');
				setElementValue('txtMenuBorderColor', 'transparent');
				break;
      case 18: // oak - light brown
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, #b27237 0%,#7d492e 34%,#774121 56%,#c48b56 100%)');
				setElementValue('txtMenuFontColorDefault', '#FFCC66');
				setElementValue('txtMenuFontColorHover', '#FFFF99');
        break;
      case 19: // Leather - mahogany  - redish brown
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, #a95f4a 0%,#4f0b0b 29%,#6e272b 64%,#9e5b45 100%)');
				setElementValue('txtMenuFontColorDefault', '#F2D0BB');
				setElementValue('txtMenuFontColorHover', '#D68779');
        break;
      case 20:  // May - green
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, #b8d31b 0%,#7aa612 50%,#5c8a00 51%,#87b513 100%)');
				setElementValue('txtMenuFontColorDefault', '#F0F0F0');
				setElementValue('txtMenuFontColorHover', '#FFFF66'); // yellow
				setElementValue('txtMenuBorderColor', '#003300');
				break;
			case 21: // Cloud - Light Blue 
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(149,248,253,0.8) 0%,rgba(109,231,253,0.8) 47%,rgba(99,213,255,0.8) 100%)');
				setElementValue('txtMenuFontColorDefault', '#000066'); // dark blue
				setElementValue('txtMenuFontColorHover', '#CCFFFF'); // light blue
				setElementValue('txtMenuBorderColor', '#CCFFFF'); 
        break;
			case 22: // Pink - Rose #FF66CC
				setElementValue('txtMenuBackgroundDefault',  'linear-gradient(to bottom, rgba(255,93,177,1) 0%,rgba(239,1,124,1) 100%)');
				setElementValue('txtMenuFontColorDefault', '#FFFFFF'); 
				setElementValue('txtMenuBackgroundHover',  'linear-gradient(to bottom, rgba(222,0,115,1) 0%,rgba(153,1,80,1) 100%)');
				setElementValue('txtMenuFontColorHover', '#FFFFCC'); // light yellow
				setElementValue('txtMenuBorderColor', '#663366'); // dark purple border
        if (isChangeLayout) {
					setElementValue('txtMenuBorderWidth', 1);
				}
        break;
			case 23: // Photon Default
				setElementValue('txtMenuBackgroundDefault',  'rgba(255,255,255,0.4)');
				setElementValue('txtMenuFontColorDefault', '#000000');
				setElementValue('txtMenuFontColorHover', '#666666'); 
				setElementValue('txtMenuBorderColor', '#9C9C9C');
				break;
			case 24: // Photon Dark (brighttext)
				setElementValue('txtMenuBackgroundDefault',  'rgba(255,255,255,0.4)');
				setElementValue('txtMenuFontColorDefault', '#FFFFFF');
				setElementValue('txtMenuFontColorHover', '#FFFFFF'); 
				setElementValue('txtMenuBorderColor', '#333333');
				break;
			
		}
		this.apply();
		window.setTimeout( function() { 
			util.logDebug ("enabling prefs observer...");
			options.bypassObserver = false; 
		}, 500); // avoid too many loadCSS calls.
		// this.bypassObserver = false;
	} ,
  
	
	loadPreferences: function mot_loadPreferences() {
		const util = MenuOnTop.Util;
		if (typeof Preferences == 'undefined') {
			util.logDebug("Skipping loadPreferences - Preferences object not defined");
			return; // older versions of Thunderbird do not need this.
		}
		util.logDebug("loadPreferences - start:");
		let myprefs = document.getElementsByTagName("preference");
		if (myprefs.length) {
			let prefArray = [];
			for (let it of myprefs) {
				let p = new Object({ id: it.id, 
						      name: it.getAttribute('name'),
						      type: it.getAttribute('type') });
				if (it.getAttribute('instantApply') == "true") p.instantApply = true;
				prefArray.push(p);
			}
			util.logDebug("Adding " + prefArray.length + " preferences to Preferences loader...")
			Preferences.addAll(prefArray);
		}
		util.logDebug("loadPreferences - finished.");
	} ,
	
  showAboutConfig: function(clickedElement, filter, readOnly) {
    const name = "Preferences:ConfigManager",
		      util = MenuOnTop.Util,
          Ci = Components.interfaces, 
          Cc = Components.classes;
    let uri = "chrome://global/content/config.xul";
		if (util.Application)
			uri += "?debug";

    let mediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator),
        w = mediator.getMostRecentWindow(name),
        win = clickedElement ?
		          (clickedElement.ownerDocument.defaultView ? clickedElement.ownerDocument.defaultView : window)
							: window;
    if (!w) {
      let watcher = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
      w = watcher.openWindow(win, uri, name, "dependent,chrome,resizable,centerscreen,alwaysRaised,width=500px,height=350px", null);
    }
    w.focus();
    w.addEventListener('load', 
      function () {
        let flt = w.document.getElementById("textbox");
        if (flt) {
          flt.value=filter;
          // make filter box readonly to prevent damage!
          if (!readOnly)
            flt.focus();
          else
            flt.setAttribute('readonly',true);
          if (w.self.FilterPrefs) {
            w.self.FilterPrefs();
          }
        }
      });
  }
	

}