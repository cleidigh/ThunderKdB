var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
const Ci = Components.interfaces;

var state='';
var prefs;

let strings={
  "inoutColumn_label": '',
  "inoutColumn_tooltip": '',
  "inoutaddressCol_label": '',
  "inoutaddressCol_tooltip": '',
  "inoutthissideCol_label": '',
  "inoutthissideCol_tooltip": ''
};

var gW;
var gD;
var gDBView;
var options=null;
var gMyAddr;
var gMyAddrArr;
var gLocalFolder;
var gColumns=new Map;	//id->label
var otherCCH=new Map;	//save custom column handlers from other add-ons
var gHeaderParser = MailServices.headerParser;

var gMessenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
    QueryInterface(Ci.nsIMessenger);
var gAccountMgr=MailServices.accounts;

var gInTextPrefix='';
var gOutTextPrefix='';

const MSG_FOLDER_FLAG_TRASH = 0x0100;
const MSG_FOLDER_FLAG_JUNK = 0x40000000;


var sio = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {   //not called it add-on not loaded from .xpi
debug('onStartup state='+state);
  }

  onShutdown(isAppShutdown) {
debug('onShutdown isAppShutdown='+isAppShutdown+' state='+state);
      if (isAppShutdown) return;
      // Looks like we got uninstalled. Maybe a new version will be installed
      // now. Due to new versions not taking effect
      // (https://bugzilla.mozilla.org/show_bug.cgi?id=1634348)
      // we invalidate the startup cache. That's the same effect as starting
      // with -purgecaches (or deleting the startupCache directory from the
      // profile).
      //gg: also called on 'disable add-on'
      observer.addHandlersToCols('*', false);	// remove all columnHandlers to other columns
debug('remove our own columns');
			gD.getElementById('sio_inoutCol').remove();
			gD.getElementById('sio_inoutaddressCol').remove();
			gD.getElementById('sio_inoutthissideCol').remove();
			gD.getElementById('sortBySioCorrespondentMenuItem').remove();
			gD.getElementById('sortBySioThisSideMenuItem').remove();
			gD.getElementById('sortBySioInOutMenuItem').remove();
			gD.getElementById('qfb-qs-sio-correspondent').remove();
			gD.getElementById('qfb-qs-sio-thisside').remove();
			Services.obs.removeObserver(observer, "MsgCreateDBView");
      Services.obs.notifyObservers(null, "startupcache-invalidate");
  }

  getAPI(context) {
    context.callOnClose(this);
    Object.keys(strings).forEach(key=>{
      let msg=context.extension.localeData.localizeMessage(key);
      strings[key]=msg;
    });

    return {
      sio: {
        init: async function(prefsP) {
debug('sio.init state='+state);
          if (state=='') {
try {
            prefs=prefsP;
            init();
} catch(e) { debug('init '+e); }
          }
        },
        prefChanged: async function(prefsP, col, state) {
          prefs=prefsP;
debug('prefChanged '+col+' '+state);
					if (col) {
						// add or remove a generic columnHandler to another column
						observer.addHandlersToCols(col, state); 
					} else {
						config.getMyEmails();
						gInTextPrefix=prefs.InTextPrefix || '';  //was ??, but bad for ATN
						gOutTextPrefix=prefs.OutTextPrefix || '';  //was ??, but bad for ATN
					}
        },
        cols: async function() {
debug('cols');
if (gColumns.size==0) debug('gColumns array is not filled yet!');
					return gColumns;
        },
        localfolder: async function() {
debug('localfolder');
          let am=MailServices.accounts;
          let lfs=am.localFoldersServer; //.account.key
          let lfa=am.FindAccountForServer(lfs);
          let key=lfa?lfa.key:'';
          return { key: key, prettyName: lfs.prettyName };
        },
        migratePrefs: async function() {
debug('migratePrefs');
          let mig=new Object;
          let b=Services.prefs.getBranch("extensions.showInOut.");
          let prefs=b.getChildList("");
          if (prefs.length) {  // else: fresh install or already migrated
            prefs.forEach(pref=>{
              let t=b.getPrefType(pref);
              let v;
              if (t==Services.prefs.PREF_STRING)      v=b.getCharPref(pref, null);
              else if (t==Services.prefs.PREF_INT)    v=b.getIntPref(pref, null);
              else                                    v=b.getBoolPref(pref, null);
              if (v!==null) {
                mig[pref]=v;
              }
            });
            b.deleteBranch("");     // migrated!
          }
          return mig;
        },
        addonChanged: async function(who) {
debug('addonChanged called from '+who);
					if (who=='background' && options) return null;	//let options window do the work
//check for new or removed custom columns
					return changedCols();
        }
      },

    };
  }
  close() {
    // This function is called if the extension is disabled or removed, or Thunderbird closes.
    // We registered it with callOnClose, above.
    // gg: also called if options window closes
		options=null;
    debug("close");
  }
};

function init() {
debug('init state='+state);
  getAddon();
  //Install Listener
  let session=MailServices.mailSession;
  session.AddFolderListener(cache, 128); //folderListenerNotifyFlagValue  	 event
  //Find LocalFolder
  let lfs=gAccountMgr.localFoldersServer; //.account.key
  let lfa=gAccountMgr.FindAccountForServer(lfs);
  gLocalFolder=lfa?lfa.key:'';
  //Find all email addresses, which count as mine
  config.getMyEmails();
  gInTextPrefix=prefs.InTextPrefix || '';  //was ??, but bad for ATN
  gOutTextPrefix=prefs.OutTextPrefix || '';  //was ??, but bad for ATN
  state='init';
  Services.obs.addObserver(observer, "MsgCreateDBView", false);
  Services.obs.addObserver(observer, "dom-window-destroyed", false);
	observer.observe(null, "MsgCreateDBView", null);	// after enabling the addon there is no notification
}

async function getAddon() {
  let { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
  let addOn=await AddonManager.getAddonByID("showInOut@ggbs.de");
  let console = Services.console;
  let app = Services.appinfo;
  console.logStringMessage('ShowInOut: '+addOn.version+' on '+app.name+' '+app.version);
}

function searchTerm(text, aTermCreator, searchTerms, tag) {
  let folders = gW.GetSelectedMsgFolders();
  let folder = folders.length > 0 ? folders[0] : null;
  if (!folder) return; //more than one folder selected //???
  let account=gAccountMgr.FindAccountForServer(folder.server);
  let key=account.key;
  let term;
  let value;

  //see source/mailnews/base/search/public/nsIMsgSearchCustomTerm.idl
  //    source\mailnews\base\test\unit\test_searchCustomTerm.js
  let id;
  let name;
  if (tag=='sio-correspondent') {
    id='showinout@ggbs.de#matchMyAddr';
    name="matchMyAddr";
  } else if (tag=='sio-thisside') {
    id='showinout@ggbs.de#matchOtherAddr';
    name="matchOtherAddr";
  }
  var customTerm =
  {
    id:   id,
    name: name,
    needsBody: false,
    getEnabled: function(scope, op)
      { //not called
        return (//scope == Ci.nsMsgSearchScope.offlineMail &&
               (op == Ci.nsMsgSearchOp.Is ||
               op == Ci.nsMsgSearchOp.Isnt));
      },
    getAvailable: function(scope, op)
      {
//debug('available? '+op+': '+r+'\n');
        return (//scope == Ci.nsMsgSearchScope.offlineMail &&
               (op == Ci.nsMsgSearchOp.Is) ||
               (op == Ci.nsMsgSearchOp.Isnt));
      },
    getAvailableOperators: function(scope, length)
      { //not called
         length.value = 2;
         return [Ci.nsMsgSearchOp.Is, Ci.nsMsgSearchOp.Isnt];
      },
    match: function(msgHdr, searchValue, searchOp)
      {
//debug('search for '+searchValue+' with op '+searchOp+'\n');
//debug(' sender: '+msgHdr.mime2DecodedAuthor+'\n');
//debug(' recip : '+msgHdr.mime2DecodedRecipients+'\n');
        let outgoing=false;
        let sender=msgHdr.mime2DecodedAuthor;
        for (let email in gMyAddrArr[key]) {
          let re=new RegExp('<'+email+'>','i');
          if (sender.search(re)>=0) {
            outgoing=true;
            break;
          }
        }
        let sr=new RegExp(searchValue, 'i');
        let r=false;
        switch (searchOp)
        {
          case Ci.nsMsgSearchOp.Is:
            if (this.name=='matchMyAddr') {
              //if outgoing, search in recipients
              r=outgoing && msgHdr.mime2DecodedRecipients.search(sr)>=0;
            } else {
              //if outgoing, search in sender
              r=outgoing && msgHdr.mime2DecodedAuthor.search(sr)>=0;
            }
            break;
          case Ci.nsMsgSearchOp.Isnt:
            if (this.name=='matchMyAddr') {
              //if not outgoing, search in sender
              r=!outgoing && msgHdr.mime2DecodedAuthor.search(sr)>=0;
            } else {
              //if not outgoing, search in recipients
              r=!outgoing && msgHdr.mime2DecodedRecipients.search(sr)>=0;
            }
            break;
        }
        return r;
      }
  };
  let filterService = MailServices.filters;
  filterService.addCustomTerm(customTerm);

  //I'm the sender and search term is in recipients
  term = aTermCreator.createTerm();
  value = term.value;
  value.str = text;
  term.value = value;
  term.attrib = Ci.nsMsgSearchAttrib.Custom;
  term.customId = id;
  term.op = Ci.nsMsgSearchOp.Is;
  term.booleanAnd = false;
  searchTerms.push(term);
  // Or
  //I'm not the sender and search string is in sender
  term = aTermCreator.createTerm();
  value = term.value;
  value.str = text;
  term.value = value;
  term.attrib = Ci.nsMsgSearchAttrib.Custom;
  term.customId = id;
  term.op = Ci.nsMsgSearchOp.Isnt;
  term.booleanAnd = false;
  searchTerms.push(term);

}


var config =
{
/*
 *  Find all email addresses, which count as mine
 */
  getMyEmails: function () {
    gMyAddr=new Object;
    gMyAddrArr=new Object;
    let allAccounts=gAccountMgr.accounts;
    let accountsCount = allAccounts.length;
    for (let i = 0; i < accountsCount; i++) {
      let account = allAccounts[i]; //.queryElementAt(i, Ci.nsIMsgAccount);
      let key = account.key;
      let aAddr=gMyAddrArr[key]?gMyAddrArr[key]:new Object;
      let allIdentities=account.identities;
      let identitiesCount = allIdentities.length;
      for (let j = 0; j < identitiesCount; j++) {
        let identity = allIdentities[j]; //.queryElementAt(j, Ci.nsIMsgIdentity);
        if (identity.email) { //see mail from "Simon Arthur"
          let email=identity.email.toLowerCase();
          if (gMyAddr[email]===undefined)
            gMyAddr[email]=1;
          if (aAddr[email]===undefined)
            aAddr[email]=1;
        }
        if (identity.replyTo) {
          let email=identity.replyTo.toLowerCase();
          if (gMyAddr[email]===undefined)
            gMyAddr[email]=1;
          if (aAddr[email]===undefined)
            aAddr[email]=1;
        }
      }
      // get extra email addresses for this account from preferences
      let aa=(prefs["AdditionalAddresses."+key]||'').split(',');  //was ??, but bad for ATN
      for (let j=0; j<aa.length; j++) {
        let email=aa[j].toLowerCase().trim();
        if (email.charAt(0)=='@') email=email.substr(1);
        if (email && gMyAddr[email]===undefined)
          gMyAddr[email]=1;
        if (email && aAddr[email]===undefined)
          aAddr[email]=1;
      }
      gMyAddrArr[key]=aAddr;

      // If this is a pop account, check if INBOX is redirected to another account
      // if so, add all emails from this account to the redirected account
      if (account.incomingServer && account.incomingServer.rootFolder != account.incomingServer.rootMsgFolder) {
        let raccount = gAccountMgr.FindAccountForServer(account.incomingServer.rootMsgFolder.server);
        let rkey = raccount.key;
        let rAddr=gMyAddrArr[rkey]?gMyAddrArr[rkey]:new Object;
        for (let email in aAddr)
          if (rAddr[email]===undefined)
            rAddr[email]=1;
        gMyAddrArr[rkey]=rAddr;
      }

      // Add emails to Local Folders according to preference
      let addto=prefs["AddAddressesTo."+key]||0;  //was ??, but bad for ATN
      if (addto==1) {
        let rAddr=gMyAddrArr[gLocalFolder]?gMyAddrArr[gLocalFolder]:new Object;
        for (let email in aAddr)
          if (rAddr[email]===undefined)
            rAddr[email]=1;
        gMyAddrArr[gLocalFolder]=rAddr;
      }
    }

    // copy addresses to all accounts for accounts with preference=2
    for (let key in gMyAddrArr) {
      let addto=prefs["AddAddressesTo."+key]||0;  //was ??, but bad for ATN
      if (addto==2) {
        for (let rkey in gMyAddrArr) {
          if (rkey==key) continue;
          for (let email in gMyAddrArr[key])
            if (gMyAddrArr[rkey][email]===undefined)
              gMyAddrArr[rkey][email]=1;
        }
      }
    }

    cache.clear(null);
/* dump my emails
let t=''; for (let key in gMyAddrArr) {
let name=gAccountMgr.getAccount(key).incomingServer.prettyName;
t+=name+'\n  '; for (let email in gMyAddrArr[key]) t+=email+'\n  '; t+='\n'; }
debug(t);
*/
  }

}

function concatNames(corr) {
  let corrs='';
  //let count=corr.__count__;
  // We would use __count__ here, but JS keeps raising a strict
  // warning about its deprecated use
  // see https://ubiquity.mozilla.com/hg/ubiquity-firefox/rev/e0760cfc2ac0
  let count=0;
  for (let name in corr) if (corr.hasOwnProperty(name)) count++;

  for (let addr in corr) {
    let name=corr[addr];
    if (name.charAt(0)=='"' && name.charAt(name.length-1)=='"') name=name.substr(1,name.length-2);
    if (name.charAt(0)=="'" && name.charAt(name.length-1)=="'") name=name.substr(1,name.length-2);
    if (count>1 && name.indexOf(',')>=0 && name.charAt(0)!='"'&& name.charAt(0)!="'") name='"'+name+'"';
    if (corrs) corrs+=', ';
    corrs+=name;
  }
//debugu('count='+count+' corrs='+corrs+'\n');
  return corrs;
}

function getMailboxesArray(emails) {
  let ret;
  ret = gHeaderParser.extractHeaderAddressMailboxes(emails);
  if (ret === null) ret = '';
    return ret.toLowerCase().split(', ');
}

function checkEmail(email, key, domain) {
  if (!email) return false; // sometimes empty
  if (gMyAddrArr[key][email]!==undefined) return true;
  if (domain && gMyAddrArr[key][email.split('@')[1]]!==undefined) return true;
  return false;
}

var cache = {
  addr_cache: null,
  side_cache: null,
  data_cache: null,
//    corr_cache: null,
  indicator_cache: null,
  length: 0,
  clear: function(folder) {
//debug('cache: clear');
    this.data_cache = new Object;
    this.addr_cache = new Object;
    this.side_cache = new Object;
//      this.corr_cache = new Object;
    this.indicator_cache = new Object;
    this.length=0;
    this.key=null;
  },
  cache: function(messageURI, msgHdr) {
//debug('cache: cache');
    if (this.data_cache[messageURI] !== undefined) return;  //already cached

    if (!msgHdr)
      msgHdr=gMessenger.msgHdrFromURI(messageURI);
//debug('cache: '+messageURI+'=>'+msgHdr.folder.URI);

    let folder=msgHdr.folder;
    if (!folder || !folder.server)              //paranoia!
      this.key=gLocalFolder;
    else {
      let account = gAccountMgr.FindAccountForServer(folder.server);
      if (!account)
        this.key=gLocalFolder;
      else
        this.key=account.key;
    }

    // extract just the mail address from the author and compare to the list of 'my' Addresses
    let author = gHeaderParser.extractHeaderAddressMailboxes(msgHdr.author);
    author=author?author.toLowerCase():'';  //see mail Sven Giermann, 16.3.2010
    let received=checkEmail(author, this.key, true)?'out':'in';
    this.data_cache[messageURI]=received;

  //Would be nice to just check 'received' headers
  //http://developer.mozilla.org/en/docs/Extensions:Thunderbird:customDBHeaders_Preference
  //  needs: user_pref( "mailnews.customDBHeaders", "Return-Path Received");
  /*
    let rp = msgHdr.getStringProperty("return-path"); //klappt nicht! (ist nicht in .msf)
    console.log("SIO: Return-Path: " + rp + "\n");
    let r = msgHdr.getStringProperty("received"); //klappt
    console.log("SIO: Received: " + r + "\n");
  */

// patch by Pedro Pedruzzi <pedro.pedruzzi@gmail.com>
// inspired by http://mail.google.com/support/bin/answer.py?hl=de&answer=8156
    if (received=='in') {
      let to = getMailboxesArray(msgHdr.recipients);
      let indicator = 'to_list';
      if (to.length == 1 && checkEmail(to[0], this.key, true))
        indicator = 'to_me';
      else {
        let cc = getMailboxesArray(msgHdr.ccList);
        for (let i = 0; i < to.length; i++)
          if (checkEmail(to[i], this.key, true)) {
            indicator = 'to_others';
            break;
          }
        if (indicator=='to_list') {
          for (let i = 0; i < cc.length; i++)
            if (checkEmail(cc[i], this.key, true)) {
              indicator = 'to_others';
              break;
            }
        }
      }
      this.indicator_cache[messageURI] = indicator;
      //console.log('to = [' + to + ']\n');
      //console.log('cc = [' + cc + ']\n');
      //console.log('indicator = ' + indicator + '\n');
    } else
      this.indicator_cache[messageURI] = null;

    // Add keyword 'in' or 'out' to message
    // these are automagically transformed to properties
    // 'kw-in' and 'kw-out' on all cells
    // This would be a nice way to set properties on cells and
    // would render the factory approach lower down unnecessary.
    // Unfortunately this does not work reliable, probably related to the
    // way keywords (aka tags) are store in imap folders
    // Probably will work if set at another time (e.g. after message download)
  /*
    let keywords=msgHdr.getStringProperty('keywords');
    let tags=keywords.split(' ');
    let haveProp=false;
    for (let i=0; i<tags.length; i++) {
      if (tags[i]=='in' || tags[i]=='out') { haveProp=true; break; }
    }
    if (!haveProp)
      msgHdr.setStringProperty('keywords', (keywords?keywords+' '+received:received));
  */

    // mark message as junk, if its in a folder, marked as junk (thanks to Martijn Coppoolse for this hint)
    // or if the message has a nonzero junkscore
    let isJunk=false;
    if (received=='in') {
      isJunk = msgHdr.folder.getFlag(MSG_FOLDER_FLAG_JUNK);
      if (!isJunk) {
        let junkScore = msgHdr.getStringProperty("junkscore");
        // according to SelectedMessagesAreJunk() in mailWindowOverlay.js:
        isJunk =  ((junkScore != "") && (junkScore != "0"));
        // but i think its:
        //let isJunk =  ((junkScore === "") || (junkScore != "0"));
      }
    }
    let newsgroup=msgHdr.folder.URI.substr(0,5)=='news:';

    // get all correspondent and store
//      let charset=undefined;  //TB: names with Umlaute fehlen, SM: Umlaute falsch, cyrillic falsch
//      let charset='UTF-8';  //TB: Umlaute falsch, SM: Umlaute falsch, cyrillic falsch
    let charset='ISO-8859-1';  //TB: Umlaute ok, SM: Umlaute ok, cyrillic falsch
    //let charset=msgHdr.Charset;
    let corr=new Object;
//debug('0: author:     '+msgHdr.author)
//debug('0: recipients: '+msgHdr.recipients)
    let emailsA = received=='in' || newsgroup ?
        msgHdr.author: msgHdr.recipients;
//debug('1: Gegenseite: '+emailsA)
    let allAddressesA = gHeaderParser.parseEncodedHeader(emailsA, charset, false);
    if (emailsA.trim() == "") allAddressesA = [];
    for (let address of allAddressesA) {
      corr[address.email]=isJunk?address.toString():(address.name?address.name:address.email);
//debug('  => '+corr[address.email]);
    }
    this.addr_cache[messageURI]=(received=='in'||newsgroup?gInTextPrefix:gOutTextPrefix)+concatNames(corr);

    let side=new Object;
    let emailsR = received=='in' || newsgroup ?
        msgHdr.recipients: msgHdr.author;
//debug('1: Diese Seite: '+emailsR)
    let allAddressesR = gHeaderParser.parseEncodedHeader(emailsR, charset, false);
    if (emailsR.trim() == "") allAddressesR = [];
    for (let address of allAddressesR) {
      side[address.email]=isJunk?address.toString():(address.name?address.name:address.email);
//debug('  => '+side[address.email]);
    }
    this.side_cache[messageURI]=concatNames(side);

    this.length+=1;
  },
  received: function(messageURI) { return this.data_cache[messageURI]; },
  addr: function(messageURI)     { return this.addr_cache[messageURI]; },
//    corr: function(messageURI)     { return this.corr_cache[messageURI]; },
  side: function(messageURI)     { return this.side_cache[messageURI]; },
  indicator: function(messageURI){ return this.indicator_cache[messageURI]; },

  OnItemEvent: function(folder, event) { // ( nsIMsgFolder item , nsIAtom event )
//debug('cache: OnItemEvent');
    //z.B. 'FolderLoaded', 'DeleteOrMoveMsgCompleted', 'CompactCompleted'
    if (event=='CompactCompleted' || event=='FolderLoaded' && folder.getFlag(MSG_FOLDER_FLAG_TRASH)) {
      // there is no event, when the Trash is emptied => clear cache, when trash folder gets loaded
      this.clear(folder);
    }
  }
}

//------------------------------------------------------------------------------------

/*  from mailnews/base/public/nsIMsgCustomColumnHandler.idl
       When implementing a js custom column handler (of type nsITreeView) you must implement the following
       functions:
       1. isEditable
       2. GetCellProperties
       3. GetImageSrc
       4. GetCellText
       5. CycleCell
       6. GetSortStringForRow
       7. GetSortLongForRow
       8. isString

       You can, at your option, implement (No, you must! (gg))
       9.  GetRowProperties.
    (also see mailnews/base/src/nsMsgDBView.cpp)

  GetRowProperties is called for columns, which are not visible, but
  GetCellProperties is called only for visible columns!
*/
function haveProperty(properties, property) {
  for (let i=0; i<properties.Count(); i++) {
    let prop;
    prop=properties.GetElementAt(i).QueryInterface(Ci.nsIAtom);
    if (prop.toString()==property) return true;
  }
  return false;
}

//--------------------------------------
var columnHandler_inoutcol = {
  getCellText:         function(row, col) {
//debug('Get cell text for inoutcol '+row+'\n');
/*
    let messageURI = gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
    if (cache.received(messageURI)=='in') return '<--';
    else return '-->';
*/
    return '';
  },
  getCellProperties:   function(row, col, properties) {
//debug('Get cell inoutcol, isContainer='+gDBView.isContainer(row)+'\n');
//dumpProps(row, col, properties);
    //probably should use:
    //let key = gDBView.getKeyAt(row);
    //let hdr = gDBView.db.GetMsgHdrForKey(key);
    let messageURI = gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
    let received=cache.received(messageURI);
    let indicator=cache.indicator(messageURI);
      //properties already defined:
      //    focus, [leaf|container], [even|odd], sio_inoutCol
      //  appending [in|out]
    let props;
    if (received!==null)
      props=received;
    if (indicator!==null)
      props+=" "+indicator;
    return props;
  },
  getRowProperties:    function(row, properties) {
    //this is done in the sio_inoutaddresscol
  },
  getImageSrc:         function(row, col) {
    return null;
  },

  //not really called !?
  isEditable:          function(row, col) {
    return false;
  },
  cycleCell:           function(row, col) {
  },

  getSortStringForRow: function(hdr) {
//debug('get sort string for inoutcol\n');
    return '';
  },
  getSortLongForRow:   function(hdr) {
    let messageURI=hdr.folder.getUriForMsg(hdr);
//debug('get sort long for inoutcol '+messageURI+'\n');
    cache.cache(messageURI, hdr);
    if (cache.received(messageURI)=='out') return 0;
    else if (cache.indicator(messageURI)=='to_me') return 1;
    else if (cache.indicator(messageURI)=='to_others') return 2;
    else return 3;
  },
  isString:            function() {
    return false;
  }
}

//--------------------------------------
var columnHandler_inoutaddresscol = {
  getCellText:         function(row, col) {
    let messageURI = gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
  //should probably use: FetchAuthor(msgHdr);
  //should probably use: FetchRecipients(msgHdr);
  //debug('Get cell inoutaddresscol row='+row+' URI= '+messageURI+' returned '+cache.addr(messageURI)+'\n');
    return cache.addr(messageURI);
  },
  getCellProperties:   function(row, col, properties) {
//debug('Get cell inoutaddresscol row='+row+'\n');
//dumpProps(row, col, properties);
    let messageURI = gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
    let received=cache.received(messageURI);
    let indicator=cache.indicator(messageURI);
      //properties already defined:
      //    focus, [leaf|container], [even|odd], sio_inoutCol
      //  appending [in|out]
    let props;
    if (received!==null)
      props=received;
    if (indicator!==null)
      props+=" "+indicator;
    return props;
  },
  getRowProperties:    function(row, properties) {
//debug('Get row inoutaddresscol index='+row+'\n');
//dumpProps(row, null, properties);
    let messageURI = gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
    let received=cache.received(messageURI);
    let indicator=cache.indicator(messageURI);
    //properties already defined:
    //    leaf|container, even|odd
    //  appending [in|out]
    let props;
    if (received!==null)
      props=received;
    if (indicator!==null)
      props+=" "+indicator;
    return props;
  },
  getImageSrc:         function(row, col) {
/*
    if (col.id=='sio_inoutaddressCol') {
      // image inserted in front of the text, returned in getCellText
      return "chrome://showInOut/skin/out.png";
    }
*/
    return null;
  },

  //not really called !?
  isEditable:          function(row, col) {
    return false;
  },
  cycleCell:           function(row, col) {
  },

  getSortStringForRow: function(hdr) {
    let messageURI=hdr.folder.getUriForMsg(hdr);
//debug('get sort string for inoutaddresscol '+messageURI+'\n');
    cache.cache(messageURI, hdr);
    let s=cache.addr(messageURI);
    if (s.substr(0,1)=='"') s=s.substr(1);
    return s;
  },
  getSortLongForRow:   function(hdr) {
//debug('called sort long in inoutaddresscol\n');
  },
  isString:            function() {
    return true;
  }
}


//--------------------------------------
var columnHandler_inoutthissidecol = {
  getCellText:         function(row, col) {
    let messageURI = gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
  //should probably use: FetchAuthor(msgHdr);
  //should probably use: FetchRecipients(msgHdr);
  //debug('Get cell inoutaddresscol row='+row+' URI= '+messageURI+' returned '+cache.addr(messageURI)+'\n');
//TODO
    return cache.side(messageURI);
  },
  getCellProperties:   function(row, col, properties) {
//console.log('vGet cell inoutaddresscol row='+row+'\n');
//dumpProps(row, col, properties);
    let messageURI = gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
    let received=cache.received(messageURI);
    let indicator=cache.indicator(messageURI);
      //properties already defined:
      //    focus, [leaf|container], [even|odd], sio_inoutCol
      //  appending [in|out]
    let props;
    if (received!==null)
      props=received;
    if (indicator!==null)
      props+=" "+indicator;
    return props;
  },
  getRowProperties:    function(row, properties) {
//debug('Get row inoutaddresscol index='+row+'\n');
//dumpProps(row, null, properties);
    let messageURI = gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
    let received=cache.received(messageURI);
    let indicator=cache.indicator(messageURI);
    //properties already defined:
    //    leaf|container, even|odd
    //  appending [in|out]
    let props;
    if (received!==null)
      props=received;
    if (indicator!==null)
      props+=" "+indicator;
    return props;
  },
  getImageSrc:         function(row, col) {
/*
    if (col.id=='sio_inoutaddressCol') {
      // image inserted in front of the text, returned in getCellText
      return "chrome://showInOut/skin/out.png";
    }
*/
    return null;
  },

  //not really called !?
  isEditable:          function(row, col) {
    return false;
  },
  cycleCell:           function(row, col) {
  },

  getSortStringForRow: function(hdr) {
    let messageURI=hdr.folder.getUriForMsg(hdr);
//debug('get sort string for inoutaddresscol '+messageURI+'\n');
    cache.cache(messageURI, hdr);
//TODO
    let s=cache.side(messageURI);
    if (s.substr(0,1)=='"') s=s.substr(1);
    return s;
  },
  getSortLongForRow:   function(hdr) {
//debug('called sort long in inoutaddresscol\n');
  },
  isString:            function() {
    return true;
  }
}


//------------------------------------------------------------------------------------
    // general column handler
    // This column handlers replace the original handlers and
    // are calling the original handlers to get the correct values. But
    // to do this the custom column handler must be temporarily removed,
    // or we will be called recursivly. Fortunately, removing and adding
    // handlers is a lightweight operation
    // All this only to set the in/out property in getCellProperties()!
    /// The original code is in mailnews/base/src/nsMsgDBView.cpp
var sio_columnHandler = {
	otherCCH: null,
  getCellText: function(row, col) {
    gDBView.removeColumnHandler(col.id);
		let val;
		if (this.otherCCH) {
			val=this.otherCCH.getCellText(row, col);
		} else {
			val=gDBView.getCellText(row, col);
		}
    gDBView.addColumnHandler(col.id, this);
    return val;
  },
  getCellProperties: function(row, col, properties) {
		if (this.otherCCH) {
			let props=this.otherCCH.getCellProperties(row, col, properties);
			if (props) properties=props;
		}
//original function already had set standard properties, just add our property
		let messageURI = gDBView.getURIForViewIndex(row);
		cache.cache(messageURI);
		let received=cache.received(messageURI);
		let indicator=cache.indicator(messageURI);
		if (properties) {
			if (received!==null)
				properties.AppendElement(received);
			if (indicator!==null)
				properties.AppendElement(indicator);
			return "";
		} else {
			let ret="";
			if (received!==null) ret=received;
			if (indicator!==null) ret+=" "+indicator;
			return ret;
		}
  },
  getRowProperties: function(row, properties) {
		if (this.otherCCH) {
			let props=this.otherCCH.getRowProperties(row, properties);
			if (props) return props;
		} else {
//original function already had set standard properties
		}
  },
  getImageSrc: function(row, col) {
		if (this.otherCCH) {
			return this.otherCCH.getImageSrc(row, col);
		} else {
//original function never returns something
		}
    return;
  },
  isEditable: function(row, col) {
		if (this.otherCCH) {
			return this.otherCCH.isEditable(row, col);
		} else {
//original function always returns false!
		}
    return false;
  },
  cycleCell: function(row, col) {
		if (this.otherCCH) {
			return this.otherCCH.cycleCell(row, col);
		} else {
//original function does nothing for cells, containing text
		}
    return ;
  },
  getSortStringForRow: function(hdr) {
		if (this.otherCCH) {
			return this.otherCCH.getSortStringForRow(hdr);
		} else {
//not called
		}
    return ;
  },
  getSortLongForRow: function(hdr) {
		if (this.otherCCH) {
			return this.otherCCH.getSortLongForRow(hdr);
		} else {
//not called
		}
    return ;
  },
  isString: function(dummy) {
		if (this.otherCCH) {
			return this.otherCCH.isString();
		} else {
//not called
		}
    return ;
  }
};
//getSortStringForRow, getSortLongForRow and isString need not be
//  implemented for standard columns since they are not called

//------------------------------------------------------------------------------------

var observer = {
  // Ci.nsIObserver
  addHandlersToCols: function(col, state) {
debug('observer: addHandlersToCols for col='+col+' on='+state);
    // define column_handlers for some other columns. This allows me to set the in/out property
    // ONLY define _standard_ columns with _string_ content!!!
    // column Names: subjectCol dateCol senderCol recipientCol sizeCol locationCol accountCol
		if (col!='*') {		// work with specific column
			if (state) {		// add handler to specific column
				if (gColumns.has(col)) {
debug('add handler to '+col);
					let ch=Object.assign({}, sio_columnHandler);
					ch.otherCCH=otherCCH.has(col)?otherCCH.get(col):null;
					gDBView.addColumnHandler(col, ch);
				}
			} else {				// remove handler from specific column
debug('remove handler from '+col);
				gDBView.removeColumnHandler(col);
				if (otherCCH.has(col)) {		// reset column handler for foreign columns
					gDBView.addColumnHandler(col, otherCCH.get(col));
debug('reset original handler for '+col);
				}
			}
		} else if (state) {	// add handlers to all selected columns (after change of folder)
			try {
				let cols = (prefs.Columns || '').split(',');  //was ??, but bad for ATN
				cols.forEach(col => {
					col=col.trim();
					if (gColumns.has(col)) {
debug('add initial handler to '+col);
try { let d=gDBView.getColumnHandler(col); debug('col '+col+' already has a handler'); } catch(e) {}
						let ch=Object.assign({}, sio_columnHandler);	// clone the handler
						ch.otherCCH=otherCCH.has(col)?otherCCH.get(col):null;
						gDBView.addColumnHandler(col, ch);
					}
				});
			} catch(e) { console.log('ShowInOut: addHandlersToCols: '+col+' add handler Error: '+e+'\n'); }
		} else {	// remove all column handlers
			let cols = (prefs.Columns || '').split(',');  //was ??, but bad for ATN
			cols.forEach(col => {
				col=col.trim();
				if (gColumns.has(col)) {
debug('finally remove handler from '+col);
					try { gDBView.removeColumnHandler(col); } catch(e) {}
					if (otherCCH.has(col)) {		// reset column handler for foreign columns
debug('reset original handler for '+col);
						gDBView.addColumnHandler(col, otherCCH.get(col));
					}
				}
			});
		}
  },

  observe: function(aSubject, aTopic, aData)
  {
//debug('observer: observe topic='+aTopic);
    if (aTopic=='MsgCreateDBView') {
debug('observer MsgCreateDBView state='+state+' aData='+aData+' aSubject='+aSubject);
			if (!aSubject) return;	//normally a nsIMsgFolder
					//but not on first call (when gDBView does not exists yet) or when an addon is loaded
			gW=Services.wm.getMostRecentWindow("mail:3pane");
			gD=gW.document;
      gDBView=gW.gDBView;
      if (typeof gDBView!='undefined' && gDBView) { //check mit typeof, da gelegentlich undefined!
				if (state!='cols')   // fill gColumns and add our own columns, only on first call!
					addCols();
        //Must be set on every folder
debug('add columnsHandlers for our own columns');
        gDBView.addColumnHandler("sio_inoutCol", columnHandler_inoutcol);
        gDBView.addColumnHandler("sio_inoutaddressCol", columnHandler_inoutaddresscol);
        gDBView.addColumnHandler("sio_inoutthissideCol", columnHandler_inoutthissidecol);

        observer.addHandlersToCols('*', true);	// initially add generic columnHandlers to other columns
      }
      else debug('observer: MsgCreateDBView: no gDBView yet');
    } else if (aTopic=="dom-window-destroyed") {
				//despite the name, this also fires on load with the window as aSubject
//dom-window-destroyed file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/abs_status.html
//dom-window-destroyed moz-extension://1eb49a87-7593-4a1f-b05a-aa4abc1c7bc8/abs_options.html
			if (aSubject && aSubject.location.pathname.includes('/sio_options.html')) {
debug(aTopic+' '+aSubject.location);
				options=aSubject;	//we have an options window
			}
		}
  }
}

function setFilters() {
  try {
    var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");
  } catch (e) { console.log("SIO: setFilters: no QuickFilterManager"); return; }       //module not in SeaMonkey
////// Define filters
  QuickFilterManager.defineFilter({
    name: "sio-correspondent",
    domId: "qfb-qs-sio-correspondent",
    appendTerms: function(aTermCreator, aTerms, aFilterValue) {
      // aFilterValue is always 'true'!
      if (gD.getElementById(this.domId).checked) {
        let text=gD.getElementById('qfb-qs-textbox').value;
//debug(' search for '+text+'\n');
        if (text) searchTerm(text, aTermCreator, aTerms, this.name);
      }
    }
    //getDefaults()
    //propagateState: function(aOld, aSticky) {
    //clearState(aState)
    //domBindExtra: function(aDocument, aMuxer, aNode) {
    //onCommand: function(aState, aNode, aEvent, aDocument) {
    //reflectInDOM(aDomNode, aFilterValue, aDoc, aMuxer)
    //postFilterProcess(aState, aViewWrapper, aFiltering)
      //onSearchStart: function(aCurState) {
      //onSearchMessage: function(aKeywordMap, aMsgHdr, aFolder) {
      //onSearchDone: function(aCurState, aKeywordMap, aStatus) {
  });

  QuickFilterManager.defineFilter({
    name: "sio-thisside",
    domId: "qfb-qs-sio-thisside",
    appendTerms: function(aTermCreator, aTerms, aFilterValue) {
      // aFilterValue is always 'true'!
      if (gD.getElementById(this.domId).checked) {
        let text=gD.getElementById('qfb-qs-textbox').value;
//debug(' search for '+text+'\n');
        if (text) searchTerm(text, aTermCreator, aTerms, this.name);
      }
    }
  });

////// add command handlers (see _bindUI() in chrome\messenger\content\messenger\quickFilterBar.js)

  let domNodeC = gD.getElementById('qfb-qs-sio-correspondent');
  let handlerC = function(aEvent) {
    try {
      let postValue = domNodeC.checked ? true : null;
      gW.QuickFilterBarMuxer.activeFilterer.setFilterValue(
        'sio-correspondent',
        postValue
      );
      gW.QuickFilterBarMuxer.deferredUpdateSearch();
    } catch (e) {
      debug('search handler throws: '+e);
    }
  };
  domNodeC.addEventListener("command", handlerC);

  let domNodeT = gD.getElementById('qfb-qs-sio-thisside');
  let handlerT = function(aEvent) {
    try {
      let postValue = domNodeT.checked ? true : null;
      gW.QuickFilterBarMuxer.activeFilterer.setFilterValue(
        'sio-thisside',
        postValue
      );
      gW.QuickFilterBarMuxer.deferredUpdateSearch();
    } catch (e) {
      debug('search handler throws: '+e);
    }
  };
  domNodeT.addEventListener("command", handlerT);

  //apply quick filter on startup
  gW.QuickFilterBarMuxer.deferredUpdateSearch();

  return;
}

function MsgSortByCorrespondent()
{
  gDBView.curCustomColumn="sio_inoutaddressCol";
  gW.MsgSortThreadPane('byCustom');
}
function MsgSortByThisSide()
{
  gDBView.curCustomColumn="sio_inoutthissideCol";
  gW.MsgSortThreadPane('byCustom');
}
function MsgSortByInOut()
{
  gDBView.curCustomColumn="sio_inoutCol";
  gW.MsgSortThreadPane('byCustom');
}

function addCols() {
debug('addCols');
  let tc=gD.getElementById("threadCols");
  if (!tc) {
debug("no threadCols yet");
    return;
  }

	// fill gColumns with [id->label] for all columns which can be styled
  let cols=gD.getElementById('threadCols').childNodes;
  cols.forEach(col=>{
    if (col.id && !col.getAttribute('fixed') && !(col.id).includes('sio_')) {
			try {
				let ch=gDBView.getColumnHandler(col.id);
debug('col='+col.id+' already has a columnHandler, saved');
				otherCCH.set(col.id, ch);		// save for later user
			} catch(e) {
debug('col='+col.id+' added to gColumns');
//        gColumns.set(col.id, col.getAttribute('label'));
			}
      gColumns.set(col.id, col.getAttribute('label'));
    }
  });

/*
*  add custom columns
*/
debug('add our own columns');
  let lc=tc.lastElementChild;                 // should be the <treecolpicker>

  let fc=gD.getElementById('flaggedCol');
  let fcs=fc.nextElementSibling;
  let c=gD.importNode(fc, true);
  c.setAttribute('id','sio_inoutCol');
  c.setAttribute('class','treecol-image inoutColumnHeader');  //needs css for inoutColumnHeader
  c.setAttribute('label',strings.inoutColumn_label);
  c.setAttribute('tooltiptext',strings.inoutColumn_tooltip);
  c.setAttribute('ordinal',"45");
  c.setAttribute('style', '-moz-box-ordinal-group:43;');
  c.setAttribute('added','gg');
  let s=gD.importNode(fcs, true);
  s.setAttribute('style', '-moz-box-ordinal-group:42;');
  s.setAttribute('added','gg');
  lc.insertAdjacentElement('beforebegin', s);
  lc.insertAdjacentElement('beforebegin', c);

  fc=gD.getElementById('correspondentCol');
  fcs=fc.nextElementSibling;
  c=gD.importNode(fc, true);
  c.setAttribute('id','sio_inoutaddressCol');
  c.setAttribute('label',strings.inoutaddressCol_label);
  c.setAttribute('tooltiptext',strings.inoutaddressCol_tooltip);
  c.setAttribute('ordinal',"47");
  c.setAttribute('style', '-moz-box-ordinal-group:45;');
  c.setAttribute('added','gg');
  s=gD.importNode(fcs, true);
  s.setAttribute('style', '-moz-box-ordinal-group:44;');
  s.setAttribute('added','gg');
  lc.insertAdjacentElement('beforebegin', s);
  lc.insertAdjacentElement('beforebegin', c);

  c=gD.importNode(fc, true);
  c.setAttribute('id','sio_inoutthissideCol');
  c.setAttribute('label',strings.inoutthissideCol_label);
  c.setAttribute('tooltiptext',strings.inoutthissideCol_tooltip);
  c.setAttribute('ordinal',"49");
  c.setAttribute('style', '-moz-box-ordinal-group:47;');
  c.setAttribute('added','gg');
  s=gD.importNode(fcs, true);
  s.setAttribute('style', '-moz-box-ordinal-group:46;');
  s.setAttribute('added','gg');
  lc.insertAdjacentElement('beforebegin', s);
  lc.insertAdjacentElement('beforebegin', c);

/*
*  add menu entries to 'View/Sort by'
*/
  let sm=gD.getElementById("menu_viewSortPopup");
  let sbc=gD.getElementById("sortByCorrespondentMenuitem");

  let mi=gD.createXULElement('menuitem');
  mi.setAttribute('id','sortBySioCorrespondentMenuItem');
  mi.setAttribute('type','radio');
  mi.setAttribute('name','sortby');
  mi.setAttribute('label',strings.inoutaddressCol_label);
  sm.insertBefore(mi, sbc);
  mi.addEventListener("command", MsgSortByCorrespondent);

  mi=gD.createXULElement('menuitem');
  mi.setAttribute('id','sortBySioThisSideMenuItem');
  mi.setAttribute('type','radio');
  mi.setAttribute('name','sortby');
  mi.setAttribute('label',strings.inoutthissideCol_label);
  sm.insertBefore(mi, sbc);
  mi.addEventListener("command", MsgSortByThisSide);

  mi=gD.createXULElement('menuitem');
  mi.setAttribute('id','sortBySioInOutMenuItem');
  mi.setAttribute('type','radio');
  mi.setAttribute('name','sortby');
  mi.setAttribute('label',strings.inoutColumn_label);
  sm.insertBefore(mi, sbc);
  mi.addEventListener("command", MsgSortByInOut);

/*
*  add buttons to quick filter toolbar
*/
  let qfb=gD.getElementById("quick-filter-bar-filter-text-bar");
  let sb=gD.getElementById("qfb-qs-sender");

  let b=gD.createXULElement('toolbarbutton');
  b.setAttribute('id','qfb-qs-sio-correspondent');
  b.setAttribute('type','checkbox');
  b.setAttribute('class','toolbarbuton-1');
  b.setAttribute('label',strings.inoutaddressCol_label);
  qfb.insertBefore(b, sb);

  b=gD.createXULElement('toolbarbutton');
  b.setAttribute('id','qfb-qs-sio-thisside');
  b.setAttribute('type','checkbox');
  b.setAttribute('class','toolbarbuton-1');
  b.setAttribute('label',strings.inoutthissideCol_label);
  qfb.insertBefore(b, sb);

  setFilters();

/*
*  load style sheets
*/
  let { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
  let extension = ExtensionParent.GlobalManager.getExtension("showInOut@ggbs.de");
  let styleSheetService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                                    .getService(Components.interfaces.nsIStyleSheetService);
  let uri = Services.io.newURI(extension.getURL("skin/showInOut.css"), null, null);
  styleSheetService.loadAndRegisterSheet(uri, styleSheetService.USER_SHEET);

  let file = Services.dirsvc.get("UChrm", Components.interfaces.nsIFile);
  file.append("showInOut.css");
  if (file.exists()) {
    let url = Services.io.getProtocolHandler("file").
      QueryInterface(Components.interfaces.nsIFileProtocolHandler).
      getURLSpecFromFile(file);
    let uri = Services.io.newURI(url, null, null);
    styleSheetService.loadAndRegisterSheet(uri, styleSheetService.USER_SHEET);
  }

  state='cols';		// columns added
}

function changedCols() {
debug('changedCols');
	let changed=new Map;
  let cols=gD.getElementById('threadCols').childNodes;
  cols.forEach(col=>{
    if (col.id && !col.getAttribute('fixed') && !(col.id).includes('sio_')) {
			if (gColumns.has(col.id)) return;
			try {
				let ch=gDBView.getColumnHandler(col.id);
debug('new col '+col.id+' found, already has a columnHandler, saved');
				otherCCH.set(col.id, ch);		// save for later user
			} catch(e) {}
debug('new col '+col.id+' found, added to gColumns');
      gColumns.set(col.id, col.getAttribute('label'));
			changed.set(col.id, col.getAttribute('label'));
    }
  });
	let colsArray=Array.from(cols);
  gColumns.forEach((label, col) => {
		if (colsArray.some(item=>item.id==col)) return;
debug('obsolete col '+col+' found, remove');
		changed.set(col, '');
		gColumns.delete(col);
		if (otherCCH.has(col)) otherCCH.delete(col);
		try {
			let ch=gDBView.getColumnHandler(col); 
debug('obsolete col '+col+' still had column handler (not removed)');
//Probably i shouldn't do this in case other addons also try to remove the handler
//but fires after sio and does not catch the exception!
//			gDBView.removeColumnHandler(col); 
		} 
		catch(e) { /*debug('get or remove columnHandler throws '+e);*/ }
		//remove from prefs is done in background
	});
debug('changedCols done');
	return changed;
}

var debugcache='';
//var filecache='';
//var { OS } = ChromeUtils.import("resource://gre/modules/osfile.jsm");
//var pth = OS.Path.join('T:', 'Temp', 'showInOut.log');
function debug(txt) {
//  filecache+=txt+'\n';
//  OS.File.writeAtomic(pth, filecache, { tmpPath: pth+'.tmp'});

	if (prefs) {
		if (prefs.debug) {
			if (debugcache) console.log(debugcache); debugcache='';
			console.log('SIO: '+txt);
		}
	} else {
		debugcache+='SIO: (cached) '+txt+'\n';
	}
}

// debug functions
/*
function dumpTree() {
  let tree=document.getElementById('threadTree');
//  console.log('DOM: '+tree.tagName+'\n');
  let rows=tree.firstChild.nextSibling; //treechildren, nicht xul:treerows!!!
  //rows.firstChild: ex. nicht!
  //rows.childNodes.length=0 !!!
}

function dumpProps(row, col, properties) {
  for (let i=0; i<properties.Count(); i++) {
    let prop;
    prop=properties.GetElementAt(i).QueryInterface(Ci.nsIAtom);
    console.log('prop ('+row+','+(col?col.id:'')+'): '+prop.toString()+"\n");
  }
}
*/

