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

var prefs;
var u2i;			//messenger.addressbooks id (==nsIAbDirectory.UID) -> prefId (ldap2.server.xxx)
var u2f;			//                                               -> externalFilename
var i2u;

async function doInit() {
debug('entered');
	try {
		let prefnames=['autodownload', 'autoupload', 'timeddownload', 'timedupload', 'synctype', 'localpath',
		 'protocol', 'host', 'path', 'user', 'imapfolderAccount', 'imapfolderName', 'imapfolderPath',
		 'downloadpolicy', 'imapuploadpolicy', 'usepost', 'hideallpopups', 'hidepopups', 'loadtimer',
		 'notimecheck', 'noupload', 'separateupdown', 'noexternalappset', 'debug', 'upgraded', 'ftpwarn'];
		prefs=await messenger.storage.local.get(prefnames);
debug('fixed prefs loaded');
	} catch(e) {
		// if options tab is visible on startup, getting prefs fails
debug('failed to load prefs, wait...');
		setTimeout(doInit, 500);
		return;
	}

	[ u2i, u2f ]=await messenger.abs.uids2ids();		//nsIAbDirectory.UID -> prefId (ldap2.server.xxx)
	let books=await messenger.addressBooks.list();	//load prefs for books
	let prefnames=[];
	for (let book of books) {
			//id=68364c8a-d629-4678-972f-bb92e758d90d
			//name=ggbs
		prefnames.push(u2i[book.id]+'.up');
		prefnames.push(u2i[book.id]+'.down');
		prefnames.push(u2i[book.id]+'.filename');
	}
debug('load prefs for book: '+JSON.stringify(prefnames));
	Object.assign(prefs, await messenger.storage.local.get(prefnames));
debug('prefs='+JSON.stringify(prefs));

	i2u=new Object;
	for (let [uid, id] of Object.entries(u2i)) {
		i2u[id]=uid
//debug('u2i: '+uid+'->'+id+'\n');
	}

	async function prefChange(event) {
		let input=event.target;
		let type=input.type;
		let pref=input.getAttribute('data-pref');
		let value;
		if (type=='checkbox')
			value=input.checked;
		else //if (type=="radio"||type=="text") {
			value=input.value;
debug('pref change: '+pref+' '+value);

    let p={}; 
    if (pref=='remote') {   //split into protocol,host,path
      let uri=await messenger.abs.splitURI(value);
      if (uri) {
debug('splitURI: '+value+' -> '+JSON.stringify(uri));
        prefs['protocol']=uri.protocol;
        p['protocol']=uri.protocol;
        prefs['host']=uri.host;
        p['host']=uri.host;
        prefs['path']=uri.path;
        p['path']=uri.path;

        prefs['synctype']='remote';
        p['synctype']='remote';
				document.getElementById('syncremote').checked=true;
        p['ftpwarn']=0;
      }
    } else {
      prefs[pref]=value;
      p[pref]=value;
    }

		if (!prefs['separateupdown'] && pref.match(/\.down$/)) {
			//also set the .up preference
//debug(pref+' to '+value);
			pref=pref.replace('.down', '.up');
//debug('        also '+pref+' to '+value);
			prefs[pref]=value;
			p[pref]=value;
		}
		if (pref=='separateupdown' && value==false) {
			//copy .down preference to .up preference
			for (let [apref, avalue] of Object.entries(prefs)) {
				if (apref.match(/\.down$/)) {
					apref=apref.replace('.down', '.up');
//debug('copy pref from .down to '+apref);
					prefs[apref]=avalue;
					p[apref]=avalue;
				}
			}
		}
		if (pref=='noupload') {
			noupload();	//if separateupdown changes, this is done after windows reload
			if (prefs['noupload']) {
				prefs['autoupload']=false;
				p['autoupload']=false;
				prefs['timedupload']=false;
				p['timedupload']=false;
			}
		}
debug('store '+JSON.stringify(p));
		await messenger.storage.local.set(p);
    messenger.abs.setPrefs(prefs, pref);

		if (pref=='remote' || pref=='user') {
			usePwd(true);	//store password and show URI for FTP/HTTP sync
//		} else if (pref=='loadtimer') {
//			messenger.abs.startTimer();
		} else if (pref=='separateupdown') {
			window.location.reload();
		}
	}	//function prefChange

	function passwordChange(event) {
debug('entered');
    usePwd(true);	//store password and show URI for FTP/HTTP sync
	}	//function passwordChange

	function noupload() {
		document.getElementById('noupload').parentElement.style.display=
			prefs['separateupdown']?'none':'block';

		let nu=prefs['noupload']?'none':'block';
		let nu1=prefs['noupload']?'none':'inline-block';
		document.getElementById('separateupdown').parentElement.style.display=nu;
		document.getElementById('imappolicy').style.display=nu;
		document.getElementById('autouploadnow').style.display=nu1;
		document.getElementById('timedupload').parentElement.style.display=nu;
		document.getElementById('autoupload').parentElement.style.display=nu;
		if (prefs['noupload']) {
			document.getElementById('timedupload').checked=false;
			document.getElementById('autoupload').checked=false;
		}
	}

	if (prefs.hasOwnProperty('upgraded')) {
debug('upgraded='+prefs['upgraded']);
		let msg=messenger.i18n.getMessage('upgrade');
    if (prefs['upgraded'])
      msg='- '+msg+'\n- '+prefs['upgraded'];
		let u=document.getElementById('upgrade');
		u.textContent=msg;
		u.style.display='block';
    delete prefs['upgraded'];
		messenger.storage.local.remove('upgraded');
	}

	/*
	 * show selected synctype tab
	 */
	if (prefs['synctype']) {  //might be null
		let tab=document.getElementById('tab_'+prefs['synctype']);
		if (tab) tab.checked='checked';
  }

	/*
	 *	set all <input> fields
	 */
	let inputs=document.getElementsByTagName('input');
	for (let input of inputs) {
		if (input.id=='ef-t') continue;
		let pref = input.getAttribute('data-pref');
		if (pref) {
			let type=input.type;
			let value=prefs[pref];
			if (type=='checkbox') {
				if (value) input.checked='checked';
			} else if (type=="radio") {
				if (value) {  //might be synctype='none' 
          let rad=document.querySelector("input[value="+value+"]");
          if (rad) rad.checked='checked';
        }
			} else if (type=="text") {
				if (value) input.value=value;
			}
			input.addEventListener("change", prefChange);
		}
	}

	/*
	 * set the password field
   */
	let pwdfield=document.getElementById("password");
	pwdfield.addEventListener("change", passwordChange);
  usePwd(false);	//show URI for FTP/HTTP sync

	/*
	 * set the addressbooks fields
	 *
	 * book.uid.filename->Mozilla.mab
	 * book.uid.down	immer
	 * book.uid.up		nur bei seperate up/down
	 */
	let abooks=await messenger.addressBooks.list();

  document.getElementById("SyncListDesc").style.display =
      (prefs['separateupdown']?'block':'none');

	let slc=document.getElementById('SyncListCheck');
	let ml=document.getElementById('MabList');
	let ml1=document.getElementById('MabList1');

	if (abooks) for (let abook of abooks) {
		//id=ec9b4779-65bb-4b3d-a87b-e56e6ff61911
		//name=Ehemalige
    let l=document.createElement('label');
    l.setAttribute('class', 'block');
		if (prefs['separateupdown']) {
			let cb1=document.createElement('input');
			cb1.setAttribute('type', 'checkbox');
			cb1.setAttribute('value', u2i[abook.id]);
			cb1.setAttribute('data-pref', u2i[abook.id]+'.up');
			if (prefs[u2i[abook.id]+'.up'])
				cb1.checked=true;
			cb1.addEventListener("change", prefChange);
			l.appendChild(cb1)
		}
		let cb=document.createElement('input');
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('value', u2i[abook.id]);
    cb.setAttribute('data-pref', u2i[abook.id]+'.down');
		if (prefs[u2i[abook.id]+'.down'])
			cb.checked=true;
		cb.addEventListener("change", prefChange);
    l.appendChild(cb)
    let lt=document.createTextNode(abook.name);
    l.appendChild(lt);
		l.setAttribute('data-pref', u2i[abook.id]+'.filename');
    l.setAttribute('data-filename', u2f[abook.id]);
		l.addEventListener("contextmenu", show_externalFilename);
    slc.appendChild(l);

		let o=document.createElement('option');
		o.value=u2i[abook.id];
		o.textContent=abook.name;
		ml.appendChild(o);
		let o1=document.createElement('option');
		o1.value=u2i[abook.id];
		o1.textContent=abook.name;
		ml1.appendChild(o1);

	}

	/*
	 * set the folder menulist
	 */
	function folderSelected(event) {
		let target=event.target;
		let account=target.getAttribute('data-account');
		let path=target.getAttribute('data-path');
		let name=target.getAttribute('data-name');
		let sel = document.getElementById("selectedIMAP");
		sel.value=name; //+' ('+account+':'+path+')';
		prefs['imapfolderAccount']=account;
		prefs['imapfolderPath']=path;
		prefs['imapfolderName']=name;
		let p={};
		p['imapfolderAccount']=account;
		p['imapfolderPath']=path;
		p['imapfolderName']=name;

		prefs['synctype']='imap';
		p['synctype']='imap';
		document.getElementById('syncimap').checked=true;

		messenger.storage.local.set(p);
    messenger.abs.setPrefs(prefs, 'imapfolder');

		if (selfolder) selfolder.className="";
		target.className="selfolder";
		selfolder=target;
	}
	function folderClick(event) {
		let t=event.target;
		t.parentElement.querySelector(".nested").classList.toggle("active");
		t.classList.toggle("caret-down");
	}
	const folderTypes = ["inbox", "drafts", "sent", "trash", "templates", "archives", "junk", "outbox"];
	let selfolder;
	function sipFolders(elem, account, folders) {
		for (let folder of folders.sort(
				(f1,f2)=>{return f1.name.toUpperCase().localeCompare(f2.name.toUpperCase());})) {
			let li=document.createElement('li');
			li.textContent=folder.name;
			if (folder.type) {
				if (folderTypes.indexOf(folder.type)>=0)
					li.className=folder.type;
				else {
					li.className='unknown';
debug('abs_options throws: unknown folder type '+folder.type+' for folder '+folder.name);
				}
			} else li.className='folder';
			li.setAttribute('data-account', folder.accountId);
			li.setAttribute('data-path', folder.path);
			li.setAttribute('data-name', account.name+':'+folder.name);
			if (folder.accountId==prefs['imapfolderAccount'] && folder.path==prefs['imapfolderPath']) {
				li.className="selfolder";
				selfolder=li;
			}
			li.addEventListener("click", folderSelected);
			elem.appendChild(li);
			if (folder.subFolders.length) {
				let li=document.createElement('li');
					li.className="folder";
				let s=document.createElement('span');
					s.className="caret";
					s.textContent=folder.name;
					s.addEventListener("click", folderClick);
					//s.addEventListener("mouseover", folderClick);
					//s.addEventListener("mouseout", folderClick);
				let ul=document.createElement('ul');
					ul.className="nested";
				li.appendChild(s);
				li.appendChild(ul);
				sipFolders(ul, account, folder.subFolders);
				elem.appendChild(li);
			}
		}
	}
	if (prefs['imapfolderName']) {
		let sel = document.getElementById("selectedIMAP");
		sel.style.color='black';
		sel.value=prefs['imapfolderName'];
	}

	let sip = document.getElementById("syncimapPicker");
	let accounts=[];
  try {
    accounts=await messenger.accounts.list();
  } catch(e) {
    console.error('Please remove % signs from foldernames');
    sip.innerHTML='<div style="color: red; margin: 20px;">Bitte entfernen sie alle %-Zeichen aus\
    Ordnernamen!<br/>Es gibt einen Fehler in Thunderbird, der die Ausführung dieses Add-ons\
    verhindert. Siehe Bug 1684327</div>\
    <div style="color: red; margin: 20px;">Please remove any %-signs from foldernames!<br/>\
    There is a bug in Thunderbird which prevents this add-on from running. See Bug 1684327</div>';
  }
	for (let account of accounts) {
		if (account.type!='imap') continue; 
		let li=document.createElement('li');
		li.className="account";
		let s=document.createElement('span');
			s.className="caret";
			s.textContent=account.name;
			s.addEventListener("click", folderClick);
			//s.addEventListener("mouseover", folderClick);
			//s.addEventListener("mouseout", folderClick);
		li.appendChild(s);
		let ul=document.createElement('ul');
			ul.className="nested";
		li.appendChild(ul);
		sipFolders(ul, account, account.folders);
		sip.appendChild(li);
	}
	if (prefs['imapfolderName'] && !selfolder) {
debug("abs_options throws: ill. IMAP folder: no folder found for "+prefs['imapfolderAccount']+':'+prefs['imapfolderPath']);
		let sel = document.getElementById("selectedIMAP");
		sel.style.color='red';
	}

	noupload();

/////////////////////////
// buttons
	document.getElementById("ChoosePath").addEventListener("click", ChoosePath);
	document.getElementById("autodownloadnow").addEventListener("click", downloadNow);	//downloadNow(true)
	document.getElementById("autouploadnow").addEventListener("click", uploadNow);			//uploadNow(true)
	document.getElementById("SaveMab").addEventListener("click", SaveMab);
	document.getElementById("ChooseFile").addEventListener("click", ChooseFile);
	document.getElementById("LoadMab").addEventListener("click", LoadMab);
	document.getElementById("UploadMab").addEventListener("click", UploadMab);
	document.getElementById("DownloadMab").addEventListener("click", DownloadMab);

	document.getElementById("ef-undo").addEventListener("click", enter_externalFilename);
	document.getElementById("ef-close").addEventListener("click", hide_externalFilename);
	document.getElementById("ef-save").addEventListener("click", set_externalFilename);

	document.addEventListener("keyup", keys);

//show a button to do some test
/*
	if (prefs['user']=='ggbs') { // && this.gABS.dodebug
		document.getElementById("doatest").style.display='inline-block';
		document.getElementById("doatest").addEventListener("click", DoATest);
	}
*/
  messenger.abs.onFilePicker.addListener(data => {
debug('onFilePicker fired: '+JSON.stringify(data));
    if (data.path) {
      if (data.type=='path') GetPath(data.path);
      else if (data.type=='file') GetFile(data.path);
      else if (data.type=='save') GetSave(data.path) 
    }
  });
} // init

function show_externalFilename(event) {
debug('entered');
	event.preventDefault();
	let input=event.target;
	let abook=input.textContent;
	let pref=input.getAttribute('data-pref');
	document.getElementById('ef-l').textContent=abook;
	let ef=document.getElementById('ef');
	ef.setAttribute('data-pref', pref);
	ef.setAttribute('data-filename', input.getAttribute('data-filename'));
	enter_externalFilename();
	let rect = input.getBoundingClientRect();
	ef.style.left=rect.right+'px';
	ef.style.top=rect.top+'px';
	ef.style.display='block';
}
function hide_externalFilename(event) {
debug('entered');
	let ef=document.getElementById('ef');
	ef.style.display='none';
}
function enter_externalFilename() {
debug('entered');
	let pref=document.getElementById('ef').getAttribute('data-pref');
	let filename=prefs[pref];
	if (!filename) {
		filename=document.getElementById('ef').getAttribute('data-filename');
	}
	document.getElementById('ef-t').value=decodeURIComponent(escape(filename));
}
function set_externalFilename(event) {
debug('entered');
	let pref=document.getElementById('ef').getAttribute('data-pref');
	let filename=document.getElementById('ef-t').value;
debug(pref+' '+filename);
	if (filename) {
		prefs[pref]=unescape(encodeURIComponent(filename));
		let p={}; 
		p[pref]=prefs[pref];
		messenger.storage.local.set(p);
	} else {
		delete prefs[pref];
		messenger.storage.local.remove(pref);
	}
	messenger.abs.setPrefs(prefs, pref);
	hide_externalFilename();
}

async function ChoosePath() {
  let prompt=messenger.i18n.getMessage("choosesyncdir");
	messenger.abs.filePicker(prompt, 'path', null, '');
} // ChoosePath
async function GetPath(path) {  //called from event
  let pref='localpath';
  prefs[pref]=path;
  let p={}; p[pref]=path;
  messenger.storage.local.set(p);
  messenger.abs.setPrefs(prefs, 'localpath');
  document.getElementById('localpath').value=path;
  document.getElementById('synclocal').checked=true;
}
function ChooseFile() {
  let prompt=messenger.i18n.getMessage("choosefile");
  let mab=messenger.i18n.getMessage("mab");
  // '.mab' will be removed in filePicker if appVersion>=82
	messenger.abs.filePicker(prompt, 'file', { '*.sqlite': mab+" (*.sqlite)", '*.mab': '(*.mab)'}, '' );
} // ChooseFile
async function GetFile(path) {  //called from event
  document.getElementById( "MabFilePath" ).value = path;
  //var mabFileName = filePicker.file.leafName;
  //var mabName = mabFileName.substr( 0, mabFileName.lastIndexOf(".") );
  let mabName=path.replace(/.*[/\\]/, '');
  mabName = mabName.substr( 0, mabName.lastIndexOf(".") );
  document.getElementById( "MabName" ).value = mabName;
}

/*
 * Save a mab file to disk
 */
var mabName;
async function SaveMab() {
  let prompt=messenger.i18n.getMessage("choosefiledest");
  let mab=messenger.i18n.getMessage("mab");
	let id = document.getElementById( "MabList" ).value;
	let book = await messenger.addressBooks.get(i2u[id]);
	mabName=book.name;
	messenger.abs.filePicker(prompt, 'save', { '*.sqlite': mab+" (*.sqlite)"}, mabName + '.sqlite' );
}
async function GetSave(path) {  //called from event
  let id = document.getElementById( "MabList" ).value;
  let ret=await messenger.abs.saveMabFile(id, ''/*=use filepicker file*/);
debug('Saved '+id+' to '+path+' returned '+ret);
  if (ret)
    alert(messenger.i18n.getMessage('stored'));
  else
    alert(messenger.i18n.getMessage('storefailed'));
}

/*
 * Load a mab file from disk
 */
async function LoadMab()
{
  let filename = document.getElementById( "MabFilePath" ).value;
  if (!filename) return;

  let mabName = document.getElementById( "MabName" ).value;
  if (!mabName) return;

debug('load '+filename+' as '+mabName);
	let ret=await messenger.abs.loadMab(mabName, filename);	//returns string name
	if (ret!=null) {	//null if no overwrite
		if (!ret) {
debug('loaded');
			document.getElementById( "MabFilePath" ).value='';
			document.getElementById( "MabName" ).value='';
//TODO			refreshAddressbook();  // refresh addressbook window
			alert(messenger.i18n.getMessage('loaded'));
		} else {
			let msg=messenger.i18n.getMessage(ret);
			if (!msg) msg=ret;
			alert(msg);
		}
	}
}

/*
 * Upload a single mab file
 */
function UploadMab()
{ //upload single mab from options menu
    var mabId = document.getElementById( "MabList1" ).value;	//ldap_2.servers.book'
debug(mabId);
    messenger.abs.showPopup('upload', mabId, 'manual', true);
}

/*
 * Download a single mab file
 */
function DownloadMab()
{
  let mabName = document.getElementById( "DownloadMabName" ).value;
debug(mabName);
  if (!mabName) return;

  let created=messenger.abs.showPopup('download', mabName, 'manual', true);
//TODO: in download() sollte kein test auf file modification stattfinden

}

////TODO
function uploadNow() {
//called via button click, not via automatic upload at end
debug('entered');
  if (prefs['synctype']!='none')
    messenger.abs.showPopup('upload', '', 'manual', true/*force*/);
}

function downloadNow() {
//called via button click, not via automatic download at start
debug('entered');
  if (prefs['synctype']!='none')
    messenger.abs.showPopup('download', '', 'manual', true/*force*/);
}

/*
 * return URI for remote syncronization
 */
async function usePwd(store)
{
	let uri;

	let pwdfield=document.getElementById('password');;
	let pwd='';
	if (store) pwd=pwdfield.value;

  let syncprotocol = prefs['protocol'];
  let synchost = prefs['host'];
  if (!synchost || !syncprotocol) uri='';
  let syncuser = prefs['user'];
  let syncpath = prefs['path'];
	if (!syncprotocol || !synchost || !syncuser || !syncpath) return;
	let syncpassword='';
debug('call abspassword');
	syncpassword = await messenger.abs.abspassword(syncprotocol, synchost, syncuser, pwd);
//debug('password='+syncpassword+' should be '+pwd);
	if (!store) pwdfield.value=syncpassword;
  if (syncpassword) syncpassword='**********';
	let userpass='';
	if (syncuser) {
		userpass=syncuser+(syncpassword?(":"+syncpassword):'');
		if (userpass) userpass += "@";
	}
	uri=syncprotocol + "://"+synchost + syncpath;
	document.getElementById("remote").value = uri;
}

var lastpressed='';
function keys(event) {
//debug('"'+event.key+'"');
	if (lastpressed=='' && event.key=='a') lastpressed='a';
	else if (lastpressed=='a' && event.key=='b') lastpressed='b';
	else if (lastpressed=='b' && event.key=='s')  {
		document.getElementById('hiddenprefs').style.display='block';
	} else lastpressed='';
}

function debug(txt, e) {
	ex=typeof e!=='undefined';
	if (!ex) e = new Error();
	let stack = e.stack.toString().split(/\r\n|\n/);
	let ln=stack[ex?0:1].replace(/moz-extension:\/\/.*\/(.*:\d+):\d+/, '$1');	//getExternalFilename@file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/abs_utils.js:1289:6
	if (!ln) ln='?';
	messenger.abs.debug(txt, ln);
}

messenger.addressBooks.onCreated.addListener(node=>{window.location.reload()});
messenger.addressBooks.onUpdated.addListener(node=>{window.location.reload()});
messenger.addressBooks.onDeleted.addListener(uid=>{window.location.reload()});


async function DoATest()
{
  //alert('Nothing to test currently');
	//messenger.abs.doATest('viewLog.xhtml');
let page=messenger.extension.getBackgroundPage();
debug('page='+page);
	try {
		messenger.abs.doATest('');
	} catch(e) { debug('TEST throws '+e); }

/*
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
		'type':	'popup',									//(CreateType) Specifies what type of browser window to create. The ‘panel’ and ‘detached_panel’ types create a popup unless the ‘–enable-panels’ flag is set.
		'url': '../status.html',							//(string or array of string) A URL or array of URLs to open as tabs in the window. Fully-qualified URLs must include a scheme (i.e. ‘http://www.google.com’, not ‘www.google.com’). Relative URLs will be relative to the current page within the extension. Defaults to the New Tab Page.
		'width': 100									 		//(integer) The width in pixels of the new window, including the fram
	});
*/
}

debug('started');
messenger.tabs.getCurrent().then(()=>{ doInit(); });	//works like onload
