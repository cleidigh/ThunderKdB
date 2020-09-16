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

let gCurMabFile=null;

function uploadDone() {
  debug('entered');
		pendingupload=false;

	//reset external App values
  if (!prefs['noexternalappset']) {
    if (externalApp) {
      let syncprotocol = prefs['protocol'];
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
}

function upload(singleBook, force) {
debug('entered appstart='+appstarttime+' syncstate='+syncstate);

  gLifeTime=3;
  gForce=force;
  let synctype=prefs['synctype'];

  if (usesPopup) {
    if (exiting && prefs['hideallpopups']) {
      gLifeTime=1;//if 0, statusmessages are not going into the file
    }
  }

  statustxt(synctype+' upload', pendingupload?1:-1, false, 'Start upload ('+synctype+')');

  donecount=0;
  gMabs=syncedAddressbooks('up', singleBook);

  cleanUp=uploadDone;
  if (synctype=='local') {
		sendLocalData();
  } else if (synctype=='remote') {
    if (!prefs['noexternalappset']) {
      let syncprotocol = prefs['protocol'];
      try { externalApp=Services.prefs.getBoolPref("network.protocol-handler.external."+syncprotocol) }
        catch(e) { externalApp=-1; }
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
    sendData();
  } else if (synctype=='imap') {
    if (!checkOffline()) return;
    imapSave();
  } else {
    killMe();
  }
}

function sendLocalData() {
  let localpath=prefs['localpath'];
  if (!localpath) { //preferences not set!
    statustxt(errorstr(-1), 2, true);
    gAbort=2;
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
    let dir=book.QueryInterface(Ci.nsIAbDirectory);
    let mabName=dir.dirName;
    let mabFile=dir.fileName;

    let externalFilename=getExternalFilename(dir);
    let file = Cc["@mozilla.org/file/local;1"].
									createInstance(Ci.nsIFile);
    file.initWithFile(path);
    file.appendRelativePath(externalFilename);
    let lmd = getLastModified(dir);
debug('last mod of dir '+dir.dirName+': '+lmd);
		//lmdf might be slightly less than lmd (<1sec)
    let lmdf=(file.exists() && file.isFile()) ? Math.floor(file.lastModifiedTime/1000) : 0; //lastModifiedDate of uploaded file
debug('last mod of file '+externalFilename+': '+lmdf);
    let lmds='lastMod='+(lmd?timeString(lmd*1000):'before appstart')
                       + '  file='+timeString(lmdf*1000);
debug(''+
	' && !gForce='+!gForce+
	' && !notimecheck='+prefs['notimecheck']+
	' && (appstarttime='+appstarttime+'>=lmd='+lmd+
	' || lmdf='+lmdf+'>=lmd='+lmd+') => skip');
    if (!gForce
          && !prefs['notimecheck'] && 
               (appstarttime>=lmd || lmdf>=lmd) )
    {
      statustxt('- '+mabName+' '+strings['skipped'], 3, false, null, lmds);
      continue;
    }

    statustxt('- '+mabName+'..', 1, false, null, lmds);
		if (saveMabFile(dir.dirPrefId, file.path)) {
      statustxt(strings['copied'], 2, false);
      donecount+=1;
    } else {
      statustxt(strings['notcopied'], 2, true);
    }
  }
  killMe();
}

function sendData() {
	let dir;
	let mabName;
	let mabFileName;
	let lmds;
	let baseURI=getSyncURI();
	if (!baseURI) {
    statustxt(errorstr(-1), 2, true);
    gAbort=2;
    killMe();
    return;
	}
	while (true) {
		if (!gMabs.length || gAbort) {
			killMe();
			return;
		}
		dir=gMabs.shift(); // Ci.nsIAbDirectory);
		mabName=dir.dirName;
		mabFileName=dir.fileName;

		let lmd = getLastModified(dir);
		lmds='lastMod='+(lmd?timeString(lmd*1000):'before appstart');
		if (!gForce && !prefs['notimecheck'] && appstarttime>=lmd) {
			statustxt('- '+mabName+' '+strings['skipped'], 3, false, null, lmds);
			continue;
		}
		break;
	}
	gCurMabFile=mabFileName
  let externalFilename=getExternalFilename(dir);
	statustxt('- '+mabName+".", 1, false, null, lmds);  // 1. dot: start

	let mabURI=baseURI+externalFilename;
	let mabFile = FileUtils.getFile("ProfD", [mabFileName]);
	flushDB(mabFile);
	let abData=readMabData(mabFile);
	if (!abData) {
		uploadCallback("done",-2); // file does not exist
		return;
	}
	statustxt(".", 0, false); // 2. dot: file loaded

	let error=gUploadService.start(abData, mabURI, 'text/plain', uploadCallback);
	if(error)
		uploadCallback("done", error);
	else
		statustxt(".", 0, false); // 4. dot: upload start is finished
}

function uploadCallback(aStatus,aError) {
  if (aStatus=='send') {  //called from within gUploadService.start
    statustxt('.', 0, false); // 3. dot: upload started
    return;
  } else {  // upload finished (called with aStatus='done' from grUploadService)
    var error=errorstr(aError);
    if (error!=strings['ok']) {
      statustxt(error, 2, true);
      gLifeTime=5;//in seconds.
    } else {
      statustxt(strings['ok'], 2, false);
      donecount+=1;
    }
  }

  sendData(); //next addressbook
}

function cancelUpload()
{
debug('gAbort='+gAbort);
  if (gAbort) {
    gAbort++;
    killMe();
  } else {
    gAbort++;     statusWin.document.getElementById("cancel").textContent='k i l l';
  }
  // gUploadService.cancel();  // no or we may left behind corrupted files
}

