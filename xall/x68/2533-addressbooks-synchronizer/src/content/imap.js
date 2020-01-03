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

de_ggbs_abs.gImapFolder=null;  //nsIRDFResource, nsIMsgFolder
de_ggbs_abs.gAccount=null;
de_ggbs_abs.gIdty=null;
de_ggbs_abs.gMessenger=null;

de_ggbs_abs.gFakeDraft=true;        // with SendMsg, if true: fake the draft folder (else use real draft folder and move)
                                    //should probably be a preference
de_ggbs_abs.gSavedDraftFolder=null; // the save original drafts folder

de_ggbs_abs.imapSaveDone=function() {
de_ggbs_abs.gABS.dump('upload cleanUp\n');
  if (de_ggbs_abs.gABS.imapusedraft && de_ggbs_abs.gFakeDraft && de_ggbs_abs.gSavedDraftFolder) {
    de_ggbs_abs.gIdty.draftFolder=de_ggbs_abs.gSavedDraftFolder;
    de_ggbs_abs.gSavedDraftFolder=null;
  }
  if (de_ggbs_abs.gABS.count>0) {
    de_ggbs_abs.statustxt('+', 1, false,'compacting..');
    if (de_ggbs_abs.gABS.usesPopup && !de_ggbs_abs.gABS.exiting) setTimeout(de_ggbs_abs.compact, 1000);  // really needed :-( but not at exit!!
    else de_ggbs_abs.compact();
  } else {
    de_ggbs_abs.statustxt('+', 3, false, 'compacting..'+de_ggbs_abs.gStrings.GetStringFromName('skipped'));
    de_ggbs_abs.uploadDone(); //TODO: what, if compacting delayed??
  }
}
de_ggbs_abs.imapLoadDone=function() {
  de_ggbs_abs.downloadDone();
}
de_ggbs_abs.compact=function() {
  try { // could throw exception in case, server not reacheable
    de_ggbs_abs.gImapFolder.compact(null, null);  // only needed on upload
  } catch(e) { }
//  de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('ok'), 2, false);
  de_ggbs_abs.statustxt('ok', 2, false);
de_ggbs_abs.gABS.dump('compacting done\n');
  de_ggbs_abs.uploadDone();
}

de_ggbs_abs.connect=function() {
  var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");
  de_ggbs_abs.gImapFolder=MailUtils.getExistingFolder(de_ggbs_abs.gABS.imapfolder, true);
  if (!de_ggbs_abs.gImapFolder) {
de_ggbs_abs.gABS.dump("no folder found for "+de_ggbs_abs.gABS.imapfolder+"\n");
    de_ggbs_abs.statustxt(de_ggbs_abs.errorstr(-3), 2, true);
    de_ggbs_abs.gAbort=2;
    de_ggbs_abs.killMe();
    return false;
  }

  // be sure we have logged on to the server
  var w = Services.wm.getMostRecentWindow("mail:3pane");  //.getEnumerator("mail:3pane");
  if (w)
    de_ggbs_abs.gImapFolder.updateFolder(w.msgWindow);   //the msgWindow is essential!!
  else
    de_ggbs_abs.gABS.dump('IMAP connect: no msgWindow\n');
    //with no msgWindow, we cannot connect, but thats ok if we had connected earlier
    //      otherwise may throw 'Access denied' error on upload
    //      or 'No message found' on download
  return true;
}


///////////////////////////////////////////////////////////////////////
//  Save mab files to imap folder

de_ggbs_abs.imapSave=function(syncedBooks) {
  if (!de_ggbs_abs.connect()) return;

  var server=de_ggbs_abs.gImapFolder.server;
  var gAccountManager = MailServices.accounts;
  de_ggbs_abs.gAccount=gAccountManager.FindAccountForServer(server);
  de_ggbs_abs.gIdty=de_ggbs_abs.gAccount.defaultIdentity;

  if (de_ggbs_abs.gABS.imapusedraft) {
    if (de_ggbs_abs.gFakeDraft) {
      // createMessage saves to the 'Draft' Folder of the given identity
      // temporary switch the Drafts-Folder to the to be used folder
      de_ggbs_abs.gSavedDraftFolder=de_ggbs_abs.gIdty.draftFolder;
      de_ggbs_abs.gIdty.draftFolder=de_ggbs_abs.gABS.imapfolder;
    }
    de_ggbs_abs.gTempName='';
  } else {
    de_ggbs_abs.gTempName='absmail.eml';
  }
  de_ggbs_abs.cleanUp=de_ggbs_abs.imapSaveDone; // register cleanup function

  //be sure, headers are read or else, delete of old messages will not work
  // calls imapSaveStage2 when finished
  de_ggbs_abs.statustxt('+',1,false,de_ggbs_abs.gStrings.GetStringFromName('loadimap')+'..');
  if (!de_ggbs_abs.gABS.exiting) de_ggbs_abs.loadHeaders(de_ggbs_abs.imapSaveStage2);
  else de_ggbs_abs.imapSaveStage2();  // loadHeaders works asynchron: bad when TB finishes with or without a popupwindow
  return;
}

de_ggbs_abs.imapSaveStage2=function () {
  de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('ok'),2,false);
  if (de_ggbs_abs.gAbort) { de_ggbs_abs.killMe(); return; }

  if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapSaveNextBook, 0);
  else de_ggbs_abs.imapSaveNextBook();
  return;
}

de_ggbs_abs.imapSaveNextBook=function() {
  if (!de_ggbs_abs.gMabs.length || de_ggbs_abs.gAbort) {
de_ggbs_abs.gABS.dump('upload finished\n');
    de_ggbs_abs.killMe(); // kill status popup
    return;
  }

  var dir=de_ggbs_abs.gMabs.queryElementAt(0, Components.interfaces.nsIAbDirectory);
  de_ggbs_abs.gMabs.removeElementAt(0);
  var mabName=dir.dirName;
  var mabFile=dir.fileName;

  var lmd = de_ggbs_abs.getLastModified(dir);
  var lmds='lastMod='+(lmd?de_ggbs_abs.timeString(lmd*1000):'before appstart');
  if (!de_ggbs_abs.gABS.forcedUploadOf(mabFile) &&
      !de_ggbs_abs.gForce && de_ggbs_abs.gABS.checkLastModTime && de_ggbs_abs.gABS.appstarttime>=lmd) {
    de_ggbs_abs.statustxt('- '+mabName+' '+de_ggbs_abs.gStrings.GetStringFromName('skipped'), 3, false, null, lmds);
de_ggbs_abs.gABS.dump('upload '+mabName+' skipped ('+lmds+')\n');
    de_ggbs_abs.imapSaveNextBook();
    return;
  }
de_ggbs_abs.gABS.dump('upload '+mabName+' ('+lmds+')\n');

  var externalFilename=de_ggbs_abs.gABS.externalFilename(dir);
  externalFilename=externalFilename.replace(/\.ldif?$/i,'.mab');

  de_ggbs_abs.statustxt('- '+mabName+'.', 1, false, null, lmds);  // 1. dot: started

//  get old messages for this addressbook
  var deleteMsgs=Components.classes["@mozilla.org/array;1"]
    .createInstance(Components.interfaces.nsIMutableArray);
  var msgId=de_ggbs_abs.getMsgId(externalFilename);
  var msgs=de_ggbs_abs.gImapFolder.messages;
  while (msgs.hasMoreElements()) {    //simpleEnumerator
    var msg=msgs.getNext();
    msg.QueryInterface(Components.interfaces.nsIMsgDBHdr);
    if (msg.messageId == msgId) {
      deleteMsgs.appendElement(msg, false);
    }
  }

  if (de_ggbs_abs.gABS.imapusedraft)
    de_ggbs_abs.saveAsDraft(externalFilename, mabName, mabFile, deleteMsgs);
  else
    de_ggbs_abs.saveViaFile(externalFilename, mabName, mabFile, deleteMsgs);
  de_ggbs_abs.gABS.forceUploadOf(mabFile, false);
  de_ggbs_abs.gABS.count+=1;

  return;
}

/////////////////////////////////////////////////////////////////////////
//  Load mab files from imap folder


de_ggbs_abs.imapLoad=function() {
  if (!de_ggbs_abs.connect()) return;

  de_ggbs_abs.gTempName='abstemp.mab';
  de_ggbs_abs.cleanUp=de_ggbs_abs.imapLoadDone; // register cleanup function


  var server=de_ggbs_abs.gImapFolder.server;
  var gAccountManager = MailServices.accounts;
  de_ggbs_abs.gAccount=gAccountManager.FindAccountForServer(server);
  de_ggbs_abs.gIdty=de_ggbs_abs.gAccount.defaultIdentity;
  de_ggbs_abs.gMessenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
    QueryInterface(Components.interfaces.nsIMessenger);

  de_ggbs_abs.statustxt('+',1,false,de_ggbs_abs.gStrings.GetStringFromName('loadimap')+'..');

  de_ggbs_abs.loadHeaders(de_ggbs_abs.imapLoadStage2);
  return;
}

de_ggbs_abs.imapLoadStage2=function() {
  de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('ok'),2,false);
  if (de_ggbs_abs.gAbort) { de_ggbs_abs.killMe(); return; }

  if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapLoadNextBook, 0);
  else de_ggbs_abs.imapLoadNextBook();
  return;
}


de_ggbs_abs.imapLoadNextBook=function() {
  if (de_ggbs_abs.gAbort) { de_ggbs_abs.killMe(); return; }

  if (!de_ggbs_abs.gMabs.length) {
    de_ggbs_abs.killMe(); // kill status popup
    return;
  }
  try {
    var dir=de_ggbs_abs.gMabs.queryElementAt(0, Components.interfaces.nsIAbDirectory);
  } catch(e) {
    var dir=de_ggbs_abs.gMabs.queryElementAt(0, Components.interfaces.nsISupportsString);
  }
  de_ggbs_abs.gMabs.removeElementAt(0)
  var externalFilename;
  var newSinglebook;
  if (dir instanceof Components.interfaces.nsIAbDirectory) {
    var mabName=dir.dirName;
    var mabFile=dir.fileName;

    if ((de_ggbs_abs.gForce || !de_ggbs_abs.gABS.checkLastModTime) && !de_ggbs_abs.askOverwrite(dir, false)) {
        de_ggbs_abs.statustxt('- '+mabName+" "+de_ggbs_abs.gStrings.GetStringFromName('skipped'), 3, false);
        de_ggbs_abs.imapLoadNextBook();
        return;
    }

    externalFilename=de_ggbs_abs.gABS.externalFilename(dir);
    newSinglebook=false;
  } else {
    mabName = dir.QueryInterface(Components.interfaces.nsISupportsString).data;
    externalFilename = mabName+'.mab';
    mabFile = mabName.replace( /\W/g, "_" )+'.mab';
    newSinglebook=true;
de_ggbs_abs.gABS.dump('getImapData, new single book filename='+externalFilename+'\n');
  }
  de_ggbs_abs.statustxt('- '+mabName+'.', 1, false);  // 1. dot: start

  // find the correct message (looking for the messageId)
  var msgId = de_ggbs_abs.getMsgId(externalFilename);
  var msgs=de_ggbs_abs.gImapFolder.messages;
  var theMsg=null;
  var theMsgKey=0;
  while (msgs.hasMoreElements()) {
    var msg=msgs.getNext();
    msg.QueryInterface(Components.interfaces.nsIMsgDBHdr);
    // msg.messageKey are the id's as used by the imapserver
    // find the last corresponding message (but there should only be one)
    if (msg.messageId == msgId && msg.messageKey>theMsgKey) {
      theMsg=msg;                 //nsiMsgDBHdr
      theMsgKey=msg.messageKey;
    }
  }
  if (!theMsg) {
    de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('nomessage'), 2, newSinglebook);
//TODO: Nachricht 'Adressbuch geladen' sollte dann nicht kommen
    if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapLoadNextBook, 0);
    else de_ggbs_abs.imapLoadNextBook();
    return;
  }
  de_ggbs_abs.statustxt('.', 0, false); // 2. dot: message found

  var lms;
  if (!newSinglebook && !de_ggbs_abs.gForce && de_ggbs_abs.gABS.checkLastModTime) {
    var datestr=theMsg.ccList;
//de_ggbs_abs.gABS.dump('ABS: msg cc='+datestr);
//need the X-LastModifiedTime header!
//  see https://stackoverflow.com/questions/40417882/how-get-header-data-from-nsimsgdbhdr-in-thunderbird
//de_ggbs_abs.gABS.dump('ABS: msg X-='+theMsg.getStringProperty('X-LastModifiedTime'));
    if (datestr) {
      var c=datestr.substr(0,1);
      if (c=='"' || c=="'") {
        var ind=datestr.indexOf(c, 1);
        datestr=datestr.substr(1, ind-1)
de_ggbs_abs.gABS.dump('ABS: msg cc now='+datestr);
      }
      var mlmt=new Date(datestr);
de_ggbs_abs.gABS.dump('ABS: from cc: mlmt='+mlmt);
      if (!mlmt) {
        mlmt=new Date(new Number(theMsg.date.toString()));
de_ggbs_abs.gABS.dump('ABS: from date: mlmt='+mlmt);
      }
    } else {
      var mlmt=new Date(new Number(theMsg.date.toString()));
de_ggbs_abs.gABS.dump('ABS: no cc, from date: mlmt='+mlmt);
    }
    var localMabFile = de_ggbs_abs.gABS.getDir('ProfD');
    localMabFile.appendRelativePath( mabFile );
    var flmt=new Date(localMabFile.lastModifiedTime);
    lms='lastMod mab: '+de_ggbs_abs.timeString(flmt)+' imap: '+de_ggbs_abs.timeString(mlmt);
    if (mlmt<=flmt) {
      de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('skipped'), 2, false, null, lms);
de_ggbs_abs.gABS.dump('download '+mabName+' skipped:\n  file-time='+flmt+'\n  msg-time='+mlmt+'\n');
de_ggbs_abs.gABS.dump('   file-time='+flmt.valueOf()+'  msg-time='+mlmt.valueOf()+'\n');
      de_ggbs_abs.imapLoadNextBook();
      return;
    } else if (!de_ggbs_abs.askOverwrite(dir, false)) {
      de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('skipped'), 2, false, null, 'Policy: '+de_ggbs_abs.gABS.downloadpolicy);
      de_ggbs_abs.imapLoadNextBook();
      return;
    }
  }
  de_ggbs_abs.statustxt('', 0, false, null, lms); // only output time messages

  var msgURI=de_ggbs_abs.gImapFolder.getUriForMsg(theMsg);
  var ms=de_ggbs_abs.gMessenger.messageServiceFromURI(msgURI);

  var streamListener = {
    body: '',
    mabName: null,
    mabFile: null,
    onDataAvailable: function(request, inputStream, offset, count){
      try {
        var sis=Components.classes["@mozilla.org/scriptableinputstream;1"].
          createInstance(Components.interfaces.nsIScriptableInputStream);
        sis.init(inputStream);
        this.body+=sis.read(count);
      } catch(ex) { alert(ex+'\noffset='+offset+' count='+count); }
    },
    onStartRequest: function(request) {
      this.body='';
    },
    onStopRequest: function(aRequest, aStatusCode) {
      if (!aStatusCode) {
        de_ggbs_abs.statustxt('.', 0, false); // 3. dot: message read
        // extract mab data from message
        var boundary=this.body.match(/boundary="(.*?)"/g);
        if (!boundary) {
          de_ggbs_abs.statustxt(' (encrypted) ', 0, false);
        } else if (boundary[1]) { //signed
          boundary=boundary[1].match(/boundary="(.*?)"/);
          boundary='--'+boundary[1];
        } else {                  //not signed
          boundary=boundary[0].match(/boundary="(.*?)"/);
          boundary='--'+boundary[1];
        }
        if (boundary) try {
          var ind=this.body.indexOf(boundary);     // start of text part
          if (ind<0) throw('noattachment');
          ind=this.body.indexOf(boundary, ind+1);  // start of mab part
          if (ind<0) throw('noattachment');
          var cte;
          var ci=this.body.indexOf('Content-Transfer-Encoding:', ind+1);
          if (ci>=0) {
            var cie=this.body.indexOf('\r', ci);
            if (cie<0) cie=this.body.indexOf('\n', ci);
            cte=this.body.substring(ci+27, cie);
          } else {
            cte='7bit';
          }
          var sub;
          var msgstart=this.body.indexOf('\n\n', ind+1);
          if (msgstart<0) {
            msgstart=this.body.indexOf('\r\n\r\n', ind+1);
            sub=2;
          } else
            sub=1;
          if (msgstart<0) throw('incompleteattachment');
          var msgend=this.body.indexOf(boundary, msgstart+2*sub);
          if (msgend<0) throw('incompleteattachment');
          var msg=this.body.substring(msgstart+2*sub,msgend-sub);
          if (cte=='base64') {
            try {
              msg=msg.replace(/[\r\n]/gm,'');
              msg=atob(msg);
            } catch(e) { alert('base64: '+e); throw('incompleteattachment'); }
          }
de_ggbs_abs.gABS.dump('ABS: msg starts with : -'+msg.substr(0,10)+'-');
	          // write file to temporary file
	          var nsITmpFile=de_ggbs_abs.gABS.getDir('TmpD');
	          nsITmpFile.appendRelativePath(de_ggbs_abs.gTempName);
//de_ggbs_abs.gABS.dump('imap: write tempfile: '+nsITmpFile.path+'\n');
            if (de_ggbs_abs.gABS.writeMabData(nsITmpFile, msg)) {
//var testf=de_ggbs_abs.gABS.getDir('TmpD');
//testf.appendRelativePath('abs_'+this.mabFile);
//de_ggbs_abs.gABS.writeMabData(testf, msg);
  	          de_ggbs_abs.statustxt('.', 0, false); // 4. dot: temp file created
              if (msg.substr(0,7)=='// <!--') {
de_ggbs_abs.gABS.dump('ABS: message is mab');
           	  try {
      	          // replace addressbook data
      	          var ret;
      	          if ((ret=de_ggbs_abs.replaceAddressBook(this.mabName, this.mabFile, nsITmpFile)))
      	            de_ggbs_abs.statustxt(ret, 2, true);
      	          else {
      	            de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('copied'), 2, false);
//###                    if (newSinglebook) de_ggbs_abs.abs_init(); // insert in options list
      	            de_ggbs_abs.gABS.count+=1;
      	          }
            	  } catch (e) {alert('imap replaceaddressbook: '+e); }
              } else {  // LDIF
de_ggbs_abs.gABS.dump('ABS: message is LDIF -- not supported');
                var dir=de_ggbs_abs.gABS.getAddressBook(this.mabFile);  //dir=nsIAbDirectory
                if (!dir)
                  de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true, null, 'Dir not found');
                else {
                  var ret=de_ggbs_abs.gABS.clearAddressBook(dir);
                  if (ret)
                    de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true, null, ret);
                  else {
                    var observerService=Services.obs;
                    de_ggbs_abs.LDIFloaded.dir=dir;
                    de_ggbs_abs.LDIFloaded.lms='';
                    de_ggbs_abs.LDIFloaded.os=observerService;
                    de_ggbs_abs.LDIFloaded.type='imap';
                    observerService.addObserver(de_ggbs_abs.LDIFloaded,"LDIFcomplete",false);
                    de_ggbs_abs.gABS.LDIFAddressBook(dir, nsITmpFile);
                    //loading LDIF is ASYNCHRONOUS!
                    return; //do not break!
                  }
                }
              }
            } else {
              de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied')+' (?)', 2, true); //Bad Status
            }
/*oldtest
          } else {  //partly copied
            if (cte=='7bit')
              de_ggbs_abs.statustxt('attachment not a mab file', 2, true);
            else
              de_ggbs_abs.statustxt('unknown encoding '+cte, 2, true);
          }
*/
        } catch(e) {de_ggbs_abs.statustxt(e, 2, true);}
        else
          de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('noattachment'), 2, true);
      } else
        de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied')+' ('+aStatusCode+')', 2, true); //Bad Status
      if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapLoadNextBook, 0);
      else de_ggbs_abs.imapLoadNextBook();
    } //OnStopRequest
  };  //streamListener

  streamListener.mabName=mabName;
  streamListener.mabFile=mabFile;
	var aurl = new Object();
	ms.CopyMessage(msgURI, streamListener, false, null, null, aurl);

  return;
}

/////////////////////////////////////////////////////////////////////////

// from messageWindow@48
// wait till all headers are read for the imap folder
de_ggbs_abs.loadHeaders=function(callback) {
  var syncListener = {
    callback: null,
    mailSession : null,
    imapfolder: null,
    OnItemAdded: function(parentItem, item) {},
    OnItemRemoved: function(parentItem, item) {},
    OnItemPropertyChanged: function(item, property, oldValue, newValue) {},
    OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
    OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
    OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue){},
    OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
    OnItemEvent: function(folder, event) {
       var eventType = event.toString();

de_ggbs_abs.gABS.dump('load Headers listener '+eventType+'\n');
      if (eventType == "FolderLoaded") {
        if (folder) {
          var uri = folder.URI;
          if (uri == this.imapfolder) {
            this.mailSession.RemoveFolderListener(this);
            var msgFolder = folder.QueryInterface(Components.interfaces.nsIMsgFolder);
            if (msgFolder) {
              msgFolder.endFolderLoading();
              this.callback();
            }
          }
        }
      }
    }
  }
  // first be sure all header are available
  // when they are, the syncListener calls the next stage
de_ggbs_abs.gABS.dump('in loadHeaders\n');
  syncListener.callback=callback;
  syncListener.imapfolder=de_ggbs_abs.gABS.imapfolder;
  var nsIFolderListener = Components.interfaces.nsIFolderListener;
  var mailSession = MailServices.mailSession;
  syncListener.mailSession=mailSession;
  mailSession.AddFolderListener(syncListener, nsIFolderListener.event);
  de_ggbs_abs.gImapFolder.startFolderLoading();
  de_ggbs_abs.gImapFolder.updateFolder(null);
de_ggbs_abs.gABS.dump('in loadHeaders, waiting for listener\n');
  return;
}

///////////////////////////////////////////////////////////////////////
de_ggbs_abs.saveAsDraft=function(externalFilename, mabName, mabFile, deleteMsgs) {
  var stateListener = {
    msgCompose : null,
    QueryInterface: function(iid) {
de_ggbs_abs.gABS.dump('IMAP: ViaDraft: QueryInterface\n');
      if (iid.equals(Components.interfaces.nsIMsgComposeStateListener) ||
          iid.equals(Components.interfaces.nsISupports))
        return this;
      throw Components.results.NS_NOINTERFACE;
      return 0;
    },
    NotifyComposeFieldsReady: function() {  //not called
de_ggbs_abs.gABS.dump('IMAP: ViaDraft: NotifyComposeFieldsReady\n');
    },
    ComposeProcessDone: function(aResult) {
de_ggbs_abs.gABS.dump('IMAP: ViaDraft: ComposeProcessDone '+aResult+'\n');
      if (aResult) {
        this.msgCompose.UnregisterStateListener(this);
        de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true);
        if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapSaveNextBook, 0);
        else de_ggbs_abs.imapSaveNextBook();
      }
    },
    SaveInFolderDone: function(folderURI) {
de_ggbs_abs.gABS.dump('IMAP: ViaDraft: SaveInFolderDone\n');
      de_ggbs_abs.statustxt(".", 0, false); // 4. dot: upload ready
      this.msgCompose.UnregisterStateListener(this);
      de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('copied'), 2, false);
      if (deleteMsgs.length)
        de_ggbs_abs.gImapFolder.deleteMessages ( deleteMsgs, null, true, false, null, false);
      if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapSaveNextBook, 0);
      else de_ggbs_abs.imapSaveNextBook();
    }
  };

  var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"]
    .createInstance(Components.interfaces.nsIMsgComposeParams);
  params.composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
    .createInstance(Components.interfaces.nsIMsgCompFields);

  //var encryptionPolicy = de_ggbs_abs.gIdty.getIntAttribute("encryptionpolicy");
  // 0 == never, 1 == if possible, 2 == always Encrypt.
  params.composeFields.composeSecure = Components.classes["@mozilla.org/messengercompose/composesecure;1"]
              .createInstance(Components.interfaces.nsIMsgComposeSecure);
  params.composeFields.composeSecure.requireEncryptMessage=false;
  params.composeFields.composeSecure.signMessage=false; //=de_ggbs_abs.gIdty.getBoolAttribute("sign_mail");

  params.identity = de_ggbs_abs.gIdty;
  //Set to PlainText or the info part ("Do not delete") is missing
  params.format = Components.interfaces.nsIMsgCompFormat.PlainText;
    //.PlainText or .HTML, .Draft, , .Template, .Default
  params.type=Components.interfaces.nsIMsgCompType.New;
    //.New (=default) or .NewsPost,.MailToUrl, .Template, .Reply u.a.

  var composeFields = params.composeFields;
  composeFields.QueryInterface( Components.interfaces.nsIMsgCompFields);
  composeFields.characterSet = 'UTF-8';
  composeFields.subject = 'Addressbooks Synchronizer: '+externalFilename;
  composeFields.to = '"Addressbooks Synchronizer"'; //de_ggbs_abs.gIdty.email; //needed, if doing encryption
//  composeFields.from = 'Addressbooks Synchronizer'; // does not work (automatically overridden) :-(
  composeFields.fcc = de_ggbs_abs.gABS.imapfolder; // else a 'FCC: imap://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX/sent' appears
  composeFields.body = 'Addressbooks Synchronizer: '+externalFilename+'\nDo not delete this message!!!\n';

  composeFields.messageId = de_ggbs_abs.getMsgId(externalFilename);

  var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"].
    createInstance(Components.interfaces.nsIMsgAttachment);
  var addrbook=de_ggbs_abs.gABS.getAddressBook(mabFile);
  var directoryService =  Services.dirsvc;
  var profileFolder = directoryService.get('ProfD',  Components.interfaces.nsIFile);
  var profileDir = profileFolder.QueryInterface(Components.interfaces.nsIFile);
  var nsIMabFile = profileDir.clone().QueryInterface(Components.interfaces.nsIFile);
  nsIMabFile.appendRelativePath( addrbook.fileName );
  attachment.url = 'file://'+nsIMabFile.path;
  attachment.name = externalFilename;
  composeFields.addAttachment(attachment);
  var lmt=new Date(nsIMabFile.lastModifiedTime);
  composeFields.cc = '"'+lmt+'"';
  composeFields.setHeader("X-LastModifiedTime", lmt.toString());
//TODO: the timestamp inside the mabfile is incorrect, since not updated here!

  composeFields.bodyIsAsciiOnly = true;
  composeFields.forcePlainText  = true;
  composeFields.attachVCard   = false;
de_ggbs_abs.gABS.dump('IMAP: ViaDraft: composeFields set\n');

  var sMsgComposeService = MailServices.compose;
  if (sMsgComposeService)
  {
de_ggbs_abs.gABS.dump('IMAP: ViaDraft: have sMsgComposeService\n');
    var msgCompose = sMsgComposeService.initCompose(params);
    if (msgCompose)
    {
de_ggbs_abs.gABS.dump('IMAP: ViaDraft: have msgCompose\n');
      de_ggbs_abs.statustxt(".", 0, false); // 2. dot: InitCompose done
      stateListener.msgCompose = msgCompose;
      msgCompose.RegisterStateListener(stateListener);
        // .Save, .SaveAs und .Now does not work (Upload window verschwindet,
        //   aber immer noch up/download in Progress und kein Fehler in JavaScriptConsole
        // Mit .Now ist die message tatsächlich verschickt worden :-)
        // Mit .Later landet es in LocalFolders.unsent und will später versendet werden.
      msgCompose.SendMsg(Components.interfaces.nsIMsgCompDeliverMode.SaveAsDraft,
        de_ggbs_abs.gIdty, de_ggbs_abs.gAccount.key, null, null);
      de_ggbs_abs.statustxt(".", 0, false); // 3. dot: SendMsg done
    }
else de_ggbs_abs.gABS.dump('IMAP: ViaDraft: no msgCompose\n');
  }
else de_ggbs_abs.gABS.dump('IMAP: ViaDraft: no sMsgComposeService\n');

  return;
}

///////////////////////////////////////////////////////////////////////////
de_ggbs_abs.saveViaFile=function(externalFilename, mabName, mabFile, deleteMsgs) {
  var b64Name=btoa(unescape(encodeURIComponent(externalFilename)));  // base64 encode the filename
  var eb64Name='=?UTF-8?b?'+b64Name+'?=';
  var time=Date.now();

  var nsIMabFile=de_ggbs_abs.gABS.getDir('ProfD');
  nsIMabFile.appendRelativePath( mabFile );
  var abData=de_ggbs_abs.gABS.readMabData(nsIMabFile, false);
  if (!abData) {
    de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true);
    de_ggbs_abs.imapSaveNextBook();
    return;
  }
  de_ggbs_abs.statustxt(".", 0, false); // 2. dot: mab data loaded

  var header='';
  header+='Message-ID: '+de_ggbs_abs.getMsgId(externalFilename)+'\r\n';
  header+='Date: '+Date(time)+'\r\n';
  header+='From: '+de_ggbs_abs.gIdty.email+'\r\n';
  header+='To: "Addressbooks Synchronizer"\r\n';
  header+='Subject: Addressbooks Synchronizer: '+eb64Name+'\r\n';
  var lmt=new Date(nsIMabFile.lastModifiedTime);
  header+='CC: "'+lmt+'"\r\n';
  header+='X-LastModifiedTime: '+lmt+'\r\n';
  header+='Content-Type: multipart/mixed; boundary="------------'+time+'"\r\n';
  header+='\r\n';
  header+='This is a multi-part message in MIME format.\r\n';
  header+='--------------'+time+'\r\n';
  header+='Content-Type: text/plain; charset=UTF-8\r\n';
  header+='Content-Transfer-Encoding: 8bit\r\n';
  header+='\r\n';
  header+='Addressbooks Synchronizer: '+unescape(encodeURIComponent(externalFilename))+'\r\n';
  header+='Do not delete this message!!!\r\n';
  header+='\r\n';
  header+='--------------'+time+'\r\n';
  header+='Content-Type: text/plain; name="'+eb64Name+'"\r\n';
  header+='Content-Transfer-Encoding: 7bit\r\n';
  header+='Content-Disposition: inline; filename="='+eb64Name+'"\r\n';
  header+='\r\n';

  var tailer='';
  tailer+='\r\n';
  tailer+='--------------'+time+'\r\n';

  var nsITmpFile=de_ggbs_abs.gABS.getDir('TmpD');
  nsITmpFile.appendRelativePath(de_ggbs_abs.gTempName);
  if (!de_ggbs_abs.gABS.writeMabData(nsITmpFile, header+abData+tailer)) {
    de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('notcopied'), 2, true);
    de_ggbs_abs.imapSaveNextBook();
    return;
  }
  de_ggbs_abs.statustxt(".", 0, false); // 3. dot: tmp file written
de_ggbs_abs.gABS.dump('IMAP: ViaFile: Tempfile written '+nsITmpFile.path+'\n');

  var deleteMsgsCount=deleteMsgs.length;
  var fileSpec = nsITmpFile;
  var havefilespec=false;
de_ggbs_abs.gABS.dump('IMAP: ViaFile: no filespec\n');

  // listen for the end of a 'store to imap folder'
  var copyServiceListener = {
      QueryInterface: function(iid) {
//de_ggbs_abs.gABS.dump('IMAP: ViaFile: QueryInterface called\n');
        if (iid.equals(Components.interfaces.nsIMsgCopyServiceListener) ||
            iid.equals(Components.interfaces.nsISupports))
          return this;
        throw Components.results.NS_NOINTERFACE;
        return 0;
      },

      OnProgress:  function(progress, progressMax) {
//de_ggbs_abs.gABS.dump('IMAP: ViaFile: OnProgress called: '+progress+' '+progressMax+'\n');
        // never called!!
      },

      OnStartCopy: function() {
de_ggbs_abs.gABS.dump('IMAP: ViaFile: OnStartCopy called\n');
//de_ggbs_abs.gABS.dump('de='+de+'\n');
      },

      OnStopCopy:  function(status) {
de_ggbs_abs.gABS.dump('IMAP: ViaFile: OnStopCopy called: status='+status+'\n');
//de_ggbs_abs.gABS.dump('de='+de+'\n');

        //Beim upload at onUnload ohne popupfenster
        //  existiert hier de_ggbs_abs.statustxt() und auch z.B. alert() nicht mehr
        try { de_ggbs_abs.statustxt; }
        catch(e) { window.close; return; } //thunderbird hängt!

        if (!status) {          // store has finished
          de_ggbs_abs.statustxt(de_ggbs_abs.gStrings.GetStringFromName('copied'), 2, false);
        } else {
          de_ggbs_abs.statustxt(de_ggbs_abs.errorstr(status), 2, true);
        }
        if (deleteMsgsCount>0)
          de_ggbs_abs.gImapFolder.deleteMessages ( deleteMsgs, null, true, false, null, false);
        if (de_ggbs_abs.gABS.usesPopup) setTimeout(de_ggbs_abs.imapSaveNextBook, 100);
        else de_ggbs_abs.imapSaveNextBook();
      },

      SetMessageKey:  function(key) {
de_ggbs_abs.gABS.dump('IMAP: ViaFile: SetMessageKey called: key='+key+'\n');
        de_ggbs_abs.statustxt(".", 0, false); // 4. dot: uploaded to server done
        // will not be called, if message not copied to server
        // will probably not called if server delivers no message key!?
      }
  }

  // with de_ggbs_abs.gImapFolder.copyFileMessage, onStartCopy and onStopCopy gets not called!!
  var gMessageService = MailServices.copy;
  var READ=1; //see mailnews\base\public\nsMsgMessageFlags.idl
  gMessageService.CopyFileMessage(fileSpec, de_ggbs_abs.gImapFolder, null, false, READ,
      '', copyServiceListener, null);

  // next mabfile is started, when listener is informed about the end of the operation
de_ggbs_abs.gABS.dump('IMAP: ViaFile: return from saveViaFile\n');
  return;
}

/////////////////////////////////////////////////////////////////////////

de_ggbs_abs.getMsgId=function(theName) {
  return encodeURI(theName+'@AddressBooksSynchronizer');
}
