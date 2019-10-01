 "use strict";
 
if (!ZombieKeys.StringBundle)
	ZombieKeys.StringBundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
if (!ZombieKeys.Properties)
	ZombieKeys.Properties = ZombieKeys.StringBundle.createBundle("chrome://zombiekeys/locale/zombiekeys.properties");



ZombieKeys.TabURIregexp = {
	get _thunderbirdRegExp() {
		delete this._thunderbirdRegExp;
		return this._thunderbirdRegExp = new RegExp("^http://zombiekeys.mozdev.org/");
	}
};

ZombieKeys.TabURIopener = {

	openURLInTab: function openURLInTab(URL) {
		const util = ZombieKeys.Util;
		try {
			let sTabMode="",
			    wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
				   .getService(Components.interfaces.nsIWindowMediator),
			    mainWindow = wm.getMostRecentWindow("navigator:browser");
			if (mainWindow) {
				let newTab = mainWindow.gBrowser.addTab(URL);
				mainWindow.gBrowser.selectedTab = newTab;
				return true;
			}

			let tabmail;
			tabmail = document.getElementById("tabmail");
			if (!tabmail) {
				// Try opening new tabs in an existing 3pane window
				let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
										 .getService(Components.interfaces.nsIWindowMediator)
										 .getMostRecentWindow("mail:3pane");
				if (mail3PaneWindow) {
					tabmail = mail3PaneWindow.document.getElementById("tabmail");
					mail3PaneWindow.focus();
				}
			}
			if (tabmail) {
				sTabMode = (util.Application == "Thunderbird" && util.AppVersion>=3) ? "contentTab" : "3pane";
				tabmail.openTab(sTabMode,
				{contentPage: URL, clickHandler: "specialTabs.siteClickHandler(event, ZombieKeys.TabURIregexp._thunderbirdRegExp);"});
			}
			else
				window.openDialog("chrome://messenger/content/", "_blank",
								  "chrome,dialog=no,all", null,
			  {    tabType: "contentTab",
				   tabParams: {  contentPage: URL,
				                clickHandler: "specialTabs.siteClickHandler(event, ZombieKeys.TabURIregexp._thunderbirdRegExp);", 
												          id:"ZombieKeys_Weblink"
											} 
				} );
		}
		catch(e) { 
			return false; 
		}
		return true;
	}
};


if (!ZombieKeys.Util)
	ZombieKeys.Util = {
	ZombieKeys_CURRENTVERSION : '2.21.1',
	ConsoleService: null,
	mAppver: null,
	mAppName: null,
	mHost: null,
	lastTime: 0,
	myVersion: null,
	extraToolbar: null,

	get Version() {
		return this.myVersion
			   ?
			   this.myVersion
			   :
			   this.ZombieKeys_CURRENTVERSION;
	} ,
	
  get VersionSanitized() {
		return this.getVersionSimple(this.Version);
  } ,
	
	getVersionSimple: function getVersionSimple(ver) {
	  let pureVersion = ver,  // default to returning unchanged
		    // only returns numbers and [.] (strips alphabetical stuff / betas etc.) 
		    reg = new RegExp("[0-9.]*"),
		    results = ver.match(reg); 
		if (results) 
			pureVersion = results[0];
		return pureVersion;
	} ,	

	// dedicated function for email clients which don't support tabs
	// and for secured pages (donation page).
	openLinkInBrowserForced: function openLinkInBrowserForced(linkURI) {
    let util = ZombieKeys.Util,
        Cc = Components.classes,
        Ci = Components.interfaces;
		try {
			util.logDebug("openLinkInBrowserForced (" + linkURI + ")");
			if (util.Application=='SeaMonkey') {
				let windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator),
				    browser = windowManager.getMostRecentWindow( "navigator:browser" );
				if (browser) {
					let newURI = linkURI;
					setTimeout(function() {  browser.currentTab = browser.getBrowser().addTab(newURI); browser.currentTab.reload(); }, 250);
				}
				else
					window.openDialog(getBrowserURL(), "_blank", "all,dialog=no", linkURI, null, 'ZombieKeys update');

				return;
			}
			let service = Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(Ci.nsIExternalProtocolService),
			    ioservice = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
			    uri = ioservice.newURI(linkURI, null, null);
			service.loadURI(uri);
		}
		catch(e) { util.logDebug("openLinkInBrowserForced (" + linkURI + ") " + e.toString()); }
	} ,

	// moved from options.js
	// use this to follow a href that did not trigger the browser to open (from a XUL file)
	openLinkInBrowser: function openLinkInBrowser(evt,linkURI) {
    let Cc = Components.classes,
        Ci = Components.interfaces;
		if (ZombieKeys.Util.AppVersion>=3 && ZombieKeys.Util.Application=='Thunderbird') {
			let service = Cc["@mozilla.org/uriloader/external-protocol-service;1"]
				              .getService(Ci.nsIExternalProtocolService),
			    ioservice = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
			service.loadURI(ioservice.newURI(linkURI, null, null));
			if(null!=evt)
				evt.stopPropagation();
		}
		else
			this.openLinkInBrowserForced(linkURI);
	} ,

	openURL: function openURL(URL) { // workaround for a bug in TB3 that causes href's not be followed anymore.
		const util = ZombieKeys.Util;
		let ioservice, iuri, eps;

		if (util.AppVersion<3 && util.Application=='Thunderbird'
			|| util.Application=='SeaMonkey'
			|| util.Application=='Postbox')
		{
			this.openLinkInBrowserForced(URL);
		}
		else
		{
			ZombieKeys.TabURIopener.openURLInTab(URL);
		}
	} ,

	checkFirstRun: function checkFirstRun() {
		let prev = -1, firstrun = true,
		    showFirsts = true, debugFirstRun = false,
		    svc = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService),
		    ssPrefs = svc.getBranch("extensions.zombiekeys."),
        util = ZombieKeys.Util,
		    current = util.Version;
		util.logDebug("checkFirstRun");
		util.logDebug("Current ZombieKeys Version: " + current);
		try {
			util.logDebugOptional ("firstRun","try to get setting: getCharPref(version)");
			try { prev = ssPrefs.getCharPref("version"); } catch (e) { prev = "?"; } ;

			util.logDebugOptional ("firstRun","try to get setting: getBoolPref(firstrun)");
			try { firstrun = ssPrefs.getBoolPref("firstRun"); } catch (e) { firstrun = true; }

			// enablefirstruns=false - allows start pages to be turned off for partners
			util.logDebugOptional ("firstRun","try to get setting: getBoolPref(enablefirstruns)");
			try { showFirsts = ssPrefs.getBoolPref("enablefirstruns"); } catch (e) { showFirsts = true; }


			util.logDebugOptional ("firstRun", "Settings retrieved:"
					+ "\nprevious version=" + prev
					+ "\ncurrent version=" + current
					+ "\nfirstrun=" + firstrun
					+ "\nshowfirstruns=" + showFirsts
					+ "\ndebugFirstRun=" + debugFirstRun);

		}
		catch(e) {
			alert("Exception in ZombieKeys_util.js: " + e.message
				+ "\n\ncurrent: " + current
				+ "\nprev: " + prev
				+ "\nfirstrun: " + firstrun
				+ "\nshowFirstRuns: " + showFirsts
				+ "\ndebugFirstRun: " + debugFirstRun);

		}
		finally {
			util.logDebugOptional ("firstRun","finally - firstrun=" + firstrun);

			// AG if this is a pre-release, cut off everything from "pre" on... e.g. 1.9pre11 => 1.9
			let pureVersion = util.VersionSanitized;
			util.logDebugOptional ("firstRun","finally - pureVersion=" + pureVersion);
			// change this depending on the branch
			let versionPage = "http://zombiekeys.mozdev.org/version.html#" + pureVersion;
			util.logDebugOptional ("firstRun","finally - versionPage=" + versionPage);


			if (ZombieKeys.Preferences.getBoolPref("buttonAutoInstall")) {
				let toolbarName;
				switch(util.Application) {
					case 'Firefox':
						toolbarName = "nav-bar";
						break;
					case 'Thunderbird':
						toolbarName = "mail-bar3";
						// chrome://messenger/content/messengercompose/messengercompose.xul
						this.extraToolbar = "composeToolbar2";
						break;
					case 'SeaMonkey':
						toolbarName = "nav-bar";
						// chrome://messenger/content/messenger.xul
						this.extraToolbar = "msgToolbar";
						// chrome://messenger/content/messengercompose/messengercompose.xul
						this.extraToolbar = "composeToolbar";
						break;
					case 'Postbox':
						toolbarName = "mail-bar7";
						//
						this.extraToolbar = "composeToolbar5";
						break;
				}

				if (toolbarName) {
					util.installButton(toolbarName, "zombiekeys-toolbarbutton");
					ssPrefs.setBoolPref("buttonAutoInstall", false);
					if (this.extraToolbar) { // set a timer for the other window(s) to add button on load
					}
				}
			}

			if (firstrun){
				util.logDebugOptional ("firstRun","set firstRun=false and store version " + current);
				ssPrefs.setBoolPref("firstRun",false);
				ssPrefs.setCharPref("version", pureVersion); // store current (simplified) version!

				if (showFirsts) {
					// Insert code for first run here
					// on very first run, we go to the index page - welcome blablabla
					util.logDebugOptional ("firstRun","setTimeout for content tab (index.html)");
					window.setTimeout(function() {
						util.openURL("http://ZombieKeys.mozdev.org/index.html");
					}, 1500); //Firefox 2 fix - or else tab will get closed (leave it in....)
				}
			}
			else { // this section does not get loaded if its a fresh install.
				if (prev!=pureVersion) { // VERSION UPDATE!
					util.logDebugOptional ("firstRun","prev!=current -> upgrade case.");
					// upgrade case!!
					ssPrefs.setCharPref("version", pureVersion);

					if (showFirsts) {
						// version is different => upgrade (or conceivably downgrade)http://ZombieKeys.mozdev.org/version.html#version
						util.logDebugOptional ("firstRun","open tab for version history + browser for donation " + current);

						window.setTimeout(function(){
							// display version history
							util.openURL(versionPage);
						}, 2000);
					}
				}
				else {
					util.logDebugOptional ("firstRun","prev!=current -> just a reload of same version - prev=" + prev + ", current = " + current);
				}
			}

		}

	} ,

	checkVersionFirstRun: function checkVersionFirstRun() {
		let aId = "zombiekeys@bolay.de",
        util = ZombieKeys.Util;
		var { AddonManager } = 
		  ChromeUtils.import ?
			ChromeUtils.import("resource://gre/modules/AddonManager.jsm") :
			Components.utils.import("resource://gre/modules/AddonManager.jsm");
		let versionCallback = 
			function(addon) {
				// Asynchronous callback function 
				const util1 = window.ZombieKeys.Util;
				util1.myVersion = addon.version;
				util1.logDebug("AddonManager retrieved Version number: " + addon.version);
				util1.checkFirstRun();
			}
			
		if (util.versionGreaterOrEqual(util.AppVersionFull, "61")) 
			AddonManager.getAddonByID(aId).then(versionCallback); // this function is now a promise
		else
			AddonManager.getAddonByID(aId, versionCallback);
	} ,
	
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

	get AppVersionFull() {
		let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
						.getService(Components.interfaces.nsIXULAppInfo);
		return appInfo.version;
	} ,

	get AppVersion() {
		if (null == this.mAppver) {
		let appVer=this.AppVersionFull.substr(0,3); // only use 1st three letters - that's all we need for compatibility checking!
			this.mAppver = parseFloat(appVer); // quick n dirty!
		}
		return this.mAppver;
	} ,

	get Application() {
		if (null==this.mAppName) {
		let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
						.getService(Components.interfaces.nsIXULAppInfo);
			const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}",
						PALEMOON_ID = "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}",
			      THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}",
			      SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}",
			      POSTBOX_ID = "postbox@postbox-inc.com";
			switch(appInfo.ID) {
				case FIREFOX_ID:
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
	} ,

	get HostSystem() {
		if (null==this.mHost) {
			let osString = Components.classes["@mozilla.org/xre/app-info;1"]
						.getService(Components.interfaces.nsIXULRuntime).OS;
			this.mHost = osString.toLowerCase();
		}
		return this.mHost; // linux - winnt - darwin
	} ,

	get isPrivateBrowsing() {
		if (ZombieKeys.Util.Application == "Thunderbird" || ZombieKeys.Util.Application == "Postbox")
			return false;
		let isPrivate = false;
		try {
			// Firefox 20
			Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
			isPrivate = PrivateBrowsingUtils.isWindowPrivate(window);
		} 
		catch(e) {
			// pre Firefox 20 (if you do not have access to a doc.
			// might use doc.hasAttribute("privatebrowsingmode") then instead)
			try {
				isPrivate = Components.classes["@mozilla.org/privatebrowsing;1"]
															.getService(Components.interfaces.nsIPrivateBrowsingService)
															.privateBrowsingEnabled;
			} 
			catch(e) {
				this.logException("PrivateBrowsing()", e);
			}
		}
		return isPrivate;
	} ,

	logTime: function logTime() {
		let timePassed = '',
        end, endTime, elapsed;
		try {
			end= new Date();
			endTime = end.getTime();
			elapsed = new String(endTime  - this.lastTime); // time in milliseconds
			timePassed = '[' + elapsed + ' ms]	 ';
			this.lastTime = endTime; // remember last time
		}
		catch(e) {;}
		return end.getHours() + ':' + end.getMinutes() + ':' + end.getSeconds() + '.' + end.getMilliseconds() + '  ' + timePassed;
	} ,

	logToConsole: function logToConsole(msg, xml, optionTag) {
	  if (this.ConsoleService == null)
		this.ConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
								   .getService(Components.interfaces.nsIConsoleService);
	  let title = xml ? "[ZombieKeys XML]" : "[ZombieKeys]"
      + (optionTag ? '{' + optionTag.toUpperCase() + '} ' : '')
      + ' ' + this.logTime() + "\n";
	  this.ConsoleService.logStringMessage(title + msg);
	} ,

		// flags
	// errorFlag 		0x0 	Error messages. A pseudo-flag for the default, error case.
	// warningFlag 		0x1 	Warning messages.
	// exceptionFlag 	0x2 	An exception was thrown for this case - exception-aware hosts can ignore this.
	// strictFlag 		0x4
	logError: function logError(aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags) {
	  let consoleService = Components.classes["@mozilla.org/consoleservice;1"]
	                                 .getService(Components.interfaces.nsIConsoleService),
	      aCategory = '',
	      scriptError = Components.classes["@mozilla.org/scripterror;1"].createInstance(Components.interfaces.nsIScriptError);
	  scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags, aCategory);
	  consoleService.logMessage(scriptError);
	} ,

  logException: function logException(aMessage, ex) {
		let stack = ''
		if (typeof ex.stack!='undefined')
			stack = ex.stack.replace("@","\n  ");
		// let's display a caught exception as a warning.
		let fn = ex.fileName ? ex.fileName : "?";
		this.logError(aMessage + "\n" + ex.message, fn, stack, ex.lineNumber, 0, 0x1);
	} ,
	
	// disable debug log output in private browsing mode to prevent key snooping
	logDebug: function logDebug(msg) {
	  // if (!ZombieKeys.Preferences.isDebug) return;
		if (this.isPrivateBrowsing) return;
		if (!ZombieKeys.Preferences.isDebugOption('default')) return;
		this.logToConsole(msg);
	} ,

	// disable debug log output in private browsing mode to prevent key snooping
	logDebugOptional: function logDebugOptional(optionString, msg) {
    if (this.isPrivateBrowsing) return;
    let options = optionString.split(',');
    for (let i=0; i<options.length; i++) {
      let option = options[i];
      if (ZombieKeys.Preferences.isDebugOption(option)) {
        this.logToConsole(msg, null, option); // no xml param
        break; // only log once, in case multiple log switches are on
      }
    }
	} ,

	showAboutConfig: function showAboutConfig(filter) {
		const name = "Preferences:ConfigManager",
		      uri = "chrome://global/content/config.xul";

		let mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator),
		    w = mediator.getMostRecentWindow(name);

		if (!w) {
			let watcher = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
			w = watcher.openWindow(null, uri, name, "chrome,resizable,centerscreen,width=500px,height=350px", null);
		}
		w.focus();
		w.setTimeout(
			function () {
				let flt = w.document.getElementById("textbox");
				if (flt) {
					flt.value=filter;
					flt.focus();
					if (w.self.FilterPrefs)
						w.self.FilterPrefs();
					// for security, we lock down about:config so users do not accidentally change stuff they shouldn't
					flt.setAttribute('readonly',true);
				}
			}, 300);
	} ,

	showVersionHistory: function showVersionHistory(label, ask) {
		let current=label.value.toString(),  // retrieve version number from label
        util = ZombieKeys.Util,
		    pureVersion = util.getVersionSimple(current),
		    sPrompt = util.getBundleString("confirmVersionLink", "Display version history for ZombieKeys")
		if (!ask || confirm(sPrompt + " " + pureVersion + "?")) {
			util.openURL("http://zombiekeys.mozdev.org/version.html" + "#" + pureVersion);
		}
	} ,

/**
 * Installs the toolbar button with the given ID into the given
 * toolbar, if it is not already present in the document.
 *
 * @param {string} toolbarId The ID of the toolbar to install to.
 * @param {string} id The ID of the button to install.
 */
	installButton: function installButton(toolbarId, id) {
		if (!document.getElementById(id)) {
			let toolbar = document.getElementById(toolbarId);
			if (!toolbar) {
			  this.logDebug("installButton: toolbar not found {" + toolbarId + "}");
				return;
			}

			// append the item to the toolbar
			toolbar.insertItem(id, null);
			toolbar.setAttribute("currentset", toolbar.currentSet);
			document.persist(toolbar.id, "currentset");

			if (toolbarId == "addon-bar")
				toolbar.collapsed = false;
			}
	}

};





