//console.log('CopySent2Current Version 2.2b4');
let dodebug=false;

let strings={
  "copysent2choose_label": '',
  "copysent2choose_accesskey": '',
  "moveoriginal_label": '',
  "moveoriginal_accesskey": '',
  "copysent2current_nocopy": '',
  "NoTrashFolder": '',
};
Object.keys(strings).forEach(key=>{
  let msg=messenger.i18n.getMessage(key);
  strings[key]=msg;
});

messenger.cs2c.migratePrefs(strings).then((prefs) => {
  let count=Object.entries(prefs).length;
  if (count) {  //migrated
		messenger.storage.local.clear();//.then(function() {
		//});
    if ('debug' in prefs === false) prefs.debug=false;
    if ('movemessage' in prefs === false) prefs.movemessage=false;
		dodebug=prefs['debug'];
debug(' preferences migrated:');
//for (let [key, val] of Object.entries(prefs)) {debug(' pref: '+key+'->'+val); }
debug(JSON.stringify(prefs));
    messenger.storage.local.set(prefs);
    messenger.cs2c.setPrefs(prefs, '');
  } else {  // fresh install or already migrated
    messenger.storage.local.get(null).then((prefs) => {
      if ('debug' in prefs === false) prefs.debug=false;
      if ('movemessage' in prefs === false) prefs.movemessage=false;
			dodebug=prefs['debug'];
debug(' no preferences to migrate');
debug(JSON.stringify(prefs));
			messenger.accounts.list().then(function(accounts) {
        for (let a of accounts) {
debug(' account: '+a.id+' '+a.name+' '+a.type);
															//a.type=imap, pop3, nntp, ...
					if (!prefs.hasOwnProperty(a.id)) {	//fresh install or new account
						prefs[a.id]=true;
						prefs[a.id+'_curorsent']='current';
					}
				}
//TODO: remove preferences for no longer existing accounts
      });
      // No ??= operator :-(
			prefs['accesskey_default'] = (prefs['accesskey_default'] || '%');   //was ??, but bad for ATN
			prefs['accesskey_sent'] = (prefs['accesskey_sent'] || '!');  //was ??, but bad for ATN
			prefs['accesskey_nocopy'] = (prefs['accesskey_nocopy'] || '-');  //was ??, but bad for ATN
      messenger.storage.local.set(prefs);
      messenger.cs2c.setPrefs(prefs, '');
			return prefs;
    });
  }

});

var curAccount;
var curFolder;
messenger.mailTabs.onDisplayedFolderChanged.addListener(async (tabId, folder) => {
	debug(" folder changed: "+tabId+" "+folder.accountId+' '+folder.path);
	curAccount=folder.accountId;
	curFolder=folder.path;
/*

	for (const prop in folder) {
		debug(`  folder: ${prop} ${folder[prop]}`);
	}
//  accountId account1
//  name Posteingang
//  path /INBOX
//  type inbox/sent/... or not present
	let account=await messenger.accounts.get(folder.accountId);
	debug(" folder changed: "+folder.accountId+": account: "+account);
	for (const prop in account) {
		debug(`  account: ${prop} ${account[prop]}`);
	}
//  id account1
//  name ggbs
//  type imap
//  folders [object Object],[object Object]
*/
});

messenger.compose.onBeforeSend.addListener(async (tab, details) => {
	debug('onBeforeSend: Tab id: '+tab.id+' win: '+tab.windowId);
	//debug(' subject: '+details.subject);
  let identityKey=details.identityId;
	debug('  from details: identity='+identityKey);
	debug('  from current folder: account='+curAccount+' folder='+curFolder);
	let ok=await messenger.cs2c.setFcc(tab.windowId, identityKey);

	return { cancel: !ok };
});

//see https://thunderbird-webextensions.readthedocs.io/en/latest/changes/beta77.html
// no ChromeUtils in script!
//let rcs=messenger.composeScripts.register({css: [],js: [{file: "cs2c_compose.js"}]});

messenger.browserAction.onClicked.addListener(() => {
  messenger.runtime.openOptionsPage();
});


messenger.tabs.onCreated.addListener(async (tab) => {
	debug(" Tab CREATED id: "+tab.id+" url: "+tab.url+" status: "+tab.status+" title: "+tab.title);
});
messenger.windows.onCreated.addListener(async (win) => {
	debug(" Window CREATED "+win.id+"  "+win.state+"  "+win.type+" title: "+win.title);
	if (win.type!='messageCompose') return;
	//messenger.tabs.insertCSS(/*win.tabs[0],*/ {file: 'cs2c_picker.css'});
	let ok=await messenger.cs2c.addMenu(win.id);
});

function debug(txt) {
	if (dodebug) console.log('CS2C: '+txt);
}
