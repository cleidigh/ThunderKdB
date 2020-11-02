const {classes: Cc, interfaces: Ci, utils: Cu} = Components,
			PREF_BRANCH = "extensions.autoselectlatestmessage.";

var self = this,
		width = 0,
		height = 0,
		pref = Services.prefs.getBranch(PREF_BRANCH),
		prefs = {
			sel: 1,
			focus: true
		},
		log = console.log.bind(console);

function include(path)
{
	Services.scriptloader.loadSubScript(addon.getResourceURI(path).spec, self);
}

function main(window)
{

	if (!"FolderDisplayListenerManager" in window)
		return;

	let document = window.document,
			FolderDisplayListenerManager_listener = {

		selectMessageDelayed: function FolderDisplayListenerManager_listener_selectMessageDelayed()
		{
			//the timer needed to allow time to restore previous selection if any
			Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer).init({observe: function timer_observer()
				{
					FolderDisplayListenerManager_listener.selectMessage();
				}
			}, 100, Ci.nsITimer.TYPE_ONE_SHOT);
		},

		selectMessage: function FolderDisplayListenerManager_listener_selectMessage()
		{
			var sel = pref.getIntPref("sel");
			if (!sel)
				return;

			if (window.gFolderDisplay && window.gFolderDisplay.view.dbView && window.gFolderDisplay.view.dbView.numSelected == 0)
			{
				let msgDefault = (window.gFolderDisplay.view.isSortedAscending && window.gFolderDisplay.view.sortImpliesTemporalOrdering)
									? Ci.nsMsgNavigationType.lastMessage
									: Ci.nsMsgNavigationType.firstMessage;
				switch(sel)
				{
					case 1:
							msg = msgDefault;
					default:
						break;
					case 2:
							msg = Ci.nsMsgNavigationType.firstUnreadMessage;
						break;
				}
				if (!window.gFolderDisplay.navigate(msg, /* select */ true) && msg != msgDefault)
					window.gFolderDisplay.navigate(msgDefault, /* select */ true)

					if (pref.getBoolPref("focus") && !this.isTextbox(window.document.activeElement))
						window.gFolderDisplay.tree.focus()
			}
		},

		isTextbox: function FolderDisplayListenerManager_listener_isTextbox(el)
		{
			if (!el)
				return false;

			if (el.tagName == "textbox")
				return true

			return this.isTextbox(el.parentNode);
		},

		onMessagesLoaded: function FolderDisplayListenerManager_listener_onMessagesLoaded(aAll)
		{
			FolderDisplayListenerManager_listener.selectMessageDelayed();
		},

		onMakeActive: function FolderDisplayListenerManager_listener_onMakeActive()
		{
			FolderDisplayListenerManager_listener.selectMessageDelayed();
		},
	}; //FolderDisplayListenerManager_listener

	window.FolderDisplayListenerManager.registerListener(FolderDisplayListenerManager_listener);

	listen(window, window, "unload", unload(function()
	{
		if ("FolderDisplayListenerManager" in window)
			window.FolderDisplayListenerManager.unregisterListener(FolderDisplayListenerManager_listener)
	}), false);

	FolderDisplayListenerManager_listener.selectMessage();

	let tabmail = document.getElementById("tabmail"),
			tabMon = {
		monitorName: "aslmTabmon",
		onTabOpened: function tabMan_onTabOpened(tab, aFirstTab, aOldTab)
		{
			if (tab.mode.name != "preferencesTab")
				return;

			if (tab.browser.contentWindow.___autoSLM)
				return;

			tab.browser.addEventListener("paneSelected", function runOnce (event)
			{
				tab.browser.removeEventListener("paneSelected", runOnce, false);
				fixpref(tab.browser.contentWindow);
			}, false);
			tab.browser.contentWindow.___autoSLM = true;
			unload(function()
			{
				delete tab.browser.contentWindow.___autoSLM;
			});

		},
		onTabTitleChanged: function tabMan_onTabTitleChanged(){},
		onTabPersist: function tabMan_onTabPersist(){},
		onTabRestored: function tabMan_onTabRestored(){},
		onTabClosing: function tabMan_onTabClosing(){},
		onTabSwitched: function tabMan_onTabSwitched(tab){},
	};

	if (tabmail)
	{
		if (tabmail.tabTypes.preferencesTab)
		{
			for(let i = 0; i < tabmail.tabTypes.preferencesTab.modes.preferencesTab.tabs.length; i++)
			{
				fixpref(tabmail.tabTypes.preferencesTab.modes.preferencesTab.tabs[i].browser.contentWindow);
			}
		}
		tabmail.registerTabMonitor(tabMon);
		unload(function()
		{
			tabmail.unregisterTabMonitor(tabMon)
		});
	}

} //main()

function disableAll(obj, r, s)
{
	if (obj.hasAttribute && obj.hasAttribute("autoSLM"))
		return true;

	if (!s && obj.hasAttribute && obj.hasAttribute("autoSLM"))
		s = true;

	if (s || typeof(r) == "undefined")
	{
		if ("disabled" in obj && !("___autoSLM_disabled" in obj))
		{
			obj.___autoSLM_disabled = obj.disabled;
		}
		if (typeof(r) == "undefined")
		{
			obj.disabled = obj.___autoSLM_disabled;
			delete obj.___autoSLM_disabled;
		}
		else
		{
			obj.disabled = r;
		}
	}
	if (obj.childNodes.length)
	{
		for(let i = 0; i < obj.childNodes.length; i++)
		{
			let a = disableAll(obj.childNodes[i], r, s);
			if (a)
				s = a;
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
	let doc = window.document;
	if (!doc)
		return;

	r =  r ? true : false;

	let startBox = doc.getElementById("mailnewsStartPageEnabled");
	if (startBox)
	{
		function addElement(el, parent, type)
		{
			el.setAttribute("autoSLM", '');
			type = type || "appendChild";

			if (type == "insertBefore")
				parent.parentNode.insertBefore(el, parent);
			else
				parent[type](el);

			listen(window, window, "unload", unload(function()
			{
				el.parentNode.removeChild(el);
			}), false);
		}

		function prefChange(e, val)
		{
			if (e && (e.target.id != "autoSLM" || e.attrName != "value"))
				return;

			if (e && "newValue" in e)
				val = ~~e.newValue;
			else
				val = pref.getIntPref("sel");

			disableAll(startBox.parentNode.parentNode, val ? true : false);
			try
			{
				doc.getElementById("autoSLM_checkbox").disabled = !val;
			}
			catch (e){}
		}

		if (!r && !doc.getElementById("autoSLM_box"))
		{
			let h = startBox.parentNode.parentNode.clientHeight,
					w = startBox.parentNode.parentNode.clientWidth,
					checkbox = doc.createXULElement("checkbox"),
					menupopup = doc.createXULElement("menupopup"),
					menulist = doc.createXULElement("menulist"),
					box = doc.createXULElement("hbox"),
					menuitem = doc.createXULElement("menuitem");

			menulist.id = "autoSLM";
			menulist.setAttribute("label", "Select first unread message only");
			menulist.setAttribute("preference", PREF_BRANCH + "sel");
			menulist.addEventListener("DOMAttrModified", prefChange, false);
			menulist.value = pref.getIntPref("sel");
			box.setAttribute("flex", false);
			box.id = "autoSLM_box";
			menuitem.setAttribute("value", 0);
			menuitem.setAttribute("label", "Default");
			menupopup.appendChild(menuitem);
			menuitem = doc.createXULElement("menuitem");
			menuitem.setAttribute("value", 1);
			menuitem.setAttribute("label", "Newest message");
			menupopup.appendChild(menuitem);
			menuitem = doc.createXULElement("menuitem");
			menuitem.setAttribute("value", 2);
			menuitem.setAttribute("label", "First unread message");
			menupopup.appendChild(menuitem);
			menulist.appendChild(menupopup);
			box.appendChild(menulist);

			checkbox.id = "autoSLM_checkbox";
			checkbox.setAttribute("label", "Auto focus on messages list");
			checkbox.setAttribute("preference", PREF_BRANCH + "focus");
			box.appendChild(checkbox);

			addElement(box, startBox.parentNode, "insertBefore");

			width = startBox.parentNode.parentNode.clientWidth - w;
			height = startBox.parentNode.parentNode.clientHeight - h;
			try
			{
				let p = [
					{ id: "extensions.autoselectlatestmessage.sel", type: "int" },
					{ id: "extensions.autoselectlatestmessage.focus", type: "bool" },
				];
				window.Preferences.addAll(p);
				unload(function()
				{
					for(let i = 0; i < p.length; i++)
						delete window.Preferences._all[p[i].id];
				});
			}
			catch(e){}
		}
		prefChange()
		if (!r)
			listen(window, window, "unload", unload(function()
			{
				disableAll(startBox.parentNode.parentNode);
			}), false);
	}
	else if (!s && doc.getElementById("paneGeneral"))
		listen(window, doc.getElementById("paneGeneral"), "paneload", function() {fixpref(window, r, true)}, true);

} //fixpref()

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
