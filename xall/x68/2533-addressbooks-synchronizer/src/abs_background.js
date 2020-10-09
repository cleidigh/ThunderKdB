/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is AddressbooksSynchronizer.
 *
 * The Initial Developer of the Original Code is Günter Gersdorf.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Günter Gersdorf <G.Gersdorf@ggbs.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
//console.log('AddressbooksSync Version 2.1b11b');
debug("background started");

async function start() {
	debug('entered');
let page=messenger.extension.getBackgroundPage();
debug('page='+page);

	messenger.abs.migratePrefs().then(async function(prefs) {
		let count=Object.entries(prefs).length;
		if (count>0) {
debug('preferences migrated');
			if (!prefs['imapusedraft']) prefs['imapuploadpolicy']='tmpfile';
			else 												prefs['imapuploadpolicy']='draft';
			delete prefs['imapusedraft'];
			delete prefs['syncpolicy'];
			if (!prefs['downloadpolicy']) prefs['downloadpolicy']='ask';
			if (!prefs['synctype']) prefs['synctype']='none';
			for (let [key, val] of Object.entries(prefs)) {
				if (key.match('.up') &&  !prefs['separateupdown'])
					prefs[key]=prefs[key.replace('.up','.down')];
			}
for (let [key, val] of Object.entries(prefs)) { debug('migrated pref: '+key+'->'+val); }
			try {
				await messenger.storage.local.clear();
				await messenger.storage.local.set(prefs);
debug('prefs stored');
			} catch(e) {
				debug('storing prefs throws: '+e, e);
			}
		} else {	//already migrated or fresh install
debug('no preferences to migrate');
			if (!prefs['imapusedraft']) prefs['imapuploadpolicy']='draft';
			if (!prefs['downloadpolicy']) prefs['downloadpolicy']='ask';
			if (!prefs['delayautodownload'] || prefs['delayautodownload']<2) prefs['delayautodownload']=2;
			delete prefs['syncpolicy'];
			delete prefs['upgraded'];
			await messenger.storage.local.set(prefs);
		}

    prefs=await messenger.storage.local.get(null); //.then(function(prefs) {
debug('ABS: background: prefs='+prefs);
    let [ u2i, u2f ]=await messenger.abs.uids2ids();
debug('ABS: background: u2i='+u2i);
    //remove
    //	ldap_2.servers.book.filename
    //	ldap_2.servers.book.down
    //	ldap_2.servers.book.up
    //		for nonexisting books
    let books=await messenger.addressBooks.list();
    for (let [key, val] of Object.entries(prefs)) {
      let m;
      if ((m=key.match(/(^ldap_2\.servers\.[^.]*)\.(.*)/))) {
        let ok=false;
        let uid;
        for (let book of books) {
            //id=68364c8a-d629-4678-972f-bb92e758d90d
            //name=ggbs
          if (u2i[book.id]==m[1]) ok=true;
        }
        if (!ok) {
          delete prefs[key];
          messenger.storage.local.remove(key);
        }
      }
    }
for (let [key, val] of Object.entries(prefs)) {debug('background pref: '+key+'->'+val); }
    messenger.abs.setPrefs(prefs, '');

		if (count>0) {    // abs was upgraded
debug('open options');
			try {
				let w=await messenger.windows.getCurrent();
				messenger.tabs.create({windowId: w.id, url: 'abs_options.html'});
					//throws 'tabmail is null', but works with alert in implementation.js!
			} catch(e) { debug('open options throws: '+e, e); }
		}
	});

}
function debug(txt, e) {
	ex=typeof e!=='undefined';
	if (!ex) e = new Error();
	let stack = e.stack.toString().split(/\r\n|\n/);
	let ln=stack[ex?0:1].replace(/moz-extension:\/\/.*\/(.*:\d+):\d+/, '$1');	//getExternalFilename@file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/abs_utils.js:1289:6
	if (!ln) ln='?';
	messenger.abs.debug(txt, ln);
}

/*
// Does not fire with the statusWin
messenger.windows.onCreated.addListener((w)=>{
	for (let [key, val] of Object.entries(w)) {
debug('windowListener: '+key+'->'+val);
	}
});
messenger.windows.create({
'allowScriptsToClose':	true,	 		//(boolean) Allow scripts to close the window.
//'focused': false,								 	//(boolean) If true, opens an active window. If false, opens an inactive window.
'height':	100,								 		//(integer) The height in pixels of the new window, including the frame. If not specified defaults to a natural height.
'incognito': false,							 	//(boolean) Whether the new window should be an incognito window.
'left': 100,										 	//(integer) The number of pixels to position the new window from the left edge of the screen. If not specified, the new window is offset naturally from the last focused window. This value is ignored for panels.
'state': 'normal',								//(WindowState) The initial state of the window. The ‘minimized’, ‘maximized’ and ‘fullscreen’ states cannot be combined with ‘left’, ‘top’, ‘width’ or ‘height’.
//'tabId':									 			//(integer) The id of the tab for which you want to adopt to the new window.
'titlePreface':	'ABS-',					 	//(string) A string to add to the beginning of the window title.
'top': 100,										 		//(integer) The number of pixels to position the new window from the top edge of the screen. If not specified, the new window is offset naturally from the last focused window. This value is ignored for panels.
'type':	'normal',									//(CreateType) Specifies what type of browser window to create. The ‘panel’ and ‘detached_panel’ types create a popup unless the ‘–enable-panels’ flag is set.
'url': 'abs_status.html',							//(string or array of string) A URL or array of URLs to open as tabs in the window. Fully-qualified URLs must include a scheme (i.e. ‘http://www.google.com’, not ‘www.google.com’). Relative URLs will be relative to the current page within the extension. Defaults to the New Tab Page.
'width': 100									 		//(integer) The width in pixels of the new window, including the fram
});
*/

/**
 * Handle browser action click
 * Open options page
 **/
/*
messenger.browserAction.onClicked.addListener(() => {
  messenger.runtime.openOptionsPage();
});
*/

//if start() is called from setTimeout, accessing storage.local throws errors
// but then, MailUtils.getExistingFolder in implementation.js will not find a folder :-(
try {
	start();
} catch(e) {
	debug('background throws: '+e, e);
}