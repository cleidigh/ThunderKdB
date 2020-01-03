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

de_ggbs_abs.gSingleBook=null;
de_ggbs_abs.gMabFile=null;
de_ggbs_abs.gMabName=null;

de_ggbs_abs.externalApp=null;
de_ggbs_abs.externalAppHandler=null;

de_ggbs_abs.downloadDone=function() {
  if (de_ggbs_abs.gSingleBook) alert(de_ggbs_abs.gStrings.GetStringFromName('loaded'));
  de_ggbs_abs.refreshAddressbook();

  var w=null;
  if (!de_ggbs_abs.abs_init)
    w=Services.wm.getMostRecentWindow("de-ggbs-abs-options");
  else
    w=window;
  if (w) w.de_ggbs_abs.abs_init(); // update options list, if necessary

}
de_ggbs_abs.remoteDownloadDone=function() {
  if (!de_ggbs_abs.gABS.noexternalappset) {
  //alert('app='+de_ggbs_abs.externalApp+' handler='+de_ggbs_abs.externalAppHandler);
    if (de_ggbs_abs.externalApp) {
      var syncprotocol = de_ggbs_abs.gABS.protocol;
      if (de_ggbs_abs.externalApp==-1)
        de_ggbs_abs.pref.clearUserPref("network.protocol-handler.external."+syncprotocol);
      else
        de_ggbs_abs.pref.setBoolPref("network.protocol-handler.external."+syncprotocol, true);
    }
    if (de_ggbs_abs.externalAppHandler)
      de_ggbs_abs.pref.setCharPref("network.protocol-handler.app."+syncprotocol, de_ggbs_abs.externalAppHandler);
    de_ggbs_abs.externalApp=null;
    de_ggbs_abs.externalAppHandler=null;
  }
  de_ggbs_abs.downloadDone();
}
de_ggbs_abs.localDownloadDone=function() {
  de_ggbs_abs.downloadDone();
}

//TODO: welche Addressbücher sind auf dem Server zu finden!?
de_ggbs_abs.download=function(singleBook, force)
{
//de_ggbs_abs.gABS.dump('in download appstart='+de_ggbs_abs.gABS.appstarttime+' state='+de_ggbs_abs.gABS.state+'\n');
  if (typeof(force) == 'object') {  //called via openWindow()
    singleBook=singleBook.data;
    force=force.data=='true';
  } else if (typeof(force) == 'string') { //called via openWindow()
    force=force=='true';
  }
  de_ggbs_abs.gLifeTime=3;
  de_ggbs_abs.gForce=force||de_ggbs_abs.gABS.forceDownload;
    de_ggbs_abs.gABS.forceDownload=false;
  var synctype=de_ggbs_abs.gABS.synctype;

  if (de_ggbs_abs.gABS.usesPopup) {
//    window.moveTo(0,0);
      //v could be removed in next version!
        var dialogElement = document.documentElement;
        dialogElement.removeAttribute("persist");
        dialogElement.removeAttribute("height");
        dialogElement.removeAttribute("width");
        dialogElement.removeAttribute("screenX");
        dialogElement.removeAttribute("screenY");
      //^
  }

  de_ggbs_abs.statustxt(synctype, -1, false, 'Start download ('+synctype+')');

  de_ggbs_abs.gABS.count=0;
  de_ggbs_abs.gSingleBook=singleBook;
  de_ggbs_abs.gMabs=de_ggbs_abs.gABS.syncedAddressbooks('down', singleBook);
  if (synctype=='local') {
    de_ggbs_abs.gTempName='abstemp.mab';
    de_ggbs_abs.cleanUp=de_ggbs_abs.localDownloadDone;
    if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.getLocalData, 0);  // need time to show the popup
    else de_ggbs_abs.getLocalData();
  } else if (synctype=='remote') {
    de_ggbs_abs.gTempName='abstemp.mab';
    if (!de_ggbs_abs.gABS.noexternalappset) {
      var syncprotocol = de_ggbs_abs.gABS.protocol;
//de_ggbs_abs.gABS.dump('setting de_ggbs_abs.externalApp preferences for '+syncprotocol+'\n');
      try { de_ggbs_abs.externalApp=de_ggbs_abs.pref.getBoolPref("network.protocol-handler.external."+syncprotocol); }
        catch(e) { de_ggbs_abs.externalApp=-1; }
      if (de_ggbs_abs.externalApp) de_ggbs_abs.pref.setBoolPref("network.protocol-handler.external."+syncprotocol, false);
      //ubuntu seems to ignore the value of external.xxx, therefore:
      try {
        de_ggbs_abs.externalAppHandler=de_ggbs_abs.pref.getCharPref("network.protocol-handler.app."+syncprotocol);
        if (de_ggbs_abs.externalAppHandler) de_ggbs_abs.pref.clearUserPref("network.protocol-handler.app."+syncprotocol);
      } catch(e) { de_ggbs_abs.externalAppHandler=''; }
    }
    de_ggbs_abs.cleanUp=de_ggbs_abs.remoteDownloadDone;
    if (!de_ggbs_abs.checkOffline()) return;
    if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.getData, 0);
    else de_ggbs_abs.getData();
  } else if (synctype=='imap') {
    if (!de_ggbs_abs.checkOffline()) return;
    if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapLoad, 0);
    else de_ggbs_abs.imapLoad();
  } else {
    de_ggbs_abs.killMe();
  }
}

de_ggbs_abs.getLocalData=function() {
  var localpath=de_ggbs_abs.gABS.localpath;
  if (!localpath) { //preferences not set!
    de_ggbs_abs.killMe();
    return;
  }
  var path = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
  try {
    path.initWithPath( localpath );
  } catch(e) {
    de_ggbs_abs.killMe();
    de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('failed'), 2, true, null, localpath);
    return;
  }

//!
//  var dir=de_ggbs_abs.gMabs.queryElementAt(0, Components.interfaces.nsIAbDirectory);
//  de_ggbs_abs.gMabs.removeElementAt(0);
//!

  var books=de_ggbs_abs.gMabs.enumerate();
    //local addressbooks are synchronously loaded in this loop, but ldif is not synchronous!
    //probably should use
  //while (de_ggbs_abs.gMabs.length) {
  //  if (de_ggbs_abs.gAbort) break;
  //  var dir=de_ggbs_abs.gMabs.queryElementAt(0, Components.interfaces.nsIAbDirectory);
  //  de_ggbs_abs.gMabs.removeElementAt(0);
  while (books.hasMoreElements()) {
    if (de_ggbs_abs.gAbort) break;
    var dir=books.getNext().QueryInterface(Components.interfaces.nsISupports);
    var mabName;
    var mabFile;
    var externalFilename;
    var newSinglebook;
    if (dir instanceof Components.interfaces.nsIAbDirectory) {
      mabName=dir.dirName;
      mabFile=dir.fileName;

      if ((de_ggbs_abs.gForce || !de_ggbs_abs.gABS.checkLastModTime) && !de_ggbs_abs.askOverwrite(dir, false)) {
        de_ggbs_abs.statustxt('- '+mabName+" "+de_ggbs_abs.gStrings.GetStringFromName('skipped'), 3, false);
        continue;
      }
      externalFilename=de_ggbs_abs.gABS.externalFilename(dir);
      newSinglebook=false;
    } else {  // new single book
      mabName = dir.QueryInterface(Components.interfaces.nsISupportsString).data;
      externalFilename = mabName+'.mab';
      mabFile = mabName.replace( /\W/g, "_" )+'.mab';
      newSinglebook=true;
//de_ggbs_abs.gABS.dump('getLocalData, new single book filename='+externalFilename+'\n');
    }
    de_ggbs_abs.statustxt('- '+mabName+'..', 1, false);

    var file = Components.classes["@mozilla.org/file/local;1"].
      createInstance(Components.interfaces.nsIFile);
    file.initWithFile( path );
    file.appendRelativePath( externalFilename );
    if (!file.exists()) {
      de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('nofile'), 2, true, null, file.path);
      continue;
    }

    var lms='';
    if (!newSinglebook) {
      var localMabFile = de_ggbs_abs.gABS.getDir('ProfD');
      localMabFile.appendRelativePath( mabFile );
      de_ggbs_abs.gABS.dump('local download: modifytime mab: '+localMabFile.lastModifiedTime+' file: '+file.lastModifiedTime+'\n');
      var lmfd=de_ggbs_abs.timeString(localMabFile.lastModifiedTime);
      var lfd=de_ggbs_abs.timeString(file.lastModifiedTime);
      lms='lastMod mab:'+lmfd+' file:'+lfd;

      if (!de_ggbs_abs.gForce && de_ggbs_abs.gABS.checkLastModTime) {
        if (localMabFile.lastModifiedTime >= file.lastModifiedTime) {
          de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('skipped'), 2, false, null, lms);
          continue;
        } else if (!de_ggbs_abs.askOverwrite(dir, false)) {
          de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('skipped'), 2, false, null, lms+' Policy: '+de_ggbs_abs.gABS.downloadpolicy);
          continue;
        }
      }
    }

    var ret;
//    if (externalFilename.substr(-5)=='.ldif' || externalFilename.substr(-4)=='.ldi') {
    if (externalFilename.match(/\.ldif?$/i)) {
      var dir=de_ggbs_abs.gABS.getAddressBook(mabFile);  //dir=nsIAbDirectory
      if (!dir) {
        de_ggbs_abs.gABS.dump('failed to find addressbook for '+mabFile+'\n');
        return;
      }
de_ggbs_abs.gABS.dump('LDIF| load ldif\n');
//  de_ggbs_abs.statustxt("+", 0, false, null); //
de_ggbs_abs.gABS.dump('LDIF| clear addressbook\n');
//de_ggbs_abs.dumpDir(dir, 'At Start:');
      var ret=de_ggbs_abs.gABS.clearAddressBook(dir);
      if (ret)
        de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true, null, ret);
      else {
//  de_ggbs_abs.statustxt("+", 0, false, null); //
de_ggbs_abs.gABS.dump('LDIF| read LDIF\n');
        var observerService=Services.obs;
        de_ggbs_abs.LDIFloaded.dir=dir;
        de_ggbs_abs.LDIFloaded.lms=lms;
        de_ggbs_abs.LDIFloaded.os=observerService;
        de_ggbs_abs.LDIFloaded.type='local';
        observerService.addObserver(de_ggbs_abs.LDIFloaded,"LDIFcomplete",false);
        de_ggbs_abs.gABS.LDIFAddressBook(dir, file);
        //loading LDIF is ASYNCHRONOUS!
de_ggbs_abs.gABS.dump('LDIF| read LDIF initiated\n');
//this is not an asynchrounous loop        return;
      }
    } else {
      if ((ret=de_ggbs_abs.replaceAddressBook(mabName, mabFile, file))) {
        de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true, null, ret);
      } else {
        de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('copied'), 2, false, null, lms);
        de_ggbs_abs.gABS.count+=1;
//        if (newSinglebook) de_ggbs_abs.abs_init(); // insert in options list
      }
    }
  } //end loop over books
  de_ggbs_abs.killMe();

}
de_ggbs_abs.LDIFloaded = {
  dir: null,
  lms: null,
  os:  null,
  type: null,
  observe: function(subject, topic, status ) {
    if (topic=='LDIFcomplete') {
      var str=subject.QueryInterface( Components.interfaces.nsISupportsString);
de_ggbs_abs.gABS.dump('LDIF| '+topic+': '+status+': '+str+'\n'); //str ends with '\n'!
//str="Keine Adressbücher zum Importieren gefunden."
      this.os.removeObserver(de_ggbs_abs.LDIFloaded, 'LDIFcomplete' );
      if (status=='failed')
        de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true, null, str);
      else {
        this.dir.lastModifiedDate=de_ggbs_abs.gABS.appstarttime; //set to 'not modified'
        de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('copied'), 2, false, null, this.lms);
        de_ggbs_abs.gABS.count+=1;
      }
      if (this.type=='local') {
        //local addressbooks are synchronously loaded in a loop, but ldif is not synchronous!
        //de_ggbs_abs.getLocalData(); //continue with next book
        de_ggbs_abs.gABS.dump('LDIF| intentionally not calling next book after local .ldif\n');
      } else if (this.type=='remote'){
        de_ggbs_abs.gABS.dump('LDIF| calling next remote book\n');
        if (de_ggbs_abs.gABS.usesPopup) de_ggbs_abs.getData();  // next addressbook
        else setTimeout(de_ggbs_abs.getData, 1000);
      } else {
      de_ggbs_abs.gABS.dump('LDIF| calling next imap book\n');
        if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapLoadNextBook, 0);
        else de_ggbs_abs.imapLoadNextBook();
      }
    }
else de_ggbs_abs.gABS.dump('LDIF| LDIFloaded: unknown topic '+topic+'\n');
  }
};

de_ggbs_abs.getData=function()
{
  if (de_ggbs_abs.gAbort) {
    de_ggbs_abs.killMe();
    return;
  }

  if (!de_ggbs_abs.gMabs.length) {
    de_ggbs_abs.killMe();
    return;
  }

  var dir=de_ggbs_abs.gMabs.queryElementAt(0, Components.interfaces.nsISupports);
  de_ggbs_abs.gMabs.removeElementAt(0);
  var externalFilename;
  var newSinglebook;
  if (dir instanceof Components.interfaces.nsIAbDirectory) {
    de_ggbs_abs.gMabName=dir.dirName;
    de_ggbs_abs.gMabFile=dir.fileName;

    if ((de_ggbs_abs.gForce || !de_ggbs_abs.gABS.checkLastModTime) && !de_ggbs_abs.askOverwrite(dir, false)) {
        de_ggbs_abs.statustxt('- '+de_ggbs_abs.gMabName+" "+de_ggbs_abs.gStrings.GetStringFromName('skipped'), 3, false);
        de_ggbs_abs.getData();
        return;
    }

    externalFilename=de_ggbs_abs.gABS.externalFilename(dir);
    newSinglebook=false;
  } else {  // new single book
    de_ggbs_abs.gMabName = dir.QueryInterface(Components.interfaces.nsISupportsString).data;
    externalFilename=de_ggbs_abs.gMabName+'.mab';
    de_ggbs_abs.gMabFile = de_ggbs_abs.gMabName.replace( /\W/g, "_" )+'.mab';
    newSinglebook=true;
//de_ggbs_abs.gABS.dump('getData, new single book filename='+externalFilename+'\n');
  }
  if (!de_ggbs_abs.gMabName || de_ggbs_abs.gMabName=='false') {  //Merkw�rdiger Fehler (Lars Wohlfahrt, 16.6.08)
    de_ggbs_abs.statustxt('MabName='+de_ggbs_abs.gMabName+' dir='+dir+' single='+newSinglebook, 3, false);
    de_ggbs_abs.getData();  // next addressbook
  }
  de_ggbs_abs.statustxt('- '+de_ggbs_abs.gMabName+".", 1, false);  // 1. dot: start

  var mabURI=de_ggbs_abs.getSyncURI(false)+externalFilename;
  var ioService=Services.io;

  var flmt=null;
  if (!newSinglebook) {
    var f=de_ggbs_abs.gForce;
    if (!de_ggbs_abs.gForce && de_ggbs_abs.gABS.checkLastModTime) {
      //check for last modified date on download
      var localMabFile = de_ggbs_abs.gABS.getDir('ProfD');
      localMabFile.appendRelativePath( de_ggbs_abs.gMabFile );
      flmt=new Date(localMabFile.lastModifiedTime);
    }
  //wenn keine ausgabe der lastmod time: forcierter download!!
  }
  var s=flmt?'lastMod mabfile:'+de_ggbs_abs.timeString(flmt):null;
  de_ggbs_abs.statustxt(".", 0, false, null, s); // 2. dot: start of download
  var error=de_ggbs_abs.gDownloadService.start(
    mabURI, de_ggbs_abs.downloadCallback, de_ggbs_abs.gABS.usepost, flmt, dir);
  if(error)
    de_ggbs_abs.downloadCallback("done", error);
  else
    de_ggbs_abs.statustxt(".", 0, false); // 3. dot: download started
}

de_ggbs_abs.downloadCallback=function(aStatus, aError, httpStatusText)
{
  if(aStatus != "done" && aError==0)
    return;

  switch(aError){
    case -2:
      return;
      break;
    case 0:
      //aError==0, if we have a file (not, if a error page was returned!)
      var s=de_ggbs_abs.gDownloadService.remoteLastModTime?
        'lastMod remote: '+de_ggbs_abs.timeString(de_ggbs_abs.gDownloadService.remoteLastModTime)
        :null;
      de_ggbs_abs.statustxt(".", 0, false, null, s); // 4. dot: download complete
      try {
        var abData=de_ggbs_abs.gDownloadService.data;
        //mab data must start with: // <!-- <mdb:mork:z v="1.4"/> -->
        if (abData.substr( 0, 19 )=='// <!-- <mdb:mork:z') {
//reinsert probably missing second line (workaround a bug up to 0.8.2)
var i=abData.search(/[\r\n]</);
if (i>200) { //must reinsert!
abData=abData.replace(/([\r\n]+)/,'$1< <(a=c)> // (f=iso-8859-1)$1');
}
          var nsITmpFile = de_ggbs_abs.gABS.getDir('TmpD');
          nsITmpFile.appendRelativePath( de_ggbs_abs.gTempName );
          de_ggbs_abs.gABS.writeMabData(nsITmpFile, abData);
          de_ggbs_abs.statustxt(".", 0, false); // 5. dot: file written
          var err=de_ggbs_abs.replaceAddressBook(de_ggbs_abs.gMabName, de_ggbs_abs.gMabFile, nsITmpFile);
          if (err) {
            de_ggbs_abs.statustxt(err, 2, true);
            break;
          }
          de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('copied'), 2, false);
          de_ggbs_abs.gABS.count+=1;
        } else if (           //check for ldif file
              abData.indexOf('\ndn:')>=0 ||
              abData.indexOf('\nobjectclass:')>=0 ||
              abData.indexOf('\nsn:')>=0 ||
              abData.indexOf('\ncn:')>=0 ||
              abData.indexOf('\ngivenname:')>=0 ||
              abData.indexOf('\nmail:')>=0) {  //seems to be a ldif file
            var nsITmpFile = de_ggbs_abs.gABS.getDir('TmpD');
            nsITmpFile.appendRelativePath( de_ggbs_abs.gTempName );
            de_ggbs_abs.gABS.writeMabData(nsITmpFile, abData);
            de_ggbs_abs.statustxt(".", 0, false); // 5. dot: file written

            var dir=de_ggbs_abs.gABS.getAddressBook(de_ggbs_abs.gMabFile);  //dir=nsIAbDirectory
            if (!dir) {
              de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true, null, 'Dir not found');
              break;
            }
            var ret=de_ggbs_abs.gABS.clearAddressBook(dir);
            if (ret) {
              de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true, null, ret);
              break;
            }
            var observerService=Services.obs;
            de_ggbs_abs.LDIFloaded.dir=dir;
            de_ggbs_abs.LDIFloaded.lms='';
            de_ggbs_abs.LDIFloaded.os=observerService;
            de_ggbs_abs.LDIFloaded.type='remote';
            observerService.addObserver(de_ggbs_abs.LDIFloaded,"LDIFcomplete",false);
            de_ggbs_abs.gABS.LDIFAddressBook(dir, nsITmpFile);
            //loading LDIF is ASYNCHRONOUS!
            return; //do not break!
        } else { // some unknown fileformat
de_ggbs_abs.gABS.dump('---download failed, neither mab nor ldif, file start is '+abData.substr( 0, 200 )+'\n');
          de_ggbs_abs.statustxt('Unknown file format', 2, true);
          de_ggbs_abs.gLifeTime=5;//a little bit longer 
        }
      } catch(e) {
        if(e && e.toString().match(/^absync\:(.+)$/))
          de_ggbs_abs.statustxt(RegExp.$1, 2, true);
      }
      break;
    case 0x804b0002: // NS_BINDING_ABORTED: Download stopped because of timecheck
      var s=de_ggbs_abs.gDownloadService.remoteLastModTime?
        'lastMod remote: '+de_ggbs_abs.timeString(de_ggbs_abs.gDownloadService.remoteLastModTime)
        :'Policy: '+de_ggbs_abs.gABS.downloadpolicy;
      de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('skipped'), 2, false, null, s);
      break;
    default:
//de_ggbs_abs.gABS.dump(aError+': '+httpStatusText+'\n');
      if (httpStatusText)
        de_ggbs_abs.statustxt(de_ggbs_abs.errorstr(aError), 2, true, null, httpStatusText);
      else if (aError)
        de_ggbs_abs.statustxt(de_ggbs_abs.errorstr(aError), 2, true);
      else
        de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('failed'), 2, true);
      de_ggbs_abs.gLifeTime=5;//a little bit longer
      break;
  }
  if (de_ggbs_abs.gABS.usesPopup) de_ggbs_abs.getData();  // next addressbook
  else setTimeout(de_ggbs_abs.getData, 1000);
}

de_ggbs_abs.cancelDownload=function ()
{
  if (de_ggbs_abs.gAbort) {
    de_ggbs_abs.gABS.state=''; //Up-/Download ready
    de_ggbs_abs.gAbort++;
    de_ggbs_abs.killMe();
  } else {
    de_ggbs_abs.gAbort++;
    document.getElementById("abs_cancel").label='kill';
  }
  //de_ggbs_abs.gDownloadService.cancel(); //No, or we may left behind with corrupt mabs
}
