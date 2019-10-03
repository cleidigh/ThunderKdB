(function()
{
let {classes: Cc, interfaces: Ci, utils: Cu} = Components,
		log = mapaPlusCore.log;

log.debug("dialog");
function $ (id)
{
	return document.getElementById(id);
}
function escape(s)
{
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

mapaPlus.window = window;
mapaPlus.windowID = 0;
mapaPlus.windowType = "Dialog";
mapaPlus.pass = false;
mapaPlus.accepted = false;
mapaPlus.dialogOptions = mapaPlus.core.dialogOptions;
mapaPlus.dialogTemp = mapaPlus.core.dialogTemp;
mapaPlus.dialogBackup = {};
mapaPlus.loaded = false;
mapaPlus.gecko4 = false;
mapaPlus.titleOriginal = function()
{
	let regexp = RegExp(escape(mapaPlus.titleSuffix) + "( \\([0-9]*\\))?", "")
	return document.title.replace(regexp, "");
};
mapaPlus.titleSuffix = "";
mapaPlus.mainWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
												.getService(Ci.nsIWindowMediator)
												.getMostRecentWindow((mapaPlus.core.isTB ? "mail:3pane" : "navigator:browser"));

mapaPlus._commonDialogOnLoad = commonDialogOnLoad;
commonDialogOnLoad = function(){};
mapaPlus._commonDialogOnUnload = commonDialogOnUnload;
commonDialogOnUnload = function(){};

mapaPlus.check = function check()
{
	let string;
	try
	{
		var propBag = window.arguments[0].QueryInterface(Ci.nsIWritablePropertyBag2)
										.QueryInterface(Ci.nsIWritablePropertyBag);
		let propEnum = propBag.enumerator;
		while (propEnum.hasMoreElements())
		{
			let prop = propEnum.getNext().QueryInterface(Ci.nsIProperty);
			if (prop.name == "text")
				string = prop.value;

			if (prop.name == "promptType" && prop.value == "promptPassword")
			{
				this.pass = true;
				break;
			}
		}
	}
	catch(e)
	{
		this.pass = gCommonDialogParam && (gCommonDialogParam.GetInt(3) == 1 && gCommonDialogParam.GetInt(4) == 1);
		this.gecko4 = true;
		string = gCommonDialogParam.GetString(0);
	}
//double check if it's the master password and not generic password prompt
	if (this.pass)
	{
		let modules = Cc["@mozilla.org/security/pkcs11moduledb;1"]
									.getService(Ci.nsIPKCS11ModuleDB).listModules(),
				slotnames = [],
				match = false,
				bundle = Cc["@mozilla.org/intl/stringbundle;1"].getService()
								.QueryInterface(Ci.nsIStringBundleService)
								.createBundle("chrome://pipnss/locale/pipnss.properties"),
				text = [];

		try
		{
			text.push(bundle.GetStringFromName("CertPassPrompt"));
		}catch(e){}
		try
		{
			text.push(bundle.GetStringFromName("CertPassPromptDefault"));
		}catch(e){}
		try
		{
			let slotsMore = true;
			while(modules.hasMoreElements())
			{
				let module = modules.getNext().QueryInterface(Ci.nsIPKCS11Module),
						slots = module.listSlots();
				while(slots.hasMoreElements())
				{
					let slot = slots.getNext().QueryInterface(Ci.nsIPKCS11Slot);
					slotnames.push(slot.tokenName ? slot.tokenName : slot.name);
				}
			}
		}
		catch(e)
		{
//log.error(e);
			let modulesMore = true,
					slotsMore = true;
			while(modulesMore)
			{
				let module = modules.currentItem().QueryInterface(Ci.nsIPKCS11Module);
				if (module)
				{
					let slots = module.listSlots();
					try
					{
						while(slotsMore)
						{
							let slot = null;
							try
							{
								slot = slots.currentItem().QueryInterface(Ci.nsIPKCS11Slot);
							}
							catch(e){}
							if (slot != null)
							{
								slotnames.push(slot.tokenName);
								slotnames.push(slot.name);
								try
								{
									slots.next();
								}
								catch(e)
								{
									slotsMore = false;
								}
							}
						}
					}
					catch(e){}
				}
				try
				{
					modules.next();
				}
				catch(e)
				{
					modulesMore = false;
				}
			}
		}
		if (text)
		{
			search:
			for(let i = 0; i < slotnames.length; i++)
			{
				for(let n = 0; n < text.length; n++)
				{
					if (string == text[n].replace("%S", slotnames[i]))
					{
						match = true;
						break search;
					}
				}
			}
		}
		if (!match)
			this.pass = false;
	}
	this.accept();
log.debug([(this.pass && (this.core.status != 1 || this.core.locked || !this.core.startupPassed)), this.pass, this.core.status != 1, this.core.locked, !this.core.startupPassed, this.core.dialogForce]);
	if (this.pass && (this.core.status != 1 || this.core.locked || !this.core.startupPassed))
	{
		let first = this.core.windowFirst(this.windowType);
		this.windowID = this.core.windowAdd(mapaPlus, this.windowType);
		if (!this.core.dialogForce)
		{
log.debug([this.core.locked, this.core.pref("suppress"), this.core.pref_SuppressTemp, (this.core.isFF4 && this.core.pref("suppress") && !this.core.pref_SuppressTemp), this.core.dialogShow, (this.core.locked || this.core.pref("suppress") || this.core.pref_SuppressTemp || this.core.dialogShow || (this.core.isFF4 && this.core.pref("suppress") && !this.core.pref_SuppressTemp))]);
//			if (this.core.locked || this.core.pref("suppress") || this.core.pref_SuppressTemp || this.core.dialogShow || (this.core.isFF4 && !this.core.pref("suppress") && !this.core.pref_SuppressTemp))
			if ((!this.core.dialogShow || this.core.locked) && (this.core.pref("suppress") || this.core.pref_SuppressTemp || (this.core.isFF4 && this.core.pref("suppress") && !this.core.pref_SuppressTemp)))
			{
log.debug((first || this.core.locked));
				if (first || this.core.locked)
				{
log.debug(this.core.window[this.windowType]);
					if (this.core.startupPassed)
					{
						if ("mapaPlus" in this.mainWindow && this.mainWindow.mapaPlus && this.mainWindow.mapaPlus.suppressed)
							this.mainWindow.mapaPlus.suppressed();

						this.core.dialogShow = false;
						this.core.suppressed();
						if (this.core.pref("suppressfocus") || this.core.suppressedFocusForce)
						{
							this.core.suppressedFocusForce = false;
							this.core.timerFocus.init(this.windowType);
						}
/*
						if (this.core.isFF4 && this.core.prefNoWorkAround.indexOf("FF4") == -1)
							window.focus();
*/
						if (this.core.isFF4 && this.core.prefNoWorkAround.indexOf("FF4") == -1)
						{
//FF4 mouse wheel scroll bug workaround. Thanks to Infocatcher for this snippet!
							var o = window.opener;
							if (o && o.gURLBar)
								window.opener.setTimeout(function(o)
								{
									try{o.gURLBar.focus();}catch(e){}
									try{o.content.focus();}catch(e){}
								}, 0, o);
							else
								window.focus();
						}
					}
					if (this.core.isTB && this.gecko4)
						gCommonDialogParam.SetInt(0, 1);

					this.core.windowAction("suppressed", "", this.windowType);
					this.quit();
					return;
				}
			}
//log.debug([this.core.startupPassed, !this.core.dialogShow, (this.core.pref("suppress") == 2 || this.core.pref_SuppressTemp), this.core.pref("suppress"),this.core.pref_SuppressTemp]);
			if (!this.core.dialogShow && (this.core.pref("suppress") == 2 || this.core.pref_SuppressTemp))
			{
				if ("mapaPlus" in this.mainWindow && this.mainWindow.mapaPlus && this.mainWindow.mapaPlus.suppressed)
					this.mainWindow.mapaPlus.suppressed();

				this.core.dialogShow = false;
				this.core.suppressed();
				if (this.core.isFF4 && this.core.prefNoWorkAround.indexOf("FF4") == -1)
				{
//FF4 mouse wheel scroll bug workaround. Thanks to Infocatcher for this snippet!
					var o = window.opener;
					if (o && o.gURLBar)
						window.opener.setTimeout(function(o)
						{
							try{o.gURLBar.focus()}catch(e){}
							try{o.content.focus()}catch(e){}
						}, 0, o);
					else
						window.focus();
				}
				if (this.core.isTB && this.gecko4)
					gCommonDialogParam.SetInt(0, 1);

				this.core.windowAction("suppressed", "", this.windowType);
				this.quit();
				return;
			}
		}
	}
	if (this.core.startupPassed)
	{
		for(var i in this.core.dialogBackup)
		{
			this.dialogBackup[i] = this.core[i];
			this.core[i] = this.core.dialogBackup[i];
		}
		this.dialogBackup.dialogForce = this.core.dialogForce;
		this.core.dialogForce = false;
		this.core.dialogBackup = {};
		this.core.dialogOptions = true;
		this.core.dialogTemp = true;
	}
//	this.core.dialogSuppress = false;
//	this.core.suppressTemp.stop();
	return;
}
/*

mapaPlus.load = function()
{
	if (!mapaPlus.pass)
		return;

	let t = mapaPlus.core.pref("identify");
	if (t)
	{
		document.title += " [" + t + "]";
	}
//	mapaPlus.core.dump(mapaPlus.core.dialogShow + " | " + mapaPlus.core.dialogForce + " | " + mapaPlus.core.pref("suppress") + " | "  + mapaPlus.core.pref_SuppressTemp);
}
*/

mapaPlus.quit = function()
{
//	commonDialogOnLoad();
	this.core.windowRemove(this.windowID, this.windowType);
	window.resizeTo(0, 0); // Force hide window
	window.close();
}

mapaPlus.suppressed = function()
{
	document.title = this.titleOriginal() + this.titleSuffix + " (" + (++mapaPlus.core.dialogSuppressedCount) + ")";
}

mapaPlus.commonDialogOptions = function()
{
	this.options({protect: false, protected: false});
/*
	if (!this.core.pref("protect"))
		this.options({protect: false, protected: false});
	else
		document.documentElement.getButton("disclosure").disabled = true;
*/
}

mapaPlus.updateTitle = function updateTitle()
{
log.debug();
	this.titleSuffix = this.core.pref("identify");
	if (this.titleSuffix)
		this.titleSuffix = " [" + this.titleSuffix + "]";

	document.title = this.titleOriginal() + this.titleSuffix;
	if (this.core.dialogSuppressedCount)
	{
		this.core.dialogSuppressedCount--;
		this.suppressed();
	}
}
mapaPlus.commonDialogOnLoad = function commonDialogOnLoad()
{
log.debug();
	this.loaded = true;
	if (this.pass)
	{
		$("password1Label").parentNode.insertBefore($("mapaPlusWarning"), $("password1Label"));
		$("mapaPlusWarning").appendChild($("password1Label"));
		if (this.dialogTemp && this.core.initialized && this.core.pref("suppress") != 2)
		{
			this.displayTemp();
		}
//		if (!this.core.locked && this.core.initialized && this.dialogOptions && !this.core.pref("protect"))
		if (!this.core.locked && this.core.initialized && this.dialogOptions)
		{
			document.documentElement.getButton("disclosure").label = this.strings.options;
			document.documentElement.getButton("disclosure").hidden = false;
		}
//		document.documentElement.getButton("cancel").addEventListener("command", this.commonDialogCancel, true);
		document.documentElement.getButton("disclosure").removeAttribute("accesskey");
		$("password1Textbox").addEventListener("input", this.nonLatin, true);
		this.observer.init();

		var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
		timer.init({observe: function()
		{
			if (!mapaPlus.core.pref("showlang") || (mapaPlus.core.pref("showlang") == 2 && !mapaPlus.core.windowFullScreen()))
			{
				$("password1Label").collapsed = true;
				return;
			}
			try
			{
				var l = mapaPlus.core.KB.getLangNameAbr().toUpperCase();
				if ($("password1Label").value != l || $("password1Label").collapsed)
				{
					$("password1Label").collapsed = false;
					$("password1Label").value = l;
				}
			}
			catch(e)
			{
//				mapaPlus.dump(e, 1);
			}
		}}, 100, timer.TYPE_REPEATING_SLACK);
		window.addEventListener("unload", timer.cancel, false);
		mapaPlus.core.dialogSuppressedCount = 0;
/*
		if (!mapaPlus.core.prefLockIgnoreFirstKey && mapaPlus.core.eventKeypress && [13,27].indexOf(mapaPlus.core.eventKeypress.keyCode) == -1)
		{
			let sendEvent = function(type)
			{
				let evt = document.createEvent("KeyboardEvent"),
							e = mapaPlus.core.eventKeypress;
				try
				{
					evt.initKeyEvent(
										type,        //  in DOMString typeArg,
										e.bubbles,             //  in boolean canBubbleArg,
										e.cancelable,             //  in boolean cancelableArg,
										window,             //  in nsIDOMAbstractView viewArg,  Specifies UIEvent.view. This value may be null.
										e.ctrlKey,            //  in boolean ctrlKeyArg,
										e.altKey,            //  in boolean altKeyArg,
										e.shiftKey,            //  in boolean shiftKeyArg,
										e.metaKey,            //  in boolean metaKeyArg,
										e.keyCode,               //  in unsigned long keyCodeArg,
										e.charCode);              //  in unsigned long charCodeArg);
					document.getElementById("password1Textbox").inputField.dispatchEvent(evt);
				}
				catch(err)
				{
					mapaPlus.dump("SendEvent: " + err);
				}
			}
			sendEvent("keypress");
			mapaPlus.core.eventKeypress = null;
		}
*/
	}
	this._commonDialogOnLoad();
	mapaPlus.updateTitle();
}
mapaPlus.commonDialogOnUnload = function()
{
	this.core.windowRemove(this.windowID, this.windowType);
	if (this.loaded)
		this._commonDialogOnUnload();
//	return this.loaded;
}

mapaPlus.acceptObserve = function()
{
	this.accepted = true;
	document.documentElement.getButton("accept").click();
}

mapaPlus.commonDialogOnAccept = function()
{
	if (!this.pass || this.accepted)
		return true;

	var pass = false;
	try
	{
		pass = this.core.tokenDB.checkPassword($("password1Textbox").value);
	}
	catch(e){}
	if (pass)
	{
		this.core.lockIncorrect = 0;
		this.core.startupIncorrect = 0;
		if (this.core.locked)
		{
			this.core.unlock();
		}
		this.core.timerCheck.observe();
		this.core.windowAction("lock", false, this.windowType);
	}
	else
	{
		if (this.core.initialized)
		{
			if ($("password1Textbox").value !== "" && ++this.core.lockIncorrect >= this.core.pref("lockincorrect"))
				this.core.lock();
		}
		else
		{
			this.core.startupIncorrect++;
			let i = this.core.pref("startupincorrect");
			if (i && this.core.startupIncorrect >= i)
			{
				this.quit();
				return false;
			}
		}
	}
/*
	if ($("suppresstemp").checked)
	{
		this.core.pref_SuppressTemp = parseInt($("hours").value) * 60 + parseInt($("minutes").value);
		this.core.pref("suppresstemp", this.core.pref_SuppressTemp);
		this.core.suppressTemp.start();
	}
	else
*/
	if (!pass)
	{
		for(var i in this.dialogBackup)
			this.core[i] = this.dialogBackup[i];

		this.core.dialogTemp = this.dialogTemp;
		this.core.dialogOptions = this.dialogOptions;
//		this.core.dialogSuppress = false;
//		this.core.dialogShow = true;
		this.core.windowUpdate(false);
	}
	if (pass)
		this.core.windowAction("acceptObserve", "", this.windowType);

	return true;
}

mapaPlus.commonDialogCancel = function(t)
{
	if (!mapaPlus.core.startupPassed)
		return;
	mapaPlus.core.windowAction("dialogCanceled", true, "Window");

	if (!t || $("mapaPlus").collapsed)
		return;

//	mapaPlus.core.pref_SuppressTemp = $("mapaPlus").collapsed ? mapaPlus.core.pref("suppresstemp") : parseInt($("hours").value) * 60 + parseInt($("minutes").value);
	mapaPlus.core.pref_SuppressTemp = parseInt($("hours").value) * 60 + parseInt($("minutes").value);
	mapaPlus.core.pref("suppresstemp", mapaPlus.core.pref_SuppressTemp);
	mapaPlus.core.suppressTemp.start();
	window.close();
}

mapaPlus.displayTemp = function()
{
	//append new options to the prompt
	$("password1Textbox").parentNode.parentNode.appendChild($("mapaPlus"));
	$("mapaPlus").collapsed = false;
	var minutes = this.core.pref("suppresstemp");
	var hours = 0;
	if (minutes > 59)
	{
		hours = parseInt(minutes / 60);
		minutes = minutes - (hours * 60);
	}
	$("hours").value = hours;
	$("minutes").value = minutes;
}

mapaPlus.checkTemp = function()
{
	if ($("hours").value == "0" && $("minutes").value == "0")
		$("minutes").value = 1;
}

mapaPlus.observer = {
	_observerService: Cc["@mozilla.org/observer-service;1"]
														.getService(Ci.nsIObserverService),
	_name: null,
	init: function()
	{
		this._name = "mapaPlusDialog";
		this._observerService.addObserver(this, this._name, false);
		window.addEventListener("unload", function() { mapaPlus.observer.uninit();}, false);
	},

	uninit: function observer_dialog_uninit()
	{
log.debug();
		this._observerService.removeObserver(this, this._name);
	},

	observe: function(aSubject, aTopic, aData)
	{
		aSubject.QueryInterface(Ci.nsISupportsString);
//mapaPlus.dump(aTopic + " | " + aSubject.data + " | " + aData);
		if (aTopic != this._name || !mapaPlus[aSubject.data] || typeof(mapaPlus[aSubject.data]) != "function")
			return;

		mapaPlus[aSubject.data](aData);
	},
}

mapaPlus.lock = function(l, data)
{
	if (l.match(/\|/))
		return;

	document.documentElement.getButton("disclosure").disabled = l;
	mapaPlus.setAttribute("mapaPlusTemp", "disabled", l, !l);
	mapaPlus.accept();
}

mapaPlus.accept = function accept()
{
	if (this.pass && "_v" in mapaPlusCore)
	{
		$("password1Textbox").value = mapaPlusCore._v;
		delete mapaPlusCore._v;
		this.commonDialogOnAccept();
		this.quit();
	}
}

//window.addEventListener("load", mapaPlus.load, false);
//$("commonDialog").setAttribute("onload",					"mapaPlus.commonDialogOnLoad();" + $("commonDialog").getAttribute("onload"));
//$("commonDialog").setAttribute("onunload",				"if (mapaPlus.commonDialogOnUnload()) {" + $("commonDialog").getAttribute("onunload") + "}");
$("commonDialog").setAttribute("ondialogaccept",	"if(!mapaPlus.commonDialogOnAccept()) return false;" + $("commonDialog").getAttribute("ondialogaccept"));

mapaPlus.check();
})()