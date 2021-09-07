const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const {AddonManager} = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
const {MailUtils} = ChromeUtils.import("resource:///modules/MailUtils.jsm");	//kann ggf. weg
const {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm");	//kann ggf. weg
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
const Ci=Components.interfaces;
const Cc=Components.classes;

let sb4f=Services.strings.createBundle("chrome://messenger/locale/folderWidgets.properties");
var HTB={};
var gContext;
var chromeHandle=null;
var appVersion;

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

nsIMsgCompType, see comm\mailnews\compose\public\nsIMsgComposeParams.idl
    const long New                      = 0;
    const long Reply                    = 1;
    const long ReplyAll                 = 2;
    const long ForwardAsAttachment      = 3;
    const long ForwardInline            = 4;
    const long NewsPost                 = 5;
    const long ReplyToSender            = 6;
    const long ReplyToGroup             = 7;    // reply to Newsgroup
    const long ReplyToSenderAndGroup    = 8;
    const long Draft                    = 9;
    const long Template                 = 10;  // New message from template.
    const long MailToUrl                = 11;
    const long ReplyWithTemplate        = 12;
    const long ReplyToList              = 13;
    const long Redirect                 = 14;
    const long EditAsNew                = 15;
    const long EditTemplate             = 16;
*/

var prefs;

var cs2c = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {   //not called it add-on not loaded from .xpi
debug('onStartup');
  }

  onShutdown(isAppShutdown) {
debug('onShutdown isAppShutdown='+isAppShutdown);
			if (chromeHandle) chromeHandle.destruct();
			chromeHandle = null;
			ExtensionSupport.unregisterWindowListener("CopySent2Current");
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
		gContext=context;
    // To be notified of the extension going away, call callOnClose with any object that has a
    // close function, such as this one.
    context.callOnClose(this);
		Services.scriptloader.loadSubScript(context.extension.getURL("hackToolbarbutton.js"), HTB, "UTF-8");
    Object.keys(strings).forEach(key=>{
      let msg=context.extension.localeData.localizeMessage(key);
      strings[key]=msg;
    });
		this.getAddon();
		if (!chromeHandle) registerChromeUrl(context, [ ["content", "copysent2current", "content/"] ]);

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
        setFcc: async function(wid, identityKey, preSelect) {	//called from background if messenger.compose.onBeforeSend
debug("setFcc started: wid="+wid+' identityKey'+identityKey+' preSelect='+preSelect);
					let win=Services.wm.getOuterWindowWithId(wid);
debug('cs2c_params='+JSON.stringify(win.cs2c_params));

          let moveToURI=setFcc(win, identityKey, preSelect, true);

if (prefs.test) console.warn('CS2C: test - do not send message');
if (prefs.test) return false;	//do not send message

					//Move message if requested and appropriate
					//the message will be moved even if the send fails or gets aborted :-(
debug('MoveMessage='+win.cs2c_params.allowMove+' moveToURI='+moveToURI);
					if (win.cs2c_params.allowMove && moveToURI) {
            let origURI=win.cs2c_params.origURI;
debug('MoveMessage: delayed move from '+origURI+' to '+moveToURI);
            // with 'send later', win vanishes too quick
            let w = Services.wm.getMostRecentWindow("mail:3pane");
            if (!w) w=win;
						w.setTimeout(MoveMessage, 100, origURI, moveToURI);
					} else {
						debug('MoveMessage: not called');
					}

					return true;			//true to send, false to cancel
        },
/////////////////////////////////////////////////////////////////////////
        addMenu: async function(wid) {		//called from background if messenger.windows.onCreated
debug("addMenu started wid="+wid+' prefs='+prefs);
					let win=Services.wm.getOuterWindowWithId(wid);
					win.cs2c_params={};	//for window specific global parameters
					if (!getFolders(win)) return false;	//cs2c not enabled for account
					if (!('chooseBehind' in prefs) || !prefs.chooseBehind) {
debug('show chooser');
						fpMenu(win);
            setFcc(win, '', '', false); //set fcc if later saved as draft or template
					}
else debug('dont show chooser chooseBehind='+prefs.chooseBehind);
					if (prefs['use_HTB']) {
debug('hack Send button');
						let btniNC=HTB.hackToolbarbutton.addMenuitem(win, "button-send", "cs2c_sendbutton_sendnocopy",
							{ label: gContext.extension.localeData.localizeMessage("sendNoCopyButton_label"),
								"oncommand": "document.getElementById('cs2c_menu_sendnocopy').click();" });
						let btniSF=HTB.hackToolbarbutton.addMenuitem(win, "button-send", "cs2c_sendbutton_send2sentfolder",
							{ label: gContext.extension.localeData.localizeMessage("sendCopy2SentButton_label"),
								"oncommand": "document.getElementById('cs2c_menu_send2sent').click();" });
					}
					if (!('use_TBB' in prefs)) {
debug('first call with use_TBB, default buttons into currentset');
						prefs['use_TBB']=true;
/* make button visible in toolbar (no: might clutter the toolbar!)
						let windowURL = "chrome://messenger/content/messengercompose/messengercompose.xhtml";
						let currentSet = Services.xulStore.getValue(windowURL, "composeToolbar2", "currentset");
debug('currentSet='+currentSet);
						if (currentSet.includes('button-send,'))	//show after send button
							currentSet=currentSet.replace('button-send,', 'button-send,cs2c_button_sendnocopy,cs2c_button_send2sentfolder,');
						else		// else append
							currentSet+=',cs2c_button_sendnocopy,cs2c_button_send2sentfolder';
debug('currentSet now='+currentSet);
						Services.xulStore.setValue(windowURL, "composeToolbar2", "currentset", currentSet);
*/
					}
					if (prefs['use_TBB']) {
debug('add toolbar buttons');
						//let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
						//timer.initWithCallback(()=>{stylesheets(win);}, 1000, Ci.nsITimer.TYPE_ONE_SHOT);
						stylesheets(win);
						let toolbox=win.document.getElementById("compose-toolbox");
						let toolbar=win.document.getElementById("composeToolbar2");
						button('cs2c_button_send2sentfolder', "sendCopy2SentButton_label", 'cs2c_menu_send2sent', win.document, toolbox, toolbar);
						button('cs2c_button_sendnocopy', "sendNoCopyButton_label", 'cs2c_menu_sendnocopy', win.document, toolbox, toolbar);
					}
					return true;
				}
      }
    };
  }
  close() {
    // This function is called if the extension is disabled or removed, or Thunderbird closes.
    // We registered it with callOnClose, above.
    debug("closing");
    Services.obs.notifyObservers(null, "startupcache-invalidate");
  }
  async getAddon() {
    let addOn=await AddonManager.getAddonByID("copysent2current@ggbs.de");
    let console = Services.console;
    let app = Services.appinfo;
    console.logStringMessage('CopySent2Current: '+addOn.version+' on '+app.name+' '+app.version);
		appVersion=app.version.replace(/^(\d+\.\d+)(\..*)?$/, '$1');
  }

};

////////////////////////////////////////////////////////////////////////
function setFcc(win, identityKey, preSelect, isSend) {
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
let cidentity=MailServices.accounts.getIdentity(win.getCurrentIdentityKey());
let caccount=win.getCurrentAccountKey();
debug('from window identity='+identity.key+' '+' account='+caccount);
*/

  //check currently selected identity
  let identity;
  if (identityKey)
    identity=MailServices.accounts.getIdentity(identityKey);
  else
    identity=MailServices.accounts.getIdentity(win.getCurrentIdentityKey());
debug(' selected identity is '+identityKey+' '+identity.identityName);
  //identity might have been changed by user
  if (!identity.doFcc) debug(' -- doFcc disabled!');

  let account=win.cs2c_params.account;
//TODO: this is the account the compose window was opened with, this might have been changed by user
debug('use account '+account);
  if (!prefs[account]) {
debug('account not enabled for cs2c');
    return true;	//send message
  }
  let moveToURI='';
  let sentFolder=win.cs2c_params.sentFolder;
  let origURI=win.cs2c_params.origURI;
  let fcc;
debug('sentFolder='+sentFolder+' origURI='+origURI);
  let doMove=(win.cs2c_params.allowMove && !prefs.chooseBehind) ?
        win.document.getElementById('movemessage').checked : false;
debug('doMove='+doMove);
  if (preSelect=='noCopy') {
    fcc="nocopy://";
debug('preselect=nocopy://');
  } else if (preSelect=='toSentFolder') {
    fcc=sentFolder;
debug('preselect='+sentFolder);
  } else if (!('chooseBehind' in prefs) || !prefs.chooseBehind) {
    let picker=win.document.getElementById('fccFolderPicker');
    if (picker===null) {
debug('fccFolderPicker is null');
      return;
    }
    fcc=picker.getAttribute('uri');
debug('from picker: fcc='+fcc);
  } else {
debug('chooseBehind');
//see https://thunderbird.topicbox.com/groups/addons/Ta8337b5f8c8012d5-M39c0a2be87e919c7e9b65ca4/webextension-how-to-send-data-to-created-window-and-back-as-with-legacy-window-open
    let chooser=win.openDialog(
      "chrome://copysent2current/content/cs2c_chooser.xhtml",	// with registerChromeUrl
      "_blank",
      "chrome,dialog,modal,centerscreen,titlebar=yes,close=yes,width=200", //resizable,minimizable,titlebar,close",		//features
      win.cs2c_params, prefs, strings
    );
    if (!('targeturi' in win.cs2c_params)) {
debug('chooseBehind: send was canceled');
      return false;		//send was canceled, do not send message
    }
    fcc=win.cs2c_params.targeturi;
    doMove=win.cs2c_params.move;
debug('target: '+fcc+' doMove='+doMove);
  }

  let msgCompFields = win.gMsgCompose.compFields;
debug('vorher: fcc='+msgCompFields.fcc+' fcc2='+msgCompFields.fcc2);

  if (fcc!='nocopy://') {
    moveToURI=fcc;
    //Mark folder for most recently used menu (uses mail.folder_widget.max_recent)
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
debug(' for message '+msgCompFields.subject);
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
    if (isSend) { //set fcc2 only if its the real send and not a save to draft (BUG xxxxxxx)
      if (msgCompFields.fcc=='nocopy://') {
        msgCompFields.fcc = sentFolder;
      } else {
        msgCompFields.fcc2 = sentFolder;
      }
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
  if (!doMove) moveToURI=null;
  return moveToURI;
}

function getFolders(cw) {
	let state='';
  let curFolder=null;
	let identity=MailServices.accounts.getIdentity(cw.getCurrentIdentityKey());	//getCurrentIdentity();
	cw.cs2c_params.account=cw.getCurrentAccountKey();
//    if (identity.doFcc && identity.fccFolderPickerMode>=gBase) {
debug('identity='+identity.key+' .doFcc='+identity.doFcc+' account='+cw.cs2c_params.account+' useAccount='+prefs[cw.cs2c_params.account]);
  if (!prefs.hasOwnProperty(cw.cs2c_params.account)) {
    prefs[cw.cs2c_params.account]=true;
debug('pref for account '+cw.cs2c_params.account+' not set, assume true for new accounts');
  }
	if (!identity.doFcc || !prefs[cw.cs2c_params.account]) return false;		//cs2c not enabled

      //origURI: MessageURI if its a reply or some draft/template message, else empty
      // points to template folder if its a template
	cw.cs2c_params.origURI=cw.gMsgCompose.originalMsgURI;
	let compType=cw.gComposeType;
debug('origURI='+cw.cs2c_params.origURI+' composeType='+compType);

  //new message
  //  origURI:  empty
  //  draftURI: empty
  //  composeType:  0,11   Ci.nsIMsgCompType.New,.MailToUrl
  //  isMsgUri: n/a
  //reply(all)/forward(inline/attachment)
  //  origURI:  imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX#55681
  //  draftURI: empty
  //  composeType:  6,4,3,2,13   Ci.nsIMsgCompType.ReplyToSender,.ForwardInline,.ForwardAsAttachment,.ReplyAll,.ReplyToList
  //  isMsgUri: true
  //edit as new
  //  origURI:  imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX#55681
  //  draftURI: empty
  //  composeType:  15   Ci.nsIMsgCompType.EditAsNew
  //  isMsgUri: true
  //draft bearbeiten - new draft
  //  origURI:  imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX/Drafts#303
  //  draftURI: imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX/Drafts#303?fetchCompleteMessage=true
  //  composeType:  9   Ci.nsIMsgCompType.Draft
  //  isMsgUri: true (but irrelevant, since its the draft)
  //draft bearbeiten - draft from reply
  //  origURI:  imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX#55604
  //  draftURI: imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX/Drafts#315?fetchCompleteMessage=true
  //  composeType:  9   Ci.nsIMsgCompType.Draft
  //  isMsgUri: true is message still exists (but may be moved), false else
  //new message from template
  //  origURI:  imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX/Templates#26
  //  draftURI: empty
  //  composeType:  10  Ci.nsIMsgCompType.Template
  //  isMsgUri: true (but irrelevant, since its the template)
  //edit template
  //  origURI:  imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX/Templates#26
  //  draftURI: imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX/Templates#26?fetchCompleteMessage=true&edittempl=true
  //  composeType:  16  Ci.nsIMsgCompType.EditTemplate
  //  isMsgUri: true (but irrelevant, since its the template)
  //reply to opened .eml file:
  //  origURI:  file:///T:/Temp/nsemail-20.eml
  //  draftURI: empty
  //  composeType:  6   Ci.nsIMsgCompType.ReplyToSender
  //  isMsgUri: false
  //forward of opened .eml file:
  //  origURI:  mailbox:///T:/Temp/nsemail.eml?fetchCompleteMessage=true&number=0&realtype=message/rfc822
  //  draftURI: empty
  //  composeType:  4   Ci.nsIMsgCompType.ForwardInline
  //  isMsgUri: false

	cw.cs2c_params.allowMove=false; // default to false

	state+=' docopy';
	cw.cs2c_params.sentFolder=identity.fccFolder;
	cw.cs2c_params.sentLabel=prettyFolderName(MailUtils.getExistingFolder(cw.cs2c_params.sentFolder));

	if (cw.cs2c_params.origURI) {  // Is Reply/Draft/Template/EditAsNew
		state+=' reply/draft/template';

    let messenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
        QueryInterface(Components.interfaces.nsIMessenger);

		if (compType==Ci.nsIMsgCompType.Draft/*9*/ || compType==Ci.nsIMsgCompType.Template/*10*/
        || compType==Ci.nsIMsgCompType.EditTemplate/*16*/
        || compType==Ci.nsIMsgCompType.EditAsNew/*15*/) {

			state+=compType==Ci.nsIMsgCompType.Draft?' draft':
            (compType==Ci.nsIMsgCompType.EditAsNew?' editasnew':' template');

			//try to extract FCC. Would be nice, if i could extract the header
			//unfortunately the following does not work:
			// (but see 'info' add-on, function getMimeHeaders)
			/*
			var uriToOpen=cw.cs2c_params.origURI+'?fetchCompleteMessage=true';
			let aUrl={};
			messenger.messageServiceFromURI(cw.cs2c_params.origURI).GetUrlForUri(uriToOpen, aUrl, null);
			aUrl=aUrl.value;
			var fUrl=aUrl.QueryInterface(Components.interfaces.nsIMsgMailNewsUrl);
			var mh=fUrl.mimeHeaders;  //--- this fails
			var fcc=mh.extractHeader("fcc", false);
			*/
			//therefore i read the content of the message and parse it

      let draftURI=cw.gMsgCompose.compFields.draftId;   //only set on drafts and edit template
debug('draftURI='+draftURI);
      let uri=draftURI?draftURI:cw.cs2c_params.origURI;   //draftURI for drafts, origURI for templates
      let fcc=readFCC(uri);

      let origURI=cw.cs2c_params.origURI; //needed for 'withoutFCC'
      if (compType==Ci.nsIMsgCompType.Template/*10*/
        || compType==Ci.nsIMsgCompType.EditTemplate/*16*/
        || compType==Ci.nsIMsgCompType.EditAsNew/*15*/
        || draftURI.indexOf(cw.cs2c_params.origURI) === 0) {
debug('origURI is draft,template or editasnew, remove origURI');
        cw.cs2c_params.origURI=null;
      }

			if (fcc) {
				state+=' withFCC';
debug('found fcc in draft/template: '+fcc);
				curFolder=MailUtils.getExistingFolder(fcc);
				if (!curFolder) {
					debug('state=draft: fcc folder for "'+fcc+'" not found', true);
					curFolder=MailUtils.getExistingFolder(cw.cs2c_params.sentFolder); //default to the fcc folder (or the default folder?)
				}
			} else {
				//no fcc. Might be a message via 'Edit as new'
				state+=' withoutFCC';
        try {
          let msgHdr=messenger.msgHdrFromURI(origURI);  //nsIMsgDBHeader
          curFolder=msgHdr.folder;
        } catch(e) {
debug('original message no longer exists');
          cw.cs2c_params.origURI=null;
        }
			}
		} else {  // is reply
		//for replies, current folder is the folder of the message replied to!
			state+=' reply';
      try {
        let msgHdr=messenger.msgHdrFromURI(cw.cs2c_params.origURI);  //nsIMsgDBHeader
        curFolder=msgHdr.folder;
        //see comm\mailnews\base\public\nsMsgFolderFlags.idl
        let flags=Ci.nsMsgFolderFlags.Drafts|Ci.nsMsgFolderFlags.Templates;
        if (curFolder.isSpecialFolder(flags, false)) {
          let fcc=readFCC(cw.cs2c_params.origURI);
debug('is draft/template folder got fcc='+fcc);
          curFolder=MailUtils.getExistingFolder(fcc);
          if (!curFolder) {
debug('state=draft/template: fcc folder for "'+fcc+'" not found', true);
            curFolder=MailUtils.getExistingFolder(cw.cs2c_params.sentFolder); //default to the fcc folder (or the default folder?)
          }
          cw.cs2c_params.origURI=null;
        }
      } catch(e) {
        state+=' .eml';
        curFolder=MailUtils.getExistingFolder(cw.cs2c_params.sentFolder); //default to the fcc folder (or the default folder?)
        cw.cs2c_params.origURI=null;
debug('original message is file, unset origURI');
      }
		}

    if (cw.cs2c_params.origURI) {
      //check, if this is really a message uri
      //  otherwise it might be a mail attachment which can't be moved
      //  or an already deleted message
      try {
        //this throws an error, if its not a message uri or message deleted
        let mh=messenger.msgHdrFromURI(cw.cs2c_params.origURI);  //nsIMsgDBHeader
          //but message might be moved to another folder
        if (mh.messageId) {
debug('have messageId, origURI still valid')
          cw.cs2c_params.allowMove=true;
        } else {
debug('no messageId found, origURI has moved, no move')
        }
      } catch(e) {
        cw.cs2c_params.origURI=null;
debug('origURI not valid (message removed), no move');
      }
    }

	} else if (cw.gMsgCompose.compFields.fcc) {  // fcc set by -compose parameter (not in TB78?!)
		debug("have fcc="+cw.gMsgCompose.compFields.fcc);
		state+=' -composeWithFCC';
		curFolder=MailUtils.getExistingFolder(cw.gMsgCompose.compFields.fcc);
		if (!curFolder) {
			debug("bad -compose parameter fcc="+cw.gMsgCompose.compFields.fcc+
															" - defaulting to sent folder", true);  //since no current folder
			curFolder=MailUtils.getExistingFolder(cw.cs2c_params.sentFolder); //default to the fcc folder (or the default folder?)
		}
	} else { //Must be a new message. Try to find the currently selected folder
		state+=' newMsg';

//		let mailWindow = cw.getMostRecentMailWindow();
      //this returns null if TB has been started with -compose, even if mail:3pane has been opened later
		let mailWindow = Services.wm.getMostRecentWindow("mail:3pane");
		if (mailWindow) {     //else: no main window
			state+=' window';
			var View=mailWindow.gDBView;  //nsIMsgDBView
			if (View) {         // else: no folder selected!
				state+=' view';
				curFolder=View.msgFolder;
				if (!curFolder) { //Probably a gloda window
					debug('state=view: fcc folder not found, probably a gloda window', true);
					curFolder=MailUtils.getExistingFolder(cw.cs2c_params.sentFolder); //default to the fcc folder (or the default folder?)
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
				curFolder=MailUtils.getExistingFolder(cw.cs2c_params.sentFolder); //default to the fcc folder (or the default folder?)
			}
		} else {  //probably in a global search window
			state+=' noWindow';
			curFolder=MailUtils.getExistingFolder(cw.cs2c_params.sentFolder); //default to the fcc folder (or the default folder?)
		}
	}
	state+=' check';

	if (curFolder) {
		if (curFolder.canFileMessages) {   // not news or virtual Folder
debug('found curFolder '+curFolder.URI);
			cw.cs2c_params.curFolder=curFolder.URI;
			cw.cs2c_params.curLabel=prettyFolderName(curFolder);
		} else {  // no usable current folder
debug('folder not usable as curFolder: '+curFolder.URI);
			cw.cs2c_params.curFolder=null;
			curFolder=null;
		}
	} else {
debug('No curFolder found');
  }

	if (prefs[cw.cs2c_params.account+'_curorsent']=='sent') {  	      // Sent folder is default
		cw.cs2c_params.defFolder=cw.cs2c_params.sentFolder;
		cw.cs2c_params.defLabel=cw.cs2c_params.sentLabel;
		state+=' def-is-sentfolder';
	} else if (curFolder) {                         // else current Folder is default
		cw.cs2c_params.defFolder=cw.cs2c_params.curFolder;
		cw.cs2c_params.defLabel=cw.cs2c_params.curLabel;
		state+=' def-is-current-folder';
	} else {                                        //last resort: preselect last used folder
		cw.cs2c_params.defFolder=cw.cs2c_params.sentFolder;
		cw.cs2c_params.defLabel=cw.cs2c_params.sentLabel;
		state+=' must-use-sentfolder';
	}

	state+=' gDefFolder='+cw.cs2c_params.defFolder;
	state+=' gSentFolder='+cw.cs2c_params.sentFolder;
	state+=' gCurFolder='+cw.cs2c_params.curFolder;
	//in TB68, server.prettyName is just 'ggbs', in TB71 its G.Gersdorf@ggbs.de

debug('State: '+state);
debug('set menu to: '+cw.cs2c_params.defLabel+' '+cw.cs2c_params.defFolder);

  return true;
}	//getFolders

function readFCC(uri) {
  let messenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
        QueryInterface(Components.interfaces.nsIMessenger);
  let MsgService = messenger.messageServiceFromURI(uri);
  let MsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"]
                       .createInstance();
  let MsgStrem_Inputstream = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
  let ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"]
                       .createInstance();
  let ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
  ScriptInputStream.init(MsgStream);
  MsgService.streamMessage(uri, MsgStream, null, null, false, '');
//			let c=ScriptInputStream.available();
    // this always throws a non-catcheable error 'TransactionInactiveError:'
    // it returns 0 if message does not exists (even if message has been moved to another folder)
  let content='';
  let found=null;
  while (ScriptInputStream.available()) {
    content+=ScriptInputStream.read(512);
    if ((found=content.match(/^FCC:\s*(.*)$/m))) break;
    if (content.search(/\r\n\r\n/m)>=0) break;
  }
  ScriptInputStream.close();
  return found?found[1]:'';
}

function fpMenu(cw) {
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
	label.setAttribute('control','fccFolderPicker');
	ti.appendChild(label);
	tbar.appendChild(ti);

  ti=doc.createElement('toolbaritem');
	let ml=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
    'menulist');
	ml.id='fccFolderPicker';
	ml.setAttribute('label', cw.cs2c_params.defLabel);
	ml.setAttribute('lastlabel', cw.cs2c_params.defLabel);
	ml.setAttribute('uri', cw.cs2c_params.defFolder);
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
  mi.setAttribute('label', cw.cs2c_params.defLabel);
  mi.setAttribute('uri', cw.cs2c_params.defFolder);
  mi.setAttribute('class', 'folderMenuItem menuitem-iconic');
  mi.setAttribute('accesskey', prefs['accesskey_default']||'%');  //was ??, but bad for ATN
  menu.insertBefore(mi, mfc);
  if (!prefs[cw.cs2c_params.account+'_sentalso'] && cw.cs2c_params.defFolder!=cw.cs2c_params.sentFolder) {
    mi=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
      'menuitem');
    mi.setAttribute('label', cw.cs2c_params.sentLabel);
    mi.setAttribute('uri', cw.cs2c_params.sentFolder);
    mi.setAttribute('class', 'folderMenuItem menuitem-iconic');
    mi.setAttribute('accesskey', prefs['accesskey_sent']||'!');  //was ??, but bad for ATN
    menu.insertBefore(mi, mfc);
  } else if (cw.cs2c_params.defFolder==cw.cs2c_params.sentFolder &&
			cw.cs2c_params.curFolder && cw.cs2c_params.curFolder!=cw.cs2c_params.sentFolder) {
    mi=doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
      'menuitem');
    mi.setAttribute('label', cw.cs2c_params.curLabel);
    mi.setAttribute('uri', cw.cs2c_params.curFolder);
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
    setFcc(cw, '', '', false); //set fcc if later saved as draft or template
	} );
	ml.addEventListener("keydown", function(ev) {
//console.log('key pressed '+ev.keyCode);
    if (ev.keyCode==32 /* space*/ || ev.keyCode==13 /*enter */)
      ev.target.firstChild.openPopup();
	} );
	ml.appendChild(menu);
	ti.appendChild(ml);
	tbar.appendChild(ti);

	if (cw.cs2c_params.allowMove) {
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
//There is no, really no message or error, if source message does not exists!
debug('MoveMessage started: to '+folderuri);
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
      if (appVersion<85) {
        var msgs=Components.classes["@mozilla.org/array;1"].
          createInstance(Components.interfaces.nsIMutableArray);
        msgs.appendElement(msgHdr, false);
      } else {
        var msgs=[msgHdr];
      }
      let listener={
        OnStartCopy: () => {
debug('start move');
        },
        OnStopCopy: (status) => {
debug('stop move status='+status);  //status=0 even if message does not exists
        }
      };
			try {
				copyService.CopyMessages(msgHdr.folder, msgs, folder,					// up to TB8?
               true /* isMove */, listener, null /*msgWindow*/, true /* allow undo */);
			} catch(e) {
				copyService.copyMessages(msgHdr.folder, msgs, folder,					// since TB91
               true /* isMove */, listener, null /*msgWindow*/, true /* allow undo */);
			}
    } else {
debug('MoveMessage: Message not moved since target is same folder');
    }
  } catch(e) {
    Components.utils.reportError('CopySent2Current: Move of original message failed: '+e);
  }
}

function button(id, label, click, doc, tbox, tbar) {
	let btn=doc.createXULElement("toolbarbutton");
	btn.setAttribute("id", id);
	btn.setAttribute("class", "toolbarbutton-1");
	let l=gContext.extension.localeData.localizeMessage(label);
	btn.setAttribute("label", l);
	btn.setAttribute("tooltiptext", l);
	btn.setAttribute("removable", "true");
	btn.setAttribute("oncommand", "document.getElementById('"+click+"').click();");
	tbox.palette.appendChild(btn);	//append to palette
	let windowURL =
		"chrome://messenger/content/messengercompose/messengercompose.xhtml";
	tbar.currentSet = Services.xulStore.getValue(windowURL, "composeToolbar2", "currentset");
	tbar.setAttribute("currentset", tbar.currentSet);
}
function registerListener() {
debug('registering window listener for customizeToolbar');
  ExtensionSupport.registerWindowListener("CopySent2Current", {
    chromeURLs: [
      "chrome://messenger/content/customizeToolbar.xhtml",
      "chrome://messenger/content/messengercompose/messengercompose.xhtml",
    ],
    onLoadWindow: function(win) {
      if (win.location=="chrome://messenger/content/customizeToolbar.xhtml") {
        if (prefs['use_TBB'])  {
debug('load stylesheet into '+win.document.location);
          stylesheets(win);
        }
      } else {
debug('messengercompose opened');
      }
		}
	})
}

function stylesheets(win) {
/*
//needs context
  let styleSheetService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                                    .getService(Components.interfaces.nsIStyleSheetService);
  let uri = Services.io.newURI(context.extension.getURL("skin/copysent2current.css"), null, null);
debug('stylesheet uri='+uri); //fire one time, but
  styleSheetService.loadAndRegisterSheet(uri, styleSheetService.USER_SHEET);
debug('stylesheet loaded');   //this fires two times???
*/
	let link=win.document.createElement("link");
	link.setAttribute("rel", "stylesheet");
  link.setAttribute("href", "chrome://copysent2current/content/skin/copysent2current.css");
  win.document.documentElement.appendChild(link);
debug('stylesheet loaded into '+win.location);
}

function registerChromeUrl(context, chromeData) {
debug('registerChromeUrl');
	const aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
	const manifestURI = Services.io.newURI(
		"manifest.json",
		null,
		context.extension.rootURI
	);
	chromeHandle = aomStartup.registerChrome(manifestURI, chromeData);         
debug('registerChromeUrl chromeHandle='+chromeHandle);
}

function test(wid, cw) {
/* TEST */
//	let win=Services.wm.getOuterWindowWithId(wid);	// ==cw
	let msgCompFields = cw.gMsgCompose.compFields;
	let identity=MailServices.accounts.getIdentity(cw.getCurrentIdentityKey());
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
//debug("gDefFolder="+cw.cs2c_params.defFolder);

	//msgCompFields.fcc is empty
	//msgCompFields.fcc2 is empty or contains folder from menu "Optionen/Kopie ablegen unter"
debug("fcc war: "+msgCompFields.fcc);
debug("fcc2 war: "+msgCompFields.fcc2);

//if (identity.fccReplyFollowsParent) ...


}

let debugcache='';
function debug(txt, force) {
//force=true;
	if (force || prefs) {
		if (force || prefs.debug) {
			if (debugcache) console.log(debugcache); debugcache='';
			console.log('CS2C: '+txt);
		}
	} else {
		debugcache+='CS2C: '+txt+'\n';
	}
}

