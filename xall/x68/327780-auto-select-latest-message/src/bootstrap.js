const {classes: Cc, interfaces: Ci, utils: Cu} = Components,
			PREF_BRANCH = "extensions.autoselectlatestmessage.";

var self = this,
		pref = Services.prefs.getBranch(PREF_BRANCH),
		prefs = {
			sel: 1,
			selForce: false,
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
			listener =
			{
				timer: null,
				calls: [],
				selectMessageDelayed: function listener_selectMessageDelayed()
				{
					if (this.timer)
						this.timer.cancel();

					let that = this,
							args = arguments;

					this.calls[this.calls.length] = arguments[arguments.length-1];
					//the timer needed to allow time to restore previous selection if any
					this.timer = setTimeout(function(){listener.selectMessage.apply(that, args)}, 0);
				},

				selectMessage: function listener_selectMessage(obj)
				{
					let calls = Object.assign([], this.calls);
					this.calls = [];
					if (!prefs.sel)
						return;

					let isTextbox = this.isTextbox(window.document.activeElement);

					if (obj.view.dbView && (!obj.view.dbView.numSelected || (obj.view.dbView.numSelected && !isTextbox && prefs.selForce && calls.indexOf("onDisplayingFolder") != -1)))
					{

						let msgDefault = Ci.nsMsgNavigationType.firstMessage,
								msgUnread = Ci.nsMsgNavigationType.firstUnreadMessage,
								msg = msgDefault;

						if (obj.view.isSortedAscending && obj.view.sortImpliesTemporalOrdering)
						{
							msgDefault = Ci.nsMsgNavigationType.lastMessage;
//							msgUnread = Ci.nsMsgNavigationType.lastUnreadMessage; //doesn't work, bug?
						}
						switch(prefs.sel)
						{
							case 1:
									msg = msgDefault;
								break;
							case 2:
									msg = msgUnread;
							default:
								break;
						}
						if (!window.gFolderDisplay.navigate(msg, /* select */ true) && msg != msgDefault)
							window.gFolderDisplay.navigate(msgDefault, /* select */ true)
					}
					if (prefs.focus && !isTextbox)
					{
						setTimeout(function()
						{
							obj.tree.focus()
						}, 100);
					}
				},

				isTextbox: function listener_isTextbox(el)
				{
					if (!el)
						return false;

					if (el.tagName && el.tagName.match(/(?:textbox|html:input)/i))
						return true

					return this.isTextbox(el.parentNode);
				}
			}, //listener

			tabmail = document.getElementById("tabmail"),
			tabMon =
			{
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
						prefWinLoaded(tab.browser.contentWindow);
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
	!function()
	{
		let listenerEvents = [
//					"onActiveCreatedView",
//					"onActiveMessagesLoaded",
//					"onCreatedView",
//					"onDestroyingView",
					"onDisplayingFolder",
//					"onFolderLoading",
//					"onLeavingFolder",
//					"onLoadingFolder",
					"onMakeActive",
//					"onMessageCountsChanged",
//					"onMessagesLoaded",
//					"onMessagesRemovalFailed",
//					"onMessagesRemoved",
//					"onSearching",
//					"onSortChanged",
		];
		for (let i = 0; i < listenerEvents.length; i++)
		{
			let name = listenerEvents[i];
			this[name] = function()
			{
				let args = Array.prototype.slice.call(arguments);
				args[args.length] = name;
				this.selectMessageDelayed.apply(this, args);
			}
		}
		return true;
	}.bind(listener)(),
	window.FolderDisplayListenerManager.registerListener(listener);
	listen(window, window, "unload", unload(function()
	{
		if ("FolderDisplayListenerManager" in window)
			window.FolderDisplayListenerManager.unregisterListener(listener)
	}), false);

	if (tabmail)
	{
		if (tabmail.tabTypes.preferencesTab)
		{
			for(let i = 0; i < tabmail.tabTypes.preferencesTab.modes.preferencesTab.tabs.length; i++)
			{
				prefWinLoaded(tabmail.tabTypes.preferencesTab.modes.preferencesTab.tabs[i].browser.contentWindow);
			}
		}
		tabmail.registerTabMonitor(tabMon);
		unload(function()
		{
			tabmail.unregisterTabMonitor(tabMon)
		});
	}
} //main()

function prefWinLoaded(window, r, s)
{
	let doc = window.document;
	if (!doc)
		return;

	r =  r ? true : false;

	let startBox = doc.getElementById("mailnewsStartPageEnabled");
	if (startBox)
	{

		if (!r && !doc.getElementById("autoSLM_box"))
		{
			function prefChange(e, val)
			{
				if (e && (e.target.id != "autoSLM_sel" || e.attrName != "value"))
					return;

				if (e && "newValue" in e)
					val = ~~e.newValue;
				else
					val = prefs.sel;

				disableAll(startBox.parentNode.parentNode, val ? true : false);
				disableAll(doc.getElementById("autoSLM_box").firstChild, !val, undefined, true);
			}
			let tags = {
					PREF_BRANCH: PREF_BRANCH
				},
				vbox = window.MozXULElement.parseXULToFragment(multiline(function(){/*
<vbox id="autoSLM_box" autoSLM="">
	<vbox>
		<hbox flex="false">
			<menulist id="autoSLM_sel"
								preference="{PREF_BRANCH}sel"
								autoSLM=""
			>
				<menupopup>
					<menuitem value="0" label="Default"></menuitem>
					<menuitem value="1" label="Newest message"></menuitem>
					<menuitem value="2" label="First unread message"></menuitem>
				</menupopup>
			</menulist>
			<checkbox id="autoSLM_selForce"
								label="Force"
								preference="{PREF_BRANCH}selForce"
								tooltiptext="Thunderbird remembers last selected message, force it to forget"
			></checkbox>
		</hbox>
		<checkbox id="autoSLM_focus" label="Auto focus on messages list" preference="{PREF_BRANCH}focus"></checkbox>
	</vbox>
</vbox>
*/			}).replace(/\{([a-zA-Z0-9-_.]+)\}/g, function(a,b){return b in tags ? tags[b] : a}));

			startBox.parentNode.parentNode.insertBefore(vbox, startBox.parentNode);
			vbox = doc.getElementById("autoSLM_box");
			vbox.addEventListener("DOMAttrModified", prefChange, false);
			listen(window, window, "unload", unload(function()
			{
				vbox.parentNode.removeChild(vbox);
			}), false);

			try
			{
				let p = [],
						types = {
							number: "int",
							boolean: "bool",
							string: "string"
						};

				for(let n in prefs)
					p[p.length] = {id: PREF_BRANCH + n, type: types[typeof(prefs[n])]};

				window.Preferences.addAll(p);
				unload(function()
				{
					for(let i = 0; i < p.length; i++)
						delete window.Preferences._all[p[i].id];
				});
			}
			catch(e){log(e)}
		}
		prefChange()
		if (!r)
			listen(window, window, "unload", unload(function()
			{
				disableAll(startBox.parentNode.parentNode);
			}), false);
	}
	else if (!s && doc.getElementById("paneGeneral"))
	{
		let undo = listen(window, doc, "paneSelected", function() {prefWinLoaded(window, r, true);undo();}, true);
	}

} //prefWinLoaded()

function startup(data, reason)
{
	let callback = function callback(a)
	{
		addon = a;
		include("includes/utils.js");
		setDefaultPrefs(prefs);

		watchWindows(main);
		watchWindows(prefWinLoaded, "Mail:Preferences");
		pref.QueryInterface(Ci.nsIPrefBranch).addObserver('', onPrefChange, false);
		unload(function()
		{
			pref.QueryInterface(Ci.nsIPrefBranch).removeObserver('', onPrefChange, false);
		});
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
