//TODO: toolbar buttons for 'send with nocopy' and 'send and copy to sent folder'
//TODO: implement 'also move Original message' on answers
//TODO: extract FCC: header from message, if draft or template

const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const {AddonManager} = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
const {MailUtils} = ChromeUtils.import("resource:///modules/MailUtils.jsm");	//kann ggf. weg
const {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm");	//kann ggf. weg
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
const Ci=Components.interfaces;

let sb4f=Services.strings.createBundle("chrome://messenger/locale/folderWidgets.properties");

let strings={
  "copysent2choose_label": '',
  "copysent2choose_accesskey": '',
  "moveoriginal_label": '',
  "moveoriginal_accesskey": '',
  "copysent2current_nocopy": '',
  "NoTrashFolder": '',
};

//
//------------------------------------------
//
/*

const folderTypeMap = new Map([
  [Ci.nsMsgFolderFlags.Inbox, "inbox"],
  [Ci.nsMsgFolderFlags.Drafts, "drafts"],
  [Ci.nsMsgFolderFlags.SentMail, "sent"],
  [Ci.nsMsgFolderFlags.Trash, "trash"],
  [Ci.nsMsgFolderFlags.Templates, "templates"],
  [Ci.nsMsgFolderFlags.Archive, "archives"],
  [Ci.nsMsgFolderFlags.Junk, "junk"],
  [Ci.nsMsgFolderFlags.Queue, "outbox"],
]);

  see mailnews/base/public/nsMsgFolderFlags.idl
var gFlagList = { 'MSG_FOLDER_FLAG_VIRTUAL' : 0x0020,
									'MSG_FOLDER_FLAG_TRASH' : 0x0100,
									'MSG_FOLDER_FLAG_SENTMAIL' : 0x0200,
									'MSG_FOLDER_FLAG_DRAFTS' : 0x0400,
									'MSG_FOLDER_FLAG_QUEUE' : 0x0800,
									'MSG_FOLDER_FLAG_INBOX' : 0x1000,
									'MSG_FOLDER_FLAG_TEMPLATES' : 0x400000,
									'MSG_FOLDER_FLAG_JUNK' : 0x40000000 };
var gSpecialFolders=0x0100|0x0400|0x0800|0x400000|0x40000000;

nsIMsgCompDeliverMode
PRInt32 	Now 	= 0
PRInt32 	Later 	= 1
PRInt32 	Save 	= 2
PRInt32 	SaveAs 	= 3
PRInt32 	SaveAsDraft 	= 4
PRInt32 	SaveAsTemplate 	= 5
PRInt32 	SendUnsent 	= 6
PRInt32 	AutoSaveAsDraft 	= 7
*/

var gAllowMove=false;  //TODO: used with 'also move original'
/*
var gPreSelected='';  //TODO: used with toolbar icons
*/

var prefs;

var cs2c = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {   //not called it add-on not loaded from .xpi
debug('onStartup');
  }

  onShutdown(isAppShutdown) {
debug('onShutdown isAppShutdown='+isAppShutdown);
      if (isAppShutdown) return;
      // Looks like we got uninstalled. Maybe a new version will be installed
      // now. Due to new versions not taking effect
      // (https://bugzilla.mozilla.org/show_bug.cgi?id=1634348)
      // we invalidate the startup cache. That's the same effect as starting
      // with -purgecaches (or deleting the startupCache directory from the
      // profile).
      //gg: also called on 'disable add-on' but add-on is still active!
      //  with addCols repeatedly called
      //  and after reenable, addCols is NOT called
      Services.obs.notifyObservers(null, "startupcache-invalidate");
  }
  getAPI(context) {
    // To be notified of the extension going away, call callOnClose with any object that has a
    // close function, such as this one.
    context.callOnClose(this);
    Object.keys(strings).forEach(key=>{
      let msg=context.extension.localeData.localizeMessage(key);
      strings[key]=msg;
    });
		this.getAddon();

    return {
      cs2c: {
        migratePrefs: async function() {
					registerListener();

          let mig=new Object;
          let b=Services.prefs.getBranch("extensions.copysent2current.");
          let prefs=b.getChildList("");
          let count=prefs.length;
          if (count) {  // else: fresh install or already migrated
            prefs.forEach(prefname=>{
							if (prefname!="version"
									&& prefname!="lastusedlength"
									&& prefname!="lastuseduri"
									&& prefname!="lastuseduri.sav"
									&& prefname!="addheight"
									&& prefname!="nomovetrash"
									&& prefname!="accesskey_send"
									&& prefname!="accesskey_lastused"
									&& prefname!="TEST"
							) {
								let t=b.getPrefType(prefname);
								let pref;
								if      (t==Services.prefs.PREF_STRING) pref=b.getCharPref(prefname, null);
								else if (t==Services.prefs.PREF_INT)    pref=b.getIntPref(prefname, null);
                else                                    pref=b.getBoolPref(prefname, null);
								if (pref!==null) {
									mig[prefname]=pref;
								}
							}
            });
            b.deleteBranch("");     // migrated!
						b=Services.prefs.getBranch("extensions.copysent2current@ggbs.de.");
            b.deleteBranch("");

let gBase=0x100;
let gSentAlso=0x10;
let gTrash=0x20;
let gDefSent=0x1;
            b=Services.prefs.getBranch("mail.identity.default.");
            let fcc_default=b.getBoolPref('fcc', null);
            for (let account of MailServices.accounts.accounts) {
							let key = account.key;
							let identity=account.defaultIdentity;
//if (!identity) debug('account without identity:'+key);
              if (identity) {
                let pref=identity.fccFolderPickerMode;
  //              let dofcc=identity.doFcc;
                mig[key]=!!(pref>=gBase);
                if (mig[key]) {
                  mig[key+'_curorsent']=pref&gDefSent?'sent':'current';
                  mig[key+'_sentalso']=!!(pref&gSentAlso);
                  mig[key+'_totrash']=!!(pref&gTrash);
                }

                //remove cs2c's values from all identities
                for (let identity of account.identities) {
                  identity.fccFolderPickerMode=identity.fccFolderPickerMode&1;
                }
              }
						}
          }
          return mig;
        },
/////////////////////////////////////////////////////////////////////////
				setPrefs: function(theprefs, changedPref) {
          //prefs=theprefs;   //this is only a reference with might get dead
          prefs=Object.assign({}, theprefs);  //no deep cloning
debug('SetPrefs: changed Pref '+changedPref+' to '+prefs[changedPref]);
				},
/////////////////////////////////////////////////////////////////////////
				getFcc: async function() {	//called from options.js
          let fcc={};
          for (let account of MailServices.accounts.accounts) {
            let key = account.key;
            let identity=account.defaultIdentity;
//if (!identity) debug('account without identity:'+key);
            if (identity) {
              fcc[key]=identity.doFcc;
            }
          }
//debug('getFcc: returned '+JSON.stringify(fcc));
          return fcc;
				},
/////////////////////////////////////////////////////////////////////////
        setFcc: async function(wid, identityKey) {	//called from background if messenger.compose.onBeforeSend
debug("setFcc started: wid="+wid);
					let win=Services.wm.getOuterWindowWithId(wid);
					win.CS2C_SENDDONE=true;
/* This is ...
          let identity=MailServices.accounts.getIdentity(identityKey);
          let akey=null;
          for (let account of MailServices.accounts.accounts) {
            akey=account.key;
            if (account.identities.find(id => id.valid && id.key == identityKey))
              break;
            akey=null;
          }
debug('selected identity='+identityKey+' '+identity+' account='+akey);
*/
/* ... identical to this
let cidentity=win.getCurrentIdentity();
let caccount=win.getCurrentAccountKey();
debug('from window identity='+identity.key+' '+' account='+caccount);
*/

          //check currently selected identity
          let identity=MailServices.accounts.getIdentity(identityKey);
debug(' selected identity is '+identityKey+' '+identity.identityName);
          //identity might have been changed by user
          if (!identity.doFcc) debug(' -- doFcc disabled!');

          let moveToURI='';
          let picker=win.document.getElementById('fccFolderPicker');
          if (picker===null) return true;   // account not enabled for cs2c, send message
          let account=picker.getAttribute('account'); 
//TODO: this the account the compose window was opened with, this might have been changed by user
debug('use account '+account);
          if (prefs[account]) {
            let fcc=picker.getAttribute('uri');
            let sentFolder=picker.getAttribute('sent'); //saved instead of a global var
            let origURI=picker.getAttribute('origuri'); //saved instead of a global var
debug('from picker: fcc='+fcc+' sentFolder='+sentFolder);

            let msgCompFields = win.gMsgCompose.compFields;
debug('vorher: fcc='+msgCompFields.fcc+' fcc2='+msgCompFields.fcc2);

            if (fcc!='nocopy://') {
              moveToURI=fcc;
              //Mark folder for most recently used menu
              let time=Math.floor(Date.now() / 1000).toString();
              let folder=MailUtils.getExistingFolder(fcc);
              folder.setStringProperty('MRMTime', time);
            } else if (prefs[account+'_totrash']) {    //nocopy is copy to trash
                //find the Trash folder
              let trashFolder;
 //             let account=MailServices.accounts.getAccount(account);
 //             let identity=account.defaultIdentity;
debug('nocopy to trash using account: '+account);
              let trashFolderURIs = new Array(sentFolder, 'mailbox://nobody@Local%20Folders');
                  //first try trash of current identity, else fallback to trash of 'Local Folders'
              for (let i=0; i<trashFolderURIs.length; i++) {
                let trashFolderURI=trashFolderURIs[i];
                let folder=MailUtils.getExistingFolder(trashFolderURI);
                let rootFolder = folder.rootFolder;
                trashFolder = rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
                if (trashFolder) break;
              }
debug('trash folder: '+trashFolder.URI);
          
              if (trashFolder) {
                fcc=trashFolder.URI;
                moveToURI=prefs['noMoveTrash']?'':trashFolder.URI;
              } else {
                console.error('CopySent2Current: '+strings['NoTrashFolder']);
                fcc=sentFolder;
                moveToURI=sentFolder;
              }
            }

            //No need to check anything:
            //	- if doFCC not set, setting fcc will be ignored
            //	- if current folder is an account or news:, setting fcc will be ignored and the
            //			the default sent folder will be used
            //	- if current folder is a virtual folder, an errormessage is shown
debug("set fcc to "+fcc);
            msgCompFields.fcc=fcc;

            if (msgCompFields.fcc.substring(0,4)=='owl:') {
              //see mail from László Vági <laszlo.vagi@ericsson.com> (30.10.2019)
              // Problem if 'Eule for Exchange' is installed
              debug('schema owl: detected (Eule for Exchange)');
            } else if (msgCompFields.fcc2) {
              // fcc2 might contain a folder selected via menu Options/Send a copy to
              debug('fcc2 already set to '+msgCompFields.fcc2+' by menu "Options/Send a copy to"');
            } else if (prefs[account+'_sentalso'] && msgCompFields.fcc != sentFolder) {
              // also to sent folder
              if (msgCompFields.fcc=='nocopy://') {
                msgCompFields.fcc = sentFolder;
              } else {
                msgCompFields.fcc2 = sentFolder;
              }
            }
            if (msgCompFields.fcc2 && msgCompFields.fcc2.substr(0,7)!='imap://' &&  // if sent folder is local
                msgCompFields.fcc.substr(0,7)=='imap://') {   // and fcc folder is remote
              // since fcc2 is only performed when fcc succeeded, we want to be sure
              // that the 'easier'(=copy to a local folder) is done first
              let fcc2=msgCompFields.fcc2;
              msgCompFields.fcc2 = msgCompFields.fcc;
              msgCompFields.fcc  = fcc2;
            }
debug('setFcc finally: fcc='+msgCompFields.fcc+' fcc2='+msgCompFields.fcc2);

            //Move message if requested and appropriate
            //the message will be moved even if the send fails or gets aborted :-(
            if (gAllowMove && moveToURI && win.document.getElementById('movemessage').checked) {
        debug('MoveMessage: delayed move from '+origURI+' to '+moveToURI);
              win.setTimeout(MoveMessage, 100, origURI, moveToURI);
            } else {
              debug('MoveMessage: not called');
            }
if (prefs.chooseBehindTest) {
/* Test the choose-after-send popup */
	let m3p=Services.wm.getMostRecentWindow("mail:3pane");
let gDefaultLabel='';
let gDefaultURI='';
let gSentLabel='';
let gSentURI='';
let gAllowMove=true;
//  var chooser=m3p.openDialog("chrome://copysent2current/content/chooser.xhtml","cs2c_chooser",
  var chooser=m3p.openDialog(context.extension.rootURI.resolve("cs2c_chooser.html"),"cs2c_chooser",
      'chrome=yes,modal=yes,titlebar=yes,alwaysRaised=yes,dialog=yes,close=no',//,left='+left+',top='+top,
      gDefaultLabel, gDefaultURI, gSentLabel, gSentURI, gAllowMove);
  var targeturi=picker.getAttribute("uri");
debug("TARGET: "+targeturi);
return false;	//do not send message
}
          }
          else debug('account not enabled for cs2c');

if (prefs['test']) debug('test is set, prevent sending');
					return prefs['test']?false:true;			//true to send, false to cancel
        },
/////////////////////////////////////////////////////////////////////////
        addMenu: async function(wid) {		//called from background if messenger.windows.onCreated
debug("addMenu started wid="+wid);
					let win=Services.wm.getOuterWindowWithId(wid);
					sipMenu(win);
				}
      }
    };
  }
  close() {
    // This function is called if the extension is disabled or removed, or Thunderbird closes.
    // We registered it with callOnClose, above.
    debug("closing");
  }
  async getAddon() {
    let addOn=await AddonManager.getAddonByID("copysent2current@ggbs.de");
    let console = Services.console;
    let app = Services.appinfo;
    console.logStringMessage('CopySent2Current: '+addOn.version+' on '+app.name+' '+app.version);
  }

};

////////////////////////////////////////////////////////////////////////

var gDefFolder=null;  //current or sent folder, depending on pref
var gDefLabel=null;
var gSentFolder=null;
var gSentLabel=null;
var gCurFolder=null;
var gCurLabel=null;
var gAccount=null; //{};
var gOrigURI=null;

function getFolders(cw) {
      //gOrigURI: MessageURI if its a reply or some draft/template message
    gOrigURI=cw.gMsgCompose.originalMsgURI;
    let origType=cw.gComposeType;

/*beispiel:
	let msgCompFields = cw.gMsgCompose.compFields;
	let identity=cw.getCurrentIdentity();
	let origMsgURI=cw.gMsgCompose.originalMsgURI;	//"" if new, else "imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX#53070"
	let composeType=cw.gComposeType;								//0 if new, 6 for reply
*/

    //check, if this is really a message uri
    //(otherwise it might be a mail attachment which can't be moved)
    let messenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
        QueryInterface(Components.interfaces.nsIMessenger);
		let isMsgUri;
    try {
      //this will fail, if its not a message uri
      let mh = messenger.messageServiceFromURI(gOrigURI).messageURIToMsgHdr(gOrigURI);
      isMsgUri=true;
    } catch(e) {
      isMsgUri=false;
    }
    gAllowMove=gOrigURI&&isMsgUri && origType!=9/*draft*/ && origType!=10/*template*/;

//??    document.getElementById('fccMenu').disabled=true;

    let state='';
    let identity=cw.getCurrentIdentity();
    gAccount=cw.getCurrentAccountKey();
//    if (identity.doFcc && identity.fccFolderPickerMode>=gBase) {
debug('identity='+identity.key+' .doFcc='+identity.doFcc+' account='+gAccount+' useAccount='+prefs[gAccount]);
    if (!identity.doFcc || !prefs[gAccount]) return false;
      state+=' docopy';
      gSentFolder=identity.fccFolder;
      gSentLabel=prettyFolderName(MailUtils.getExistingFolder(gSentFolder));

      if (gOrigURI) {                                 // Is Reply
        //this could be a reply or a draft/template message
        state+=' reply/draft/template';
        let messenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
            QueryInterface(Components.interfaces.nsIMessenger);
        if (origType==9/*draft*/ || origType==10/*template*/) {
          state+=' draft';

          //try to extract FCC. Would be nice, if i could extract the header
          //unfortunately the following does not work:
          // (but see 'info' add-on, function getMimeHeaders)
          /*
          var uriToOpen=gOrigURI+'?fetchCompleteMessage=true';
          let aUrl={};
          messenger.messageServiceFromURI(gOrigURI).GetUrlForUri(uriToOpen, aUrl, null);
          aUrl=aUrl.value;
          var fUrl=aUrl.QueryInterface(Components.interfaces.nsIMsgMailNewsUrl);
          var mh=fUrl.mimeHeaders;  //--- this fails
          var fcc=mh.extractHeader("fcc", false);
          */
          //therefore i read the content of the message and parse it
          var MsgService = messenger.messageServiceFromURI(gOrigURI);
          var MsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"]
                               .createInstance();
          var MsgStrem_Inputstream = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
          var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"]
                               .createInstance();
          var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
          ScriptInputStream.init(MsgStream);
          try {
            MsgService.streamMessage(gOrigURI,MsgStream, null, null, false, null);
          } catch (e) {Components.utils.reportError('CopySent2Current: compose.js: '+e); }
          ScriptInputStream.available();
          var content='';
          var found=null;
          while (ScriptInputStream.available()) {
            content+=ScriptInputStream.read(512);
            if ((found=content.match(/^FCC:\s*(.*)$/m))) break;
            if (content.search(/\r\n\r\n/m)>=0) break;
          }
          ScriptInputStream.close();
          var fcc=found?found[1]:'';

          if (fcc) {
            state+=' withFCC';
            curFolder=MailUtils.getExistingFolder(fcc);
            if (!curFolder) {
              debug('state=draft: fcc folder for "'+fcc+'" not found', true);
              curFolder=MailUtils.getExistingFolder(gSentFolder); //default to the fcc folder (or the default folder?)
            }
          } else {
            //no fcc. Might be a template via 'Edit as new'
            state+=' withoutFCC';
            var msgHdr=messenger.msgHdrFromURI(gOrigURI);  //nsIMsgDBHeader
            curFolder=msgHdr.folder;
          }
        } else {
        //for replies, current folder is the folder of the message replied to!
          state+=' reply';
          var msgHdr=messenger.msgHdrFromURI(gOrigURI);  //nsIMsgDBHeader
          curFolder=msgHdr.folder;
        }
      } else if (cw.gMsgCompose.compFields.fcc) {    // fcc set by -compose parameter
        debug("have fcc="+cw.gMsgCompose.compFields.fcc);
        state+=' haveFCC';
        curFolder=MailUtils.getExistingFolder(cw.gMsgCompose.compFields.fcc);
        if (!curFolder) {
          debug("bad -compose parameter fcc="+cw.gMsgCompose.compFields.fcc+
                                  " - defaulting to sent folder", true);  //since no current folder
          curFolder=MailUtils.getExistingFolder(gSentFolder); //default to the fcc folder (or the default folder?)
        }
      } else { //Must be a new message. Try to find the currently selected folder
        state+=' newMsg';
        var mailWindow = cw.getMostRecentMailWindow();	//Services.wm.getMostRecentWindow("mail:3pane");
        if (mailWindow) {     //else: no main window
          state+=' window';
          var View=mailWindow.gDBView;  //nsIMsgDBView
          if (View) {         // else: no folder selected!
            state+=' view';
            curFolder=View.msgFolder;
            if (!curFolder) { //Probably a gloda window
              debug('state=view: fcc folder not found, probably a gloda window', true);
              curFolder=MailUtils.getExistingFolder(gSentFolder); //default to the fcc folder (or the default folder?)
            }
            // wenn 'new' geklicked
            //   wenn tab mit message aktiv, ist das der folder der message,
            //     nicht der folder aus dem 3pane tab
            //   aus einem der neuen suchergebnis fenster gibts zwar den view,
            //     aber der hat keinen folder
            //   wenn message in eigenem Window (vom 3pane tab aus), sollte eventuell der folder
            //     der angezeigten message genommen werden, nicht aus 3pane window (kein Ahnung wie)
            //   wenn message in eigenem Window (aus suchergebnis heraus),
            //     gibts keinen folder
          } else {  //probably in the accountCentral Pane
            state+=' central';
            curFolder=MailUtils.getExistingFolder(gSentFolder); //default to the fcc folder (or the default folder?)
          }
        } else {  //probably in a global search window
          state+=' noWindow';
          curFolder=MailUtils.getExistingFolder(gSentFolder); //default to the fcc folder (or the default folder?)
        }
      }
      state+=' check';

      if (curFolder) {
        if (curFolder.canFileMessages) {   // not news or virtual Folder
          gCurFolder=curFolder.URI;
          gCurLabel=prettyFolderName(curFolder);
        } else {  // no usable current folder
          gCurFolder=null;
          curFolder=null;
        }
      }

      if (prefs[gAccount+'_curorsent']=='sent') {  	      // Sent folder is default
        gDefFolder=gSentFolder;
        gDefLabel=gSentLabel;
        state+=' def-is-sentfolder';
      } else if (curFolder) {                         // else current Folder is default
        gDefFolder=gCurFolder;
        gDefLabel=gCurLabel;
        state+=' def-is-current-folder';
      } else {                                        //last resort: preselect last used folder
        gDefFolder=gSentFolder;
        gDefLabel=gSentLabel;
        state+=' must-use-sentfolder';
      }

      state+=' gDefFolder='+gDefFolder;
      state+=' gSentFolder='+gSentFolder;
      state+=' gCurFolder='+gCurFolder;
      //in TB68, server.prettyName is just 'ggbs', in TB71 its G.Gersdorf@ggbs.de

debug('State: '+state);
//!behind      if (!de_ggbs_cs2c.mc.CS2C.chooseBehind) {
//TODO:
//When called via -compose parameter, the popup misses the folder hierarchy :-(
//which seems to be a TB problem. With choosebehind, its ok.
debug('set menu to: '+gDefLabel+' '+gDefFolder);

/* Test the choose-after-send popup
var prefB = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch("extensions.copysent2current.");
if (prefB.getBoolPref("TEST")) {
  var chooser=window.openDialog("chrome://copysent2current/content/chooser.xhtml","cs2c_chooser",
      'chrome=yes,modal=yes,titlebar=yes,alwaysRaised=yes,dialog=yes,close=no',//,left='+left+',top='+top,
      gDefLabel, gDefFolder, gSentLabel, gSentFolder, gAllowMove);
  var targeturi=picker.getAttribute("uri");
de_ggbs_cs2c.mc.log("TARGET: "+targeturi);
}
*/
//!behind      }
  return true;
}

function sipMenu(cw) {
	if (!getFolders(cw)) return;
	let doc=cw.document;

	let cwtb=doc.getElementById('headers-box');
	let tbox=doc.createElement('toolbox');
	tbox.id='cs2c-box';
	tbox.setAttribute('mode','icons');
  tbox.style.display='-moz-box';
	let tbar=doc.createElement('toolbar');
	tbar.id='cs2c-bar';
	tbar.setAttribute('class','chromeclass-toolbar');
	tbar.setAttribute('is','customizable-toolbar');
	tbar.setAttribute('persist','collapsed');
	tbar.setAttribute('customizable','true');
	tbar.setAttribute('nowindowdrag','true');
	tbar.style.display='ruby';

  let ti=doc.createElement('toolbaritem');
	let label=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'label');
	label.value=strings['copysent2choose_label'];
	label.setAttribute('accessKey', strings['copysent2choose_accesskey']);
	label.setAttribute('control','fccFolderPicker');  //TODO: working?
	ti.appendChild(label);
	tbar.appendChild(ti);

  ti=doc.createElement('toolbaritem');
	let ml=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
    'menulist');
	ml.id='fccFolderPicker';
	ml.setAttribute('label', gDefLabel);
	ml.setAttribute('lastlabel', gDefLabel);
	ml.setAttribute('uri', gDefFolder);
	ml.setAttribute('sent', gSentFolder);    // save for use when sending
	ml.setAttribute('account', gAccount);    // save for use when sending
	ml.setAttribute('origuri', gOrigURI);    // save for use when sending
	ml.setAttribute('onfocus', 'event.target.firstChild.openPopup();');
	ml.setAttribute('disableonsend','true');
	ml.setAttribute('displayformat','verbose');
	ml.setAttribute('sizetopopup','always');
	ml.style.minWidth='10em';

	let fmp=doc.getElementById('fccMenuPopup');	//Menu 'Optionen'->'Kopie ablegen in'
	let menu=fmp.cloneNode(true);
	menu.id='cs2c-selector';
	let w=Services.wm.getMostRecentWindow("mail:3pane");	//any mail:3pane does it
	let v=w?w.document.getElementById('mailContext-fileHereMenu'):null;
	menu.setAttribute('showRecent', 'true');
	menu.setAttribute('recentLabel', v?v.getAttribute('recentLabel'):'Last');
	menu.setAttribute('recentAccessKey', v?v.getAttribute('recentAccessKey'):'L');
	menu.setAttribute('showFavorites', 'true');
	menu.setAttribute('favoritesLabel', v?v.getAttribute('favoritesLabel'):'Favorites');
	menu.setAttribute('favoritesAccessKey', v?v.getAttribute('favoritesAccessKey'):'F');

  let mfc=menu.firstChild;
	let mi=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
    'menuitem');
  mi.setAttribute('label', gDefLabel);
  mi.setAttribute('uri', gDefFolder);
  mi.setAttribute('class', 'folderMenuItem menuitem-iconic');
  mi.setAttribute('accesskey', prefs['accesskey_default']||'%');  //was ??, but bad for ATN
  menu.insertBefore(mi, mfc);
  if (!prefs[gAccount+'_sentalso'] && gDefFolder!=gSentFolder) {
    mi=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
      'menuitem');
    mi.setAttribute('label', gSentLabel);
    mi.setAttribute('uri', gSentFolder);
    mi.setAttribute('class', 'folderMenuItem menuitem-iconic');
    mi.setAttribute('accesskey', prefs['accesskey_sent']||'!');  //was ??, but bad for ATN
    menu.insertBefore(mi, mfc);
  } else if (gDefFolder==gSentFolder && gCurFolder && gCurFolder!=gSentFolder) {
    mi=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
      'menuitem');
    mi.setAttribute('label', gCurLabel);
    mi.setAttribute('uri', gCurFolder);
    mi.setAttribute('class', 'folderMenuItem menuitem-iconic');
    mi.setAttribute('accesskey', prefs['accesskey_sent']||'!');  //was ??, but bad for ATN
    menu.insertBefore(mi, mfc);
  }
	mi=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
    'menuitem');
  mi.setAttribute('label', strings['copysent2current_nocopy']);
  mi.setAttribute('uri', 'nocopy://');
  mi.setAttribute('class', 'folderMenuItem menuitem-iconic');
  mi.setAttribute('accesskey', prefs['accesskey_nocopy']||'-');  //was ??, but bad for ATN
  menu.insertBefore(mi, mfc);
	mi=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
      'menuseparator');
  menu.insertBefore(mi, mfc);

	ml.addEventListener("command", function(ev) {
		let mi=doc.getElementById('fccFolderPicker');
    let t=ev.target;
    let uri=t.getAttribute('uri');
    let name=t.label;
    if (!uri) {
      let folder=t._folder;
      if (!folder || folder.isServer)  {
        //might happen with arrow key navigation:
//debug('menu changed: no folder or is server'); 
        mi.setAttribute('label', mi.getAttribute('lastlabel'));
        return;
      }
      uri=folder.URI;
      name=prettyFolderName(folder);
    }
		debug('menu changed: '+name+' '+uri); 
		mi.setAttribute('label', name);
		mi.setAttribute('uri',uri);
		mi.setAttribute('lastlabel',name);
	} );
	ml.addEventListener("keydown", function(ev) {
//console.log('key pressed '+ev.keyCode);
    if (ev.keyCode==32 /* space*/ || ev.keyCode==13 /*enter */)
      ev.target.firstChild.openPopup();
	} );
	ml.appendChild(menu);
	ti.appendChild(ml);
	tbar.appendChild(ti);

	if (gAllowMove) {
		let cb=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'checkbox');
		cb.id='movemessage';
		cb.label=strings['moveoriginal_label'];
		cb.accessKey=strings['moveoriginal_accesskey'];
    cb.checked=prefs['movemessage'];
		tbar.appendChild(cb);
	}

	tbox.appendChild(tbar);
	cwtb.appendChild(tbox);
}

//from chrome/messenger/content/messenger/amUtils.js
function prettyFolderName(folder) {
	if (!folder) return 'unknown';
  if (folder.isServer) {
    return folder.prettyName;
  }

	return sb4f.formatStringFromName("verboseFolderFormat", [
		folder.prettyName,
		folder.server.prettyName,
	]);
}

function MoveMessage(msguri, folderuri) {
debug('MoveMessage: to '+folderuri);
  try {
    //see https://developer.mozilla.org/en/Extensions/Thunderbird/HowTos/Common_Thunderbird_Use_Cases/View_Message
    var messenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
        QueryInterface(Components.interfaces.nsIMessenger);
    try {
      var msgHdr = messenger.messageServiceFromURI(msguri).messageURIToMsgHdr(msguri);
    } catch(e) {  //probably a folder uri in case of mail attachment
      //in this case its impossible to move this message or to find the containing message
      // (since msgHdr.folder is null)
      return;
    }

    if (msgHdr.folder.URI != folderuri) {
      var folder=null;
      folder=MailUtils.getExistingFolder(folderuri);
      if (!folder) {
        debug('target folder for "'+folderuri+'" not found');
        return;
      }
      debug('MoveMessage: apparently to '+folder.URI);
      var copyService = MailServices.copy;
      var msgs=Components.classes["@mozilla.org/array;1"].
          createInstance(Components.interfaces.nsIMutableArray);
      msgs.appendElement(msgHdr, false);
      copyService.CopyMessages(msgHdr.folder, msgs, folder,
               true /* isMove */, null/*listener*/, null /*msgWindow*/, true /* allow undo */);
    } else {
debug('MoveMessage: Message not moved since target is same folder');
    }
  } catch(e) {
    Components.utils.reportError('CopySent2Current: Move of original message failed: '+e);
  }
}

let sendMessage={
	handleEvent: function(e) {	//Fires after messenger.compose.onBeforeSend
		let msgWin=e.view;
		if (msgWin.CS2C_SENDDONE) {
debug('compose-send-message fired but onBeforeSend was called');
			return;
		}
		//let deliverMode=msgWin.gMsgCompose.deliverMode;
		//the test for deliverMode doesn't seems to be reliable
//debug('compose-send-message fired deliverMode='+deliverMode+' (==4,5,7?)');
    //if (deliverMode==Ci.nsIMsgCompDeliverMode.SaveAsDraft ||				//4
    //    deliverMode==Ci.nsIMsgCompDeliverMode.SaveAsTemplate ||			//5
    //    deliverMode==Ci.nsIMsgCompDeliverMode.AutoSaveAsDraft) {		//7
        //for drafts/template save current fcc selection for later use 
			let picker=msgWin.document.getElementById('fccFolderPicker');
			if (!picker) {
debug('account not enabled for CS2C');
				return;
			}
			let fcc=picker.getAttribute("uri");
debug('set fcc='+fcc);
			msgWin.gMsgCompose.compFields.fcc=fcc;
		//}
	}
}
function registerListener() {
debug('registering window listener');
  ExtensionSupport.registerWindowListener("CopySend2Current", {
  /**/
    chromeURLs: [
      "chrome://messenger/content/messengercompose/messengercompose.xhtml"
    ],
  /**/
    onLoadWindow: function(w) {
debug('messengercompose loaded, initialize compose-send-message');
			w.addEventListener('compose-send-message', sendMessage, true);
		},
    onUnloadWindow: function(w) {
debug('messengercompose unloaded');
			w.removeEventListener('compose-send-message', sendMessage, true);
		}

	});
}


function test(wid, cw) {
/* TEST */
//	let win=Services.wm.getOuterWindowWithId(wid);	// ==cw
	let msgCompFields = cw.gMsgCompose.compFields;
	let identity=cw.getCurrentIdentity();
	let accountkey=cw.getCurrentAccountKey();
  let account=MailServices.accounts.getAccount(accountkey);
	let origMsgURI=cw.gMsgCompose.originalMsgURI;	//"" if new, else "imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX#53070"
	let composeType=cw.gComposeType;								//0 if new, 6 for reply
/*
for (const prop in identity) {
	console.log(`  identity: ${prop} ${identity[prop]}`);
}
*/
debug("TEST");
debug("identity: "+identity+" - "+identity.key);
debug("account: "+account+" - "+account.key);
debug("originalMsgURI="+origMsgURI);
debug("gComposeType="+composeType);


/*
					if (!identity.doFcc) {
						debug("no fcc whatsoever for id "+identity.key+" ("+identity.identityName+")");
						return;
					}
*/
debug("fcc? folderpicker:"+identity.fccFolderPickerMode+" replyfollows:"+identity.fccReplyFollowsParent);
//identity.fccReplyFollowsParent used in comm/mailnews/compose/src/nsMsgSend.cpp
/*
  let gBase=0x100;				//to current folder
  let gDefSent=0x1;				//to sent folder
  let gSentAlso=0x10;			//also to sent folder
  let gTrash=0x20;				//nocopy is copy to trash
*/

/* */
					let state="";
          state+=' newMsg';
					let curFolder='';
  	      let mailWindow = Services.wm.getMostRecentWindow("mail:3pane");	//ist nicht 'win' von oben!
debug("mailWindow: "+mailWindow);
  	      if (mailWindow) {     //else: no main window
            state+=' window';
  	        let View=mailWindow.gDBView;  //nsIMsgDBView
debug("View: "+View);
//no View if account is active
  	        if (View) {         // else: no folder selected!
              state+=' view';
  	          curFolder=View.msgFolder;
//imap://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX
debug("curFolder from win: "+curFolder.URI);
// ist INBOX bei virt. Folder!
/*
for (const prop in curFolder) {
	if (prop=="firstNewMessage") continue;
	//console.log(`  curFolder: prop: ${prop}`);
	console.log(`  curFolder: ${prop} ${curFolder[prop]}`);
//error if prop==firstNewMessage
}
*/
//								INBOX	virtFolder
//canFileMessages true	true
}}
				let curFolderURI=curFolder.URI;
//debug("gDefFolder="+gDefFolder);

	//msgCompFields.fcc is empty
	//msgCompFields.fcc2 is empty or contains folder from menu "Optionen/Kopie ablegen unter"
debug("fcc war: "+msgCompFields.fcc);
debug("fcc2 war: "+msgCompFields.fcc2);

//if (identity.fccReplyFollowsParent) ...


}

let debugcache='';
function debug(txt, force) {
	if (force || prefs) {
		if (force || prefs.debug) {
			if (debugcache) console.log(debugcache); debugcache='';
			console.log('CS2C: '+txt);
		}
	} else {
		debugcache+='CS2C: '+txt+'\n';
	}
}

