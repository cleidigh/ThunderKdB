const {classes: Cc, interfaces: Ci, utils: Cu} = Components,
			PREF_BRANCH = "extensions.autoselectlatestmessage.";
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
var self = this,
		width = 0,
		height = 0,
		pref = Services.prefs.getBranch(PREF_BRANCH),
		prefs = {
			sel: 1,
			focus: true
		},
		log = console.log;

function include(path)
{
	Services.scriptloader.loadSubScript(addon.getResourceURI(path).spec, self);
}

function main(window)
{
	if (!"FolderDisplayListenerManager" in window)
		return;

	let func = {
		selectMessageDelayed: function()
		{
			//the timer needed to allow time to restore previous selection if any
			Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer).init({observe: function()
				{
					func.selectMessage();
				}
			}, 100, Ci.nsITimer.TYPE_ONE_SHOT);
		},
		selectMessage: function()
		{
			var sel = pref.getIntPref("sel");
			if (!sel)
				return;

			if (window.gFolderDisplay && window.gFolderDisplay.view.dbView && window.gFolderDisplay.view.dbView.numSelected == 0)
			{
				let msgDefault = (window.gFolderDisplay.view.isSortedAscending && window.gFolderDisplay.view.sortImpliesTemporalOrdering)
									? window.nsMsgNavigationType.lastMessage
									: window.nsMsgNavigationType.firstMessage;
				switch(sel)
				{
					case 1:
							msg = msgDefault;
					default:
						break;
					case 2:
							msg = window.nsMsgNavigationType.firstUnreadMessage;
						break;
				}
				if (!window.gFolderDisplay.navigate(msg, /* select */ true) && msg != msgDefault)
					window.gFolderDisplay.navigate(msgDefault, /* select */ true)

					if (pref.getBoolPref("focus") && !this.isTextbox(window.document.activeElement))
						window.gFolderDisplay.tree.focus()
			}
		},

		isTextbox: function(el)
		{
			if (!el)
				return false;

			if (el.tagName == "textbox")
				return true

			return this.isTextbox(el.parentNode);
		},

		onMessagesLoaded: function(aAll)
		{
			func.selectMessageDelayed();
		},

		onMakeActive: function()
		{
			func.selectMessageDelayed();
		},
	};
	window.FolderDisplayListenerManager.registerListener(func);
	listen(window, window, "unload", unload(function(){
		if ("FolderDisplayListenerManager" in window)
			window.FolderDisplayListenerManager.unregisterListener(func)
		}), false);
	func.selectMessage();
}
	
function disableAll(obj, r)
{
	if (obj.tagName == "button" || obj.id.match(/^autoSLM/))
		return;

	if (!r && !("___autoSLM_disabled" in obj))
		obj.___autoSLM_disabled = obj.disabled;

	if (r && "___autoSLM_disabled" in obj)
		obj.disabled = obj.___autoSLM_disabled;
	else if (!r)
		obj.disabled = true;

	if (obj.childNodes.length)
	{
		for(var i = 0; i < obj.childNodes.length; i++)
		{
			disableAll(obj.childNodes[i],r);
		}
	}
}

function prefString(pref, key, val)
{
	let r, er = [];
	if (typeof(val) == "undefined")
	{
		try
		{
			r = pref.getComplexValue(key, Ci.nsISupportsString).data;
		}
		catch(e)
		{
			er.push(e);
			try
			{
				r = pref.getStringPref(key);
			}
			catch(e)
			{
				er.push(e);
				try
				{
					r = pref.getComplexValue(key, Ci.nsIPrefLocalizedString).data;
				}
				catch(e)
				{
					er.push(e);
					try
					{
						r = pref.getCharPref(key);
					}
					catch(e)
					{
						er.push(e);
						log(er);
					}
				}
			}
		}
	}
	else
	{
		try
		{
			let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
			str.data = val;
			r = pref.setComplexValue(key, Ci.nsISupportsString, str);
		}
		catch(e)
		{
			er.push(e);
			try
			{
				r = pref.setStringPref(key,val);
			}
			catch(e)
			{
				er.push(e);
				try
				{
					let str = Cc["@mozilla.org/pref-localizedstring;1"].createInstance(Ci.nsIPrefLocalizedString);
					str.data = val;
					r = pref.setComplexValue(key, Ci.nsIPrefLocalizedString, str);
				}
				catch(e)
				{
					er.push(e);
					try
					{
						r = pref.setCharPref(key, val);
					}
					catch(e)
					{
						er.push(e);
						log(er);
					}
				}
			}
		}
	}
	return r;
}//prefString()

function setDefaultPrefs(prefs, prefix)
{
	var prefix = prefix || "";
	let p, name = "";
	if (prefix)
	{
		p = prefs[prefix];
		name = prefix + ".";
	}
	else
	{
		p = prefs;
	}
	let branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
	for (let key in p)
	{
		let val = p[key];
		switch (typeof val)
		{
			case "boolean":
				branch.setBoolPref(name + key, val);
				val = pref.getBoolPref(name + key);
				break;
			case "number":
				branch.setIntPref(name + key, val);
				val = pref.getIntPref(name + key);
				break;
			case "string":
				prefString(branch, name + key, val);
				val = prefString(pref, name + key, val);
				break;
			case "object":
				prefs[val] = setDefaultPrefs(prefs, key);
				continue;
				break;
		}
		if (prefix)
			prefs[prefix][key] = val;
		else
			prefs[key] = val;
	}
	return prefs;
}

function fixpref(window, r, s)
{
	var doc = window.document;
	if (!doc)
		return;

	r =  r ? true : false;

	if (doc.getElementById("mailnewsStartPageEnabled"))
	{
		function addElement(el, parent, type)
		{
			type = type || "appendChild";

			if (type == "insertBefore")
				parent.parentNode.insertBefore(el, parent);
			else
				parent[type](el);

			if (!r)
			{
				listen(window, window, "unload", unload(function()
				{
					el.parentNode.removeChild(el);
				}), false);
			}
		}
		if (!r && !doc.getElementById("autoSLM_box"))
		{
			let h = doc.getElementById("mailnewsStartPageEnabled").parentNode.parentNode.clientHeight,
					w = doc.getElementById("mailnewsStartPageEnabled").parentNode.parentNode.clientWidth,
					checkbox = doc.createElement("checkbox"),
					menupopup = doc.createElement("menupopup"),
					menulist = doc.createElement("menulist"),
					box = doc.createElement("hbox"),
					menuitem = doc.createElement("menuitem"),
					p = doc.createElement("preference");

			menulist.id = "autoSLM";
			menulist.setAttribute("label", "Select first unread message only");
			menulist.setAttribute("preference", PREF_BRANCH + "sel");
			menulist.addEventListener("command", prefChange, true);
			box.setAttribute("flex", false);
			box.id = "autoSLM_box";
			menuitem.setAttribute("value", 0);
			menuitem.setAttribute("label", "Default");
			menupopup.appendChild(menuitem);
			menuitem = doc.createElement("menuitem");
			menuitem.setAttribute("value", 1);
			menuitem.setAttribute("label", "Newest message");
			menupopup.appendChild(menuitem);
			menuitem = doc.createElement("menuitem");
			menuitem.setAttribute("value", 2);
			menuitem.setAttribute("label", "First unread message");
			menupopup.appendChild(menuitem);
			menulist.appendChild(menupopup);
			box.appendChild(menulist);

			addElement(box, doc.getElementById("mailnewsStartPageEnabled").parentNode, "insertBefore");

			checkbox.id = "autoSLM_checkbox";
			checkbox.setAttribute("label", "Auto focus on messages list");
			checkbox.setAttribute("preference", PREF_BRANCH + "focus");
			addElement(checkbox, box);

			p.id = PREF_BRANCH + "sel";
			p.setAttribute("type", "int");
			p.setAttribute("name", p.id);
			addElement(p, doc.getElementById("generalPreferences"));

			p = doc.createElement("preference");
			p.id = PREF_BRANCH + "focus";
			p.setAttribute("type", "bool");
			p.setAttribute("name", p.id);
			addElement(p, doc.getElementById("generalPreferences"));
			
			disableAll(doc.getElementById("mailnewsStartPageEnabled").parentNode.parentNode, menulist.value == 0);
			width = doc.getElementById("mailnewsStartPageEnabled").parentNode.parentNode.clientWidth - w;
			height = doc.getElementById("mailnewsStartPageEnabled").parentNode.parentNode.clientHeight - h;
//			window.resizeBy(width, height);
			doc.getElementById("MailPreferences").showPane(doc.getElementById("MailPreferences").currentPane);
		}
		if (!r)
			listen(window, window, "unload", unload(function(){
				disableAll(doc.getElementById("mailnewsStartPageEnabled").parentNode.parentNode, true);
//				window.resizeBy(-width, -height);
			}), false);
	}
	else if (!s && doc.getElementById("paneGeneral"))
		doc.getElementById("paneGeneral").addEventListener("paneload", function() {fixpref(window, r, true)}, true);
}
function prefChange(e)
{
	disableAll(e.target.parentNode.parentNode.parentNode.parentNode, e.target.value == "0");
}

function startup(data, reason)
{
	let callback = function callback(a)
	{
		addon = a;
		include("includes/utils.js");
		setDefaultPrefs(prefs);

		watchWindows(main);
		watchWindows(fixpref, "Mail:Preferences");
	};
	let promise = AddonManager.getAddonByID(data.id, callback);
	if (typeof(promise) == "object" && "then" in promise)
		promise.then(callback);
}

function shutdown(data, reason)
{
	unload();
}

function install(data, reason)
{
}

function uninstall(data, reason)
{
}
