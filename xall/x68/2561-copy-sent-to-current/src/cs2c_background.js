//console.log('CopySent2Current Version 2.2b4');
let prefs;
let dodebug;
let debugcache='';
let preSelect={};	//object over window id
let prefsAvailable=false;

async function getPrefs() {
debug('getPrefs');
	prefs=await messenger.cs2c.migratePrefs();
  let count=Object.entries(prefs).length;
  if (count) {  //migrated
		messenger.storage.local.clear();//.then(function() {
		//});
    if ('debug' in prefs === false) prefs.debug=false;
    if ('movemessage' in prefs === false) prefs.movemessage=false;
		prefs.use_HTB=false;
		//prefs.use_TBB=true;	//will be set after first call of addMenu
		dodebug=prefs['debug'];
debug(' preferences migrated:');
//for (let [key, val] of Object.entries(prefs)) {debug(' pref: '+key+'->'+val); }
debug(JSON.stringify(prefs));
    messenger.storage.local.set(prefs);
    await messenger.cs2c.setPrefs(prefs, '');
    prefsAvailable=true;
  } else {  // fresh install or already migrated
		let prefnames=["movemessage", "chooseBehind", "accesskey_default", "accesskey_sent", "accesskey_nocopy",
				"use_HTB", "use_TBB", "debug", "test"];
    let accounts=[];
    try {
      accounts=await messenger.accounts.list();
    } catch(e) {
      console.error('Please remove % signs from foldernames');
      setTimeout(()=>{	//open options page
debug('open options page');
                messenger.runtime.openOptionsPage();
              }, 2000);
    }
		for (let a of accounts) {
			prefnames.push(a.id);
			prefnames.push(a.id+'_curorsent');
			prefnames.push(a.id+'_sentalso');
			prefnames.push(a.id+'_totrash');
		}
		async function gP(prefnames) {
			try {
				prefs=await messenger.storage.local.get(prefnames);
				let fresh=Object.entries(prefs).length==0;
				if ('debug' in prefs === false) prefs.debug=false;
				if ('movemessage' in prefs === false) prefs.movemessage=false;
				dodebug=prefs['debug'];
debug(' no preferences to migrate');
debug(JSON.stringify(prefs));
				for (let a of accounts) {
debug(' account: '+a.id+' '+a.name+' '+a.type);
															//a.type=imap, pop3, nntp, ...
//debug('  '+a.id+' '+prefs[a.id]+' '+prefs[a.id+'_curorsent']);
					if (!prefs.hasOwnProperty(a.id)) {	//fresh install or new account
						prefs[a.id]=true;
						prefs[a.id+'_curorsent']='current';
					} else if (prefs[a.id] && !prefs.hasOwnProperty(a.id+'_curorsent')) {
						prefs[a.id+'_curorsent']='current';
          }
				}
				//TODO: remove preferences for no longer existing accounts
				// No ??= operator :-(
				prefs['accesskey_default'] = (prefs['accesskey_default'] || '%');   //was ??, but bad for ATN
				prefs['accesskey_sent'] = (prefs['accesskey_sent'] || '!');  //was ??, but bad for ATN
				prefs['accesskey_nocopy'] = (prefs['accesskey_nocopy'] || '-');  //was ??, but bad for ATN
				if (!('use_HTB' in prefs)) {
					prefs.use_HTB=false;
					//prefs.use_TBB=true;	//will be set after first call of addMenu
				}
				messenger.storage.local.set(prefs);
				await messenger.cs2c.setPrefs(prefs, '');
        prefsAvailable=true;
				//if (fresh) messenger.runtime.openOptionsPage();	//open options page on fresh install
				if (!('chooseBehind' in prefs)) setTimeout(()=>{	//open options page
debug('open options page');
					messenger.runtime.openOptionsPage();
				}, 2000);
			} catch(e) { 
debug("background: failed to load prefs, wait...");
				setTimeout(gP, 500, prefnames);
				return;
			}
		}
		gP(prefnames);

	}
}
getPrefs();

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
	let preSel=preSelect[tab.windowId]||'';
	delete preSelect[tab.windowId];
debug('  preSelect='+preSel);
	let ok=await messenger.cs2c.setFcc(tab.windowId, identityKey, preSel);

	return { cancel: !ok };
});

messenger.browserAction.onClicked.addListener(() => {
  messenger.runtime.openOptionsPage();
});


/*
messenger.tabs.onCreated.addListener(async (tab) => {
	debug(" Tab CREATED id: "+tab.id+" url: "+tab.url+" status: "+tab.status+" title: "+tab.title);
});
*/
async function initMessageCompose(win) {
  if (!prefsAvailable) {  //this might happen if TB is called with -compose
debug('prefs not yet available, delay initMessageCompose');
		setTimeout(initMessageCompose, 100, win);
    return
  }
debug('initMessageCompose');
	//messenger.tabs.insertCSS(/*win.tabs[0],*/ {file: 'cs2c_picker.css'});
	let ok=await messenger.cs2c.addMenu(win.id);
	if (!('use_TBB' in prefs)) {	//was first call!
debug('was first call of addMenu with use_TBB');
		prefs.use_TBB=true;
		messenger.storage.local.set(prefs);
    messenger.cs2c.setPrefs(prefs, '');
	}
	if (ok) {
		addMenuItems(win);
	}
}
messenger.windows.onCreated.addListener(async (win) => {
//does not fire if TB is started with -compose
debug(" Window CREATED "+win.id+"  "+win.state+"  "+win.type+" title: "+win.title);
	if (win.type!='messageCompose') return;
  initMessageCompose(win);
});


//see https://github.com/thundernest/addon-developer-support/blob/master/auxiliary-apis/LegacyMenu/README.md
//load .js and schema from https://github.com/thundernest/addon-developer-support/find/master
function addMenuItems(window) {
	if (`${window.type}` !== "messageCompose") {
		return;
	}
debug('add menu items to compose window');
	const id = `${window.id}`;
	preSelect[id]='';
	const desc_nc = {
		"id": "cs2c_menu_sendnocopy",
		"type": "menu-label",
		"reference": "menu-item-send-now",
		"position": "after",
		"label": messenger.i18n.getMessage('sendNoCopyCmd_label'),
		"accesskey": messenger.i18n.getMessage('sendNoCopyCmd_accesskey'),	//"O"
		//gg: extended
		"accel": 'D',
		"modifiers": 'accel',
		"command": "cmd_sendNow"
	};
	const desc_sf = {
		"id": "cs2c_menu_send2sent",
		"type": "menu-label",
		"reference": "menu-item-send-now",
		"position": "after",
		"label": messenger.i18n.getMessage('sendCopy2SentCmd_label'),
		"accesskey": messenger.i18n.getMessage('sendCopy2SentCmd_accesskey'),	//"F"
		//gg: extended
		"accel": 'D',
		"modifiers": 'accel, shift',
		"command": "cmd_sendNow"
	};
	messenger.LegacyMenu.add(id, desc_sf);
	messenger.LegacyMenu.add(id, desc_nc);   
}
messenger.LegacyMenu.onCommand.addListener(
	async (windowsId, id) => {
		if (id == "cs2c_menu_send2sent") {
debug('send with copy to sentfolder selected');
			preSelect[windowsId]='toSentFolder';
		} else if (id == "cs2c_menu_sendnocopy") {
debug('send with nocopy selected');
			preSelect[windowsId]='noCopy';
		}
	}
);
//prepareWindows();

function debug(txt) {
	if (typeof dodebug != 'undefined') {
		if (dodebug) {
			if (debugcache) console.log(debugcache); debugcache='';
			console.log('CS2C: '+txt);
		}
	} else {
		debugcache+='CS2C: '+txt+'\n';
	}
}
