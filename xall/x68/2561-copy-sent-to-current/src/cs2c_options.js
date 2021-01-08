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
 * The Original Code is CopySent2Current.
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

let prefs=null;
let debugcache='';

async function doInit() {
debug("options: init");
	let prefnames=["movemessage", "chooseBehind", "accesskey_default", "accesskey_sent", "accesskey_nocopy",
				"use_HTB", "use_TBB", "debug", "test"];
  let accounts=await messenger.accounts.list();
  for (let a of accounts) {
		prefnames.push(a.id);
		prefnames.push(a.id+'_curorsent');
		prefnames.push(a.id+'_sentalso');
		prefnames.push(a.id+'_totrash');
	}
	try {
		prefs=await messenger.storage.local.get(prefnames);
	} catch(e) { 
		// if options tab is visible on startup, getting prefs fails
debug("options: failed to load prefs, wait...");
		setTimeout(doInit, 500);
		return;
	}

//for (let [key, val] of Object.entries(prefs)) {debug(' pref '+key+'->'+val); }
debug('prefs: '+JSON.stringify(prefs));
  let fcc=await messenger.cs2c.getFcc();
debug('got fcc '+JSON.stringify(fcc));
	//let accounts=await messenger.accounts.list();
	let ae=document.getElementById('accounts');
	let tmpl=document.getElementById('_account');
	for (let a of accounts) {
debug('account: '+a.id+' '+a.name+' '+a.type);
//a.type=imap, pop3, nntp, ...
		if ( a.type!='imap' && a.type!='pop3' ) continue;
		if (!fcc[a.id]) continue;
		let ac=tmpl.cloneNode(true);
		ac.removeAttribute('id');
			let ai=ac.querySelector('#_account_id');	//checkbox
		ai.id=a.id;
		ai.value=a.id;
		ai.setAttribute('data-type', a.type);
		ai.onchange=accountChange;
		let enabled=true;
		if (prefs.hasOwnProperty(a.id)) {
			if (prefs[a.id]) ai.setAttribute('checked', 'checked');
			else enabled=false;
		} else {	//fresh install or new account: assume 'true'
			ai.setAttribute('checked', 'checked');
			let p={}; p[a.id]=true;
			prefs[a.id+'_curorsent']='current';
			p[a.id+'_curorsent']='current';
			messenger.storage.local.set(p);
		}
			e=ac.querySelector('#_account_name');	//label
		e.removeAttribute('id');
		e.textContent=a.name;
			e=ac.querySelector('#_account_opts');	//div with opts
		e.id=a.id+'_opts';
		if (!enabled) e.style.display='none';
			e=ac.querySelector("input[value=current]");
		e.setAttribute('data-pref', a.id+'_curorsent');
		e.setAttribute('name', a.id+'_vorgabe');
		if (enabled && prefs[a.id+'_curorsent']=='current') e.setAttribute('checked', 'checked');
			e=ac.querySelector("input[value=sent]");	
		e.setAttribute('data-pref', a.id+'_curorsent');
		e.setAttribute('name', a.id+'_vorgabe');
		if (enabled && prefs[a.id+'_curorsent']=='sent') e.setAttribute('checked', 'checked');
			e=ac.querySelector("input[data-pref=_account_sentalso]");	
		e.setAttribute('data-pref', a.id+'_sentalso');
		if (enabled && prefs[a.id+'_sentalso']) e.setAttribute('checked', 'checked');
			e=ac.querySelector("input[data-pref=_account_totrash]");	
		e.setAttribute('data-pref', a.id+'_totrash');
		if (enabled && prefs[a.id+'_totrash']) e.setAttribute('checked', 'checked');
		ae.appendChild(ac);
	}
	//tmpl.style.display='none';
	if (!('chooseBehind' in prefs)) {
		prefs.chooseBehind=false;
		messenger.storage.local.set({chooseBehind: false});
		messenger.cs2c.setPrefs(prefs, 'chooseBehind');
	}

	/*
	 *	set all <input> fields
	 */
	let inputs=document.getElementsByTagName('input');
	for (let input of inputs) {
		let pref = input.getAttribute('data-pref');
		if (pref && pref.charAt(0)!='_') {  //not the inputs in the template
			input.addEventListener("change", prefChange);
			if (!pref.includes('account')) {  //only non-account specific options
				let value=prefs[pref];
				let type=input.type;
debug('set input pref '+pref+' value='+value);
				if (type=='checkbox') {
					if (value) input.checked='checked';
				} else if (type=="radio") {
					if (value) document.querySelector("input[value="+value+"]").checked=true;
				} else if (type=="text") {
					if (value) input.value=value;
				}
			}
		}
	}
	if (!('use_TBB' in prefs)) {
		document.querySelector("[data-pref='use_TBB']").checked='checked';
		//don't set use_TBB by default, used to show TBB in toolbar
	}

	function prefChange(event) {
		let input=event.target;
		let type=input.type;
		let pref=input.getAttribute('data-pref');
		let value;
		if (type=='checkbox')
			value=input.checked;
		else //if (type=="radio"||type=="text") {
			value=input.value;
debug('pref change: '+pref+' '+value);
		prefs[pref]=value;
		let p={}; 
		p[pref]=value;
		messenger.storage.local.set(p);
    messenger.cs2c.setPrefs(prefs, pref);

	}	//function prefChange

	return true;
}

/*
function doOk() {
	return true;
}
*/

function accountChange(event) {
  let account=event.target.id;
  let state=event.target.checked;
debug('change of '+account+' to '+state);
  prefs[account]=state;
  let p={};
  p[account]=state;

  let o=document.getElementById(account+'_opts');
  if (state) {
    o.removeAttribute('style')
    prefs[account+'_curorsent']='current';
    p[account+'_curorsent']='current';
    o.querySelector("input[value=current]").checked=true;
  } else {
    o.style.display='none';
 		delete prefs[account+'_curorsent'];
		messenger.storage.local.remove(account+'_curorsent');
 		delete prefs[account+'_sentalso'];
		messenger.storage.local.remove(account+'_sentalso');
 		delete prefs[account+'_totrash'];
		messenger.storage.local.remove(account+'_totrash');
    o.querySelector("input[data-pref="+account+"_sentalso]").checked=false;
    o.querySelector("input[data-pref="+account+"_totrash]").checked=false;
  }
  messenger.storage.local.set(p);
  messenger.cs2c.setPrefs(prefs, account);
}

var lastpressed='';
function keys(event) {
//debug('"'+event.key+'"');
	if (lastpressed=='' && event.key=='c') lastpressed='c';
	else if (lastpressed=='c' && event.key=='s') lastpressed='s';
	else if (lastpressed=='s' && event.key=='2') lastpressed='2';
	else if (lastpressed=='2' && event.key=='c')  {
		document.getElementById('hiddenprefs').style.display='block';
	} else lastpressed='';
}

debug("options");
doInit();

messenger.tabs.onRemoved.addListener(function () {dump('--- cs2c CLOSE CLOSE\n');});
// tabs.onRemoved event fired after context unloaded.

document.addEventListener("keyup", keys);

function debug(txt) {
	if (prefs) {
		if (prefs.debug) {
			if (debugcache) console.log(debugcache); debugcache='';
			console.log('CS2C: '+txt);
		}
	} else {
		debugcache+='CS2C: '+txt+'\n';
	}
}

//try: (see https://thunderbird.topicbox.com/groups/addons/T1d816a2309bc41ce)
/*
window.addEventListener('beforeunload', function (e) {
  e.preventDefault();
	// shows standard Mozilla Firefox prompt 
	// "This page is asking you to confirm that you want to leave - data you have entered may not be saved."
	// but only if something changed!
});
*/