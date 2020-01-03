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
var {AddonManager} = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

//if(!de_ggbs) var de_ggbs={};  //might fail because of race condition

if (!de_ggbs_cs2c) var de_ggbs_cs2c = function(){
////////////////////////

var console = Services.console;

  var pub = {};
  //public function are define as
  //  pub.name = function(args) {...}
  //and must be called as de_ggbs_cs2c.name
  //
  //Internal functions are defined normally as
  //  function name(args) {...}
  //and are called without 'this.'

  pub.init = function() {
    console.logStringMessage('CopySent2Current: started');
    pub.getAddon();

    var cs2c=ChromeUtils.import("resource://copysent2current/copysent2current.jsm");
    try {
      pub.CS2C = new cs2c.copySent2Current();
      //console.logStringMessage('CopySent2Current: module loaded');
    } catch(e) {
      Components.utils.reportError('CopySent2Current: copysent2current.js: ALERT: module NOT loaded: '+e);
    }

  }

  pub.getAddon = async function() {
    let addOn=await AddonManager.getAddonByID("copysent2current@ggbs.de");
    var console = Services.console;
    var app = Services.appinfo;
    console.logStringMessage('CopySent2Current: '+addOn.version+' on '+app.name+' '+app.version);
  }

  return pub; //return public elements
}();

// Call when the window is fully loaded, prevent racing condition
window.addEventListener("load", de_ggbs_cs2c.init, false);
