"use strict";

/*
	QuickPasswords
	created by Axel Grude

	Version History
	0.9 - 10/02/2010
		First Release on AMO
	0.9.3 - 10/02/2010
		Fixed localization issues
		Fixed an issue with case sensitivity in Linux
		Added missing icon for small toolbar view
		Added 'real' settings to options dialog
	0.9.4 - 12/02/2010
		Fixed Icon and Writing on Browser Content Popup Menu
		Added links to new extension homepage:	 http://quickpasswords.mozdev.org
		Removed any references to the old working title "PasswordClipper"
	0.9.5 - 14/02/2010
		Added German Locale (AG)
		Added French Locale (Bilouba http://lionel.bijaoui.free.fr/)
		Added feature context menu in password manager
		Added copy row feature
		Added about button to options dialog
	0.9.6 - 20/02/2010
		Added "copy multiple lines / records" feature
		Added: option to include header (for pasting data in spreadsheets) when doing this
		Added: Log copied information about copied data to javascript console (passwords are not displayed)
		Added Dutch Locale (markh van BabelZilla.org)
		Added: Localization in extension description strings
	0.9.6.1 - 27/02/2010
		markh: Reviewed Dutch locale
		Added link to Mozdev homepage to options dialog
		removed JSON module
		Added Russian Locale (Anton Pinsky)
		Added Simplified Chinese Locale (Loviny)
		Added About button + Full Version number to Options screen
	0.9.7 - 07/03/2010
		Added Option for automatic closing of Password Manager after copying
		Added Vietnamese locale (Nguyen Hoang Long http://timelinelive.blogspot.com)
		Added Hungarian locale (WonderCsabo of Babelzilla.org)
	0.9.8 - 01/06/2010
		New Options for copying User and Site
	1.0 - 08/07/2010
		Added da locale (Jorgen Rasmussen)
	1.1 - 29/12/2010
		Fixed a bug that made Header row appear as "undefined" when copying multiple records and "Display message after copying" was disabled
		Made context menu compatible with the "Saved Password Editor" Extension
	1.2 - 04/01/2011
		Made Extension compatible with Firefox 4.0
		Added he-IL Locale (barryoni)
	1.3 - 22/01/2011
		Removed a bug "menu is null" when opening password manager window
		Added Options Menu Item
		Added option to hide Context Menu
		Context Menu item in browser window is now only visible on editable elements
		Added es-AR locale (Eduardo Leon)
		Added ja-JP locale (Noumi Ryoko)
		Added sv-SE locale (Mikael Hiort af Ornaes)
	1.4 - 10/02/2011
		Force icons in context menu even in default theme (class menuitem-iconic)
		Added tooltip (and updated label text) to the time delay option
		Now there are 3 options for displaying browser context menu: never, on text items and always
		open issues: in Fx4, I am still not able to display the extension's version number!
	1.5 - 11/09/2011
		Added Fx + Tb 6.0* compatibility
		Fixed links in options dialog and setting focus to tabs in SeaMonkey
		Added refine sites button (magic wand) to narrow down sites with multiple entry points
		Added new versioning regime and link to site on update / first install - triggered by first use!
		Added tons of functionality for mail clients
			- retrieve mail account password (when in folder)
			- retrieve URL account passwords (when in content tab, like in Firefox)
			- retrieve passwords based on current sender (when viewing a single message)
		New locales:
			- tr-TR  thanks to Nikneyim [BabelZilla.org]
			- sr     thanks to Rancher [BabelZilla.org]

	1.6 - 08/12/2011
		Added "change (multiple) passwords" feature
		stability fixes mainly for SeaMonkey and Postbox
		Added Support for private browsing mode (Firefox and SeaMonkey)
		rapid release bump (maxVer = 9.*)
		removed locale from jar file

	1.7 - 25/12/2011
		Added cancel login menu item
		Added scrolling to selected row in Manager

	1.8 - 20/01/2012
		Fix of German locale (UTF format) in order to display change password dialog correctly

	1.9 - 30/01/2012  Layout Fixes
		Some fixes in change password box
		Fixed [Bug 22904] Icon Size on toolbar buttons was too big

	2.0 - 30/05/2012
	  Compatibility with Gecko 15
		Removed some unnecessary errors from console to improve S/N ratio
		changed overlay using messenger.xul instead of mailWindowOverlay.xul
		layout fixes in change multiple password dialog

	2.1 - 13/06/2012
		Fixed <a href='https://www.mozdev.org/bugs/show_bug.cgi?id=24940'>[Bug 24940]</a> - Doesn't fill username/password in firefox 13
		Completed Hu locale
		fixed display of version link and donation pages after updates

	2.2 - 23/10/2012
		Completed fr locale - thanks to Jean Michel Bourde
		Added Italian Locale - thanks to Leopoldo Saggin
		Fixed a problem with showing advanced debug settings (window was going to background)
		Replaced deprecated -moz-linear-gradient CSS values
		Replaced -moz-transition CSS values with newer ones

	2.3 - 13/12/2012
	  Fixed legacy layout issues in Postbox
	  Ietab2 support
		make it possible to disable donation screen displayed on update by changing extensions.quickpasswords.donations.askOnUpdate = false
		
		known issues: Problems wit replacing multiple passwords - Thunderbird throws error...
		
	2.5 - 10/01/2013
    Fixed an issue in load method "Warning: ReferenceError: reference to undefined property QuickPasswords.Util.AppverFull" 
		New [FR 25287] automatic login on double click
		New [FR 25287] QuickPasswords now inserts the login information automatically 
		               How: QuickPasswords will go through all forms in the page and match the names of password & user name 
									 fields and also make sure these are currently visible. (Many pages have multiple forms, some of them hidden)
									 Only then it will insert matching information username / password or both. If something cannot be matched, then the
									 context menu entry of the missing field(s) is added as a fallback, like in the previous version.
		Removed duplicate "copy UserName" menu item.
		Known Issues: The context menu is always visible when in a Thunderbird content tab

	2.6 - 17/01/2013
	  Fixed [Bug 25307] - On the Statusbar of Thunderbird and SeaMOnkey mail windows some or all icons are missing
		Added QuickPasswords command to folder pane context menu
		Improved filter prediction in SeaMonkey mail windows
		   We are  now able to filter passwords for 
			    - the mailbox when right-clicking a folder 
					- the sender domain when right-clicking a message
	2.7 - 02/02/2013
    Added [x] "do not show this message again" checkbox to make it easier for beginners 
		         (no need to open options dialog any more)
    AutoClose - default to true for less clutter	
    moved wizard button to top
		Rearranged action buttons to right making them easier accessible
		made version check at startup more robust
		toned down the small icons (less opacity) and removed obsolete graphics
		Double-click and Enter key can be used for login directly from the Saved Passwords list
		New feature to correct changed login field names
		Fixed size for large icon mode
 
  2.8 - 13/02/2013
    Fixed [Bug 25336] - From Fx18.0.2 upwards - When changing a many of passwords an error can be thrown by Mozilla core code:
      "Javascript Error: signon is undefined" or "undefined proiperty table[selections[0].number]"		

  2.9 - 05/05/2013
    Improved automatic password filling to also work with form elements that are identified by name and not by id.
		Bumped up compatibility
		nsIPrivateBrowsingService was removed in version 20 for per-window private browsing mode
		fix: made compatible with redefinition of Thunderbird's nsIMsgAccount interface #
		
	3.0 - 28/09/2013
	  Streamlined password window by using a toolbar
		Better heuristics to determine which fields are not visible to avoid filling the wrong logon fields
		Added "Correct Field Names" button
		
	3.1 - 16/12/2013
		Fixed disabling (login / repair) buttons in IETabs - IE tabs do not support modifying the context menu
		Improved filtering function (showLogins) in order to always highlight the most correct domain match
	  Added translations for toggle version and donation messages.
		[Bug 25642] Now opens Security preferences when clicking the "Lock" button and no master password is set
		Improved security of about:config dialogs
		Moved options css file into skins folder
		Removed obsolete buttons from passwordwindow overlay
		Enabled decreasing amount of console messages making most messages dependant on debug.default (defaults to true)
		Removed some global variables to avoid namespace pollution
		
	3.2 - 13/04/2014
    Australis Support - added new monochrome Icon set and big Icon for new Australis side panel customization
    Options Dialog - is now easier to and split into General and Advanced+Support tabs.
    Toolbar Icon - downresized + rerendered colored Toolbar button to 20px for large icons (non Australis)
    Fixed: when no entry was selected and the was Edit Passwords button was pressed the error 
           "TypeError: QuickPasswords.Properties is undefined" is shown. Instead QuickPasswords should 
           prompt to select an entry
           
  3.2.1 - 25/04/2014
    Improved Australis support with better icons
    Fixed [Bug 25750] - OK,Cancel missing in Options Dialog on Mac
    [Bug 25749] - "Fill search box when opening password manager" does not work - invalid
                  (added detailed debug log to getURIcontext())
    Copy records now shows throbber animation
    Added copying passwordField, usernameField, formSubmitURL and httpRealm to copy records command
    Disable donation page on prereleases
    Made options window "alwaysRaised" to avoid confusion
    Added "locked" status for showing the Master Password 
    Updated tr and pt-BR locales
    Added Repair confirmation for SeaMonkey users (there is no notification panel in SeaMonkey)

  3.3 - 17/11/2014
    Add Toolbarbutton on first run
    When opened from button / context menu of a web page, filtering will now show less results to make login simpler
    The last used login is selected by default
    
  3.4 - 06/12/2014
    [Bug 25909] Fixed http://bugzil.la/1001090 "temporal dead zone" fix breaks add-on in Firefox 35.0
  
  3.5 - 07/01/2015
	  [Bug 25935] "Unified password change" broken with Firefox 34.0.5
    Improved SSO password change making it resilient against early exits caused by multiple users on the same domain
    [Bug 25931] Added a switch for disabling version history tab
    
  3.6 - 09/12/2015
    [Bug 25998] Unified Password change (SSO passwords) was improved fundamentally.
		            List of matching domains is shown and the user can now choose to 
								match match user and domain\user when changing the password
								for SSO logins.
		[Bug 26114] When selecting one or more logins in password manager window, some 
				        useful commands in the context menu are disabled.
		Now asks for master password when copying multiple records to 
		    clipboard and for Unified password change
    Added Pale moon support
		Added brighttext support (for dark themes)
    Removed QueryInterface on boxObject because of https://bugzil.la/979835   

	3.7.1 - 02/02/2016
	  [Bug 26132] Firefox 43: Master Password Setup not shown
	  [Bug 26119] Exception thrown by Unified Pwd Change when nothing is selected
		[Bug 26133] Support links always open new tabs
    [Bug 25937] Backup / restore feature
		
	3.7.2 - 21/03/2016
	  [Bug 26162] Automatic Field correction does not work anymore 
		
	3.8.1 - 29/01/2017
    Fixed oversized sliding notification alert
		Removed some of the code causing "unsafe CPOW usage" warnings
		[Bug 26329] Copying / Autofilling stopped working in Fx 51  (e10s) - 
		            caused by Firefox 51 stopping to expose signonsTree
		[Bug 26330] Fx51: Firefox e10s may cause failure of "Login to Website".
                to make e10s stays disabled, set browser.tabs.remote.autostart.2 = false		
		
	3.8.2 - 13/03/2017
    [Bug 26338] Login to website not working in Seamonkey 2.46
		
	3.9 - 26/11/2017
    [Bug 26343] Unified password change not working
		[Bug 26443] Thunderbird 57 hangs on start with QuickPasswords enabled.
	  [Bug 26365] Firefox 53.0 Magic Wand misplaced. The button shows too far down in the dialog.		
		AutoLocking the Masterpassword broken
		Spanish Argentinian Locale added: Thanks to Eduardo Leon at Babelzilla.org
		Polish Locale added: Thanks to Gabry$ at Babelzilla.org
		Removed support for Firefox 57+; PLans for Fx Quantum
	
	3.10 - WIP
	  [Bug 26491] ESR 2018 readiness - Make QuickPasswords compatible with Tb 60
		
		
    ================
    Planned: automatically login when using context menu and only one login is available
    Planned: Also fill non-form objects (annotated login)? => test on clearquest site!
  
===========================================================================================

		Planned: adding option for configuring delimiter of multi line export. At the moment this is hard coded to tab.
		Planned: after successfully changing multiple passwords, hide the change dialog and refresh the passwords list (old password is still shown)
		Nice to Have: support "change password" doorhanger with an additional button "multiple sites")
		http://mxr.mozilla.org/mozilla-central/source/toolkit/components/passwordmgr/nsLoginManagerPrompter.js#1023

*/

var QuickPasswords = {
	_bundle: null,
  BundleService: Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService),
  get Bundle() {
	  if (!this._bundle) {
		  this._bundle = this.BundleService.createBundle("chrome://quickpasswords/locale/overlay.properties");
		}
		return this._bundle;
	},
	strings:null,
	initialized:false,
	lastContentLocation:'',
	_PasswordManagerWindow: null,
	get PasswordManagerWindow() {
		if (!this._PasswordManagerWindow)
			this._PasswordManagerWindow = this.getPasswordManagerWindow("", false)
		return this._PasswordManagerWindow;
	},
	promptParentWindow: null,
	name: 'QuickPasswords',
	get signonsTree() {
		let mwin = QuickPasswords.PasswordManagerWindow;
		// if window is not open we are in a tabbed browser!
		return mwin ? mwin.document.getElementById('signonsTree') : document.getElementById('signonsTree');
	},
  
	onLoad: function onLoad() {
		if(this.initialized) {
      QuickPasswords.Util.logDebug('QuickPasswords.onLoad() - early exit - [initialized = true]');
			return;
    }
    QuickPasswords.Util.logDebug('QuickPasswords.onLoad()');

		//http://kb.mozillazine.org/Adding_items_to_menus
		let menu = document.getElementById("contentAreaContextMenu");
		if (QuickPasswords.Util.Application == 'Thunderbird' || QuickPasswords.Util.Application == 'Postbox')
			menu = document.getElementById("mailContext");
		QuickPasswords.Util.logDebugOptional ("contextMenu", "searched contentArea context menu: " + (menu ? 'found.' : 'not found.'));
    let isMainWindow = false;
    if (!menu) {
      let winType = document.documentElement.getAttribute("windowtype");
      switch (QuickPasswords.Util.Application) {
        case 'Thunderbird':
          if (winType == 'mail:3pane') isMainWindow = true;
          break;
        case 'Firefox':
          if (winType == 'navigator:browser') isMainWindow = true;
          break;
        case 'Postbox':
          if (winType == 'mail:3pane') isMainWindow = true;
          break;
        case 'SeaMonkey':
          if (winType == 'navigator:browser') isMainWindow = true;
          break;
      }
      if (isMainWindow) {
        QuickPasswords.Util.logDebug('QuickPasswords.onLoad() did not find menu in windowType ' + winType + ' will retry later...');
        setTimeout( function() { QuickPasswords.onLoad(); }, 2000);
        return;
      }
    }
    
    // asynchronous version check
		// no need to do this when coming back from password window, document context is wrong then and throws an error
    if (isMainWindow)
      QuickPasswords.Util.checkVersionFirstRun(); 
    
		if (menu) {
			menu.addEventListener("popupshowing", QuickPasswords.contextPopupShowing, false);
		}

		this.strings = document.getElementById("QuickPasswords-strings");
		QuickPasswords.Util.logDebugOptional("default", "QuickPasswords " + QuickPasswords.Util.Version
			 + " running on " + QuickPasswords.Util.Application
			 + " Version " + QuickPasswords.Util.AppVersionFull + "."
			 + "\nOS: " + QuickPasswords.Util.HostSystem);
       
    setTimeout(function() {QuickPasswords.prepareAustralis(null, QuickPasswords.Preferences.getBoolPref('skin.australis'), true)}, 1000);
		this.initialized = true;
	},
  
  initToolbarLock: function initToolbarLock(doc, node) {
    let btn = node;
    let isLocked = QuickPasswords.Util.checkIsMasterLocked;
    if (!btn) {
      QuickPasswords.Util.logDebug('initToolbarLock()\n locked = ' + isLocked);
      if (!doc) {
        let win = QuickPasswords.Util.MainWindow;    
        doc = win.document;
      }
      // add a "locked" icon:
      btn = doc.getElementById('QuickPasswords-toolbar-button');
    }
    if (btn) {
      btn.setAttribute('locked', isLocked);
    }
  } ,
  
  prepareAustralis: function prepareAustralis(doc, toggle, startup) {
		const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences;
    function toggleElementAustralis(id, toggle) {
      try {
        let el = doc.getElementById(id);
        if (el) {
          util.classListToggle(el, 'australis', toggle);
        }
      }
      catch(ex) {
         util.logException("toggleElementAustralis(" + id + ", " + toggle + ")", ex);
      }
    }
    QuickPasswords.initToolbarLock();
    let isAustralis = toggle;
    util.logDebug('QuickPasswords.prepareAustralis()\n'
      + 'isAustralis=' + toggle + '\n'
      + 'doc=' + (doc ? doc.documentURI : 'null'));
    if (doc) { // passed only if passwords manager window it open
      // password manager
      toggleElementAustralis('quickPasswordsUriFilterRefiner', isAustralis);
      toggleElementAustralis('quickpasswords-toolbox', isAustralis);
      toggleElementAustralis('quickPasswordsLockAfterClosing', isAustralis);
      toggleElementAustralis('signonsTreeContextMenu', isAustralis);
    }
    let win = util.MainWindow;
    if (!doc && startup) // special rule for init call from main window
      doc = window.document;
    else
      doc = win.document;
    if (win) {
      // main windows
      toggleElementAustralis('QuickPasswords-toolbar-button', isAustralis);
      toggleElementAustralis('context-quickPasswords', isAustralis);
      toggleElementAustralis('context-quickPasswords2', isAustralis);
      toggleElementAustralis('QuickPasswords-toolsMenu', isAustralis);
      toggleElementAustralis('context-quickPasswords-insertUser', isAustralis);
      toggleElementAustralis('context-quickPasswords-insertPassword', isAustralis);
    }
  } ,
  
	contextPopupShowing: function contextPopupShowing() {
	  function showInMenu(contextMenu, visible) {
			if (contextMenu) {
				contextMenu.showItem("context-quickPasswords", visible);
				contextMenu.showItem("context-quickPasswords-insertUser", visible);
				contextMenu.showItem("context-quickPasswords-insertPassword", visible);
				contextMenu.showItem("context-quickPasswords-cancelLogin", visible);
				QuickPasswords.Util.logDebugOptional ("contextMenu", 'contextPopupShowing: visible = ' + visible);
			}
			else {
				QuickPasswords.Util.logDebugOptional ("contextMenu", 'Context Menu not found!');
			}
		}
		QuickPasswords.Util.logDebugOptional ("contextMenu", "contextPopupShowing() ...");

		let menu;
		switch (QuickPasswords.Util.Application) {
			case 'Thunderbird': // Fall through
			case 'Postbox':
				menu = document.getElementById('mailContext');
				break
			case 'SeaMonkey':
				menu = gContextMenu;
				break;
			case 'Firefox':
				menu = gContextMenu;
				break;
		}
		// only show if a text item is right-clicked and also the option must be checked.
		// 0 = always
		// 1 = selective
		// 2 = never
		let cMenuOption = QuickPasswords.Preferences.contextMenuOption(),
        show = !(cMenuOption == 2) &&
				(
					(cMenuOption == 0) ||
					((cMenuOption == 1) && (menu.onTextInput || menu.onEditableArea))
				);
    QuickPasswords.Util.logDebugOptional ("contextMenu","calling showInMenu(menu, " + show + ")");
		showInMenu(menu, show);
				
	},

	// find last window of the given windowtype - we use this to find the changePassword window!
	getOpenWindow: function getOpenWindow(name) {
		let mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                             .getService(Components.interfaces.nsIWindowMediator),
		    win = mediator.getMostRecentWindow(name);
		return win;
	},

	loadPasswordManager: function loadPasswordManager() {
		QuickPasswords.Util.logDebugOptional("default", "loadPasswordManager()");
		// remove event listener
		// window.removeEventListener("load", this, false);
		// reset url to current location
		QuickPasswords.getURIcontext('');
	},

	getPasswordManagerWindow: function getPasswordManagerWindow(filterString, forceOpen) {
		const name = "Toolkit:PasswordManager",
		      uri = "chrome://passwordmgr/content/passwordManager.xul";

		let win = QuickPasswords.getOpenWindow(name);

		if (forceOpen && !win) {
			let argstring;
			argstring = Components.classes["@mozilla.org/supports-string;1"]
							.createInstance(Components.interfaces.nsISupportsString);
			argstring.data = filterString;
			let watcher = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
			win = watcher.openWindow(null, uri, name, "chrome,centerscreen,resizable,alwaysRaised", argstring); //
		}
		return win;
	},

	showLogins: function showLogins(filterString) {
		const util = QuickPasswords.Util;
		let win = this.getPasswordManagerWindow(filterString, true);
		this._PasswordManagerWindow = win;
		if (!win) {
		  setTimeout(function() {showLogins(filterString);}, 1000);
			// if we have started Fx and are asked for the master password = no window, lets repeat!
			util.logDebugOptional ("showLogins", "waiting for password manager...");
			return;
		}
		util.logDebugOptional ("showLogins", "Got Password Window:" + win);

		let fs = filterString, // need to marshall this into the setFilter method, the filterString parameter doesn't survive
		    serverURI = this.getActiveUri(true, true),
		    prettyURI = this.getActiveUri(false, true), // without protocol, first match
		    theTime = QuickPasswords.Preferences.waitForManager();

		util.logDebugOptional ("showLogins", "showLogins(" + fs + ") uri=" + serverURI + " time=" + theTime.toString());	
		let theContent = null, contentLocation;
		// global variable.
		if (typeof content !== 'undefined') {
			theContent = content;
		}

		if (!QuickPasswords.Preferences.isAutoFilter)
		  return;
			
		let doAutoFilter = 	function () {
			try  {
				util.logDebugOptional ("showLogins", "START: doAutoFilter()");
				// ieTab2 support - disable the login to page as we cannot control context menu of the IE container
				if (theContent) {
					contentLocation = gBrowser ? (gBrowser.selectedBrowser ? gBrowser.selectedBrowser.currentURI : theContent.location) : theContent.location;

					let btnLogin = win.document.getElementById('QuickPasswordsBtnLogin');
					if (btnLogin) {
						let host = contentLocation.host; // todo: fix "unsafe CPOW usage"
						btnLogin.disabled = (host == "ietab2" || host == "messenger");
					}
					let btnRepair = win.document.getElementById('QuickPasswordsBtnRepair');
					if (btnRepair) {
						let host = contentLocation.host; // todo: fix "unsafe CPOW usage"
						btnRepair.disabled = (host == "ietab2" || host == "messenger");
					}
				}
				if (win.self.setFilter) {
					let tree = QuickPasswords.signonsTree;
				  try {
						if (!tree.view.rowCount) { // throws if Thunderbird is not ready.
							util.logDebugOptional ("showLogins", "no rows in tree, postponing doAutoFilter for 200ms...");
							win.setTimeout(
								function() {QuickPasswords.checkCountChanged(win, 0, tree, doAutoFilter)},
								2000);
							return;
						}
						win.self.setFilter(fs);
						util.logDebugOptional ("showLogins", "after setFilter(" + fs + ")");
					}
					catch(ex) {
					  // this can happen if master password dialog is shown (Password Manager is invisible)
						util.logException("auto filter - password manager not ready - postponing by 1 sec:", ex);
						win.setTimeout(
							function() {QuickPasswords.checkCountChanged(win, 0, tree, doAutoFilter)},
							1000);
						return;
					}
					
					// now select activeURI in Manager
          /*********************
          ***  AUTOSELECT    ***
          *********************/
          if (QuickPasswords.autoSelectLogin(win, doAutoFilter, serverURI, prettyURI))
            return;

				}
				else {
				  // still too early...
  				win.setTimeout(doAutoFilter, 200);
				}

			}
			catch(ex) {
				util.logException("Error during auto filter", ex);
			}
		}
		// what if LoadSignons is called after doAutoFilter?
		win.addEventListener('load', function() {win.setTimeout(doAutoFilter, theTime);});
		if (win.LoadSignons) {
      // avoid recursion!!
      if (typeof win.QuickFolders_AutoFilter == 'undefined') {
        win.LoadSignons = function() {
          win.LoadSignons();
          win.QuickFolders_AutoFilter = true;
          win.setTimeout(doAutoFilter, theTime);
        }
      }
		}
		// win.setTimeout(doAutoFilter, theTime);
	},
  
  // Needs to be refined to auto-select the most recent login!
  autoSelectLogin: function autoSelectLogin(win, doAutoFilter, serverURI, prettyURI) {
		const util = QuickPasswords.Util;
    if (!win) win = QuickPasswords.PasswordManagerWindow;
    let tree = QuickPasswords.signonsTree;
    if (tree.view.rowCount) {
      util.logDebugOptional ("showLogins.treeview", "start to enumerate " + tree.view.rowCount + " rows for selecting...");
      // find activeURI
      let sel = tree.view.selection.QueryInterface(Components.interfaces.nsITreeSelection);
      util.logDebugOptional ("showLogins.treeview", "got selection - " + sel);
      let candidates = [];
      for (let i=0; i<tree.view.rowCount;i++) {
        let site = QuickPasswords.getSite(i, tree),
            afterHostLoc = site.indexOf('//') + 2;
        afterHostLoc = (afterHostLoc==1) ? 0 : afterHostLoc; // not found.
        let prettySite = site.substr(afterHostLoc);
        if (site==serverURI || prettySite==prettyURI) {
          // util.logDebugOptional ("showLogins.treeview", "found matching URI: " + serverURI );
          let match = {idx : i, 
                       date: QuickPasswords.getLastLogin(i, tree, win)};
          if (site==serverURI) {
            candidates.push(match);
            util.logDebugOptional ("showLogins.treeview", 
              "complete URI match: " + serverURI + "\n"
              + "lastLogin = " + match.date + "\n"
              + "match.idx = " + match.idx + "\n"
              + "");
            // break; // full match
          }
        }
      }
      if (candidates.length) {
        let lastLogin = candidates[0];
        for (let i=0;i<candidates.length;i++) {
          if (lastLogin.date < candidates[i].date) {
            lastLogin = candidates[i];
          }
        }
        sel.clearSelection();
        // instead of selecting outright, lets add index to array 
        // and determine the most recent login to select
        let idx = lastLogin.idx;
        util.logDebugOptional ("showLogins.treeview", "selecting item " + idx);
        sel.select(idx);
        // if scrolling happens too soon (before filtering is done) it can scroll to invisible portion of treeview contents. closured: tree, i
        win.setTimeout( function() {
          QuickPasswords.Util.logDebugOptional ("showLogins.treeview", "ensuring row is visible " + idx);
          let boxobject = tree.boxObject;
          boxobject.ensureRowIsVisible(idx); }, 100);
        
      }
      // make sure to refilter if the count changes.
      win.setTimeout(
        function() {QuickPasswords.checkCountChanged(win, tree.view.rowCount, tree, doAutoFilter)},
        250);
      return true;
    }  
    return false;
  } ,
  
  selectMRU: function(activeURI) {
		let isDebug = QuickPasswords.Preferences.isDebug;
    // select Most Recent Used login
    if (activeURI) { 
			let treeView = QuickPasswords.signonsTree.view,
			    selection = treeView.selection,
					matches = [];
		  selection.clearSelection();
			
			for (let i=0; i<treeView.rowCount;i++) {
				let URL = this.getManagerColumn (i, 'siteCol'),
				    uriPos = URL.indexOf('//');
				if (uriPos<=0) 
					uriPos = 0;
				else
					uriPos+=2;
				let foundPos = URL.substr(uriPos).indexOf(activeURI);
				if (foundPos==0) {
					matches.push(i);
				}
			}
			// find latest match - we should probably go back to loginmanager
			if (matches.length) {
				let foundX = matches[0], 
				    lastUsed=0;
				for (let x=0; x<matches.length; x++) {
					let thisUsed = this.getManagerColumn (matches[x], 'timeLastUsedCol');
					if (thisUsed > lastUsed) {
						lastUsed = thisUsed;
						foundX = matches[x];
					}
				}
				selection.toggleSelect(foundX);
			}
		}
  } ,
	
	checkCountChanged: function checkCountChanged(win, oldCount, tree, theFilterFunction) {
		const util = QuickPasswords.Util;
	  if (tree) {
		  let rowCount = tree.view.rowCount;
		  if (rowCount > oldCount || rowCount == 0) {
				util.logDebugOptional ("showLogins", 
				  rowCount ? 
					"checkCountChanged() - count changed:" + rowCount :
					"checkCountChanged() - no rows found");
				if (rowCount) 
					win.setTimeout(theFilterFunction,10); // count changed, let's filter.
				else {
          // function can be called while Master Password Prompt is shown
				  win.setTimeout(
					  function() { QuickPasswords.checkCountChanged(win, rowCount, tree, theFilterFunction); },
					  rowCount ? 250 : 2000);
					}
			}
			else
				util.logDebugOptional ("showLogins", "checkCountChanged() unchanged:" + tree.view.rowCount);
		}
	} ,

	getManagerColumn: function getManagerColumn(idx, colName, tree) {
		if (idx<0) return '';
		if (!tree)
			tree = self.signonsTree || QuickPasswords.signonsTree;  // we might have hidden this for SSO password change!		if (!tree.view.rowCount)
		try {
			return tree.view.getCellText(idx, tree.columns.getNamedColumn(colName));
		}
		catch (ex) {
		  throw('getCellText(idx=' + idx + ', colName = ' + colName + ' threw exception:\n' + ex.toString());
		}
	},

  // code from mozilla-central/source/toolkit/components/passwordmgr/content/passwordManager.js#63
  // signons = passwordmanager.getAllLogins();
  // we need the window handle to access signonsTreeView!
  // passing tree may be obsolete except - might not work in Postbox
  getSignOn: function getSignOn(idx, t, win) {
    let signon,
        tv;
    if (win && typeof win.signonsTreeView !== 'undefined') {
      tv = win.signonsTreeView;
    }
    else {
      // wrappedJSObject according to Gijs
      tv = t.view.wrappedJSObject;
    }
    signon = tv._filterSet.length ? tv._filterSet[idx] : win.signons[idx];
    return signon;
  },
	getSite: function getSite(idx, t) {
		// truncate at first space to avoid comment e.g. www.xxx.com (foo bar)
		let theSite =  this.getManagerColumn (idx, 'siteCol', t);
		return theSite ? theSite.split(" ", 1).toString() : '';
	},
	getUser: function getUser(idx, t) { return this.getManagerColumn (idx, 'userCol', t); },
	getPassword: function getPassword(idx, t) { return this.getManagerColumn (idx, 'passwordCol', t); },
  getLastLogin: function getLastLogin(idx, t, win) { 
    try { 
      let signon = this.getSignOn(idx,t, win);
      if (signon)
        return signon.timeLastUsed;
      return 0;
    }
    catch(ex) { 
      // we can't use this string for finding the date - need to get back to the password database for the real date!
      let ds =  this.getManagerColumn (idx, 'timeLastUsedCol', t) || 'N/a';
      // let dt = new Date(ds);
      QuickPasswords.Util.logDebug("Can't convert to date: " + ds + "\n" + ex.message);
    } // oldest
    return null; 
  },


	isMailBox : function isMailBox() {
	} ,

	isMailMessage : function isMailMessage() {

	},
  
  getBrowser : function getBrowser() {
    let ret = null;
    try {
      ret = getBrowser();
    }
    catch(ex) {
			QuickPasswords.Util.logException("Error trying to get current Browser window: ", ex);
    }
    return ret;
  },

	getCurrentBrowserWindow : function getCurrentBrowserWindow(evt) {
		const ci = Components.interfaces,
		      interfaceType = ci.nsIDOMWindow,
					util = QuickPasswords.Util;
    
    if (util.Application=='Postbox') {
     let win = Components.classes["@mozilla.org/appshell/window-mediator;1"]
				.getService(Components.interfaces.nsIWindowMediator)
				.getMostRecentWindow("mail:3pane");
     return win;
    }
    
		let DomWindow = null,
		    theBrowser = null;
		try {
			// find topmost navigator window
			let mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(ci.nsIWindowMediator),
			    browsers = null,
          getWindowEnumerator = 
        (util.isLinux) ?
        mediator.getXULWindowEnumerator :
        mediator.getZOrderXULWindowEnumerator;

			switch (util.Application) {
				case 'Thunderbird': 
          browsers = getWindowEnumerator ('mail:3pane', true);
					break;
				case 'SeaMonkey':
				  // check if click comes from mail window:
					if (evt && evt.originalTarget && evt.originalTarget.baseURI == "chrome://messenger/content/messenger.xul"
					    ||
							content && content.window && content.window.name == 'messagepane')
						browsers = getWindowEnumerator ('mail:3pane', true);
					// navigator is the fallback case.
					if (!browsers)
						browsers = getWindowEnumerator ('navigator:browser', true);
						
					break;
				default: // Firefox
					browsers = getWindowEnumerator ('navigator:browser', true);
					break;
			}
      if (browsers) {
        theBrowser = browsers.getNext();
        if (theBrowser) {
          if (theBrowser.getInterface)
            DomWindow = theBrowser.getInterface(interfaceType);
          else {
            try {
              // Linux
              DomWindow = theBrowser.QueryInterface(ci.nsIInterfaceRequestor).getInterface(interfaceType);
            }
            catch(e) {;}
          }
        }
      }
      
			if (!DomWindow) {
				browsers = getWindowEnumerator ('navigator:browser', true);
				if (!browsers || !(util.Application!='Firefox' && browsers.hasMoreElements()))
					browsers = getWindowEnumerator ('mail:3pane', true);
				if (!browsers)
					return  null;
				if (browsers.hasMoreElements()) {
					theBrowser = browsers.getNext();
					if (theBrowser.getInterface)
						DomWindow = theBrowser.getInterface(interfaceType);
					else // Linux
						DomWindow = theBrowser.QueryInterface(ci.nsIInterfaceRequestor).getInterface(interfaceType)
				}
				else
					DomWindow = QuickPasswords.getBrowser(); // Linux last resort
			}
		}
		catch(ex) {
			// in Linux getZOrderXULWindowEnumerator is currently broken
			util.logException("Error trying to get current Browser window: ", ex);
      DomWindow = QuickPasswords.getBrowser();
		}
		finally {
			if (!DomWindow)
				return  null;

			return DomWindow;
		}
	},
  
  // wrapper for nsIUri.host() which throws error on certain URLS! (about:)
  getDomain: function getDomain(uri) {
    function sliceAboutUriPart(urlString) {
      // retrieve  "about:config" from the URL / asciiSpec etc.
      if (urlString.indexOf('about')==-1) {
        return urlString;
      }
      let startAbout = urlString.indexOf(':') + 1,
          mySpec = urlString.substr(startAbout),
          endDomain = mySpec.indexOf('?');
      if (endDomain>0)
        mySpec = mySpec.substr(0, endDomain);
      return mySpec;
    }
    let domain = '';
    try {
      domain = uri.host;
      if (!domain)
        domain = sliceAboutUriPart(uri.toString());
    }
    catch(ex) {
      if (uri.scheme.indexOf('about')==0) {
        // example: about:accounts?action=reauth&entrypoint=preferences
        // let's define the first keyword after about as the "domain"
        domain = sliceAboutUriPart(uri.asciiSpec);
      }
    }
    finally {
      return domain;
    }
  } ,

	getActiveUri : function getActiveUri(withServer, withHost) {
		const Ci = Components.interfaces,
		      util = QuickPasswords.Util;
		function findAccountFromFolder (theFolder) {
			if (!theFolder)
				return null;
			let acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
				.getService(Ci.nsIMsgAccountManager);
			let accounts = acctMgr.accounts;
			let iAccounts = (typeof accounts.Count === 'undefined') ? accounts.length : accounts.Count();
			for (let i = 0; i < iAccounts; i++) {
				let account = accounts.queryElementAt ?
					accounts.queryElementAt(i, Ci.nsIMsgAccount) :
					accounts.GetElementAt(i).QueryInterface(Ci.nsIMsgAccount);
				let rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder

				if (rootFolder.hasSubFolders) {
					let subFolders = rootFolder.subFolders; // nsIMsgFolder
					while(subFolders.hasMoreElements()) {
						if (theFolder == subFolders.getNext().QueryInterface(Ci.nsIMsgFolder))
							return account.QueryInterface(Ci.nsIMsgAccount);
					}
				}
			}
			return '';
		}
		
		let isMailbox = false,
		    browser = this.getCurrentBrowserWindow(),
		    tabmail = null,
		    currentURI = '';
		
		if (browser || document.getElementById("tabmail")) {  // in Linux we cannot get the browser while options dialog is displayed :(
			try {
				let isOriginBrowser = (util.Application=='Firefox');
				// for SeaMonkey we need to determine whether we opened from the messenger or from the navigator window
				if (util.Application!='Firefox') {
					tabmail = browser.document ? browser.document.getElementById("tabmail") : document.getElementById("tabmail");
					// double check whether we come from browser
					if (util.Application=='SeaMonkey') {
					  if (!tabmail) {
							isOriginBrowser = true;
						}
						else {  
						  // both windows are open, now what?
						  // best: which window is in foreground. or which window called (owner?)
						}
					}
				}
				/*     GET CONTEXT FROM CURRENT MAIL TAB  */
				if (!isOriginBrowser) {
					
					if (tabmail) {
						let tab = tabmail.selectedTab ? tabmail.selectedTab : tabmail.currentTab;  // Pb currentTab
						let theMode = tab.mode ? tab.mode.name : tab.getAttribute("type");
						if (!browser)
							browser = tab.browser;
						if (theMode == 'folder') {
						  // if we are in folder mode we might have a message selected
							if (tab.folderDisplay && tab.folderDisplay.focusedPane && tab.folderDisplay.focusedPane.id =='threadTree') {
								theMode = 'message';
							}
						}

						util.logDebugOptional("default", "Selected Tab mode: " + theMode);
						switch (theMode) {
							case 'folder':
								isMailbox = true;

								try {
									let currentFolder =
										tab.folderDisplay ?
										tab.folderDisplay.displayedFolder :
										browser.GetFirstSelectedMsgFolder().QueryInterface(Ci.nsIMsgFolder);
									// let currentFolder2 = tab.folderDisplay.view.displayedFolder.QueryInterface(Ci.nsIMsgFolder);
									// let msgFolder = theFolder.QueryInterface(Ci.nsIMsgFolder);
									currentURI = currentFolder.server.hostName; // password manager shows the host name
									if (currentURI == 'localhost') {
										currentURI = currentFolder.server.realHostName;
									}
								}
								catch(ex) {
									util.logException("Could not determine current folder: ",ex);
									return ""
								}
								break;

							case 'calendar':
								currentURI="Calendar";
								break;
							case 'contentTab':      // fall through
							case 'thunderbrowse':
								currentURI = this.getDomain(tab.browser.currentURI);
								break;
							case 'tasks':
								break;
							case 'glodaFacet':         // fall through
							case 'glodaSearch-result': // fall through
							case 'glodaList':          // fall through
							case 'message':            // fall through
								// find out about currently viewed message
								try {
									let msg = null;
									if (tab.folderDisplay) {
										msg = tab.folderDisplay.selectedMessage;
									}
									else {
										if (tab.messageDisplay && tab.messageDisplay.selectedCount==1) {
											msg = tab.messageDisplay.displayedMessage;
										}
										else {
											let msgUri = this.alternativeGetSelectedMessageURI (browser);
											if (msgUri) {
												msg = browser.messenger.messageServiceFromURI(msgUri).messageURIToMsgHdr(msgUri);
											}
										}
									}
									if (!msg) return '';
									// strip out unneccessary parts:
									//      'Author Name <author.name@domain.ext.ext>'
									//  =>                           'domain.ext.ext'
									currentURI = msg.author;
									let domainStart = currentURI.indexOf('@');
									if (domainStart) {
										currentURI = currentURI.substr(domainStart+1);
									}
									let domainEnd = currentURI.indexOf('>');
									if (domainEnd) {
										currentURI = currentURI.substr(0,domainEnd);
									}
								}
								catch(ex) { 
								  util.logException("Could not retrieve message from context menu", ex);
									currentURI = "{no message selected}"; 
								};
								break;
							default:
								break;
						}
					}

					if (!util.PrivateBrowsing) {
						util.logDebugOptional("default", "current URI of tab is: " + currentURI);
					}

				}
				/*     GET CONTEXT FROM CURRENT BROWSER  */
				else {
				  // Fx
					let lB = browser.gBrowser.selectedTab.linkedBrowser;
					// SM:
					let uri = lB.registeredOpenURI ? lB.registeredOpenURI : lB.currentURI;
				  // for ieTab support, we need to filter:
					// chrome://ietab2/content/reloaded.html?url=
					
					// prepend http:// or https:// etc.
					let uriProtocol =
						 (withServer)
						 ?
						 ((uri.scheme=='about') ? 'about:' : (uri.scheme + '://'))
						 :
						 "";
					
          try {
            if (this.getDomain(uri) == "ietab2") {
              // find first url parameter:
              let f = uri.path.indexOf("?url=");
              let ieTabUri = "";
              if (f > 0) {
                let ieTabUri = uri.path.substring(f + 5);
                f = ieTabUri.indexOf("//");
                if (withServer && f > 0) {
                  uriProtocol = ieTabUri.substring(0, f+2);
                }
                else {
                  uriProtocol = "";
                }
                let r = ieTabUri.substring(f+2);
                currentURI = uriProtocol +  r.substring(0 , r.indexOf("/"));
                return currentURI;
              }
            }
          }
          catch (ex) {
            // uri.host() throws an error when "about:" url is used!
          }

          let dom = this.getDomain(uri),
					    domain = withHost ? dom : dom.substr(dom.indexOf('.')+1);
					currentURI = uriProtocol + domain;
					
				}
			}
			catch(ex) {
				if (!util.PrivateBrowsing) {
					util.logException("Error retrieving current URL:", ex);
				}
			}
		}

		return currentURI;
	},

	alternativeGetSelectedMessageURI : function alternativeGetSelectedMessageURI(theWin) {
	try {
		let view = theWin.GetDBView();
		if (view.URIForFirstSelectedMessage)
			return view.URIForFirstSelectedMessage;
		
		let messageArray = {};
		let length = {};
		view.getURIsForSelection(messageArray, length);
		if (length.value)
			return messageArray.value[0];
		else
			return null;
		}
		catch (ex) {
			dump("alternativeGetSelectedMessageURI ex = " + ex + "\n");
			return null;
		}
	},

	askSelectByPassword: function askSelectByPassword(win, pwdElement) {
		if (pwdElement) {
      //  [Bug 25750] Macs misbehave!
      let targetWindow = QuickPasswords.Util.isMac ?
		     QuickPasswords.getOpenWindow("chrome://passwordmgr/content/passwordManager.xul") :
         win.opener;         
			try {
				if(pwdElement.value=='')
					alert(QuickPasswords.Bundle.GetStringFromName("enterOriginalPasswordMessage"));
				else {
					let info = {'cmd':'selectByPassword', 'pwd':pwdElement.value}; // {'cmd': 'init', 'timestamp': Date.now()}
					// second parameter for postMessage is probably completely random!
					targetWindow.postMessage(info, "*"); // TARGET: chrome://passwordmgr SOURCE://chrome://quickpasswords
				}
			}
			catch(ex) {
				QuickPasswords.Util.logException("Error trying selectByPassword: ", ex);
			}
		}
	} ,

	refineUriFilter : function (win) {
		const prefs = QuickPasswords.Preferences;
		let newFilter, filter;

		if (prefs.isDebug) debugger;
		if (win) {
			let activeURI = this.getActiveUri(false, true);
			filter = document.getElementById('filter').value;

			if (activeURI) {
				QuickPasswords.Preferences.setLastLocation(activeURI);
				// when pw manager is opened, we initialize the current URI
				// the refine function will strip the first domain token (e.g. www. etc.)
				if (!filter) {
					filter = activeURI;
				}
			}

			try { newFilter = this.getURIcontext(filter); }
			catch(er) { newFilter = ''; }

			this._PasswordManagerWindow = win;
			if (win.self.setFilter) {
				win.self.setFilter(newFilter);
        // to do: select last used logon of filtered records
        this.selectMRU(activeURI);
			}
		}
	} ,
  
  copyRecords: function() {
    let cpy = this.copyToClipboard.bind(this),
        tb = this.throbber;
		if (!QuickPasswords.Manager.loginMaster(true))
			return;
    tb(true);
    setTimeout(function(){ 
     cpy('row'); 
     tb(false);
      }, 100); // wait for menu to close
  } ,
  
	copyToClipboard : function(what) {
		const name = "Toolkit:PasswordManager",
          Ci = Components.interfaces,
          Cc = Components.classes,
					util = QuickPasswords.Util;
		let lstPasswords = document.getElementById('signonsTree'), // password list
		    tree = self.signonsTree || QuickPasswords.signonsTree,
				treeView = tree.view; // in Fx51, signonsTreeView is gone.

		if (tree.currentIndex<0) {
			alert (QuickPasswords.Bundle.GetStringFromName("selectOneMessage"));
		}

		let site = this.getSite(tree.currentIndex),
		    user = this.getUser(tree.currentIndex),
		    pwd = this.getPassword(tree.currentIndex),
		    cm,cu,cs,cp,ct,
		    sCopyDummy="";

		try {
			// in SeaMonkey, this fails for some reason
			cm = QuickPasswords.Bundle.GetStringFromName("copyMessage");
			cu = QuickPasswords.Bundle.GetStringFromName("copyMessageUser");
			cs = QuickPasswords.Bundle.GetStringFromName("copyMessageDomain");
			cp = QuickPasswords.Bundle.GetStringFromName("copyMessagePassword");
			ct = QuickPasswords.Bundle.GetStringFromName("copyMessageTitle"); // currently unused
		}
		catch (ex)
		{
			util.logToConsole("Error trying to get string bundle: " + ex);
			cm = "Copied Password to Clipboard!";
			cu = "User";
			cs = "Site";
			ct = "QuickPasswords";
			cp = "Password";
		}
		
		// prompts that can be hidden 
		let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService),  
		    dontShowAgain = util.getBundleString("dontShowAgain", "Do not show this message again."),
		    check = {value: false},   // default the checkbox to true  
		    title = util.getBundleString("copyMessageTitle", "QuickPasswords"),
		    alertShown = false,
		    msg='';

		switch (what) {
			case 'pwd':
				util.copyStringToClipboard(pwd);
				msg = cm + '\n' + cu + ': ' + user + '\n' + cs + ': ' + site;
				if (QuickPasswords.Preferences.isCopyMsg) {
					alertShown = true;
					let result = prompts.alertCheck(null, title, msg, dontShowAgain, check);
					if (check.value==true) {
						QuickPasswords.Preferences.setBoolPref("copyMsg", false);
					}
				}
				break;

			case 'url':
				util.copyStringToClipboard(site);
				msg = cm.replace(new RegExp(cp, "i" ), cs) + '\n' + cu + ': ' + user + '\n' + cs + ': ' + site; 

				if (QuickPasswords.Preferences.isCopyMsg) {
					alertShown = true;
					let result = prompts.alertCheck(null, title, msg, dontShowAgain, check);
					if (check.value==true) {
						QuickPasswords.Preferences.setBoolPref("copyMsg", false);
					}
				}
				break;

			case 'usr':
				util.copyStringToClipboard(user);
				msg = cm.replace(new RegExp(cp, "i" ), cu) + '\n' + cu + ': ' + user + '\n' + cs + ': ' + site; 

				if (QuickPasswords.Preferences.isCopyMsg) {
					alertShown = true;
					let result = prompts.alertCheck(null, title, msg, dontShowAgain, check);
					if (check.value==true) {
						QuickPasswords.Preferences.setBoolPref("copyMsg", false);
					}
				}
				break;

			case 'row':
				let iPasswordsSelected = 0,
				    start = new Object(),
				    end = new Object(),
				    numRanges = tree.view.selection.getRangeCount(),
				    sLine = '',
				    sCopyText='',
            passwordField, usernameField, formSubmitURL, httpRealm,
            srvLoginManager = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);

				for (let t = 0; t < numRanges; t++){
					tree.view.selection.getRangeAt(t,start,end);
					for (let v = start.value; v <= end.value; v++){
						iPasswordsSelected++;
						site = this.getSite(v); // = hostname
						user = this.getUser(v);
						pwd = this.getPassword(v);
            // we can find the real match maybe...
            //  aActionURL  For form logins, this parameter should specify the URL to which the form will be submitted. 
            //              For protocol logins, specify null. An empty string ("") will match any value (except null).
            let logins = srvLoginManager.findLogins(
              {},   // count
              site, // aActionURL
              '',   // aHttpRealm ''  form logins; use '' for  returns nsILoginInfo[]
              null); 
            passwordField=''; usernameField=''; formSubmitURL='';
            for (let l = 0; l<logins.length; l++) {
              if (logins[l].password == pwd
                  && logins[l].username == user
                  && site == logins[l].hostname.split(" ", 1).toString()) {
                // match!
                passwordField = logins[l].passwordField;
                usernameField = logins[l].usernameField;
                formSubmitURL = logins[l].formSubmitURL;
                httpRealm = logins[l].httpRealm;
                util.logDebugOptional ("contextMenu", "Matched host(" + l + "): " + logins[l].hostname + " [" + user + "]\n"
                  + "httpRealm=" + httpRealm + "\n"
                  + "passwordField=" + passwordField + "\n"
                  + "usernameField=" + usernameField + "\n"
                  + "formSubmitURL=" + formSubmitURL + "\n");
                  
              }
            }
            
            
						sLine = site + '\t' + user + '\t' + pwd;
            //extended info
            sLine = sLine + '\t' + usernameField + '\t' + passwordField + '\t' + formSubmitURL + '\t' + httpRealm;
						sCopyText = sCopyText + sLine + '\n';
						sCopyDummy = sCopyDummy + site + '\t' + user + '\t' + '*********\n'; // console output
					}
				}
				if (iPasswordsSelected==0) {
					cm = QuickPasswords.Bundle.GetStringFromName("selectOneMessage");
					alert (cm);
					return;
				}

				if (iPasswordsSelected > 1) {
					if (QuickPasswords.Preferences.isMultiRowHeader) {
            let extendedFields = '\t' + 'usernameField' + '\t' + 'passwordField' + '\t' + 'formSubmitURL' + '\t' + 'httpRealm';
						sCopyText = cs + '\t' + cu + '\t' + cp + extendedFields + '\n' 
                      + sCopyText;
          }
					sCopyDummy = cs + '\t' + cu + '\t' + cp + '\n' + sCopyDummy;

					util.copyStringToClipboard(sCopyText);
				}
				else {
					util.copyStringToClipboard(site + '\t' + user + '\t' + pwd);
				}
				try {
					if (1==iPasswordsSelected)
						cm = QuickPasswords.Bundle.GetStringFromName("copyRecordMessage");
					else
						cm = QuickPasswords.Bundle.GetStringFromName("copyRecordsMessage");
				}
				catch(e) {
					util.logToConsole("Error getting String Bundle GetStringFromName\n" + e);
					cm="Data copied to clipboard - see error console for detail";
				}
        finally {
          this.throbber(false);
        }
				if (QuickPasswords.Preferences.isCopyMsg) {
					alertShown = true;
					alert (cm);
				}
				msg = cm;
				break;

		}

		if (!util.PrivateBrowsing) {
			if (""!=sCopyDummy)
				util.logToConsole("Copied Password Information to Clipboard:\n" + sCopyDummy);
			else
				util.logToConsole("Copied Password Information to Clipboard for " + user + " at site: " + site);
		}

		if (QuickPasswords.Preferences.isAutoCloseOnCopy)
			this.closePasswordManager();
		// show sliding notification if no alert was shown.
		if (!alertShown && (msg != '')) {
		  setTimeout(function() { QuickPasswords.Util.slideAlert('QuickPasswords', msg); });
		}

		
	},

	closePasswordManager: function() {
		QuickPasswords.Manager.close();
		if (null==this._PasswordManagerWindow)
			this._PasswordManagerWindow = self;
		this.PasswordManagerWindow.close();
		this._PasswordManagerWindow=null;
	} ,

	// retrieves current URI from clicked context
	// in a browser window we will get this from the global content let
	// in a tabmail window, lets use the getActiveUri helper function
	getURIcontext: function(currentFilter) {
		let sBaseDomain = '',
        util = QuickPasswords.Util,
        prefs = QuickPasswords.Preferences,
        isprivate = util.PrivateBrowsing,
				contentLocation;
		if (!isprivate)
			util.logDebugOptional("default", "getURIcontext(" + currentFilter + ')');

    try {
      if (content) {
				contentLocation = gBrowser ? (gBrowser.selectedBrowser ? gBrowser.selectedBrowser.currentURI : content.location) : content.location;
        let theHost = QuickPasswords.getDomain(contentLocation); // instead of location.host which doesn't work for about:XXX urls
        if (!isprivate) {
          util.logDebugOptional("uriContext", "content.location = " + contentLocation);
          util.logDebugOptional("uriContext", "determined Host " + theHost);
        }
        if (theHost == "ietab2" 
           || theHost == "messenger"
           || (util.Application != 'Firefox' &&  content.window && content.window.name == 'messagepane')
           ) {
          theHost = this.getActiveUri(false, true);
        }
        QuickPasswords.lastContentLocation = theHost;
        prefs.setLastLocation(theHost);
      }
      else
        QuickPasswords.lastContentLocation = prefs.getLastLocation();

      let sHost = QuickPasswords.lastContentLocation ;
      if (!isprivate)
        util.logDebugOptional("uriContext", "lastContentLocation = " + sHost);


      let pos = sHost.indexOf('.'),
          s2 = sHost.substring(pos+1, sHost.length),
          pos2 = s2.indexOf('.');
      // strip first word if second is long enough to be a domain; gets rid of stuff like www. login. etc.
      // currentFilter always toggles if it is set
      if (prefs.getBoolPref("autofilter.showAll") || currentFilter) {
        if (pos2>3)
          sHost=sHost.substring(pos+1,sHost.length);
      }  
     
      // if currentFilter is passed in, lets refine it more!
      if (sHost == currentFilter) {
        sBaseDomain = QuickPasswords.lastContentLocation;
      }
      else
        sBaseDomain = sHost;
      if (!isprivate)
        util.logDebugOptional("default", "Determined Domain from Host String:" + sBaseDomain);
    }
    catch(ex) {
      util.logException('getURIcontext()', ex);
    }
    if (!isprivate)
      util.logDebugOptional("uriContext", "returning sBaseDomain = " + sBaseDomain);

		return sBaseDomain;
	},

	getContextMenu: function(win, sName) {
		if (!win)
			return null;
		return win.document.getElementById('context-quickPasswords-' + sName);
	} ,

	prepareContextMenu: function(win, elementName, theValue, documentId, loginInfo) {
		if (!win)
			return;
		let doc = win.document ? win.document : window.document,
		    el = doc.getElementById('context-quickPasswords-' + elementName);
		if(el) {
			el.collapsed = (theValue == '') ? true : false;
			// value to fill in
			el.quickPasswordsData = theValue; 
			// use this for correcting stored form information
			el.quickPasswords_FormId = documentId ? documentId : '';
			el.quickPasswords_loginInfo = loginInfo ? loginInfo : null;
		}

	} ,
		
	isVisible: function(win, element) {
		const util = QuickPasswords.Util;
		try {
			let computedStyle = win.getComputedStyle(element, null),
			    dis = computedStyle.getPropertyValue('display');
			if (dis && dis == 'none') {
				return false;
			}
			let left = computedStyle.getPropertyValue('left');
			// we pick an arbitrary value of 200px for elements / parents in case there were some layout adjustments
			if (left && parseInt(left,10) < -200) {  
				return false;
			}
			let top = computedStyle.getPropertyValue('left');
			if (top && parseInt(top,10) < -200) {  
				return false;
			}
			util.logDebugOptional('formFill', 'Element ' + element + ' display=' + dis + '  left=' + left + '  top=' + top);
			
			// we assume body is always visible.
			if (element.tagName && element.tagName.toLowerCase() == 'body')
				return true;
			if (element.parentElement) {
				return this.isVisible(win, element.parentElement);
			}
			else 
				return false;
		}
		catch(ex) {
			util.logException('Error trying to get field visibility', ex);
		}
		return false;
	} ,
	
	repairLoginTitle: '',
	
	repairLoginFields: function repairLoginFields(btn) {
	  if (btn) {
			this.repairLoginTitle = btn.getAttribute('label');
		}
		this.attemptLogin(false);
	} ,
	
	getTreeSelection: function getTreeSelection(tree) {
		const util = QuickPasswords.Util,
					prefs = QuickPasswords.Preferences;
		if (prefs.isDebugOption('formFill')) debugger;
		try {
			let selections = [],
			    select = tree.view.selection;
			if (select) {
				let count = select.getRangeCount(),
				    min = {},
				    max = {};
				for (let i = 0; i < count; i++) {
					select.getRangeAt(i, min, max);
					for (let k = min.value; k <= max.value; k++) {
						if (k != -1) {
							selections[selections.length] = k;
						}
					}
				}
			}
			return selections;		
		}
		catch(ex) {
			util.logException('getTreeSelection: ', ex);
			return null;
		}
	},

	attemptLogin: function attemptLogin(fillForm) {
    const Cc = Components.classes,
          Ci = Components.interfaces,
					util = QuickPasswords.Util,
					prefs = QuickPasswords.Preferences,
					win = this.PasswordManagerWindow;
		let isRepairMode = !fillForm,
        prepareContextMenu = QuickPasswords.prepareContextMenu;
		util.logDebugOptional('formFill', 'attemptLogin() starts...');
		
		if (prefs.isDebugOption('formFill')) debugger;
		let tree = QuickPasswords.signonsTree,
		    selections =  this.getTreeSelection(tree), // win.GetTreeSelections ? win.GetTreeSelections() : null,
				currentSelection;
		if (selections) {
			if (selections.length!=1) {
				let msg = QuickPasswords.Bundle.GetStringFromName("selectOneMessage");
				alert (msg);
				return;
			}
			currentSelection = selections[0];
		}
		else {
			if (tree.currentIndex<0) {
				let msg = QuickPasswords.Bundle.GetStringFromName("selectOneMessage");
				alert (msg);
				return;
			}
			currentSelection = tree.currentIndex;
		}
		
			
		// get main window context menu and uncollapse the invisible login items.
		let pwd = this.getPassword(currentSelection, tree),
		    // autofill
		    usrFilled = false,
		    pwdFilled = false,
		    passwordField = '',
		    usernameField = '',
		    browserWin = QuickPasswords.getCurrentBrowserWindow(),
		    foundLoginInfo = null,
		    user = this.getUser(currentSelection, tree);
		
		// auto insert ...
		if (prefs.isAutoInsert) {
			util.logDebugOptional('formFill', "browserWin: " + browserWin);

			if (browserWin) {
				let el;
				
			  util.logDebugOptional('formFill', 
					'user from Manager: ' + (user ? 'yes' : 'no') +'\npassword from Manager: '  + (pwd ? 'yes' : 'no') + '\n');
				/*******  NEW: auto-login   ******/
				// automatic login
				try {
					let loginManager = Cc["@mozilla.org/login-manager;1"]
											 .getService(Ci.nsILoginManager),
					    theSite = this.getSite(tree.currentIndex, tree),
					    uri = this.getActiveUri(false, false); // browserWin.gBrowser.currentURI;
					
					// retrieve field names of user name and password INPUT elements (via matching usr+pwd)
					let logins = loginManager.findLogins({}, theSite, '', null);
					// Find user from returned array of nsILoginInfo objects
					for (let i = 0; i < logins.length; i++) {
						if ((logins[i].username == user) && (pwd == logins[i].password)) {
							foundLoginInfo = logins[i];
							passwordField = foundLoginInfo.passwordField;
							usernameField = foundLoginInfo.usernameField;
							break;
						}
					}
					
					// matching browser URI?
					if (theSite.indexOf(uri) >= 0) {
						util.logDebugOptional('formFill',
							'Searching forms for password field =' + passwordField + 
							', username field =' + usernameField + '...');
						let form = browserWin.gBrowser.contentDocument.querySelectorAll("form");
						// Find users for the given parameters
						//  count, hostname, actionURL, httpRealm, ...out logins
						
						// try to autofill both form values
						if (fillForm) {
							for(let i=0; i<form.length; i++) {
							
								let theForm = form[i];

								try {
									let id = util.getIdentifier(theForm);
									if (!id) id='??';
									let properties = '\nid: ' + id
																 + '\nhas ' + theForm.elements.length + ' elements';
									util.logDebugOptional('formFill', 'Parsing Form [' + i.toString() + '] '+ properties + '...');
								}
								catch(e) {;}
									
								if (theForm.visible == false) {
									util.logDebugOptional('formFill', 'Skipping Form (invisible form)');
									continue;
								}
															 
								let u = theForm.elements.namedItem(usernameField);
								if (u) {
									if (this.isVisible(browserWin, u)) {
										util.logDebugOptional('formFill', 'found user field [' + usernameField + '] in form[' + i + ']');
										u.value = user;
										usrFilled = true;
									}
									else
										util.logDebugOptional('formFill', 'not filling - invisible: ' + usernameField);
								}
								let p = theForm.elements.namedItem(passwordField);
								if (p) {
									if (this.isVisible(browserWin, p)) {
										util.logDebugOptional('formFill', 'found password field [' + passwordField + '] in form[' + i + ']');
										p.value = pwd;
										pwdFilled = true;
									}
									else
										util.logDebugOptional('formFill', 'not filling - invisible: ' + passwordField);
								}
								if (usrFilled && pwdFilled)
									break;
								// if(loginManager.fillForm(theForm)) 
								//	dump('Form filled!\n');
							} // for loop.
						}
					}  // end of uri matching
					else {
					  // no match, no correction!!
					  foundLoginInfo = null;
					}
				}
				catch(ex) {
					util.logException('Error trying to get auto-login: ', ex);
					// no match, no correction!!
					foundLoginInfo = null;
				}
			}
			util.logDebugOptional('formFill', 
				'attemptLogin() end of autoInsert:\n'
				+ 'pwdFilled: ' + pwdFilled + '\n'
				+ 'usrFilled: ' + usrFilled);
				
		} // auto insert
			
		// Prepare context menu with all necessary information, including existing and target field name
		if (!pwdFilled)
			prepareContextMenu(browserWin, 'insertPassword', pwd, passwordField, foundLoginInfo);
		if (!usrFilled)
			prepareContextMenu(browserWin, 'insertUser', user, usernameField, foundLoginInfo);
		if (!pwdFilled || !usrFilled)
			prepareContextMenu(browserWin, 'cancelLogin', 'cancel');
				
		let msgId = 'loginPrepared.manual';
		if (pwdFilled && usrFilled) {
			msgId = 'loginPrepared.insertAll';
		}
		else {
			if (usrFilled)
				msgId = 'loginPrepared.insertUser';
			else if (pwdFilled)
				msgId = 'loginPrepared.insertPassword';
		}
		
		// never show message if autofill was successful!
		// Right-click the User and Password boxes to insert the Information automatically. This operation is extra secure as it does not use the Clipboard at all.
		if (!pwdFilled && !usrFilled && prefs.isLoginMsg) {
			let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService),  
			    dontShowAgain = util.getBundleString("dontShowAgain", "Do not show this message again."),
			    check = {value: false},   // default the checkbox to true  
			    title = util.getBundleString("copyMessageTitle", "QuickPasswords"),
			    msg = QuickPasswords.Bundle.GetStringFromName('loginPrompt'), 
			    result = prompts.alertCheck(null, title, msg, dontShowAgain, check);
			if (check.value==true) {
				prefs.setBoolPref("loginMsg", false);
			}
		}
		
		// close the window
		if (prefs.isAutoCloseOnLogin || isRepairMode)
			this.closePasswordManager();

		let Message = QuickPasswords.Bundle.GetStringFromName(msgId),
		    notifyBox = util.NotificationBox;
		// just display a transient box in most cases. If there is no notifyBox available (SeaMonkey) we also use this function (but it disaplys an alert)
		if (!isRepairMode || (isRepairMode && !notifyBox)) {
			util.logDebugOptional('formFill', 'popup alert:\n' + Message);
			setTimeout(function() { util.slideAlert('QuickPasswords', Message); }, 0);
		}

		// In repair Mode, show a permanent sliding notification
		if (isRepairMode && notifyBox){  
		  let notificationId = "quickpasswords-changeprompt.repairFields", 
			    item = notifyBox.getNotificationWithValue(notificationId);
			if(item) {
				notifyBox.removeNotification(item);
			}
			if (this.repairLoginTitle) {
			  Message = this.repairLoginTitle + ": " + Message;
			}
			let btnCancel = util.getBundleString("loginPrepared.updateIdPrompt.Cancel", "Cancel"),
			    nbox_buttons = [
				{
					label: btnCancel,
					accessKey: btnCancel.substr(0,1), 
					callback: function() { QuickPasswords.onMenuItemCommand(null,'cancelLogin'); },
					popup: null
				}				
			];			
			notifyBox.appendNotification( Message, 
						notificationId, 
						"chrome://quickpasswords/skin/repair-notification.png" , 
						notifyBox.PRIORITY_INFO_HIGH, 
						nbox_buttons);
		}
	},
	
	onMenuItemCommand: function onMenuItemCommand(e, cmd, clickTarget) {
		let prefs = QuickPasswords.Preferences,
        prepareContextMenu = QuickPasswords.prepareContextMenu,
        util = QuickPasswords.Util,
        filter,
		    menuItem = e ? e.target : null,
        removeCancel = false,
        el,
		    parentMenu = e ? e.explicitOriginalTarget.parentNode : null;

		if (!cmd)
			cmd='passwordManager';
		let browserWin = QuickPasswords.getCurrentBrowserWindow (e);

		switch (cmd) {
			case 'passwordManager':
				// reset + collapse menu contents if there are any left from last time.
				// this can also be used by users to clear out the password / user info from the context menu.
				// make sure to add a listener later that resets it as soon as the originating page URI is replaced
				// however, we shall still allow inserting User/password on another tab!
				// there is no instantiation per tab, its global to the browser
				prepareContextMenu(browserWin, 'insertUser', '');
				prepareContextMenu(browserWin, 'insertPassword', '');
				prepareContextMenu(browserWin, 'cancelLogin', '');

				// reset last location and determine it fresh
				prefs.setLastLocation('');

				switch (util.Application) {
					case 'Postbox':     // fall through
					case 'Thunderbird': // try to use folder mail account name or email sender as filter?
						filter = this.getActiveUri(false, true);
						break;
					case 'Firefox': // use current address bar address, if in
						filter = this.getURIcontext('');
						break;
					case 'SeaMonkey':
						// we need to find out whether I am called from the messenger window or from navigator!
						try { filter = this.getURIcontext(''); }
						catch(er) { filter = ''; }
						break;
				}
				this.showLogins(filter);
				break;

			case 'cancelLogin': // reset the context menu items
				prepareContextMenu(browserWin, 'insertUser', '');
				prepareContextMenu(browserWin, 'insertPassword', '');
				prepareContextMenu(browserWin, 'cancelLogin', '');
				break;

			default:
				let pMenu = QuickPasswords.getContextMenu(browserWin, 'insertPassword'),
				    uMenu = QuickPasswords.getContextMenu(browserWin, 'insertUser'),
				    cMenu = QuickPasswords.getContextMenu(browserWin, 'cancelLogin'),
				    managerWin = QuickPasswords.PasswordManagerWindow;
				if (managerWin && (!managerWin.document.getElementById("signonsTree") || managerWin.closed)) { //stale info?
					managerWin = null;
					QuickPasswords._PasswordManagerWindow = null; // should do this on pwd manager close!!
				}

				// get password / username from selected row in Password Manager
				// this has precedence over a previously selected login that might
				// still be stored in the context menu item...
				if (managerWin) {
					let tree = managerWin.document.getElementById("signonsTree");
					if (tree.currentIndex<0) {
						let msg = QuickPasswords.Bundle.GetStringFromName('selectExactlyOneEntry');
						alert (msg);
						return;
					}
					removeCancel = false;
					el = null;
					// remove repair instruction before pasting
					if (cmd.indexOf('paste') == 0) {
						let notifyBox = util.NotificationBox;
						if (notifyBox) {
						  let notificationKey = "quickpasswords-changeprompt.repairFields",
							    item = notifyBox.getNotificationWithValue(notificationKey);
							if(item) { notifyBox.removeNotification(item); }
						}
					}
					switch(cmd) {
						case 'pasteUser':
							// get User from highlighted location and insert it into current textbox (without using clipboard)
							let user = QuickPasswords.getUser(tree.currentIndex, tree);
							clickTarget.value = user;
							// if both password and user are empty, remove the cancel item!
							if (pMenu.collapsed) {
								removeCancel = true;
								el = pMenu;
							}
							break;

						case 'pastePassword':
							el = browserWin.document.getElementById('context-quickPasswords-pasteUser')
							// get Password from highlighted location and insert it into current textbox (without using clipboard)
							let pwd = QuickPasswords.getPassword(tree.currentIndex, tree);
							clickTarget.value = pwd;
							// if both password and user are empty, remove the cancel item!
							if (uMenu.collapsed) {
								removeCancel = true;
								el = uMenu;
							}
							break;
					}


				}
				else {
					if (menuItem) {
						switch(cmd) {
							case 'pasteUser':
								if (pMenu.collapsed) {
									removeCancel = true;
									el = pMenu;
								}
								clickTarget.value = menuItem.quickPasswordsData;
								
								// check if id has changed:
								if (prefs.isUpdateFieldIds
								    &&
										menuItem.quickPasswords_FormId != util.getIdentifier(clickTarget)) {
									util.notifyUpdateId (menuItem.quickPasswords_FormId, util.getIdentifier(clickTarget), 'user', menuItem.quickPasswordsData, menuItem.quickPasswords_loginInfo);
								}
								
								break;
							case 'pastePassword':
								// if both password and user are empty, remove the cancel item!
								if (uMenu.collapsed) {
									removeCancel = true;
									el = uMenu;
								}
								clickTarget.value = menuItem.quickPasswordsData;
								
								// check if id has changed:
								if (prefs.isUpdateFieldIds
								    &&
										menuItem.quickPasswords_FormId != util.getIdentifier(clickTarget)) {
									util.notifyUpdateId (menuItem.quickPasswords_FormId, util.getIdentifier(clickTarget), 'password', null, menuItem.quickPasswords_loginInfo);
								}
								break;
						}
					}
				}
				// reset & hide insert menu item
				if (menuItem
					&&
					(cmd =='pasteUser' || cmd == 'pastePassword')
					)
				{
					menuItem.collapsed = true;
					menuItem.quickPasswordsData = '';
				}
				if (removeCancel) {
					cMenu.collapsed = true;
					cMenu.quickPasswordsData = '';
				}
				break;
		} // end switch.

		// if (this.strings==null) this.onLoad();
		/*promptService.alert(window, this.strings.getString("helloMessageTitle"),
									this.strings.getString("helloMessage")); */
	},

// 	onContextMenuCommand: function(e) {
// 		promptService.alert(window,"test","onContextMenuCommand...");
// 		this.showLogins('test.com'); // filter string from id of right click item! or from current domain?
// 	},

	onToolbarButtonCommand: function onToolbarButtonCommand(e) {
		QuickPasswords.onMenuItemCommand(e);
	},

	onLoadChangePassword: function onLoadChangePassword() {
		QuickPasswords.Util.onLoadVersionInfoDialog();
		if (window.arguments && window.arguments[0].inn) {
			//get site and domain and open the window
			document.getElementById('qp-Site').value = window.arguments[0].inn.site;
			document.getElementById('qp-User').value = window.arguments[0].inn.user;
			document.getElementById('qp-hdnPassword').value = window.arguments[0].inn.password;
			document.getElementById('txtOldPassword').value = window.arguments[0].inn.password;
		}
	},

	processSelectedPassword: function processSelectedPassword(srvLoginManager, v, oldPassword, newPassword, selectedUsers, modified) {
    const Cc = Components.classes,
          Ci = Components.interfaces;
		function displayLoginInfo(items) {
			let str = '';
			for (let i=0; i<items.length; i++) {
				str = str
					+ '[' + i + ']\n'
					+ 'formSubmitURL: '+ items[i].formSubmitURL + '\n'
					+ 'hostname:      '+ items[i].hostname + '\n'
					+ 'password:      '+ '*********' + '\n'
					+ 'passwordField: '+ items[i].passwordField + '\n'
					+ 'username:      '+ items[i].username + '\n'
					+ 'usernameField: '+ items[i].usernameField;
				if (items[i].httpRealm)
					str = str +  'httpRealm:     '+ items[i].httpRealm + '\n';

			}
			return str;
		}
		
    let resultsArray = [],
        util = QuickPasswords.Util;
    // create a new wrapper for passing back login and modified clone

//		from docs for nsILoginManager:
// 		void searchLogins(
// 			out unsigned long count,
// 			in nsIPropertyBag matchData,
// 			[retval, array, size_is(count)] out nsILoginInfo logins
// 		);
		let nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
		                              Ci.nsILoginInfo,
		                              "init"),
		    site = QuickPasswords.getSite(v),
		    user = QuickPasswords.getUser(v);
    if (selectedUsers.indexOf(user)<0)
      return null;
		let encryptedUser = '', 
        encryptedPassword = '';

// 		// try this one...
// 		// see https://developer.mozilla.org/en/XPCOM_Interface_Reference/Using_nsILoginManager
// 		// also: http://pastebin.mozilla.org/1387854
// 		srvLoginManager.findLogins({}, hostname, formSubmitURL, httprealm);

		const nsPropertyBag = Components.Constructor('@mozilla.org/hash-property-bag;1', 'nsIWritablePropertyBag');
		let bag = nsPropertyBag();

		// add some properties to the bag - to filter out the correct credentials
		bag.setProperty('hostname', site);
		// bag.setProperty('username', user); // test => Error: NS_ERROR_XPC_JS_THREW_STRING: Unexpected field: username'Unexpected field: username' when calling method: [nsILoginManagerStorage::searchLogins]
    
    let cryptoService = Cc["@mozilla.org/login-manager/crypto/SDR;1"].getService(Ci.nsILoginManagerCrypto);																	
		if (cryptoService) {
			encryptedUser = cryptoService.encrypt(user);
			// unfortunately, we do not get any matches if we include these fields in the search
			//encryptedPassword = cryptoService.encrypt(oldPassword);
			//bag.setProperty('encryptedUsername', encryptedUser);  // no matching entries are returned
			// bag.setProperty('encryptedPassword', encryptedPassword);
		}
// other Attributes:
// 		formSubmitURL, hostname, httpRealm, password, passwordField,  username,  usernameField


		//  out arguments must be objects.
		// = new Object();
		let count = new Object();
		// this will create an array of nsLoginInfo(s)
		let matches  = srvLoginManager.searchLogins(count, bag);

		// count should be 1 to be unique!!
		if (count && count.value) {
			util.logDebugOptional('changePasswords.detail', 'Found ' + count.value + ' match(es):');
			let foundMatch = false
			for (let i=0; i<matches.length; i++) { // was matches.length, but I only do the first one! TO DO later ( matches should be unique as we match usr, pwd + hostname
				if (matches[i].username == user
				    &&
				    matches[i].password == oldPassword)
				{
					util.logDebugOptional('changePasswords.detail', (modified+1).toString() + '. Changing Login: ' + displayLoginInfo(matches));
          let resultLogin = {
            oldPwd: oldPassword,
            newPwd: newPassword,
            matchedLogin: matches[i],
            newLogin: matches[i].clone()
          };
          
					/*******************************/
					/*  MODIFIES THE PASSWORD!!    */
					/*******************************/
					resultLogin.newLogin.password = newPassword;
					foundMatch = true;
          modified ++;
          resultsArray.push(resultLogin);
					// overwrite with new Password
					// after changes in code code - this refreshes the password list, 
					// so it is not save to call within a loop from the password
					// tree selection! => need to defer the call!
					// => call from outside: srvLoginManager.modifyLogin(resultLogin.matchedLogin, resultLogin.newLogin);
				}
				else {
				  let mismatchReason = '';
					if (matches[i].password != oldPassword)
						mismatchReason += '\nOld Password mismatched';
					if (matches[i].username != user)
						mismatchReason += '\nUser Name {' + matches[i].username + '} doesn\'t  match.';
					util.logToConsole('Could not modify login for site: ' + site + mismatchReason);
				}
			}
			if(!foundMatch) {
				util.logToConsole('No match found for site: ' + site + mismatchReason);
				return null;
			}
		}
		else {		
		  return null;  // no matchy!
		}

		return resultsArray;
	} ,

	// setting up a message listener to wait for a password for bulk change;
	// as I need to call the tree traversing code from the PasswordManager context
	receiveCommand: function receiveCommand(event) {
		QuickPasswords.Util.logDebugOptional("changePasswords.postMessage", 'received a message!\n'
			+ 'cmd:' + event.data.cmd + '\n '
			+ 'pwd:' + event.data.pwd.replace(new RegExp('.', 'g'),'*') + '\n'
			+ 'origin: ' + event.origin );
		try {
			switch(event.data.cmd) {
				case 'selectByPassword':
					let filter = event.data.pwd;
					QuickPasswords.selectByPassword(filter);
					break;
				case 'changeBulkPasswords':
					QuickPasswords.modifyPasswords_Staging(event);
					break;
				case 'changePasswordsComplete':
				  QuickPasswords.modifyPasswords_Complete(event);
				  break;
				default:
					alert('received an invalid message!\n data:'
						+ event.data + '\norigin: '
						+ event.origin );
					break;
			}
		}
		catch(ex) {
      QuickPasswords.Util.logException("receiveCommand()", ex);
			alert(ex);
		}
	} ,

  throbber: function throbber(toggle, win) {
		let doc = win ? win.document : document,
        throbber = document.getElementById('quickPasswordsThrobber'), 
		    signonsTree = QuickPasswords.signonsTree;
    if (throbber)
      throbber.hidden = !toggle;
		if (signonsTree)
			signonsTree.disabled = toggle;
		throbber.getBoundingClientRect(); // make layouted.
		signonsTree.getBoundingClientRect(); // make layouted.
		/* Resolve all promises before we continue; only necessary when we start the spinner.
		 * was called spinEventLoop
		 */
		// Thunderbird 57 generated SyntaxError: yield is a reserved identifier[Learn More]
		// if (toggle) yield Promise.resolve();
  } ,
  
  modifyPasswords_Staging: function modifyPasswords_Staging(event) {
		const util = QuickPasswords.Util;
		try {
			// match password
			let filterOldPassword = event.data.pwd,
			    bMatch = true,
			    newPassword = event.data.newPwd,
          selectedUser = event.data.usr; // add for better validation

			// change password window: this is where we get this event from
			let changePasswordWindow = QuickPasswords.getOpenWindow("dlg:QuickPasswords_Change");
			QuickPasswords.promptParentWindow = changePasswordWindow ? changePasswordWindow : window;
			
			// iterate selection and make sure all passwords match
			let tree = QuickPasswords.signonsTree,
			    selection = tree.view.selection,
          user, site, pwd,
			    iPasswordsSelected = 0,
			    start = new Object(),
			    end = new Object(),
			    numRanges = selection.getRangeCount(),
			    sSites = "",
          loginsToChange = [], // new interface
					regTest = new RegExp("\w*\\" + selectedUser); 

			for (let t = 0; t < numRanges; t++) {
				selection.getRangeAt(t,start,end);
				for (let v = start.value; v <= end.value; v++){
					iPasswordsSelected++;
					pwd = QuickPasswords.getPassword(v);
					if (filterOldPassword != pwd) {
						bMatch = false;
            break;
          }
          user = QuickPasswords.getUser(v);
          if (selectedUser == user || regTest.test(user)) {
            let theSite = QuickPasswords.getSite(v);
            sSites = sSites + ', ' + theSite;
            loginsToChange.push( {user: user, site: theSite} );
          }
				}
			}
			
			if (!bMatch) {
				QuickPasswords.promptParentWindow.alert(QuickPasswords.Bundle.GetStringFromName("wrongPasswordMessage"));
				return;
			}

			// change passwords
			// QuickPasswords.signonsTree = signonsTree;
      /***** STAGING *******/
			let parentWindow = util.isMac ?
				 QuickPasswords.getCurrentBrowserWindow() :
				 window;         
			// window name (2nd parameter) really has no function, do not confuse with windowtype!
			let params =
			{
				inn:
				{	user: selectedUser,
					// password:newPassword,
					instance: QuickPasswords,
					newPassword: newPassword,
					oldPassword: filterOldPassword,
					logins: loginsToChange
				},
				out: {}  // let's pass an empty object
			};  
			// open new window for prompting which logins can be changed
			parentWindow.openDialog('chrome://quickpasswords/content/userMatch.xul',
							'quickpasswords-userMatch',
							'chrome,titlebar,resizable,dependent,alwaysRaised,top=' + window.screenY.toString() + ',left=' + (window.screenX + window.outerWidth).toString(),
							params).focus();
			changePasswordWindow.close();     
			/**** END NEW UI  ***/ 
			return;
		}
		catch(ex) {
      util.logException("modifyPasswords_Staging()", ex);
			alert(ex);
		}
	} ,
	
	modifyPasswords_Complete: function modifyPasswords_Complete(event) {
		const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences;
		let _loadSignons = null;  
		try {
			let info = event.data,
			    oldPassword = info.pwd, 
			    newPassword = info.newPwd, 
					selectedUsers = info.users;
			if (!info) throw('event missing info data block');
			if (!oldPassword) throw('Missing old Password');
			if (!newPassword) throw('Missing new Password');
			if (!selectedUsers) throw('Missing selected Users Array');
			// *************************************************************************
			// let's overwrite the global LoadSignons function while we do our changes,
			// because signonReloadDisplay.observer will call it on every modified login
			// => big speed penalty!
			// see mozilla/toolkit/components/passwordmgr/content/passwordManager.js
			if (typeof LoadSignons !=='undefined') {
				_loadSignons = LoadSignons;
				LoadSignons = function() { ; }  // do nothing because of the speed penalty involved
			}
			
			QuickPasswords.throbber(true);
			// let's do this asynchronous to give time for throbber to appear:
			let passwordWindow = window;
			
			passwordWindow.setTimeout(function() {
				const srvLoginManager =
					Components.classes["@mozilla.org/login-manager;1"]
						.getService(Components.interfaces.nsILoginManager);
				let logins = [], // build an array of logins to defer processing...
				    selection = QuickPasswords.signonsTree.view.selection,
						iPasswordsSelected = 0,
						start = new Object(),
						end = new Object(),
						numRanges = selection.getRangeCount(),
				    countQueued = 0,
						countModifications = 0;
				
				util.logDebugOptional("changePasswords", "Gathering logins...");
				for (let t = numRanges-1; t >= 0; t--) {
					selection.getRangeAt(t,start,end);
					if (start.value != null) {
						for (let v = start.value; v <= end.value; v++) {
							iPasswordsSelected++;
							let arr = QuickPasswords.processSelectedPassword (srvLoginManager, v, oldPassword, newPassword, selectedUsers, countQueued);
              if (arr && arr.length) {
                for (let ll=0; ll<arr.length; ll++) {
                  // only push on match!
                  let lg = arr[ll];
                  if (lg && lg.matchedLogin) {
                    logins.push(lg);
                    countQueued++;
                  }
                }
              }
						}
					}
					else {
						util.logWarning("Invalid Range:\n"
							+ "range index=" + t + "\n"
							+ "start.value=" + start.value + "\n"
							+ "end.value=" + end.value, 
							"QuickPasswords.receiveCommand(" + event.data.cmd + ")");
					}
				}

				// the modificiation can take a long time if MANY logins are selected!
				util.logDebugOptional("changePasswords", "Modifying logins: Prepared " + countQueued + " logins from " + numRanges + " selected ranges.");
        let nonMatches = '';
        while (logins.length) {
          let lg = logins.pop();
          try {
            srvLoginManager.modifyLogin(lg.matchedLogin, lg.newLogin);
            countModifications++;
          }
          catch (ex) {
            if (!nonMatches) {
              nonMatches = 'Some Changes failed:';
            }
            nonMatches += '\n';
            nonMatches += ex.message;
            nonMatches += '\nUser = ' + lg.matchedLogin.username;
            nonMatches += '  hostname = ' + lg.matchedLogin.hostname;
          }
				}
        if (nonMatches)
          util.logToConsole(nonMatches);
				
				util.logDebugOptional("changePasswords", "Modifying logins complete. Changed " + countModifications + " logins.");
				let msg = util.stringFormat(
						QuickPasswords.Bundle.GetStringFromName('successChangePasswordsMessage'), 
						  countModifications);
				util.alert(msg);
        QuickPasswords.throbber(false);
				
				// restore the function  so refreshes can happen again - restore with local variable
				if (typeof LoadSignons !=='undefined') {
					LoadSignons = _loadSignons;
				}

				
				// *************************************************************************

				// Clear the Tree Display
				passwordWindow.self.SignonClearFilter();
				let theFilter = document.getElementById('filter').value;
				passwordWindow.self.setFilter(theFilter);

				if (countQueued>0) {
					//close the change Passwords dialog!
					if (changePasswordWindow)
						changePasswordWindow.close();
				}
			} , 100);  //end of setTimeout
		}
		catch(ex) {
			// restore function in global (window) scope
			if (typeof LoadSignons !=='undefined' && _loadSignons) 
				LoadSignons = _loadSignons;
      util.logException("modifyPassword_Complete()", ex);
			util.alert(ex);
			QuickPasswords.throbber(false);
		}
		finally {
			;  // check if LoadSignons is defined? If not close password managerr window to be safe?
		}
	} ,

	displayChangePassword: function displayChangePassword(that) {
		const util = QuickPasswords.Util;
		try {
			let tree = QuickPasswords.signonsTree,
			    tI = tree.currentIndex,
          theSite = QuickPasswords.getSite(tI);

			if (tree.view.selection.count==0 || ''==theSite)
				alert(QuickPasswords.Bundle.GetStringFromName("selectOneMessage"));
			else {
				if (!QuickPasswords.Manager.loginMaster(true))
					return;
				let params =
				{
					inn:
					{	site: theSite,
						user: QuickPasswords.getUser(tI),
						password: QuickPasswords.getPassword(tI),
						instance: QuickPasswords
					},
					out:null
				};
				window.addEventListener("message", this.receiveCommand, false);

        //  [Bug 25750] Macs misbehave!
        let parentWindow = util.isMac ?
           QuickPasswords.getCurrentBrowserWindow() :
           window;         
				// window name (2nd parameter) really has no function, do not confuse with windowtype!
				parentWindow.openDialog(
          'chrome://quickpasswords/content/changePassword.xul',
					'quickpasswords-editPassword',
					'chrome,titlebar,resizable,dependent,alwaysRaised,top=' + window.screenY.toString() + ',left=' + (window.screenX + window.outerWidth).toString(),
					params).focus();
			}
		}
		catch(ex) { 
      util.logException("displayChangePassword()", ex);
      util.alert(ex); 
    }
	},

	selectByPassword : function selectByPassword(thePassword) {
		// get tree from PasswordManager window
		let tree = QuickPasswords.signonsTree;
		tree.selectedIndex = tree.currentIndex; // only select one item!

		let selection = tree.view.selection;
		selection.clearSelection();

		let view = tree.view.QueryInterface(Components.interfaces.nsITreeView);

		for (let i=0; i<tree.view.rowCount;i++) {
			if (this.getManagerColumn (i, 'passwordCol') == thePassword) {
				selection.toggleSelect(i);
			}
		}
	},	

	onAcceptChangePasswords: function onAcceptChangePasswords(pwdElement) {
    const util = QuickPasswords.Util;
		if (document.getElementById('txtNewPassword').value=='') {
			util.alert(QuickPasswords.Bundle.GetStringFromName('enterNewPasswordsPrompt'));
			return false;
		}
		if (document.getElementById('txtNewPassword').value!=document.getElementById('txtNewPassword2').value) {
			util.alert(QuickPasswords.Bundle.GetStringFromName('newPasswordsDontMatch'));
			return false;
		}

		let info = {
			'cmd':'changeBulkPasswords',
			'pwd':pwdElement.value,
			'newPwd':document.getElementById('txtNewPassword').value,
      'usr': document.getElementById('qp-User').value
			};
      
    //  [Bug 25750] Macs misbehave!
    let targetWindow = util.isMac ?
       QuickPasswords.getOpenWindow("chrome://passwordmgr/content/passwordManager.xul") :
       window.opener;         
		// second parameter for postMessage is probably completely random!
		targetWindow.postMessage(info, "*"); // TARGET: chrome://passwordmgr SOURCE://chrome://quickpasswords
		return false;
	}


};