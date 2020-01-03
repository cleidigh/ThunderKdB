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
 * The Original Code is ShowInOut.
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

const Ci = Components.interfaces
var {Services}=ChromeUtils.import("resource://gre/modules/Services.jsm");
var {MailServices}=ChromeUtils.import("resource:///modules/MailServices.jsm");
var {AddonManager} = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

//if(!de_ggbs) var de_ggbs={};  //might fail because of race condition

if (!de_ggbs_sio) var de_ggbs_sio = function(){
////////////////////////

  var gsio_tree_view;
  var gMyAddr;
  var gMyAddrArr;
  var gLocalFolder;
  var gColumns=new Object({
    'subjectCol':'',  'dateCol':'', 'senderCol':'', 'recipientCol':'',
    'sizeCol':'', 'locationCol':'', 'accountCol':''
  });
  var console = ChromeUtils.import("resource://gre/modules/Console.jsm").console;

  var gHeaderParser = MailServices.headerParser;
  var gPrefs = Services.prefs.getBranch("extensions.showInOut.");

  var gMessenger = Components.classes['@mozilla.org/messenger;1'].createInstance().
      QueryInterface(Ci.nsIMessenger);
  var gAccountMgr=MailServices.accounts;

  var gInTextPrefix='';
  var gOutTextPrefix='';

  const MSG_FOLDER_FLAG_TRASH = 0x0100;
  const MSG_FOLDER_FLAG_JUNK = 0x40000000;

  var pub = {};
  //public function are define as
  //  pub.name = function(args) {...}
  //and must be called as de_ggbs_sio.name
  //
  //Internal functions are defined normally as
  //  function name(args) {...}
  //and are called without 'this.'

  pub.searchTerm = function(text, aTermCreator, searchTerms, tag) {
    var folders = GetSelectedMsgFolders();
    var folder = folders.length > 0 ? folders[0] : null;
    if (!folder) return; //more than one folder selected //???
    var account=gAccountMgr.FindAccountForServer(folder.server);
    var key=account.key;
    var term;
    var value;

    //see source/mailnews/base/search/public/nsIMsgSearchCustomTerm.idl
    //    source\mailnews\base\test\unit\test_searchCustomTerm.js
    if (tag=='correspondent') {
      var id='showinout@ggbs.de#matchMyAddr';
      var name="matchMyAddr";
    } else if (tag=='thisside') {
      var id='showinout@ggbs.de#matchOtherAddr';
      var name="matchOtherAddr";
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
//console.log('available? '+op+': '+r+'\n');
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
//console.log('search for '+searchValue+' with op '+searchOp+'\n');
//console.log(' sender: '+msgHdr.mime2DecodedAuthor+'\n');
//console.log(' recip : '+msgHdr.mime2DecodedRecipients+'\n');
          var outgoing=false;
          var sender=msgHdr.mime2DecodedAuthor;
          for (var email in gMyAddrArr[key]) {
            var re=new RegExp('<'+email+'>','i');
            if (sender.search(re)>=0) {
              outgoing=true;
              break;
            }
          }
          var sr=new RegExp(searchValue, 'i');
          var r=false;
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
    var filterService = MailServices.filters;
    filterService.addCustomTerm(customTerm);

    //I'm the sender and search term is in recipients
    term = aTermCreator.createTerm();
    value = term.value;
    value.str = text;
    term.value = value;
    term.attrib = nsMsgSearchAttrib.Custom;
    term.customId = id;
    term.op = nsMsgSearchOp.Is;
    term.booleanAnd = false;
    searchTerms.push(term);
    // Or
    //I'm not the sender and search string is in sender
    term = aTermCreator.createTerm();
    value = term.value;
    value.str = text;
    term.value = value;
    term.attrib = nsMsgSearchAttrib.Custom;
    term.customId = id;
    term.op = nsMsgSearchOp.Isnt;
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
      var addallto;
      try { addallto=gPrefs.getIntPref("AddAddressesTo"); }
      catch(e) { addallto=0; }
      var allAccounts=gAccountMgr.accounts;
      var accountsCount = allAccounts.length;
      for (var i = 0; i < accountsCount; i++) {
        var account = allAccounts.queryElementAt(i, Ci.nsIMsgAccount);
        var key = account.key;
        var aAddr=gMyAddrArr[key]?gMyAddrArr[key]:new Object;
        var allIdentities=account.identities;
        var identitiesCount = allIdentities.length;
        for (var j = 0; j < identitiesCount; j++) {
          var identity = allIdentities.queryElementAt(j, Ci.nsIMsgIdentity);
          if (identity.email) { //see mail from "Simon Arthur"
            var email=identity.email.toLowerCase();
            if (gMyAddr[email]===undefined)
              gMyAddr[email]=1;
            if (aAddr[email]===undefined)
              aAddr[email]=1;
          }
          if (identity.replyTo) {
            var email=identity.replyTo.toLowerCase();
            if (gMyAddr[email]===undefined)
              gMyAddr[email]=1;
            if (aAddr[email]===undefined)
              aAddr[email]=1;
          }
        }
        // get extra email addresses for this account from preferences
        try {
          var aa = gPrefs.getCharPref("AdditionalAddresses."+key).split(',');
          for (var j=0; j<aa.length; j++) {
            var email=aa[j].toLowerCase().trim();
            if (email.charAt(0)=='@') email=email.substr(1);
            if (email && gMyAddr[email]===undefined)
              gMyAddr[email]=1;
            if (email && aAddr[email]===undefined)
              aAddr[email]=1;
          }
        } catch(e) { }
        gMyAddrArr[key]=aAddr;

        // If this is a pop account, check if INBOX is redirected to another account
        // if so, add all emails from this account to the redirected account
        if (account.incomingServer && account.incomingServer.rootFolder != account.incomingServer.rootMsgFolder) {
          var raccount = gAccountMgr.FindAccountForServer(account.incomingServer.rootMsgFolder.server);
          var rkey = raccount.key;
          var rAddr=gMyAddrArr[rkey]?gMyAddrArr[rkey]:new Object;
          for (var email in aAddr)
            if (rAddr[email]===undefined)
              rAddr[email]=1;
          gMyAddrArr[rkey]=rAddr;
        }

        // Add emails to Local Folders according to preference
        var addto;
        try { addto=gPrefs.getIntPref("AddAddressesTo."+key); }
        catch(e) { addto=0; }
        if (addallto==1 || addto==1) {
          var rAddr=gMyAddrArr[gLocalFolder]?gMyAddrArr[gLocalFolder]:new Object;
          for (var email in aAddr)
            if (rAddr[email]===undefined)
              rAddr[email]=1;
          gMyAddrArr[gLocalFolder]=rAddr;
        }
      }

      // copy addresses to all accounts for accounts with preference=2
      for (var key in gMyAddrArr) {
        var addto;
        try { addto=gPrefs.getIntPref("AddAddressesTo."+key); }
        catch(e) { addto=0; }
        if (addallto==2 || addto==2) {
          for (var rkey in gMyAddrArr) {
            if (rkey==key) continue;
            for (var email in gMyAddrArr[key])
              if (gMyAddrArr[rkey][email]===undefined)
                gMyAddrArr[rkey][email]=1;
          }
        }
      }

      // get extra email addresses for 'all' accounts
      try {
        var aa = gPrefs.getCharPref("AdditionalAddresses").split(',');
        var aAddr=new Object;
        for (var i=0; i<aa.length; i++) {
          var email=aa[i].toLowerCase().trim();
          if (email.charAt(0)=='@') email=email.substr(1);
          if (email && gMyAddr[email]===undefined)
            gMyAddr[email]=1;
          if (email && aAddr[email]===undefined)
            aAddr[email]=1;
        }
        // and add them to each account
        for (var key in gMyAddrArr)
          for (var email in aAddr)
            if (gMyAddrArr[key][email]===undefined)
              gMyAddrArr[key][email]=1;
      } catch(e) { }
      cache.clear(null);
/* dump my emails
var t=''; for (var key in gMyAddrArr) {
var name=gAccountMgr.getAccount(key).incomingServer.prettyName;
t+=name+'\n  '; for (var email in gMyAddrArr[key]) t+=email+'\n  '; t+='\n'; }
alert(t);
*/
    }

  }

  function concatNames(corr) {
    var corrs='';
    //var count=corr.__count__;
    // We would use __count__ here, but JS keeps raising a strict
    // warning about its deprecated use
    // see https://ubiquity.mozilla.com/hg/ubiquity-firefox/rev/e0760cfc2ac0
    //var count = [ name for (name in corr) if (corr.hasOwnProperty(name)) ].length;
    var count=0;
    for (name in corr) if (corr.hasOwnProperty(name)) count++;

    for (var addr in corr) {
      var name=corr[addr];
      if (name.charAt(0)=='"' && name.charAt(name.length-1)=='"') name=name.substr(1,name.length-2);
      if (name.charAt(0)=="'" && name.charAt(name.length-1)=="'") name=name.substr(1,name.length-2);
      if (count>1 && name.indexOf(',')>=0 && name.charAt(0)!='"'&& name.charAt(0)!="'") name='"'+name+'"';
      if (corrs) corrs+=', ';
      corrs+=name;
    }
  //console.log('count='+count+' corrs='+corrs+'\n');
    return corrs;
  }

  function getMailboxesArray(emails) {
    var ret;
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
      this.data_cache = new Object;
      this.addr_cache = new Object;
      this.side_cache = new Object;
//      this.corr_cache = new Object;
      this.indicator_cache = new Object;
      this.length=0;
      this.key=null;
    },
    cache: function(messageURI, msgHdr) {
      if (this.data_cache[messageURI] !== undefined) return;  //already cached

      if (!msgHdr)
        msgHdr=gMessenger.msgHdrFromURI(messageURI);
  //console.log(messageURI+'=>'+msgHdr.folder.URI+'\n');

      var folder=msgHdr.folder;
      if (!folder || !folder.server)              //paranoia!
        this.key=gLocalFolder;
      else {
        var account = gAccountMgr.FindAccountForServer(folder.server);
        if (!account)
          this.key=gLocalFolder;
        else
          this.key=account.key;
      }

      // extract just the mail address from the author and compare to the list of 'my' Addresses
      var author;
      var author = gHeaderParser.extractHeaderAddressMailboxes(msgHdr.author);
      author=author?author.toLowerCase():'';  //see mail Sven Giermann, 16.3.2010
      var received=checkEmail(author, this.key, true)?'out':'in';
      this.data_cache[messageURI]=received;

    //Would be nice to just check 'received' headers
    //http://developer.mozilla.org/en/docs/Extensions:Thunderbird:customDBHeaders_Preference
    //  needs: user_pref( "mailnews.customDBHeaders", "Return-Path Received");
    /*
      var rp = msgHdr.getStringProperty("return-path"); //klappt nicht! (ist nicht in .msf)
      console.log("Return-Path: " + rp + "\n");
      var r = msgHdr.getStringProperty("received"); //klappt
      console.log("Received: " + r + "\n");
    */

// patch by Pedro Pedruzzi <pedro.pedruzzi@gmail.com>
// inspired by http://mail.google.com/support/bin/answer.py?hl=de&answer=8156
      if (received=='in') {
        var to = getMailboxesArray(msgHdr.recipients);
        var indicator = 'to_list';
        if (to.length == 1 && checkEmail(to[0], this.key, true))
          indicator = 'to_me';
        else {
          var cc = getMailboxesArray(msgHdr.ccList);
          for (var i = 0; i < to.length; i++)
            if (checkEmail(to[i], this.key, true)) {
              indicator = 'to_others';
              break;
            }
          if (indicator=='to_list') {
            for (var i = 0; i < cc.length; i++)
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
      var keywords=msgHdr.getStringProperty('keywords');
      var tags=keywords.split(' ');
      var haveProp=false;
      for (var i=0; i<tags.length; i++) {
        if (tags[i]=='in' || tags[i]=='out') { haveProp=true; break; }
      }
      if (!haveProp)
        msgHdr.setStringProperty('keywords', (keywords?keywords+' '+received:received));
    */

      // mark message as junk, if its in a folder, marked as junk (thanks to Martijn Coppoolse for this hint)
      // or if the message has a nonzero junkscore
      var isJunk=false;
      if (received=='in') {
        isJunk = msgHdr.folder.getFlag(MSG_FOLDER_FLAG_JUNK);
        if (!isJunk) {
          var junkScore = msgHdr.getStringProperty("junkscore");
          // according to SelectedMessagesAreJunk() in mailWindowOverlay.js:
          isJunk =  ((junkScore != "") && (junkScore != "0"));
          // but i think its:
          //var isJunk =  ((junkScore === "") || (junkScore != "0"));
        }
      }
      var newsgroup=msgHdr.folder.URI.substr(0,5)=='news:';

      // get all correspondent and store
//      var charset=undefined;  //TB: names with Umlaute fehlen, SM: Umlaute falsch, cyrillic falsch
//      var charset='UTF-8';  //TB: Umlaute falsch, SM: Umlaute falsch, cyrillic falsch
      var charset='ISO-8859-1';  //TB: Umlaute ok, SM: Umlaute ok, cyrillic falsch
      //var charset=msgHdr.Charset;
      var corr=new Object;
//console.log('0: author:     '+msgHdr.author)
//console.log('0: recipients: '+msgHdr.recipients)
      var emails = received=='in' || newsgroup ?
          msgHdr.author: msgHdr.recipients;
//console.log('1: Gegenseite: '+emails)
      var allAddresses = gHeaderParser.parseEncodedHeader(emails, charset, false);
      if (emails.trim() == "") allAddresses = [];
      for (var address of allAddresses) {
        corr[address.email]=isJunk?address.toString():(address.name?address.name:address.email);
//console.log('  => '+corr[address.email]);
      }
      this.addr_cache[messageURI]=(received=='in'||newsgroup?gInTextPrefix:gOutTextPrefix)+concatNames(corr);

      var side=new Object;
      var emails = received=='in' || newsgroup ?
          msgHdr.recipients: msgHdr.author;
//console.log('1: Diese Seite: '+emails)
      var allAddresses = gHeaderParser.parseEncodedHeader(emails, charset, false);
      if (emails.trim() == "") allAddresses = [];
      for (var address of allAddresses) {
        side[address.email]=isJunk?address.toString():(address.name?address.name:address.email);
//console.log('  => '+side[address.email]);
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
    for (var i=0; i<properties.Count(); i++) {
      var prop;
      prop=properties.GetElementAt(i).QueryInterface(Ci.nsIAtom);
      if (prop.toString()==property) return true;
    }
    return false;
  }

  //--------------------------------------
  var columnHandler_inoutcol = {
    getCellText:         function(row, col) {
  //console.log('Get cell text for inoutcol '+row+'\n');
/*
      var messageURI = gDBView.getURIForViewIndex(row);
      cache.cache(messageURI);
      if (cache.received(messageURI)=='in') return '<--';
      else return '-->';
*/
      return '';
    },
    getCellProperties:   function(row, col, properties) {
  //console.log('Get cell inoutcol, isContainer='+gDBView.isContainer(row)+'\n');
  //dumpProps(row, col, properties);
      //probably should use:
      //var key = gDBView.getKeyAt(row);
      //var hdr = gDBView.db.GetMsgHdrForKey(key);
      var messageURI = gDBView.getURIForViewIndex(row);
      cache.cache(messageURI);
      var received=cache.received(messageURI);
      var indicator=cache.indicator(messageURI);
        //properties already defined:
        //    focus, [leaf|container], [even|odd], sio_inoutCol
        //  appending [in|out]
      var props;
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
  //console.log('get sort string for inoutcol\n');
      return '';
    },
    getSortLongForRow:   function(hdr) {
      var messageURI=hdr.folder.getUriForMsg(hdr);
  //console.log('get sort long for inoutcol '+messageURI+'\n');
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
      var messageURI = gDBView.getURIForViewIndex(row);
      cache.cache(messageURI);
    //should probably use: FetchAuthor(msgHdr);
    //should probably use: FetchRecipients(msgHdr);
    //console.log('Get cell inoutaddresscol row='+row+' URI= '+messageURI+' returned '+cache.addr(messageURI)+'\n');
      return cache.addr(messageURI);
    },
    getCellProperties:   function(row, col, properties) {
  //console.log('Get cell inoutaddresscol row='+row+'\n');
  //dumpProps(row, col, properties);
      var received;
      var messageURI = gDBView.getURIForViewIndex(row);
      cache.cache(messageURI);
      var received=cache.received(messageURI);
      var indicator=cache.indicator(messageURI);
        //properties already defined:
        //    focus, [leaf|container], [even|odd], sio_inoutCol
        //  appending [in|out]
      var props;
      if (received!==null)
        props=received;
      if (indicator!==null)
        props+=" "+indicator;
      return props;
    },
    getRowProperties:    function(row, properties) {
  //console.log('Get row inoutaddresscol index='+row+'\n');
  //dumpProps(row, null, properties);
      var received;
      var messageURI = gDBView.getURIForViewIndex(row);
      cache.cache(messageURI);
      var received=cache.received(messageURI);
      var indicator=cache.indicator(messageURI);
      //properties already defined:
      //    leaf|container, even|odd
      //  appending [in|out]
      var props;
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
      var messageURI=hdr.folder.getUriForMsg(hdr);
  //console.log('get sort string for inoutaddresscol '+messageURI+'\n');
      cache.cache(messageURI, hdr);
      var s=cache.addr(messageURI);
      if (s.substr(0,1)=='"') s=s.substr(1);
      return s;
    },
    getSortLongForRow:   function(hdr) {
  //console.log('called sort long in inoutaddresscol\n');
    },
    isString:            function() {
      return true;
    }

  }


  //--------------------------------------
  var columnHandler_inoutthissidecol = {
    getCellText:         function(row, col) {
      var messageURI = gDBView.getURIForViewIndex(row);
      cache.cache(messageURI);
    //should probably use: FetchAuthor(msgHdr);
    //should probably use: FetchRecipients(msgHdr);
    //console.log('Get cell inoutaddresscol row='+row+' URI= '+messageURI+' returned '+cache.addr(messageURI)+'\n');
//TODO
      return cache.side(messageURI);
    },
    getCellProperties:   function(row, col, properties) {
  //console.log('Get cell inoutaddresscol row='+row+'\n');
  //dumpProps(row, col, properties);
      var received;
      var messageURI = gDBView.getURIForViewIndex(row);
      cache.cache(messageURI);
      var received=cache.received(messageURI);
      var indicator=cache.indicator(messageURI);
        //properties already defined:
        //    focus, [leaf|container], [even|odd], sio_inoutCol
        //  appending [in|out]
      var props;
      if (received!==null)
        props=received;
      if (indicator!==null)
        props+=" "+indicator;
      return props;
    },
    getRowProperties:    function(row, properties) {
  //console.log('Get row inoutaddresscol index='+row+'\n');
  //dumpProps(row, null, properties);
      var received;
      var messageURI = gDBView.getURIForViewIndex(row);
      cache.cache(messageURI);
      var received=cache.received(messageURI);
      var indicator=cache.indicator(messageURI);
      //properties already defined:
      //    leaf|container, even|odd
      //  appending [in|out]
      var props;
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
      var messageURI=hdr.folder.getUriForMsg(hdr);
  //console.log('get sort string for inoutaddresscol '+messageURI+'\n');
      cache.cache(messageURI, hdr);
//TODO
      var s=cache.side(messageURI);
      if (s.substr(0,1)=='"') s=s.substr(1);
      return s;
    },
    getSortLongForRow:   function(hdr) {
  //console.log('called sort long in inoutaddresscol\n');
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
    getCellText: function(row, col) {
      gDBView.removeColumnHandler(col.id);
      var val=gDBView.getCellText(row, col);
      gDBView.addColumnHandler(col.id, this);
      return val;
    },
    getCellProperties: function(row, col, properties) {
  //original function already had set standard properties, just add our property
      var messageURI = gDBView.getURIForViewIndex(row);
      cache.cache(messageURI);
      var received=cache.received(messageURI);
      var indicator=cache.indicator(messageURI);
      if (properties) {
        if (received!==null)
          properties.AppendElement(received);
        if (indicator!==null)
          properties.AppendElement(indicator);
        return "";
      } else {
        var ret="";
        if (received!==null) ret=received;
        if (indicator!==null) ret+=" "+indicator;
        return ret;
      }
    },
    getRowProperties: function(row, properties) {
  //original function already had set standard properties
    },
    getImageSrc: function(row, col) {
  //original function never returns something
      return;
    },
    isEditable: function(row, col) {
  //original function always returns false!
      return false;
    },
    cycleCell: function(row, col) {
  //original function does nothing for cells, containing text
      return ;
    },
    isShowInOut: function() {
      return true;
    }
  };
  //getSortStringForRow, getSortLongForRow and isString need not be
  //  implemented for standard columns since they are not called

  //------------------------------------------------------------------------------------

  var observer = {
    // Ci.nsIObserver
    setcols: function() {
//console.log('sio: setcols');
      // define column_handlers for some other columns. This allows me to set the in/out property
      // ONLY define _standard_ columns with _string_ content!!!
      // column Names: subjectCol dateCol senderCol recipientCol sizeCol locationCol accountCol
      for (var col in gColumns) {
        // remove old handlers, but only, if they are mine
        try {
          var handler=gDBView.getColumnHandler(col);
          if (handler.isShowInOut())
            gDBView.removeColumnHandler(col);
        } catch(e) { /* this is expected if not handler registered */ }
      }
      try {
        var cols = gPrefs.getCharPref("Columns").split(',');
        for (var i=0; i<cols.length; i++) {
          var col=cols[i].trim();
          if (gColumns.hasOwnProperty(col)) {
            gDBView.addColumnHandler(col, sio_columnHandler);
          }
        }
      } catch(e) { console.log('ShowInOut: setcols: '+col+' add handler Error: '+e+'\n'); }
    },

    observe: function(aSubject, aTopic, aData)
    {
      if (aTopic=='MsgCreateDBView') {
        if (typeof gDBView!='undefined' && gDBView) { //check mit typeof, da gelegentlich undefined!
          //Must be set on every folder
          gDBView.addColumnHandler("sio_inoutCol", columnHandler_inoutcol);
          gDBView.addColumnHandler("sio_inoutaddressCol", columnHandler_inoutaddresscol);
          gDBView.addColumnHandler("sio_inoutthissideCol", columnHandler_inoutthissidecol);

          this.setcols();
        }
      } else if (aTopic=='de_ggbs_sio.prefChanged') {
//console.log('sio: preferences changed');
        config.getMyEmails();
        try { gInTextPrefix = gPrefs.getCharPref("InTextPrefix"); } catch(e) { gInTextPrefix=''; }
        try { gOutTextPrefix = gPrefs.getCharPref("OutTextPrefix"); } catch(e) { gOutTextPrefix=''; }
        this.setcols();
      }
    }
  }

  // debug functions
/*
  function dumpTree() {
    var tree=document.getElementById('threadTree');
  //  console.log('DOM: '+tree.tagName+'\n');
    var rows=tree.firstChild.nextSibling; //treechildren, nicht xul:treerows!!!
    //rows.firstChild: ex. nicht!
    //rows.childNodes.length=0 !!!
  }

  function dumpProps(row, col, properties) {
    for (var i=0; i<properties.Count(); i++) {
      var prop;
      prop=properties.GetElementAt(i).QueryInterface(Ci.nsIAtom);
      console.log('prop ('+row+','+(col?col.id:'')+'): '+prop.toString()+"\n");
    }
  }
*/

  pub.setSearch = function() {
    try {
      var { QuickFilterManager } = ChromeUtils.import("resource:///modules/quickFilterManager.js");
    } catch (e) { return; }       //module not in SeaMonkey
    QuickFilterManager.defineFilter({
      name: "correspondent",
      domId: "qfb-qs-correspondent",
      appendTerms: function(aTermCreator, aTerms, aFilterValue) {
        // aFilterValue is always 'true'!
        if (document.getElementById(this.domId).checked) {
          var text=document.getElementById('qfb-qs-textbox').value;
//console.log('sio:  search for '+text+'\n');
          if (text) pub.searchTerm(text, aTermCreator, aTerms, this.name);
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
      name: "thisside",
      domId: "qfb-qs-thisside",
      appendTerms: function(aTermCreator, aTerms, aFilterValue) {
        // aFilterValue is always 'true'!
        if (document.getElementById(this.domId).checked) {
          var text=document.getElementById('qfb-qs-textbox').value;
//console.log('sio:  search for '+text+'\n');
          if (text) pub.searchTerm(text, aTermCreator, aTerms, this.name);
        }
      }
    });
    return;
  }

/*
  // Enable 'Groub by' menu item, called when menupopup opens
  // calls MsgGroupBySort() (in threadPane.js) if clicked
  // which just set: gFolderDisplay.view.showGroupedBySort = true;
  // UNfortunately this does not work, see coment below
  pub.InitViewSortByMenu = function() {
    var sortType =gDBView.sortType;
    if (sortType!=nsMsgViewSortType.byCustom) return;
//console.log(typeof gFolderDisplay+' '+gDBView.sortType+' '+sortType+' '+nsMsgViewSortType.byCustom+'\n');

    var obj=new Object();
    var info=gDBView.msgFolder.getDBFolderInfoAndDB(obj);
    info=obj.value;
    var col=info.getProperty("customSortCol");
    var item='';
    if (col=='sio_inoutaddressCol') item="sortByCorrespondentMenuItem";
    else if (col=='sio_inoutthissideCol') item="sortByThisSideMenuItem";
    else if (col=='sio_inoutCol') item="sortByInOutMenuItem";
    if (item) { //else: its not my custom column!
      setSortByMenuItemCheckState(item, true);
      var groupBySortOrderMenuItem = document.getElementById("groupBySort");
      groupBySortOrderMenuItem.setAttribute("disabled", false);
    }
  }
*/

  pub.MsgSortByCorrespondent = function()
  {
    var obj=new Object();
    var info=gDBView.msgFolder.getDBFolderInfoAndDB(obj);
    var info=obj.value;
    info.setProperty("customSortCol", "sio_inoutaddressCol")
    MsgSortThreadPane('byCustom');
  }
  pub.MsgSortByInOut = function()
  {
    var obj=new Object();
    var info=gDBView.msgFolder.getDBFolderInfoAndDB(obj);
    var info=obj.value;
    info.setProperty("customSortCol", "sio_inoutCol")
    MsgSortThreadPane('byCustom');
  }

  pub.init = function() {
    console.log('ShowInOut: started');
    pub.getAddon();

  /*
   *  Install Listener
   */
    var session=MailServices.mailSession;
    session.AddFolderListener(cache, 128); //folderListenerNotifyFlagValue  	 event

  /*
   * Find LocalFolder
   */
    var lfs=gAccountMgr.localFoldersServer; //.account.key
    var lfa=gAccountMgr.FindAccountForServer(lfs);
    gLocalFolder=lfa?lfa.key:'';

  /*
   *  Find all email addresses, which count as mine
   */
    config.getMyEmails();

    try { gInTextPrefix = gPrefs.getCharPref("InTextPrefix"); } catch(e) { gInTextPrefix=''; }
    try { gOutTextPrefix = gPrefs.getCharPref("OutTextPrefix"); } catch(e) { gOutTextPrefix=''; }
    var ObserverService = Services.obs;
    ObserverService.addObserver(observer, "MsgCreateDBView", false);
    ObserverService.addObserver(observer, "de_ggbs_sio.prefChanged", false);

/*
    //enable 'Group by': extend InitViewSortByMenu
    //but this doesn't work: Text ist called via
    //  nsMsgDBView::CellTextForColumn (in mailnews/base/src/nsMsgGroupView.cpp)
    // which can't be overlayed or otherwise extended
    var mp=document.getElementById('menu_viewSortPopup'); //The menu, starting with 'sort by date'
    mp.setAttribute('onpopupshowing', mp.getAttribute('onpopupshowing')+'; de_ggbs_sio.InitViewSortByMenu()');
*/
  }

  pub.getAddon = async function() {
    let addOn=await AddonManager.getAddonByID("showInOut@ggbs.de");
    var console = Services.console;
    var app = Services.appinfo;
    console.logStringMessage('ShowInOut: '+addOn.version+' on '+app.name+' '+app.version);
  }

  return pub; //return public elements
}();

// Call when the window is fully loaded, prevent racing condition
window.addEventListener("load", de_ggbs_sio.init, false);
de_ggbs_sio.setSearch();  //must be done before window load
