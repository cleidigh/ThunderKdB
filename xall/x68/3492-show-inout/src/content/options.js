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

var {Services}=ChromeUtils.import("resource://gre/modules/Services.jsm");
var {MailServices}=ChromeUtils.import("resource:///modules/MailServices.jsm");
var {MailUtils}=ChromeUtils.import("resource:///modules/MailUtils.jsm");

//if(!de_ggbs) var de_ggbs={};    //might fail because of race condition

if (!de_ggbs_sio) var de_ggbs_sio = function() {
  var gColumns=new Object({
    'subjectCol':'',  'dateCol':'', 'senderCol':'', 'recipientCol':'',
    'sizeCol':'', 'locationCol':'', 'accountCol':''
  });
  var pub = {
    pref:   Services.prefs.getBranch("extensions.showInOut."),
    am:     MailServices.accounts,
    key:    null,
    addr:   null,
    localFolder:  null,
    console:  ChromeUtils.import("resource://gre/modules/Console.jsm").console,
  };

  pub.getEmails = function() {
    var key = this.key;
    var addr;
    var pref='AdditionalAddresses'+(key=='all'?'':('.'+key));
    try { addr=this.pref.getCharPref(pref); }
      catch(e) { addr=''; }
    this.addr=addr;
    var aa=addr.split(',');
    var l=document.getElementById("addaddr_list");
    while (l.lastChild) l.removeChild(l.lastChild);
    var count=0;
    for (var i=0; i<aa.length; i++) {
      var email=aa[i].trim();
      if (email) {
        this.addEmail(email);
        count++;
      }
    }
    this.addEmail(); // add empty element

    var cb=document.getElementById('addTo');
    var rg=document.getElementById('addTo_group');
    if (key==this.localFolder) {
      cb.style.visibility='hidden';
      rg.style.visibility='hidden';
    } else {
      cb.style.visibility='visible';
      rg.style.visibility='visible';
    }
    var add;
    var pref='AddAddressesTo'+(key=='all'?'':('.'+key));
    try { add=this.pref.getIntPref(pref); }
      catch(e) { add=0; }
    if (add==0) {
      cb.checked=false;
      rg.disabled=true;
      rg.selectedIndex=0;
    } else {
      cb.checked=true;
      rg.disabled=false;
      rg.selectedIndex=add-1;
    }

    return count;
  }
  pub.setEmails = function() {
    var key = this.key;
    var addr='';
    var aa=document.getElementById("addaddr_list").childNodes;
    for (var i=0; i<aa.length; i++)
      if (aa[i].value)
        addr+=aa[i].value.trim()+',';
    addr=addr.substr(0,addr.length-1);
    if (this.addr!=addr) {
      var pref='AdditionalAddresses'+(key=='all'?'':('.'+key));
      this.pref.setCharPref(pref, addr);
    }

    var add=document.getElementById('addTo').checked ?
      document.getElementById('addTo_group').selectedIndex+1 : 0;
    var pref='AddAddressesTo'+(key=='all'?'':('.'+key));
    this.pref.setIntPref(pref, add);
  }

  pub.doInit = function() {
//console.log('sio: options start');
    document.getElementById('addTo_lf').label=this.am.localFoldersServer.prettyName;

    //Emails for all accounts
    this.key='all';
    var ac=this.getEmails();

    var folderPicker=document.getElementById('accountPopup');
    if (folderPicker.childNodes.length==1) {
      //Hide account selector if nothing but 'All Accounts'
      document.getElementById('forAccountBox').style.display='none';
    } else if (!ac) {
console.log('SIO: filters='+folderPicker._filters);
      //if no mails for 'All Accounts', remove this option
      folderPicker.parentNode.getItemAtIndex(0).remove();
      folderPicker.parentNode.selectedIndex=0;
      if (!folderPicker.firstChild.id) {    //TB68b3
Components.utils.reportError("ShowInOut: folder-menupopup does not have id's :-(");
        var URI=folderPicker.firstChild._folder.URI;
      } else {                              //TB68b2
Components.utils.reportError("ShowInOut: folder-menupopup does has id's again :-)");
        var URI=folderPicker.firstChild.id;
      }
      this.accountChange(URI);
    }

    // get labels for columns and create checkbox
    var w=window.opener;
    if (!w) w=window;   // if opened in a tab
    var col=w.document.getElementById('threadCols');
    if (!col) {
      var m=Services.wm; 
      col=m.getMostRecentWindow("mail:3pane").document.getElementById('threadCols');
    }
    var col=col.childNodes;
    for (var i=0; i<col.length; i++) {
      if (gColumns.hasOwnProperty(col[i].id)) {
        var label=col[i].getAttribute('label');
        gColumns[col[i].id]=label;
        addCol(col[i].id, label);
      }
    }

    var aa=(document.getElementById("columns_pref").value||'').split(',');
    for (var i=0; i<aa.length; i++) {
      col=aa[i].trim();
      if (col) document.getElementById("col_"+col).checked=true;
    }

    var lfs=this.am.localFoldersServer; //.account.key
    var lfa=this.am.FindAccountForServer(lfs);
    this.localFolder=lfa?lfa.key:'';

    return true;
  }
  pub.doOK = function() {
//console.log('sio: options close');
    this.setEmails();

    var liste='';
    for (var col in gColumns) if (document.getElementById("col_"+col).checked) liste+=col+',';
    //document.getElementById("columns_pref").value=liste.substr(0,liste.length-1);
    //on dialog close, the automatic savings of peference does no longer happen :-(
    this.pref.setCharPref('Columns', liste.substr(0,liste.length-1));

    var ObserverService = Services.obs; 
    ObserverService.notifyObservers(null, "de_ggbs_sio.prefChanged", null);

    return true;
  }
  pub.addEmail = function(email) {
    var l=document.getElementById("addaddr_list");
    var t=document.createElement('textbox');
    t.setAttribute('size', 40);
    t.setAttribute('oninput',
      'if (this.textLength==1) { this.oninput=null; de_ggbs_sio.addEmail(); }');
    if (email!==undefined) t.setAttribute('value', email);
    l.appendChild(t);
    l.scrollTop=1000;
    return true;
  }
  function addCol(id, label) {
    var l=document.getElementById("columns_list");
    var hb=document.createElement('hbox');
    var cb=document.createElement('checkbox');
    cb.setAttribute('id', 'col_'+id);
    cb.setAttribute('data', id);
    cb.setAttribute('label', label);
    hb.appendChild(cb);
    l.appendChild(hb);
    return true;
  }
  pub.accountChange = function(eventorstring) {
    this.setEmails();
    
    if (typeof eventorstring == 'object') {   //clicked
      if (!eventorstring.target.id)           //TB68b3
        var folderURI=eventorstring.target._folder.URI;
      else                                       //TB68b2
        var folderURI=eventorstring.target.id;
    } else {  //called with string from doInit
      var folderURI=eventorstring;
    }
    var accountKey;
    if (folderURI=='default://') accountKey='all';
    else {
      var folder;
      folder=MailUtils.getExistingFolder(folderURI);
      var account = this.am.FindAccountForServer(folder.server);
      accountKey=account.key;
    }
    this.key=accountKey;
    this.getEmails();
  }
  return pub;
}();

//document.addEventListener("dialogaccept", function(event) {
  //de_ggbs_sio.doOK();   //done in onclose
  //event.preventDefault(); // Prevent the dialog closing.
//});