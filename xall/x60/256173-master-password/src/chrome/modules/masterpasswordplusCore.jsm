const EXPORTED_SYMBOLS = ["mapaPlusCore"],
			{classes: Cc, interfaces: Ci, utils: Cu} = Components,
			nsIPKCS11Slot = Ci.nsIPKCS11Slot,
			PREF_BRANCH = "extensions.masterPasswordPlus.";

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

var self = this,
		log = function(){},
		setTimeout = function(func, timeout)
		{
			let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
			timer.init({observe: func}, timeout, timer.TYPE_ONE_SHOT);
			return timer;
		},
		clearTimeout = function(timer)
		{
			try
			{
				timer.cancel();
			}
			catch(e){};
		},
		mapaPlusCore = {
	GUID: 'masterpasswordtimeoutplus@vano',
	app: null,

	window: {},
//	windowID: {},
	windowID: 0,
	dialogShow: false,
	dialogSuppressTimer: 0,
	dialogSuppress: false,
	dialogTemp: true,
	dialogOptions: true,
	dialogForce: false, //bypass restrictions
	dialogBackup: {},

	suppressedIcon: false,
	suppressedLast: 0,
	suppressedPopupStop: false,
	suppressedFocusForce: false,

	prefLockHotkey: "",
	prefLockWinHotkey: "",
	prefLogoutHotkey: "",
	prefLockLogoutHotkey: "",

	prefHotkeysPref2Var: {
		lockhotkey: "prefLockHotkey",
		lockwinhotkey: "prefLockWinHotkey",
		logouthotkey: "prefLogoutHotkey",
		locklogouthotkey: "prefLockLogoutHotkey"
	},

	prefNoObserve: false,
	prefForcePrompt: [],
	prefNoWorkAround: [],

	locked: false,
	lockDo: true,
	lockIncorrect: 0,
	unlockIncorrect: 0,

	startupPassed: false,
	startupIncorrect: 0,

	quiting: false,
	keysList: null,
	accel: "CONTROL",
	lastKeyDown: [],
	eventKeypress: null,

	STARTUP_DONOTHING: 0,
	STARTUP_QUIT: 1,
	STARTUP_LOCK: 2,

	lockPrefBackup: null,
	storage: {
		persist: {},
	},
	PREF_BRANCH: PREF_BRANCH,
	prefs: Cc["@mozilla.org/preferences-service;1"]
				.getService(Ci.nsIPrefService).getBranch(PREF_BRANCH),
	prefsDefault: Cc["@mozilla.org/preferences-service;1"]
				.getService(Ci.nsIPrefService).getDefaultBranch(PREF_BRANCH),

//	crypt: Cc["@mozilla.org/security/sdr;1"].getService(Ci.nsISecretDecoderRing),

	timerTime: null,
	timerLockTime: null,

	initialized: false,
	prevVersion: "",
	timerFocus: {
		timer: Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
		init: function(t)
		{
			t = t || "Window";
			this.timer.init({observe: function()
				{
					mapaPlusCore.windowFocus(t);
				}
			}, 100, this.timer.TYPE_ONE_SHOT)
		},
	},

	appInfo: Cc["@mozilla.org/xre/app-info;1"]
					.getService(Ci.nsIXULAppInfo),
	tokenDB: Cc['@mozilla.org/security/pk11tokendb;1']
					.getService(Ci.nsIPK11TokenDB).getInternalKeyToken(),

	timerDelay: 500, //how often current state will be checked (in miliseconds)

	startupShort: 60, //timeout on startup

	status: 0,
	last: 0,
	timeString: "",
	timeLockString: "",

	forced: false,

	observerService: null,

	focused: null,

	style: {},

	strings: {
		_notinited: true,
		days: "d",
		deleteSettings: "Delete all settings?"
	},

	dump: function(){},

/*
	windowAdd: function(win, t)
	{
		t = t || "Window";
		if (!(t in this.window))
		{
			this.windowID[t] = 0;
			this.window[t] = [];
		}
		this.windowID[t]++;
		this.window[t][this.windowID[t]] = win;
log.debug(t + " added id: " + this.windowID[t])
		return this.windowID[t];
	},

*/
	windowAdd: function(win, t)
	{
		t = t || "Window";
		if (!(t in this.window))
		{
			this.window[t] = [];
		}
		this.windowID++;
		this.window[t][this.windowID] = win;
log.debug(t + " added id: " + this.windowID)
		return this.windowID;
	},

	windowRemove: function(id, t)
	{
		t = t || "Window";
		if (t in this.window)
		{
			this.window[t][id] = null;
log.debug(t + " removed: " + id);
		}
	},

	windowUpdate: function(u, f, t)
	{
		t = t || "Window";
		let name = null;
		if (u)
			name = "update";
		else if (this.dialogSuppress)
			name = "blink";
		if (name)
		{
			this.windowAction(name, f, t);
		}
	},

	windowAction: function(subj, data, type)
	{
		let observerSubject = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);

		type = type || "Window";
		observerSubject.data = subj;
//this.dump(subj + " | " + type + " | " + data);
		Cc["@mozilla.org/observer-service;1"]
			.getService(Ci.nsIObserverService)
			.notifyObservers(observerSubject, "mapaPlus" + type, data);
	},

	windowBlinkCancel: function(t)
	{
		t = t || "Window";
		this.dialogSuppress = false;
		this.windowAction("blinkCancel", null, t)
	},

	windowFirst: function(t)
	{
		t = t || "Window";
		if (!(t in this.window))
			return null;

		let w = this.window[t]
		for(var i = 1; i < w.length; i++)
		{
			if (w[i] != null)
			{
				return i;
			}
		}
		return null;
	},

	windowFocus: function(t, id)
	{
		t = t || "Window";
		if (!(t in this.window))
			return false;

		if (typeof(first) == "undefined")
			id = this.windowFirst(t);

		if (id !== null)
		{
			if ("window" in this.window[t][id])
				this.window[t][id].window.focus();
			else
				this.window[t][id].focus();
		}
	},

	windowFullScreen: function()
	{
		if (!(["Window"] in this.window))
			return false;

		let w = this.window["Window"];
		for(var i = 1; i < w.length; i++)
		{
			if (w[i] != null && w[i].window.fullScreen)
			{
				return true;
			}
		}
		return false;
	},

	windowFocused: function(e)
	{
		if ("openUILinkIn" in e.currentTarget)
			mapaPlusCore.focused = e.currentTarget;
	},

	openUILinkIn: function(url, tab, a, b, c)
	{
		if (this.isTB)
		{
			var messenger = Cc["@mozilla.org/messenger;1"].createInstance();
			messenger = messenger.QueryInterface(Ci.nsIMessenger);
			messenger.launchExternalURL(url);
		}
		else
		{
			tab = tab || "tab";
			a = typeof(a) == "undefined" ? false : a;
			if (this.focused && !this.focused.closed)
				this.focused.openUILinkIn(url, tab, a, b, c);
			else
			{
				var arg = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
				arg.data = url;
				var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
				ww.openWindow(null, "chrome://browser/content/browser.xul", "_blank", "chrome,all,dialog=no", arg);
			}
		}
	},

	/**
	 * Save callbacks to run when unloading. Optionally scope the callback to a
	 * container, e.g., window. Provide a way to run all the callbacks.
	 *
	 * @usage unload(): Run all callbacks and release them.
	 *
	 * @usage unload(callback): Add a callback to run on unload.
	 * @param [function] callback: 0-parameter function to call on unload.
	 * @return [function]: A 0-parameter function that undoes adding the callback.
	 *
	 * @usage unload(callback, container) Add a scoped callback to run on unload.
	 * @param [function] callback: 0-parameter function to call on unload.
	 * @param [node] container: Remove the callback when this container unloads.
	 * @return [function]: A 0-parameter function that undoes adding the callback.
	 */
	unload: function(callback, container) {
		// Initialize the array of unloaders on the first usage
		let unloaders = this.unload.unloaders;
		if (unloaders == null)
			unloaders = this.unload.unloaders = [];

		// Calling with no arguments runs all the unloader callbacks
		if (callback == null) {
			unloaders.slice().forEach(function(unloader){unloader()});
			unloaders.length = 0;
			return;
		}

		// The callback is bound to the lifetime of the container if we have one
		if (container != null) {
			// Remove the unloader when the container unloads
			container.addEventListener("unload", removeUnloader, false);

			// Wrap the callback to additionally remove the unload listener
			let origCallback = callback;
			callback = function() {
				container.removeEventListener("unload", removeUnloader, false);
				origCallback();
			}
		}

		// Wrap the callback in a function that ignores failures
		function unloader() {
			try {
				callback();
			}
			catch(ex) {}
		}
		unloaders.push(unloader);

		// Provide a way to remove the unloader
		function removeUnloader() {
			let index = unloaders.indexOf(unloader);
			if (index != -1)
				unloaders.splice(index, 1);
		}
		return removeUnloader;
	},

	observe: function(aSubject, aTopic, aData)
	{
		if (aTopic == "quit-application")
		{
			mapaPlusCore.unload();
		}
	},

	logout: function()
	{
		this.tokenDB.logoutAndDropAuthenticatedResources();
	},//logout()

	lock: function(logout, minimize)
	{
		if (this.status || !this.startupPassed)
		{
			logout = logout || false;
			minimize = minimize || false;
			this.locked = true;
			this.prefNoObserve = true;
			this.pref("locked", true);
			this.prefNoObserve = false;
			this.windowAction("showLock");
			this.dialogShow = false;
//			this.pref("suppress") = 2;
			if (logout)
				this.logout();

			this.timerCheck.observe();
			this.windowAction("lock", true, "Dialog");

			if (minimize && this.pref("lockminimize"))
			{
				if (!this.pref("lockminimizeblur")
						|| (this.pref("lockminimizeblur")
								&& !Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher).activeWindow))
				{
					let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
					timer.init({observe:function()
					{
						let enumerator = Cc["@mozilla.org/appshell/window-mediator;1"]
															.getService(Ci.nsIWindowMediator)
															.getEnumerator(null);

						while(enumerator.hasMoreElements())
						{
							let win = enumerator.getNext();
							if (win.windowState != win.STATE_MINIMIZED)
							{
								win.minimize();
/*
								let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
								timer.init({observe:function()
								{
									win.minimize();
								}}, 0, timer.TYPE_ONE_SHOT);
*/
							}
						}

					}}, 101, timer.TYPE_ONE_SHOT);
				}
			}
			if (!this.lockPrefBackup)
			{
				this.lockPrefBackup = [];
				function rp (pref)
				{
					let p = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch(""),
							b = p.getBoolPref(pref);
					function unload(){p.setBoolPref(pref, b)};
					mapaPlusCore.lockPrefBackup.push([unload, mapaPlusCore.unload(unload)]);
					p.setBoolPref(pref, false);
				}
				if (this.isTB)
				{
					if (this.pref("hidenewmailalert"))
						rp("mail.biff.show_alert");

					if (this.pref("hidenewmailballoon"))
						rp("mail.biff.show_balloon");
				}
				if (Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getDefaultBranch("extensions.wmn.").getPrefType("showNotification") == Ci.nsIPrefBranch.PREF_BOOL)
				{
					if (this.pref("hidenewmailalert"))
						rp("extensions.wmn.showNotification");
				}
			}
			return;
		}
	}, //lock()

	showLock: function(window)
	{
//		this.dump("showlock");
		if (window.locked)
			return;

		if (!window.lockedWindow)
			this.locked = true;
		else
			this.ss.setWindowValue(window, "lockedWindow", window.lockedWindow.toString());

		window.locked = true;
		if (!this.isTB && this.pref("lockhidetitle") && window.gBrowser)
		{
			window.lockedTitle = window.gBrowser.contentDocument.title;
			window.gBrowser.contentDocument.title = window.document.getElementById("masterPasswordPlusUnLockInfo").value;
		}
		let o = window.document.getElementById("titlebar"); //FF4 with no menubar
		if (o)
		{
			o = o.firstChild.boxObject.height + "px";
			window.document.getElementById("masterPasswordPlusLock").style.top = o;
			window.document.getElementById("masterPasswordPlusLockBox").style.top = o;
			window.document.getElementById("masterPasswordPlusLockBox2").style.top = o;
		}
		window.document.getElementById('masterPasswordPlusLock').hidden = false;
		var n = window.document.getElementsByTagName("window")[0].childNodes;
		for(var i = 0; i < n.length; i++)
		{
			if (n[i].id != "masterPasswordPlusLock" && n[i].id != "titlebar")
			{
				n[i].setAttribute("mapaVisibility", n[i].style.visibility);
				n[i].style.visibility="hidden";
			}
		}
		for(var i = 0; i < window.lockList.length; i++)
		{
			n = window.document.getElementById(window.lockList[i]);
			if (n)
			{
				n.setAttribute("mapaDisplay", n.style.display);
				n.style.display = "none";
			}
		}

		window.document.getElementById('masterPasswordPlusUnLock').focus();
		this.workAround.do("off", window.mapaPlus);
	//	this.core.dump(this.AeroPeek.enabled);
	},

	showUnlock: function(window)
	{
		if (!window.locked)
			return;

		if (window.lockedWindow)
		{
			if (!f && !window.lockedWindowClicked)
				return;

			window.lockedWindowClicked = false;
		}
		else
		{
			this.locked = false;
		}
		try
		{
			window.ss.deleteWindowValue(window, "lockedWindow");
		}catch(e){};

		window.locked = false;
		if (!this.isTB && this.pref("lockhidetitle"))
		{
			gBrowser.contentDocument.title = window.lockedTitle;
		}
		this.workAround.do("on", window.mapaPlus);
		window.document.getElementById('masterPasswordPlusLock').hidden = true;
		var n = window.document.getElementsByTagName("window")[0].childNodes;
		for(var i = 0; i < n.length; i++)
		{
			if (n[i].hasAttribute("mapaVisibility"))
			{
				n[i].style.visibility = n[i].getAttribute("mapaVisibility");
				n[i].removeAttribute("mapaVisibility");
			}

		}
		for(var i = 0; i < window.lockList.length; i++)
		{
			n = window.document.getElementById(window.mapaPlus.lockList[i]);
			if (n && n.hasAttribute("mapaDisplay"))
			{
				n.style.display = n.getAttribute("mapaDisplay");
				n.removeAttribute("mapaDisplay");
			}
		}
		window.mapaPlus.Win7Features.onOpenWindow(window);

	},

	unlock: function unlock()
	{
log.debug();
		this.locked = false;
		this.windowAction("lock", false, "Dialog");
		this.countdownResetLock();
		this.prefNoObserve = true;
		this.pref("locked", false);
		this.prefNoObserve = false;
//		this.pref("suppress") = this.pref("suppress");
		this.windowAction("showUnlock");
		if (this.lockPrefBackup)
		{
			this.lockPrefBackup.forEach(function(data)
			{
				data[0]();
				data[1]();
			});
			this.lockPrefBackup = null;
		}
//initiate sync
		if (this.pref("unlockSync"))
		{
			let win = this.windowFirst();
			if (win !== null && this.window["Window"][win].window.gSync)
			{
				this.window["Window"][win].window.gSync.doSync();
			}
		}
/*
this.async(function()
{
	Services.obs.notifyObservers(null, "cloudsync:user-sync", null);
}, 3000)
*/
	},

	suppressed: function()
	{
		if (this.locked)
			return;

		this.dialogSuppress = true;
		this.dialogSuppressTimer = this.pref("suppresstimer")*2+2;
	},

	countdownReset: function()
	{
		var time = (this.forced ? this.forced : this.pref("logouttimeout"));
		time = new Date((parseInt((new Date().getTime()/1000))+time) * 1000);
		this.timerTime = time;
	},

	countdownResetLock: function()
	{
		let time = this.pref("locktimeout");
		if (time < 10)
		{
			time = 10;
			this.pref("locktimeout", time);
		}
		time = new Date((parseInt((new Date().getTime()/1000))+time) * 1000) ;
		this.timerLockTime = time;
	},

	resetTimer: function(e)
	{
		if (mapaPlusCore.pref("logoutinactivity") && !mapaPlusCore.forced)
			mapaPlusCore.countdownReset();

		if (mapaPlusCore.pref("lockinactivity"))
			mapaPlusCore.countdownResetLock();
	},

	timeSplit: function (t)
	{
		return {
			d: Math.floor( t / 86400000 ),
			h: Math.floor( t / 3600000% 24 ),
			m: Math.floor( t / 60000% 60 ),
			s: Math.floor( t / 1000 % 60 ),
			ms: Math.floor( t % 1000)
		}
	},//timeSplit()

	timerToString: function(t, time)
	{
		let difference = t - time + 1000;
		if (!t || difference < 0)
			return "";

		let r = "";
		time = this.timeSplit(difference);
		if (time.d)
			r += time.d;

		if (r || time.h)
			r += (r ? this.strings.days + " " : "") + (!r || time.h > 9 ? "" : "0") + time.h;

		if (r || time.m)
			r += (r ? ":" : "") + (!r || time.m > 9 ? "" : "0") + time.m;

		if (r || time.s)
			r += (r ? ":" : "") + (!r || time.s > 9 ? "" : "0") + time.s;

//		let r += (hours > 9 ? "" : "0") + hours + ":" + (minutes > 9 ? "" : "0") + minutes + ":" + (seconds > 9 ? "" : "0") + seconds;
//		mapaPlusCore.dump(r);
		return r;
	},

	timerCheck: {
		timer: Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
		init: function()
		{
			mapaPlusCore.countdownReset();
			mapaPlusCore.countdownResetLock();
			this.timer.cancel();
			if (mapaPlusCore.status)
				this.timer.init(this, mapaPlusCore.timerDelay, this.timer.TYPE_REPEATING_SLACK);

			this.observe();
		},
		observe: function()
		{
			mapaPlusCore.timerCheckObserver();
		}
	},

	isLoggedIn: function()
	{
		return !this.tokenDB.needsLogin() || (this.tokenDB.needsLogin() && this.tokenDB.isLoggedIn());
	},

	timerCheckObserver: function()
	{
		if (idleService.idleTime < (mapaPlusCore.pref("idle") * 200 + 100))
		{
//log(idleService.idleTime);
			mapaPlusCore.resetTimer();
		}
		let time = new Date(),
				newStatus = null,
				windowUpdate = null;

		if(this.tokenDB.needsLogin())
		{
			let locked = this.locked;
			if (this.pref("locktimer"))
			{
				if (!locked && this.timerLockTime && time.getTime() >= this.timerLockTime.getTime())
				{
					this.status = 1;
//this.dump("locked done");
					this.locked = true;
					locked = true;
					this.lock(false, true);
					this.lockDo = true;
				}
				else
				{
					this.timeLockString = this.timerToString(this.timerLockTime, time);
				}
			}
			if ((this.pref("lockonwslock") || this.pref("logoutonwslock")) && mapaPlusCore.isWsLocked)
			{
				mapaPlusCore.wsLocked = true;
			}
			else if (mapaPlusCore.wsLocked && !mapaPlusCore.isWsLocked)
			{
				mapaPlusCore.wsLocked = false;
				if (this.pref("lockonwslock"))
				{
					this.lock();
				}
				if (this.pref("logoutonwslock"))
				{
					this.logout();
					this.status = 2;
	
				}
			}

			if (this.tokenDB.isLoggedIn())
			{
				if (this.last != 1)
				{
					this.countdownReset();
					this.countdownResetLock();
					this.windowBlinkCancel();
					this.windowAction("suppressedPopupRemove");
				}
				let l = true;
				if ((this.pref("logouttimer") || this.forced) && this.timerTime && time.getTime() >= this.timerTime.getTime())
				{
					this.logout();
					this.status = 2;
					if (this.pref("suppress") != 2 && !this.pref_SuppressTemp)
						this.dialogShow = true;

					l = false;
				}
				else
				{
					this.status = 1;
					this.timeString = this.timerToString(this.timerTime, time);
				}
				if (this.last != this.status)
				{
					windowUpdate = true;
//					this.windowUpdate(true);

					if (!locked)
						this.windowAction("showUnlock");
				}
				if (l)
					newStatus = this.status;
			}
			else
			{
				this.status = 2;

				if (this.forced)
				{
					this.forced = false;
				}
				if (this.dialogSuppress || this.last != this.status)
				{
					this.dialogSuppressTimer--;
					if (this.locked || !this.dialogSuppress || (this.dialogSuppressTimer < 2 && this.pref("suppresstimer")))
					{
						this.windowBlinkCancel();
					}
					else
					{
						this.suppressedIcon = this.pref("suppressblink") ? Boolean(this.dialogSuppressTimer%2) : true;
					}
					windowUpdate = this.last != this.status;
//					this.windowUpdate(this.last != this.status);
				}
				else if (!this.dialogSuppress && this.suppressedIcon)
				{
					this.windowBlinkCancel();
				}

				newStatus = this.status;
			}
		}
		else
		{
			this.timerCheck.timer.cancel();
			this.status = 0;
			if (this.last != this.status)
			{
				this.windowBlinkCancel();
				windowUpdate = true;
//				this.windowUpdate(true);
			}
			newStatus = this.status;
		}
		if (windowUpdate !== null)
		{
			this.windowUpdate(windowUpdate);
		}
		else if (this.last != this.status)
			this.windowUpdate(true);

		if (newStatus !== null)
			this.last = newStatus;
	},

	suppressTemp: {
		timer: Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
		start: function()
		{
			mapaPlusCore.dialogShow = false;
			this.timer.init(this, mapaPlusCore.pref_SuppressTemp*60000, this.timer.TYPE_ONE_SHOT);
		},

		stop: function()
		{
			this.timer.cancel();
			this.observe();
		},

		observe: function()
		{
			mapaPlusCore.pref_SuppressTemp = false;
		}
	},

	suppressedSound: function()
	{
		var sound = Cc["@mozilla.org/sound;1"]
								.createInstance(Ci.nsISound);
		try
		{
			sound.init();
			sound.play(Cc["@mozilla.org/network/io-service;1"]
									.getService(Ci.nsIIOService)
									.newURI("chrome://mapaplus/skin/pop.wav", null, null));
		}
		catch(e)
		{
			try{sound.beep()}catch(e){this.dump(e)}
		}
	},

	workAround: {
		init: function(mapaPlus, f)
		{
			for(var i in this.list)
				this.list[i].init(mapaPlus, f);
		},

		do: function(c, mapaPlus)
		{
			var w = mapaPlusCore.prefNoWorkAround;
			for(var i in this.list)
				if (typeof this.list[i].obj != "undefined" && this.list[i].obj == i && w.indexOf(i) == -1 && typeof this.list[i][c] == "function")
					this.list[i][c](mapaPlus);
		},

		list: {
			AeroBuddy: {
				obj: "AeroBuddy", //some basic protection
				_glass: null,
				_initialized: false,
				_pref: null,
				init: function(mapaPlus, first)
				{
					if (!this._initialized)
					{
						this._initialized = true;
						this._pref = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.AeroBuddy.");
					}
					try
					{
						let g = this._pref.getBoolPref("glass");
					}
					catch(e){return;}
					try
					{
						let s = mapaPlus.ss.getWindowValue(mapaPlus.window, "AeroBuddy");
						if (s === "")
							return;

						if (first)
							this._pref.setBoolPref("glass", s == "true")

					}catch(e){};
				},//workAround.list.AeroBuddy.init()

				off: function(mapaPlus)
				{
					let w = mapaPlusCore.window["Window"],
							l = 0;
					if (!w)
						return;

					for(let i = 1; i < w.length; i++)
						if (w[i] != null && w[i].locked)
							l++;

					if (l > 1 || this._glass !== null)
						return;
					try
					{
						let v = this._pref.getBoolPref("glass");
						this._glass = v;
						mapaPlus.ss.setWindowValue(mapaPlus.window, "AeroBuddy", v.toString());
						this._pref.setBoolPref("glass", false);
					}
					catch(e){};
				},//workAround.list.AeroBuddy.off()

				on: function(mapaPlus)
				{
					let 	w = mapaPlusCore.window["Window"],
								l = 0;
					if (!w)
						return;

					for(let i = 1; i < w.length; i++)
						if (w[i] != null && w[i].locked)
							l++;

					if (l > 0 || this._glass === null)
						return;

					try
					{
						let v = this._pref.getBoolPref("glass");
						if (!v && this._glass)
							this._pref.setBoolPref("glass", this._glass);

						this._glass = null;
						mapaPlus.ss.deleteWindowValue(mapaPlus.window, "AeroBuddy");
					}
					catch(e){};
				}//workAround.list.AeroBuddy.on()
			},//workAround.list.AeroBuddy{}
		}//workAround.list{}
	},//workAround{}

	matchKeys: function(k, l, len)
	{
//		return (k.toString().toUpperCase() == l.toString().toUpperCase());

		if (k.length != l.length || (len && k.length < len))
			return false;

		for(var i = 0; i < l.length; i++)
		{
			if (k.indexOf(this.getAccel(l[i])) == -1)
			{
				return false;
			}
		}
//this.dump("\n" + k + "\n" + l + "\n-----");
		return true;
	},
getCaller: function getCaller ()
{
	var callerName;
	try
	{
		throw new Error();
	}
	catch (e)
	{
		var re = /(\w+)@|at (\w+) \(/g, st = e.stack, m;
		re.exec(st), m = re.exec(st);
		callerName = m[1] || m[2];
		return String(e.stack);
	}
},

	getKeys: function getKeys(e)
	{
		if (this.keysList === null)
			return null;

		var keys = [];
		var keycode = this.getAccel(this.keysList[e.keyCode]);
		if(e.ctrlKey) keys.push(this.getAccel("CONTROL"));
		if(e.altKey) keys.push(this.getAccel("ALT"));
		if(e.metaKey) keys.push(this.getAccel("META"));
		if(e.shiftKey) keys.push(this.getAccel("SHIFT"));

		var modifiers = keys.slice();
		if (keys.indexOf(keycode) == -1)
			keys.push(keycode);
		return [keys, [modifiers, keycode]];
	},

	getAccel: function(a)
	{
		return this.accel == a ? "ACCEL" : a;
	},

	prepareHotkey: function prepareHotkey()
	{
log.debug();
		let that = mapaPlusCore,
				pref = that.pref;

		for (let i in that.prefHotkeysPref2Var)
		{
			let val = pref(i, undefined, 1, 1);
			if (val)
			{
				that[that.prefHotkeysPref2Var[i]] = val.split(" ");
			}
		}
		that.windowAction("hotkeyInit");
	},
	pref: function (key, val, noCache, noAsync)
	{
		let pref = mapaPlusCore.pref;
		try
		{
			if (!noCache && typeof(val) == "undefined")
			{
				return pref.prefs[key];
			}
			let type = typeof(pref.prefs[key]);
			if (typeof(val) == "undefined")
			{
				type = pref.types[type];
				if (type)
					val = mapaPlusCore.prefs["get" + type + "Pref"](key);
				else
					val = mapaPlusCore.prefStringGet(mapaPlusCore.prefs, key);

				if (typeof(val) != "undefined")
					pref.prefs[key] = val;

				return val
			}
			else
			{
				if (type != typeof(val))
				{
					if (type == "number")
						val = Number(val);
					else if (type == "string")
						val = String(val);
					else
						val = Boolean(val);
				}
				pref.prefs[key] = val;
				let callback = function()
				{
					delete pref.timers[key];
					let type = pref.types[typeof(pref.prefs[key])];
					if (type)
						mapaPlusCore.prefs["set" + type + "Pref"](key, val);
					else
						mapaPlusCore.prefStringSet(mapaPlusCore.prefs, key, val);
				}
				if (noAsync)
					callback();
				else
					pref.timers[key] = mapaPlusCore.async(callback, 0, pref.timers[key] || undefined);
			}
		}
		catch(e)
		{
			log.error(e);
		}
		return null;
	},//pref()

	prefStringSet: function(pref, key, val)
	{
		let r;
		try
		{
			let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
			str.data = val;
			r = pref.setComplexValue(key, Ci.nsISupportsString, str);
		}
		catch(e)
		{
//log.error(e,{callerIndex: 0});
			try
			{
				r = pref.setStringPref(key,val);
			}
			catch(e)
			{
//log.error(e,{callerIndex: 0});
				try
				{
					let str = Cc["@mozilla.org/pref-localizedstring;1"].createInstance(Ci.nsIPrefLocalizedString);
					str.data = val;
					r = pref.setComplexValue(key, Ci.nsIPrefLocalizedString, str);
				}
				catch(e)
				{
//log.error(e,{callerIndex: 0});
					r = pref.setCharPref(key, val);
				}
			}
		}
//log([key, val, r]);
		return r;
	},//prefStringSet()

	prefStringGet: function(pref, key)
	{
		let r;
		try
		{
			r = pref.getComplexValue(key, Ci.nsISupportsString).data;
		}
		catch(e)
		{
//log.error(e,{callerIndex: 0});
			try
			{
				r = pref.getStringPref(key);
			}
			catch(e)
			{
//log.error(e,{callerIndex: 0});
				try
				{
					r = pref.getComplexValue(key, Ci.nsIPrefLocalizedString).data;
				}
				catch(e)
				{
//log.error(e,{callerIndex: 0});
					r = pref.getCharPref(key);
				}
			}
		}
//log([key, r]);
		return r;
	},//prefStringGet()

	onPrefChange: {
		queue: {},
		observe: function onPrefChange_observe(aSubject, aTopic, aKey, init)
		{
			let self = mapaPlusCore;
if (!init)
	log.debug();
			if(aTopic != "nsPref:changed" || self.prefNoObserve)
				return;

			let t = aSubject.getPrefType(aKey),
					v;

			if (t == Ci.nsIPrefBranch.PREF_INT)
				v = aSubject.getIntPref(aKey);
			else if (t == Ci.nsIPrefBranch.PREF_BOOL)
				v = aSubject.getBoolPref(aKey);
			else if (t == Ci.nsIPrefBranch.PREF_STRING)
				v = self.prefStringGet(aSubject, aKey);

			if (["version", "locked"].indexOf(aKey) == -1 && self.initialized && self.pref("protect") && !self.isLoggedIn())
			{
				let inQueue = aKey in this.queue,
						dialog = self.windowFirst("Dialog");

				this.queue[aKey] = v;
				if (!inQueue)
				{
log("MP prompt for pref. " + aKey +" = " + v + " (prev: " + self.pref(aKey) + ")");
					if (!dialog)
					{
						let ok = false;
						try
						{
							self.dialogBackup = {
								dialogShow: self.dialogShow,
								dialogTemp: self.dialogTemp,
								dialogForce: self.dialogForce,
							};

							self.dialogShow = true;
							self.dialogTemp = false;
							self.dialogForce = true;
							self.tokenDB.login(false);
							ok = true;
						}
						catch(e){}
						let queue = this.queue;
						for(let p in queue)
						{
							if (ok)
								this.observe(aSubject, aTopic, queue[p]);
							else
								self.pref(p, self.pref(p))

							self.async(function()
							{
								delete queue[p];
							}, 100)
						}
					}
					else if (dialog)
					{
						self.windowFocus("Dialog");
					}
				}
				return;
			}//if protect

			self.pref.prefs[aKey] = v;
			if (aKey == "debug")
			{
				log.logLevel = self.pref("debug") || 1;
				if (log.logLevel & 4)
					self.openConsole();
			}

			if (aKey == "locktimeout" && self.pref("locktimeout") < 10)
				self.prefs.setIntPref("locktimeout", 10);

			if (aKey == "forceprompt")
				self.prefNoWorkAround = v.split(",");

//			if (aKey == "failedattempts" || aKey == "failedattemptstime")
//				mapaPlusCore.unlockIncorrect = 0;

			if (aKey == "forceprompt")
			{
				try
				{
					self.prefForcePrompt = JSON.parse(v);
				}
				catch(e)
				{
					self.prefForcePrompt = [];
				}
			}
			if (["logouthotkeyenabled", "lockhotkeyenabled", "lockwinhotkeyenabled", "locklogouthotkeyenabled",
										"logouthotkey", "lockhotkey", "lockwinhotkey", "locklogouthotkey"].indexOf(aKey) != -1)
			{
//				if (!init)
					self.prepareHotkey();

				self.windowAction("hotkeyInit", aKey, "options");
			}

			if (!init)
				this.do();
		},
		do: function onPrefChange_do(mapaPlus)
		{
			let self = mapaPlusCore;
log.debug(self.prefNoObserve);

			if(self.prefNoObserve)
				return;

			self.timerCheck.init();
			mapaPlus = mapaPlus || null;
			let id = mapaPlus && mapaPlus.windowID ? mapaPlus.windowID : 0;
//			self.prepareHotkey();
			self.windowAction("hotkeyInit", id, "Dialog");
			self.windowAction("show", "", "Window");
			self.windowAction("prefChanged", "", "Dialog");
		}
	},

/*
	onPrefChange: {
		observe: function(){},
		do: function(){}
	},
*/

	prompt: function prompt(f)
	{
log.debug();
		this.dialogBackup = {
			dialogOptions: this.dialogOptions,
			dialogTemp: this.dialogTemp,
			dialogShow: this.dialogShow,
		};
		let r = false
		if (f)
			this.logout();

		try
		{
			this.dialogShow = true;
			this.dialogTemp = false;
			this.dialogForce = true;
			this.dialogOptions = false;
			this.tokenDB.login(false);
			r = true;
		}
		catch(e){}
		return r;
	},

	command: function command()
	{
log.debug()
		this.dialogShow = false;

		this.windowBlinkCancel();

		if (this.status == 1)
		{
			this.lockDo = false;
			this.logout();
			this.timerCheck.observe();
			if (this.pref("suppress") != 2 && !this.pref_SuppressTemp)
				this.dialogShow = true;
		}
		else
		{
			this.windowAction("login", "", "Window");
		}
		this.dialogTemp = true;
		this.timerCheck.observe();
	},

	hotkeyDown: function(e)
	{
		if ("hasAttribute" in e.target && e.target.hasAttribute("hotkey"))
			return true;

		if ("mapaPlus" in e.currentTarget && e.currentTarget.mapaPlus.windowType.indexOf("Window") != -1 && "hotkeyDown" in e.currentTarget.mapaPlus)
			return e.currentTarget.mapaPlus.hotkeyDown(e);

		return true;
/*
		var keys = mapaPlusCore.getKeys(e);
		if (mapaPlusCore.matchKeys(mapaPlusCore.lastKeyDown, keys[0], 2)) //prevent repeats
			return true;

		mapaPlusCore.lastKeyDown = keys[0];
		var r = true;
		if (mapaPlusCore.matchKeys(keys[0], mapaPlusCore.prefLockHotkey, 2))
		{
			if (!mapaPlusCore.prefLockHotkeyEnabled)
				return r;

			r = false;
			e.preventDefault();
			e.stopPropagation();
			mapaPlusCore.lock();
		}
		else if (mapaPlusCore.matchKeys(keys[0], mapaPlusCore.prefLogoutHotkey, 2))
		{
			if (!mapaPlusCore.prefLogoutHotkeyEnabled)
				return r;

			r = false;
			e.preventDefault();
			e.stopPropagation();
			mapaPlusCore.command();
		}
		else if (mapaPlusCore.matchKeys(keys[0], mapaPlusCore.prefLockLogoutHotkey, 2))
		{
			if (!mapaPlusCore.prefLockLogoutHotkeyEnabled)
				return r;

			r = false;
			e.preventDefault();
			e.stopPropagation();
			mapaPlusCore.windowAction("lockLogout", "", "Window");
		}
		return r;
	//	mpc.dump("down: " + keys[0] + "\n" + mapaPlus.lastKeyDown);
*/
	},

	hotkeyPress: function hotkeyPress(e)
	{
		if ("mapaPlus" in e.currentTarget && e.currentTarget.mapaPlus.windowType.indexOf("Window") != -1 && "hotkeyPress" in e.currentTarget.mapaPlus)
			return e.currentTarget.mapaPlus.hotkeyPress(e);

	//	mpc.dump("down: " + keys[0] + "\n" + mapaPlus.lastKeyDown);
	},

	hotkeyUp: function(e)
	{
//		var keys = mapaPlusCore.getKeys(e);
		mapaPlusCore.lastKeyDown = [];

		if ("mapaPlus" in e.currentTarget && e.currentTarget.mapaPlus.windowType.indexOf("Window") != -1 && "hotkeyUp" in e.currentTarget.mapaPlus)
			return e.currentTarget.mapaPlus.hotkeyUp(e);

		return true;
	//	mapaPlus.core.dump("up: " + keys[0]);
	},

	windowListener: {
		observe: function(aSubject, aTopic, aData)
		{
			let window = aSubject.QueryInterface(Ci.nsIDOMWindow),
					windowClose = false;
			if (aTopic == "domwindowopened")
			{
/*
let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
timer.init({observe: function(e)
{
	mapaPlusCore.dump(window.location);
	if (window.location.toString().match("common"))
	{
//		window.close();
	}

	if (!window.location.toString().match("about:blank"))
	{
		timer.cancel();
		mapaPlusCore.dump(window.arguments, 2);
	}

}}, 0, timer.TYPE_REPEATING_SLACK);
//mapaPlusCore.dump(window,2);
//mapaPlusCore.dump(mapaPlusCore.dump.cache, 1);
*/
				if ("mapaPlus" in window && !window.mapaPlus.noOverlayLoaded)
				{
					if (window.mapaPlus.close)
						window.addEventListener("close", window.mapaPlus.close, true);

					if (window.mapaPlus.mouseDown)
						window.addEventListener("mousedown", window.mapaPlus.mouseDown, true);
					window.mapaPlusEventsAdded = true;
				}
				window.addEventListener("keydown", mapaPlusCore.hotkeyDown, true);
				window.addEventListener("keypress", mapaPlusCore.hotkeyPress, true);
				window.addEventListener("keyup", mapaPlusCore.hotkeyUp, true);
/*
				window.addEventListener("mousemove", mapaPlusCore.resetTimer, false);
				window.addEventListener("keydown", mapaPlusCore.resetTimer, false);
				window.addEventListener("mousedown", mapaPlusCore.resetTimer, false);
				window.addEventListener("DOMMouseScroll", mapaPlusCore.resetTimer, false);
*/
				window.addEventListener("focus", mapaPlusCore.windowFocused, true);
				let onload = function(event)
				{
					window.removeEventListener("load", onload, true);
					if (!("mapaPlus" in window) || window.mapaPlus.noOverlayLoaded)
					{
						let list = mapaPlusCore.prefForcePrompt;
						for(let i = 0; i < list.length; i++)
						{
							if (!("enabled" in list[i])
									|| (!("id" in list[i] && window.name && list[i].id == window.name)
											&& !("url" in list[i] && window.location.href == list[i].url)))
								continue;
							let param = "";
							if ("param" in list[i])
							{
								param = list[i].param.split("|");
							}
							let isParam = function(name)
							{
								return param.indexOf(name) != -1;
							}
							if ((mapaPlusCore.status == 2
									&& (mapaPlusCore.pref("suppress") == 2
											|| mapaPlusCore.pref_SuppressTemp
											|| (isParam("startup") && !mapaPlusCore.startupPassed)))
									|| isParam("always"))
							{
								let f = mapaPlusCore.dialogForce, t = mapaPlusCore.dialogTemp, ok = false;
								mapaPlusCore.dialogForce = true;
//									mapaPlusCore.dialogTemp = false;
								try
								{
									mapaPlusCore.tokenDB.login(isParam("always"));
									ok = true;
								}catch(e){}
								mapaPlusCore.dialogForce = f;
//									mapaPlusCore.dialogTemp = t;
								if (!ok && isParam("close"))
								{
									windowClose = true;
								}
							}
							break;
						}
						if (!windowClose && window.document.documentElement.ownerDocument.loadOverlay)
						{
							window.document.documentElement.ownerDocument.loadOverlay("chrome://mapaplus/content/masterpasswordplusOverlay.xul", {observe: function(e)
							{
								window.mapaPlus = window.mapaPlus || {};
								window.mapaPlus.noOverlayLoaded = true;
								let waitingCount = 0;
								(function waiting()
								{
									if (waitingCount++ < 30)
									{
										if (!("load" in window.mapaPlus))
										{
											mapaPlusCore.async(waiting, 100);
											return;
										}
									}
									window.mapaPlus.loadedManualy = true;
									try
									{
										window.mapaPlus.load();
									}catch(e){log.error(e)}
									if ("mapaPlus" in window && (!("mapaPlusEventsAdded" in window) || !window.mapaPlusEventsAdded))
									{
										if (window.mapaPlus.close)
											window.addEventListener("close", window.mapaPlus.close, true);

										if (window.mapaPlus.mouseDown)
											window.addEventListener("mousedown", window.mapaPlus.mouseDown, true);
										window.mapaPlusEventsAdded = true;
									}
								})();
							}});
						}
					}
					if (!windowClose && "mapaPlus" in window && (!("mapaPlusEventsAdded" in window) || !window.mapaPlusEventsAdded))
					{
						if (window.mapaPlus.close)
							window.addEventListener("close", window.mapaPlus.close, true);

						if (window.mapaPlus.mouseDown)
							window.addEventListener("mousedown", window.mapaPlus.mouseDown, true);
					}
					if (windowClose)
						window.close();

				}//onload()
				window.addEventListener("load", onload, true); //addEventListener("load")
			}
			else if (aTopic == "domwindowclosed")
			{
				if ("mapaPlus" in window)
				{
					window.removeEventListener("close", window.mapaPlus.close, true);
					window.removeEventListener("mousedown", window.mapaPlus.mouseDown, true);
				}
				window.removeEventListener("keydown", mapaPlusCore.hotkeyDown, true);
				window.removeEventListener("keypress", mapaPlusCore.hotkeyPress, true);
				window.removeEventListener("keyup", mapaPlusCore.hotkeyUp, true);
/*
				window.removeEventListener("mousemove", mapaPlusCore.resetTimer, false);
				window.removeEventListener("keydown", mapaPlusCore.resetTimer, false);
				window.removeEventListener("mousedown", mapaPlusCore.resetTimer, false);
				window.removeEventListener("DOMMouseScroll", mapaPlusCore.resetTimer, false);
*/
				window.removeEventListener("focus", mapaPlusCore.windowFocused, true);
			}
		},//windowListener.observe()
	},//windowListener

	quit: function()
	{
		this.quiting = true;
		try
		{
			Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup).quit(Ci.nsIAppStartup.eForceQuit);
		}
		catch(e)
		{
			Cc["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Ci.nsIPromptService).alert(null, "Master Password+", "You should not see this!\n\n" + e);
		}
	},

	deleteSettings: function()
	{
		let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
								.getService(Ci.nsIPromptService),
				flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_YES +
								prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_NO;
		let button = prompts.confirmEx(null, mapaPlusCore.addon.name, mapaPlusCore.strings.deleteSettings.replace("#", mapaPlusCore.addon.name), flags, "", "", "", null, {});
		if (!button)
		{
			try
			{
				mapaPlusCore.prefs.resetBranch('');
			}
			catch(e)
			{
				let list = mapaPlusCore.prefs.getChildList('', {});
				for(let i = 0; i < list.length; i++)
					mapaPlusCore.prefs.clearUserPref(list[i]);
			}
		}
	},

	init: function(f, mapaPlus)
	{
		f = f || false;
		if (!this.initialized)
		{
			try
			{
				this.prefs.QueryInterface(Ci.nsIPrefBranch).addObserver('', this.onPrefChange, false);
			}
			catch(e)
			{
				this.prefs.QueryInterface(Ci.nsIPrefBranch2).addObserver('', this.onPrefChange, false);
			}
		}
		this.onPrefChange.do(mapaPlus);
		this.prepareHotkey();
		if (f || !this.initialized)
		{
			this.timerCheck.init();
			this.suppressTemp.stop();
			this.dialogTemp = true;
			this.initialized = true;
		}
	},

	_asyncMap: function()
	{
		this._map = [];
		Object.defineProperty(this, "size", {
			get: function() { return this._map.length; },
			enumerable: true,
			configurable: true
		});


		this.set = function(key, val)
		{
			let obj = {},
					i = this.size;
			if (this.has(key))
			{
				i = this.getIndex(key);
				obj = this._map[i];
			}
			obj = {
				key: key,
				val: val
			};
			this._map[i] = obj;
		}

		this.has = function(key)
		{
			let r = false
			this._map.forEach(function(val, i, array)
			{
				if (val.key === key)
					r = true;
			});
			return r;
		}

		this.delete = function(key)
		{
			let l = [];
			this._map.forEach(function(val, i, array)
			{
				if (val.key === key)
				{
					array.splice(i, 1);
				}
			})
		}

		this.getIndex = function(key)
		{
			let r = -1;
			this._map.forEach(function(val, i, array)
			{
				if (val.key === key)
					r = i;
			});
			return r;
		}
	},//_asyncMap()

	__asyncMap: null,

	get asyncMap()
	{
		if (!this.__asyncMap)
		{
			try
			{
				this.__asyncMap = new Map();
			}catch(e)
			{
				this.__asyncMap = new this._asyncMap();
			}
		}
		return this.__asyncMap;
	},

	async: function async(callback, delay, timer, noreset)
	{
//log.debug();
		if (!timer)
			timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

		if (!noreset)
			timer.cancel();

		let self = this,
				prev = self.asyncMap.has(timer),
				obj = {
					delay: delay,
					callback: callback,
					observe: function()
					{
						timer.cancel();
						if (typeof(this.callback) == "function")
							this.callback();
						else
							log(this.callback, 1);

						self.asyncMap.delete(timer);
					}
				}

		self.asyncMap.set(timer, obj);
		if (prev && noreset)
			return timer;

		timer.init(obj, delay || 0, timer.TYPE_ONE_SHOT);
		return timer;
	},//async()

	openConsole: function openConsole()
	{
log.debug("to stop error console from opening on startup disable debug mode in MasterPassword+ options -> Help -> Debug level");
		AddonManager.getAllAddons(function(addons)
		{
			let win = null;
			function toOpenWindowByType(inType, uri, features)
			{
					let win = Services.wm.getMostRecentWindow(inType),
							ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
				try
				{
					if (win)
						return win;
					else if (features)
						win = ww.openWindow(null, uri, inType, features, null);
					else
						win = ww.openWindow(null, uri, inType, "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar", null);
				}
				catch(e){log.error(e)}

				return win;
			}
			addons.forEach(function(addon)
			{
				if (!addon.isActive || addon.id != "{1280606b-2510-4fe0-97ef-9b5a22eafe80}")
					return;

				try
				{
					win = toOpenWindowByType("global:console", "chrome://console2/content/console2.xul");
				}
				catch(e)
				{
		//			log.error(e)
				}
			})
			if (win)
				return;

			let _HUDService;
			try
			{
				Object.defineProperty(self, "HUDService", {
					get: function HUDService_getter() {
						let devtools = Cu.import("resource://devtools/shared/Loader.jsm", {}).devtools;
						return devtools.require("devtools/client/webconsole/hudservice");
					},
					configurable: true,
					enumerable: true
				});
				_HUDService = (HUDService.HUDService) ? HUDService.HUDService : HUDService;
			}
			catch(e)
			{
				log.error(e);
			}
			try
			{
				win = _HUDService.getBrowserConsole();
	//				HUDService.openBrowserConsoleOrFocus();
				if (win)
					return;
			}
			catch(e)
			{
				log.error(e)
			}

			try
			{
				win = _HUDService.openBrowserConsoleOrFocus();
				if (win)
					return;
			}
			catch(e)
			{
				log.error(e)
			}

			try
			{
				win = _HUDService.toggleBrowserConsole();
				if (win)
					return;
			}
			catch(e)
			{
				log.error(e);
			}

			try
			{
				win = toOpenWindowByType("global:console", "chrome://global/content/console.xul")
				if (win)
					return;
			}
			catch(e)
			{
				log.error(e)
			}
		});
	},//openConsole()

	
	isWsLocked: null,
}//mapaPlusCore


function include(path)
{
	Services.scriptloader.loadSubScript(mapaPlusCore.addon.getResourceURI(path).spec, self);
}
mapaPlusCore.pref.timers = {};
mapaPlusCore.pref.prefs = {}; //this will hold cached preferences.
mapaPlusCore.pref.types = {
	boolean: "Bool",
	number: "Int",
//	string: "Char"
}

//work around for a bug in FF/TB58 where default settings are not initialized
//https://bugzilla.mozilla.org/show_bug.cgi?id=1414398
//https://bugzilla.mozilla.org/show_bug.cgi?id=1423243
try
{
	mapaPlusCore.prefsDefault.getBoolPref("logouttimer");
}
catch(e)
{
	let obj = {
		pd: Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getDefaultBranch(""),
		types: {
			boolean: "Bool",
			number: "Int"
		},
		pref: function pref(key, val)
		{
			let type = this.types[typeof(val)];
			try
			{
				if (type)
					this.pd["set" + type + "Pref"](key, val);
				else
					mapaPlusCore.prefStringSet(this.pd, key, val);
			}
			catch(e)
			{
				log([key, val]);
				log(e);
			}
		}
	};
	Services.scriptloader.loadSubScript(Components.stack.caller.filename.replace("/components/masterPasswordPlusComponents.js", "/defaults/preferences/masterpasswordplus.js"), obj);
}

var __dumpName__ = "log";
log = {};
Services.scriptloader.loadSubScript("chrome://mapaplus/content/dump.js", log);
/*
var mozIJSSubScriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
                            .getService(Ci.mozIJSSubScriptLoader);
mozIJSSubScriptLoader.loadSubScript("chrome://mapaplus/content/dump.js", log)
*/
mapaPlusCore.log = log;
mapaPlusCore.dump = log;
log.folder = "";
log.title = "MP+";
log.showCaller = 3;
log.logLevel = 1;

let l = mapaPlusCore.prefs.getChildList("");
for(let i in l)
	mapaPlusCore.onPrefChange.observe(mapaPlusCore.prefs, "nsPref:changed", l[i], true);

AddonManager.getAddonByID(mapaPlusCore.GUID, function(addon)
{
	mapaPlusCore.addon = addon;
	include("chrome/content/constants.js");
	mapaPlusCore.EMAIL = EMAIL;
	mapaPlusCore.HOMEPAGE = HOMEPAGE;
	mapaPlusCore.SUPPORTSITE = SUPPORTSITE;
	mapaPlusCore.SUPPORTSITEQUERY = SUPPORTSITEQUERY;
	mapaPlusCore.ISSUESSITE = ISSUESSITE;
	mapaPlusCore.ADDONDOMAIN = ADDONDOMAIN;
//	mapaPlusCore.isTB = (mapaPlusCore.appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}");
});
mapaPlusCore.isTB = (mapaPlusCore.appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}" || mapaPlusCore.appInfo.ID == "postbox@postbox-inc.com");
mapaPlusCore.isGecko2 = Cc["@mozilla.org/xpcom/version-comparator;1"]
												.getService(Ci.nsIVersionComparator)
												.compare(mapaPlusCore.appInfo.version, (mapaPlusCore.isTB ? "3.3" : "4.0")) >= 0

mapaPlusCore.isFF4 = (!mapaPlusCore.isTB && mapaPlusCore.isGecko2);

mapaPlusCore.KB = null;
mapaPlusCore.WL = null;
let a = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);
if (a.OS == "WINNT" && mapaPlusCore.isGecko2)
{
	//keyboard language code borrowed from TabLang addon: https://addons.mozilla.org/addon/tablang/
	(mapaPlusCore.KB = {
		GetKeyboardLayout: null,
		GetLocaleInfoW: null,
		init: function()
		{
			Cu.import("resource://gre/modules/ctypes.jsm", this);
			let ctypes = this.ctypes;
			let abi = a.XPCOMABI.indexOf("x86_64") == -1 ? ctypes.winapi_abi : ctypes.default_abi;
			this.GetKeyboardLayout = ctypes.open("user32.dll").declare("GetKeyboardLayout", abi, ctypes.uintptr_t, ctypes.uint32_t);
			this.GetLocaleInfoW = ctypes.open("kernel32.dll").declare("GetLocaleInfoW", abi, ctypes.int32_t, ctypes.uint32_t, ctypes.uint32_t, ctypes.jschar.ptr, ctypes.int32_t);
		},
		getLangNameAbr: function()
		{
			try
			{
				let ctypes = this.ctypes;
				let lcid = ctypes.UInt64.lo(ctypes.UInt64("0x" + this.GetKeyboardLayout(0).toString(16))) & 0xFFFF;
				let bufferLength = this.GetLocaleInfoW(lcid, 89, ctypes.jschar.ptr(0), 0);
				if (bufferLength == 0)
					return;

				let buffer = ctypes.jschar.array(bufferLength)();
				if (this.GetLocaleInfoW(lcid, 89, ctypes.cast(buffer.address(), ctypes.jschar.ptr), bufferLength) != 0)
					return buffer.readString();
			}
			catch(e){};
		}
	}).init();

	// detect if workstation is locked
	(function()
	{
		try
		{
			Cu.import("resource://gre/modules/ctypes.jsm");
			let lib              = ctypes.open("user32.dll"),
					openInputDesktop = lib.declare("OpenInputDesktop", ctypes.winapi_abi, ctypes.uint32_t, ctypes.uint32_t, ctypes.bool, ctypes.uint32_t),
					closeDesktop     = lib.declare("CloseDesktop", ctypes.winapi_abi, ctypes.bool, ctypes.uint32_t),
					isWsLocked       = {};

			Object.defineProperty(mapaPlusCore, "isWsLocked", {
				get: function()
				{
					let desktop = openInputDesktop(0, false, 0x0001);
					closeDesktop(desktop);
					return desktop != 0;
				}
			});
			mapaPlusCore.unload(function()
			{
				lib.close()
			})
		}catch(e){log.error(e)};
	})();
}
else
{
	mapaPlusCore.pref("showlang", 0);
}
let idleService = Cc["@mozilla.org/widget/idleservice;1"].getService(Ci.nsIIdleService),
		observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),
		sleep_notification = {
			observe: function sleep_notification(subject, topic, data)
			{
				log.debug(Date());
				if (mapaPlusCore.pref("logoutonsleep"))
				{
					mapaPlusCore.logout();
				}

				if (mapaPlusCore.pref("lockonsleep"))
				{
						mapaPlusCore.lock();
				}
			}
		};
mapaPlusCore.idleService = idleService;

//ask for master password on startup
(mapaPlusCore.startupPass = function()
{

//open console window on startup
/*
	if (mapaPlusCore.pref("debug") & 4)
	{
		mapaPlusCore.openConsole();
	}
*/
	mapaPlusCore.status = mapaPlusCore.tokenDB.needsLogin() ? 1 : 0;
	if (mapaPlusCore.pref("startup"))
	{
		let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
		try
		{
			mapaPlusCore.dialogShow = true;
			mapaPlusCore.dialogTemp = false;
			mapaPlusCore.dialogForce = false;
//			mapaPlusCore.pref("nonlatinwarning") = mapaPlusCore.pref("nonlatinwarning");
			mapaPlusCore.pref("showlang", mapaPlusCore.KB ? mapaPlusCore.pref("showlang") : 0);

//workaround for issue https://github.com/vanowm/MasterPasswordPlus/issues/136
			let anticrash;
			try{anticrash = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher).openWindow(null, null, null, null, null);}catch(e){}

			mapaPlusCore.tokenDB.login(false);

			if (anticrash)
				anticrash.close();

			mapaPlusCore.locked = false;
			mapaPlusCore.startupPassed = true;
			if (mapaPlusCore.pref("startupshort"))
			{
				let timeout = mapaPlusCore.pref("startuptimeout");
				if (timeout)
					mapaPlusCore.forced = timeout;
				else
					mapaPlusCore.logout();
			}
		}
		catch(e)
		{
			let i = mapaPlusCore.pref("startupincorrect");
			var sf = mapaPlusCore.pref("startupfail");
			if ((i && mapaPlusCore.startupIncorrect >= i) || (sf == mapaPlusCore.STARTUP_QUIT && !mapaPlusCore.startupPassed))
			{
				mapaPlusCore.quit();
				return;
			}
			else
			{
				if (sf == mapaPlusCore.STARTUP_LOCK && !mapaPlusCore.startupPassed)
					mapaPlusCore.lock();

				mapaPlusCore.startupPassed = true;
			}
		}
	}
	else
	{
		mapaPlusCore.startupPassed = true;
	}
})();

mapaPlusCore.dialogTemp = true;
mapaPlusCore.dialogForce = false;
mapaPlusCore.dialogShow = false;
mapaPlusCore.observer = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).addObserver(mapaPlusCore, "quit-application", false);

let listener = {
	onUninstalling: function(addon)
	{
		if (addon.id == "masterpasswordtimeoutplus@vano")
		{
			if (mapaPlusCore.tokenDB.needsLogin() && !mapaPlusCore.prompt(true))
				addon.cancelUninstall();
			else
				mapaPlusCore.deleteSettings();
		}
	},
	onDisabling: function(addon, restart)
	{
		if (mapaPlusCore.tokenDB.needsLogin() && addon.id == "masterpasswordtimeoutplus@vano")
		{
			if (!mapaPlusCore.prompt(true))
				addon.userDisabled = false;
		}
	}
}
AddonManager.addAddonListener(listener);
observerService.addObserver(sleep_notification, "sleep_notification", false);
observerService.addObserver(sleep_notification, "wake_notification", false);
Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher)
	.registerNotification(mapaPlusCore.windowListener);


//attempt track opening xul windows inside a tab. Currently fails with e10s enabled.

/*
domObserver = {
	observe:function observe(aSubject, aTopic, aData)
	{
log([aSubject, aTopic, aData, aSubject.location]);
//log(aSubject, 1)
		let window;
		if (aTopic == "chrome-document-global-created")
			window = aSubject;
		else
			window = aSubject.QueryInterface(Ci.nsIDOMWindow).content;
//		log(window,1)
		if (!window)
			return;
log([aSubject.location, window.location]);
return;
		let load = function load(e)
		{
if (window.mapaPlus && "__closing" in window.mapaPlus)
log(window.mapaPlus, 1);
			if (window.mapaPlus && window.mapaPlus.__closing)
			{
				window.close();
				return;
			}
			let list = mapaPlusCore.prefForcePrompt;
//log(list,1)
log([window.document.readyState, window.location, window.mapaPlus])

			for(let i = 0; i < list.length; i++)
			{
				if (!("enabled" in list[i])
						|| (!("id" in list[i] && window.name && list[i].id == window.name)
								&& !("url" in list[i] && window.location.href == list[i].url)))
					continue;
				let param = "";
				if ("param" in list[i])
				{
					param = list[i].param.split("|");
				}
				let isParam = function(name)
				{
					return param.indexOf(name) != -1;
				}
if (!window.mapaPlus)
	window.mapaPlus = {
		__passed: false,
		__closing: false
	};

log(window.mapaPlus, 1);
				if (!window.mapaPlus.__passed && ((mapaPlusCore.status == 2
						&& (mapaPlusCore.pref("suppress") == 2
								|| mapaPlusCore.pref_SuppressTemp
								|| (isParam("startup") && !mapaPlusCore.startupPassed)))
						|| isParam("always")))
				{
log("OK");
					let f = mapaPlusCore.dialogForce, t = mapaPlusCore.dialogTemp, ok = false;
					mapaPlusCore.dialogForce = true;
//									mapaPlusCore.dialogTemp = false;
					try
					{
						mapaPlusCore.tokenDB.login(isParam("always"));
						ok = true;
					}catch(e){}
					mapaPlusCore.dialogForce = f;
//									mapaPlusCore.dialogTemp = t;
					if (!ok && isParam("close"))
					{
						if (e)
						{
							e.stopPropagation();
							e.preventDefault();
						}
						window.mapaPlus.__closing = true;
						window.close();
log("close");
//log(window.document, 1);
					}
					if (ok)
					{
						window.mapaPlus.__passed = true;
					}
				}
				break;
			}//for
		}//load()
log([window.document.readyState, window.location, window.mapaPlus])
		if (window.document.readyState != "complete")
		{
			window.addEventListener("load", load, false)
		}
		if (window.location.href != "about:blank")
			load();
	}
}
//Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService)
//	.addObserver(domObserver, "content-document-global-created", false);
Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService)
	.addObserver(domObserver, "chrome-document-global-created", false);
*/
