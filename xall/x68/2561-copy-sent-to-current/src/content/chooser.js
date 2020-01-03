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
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

//if(!de_ggbs) var de_ggbs={};    //might fail because of race condition
if(!de_ggbs_cs2c) var de_ggbs_cs2c={};

if (!de_ggbs_cs2c.mc) de_ggbs_cs2c.mc = function() {

  var finish=false;
  var lasturi=null;

  var console = Services.console;
  var main = Services.wm.getMostRecentWindow("mail:3pane");
  if (main) {
    var gComponent=main.de_ggbs_cs2c.CS2C;
    console.logStringMessage('CopySent2Current: chooser.js: using module');
  } else {
      //  called with -compose
    console.logStringMessage("ComposeStartup: chooser.js: called with -compose '"+window.arguments[0]+"'");
    var cs2c=ChromeUtils.import("resource://copysent2current/copysent2current.jsm");
    try {
      var gComponent = new cs2c.copySent2Current();
      console.logStringMessage('CopySent2Current: chooser.js: module loaded');
    } catch(e) {
      Components.utils.reportError('CopySent2Current: chooser.js: ALERT: module NOT loaded: '+e);
    }
  }

  var pub = {
    CS2C:          gComponent
  };

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

  pub.initpopup = function() {
    //de_ggbs_cs2c.mc.log('chooser.js initpopup');
    finish=false;

    var cb=document.getElementById('de-ggbs-cs2c-move');
    cb.hidden=!window.arguments[4]; //[4]==gAllowMove
    if (window.arguments[4]) {
      //cb.checked=de_ggbs_cs2c.mc.CS2C.moveMsg;
      var id=window.opener.getCurrentIdentityKey();
      cb.checked=de_ggbs_cs2c.mc.CS2C.get_moveMsg(id);
    }

    de_ggbs_cs2c.mc.addElems();

    var box=document.getElementById('de-ggbs-cs2c-copyMenuBox');
    box.setAttribute('label',window.arguments[0]);
    var menu=document.getElementById('de-ggbs-cs2c-copyMenuPopup');
    menu.focus();
    var def=menu.firstChild;
    def.label  = window.arguments[0];
    def.id     = window.arguments[1];
    var sent=document.getElementById('sent://');
    if (window.arguments[3]) {
      sent.label  = window.arguments[2];
      sent.id     = window.arguments[3];
      sent.hidden=false;
    } else
      sent.hidden=true;
    de_ggbs_cs2c.mc.fillElems();

    setTimeout(de_ggbs_cs2c.mc.popup, 100);

  }
  pub.popup = function() {
    //de_ggbs_cs2c.mc.log('chooser.js popup');
    var popup=document.getElementById('de-ggbs-cs2c-copyMenuPopup');
    popup.focus();
    popup.openPopup(popup, 'after_start', -1, -1, false, false);
  }

//Since TB45, using the arrow keys in the menu immediately fires the command event
//a keypress listener (https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/PopupGuide/PopupKeys)
// does not work. The workaround is to use the lasturi
  pub.picked = function(event) {
    //de_ggbs_cs2c.mc.log('chooser.js picked finish='+finish);
    if (finish) return; //For some reason, after chooser closes, this fires again
    var uri=event.target.id;
    if (!uri) var uri=event.target._folder.URI;
    de_ggbs_cs2c.mc.log('chooser.js picked '+uri);
    if (uri && uri==lasturi) {
        finish=true;
        window.opener.de_ggbs_cs2c.mc.picked(window, event.target,
          document.getElementById('de-ggbs-cs2c-move').checked);
    } else {
      lasturi=uri;
    }
  }
  pub.clicked = function(event) {
    var uri=event.target.id;
    if (!uri) var uri=event.target._folder.URI;
    //de_ggbs_cs2c.mc.log('chooser.js clicked '+uri);
    lasturi=uri;
  }

  pub.dofocus = function(target) {
    //de_ggbs_cs2c.mc.log('chooser.js dofocus');
    target.selectedItem=target.firstChild;
    lasturi=target.firstChild.id;
    target.addEventListener('click', de_ggbs_cs2c.mc.clicked, true);
  }

  return pub;
}();

