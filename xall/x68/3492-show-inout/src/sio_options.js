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

let gKey=null;
let gAddr=null;
let gLocalFolder=null;
let gColumns=null;
let prefs=null;

async function getEmails() {
debug('getEmails');
  let pref='AdditionalAddresses.'+gKey;
  gAddr=prefs[pref]||'';  //was ??, but bad for ATN
  let aa=gAddr.split(',');
  let l=document.getElementById("addaddr_list");
  while (l.lastChild) l.removeChild(l.lastChild);
  let count=0;
  for (let i=0; i<aa.length; i++) {
    let email=aa[i].trim();
    if (email) {
      addEmailInputField(email);
      count++;
    }
  }
  addEmailInputField(); // add empty element

  let atb=document.getElementById('addTo_box');
  let cb=document.getElementById('addTo');
  let rg=document.getElementById('addTo_group');
  if (gKey==gLocalFolder.key) {
    atb.style.visibility='hidden';
  } else {
    atb.style.visibility='visible';
  }
  pref='AddAddressesTo.'+gKey;
  let add=prefs[pref]||0;  //was ??, but bad for ATN
  if (add==0) {
    cb.checked=false;
    document.getElementById('addTo_lf').disabled=true;
    document.getElementById('addTo_aa').disabled=true;
    document.getElementById('addTo_lf').checked=true;
  } else {
    cb.checked=true;
    document.getElementById('addTo_lf').disabled=false;
    document.getElementById('addTo_aa').disabled=false;
    if (add==1)
      document.getElementById('addTo_lf').checked=true;
    else
      document.getElementById('addTo_aa').checked=true;
  }

  return count;
}
async function setEmails() {
debug('setEmails');
  let addr='';
  let aa=document.getElementById("addaddr_list").childNodes;
  for (let i=0; i<aa.length; i++)
    if (aa[i].value)
      addr+=aa[i].value.trim()+',';
  addr=addr.substr(0,addr.length-1);
  if (gAddr!=addr) {
    let pref='AdditionalAddresses.'+gKey;
    prefs[pref]=addr;
    gAddr=addr;
  }

  let add=0;
  if (document.getElementById('addTo').checked) {
    add=document.querySelector('input[name="addTo"]:checked').value;
  }
  let pref='AddAddressesTo.'+gKey;
  prefs[pref]=add;
}

async function doInit() {
debug('doInit');
  prefs=await messenger.storage.local.get(null);

  gLocalFolder=await messenger.sio.localfolder();
  document.getElementById('lfn').textContent=gLocalFolder.prettyName;
  document.getElementById('addTo').onclick=function(event) {
    document.getElementById('addTo_group').disabled=!event.target.checked;
    document.getElementById('addTo_lf').disabled=!event.target.checked;
    document.getElementById('addTo_aa').disabled=!event.target.checked;
  };

  messenger.accounts.list().then(function(accounts) {
    let ae=document.getElementById('accounts');
    let lf;
    for (let i=0; i<accounts.length; i++) {
      let a=accounts[i];
      if (!gKey) gKey=a.id;
      let o=document.createElement('option');
      o.setAttribute('label', a.name);
      o.setAttribute('value', a.id);
      o.setAttribute('type', a.type);
      o.setAttribute('class','folderMenuItem')
      o.textContent=a.name;
      if (a.type=='none') lf=o;
      else                ae.appendChild(o);
    }
    ae.appendChild(lf);
    ae.onchange=accountChange;
    getEmails();    // get emails for first account
    return accounts;
  });


  let itp=prefs.InTextPrefix||'';  //was ??, but bad for ATN
  document.getElementById('InTextPrefix').value=itp;
  document.getElementById('InTextPrefix').onchange=prefChanged;
  let otp=prefs.OutTextPrefix||'';  //was ??, but bad for ATN
  document.getElementById('OutTextPrefix').value=otp;
  document.getElementById('OutTextPrefix').onchange=prefChanged;

  document.getElementById('debug').checked=prefs.debug||false;  //was ??, but bad for ATN
  document.getElementById('debug').onchange=prefChanged;

  // get labels for columns and create checkbox
  gColumns=await messenger.sio.cols();
	createColumnList();
  return true;
}
function createColumnList() {
  let cl=document.getElementById("columns_list");
	while (cl.firstChild) cl.removeChild(cl.lastChild);
	gColumns.forEach((label, id) => {
    let cb=document.createElement('input');
    cb.setAttribute('id', 'col_'+id);
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('data', id);
    cb.onchange=prefChanged;
    let l=document.createElement('label');
    l.setAttribute('class', 'block');
    l.appendChild(cb)
    let lt=document.createTextNode(label);
    l.appendChild(lt);
    cl.appendChild(l);
  });
  let setCols=prefs.Columns||'';  //was ??, but bad for ATN
  let cols=setCols.split(/\s*,\s*/);
	let nCols=new Array();
	cols.forEach(col=>{
    if (col && gColumns.has(col)) {
			document.getElementById("col_"+col).checked=true;
			nCols.push(col);
//TODO: if no element, remove from cols and later save pref
		}
	});
	let newCols=nCols.join(',');
	if (newCols!=setCols) {
debug('columns has changed from '+setCols+' to '+newCols);
		prefs.Columns=newCols;
		messenger.storage.local.set({Columns: newCols});
	}
}

function prefChanged(ev) {
debug('prefChanged for '+ev.target.id+' data='+ev.target.getAttribute('data')+' value='+ev.target.value+' checked='+ev.target.checked);

  setEmails();

  let liste='';
	gColumns.forEach((label, col) => {
    if (document.getElementById("col_"+col).checked) liste+=col+',';
	});
  prefs.Columns=liste.substr(0,liste.length-1);

  let itp=document.getElementById('InTextPrefix').value;
  prefs.InTextPrefix=itp;
  let otp=document.getElementById('OutTextPrefix').value;
  prefs.OutTextPrefix=otp;

  prefs.debug=document.getElementById('debug').checked;

  messenger.storage.local.set(prefs);

	let col='';
	let state=false;
	let data=ev.target.getAttribute('data');
	if (data) {
		col=data;
		state=ev.target.checked;
	}
  messenger.sio.prefChanged(prefs, col, state); 

// in console: JavaScript error: undefined, line 0: Error: An unexpected error occurred
// aber alles funktioniert und auch mit try/catch nicht fetzustellen

  return true;
}
function addEmailInputField(email) {
debug('addEmailInputField');
  let l=document.getElementById("addaddr_list");
  let t=document.createElement('input'); 
  t.setAttribute('size', 40);
  if (email!==undefined) t.setAttribute('value', email);
  l.appendChild(t);
  l.scrollTop=1000;
  if (!email) {
    t.onchange=function(event) {
      if (!event.target.nextSibling) addEmailInputField();
      setEmails();
      prefChanged(event);
    };
  }
  return true;
}

async function accountChange(event) {
debug('accountChange');
  setEmails();
  prefChanged(event);
  gKey=event.target.value;
  getEmails();
}

function colsChanged(changed) {
debug('colsChanged changed='+JSON.stringify(Array.from(changed)));
	changed.forEach((label, col) => {
debug(' changed '+col+'->'+(label?label:'(removed)'));
    //change local version of gColumns
		if (!label) {
			gColumns.delete(col)
		} else {
			gColumns.set(col, label);
		}
	});
	//probably changed preference 'Columns' is set in createColumnList
	createColumnList();
}

messenger.runtime.onMessage.addListener((request, sender, sendResponse)=>{
debug('Got message from background');
  colsChanged(request.changed);
});

messenger.sio.onColumnsAdded.addListener(changed => {
debug('onColumnsAdded changed='+JSON.stringify(Array.from(changed)));
   colsChanged(changed);

});
/*
messenger.tabs.onRemoved.addListener(function () {
  debug('close');
});
// tabs.onRemoved event fired after context unloaded.
*/

var lastpressed='';
function keys(event) {
//debug('"'+event.key+'"');
	if (lastpressed=='' && event.key=='s') lastpressed='s';
	else if (lastpressed=='s' && event.key=='i') lastpressed='i';
	else if (lastpressed=='i' && event.key=='o')   {
		document.getElementById('hiddenprefs').style.display='block';
	} else lastpressed='';
}
document.addEventListener("keyup", keys);

function debug(txt, e) {
	ex=typeof e!=='undefined';
	if (!ex) e = new Error();
	let stack = e.stack.toString().split(/\r\n|\n/);
	let ln=stack[ex?0:1].replace(/moz-extension:\/\/.*\/(.*:\d+):\d+/, '$1');	//getExternalFilename@file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/sio_utils.js:1289:6
	if (!ln) ln='?';
	messenger.sio.debug(txt, ln);
}

debug('options');
doInit();
