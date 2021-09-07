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

var gImapFolder=null;  //nsIRDFResource, nsIMsgFolder
var gAccount=null;
var gIdty=null;

var gFakeDraft=true;        // with SendMsg, if true: fake the draft folder
														// (else use real draft folder and move)
                                    //should probably be a preference
var gSavedDraftFolder=null; // the save original drafts folder

//var imapTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

function imapSaveDone() {
debug('imapSaveDone');
  if (prefs['imapuploadpolicy']=='draft' && gFakeDraft && gSavedDraftFolder) {
debug('reset draft folder to '+gSavedDraftFolder);
    gIdty.draftFolder=gSavedDraftFolder;
    gSavedDraftFolder=null;
  }
  if (donecount>0) {
    statustxt('+', 1, false,'compacting..');
//TODO exiting?
//    if (usesPopup && !exiting) setTimeout(compact, 1000);  // really needed :-( but not at exit!!
//    else compact();
    compact();
  } else {
    statustxt('+', 3, false, 'compacting..'+strings['skipped']);
    uploadDone(); //TODO exiting: what, if compacting delayed??
  }
debug('return');
}
function imapLoadDone() {
  downloadDone();
}
function compact() {
debug('entered');
  try { // could throw exception in case, server not reacheable
    gImapFolder.compact(null, null);  // only needed on upload
  } catch(e) {
debug('throws: '+e, e);
	}
//  statustxt(strings['ok'], 2, false);
  statustxt('ok', 2, false);
debug('return');
  uploadDone();
}

function connect() {
debug('account='+prefs['imapfolderAccount']);
	gAccount=MailServices.accounts.getAccount(prefs['imapfolderAccount']);
	if (!gAccount) {
debug("imap connect throws: ill. IMAP folder: no account found for "+prefs['imapfolderAccount']+':'+prefs['imapfolderPath'], '');
    statustxt(errorstr(-3), 2, true);
    gAbort=2;
    killMe();
    return false;
	}
	let server = gAccount.incomingServer;
	if (server.passwordPromptRequired) {
  // be sure we have logged on to the server
debug('password is required');
//don't ask for password as we do not know if there isn't already a normal password prompt */
		let m3p = Services.wm.getMostRecentWindow("mail:3pane");
		if (!m3p.gDBView) {
debug('wait for view');
			return;
		}
		if (m3p.gDBView.msgFolder.server.key!=server.key) {
		// server for download is not the displayed folder, ask for password
			try {
				//let pwd=server.getPasswordWithUI('prompt', 'title', m3p.msgWindow);	//returns the password
				let pwd=server.QueryInterface(Ci.nsIImapIncomingServer).PromptPassword(m3p.msgWindow);	//returns the password
				if (server.passwordPromptRequired) {
				// be sure we have logged on to the server
debug('password still required');
					return false;
				}
debug('got password');
			} catch(e) {
debug('PromptPassword throws '+e);
				return false;
			}
		} else {
debug('Normal password prompt should appear');
			return false;
		}
	}
	let rootFolder=server.rootMsgFolder;		//nsIMsgFolder
  gImapFolder=MailUtils.getExistingFolder(rootFolder.URI+prefs['imapfolderPath'], true);
  if (!gImapFolder) {
debug("imap connect throws: ill. IMAP folder: no folder found for "+prefs['imapfolderAccount']+': '+rootFolder.URI+prefs['imapfolderPath'], '');
    statustxt(errorstr(-3), 2, true);
    gAbort=2;
    killMe();
    return false;
  }

  let m3p = Services.wm.getMostRecentWindow("mail:3pane");
  if (m3p) {
debug('update folder');
    gImapFolder.updateFolder(m3p.msgWindow);   //the msgWindow is essential!!
  } else {
debug('no msgWindow');
    //with no msgWindow, we cannot connect, but thats ok if we had connected earlier
    //      otherwise may throw 'Access denied' error on upload
    //      or 'No message found' on download
	}
  return true;
}


///////////////////////////////////////////////////////////////////////
//  Save mab files to imap folder

function imapSave(syncedBooks) {
debug('entered');
  if (!connect()) return;
debug('connected');
	//gAccount set in connect()
  gIdty=gAccount.defaultIdentity;

  if (prefs['imapuploadpolicy']=='draft') {
    if (gFakeDraft) {
      // createMessage saves to the 'Draft' Folder of the given identity
      // temporary switch the Drafts-Folder to the to be used folder
      gSavedDraftFolder=gIdty.draftFolder;
debug('saved draft folder '+gSavedDraftFolder);
      gIdty.draftFolder=gImapFolder.URI;
    }
  }
  cleanUp=imapSaveDone; // register cleanup function

  //be sure, headers are read or else, delete of old messages will not work
  // calls imapSaveStage2 when finished
  statustxt('+',1,false,strings['loadimap']+'..');
  if (!exiting) loadHeaders(imapSaveStage2);
  else imapSaveStage2();  // loadHeaders works asynchron: bad when TB finishes with or without a popupwindow
debug('return');
  return;
}

function imapSaveStage2() {
debug('entered');
  statustxt(strings['ok'],2,false);
  if (gAbort) { killMe(); return; }

  imapSaveNextBook();
debug('return');
  return;
}

function imapSaveNextBook() {
debug('entered');
  if (!gMabs.length || gAbort) {
debug('upload finished');
    killMe(); // kill status popup
debug(' return');
    return;
  }

  let dir=gMabs.shift(); //Ci.nsIAbDirectory);
  let mabName=dir.dirName;
  let mabFilename=dir.fileName;

  let lmd = getLastModified(dir);
  let lmds='lastMod='+(lmd?timeString(lmd*1000):'before appstart');
  if (//TODO !forcedUploadOf(mabFilename) &&
      !gForce && !prefs['notimecheck'] && appstarttime>=lmd) {
    statustxt('- '+mabName+' '+strings['skipped'], 3, false, null, lmds);
debug('upload '+mabName+' skipped ('+lmds+')');
    imapSaveNextBook();
debug('return');
    return;
  }
debug('upload '+mabName+' ('+lmds+')');

  let externalFilename=getExternalFilename(dir);

  statustxt('- '+mabName+'.', 1, false, null, lmds);  // 1. dot: started

//  get old messages for this addressbook
debug('appVersion='+appVersion);
  let deleteMsgs=appVersion<'85'
		? Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray)
		: new Array();
  let msgId=getMsgId(externalFilename);
  let msgs=gImapFolder.messages;
  while (msgs.hasMoreElements()) {    //simpleEnumerator
    let msg=msgs.getNext();
    msg.QueryInterface(Ci.nsIMsgDBHdr);
    if (msg.messageId == msgId) {
      if (appVersion<'85') deleteMsgs.appendElement(msg, false);
			else deleteMsgs.push(msg);
debug('delete msg '+msgId);
    }
  }
debug('old messages deleted');

  if (prefs['imapuploadpolicy']=='draft') {
debug('call saveAsDraft');
    saveAsDraft(externalFilename, mabName, mabFilename, deleteMsgs);
  } else {
debug('call saveViaFile');
    saveViaFile(externalFilename, mabName, mabFilename, deleteMsgs);
	}
  donecount+=1;

debug('return');
  return;
}

/////////////////////////////////////////////////////////////////////////
//  Load mab files from imap folder

function imapLoad() {
  if (!connect()) return;

  cleanUp=imapLoadDone; // register cleanup function

  gIdty=gAccount.defaultIdentity;

  statustxt('+',1,false,strings['loadimap']+'..');

  loadHeaders(imapLoadStage2);
  return;
}

function imapLoadStage2() {
  statustxt(strings['ok'],2,false);
  if (gAbort) { killMe(); return; }

  imapLoadNextBook();
  return;
}


function imapLoadNextBook() {
  if (gAbort) { killMe(); return; }

  if (!gMabs.length) {
    killMe(); // kill status popup
    return;
  }
	let dir=gMabs.shift();
	let mabName;
	let mabFilename;
  if (dir instanceof Ci.nsIAbDirectory) {
    mabName=dir.dirName;
    mabFilename=dir.fileName;
debug('askOverwrite(5)');
    if ((gForce || prefs['notimecheck']) && !askOverwrite(dir, false)) {
			statustxt('- '+mabName+" "+strings['skipped'], 3, false);
			imapLoadNextBook();
			return;
    }
    externalFilename=getExternalFilename(dir);
    newSinglebook=false;
  } else {
    mabName = dir;
		dir='';
    externalFilename = mabName+'.sqlite';
    newSinglebook=true;
debug('new single book filename='+externalFilename);
  }
  statustxt('- '+mabName+'.', 1, false);  // 1. dot: start

  // find the correct message (looking for the messageId)
  let msgId = getMsgId(externalFilename);
  let msgs=gImapFolder.messages;
  let theMsg=null;
  let theMsgKey=0;
  while (msgs.hasMoreElements()) {
    let msg=msgs.getNext();
    msg.QueryInterface(Ci.nsIMsgDBHdr);
    // msg.messageKey are the id's as used by the imapserver
    // find the last corresponding message (but there should only be one)
    if (msg.messageId == msgId && msg.messageKey>theMsgKey) {
      theMsg=msg;                 //nsiMsgDBHdr
      theMsgKey=msg.messageKey;
    }
  }
  if (!theMsg) {
    statustxt(strings['nomessage'], 2, newSinglebook);
//TODO: Nachricht 'Adressbuch geladen' sollte dann nicht kommen
    imapLoadNextBook();
    return;
  }
  statustxt('.', 0, false); // 2. dot: message found

  let lms;
  if (!newSinglebook && !gForce && !prefs['notimecheck']) {
  let composeFields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
	let datestr=composeFields.splitRecipients(theMsg.ccList, false).toString();
//need the X-LastModifiedTime header!
//  see https://stackoverflow.com/questions/40417882/how-get-header-data-from-nsimsgdbhdr-in-thunderbird
//debug('msg X-='+theMsg.getStringProperty('X-LastModifiedTime'));
		let mlmt;
debug('datestr from cc: '+datestr);
    if (datestr) {
			datestr=datestr.replace(/<.*>/,'');	//remove fake email address
      let c=datestr.substr(0,1);
      if (c=='"' || c=="'") {
        let ind=datestr.indexOf(c, 1);
        datestr=datestr.substr(1, ind-1)
debug('msg cc now='+datestr);
      }
      mlmt=new Date(datestr);
debug('from cc: mlmt='+mlmt);
      if (isNaN(mlmt)) {
        mlmt=new Date(theMsg.date/1000);
debug('from date: mlmt='+mlmt);
      }
    } else {
      mlmt=new Date(theMsg.date/1000);
debug('no cc, from date: mlmt='+mlmt);
    }
		let localMabFile=FileUtils.getFile("ProfD", [mabFilename]);
    flushDB(localMabFile);
    let flmt=new Date(localMabFile.lastModifiedTime);
    lms='lastMod mab: '+timeString(flmt)+' imap: '+timeString(mlmt);
debug('askOverwrite(6)');
    if (mlmt<=flmt) {
      statustxt(strings['skipped'], 2, false, null, lms);
debug('download '+mabName+' skipped:\n  file-time='+flmt+'\n  msg-time='+mlmt+'\n');
debug('   file-time='+flmt.valueOf()+'  msg-time='+mlmt.valueOf()+'\n');
      imapLoadNextBook();
      return;
    } else if (!askOverwrite(dir, false)) {
      statustxt(strings['skipped'], 2, false, null, 'Policy: '+prefs['downloadpolicy']);
      imapLoadNextBook();
      return;
    }
  }
  statustxt('', 0, false, null, lms); // only output time messages

  let msgURI=gImapFolder.getUriForMsg(theMsg);
  let messenger = Cc['@mozilla.org/messenger;1'].createInstance().
    QueryInterface(Ci.nsIMessenger);
  let ms=messenger.messageServiceFromURI(msgURI);

  let streamListener = {
    body: '',
    mabName: null,
    dir: null,
    gTempName: null,
    onDataAvailable: function(request, inputStream, offset, count){
      try {
        let sis=Cc["@mozilla.org/scriptableinputstream;1"].
          createInstance(Ci.nsIScriptableInputStream);
        sis.init(inputStream);
        this.body+=sis.read(count);
      } catch(e) {
				debug('throws: '+e+' at offset='+offset+' count='+count, e);
			}
    },
    onStartRequest: function(request) {
      this.body='';
    },
    onStopRequest: function(aRequest, aStatusCode) {
      if (!aStatusCode) {
        statustxt('.', 0, false); // 3. dot: message read
        // extract mab data from message
        let boundary=this.body.match(/boundary="(.*?)"/g);
        if (!boundary) {
          statustxt(' (encrypted) ', 0, false);
        } else if (boundary[1]) { //signed
          boundary=boundary[1].match(/boundary="(.*?)"/);
          boundary='--'+boundary[1];
        } else {                  //not signed
          boundary=boundary[0].match(/boundary="(.*?)"/);
          boundary='--'+boundary[1];
        }
        if (boundary) {
					try {
						let ind=this.body.indexOf(boundary);     // start of text part
						if (ind<0) throw('noattachment');
						ind=this.body.indexOf(boundary, ind+1);  // start of mab part
						if (ind<0) throw('noattachment');
						let cte;
						let ci=this.body.indexOf('Content-Transfer-Encoding:', ind+1);
						if (ci>=0) {
							let cie=this.body.indexOf('\r', ci);
							if (cie<0) cie=this.body.indexOf('\n', ci);
							cte=this.body.substring(ci+27, cie);
						} else {
							cte='7bit';
						}
						let sub;
						let msgstart=this.body.indexOf('\n\n', ind+1);
						if (msgstart<0) {
							msgstart=this.body.indexOf('\r\n\r\n', ind+1);
							sub=2;
						} else
							sub=1;
						if (msgstart<0) throw('incompleteattachment');
						let msgend=this.body.indexOf(boundary, msgstart+2*sub);
						if (msgend<0) throw('incompleteattachment');
						let msg=this.body.substring(msgstart+2*sub,msgend-sub);
						if (cte=='base64') {
							try {
								msg=msg.replace(/[\r\n]/gm,'');
								msg=findWindow().atob(msg);
							} catch(e) {
								Services.prompt.alert(null, "AddressbooksSynchronizer", 'base64: '+e);
								debug('base64: '+e, e);
								throw('incompleteattachment');
							}
						}
	debug('msg starts with : -'+msg.substr(0,10)+'-');
							// write file to temporary file
							let tmpFile=FileUtils.getFile("TmpD", ['abstemp.sqlite']);
              tmpFile.createUnique(tmpFile.NORMAL_FILE_TYPE, parseInt("0600", 8));
              if (tmpFile === null) {
                statustxt('Could not create temp. file', 2, true);
								Services.prompt.alert(null, "AddressbooksSynchronizer", 'bad tmpfile: '+e);
								debug('bad tmpfile: '+e, e);
								throw('failed');
              }
debug('in StreamListener gTempName='+typeof this.gTempName);
              this.gTempName.push(tmpFile.path);	//for automatic deletion!
	//debug('write tempfile: '+tmpFile.path);
							if (writeMabData(tmpFile, msg, msg.length)) {
								statustxt('.', 0, false); // 4. dot: temp file created
								if (msg.substr(0,6)=='SQLite') {
									try {
										// replace addressbook data
										let ret;
										if ((ret=replaceAddressBook(this.mabName, this.dir, tmpFile)))
											statustxt(ret, 2, true);
										else {
											statustxt(strings['copied'], 2, false);
											donecount+=1;
										}
									} catch (e) {
										Services.prompt.alert(null, "AddressbooksSynchronizer", 'imap replaceaddressbook: '+e);
										debug('imap replaceaddressbook throws: '+e, e);
									}
								} else {
debug('message has unknown file format');
									Services.prompt.alert(null, "AddressbooksSynchronizer", 'imap replaceaddressbook: '+e);
									debug('imap replaceaddressbook throws: '+e, e);
									throw('incompleteattachment');
								}

							} else {
								statustxt(strings['notcopied']+' (?)', 2, true); //Bad Status
							}
					} catch(e) {
						statustxt(e, 2, true);
					}
        } else {
          statustxt(strings['noattachment'], 2, true);
				}
      } else {
        statustxt(strings['notcopied']+' ('+aStatusCode+')', 2, true); //Bad Status
			}
      imapLoadNextBook();
    } //OnStopRequest
  };  //streamListener

  streamListener.mabName=mabName;
  streamListener.dir=dir;
debug('set streamListener gTempName='+typeof gTempName);
  streamListener.gTempName=gTempName;
	let aurl = new Object();
	ms.CopyMessage(msgURI, streamListener, false, null, null, aurl);

  return;
}

/////////////////////////////////////////////////////////////////////////

// from messageWindow@48
// wait till all headers are read for the imap folder
function loadHeaders(callback) {
debug('loadHeaders');
  let syncListener = {
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
      let eventType = event.toString();

debug('eventType='+eventType);
      if (eventType == "FolderLoaded") {
        if (folder) {
          let uri = folder.URI;
          if (uri == this.imapfolder) {
            this.mailSession.RemoveFolderListener(this);
            let msgFolder = folder.QueryInterface(Ci.nsIMsgFolder);
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
  syncListener.callback=callback;
  syncListener.imapfolder=gImapFolder.URI;
  let folderListener = Ci.nsIFolderListener;
  let mailSession = MailServices.mailSession;
  syncListener.mailSession=mailSession;
  mailSession.AddFolderListener(syncListener, folderListener.event);
  gImapFolder.startFolderLoading();
  gImapFolder.updateFolder(null);
debug('return');
  return;
}

///////////////////////////////////////////////////////////////////////
function saveAsDraft(externalFilename, mabName, mabFilename, deleteMsgs) {
  let stateListener = {
    msgCompose : null,
    QueryInterface: function(iid) {
debug('QueryInterface');
      if (iid.equals(Ci.nsIMsgComposeStateListener) ||
          iid.equals(Ci.nsISupports))
        return this;
      throw Components.results.NS_NOINTERFACE;
      return 0;
    },
    NotifyComposeFieldsReady: function() {  //not called
debug('NotifyComposeFieldsReady');
    },
    ComposeProcessDone: function(aResult) {
debug('ComposeProcessDone '+aResult);
      if (aResult) {
        this.msgCompose.UnregisterStateListener(this);
        statustxt(strings['notcopied'], 2, true);
        imapSaveNextBook();
      }
    },
    SaveInFolderDone: function(folderURI) {
debug('SaveInFolderDone');
      statustxt(".", 0, false); // 4. dot: upload ready
      this.msgCompose.UnregisterStateListener(this);
      statustxt(strings['copied'], 2, false);
      if (deleteMsgs.length)
        gImapFolder.deleteMessages ( deleteMsgs, null, true, false, null, false);
      imapSaveNextBook();
    }
  };

  let params = Cc["@mozilla.org/messengercompose/composeparams;1"]
    .createInstance(Ci.nsIMsgComposeParams);
  params.composeFields = Cc["@mozilla.org/messengercompose/composefields;1"]
    .createInstance(Ci.nsIMsgCompFields);

  //let encryptionPolicy = gIdty.getIntAttribute("encryptionpolicy");
  // 0 == never, 1 == if possible, 2 == always Encrypt.
  params.composeFields.composeSecure = Cc["@mozilla.org/messengercompose/composesecure;1"]
              .createInstance(Ci.nsIMsgComposeSecure);
  params.composeFields.composeSecure.requireEncryptMessage=false;
  params.composeFields.composeSecure.signMessage=false; //=gIdty.getBoolAttribute("sign_mail");

  params.identity = gIdty;
  //Set to PlainText or the info part ("Do not delete") is missing
  params.format = Ci.nsIMsgCompFormat.PlainText;
    //.PlainText or .HTML, .Draft, , .Template, .Default
  params.type=Ci.nsIMsgCompType.New;
    //.New (=default) or .NewsPost,.MailToUrl, .Template, .Reply u.a.

  let composeFields = params.composeFields;
  composeFields.QueryInterface( Ci.nsIMsgCompFields);
	try {
		composeFields.characterSet = 'UTF-8';	// UTF-8 is standard since TB82.3
	} catch(e) {}
  composeFields.subject = 'Addressbooks Synchronizer: '+externalFilename;
  composeFields.to = '"Addressbooks Synchronizer"'; //gIdty.email; //needed, if doing encryption
//  composeFields.from = 'Addressbooks Synchronizer'; // does not work (automatically overridden) :-(
  composeFields.fcc = gImapFolder.URI; // else a 'FCC: imap://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX/sent' appears
  composeFields.body = 'Addressbooks Synchronizer: '+externalFilename+'\nDo not delete this message!!!\n';

  composeFields.messageId = getMsgId(externalFilename);

  let mabFile=FileUtils.getFile("ProfD", [mabFilename]);
  flushDB(mabFile);

  let attachment = Cc["@mozilla.org/messengercompose/attachment;1"].
    createInstance(Ci.nsIMsgAttachment);
  attachment.url = 'file://'+mabFile.path;
  attachment.name = externalFilename;
  composeFields.addAttachment(attachment);
  let lmt=new Date(mabFile.lastModifiedTime);
  composeFields.cc = '"'+lmt+'"';
  composeFields.setHeader("X-LastModifiedTime", lmt.toString());

  composeFields.bodyIsAsciiOnly = true;
  composeFields.forcePlainText  = true;
  composeFields.attachVCard   = false;
debug('composeFields set');

	let msgCompose = MailServices.compose.initCompose(params);
	statustxt(".", 0, false); // 2. dot: InitCompose done
	stateListener.msgCompose = msgCompose;
	msgCompose.RegisterStateListener(stateListener);
		// .Save, .SaveAs und .Now does not work (Upload window verschwindet,
		//   aber immer noch up/download in Progress und kein Fehler in JavaScriptConsole
		// Mit .Now ist die message tatsächlich verschickt worden :-)
		// Mit .Later landet es in LocalFolders.unsent und will später versendet werden.
	if (msgCompose.SendMsg)	//up to TB82
		msgCompose.SendMsg(Ci.nsIMsgCompDeliverMode.SaveAsDraft,
											gIdty, gAccount.key, null, null);
	else
		msgCompose.sendMsg(Ci.nsIMsgCompDeliverMode.SaveAsDraft,	//might use await
											gIdty, gAccount.key, null, null);
	statustxt(".", 0, false); // 3. dot: SendMsg done

  return;
}

///////////////////////////////////////////////////////////////////////////
function saveViaFile(externalFilename, mabName, mabFilename, deleteMsgs) {
debug('saveViaFile');
  let b64Name=findWindow().btoa(unescape(encodeURIComponent(externalFilename)));  // base64 encode the filename
  let eb64Name='=?UTF-8?b?'+b64Name+'?=';
  let time=Date.now();

  let mabFile=FileUtils.getFile("ProfD", [mabFilename]);
  flushDB(mabFile);
  let abData=readMabData(mabFile);
  if (!abData) {
    statustxt(strings['notcopied'], 2, true);
    imapSaveNextBook();
debug('return');
    return;
  }
  statustxt(".", 0, false); // 2. dot: mab data loaded

  let header='';
  header+='Message-ID: '+getMsgId(externalFilename)+'\r\n';
  header+='Date: '+Date(time)+'\r\n'; //This does not conform to RFC2822, see getResentDate in smr_implementation on how todo
  header+='From: '+gIdty.email+'\r\n';
  header+='To: "Addressbooks Synchronizer"\r\n';
  header+='Subject: Addressbooks Synchronizer: '+eb64Name+'\r\n';
  let lmt=new Date(mabFile.lastModifiedTime);
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
	header+='Content-Type: application/octet-stream; name="'+eb64Name+'"\r\n';
	header+='Content-Transfer-Encoding: base64\r\n';
	header+='Content-Disposition: attachment; filename="'+eb64Name+'"\r\n';
	header+='\r\n';
	abData=findWindow().btoa(abData);
  let tailer='';
  tailer+='\r\n';
  tailer+='--------------'+time+'\r\n';

  let tmpFile=FileUtils.getFile("TmpD", ['abstemp.sqlite']);
  tmpFile.createUnique(tmpFile.NORMAL_FILE_TYPE, parseInt("0600", 8));
  if (tmpFile === null) {
    statustxt('Could not create temp. file', 2, true);
    Services.prompt.alert(null, "AddressbooksSynchronizer", 'bad tmpfile: '+e);
    debug('bad tmpfile: '+e, e);
    return;
  }
  gTempName.push(tmpFile.path);	//for automatic deletion!

  let msg=header+abData+tailer;
  if (!writeMabData(tmpFile, msg, msg.length)) {
    statustxt(strings['notcopied'], 2, true);
    imapSaveNextBook();
debug('return');
    return;
  }
  statustxt(".", 0, false); // 3. dot: tmp file written
debug('Tempfile written '+tmpFile.path);

  // listen for the end of a 'store to imap folder'
  let copyServiceListener = {
      QueryInterface: function(iid) {
//debug('QueryInterface called');
        if (iid.equals(Ci.nsIMsgCopyServiceListener) ||
            iid.equals(Ci.nsISupports))
          return this;
        throw Components.results.NS_NOINTERFACE;
        return 0;
      },

      OnProgress:  function(progress, progressMax) {
//debug('OnProgress called: '+progress+' '+progressMax);
        // never called!!
      },

      OnStartCopy: function() {
debug('OnStartCopy called');
      },

      OnStopCopy:  function(status) {
debug('OnStopCopy called: status='+status);
        if (!status) {          // store has finished
          statustxt(strings['copied'], 2, false);
        } else {
          statustxt(errorstr(status), 2, true);
        }
        if (deleteMsgs.length>0)
          gImapFolder.deleteMessages ( deleteMsgs, null, true, false, null, false);
        imapSaveNextBook();
debug('return');
      },

      SetMessageKey:  function(key) {
debug('SetMessageKey called: key='+key);
        statustxt(".", 0, false); // 4. dot: uploaded to server done
        // will not be called, if message not copied to server
        // will probably not called if server delivers no message key!?
      }
  }

  // with gImapFolder.copyFileMessage, onStartCopy and onStopCopy gets not called!!
  let READ=1; //see mailnews\base\public\nsMsgMessageFlags.idl
  //let msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].
	//										createInstance(Ci.nsIMsgWindow);
	try {
		MailServices.copy.CopyFileMessage(tmpFile, gImapFolder, null, false, READ,
      '', copyServiceListener, null/*msgWindow*/);
	} catch(e) {	// since TB91!
		MailServices.copy.copyFileMessage(tmpFile, gImapFolder, null, false, READ,
      '', copyServiceListener, null/*msgWindow*/);
	}

  // next mabfile is started, when listener is informed about the end of the operation
debug('return');
  return;
}

/////////////////////////////////////////////////////////////////////////

function getMsgId(theName) {
  return encodeURI(theName+'@AddressBooksSynchronizer');
}

