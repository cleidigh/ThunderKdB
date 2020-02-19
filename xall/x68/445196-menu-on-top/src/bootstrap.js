/* Menu On Top Bootstrap Script
 * see https://developer.mozilla.org/en/Extensions/Bootstrapped_extensions
 * LICENSE
 *   this is a hack based on the Rise Of The Tools extension by rsjtdrjgfuzkfg (which was released under Mozilla Public License Version 1.1)
 *   For License info on _this_ Addon [Menu On Top], please refer to the module chrome/content/menuOnTop.js
 * OBJECTIVE
 *   objective is to get the menu bar to the top without interfering with the UI coloring too much 
 *   and is designed specifcally for Windows users.
 *   From Tb22.0 the menu bar will be on the top anyways so it is restricted to Tb 17.* max version
 * COMPATIBILITY
 *   Note - this is (probably) not compatible with Rise of the Tools, if you install both extensions I guarantee nothing!
 *   Nor is this tested with a load of other toolbar related addons, so ymmv. It works well with my own addons and a big bunch
 *   that I am using, but that's not saying much.
 * VERSION HISTORY
 *    For version history, please refer to http://quickfolders.org/menuOnTopHistory.html
 */

var Cu = Components.utils;

if (typeof ChromeUtils != 'undefined')
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
else
	Components.utils.import("resource://gre/modules/Services.jsm");

/*
(function(global) global.include = function include(src) {
var o = {};
Components.utils.import("resource://gre/modules/Services.jsm", o);
var uri = o.Services.io.newURI(
src, null, o.Services.io.newURI(__SCRIPT_URI_SPEC__, null, null));
o.Services.scriptloader.loadSubScript(uri.spec, global);
})(this);
*/

var windows = []; // All windows we're started in, to remove helpers at shutdown

// we cannot have default prefs in a file, so:
// see http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-%E2%80%93-default-preferences/
var PREF_BRANCH = "extensions.menuontop.";
var MenuOnTop  = {};
var styleSheets = ["chrome://menuontop/skin/menuOnTop_main.css"];
var winListener = {
  onOpenWindow: function(aWindow) {
		let domWindow;
		// test - this version worked in Tb68 before:
		try {
			domWindow = aWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).
                          getInterface(Components.interfaces.nsIDOMWindow);
		}
		catch (e) {
			const Ci = Components.interfaces;
			debugger;
			if (aWindow.QueryInterface) {
				try {  // Thunderbird 60
					domWindow = aWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).
														getInterface(Components.interfaces.nsIDOMWindow);
				}
				catch(ex) {
					// Thunderbird 68
					domWindow = aWindow.QueryInterface(Ci.nsIDOMWindow);
				}
			}
		}
		
    // Wait for the window to finish loading
		new Promise(function(resolve) {
			if (domWindow.document && domWindow.document.readyState == "complete") {
				resolve();
				return;
			}
			domWindow.addEventListener("load", resolve, { once: true });
		}).then(		
			function() {
				domWindow.removeEventListener("load", arguments.callee, false);
				try{
					start(domWindow);
				} catch (e) {Components.utils.reportError(e);}
			}
		);
    
    // domWindow.addEventListener("load", , false);
    /*// Do not clean up in unloading windows, so we don't leak listeners on removal
		  domWindow.addEventListener("unload", function() {
      try{
        stop(domWindow);
      } catch (e) {Components.utils.reportError(e);}
    }, false);*/ 
  },
  onCloseWindow: function(aWindow) { },
  onWindowTitleChange: function(aWindow, aTitle) { },
};

function install(data, reason){
  // We run the first time
	if (data && data.installPath)
		try {
			/* gone since Fx 9.0! See https://bugzilla.mozilla.org/show_bug.cgi?id=1528489#c15
					Cu.import("resource://gre/modules/Console.jsm");
					Components.manager.addBootstrappedManifestLocation(data.installPath);
			*/
		}
		catch (ex) {
			console.log("MenuOnTop install() generated an error:\n" + ex.message);
		}
	// setDefaultPrefs();

	
};

function uninstall(data, reason){
  // We'll get deleted and have to clean up
	MenuOnTop = Cu.import("chrome://menuontopmod/content/menuontop.jsm", {}).MenuOnTop; 
  const util = MenuOnTop.Util,
        prefs = MenuOnTop.Preferences;
	if (prefs.isStatusIcon)
		MenuOnTop.hideAddonButton(util.MainWindow);	
};

function startup(data, reason){
	// MenuOnTop = Cu.import
	MenuOnTop = Cu.import("chrome://menuontopmod/content/menuontop.jsm", {}).MenuOnTop; 
  MenuOnTop.Shim = Cu.import("chrome://shimMenuOnTopECMA/content/menuontop_shim.jsm", {}).MenuOnTop_Shim; 
	const util = MenuOnTop.Util,
	      prefs = MenuOnTop.Preferences;
	if (reason!=1) { // APP_STARTUP - creates ReferenceError: BOOTSTRAP_REASONS is not defined
		try { // remove from cache!
			Cu.unload("chrome://menuontopmod/content/menuontop.jsm");
			Cu.unload("chrome://shimMenuOnTopECMA/content/menuontop_shim.jsm");
		} 
		catch(ex) {;}
	}

	MenuOnTop.Shim.setDefaultPrefs(PREF_BRANCH, MenuOnTop.defaultPREFS); // we need to do this every time!
	
	if (prefs.isDebugOption('appStart')) {
		let txt = 'MenuOnTop startup\nreason = ' + reason
		util.logDebug(txt);
		// Services.prompt.alert(null,"Menu On Top",txt);
	}
  
  // We're starting up
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                      getService(Components.interfaces.nsIWindowMediator);
  // Start in all current windows:
  var enumerator = wm.getEnumerator(util.MainWindowXulId); // "mail:3pane"
	
  while (enumerator.hasMoreElements()) {
    var window = enumerator.getNext(); // .QueryInterface(Components.interfaces.nsIDOMWindow)
    start(window);
		// if we install or change the version, we must make the menu visible otherwise no obvious change for user
		if (   reason == ADDON_INSTALL 
		    || reason == ADDON_UPGRADE 
				|| reason == ADDON_DOWNGRADE 
				|| reason == ADDON_ENABLE) {
			MenuOnTop.ensureMenuBarVisible(window);
			// force the menu visible on install
			if (reason == ADDON_INSTALL) {
				let toolbar = window.document.getElementById(util.ToolbarId);
				toolbar.setAttribute("autohide", false);
				Services.xulStore.persist(toolbar, "autohide");
			}
			
		}
  }
  
  // load global stylesheet
  let styleSheetService= Components.classes["@mozilla.org/content/style-sheet-service;1"]
                                   .getService(Components.interfaces.nsIStyleSheetService);
  for (let i=0,len=styleSheets.length;i<len;i++) {
    let styleSheetURI = Services.io.newURI(styleSheets[i], null, null);
    styleSheetService.loadAndRegisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
  }
	

  
  // Start in new windows:
  wm.addListener(winListener);
	
};

function shutdown(data, reason){
  // We're shutting down
  
  // Stop listening
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                      getService(Components.interfaces.nsIWindowMediator);
  wm.removeListener(winListener);
  
	let shim = Cu.import("chrome://shimMenuOnTopECMA/content/menuontop_shim.jsm", {}).MenuOnTop_Shim; 
  shim.stopWindows();
  
  // Unload stylesheets
  let styleSheetService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                                    .getService(Components.interfaces.nsIStyleSheetService);
  for (let i=0,len=styleSheets.length;i<len;i++) {
    let styleSheetURI = Services.io.newURI(styleSheets[i], null, null);
    if (styleSheetService.sheetRegistered(styleSheetURI, styleSheetService.AUTHOR_SHEET)) {
        styleSheetService.unregisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
    }  
  }  
  
  Cu.unload("chrome://menuontopmod/content/menuontop.jsm");
	Cu.unload("chrome://shimMenuOnTopECMA/content/menuontop_shim.jsm");
};


function start(window){
  // We're starting up in a window
  const util = MenuOnTop.Util,
        prefs = MenuOnTop.Preferences;
	if (prefs.isDebugOption('appStart')) debugger;
  let document = window.document;
	if (document.firstElementChild && document.firstElementChild.tagName=='dialog') return; // dialogs are not styled by MenuOnTop
	
  let navigationBox = document.getElementById(util.ToolboxId), // mail-toolbox
	    menubar =  document.getElementById(util.ToolbarId);      // mail-toolbar-menubar2
			
  if (!(menubar && navigationBox)) {
		let docInfo = document.URL || "no URL";
    util.logDebug ("MenuOnTop.start(): early exit, no navigation-toolbox or menubar found\n" + docInfo)
    if (docInfo.endsWith("messenger.xul")) {
			window.setTimeout ( function(){start(window);},1500); // retry for now.
		}
    return; // We're only interested in windows with the menubar in it
  }

	windows.unshift(window);
  
  // Save the position for restoring if we get disabled / uninstalled, also our attrchange handler
  menubar.menuOnTop = {
    parent: menubar.parentNode,
    next: menubar.nextSibling
  };
  
  // Move the menu toolbar to the very top
  // 
	// ╔╤══THUNDERBIRD══════════════  #navigation-toolbox ═════════════════════════╤╗
	// ║│ ┌───────────────────────────────────────────────────────────────────────┐│║
	// ║│ │   #mail-toolbar-menubar2                                              ││║
	// ║│ └───────────────────────────────────────────────────────────────────────┘│║
	// ║│ ┌───────────────────────────────────────────────────────────────────────┐│║
	// ║│ │   #tabs-toolbar                                                       ││║
	// ║│ └───────────────────────────────────────────────────────────────────────┘│║
	// ╚╧══════════════════════════════════════════════════════════════════════════╧╝
  // 
	// ╔╤═══FIREFOX═════════════════  #navigator-toolbox  ═════════════════════════╤╗
	// ║│ ┌───────────────────────────────────────────────────────────────────────┐│║
	// ║│ │   #toolbar-menubar                                                    ││║
	// ║│ └───────────────────────────────────────────────────────────────────────┘│║
	// ║│ ┌───────────────────────────────────────────────────────────────────────┐│║
	// ║│ │   #TabsToolbar                                                        ││║
	// ║│ └───────────────────────────────────────────────────────────────────────┘│║
	// ╚╧══════════════════════════════════════════════════════════════════════════╧╝
  // 
	// ╔╤══INTERLINK════════════════  #mail-toolbox ═══════════════════════════════╤╗
	// ║│ ┌───────────────────────────────────────────────────────────────────────┐│║
	// ║│ │   #mail-toolbar-menubar2                                              ││║
	// ║│ └───────────────────────────────────────────────────────────────────────┘│║
	// ║│ ┌───────────────────────────────────────────────────────────────────────┐│║
	// ║│ │   #tabs-toolbar                                                       ││║
	// ║│ └───────────────────────────────────────────────────────────────────────┘│║
	// ╚╧══════════════════════════════════════════════════════════════════════════╧╝
	
  let first = navigationBox.firstChild;
  if (util.Application=='Firefox' && util.AppVersion>20.0) {
    util.logDebug("No change in menubar order");
  }
  else {
		if (MenuOnTop.ApplicationName == 'Interlink') {
			util.logDebug("Interlink: no repositioning necessary");
		}
		else {
			util.logDebug("inserting menubar before: " + first + '\n'
										+ first.tagName + ': ['
										+ (first.id ? first.id : '') + ']');
			navigationBox.insertBefore(menubar, first);
			menubar.menuOnTop.restacked = true;
		}
  }
	

  // Inject CSS for themes with the menubar under the tabbar:
	MenuOnTop.loadCSS(window);
	
	// if the option is active, we show the icon in the addon bar.
  if (prefs.isStatusIcon)
		MenuOnTop.showAddonButton(window);
	if (prefs.isCustomMenu) {
    MenuOnTop.showCustomMenu(window);
    if (prefs.isCustomMenuIcon) {
      MenuOnTop.setCustomIcon(window, prefs.customMenuIconURL);
    }
  }
  MenuOnTop.Util.checkVersion(window);
};

function stop(window){
  // We're shutting down in a window
  var document = window.document;
  // Undo changes
  try {
		let menubar =  window.document.getElementById(MenuOnTop.Util.ToolbarId);
    
		// restore original toolbar order
		// insertBefore(what = tabs-toolbar, reference element = mail-toolbar-menubar2)
    if (menubar.menuOnTop.restacked)
      menubar.menuOnTop.parent.insertBefore(menubar.menuOnTop.next, menubar);
    delete menubar.menuOnTop;
    
		MenuOnTop.resetCSS(window);
		MenuOnTop.hideAddonButton(window);
    MenuOnTop.hideCustomMenu(window);
  } catch (e) {}
  
  // Remove closed window out of list
  for (var i = 0; i < windows.length; i++)
    if (windows[i] == window)
      windows = windows.splice(i,1);
	Components.manager.removeBootstrappedManifestLocation(data.installPath);
};

