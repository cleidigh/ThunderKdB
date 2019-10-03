(function()
{
let {classes: Cc, interfaces: Ci, utils: Cu} = Components,
		log = mapaPlus.core.log;
function $(id)
{
	return document.getElementById(id);
}
if (!mapaPlus.core.startupPassed)
{
	window.close();
}
if (!mapaPlus.core.isTB)
	mapaPlus.ss = Cc["@mozilla.org/browser/sessionstore;1"]
								.getService(Ci.nsISessionStore);
mapaPlus.last = null;
mapaPlus.initialized = false;
mapaPlus.windowID = 0;
mapaPlus.windowType = "Window";
mapaPlus.window = window;
mapaPlus.blocked = 'masterPasswordPlusBlocked';
mapaPlus.locked = false;
mapaPlus.lockedWindow = false;
mapaPlus.lockedWindowClicked = false;
mapaPlus.lockedLogout = false;
mapaPlus.lockedTitleOrig = null;
mapaPlus.lockedAttr = null;
mapaPlus.lockedTitleObj = null;
mapaPlus.workAround = {};
mapaPlus.lockList = [];
mapaPlus.first = false;
mapaPlus.showChanges = false;
mapaPlus.lastKeyDown = [];
mapaPlus.suppressedPopupBox = {};
mapaPlus.onLoadArray = [];
mapaPlus.showUnlockArray = [];
mapaPlus.commands = ["action", "lock_window", "lock", "lock_logout", "logout", "notset"];
mapaPlus.windowState = null;
mapaPlus.styleBackup = {};
mapaPlus.titleTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
mapaPlus.loaded = new Date();
mapaPlus.loadedManualy = false;
mapaPlus.Win7Features = null;
mapaPlus.MinTrayR = null;
mapaPlus.noLockWindow = false;
mapaPlus.minimizeXY = -32000;

(mapaPlus.observer = {
	_observerService: Cc["@mozilla.org/observer-service;1"]
														.getService(Ci.nsIObserverService),
	_name: "mapaPlusWindow",
	init: function()
	{
		this._observerService.addObserver(this, this._name, false);
		window.addEventListener("unload", function() { mapaPlus.observer.uninit(); }, false);
	},

	uninit: function observer_window_uninit()
	{
log.debug();
		this._observerService.removeObserver(this, this._name);
		if (mapaPlus.core.prev != mapaPlus.core.status)
			mapaPlus.core.timerCheckObserver();
	},

	observe: function(aSubject, aTopic, aData)
	{
		aSubject.QueryInterface(Ci.nsISupportsString);
//	log("observe: " + aSubject.data, true);
		if (aTopic != this._name || !mapaPlus[aSubject.data])
			return;
		mapaPlus[aSubject.data](aData);
	},
}).init();

mapaPlus.show = function show()
{
log.debug();
	if ($("mapa_statusbar"))
		$("mapa_statusbar").hidden = !this.core.pref("statusbar");

	if ($("mapa_menu_tools"))
		$("mapa_menu_tools").hidden = !this.core.pref("toolsmenu");

	if (!this.core.isTB)
	{
		if ($("mapa_menu_context"))
			$("mapa_menu_context").hidden = !this.core.pref("contextmenu");

		if ($("mapa_urlbar"))
		{
			$("mapa_urlbar").hidden = !this.core.pref("urlbar");

			let id = this.core.pref("urlbarpos"),
					direction = id.substr(0,1) == "1";
			id = id.substr(1, id.length);
			(this.setIcon({container:"urlbar-icons", element:"mapa_urlbar", idDefault:"go-button", directionDefault:0, id:id, direction:direction})
				|| this.setIcon({container:"page-action-buttons", element:"mapa_urlbar", idDefault:"go-button", directionDefault:0, id:id, direction:direction})
			)

			id = this.core.pref("statusbarpos");
			direction = id.substr(0,1) == "1";
			id = id.substr(1, id.length);
			this.setIcon({container:"status-bar", element:"mapa_statusbar", idDefault:"", directionDefault:1, id:id, direction:direction});
		}
	}
//	this.menuAddHotkeys();
};

mapaPlus.setIcon = function setIcon(o)
{
log.debug();
	let container = $(o.container);
	if (!container)
		return false;

log.debug("next");

	let icons = container.childNodes,
			first = null,
			last = null,
			sel = null;

	for(let i = 0; i < icons.length; i++)
	{
		if (o.id == icons[i].id)
			sel = icons[i].id;

		if (!first && icons[i].id != o.element)
			first = icons[i].id;

		if (!last || (last && icons[i].id != o.element))
			last = icons[i].id;
	}
	first = first || o.directionDefault;
	last = last || o.directionDefault;
	if (o.id == "mapapl")
	{
		sel = o.direction ? last : first;
	}
	if (!sel)
	{
		o.id = o.idDefault;
		o.direction = o.directionDefault;
	}
	else
	{
		o.id = sel;
	}
	let u = $(o.element);
	if (o.id)
	{
		if (o.direction)
		{
			$(o.container).insertBefore(u.parentNode.removeChild(u), $(o.id).nextSibling);
		}
		else
		{
			$(o.container).insertBefore(u.parentNode.removeChild(u), $(o.id));
		}
	}
	else
	{
		$(o.container).appendChild(u.parentNode.removeChild(u));
	}
	let remove;
	if (o.direction)
	{
		o.direction = "insertafter";
		remove = "insertbefore";
	}
	else
	{
		o.direction = "insertbefore";
		remove = "insertafter";
	}
	$(o.element).setAttribute(o.direction, o.id);
	$(o.element).removeAttribute(remove);
	return true;
}

mapaPlus.setProp = function(id, name, value)
{
	if ($(id))
		$(id)[name] = value;
};
mapaPlus.setAttr = function(id, name, value)
{
	if ($(id))
		$(id).setAttribute(name,value);
};

mapaPlus.removeAttr = function(id, name)
{
	if ($(id))
		$(id).removeAttribute(name);
};

mapaPlus.setTooltip = function(t)
{
	var s = s || false;
	t = this.strings[t];
	this.setProp("mapa_tooltip_text", "value", t);
	this.setAttr("mapa_menu_tools", "label", t);
	this.setAttr("mapa_menu_context", "label", t);
	this.setAttr("mapa_menu_action", "label", t);
};

mapaPlus.getTooltip = function(r)
{
	let cmd = this.core.pref("command");
	if (!this.core.status)
		cmd = 5;
	else if (this.core.pref("commandloggedin") && this.core.status == 2)
		cmd = 0;
	else if (!this.core.pref("command") && this.core.status != 2)
		cmd = 4;

	cmd = "mapa_menu_" + this.commands[cmd];
	$("mapa_tooltip_text").setAttribute("value", this.strings[cmd]);
	if (r)
	{
		this.tooltip.cancel();
		$("mapa_tooltip_timer_box").hidden = true;
		$("mapa_tooltip_timer_lock_box").hidden = true;
		$("mapa_tooltip_menu").hidePopup();
		return false;
	}
	else
	{
		return this.tooltip.init();
	}
}

mapaPlus.showTooltip = function()
{
	var logout = ((!this.core.pref("logouttimer") && !this.core.forced) || this.core.status != 1);
	var lock = (!this.core.pref("locktimer") || this.core.locked || !this.core.status);
	$("mapa_tooltip_timer_box").hidden = logout;
	$("mapa_tooltip_timer_lock_box").hidden = lock;
	$("mapa_tooltip_menu_timer_box").hidden = logout;
	$("mapa_tooltip_menu_timer_lock_box").hidden = lock;
	$("mapa_tooltip_timer").value = this.core.timeString;
	$("mapa_tooltip_menu_timer").value = this.core.timeString;
	$("mapa_tooltip_timer_lock").value = this.core.timeLockString;
	$("mapa_tooltip_menu_timer_lock").value = this.core.timeLockString;
	return (logout && lock);
}

mapaPlus.tooltip = {
	timer: Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
	init: function()
	{
		if (mapaPlus.showTooltip())
		{
			$("mapa_tooltip_menu").hidePopup();
			return false;
		}

		this.timer.init(this, mapaPlus.core.timerDelay, this.timer.TYPE_REPEATING_SLACK);
		window.addEventListener("unload", this.cancel, false);
		return true;
	},
	observe:function()
	{
		if (mapaPlus.showTooltip())
		{
			mapaPlus.getTooltip(1);
		}
	},
	cancel: function()
	{
		mapaPlus.tooltip.timer.cancel();
	}
}

mapaPlus.setStyle = function(status)
{
	this.setAttr("mapa_toolbar_button", "status", status);
	this.setAttr("mapa_menu_tools", "status", status);
	this.setAttr("mapa_statusbar", "status", status);
	this.setAttr("mapa_menu_context", "status", status);
	this.setAttr("mapa_urlbar", "status", status);
	this.setAttr("masterPasswordPlus_lock_icon", "status", status);

	if (this.core.isTB || typeof(gBrowser) == "undefined")
		return;

	var boxId = gBrowser.getNotificationBox ? gBrowser.getNotificationBox().getNotificationWithValue(this.blocked) : null;
	if (boxId)
		boxId.setAttribute("status", status);
};

mapaPlus.blink = function(cancel)
{
/*
	if (typeof(this.core) == "undefined")
	{
		log("Error in " + (new Error).fileName + " [line " + (new Error).lineNumber + "]\n" + e + "\nYou should never see this. If you know how to reproduce this error please post at https://github.com/vanowm/MasterPasswordPlus/issues");
		this.loadCore();
	}
*/
	this.setAttr("mapa_toolbar_button",				"suppressed", this.core.suppressedIcon);
	this.setAttr("mapa_menu_tools",						"suppressed", this.core.suppressedIcon);
	this.setAttr("mapa_statusbar",						"suppressed", this.core.suppressedIcon);
	this.setAttr("mapa_menu_context",					"suppressed", this.core.suppressedIcon);
	this.setAttr("mapa_urlbar",							"suppressed", this.core.suppressedIcon);

	if (this.core.isTB || typeof(gBrowser) == "undefined")
		return;

	var boxId = gBrowser.getNotificationBox ? gBrowser.getNotificationBox().getNotificationWithValue(this.blocked) : null;
	if (boxId)
		boxId.setAttribute("suppressed", (this.core.suppressedIcon || cancel));
};

mapaPlus.blinkCancel = function()
{
/*
	if (typeof(this.core) == "undefined")
	{
		log("Error in " + (new Error).fileName + " [line " + (new Error).lineNumber + "]\n" + e + "\nYou should never see this. If you know how to reproduce this error please post at https://github.com/vanowm/MasterPasswordPlus/issues");
		this.loadCore();
	}
*/
	this.core.dialogSuppress = false;
	this.core.suppressedIcon = false;
	this.blink(true);
}

mapaPlus.suppressedPopupSuspend = function()
{
	this.core.suppressedPopupStop = true;
	this.suppressedPopupRemove();
}

mapaPlus.suppressedPopupRemove = function()
{
	if (typeof(gBrowser) == "undefined" || !gBrowser.getNotificationBox)
		return;

	let box = gBrowser.getNotificationBox(),
			boxId = box.getNotificationWithValue(this.blocked);

	if (boxId)
		box.removeNotification(boxId);
}

mapaPlus.suppressedPopupOptions = function()
{
	this.suppressedPopupRemove();
	this.options();
}

mapaPlus.suppressedPopup = function(f, t)
{
	if (this.core.isTB || (this.core.suppressedPopupStop && !f) || typeof(gBrowser) == "undefined")
		return;

	t = typeof(t) != "undefined" ? t : this.core.pref("suppresspopupremove");
	let box = gBrowser.getNotificationBox(),
			boxId = box.getNotificationWithValue(this.blocked);
	if (f && boxId)
	{
		box.removeNotification(boxId);
		boxId = null;
	}

	if(f || !boxId)
	{
		$("mapa_resettemp").hidden = !(this.core.pref_SuppressTemp);

		boxId = box.appendNotification(this.strings.MasterPasswordSuppressed,
			this.blocked,
			'',
			box.PRIORITY_WARNING_LOW,
			[{
				label: this.strings.unlock,
				accessKey: null,
				popup: null,
				callback: this.login2
			},
			{
				label: this.strings.options,
				accessKey: null,
				popup: "mapa_blocked",
				callback: null
			}]
		);
		boxId.id = (new Date()).getTime();
	}
	if (t > 0)
	{
		this.suppressedPopupRemoveTimer(t, box, boxId);
	}
}

mapaPlus.suppressedResetTemp = function()
{
	this.suppressedPopupRemove();
	this.core.suppressTemp.stop();
	this.login2();
}

mapaPlus.suppressedPopupRemoveTimer = function(t, box, boxId)
{
	let timer;
	if (this.suppressedPopupBox[boxId.id])
	{
		timer = this.suppressedPopupBox[boxId.id];
		timer.cancel();
	}
	else
	{
		timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
		this.suppressedPopupBox[boxId.id] = timer;
	}
	timer.init({observe: function() {try{mapaPlus.suppressedPopupBox[boxId.id]=null;box.removeNotification(boxId)}catch(e){}}}, t*1000, timer.TYPE_ONE_SHOT);
	window.addEventListener("unload", function(){timer.cancel()}, false);
}

mapaPlus.suppressed = function()
{
	if (this.core.locked)
		return;

/*
	if (typeof(this.core) == "undefined")
	{
		log("Error in " + (new Error).fileName + " [line " + (new Error).lineNumber + "]\n" + e + "\nYou should never see this. If you know how to reproduce this error please post at https://github.com/vanowm/MasterPasswordPlus/issues");
		this.loadCore();
	}
*/
	var date = new Date();
	if (date.getTime() < this.core.suppressedLast + 1000)
	{
		this.core.suppressedLast = date.getTime();
		return;
	}
	this.core.suppressedLast = date.getTime();
	if (this.core.pref("suppresssound"))
		this.core.suppressedSound();

	if (this.core.pref("suppresspopup"))
		this.suppressedPopup();
}

mapaPlus.command = function command(manual, button)
{
log.debug();
	this.core.dialogShow = false;
	manual = (manual > 0) ? manual : false;
	let command = button ? this.core.pref("command") : 0;
	if ((manual && manual != 2 && !this.core.status) || (this.core.pref("commandloggedin") && this.core.status != 1))
		command = 0;

	if (!manual && !this.core.pref("logouttimer"))
		return;

	switch(command)
	{
		case 1:
				this.lock(true);
				return;
			break;
		case 2:
				this.lock();
				return;
			break;
		case 3:
				this.lock(false, true);
				return;
			break;
	}
	if (manual)
		this.core.windowBlinkCancel();

	if (manual && manual != 2 && !this.core.status)
	{
		this.changemp();
	}
	else
	if (this.core.status == 1)
	{
		if (manual)
		{
			this.logout();
		}
	}
	else
	{
		if (manual)
		{
			if (this.core.locked)
				this.unlock();
			else
				this.login();
		}
	}
	this.core.dialogTemp = true;
	this.core.timerCheck.observe();
	this.update();
}//command()

mapaPlus.logout = function()
{
	this.core.lockDo = false;
	this.core.logout();
	this.core.timerCheck.observe();
	if (this.core.pref("suppress") != 2 && !this.core.pref_SuppressTemp)
		this.core.dialogShow = true;
}

mapaPlus.minimizedLockFix = function(restore)
{
	mapaPlus.windowMinimizedForced = true;
	let	x = mapaPlus.screenX,
			y = mapaPlus.screenY

	if (mapaPlus.core.pref("minimizenoflicker"))
		x = y = mapaPlus.minimizeXY;

	window.screenX = x;
	window.screenY = y;
	window.document.documentElement.setAttribute("screenX", mapaPlus.screenX)
	window.document.documentElement.setAttribute("screenY", mapaPlus.screenY)
//	window.restore();
	if (restore)
	{
/*
		window.screenX = mapaPlus.screenX;
		window.screenY = mapaPlus.screenY;
try
{
	mapaPlus.Win7Features.AeroPeek.previews.forEach(function(preview)
	{
		let controller = preview.controller.wrappedJSObject;
		if (controller.win == window)
			controller.destroy();
	});
}catch(e){};
*/
//		try{mapaPlus.Win7Features.AeroPeek.onCloseWindow(window)}catch(e){log.error(e)};
/*
for(let i =0, w=mapaPlus.Win7Features.AeroPeek.windows; i < w.length; i++)
{
	if (w[i].win == window)
		w.splice(i, 1);
}
*/
		try{mapaPlus.Win7Features.AeroPeek.onOpenWindow(window)}catch(e){};
		window.screenX = x;
		window.screenY = y;
		window.document.documentElement.setAttribute("screenX", mapaPlus.screenX)
		window.document.documentElement.setAttribute("screenY", mapaPlus.screenY)
	}
	mapaPlus.core.async(function()
	{
		window.minimize();
		mapaPlus.core.async(function()
		{
			mapaPlus.windowMinimizedForced = false;
		});
	},100);
}

/*
mapaPlus.minimizedLockFix = function(restore)
{
	return;
	if (!mapaPlus.MinTrayR)
	{
		mapaPlus.windowMinimizedForced = true;
		window.screenX = -32000;
		window.screenY = -32000;
		window.restore();
	}
	if (restore)
	{
		try{this.Win7Features.AeroPeek.onOpenWindow(window)}catch(e){};
	}
	if (mapaPlus.MinTrayR)
		return;

	let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
	timer.init({observe:function()
	{
		window.minimize();
		mapaPlus.windowMinimizedForced = false;
	}}, 0, timer.TYPE_ONE_SHOT);
}
*/

mapaPlus.extraElements = ["_selector", "_paneDeck", "_buttons", "_wizardButtons", "_deck", "_wizardHeader"];

mapaPlus.showLock = function showLock(delay)
{
log.debug();
	let self = mapaPlus;

	//work around 
	if (!self.initialized)
		self.init();

	let identify = mapaPlus.core.appInfo.name;
	if (self.core.pref("identify"))
		identify = self.core.pref("identify");

	let title = self.strings.lockinfo.replace("#", identify);
	$("masterPasswordPlusUnLockInfo").value = title;

//if (mapaPlus.core.pref("debug") & 4 && window.location.toString().match("chrome://inspector/")) return;
	if (window.location && mapaPlus.core.pref("debug") & 4
			&& ["chrome://devtools/content/webconsole/webconsole.xul",
					"chrome://console2/content/console2.xul",
					].indexOf(window.location.toString()) > -1
			)
		return;

	if (self.locked || (!self.lockedWindow && self.noLockWindow))
		return;

	self.locked = true;
	if (!self.lockedWindow)
		self.core.locked = true;
	else
		try
		{
			if (!self.loadedManualy)
				self.ss.setWindowValue(window, "lockedWindow", self.lockedWindow.toString());
		}
		catch(e){log.error(e)};

	if (self.core.pref("lockhidetitle"))
	{

		try
		{
			let l = window.location.href.toString();
			if(document.documentElement.getAttribute("title"))
			{
				self.lockedTitleAttr = true;
				self.lockedTitleObj = document.documentElement;
			}
			else
				self.lockedTitleObj = (self.core.isTB) ? window.document : ("gBrowser" in window ? window.gBrowser.contentDocument : window);

			let titleUpdate = function()
			{
				let titleObj = self.lockedTitleObj;
				try
				{
					let t = self.lockedTitleAttr ? titleObj.getAttribute("title") : titleObj.title;
					if (t != title)
					{
						self.lockedTitleOrig = t;

						if (self.lockedTitleAttr)
							titleObj.setAttribute("title", title);
						else
							titleObj.title = title;

					}
				}
				catch(e){log.error(e);self.titleTimer.cancel();}
			}
			titleUpdate();
			self.titleTimer.init({observe:titleUpdate}, 100, self.titleTimer.TYPE_REPEATING_SLACK);
			window.addEventListener("unload", self.titleTimer.cancel, false);
		}
		catch(e){log.error(e);}
	}
	let o = $("titlebar"); //FF4 with no menubar
	if (o)
	{
		o = o.firstChild.boxObject.height + "px";
		$("masterPasswordPlusLock").style.top = o;
		$("masterPasswordPlusLockBox").style.top = o;
		$("masterPasswordPlusLockBox2").style.top = o;
	}
	self.core.workAround.do("off", self);
	$('masterPasswordPlusLock').parentNode.hidden = false;
	$('masterPasswordPlusUnLockInput').focus();
	let win = document.documentElement;
	if (self.core.style.MozAppearance)
	{
		self.styleBackup.MozAppearance = win.style.MozAppearance;
		self.styleBackup.backgroundColor = win.style.backgroundColor;
		win.style.MozAppearance = self.core.style.MozAppearance;
		win.style.backgroundColor = self.core.style.backgroundColor;
	}

	let n = win.childNodes;
	for(let i = 0; i < n.length; i++)
	{
		if (n[i].id != "masterPasswordPlusLock" && n[i].id != "titlebar")
		{
			if (n[i].firstChild && n[i].firstChild.id == "masterPasswordPlusLock")
				continue;

			if (!n[i].style)
				continue;

			n[i]._mapaVisibility = n[i].style.visibility;
//			n[i].setAttribute("mapaVisibility", n[i].style.visibility);
			n[i].style.visibility = "hidden";
		}
	}
	self.extraElements.forEach(function hide(c, i, t, o)
	{
		if (c == "_buttons")
		{
			if (!o)
			{
				o = win;
				if (!(c in o))
					return;

				for(i in o[c])
					hide("_buttons", 0, 0, o[c][i]);

				return;
			}

		}
		else
		{
			o = win;
			if (!(c in o))
				return;

			o = o[c];
		}
		o._mapaVisibility = o.style.visibility;
//		o.setAttribute("mapaVisibility", o.style.visibility);
		o.style.visibility = "hidden";
	});

	let change = function(obj)
	{
		obj.setAttribute("mapaDisplay", obj.style.display);
		obj.style.display = "none";
	}
	for(let i = 0; i < self.lockList.length; i++)
	{
		n = $(self.lockList[i].id);
		if (!n)
			continue;

		if (self.lockList[i].exclude.length > 0)
		{
			let c = n.childNodes,
					changed = false;
			for(let l = 0; l < c.length; l++)
			{
				if (c[l].id && self.lockList[i].exclude.indexOf(c[l].id) != -1)
					continue;

				changed = true;
				change(c[l]);
			}
			if (!changed && self.lockList[i].exclude.indexOf(n.id) == -1)
				change(n);
		}
		else
		{
			change(n);
		}
	}

	try
	{
		if (self.Win7Features)
		{
			try{self.Win7Features.AeroPeek.onCloseWindow(window)}catch(e){}
			function remove()
			{
				try
				{
//work around for a bug that doesn't remove taskbar aero preview of minimized windows
					let windowState = window.windowState;
/*
					if (windowState == window.STATE_MINIMIZED || (window.screenX == -32000 && window.screenY == -32000))
						windowState = window.STATE_MINIMIZED;
*/
					let min = windowState == window.STATE_MINIMIZED;
					
/*
mapaPlus.Win7Features.AeroPeek.previews.forEach(function(preview)
{
	let controller = preview.controller.wrappedJSObject;
	if (controller.win == window)
		controller.resetCanvasPreview();
});
*/
/*
for(let i =0, w=self.Win7Features.AeroPeek.windows; i < w.length; i++)
{
	if (w[i].win == window)
	{
		w[i].previews.forEach(function(val, key, map)
		{
log([val, key, map]);
//w[i].enabled = false;
		})
//		w[i].destroy();
	}
}
*/
					if (min)
						self.core.async(self.minimizedLockFix);
				}catch(e){log.error(e)};
			}
			if (delay)
			{
				self.core.async(remove, 100);
			}
			else
				remove();
		}
	}catch(e){log.error(e)};

	let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
	timer.init({observe: function()
	{
		if (!mapaPlus.core.pref("showlang") || (mapaPlus.core.pref("showlang") == 2 && !mapaPlus.core.windowFullScreen()))
		{
			$("mapaPlusLang").collapsed = true;
			return;
		}
		try
		{
			var l = mapaPlus.core.KB.getLangNameAbr().toUpperCase();
			if ($("mapaPlusLang").value != l || $("mapaPlusLang").collapsed)
			{
				$("mapaPlusLang").collapsed = false;
				$("mapaPlusLang").value = l;
			}
		}
		catch(e)
		{
//				mapaPlus.dump(e, 1);
		}
	}}, 100, timer.TYPE_REPEATING_SLACK);
	mapaPlus.langTimer = timer;

}//showLock()

mapaPlus.showUnlock = function showUnlock(f)
{
log.debug();
	if (!this.locked)
		return;

	if (this.lockedWindow)
	{
		if (!f && !this.lockedWindowClicked)
			return;

		this.lockedWindowClicked = false;
	}
	else
	{
		this.core.locked = false;
	}
	try
	{
		if (!this.loadedManualy)
			this.ss.deleteWindowValue(window, "lockedWindow");
	}catch(e){};

	this.locked = false;
	if (this.core.pref("lockhidetitle"))
	{
		this.titleTimer.cancel();
		window.removeEventListener("unload", this.titleTimer.cancel, false);

		try
		{
			if (this.lockedTitleObj)
				if (this.lockedTitleAttr)
					this.lockedTitleObj.setAttribute("title", this.lockedTitleOrig);
				else
					this.lockedTitleObj.title = this.lockedTitleOrig;

		}catch(e){log.error(e)}
	}
	this.core.workAround.do("on", this);
	$('masterPasswordPlusLock').parentNode.hidden = true;
	let win = document.documentElement;
	if (mapaPlus.core.style.MozAppearance)
	{
		win.style.MozAppearance = mapaPlus.styleBackup.MozAppearance;
		win.style.backgroundColor = mapaPlus.styleBackup.backgroundColor;
	}

	let n = win.childNodes;
	for(let i = 0; i < n.length; i++)
	{
//		if (n[i].hasAttribute("mapaVisibility"))
		if ("_mapaVisibility" in n[i])
		{
//			n[i].style.visibility = n[i].getAttribute("mapaVisibility");
			n[i].removeAttribute("mapaVisibility");
			n[i].style.visibility = n[i]._mapaVisibility;
			delete n[i]._mapaVisibility;
		}
	}
	mapaPlus.extraElements.forEach(function hide(c, i, t, o)
	{
		if (c == "_buttons")
		{
			if (!o)
			{
				o = win;
				if (!(c in o))
					return;

				for(i in o[c])
					hide("_buttons", 0, 0, o[c][i]);

				return;
			}

		}
		else
		{
			o = win;
			if (!(c in o))
				return;

			o = o[c];
		}
//		o.style.visibility = o.getAttribute("mapaVisibility");
//		o.removeAttribute("mapaVisibility");
		o.style.visibility = o._mapaVisibility;
		delete o._mapaVisibility;
	});

	let change = function(obj)
	{
		obj.style.display = obj.getAttribute("mapaDisplay");
		obj.removeAttribute("mapaDisplay");
	}
	for(let i = 0; i < this.lockList.length; i++)
	{
		n = $(this.lockList[i].id);
		if (n)
		{
			if (this.lockList[i].exclude.length > 0)
			{
				let c = n.childNodes,
						changed = false;
				for(let l = 0; l < c.length; l++)
				{
					if (c[l].id && this.lockList[i].exclude.indexOf(c[l].id) != -1)
						continue;

					changed = true;
					change(c[l]);
				}
				if (!changed  && n.hasAttribute("mapaDisplay"))
					change(n);
			}
			else if (n.hasAttribute("mapaDisplay"))
			{
				change(n);
			}
		}
	}
	let lockedLast = true;
	for (let t in this.core.window)
		for (let w in t) 
		if (w && w.window != window && w.lockedWindow)
			lockedLast = false;

	if (this.Win7Features)
	{
		let windowState = window.windowState;
/*
		if (windowState == window.STATE_MINIMIZED || (window.screenX == -32000 && window.screenY == -32000))
			windowState = window.STATE_MINIMIZED;
*/
		let min = windowState == window.STATE_MINIMIZED;

		if (min)
			mapaPlus.minimizedLockFix(1);
		else
			try{this.Win7Features.AeroPeek.onOpenWindow(window)}catch(e){};

	}
	if (this.showUnlockArray.length)
	{
		for (let i = 0; i < this.showUnlockArray.length; i++)
		{
			let func = this.showUnlockArray[i];
			try
			{
				typeof(func) == "function" && func()
			}
			catch(e){log.error(e)};
		}
		this.showUnlockArray = [];
	}

	if (mapaPlus.langTimer)
	{
		mapaPlus.langTimer.cancel();
		mapaPlus.langTimer = null;
	}
}//showUnlock()

/*
mapaPlus.menuAddHotkeys = function()
{
	var c = $("mapa_menu").childNodes,
			key;
	for(var i = 0; i < c.length; i++)
	{
		if (!c[i].hasAttribute("hotkey"))
			continue;

		try
		{
			key = this.hotkeyGet(this.core["pref" + c[i].getAttribute("hotkey") + "Hotkey"])[0];
		}
		catch(e)
		{
			key = null
		};
		if (key)
			c[i].setAttribute("description", key);
	}
}
*/

mapaPlus.hotkeyGet = function(keys)
{
	var f = [];
	var r = "";
	for(var i = 0; i < keys.length; i++)
	{
		var k = null
		try
		{
			var t = keys[i];
			if (t == "ACCEL")
				t = this.core.accel;
			k = $("platformKeys").getString("VK_" + t);
		}
		catch(e)
		{
			try
			{
				k = $("localeKeys").getString("VK_" + keys[i]);
			}
			catch(e)
			{
				k = this.hotkeyFormat(keys[i]);
			}
		}

		if (k === null || typeof k == "undefined")
			continue;

		f.push(keys[i]);
		r = r + (r != "" ? "+" : "") + k;
	}
	return [r, keys];
}

mapaPlus.hotkeyFormat = function(k)
{
	if (this.hotkeyString[k.toUpperCase()])
		return this.hotkeyString[k.toUpperCase()];

	return k;
}

mapaPlus.lockLogout = function()
{
	this.lock(false, true);
}

mapaPlus.lock = function lock(w, l)
{
log.debug();
	let self = mapaPlus;
	self.unlockIncorrectCheck();
	if (w === true)
	{
		self.lockedWindow = true;
		$("masterPasswordPlusUnLockType").firstChild.textContent = self.strings.buttonUnlockWindow;
		self.showLock(l);
	}
	else if (!w)
	{
		if (!self.locked)
		{
			$("masterPasswordPlusUnLockType").firstChild.textContent = self.strings.buttonUnlock;
			self.showLock(l);
		}
		self.core.lock(l ? true : false);
	}
	else
	{
		
	}
}

mapaPlus.noLockWindowToggle = function(type)
{
	if (typeof(type) == "undefined")
		type = 2;

	if (type == 2)
		this.noLockWindow = !this.noLockWindow;
	else
		this.noLockWindow = type ? true : false;


		if (!this.loadedManualy)
				this.ss.setWindowValue(window, "noLockWindow", this.noLockWindow.toString());

//		this.ss.deleteWindowValue(window, "noLockWindow");

}//noLockWindowToggle()

mapaPlus.unlock = function unlock(forceUnlock)
{
log.debug();
	if (this.core.locked && !this.lockedWindow)
		this.core.dialogForce = true;

	if (forceUnlock || this.login(false, true, false) || (!this.core.locked && !this.lockedWindow))
	{
		mapaPlus.unlockIncorrect(false);
		if (this.lockedWindow)
		{
			this.showUnlock(true);
			this.lockedWindow = false;
			$("masterPasswordPlusUnLockType").firstChild.textContent = this.strings.buttonUnlock;
		}
		else
			this.core.unlock();
	}
}

mapaPlus.login2 = function()
{
	mapaPlus.login(false);
}

mapaPlus.login = function login(temp, force, options, check)
{
log.debug();
	var r = false;
	if (!this.core.windowFirst("Dialog"))
	{
		this.dialogCanceled = null;
		this.core.dialogBackup = {
			dialogTemp: this.core.dialogTemp,
			dialogShow: this.core.dialogShow,
			dialogOptions: this.core.dialogOptions,
		};
		if (typeof(options) != "undefined")
			this.core.dialogOptions = options;

	//	this.core.suppressTemp.stop();
		if (force)
			this.core.logout();

		this.core.dialogShow = true;
		if (!temp)
			this.core.dialogTemp = false;

		try
		{
			this.core.suppressedFocusForce = true;
			//force master password prompt
			this.core.tokenDB.login(force);
			this.core.resetTimer(true);
			this.core.timerCheck.observe();
			r = true;
		}
		catch(e){};
	}
	else
	{
		if (this.lockedWindow)
		{
			this.lockedWindowClicked = true;
			this.dialogCanceled = function(d)
			{
				this.lockedWindowClicked = false;
			}
		}
		this.core.windowFocus("Dialog");
	}

	if (r)
		mapaPlusCore.windowAction("unlockIncorrect", "false");

	return r;
}


mapaPlus.update = function update(f)
{
log.debug();
/*
	if (typeof(mapaPlus.core) == "undefined")
	{
		log("Error in " + (new Error).fileName + " [line " + (new Error).lineNumber + "]\n" + e + "\nYou should never see this. If you know how to reproduce this error please post at https://github.com/vanowm/MasterPasswordPlus/issues");
		this.loadCore();
	}
*/
//log.debug();
	let status = this.core.status;

	if (f)
		this.show();

	if (this.last == status)
		return;

	let hidden = true,
			list = ["mapa_menu_lock", "mapa_menu_lock_logout", "mapa_menu_lock_window", "mapa_menu_noLockWindow", "mapa_lock_separator", "mapa_lock_separator2"];

	if(status)
	{
		if (status == 1)
			this.setTooltip("LockMasterPassword");
		else
			this.setTooltip("UnlockMasterPassword");

		this.setAttr("mapa_menu_lock_logout", "disabled", status != 1);

		this.setAttr("mapa_menu_changemp", "hidden", false);
		hidden = false;
	}
	else
	{
		this.setTooltip("SetMasterPassword");
		this.setAttr("mapa_menu_changemp", "hidden", true);
	}
	for(let i = 0; i < list.length; i++)
	{
		this.core.async(function()
		{
			if ($(list[i]))
				$(list[i]).hidden = hidden;
		})
	}
	this.last = status;
	this.setStyle(status);
}

mapaPlus.listKeys = function()
{
	if (this.core.keysList !== null)
		return;

	this.core.keysList = [];
	for (var property in KeyEvent)
		this.core.keysList[KeyEvent[property]] = property.replace("DOM_VK_","");

}

mapaPlus.mouseDown = function(e)
{
	if (!e || !e.target || !e.target.id || e.target.id == "masterPasswordPlusUnLockInput")
		return;

	if (mapaPlus.locked && e.target.id.indexOf("masterPasswordPlus") == -1)
	{
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
	var r = true;
	if (mapaPlus.locked)
	{
		r = false;
		e.preventDefault();
		e.stopPropagation();
		$("masterPasswordPlusUnLockInput").focus();
/*
		if (!mapaPlus.core.windowFirst("Dialog"))
			mapaPlus.unlock();
		else
			mapaPlus.core.windowFocus("Dialog");
*/
	}
	return r;
}

mapaPlus.unlockIncorrect = function(disable)
{
	if (disable && disable !== "false")
	{
		$("masterPasswordPlusUnLockInput").disabled = true;
		let timeoutMultiply = 1,
				attempts = mapaPlusCore.pref("failedattempts"),
				time = mapaPlusCore.pref("failedattemptstime");

		if (time < 0)
		{
			time *= -1;
			timeoutMultiply = 1 << (Math.ceil(mapaPlusCore.unlockIncorrect / attempts) - 1);
		}
		mapaPlusCore.unlockimputtimer = mapaPlusCore.async(function()
		{
			mapaPlusCore.windowAction("unlockIncorrect")
		}, 1000 * time * timeoutMultiply, mapaPlusCore.unlockimputtimer);
		$("masterPasswordPlusUnLockInput").setAttribute("placeholder", this.strings.toomanyincorrect.replace("#", (time * timeoutMultiply)));
log(mapaPlusCore.unlockIncorrect + " failed attempts. Disabling input for " + (time * timeoutMultiply) + " seconds");
	}
	else
	{
		$("masterPasswordPlusUnLockInput").disabled = false;
		$("masterPasswordPlusUnLockInput").removeAttribute("placeholder");
		if (mapaPlusCore.unlockimputtimer)
			mapaPlusCore.unlockimputtimer.cancel();

		if (disable === false || disable === "false")
			mapaPlusCore.unlockIncorrect = 0;
	}
}
mapaPlus.unlockIncorrectCheck = function unlockIncorrectCheck(add)
{
log.debug();
	let attempts = mapaPlusCore.pref("failedattempts");

	if (add)
		mapaPlusCore.unlockIncorrect++;

	if (attempts && mapaPlusCore.pref("failedattemptstime") && mapaPlusCore.unlockIncorrect && mapaPlusCore.unlockIncorrect % attempts == 0)
		mapaPlusCore.windowAction("unlockIncorrect", true);
//	else if (!add || !attempts)
//		mapaPlusCore.windowAction("unlockIncorrect");

}

mapaPlus.hotkeyPress = function(e)
{
	if (mapaPlus.locked)
	{
		mapaPlusCore.eventKeypress = e;
//		e.preventDefault();
//		e.stopPropagation();

		if (e.keyCode == e.DOM_VK_RETURN)
		{
			e.preventDefault();
			e.stopPropagation();
			mapaPlus.unlockEnter();
		}

		return false;
	}
	return true;
}

mapaPlus.unlockEnter = function()
{
	if ($("masterPasswordPlusUnLockInput").value === "" && mapaPlusCore.tokenDB.needsLogin())
		return;

	if (mapaPlusCore.tokenDB.checkPassword($("masterPasswordPlusUnLockInput").value))
	{
		mapaPlusCore._v = $("masterPasswordPlusUnLockInput").value;
		mapaPlus.unlock(true);
		delete mapaPlusCore._v;
	}
	else
	{
		mapaPlus.unlockIncorrectCheck(true);
	}
	$("masterPasswordPlusUnLockInput").value = "";
}//unlockEnter()

mapaPlus.hotkeyDown = function hotkeyDown(e, g)
{
//log.debug(g)
	if (e.target.id.indexOf("masterPasswordPlus") != -1)
		return true;

	if (mapaPlus.locked)
	{
		$("masterPasswordPlusUnLockInput").focus();
		return;
/*
		e.preventDefault();
		e.stopPropagation();
		//we must exit this function before modal dialog showed, otherwise event won't be properly canceled.
		let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
		timer.init({observe:function()
		{
			if (!mapaPlus.core.windowFirst("Dialog"))
				mapaPlus.unlock();
			else
				mapaPlus.core.windowFocus("Dialog");
		}}, 0, timer.TYPE_ONE_SHOT);
		return false;
*/
	}
	var keys = mapaPlus.core.getKeys(e);
	if (!keys)
		return;

	if (mapaPlus.core.matchKeys(mapaPlus.lastKeyDown, keys[0], 2)) //prevent repeats
		return true;

	mapaPlus.lastKeyDown = keys[0];
	var r = true;
	if (mapaPlus.core.matchKeys(keys[0], mapaPlus.core.prefLockHotkey, 2))
	{
		if (!mapaPlus.core.pref("lockhotkeyenabled") || (mapaPlus.core.pref("lockhotkeyenabled") == 1 && mapaPlus.loadedManualy))
			return true;

		r = false;
		e.preventDefault();
		e.stopPropagation();
		mapaPlus.lock();
	}
	else if (mapaPlus.core.matchKeys(keys[0], mapaPlus.core.prefLogoutHotkey, 2))
	{
		if (!mapaPlus.core.pref("logouthotkeyenabled") || (mapaPlus.core.pref("logouthotkeyenabled") == 1 && mapaPlus.loadedManualy))
			return true;

		r = false;
		e.preventDefault();
		e.stopPropagation();
//		mapaPlus.command(2); //this will prevent hotkey if no mp is set
		mapaPlus.command(1);
	}
//	else if (!mapaPlus.core.isTB && mapaPlus.core.matchKeys(keys[0], mapaPlus.core.prefLockWinHotkey, 2))
	else if (mapaPlus.core.matchKeys(keys[0], mapaPlus.core.prefLockWinHotkey, 2))
	{
		if (!mapaPlus.core.pref("lockwinhotkeyenabled") || (mapaPlus.core.pref("lockwinhotkeyenabled") == 1 && mapaPlus.loadedManualy))
			return true;

		r = false;
		e.preventDefault();
		e.stopPropagation();
		mapaPlus.lock(true);
	}
	else if (mapaPlus.core.matchKeys(keys[0], mapaPlus.core.prefLockLogoutHotkey, 2))
	{
		if (!mapaPlus.core.pref("locklogouthotkeyenabled") || (mapaPlus.core.pref("locklogouthotkeyenabled") == 1 && mapaPlus.loadedManualy))
			return true;

		r = false;
		e.preventDefault();
		e.stopPropagation();
		mapaPlus.lock(false, true);
	}
	return r;
//	mapaPlus.core.dump("down: " + keys[0] + "\n" + mapaPlus.lastKeyDown);
}

mapaPlus.hotkeyUp = function(e)
{
	mapaPlus.lastKeyDown = [];
}

mapaPlus.hotkeyInit = function()
{
	let keyset = $("mapaPlus_keyset"),
			n = document.createElement("keyset");

	if (!keyset)
		return;

	n.id = "mapaPlus_keyset";
	keyset.parentNode.replaceChild(n, keyset);
	this.hotkeyAppend(this.core.prefLogoutHotkey, "Logout", this.core.pref("logouthotkeyenabled"));
	this.hotkeyAppend(this.core.prefLockHotkey, "Lock", this.core.pref("lockhotkeyenabled"));
	this.hotkeyAppend(this.core.prefLockWinHotkey, "LockWin", this.core.pref("lockwinhotkeyenabled"));
	this.hotkeyAppend(this.core.prefLockLogoutHotkey, "LockLogout", this.core.pref("locklogouthotkeyenabled"));
}

mapaPlus.hotkeyAppend = function(keys, id, enabled)
{
	if (keys.length < 2 || !enabled || (this.noOverlayLoaded && enabled == 1))
		return;

	let m = keys.slice(),
			keyset = $("mapaPlus_keyset"),
			k = document.createElement("key");

	k.id = "mapaPlus_key_" + id;
	k.setAttribute("key", m[m.length-1]);
	m.pop();
	if (m)
		k.setAttribute("modifiers", m.join(" ").toLowerCase());

	keyset.appendChild(k);
}

mapaPlus.load = function()
{
	if (mapaPlus.initialized)
		return;

	window.removeEventListener("load", mapaPlus.load, false);
	mapaPlus.init();
	let timer = {};
	timer.timer = mapaPlus.core.async(function()
	{
		window.removeEventListener("unload", timer.timer.cancel, false);
		mapaPlus.onLoadAdd()
	}, 100);
	window.addEventListener("unload", timer.timer.cancel, false);
}

mapaPlus.showMenu = function(e, pos)
{
	e.stopPropagation();
	if (!pos)
		pos = "after_start";

	$("mapa_menu").openPopup(e.target.parentNode, pos);
/*
	$("mapa_menu").firstChild.focus();
	let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
	timer.init({observe: function(){$("mapa_menu").firstChild.focus();}}, 1000, timer.TYPE_ONE_SHOT);
*/
}


mapaPlus.popupshowing = function(e)
{
	let children = e.target.children,
			cmd = "mapa_menu_" + mapaPlus.commands[this.core.pref("command")];
	for (let i = 0; i < children.length; i++)
	{
		if (children[i].id && children[i].id == cmd)
			children[i].setAttribute("default", true);
		else
			children[i].removeAttribute("default");
	}
}

mapaPlus.close = function(aEvent)
{
	let self = mapaPlus;
//	self.core.countdownReset();
//	self.core.countdownResetLock();
	self.core.windowRemove(self.windowID, self.windowType);
	if (self.first)
	{
/*
		window.removeEventListener("mousemove", self.core.resetTimer, false);
		window.removeEventListener("keydown", self.core.resetTimer, false);
		window.removeEventListener("mousedown", self.core.resetTimer, false);
		window.removeEventListener("DOMMouseScroll", self.core.resetTimer, false);
*/
	}
	if (self.initialized)
	{
		window.removeEventListener("keydown", self.hotkeyDown, true);
		window.removeEventListener("keypress", self.hotkeyPress, true);
		window.removeEventListener("keyup", self.hotkeyUp, true);
		window.removeEventListener("close", self.close, true);
		window.removeEventListener("focus", self.core.windowFocused, true);
		window.removeEventListener("sizemodechange", self.isMinimized, true);
	}
	if (window.windowState == window.STATE_MINIMIZED)
	{
		window.screenX = self.screenX;
		window.screenY = self.screenY;
	}

}

mapaPlus.onLoadAdd = function onLoadAdd(func)
{
log.debug();
	if (mapaPlus.initialized)
	{
		if (func)
			mapaPlus.onLoadArray.push(func);

		for (let i = 0; i < mapaPlus.onLoadArray.length; i++)
		{
			let func = mapaPlus.onLoadArray[i];
			try
			{
				typeof(func) == "function" && func()
			}
			catch(e){log.error(e)}
		}
		mapaPlus.onLoadArray = [];
	}
	else
		mapaPlus.onLoadArray.push(func);
}

mapaPlus.upgrade = function upgrade(direct)
{
log.debug(mapaPlus.windowID);
	if (direct && mapaPlus.core.upgradeRun)
			return

	if (direct)
		mapaPlus.core.upgradeRun = true;


	if (!mapaPlus.core.addon)
	{
		if (--mapaPlus.upgrade.i > 0)
		{
			return mapaPlus.core.async(mapaPlus.upgrade);
		}
		return;
	}

	let _compare = Cc["@mozilla.org/xpcom/version-comparator;1"]
									.getService(Ci.nsIVersionComparator).compare,
			version = mapaPlus.core.pref("version");

	if (!mapaPlus.core.addon.firstRun && version == mapaPlus.core.addon.version)
		return;

	mapaPlus.core.prevVersion = version;

	function compare(a, b)
	{
		if (a == "firstinstall")
			return 0;

		return _compare(a, b);
	}
/*
function upgradeMS(
	full old setting name,
	short new setting name,
	delete true/false,
	old type (Bool, Int, Char),
	new type (Bool, Int, Char)
	callback function(old value)
)
return old setting, null if failed
//		r = mapaPlus.upgradeMS("masterPasswordTimeout.oldname", "newname", true, "Char", callback);
*/
	function upgradeMS(o, n, d, g, s, c)
	{
		n = n || null;
		d = typeof(d) == "undefined" ? true : d;
		g = g || "Bool";
		s = s || g;
		c = c || function(r){return r;}
		let aCount = {value:0},
				r = null,
				p = Cc["@mozilla.org/preferences-service;1"]
						.getService(Ci.nsIPrefService).getBranch("");
		p.getChildList(o, aCount);
		if( aCount.value != 0 )
		{
			try{r = p['get' + g + 'Pref'](o)}catch(e){r=null;log(o + " (" + g + ") doesn't exist")};
			if (d)
				try{p.deleteBranch(o)}catch(e){};

			if (n !== null && r !== null)
				try{mapaPlus.core.prefs['set' + s + 'Pref'](n, c(r))}catch(e){log("error converting " + o + " (" + g + ") = " + r + " to " + n + " (" + s + ") = " + c(r))}
		}
		return r;
	}

	if (compare(version, "0.4") < 0)
	{
		upgradeMS("masterPasswordTimeout.enabled",					"logouttimer");
		upgradeMS("masterPasswordTimeout.timeout",					"logouttimeout", true, "Int");
		upgradeMS("masterPasswordTimeoutPlus.enabled",			"logouttimer");
		upgradeMS("masterPasswordTimeoutPlus.timeout",			"logouttimeout", true, "Int");
		upgradeMS("masterPasswordTimeoutPlus.statusbar",		"statusbar");
		upgradeMS("masterPasswordTimeoutPlus.toolsmenu",		"toolsmenu");
		upgradeMS("masterPasswordTimeoutPlus.contextmenu",	"contextmenu");
		upgradeMS("masterPasswordTimeoutPlus.inactivity",		"logoutinactivity");
	}

	if (compare(version, "1.14") < 0)
	{
		let startupFail = upgradeMS("extensions.masterPasswordPlus.startupfail");
		startupFail = startupFail ? mapaPlus.core.STARTUP_QUIT : mapaPlus.core.STARTUP_DONOTHING;
		mapaPlus.core.prefs.setIntPref("startupfail", startupFail);
	}

	if (compare(version, "1.16") < 0)
	{
		upgradeMS("extensions.masterPasswordPlus.enabled",			"logouttimer");
		upgradeMS("extensions.masterPasswordPlus.timeout",			"logoutimeout");
		upgradeMS("extensions.masterPasswordPlus.inactivity",		"logoutinactivity");
	}

	if (compare(version, "1.21") < 0)
	{
		upgradeMS("extensions.masterPasswordPlus.lockhotkeywin",	"lockwinhotkey", true, "Char");
		let convert = function(val)
		{
			return val ? 2 : 1;
		}
		upgradeMS("extensions.masterPasswordPlus.logouthotkeyglobal",			"logouthotkeyenabled", true, "Bool", "Int", convert);
		upgradeMS("extensions.masterPasswordPlus.lockhotkeyglobal",				"lockhotkeyenabled", true, "Bool", "Int", convert);
		upgradeMS("extensions.masterPasswordPlus.locklogouthotkeyglobal",	"locklogouthotkeyenabled", true, "Bool", "Int", convert);
		upgradeMS("extensions.masterPasswordPlus.lockwinhotkeyglobal",		"lockwinhotkeyenabled", true, "Bool", "Int", convert);
	}

	if (compare(version, "1.21.2") < 0)
	{
		let p = Cc["@mozilla.org/preferences-service;1"]
						.getService(Ci.nsIPrefService).getDefaultBranch(mapaPlusCore.PREF_BRANCH);
		mapaPlus.core.pref("forceprompt", mapaPlus.core.prefStringGet(p, "forceprompt"));
	}

	if (compare(version, "1.21.4") < 0)
	{
		upgradeMS(mapaPlusCore.PREF_BRANCH + "showchangeslog", "showchangeslog", false, "Bool", "Int", function(val)
		{
			return val ? mapaPlus.CHANGESLOG_FULL : 0;
		});
	}

	if (compare(version, "1.24") < 0)
	{
		try{p.deleteBranch(o)}catch(e){};
		upgradeMS("extensions.masterPasswordPlus.lockignorefirstkey", "showchangeslog", false, "Bool", "Int", function(val)
		{
			return val ? mapaPlus.CHANGESLOG_FULL : 0;
		});
	}

	if (compare(version, "1.29.3b1") < 0)
	{
		let convert = function(val)
		{
			return val ? 2 : 1;
		}
		//left over from v1.21 upgrade
		upgradeMS("extensions.masterPasswordPlus.lockwinhotkeyglobal", null, true);
		upgradeMS("extensions.masterPasswordPlus.prefurlbar", null, true);
	}

	mapaPlus.core.pref("version", mapaPlus.core.addon.version);
	if (!mapaPlus.core.changeLogShown)
	{
		mapaPlus.core.changeLogShown = true;
		if (compare(version, mapaPlus.core.addon.version)) //check if not first install
			mapaPlus.onLoadAdd(function()
			{
				mapaPlusCore.openChangesTimer = mapaPlusCore.async(function(){mapaPlus.openChanges(version)}, 1000, mapaPlusCore.openChangesTimer);
			});
	}
}
mapaPlus.upgrade.i = 100;

mapaPlus.lockSetTransparent = function(v)
{
	let lb = $("masterPasswordPlusLockBox2")
	if(lb)
		lb.setAttribute("transparent", v);
}

mapaPlus.lockSetBgImage = function(v)
{
	let lb = $("masterPasswordPlusLockBox2")
	if(lb)
		lb.setAttribute("bgimage", v);
}
mapaPlus.screenRestored = true;
mapaPlus.windowMinimizedForced = false;
(mapaPlus.setWindowState = function setWindowState()
{
	mapaPlus.windowMaximized = window.windowState == window.STATE_MAXIMIZED;
	mapaPlus.windowMinimized = window.windowState == window.STATE_MINIMIZED;
	mapaPlus.windowNormal = window.windowState == window.STATE_NORMAL;
	mapaPlus.windowFullscreen = window.windowState == window.STATE_FULLSCREEN;
})()

mapaPlus.isMinimized = function isMinimized()
{
//log.debug();
	if (mapaPlus.windowState != window.windowState)
	{
		if (window.windowState == window.STATE_MINIMIZED)
		{
			if (!mapaPlus.windowMinimizedForced)
			{
				if (window.screenX > mapaPlus.minimizeXY && window.screenY > mapaPlus.minimizeXY)
				{
					mapaPlus.screenX = window.screenX;
					mapaPlus.screenY = window.screenY;
				}
				mapaPlus.screenRestored = false;
				mapaPlus.minimized();
			}
		}
		else if (mapaPlus.Win7Features)
		{
			if (mapaPlus.screenRestored)
				mapaPlus.setWindowState();

			if (!mapaPlus.windowMinimizedForced && !mapaPlus.screenRestored)
			{
				mapaPlus.core.async(function()
				{
					mapaPlus.windowMinimizedForced = true;
					window.screenX = mapaPlus.screenX;
					window.screenY = mapaPlus.screenY;
					if (mapaPlus.windowMaximized || mapaPlus.windowFullscreen)
					{
						window.maximize();
					}
					mapaPlus.windowMinimizedForced = false;
					mapaPlus.screenRestored = true;
					mapaPlus.setWindowState();
				});
			}
		}
	}

	mapaPlus.windowState = window.windowState;
}

/*
(mapaPlus.setWindowState = function()
{
	let windowState = window.windowState;
	if (windowState == window.STATE_MINIMIZED || (window.screenX == -32000 && window.screenY == -32000))
		windowState = window.STATE_MINIMIZED;

	mapaPlus.windowMaximized = windowState == window.STATE_MAXIMIZED;
	mapaPlus.windowMinimized = windowState == window.STATE_MINIMIZED;
	mapaPlus.windowNormal = windowState == window.STATE_NORMAL;
	mapaPlus.windowFullscreen = windowState == window.STATE_FULLSCREEN;
})()
mapaPlus.isMinimized = function()
{
	return;
log([mapaPlus.windowState, window.windowState, windowState, mapaPlus.screenX, mapaPlus.screenY, window.screenX, window.screenY, "ok"]);
	if (mapaPlus.windowMinimizedForced || mapaPlus.windowMinimizedRestoring)
		return;

	let windowState = window.windowState;
	if (windowState == window.STATE_MINIMIZED || (window.screenX == -32000 && window.screenY == -32000))
		windowState = window.STATE_MINIMIZED;

	if (windowState != window.STATE_MINIMIZED && mapaPlus.screenRestored)
	{
		log("set");
		log([mapaPlus.screenX, mapaPlus.screenY]);
		mapaPlus.screenX = window.screenX;
		mapaPlus.screenY = window.screenY;
		log([mapaPlus.screenX, mapaPlus.screenY]);
	}
	if (mapaPlus.windowState == windowState)
	{
		return;
	}
log([mapaPlus.windowState, window.windowState, windowState, mapaPlus.screenX, mapaPlus.screenY, window.screenX, window.screenY]);

	mapaPlus.windowState = windowState;
	if (windowState == window.STATE_MINIMIZED)
	{
		mapaPlus.screenRestored = false;
		mapaPlus.minimized();
	}
	else if (mapaPlus.Win7Features)
	{
		if (mapaPlus.screenRestored)
			mapaPlus.setWindowState();

		if (!mapaPlus.screenRestored)
		{
			let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
			timer.init({observe:function()
			{
				mapaPlus.windowMinimizedRestoring = true;
				log([mapaPlus.screenX, mapaPlus.screenY]);
				window.screenX = mapaPlus.screenX;
				window.screenY = mapaPlus.screenY;
				if (mapaPlus.windowMaximized || mapaPlus.windowFullscreen)
				{
					window.maximize();
				}
				mapaPlus.windowMinimizedRestoring = false;
				mapaPlus.screenRestored = true;
				mapaPlus.setWindowState();
			}}, 0, timer.TYPE_ONE_SHOT);
		}
	}
}
*/
mapaPlus.minimized = function()
{
	if (this.core.pref("logoutonminimize"))
	{
		this.logout();
	}

	switch(this.core.pref("lockonminimize"))
	{
		case 1:
			this.core.async(this.lock)
			break;
		case 2:
			this.core.async(function(){mapaPlus.lock(true)})
			break;
	}
}

mapaPlus.init = function init()
{
log.debug();
	let self = mapaPlus;
	mapaPlus.upgrade(true);
	if (!self.core.initialized)
	{
		self.core.init(false, self);
		self.listKeys();
		self.core.windowListener.observe(window, "domwindowopened", true);
		self.first = true;
	}
	if (self.initialized)
		return;

	if (self.loadedManualy)
		self.windowType =  "WindowGeneric";

	self.windowID = self.core.windowAdd(self, self.windowType);
	self.initialized = true;
//log([self.windowID, self.init.count, mapaPlus.core.appInfo.name, $("masterPasswordPlusUnLockInfo").value]);

	if (self.core.isTB)
	{
//			$("mapa_menu_lock_window").collapsed = true;
		self.lockList = [];
	}
	else
	{
		self.lockList = [
		{
			id: "bookmarksBarContent",
			exclude: []
		},
		{
			id: "appmenu-button-container",
			exclude: []
		},
		{
			id: "titlebar",
			exclude: ["titlebar-buttonbox-container", "titlebar-spacer", "aero-titlebar-stack", "titlebar", "titlebar-content"]
		}];
	}
//		$("masterPasswordPlusLock").addEventListener("keypress", function(e){e.stopPropagation();e.preventDefault();return false;}, true);
	let locked = self.core.pref("locked");
	self.lockSetTransparent(self.core.pref("locktransparent"));
	self.lockSetBgImage(self.core.pref("lockbgimage"));

	const WINTASKBAR_CONTRACTID = "@mozilla.org/windows-taskbar;1";
	if (!self.core.isTB && WINTASKBAR_CONTRACTID in Cc &&
			Cc[WINTASKBAR_CONTRACTID].getService(Ci.nsIWinTaskbar).available)
	{
			let temp = {};
			try
			{
				//Windows 7
				Cu.import("resource://gre/modules/WindowsPreviewPerTab.jsm", temp);
			}
			catch(e)
			{
				//Windows 10
				try
				{
					Cu.import("resource:///modules/WindowsPreviewPerTab.jsm", temp);
				}
				catch(e){}
			}
			self.Win7Features = temp;
	}
	self.core.workAround.init(self, self.first);
	if (!self.loadedManualy && !mapaPlus.core.style.MozAppearance)
	{
		var w = document.getElementsByTagName("window");
		if (!w.length)
			w = document.getElementsByTagName("prefwindow");

		if (w.length)
		{
			var s = window.getComputedStyle(w[0], null);
			mapaPlus.core.style.MozAppearance = s.MozAppearance;
			mapaPlus.core.style.backgroundColor = s.backgroundColor;
		}
	}
/*
	// bug #48 http://code.google.com/p/masterpasswordtimeoutplus/issues/detail?id=48
	// default home page loaded after browser restart instead of page from last session
	if (!self.loadedManualy && !("__SSi" in window) || !window.__SSi)
		self.ss.init(window);
*/
	mapaPlus.core.async(function()
	{
		let wasLocked = false,
				wasNoLock = false;
		try
		{
			if (!mapaPlus.loadedManualy)
			{
				wasLocked = mapaPlus.ss.getWindowValue(window, "lockedWindow") == "true";
				if (mapaPlusCore.pref("persistnolock"))
					wasNoLock = mapaPlus.ss.getWindowValue(window, "noLockWindow") == "true";
			}
		}
		catch(e){};
		let lockedWindow = !mapaPlus.core.isTB && wasLocked;
		mapaPlus.noLockWindow = !mapaPlus.core.isTB && wasNoLock;
		if (mapaPlus.noLockWindow)
		{
			try{$("mapa_menu_noLockWindow").setAttribute("checked", true)}catch(e){}
		}
		if (mapaPlus.core.pref("lockrestore") && (mapaPlus.core.locked || lockedWindow || (locked && mapaPlus.core.status == 2)))
			mapaPlus.lock(lockedWindow, 1);

	}, 100);
	if (self.windowType == "Window")
		self.hotkeyInit();

	self.MinTrayR = "gMinTrayR" in window;
	if (self.MinTrayR || Cc["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Ci.nsIVersionComparator)
			.compare(mapaPlus.core.appInfo.version, "8.0") < 0)
	{
		let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
		timer.init({observe:mapaPlus.isMinimized}, 500, timer.TYPE_REPEATING_SLACK);
		window.addEventListener("unload", timer.cancel, false);
	}
	else
	{
		window.addEventListener("sizemodechange", mapaPlus.isMinimized, true);
	}
	let obj = $("masterPasswordPlusUnLockInput");
	if (obj)
		obj.addEventListener("input", self.nonLatin, true);

	self.update(true);
}//init()


window.addEventListener("load", mapaPlus.load, false);

})();