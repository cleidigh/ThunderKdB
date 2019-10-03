var mapaPlus, mapaPlusCore;
(function()
{
let {classes: Cc, interfaces: Ci, utils: Cu} = Components,
		log = function(){};
function $ (id)
{
	return document.getElementById(id);
}

mapaPlus = {
	locked: false,
	windowType: "Window",
	loadCore: function()
	{
		Cu.import("resource://mapaplus/masterpasswordplusCore.jsm");
		this.core = mapaPlusCore;
		this.log = this.core.log;
		log = this.core.log;
	},

	ss: {
		getWindowValue: function(){return null;},
		setWindowValue: function(){},
		getWindowState: function(){},
		deleteWindowValue: function(){},
		init: function(){},
	},

	hotkeyString: {
		DIVIDE: "/",
		MULTIPLY: "*",
		SEMICOLON: ";",
		EQUALS: "=",
		SUBTRACT: "-",
		ADD: "+",
		COMMA: ",",
		PERIOD: ".",
		SLASH: "/",
		QUOTE: "'",
		OPEN_BRACKET: "[",
		CLOSE_BRACKET: "]",
		BACK_SLASH: "\\",
		DECIMAL: "Num .",
		BACK_QUOTE: "`",
		BACK_SPACE: "Backspace",
		CAPS_LOCK: "CapsLock",
		CONTEXT_MENU: "Context",
		SCROLL_LOCK: "ScrollLock",
		NUM_LOCK: "NumLock"
	},

	log: null,

	changemp: function()
	{
		//open window to set up master password
		return this._openDialog("chrome://mozapps/content/preferences/changemp.xul", "mapaPlusChangeMPWindow", "centerscreen");
//		this._openDialog("chrome://pippki/content/changepassword.xul", "mapaPlusChangePWindow", "centerscreen");
	},

	removemp: function()
	{
		//open window to remove master password
		return this._openDialog("chrome://mozapps/content/preferences/removemp.xul", "mapaPlusRemoveMPWindow", "centerscreen");
	},

	_openDialog: function(a, b, c, arg)
	{
		if (mapaPlus.locked)
			return null;

		var wm = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
		var browsers = wm.getZOrderDOMWindowEnumerator('', false);
		while (browsers.hasMoreElements())
		{
			var browser = browsers.getNext();
			if (browser.location.href.toString() == a)
			{
				browser.focus();
				return browser;
			}
		}
		return Cc["@mozilla.org/embedcomp/window-watcher;1"]
						.getService(Ci.nsIWindowWatcher)
						.openWindow(null, a, b, c, arg);

//		window.openDialog(a, b, c, arg);
	},

	options: function(arg)
	{
		return mapaPlus._openDialog("chrome://mapaplus/content/masterpasswordplusOptions.xul", "mapaPlusOptionsWindow", "centerscreen", arg);
	},

	about: function()
	{
		return this._openDialog("chrome://mapaplus/content/masterpasswordplusAbout.xul", "mapaPlusAboutWindow", "centerscreen, resizable");
	},

	openURL: function(url)
	{
		let win = null;
		if (mapaPlus.core.isTB)
		{
//url = "about:addons";
			try
			{
				win = openContentTab(url, "tab", "addons.mozilla.org");
log("openContentTab");
			}
			catch(e)
			{
				log.error(e);
				win = mapaPlus._openDialog(url, url);
			}
/*
			let tabmail = document.getElementById("tabmail"),
					args = {
						type: "chromeTab",
						chromePage: url,
						background: false
					};
			function o(){tabmail.openTab(args.type, args)}
			if (mapaPlus.locked)
				mapaPlus.showUnlockArray.push(o);
			else
				o();
*/
		}
		else
			win = switchToTabHavingURI(url, true);

		return win;
//			openUILinkIn(url, "tab", false, null, null);
	},

	setAttribute: function (obj, attr, value, remove, ignore)
	{
		ignore = ignore || [];
		if (typeof(obj) == "string")
			obj = document.getElementById(obj);

//log.debug();
		let	c = obj.childNodes,
				command = remove ? "removeAttribute" : "setAttribute";

		if (!obj.id || ignore.indexOf(obj.id) == -1)
			obj[command](attr, value);

		for(let i = 0; i < c.length; i++)
		{
			let n = !c[i].id || ignore.indexOf(c[i].id) == -1;
			if (c[i][command] && n)
				c[i][command](attr, value);

			if (c[i].childNodes.length > 0 && n)
				mapaPlus.setAttribute(c[i], attr, value, remove, ignore);
		}
	},

	AeroPeek: false,
	notification: Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService),
	openChanges: function(update)
	{
		mapaPlus.showChangesLog(mapaPlus.core.pref("showchangeslog"), false, update);
	},
	get getOpenURL ()
	{
		let	win = window.QueryInterface(Ci.nsIInterfaceRequestor)
							.getInterface(Ci.nsIWebNavigation)
							.QueryInterface(Ci.nsIDocShellTreeItem)
							.rootTreeItem
							.QueryInterface(Ci.nsIInterfaceRequestor)
							.getInterface(Ci.nsIDOMWindow),
				first = mapaPlus.core.windowFirst(),
				func = win.switchToTabHavingURI;
		if (!func && first !== null)
		{
			func =  mapaPlus.core.window["Window"][first].window.switchToTabHavingURI || mapaPlus.core.window["Window"][first].openURL || mapaPlus.openURL;
		}
		return func
	},
	showChangesLog: function(type, demo, update)
	{
//log([type, type & mapaPlus.CHANGESLOG_FULL]);
		if (typeof(type) == "undefined" || type & mapaPlus.CHANGESLOG_FULL)
		{
			if (mapaPlus.getOpenURL)
				mapaPlus.getOpenURL(mapaPlus.CHANGESLOG_URL, true);
//				mapaPlus.getOpenURL(mapaPlus.CHANGESLOG_URL + (update ? "#" + update : ""), true);
		}
	
		let addon = this.core.addon;
		if (type & mapaPlus.CHANGESLOG_NOTIFICATION)
		{
			try
			{
				let str = "",
						mp = mapaPlus,
						prevV = this.core.prevVersion || addon.version,
						notifListener = {
							observe: function(aSubject, aTopic, aData)
							{
								if (aTopic == 'alertclickcallback')
								{
									mp.showChangesLog();
								}
							}
						};
				if (Cc["@mozilla.org/xpcom/version-comparator;1"]
						.getService(Ci.nsIVersionComparator)
						.compare(this.core.appInfo.version, "8.0") > 0)
				{
					let	utf8Converter = Cc["@mozilla.org/intl/utf8converterservice;1"].getService(Ci.nsIUTF8ConverterService),
							ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
							scriptableStream = Cc["@mozilla.org/scriptableinputstream;1"].getService(Ci.nsIScriptableInputStream),
							aURL = addon.getResourceURI("changes.txt").spec,
							channel,
							input

					Cu.import("resource://gre/modules/Services.jsm");
					try
					{
						channel = ioService.newChannel2(aURL,null,null,
																						null,      // aLoadingNode
																						Services.scriptSecurityManager.getSystemPrincipal(),
																						null,      // aTriggeringPrincipal
																						Ci.nsILoadInfo.SEC_NORMAL,
																						Ci.nsIContentPolicy.TYPE_INTERNAL_IMAGE
						);
					}
					catch(e)
					{
log.error(e);
						channel = ioService.newChannel(aURL,null,null); //FF48 WHAT THE FUCK, MOZILLA?! HOW ABOUT YOU UPDATE THE DAMN DOCUMENTATION BEFORE YOU REMOVE SHIT WITHOUT BACKWARDS COMPATIBILITY?
					}
					input = channel.open();
		
					scriptableStream.init(input);
					str = scriptableStream.read(input.available());
					scriptableStream.close();
					input.close();
					str = utf8Converter.convertURISpecToUTF8 (str, "UTF-8");
					str = str.replace(/\t/g, "  ");
					str = str.replace(/\r\n/g, "\n");
					function RegExpEscape(string)
					{
						return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
					}
//					let strV = (new RegExp("(^v" + RegExpEscape(addon.version) + " \\([\\s\\S]+)" , "m")).exec(str),
					let strV = (new RegExp("(^v[0-9\\.a-z]+ \\([\\s\\S]+)" , "m")).exec(str),
							prevVersion = prevV.replace("-signed", "");

//					if (!strV)
//						strV = (new RegExp("(^v" + RegExpEscape(addon.version).replace(/[\-a-z][0-9]$/, '') + " \\([\\s\\S]+)" , "m")).exec(str)

					if (strV)
					{
						str = strV[1];
/*
						if (demo && prevVersion == addon.version)
						{
							let v,l = [],
									r = new RegExp("[\\s\\S]{2}^v([a-z0-9.]+) \\(", "mig");
							while (v = r.exec(str))
								l.push(v[1]);
		
							if (l.length)
								prevVersion = l[Math.floor(Math.random() * l.length)];
		
						}
*/
						strV = (new RegExp("([\\s\\S]+)^v" + RegExpEscape(prevVersion) + " \\(" , "m")).exec(str);
						if (!strV)
							strV = (new RegExp("([\\s\\S]+)^v" + RegExpEscape(prevVersion).replace(/[\-a-z][0-9]$/, '') + " \\(" , "m")).exec(str);

						if (!strV)
							strV = (new RegExp("((\\S\\s|.)*)(\\s+^v[0-9\\.ab]+ \\()" , "m")).exec(str);

						if (strV)
							str = strV[1];
					}
				}

				mapaPlus.notification.showAlertNotification(	'chrome://mapaPlus/skin/images/masterpasswordplus.png',
																											addon.name + " " + mapaPlus._("updated").replace("{old}", "v" + prevV).replace("{new}", "v" + addon.version),
																											str.replace(/^\s+|\s+$/g, ""),
																											true,
																											null,
																											notifListener,
																											addon.name + " " + mapaPlus._("updated"));
			}catch(e){log.error(e);}
		}
	},//openChanges()

	checkLatin: function(t)
	{
		for(let i = 0; i < t.length; i++)
			if (t.charCodeAt(i) > 127)
				return true;

		return false;
	},//checkLatin()

	nonLatin: function(e)
	{
		$("mapaPlusNonLat").collapsed = !(((mapaPlus.core.pref("nonlatinwarning") == 2 && mapaPlus.core.windowFullScreen())
																															 || mapaPlus.core.pref("nonlatinwarning") == 1)
																														 && mapaPlus.checkLatin(e.target.value));
	},//nonLatin()

}
mapaPlus.notification = Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService);
mapaPlus.notificationAvailable = (mapaPlus.notification && mapaPlus.notification.showAlertNotification);
mapaPlus.CHANGESLOG_NONE = 0;
mapaPlus.CHANGESLOG_FULL = 2;
mapaPlus.CHANGESLOG_NOTIFICATION = 1;
mapaPlus.CHANGESLOG_URL = "chrome://mapaplus/content/changes.xul";

mapaPlus.loadCore();
switch (Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("ui.key.").getIntPref("accelKey"))
{
	case 17:  mapaPlus.core.accel = "CONTROL"; break;
	case 18:  mapaPlus.core.accel = "ALT"; break;
	case 224: mapaPlus.core.accel = "META"; break;
	default:  mapaPlus.core.accel = (window.navigator.platform.search("Mac") == 0 ? "META" : "CONTROL");
}
mapaPlusCore = mapaPlus.core;
if (mapaPlus.strings && mapaPlus.core.strings._notinited)
	mapaPlus.core.strings = mapaPlus.strings;

let _strings = Cc["@mozilla.org/intl/stringbundle;1"]
					.getService(Ci.nsIStringBundleService)
					.createBundle("chrome://" + (mapaPlus.core.ADDONDOMAIN || "mapaplus") + "/locale/main.properties");
function _(s)
{
	try
	{
		return _strings.GetStringFromName(s);
	}
	catch(e)
	{
		return mapaPlus.strings[s];
	}
}
mapaPlus._ = _;
})();
