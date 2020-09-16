implementation.js
  getAPI(context) {

		for (let [key, val] of Object.entries(context)) {
			debug('getAPI: context:		'+key+'->'+val);
		}
		debug('getAPI: context.uri:		'+context.uri);
		for (let [key, val] of Object.entries(context.extension)) {
			debug('getAPI: extension:		'+key+'->'+val);
		}
		for (let view of context.extension.views) {
			debug('getApi: view='+view+' viewType='+view.viewType);
			for (let [key, val] of Object.entries(view)) {
				debug('view has:		'+key+'->'+val);
			}
		}

context:

envType->addon_parent
onClose->[object Set]
checkedLastError->false
_lastError->null
contextId->36
unloaded->false
extension->[object Object]
	rootURI->[xpconnect wrapped (nsISupports, nsIURI, nsIFileURL)]
	resourceURL->file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/
	manifest->[object Object]
	type->extension
	id->addressbookssync@ggbs.de
	uuid->1eb49a87-7593-4a1f-b05a-aa4abc1c7bc8
	localeData->[object Object]
	fluentL10n->null
	_promiseLocales->null
	apiNames->[object Set]
	dependencies->[object Set]
	permissions->[object Set]
	startupData->[object Object]
	errors->
	warnings->
	startupStates->[object Set]
	sharedDataKeys->[object Set]
	instanceId->0
	MESSAGE_EMIT_EVENT->Extension:EmitEvent:0
	addonData->[object Object]
	startupReason->APP_STARTUP
	remote->false
	remoteType->null
	parentMessageManager->[object ProcessMessageManager]
	version->2.2b1
	baseURL->moz-extension://1eb49a87-7593-4a1f-b05a-aa4abc1c7bc8/
	baseURI->[xpconnect wrapped (nsISupports, nsIURI, nsIURL)]
	principal->[xpconnect wrapped (nsISupports, nsIPrincipal, nsISerializable)]
	views->[object Set]
		 view=[object Object] viewType=background
				envType->addon_parent
				onClose->[object Set]
				checkedLastError->false
				_lastError->null
				contextId->27
				unloaded->false
				extension->[object Object]
				jsonSandbox->null
				active->true
				incognito->false
				messageManager->null
				contentWindow->null
				innerWindowID->0
				cloneScopeError->null
				cloneScopePromise->null
				uri->[xpconnect wrapped nsIURI]
				listenerPromises->null
				messageManagerProxy->[object Object]
				principal->[xpconnect wrapped (nsISupports, nsIPrincipal, nsISerializable)]
				listenerProxies->[object Map]
				pendingEventBrowser->null
				viewType->background
				apiCan->[object Object]
		 view=[object Object] viewType=tab
				envType->addon_parent
				onClose->[object Set]
				checkedLastError->false
				_lastError->null
				contextId->81
				unloaded->false
				extension->[object Object]
				jsonSandbox->null
				active->true
				incognito->false
				messageManager->null
				contentWindow->null
				innerWindowID->0
				cloneScopeError->null
				cloneScopePromise->null
				uri->[xpconnect wrapped nsIURI]
				listenerPromises->[object Set]
				messageManagerProxy->[object Object]
				principal->[xpconnect wrapped (nsISupports, nsIPrincipal, nsISerializable)]
				listenerProxies->[object Map]
				pendingEventBrowser->null
				viewType->tab
				apiCan->[object Object]

	_backgroundPageFrameLoader->[object FrameLoader]
	onStartup->null
	hasShutdown->false
	onShutdown->[object Set]
	uninstallURL->null
	whiteListedHosts->[object MatchPatternSet]
	_optionalOrigins->null
	webAccessibleResources->
	registeredContentScripts->[object Map]
	emitter->[object Object]
	policy->[object WebExtensionPolicy]
	rawManifest->[object Object]
	contentScripts->
	schemaURLs->[object Map]
	modules->[object Object]
	experimentAPIManager->[object Object]
	apiManager->[object Object]
	folderManager->[object Object]
	addressBookManager->[object Object]
	tabManager->[object Object]
	windowManager->[object Object]
jsonSandbox->null
active->true
incognito->false
messageManager->null
contentWindow->null
innerWindowID->0
cloneScopeError->null
cloneScopePromise->null
uri->[xpconnect wrapped nsIURI]
listenerPromises->[object Set]
messageManagerProxy->[object Object]
principal->[xpconnect wrapped (nsISupports, nsIPrincipal, nsISerializable)]
listenerProxies->[object Map]
pendingEventBrowser->null
viewType->tab
apiCan->[object Object]
nsISupports, nsIURI, nsIFileURL

==================================================================================
function doATest(param) {

/*
//show lastModifiedDate of cards
	let cn = MailServices.ab.directories;
	while(cn.hasMoreElements())	{
		let dir = cn.getNext().QueryInterface(Ci.nsIAbDirectory);
		debug(''+dir.dirName+' '+dir.dirPrefId+' lastmod '+dir.lastModifiedDate);
		let cards=dir.childCards;
		while(cards.hasMoreElements()) {
			let card = cards.getNext().QueryInterface(Ci.nsIAbCard);
			let lmd=card.getProperty('LastModifiedDate', 0);
			if (lmd>0)
				debug('   '+card.firstName+' '+card.lastName+' '+card.primaryEmail+' '+lmd+' '+timeString(lmd*1000));
		}
	}
*/
/*
//show windows
	let we = Services.wm.getEnumerator(null);
		//only returns chrome://messenger/content/messenger.xhtml (mail:3pane)
	while (we.hasMoreElements()) {
		let w=we.getNext();
		debug(''+w.location+' '+w.document.documentElement.getAttribute('windowtype'));
		//debug(''+w.windowType);
	}
*/

/*
//find options tab
	let w=Services.wm.getMostRecentWindow("mail:3pane");
	let tabmail=w.document.getElementById("tabmail");
	debug('tabmail='+tabmail);
	for (let nativeTabInfo of tabmail.tabInfo) {
		debug('	tab='+nativeTabInfo);
		//for (let [key, val] of Object.entries(nativeTabInfo)) {
		//	debug('		'+key+'->'+val);
		//}
		if (nativeTabInfo.browser && nativeTabInfo.browser.contentDocument.location==optionsURI) {
			debug('tab b.cd.l='+nativeTabInfo.browser.contentDocument.location);
//moz-extension://1eb49a87-7593-4a1f-b05a-aa4abc1c7bc8/abs_options.html
			debug('tab b.cd elem='+nativeTabInfo.browser.contentDocument.getElementById('DownloadMabName'));
//HTMLInputElement
			nativeTabInfo.browser.contentDocument.getElementById('DownloadMabName').value='Heureka!';
		}
	}
*/
/*
mode->[object Object]
busy->false
canClose->true
thinking->false
_ext->[object Object]
tabNode->[object XULElement]
panel->[object XULElement]
root->[object XULElement]
browser->[object XULFrameElement]
linkedBrowser->[object XULFrameElement]
toolbar->[object XULElement]
backButton->[object XULElement]
forwardButton->[object XULElement]
security->[object XULElement]
urlbar->[object XULTextElement]
clickHandler->specialTabs.defaultClickHandler(event);
findbar->[object XULElement]
reloadEnabled->true
loadListener->function onLoad(aEvent) {
titleListener->function onDOMTitleChanged(aEvent) {
closeListener->function onDOMWindowClose(aEvent) {
filter->[xpconnect wrapped nsIWebProgress]
progressListener->[object Object]
pageLoading->false
pageLoaded->true
title->Addressbooks Synchronizer		

title:
title->Posteingang - ggbs
title->Debugging - Umgebung / this-firefox
title->Einstellungen
title->Add-ons-Verwaltung
title->Werkzeuge - Erweiterung / Addressbooks Synchronizer
title->Addressbooks Synchronizer															!!!
*/
//////////

/*
//try chrome hidden window
	//hiddenWin=Services.ww.openWindow(null, 'chrome://messenger/content/'+param, 'abs', 'width=100,height=100', null);
	//theHiddenWin(true);
	//if (hiddenWin) {
	let we=Services.wm.getEnumerator('mail:messageWindow');
	while (we.hasMoreElements()) {
		let w=we.getNext();
		try {
//This works even if hiddenWin has been closed by user!???
			debug('found window');
			if (w.document.getElementById('messagepane').docShell.document.body.textContent=='')
				debug('its the hiddenWin! (body)');
			else
				debug('not the hiddenWin! (body)');
			if (w.document.getElementById('mail-toolbar-menubar2').clientHeight==0)
				debug('its the hiddenWin! (toolbar height) '+
							w.document.getElementById('mail-toolbar-menubar2').clientHeight);
			else
				debug('not the hiddenWin! (toolbar height) '+
							w.document.getElementById('mail-toolbar-menubar2').clientHeight);
		} catch(e) {
			debug('doAtest: should have hiddenWin but throws '+e, e);
		}
	}
	if (hiddenWin) {
		let w=hiddenWin;
//w.document.getElementById('messagepane').docShell===null	if hiddenWin closed by user
		try {
			debug('hiddenWin:');
			if (w.document.getElementById('mail-toolbar-menubar2').clientHeight==0)
				debug('its the hiddenWin! (toolbar height) '+
							w.document.getElementById('mail-toolbar-menubar2').clientHeight);
			else
				debug('not the hiddenWin! (toolbar height) '+
							w.document.getElementById('mail-toolbar-menubar2').clientHeight);
			if (w.document.getElementById('messagepane').docShell.document.body.textContent=='')
				debug('its the hiddenWin! (body)');
			else
				debug('not the hiddenWin! (body)');
		} catch(e) {
			debug('should have hiddenWin but throws '+e, e);
		}
	}
*/
/*
// show activities
		let activityMgr = Cc["@mozilla.org/activity-manager;1"].
						getService(Ci.nsIActivityManager);
    let activities = activityMgr.getActivities();
debug('activities: '+activities.length);
		for (let i=0; i<activities.length; i++) {
debug('activity '+i+': '+activities[i].id+' '+activities[i].statusText+' - '+activities[i].contextType);
      activityMgr.removeActivity(activities[i].id);	//removes the activity from the activity pane
    }
*/

}


==============================================================================
in implementation.js:
/*
 This only fires the 'onOpenWindow' for .html windows but not the 'load'
var windowListener = {
    onOpenWindow: function (aWindow) {
        // Wait for the window to finish loading
				let domWindow=aWindow.docShell.domWindow;
debug('opened: '+domWindow.document.location.href);	//about:blank
        domWindow.addEventListener("load", function () {	//does not fire for statusWin
debug('loaded: '+domWindow.document.location.href);
        }, { once: true });
    },
    onCloseWindow: function (aWindow) {
				let domWindow=aWindow.docShell.domWindow;
debug('closed: '+domWindow.location);	//file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/abs_status.html
		},
    onWindowTitleChange: function (aWindow, aTitle) {}
};
Services.wm.addListener(windowListener);
*/



===========================================
manifest.json:
	"content_scripts": [
		{
			"matches": [ "chrome://messenger/content/addressbook/addressbook.xhtml" ],
			"js": [ "abs_addressbook.js" ]
		}
	],
does not work with chrome: