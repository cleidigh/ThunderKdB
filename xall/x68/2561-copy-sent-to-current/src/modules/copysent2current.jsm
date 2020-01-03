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

var EXPORTED_SYMBOLS = ["copySent2Current"];

const DEBUG             = false; // set to false to suppress debug messages
//dump('CS2C: Loading component\n');

var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

function copySent2Current() {
  this.URI         = null;

  //preferences:
  this.mLength       = null;  //max length of history
  this.mAk_nc        = null;  //Accesskey for nocopy 
  this.mAk_d         = null;  //Accesskey for default
  this.mAk_s         = null;  //Accesskey for sent
  this.mAk_lu        = null;  //Accesskey for last used
  this.mAk_send      = null;  //Accesskey for send to sent/nocopy
  this.mChooseBehind = null;
  this.mMoveMsg      = null;  //default for move message checkbox
  this.mMoveMsgId    = new Array();  //default for move message by id
  this.mNoMoveTrash  = null;  //never move message to trash, even if requested
  this.mNumberedAK   = null;  //use numberd access keys in history

  this.prefB = Services.prefs.getBranch("extensions.copysent2current.");
  if (this.prefB)
  {
    this.prefB.addObserver("", this, false);
  }

//this.promptService = Services.prompt;
//this.promptService.alert(null, 'info', 'load preferences');
//this.console = Services.console;
//this.console.logStringMessage('cs2c: module: load preferences');

  try {
    var re=/\["([^"]*)(?:",\s*"([^"]*))*"\]/g;
    var uri=this.prefB.getCharPref("lastuseduri");
    if (uri && uri.charAt(0)=='[' && uri!='[]')
      this.URI=uri.substring(2,uri.length-2).split(/",\s*"/);
    else
      this.URI=new Array(0);
  } catch(e) {
//this.promptService.alert(null, 'error', e);
//this.console.logStringMessage('cs2c: error get URI: '+e);
    this.URI=new Array(0);
  }
//this.console.logStringMessage('cs2c: module: '+this.URI);

//update from 0.7.16
try { this.prefB.clearUserPref("lastusedlabel"); } catch(e) {}

}

copySent2Current.prototype = {
    /* Preferences */
  get maxLength () {
    if (this.mLength==null) {
      try { this.mLength=this.prefB.getIntPref("lastusedlength"); }
      catch(e) { this.mLength=5; }
      while (this.URI.length>this.mLength) {
        this.URI.pop();
        this.prefB.setCharPref("lastuseduri", this.URI.toSource());
      }
    }
    return this.mLength;
  },
  get ak_nc () {
    if (this.mAk_nc==null) {
      try { this.mAk_nc = this.prefB.getCharPref("accesskey_nocopy"); }
      catch(e) { this.mAk_nc='-'; }
    }
    return this.mAk_nc;
  },
  get ak_d () {
    if (this.mAk_d==null) {
      try { this.mAk_d = this.prefB.getCharPref("accesskey_default"); }
      catch(e) { this.mAk_d='#'; }
    }
    return this.mAk_d;
  },
  get ak_s () {
    if (this.mAk_s==null) {
      try { this.mAk_s = this.prefB.getCharPref("accesskey_sent"); }
      catch(e) { this.mAk_s='!'; }
    }
    return this.mAk_s;
  },
  get ak_lu () {
    if (this.mAk_lu==null) {
      try { this.mAk_lu = this.prefB.getCharPref("accesskey_lastused"); }
      catch(e) { this.mAk_lu='+'; }
    }
    return this.mAk_lu;
  },
  get ak_send () {
    if (this.mAk_send==null) {
      try { this.mAk_send = this.prefB.getCharPref("accesskey_send"); }
      catch(e) { this.mAk_send='D'; }
    }
    return this.mAk_send;
  },
  get chooseBehind () {
    if (this.mChooseBehind==null) {
      try { this.mChooseBehind = this.prefB.getBoolPref("choosebehind"); }
      catch(e) { this.mChooseBehind=false; }
    }
    return this.mChooseBehind;
  },
  get moveMsg () {
    if (this.mMoveMsg==null) {
      try { this.mMoveMsg = this.prefB.getBoolPref("movemessage"); }
      catch(e) { this.mMoveMsg=true; }
    }
    return this.mMoveMsg;
  },
  get_moveMsg(id) {
    if (id in this.mMoveMsgId) 
      return this.mMoveMsgId[id];
    else {
      try {
        let b = this.prefB.getBoolPref("movemessage."+id);
        this.mMoveMsgId[id]=b;
        return b;
      }
      catch(e) {
        this.mMoveMsgId[id]=this.moveMsg;
        return this.moveMsg;
      }
    }
  },

  get noMoveTrash () {
    if (this.mNoMoveTrash==null) {
      try { this.mNoMoveTrash = this.prefB.getBoolPref("nomovetrash"); }
      catch(e) { this.mNoMoveTrash=true; }
    }
    return this.mNoMoveTrash;
  },
  get numberedAccessKeys () {
    if (this.mNumberedAK==null) {
      try {
        this.mNumberedAK = this.prefB.getBoolPref("numbered_accesskeys");
        if (this.mNumberedAK && this.mLength>9) this.mLength=9;
      } catch(e) { this.mNumberedAK=false; }
    }
    return this.mNumberedAK;
  },

    /* Runtime data */
  get length () {
    return this.URI.length;
  },
  add_URI: function(uri) {
    this.URI.unshift(uri);
    for (var i=1; i<this.URI.length; i++) {
      if (this.URI[i]==uri) {
        this.URI.splice(i, 1);
      }
    }
    if (this.URI.length>this.maxLength) {
      this.URI.pop();
    }
    this.prefB.setCharPref("lastuseduri", this.URI.toSource());
  },
  del_URI: function(i) {
    this.URI.splice(i, 1);
    this.prefB.setCharPref("lastuseduri", this.URI.toSource());
  },
  get_URI: function(i) {
    if (i<this.URI.length)
      return this.URI[i];
    else
      return null;
  },


/************* system functions **************************/
  observe: function(aSubject, aTopic, aData)
  {
//dump('cs2s-observer: '+aTopic+'\n');
//this.console.logStringMessage('cs2s: observer: '+aTopic);
    switch (aTopic)
    {
      case "nsPref:changed":
//dump('pref changed '+aSubject+' '+aData+'\n');
//this.console.logStringMessage('cs2c: pref changed '+aSubject+' '+aData);
//aSubject ist ein nsIPrefBranch(2), aData ist die Preference
        if (aData=='lastusedlength')      { this.mLength = null; this.maxLength; }
        //changing acceskeys seems not to work, if compose window is reopened 
        if (aData=='accesskey_nocopy')    this.mAk_nc = null;
        if (aData=='accesskey_default')   this.mAk_d = null;
        if (aData=='accesskey_sent')      this.mAk_s = null;
        //if (aData=='accesskey_lastused')  this.mAk_lu = null;
        if (aData=='accesskey_send')      this.mAk_send = null;
        if (aData=='choosebehind')        this.mChooseBehind = null;
        if (aData=='movemessage') {
          this.mMoveMsg = null;
          this.mMoveMsgId = new Array();
        }
        if (aData=='nomovetrash')         this.mNoMoveTrash = null;
        if (aData=='numbered_accesskeys') this.mNumberedAK = null;
        break;
    }
  }
,
};

/* static functions */
if (DEBUG)
    var debug = function (s) { dump("-*- CopySent2Current component: " + s + "\n"); }
else
    var debug = function (s) {}
