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
 * The Original Code is ShowInOut.
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
//console.log('ShowInOut Version 2.2b3');

messenger.sio.migratePrefs().then(function(prefs) {
  let count=Object.entries(prefs).length;
  if (count) {
		dodebug=prefs['debug'];
debug('preferences migrated: '+JSON.stringify(prefs));
//for (let [key, val] of Object.entries(prefs)) {debug('pref: '+key+'->'+val); }
    messenger.storage.local.set(prefs);
    messenger.sio.init(prefs);
  } else {
    messenger.storage.local.get(null).then(function(prefs) {
      dodebug=prefs['debug'];
debug('no preferences to migrate: '+JSON.stringify(prefs));
//for (let [key, val] of Object.entries(prefs)) {debug('pref: '+key+'->'+val); }
      messenger.sio.init(prefs);
      return prefs;
    });
  }
});

messenger.browserAction.onClicked.addListener(() => {
  messenger.runtime.openOptionsPage();
});

let listener=(async (info)=> {
/* info:
                  install   disable     enable    uninstall
"mayDisable"      true      false       true      true
"enabled"         true      false       true      false
"disabledReason"            "unknown"             "unknown"
"permissions"                           vorh.
MsgCreateDBView   fires                 fires
                  after listener        before listener
*/
  let type=info.enabled?(info.permissions?'enable':'install'):(info.mayDisable?'uninstall':'disable');
debug('some addon changed type='+type);
//debug(JSON.stringify(info));
  //if type=='install' no new columns has been added at this time
  //addonChanged will return an empty map
	let changed=await messenger.sio.addonChanged(type);
  if (changed===null) {
debug('nothing to do');
    return;
  }
debug('got changed='+JSON.stringify(Array.from(changed)));
  if (changed.size==0) {
debug('nothing changed');
    return;
  }

  //remove foreign custom columns from preferences
	let colsObj=await messenger.storage.local.get('Columns');
debug('Columns='+colsObj.Columns);
	let cols=colsObj.Columns.split(/\s*,\s*/);
	changed.forEach((label, id) => {
debug(' changed '+id+'->'+(label?label:'(removed)'));
		if (!label) {	//remove from prefs
			let i=cols.indexOf(id);
			if (i>=0) cols.splice(i, 1);
		}
	});
  let newColumns=cols.join(',');
debug('Columns now '+newColumns);
  if (newColumns!=colsObj.Columns) {
    colsObj.Columns=newColumns;
    messenger.storage.local.set(colsObj);
  }
debug('send Message to options changed='+JSON.stringify(Array.from(changed)));
  messenger.runtime.sendMessage({changed: changed}).then(
    (message)=>{/*handleResponse: none expected*/},
    (error)=>{/*handleError*/
debug('could not send message, options not open');
    }
  );
});

messenger.management.onInstalled.addListener(listener);
messenger.management.onUninstalled.addListener(listener);
messenger.management.onEnabled.addListener(listener);
messenger.management.onDisabled.addListener(listener);

function debug(txt, e) {
	ex=typeof e!=='undefined';
	if (!ex) e = new Error();
	let stack = e.stack.toString().split(/\r\n|\n/);
	let ln=stack[ex?0:1].replace(/moz-extension:\/\/.*\/(.*:\d+):\d+/, '$1');	//localfolder@file:///D:/sourcen/Mozilla/thunderbird/Extensions/ShowInOut_wee/sio_implementation.js:106:6
	if (!ln) ln='?';
	messenger.sio.debug(txt, ln);
}
