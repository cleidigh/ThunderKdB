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
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

//TESTv
//      var { addressbooksSync }=ChromeUtils.import("resource://addressbookssync/addressbookssync.jsm");
//      gComponent = new addressbooksSync();
//TEST^

de_ggbs_abs.gInitDone=false;

de_ggbs_abs.abs_init=function()
{
    var imapselector=document.getElementById("syncimapFolderPopup");
/*
console.log('ABS: filters_ '+imapselector._filters.filing.toString());
    imapselector._filters = {
      imaponly(folder) {
        if (!folder.server.canFileMessagesOnServer)
          return false;
        return ((folder.canFileMessages || folder.hasSubFolders) && folder.server.type=='imap');
      }
    };
*/
/*
    imapselector._filters.imaponly = function imaponly(folder) {
      if (!folder.server.canFileMessagesOnServer)
        return false;
      return ((folder.canFileMessages || folder.hasSubFolders) && folder.server.type=='imap');
    };
*/
//console.log('ABS: filters_ '+imapselector._filters.filing.toString());
//console.log('ABS: filters_ '+imapselector._filters.imaponly.toString());

    var doc;
    if (document.getElementById("synclocal")) doc=document;
    else doc=window.opener.document;  //called from popup

    var prefBranch = Services.prefs.getBranch("extensions.addressbookssync.");

    //check, if there are any IMAP servers
    var accountManager = MailServices.accounts;
    var allServers = accountManager.allServers;
    var haveIMAP=false;
    var count=allServers.length;
    for (var i = 0; i < count; ++i)
    {
      var currentServer = allServers.queryElementAt(i, Components.interfaces.nsIMsgIncomingServer);
      if (currentServer.type == "imap") haveIMAP=true;
      if (haveIMAP) break;
    }
    doc.getElementById('absTabIMAP').disabled=!haveIMAP;

    var syncpassword='';

    var synctype = this.gABS.synctype;
    var localpath = this.gABS.localpath;
    var syncprotocol = this.gABS.protocol;
    var synchost = this.gABS.host;
    var syncuser = this.gABS.user;
    var syncpassword='';
    try{ syncpassword = de_ggbs_abs.get_password(syncprotocol, synchost, syncuser); } catch(e) {}
    syncpassword = syncpassword?'**********':'';
    var syncpath = this.gABS.path;
    var syncimap = this.gABS.imapfolder;
    var syncpolicy = this.gABS.syncpolicy;
    var imappolicy = this.gABS.imapusedraft;
    
    if (synctype=='local') {
      doc.getElementById("synctype").selectedItem=doc.getElementById("synclocal");
      doc.getElementById("absTabs").selectedIndex=0;
      doc.getElementById("absTab").selectedIndex=0;
    } else if (synctype=='remote') {
      doc.getElementById("synctype").selectedItem=doc.getElementById("syncremote");
      doc.getElementById("absTabs").selectedIndex=1;
      doc.getElementById("absTab").selectedIndex=1;
    } else if (synctype=='imap' && haveIMAP) {
      doc.getElementById("synctype").selectedItem=doc.getElementById("syncimap");
      doc.getElementById("absTabs").selectedIndex=2;
      doc.getElementById("absTab").selectedIndex=2;
    } else {  //Nothing (valid) selected
      doc.getElementById("synctype").selectedItem=null;
      doc.getElementById("absTabs").selectedIndex=0;
      doc.getElementById("absTab").selectedIndex=null;
      this.gABS.synctype='none';
    }

    doc.getElementById("localpath").value = localpath;

    doc.getElementById("protocol").value = syncprotocol;
    if (!syncprotocol)
      doc.getElementById("protocol").selectedIndex=-1;
    doc.getElementById("host").value = synchost;
    doc.getElementById("username").value = syncuser;
    doc.getElementById("password").value = syncpassword;
    doc.getElementById("path").value = syncpath;

    this.PickedMsgFolder(syncimap, doc);

    doc.getElementById("autoupload").checked = this.gABS.autoupload;
    doc.getElementById("autodownload").checked = this.gABS.autodownload;
    doc.getElementById("timedupload").checked = this.gABS.timedupload;
    doc.getElementById("timeddownload").checked = this.gABS.timeddownload;
    doc.getElementById("loadtimer").value = this.gABS.loadtimer;

    if (syncpolicy=='entry')
      doc.getElementById("syncpolicy").selectedItem=doc.getElementById("syncpolicyentry")
    else if (syncpolicy=='file')
      doc.getElementById("syncpolicy").selectedItem=doc.getElementById("syncpolicyfile")

    if (imappolicy)
      doc.getElementById("imappolicy").selectedItem=doc.getElementById("imappolicydraft")
    else
      doc.getElementById("imappolicy").selectedItem=doc.getElementById("imappolicyfile")
    doc.getElementById("separateupdown").checked = this.gABS.separateupdown;

    var downloadpolicy=this.gABS.downloadpolicy;
    if (downloadpolicy=='ask')
      doc.getElementById("downloadpolicy").selectedItem=doc.getElementById("downloadpolicyask")
    else if (downloadpolicy=='overwrite')
      doc.getElementById("downloadpolicy").selectedItem=doc.getElementById("downloadpolicyoverwrite")
    else if (downloadpolicy=='keep')
      doc.getElementById("downloadpolicy").selectedItem=doc.getElementById("downloadpolicykeep")

    // list address books
    var mabList = doc.getElementById("MabList");
    var mabList1 = doc.getElementById("MabList1");
    var syncList = doc.getElementById("SyncListCheck");
    //just in case
    mabList.removeAllItems();
    mabList1.removeAllItems();
    while (syncList.firstChild)
      syncList.removeChild(syncList.firstChild);
    doc.getElementById("SyncLiscDesc").style.visibility =
      (this.gABS.separateupdown?'visible':'hidden');

    // get all MAB Files
    var selectedMAB='???.mab';
    var mabDirs=this.gABS.syncedAddressbooks('all','').enumerate();

    while (mabDirs.hasMoreElements()) {
      var mabDir=mabDirs.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
      var prefName = mabDir.dirPrefId;  //ldap_2.servers.xxx
      var description=mabDir.dirName;
      var mabFile=mabDir.fileName;
      mabList.appendItem( description, mabFile, "" );
      mabList1.appendItem( description, mabFile, "" );

      //'Sync'
      var hb=doc.createElement('hbox');
      if (this.gABS.separateupdown) {
        var ncb1=doc.createElement('checkbox');
        ncb1.setAttribute('id', 'addressbookssync_'+prefName+'_up');
        ncb1.setAttribute('label', null);
        hb.appendChild(ncb1);
      }
      var ncb=doc.createElement('checkbox');
      ncb.setAttribute('id', 'addressbookssync_'+prefName);
      hb.appendChild(ncb);
      var l=doc.createElement('label');
      l.setAttribute('value', description);
      l.setAttribute('prefName', prefName);
      l.setAttribute('context', 'de-ggbs-abs-ef');
      hb.appendChild(l);

      syncList.appendChild( hb );

      var sync=false;
      if (!this.gABS.separateupdown) {
        try { sync = prefBranch.getBoolPref( prefName+".down" ); } catch(e) { sync=false; }
        if (sync) {
          ncb.setAttribute('checked', true);
          selectedMAB=this.gABS.externalFilename(mabDir); //description;
        }
      } else {
        try { sync = prefBranch.getBoolPref( prefName+".up" ); } catch(e) { sync=false; }
        if (sync) {
          ncb1.setAttribute('checked', true);
          selectedMAB=this.gABS.externalFilename(mabDir); //description;
        }
        try { sync = prefBranch.getBoolPref( prefName+".down" ); } catch(e) { sync=false; }
        if (sync) {
          ncb.setAttribute('checked', true);
          selectedMAB=this.gABS.externalFilename(mabDir); //description;
        }
      }
    } // for
    mabList.selectedIndex = 0;
    mabList1.selectedIndex = 0;

    var uri = this.getSyncURI(true);
    var q=/\?/.test(uri);
//    uri+=decodeURIComponent(escape(selectedMAB));
    uri+=selectedMAB;
    //if (q) uri+=' (incomplete)';
    doc.getElementById("URI").value = uri;
    if (q) doc.getElementById("URI").style.color='#f44';
    else doc.getElementById("URI").style.color='#000';

    var usepost = this.gABS.usepost;
    doc.getElementById("usepost").checked = usepost;

    doc.getElementById("notimecheck").checked = !this.gABS.checkLastModTime;
    doc.getElementById("hidepopups").checked = this.gABS.hidepopups;
    doc.getElementById("hideallpopups").checked = this.gABS.hideallpopups;
    doc.getElementById("noupload").checked = this.gABS.noupload;

    if (this.gABS.noupload) this.disableUpload();
    de_ggbs_abs.gInitDone=true;

} // init

de_ggbs_abs.enter_externalfilename=function() {
  var dirName=document.popupNode.value;
  var prefName=document.popupNode.getAttribute('prefName');
  var l=document.getElementById("de-ggbs-abs-ef-l");
  l.value=dirName;
  var tb=document.getElementById("de-ggbs-abs-ef-t");
  var dir=this.gABS.getAddressBook(prefName);
  tb.value=this.gABS.externalFilename(dir);
}
de_ggbs_abs.set_externalfilename=function() {
  var prefName=document.popupNode.getAttribute('prefName');
  var tb=document.getElementById("de-ggbs-abs-ef-t");
  var dir=this.gABS.getAddressBook(prefName);
  //decodeURIComponent(escape(
  tb.value=this.gABS.setExternalFilename(dir, tb.value);
  document.getElementById("de-ggbs-abs-ef").hidePopup();
}



de_ggbs_abs.abs_finish=function()
{
    if (!de_ggbs_abs.gInitDone) return;

    var prefBranch = Services.prefs.getBranch("extensions.addressbookssync.");

    if (!document.getElementById("localpath")) return;  // called via toolbar buttons

    var localpath=document.getElementById("localpath").value;
    this.gABS.localpath=localpath;
    if ( document.getElementById("synclocal").selected && localpath) {
      var path = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
      try {
        path.initWithPath( localpath );
        document.getElementById("localpath").style.color='black';
        if (!path.isDirectory()) throw "Not a directory";
      } catch(e) {
        document.getElementById("localpath").style.color='red';
        alert(de_ggbs_abs.gStrings.GetStringFromName('nofile')+': '+localpath);
      }
      if (this.gABS.synctype!='local') {
        this.gABS.forceUpload=true;
        this.gABS.forceDownload=true;
      }
      this.gABS.synctype='local';
    } else if ( document.getElementById("syncremote").selected ) {
      if (this.gABS.synctype!='remote') {
        this.gABS.forceUpload=true;
        this.gABS.forceDownload=true;
      }
      this.gABS.synctype='remote';
    } else if ( document.getElementById("syncimap").selected ) {
      if (this.gABS.synctype!='imap') {
        this.gABS.forceUpload=true;
        this.gABS.forceDownload=true;
      }
      this.gABS.synctype='imap';
    } else {
      this.gABS.synctype='none';
      document.getElementById("synctype").selectedItem=null;
    }

    this.gABS.protocol=document.getElementById("protocol").value;
    var host=document.getElementById("host").value;  this.gABS.host=host;
    var user=document.getElementById("username").value; this.gABS.user=user;
    var pwd=document.getElementById("password").value;
    if (pwd!='**********') this.set_password(this.gABS.protocol, host,user,document.getElementById("password").value );
    this.gABS.path=document.getElementById("path").value;
    this.gABS.imapfolder=document.getElementById("syncimapPicker").getAttribute("uri");
    var v=document.getElementById("autoupload").checked;
    if (!this.gABS.autoupload && v) this.gABS.forceUpload=true;
    this.gABS.autoupload=v;
    v=document.getElementById("autodownload").checked;
    if (!this.gABS.autodownload && v) this.gABS.forceDownload=true;
    this.gABS.autodownload=v;

    this.gABS.timedupload=document.getElementById("timedupload").checked;
    this.gABS.timeddownload=document.getElementById("timeddownload").checked;
    var timer=this.gABS.loadtimer;
    this.gABS.loadtimer=document.getElementById("loadtimer").value;

    if ( document.getElementById("syncpolicyentry").selected)
      this.gABS.syncpolicy='entry';
    else if ( document.getElementById("syncpolicyfile").selected )
      this.gABS.syncpolicy='file';

    if ( document.getElementById("imappolicydraft").selected)
      this.gABS.imapusedraft=true;
    else if ( document.getElementById("imappolicyfile").selected )
      this.gABS.imapusedraft=false;

    if ( document.getElementById("downloadpolicyask").selected)
      this.gABS.downloadpolicy='ask';
    else if ( document.getElementById("downloadpolicyoverwrite").selected )
      this.gABS.downloadpolicy='overwrite';
    else if ( document.getElementById("downloadpolicykeep").selected )
      this.gABS.downloadpolicy='keep';

    var old_separateupdown=this.gABS.separateupdown;
    this.gABS.separateupdown=document.getElementById("separateupdown").checked;

    var selectedMAB='???.mab';
    var mabDirs=this.gABS.syncedAddressbooks('all', '').enumerate();
    while (mabDirs.hasMoreElements()) {
      var mabDir=mabDirs.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
      var description=mabDir.dirName;
      var mabFile=mabDir.fileName;
      var prefName = mabDir.dirPrefId;
      if (!old_separateupdown) {
        var syncElem = document.getElementById('addressbookssync_'+prefName);
        if (!syncElem) continue;  //New addressbook created, while options dialog open!
        if (syncElem.getAttribute('checked')) {
          var cbv;
          try { cbv=prefBranch.getBoolPref(prefName+".down"); } catch(e) { cbv=false; };
          this.gABS.forceUploadOf(mabFile, !cbv);
          prefBranch.setBoolPref( prefName+".down", true );
          prefBranch.setBoolPref( prefName+".up", true );
          selectedMAB=this.gABS.externalFilename(mabDir); //description;
        } else {
          prefBranch.setBoolPref( prefName+".down", false );
          prefBranch.setBoolPref( prefName+".up", false );
          this.gABS.forceUploadOf(mabFile, false);
        }
      } else {  // War separated
        var syncUpElem = document.getElementById('addressbookssync_'+prefName+'_up');
        if (!syncUpElem) continue;  //New addressbook created, while options dialog open!
        var syncDownElem = document.getElementById('addressbookssync_'+prefName);
        if (!this.gABS.separateupdown) {  //jetzt aber nicht mehr!
          if (syncUpElem.getAttribute('checked') || syncDownElem.getAttribute('checked')) {
            // Wenn auch nur einer gechecked war: jetzt beide
            selectedMAB=this.gABS.externalFilename(mabDir); //description;
            this.gABS.forceUploadOf(mabFile, !prefBranch.getBoolPref(prefName+".up"));
            prefBranch.setBoolPref( prefName+".up", true );
            prefBranch.setBoolPref( prefName+".down", true );
          } else {
            this.gABS.forceUploadOf(mabFile, false);
            prefBranch.setBoolPref( prefName+".up", false );
            prefBranch.setBoolPref( prefName+".down", false );
          }
        } else {
          if (syncUpElem.getAttribute('checked')) {
            this.gABS.forceUploadOf(mabFile, !prefBranch.getBoolPref(prefName+".up"));
            prefBranch.setBoolPref( prefName+".up", true );
            selectedMAB=this.gABS.externalFilename(mabDir); //description;
          } else {
            prefBranch.setBoolPref( prefName+".up", false );
            this.gABS.forceUploadOf(mabFile, false);
          }
          if (syncDownElem.getAttribute('checked')) {
            prefBranch.setBoolPref( prefName+".down", true );
            selectedMAB=this.gABS.externalFilename(mabDir); //description;
          } else
            prefBranch.setBoolPref( prefName+".down", false );
        }
      }
    }
    if (typeof selectedMAB=='undefined') selectedMAB='???.mab'; //warum tritt das gelegentlich auf?
    this.syncURI=null; //force recalculation
    var uri = this.getSyncURI(true);
    var q=/\?/.test(uri);
//    uri+=decodeURIComponent(escape(selectedMAB));
    uri+=selectedMAB;
    //if (q) uri+=' (incomplete)';
    document.getElementById("URI").value = uri;
    if (q) document.getElementById("URI").style.color='#f44';
    else document.getElementById("URI").style.color='#000';

    this.gABS.usepost=document.getElementById("usepost").checked;

    this.gABS.checkLastModTime=!document.getElementById("notimecheck").checked;
    this.gABS.hidepopups=document.getElementById("hidepopups").checked;
    this.gABS.hideallpopups=document.getElementById("hideallpopups").checked;
    this.gABS.noupload=document.getElementById("noupload").checked;

    this.pref.savePrefFile(null);  //save to prefs.js

    if (this.gABS.separateupdown!=old_separateupdown) this.abs_init(); // must rebuild!
} // finish



de_ggbs_abs.ChooseFile=function()
{
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

  var x=this.gStrings.GetStringFromName("choosefile");
  filePicker.init(window, x, nsIFilePicker.modeOpen);
  filePicker.appendFilter( this.gStrings.GetStringFromName("mab") + " (*.mab)", "*.mab;" );

//  if( filePicker.show() == nsIFilePicker.returnOK )
  filePicker.open(rv => {
    if (rv != nsIFilePicker.returnOK ) return;
  {
    document.getElementById( "MabFilePath" ).value = filePicker.file.path;
    var mabFileName = filePicker.file.leafName;
    var mabName = mabFileName.substr( 0, mabFileName.lastIndexOf(".") );
    document.getElementById( "MabName" ).value = mabName;
  }
})
} // ChooseFile

de_ggbs_abs.ChoosePath=function()
{
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

  filePicker.init(window, this.gStrings.GetStringFromName("choosesyncdir"), nsIFilePicker.modeGetFolder);

//  if( filePicker.show() == nsIFilePicker.returnOK )
  filePicker.open(rv => {
    if (rv != nsIFilePicker.returnOK ) return;
  {
    document.getElementById( "localpath" ).value = filePicker.file.path;
    document.getElementById( "synctype" ).selectedItem=document.getElementById( "synclocal" );
  }
})
} // ChoosePath

de_ggbs_abs.PickedMsgFolder=function(selection, useDoc) {
  var doc=useDoc?useDoc:document;
  if (typeof selection=="string")
    var selectedUri=selection;
  else {
    if (!selection.id) {                  //TB68b3
Components.utils.reportError("AddressbooksSync: folder-menupopup does not have id's :-(");
      var selectedUri=selection._folder.URI;
    } else {                              //TB68b2
Components.utils.reportError("AddressbooksSync: folder-menupopup does has id's again :-)");
      var selectedUri=selection.id;
    }
  }
  if (!selectedUri) return;

  var picker=doc.getElementById('syncimapPicker');
  var msgfolder;
  var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");
  msgfolder=MailUtils.getExistingFolder(selectedUri, true);
//TODO: if (selectedFolder.server.type != "imap")

  if (!msgfolder)
    return;

  var selectedValue = null;
  var serverName;

  if (msgfolder.isServer)
    selectedValue = msgfolder.name;
  else {
    if (msgfolder.server)
      serverName = msgfolder.server.prettyName;
    else {
     dump("Can't find server for " + uri + "\n");
     serverName = "???";
    }
    var gMessengerBundle=Services.strings.createBundle('chrome://messenger/locale/messenger.properties');
    selectedValue = gMessengerBundle.formatStringFromName("verboseFolderFormat",
        [msgfolder.name, serverName], 2);

  }

  picker.setAttribute("label",selectedValue);
  picker.setAttribute("uri",selectedUri);
}

de_ggbs_abs.SaveMab=function()
{
    var mabFile = document.getElementById( "MabList" ).selectedItem.value;
    var mabName = document.getElementById( "MabList" ).selectedItem.label;

    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var filePicker = Components.classes["@mozilla.org/filepicker;1"].
      createInstance(nsIFilePicker);

    var externMabFileName = mabName + ".mab";
    filePicker.defaultString = externMabFileName;
    filePicker.init(window, this.gStrings.GetStringFromName("choosefiledest"), nsIFilePicker.modeSave);
    filePicker.appendFilter( this.gStrings.GetStringFromName("mab") + " (*.mab)", "*.mab;" );
//    filePicker.appendFilter( 'CSV' + " (*.csv)", "*.csv;" );
//    filePicker.appendFilter( 'LDIF' + " (*.ldif)", "*.ldif;" );

//    if( filePicker.show() != nsIFilePicker.returnCancel) { //Ok or Replace!
    filePicker.open(rv => {
      if (rv == nsIFilePicker.returnCancel ) return;
      var ret;
      switch (filePicker.filterIndex) {
        case 0:
          ret=this.saveMabFile( mabName, mabFile, filePicker.file.parent, filePicker.file.leafName );
          break;
        default:
          ret=false;
          break;
      }
      if (ret)
        alert(this.gStrings.GetStringFromName('stored'));
      else
        alert(this.gStrings.GetStringFromName('storefailed'));
    }
)
} //
de_ggbs_abs.UploadMab=function()
{ //upload single mab from options menu
    var mabFile = document.getElementById( "MabList1" ).selectedItem.value;
    var mabName = document.getElementById( "MabList1" ).selectedItem.label;
    this.gABS.showPopup('upload', mabFile, 'manual', true);
}

de_ggbs_abs.LoadMab=function()
{
  var filename = document.getElementById( "MabFilePath" ).value;
  if (!filename) return;

  var mabName = document.getElementById( "MabName" ).value;
  if (!mabName) return;

  var mabFile='';
  var create;

  var cur=this.gABS.getAddressBook(mabName);
  if (cur) {
    mabFile=cur.fileName;
    if (this.askOverwrite(cur, true)) return;
    create=false;
  } else {
    mabFile = mabName.replace( /\W/g, "_" )+'.mab'; //internal filename should not contain spaces
    create=true;
  }
  var file = Components.classes["@mozilla.org/file/local;1"].
    createInstance(Components.interfaces.nsIFile);
  try{ file.initWithPath( filename ); }
  catch(e) {
    alert(this.gStrings.GetStringFromName('nofile'));
    file=null;
  }
  if (file) {
    var ret;
    if ((ret=this.replaceAddressBook(mabName, mabFile, file))) {
      alert(this.gStrings.GetStringFromName('notcopied')+' '+ret);
      file=null;
    }
  }
  if (file) {
    document.getElementById( "MabFilePath" ).value='';
    document.getElementById( "MabName" ).value='';
    if (create) this.abs_init(); // insert in options list
    else        this.refreshAddressbook();
    alert(this.gStrings.GetStringFromName('loaded'));
  }
}
de_ggbs_abs.DownloadMab=function()
{
  var mabName = document.getElementById( "DownloadMabName" ).value;
  if (!mabName) return;

  var mabFile='';

  var cur=this.gABS.getAddressBook(mabName);
  var create;
  if (cur) {
    mabFile=cur.fileName;
    if (this.askOverwrite(cur, true)) return;
    create=false;
  } else {
dump('---downloading new!\n');
    mabFile = mabName;
    create=true;
  }

//  document.getElementById("UseMabFile").value=mabFile;
//  document.getElementById("MabCreated").setAttribute('checked', create);
  this.gABS.showPopup('download', mabFile, 'manual', true);
//TODO: in download() sollte kein test auf file modification stattfinden

}

document.addEventListener("dialogaccept", function(event) {
  de_ggbs_abs.abs_finish();
  //event.preventDefault(); // Prevent the dialog closing.
});
document.addEventListener("dialogextra1", function(event) {
  de_ggbs_abs.abs_finish();
  //event.preventDefault(); // Prevent the dialog closing.
});

//Services.console.logStringMessage(window.customElements.get('folder-menupopup'));
//see https://html.spec.whatwg.org/multipage/custom-elements.html

//create imapfolder-menupopup as a subclass of folder-menupopup
//  and inject our filter into _filters
//unfortunately, _buildMenuItemWithSubmenu builds submenus with
//  {is: folder-menupopup} instead of the needed {is: imapfolder-menupopup}
//so we clone this function and replace folder-menupopup with
// imapfolder-menupopup
//but _buildMenuItemWithSubmenu in turn calls a (local) generateElement which
//  we cannot clone, so we must duplicate the code
class MozImapFolderMenupopup extends customElements.get("folder-menupopup") {
  connectedCallback() {
    if (this.delayConnectedCallback()) {
      return;
    }

    this.setAttribute("is", "imapfolder-menupopup");
    this._filters = {
      imaponly(folder) {
        if (!folder.server.canFileMessagesOnServer)
          return false;
        return ( (folder.canFileMessages || folder.hasSubFolders)
                    && folder.server.type=='imap');
      }
    };
    var p=
      super._buildMenuItemWithSubmenu.toString().
        replace(/folder-menupopup/,'imapfolder-menupopup').
        replace(/generateElement/g,'this.generateElement');
    var f;
    eval('f=function '+p+'');
  this._buildMenuItemWithSubmenu=f;
  }
  //duplicate of original
  generateElement(tagName, attributes, isObject) {
    const element = document.createXULElement(tagName, isObject);
    element.setAttribute("generated", "true");

    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    return element;
  }
/*
    _buildMenuItemWithSubmenu(attributes, folderSubmenu, folder, submenuAttributes) {
      const [menu, menupopup] = 
        this._savedBuildMenuItemWithSubmenu(attributes, folderSubmenu, folder, submenuAttributes);
console.log('ABS: parent called');
      menupopup.setAttribute('is', 'imapfolder-menupopup'); //too late!
      return [menu, menupopup];
    }
*/
/*
    _buildMenuItemWithSubmenu(attributes, folderSubmenu, folder, submenuAttributes) {
      const menu = this.generateElement("menu", attributes);
      menu.classList.add("folderMenuItem", "menu-iconic");

      const isObject = folderSubmenu ? { "is": "imapfolder-menupopup" } : null;

      const menupopup = this.generateElement("menupopup", submenuAttributes, isObject);

      if (folder) {
        menu._folder = folder;
        menupopup._parentFolder = folder;
      }

      if (!menupopup.childWrapper) {
        menupopup.childWrapper = menupopup;
      }

      menu.appendChild(menupopup);

      return [menu, menupopup];
    }
*/
}
customElements.define("imapfolder-menupopup", MozImapFolderMenupopup, { extends: "menupopup" });

/*
MozFolderMenuPopup._filters = {
  imaponly(folder) {
    if (!folder.server.canFileMessagesOnServer)
      return false;
    return ((folder.canFileMessages || folder.hasSubFolders) && folder.server.type=='imap');
  }
};
*/
/*
var p=window.customElements.get("folder-menupopup");    // a function
p=p.toString().replace(/filing/,'imaponly');
console.log('ABS: '+typeof p+' '+p);
console.log('ABS: filters_ '+p._filters.filing.toString());
    p._filters = {
      imaponly(folder) {
        if (!folder.server.canFileMessagesOnServer)
          return false;
        return ((folder.canFileMessages || folder.hasSubFolders) && folder.server.type=='imap');
      }
    };
//  customElements.define("folder-menupopup", MozFolderMenuPopup, { extends: "menupopup" });
*/

/*
document.addEventListener("DOMContentLoaded", () => {
//window.addEventListener("load", () => {
  var imapselector=document.getElementById("syncimapFolderPopup");
//  imapselector.addEventListener("popupshowing", (event) => {
//console.log('ABS: popupshowing');
//    }, true);
console.log('ABS: filters_ '+imapselector._filters.filing.toString());
  imapselector._filters["imaponly"] = function imaponly(folder) {
console.log('ABS: filters_ in imaponly');
      if (!folder.server.canFileMessagesOnServer)
        return false;
      return ((folder.canFileMessages || folder.hasSubFolders) && folder.server.type=='imap');
  };
}, true);
*/
