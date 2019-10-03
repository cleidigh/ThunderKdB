(function(){
let { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components,
		log = mapaPlus.core.log;

log("masterpasswordplusOptionsCommon.js loaded");

Cu.import("resource://gre/modules/FileUtils.jsm");

function $(id)
{
	return document.getElementById(id);
}
mapaPlus.mainWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
									 .getService(Ci.nsIWindowMediator)
									 .getMostRecentWindow((mapaPlus.core.isTB ? "mail:3pane" : "navigator:browser"));

mapaPlus.iconSelected = {};
Object.defineProperty(mapaPlus, "instantApply", {
	get: function()
	{
		return Cc["@mozilla.org/preferences-service;1"]
				.getService(Ci.nsIPrefBranch).getBoolPref("browser.preferences.instantApply");
	}
});

mapaPlus.autoSave = mapaPlus.instantApply ? mapaPlus.saveOptions : function(){};
mapaPlus.isLocked = false;
mapaPlus.windowIDCommon = 0;

mapaPlus.keyName = {};
mapaPlus.hotkeyTaken = {mapa:[], all:[]};

mapaPlus.lastKeyDown = [];
mapaPlus.hotkeyDownRepeat = false;

//mapaPlus.iniIcons("urlbar-icons", "mapa_urlbar", "urlbar", "mapaPlusUrlbar")
mapaPlus.iniIcons = function iniIcons(iconId, id, checkbox)
{
log.debug();
	let	skipId = ["statusbar-display", "pageActionSeparator"],
			skipTag = ["tooltip", "popup", "prefpane"],
			self = this,
			_obj = $("urlbar-icons"),
			urlbar = $("urlbar"),
			urlbarStyle = self.mainWindow.getComputedStyle(self.mainWindow.document.getElementById("urlbar")),
			urlBarIcons = self.mainWindow.document.getElementById("urlbar-icons") || self.mainWindow.document.getElementById("page-action-buttons"),
			clone, icon, vbox;

	if (!urlBarIcons)
		return null;

	try
	{
		for(let i = 0; i < urlbarStyle.length; i++)
		{
//			urlbar.style[urlbarStyle[i]] = urlbarStyle[urlbarStyle[i]];
		}
	}
	catch(e)
	{
		log.error(e);
	}
	urlbar.style.backgroundColor = urlbarStyle.backgroundColor;
	urlbar.style.color = urlbarStyle.color;
	try
	{
		let url = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService).newURI(urlBarIcons.parentNode.value, "UTF-8", null);
		if (url.prePath == "about:")
			url = url.spec;
		else
			url = url.prePath;
		$("urlbar-url").value = url.replace(/[\?#&].*/g, "");
	}
	catch(e){}
	let children = urlBarIcons.childNodes;
	icon = document.createElement("image");
	icon.collapsed = false;
	vbox = document.createElement("vbox");
	vbox.className = "mapapl";
	vbox.collapsed = true;
	vbox.setAttribute("onclick", "mapaPlus.mouseClick(this);");
	vbox.setAttribute("directionId", null);
	vbox.setAttribute("direction", false);
	vbox.setAttribute("selected", false);
	vbox.id = "mapapl-"+id+"-" + children[0].id;
	vbox.appendChild(icon);
	let last = document.importNode(vbox, true);
	_obj.appendChild(last);
	for (let i = 0; i < children.length; i++)
	{
		let	child = children[i];
		if (skipId.indexOf(child.id) != -1 || skipTag.indexOf(child.tagName) != -1)
			continue;

		let	style = self.mainWindow.getComputedStyle(child, null),
				hidden = child.hidden,
				collapsed = child.collapsed,
				label = child.label;
		if (child.id == "urlbar-zoom-button" && child.hidden)
		{
			child.label = "100%";
		}
		child.hidden = false;
		child.collapsed = false;
		clone = document.importNode(child, true);
		clone._id = clone.id;
		clone.id = "_" + clone.id;
		if (child.id == "pocket-animatable-box")
		{
			child.collapsed = true;
		}
		if (clone._id == iconId)
		{
			self.iconSelected[id] = clone;
			continue;
		}

		self.cloneClass(child, clone);
		self.cleanClone(clone);

		clone.className = "";
		for (let s = 0; s < style.length; s++)
		{
			if (child.id == "urlbar-zoom-button" && style[s] == "transform")
			{
				clone.style[style[s]] = "";
				continue;
			}
//			if (["width", "height"].indexOf(style[s]) != -1)
//			if (child.id == "reader-mode-button" && style[s] == "width")
			if (style[s] == "width")
				continue;

			clone.style[style[s]] = style[style[s]];
		}
		child.label = label;
		child.hidden = hidden;
		child.collapsed = collapsed;
		clone.style.display = "block";
		clone.hidden = false;
		clone.collapsed = false;
		clone.setAttribute("onclick", "mapaPlus.mouseClick(this);");
		if (["label", "description"].indexOf(clone.tagName) != -1 && clone.getAttribute("value") == "")
			clone.setAttribute("value", "??");

/*
		if (clone.style.listStyleImage == "none")
		 clone.style.listStyleImage = 'url("resource://gre-resources/broken-image.png")';

		if (clone.children.length == 1 && clone.children[0].style.listStyleImage == "none")
			clone.children[0].style.listStyleImage = clone.style.listStyleImage;
*/
		if (clone.tagName == "image")
		{
			let c = clone;
			clone = document.createElement("vbox");
			clone.id = c.id;
			clone._id = c._id;
			c.id = "_" + c.id;
			clone.appendChild(c);
		}
		_obj.appendChild(clone);
		clone.addEventListener("mousemove", function(e)
		{
			if (!mapaPlus.isLocked && $(checkbox).checked)
				mapaPlus.mouseMove(e);
		}, false);
		last = document.importNode(vbox, true);
		last.setAttribute("directionId", clone._id);
		last.id = "mapapl-"+ id + "-" + clone._id;
		_obj.appendChild(last);
	}// for children
	if (self.iconSelected[id])
	{
		let	elId = self.iconSelected[id].getAttribute("insertafter"),
				dir = 0,
				el;

		if (elId)
		{
			dir = 1;
			let obj = $("_" + elId);
			if (obj)
				el = obj.nextSibling;
		}
		else
		{
			elId = self.iconSelected[id].getAttribute("insertbefore");
			let obj = $("_" + elId);
			if (obj)
				el = obj.previousSibling;
		}
		if (!el)
		{
			el = _obj.lastChild;
			elId = el.previousSibling.id;
		}
		if (el)
		{
			el.setAttribute("directionId", elId);
			el.setAttribute("direction", dir);
			el.setAttribute("selected", true);
			el.collapsed = false;
		}
	}
	return urlBarIcons;
}//initIcons()

mapaPlus.showSelected = function (e)
{
	var p, pp;
	try
	{
		p = e.target.parentNode.id;
	}
	catch(error){}
	try
	{
		pp = e.target.parentNode.parentNode.id;
	}
	catch(error){}
	let id = e.target._id || e.target.id;
	if (id.match(/^mapapl-/) || p == "urlbar-icons" || p == "status-bar" || pp == "urlbar-icons" || pp == "status-bar")
		return;

	let c = $("urlbar-icons").childNodes;
	for(let i = 0; i < c.length; i++)
	{
		let id = c[i]._id || c[i].id;
		if (id.match(/^mapapl-/))
		{
			c[i].collapsed = c[i].getAttribute("selected") != "true";
		}
	}
	if ($("status-bar"))
	{
		let c = $("status-bar").childNodes;
		for(let i = 0; i < c.length; i++)
		{
			let id = c[i]._id || c[i].id;
			if (id.match(/^mapapl-/))
			{
				c[i].collapsed = c[i].getAttribute("selected") != "true";
			}
		}
	}
}

mapaPlus.mouseMove = function(event)
{
	if (mapaPlus.protected)
		return;

	let dropTarget = event.target;
	while(dropTarget.parentNode && dropTarget.parentNode.id != "urlbar-icons")
		dropTarget = dropTarget.parentNode;

	let	direction = window.getComputedStyle(dropTarget.parentNode, null).direction,
			dropTargetCenter = dropTarget.boxObject.x + (dropTarget.boxObject.width / 2),
			dragAfter;

	if (direction == "ltr")
		dragAfter = event.clientX >= dropTargetCenter;
	else
		dragAfter = event.clientX <= dropTargetCenter;

	let	c = dropTarget.parentNode.childNodes,
			icon;

	for(let i = 0; i < c.length; i++)
	{
//		if (c[i].id.match(/^mapapl-/) && (c[i].getAttribute("directionId" != dropTarget.id) || c[i].getAttribute("direction") != dragAfter))
		let id = c[i]._id || c[i].id;
		if (id.match(/^mapapl-/))
		{
			c[i].collapsed = true;
		}
	}
	if (dragAfter)
	{
		icon = dropTarget.nextSibling || dropTarget;
	}
	else
	{
		icon = dropTarget.previousSibling || dropTarget;
	}
	icon.collapsed = false;
	let id = dropTarget._id || dropTarget.id;
	icon.setAttribute("directionId", id);
	icon.setAttribute("direction", dragAfter);
}

mapaPlus.mouseClick = function mouseClick(obj)
{
log.debug();
	if (obj.disabled)
		return false;

	let c = obj.parentNode.childNodes;
	for(let i = 0; i < c.length; i++)
	{
		let id = c[i]._id || c[i].id;
		if (!id.match(/^mapapl-/))
			continue;

		if (!c[i].collapsed)
		{
			this.iconSelected["_" + id.split("-")[1]] = c[i];
			c[i].setAttribute("selected", true);
		}
		else
			c[i].setAttribute("selected", false);
	}
	this.autoSave();
}

mapaPlus.cloneStyle = function(orig, obj)
{
	if (!orig || !obj)
		return;

	let ignore = ["background-color", "width", "display", "visibility", "height", "cursor",]
	let o = window.getComputedStyle(orig, null);
	for(let i = 0; i < o.length; i++)
	{
		try
		{
			if (ignore.indexOf(o[i]) == -1)
				obj.style.setProperty(o[i], o.getPropertyValue(o[i]), o.getPropertyPriority(o[i]));
		}
		catch(e)
		{
			log.error(e);
		}
	}
	obj.className += " clone";
	if (obj.tagName == "image")
		obj.style.maxWidth = "24px";
}
mapaPlus.cloneClass = function(orig, obj)
{
	if (!orig || !obj)
		return;

	mapaPlus.cloneStyle(orig, obj);
	for(let i = 0; i < orig.childNodes.length; i++)
		mapaPlus.cloneClass(orig.childNodes[i], obj.childNodes[i]);
}

mapaPlus.cleanClone =	function cleanClone(obj, leaveAttr)
{
	let skipId = ["statusbar-display", "show_location_drag_icon", "star-button-animatable-box", "pocket-animatable-box"],
			skipTag = ["tooltip", "popup", "prefpane"];

	if (!leaveAttr)
		leaveAttr = [];

	obj.display = "";
	obj.hidden = false;
	obj.collapsed = false;
	obj.style.display = "";
	obj.style.visibility = "";
	obj.style.overflow = "hidden";

	if (obj.tagName == "label" && obj.getAttribute("tooltiptext") == "" && obj.parentNode)
		obj.setAttribute("tooltiptext", obj.getAttribute("value"));

	if (obj.getAttribute("tooltiptext") == "")
		obj.setAttribute("tooltiptext", obj.id);

	let r = [];
	for(let i = 0, a = obj.attributes; i < a.length; i++)
	{
		if (/^(on.*|tooltip|context)$/i.exec(a[i].name) && leaveAttr.indexOf(a[i].name) == -1)
			r.push(a[i].name);
	}
	for(let i = 0; i < r.length; i++)
		obj.removeAttribute(r[i]);

	let children = obj.childNodes;
	for (let i = 0; i < children.length; i++)
	{
		if (skipId.indexOf(obj.children[i].id) != -1
				|| skipTag.indexOf(obj.children[i].tagName) != -1
				|| (obj.children[i].tagName == "label"
						&& (((!obj.children[i].value && obj.children[i].getAttribute("value") == '') && !obj.children[i].childNodes.length)
								|| (obj.children[i].previousSibling && obj.children[i].previousSibling.tagName == "label"))))
		{
			if (obj.children[i].getAttribute("value") != '')
			{
				if (obj.children[i].previousSibling && obj.children[i].previousSibling.tagName == "label")
					obj.children[i].previousSibling.setAttribute("value", obj.children[i].previousSibling.getAttribute("value") + (obj.children[i].previousSibling.getAttribute("value") == "" ? " " : "") + obj.children[i].getAttribute("value"));

				obj.children[i].parentNode.setAttribute("tooltiptext", obj.children[i].parentNode.getAttribute("tooltiptext") + (obj.children[i].parentNode.getAttribute("tooltiptext") == "" ? "" : "") + obj.children[i].getAttribute("value"));
			}

			obj.removeChild(obj.children[i]);
			i--;
		}
		else
			mapaPlus.cleanClone(obj.children[i]);
	}
	return obj;

}

mapaPlus.getOrder = function(obj)
{
	let id = "",
			dir = false,
			sel = null,
			c = $(obj),
			first, last;

	if (!c)
		return false;

	c = c.childNodes;
	for(let i = 0; i < c.length; i++)
	{
		if (c[i].id.match(/^mapapl-/))
		{
			if (c[i].getAttribute("selected") == "true")
				sel = c[i];
		}
		else
		{
			if (!first)
				first = c[i];

			last = c[i];
		}
	}
	if (sel)
	{
		id = sel.getAttribute("directionId");
		dir = sel.getAttribute("direction") == "true";
		if ((id == first.id && !dir) || (id == last.id && dir))
			id = "mapapl";

		return {id: id, dir: dir};
	}
	return false;
}

mapaPlus.timer = {
	timer: Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
	init: function()
	{
		this.timer.init(this, 500, this.timer.TYPE_REPEATING_SLACK);
		window.addEventListener("unload", this.cancel, false);
	},
	cancel: function()
	{
		mapaPlus.timer.timer.cancel();
	},
	observe: function()
	{
		$("mapaPlusIndicateIcon").setAttribute("suppressed", ($("mapaPlusSuppressBlink").checked ? !($("mapaPlusIndicateIcon").getAttribute("suppressed") == "true") : true));
		$("mapaPlusIdleStatus").setAttribute("idle", mapaPlusCore.idleService.idleTime < ($("mapaPlusIdle").value * 200 + 100) ? 0 : 1);
	}
}

mapaPlus.setProtect = function(n, v)
{
	mapaPlus[n] = v;
	this.timer[n] = v;
}

mapaPlus.checkboxTriState = function(event)
{
	event.target.setAttribute("indeterminate", false);
	return;
}


mapaPlus.suppressedPopup = function()
{
	if (this.mainWindow.mapaPlus)
		this.mainWindow.mapaPlus.suppressedPopup(true, $("mapaPlusSuppressPopupRemove").value);
}

mapaPlus.close = function()
{
	window.removeEventListener("mousemove", mapaPlus.showSelected, true);
	$("masterPasswordPlusOptions").removeEventListener("DOMMouseScroll", mapaPlus.mouseScroll, true);
	window.removeEventListener("focus", this.onFocus, true);
	mapaPlus.core.windowRemove(mapaPlus.windowID, mapaPlus.windowType);
}

mapaPlus.confirmPasswordDone = {};
mapaPlus.confirmPassword = function(e)
{
	var r = true
	if ((e.type == "keydown" && e.keyCode != 32) || (e.type == "click" && e.button))
		return r;

	if (e.target.tagName == "checkbox")
	{
		if (!e.target.checked && this.core.pref(e.target.getAttribute("preference")))
		{
			e.target.checked = true;
			e.target.checked = r = !this.confirmPasswordDo("");
		}
	}
	else
	{
		var p = e.target.parentNode.parentNode;
		var d = p.hasAttribute("prevset") ? parseInt(p.getAttribute("prevset")) : this.core.pref(p.getAttribute("preference"));
		if (d && !this.confirmPasswordDo(""))
		{
			r = false;
			p.value = d;
		}
		else
			d = p.value;

		p.setAttribute("prevset", d);
	}
	return r;
}

mapaPlus.confirmPasswordDo = function confirmPasswordDo(id, f)
{
log.debug();
	f = f || false;
	if (!f && !this.isLocked && (this.pass || this.confirmPasswordDone[id] || (!this.instantApply && !this.protected && this.protectedBegin)))
		return true;

	this.core.dialogBackup = {
		dialogOptions: this.core.dialogOptions,
		dialogTemp: this.core.dialogTemp,
		dialogShow: this.core.dialogShow,
	};
	this.core.dialogShow = true;
	this.core.dialogTemp = false;
	this.core.dialogOptions = false;
	this.core.dialogForce = true;//false;
	var ret = false;
	var status = this.core.status == 1;
	this.core.lockDo = false;
	try
	{
		this.core.tokenDB.login(true);
		this.core.locked = false;
		this.confirmPasswordDone[id] = true;
//		if (!status)
//			this.core.tokenDB.logoutAndDropAuthenticatedResources();

		ret = true;
	}
	catch(e){}
	this.core.lockDo = true;
	return ret;
}
mapaPlus.addEventListener = function(id, callback, pref)
{
	let observer = new MutationObserver(callback);
	observer.observe($(id), pref);
// do we need disconnect on unload?
}

mapaPlus.setListeners = function()
{
	$("mapaPlusEnabled").addEventListener("CheckboxStateChange", this.enableDisable, false);
	$("mapaPlusStartup").addEventListener("CheckboxStateChange", this.enableDisable, false);
	$("mapaPlusStartupShort").addEventListener("CheckboxStateChange", this.enableDisable, false);
	$("mapaPlusSuppressPopup").addEventListener("CheckboxStateChange", this.suppress, false);
	$("mapaPlusToolsmenu").addEventListener("CheckboxStateChange", this.viewTogle, false);
	$("mapaPlusContextmenu").addEventListener("CheckboxStateChange", this.viewTogle, false);
	$("mapaPlusStatusbar").addEventListener("CheckboxStateChange", this.viewTogle, false);
	$("mapaPlusUrlbar").addEventListener("CheckboxStateChange", this.enableDisable, false);
	$("mapaPlus_locktimer").addEventListener("CheckboxStateChange", this.enableDisable, false);
	$("mapaPlus_lockminimize").addEventListener("CheckboxStateChange", this.enableDisable, false);
	try
	{
		this.addEventListener("mapaPlusSuppress", this.suppress, {attributes: true, attributeFilter: ["value"]});
		this.addEventListener("mapaPlusLogoutHotkey", this.hotkeyChanged, {attributes: true, attributeFilter: ["value"]});
		this.addEventListener("mapaPlusLockHotkey", this.hotkeyChanged, {attributes: true, attributeFilter: ["value"]});
		this.addEventListener("mapaPlusLockWinHotkey", this.hotkeyChanged, {attributes: true, attributeFilter: ["value"]});
	}
	catch(e)
	{
		$("mapaPlusSuppress").addEventListener("DOMAttrModified", this.suppress, false);
		$("mapaPlusLogoutHotkey").addEventListener("DOMAttrModified", this.hotkeyChanged, false);
		$("mapaPlusLockHotkey").addEventListener("DOMAttrModified", this.hotkeyChanged, false);
		$("mapaPlusLockWinHotkey").addEventListener("DOMAttrModified", this.hotkeyChanged, false);
	}
}

mapaPlus.onLoadCommon = function(e)
{
	mapaPlus.initCommon();
}

mapaPlus.closeCommon = function()
{
}

mapaPlus.initCommon = function(id)
{
	if (id == this.windowID)
		return;

	if (!this.core.isTB)
	{
		if (this.iniIcons("mapa_urlbar", "urlbar", "mapaPlusUrlbar"))
			$("urlbar-container").collapsed = false;
		else if (this.iniIcons("mapa_urlbar", "urlbar", "mapaPlusUrlbar"))
			$("urlbar-container").collapsed = false;

		$("panelDisplay").addEventListener("mousemove", this.showSelected, true);
		$("mapaPlusSuppressPopupBox").collapsed = false;
		if ($("mapaPlusSuppressPopup").checked && this.core.suppressedPopupStop)
		{
			$("mapaPlusSuppressPopup").setAttribute("indeterminate", true);
			$("mapaPlusSuppressPopup").checked = false; //we want first click check the checkbox, not uncheck it.
		}
		$("urlbar").boxObject.firstChild.setAttribute("flex", 0);
		$("options").setAttribute("options", true);
	}

	$("mapaPlusDebug").addEventListener("command", this.debugClick, true);
	$("mapaPlusChangesLog").addEventListener("command", this.changesLogClick, true);
	let obj = $("mapaPlusShowChangesLog_button");
	obj.setAttribute("linkCopy", mapaPlus.CHANGESLOG_URL);
	obj.addEventListener("click", function(e)
	{
		if (e.button != 2 && !e.target.disabled)
			mapaPlus.showChangesLog()

		e.stopPropagation();
		e.preventDefault();
	}, true);
	this.debugMenu();
	this.changesLogMenu();
	this.hotkeyInit();
	this.protectedBegin = this.core.pref("protect");

	$("mapaPlus_locktimer_box").setAttribute("tooltiptext", $("mapaPlus_locktimer_box").getAttribute("tooltiptext").replace("#", this.core.appInfo.name));
/*
	this.setAttribute("mapaPlus_locktimer_box",
										"tooltiptext",
										$("mapaPlus_locktimer_box").getAttribute("tooltiptext").replace("#", this.core.appInfo.name),
										false,
										["mapaPlus_locktimeout_d", "mapaPlus_locktimeout_h", "mapaPlus_locktimeout_m", "mapaPlus_locktimeout_s"]
	);
*/
	$("mapaPlusStartupFail").setAttribute("prevset", this.core.pref("startupfail"));
	window.addEventListener("CheckboxStateChange", this.checkboxTriState, false);
	window.addEventListener("unload", this.closeCommon, false);
	if (Cc["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Ci.nsIVersionComparator)
			.compare(this.core.appInfo.version, "8.0") < 0)
	{
		$("mapaPlusAllPrefs").collapsed = true;
	}
	if ("arguments" in window && window.arguments[0])
	{
		var a = window.arguments[0];
		if (typeof(a) == "string")
			a = {selectTab: a};

		for(var c in a)
		{
			switch(c)
			{
				default:
				case "selectTab":
						var t = $("options").childNodes[0].childNodes;
						for(var i = 0; i < t.length; i++)
							if (t[i].id == a[c])
							{
								$("options").selectedIndex = i;
								break;
							}
					break;
			}
		}
	}
	if (!this.core.status)
	{
		this.setProtect("protectedBegin", false);
	}

	if (this.protectedBegin)
	{
//		this.core.tokenDB.logoutAndDropAuthenticatedResources();
	}
	this.setProtect("protected", this.protectedBegin)

	this.observer.init();
	this.timeoutSet("logouttimeout");
	this.timeoutSet("locktimeout");
	this.timeoutSet("startuptimeout");
	$("mapaPlusIdle").value = this.core.pref("idle");

	let tools = $("toolsBox");
	document.documentElement._buttons.accept.parentNode.insertBefore(tools, document.documentElement._buttons.accept.parentNode.firstChild);

	if (this.core.locked)
		this.lock(true);
	else
		this.enableDisable();

/*
	let w = $("urlbar").inputField.parentNode.boxObject.width;
	$("urlbar").inputField.parentNode.style.minWidth = "140px";
	let w2 = $("urlbar").inputField.parentNode.boxObject.width;
	if (w2 > w)
	{
		$("urlbar").width = $("urlbar").boxObject.width + (w2-w);
	}
*/
	if (this.core.isWsLocked === null)
	{
		$("mapaPlus_logoutonwslock").collapsed = true;
		$("mapaPlus_lockonwslock").collapsed = true;
	}
	AddonManager.getAllAddons(function(list)
	{
		mapaPlus.updateInfoBox(list);
		//browser\omni\chrome\browser\content\browser\preferences\in-content\subdialogs.js
		let box = window.parent.document.getElementById("dialogBox");
		if (box)
		{
			let frame = window.parent.document.getElementById("dialogFrame");
			// Do this on load to wait for the CSS to load and apply before calculating the size.
			let docEl = frame.contentDocument.documentElement;
			let groupBoxBody = document.getAnonymousElementByAttribute(box, "class", "groupbox-body");
			// These are deduced from styles which we don't change, so it's safe to get them now:
			let boxHorizontalPadding = 2 * parseFloat(getComputedStyle(groupBoxBody).paddingLeft);
			let boxHorizontalBorder = 2 * parseFloat(getComputedStyle(box).borderLeftWidth);
			// Then determine and set a bunch of width stuff:
			let frameMinWidth = docEl.scrollWidth + "px";
			let frameWidth = docEl.getAttribute("width") + "px";
			frame.style.width = frameWidth;
			box.style.minWidth = "calc(" + (boxHorizontalBorder + boxHorizontalPadding) + "px + " + frameMinWidth + ")";
		}
	});

	$("masterPasswordPlusOptions").addEventListener("DOMMouseScroll", this.mouseScroll, true);
	window.addEventListener("focus", this.onFocus, true);

}//initCommon()

mapaPlus.prefChanged = function()
{
	mapaPlus.updateInfoBox();
}

mapaPlus.updateInfoBox = function updateInfoBox(list)
{
	log.debug();
	if (!list)
		return AddonManager.getAllAddons(mapaPlus.updateInfoBox);

	$("supportCopyInfoBox").value = JSON.stringify(changesLog.getEmailBody(list), null, 2);
}

mapaPlus.loadArgs = function()
{
	if ("arguments" in window && window.arguments[0])
	{
		var a = window.arguments[0];
		if (typeof(a)	== "object")
		{
			for(var c in a)
			{
				this[c] = a[c];
			}
		}
	}
}

mapaPlus.viewTogle = function(e)
{
	if (!this.instantApply)
		return;

	this.core.pref(e.target.getAttribute("preference"), e.target.checked);
	this.core.windowUpdate(true,true);
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

	uninit: function observer_dialog_options_uninit()
	{
log.debug();
		this._observerService.removeObserver(this, this._name);
	},

	observe: function(aSubject, aTopic, aData)
	{
		aSubject.QueryInterface(Ci.nsISupportsString);
//log("commonop observe " + aSubject.data);
		if (aTopic != this._name || !mapaPlus[aSubject.data])
			return;

log("commonop "+aData);
		mapaPlus[aSubject.data](aData);
	},
}

mapaPlus.lock = function(l)
{
	if (typeof(l) != "boolean")
	{
		l =  l.split("|");
		if (l[1] && l[1] == this.windowID)
			return;

		l = l[0] == "true";
	}
	try{document.documentElement.getButton("extra1").hidden = !l}catch(e){};
	this.protectUnlockDo(l);
	this.enableDisable(false);
}

mapaPlus.protectUnlock = function()
{
	if (this.confirmPasswordDo(""))
	{
		this.protectUnlockDo(false);
		this.enableDisable();
	}
}

mapaPlus.protectUnlockDo = function(p)
{
	if (!p)
		this.confirmPasswordDone[""] = true;

	this.isLocked = p;
	this.setProtect("protectedBegin", p);
	this.setProtect("protected", p);
	try{document.documentElement.getButton("extra1").hidden = !p}catch(e){};
}

mapaPlus.hotkeyPress = function(e)
{
	return !mapaPlus.hotkeyDownRepeat;
}

mapaPlus.hotkeyBlur = function(e)
{
	if (e.target.getAttribute("error") == "true")
	{
		var d = mapaPlus.hotkeyCheckDup(e.target.id, e.target.keys, false, "mapa");
		if (!d)
			mapaPlus.hotkeyShow([e.target.keysOrig], e.target, "init");
	}
	return true;
}
mapaPlus.hotkeyDown = function(e)
{
	if (e.keyCode == 9 || e.keyCode == 27 || e.keyCode == 13) //TAB, ESCAPE, ENTER
	{
		this.hotkeyDownRepeat = false;
		return true;
	}

	var keys = this.core.getKeys(e);
	if (this.core.matchKeys(this.lastKeyDown, keys[0])) //prevent repeats
	{
		this.hotkeyDownRepeat = true;
		return false;
	}
	this.hotkeyDownRepeat = false;
	this.lastKeyDown = keys[0];
	return this.hotkey(e, "down");
}

mapaPlus.hotkeyUp = function(e)
{
	var keys = this.core.getKeys(e);
	this.lastKeyDown = [];
	var k = e.target.keys;
/*
	if ((!keys[1][0].length && !e.target.keys.length) || (keys[1][0].length == e.target.keys.length))
	{
		k = [];
	}
*/
	if (e.keyCode == 8) //BACKSPACE
		k = [];
	else if (!k.length || (!keys[1][0].length && !k.length) || (keys[1][0].length == k.length))
	{
		k = e.target.keysOrig;
	}
	this.hotkeyShow([k], e.target, "up");
	if (e.target.getAttribute("error") != "true")
	{
		e.target.keysNew = e.target.keys;
		this.autoSave();
	}
}

mapaPlus.hotkey = function(e, type)
{
	if (e.keyCode == 9 || e.keyCode == 27 || e.keyCode == 13) //TAB, ESCAPE, ENTER
		return true;

	e.preventDefault();
	e.stopPropagation();
	var keys = this.core.getKeys(e);
/*
	if (e.keyCode == 27) //ESCAPE
		keys = [[],[[]]];
*/

	if (e.keyCode == 8) //BACKSPACE
		keys = [[],[[]]];

	mapaPlus.hotkeyShow(keys, e.target, type);
	return true;
}

mapaPlus.hotkeyChanged = function(e)
{
	if (e.target.keys)
	{
		mapaPlus.hotkeyShow([e.target.keys], e.target);
	}
}

mapaPlus.hotkeyShow = function(keys, obj, type)
{
	if (type == "down" && keys[1] && keys[1][0].length == 1 && keys[1][0][0] == "SHIFT")
		return false;

	var s = false;
	var r = "";
	type = type || null;
	var r = this.hotkeyGet(keys[0]);
	var fKeys = r[1];
	r = r[0];

//log(type + "\n-\n" + keys[0] + "\n-\n" + keys[1] + "\n-\n" + obj.keys)
	if ((type != "down" && keys[0].length < 2))
	{
		r = "";
		s = true;
	}
	else
	{
		if (type == "down")
		{
			if (keys[0].length == 1 || keys[0].length == keys[1][0].length)
			{
				if (keys[1][0].length)
					r += " + ";

				fKeys = [];
			}
		}
		s = true;
	}
	var dup = this.hotkeyCheckDup(obj.id, fKeys);

	if (dup)
		s = true;

	if (!r)
	{
		fKeys = [];
		r = "none";
		if (!obj.keys || obj.keys.length)
			s = true;
	}

	if (s)
	{
		obj.keys = fKeys;
		this.hotkeyTaken.mapa[obj.id] = fKeys;
		if (!obj.keysOrig || type == "init")
		{
			obj.keysOrig = obj.keys;
			obj.keysNew = obj.keys;
		}
	}

	if (type == "down" || type == "init" || type == "up")
		this.hotkeyDupMark();

	obj.value = r;
	return [r, dup];
}

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
		r = r + (r != "" ? " + " : "") + k;
	}
	return [r, keys];
}

mapaPlus.hotkeyFormat = function(k)
{
	if (this.hotkeyString[k.toUpperCase()])
		return this.hotkeyString[k.toUpperCase()];

	return k;
}

mapaPlus.hotkeyDupMark = function()
{
	var l = this.hotkeyTaken.mapa;
	for(var i in l)
	{
		$(i).setAttribute("error", this.hotkeyCheckDup(i, l[i]) ? true : false);
	}
}

mapaPlus.hotkeyCheckDup = function(id, keys, skip, type)
{
	if (!keys.length)
		return false;

	var l = {};
	if (type)
		l[type] = this.hotkeyTaken[type];
	else
		l = this.hotkeyTaken;

	for(var n in l)
		for (var i in l[n])
			if (skip && skip.indexOf(i) != 1)
				continue;
			else if (i != id && this.core.matchKeys(keys, l[n][i]))
				return i;

	return false;
}

mapaPlus.hotkeyInit = function hotkeyInit(id)
{
log.debug();
	if (this.windowID == id)
		return;

	if (this.core.prefHotkeysPref2Var[id])
	{
		this.hotkeyShow([this.core[this.core.prefHotkeysPref2Var[id]], this.core.prefHotkeysPref2Var[id].replace(/^pref/, "mapaPlus"), "init"]);
		return;
	}
	this.hotkeyTaken = {mapa:[], all:[]};
	var keys = this.mainWindow.document.getElementsByTagName("key");
	for(let i = 0, l = keys.length; i < l; i++)
	{
		if (keys[i].id.indexOf("mapaPlus_key") != -1 || !keys[i].hasAttribute("modifiers") || (!keys[i].hasAttribute("key") && !keys[i].hasAttribute("keycode") && !keys[i].hasAttribute("charcode")))
			continue;
		let k = keys[i].hasAttribute("keycode") ? keys[i].getAttribute("keycode").toUpperCase().replace("VK_", "") :
							keys[i].hasAttribute("key") ? keys[i].getAttribute("key").toUpperCase() :
								keys[i].getAttribute("charcode").toUpperCase();
		if (!k)
			continue;
		let m = keys[i].getAttribute("modifiers").toUpperCase().replace("ACCEL", this.core.accel).replace(/^\s+|\s+$/g,"").replace(/[^A-Z]/g, " ").split(" ");
		this.hotkeyTaken.all["mapaPlusHotkeyTaken"+i] = m;
		this.hotkeyTaken.all["mapaPlusHotkeyTaken"+i].push(k);
	}
	this.hotkeyShow([this.core.prefLogoutHotkey], $("mapaPlusLogoutHotkey"), "init");
	this.hotkeyShow([this.core.prefLockHotkey], $("mapaPlusLockHotkey"), "init");
	this.hotkeyShow([this.core.prefLockWinHotkey], $("mapaPlusLockWinHotkey"), "init");
	this.hotkeyShow([this.core.prefLockLogoutHotkey], $("mapaPlusLockLogoutHotkey"), "init");
	document.documentElement.getButton("disclosure").removeAttribute("accesskey");
}

mapaPlus.hotkeySave = function(id, pref)
{
	if ($(id).getAttribute("error") == "true")
		return;

	this.core.pref(pref, $(id).keys.join(" ").toUpperCase());
	$(id).keysOrig = $(id).keys;
}

mapaPlus.openAllPrefs = function()
{
	let first = mapaPlus.core.windowFirst();
	if (first === null)
		return;

	mapaPlus.core.window["Window"][first].openURL('about:config?filter=' + mapaPlus.core.PREF_BRANCH);
	mapaPlus.core.windowFocus();
}
mapaPlus.debugParse = function debugParse()
{
	let c = $("mapaPlusDebugMenu").children,
	r = 0;
	for (let i = 0; i < c.length; i++)
		if (c[i].getAttribute("checked"))
			r += Number(c[i].getAttribute("value"));

	return r;
}
mapaPlus.debugSave = function()
{
	mapaPlusCore.pref("debug", this.debugParse());
}

mapaPlus.debugClick = function debugClick(e)
{
log.debug();
	mapaPlus.debugMenu(mapaPlus.debugParse());
	if (mapaPlus.instantApply)
		mapaPlus.debugSave();
}

mapaPlus.debugMenu = function debugMenu(v)
{
log.debug();
	v = typeof(v) == "undefined" ? mapaPlusCore.pref("debug") : v;
	let c = $("mapaPlusDebugMenu"),
			t = [];

	c = c.children;
	for (let i = 0; i < c.length; i++)
	{
		let val = Number(c[i].getAttribute("value"));
		if (v & val)
		{
			c[i].setAttribute("checked", true);
		}
		else
		{
			c[i].removeAttribute("checked");
		}
		if (val & 1)
			c[i].hidden = (v & val);
//			c[i].disabled = (v & val) ? true : false;
//log([val, v, (val & 1), (v & val), c[i].disabled])
	}
}


mapaPlus.changesLogMenuParse = function changesLogMenuParse()
{
	let c = $("mapaPlusChangesLogMenu").children,
	r = 0;
	for (let i = 0; i < c.length; i++)
		if (c[i].getAttribute("checked"))
			r += Number(c[i].getAttribute("value"));

	return r;
}
mapaPlus.changesLogSave = function()
{
	mapaPlusCore.pref("showchangeslog", this.changesLogMenuParse());
}

mapaPlus.changesLogClick = function changesLogClick(e)
{
	let first = mapaPlus.core.windowFirst();
	if (first !== null)
	{
		let win = mapaPlus.core.window["Window"][first];

		if (e.explicitOriginalTarget.getAttribute("checked")
				&& Number(e.explicitOriginalTarget.getAttribute("value")) & mapaPlus.CHANGESLOG_NOTIFICATION)
			mapaPlus.showChangesLog(mapaPlus.CHANGESLOG_NOTIFICATION, win)

	}
	mapaPlus.changesLogMenu(mapaPlus.changesLogMenuParse());
	if (mapaPlus.instantApply)
		mapaPlus.changesLogSave();
}

mapaPlus.changesLogMenu = function changesLogMenu(v)
{
log.debug();
	v = typeof(v) == "undefined" ? mapaPlusCore.pref("showchangeslog") : v;
	let c = $("mapaPlusChangesLogMenu"),
			t = [];

	c = c.children;
	for (let i = 0; i < c.length; i++)
	{
		if (c[i].getAttribute("value") == 1 && !mapaPlus.notificationAvailable)
			c[i].hidden = true;
//			c[i].disabled = true;

//		if (!c[i].disabled && v & Number(c[i].getAttribute("value")))
		if (!c[i].hidden && v & Number(c[i].getAttribute("value")))
		{
			t.push(mapaPlus.strings["changesLog" + Number(c[i].getAttribute("value"))]);
			c[i].setAttribute("checked", true);
		}
		else
			c[i].removeAttribute("checked");
	}
	if (!t.length)
		t = [mapaPlus.strings["none"]];

	$("mapaPlusChangesLog").setAttribute("label", (t.join(" + ")));
}

mapaPlus.linkClick = function linkClick(obj, e)
{
	let url = obj.getAttribute("href");
	let email = url.match(/^mailto:/);
	if (!obj.fixed)
	{
		let tags = {
					OS: mapaPlus.core.appInfo.OS + " (" + mapaPlus.core.appInfo.XPCOMABI + ")",
					VER: mapaPlus.core.addon.version,
					APP: mapaPlus.core.appInfo.name + " " + mapaPlus.core.appInfo.version,
				}
		if (email)
		{
			let reg = new RegExp("\{([A-Z]+)\}", "gm");
			url = url.replace(reg, function(a, b, c, d)
			{
				if (b in tags)
					return " " + tags[b];
				return a;
			});
			obj.setAttribute("href", url);
			obj.fixed = true;
		}
	}
	if (!mapaPlus.core.isTB || e.button == 2)
		return true;

	try
	{
		if (e.button == 1)
			mapaPlus.core.openUILinkIn(url);
		else if (email)
		{
			let aURI = Cc["@mozilla.org/network/io-service;1"]
							.getService(Ci.nsIIOService)
							.newURI(url, null, null);
			Cc["@mozilla.org/messengercompose;1"]
				.getService(Ci.nsIMsgComposeService)
				.OpenComposeWindowWithURI(null, aURI);
		}
		else
		{
			let tabmail = window.top.document.getElementById("tabmail"),
					args = {
						type: "contentTab",
						contentPage: url,
						background: false
					};
				tabmail.openTab(args.type, args);
		}
	}
	catch(e)
	{
		try
		{
			mapaPlus.core.openUILinkIn(url);
		}
		catch(e)
		{
			log.error(e);
		};
	}
	return false;
}//linkClick()

mapaPlus.copyMenu = function(e)
{
	mapaPlus.copy(document.popupNode.hasAttribute("linkCopy") ? document.popupNode.getAttribute("linkCopy") : document.popupNode.getAttribute("link"));
}

mapaPlus.copy = function(txt)
{
	Cc["@mozilla.org/widget/clipboardhelper;1"]
		.getService(Ci.nsIClipboardHelper)
		.copyString(txt);
}

mapaPlus.enableDisable = function enableDisable(e)
{
log.debug();
	if (mapaPlus._enableDisable)
		mapaPlus._enableDisable(e);

	let	status, startup, lock, disable, minimize,
			locked = (mapaPlus.protected || mapaPlus.isLocked),
			isOptions = mapaPlus.windowType == "options";

	if (locked)
	{
		status = true;
		startup = true;
		lock = true;
		minimize = true;
		$("mapaPlusEnabled").disabled = true;
		$("mapaPlusStartup").disabled = true;
		$("mapaPlus_locktimer").disabled = true;
		if (isOptions)
			document.documentElement.getButton("accept").disabled = true;

		document.documentElement.getButton("disclosure").disabled = true;
		document.documentElement.getButton("extra1").hidden = false;
		disable = true;
	}
	else
	{
		$("mapaPlusEnabled").disabled = false;
		$("mapaPlusStartup").disabled = false;
		$("mapaPlus_locktimer").disabled = false;
		if (isOptions)
			document.documentElement.getButton("accept").disabled = false;

		document.documentElement.getButton("disclosure").disabled = false;
		document.documentElement.getButton("extra1").hidden = true;
		status = !$("mapaPlusEnabled").checked;
		startup = !$("mapaPlusStartup").checked;
		lock = !$("mapaPlus_locktimer").checked;
		disable = false;
		minimize = !$("mapaPlus_lockminimize").checked || lock;
	}
	mapaPlus.setAttribute($("panelTimeout").firstChild, "disabled", locked, !locked);
	mapaPlus.setAttribute($("panelLock").firstChild, "disabled", locked, !locked);
	mapaPlus.setAttribute($("panelStartup").firstChild, "disabled", locked, !locked);
	mapaPlus.setAttribute($("panelPrompt").firstChild, "disabled", locked, !locked);
	mapaPlus.setAttribute($("panelDisplay").firstChild, "disabled", locked, !locked);
	mapaPlus.setAttribute($("panelGeneral").firstChild, "disabled", locked, !locked);
	mapaPlus.setAttribute($("panelHelp").firstChild, "disabled", locked, !locked);
	mapaPlus.setAttribute("mapaPlusTimeoutBox", "disabled", status, !status);
	mapaPlus.setAttribute("mapaPlus_logoutonminimize", "disabled", disable, !disable);
	mapaPlus.setAttribute("mapaPlusStartupBox", "disabled", startup, !startup);
	mapaPlus.setAttribute("mapaPlusLockBox", "disabled", lock, !lock);
	mapaPlus.setAttribute("mapaPlusLockBox2", "disabled", disable, !disable);
	mapaPlus.setAttribute("mapaPlusLockBox3", "disabled", disable, !disable);
	mapaPlus.setAttribute("mapaPlusSuppressBlinkBox", "disabled", disable, !disable);
	mapaPlus.setAttribute("mapaPlusSuppressPopupBox", "disabled", disable, !disable);
	mapaPlus.setAttribute("mapaPlusSuppressSoundBox", "disabled", disable, !disable);
	mapaPlus.setAttribute("toolsBox", "disabled", disable, !disable);

	$("mapaPlus_lockminimizeblur").disabled = minimize;
	let urlbar = !$("mapaPlusUrlbar").checked || locked;
	mapaPlus.setAttribute("urlbar-container", "disabled", urlbar, !urlbar);

/*
	if (e !== false)
		mapaPlus.core.windowAction("lock", locked+"|"+mapaPlus.windowID, "Dialog");
*/

	let n = document.getElementsByClassName("note");
	for(let i = 0; i < n.length; i++)
		n[i].collapsed = mapaPlus.core.status;

	mapaPlus.suppress();

}//enableDisable()

mapaPlus.timeoutSet = function (name)
{
	let t = mapaPlus.core.pref(name),
			time = mapaPlus.core.timeSplit(t*1000);

	$("mapaPlus_" + name + "_d").value = time.d;
	$("mapaPlus_" + name + "_h").value = time.h;
	$("mapaPlus_" + name + "_m").value = time.m;
	$("mapaPlus_" + name + "_s").value = time.s;
}
mapaPlus.timeoutGet = function (name)
{
	return	Number($("mapaPlus_" + name + "_d").value) * 86400 +
					Number($("mapaPlus_" + name + "_h").value) * 3600 +
					Number($("mapaPlus_" + name + "_m").value) * 60 +
					Number($("mapaPlus_" + name + "_s").value);
}

mapaPlus.timeoutSave = function timeoutSave(name, noasync)
{
log.debug();
	let t = mapaPlus.timeoutGet(name),
			that = mapaPlus,
			func = function()
			{
				that.core.pref(name, t);
			};
	if (t < 10)
		t = 10;

	if (noasync)
		func();
	else
		mapaPlus.core.async(func, 100);
}

mapaPlus.spinValue = function spinValue(obj, val, step)
{
log.debug();
	this.changeValue(obj, parseInt(val), step);
	mapaPlus.numbersOnly({target: obj});
	obj.select();

}
mapaPlus.numbersOnly = function numbersOnly(e)
{
log.debug();
	let start = e.target.selectionStart,
			end = e.target.selectionEnd,
			orig = e.target.value
			val = parseInt(orig.replace(/[^0-9]*/g, ''));
	if (isNaN(val))
		val = 0;

	e.target.value = val;
	mapaPlus.changeValue(e.target, val);
	if (e.target.value != orig)
	{
		start--;
		end--;
	}
//	e.target.selectionStart = start;
//	e.target.selectionEnd = end;
	if (mapaPlus.instantApply)
		mapaPlus.timeoutSave(e.target.id.replace(/mapaPlus_([^_]+)_.*/, "$1"));
}
mapaPlus.spinKeyEvent = function(e)
{
	let	r = true,
			kC = e.code;

	switch (kC)
	{
		case "ArrowUp":
			if (!e.shiftKey && !e.ctrlKey && !e.altKey)
			{
				this.spinValue(e.target, parseInt(e.target.value), 1);
				r = false;
			}
			break;

		case "ArrowDown":
			if (!e.shiftKey && !e.ctrlKey && !e.altKey)
			{
				this.spinValue(e.target, parseInt(e.target.value), -11);
				r = false;
			}
			break;

		case "PageUp":
			if (!e.shiftKey && !e.ctrlKey && !e.altKey)
			{
				this.spinValue(e.target, parseInt(e.target.value), 10);
				r = false;
			}
			break;

		case "PageDown":
			if (!e.shiftKey && !e.ctrlKey && !e.altKey)
			{
				this.spinValue(e.target, parseInt(e.target.value), -10);
				r = false;
			}
			break;
	}
	return r;
}

mapaPlus.changeValue = function changeValue(o, value, add)
{
log.debug();
	if (typeof(o) == "string")
		o = document.getElementById(o);

	let s = o.selectionStart,
			e = o.selectionEnd;

	if (typeof(add) == "undefined")
		add = 0;

	value = parseInt(value) + add;
	let max = parseInt(o.getAttribute("max")),
			min = parseInt(o.getAttribute("min")),
			wrap = o.getAttribute("wraparound") == "true";

	if (isNaN(value))
		value = 0;

	if (isNaN(max))
		max = 0;

	if (isNaN(min))
		min = 0;

	if (max && value > max)
	{
		if (wrap && add)
			value = min;
		else
			value = max;
		e = value.toString().length;
		s = 0;
	}
	if (value < min)
	{
		if (wrap && add == -1)
			value = max;
		else
			value = min;

		e = value.toString().length;
		s = 0;
	}
	o.value = value;
	o.selectionEnd = e;
	o.selectionStart = s;
}

mapaPlus.mouseScroll = function mouseScroll(e)
{
log.debug();
	if (e.axis != e.VERTICAL_AXIS || e.timeStamp == mapaPlus.mouseScrollTimeStamp)
		return true;

	mapaPlus.mouseScrollTimeStamp = e.timeStamp;
	if (!mapaPlus.focused || mapaPlus.focused.tagName != "textbox" || mapaPlus.focused.getAttribute("type") != "number" || mapaPlus.focused.disabled)
		return true;

	mapaPlus.spinValue(mapaPlus.focused, mapaPlus.focused.value, e.detail > 0 ? -1 : 1);

}//mouseScroll()
mapaPlus.onFocus = function onFocus(e)
{
	mapaPlus.focused = e.target;
}

mapaPlus.command = function command(com)
{
	switch(com)
	{
		case "backup":
			this.settingsBackup();
			break;
		case "restore":
			this.settingsRestore();
			break;
		case "reset":
			this.settingsReset();
			break;
	}
}//command()

mapaPlus.right = function(str, n)
{
	if (n <= 0)
		return "";

	else if (n > String(str).length)
		return str;

	else
	{
		var iLen = String(str).length;
		return String(str).substring(iLen, iLen - n);
	}
}

mapaPlus.saveFile = function(fp, content)
{
//save file block taken from chrome://pippki/content/pippki.js
	let bundle = Cc["@mozilla.org/intl/stringbundle;1"]
										.getService(Ci.nsIStringBundleService)
										.createBundle("chrome://pippki/locale/pippki.properties"),
//			localFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile),
			localFile = new FileUtils.File(fp.file.path),
			msg = "",
			written = false;

	try
	{
		localFile.initWithPath(fp.file.path);
		if (localFile.exists())
			localFile.remove(true);

		localFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0600);
		let fos = Cc["@mozilla.org/network/file-output-stream;1"]
								.createInstance(Ci.nsIFileOutputStream),
				coStream = Cc["@mozilla.org/intl/converter-output-stream;1"]
										.createInstance(Ci.nsIConverterOutputStream);
		// flags: PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE
		fos.init(localFile, 0x04 | 0x08 | 0x20, 0600, 0);

		coStream.init(fos, "utf-8", null, null);

		written = coStream.writeString(content);
		coStream.close();
		if (fos instanceof Ci.nsISafeOutputStream)
			fos.finish();
		else
			fos.close();

	}
	catch(e) {
		switch (e.result) {
			case Components.results.NS_ERROR_FILE_ACCESS_DENIED:
				msg = bundle.GetStringFromName("writeFileAccessDenied");
				break;
			case Components.results.NS_ERROR_FILE_IS_LOCKED:
				msg = bundle.GetStringFromName("writeFileIsLocked");
				break;
			case Components.results.NS_ERROR_FILE_NO_DEVICE_SPACE:
			case Components.results.NS_ERROR_FILE_DISK_FULL:
				msg = bundle.GetStringFromName("writeFileNoDeviceSpace");
				break;
			default:
				msg = e.message;
				break;
		}
	}
	if (!written)
	{
		if (!msg.length)
			msg = bundle.GetStringFromName("writeFileUnknownError");

			this.alert(bundle.formatStringFromName("writeFileFailed",[fp.file.path, msg], 2),
									bundle.GetStringFromName("writeFileFailure"));
		return false;
	}
	return true;
}//saveFile();

mapaPlus._openDialog = function(url, b, c, arg)
{

	let wm = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator),
			wins = wm.getZOrderDOMWindowEnumerator('', false),
			win;
	if (!url.match("/"))
		url = "chrome://mapaplus/content/" + url;

	if (typeof(arg) == "undefined")
		arg = {};

	arg.window = window;
	arg.document = document;
	arg.wrappedJSObject = arg;
	while (win = wins.getNext())
	{
		if (win.location.href.toString() == url)
		{
			if (!arg.multiple)
			{
				win.focus();
				if (win.mapaPlus && win.mapaPlus.focus)
					win.mapaPlus.focus(arg)

				return;
			}
		}
	}
/*
	Cc["@mozilla.org/embedcomp/window-watcher;1"]
		.getService(Ci.nsIWindowWatcher)
		.openWindow(null, a, b, c, arg);
*/
	window.openDialog(url, b, c, arg);
}

mapaPlus.settingsSkip = ["version", "locked"];
mapaPlus.settingsBackup = function settingsBackup()
{
	let prefs = null;
	mapaPlus.core.async(function()
	{
		prefs = mapaPlus.settingsGet();
	}, 500);

	let	nsIFilePicker = Ci.nsIFilePicker,
			fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker),
			t = new Date(),
			date = t.getFullYear()
							+ this.right("00" + (t.getMonth() + 1), 2)
							+ this.right("00" + t.getDate(), 2)
							+ this.right("00" + t.getHours(), 2)
							+ this.right("00" + t.getMinutes(), 2)
							+ this.right("00" + t.getSeconds(), 2),
			filename = "MasterPassword+_settings_" + date + ".mpps";

	fp.init(window, this.strings["backupSettingsSave"], nsIFilePicker.modeSave);
	fp.defaultString = filename.replace(/\s*/g, '');
	fp.defaultExtension = "mpps";
	fp.appendFilter(this.strings["settingsFile"].replace("#", mapaPlusCore.addon.name), "*.mpps");
	let callback = function(rv)
	{
		if (rv != nsIFilePicker.returnOK && rv != nsIFilePicker.returnReplace)
			fp = false;

		if (!fp)
			return;

		try
		{
			prefs = JSON.stringify(prefs);
		}catch(e){};
		mapaPlus.saveFile(fp, prefs)
	}
	if (fp.open)
		fp.open(callback);
	else
		callback(fp.show());
}//settingsBackup()


mapaPlus.settingsGet = function settingsGet()
{
	let list = this.core.pref.prefs,
			prefs = {};

	for(let i in list)
	{
//		if (mapaPlus.settingsSkip.indexOf(i) != -1)
		if (i == "locked")
			continue;

		prefs[i] = this.core.pref(i, undefined, true);
	}
	return prefs
}//settingsGet()

mapaPlus.settingsRestore = function settingsRestore()
{
	let nsIFilePicker = Ci.nsIFilePicker,
			that = this;
	fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, this.strings["restoreSettingsOpen"], nsIFilePicker.modeOpen);
	fp.appendFilter(this.strings["settingsFile"].replace("#", mapaPlus.core.addon.name), "*.mpps");
	fp.defaultExtension = "mpps";
	let callback = function(rv)
	{
		if (rv != nsIFilePicker.returnOK)
			return false;

		let istream = Cc["@mozilla.org/network/file-input-stream;1"].
									createInstance(Ci.nsIFileInputStream);
		istream.init(fp.file, -1, -1, false);
  let is = Cc["@mozilla.org/intl/converter-input-stream;1"].
           createInstance(Ci.nsIConverterInputStream);
  is.init(istream, "UTF-8", 1024, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
  let str = {};
  let fileData = "";
  while (is.readString(4096, str) != 0) {
    fileData += str.value;
  }
  is.close();
log(fileData);
/*
		let bstream = Cc["@mozilla.org/binaryinputstream;1"].
									createInstance(Ci.nsIBinaryInputStream);
		bstream.setInputStream(istream);

		let fileData = bstream.readBytes(bstream.available());

  


		bstream.close();
*/
		istream.close();
		let data;
		try
		{
			data = JSON.parse(fileData);
		}catch(e){log.error(e)}
		if (!data)
		{
			that.alert(that.strings["restoreSettingsError"]);
			return false;
		}
/*
		let params = {
			data: data,
			button: 0,
		}
		that._openDialog("optionsRestore.xul", "_blank", "chrome,resizable,centerscreen,dialog" + (that.isMac ? "" : "=no") + ",modal", params);

		if (!params.button)
			return;
*/
		for(let i in data)
		{
			if (that.settingsSkip.indexOf(i) != -1)
				continue;

			try
			{
				if (i in that.core.pref.prefs)
					that.core.pref(i, data[i]);
			}catch(e){log.error(e)};
		}
		that.changesLogMenu();
		that.debugMenu();
//		that.alert(that.strings["restoreSettingsSuccess"]);
	};
	if (fp.open)
		fp.open(callback);
	else
		callback(fp.show());
}//settingsRestore()

mapaPlus.alert = function(msg, title)
{
	let promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
											.getService(Ci.nsIPromptService);
	promptService.alert(window, title || msg, msg);
}

mapaPlus.settingsReset = function settingsRreset()
{
	let list = this.core.prefs.getChildList(""),
			i = -1,
			e = ["version"];
//				e = ["version","debug"];
	while(++i < list.length)
	{
		if (e.indexOf(list[i]) != -1)
			continue;
		try
		{
			this.core.prefs.clearUserPref(list[i]);
		}
		catch(e){log.error(e)};
	}
	this.changesLogMenu();
	this.debugMenu();
}//settingsRreset()

mapaPlus.loadArgs();

mapaPlus.timer.init();

window.addEventListener("load", mapaPlus.onLoadCommon , false);
/*


Here is another useful function.

Global Const $DESKTOP_SWITCHDESKTOP = 0x0100

Func _IsWorkstationLocked()

    Local $Result = False

    $hDesktop = DllCall('user32.dll', 'hwnd', 'OpenDesktop', 'str', 'Default', 'int', 0, 'int', 0, 'int', $DESKTOP_SWITCHDESKTOP)
    If Not @error Then
        $Result = DllCall('user32.dll', 'int', 'SwitchDesktop', 'hwnd', $hDesktop[0])
        $Result = Not $Result[0]
        DllCall('user32.dll', 'int', 'CloseDesktop', 'hwnd', $hDesktop[0])
    EndIf
    Return $Result
EndFunc   ;==>_IsWorkstationLocked

*/

})();