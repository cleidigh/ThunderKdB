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
 * The Original Code is CopySent2Current.
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

//Attention: the 'no copy' does not work, if sending a message in offline modus
//          (messages are delivered to the 'sent'-folder)

var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm");
var {MailUtils} = ChromeUtils.import("resource:///modules/MailUtils.jsm");

//if(!de_ggbs) var de_ggbs={};    //might fail because of race condition
if(!de_ggbs_cs2c) var de_ggbs_cs2c={};

if (!de_ggbs_cs2c.mc) de_ggbs_cs2c.mc = function() {

////////////////////////
  var gBase=0x100;
  var gSentAlso=0x10;
  var gTrash=0x20;
  var gDefSent=0x1;

  /* see mailnews/base/public/nsMsgFolderFlags.idl
  var gFlagList = { 'MSG_FOLDER_FLAG_VIRTUAL' : 0x0020,
                    'MSG_FOLDER_FLAG_TRASH' : 0x0100,
                    'MSG_FOLDER_FLAG_SENTMAIL' : 0x0200,
                    'MSG_FOLDER_FLAG_DRAFTS' : 0x0400,
                    'MSG_FOLDER_FLAG_QUEUE' : 0x0800,
                    'MSG_FOLDER_FLAG_INBOX' : 0x1000,
                    'MSG_FOLDER_FLAG_TEMPLATES' : 0x400000,
                    'MSG_FOLDER_FLAG_JUNK' : 0x40000000 };
  */
  var gSpecialFolders=0x0100|0x0400|0x0800|0x400000|0x40000000;

  var gPreSelected='';

  var gDefaultLabel=null;
  var gDefaultURI=null;
  var gSentLabel=null;
  var gSentURI=null;
  var gOrigURI=null;
  var gAllowMove=true;

  var gAllowChoose=true;

  var console = Services.console;

  //window.arguments[0] is an object ([xpconnect wrapped nsIMsgComposeParams])
  //  if called from main window
  //  its a string, if called via -compose commandline argument
  var main = Services.wm.getMostRecentWindow("mail:3pane");
  if (main) {
    var gComponent=main.de_ggbs_cs2c.CS2C;
    console.logStringMessage('CopySent2Current: compose.js: using module');
dump('--CopySent2Current: using module\n');
  } else {
      //  called with -compose
    console.logStringMessage("CopySent2Current: compose.js: called with -compose '"+window.arguments[0]+"'");
dump("--CopySent2Current: called with -compose '"+window.arguments[0]+"'\n");
    var cs2c=ChromeUtils.import("resource://copysent2current/copysent2current.jsm");
    try {
      var gComponent = new cs2c.copySent2Current();
      console.logStringMessage('CopySent2Current: module loaded');
dump('--CopySent2Current: module loaded\n');
    } catch(e) {
      Components.utils.reportError('CopySent2Current: compose.js: ALERT: module NOT loaded: '+e);
dump('--CopySent2Current: compose.js: ALERT: module NOT loaded: '+e+'\n');
    }
  }

  var pub = {
    gOrigUri:      null,
    gOrigType:     -1,
    gMsgType:      0,
    gMsgFcc:       '',
    CS2C:          gComponent
  };

  //public function are define as
  //  pub.name = function(args) {...}
  //and must be called as de_ggbs_cs2c.mc.name
  //
  //Internal functions are defined normally as
  //  function name(args) {...}
  //and are called without 'this.'

  pub.log = function(text, always) {
      if (de_ggbs_cs2c.mc.dodebug==null) {
        try { de_ggbs_cs2c.mc.dodebug=Services.prefs.getBranch("extensions.copysent2current.").getBoolPref("debug"); }
        catch(e) { de_ggbs_cs2c.mc.dodebug=false; }
      }

      if (always || de_ggbs_cs2c.mc.dodebug) {
        console.logStringMessage('cs2c: '+text);
        dump('--cs2c: '+text+'\n');
      }
  //Components.utils.reportError(text);
  }

  /////////////////////////////////////////////////////////////////////////////
  // set the fcc_folder, so sendMsg will use it
  pub.prepareForCopy = function() {
    de_ggbs_cs2c.mc.log('prepareForCopy: started');
    //within this function, the variables have to be used as
    //  de_ggbs_cs2c.mc.gMsgType, not just this.gMsgType!!
  //Get current identity
    if (!gAllowChoose) {
      de_ggbs_cs2c.mc.log('prepareForCopy: now choose allowed');
      return;      //no copy requested or copy to fixed folder (standard tb modes)
    }

    var picker=document.getElementById('de-ggbs-cs2c-fccFolderPicker');
    var msgCompFields = gMsgCompose.compFields;

    //Workaround a problem in SM (https://bugzilla.mozilla.org/show_bug.cgi?id=1290187)
    if (typeof(nsIMsgCompDeliverMode) == 'undefined')
        var nsIMsgCompDeliverMode = Components.interfaces.nsIMsgCompDeliverMode;

    if (de_ggbs_cs2c.mc.gMsgType==nsIMsgCompDeliverMode.SaveAsDraft ||
        de_ggbs_cs2c.mc.gMsgType==nsIMsgCompDeliverMode.SaveAsTemplate ||
        de_ggbs_cs2c.mc.gMsgType==nsIMsgCompDeliverMode.AutoSaveAsDraft) {
        //for drafts/template save current fcc selection for later use 
      msgCompFields.fcc = picker.getAttribute("uri");
      de_ggbs_cs2c.mc.log('prepareForCopy: no choose on draft or template allowed');
      return;
    }

    // this will be called even if there is no 'To:', but the send will not be performed
    if (!msgCompFields.to && !msgCompFields.cc && !msgCompFields.bcc) {
      de_ggbs_cs2c.mc.log('prepareForCopy: no to, cc or bcc');
      return;
    }

    var identity=window.getCurrentIdentity();
    var moveToURI='';
    if (!gPreSelected) {
      //If 'choose after send' is enabled, show the menu
      if (de_ggbs_cs2c.mc.CS2C.chooseBehind) {
          //.open() throws exception!
        //var left=window.left+200;
        //var top=window.top+200;
        var chooser=window.openDialog("chrome://copysent2current/content/chooser.xul","cs2c_chooser",
            'chrome=yes,modal=yes,titlebar=yes,alwaysRaised=yes,dialog=yes,close=no',//,left='+left+',top='+top,
            gDefaultLabel, gDefaultURI, gSentLabel, gSentURI, gAllowMove);
      }
      var targeturi=picker.getAttribute("uri");
      if (targeturi!="nocopy://"
          && !(identity.fccFolderPickerMode&gDefSent && targeturi==gDefaultURI)
                                         // nicht den sentfolder, wenn er der default ist
      ) { //save this uri in the list 
        de_ggbs_cs2c.mc.CS2C.add_URI(targeturi);
//        de_ggbs_cs2c.mc.fillElems();    // don't do this, seems that the compose windows vanishes while updating
      }
      msgCompFields.fcc = targeturi;
      if (targeturi!="nocopy://") moveToURI=targeturi;
    } else if (gPreSelected=='noCopy') {
      msgCompFields.fcc = "nocopy://";
    } else if (gPreSelected=='toSentFolder') {
      msgCompFields.fcc = identity.fccFolder;
      moveToURI=targeturi;
    }

    gPreSelected='';

    if (msgCompFields.fcc=='nocopy://') {
      if (identity.fccFolderPickerMode&gTrash) {    //nocopy is copy to trash
        //find the Trash folder
        var trashFolder;
        var trashFolderURIs = new Array(identity.fccFolder, 'mailbox://nobody@Local%20Folders');
          //first try trash of current identity, else fallback to trash of 'Local Folders'
        for (var i=0; i<trashFolderURIs.length; i++) {
          var trashFolderURI=trashFolderURIs[i];
          var folder;
          folder=MailUtils.getExistingFolder(trashFolderURI);
          var rootFolder = folder.rootFolder;
          var trashFolder = rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
          if (trashFolder) break;
        }
  
        if (trashFolder) {
          msgCompFields.fcc=trashFolder.URI;
          moveToURI=de_ggbs_cs2c.mc.CS2C.noMoveTrash?'':trashFolder.URI;
        } else {
          var strings=Services.strings.createBundle('chrome://copysent2current/locale/copysent2current.properties'); 
          Components.utils.reportError(strings.GetStringFromName('CopySent2Current')+': '+
            strings.GetStringFromName('NoTrashFolder'));
          msgCompFields.fcc=identity.fccFolder;
          moveToURI=identity.fccFolder;
        }
      }

    }
    msgCompFields.fcc2='nocopy://';
    if (identity.fccFolderPickerMode&gSentAlso && msgCompFields.fcc != identity.fccFolder) { // also to sent folder
      if (msgCompFields.fcc=='nocopy://') {
        msgCompFields.fcc  = identity.fccFolder;
      }
      // since fcc2 is only performed when fcc succeeded, we want to be sure
      // that the 'easier'(=copy to a local folder) is done first
      else if (identity.fccFolder.substr(0,7)!='imap://' &&             // if send folder is local
                 msgCompFields.fcc.substr(0,7)=='imap://') {            // and fcc folder is remote
        msgCompFields.fcc2 = msgCompFields.fcc;                         //   change them
        msgCompFields.fcc  = identity.fccFolder;
      } else {
        msgCompFields.fcc2 = identity.fccFolder;
      }
    }

    //Move message if requested and appropriate
    //the message will be moved even if the send fails or gets aborted :-(
    de_ggbs_cs2c.mc.log('MoveMessage: would move from '+gOrigURI+' to '+moveToURI);
    if (gAllowMove && moveToURI && document.getElementById('de-ggbs-cs2c-move').checked) {
      de_ggbs_cs2c.mc.log('prepareForCopy: start MoveMessage with delay');
      setTimeout(pub.MoveMessage, 100, gOrigURI, moveToURI);
    } else {
      de_ggbs_cs2c.mc.log('MoveMessage: not called');
    }

    de_ggbs_cs2c.mc.log('prepareForCopy: done! fcc to "'+msgCompFields.fcc+'" fcc2 to "'+msgCompFields.fcc2+'"');
  }

  pub.MoveMessage = function (msguri, folderuri) {
    de_ggbs_cs2c.mc.log('MoveMessage: to '+folderuri);
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
          de_ggbs_cs2c.mc.log('target folder for "'+folderuri+'" not found', true);
          return;
        }
        de_ggbs_cs2c.mc.log('MoveMessage: apparently to '+folder.URI);
        var copyService = MailServices.copy;
        var msgs=Components.classes["@mozilla.org/array;1"].
            createInstance(Components.interfaces.nsIMutableArray);
        msgs.appendElement(msgHdr, false);
        copyService.CopyMessages(msgHdr.folder, msgs, folder,
                 true /* isMove */, null/*listener*/, null /*msgWindow*/, true /* allow undo */);
      }
    } catch(e) {
      Components.utils.reportError('CopySent2Current: compose.js: ALERT: Move of original message failed: '+e);
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // preselect the current (or another) folder in the 'copy-to'-picker
  // or hide the picker, if not useable
  pub.fillMenu = function() {
    try {
      // only works for new windows, not if windows is reopened???
      var ak_s = de_ggbs_cs2c.mc.CS2C.ak_send;
      document.getElementById('de-ggbs-cs2c-key_sendNoCopy').setAttribute('key',ak_s);
      document.getElementById('de-ggbs-cs2c-key_sendCopy2Sent').setAttribute('key',ak_s);
    } catch(e) { de_ggbs_cs2c.mc.log(e); /*Components.utils.reportError('CopySent2Current: compose.js: '+e);*/ }

      //origURI: MessageURI if its a reply or some draft/template message
    var origURI=de_ggbs_cs2c.mc.gOrigUri;
    var origType=de_ggbs_cs2c.mc.gOrigType;

    gOrigURI=origURI;
    //check, if this is really a message uri
    //(otherwise it might be a mail attachment which can't be moved)
    var messenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
        QueryInterface(Components.interfaces.nsIMessenger);
    try {
      //this will fail, if its not a message uri
      var mh = messenger.messageServiceFromURI(origURI).messageURIToMsgHdr(origURI);
      var isMsgUri=true;
    } catch(e) {
      var isMsgUri=false;
    }
    gAllowMove=origURI&&isMsgUri && origType!=9/*draft*/ && origType!=10/*template*/;

    if (!de_ggbs_cs2c.mc.CS2C.chooseBehind) de_ggbs_cs2c.mc.addElems();
    document.getElementById('fccMenu').disabled=true;

    var state='';
    var menu=document.getElementById('de-ggbs-cs2c-toolbar');
    var id=window.getCurrentIdentityKey();
    var identity=window.getIdentityForKey(id);
    if (identity.doFcc && identity.fccFolderPickerMode>=gBase) {
      try {
  	    gAllowChoose=true;
  	    menu.hidden=de_ggbs_cs2c.mc.CS2C.chooseBehind;

        var cb=document.getElementById('de-ggbs-cs2c-move');
        cb.hidden=!gAllowMove;
        if (gAllowMove)
          //cb.checked=de_ggbs_cs2c.mc.CS2C.moveMsg;
          cb.checked=de_ggbs_cs2c.mc.CS2C.get_moveMsg(id);

  	    var curFolder;
        state+=' docopy';
        if (origURI) {                                 // Is Reply
          //this could be a reply or a draft/template message
          state+=' reply/draft/template';
          var messenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
              QueryInterface(Components.interfaces.nsIMessenger);
          if (origType==9/*draft*/ || origType==10/*template*/) {
            state+=' draft';

            //try to extract FCC. Would be nice, if i could extract the header
            //unfortunately the following does not work:
            // (but see 'info' add-on, function getMimeHeaders)
            /*
            var uriToOpen=origURI+'?fetchCompleteMessage=true';
            let aUrl={};
            messenger.messageServiceFromURI(origURI).GetUrlForUri(uriToOpen, aUrl, null);
            aUrl=aUrl.value;
            var fUrl=aUrl.QueryInterface(Components.interfaces.nsIMsgMailNewsUrl);
            var mh=fUrl.mimeHeaders;  //--- this fails
            var fcc=mh.extractHeader("fcc", false);
            */
            //therefore i read the content of the message and parse it
            var MsgService = messenger.messageServiceFromURI(origURI);
            var MsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"]
                                 .createInstance();
            var MsgStrem_Inputstream = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
            var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                 .createInstance();
            var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
            ScriptInputStream.init(MsgStream);
            try {
              MsgService.streamMessage(origURI,MsgStream, null, null, false, null);
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
                de_ggbs_cs2c.mc.log('state=draft: fcc folder for "'+fcc+'" not found', true);
                curFolder=MailUtils.getExistingFolder(identity.fccFolder); //default to the fcc folder (or the default folder?)
              }
            } else {
              //no fcc. Might be a template via 'Edit as new'
              state+=' withoutFCC';
              var msgHdr=messenger.msgHdrFromURI(origURI);  //nsIMsgDBHeader
              curFolder=msgHdr.folder;
            }
          } else {
          //for replies, current folder is the folder of the message replied to!
            state+=' reply';
            var msgHdr=messenger.msgHdrFromURI(origURI);  //nsIMsgDBHeader
            curFolder=msgHdr.folder;
          }
        } else if (gMsgCompose.compFields.fcc) {    // fcc set by -compose parameter
          de_ggbs_cs2c.mc.log("have fcc="+gMsgCompose.compFields.fcc);
          state+=' haveFCC';
          curFolder=MailUtils.getExistingFolder(gMsgCompose.compFields.fcc);
          if (!curFolder) {
            de_ggbs_cs2c.mc.log("bad -compose parameter fcc="+gMsgCompose.compFields.fcc+
                                    " - defaulting to sent folder", true);  //since no current folder
            curFolder=MailUtils.getExistingFolder(identity.fccFolder); //default to the fcc folder (or the default folder?)
          }
  	    } else { //Must be a new message. Try to find the currently selected folder
          state+=' newMsg';
  	      var mailWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService()
  	                       .QueryInterface(Components.interfaces.nsIWindowMediator)
  	                       .getMostRecentWindow("mail:3pane");
  	      if (mailWindow) {     //else: no main window
            state+=' window';
  	        var View=mailWindow.gDBView;  //nsIMsgDBView
  	        if (View) {         // else: no folder selected!
              state+=' view';
  	          curFolder=View.msgFolder;
              if (!curFolder) { //Probably a gloda window
                de_ggbs_cs2c.mc.log('state=view: fcc folder not found, probably a gloda window', true);
                curFolder=MailUtils.getExistingFolder(identity.fccFolder); //default to the fcc folder (or the default folder?)
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
  	          curFolder=MailUtils.getExistingFolder(identity.fccFolder); //default to the fcc folder (or the default folder?)
            }
          } else {  //probably in a global search window
            state+=' noWindow';
            curFolder=MailUtils.getExistingFolder(identity.fccFolder); //default to the fcc folder (or the default folder?)
          }
  	    }
        state+=' check';

  	    var defFolder='';
  	    if (identity.fccFolderPickerMode&gDefSent) {  	      // Sent folder is default
  	      defFolder=identity.fccFolder;
          state+=' isSentFolder';
   	    } else if (curFolder && curFolder.canFileMessages // not news or virtual Folder
      	//        && !(folder.flags&gSpecialFolders)   // not a special folder
        ) {       //else current Folder is default
           state+=' getURI';
           defFolder=curFolder.URI;
        }
      	//else if (curFolder) de_ggbs_cs2c.mc.log('special folder');
      	//else if (!defFolder) de_ggbs_cs2c.mc.log('no folder');
  	    else //last resort: preselect last used folder
  	      defFolder=identity.fccFolder;
      } catch(e) {
        de_ggbs_cs2c.mc.log('Error initializing menu ('+e.message+')\n  State: '+state+'\n', true);
      }

      //Set chooser to the default (if choose behind: just to get uri and label!)
        //from chrome:://messenger/content/msgFolderPickerOverlay.js #88ff
      var picker=document.getElementById('de-ggbs-cs2c-fccFolderPicker');
      var sentFolder=defFolder==curFolder.URI?identity.fccFolder:curFolder.URI;
      state+=' defFolder='+defFolder;
      state+=' fccFolder='+identity.fccFolder;
      state+=' sentFolder='+sentFolder;
      SetFolderPicker(sentFolder, "de-ggbs-cs2c-fccFolderPicker");
      gSentLabel=picker.getAttribute("label");
      gSentURI=picker.getAttribute("uri");
      SetFolderPicker(defFolder, "de-ggbs-cs2c-fccFolderPicker"); //Must be last!!
      gDefaultLabel=picker.getAttribute("label");
      gDefaultURI=picker.getAttribute("uri");
      if (identity.fccFolderPickerMode&gSentAlso || gDefaultURI==gSentURI) {
        state+=' - removed sent menuitem'
        gSentURI=null; 
      }
de_ggbs_cs2c.mc.log('State: '+state);

      if (!de_ggbs_cs2c.mc.CS2C.chooseBehind) {
//TODO:
//When called via -compose parameter, the popup misses the folder hierarchy :-(
//which seems to be a TB problem. With choosebehind, its ok.
        var menu=document.getElementById('de-ggbs-cs2c-copyMenuPopup');
        var def=menu.firstChild;    //the 'default://'
        def.label  = gDefaultLabel;
        def.id     = gDefaultURI;
        var sent   = document.getElementById('sent://');
        if (sent) { // Just in case (Mail from Axel Grude)
          if (gSentURI) {
            sent.label = gSentLabel;
            sent.id    = gSentURI;
            sent.hidden=false;
          } else
            sent.hidden=true;
        }
        de_ggbs_cs2c.mc.fillElems();

/* Test the choose-after-send popup
var prefB = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch("extensions.copysent2current.");
if (prefB.getBoolPref("TEST")) {
  var chooser=window.openDialog("chrome://copysent2current/content/chooser.xul","cs2c_chooser",
      'chrome=yes,modal=yes,titlebar=yes,alwaysRaised=yes,dialog=yes,close=no',//,left='+left+',top='+top,
      gDefaultLabel, gDefaultURI, gSentLabel, gSentURI, gAllowMove);
  var targeturi=picker.getAttribute("uri");
de_ggbs_cs2c.mc.log("TARGET: "+targeturi);
}
*/
      }
    } else {
      gAllowChoose=false;
      menu.hidden=true;
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // called from compose.xul on pick with (null, event.target, false)
  // called from chooser.xul indirectly on pick with (popup, event.target, checkbox-state)
  pub.picked = function(chooser, picked, move) {
    var uri=picked.id;
    if (!uri) uri=picked._folder.URI;
    de_ggbs_cs2c.mc.log('menu pick: '+uri);
    var picker=document.getElementById('de-ggbs-cs2c-fccFolderPicker');
    if (uri=='nocopy://') {
      picker.setAttribute("label",picked.getAttribute("label"));
      picker.setAttribute("uri",uri);
    } else {
      //from chrome:://messenger/content/msgFolderPickerOverlay.js #88
      SetFolderPickerElement(uri, picker);
        //Does the following, and adds the '... in server' text to the picker
        //  picker.setAttribute("label",picked.getAttribute("label"));
        //  picker.setAttribute("uri",uri);
    }
    if (chooser) {
//      de_ggbs_cs2c.mc.log('chooser close');
      chooser.close();
      chooser=null;
      document.getElementById('de-ggbs-cs2c-move').checked=move;
    }
  }
  pub.showPopup = function() {
    // called via a timeout! This prevents using the keystroke as navigation in the popup,
    // if the menulist gots focus via keyboard-shortcut
    var popup=document.getElementById('de-ggbs-cs2c-copyMenuPopup');
    popup.openPopup(popup, 'after_start', -1, -1, false, false);
  }

  // Register a state listener so that we know, the message has been sent.
  // reset the fcc_folder to the 'sent' folder

  /*
  var cs2c_stateListener = {
    NotifyComposeFieldsReady: function() {
    //de_ggbs_cs2c.mc.log('NotifyComposeFieldsReady');
    },


    // Message send (or copied to outbox, if offline)
    ComposeProcessDone: function(aResult) {
    //de_ggbs_cs2c.mc.log('ComposeProcessDone');
    },

    SaveInFolderDone: function(folderURI) {
    //de_ggbs_cs2c.mc.log('SaveInFolderDone');
    }

  };
  */

  /////////////////////////////////////////////////////////////////////////////
  pub.init = function() {
    de_ggbs_cs2c.mc.log('compose.js init()');
    de_ggbs_cs2c.mc.fillMenu(null);    // and preselect the current folder in the copy to picker

  }

  pub.Controller =
  {
    supportsCommand: function(command)
    {
      //de_ggbs_cs2c.mc.log("Controller call: supportsCommand: "+command);
      switch (command)
      {
        case "de-ggbs-cs2c-cmd_sendNoCopy":
        case "de-ggbs-cs2c-cmd_sendCopy2Sent":
        case "de-ggbs-cs2c-cmd_sendNoCopyWithCheck":
        case "de-ggbs-cs2c-cmd_sendCopy2SentWithCheck":
          return true;
        default:
          return false;
      }
    },
    isCommandEnabled: function(command)
    {
      de_ggbs_cs2c.mc.log("Controller call: isCommandEnabled: "+command);
      var identity=window.getCurrentIdentity();
      switch (command)
      {
        case "de-ggbs-cs2c-cmd_sendNoCopy":
        case "de-ggbs-cs2c-cmd_sendCopy2Sent":
          if (!identity.doFcc || identity.fccFolderPickerMode<gBase) return false;
          return !gWindowLocked && !Services.io.offline && !gSendLocked &&
               !gNumUploadingAttachments;
        case "de-ggbs-cs2c-cmd_sendNoCopyWithCheck":
        case "de-ggbs-cs2c-cmd_sendCopy2SentWithCheck":
          if (!identity.doFcc || identity.fccFolderPickerMode<gBase) return false;
          return !gWindowLocked && !gSendLocked &&
               !gNumUploadingAttachments;
        default:
          return false;
      }
    },

    doCommand: function(command)
    {
      de_ggbs_cs2c.mc.log("Controller call: doCommand: "+command);
      switch (command)
      {
        case "de-ggbs-cs2c-cmd_sendNoCopy":
          if (de_ggbs_cs2c.mc.Controller.isCommandEnabled(command)) {
            gPreSelected='noCopy';
            if (Services.io.offline)
              SendMessageLater();
            else
              SendMessage();
          }
          break;
        case "de-ggbs-cs2c-cmd_sendCopy2Sent":
          if (de_ggbs_cs2c.mc.Controller.isCommandEnabled(command)) {
            gPreSelected='toSentFolder';
            if (Services.io.offline)
              SendMessageLater();
            else
              SendMessage();
          }
          break;
        case "de-ggbs-cs2c-cmd_sendNoCopyWithCheck":
          if (de_ggbs_cs2c.mc.Controller.isCommandEnabled(command)) {
            gPreSelected='noCopy';
            SendMessageWithCheck();
          }
          break;
        case "de-ggbs-cs2c-cmd_sendCopy2SentWithCheck":
          if (de_ggbs_cs2c.mc.Controller.isCommandEnabled(command)) {
            gPreSelected='toSentFolder';
            SendMessageWithCheck();
          }
          break;
        default:
          return;
      }
    },

    onEvent: function(event)
    {
      //de_ggbs_cs2c.mc.log("DefaultController:onEvent");
    }
  }

  return pub;

}();

/////////////////////////////////////////////////////////////////////////////
// save references to the original version of these functions
// they will become overloaded with modified versions
if (!de_ggbs_cs2c.ol) {
  de_ggbs_cs2c.mc.log('saving ComposeStartup and GenericSendMessage', true);
  de_ggbs_cs2c.ol = {
    savedComposeStartup: window.ComposeStartup,
    savedGenericSendMessage: window.GenericSendMessage	
  }
  // Overload from chrome://messenger/content/msgComposeCommands.js @line 1163
  window.ComposeStartup=function (recycled) {
    de_ggbs_cs2c.mc.log("ComposeStartup: recycled="+recycled);
  //  de_ggbs_cs2c.mc.log(de_ggbs_cs2c.ol.savedComposeStartup);

    de_ggbs_cs2c.ol.savedComposeStartup(recycled);   // call original
  //  gMsgCompose.RegisterStateListener(cs2c_stateListener);  // i want to know state changes
    de_ggbs_cs2c.mc.log("ComposeStartup: original version called");

    de_ggbs_cs2c.mc.gOrigUri=gMsgCompose.originalMsgURI;
    de_ggbs_cs2c.mc.gOrigType=gComposeType;

// [xpconnect wrapped nsIMsgComposeParams]
   if (typeof window.arguments[0]=='string') { //  called with -compose
      de_ggbs_cs2c.mc.log("ComposeStartup: called with -compose '"+window.arguments[0]+"'");
      var args = GetArgs(window.arguments[0]);;
      if (args && args.fcc) gMsgCompose.compFields.fcc=args.fcc;
    }
    de_ggbs_cs2c.mc.log("ComposeStartup: returns");
  }
  // Overload from chrome://messenger/content/msgComposeCommands.js @line 1646
  // so we have a chance to get the type of the message
  // because we do not want to set .fcc and .fcc2 on SaveAsDraft and others
  window.GenericSendMessage=function(msgType) {
    de_ggbs_cs2c.mc.log("GenericSendMessage: calling original version, msgType="+msgType);
    de_ggbs_cs2c.mc.gMsgType=msgType;
    return de_ggbs_cs2c.ol.savedGenericSendMessage(msgType);
  }

}

top.controllers.insertControllerAt(0, de_ggbs_cs2c.mc.Controller);

// Call when the window is fully loaded, prevent racing condition
window.addEventListener("load", de_ggbs_cs2c.mc.init, false);                      //first open, calls fillMenu
window.addEventListener('compose-window-reopen', de_ggbs_cs2c.mc.fillMenu, true);  //reopen
window.addEventListener('compose-from-changed', de_ggbs_cs2c.mc.fillMenu, true);   //change of identity! (last param must be true!)

window.addEventListener('compose-send-message', de_ggbs_cs2c.mc.prepareForCopy, true); // fires after the observer 'mail:composeOnSend'

