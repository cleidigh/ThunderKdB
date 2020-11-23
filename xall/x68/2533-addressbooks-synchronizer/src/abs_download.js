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


var gSingleBook=null;
var gMabFilename=null;
var gMabName=null;

function downloadDone() {
  debug('downloadDone');
  //if (gSingleBook) Services.prompt.alert(null, "AddressbooksSynchronizer", strings['loaded']);
//TODO  refreshAddressbook();

//TODO: eigentlich nur, wenn ok
	let od=getOptionsDoc();
	if (od) {
		let dmn=od.getElementById("DownloadMabName");
		if (dmn) dmn.value='';
	}

/*TODO
  let w=null;
  if (!abs_init)
    w=Services.wm.getMostRecentWindow("de-ggbs-abs-options");
  else
    w=window;
  if (w) w.abs_init(); // update options list, if necessary
*/

}

function remoteDownloadDone() {
debug('remoteDownloadDone');
	if (!prefs['noexternalappset']) {
    if (externalApp) {
      var syncprotocol = prefs['protocol'];
      if (externalApp==-1) {
        Services.prefs.clearUserPref("network.protocol-handler.external."+syncprotocol);
debug('clear pref "network.protocol-handler.external.'+syncprotocol+'"');
      } else {
        Services.prefs.setBoolPref("network.protocol-handler.external."+syncprotocol, true);
debug('set pref "network.protocol-handler.external.'+syncprotocol+'" back to true');
			}
    }
    if (externalAppHandler) {
      Services.prefs.setCharPref("network.protocol-handler.app."+syncprotocol, externalAppHandler);
debug('and set pref "network.protocol-handler.app.'+syncprotocol+'" back to '+externalAppHandler);
		}
    externalApp=null;
    externalAppHandler=null;
  }
  downloadDone();
}
function localDownloadDone() {
  downloadDone();
}

//TODO: welche Addressbücher sind auf dem Server zu finden!?
function download(singleBook, force) {
debug('entered appstart='+appstarttime+' syncstate='+syncstate);
  gLifeTime=3;
	gForce=force;
  var synctype=prefs['synctype'];

  statustxt(synctype+' download', -1, false, 'Start download ('+synctype+')');

  donecount=0;
  gSingleBook=singleBook;
  gMabs=syncedAddressbooks('down', singleBook);
  gTempName=new Array();
  if (synctype=='local') {
    cleanUp=localDownloadDone;
    getLocalData();
  } else if (synctype=='remote') {
    cleanUp=remoteDownloadDone;
debug('noexternalappset='+prefs['noexternalappset']);
    if (!prefs['noexternalappset']) {
      var syncprotocol = prefs['protocol'];
      try { externalApp=Services.prefs.getBoolPref("network.protocol-handler.external."+syncprotocol); }
        catch(e) { externalApp=-1; }
debug('externalapp='+externalApp);
      if (externalApp) {
				Services.prefs.setBoolPref("network.protocol-handler.external."+syncprotocol, false);
debug('set pref "network.protocol-handler.external.'+syncprotocol+'" to false (was:'+(externalApp==-1?'unset':externalApp)+')');
			}
      //ubuntu seems to ignore the value of external.xxx, therefore:
      try {
        externalAppHandler=Services.prefs.getCharPref("network.protocol-handler.app."+syncprotocol);
        if (externalAppHandler) {
					Services.prefs.clearUserPref("network.protocol-handler.app."+syncprotocol);
debug('and clear pref "network.protocol-handler.app.'+syncprotocol+'"');
				}
      } catch(e) { externalAppHandler=''; }
    }
    if (!checkOffline()) return;
    getData();
  } else if (synctype=='imap') {
    if (!checkOffline()) return;
    imapLoad();
  } else {
    killMe();
  }
}

function getLocalData() {
  let localpath=prefs['localpath'];
  if (!localpath) { //preferences not set!
    statustxt(errorstr(-1), 2, true);
    killMe();
    return;
  }
  let path = Cc["@mozilla.org/file/local;1"].
								createInstance(Ci.nsIFile);
  try {
    path.initWithPath(localpath);
  } catch(e) {
    killMe();
    statustxt(strings['failed'], 2, true, null, localpath);
    return;
  }

  for (const book of gMabs) {
    if (gAbort) break;
		let dir;
    let mabName;
    let mabFilename;
    let externalFilename;
    let newSinglebook;
		if (typeof book == 'string') {	// new single book
      mabName = book;
      externalFilename = mabName+".sqlite";
      newSinglebook=true;
debug('new single book filename='+externalFilename+'\n');
		} else {
			dir=book.QueryInterface(Ci.nsIAbDirectory);
      mabName=dir.dirName;
      mabFilename=dir.fileName;
debug('askOverwrite(2)');
      if ((gForce || prefs['notimecheck']) &&	
															!askOverwrite(dir, false)) {
        statustxt('- '+mabName+" "+strings['skipped'], 3, false);
        continue;
      }
      externalFilename=getExternalFilename(dir);
      newSinglebook=false;
    }
    statustxt('- '+mabName+'..', 1, false);

    let file = Cc["@mozilla.org/file/local;1"].
									createInstance(Ci.nsIFile);
    file.initWithFile(path);
    file.appendRelativePath(externalFilename);
    if (!file.exists()) {
debug('File existiert nicht: '+file.path+'\n');
			statustxt(strings['nofile'], 2, true, null, file.path);
      continue;
    }

    let lms='';
    if (!newSinglebook) {
 			let localMabFile = FileUtils.getFile("ProfD", [mabFilename]);
debug('local: modifytime mab: '+localMabFile.lastModifiedTime+' file: '+file.lastModifiedTime+'\n');
      let lmfd=timeString(localMabFile.lastModifiedTime);
      let lfd=timeString(file.lastModifiedTime);
      lms='lastMod mab:'+lmfd+' file:'+lfd;

debug('askOverwrite(3)');
      if (!gForce && !prefs['notimecheck']) {
        if (localMabFile.lastModifiedTime >= file.lastModifiedTime) {
          statustxt(strings['skipped'], 2, false, null, lms);
          continue;
        } else if (!askOverwrite(dir, false)) {
          statustxt(strings['skipped'], 2, false, null, lms+' Policy: '+prefs['downloadpolicy']);
          continue;
        }
      }
    }

		let ret;
		if ((ret=replaceAddressBook(mabName, dir, file))) {
			statustxt(strings['notcopied'], 2, true, null, ret);
		} else {
			statustxt(strings['copied'], 2, false, null, lms);
			donecount+=1;
		}
  } //end loop over books
  killMe();
}

function getData() {
  if (gAbort) {
    killMe();
    return;
  }

  if (!gMabs.length) {
    killMe();
    return;
  }

	let baseURI=getSyncURI();
	if (!baseURI) {
    statustxt(errorstr(-1), 2, true);
    killMe();
    return;
	}

  let dir=gMabs.shift();	// Ci.nsISupports);
  let externalFilename;
  let newSinglebook;
  if (dir instanceof Ci.nsIAbDirectory) {
		gMabName=dir.dirName;
    gMabFilename=dir.fileName;

debug('askOverwrite(4)');
    if ((gForce || prefs['notimecheck']) && !askOverwrite(dir, false)) {
        statustxt('- '+gMabName+" "+strings['skipped'], 3, false);
        getData();
        return;
    }

    externalFilename=getExternalFilename(dir);
    newSinglebook=false;
  } else {  // new single book
    gMabName = dir;
		dir='';
    externalFilename=gMabName+'.sqlite';
    newSinglebook=true;
debug(' new single book filename='+externalFilename+'\n');
  }
  if (!gMabName || gMabName=='false') {  //Merkw�rdiger Fehler (Lars Wohlfahrt, 16.6.08)
    statustxt('MabName='+gMabName+' dir='+dir+' single='+newSinglebook, 3, false);
    getData();  // next addressbook
  }
  statustxt('- '+gMabName+".", 1, false);  // 1. dot: start

  let mabURI=baseURI+externalFilename;

  let flmt=null;
  if (!newSinglebook) {
    if (!gForce && !prefs['notimecheck']) {
      //check for last modified date on download
 			let localMabFile = FileUtils.getFile("ProfD", [gMabFilename]);
      flmt=new Date(localMabFile.lastModifiedTime);
    }
  //wenn keine ausgabe der lastmod time: forcierter download!!
  }
  let s=flmt?'lastMod mabfile: '+timeString(flmt):null;
  statustxt(".", 0, false, null, s); // 2. dot: start of download
  let error=gDownloadService.start(
    mabURI, downloadCallback, prefs['usepost'], flmt, dir);
  if(error)
    downloadCallback("done", error);
  else
    statustxt(".", 0, false); // 3. dot: download started
}

function downloadCallback(aStatus, aError, httpStatusText) {
  if(aStatus != "done" && aError==0)
    return;

  switch(aError){
    case -2:
      return;
      break;
    case 0:
      //aError==0, if we have a file (not, if a error page was returned!)
      let s0=gDownloadService.remoteLastModTime?
        'lastMod remote: '+timeString(gDownloadService.remoteLastModTime*1000)
//        :null;
        :'lastMod remote: none found or not checked';
      statustxt(".", 0, false, null, s0); // 4. dot: download complete
      try {
        let abData=gDownloadService.data;
				if (abData.substr( 0, 6 ) == 'SQLite') {
					let tmpFile = FileUtils.getFile("TmpD", ['abstemp.sqlite']);
          tmpFile.createUnique(tmpFile.NORMAL_FILE_TYPE, parseInt("0600", 8));
          if (tmpFile === null) {
            statustxt('Could not create temp. file', 2, true);
            break;
          }
					gTempName.push(tmpFile.path);	//for automatic deletion!

          let length=gDownloadService.length;
          writeMabData(tmpFile, abData, length);
          statustxt(".", 0, false); // 5. dot: file written
debug('replace '+gMabName+' '+gMabFilename+' '+tmpFile.path);
          let err=replaceAddressBook(gMabName, gDownloadService._dir, tmpFile);
          if (err) {
            statustxt(err, 2, true);
            break;
          }
          statustxt(strings['copied'], 2, false);
          donecount+=1;
        } else { // some unknown fileformat
debug('not a sqlite file, file start is '+abData.substr( 0, 200 )+'\n');
          statustxt('Unknown file format', 2, true);
          gLifeTime=5;//a little bit longer 
        }
      } catch(e) {
        if(e && e.toString().match(/^absync\:(.+)$/))
          statustxt(RegExp.$1, 2, true);
      }
      break;
    case 0x804b0002: // NS_BINDING_ABORTED: Download stopped because of timecheck
      let s1=gDownloadService.remoteLastModTime?
        'lastMod remote: '+timeString(gDownloadService.remoteLastModTime*1000)
        :'Policy: '+prefs['downloadpolicy'];
      statustxt(strings['skipped'], 2, false, null, s1);
      break;
    default:
//debug(aError+': '+httpStatusText);
      if (httpStatusText)
        statustxt(errorstr(aError), 2, true, null, httpStatusText);
      else if (aError)
        statustxt(errorstr(aError), 2, true);
      else
        statustxt(strings['failed'], 2, true);
      gLifeTime=5;//a little bit longer
      break;
  }
  getData();  // next addressbook
}

function cancelDownload()
{
  if (gAbort) {
    syncstate=''; //Up-/Download ready
    gAbort++;
    killMe();
  } else {
    gAbort++;
    statusWin.document.getElementById("cancel").textContent='k i l l';
  }
  //gDownloadService.cancel(); //No, or we may left behind with corrupt mabs
}
