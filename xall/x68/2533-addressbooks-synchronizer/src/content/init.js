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

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

//if(!de_ggbs) var de_ggbs={};  //might fail because of ryce condition

if (!de_ggbs_abs) var de_ggbs_abs = function() {
////////////////////////
var console = Services.console;

  if (window.document.baseURI=="chrome://messenger/content/messenger.xul") { //Main Window
    console.logStringMessage('AddressbooksSynchronizer: started');
    try {
      var { addressbooksSync }=ChromeUtils.import("resource://addressbookssync/addressbookssync.jsm");
    } catch(e) {
      Components.utils.reportError('AddressbooksSynchronizer: ALERT: module NOT loaded: '+e);
    }
    try {
      gComponent = new addressbooksSync();
      gComponent.initialize();
      gComponent.debug('started');
      gComponent.debug('abs: module loaded', true);
    } catch(e) {
      Components.utils.reportError('AddressbooksSynchronizer: ALERT: no new: '+e);
    }
  } else {  // some dialog. find module in main window
    var main = Services.wm.getMostRecentWindow("mail:3pane"); //does not find window, if TB exiting
    if (main) {
      var gComponent=main.de_ggbs_abs.gABS;
      gComponent.debug(window.document.baseURI+': reusing module', true);
    } else {  //probably, TB is exiting!
      try {
        var { addressbooksSync }=ChromeUtils.import("resource://addressbookssync/addressbookssync.jsm");
        gComponent = new addressbooksSync();
        gComponent.initialize();
        gComponent.debug('abs: TB exiting! module loaded', true);
        gComponent.usesPopup=true;
        gComponent.exiting=true;
      } catch(e) {
        Components.utils.reportError('AddressbooksSynchronizer: TB exiting! ALERT: module NOT loaded: '+e);
      }
    }
  }

  var pub = {
    gABS: gComponent,
//    gStrings: null,// = document.getElementById("de-ggbs-abs-strings"); //must be delayed
    gStrings: Services.strings.createBundle('chrome://addressbookssync/locale/addressbookssync.properties'),
    pref: Services.prefs,
    gTempName: null,
  };

  //public function are define as
  //  pub.name = function(args) {...}
  //and must be called as de_ggbs_abs.name or this.name
  // but beware: if called e.g. via timeout, this is the window,
  //  not de_ggbs_abs!
  //
  //Internal functions are defined normally as
  //  function name(args) {...}
  //and are called without 'this.'


  /* replace function OnMailWindowUnload from messenger/content/messenger/mailWindow.js */
  function absOnMailWindowUnload()
  {
de_ggbs_abs.gABS.debug('in modified OnMailWindowUnload'); //added by gg
    MailOfflineMgr.uninit();
    ClearPendingReadTimer();
  
    // all dbview closing is handled by OnUnloadMessenger for the 3-pane (it closes
    //  the tabs which close their views) and OnUnloadMessageWindow for the
    //  standalone message window.
  
if (!de_ggbs_abs.gABS.autoupload || de_ggbs_abs.gABS.synctype!='imap') { //added by gg
    var mailSession = MailServices.mailSession;
    mailSession.RemoveMsgWindow(msgWindow);
} //added by gg
else de_ggbs_abs.gABS.debug('skip mailSession.RemoveMsgWindow');  //added by gg
    // the tabs have the FolderDisplayWidget close their 'messenger' instances for us
  
    window.QueryInterface(Components.interfaces.nsIDOMChromeWindow)
          .browserDOMWindow = null;
  
    msgWindow.closeWindow();
  
    window.MsgStatusFeedback.unload();
    Components.classes["@mozilla.org/activity-manager;1"]
              .getService(Components.interfaces.nsIActivityManager)
              .removeListener(window.MsgStatusFeedback);
  }

  pub.onLoad = function()
  {
//    pub.gABS.appstarttime=0; // the argument is ignored
de_ggbs_abs.gABS.debug('in onLoad '+window.location+' appstart='+pub.gABS.appstarttime+' state='+pub.gABS.state, true);

//    pub.gStrings = Services.strings.createBundle('chrome://addressbookssync/locale/addressbookssync.properties');
    if (window.location=='chrome://messenger/content/messenger.xul') {

/*UNLOAD*/
        //Overload OnMailWindowUnload function:
        // don't call mailSession.RemoveMsgWindow(msgWindow)
        // or the upload to imap folders will fail
//      window.OnMailWindowUnload=absOnMailWindowUnload;
//alert(window.OnMailWindowUnload);

      pub.gABS.exiting=false; //In case, last main windows has closed, but not other windows

      var windowsEnum = Services.wm.getEnumerator("mail:3pane");
      var w=windowsEnum.getNext();  // there must be one (the current)!
      if (!windowsEnum.hasMoreElements()) { //no more windows, this is the first! Sync!

  //alert('onLoad first:'+window.location+"\n");
        if (pub.gABS.autodownload) {
            //without the delay of some (one) seconds and we are using a master
            //password, the window to enter the masterpassword popups twice!
          var delay = pub.gABS.delayautodownload;
          setTimeout(pub.gABS.showPopup, delay*1000, 'download', null, 'start', false);
        }
        pub.gABS.addListener();  // add a listener to be informed about changes in addressbooks

        // start timer if necessary
        pub.gABS.loadtimer=pub.gABS.loadtimer;
      }
  //else alert('onLoad NOT first:'+window.location+"\n");
    }
    if (pub.gABS.noupload) this.disableUpload();

  }

  return pub;

}();


//Event Listeners
window.addEventListener("load", de_ggbs_abs.onLoad, false);

