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

de_ggbs_abs.externalApp=null;
de_ggbs_abs.externalAppHandler=null;

de_ggbs_abs.gCurMabFile=null;

de_ggbs_abs.uploadDone=function() {
  de_ggbs_abs.gABS.dump('in uploadDone');
  if (!de_ggbs_abs.gABS.noexternalappset) {
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
}

de_ggbs_abs.upload=function(singleBook, force)
{
de_ggbs_abs.gABS.debug('in upload appstart='+de_ggbs_abs.gABS.appstarttime+' state='+de_ggbs_abs.gABS.state);
  if (typeof(force) == 'object') {  //called via openWindow()
    singleBook=singleBook.data;
    force=force.data=='true';
  } else if (typeof(force) == 'string') {  //called via openWindow() (Since TB3.x?)
    force=force=='true';
  }

  de_ggbs_abs.gLifeTime=3;
  de_ggbs_abs.gForce=force||de_ggbs_abs.gABS.forceUpload;
    de_ggbs_abs.gABS.forceUpload=false;
  var synctype=de_ggbs_abs.gABS.synctype;

  if (de_ggbs_abs.gABS.usesPopup) {
    if (de_ggbs_abs.gABS.exiting && de_ggbs_abs.gABS.hideallpopups) {
      de_ggbs_abs.gLifeTime=1;//if 0, statusmessages are not going into the file
try {
//      var status=document.getElementById('statuswindow');
//      status.collapsed=true;  //resizes the window to about 10x50px!
      window.moveTo(10000,10000); //with this, only a small part of the window is visible
                                  //at the lower right of the screen
      window.resizeTo(0,0);
} catch(e) { alert(e); }
    }
  }

  de_ggbs_abs.statustxt(synctype, -1, false, 'Start upload ('+synctype+')');

  de_ggbs_abs.gABS.count=0;
  de_ggbs_abs.gMabs=de_ggbs_abs.gABS.syncedAddressbooks('up', singleBook);

  de_ggbs_abs.cleanUp=de_ggbs_abs.uploadDone;
  if (synctype=='local') {
    if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.sendLocalData, 0);   // give popup time to show up
    else de_ggbs_abs.sendLocalData();
  } else if (synctype=='remote') {
    if (!de_ggbs_abs.gABS.noexternalappset) {
      var syncprotocol = de_ggbs_abs.gABS.protocol;
//dump('setting de_ggbs_abs.externalApp preferences for '+syncprotocol);
      try { de_ggbs_abs.externalApp=de_ggbs_abs.pref.getBoolPref("network.protocol-handler.external."+syncprotocol) }
        catch(e) { de_ggbs_abs.externalApp=-1; }
      if (de_ggbs_abs.externalApp) de_ggbs_abs.pref.setBoolPref("network.protocol-handler.external."+syncprotocol, false);
      //ubuntu seems to ignore the value of external.xxx, therefore:
      try {
        de_ggbs_abs.externalAppHandler=de_ggbs_abs.pref.getCharPref("network.protocol-handler.app."+syncprotocol);
        if (de_ggbs_abs.externalAppHandler) de_ggbs_abs.pref.clearUserPref("network.protocol-handler.app."+syncprotocol);
      } catch(e) { de_ggbs_abs.externalAppHandler=''; }
    }
    if (!de_ggbs_abs.checkOffline()) return;
    if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.sendData, 0);
    else de_ggbs_abs.sendData();
  } else if (synctype=='imap') {
    if (!de_ggbs_abs.checkOffline()) return;
    if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapSave, 0);
    else de_ggbs_abs.imapSave();
  } else {
    de_ggbs_abs.killMe();
  }

}

de_ggbs_abs.sendLocalData=function() {
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
  var books=de_ggbs_abs.gMabs.enumerate();
  while (books.hasMoreElements()) {
    if (de_ggbs_abs.gAbort) break;
    var dir=books.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
    var mabName=dir.dirName;
    var mabFile=dir.fileName;

    var externalFilename=de_ggbs_abs.gABS.externalFilename(dir);
    externalFilename=externalFilename.replace(/\.ldif?$/i,'.mab');
    var file = Components.classes["@mozilla.org/file/local;1"].
      createInstance(Components.interfaces.nsIFile);
    file.initWithFile( path );
    file.appendRelativePath( externalFilename );
    var lmdf=(file.exists() && file.isFile()) ? file.lastModifiedTime/1000 : 0; //lastModifiedDate of uploaded file
dump('abs: last mod of file '+externalFilename+': '+lmdf);

    var lmd = de_ggbs_abs.getLastModified(dir);
    var lmds='lastMod='+(lmd?de_ggbs_abs.timeString(lmd*1000):'before appstart')
                       + '  file='+de_ggbs_abs.timeString(lmdf*1000);
    if (!de_ggbs_abs.gABS.forcedUploadOf(mabFile) && !de_ggbs_abs.gForce
          && de_ggbs_abs.gABS.checkLastModTime && 
               (de_ggbs_abs.gABS.appstarttime>=lmd || lmdf>=lmd) )
    {
      de_ggbs_abs.statustxt('- '+mabName+' '+de_ggbs_abs.gStrings.GetStringFromName('skipped'), 3, false, null, lmds);
      continue;
    }

    de_ggbs_abs.statustxt('- '+mabName+'..', 1, false, null, lmds);
    if (de_ggbs_abs.saveMabFile(mabName, mabFile, path, externalFilename)) {
      de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('copied'), 2, false);
      de_ggbs_abs.gABS.forceUploadOf(mabFile, false);
      de_ggbs_abs.gABS.count+=1;
    } else {
      de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true);
    }
  }
  de_ggbs_abs.killMe();
}

de_ggbs_abs.sendData=function()
{
    while (true) {
      if (!de_ggbs_abs.gMabs.length || de_ggbs_abs.gAbort) {
        de_ggbs_abs.killMe();
        return;
      }
//      var dir=de_ggbs_abs.gMabs.GetElementAt(0).QueryInterface(Components.interfaces.nsIAbDirectory);
      var dir=de_ggbs_abs.gMabs.queryElementAt(0, Components.interfaces.nsIAbDirectory);
      de_ggbs_abs.gMabs.removeElementAt(0);
      var mabName=dir.dirName;
      var mabFile=dir.fileName;

      var lmd = de_ggbs_abs.getLastModified(dir);
      var lmds='lastMod='+(lmd?de_ggbs_abs.timeString(lmd*1000):'before appstart');
      if (!de_ggbs_abs.gABS.forcedUploadOf(mabFile) &&
          !de_ggbs_abs.gForce && de_ggbs_abs.gABS.checkLastModTime && de_ggbs_abs.gABS.appstarttime>=lmd) {
        de_ggbs_abs.statustxt('- '+mabName+' '+de_ggbs_abs.gStrings.GetStringFromName('skipped'), 3, false, null, lmds);
        continue;
      }
      break;
    }
    de_ggbs_abs.gCurMabFile=mabFile
    var externalFilename=de_ggbs_abs.gABS.externalFilename(dir);
    externalFilename=externalFilename.replace(/\.ldif?$/i,'.mab');

    de_ggbs_abs.statustxt('- '+mabName+".", 1, false, null, lmds);  // 1. dot: start

    var mabURI=de_ggbs_abs.getSyncURI(false)+externalFilename;
    var nsIMabFile=de_ggbs_abs.gABS.getDir('ProfD');
    nsIMabFile.appendRelativePath( mabFile );
    var abData=de_ggbs_abs.gABS.readMabData(nsIMabFile, de_ggbs_abs.gABS.checkLastModTime);
    if (!abData) {
      de_ggbs_abs.uploadCallback("done",-2); // file does not exist
      return;
    }
    de_ggbs_abs.statustxt(".", 0, false); // 2. dot: file loaded

    var error=de_ggbs_abs.gUploadService.start(abData, mabURI, 'text/plain', de_ggbs_abs.uploadCallback);
    if(error)
      de_ggbs_abs.uploadCallback("done", error);
    else
      de_ggbs_abs.statustxt(".", 0, false); // 4. dot: upload start is finished
}

de_ggbs_abs.uploadCallback=function(aStatus,aError)
{
  if (aStatus=='send') {  //called from within gUploadService.start
    de_ggbs_abs.statustxt('.', 0, false); // 3. dot: upload started
    return;
  } else {  // upload finished (called with aStatus='done' from grUploadService)
    try { de_ggbs_abs.errorstr; }
    catch(e) { de_ggbs_abs.sendData(); return; }  //bei Upload at onUnload ohne popup fenster
                                                    //existiert hier errorstr() nicht mehr
                                                    //nicht einmal mehr sendData()!
    var error=de_ggbs_abs.errorstr(aError);
    if (error!=de_ggbs_abs.gStrings.GetStringFromName('ok')) {
      de_ggbs_abs.statustxt(error, 2, true);
      de_ggbs_abs.gLifeTime=5;//in seconds.
//      de_ggbs_abs.killMe();
//      return;
    } else {
      de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('ok'), 2, false);
      de_ggbs_abs.gABS.forceUploadOf(de_ggbs_abs.gCurMabFile, false);
      de_ggbs_abs.gABS.count+=1;
    }
  }

    de_ggbs_abs.sendData(); //next addressbook
}

de_ggbs_abs.cancelUpload=function()
{
  if (de_ggbs_abs.gAbort) {
    de_ggbs_abs.gAbort++;
    de_ggbs_abs.killMe();
  } else {
    de_ggbs_abs.gAbort++;
    document.getElementById("abs_cancel").label='kill';
  }
  // de_ggbs_abs.gUploadService.cancel();  // no or we may left behind corrupted files
}

