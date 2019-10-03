"use strict";

Components.utils.import('resource://gre/modules/Services.jsm');

var QuickPasswords_TabURIregexp = {
	get _thunderbirdRegExp() {
		delete this._thunderbirdRegExp;
		return this._thunderbirdRegExp = new RegExp("^http://quickpasswords.mozdev.org/");
	}
};

// open the new content tab for displaying support info, see
// https://developer.mozilla.org/en/Thunderbird/Content_Tabs
var QuickPasswords_TabURIopener = {
	
	openURLInTab: function (URL) {
		const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences,
					Ci = Components.interfaces,
					Cc = Components.classes;
		try {
			let sTabMode="",
			    wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator),
			    mainWindow = wm.getMostRecentWindow("navigator:browser");
			if (mainWindow) {
				// Firefox:
				if (!util.findTab(URL))
				  mainWindow.gBrowser.selectedTab = mainWindow.gBrowser.addTab(URL);
				mainWindow.focus();
				return true;
			}

			let tabmail = document.getElementById("tabmail");
			if (!tabmail) {
				// Try opening new tabs in an existing 3pane window
				let mail3PaneWindow = wm.getMostRecentWindow("mail:3pane");
				if (mail3PaneWindow) {
					tabmail = mail3PaneWindow.document.getElementById("tabmail");
					mail3PaneWindow.focus();
				}
			}
			if (prefs.isDebug) debugger;
			if (tabmail) {
				if (!util.findMailTab(tabmail, URL)) {
				sTabMode = (util.Application == "Thunderbird" && util.AppVersion >= 3) ? "contentTab" : "3pane";
				tabmail.openTab(sTabMode,
					{contentPage: URL, clickHandler: "specialTabs.siteClickHandler(event, QuickPasswords_TabURIregexp._thunderbirdRegExp);"});
				}
			}
			else
				window.openDialog("chrome://messenger/content/", "_blank",
								  "chrome,dialog=no,all", null,
			  { tabType: "contentTab",
			   tabParams: {contentPage: URL,
			              clickHandler: "specialTabs.siteClickHandler(event, QuickPasswords_TabURIregexp._thunderbirdRegExp);", id:"QuickPasswords_Weblink"}
			  } );
		}
		catch(e) {
			util.logException("openURLInTab(" + URL + ")", e);
			return false;
		}
		return true;
	}
};

// if (QuickPasswords.Util.Application !== 'Postbox') {
  // Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
// }

QuickPasswords.Util = {
	QuickPasswords_CURRENTVERSION : '3.10', // just a fallback value
	get AddonId() {
		return "QuickPasswords@axelg.com";
	},
	ConsoleService: null,
	name: 'QuickPasswords.Util',
	mAppver: null,
	mAppName: null,
	mPlatformVer: null,
	mHost: null,
	lastTime: 0,
	mExtensionVer: null,
	VersionProxyRunning: false,
  get isMac() {
    // https://developer.mozilla.org/en-US/docs/OS_TARGET
    let xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                 .getService(Components.interfaces.nsIXULRuntime);  
    return (xulRuntime.OS.indexOf('Darwin')>=0);
  } ,
  get isLinux() {
    // https://developer.mozilla.org/en-US/docs/OS_TARGET
    let xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                 .getService(Components.interfaces.nsIXULRuntime);  
    return (xulRuntime.OS.indexOf('Linux')>=0);
  } ,
  
  get MainWindow() {
    let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                 .getService(Components.interfaces.nsIWindowMediator);
    let mainWindow = wm.getMostRecentWindow("navigator:browser");
    if (mainWindow) {
      return mainWindow;
    }  
    let mail3PaneWindow = wm.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow) {
      return mail3PaneWindow;
    }
    return null;
  } ,

  $: function(id) {
      return document.getElementById(id);
  } ,

  getAddon: function getAddon(aId) {
    let em = Components.classes["@mozilla.org/extensions/manager;1"]
                .getService(Components.interfaces.nsIExtensionManager);
    return em.getItemForID(aId);
  } ,

	VersionProxy: function VersionProxy() {
		const util = QuickPasswords.Util,
		      Cu = Components.utils;
		try {
			if(this.mExtensionVer)
				return; // early exit, we got the version!
			if (util.VersionProxyRunning)
				return; // do not allow recursion...
			util.VersionProxyRunning = true;
			util.logDebugOptional("firstRun", "Util.VersionProxy() started.");
			setTimeout (function () {
				const util = QuickPasswords.Util;
				if (Cu.import) {
					Cu.import("resource://gre/modules/AddonManager.jsm");

					AddonManager.getAddonByID(util.AddonId, function(addon) {
						let u = util;
						u.mExtensionVer = addon.version;
						u.logDebugOptional("default", "================================================\n" +
						           "================================================");
						u.logDebugOptional("default", "AddonManager: QuickPasswords extension's version is " + addon.version);
						u.logDebugOptional("default", "QuickPasswords.VersionProxy() - DETECTED QuickPasswords Version " + u.mExtensionVer + "\n" + "Running on " + u.Application	 + " Version " + u.AppVersionFull);
						u.logDebugOptional("default", "================================================\n" +
						           "================================================");
						let wd=window.document;
						if (wd) {
							let elVersion = wd.getElementById("qp-version-field");
							if (elVersion)
								elVersion.setAttribute("value", addon.version);
						}

					});
				}
			},0);

			util.logDebugOptional("firstRun", "AddonManager.getAddonByID .. added callback for setting extensionVer.");

		}
		catch(ex) {
			util.logException("QuickPasswords VersionProxy failed - are you using an old version of " + util.Application + "?" , ex);
		}
		finally {
			util.VersionProxyRunning=false;
		}

	},

	get Version() {
		const util = QuickPasswords.Util,
					Ci = Components.interfaces,
		      Cc = Components.classes;
		//returns the current extension version number.
		let bAddonManager = false,
		    current = null;
		if (util.mExtensionVer)
			return util.mExtensionVer;
		if (!Cc["@mozilla.org/extensions/manager;1"]) {
			util.VersionProxy(); // modern Mozilla builds.
											  // these will set mExtensionVer (eventually)
											  // also we will delay firstRun.init() until we _know_ the version number
			bAddonManager = true;
		}

		if (bAddonManager)
			current = util.QuickPasswords_CURRENTVERSION + "-AddonManagerVersionPending";
		else {
			current = util.QuickPasswords_CURRENTVERSION + "(?)";
			try {
				if(Cc["@mozilla.org/extensions/manager;1"])
				{
					let gExtensionManager = Cc["@mozilla.org/extensions/manager;1"]
						.getService(Ci.nsIExtensionManager);
					current = gExtensionManager.getItemForID(util.AddonId).version;
					util.mExtensionVer = current; // legal version (pre Tb3.3)
				}
				else {
					current = util.QuickPasswords_CURRENTVERSION + "(?)"
				}
				util.mExtensionVer = current;

			}
			catch(ex) {
				current = util.QuickPasswords_CURRENTVERSION + "(?ex?)" // hardcoded, program this for Tb 3.3 later
				util.logException("QuickPasswords VersionProxy failed - are you using an old version of " + util.Application + "?", ex);
			}
		}
		return current;
	} ,

	getTabInfoLength: function getTabInfoLength(tabmail) {
		if (tabmail.tabInfo)
		  return tabmail.tabInfo.length;
	  if (tabmail.tabOwners)
		  return tabmail.tabOwners.length;
		return null;
	} ,	
	
	getTabInfoByIndex: function getTabInfoByIndex(tabmail, idx) {
		if (tabmail.tabInfo)
			return tabmail.tabInfo[idx];
		if (tabmail.tabOwners)
		  return tabmail.tabOwners[idx];
		return null;
	} ,
	
	getBaseURI: function baseURI(URL) {
		let hashPos = URL.indexOf('#'),
				queryPos = URL.indexOf('?'),
				baseURL = URL;
				
		if (hashPos>0)
			baseURL = URL.substr(0, hashPos);
		else if (queryPos>0)
			baseURL = URL.substr(0, queryPos);
		if (baseURL.endsWith('/'))
			return baseURL.substr(0, baseURL.length-1); // match "x.com" with "x.com/"
		return baseURL;		
	} ,
	
  // find an activate a tab if the URL is already open
  findTab: function findTab(URL) {
		const Cc = Components.classes,
					Ci = Components.interfaces,
		      util = QuickPasswords.Util;
					
		let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator),
		    browserEnumerator = wm.getEnumerator("navigator:browser"),
		    found = false,
				baseURL = util.getBaseURI(URL);
		// more tolerant URL match; cutting off anchors / queryString for better re-using of tabs!
		
		try {
			while (!found && browserEnumerator.hasMoreElements()) {
				let browserWin = browserEnumerator.getNext(),
						tabbrowser = browserWin.gBrowser;

				// Check each tab of this browser instance
				let numTabs = tabbrowser.browsers.length;
				for (let index = 0; index < numTabs; index++) {
					let currentBrowser = tabbrowser.getBrowserAtIndex(index);
					
					if (baseURL == util.getBaseURI(currentBrowser.currentURI.spec)) {
						// The URL is already opened. Select this tab.
						tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];
						// Focus *this* browser-window
						browserWin.focus();
						// reload with querystring #xyz
						if (URL != currentBrowser.currentURI.spec)
							tabbrowser.loadURI(URL);
						found = true;
						break;
					}
				}				
			}
		}
		catch(ex) {
			// a problem occurred
			util.logException("findTab(" + URL + ")", ex);
		}
		return found;
	} ,
	
	findMailTab: function findMailTab(tabmail, URL) {
		const util = QuickPasswords.Util;
		// mail: tabmail.tabInfo[n].browser		
		let baseURL = util.getBaseURI(URL),
				numTabs = util.getTabInfoLength(tabmail);
		
		for (let i = 0; i < numTabs; i++) {
			let info = util.getTabInfoByIndex(tabmail, i);
			if (info.browser && info.browser.currentURI) {
				let tabUri = util.getBaseURI(info.browser.currentURI.spec);
				if (tabUri == baseURL) {
					tabmail.switchToTab(i);
					// focus on tabmail ?
					
					return true;
				}
			}
		}
		return false;
	} ,	
	
	onLoadVersionInfoDialog: function onLoadVersionInfoDialog() {
		const util = QuickPasswords.Util;
		if (window.arguments && window.arguments[0].inn)
		{
			util.mExtensionVer = window.arguments[0].inn.instance.Util.Version;
		}
		let version=util.Version; // local instance of
		let wd=window.document;
		if (version=="") version='version?';
		wd.getElementById("qp-version-field").setAttribute("value", version);
	} ,

	// dedicated function for email clients which don't support tabs
	// and for secured pages (donation page).
	openLinkInBrowserForced: function openLinkInBrowserForced(linkURI) {
		try {
			this.logDebugOptional("default", "openLinkInBrowserForced (" + linkURI + ")");
			if (QuickPasswords.Util.Application=='SeaMonkey') {
				let windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
				let browser = windowManager.getMostRecentWindow( "navigator:browser" );
				if (browser) {
					let URI = linkURI;
					setTimeout(function() { QuickPasswords_TabURIopener.openURLInTab(URI); }, 250);
				}
				else
					window.openDialog(getBrowserURL(), "_blank", "all,dialog=no", linkURI, null, 'QuickPasswords update');

				return;
			}
			let service = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
				.getService(Components.interfaces.nsIExternalProtocolService);
			let ioservice = Components.classes["@mozilla.org/network/io-service;1"].
						getService(Components.interfaces.nsIIOService);
			let uri = ioservice.newURI(linkURI, null, null);
			service.loadURI(uri);
		}
		catch(e) { this.logException("openLinkInBrowserForced (" + linkURI + ") ", e); }
	},

	// moved from options.js
	// use this to follow a href that did not trigger the browser to open (from a XUL file)
	openLinkInBrowser: function openLinkInBrowser(evt,linkURI) {
		const util = QuickPasswords.Util;
		if (util.AppVersion>=3 && util.Application=='Thunderbird') {
			let service = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
				.getService(Components.interfaces.nsIExternalProtocolService);
			let ioservice = Components.classes["@mozilla.org/network/io-service;1"].
						getService(Components.interfaces.nsIIOService);
			service.loadURI(ioservice.newURI(linkURI, null, null));
			if(null!=evt)
				evt.stopPropagation();
		}
		else
			this.openLinkInBrowserForced(linkURI);
	},

	// moved from options.js (then called
	openURL: function openURL(evt,URL) { // workaround for a bug in TB3 that causes href's not be followed anymore.
		const util = QuickPasswords.Util;
		let ioservice,iuri,eps;

		if (util.AppVersion<3 && util.Application=='Thunderbird'
			|| util.Application=='SeaMonkey'
			|| util.Application=='Postbox')
		{
			this.openLinkInBrowserForced(URL);
			if(null!=evt) evt.stopPropagation();
		}
		else {
			if (QuickPasswords_TabURIopener.openURLInTab(URL) && null!=evt) {
				evt.preventDefault();
				evt.stopPropagation();
			}
		}
	},
	
	getVersionSimple: function getVersionSimple(ver) {
	  let pureVersion = ver;  // default to returning unchanged
		// get first match starting with numbers mixed with . 	
		let reg = new RegExp("[0-9.]*");
		let results = ver.match(reg); 
		if (results) 
			pureVersion = results[0];
		return pureVersion;
	},

	slideAlert: function slideAlert(title, text) {
	  try {
	    Components.classes['@mozilla.org/alerts-service;1'].
	              getService(Components.interfaces.nsIAlertsService).
	              showAlertNotification("chrome://quickpasswords/skin/quickpasswords-Icon.png", title, text, false, '', null);
	  } catch(e) {
	    // prevents runtime error on platforms that don't implement nsIAlertsService
	  }
	} ,
  
  alert: function alert(msg, caption) {
    caption = caption ? caption : "QuickPasswords";
    Services.prompt.alert(null, caption, msg); // implements nsIPromptService
  } ,
	
  confirm: function confirm(msg, caption) {
    caption = caption ? caption : "QuickPasswords";
    return Services.prompt.confirm(null, caption, msg); // implements nsIPromptService
  } ,
	
	// this will confirm AND store the checkbox value back to the pref (e.g. "don't remind me again")
	confirmCheck: function confirmCheck(msg, checkBoxPrefKey, checkBoxLocaleKey, checkBoxDefaultString) {
		const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences;
		try {
			let checkBoxLabel = util.getBundleString(checkBoxLocaleKey, checkBoxDefaultString),
					check = {value: prefs.getBoolPref(checkBoxPrefKey)},
					result = Services.prompt.confirmCheck (
										 null, 
										 "QuickPasswords", 
										 msg, 
										 checkBoxLabel,
										 check);
										 
			prefs.setBoolPref(checkBoxPrefKey, check.value);
			return result;
		}
		catch(ex) {
			util.logException("Cancelling operation - util.confirmCheck failed asking\n'" + msg + "'.", ex);
			return false;
		}
	} ,
  
	get ToolbarName() {
		switch (this.Application) {
			case 'Thunderbird':
				return 'mail-bar3';
			case 'Firefox':
				return 'nav-bar';
			case 'Postbox': // not supported yet
				return 'mail-bar7';
			case 'SeaMonkey': // not supported yet
				return 'nav-bar';
		}
	},
	
	checkfirstRun: function checkfirstRun() {
		const util = QuickPasswords.Util,
					prefs = QuickPasswords.Preferences,		
		      Cc = Components.classes,
          Ci = Components.interfaces,
          svc = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService),
		      ssPrefs = svc.getBranch(prefs.ExtensionBranch);
		util.logDebugOptional("default", "checkfirstRun");
		let prev = -1, firstRun = false,
		    debugfirstRun = false,
				current = util.Version;
		util.logDebugOptional("default", "Current QuickPasswords Version: " + current);
		try {
			util.logDebugOptional ("firstRun","try to get setting: getCharPref(version)");
			try {
				prev = ssPrefs.getCharPref("version");
			} catch (e) { 
			  prev = "?"; 
			} ;

			util.logDebugOptional ("firstRun","try to get setting: getBoolPref(firstRun)");
			try {
				firstRun = ssPrefs.getBoolPref("firstRun");
				if (firstRun) debugger;
			}
			catch (e) { 
			  firstRun = true; 
			}

			// enablefirstRuns=false - allows start pages to be turned off for partners
			util.logDebugOptional ("firstRun","try to get setting: getBoolPref(enablefirstRuns)");

			util.logDebugOptional ("firstRun", "Settings retrieved:"
					+ "\nprevious version=" + prev
					+ "\ncurrent version=" + current
					+ "\nfirstRun=" + firstRun
					+ "\ndebugfirstRun=" + debugfirstRun);

		}
		catch(e) {

			alert("QuickPasswords exception in quickpasswords_util.js: " + e.message
				+ "\n\ncurrent: " + current
				+ "\nprev: " + prev
				+ "\nfirstRun: " + firstRun
				+ "\ndebugfirstRun: " + debugfirstRun);

		}
		finally {
			util.logDebugOptional ("firstRun","finally - firstRun=" + firstRun);

			// AG if this is a pre-release, cut off everything from "pre" on... e.g. 1.9pre11 => 1.9
			let pureVersion = this.getVersionSimple(current)
			
			util.logDebugOptional ("firstRun","finally - pureVersion=" + pureVersion);
			// change this depending on the branch
			let versionPage = "http://quickpasswords.mozdev.org/version.html#" + pureVersion;
			util.logDebugOptional ("firstRun","finally - versionPage=" + versionPage);

			if (firstRun) {
				// installed quickPasswords for the first time...
				util.logDebugOptional ("firstRun","set firstRun=false and store version " + current);
				ssPrefs.setBoolPref("firstRun", false);
				ssPrefs.setCharPref("version", pureVersion); // store (simplified) current version! (cuts off pre, beta, alpha etc.)

				// Insert code for first run here
				// on very first run, we go to the index page - welcome blablabla
				util.logDebugOptional ("firstRun","setTimeout for content tab (index.html)");
				window.setTimeout(function() {
					                             util.openURL(null, "http://quickpasswords.mozdev.org/index.html");
					                           }, 1500); //Firefox 2 fix - or else tab will get closed (leave it in....)
                                     
        // add button automatically
        //   code by Leszek Zyczkowski
        let toolbar = document.getElementById(this.ToolbarName);
        if (!toolbar.currentSet.match('QuickPasswords-toolbar-button')) {
            let newset = toolbar.currentSet.concat(',QuickPasswords-toolbar-button');
            toolbar.currentSet = newset;
            toolbar.setAttribute('currentset', newset);
            document.persist(toolbar.id, "currentset");
        }
        this.service.setBoolPref('extensions.titlebarCleaner.firstRun', false);
                                     
			}
			else {
				// update or just new session?
				util.logDebugOptional ("firstRun","checkfirstRun: previous=" + prev + ", current = " + current);
				
				if (util.versionSmaller(prev, pureVersion)) { // VERSION UPDATE! 
					// upgrade case!! store new version number!
					ssPrefs.setCharPref("version", pureVersion);
					
					// version is different => upgrade (or conceivably downgrade)
          if (prefs.getBoolPref("update.showVersionPage")) {
            util.logDebugOptional ("firstRun","open tab for version history + browser for donation" + current);
            window.setTimeout(function(){
              // display version history
              util.openURL(null, versionPage);
            }, 1500); //Firefox 2 fix - or else tab will get closed
          }

					// prereleases never open the donation page!
          // no bugfix donation screen
					if (current.indexOf('pre')==-1 && pureVersion!='3.7.2') {
						window.setTimeout(function(){
							// display donation page (can be disabled; I will send out method to all donators and anyone who asks me for it)
							if ((prefs.getBoolPref("donateNoMore")) || (!prefs.getBoolPref('donations.askOnUpdate')))
								util.logDebugOptional ("firstRun","Jump to donations page disabled by user");
							else
								util.openURL(null, "http://quickpasswords.mozdev.org/donate.html"); // show donation page!
							}, 2200);
					}

				}
				else {
					util.logDebugOptional ("firstRun","prev!=current -> just a reload of same version - prev=" + prev + ", current = " + current);
				}
			}
		}
	} ,
	
	updateLogin: function updateLogin(login, insertType, newField) {
		const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences,
		      Cc = Components.classes,
					Ci = Components.interfaces;
		let test = insertType + ' field update - \nnew field name = ' + newField + '\n'
		  + 'RETRIEVED LOGIN INFORMATION\n'
			+ 'formSubmitURL =' + login.formSubmitURL + '\n'
			+ 'hostname =' + login.hostname + '\n'
			+ 'httpRealm =' + login.httpRealm + '\n'
			+ 'passwordField =' + login.passwordField + '\n'
			+ 'usernameField =' + login.usernameField + '\n'
			+ 'username =' + login.username;

		try {
			let newlogin = login.clone();
			if (prefs.isDebug && !util.confirm(test))
				return;
			switch(insertType) {
				case 'user':
					newlogin.usernameField = newField;
					break;
				case 'password':
					newlogin.passwordField = newField;
					break;
			}
			let loginManager = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
			loginManager.modifyLogin(login, newlogin);
		}
		catch(ex) {
			util.logException("updateLogin()", ex);
		}
	
	} ,
	
	get NotificationBox() {
		switch(this.Application) {
			case 'Firefox': 
				return QuickPasswords.getCurrentBrowserWindow().gBrowser.getNotificationBox();
			case 'Postbox':
				return window.document.getElementById ('pbSearchThresholdNotifcationBar');  // msgNotificationBar
			case 'Thunderbird': 
				return window.document.getElementById ('mail-notification-box');
			case 'SeaMonkey':
				return null;
		}	
		return null;
	} ,

	/**
	*
	* @Desc notifyUpdateId - update field name sliding notification. Makes it possible to correct (outdated?) form 
	 *      field names when clicking the Update field
	*
	* @param oldField     - id of old INPUT field
	* @param newField     - id of new INPUT field
	* @param insertType   - 'user' | 'password'
	* @param userName     - the user name to display in the notification message
	* @param oldLoginInfo - the structure containing all stored pwd info including field names, contents and hostname / formSubmitURL
	*
	* @return void
	**/
	notifyUpdateId: function notifyUpdateId(oldField, newField, insertType, userName, oldLoginInfo) {
		const util = QuickPasswords.Util,
		      Cc = Components.classes;
		try {
		  if (!oldLoginInfo)
				return; // no update possible!
			let notifyBox = this.NotificationBox,
					// prepare all Strings
          theText = util.getBundleString("loginPrepared.updateIdPrompt",
						"Update the {1} field name in login manager?\n" 
						+ "QuickPasswords searched for a field '{0}', but the field you selected to insert is '{2}'."),
          theText2 = util.getBundleString("loginPrepared.updateIdPrompt.userOnly",
            "This change only applies to {3} on this page."),
					theTypeLocalized = util.getBundleString(insertType == 'user' ? 'copyMessageUser' : 'copyMessagePassword');	
			
			theText = theText.replace('{0}', oldField) 
                       .replace('{1}', theTypeLocalized) 
                       .replace('{2}', newField)
                + ' ' + theText2.replace('{3}', oldLoginInfo ? oldLoginInfo.username : '');
      
      let btnYes = util.getBundleString("loginPrepared.updateIdPrompt.Yes", "Update field"),
          btnCancel = util.getBundleString("loginPrepared.updateIdPrompt.Cancel", "Cancel");      
				
			// SeaMonkey currently has no matching notification mechanism, the only thing here possible is an alert box or confirm()
			if (notifyBox) {
				let nbox_buttons = [
					{
						label: btnYes,
						accessKey: btnYes.substr(0,1), 
						callback: function() { util.updateLogin(oldLoginInfo, insertType, newField); },  
						popup: null
					},
					{
						label: btnCancel,
						accessKey: btnCancel.substr(0,1), 
						callback: function() { ; },
						popup: null
					}				
				];
        
				// we have 2 separate notifications - one for user names and one for passwords
				let notificationKey = "quickpasswords-changeprompt." + insertType, 
				    item = notifyBox.getNotificationWithValue(notificationKey)
				if(item) { notifyBox.removeNotification(item); }
				item = notifyBox.getNotificationWithValue("quickpasswords-changeprompt.repairFields")
				if(item) { notifyBox.removeNotification(item); }
				
				let icon = "repair-notification.png"; // default (blue arrow)
				switch(insertType) {
					case 'user':
					  icon = "repairUser24.png"; 
						break;
					case 'password':
					  icon = "repairPwd24.png"; 
						break;
				}
				
				// show loginPrepared.updateIdPrompt
				notifyBox.appendNotification( theText, 
						notificationKey, 
						"chrome://quickpasswords/skin/" + icon, 
						notifyBox.PRIORITY_INFO_HIGH, 
						nbox_buttons );
			}
      else {  // SeaMonkey
        let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                                      .getService(Components.interfaces.nsIPromptService),
            title ='QuickPasswords';
        const BUTTON_POS_0 = 1,
              BUTTON_POS_1 = 256,
              BUTTON_TITLE_IS_STRING = 127,
              BUTTON_POS_0_DEFAULT = 0;
        let aButtonFlags = (BUTTON_POS_0) * (BUTTON_TITLE_IS_STRING) 
                         + (BUTTON_POS_1) * (BUTTON_TITLE_IS_STRING) 
                         + BUTTON_POS_0_DEFAULT,
            input = {value: ""},
            checkState = {},
            result = prompts.confirmEx(window, title, theText, aButtonFlags, btnYes, btnCancel, null, null, checkState); // Ok = index 0
						
        if (result == 0) {
          util.updateLogin(oldLoginInfo, insertType, newField);
        }
      
      }
		}
		catch(ex) {
			util.logException("notifyUpdateId()", ex);
		}
	} ,

	checkVersionFirstRun: function checkVersionFirstRun() {
		const util = QuickPasswords.Util,
		      Cc = Components.classes,
					Cu = Components.utils;
		util.logDebugOptional("firstRun", "Util.checkVersionFirstRun() - mExtensionVer = " + util.mExtensionVer);
		let aId = util.AddonId;

		// if finding our version number is still pending, exit!
		if (util.mExtensionVer && util.mExtensionVer.indexOf("VersionPending")<0) {
			return;
		}

		if(!Cc["@mozilla.org/extensions/manager;1"])
		{
			if (typeof AddonManager == 'undefined')
				Cu.import("resource://gre/modules/AddonManager.jsm");
			setTimeout (function () {
					AddonManager.getAddonByID(aId,
						function(addon) {
							// This is an asynchronous callback function
							let ut = QuickPasswords.Util;
							ut.logDebugOptional("default", "AddonManager retrieved Version number: " + addon.version);
							if (addon.version)
								ut.checkfirstRun();
							else
								ut.checkVersionFirstRun();
						}
					);
			}, 50);
		}
		else { // Tb 3.0
			util.mExtensionVer = this.getAddon(aId).version;
			util.logDebugOptional("default", "Retrieved Version number from nsIExtensionManager (legacy): " + util.mExtensionVer);
			util.checkfirstRun();
		}
	},

	get AppVersionFull() {
	  let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
	                  .getService(Components.interfaces.nsIXULAppInfo);
	    return appInfo.version;
	},

	get AppVersion() {
		if (null == this.mAppver) {
			let  appVer=this.AppVersionFull.substr(0,3); // only use 1st three letters - that's all we need for compatibility checking!
				this.mAppver = parseFloat(appVer); // quick n dirty!
		}
		return this.mAppver;
	},
	
	get PlatformVersion() {
		if (null==this.mPlatformVer)
			try {
				let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
				                        .getService(Components.interfaces.nsIXULAppInfo);
				this.mPlatformVer = parseFloat(appInfo.platformVersion);
			}
			catch(ex) {
				this.mPlatformVer = 1.0; // just a guess
			}
		return this.mPlatformVer;
	},

	get Application() {
		if (null == this.mAppName) {
			let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
											.getService(Components.interfaces.nsIXULAppInfo);
			const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}",
			      THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}",
			      SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}",
			      POSTBOX_ID = "postbox@postbox-inc.com",
            PALE_MOON = "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}";
			switch(appInfo.ID) {
				case FIREFOX_ID:
        case PALE_MOON:
					return this.mAppName='Firefox';
				case THUNDERBIRD_ID:
					return this.mAppName='Thunderbird';
				case SEAMONKEY_ID:
					return this.mAppName='SeaMonkey';
				case POSTBOX_ID:
					return this.mAppName='Postbox';
				default:
					this.mAppName=appInfo.name;
					this.logDebug ( 'Unknown Application: ' + appInfo.name);
					return appInfo.name;
			}
		}
		return this.mAppName;
	},

	get HostSystem() {
		if (null == this.mHost) {
			let osString = Components.classes["@mozilla.org/xre/app-info;1"]
										.getService(Components.interfaces.nsIXULRuntime).OS;
			this.mHost = osString.toLowerCase();
		}
		return this.mHost; // linux - winnt - darwin
	},

	copyStringToClipboard: function copyStringToClipboard(sString) {
		let clipboardhelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
		clipboardhelper.copyString(sString);
	},

	debugVar: function debugVar(value) {
    let str = "Value: " + value + "\r\n";
    for(prop in value) {
        str += prop + " => " + value[prop] + "\r\n";
    }
    this.logDebug(str);
	},

	logTime: function logTime() {
		let timePassed = '';
    let end;
		try {
			end= new Date();
			let endTime = end.getTime();
			let elapsed = new String(endTime  - this.lastTime); // time in milliseconds
			timePassed = '[' + elapsed + ' ms]   ';
			this.lastTime = endTime; // remember last time
		}
		catch(e) {;}
		return end.getHours() + ':' + end.getMinutes() + ':' + end.getSeconds() + '.' + end.getMilliseconds() + '  ' + timePassed;
	},

	logToConsole: function logToConsole(msg, optionTitle) {
		if (this.ConsoleService == null)
		  this.ConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
		                             .getService(Components.interfaces.nsIConsoleService);

		let title = "QuickPasswords ";
		title += (typeof optionTitle != 'undefined') ? '{' + optionTitle.toUpperCase() + '}' : '';
		this.ConsoleService.logStringMessage(title + " " + this.logTime() + "\n"+ msg);
	},

	logDebug: function logDebug(msg) {
	  if (QuickPasswords.Preferences.isDebug)
	    this.logToConsole(msg);
	},

	logDebugOptional: function logDebugOptional(option, msg) {
	  if (QuickPasswords.Preferences.isDebugOption(option))
	    this.logToConsole(msg, option);
	},

	logError: function logError(aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags) {
	  // definition of flags, see flag constants:
		// const unsigned long errorFlag = 0x0; /** message is warning */ 
		// const unsigned long warningFlag = 0x1;  /** exception was thrown for this case - exception-aware hosts can ignore */ 
		// const unsigned long exceptionFlag = 0x2;
	  let consoleService = Components.classes["@mozilla.org/consoleservice;1"]
	                                 .getService(Components.interfaces.nsIConsoleService);
	  let aCategory = 'chrome javascript';

	  let scriptError = Components.classes["@mozilla.org/scripterror;1"].createInstance(Components.interfaces.nsIScriptError);
	  scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags, aCategory);
	  consoleService.logMessage(scriptError);
	} ,

	logException: function (aMessage, ex) {
		let stack = ''
		if (typeof ex.stack!='undefined')
			stack= ex.stack.replace("@","\n  ");
		// let's display a caught exception as a warning.
		let fn = ex.fileName ? ex.fileName : "?";
		this.logError(aMessage + "\n" + ex.message, fn, stack, ex.lineNumber, 0, 0x1);
	},
	
	logWarning: function (aMessage, fn) {
	  this.logError(aMessage, fn, null, 0, 0, 0x1);
	} ,

	toggleDonations: function() {
		const prefs = QuickPasswords.Preferences,
		      util = QuickPasswords.Util;
		let isAsk = prefs.getBoolPref('donations.askOnUpdate'),
		    question = this.getBundleString("qpDonationToggle","Do you want to {0} the donations screen which is displayed whenever QuickPasswords updates?");
		
		question = question.replace('{0}', isAsk ? 
               this.getBundleString("qpDonationToggle.disable", 'disable') : 
							 this.getBundleString("qpDonationToggle.enable", 're-enable'));
		if (util.confirm(question)) {
		  isAsk = !isAsk;
			prefs.setBoolPref('donations.askOnUpdate', isAsk);
			let message = this.getBundleString("qpDonationIsToggled", "The donations screen is now {0}.");
			message = message.replace('{0}', isAsk ? 
			  this.getBundleString("qpDonationIsToggled.enabled",'enabled'): 
				this.getBundleString("qpDonationIsToggled.disabled",'disabled'));
			alert(message);	
		}
	},

	onLoadOptions: function onLoadOptions() {
		this.onLoadVersionInfoDialog();
		document.getElementById('qp-version-field').value=this.Version;
    
		// no donation loophoole
		let donateButton = document.documentElement.getButton('extra2');
		if (donateButton) {
			// let donateButtons = Array.filter(dlgButtons, function(element) { return (element.dlgType=='extra2') });
			donateButton.addEventListener("click", 
				function(evt) { 
					QuickPasswords.Util.logDebugOptional("default", "donateButton event:\n" + evt.toString());
					if(evt.button == 2) {
						QuickPasswords.Util.toggleDonations();
						evt.preventDefault();
						evt.stopPropagation();
					}; }, false);
		}
	},

	displayOptions: function displayOptions() {
		let params = {inn:{instance: QuickPasswords}, out:null},
        win = QuickPasswords.getCurrentBrowserWindow();
		setTimeout(
			function() {
      win.openDialog('chrome://quickpasswords/content/quickpassword_options.xul',
				'quickpasswords-passwords','dialog,chrome,titlebar,alwaysRaised',
				params).focus();
			});
	} ,

	showAboutConfig: function showAboutConfig(filter, owner, readOnly) {
		const name = "Preferences:ConfigManager",
		      uri = "chrome://global/content/config.xul",
					Cc = Components.classes,
					Ci = Components.interfaces;

		let mediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator),
		    w = mediator.getMostRecentWindow(name);

		if (!w) {
			let watcher = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
			w = watcher.openWindow(owner || null, uri, name, "dependent,alwaysRaised,dialog,chrome,resizable,centerscreen,width=500px,height=350px", null);
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
					if (w.self.FilterPrefs)
					  w.self.FilterPrefs();
				}
			});
	},

	getBundleString: function getBundleString(id, defaultText) { // moved from local copies in various modules.
		let s;
		try {
			s = QuickPasswords.Bundle.GetStringFromName(id);
		}
		catch(e) {
			s = defaultText;
			this.logException ("Could not retrieve bundle string: " + id, e);
		}
		return s;
	} ,

	showVersionHistory: function(label, ask) {
		const util = QuickPasswords.Util;
		let pre=0,
		    current=label.value.toString(),  // retrieve version number from label
		    pureVersion = this.getVersionSimple(current),
		    sPrompt = util.getBundleString("qpConfirmVersionHistory", "Display version history for QuickPasswords {0}?");
		if (!ask || util.confirm(sPrompt.replace("{0}", pureVersion))) {
			util.openURL(null, "http://quickpasswords.mozdev.org/version.html" + "#" + pureVersion);
		}
	},
  
  get checkIsMasterLocked() {
    const Ci = Components.interfaces,
					Cc = Components.classes,
		      prefs = QuickPasswords.Preferences,
					util = QuickPasswords.Util;
    if (prefs.isDebugOption("Manager.protection")) debugger;
		
		try {
			let tokenDB = Cc["@mozilla.org/security/pk11tokendb;1"]
                  .getService(Ci.nsIPK11TokenDB);
			let token = tokenDB.getInternalKeyToken();
			return !token.isLoggedIn();
		}
		catch(e) {
			util.logException("checkIsMasterLocked()", e);
		}
		
		try {
			let secmodDB = Components.classes["@mozilla.org/security/pkcs11moduledb;1"].getService(Ci.nsIPKCS11ModuleDB),
			    slot = secmodDB.findSlotByName("");
			if (slot) {
				let status = slot.status;
				let hasMP = status != Ci.nsIPKCS11Slot.SLOT_UNINITIALIZED &&
										status != Ci.nsIPKCS11Slot.SLOT_READY;
				if (hasMP) {
					return (slot.status == Ci.nsIPKCS11Slot.SLOT_NOT_LOGGED_IN); // locked!
				}
				else return false;  // no Masterpassword = not locked
			}  
		}
		catch (ex) {
			util.logException("checkIsMasterLocked()", ex);
		}
    return false;
  } ,  

	get PrivateBrowsing() {
		const util = QuickPasswords.Util,
		      Cu = Components.utils,
					Ci = Components.interfaces;
					
		if (util.Application != "Firefox" && util.Application !="Seamonkey")
			return false;

		let isPrivate = false;
		try {
			// Firefox 20
			Cu.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
			isPrivate = PrivateBrowsingUtils.isWindowPrivate(window);
		} 
		catch(e) {
			// pre Firefox 20 (if you do not have access to a doc.
			// might use doc.hasAttribute("privatebrowsingmode") then instead)
			try {
				isPrivate = Components.classes["@mozilla.org/privatebrowsing;1"]
															.getService(Ci.nsIPrivateBrowsingService)
															.privateBrowsingEnabled;
			} 
			catch(e) {
				util.logException("PrivateBrowsing()", e);
			}
		}
		return isPrivate;
	},
	
	// some forms use the Name attribute as field identifier
	getIdentifier: function getIdentifier(targetElement) {
	  if (targetElement.id)
			return targetElement.id;
		let x = targetElement.getAttribute('Name');
		if (x)
			return x;
		return '';
	},

	stringFormat : function stringFormat(str) {
		let args = Array.slice(arguments, 1);
		return str.replace(/\{(\d+)\}/g, function ($0, $1) { return args[$1] });
	},
	
	versionGreaterOrEqual: function(a, b) {
		/*
			Compares Application Versions
			returns
			- is smaller than 0, then A < B
			-  equals 0 then Version, then A==B
			- is bigger than 0, then A > B
		*/
		let versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
														.getService(Components.interfaces.nsIVersionComparator);
		return (versionComparator.compare(a, b) >= 0);
	} ,

	versionSmaller: function(a, b) {
		/*
			Compares Application Versions
			returns
			- is smaller than 0, then A < B
			-  equals 0 then Version, then A==B
			- is bigger than 0, then A > B
		*/
		let versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
														.getService(Components.interfaces.nsIVersionComparator);
		 return (versionComparator.compare(a, b) < 0);
	} ,
  
  // helper function for POstbox where classList.toggle is broken
  classListToggle: function(element, className, toggle) {
    if (QuickPasswords.Util.Application != 'Postbox') {
     element.classList.toggle(className, toggle);
     return;
    }
    if (toggle) {
      if (!element.classList.contains(className))
        element.classList.add(className);
    }
    else {
      if (element.classList.contains(className))
        element.classList.remove(className);
    }
  }  


};

