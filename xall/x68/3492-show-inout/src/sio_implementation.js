var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");
const Ci = Components.interfaces;

var state='';
var prefs;
var num=0;
var filtersDone=false;

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
var gMyAddr;
var gMyAddrArr;
var gLocalFolder;
var gColumns=new Map;	//id->label
var otherCCH=new Map;	//save custom column handlers from other add-ons
var addonType='';
var gFire=null;
var gCurrentFolder=null;

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
			ExtensionSupport.unregisterWindowListener("ShowInOut");
      gCurrentFolder=null;
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
            prefs=prefsP;
            init();
          }
        },
        prefChanged: async function(prefsP, col, add) {	//create=true: add col, else remove col
          prefs=prefsP;
debug('prefChanged '+col+' '+add);
					if (col) {
						// add or remove a generic columnHandler to another column
						observer.addHandlersToCols(col, add); 
					} else {
						config.getMyEmails();
						gInTextPrefix=prefs.InTextPrefix || '';  //was ??, but bad for ATN
						gOutTextPrefix=prefs.OutTextPrefix || '';  //was ??, but bad for ATN
					}
        },
        cols: async function() {
debug('cols');
if (gColumns.size==0) debug('gColumns array is not filled yet!');
          findCols(); //just in case
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
        addonChanged: async function(type) {
debug('addonChanged called type='+type+' state='+state);
//state          if (state!='cols') return null;  //probably that myself which gets enabled
          if (type=='install') {
            //no foreigns columns are installed yet, MsgCreateDBView must do the work
            addonType=type;
            return null;
          } else {
            //check for new or removed custom columns
            return changedCols();
          }
        },
        // An event. Most of this is boilerplate you don't need to worry about, just copy it.
        onColumnsAdded: new ExtensionCommon.EventManager({
          context,
          name: "sio.onColumnsAdded",
          register(fire) {
debug('onColumnsAdded register');
            gFire=fire;
//use: gFire.async(changed);
            return function() {
              gFire=null;
debug('onColumnsAdded unregister');
            };
          },
        }).api(),
        debug: async function(txt, ln) {
					debug(txt, ln);
				}
      },

    };
  }
  close() {
    // This function is called if the extension is disabled or removed, or Thunderbird closes.
    // We registered it with callOnClose, above.
    // gg: also called if options window closes
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
//	observer.observe(null, "MsgCreateDBView", 'force');	// after enabling the addon there is no other notification
  registerListener();	//fires onLoad, which call MsgCreateDBView
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
	gDBView: null,
  getCellText:         function(row, col) {
//debug('Get cell text for inoutcol '+row+'\n');
/*
    let messageURI = this.gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
    if (cache.received(messageURI)=='in') return '<--';
    else return '-->';
*/
    return '';
  },
  getCellProperties:   function(row, col, properties) {
//debug('Get cell inoutcol, isContainer='+this.gDBView.isContainer(row)+'\n');
//dumpProps(row, col, properties);
    //probably should use:
    //let key = this.gDBView.getKeyAt(row);
    //let hdr = this.gDBView.db.GetMsgHdrForKey(key);
    let messageURI = this.gDBView.getURIForViewIndex(row);
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
	gDBView: null,
  getCellText:         function(row, col) {
    let messageURI = this.gDBView.getURIForViewIndex(row);
    cache.cache(messageURI);
  //should probably use: FetchAuthor(msgHdr);
  //should probably use: FetchRecipients(msgHdr);
//debug('Get cell text: inoutaddresscol row='+row+' URI= '+messageURI+' returned '+cache.addr(messageURI)+'\n');
    return cache.addr(messageURI);
  },
  getCellProperties:   function(row, col, properties) {
//debug('Get cell props: inoutaddresscol row='+row+'\n');
//dumpProps(row, col, properties);
    let messageURI = this.gDBView.getURIForViewIndex(row);
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
    let messageURI = this.gDBView.getURIForViewIndex(row);
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
	gDBView: null,
  getCellText:         function(row, col) {
    let messageURI = this.gDBView.getURIForViewIndex(row);
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
    let messageURI = this.gDBView.getURIForViewIndex(row);
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
    let messageURI = this.gDBView.getURIForViewIndex(row);
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
	gDBView: null,
	otherCCH: null,
  getCellText: function(row, col) {
    this.gDBView.removeColumnHandler(col.id);
		let val;
		if (this.otherCCH) {
			val=this.otherCCH.getCellText(row, col);
		} else {
			val=this.gDBView.getCellText(row, col);
		}
    this.gDBView.addColumnHandler(col.id, this);
    return val;
  },
  getCellProperties: function(row, col, properties) {
		if (this.otherCCH) {
			let props=this.otherCCH.getCellProperties(row, col, properties);
			if (props) properties=props;
		}
//original function already had set standard properties, just add our property
		let messageURI = this.gDBView.getURIForViewIndex(row);
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
  addHandlersToCols: function(col, add) {	//add=true; add col, else remove col
debug('observer: addHandlersToCols for col='+col+' add='+add);
    // define column_handlers for some other columns. This allows me to set the in/out property
    // ONLY define _standard_ columns with _string_ content!!!
    // column Names: subjectCol dateCol senderCol recipientCol sizeCol locationCol accountCol
		if (col!='*') {		// work with specific column
			if (add) {		// add handler to specific column
				if (gColumns.has(col)) {
debug('add handler to '+col);
					let ch=Object.assign({}, sio_columnHandler);	// clone the handler
					ch.gDBView=gW.gDBView;
					ch.otherCCH=otherCCH.has(col)?otherCCH.get(col):null;
					gW.gDBView.addColumnHandler(col, ch);
				}
			} else {				// remove handler from specific column
debug('remove handler from '+col);
				gW.gDBView.removeColumnHandler(col);
				if (otherCCH.has(col)) {		// reset column handler for foreign columns
					gW.gDBView.addColumnHandler(col, otherCCH.get(col));
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
try { let d=gW.gDBView.getColumnHandler(col); debug('col '+col+' already has a handler'); } catch(e) {}
						let ch=Object.assign({}, sio_columnHandler);	// clone the handler
						ch.gDBView=gW.gDBView;
						ch.otherCCH=otherCCH.has(col)?otherCCH.get(col):null;
						gW.gDBView.addColumnHandler(col, ch);
					}
				});
			} catch(e) { console.log('ShowInOut: addHandlersToCols: '+col+' add handler Error: '+e+'\n'); }
		} else {	// remove all column handlers
			let cols = (prefs.Columns || '').split(',');  //was ??, but bad for ATN
			cols.forEach(col => {
				col=col.trim();
				if (gColumns.has(col)) {
debug('finally remove handler from '+col);
					try { gW.gDBView.removeColumnHandler(col); } catch(e) {}
					if (otherCCH.has(col)) {		// reset column handler for foreign columns
debug('reset original handler for '+col);
						gW.gDBView.addColumnHandler(col, otherCCH.get(col));
					}
				}
			});
		}
  },

  observe: function(aSubject, aTopic, aData)
  {
    if (aTopic=='MsgCreateDBView') {
debug('observer MsgCreateDBView state='+state+' aData='+aData+' aSubject='+aSubject);
      if (aSubject) gCurrentFolder=aSubject;
debug('folder='+gCurrentFolder);//!==null?gCurrentFolder.folderURL:'unknown');
if (gCurrentFolder) debug('folder='+gCurrentFolder.folderURL);
			//gW=Services.wm.getMostRecentWindow("mail:3pane");
			//if (!gW) return;	//e.g. if called with aData=force but master password not yet entered
			gD=gW.document;
			if (!aSubject && !aData) {
          //aSubject is normally a nsIMsgFolder
					//but not on first call (when gW.gDBView does not exists yet)
          //or when an addon is installed or enabled
          //gData is normally null except we call it explicitly with 'force'
        if (addonType=='install') { //need a small time delay
          gW.setTimeout(()=>{
            let changed=findCols();
            if (gFire) {
  debug('install: Notify options window');
              gFire.async(changed);
            } else {
  debug('install: No options window to notify');
            }
          }, 100);
        } else {
debug('observer nothing to do');
        }
        addonType='';
        return;
      }
      if (typeof gW.gDBView!='undefined' && gW.gDBView) { //check mit typeof, da gelegentlich undefined!
//state				if (state!='cols') {  // fill gColumns and add our own columns, only on first call!
//state          state='cols';
				if (!gD.getElementById('sio_inoutCol')) {	//add cols if not yet exists
debug('our cols not yet exists, add them');
					addCols();
        }

				//normally, we have a new view, but not if a mail is opened in a new tab and switched to that tab
				try {
//TODO: might use gW from second window!
					let d=gW.gDBView.getColumnHandler('sio_inoutaddressCol');
debug('unchanged view, do not add handlers');
					return;
				}	catch(e) {}

        //Must be set on every folder
debug('add columnsHandlers for our own columns');
				let ch_inoutcol=Object.assign({}, columnHandler_inoutcol);	// clone the handler
					ch_inoutcol.gDBView=gW.gDBView;
					gW.gDBView.addColumnHandler("sio_inoutCol", ch_inoutcol);
				let ch_inoutaddresscol=Object.assign({}, columnHandler_inoutaddresscol);	// clone the handler
					ch_inoutaddresscol.gDBView=gW.gDBView;
					gW.gDBView.addColumnHandler("sio_inoutaddressCol", ch_inoutaddresscol);
				let ch_inoutthissidecol=Object.assign({}, columnHandler_inoutthissidecol);	// clone the handler
					ch_inoutthissidecol.gDBView=gW.gDBView;
					gW.gDBView.addColumnHandler("sio_inoutthissideCol", ch_inoutthissidecol);

        observer.addHandlersToCols('*', true);	// initially add generic columnHandlers to other columns
      }
      else debug('observer: MsgCreateDBView: no gW.gDBView yet');
		}
	}
}

function setFilters() {
////// Define filters
	//gW=Services.wm.getMostRecentWindow("mail:3pane");
	if (!gW) return;	//e.g. if called with aData=force but master password not yet entered
debug('set quickFilters');
debug('QuickFilterManager.textBoxDomId='+QuickFilterManager.textBoxDomId);

  QuickFilterManager.defineFilter({
    name: "sio-correspondent",
    domId: "qfb-qs-sio-correspondent",
    appendTerms: function(aTermCreator, aTerms, aState) {
      // aState is always 'true'!
      if (gW.document.getElementById(this.domId).checked) {
        let text=gW.document.getElementById('qfb-qs-textbox').value;
debug('sio-correspondent search for '+text);
debug('aTermCreator, aTerms, aState='+aTermCreator+' '+aTerms+' '+aState);
        if (text) searchTerm(text, aTermCreator, aTerms, this.name);
      }
    },
		domBindExtra: function(aDocument, aMuxer, aNode) {
debug('sio-correspondent domBindExtra: aDocument, aMuxer, aNode='+aDocument+' '+aMuxer+' '+aNode);
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
    appendTerms: function(aTermCreator, aTerms, aState) {
      // aState is always 'true'!
      if (gW.document.getElementById(this.domId).checked) {
        let text=gW.document.getElementById('qfb-qs-textbox').value;
debug('sio-thisside search for '+text);
debug('aTermCreator, aTerms, aState='+aTermCreator+' '+aTerms+' '+aState);
        if (text) searchTerm(text, aTermCreator, aTerms, this.name);
      }
    },
		domBindExtra: function(aDocument, aMuxer, aNode) {
debug('sio-thisside domBindExtra: aDocument, aMuxer, aNode='+aDocument+' '+aMuxer+' '+aNode);
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
  gW.gDBView.curCustomColumn="sio_inoutaddressCol";
  gW.MsgSortThreadPane('byCustom');
}
function MsgSortByThisSide()
{
  gW.gDBView.curCustomColumn="sio_inoutthissideCol";
  gW.MsgSortThreadPane('byCustom');
}
function MsgSortByInOut()
{
  gW.gDBView.curCustomColumn="sio_inoutCol";
  gW.MsgSortThreadPane('byCustom');
}

function findCols() {
debug('findCols');
  let tc=gD.getElementById("threadCols");
  let changed=new Map();

	// fill gColumns with [id->label] for all columns which can be styled
  let cols=tc.childNodes;
  cols.forEach(col=>{
    if (col.id && !col.getAttribute('fixed') && !(col.id).includes('sio_')) {
			if (gColumns.has(col.id)) {
//debug('gColumn already has '+col.id);
        return;
      }
			try {
				let ch=gW.gDBView.getColumnHandler(col.id);
debug('col='+col.id+' already has a columnHandler, saved');
				otherCCH.set(col.id, ch);		// save for later user
			} catch(e) {
//debug('col='+col.id+' added to gColumns');
//        gColumns.set(col.id, col.getAttribute('label'));
			}
      gColumns.set(col.id, col.getAttribute('label'));
      changed.set(col.id, col.getAttribute('label'));
    }
  });
  return changed;
}

function addCols() {
debug('addCols');
  let tc=gD.getElementById("threadCols");
  if (!tc) {
debug("no threadCols yet");
    return null;
  }
  findCols();      //fill gColumns
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
 *  Restore persisted attributes. (Thanks to full_address_column addon!)
 */
  ['sio_inoutCol', 'sio_inoutaddressCol', 'sio_inoutthissideCol'].forEach(id=>{
//debug('persist of '+id);
    let c=gD.getElementById(id);
    let attributes = Services.xulStore.getAttributeEnumerator(gD.URL, id);
    for (let attribute of attributes) {
      let value = Services.xulStore.getValue(gD.URL, id, attribute);
//debug('  attr='+attribute+' value='+value);
      // See Thunderbird bug 1607575 and bug 1612055.
      if (attribute != "ordinal" || parseInt(AppConstants.MOZ_APP_VERSION, 10) < 74) {
        c.setAttribute(attribute, value);
      } else {
        c.ordinal = value;
      }
    }
  });

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
debug('add buttons to quickFilter bar')
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

debug('setFilters')
  setFilters();
	filtersDone=true;
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
}

function changedCols() {
debug('changedCols');
	var changed=new Map;
  let cols=gD.getElementById('threadCols').childNodes;
  cols.forEach(col=>{
    if (col.id && !col.getAttribute('fixed') && !(col.id).includes('sio_')) {
			if (gColumns.has(col.id)) return;
			try {
				let ch=gW.gDBView.getColumnHandler(col.id);
debug('new col '+col.id+' found, already has a columnHandler, saved');
				otherCCH.set(col.id, ch);		// save for later user
			} catch(e) {}
debug('new col '+col.id+' found, added to gColumns');
      gColumns.set(col.id, col.getAttribute('label'));
			changed.set(col.id, col.getAttribute('label'));
    }
  });
	var colsArray=Array.from(cols);
  gColumns.forEach((label, col) => {
		if (colsArray.some(item=>item.id==col)) return;
debug('obsolete col '+col+' found, remove');
		changed.set(col, '');
		gColumns.delete(col);
		if (otherCCH.has(col)) otherCCH.delete(col);
		try {
			let ch=gW.gDBView.getColumnHandler(col); 
debug('obsolete col '+col+' still had column handler (not removed)');
//Probably i shouldn't do this in case other addons also try to remove the handler
//but fires after sio and does not catch the exception!
//			gW.gDBView.removeColumnHandler(col); 
		} 
		catch(e) { /*debug('get or remove columnHandler throws '+e);*/ }
		//remove from prefs is done in background
	});
debug('changedCols done, changed='+JSON.stringify(Array.from(changed)));
	return changed;
}

function onFocus(e) {
debug('onFocus');
	gW=e.view;
}
function registerListener() {
debug('registering window listener');
  ExtensionSupport.registerWindowListener("ShowInOut", {
  /**/
    chromeURLs: [
      "chrome://messenger/content/messenger.xhtml"
    ],
  /**/
    onLoadWindow: function(w) {
debug('mail:3pane loaded');
			if (w.gDBView) {
debug('what should i do?');
			} else {
debug('no gDBView yet');
				gCurrentFolder=null;
				gW=w;
				observer.observe(null, "MsgCreateDBView", 'force');	// after enabling the addon there is no other notification
				if (filtersDone) {
					//if second window is opened, we need to remove our filters or
					//the new windows searches for the buttons which doesn't exists yet
					//we add the filter back later
debug('remove filters');
					QuickFilterManager.killFilter("sio-correspondent");
					QuickFilterManager.killFilter("sio-thisside");
/*
	gW.document.defaultView.FolderDisplayListenerManager.registerListener({
		onMakeActive(aFolderDisplay) {
			let tab = aFolderDisplay._tabInfo;
debug('FolderListener:onMakeActive '+aFolderDisplay);
for (let key in aFolderDisplay) {
  debug(key);
}
		}
	});
*/

				}
			}
			w.addEventListener('focus', onFocus, true);
		},
		onUnloadWindow: function(w) {
debug('unload window');
			w.removeEventListener('focus', onFocus, true);
		}
	});
}


var debugcache=new Map();
function debug(txt, ln) {
	//if from background or options via messenger.sio.debug: (string, string)
	//else	(string, undefined) or (string, exception)
	let ex;
	if (typeof ln==='string') {
		ex=txt.match('throws:');
	} else {
		ex=typeof ln!=='undefined';
		let e;
		if (ex) e=ln;
		else e = new Error();
		let stack = e.stack.toString().split(/\r\n|\n/);
		ln=stack[ex?0:1].replace(/file:\/\/.*\/(.*:\d+):\d+/, '$1');  //localfolder@file:///D:/sourcen/Mozilla/thunderbird/Extensions/ShowInOut_wee/sio_implementation.js:106:6
	}
	if (!prefs) {
		var d=new Date();
		var s=d.toLocaleString();
		debugcache.set(debugcache.size+(ex?':fail':'')+'-'+s, '(cached) '+ln+' '+txt);
		return;
	}
	if (!prefs['debug']) {
    debugcache=null;
    return;
  }

	//if (inconsole) this.console.logStringMessage('AddressbooksSynchronizer: '+txt);
	if (debugcache && debugcache.size) {
console.log('SIO: debug: debugcache.size='+debugcache.size);
		for (let [s, t] of debugcache) {
			if (s.match(':fail-'))
				console.error('SIO: '+t);
			else
				console.debug('SIO: '+t);
		}
		debugcache.clear();
	}
	if (ex)
		console.error('SIO: '+ln+' '+txt);
	else
		console.debug('SIO: '+ln+' '+txt);
}
