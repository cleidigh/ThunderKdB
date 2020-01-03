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

de_ggbs_abs.console = Services.console;
de_ggbs_abs.prompter = Services.prompt;

de_ggbs_abs.gStatusbar=null;
de_ggbs_abs.gLifeTime=0;//in seconds.
de_ggbs_abs.cleanUp=null;
de_ggbs_abs.gAbort=0;
de_ggbs_abs.gForce=false;
de_ggbs_abs.gMabs=null;

  // from "chrome://messenger/content/addressbook/abCommon.js"
de_ggbs_abs.kPersonalAddressbookURI = "moz-abmdbdirectory://abook.mab";
de_ggbs_abs.kCollectedAddressbookURI = "moz-abmdbdirectory://history.mab";

/*
var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
    .getService(Components.interfaces.nsIRDFService);
var directory = rdf.GetResource("moz-abdirectory://")
    .QueryInterface(Components.interfaces.nsIAbDirectory);
*/



/*
 *  copy a mab file to another location
 */
de_ggbs_abs.saveMabFile=function(mabName, mabFile, directory, filename)
{
    var localMabFile = de_ggbs_abs.gABS.getDir('ProfD');
    localMabFile.appendRelativePath( mabFile );

    try {
      var file = Components.classes["@mozilla.org/file/local;1"].
        createInstance(Components.interfaces.nsIFile);
      file.initWithFile( directory );
      file.appendRelativePath( filename );
//TODO: eventuell umbenennen statt löschen
      if (file.exists() && file.isFile()) { file.remove(false); }
      localMabFile.copyTo( directory, filename );
        //creates directory, if not existing! retains lastModifiedTime !
        //But file creation time is that of the just deleted file!
    } catch(e) {
      de_ggbs_abs.gABS.dump('AddressbooksSynchronizer@saveMabFile:\n'+e, true);
      return false;
    }
    return true;
} //

de_ggbs_abs.replaceAddressBook=function(mabName, mabFile, file) {

  if (!mabFile) {
   var err='Internal error: empty filename for addressbook "'+mabName+'"';
   alert(err);
   return err;
  }

  var ret;
  var syncpolicy = de_ggbs_abs.gABS.syncpolicy;
  var dir=de_ggbs_abs.gABS.getAddressBook(mabFile);
  if (!dir) { // must be via file!
de_ggbs_abs.gABS.dump('ABS-replaceAddressBook: no addressbook exists for file '+mabFile+'!');
    ret=de_ggbs_abs.replaceAddressBook_viaFile(mabName, mabFile, file);
  } else if (syncpolicy=='entry') {
    ret=de_ggbs_abs.replaceAddressBook_viaEntry(mabName, mabFile, file);
  } else {
    var uri=dir.URI;
    if (uri==de_ggbs_abs.kPersonalAddressbookURI || uri==de_ggbs_abs.kCollectedAddressbookURI) {
      ret=de_ggbs_abs.replaceAddressBook_viaEntry(mabName, mabFile, file);
    } else {
      ret=de_ggbs_abs.replaceAddressBook_viaFile(mabName, mabFile, file);
    }
  }
  return ret;
}

de_ggbs_abs.replaceAddressBook_viaFile=function(mabName, mabFile, file)
{
  var dir=de_ggbs_abs.gABS.getAddressBook(mabFile);
  if (dir) {
    de_ggbs_abs.gABS.deleteAddressBook(dir);
//de_ggbs_abs.gABS.dump(mabName+' deleted');
  }

  //  copy the (temp) file in place
  var nsIMabFile = de_ggbs_abs.gABS.getDir('ProfD');
  var path=nsIMabFile.path;
//obs  nsIMabFile.appendRelativePath( mabFile );
  nsIMabFile.appendRelativePath( mabFile+'.new' );   //obs
  if (nsIMabFile.path==path) {
   var err='Internal error: error creating path to addressbook "'+mabName+'" with filename "'+mabFile+'"';
   alert(err);
   return err;
  }
  if (nsIMabFile.exists() && nsIMabFile.isFile())
    try { nsIMabFile.remove(false); }
    catch(e) { return 'ABS: could not remove tempfile:'+e.message; }
  try {
//obs    file.copyTo( de_ggbs_abs.gABS.getDir('ProfD'), mabFile );
    file.copyTo( de_ggbs_abs.gABS.getDir('ProfD'), mabFile+'.new' );   //obs
  } catch(e) { return 'ABS: copy data to '+mabFile+' failed:'+e.message; }
  nsIMabFile.permissions=/*0666*/0x1b6;
  try {
    nsIMabFile.moveTo(null, mabFile);
  } catch(e) { return 'ABS: '+nsiMabFile.path+' moveTo "'+mabFile+'" failed: '+e.message; }

//de_ggbs_abs.gABS.dump(file.path+' copied to '+mabFile);
  de_ggbs_abs.statustxt('.',0, false);

  var newDir=de_ggbs_abs.gABS.createAddressBook( mabName, mabFile );
  de_ggbs_abs.statustxt('.',0, false);
de_ggbs_abs.gABS.dump(mabName+' created');
  return '';
}

/*
 * replace content of an address book with given data
 */
de_ggbs_abs.replaceAddressBook_viaEntry=function(mabName, mabFile, file)
{
de_ggbs_abs.gABS.dump('---replaceAddressBook_viaEntry');
  var dir=de_ggbs_abs.gABS.getAddressBook(mabFile);  //dir=nsIAbDirectory
  if (!dir) return 'failed to find addressbook';
//  de_ggbs_abs.statustxt("+", 0, false, null); //

  de_ggbs_abs.gABS.removeListener();

de_ggbs_abs.gABS.dump('clear addressbook');
//de_ggbs_abs.gABS.dumpDir(dir, 'At Start:');
  var ret=de_ggbs_abs.gABS.clearAddressBook(dir);
  if (ret) return ret;
//  de_ggbs_abs.statustxt("+", 0, false, null); //

de_ggbs_abs.gABS.dump('fill addressbook');
  ret=de_ggbs_abs.gABS.fillAddressBook(dir, file);
  if (ret) return ret;

de_ggbs_abs.gABS.dump('---Replace done');

  dir.lastModifiedDate=de_ggbs_abs.gABS.appstarttime; //set to 'not modified'
  de_ggbs_abs.gABS.addListener();
  return '';
}

de_ggbs_abs.getLastModified=function(dir) {  //dir=nsIAbDirectory
  if (!dir) return 0;

  var lastModifiedDate=dir.lastModifiedDate;  //set via abs_gAbSessionListener
de_ggbs_abs.gABS.dump('last modified date of dir '+dir.dirName+': '+lastModifiedDate);
/* check cards for lastModifiedlime is
 * no longer necessary, since lastModifiedDate always set on dir via Listener
*/
  return lastModifiedDate;
}

/*
 * return URI for remote syncronization
 */
de_ggbs_abs.syncURI=null;
de_ggbs_abs.getSyncURI=function(masked)
{
  if (de_ggbs_abs.syncURI) return de_ggbs_abs.syncURI; 
  var syncprotocol = de_ggbs_abs.gABS.protocol;
  var synchost = de_ggbs_abs.gABS.host;
  var syncuser = de_ggbs_abs.gABS.user;
  var syncpath = de_ggbs_abs.gABS.path;

  var syncpassword='';
  try{ syncpassword = de_ggbs_abs.get_password(syncprotocol, synchost, syncuser); } catch(e) {}
  if (syncpassword && masked) syncpassword='**********';

  if(!synchost) {
    if (masked) synchost='host???';
    else return '';
  }
  if(!syncprotocol && masked) syncprotocol='???';
  var userpass='';
  if (syncuser) {
    var userpass=masked
        ?syncuser+(syncpassword?":"+syncpassword:'')
        :encodeURIComponent(syncuser) +(syncpassword?":"+encodeURIComponent(syncpassword):"");
    if(userpass)
      userpass += "@";
  }
  var uri=syncprotocol + "://" + userpass + synchost + syncpath+'/';

  de_ggbs_abs.syncURI=uri;
  return uri;
}

de_ggbs_abs.deleteTempFile=function(filename) {
  var nsITmpFile=de_ggbs_abs.gABS.getDir('TmpD');
  nsITmpFile.appendRelativePath(filename);
  if (!nsITmpFile.exists() || !nsITmpFile.isFile()) return true;
  var deleted=false;
  try { nsITmpFile.remove(false) }
  catch(e) {
    switch (e.result) {
      case Components.results.NS_ERROR_FILE_ACCESS_DENIED:
    //  after call to replaceAddressBook, an immediate remove
    //  throws an 'access denied'
//        setTimeout(de_ggbs_abs.deleteTempFile, 1000, filename, count);
        break;
      case Components.results.NS_ERROR_FILE_NOT_FOUND:
        deleted=true;
        break;
      default:
        alert('deleteTempFile: '+e.message);
        deleted=true; // not really
        break;
    }
    return deleted;
  }
  return true;
}

/*
de_ggbs_abs.getTimeStamp=function()
{
    var date = new Date();
    return Math.floor( date.getTime() / 1000 );

} // getTimeStamp
*/

de_ggbs_abs.timeString=function(time) { //time in milliseconds or Date() object
  if (typeof time=="object") time=time.getTime();
//  var d=time?new Date(time):new Date();
  //var s=d.toLocaleString();
  //var s=d.toLocaleFormat('%d.%b.%Y %H:%M:%S');  //deprecated
  var options = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  };
  var s='unknown';
  try {
    s=new Intl.DateTimeFormat('de-DE', options).format(time);
  } catch(e) {  }
  return s;
}

de_ggbs_abs.errorstr=function(aError)
{
  var error;

  var intErr=0;
  if (typeof aError == 'string') {
    var err=Number(aError);
    if (!isNaN(err)) aError=err;
  }
  //Errorcodes:
  //    xpcom/base/nsError.h
  //    netwerk/base/public/nsNetError.h
  switch(aError){
  // internal errors
    case -1:
      intErr=1;
      error=de_ggbs_abs.gStrings.GetStringFromName('unexperr'); // 'unexpected initialization error';
      break;
    case -2:
      intErr=2;
      error=de_ggbs_abs.gStrings.GetStringFromName('localreaderr'); // 'local mab file read error';  //access denied (also gives unhandled exception), does not exist
      break;
    case -3:
      intErr=3;
      error=de_ggbs_abs.gStrings.GetStringFromName('illimap');
      break;
  //Thunderbird network error, see netwerk/base/public/nsNetError.h
    case 0x804b000d:
      //NS_ERROR_CONNECTION_REFUSED 13
      //The connection attempt failed, for example, because no server was listening
      //at specified host:port.
      intErr=4;
      error=de_ggbs_abs.gStrings.GetStringFromName('protnotavail'); // 'protocol not available';
      break;
    case 0x804b000e:
        //NS_ERROR_NET_TIMEOUT 14
        //The connection was lost due to a timeout error.
      intErr=12;
      error=de_ggbs_abs.gStrings.GetStringFromName('timeout'); // 'timeout';
      break;
    case 0x804b0011:
      //NS_ERROR_NO_CONTENT 17
      intErr=16;
      error='No content';
        // used, when Firefox is set as 'network.protocol-handler.app.ftp'
        // for FTP. The addressbook is shown in Firefox!
      break;
    case 0x804b0012:
      //NS_ERROR_UNKNOWN_PROTOCOL 18
      // The URI scheme corresponds to an unknown protocol handler.
      intErr=17;
      error='Unknown protocol handler';
      // happens after removing application-handler after NS_ERROR_NO_CONTENT
      break;
    case 0x804b0015:
      //NS_ERROR_FTP_LOGIN 21
      intErr=10;
      error=de_ggbs_abs.gStrings.GetStringFromName('illcred'); // illegal credentials';
      break;
    case 0x804b0016:
      //NS_ERROR_FTP_CWD 22
      intErr=15;
      error=de_ggbs_abs.gStrings.GetStringFromName('nofile');
      break;
//NS_ERROR_FTP_PASV 23
//NS_ERROR_FTP_PWD 24
//NS_ERROR_FTP_LIST 25
    case 0x804b001e:
      //NS_ERROR_UNKNOWN_HOST 30
      intErr=5;
      error=de_ggbs_abs.gStrings.GetStringFromName('hostnotfound'); // 'host not found';
      break;
    case 0x804b002a:
      //NS_ERROR_UNKNOWN_PROXY_HOST 42
      intErr=13;
      error=de_ggbs_abs.gStrings.GetStringFromName('proxynotfound'); // 'proxy not found';
      break;
    case 0x804b0048:
      //NS_ERROR_PROXY_CONNECTION_REFUSED 72
      intErr=14;
      error=de_ggbs_abs.gStrings.GetStringFromName('proxyerr'); // 'proxy error';
      break;
  //external errors (server error, windows error)
    case 0x80004002:
      /* NS_ERROR_NO_INTERFACE: Returned when a given interface is not supported. */
      intErr=18;
      error='External application handler set';
        //This happens on ftp upload when an external handler is set
      break;
    case 0x80004005:
      /* NS_ERROR_FAILURE: Returned when a function fails */
      intErr=6;
      error=de_ggbs_abs.gStrings.GetStringFromName('permdenied'); // früher 'fileunavail', file unavailable
        //??? (with FTP: Error 550: File unavailable (e.g., file not found, no access).
        //(with IMAP: wenn der alte Upload mit 'CopyFileMessage' verwendet wird)
      break;
    case 405:
      intErr=7;
      error=de_ggbs_abs.gStrings.GetStringFromName('methodnotallowed'); // method not allowed';  //method is something like PUT,POST or GET
      break;
    case 404:
      intErr=8;
      error=de_ggbs_abs.gStrings.GetStringFromName('notfound'); // not found';
      break;
    case 403:
      intErr=9;
      error=de_ggbs_abs.gStrings.GetStringFromName('permdenied'); // permission denied';
      break;
    case 401:
      intErr=11;
      error=de_ggbs_abs.gStrings.GetStringFromName('illcred'); // illegal credentials';
      break;
    case 0:
    case 201:
    case 204:
      error=de_ggbs_abs.gStrings.GetStringFromName('ok');
      break;
    default:
      var sError;
      if (aError&0xffff0000) {
        if ((aError>>>16)==0x804b)  //TB Netzwerk errors, see netwerk/base/public/nsNetError.h
          sError='TB-'+(aError&0xffff).toString(10);
        else
          sError='0x'+aError.toString(16);
      } else
        sError=aError;
      error='Error '+sError;
      break;
  }
//  throws 'no memory' exception
//  var errorService = Components.classes["@mozilla.org/xpcom/error-service;1"].
//            getService(Components.interfaces.nsIErrorService);
//  error+=' ('+errorService.getErrorStringBundleKey(aError)+')';
  if (intErr) error+=' ('+intErr+')';
  return error;
}

de_ggbs_abs.lastnewline=0;
de_ggbs_abs.statustxt=function(aStatus, newline, doalert, longText, addText)
  //newline: 1: start a new line, 2: end a line, 3:both, 0: append to line
  //          -1: Start of new sequence, -2 End of sequence
{
  if (doalert) de_ggbs_abs.gLifeTime=5; //show window a little bit longer
                            //this should really be done somehwere else ;-)

  if (newline==-2 && de_ggbs_abs.lastnewline==-2) return;

  var now; var appStart;
  if (newline==-1) {
    now = de_ggbs_abs.timeString();
    appStart = de_ggbs_abs.timeString(de_ggbs_abs.gABS.appstarttime*1000);
    appStart = 'Thunderbird start '+appStart;
    de_ggbs_abs.gABS.statusText=null;
    de_ggbs_abs.gABS.statusText=now+'\n';
    de_ggbs_abs.gABS.statusText=appStart+'\n';
  }
  de_ggbs_abs.gABS.statusText=longText?longText:aStatus;
  if (addText) de_ggbs_abs.gABS.statusText=' ('+addText+') ';
  if (newline&2 || newline<0) de_ggbs_abs.gABS.statusText="\n";

  // popup menu
  if (de_ggbs_abs.gABS.usesPopup) {   //false, if upload on TB exiting
    var status=document.getElementById("status");
    if (status) {
      if (newline==-1) status.value=(longText?longText:aStatus)+'\n';
      else if (newline==-2) status.value+=(longText?longText:aStatus)+'\n';
      else if (newline>=0) {
        status.value+=(longText?longText:aStatus);
        if (newline&2) status.value += "\n";
//        status.inputField.scrollTop=status.inputField.scrollHeight;
        status.scrollTop=status.scrollHeight;
      }
    }
  }

  //status bar
  if (!de_ggbs_abs.gStatusbar) {
    var w=window;
    try { // will fail on onUnload
      while (w && w.location!='chrome://messenger/content/messenger.xul') w=w.opener;
    } catch(e) { w=null; }
//  var maindoc = window.location!=?window.opener.document:document;
//alert(maindoc.location);
//  if (maindoc && maindoc.location=='chrome://messenger/content/options.xul') maindoc=maindoc.opener.document;
    if (w)
      de_ggbs_abs.gStatusbar=w.document.getElementById("statusText");
  }
  if (de_ggbs_abs.gStatusbar) {  //at onUnload gibts das nicht mehr!
    if (newline==-1) de_ggbs_abs.gStatusbar.label=aStatus+'  ';
    if (newline==-2) de_ggbs_abs.gStatusbar.label+='  '+aStatus;
    if (newline>=0) {
      de_ggbs_abs.gStatusbar.label+=aStatus;
      if (newline&2) de_ggbs_abs.gStatusbar.label+='  ';
    }
  }

  aStatus=longText?longText:aStatus;
  if (addText) aStatus+=' ('+addText+') ';

  if (newline==-2)
    de_ggbs_abs.gABS.dump('AddressbooksSynchronizer '+de_ggbs_abs.gABS.version+': '+
              de_ggbs_abs.gABS.statusText, true);

//////////////
  if (de_ggbs_abs.gABS.exiting && newline==-2) {
de_ggbs_abs.gABS.dump('statustxt exiting write to log');
    var fline='AddressbooksSynchronizer '+de_ggbs_abs.gABS.version+': '+de_ggbs_abs.gABS.statusText;
    var flags=0x10|0x08|0x02;
          // 0x02=PR_WRONLY, 0x10=PR_APPEND, 0x08=PR_CREATE_FILE
    try {
      var logFile = de_ggbs_abs.gABS.getDir('TmpD');
      logFile.appendRelativePath( 'AddressbookSynchronizer.log' );
      var strm = Components.classes["@mozilla.org/network/file-output-stream;1"].
        createInstance(Components.interfaces.nsIFileOutputStream);
      strm.QueryInterface(Components.interfaces.nsIOutputStream);
      strm.QueryInterface(Components.interfaces.nsISeekableStream);
      strm.init( logFile, flags, /*0600*/0x180, 0 );
      strm.write( fline, fline.length );
      strm.flush();
      strm.close();
    } catch(e) {
        de_ggbs_abs.gABS.dump('AddressbooksSynchronizer: '+'File write:\n'+e, true);
    }
  }
////////////

  de_ggbs_abs.lastnewline=newline;
  if (doalert)
    alert(de_ggbs_abs.gABS.statusText);
}

de_ggbs_abs.refreshAddressbook=function(what) {
  // refresh addressbook view
  var windowsEnum = Services.wm.getEnumerator("mail:addressbook");
  while (windowsEnum.hasMoreElements()) {
de_ggbs_abs.gABS.dump('refreshAddressbook: Found Addressbook Window');
    var w=windowsEnum.getNext();
    var abTree=w.document.getElementById("dirTree");
    if (abTree) { //isn't there a better way?
      try {
        var oi=abTree.view.selection.currentIndex;
        var ni=oi?oi-1:abTree.view.rowCount-1;
        //from abCommon.js
        abTree.view.selection.select(ni); //might throw TypeError, if addressbook is open
        w.ChangeDirectoryByURI(w.GetSelectedDirectory());
        w.gAbResultsTree.focus();
        abTree.view.selection.select(oi);
        w.ChangeDirectoryByURI(w.GetSelectedDirectory());
        w.gAbResultsTree.focus();
      } catch(e) {de_ggbs_abs.gABS.dump('refreshAddressbook '+e);}
    } else {
de_ggbs_abs.gABS.dump('refreshAddressbook: no abTree');
    }
  }
}

de_ggbs_abs.uploadNow=function(force)
{//called via button click, not via automatic upload at end
  if (this.gABS.synctype!='none')
    this.gABS.showPopup('upload', null, 'manual', force);
}

de_ggbs_abs.downloadNow=function(force)
{//called via button click, not via automatic download at start
  if (this.gABS.synctype!='none')
    this.gABS.showPopup('download', null, 'manual', force);
}

de_ggbs_abs.uploadThis=function()
{ //called via context menu
  if (this.gABS.synctype!='none') {
    var abDir=GetSelectedDirectory(); //the URI
    var dir = GetDirectoryFromURI(abDir);
    this.gABS.showPopup('upload', dir.fileName, 'manual', true);
//    else  // also checked via init.js
//alert('upload in progress');
  }
}

de_ggbs_abs.downloadThis=function()
{ //called via context menu
  if (this.gABS.synctype!='none') {
    var abDir=GetSelectedDirectory(); //the URI
    var dir = GetDirectoryFromURI(abDir);
    this.gABS.showPopup('download', dir.fileName, 'manual', true);
//    else  // also checked via init.js
//alert('download in progress');

  }
}


de_ggbs_abs.showOptions=function()
{
  var options = Services.wm.getMostRecentWindow("de-ggbs-abs-options");
  if (options)  //a ChromeWindow
    options.focus();
  else
    window.open("chrome://addressbookssync/content/options.xul","_blank","chrome,resizable,titlebar=yes");
}

de_ggbs_abs.checkOffline=function(synctype) {
  var ioService=Services.io;
  if (ioService.offline) {
    var promptService = Services.prompt;
//    if (!de_ggbs_abs.gStrings)
//      de_ggbs_abs.gStrings = Services.strings.createBundle('chrome://addressbookssync/locale/addressbookssync.properties');

    var msg=de_ggbs_abs.gStrings.GetStringFromName('goonline');
    var goOnline =  promptService.confirm(null/*window*/, 
        'AddressbooksSynchronizer', msg);
    if (goOnline) {
      var offlineManager = Components.classes["@mozilla.org/messenger/offline-manager;1"]                 
                        .getService(Components.interfaces.nsIMsgOfflineManager);
      offlineManager.goOnline(false /* sendUnsentMessages */,
                              false /* playbackOfflineImapOperations */,
                              null/*w.msgWindow*/);
    } else {
      de_ggbs_abs.gAbort=2;
      de_ggbs_abs.killMe();
      return false;
    }
  }
  return true;
}

de_ggbs_abs.killMe=function()
{
  //de_ggbs_abs.gAbort=0: normales ende
  //de_ggbs_abs.gAbort=1: aborted
  //de_ggbs_abs.gAbort=2: killed
//de_ggbs_abs.gABS.dump('killMe '+de_ggbs_abs.gAbort+' '+(de_ggbs_abs.cleanUp));

  if (/*de_ggbs_abs.gAbort<2 && */ de_ggbs_abs.cleanUp) {
    de_ggbs_abs.cleanUp();
    de_ggbs_abs.cleanUp=null;
  }
  if (de_ggbs_abs.gTempName && !de_ggbs_abs.gAbort) {
    if (!de_ggbs_abs.deleteTempFile(de_ggbs_abs.gTempName)) {
      setTimeout(de_ggbs_abs.killMe,1000);
      return;
    } else {
      de_ggbs_abs.gTempName='';
    }
  }

  if (de_ggbs_abs.gAbort==1)
    // this does not fire on unexpected errors, since
    // killMe is probably not called from processing loop
    de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('aborted'), -2, false);
  else if (!de_ggbs_abs.gABS.state) //kommt sonst bei imap 2x (wenn compacting asynchron)
    de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('ok'), -2, false);

  de_ggbs_abs.gABS.state=''; //Up-/Download ready

//  if(de_ggbs_abs.gLifeTime>0 && de_ggbs_abs.gABS.usesPopup && de_ggbs_abs.gAbort<2) {
  if(de_ggbs_abs.gLifeTime>0 && de_ggbs_abs.gAbort<2) {
    setTimeout(de_ggbs_abs.killMe,de_ggbs_abs.gLifeTime*1000);
    de_ggbs_abs.gLifeTime=0;
    return;
  }

/* löschen der Statuszeile eventuell timer gesteuert! */
  if (de_ggbs_abs.gStatusbar) {  //at onUnload gibts das nicht mehr!
    de_ggbs_abs.gStatusbar.label='';
  }

  if (de_ggbs_abs.gABS.pendingupload) {
//    de_ggbs_abs.gABS.pendingupload=false;
    de_ggbs_abs.gABS.showPopup('upload', null, 'auto', false);
  }

//    alert(de_ggbs_abs.gABS.statusText);
//if (de_ggbs_abs.gAbort==2)  //test
  if (de_ggbs_abs.gABS.usesPopup) setTimeout(close,0);
}

de_ggbs_abs.disableUpload=function() {
  //Toolbar button in 3Pane window and(!) addressbook window
  var id=document.getElementById('de_ggbs_abs.UploadIcon');
  if (id) id.style.display='none';
  //Context menuitem in addressbook
  id=document.getElementById('de_ggbs_abs.ContextUpload');
  if (id) id.style.display='none';
  //Menuitems in addressbook
  id=document.getElementById('de_ggbs_abs.TaskUploads');
  if (id) id.style.display='none';
  id=document.getElementById('de_ggbs_abs.TaskUpload');
  if (id) id.style.display='none';
  //Upload now button in Options
  id=document.getElementById('autouploadnow');
  if (id) id.style.display='none';
  //checkbox 'Automatic upload'
  id=document.getElementById('autoupload');
  if (id) id.style.display='none';
  //checkbox 'Timed upload'
  id=document.getElementById('timedupload');
  if (id) id.style.display='none';
  //export
  id=document.getElementById('export');
  if (id) id.style.display='none';
  //checkbox for seperate Up-/download disablen
  id=document.getElementById('separateupdown');
  if (id) id.style.display='none';
  //Strategy for IMAP Upload disablen
  id=document.getElementById('imappolicy');
  if (id) id.style.display='none';
  //...
}

de_ggbs_abs.askOverwrite=function(cur, alwaysask) {
  var dummy=new Object;
  var b=Services.prefs.getBranch(cur.dirPrefId+'.');
  try { var description = decodeURIComponent(escape(b.getCharPref( 'description' ))); }
  catch(e) { description=cur.dirPrefId; }
  if (alwaysask) {
    return de_ggbs_abs.prompter.confirmEx(window, 'Load '+description,
        de_ggbs_abs.gStrings.GetStringFromName('mab')+' "'+description+'":\n'+de_ggbs_abs.gStrings.GetStringFromName('askoverwrite'),
//          (BUTTON_POS_0) * (BUTTON_TITLE_YES) + (BUTTON_POS_1) * (BUTTON_TITLE_NO) + BUTTON_POS_0_DEFAULT
            (1)            * (3)                + (256)          * (4)               + 0,
            null, null, null, null, dummy
        )
  }
  if (de_ggbs_abs.gABS.appstarttime<de_ggbs_abs.getLastModified(cur) &&
      (de_ggbs_abs.gABS.downloadpolicy=='keep' ||
            de_ggbs_abs.gABS.downloadpolicy=='ask' &&
            de_ggbs_abs.prompter.confirmEx(window, 'Download '+description,
                de_ggbs_abs.gStrings.GetStringFromName('mab')+' "'+description+'":\n'+de_ggbs_abs.gStrings.GetStringFromName('askmodified'),
//                  (BUTTON_POS_0) * (BUTTON_TITLE_YES) + (BUTTON_POS_1) * (BUTTON_TITLE_NO) + BUTTON_POS_0_DEFAULT
                    (1)            * (3)                + (256)          * (4)               + 0,
                    null, null, null, null, dummy
                )
          )) {
    return false; //skip
  } else
    return true;  //overwrite
}

de_ggbs_abs.get_password=function(protocol, host, user){
  if (!user) return "";
  var hostname = protocol+'://'+host;
  var httprealm = 'AddressbooksSynchronizer';

  try {
    var loginManager = Services.logins;
    var logins = loginManager.findLogins(hostname, null, httprealm);
    for (var i = 0; i < logins.length; i++) {
      if (logins[i].username == user) {
        return logins[i].password;
      }
    }
  } catch(e) {de_ggbs_abs.gABS.dump(e, true); }
  return "";
}

de_ggbs_abs.set_password=function(protocol, host, user, pwd){
  if (!user) return;
  var hostname = protocol+'://'+host;
  var httprealm = 'AddressbooksSynchronizer';

  try {
    var loginManager = Services.logins;

    var logins = loginManager.findLogins(hostname, null, httprealm);
    for (var i = 0; i < logins.length; i++) {
      if (logins[i].username == user) {
        loginManager.removeLogin(logins[i]);
      }
    }
    if (pwd) {
      var loginInfo = Components.classes["@mozilla.org/login-manager/loginInfo;1"]
                   .createInstance(Components.interfaces.nsILoginInfo);
      loginInfo.init(hostname, null, httprealm, user, pwd, "", "");
      loginManager.addLogin(loginInfo);
    }
  }
  catch(e) { alert(e); de_ggbs_abs.gABS.dump(e,true); }
}

/*
 *  Debug only
 */
/*
de_ggbs_abs.dumpDir=function(dir, text) {
  if (!de_ggbs_abs.gABS.dodebug) return;
  de_ggbs_abs.gABS.dump(text);
  var lists=dir.childNodes;
  var count=0;
  while( lists.hasMoreElements() ) {
    var list = lists.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
    count++;
    de_ggbs_abs.gABS.dump('  listDir '+list.dirName+' '+list.URI);
  }
  lists=null;
  if (!count) de_ggbs_abs.gABS.dump('  No listDir');

  count=0;
  try {
    var cardsE=dir.childCards;
    var cards=0;
    // cardsE is a nsISimpleEnumerator
    while( cardsE.hasMoreElements() ) {
      var card=cardsE.getNext();
      if (card.isMailList) {
        de_ggbs_abs.gABS.dump('  listCard '+card.mailListURI);
        count++;
      } else
        cards++;
    }
    if (!count) de_ggbs_abs.gABS.dump('  No listCards');
    de_ggbs_abs.gABS.dump('  # normal cards '+cards);
  } catch(e) { de_ggbs_abs.gABS.dump(' childCards throws exception'); }  //when called with temp
}
*/