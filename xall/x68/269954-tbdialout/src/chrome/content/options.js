/****** BEGIN LICENSE BLOCK *****
  *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
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
  * The Original Code is TBDialOut.
  *
  * The Initial Developer of the Original Code is
  * Chris Hastie http://www.oak-wood.co.uk
  * Portions created by the Initial Developer are Copyright (C) 2010
  * the Initial Developer. All Rights Reserved.
  *
  * TBDialOut was inspired by VOIP3 Dialer by MSelector, although the code
  * has largely been rewritten. http://www.mselector.com
  *
  * Contributor(s):
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
  * ***** END LICENSE BLOCK *****
  */

var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

var tbdialoutprefs = {
  
  extension: ExtensionParent.GlobalManager.getExtension("tbdialout@oak-wood.co.uk"),
  
  onLoad: function() {
    tbdialoututils.logger(5, "tbdialoutprefs.onLoad called");  
    this.setCustomOptViz();
    this.setCustomAuthViz();
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService)
      .getBranch("extensions.tbdialout.");
    var passmigrated = this.prefs.getBoolPref("passmigrated");
    if (!passmigrated) {
      tbdialoututils.migratePass();
    }
    this.retrievePasswords();
  },

  setCustomOptViz: function () {
    tbdialoututils.logger(5, "tbdialoutprefs.setCustomOptViz called");
    var custom_elements = document.getElementsByClassName("tbdocustomoptions");
    var ami_elements = document.getElementsByClassName("tbdoamioptions");
    var idx;
    for (idx in custom_elements) {
      if (document.getElementById("proto_menu").value == 'custom') {
        custom_elements[idx].disabled = false;
      } else {
        custom_elements[idx].disabled = true;
      }
    }
    for (idx in ami_elements) {
      if (document.getElementById("proto_menu").value == 'asteriskami') {
        ami_elements[idx].disabled = false;
      } else {
        ami_elements[idx].disabled = true;
      }
    }
  },

  setCustomAuthViz: function () {
    tbdialoututils.logger(5, "tbdialoutprefs.setCustomAuthViz called");  
    if (document.getElementById("proto_menu").value == 'custom') {
      var custom_auth_elements = new Array();
      custom_auth_elements.push(document.getElementById("customuser_text"));
      custom_auth_elements.push(document.getElementById("custompass_text"));
      var loadhidden = document.getElementById("custominbackground_cb").checked;
      var idx;
      for (idx in custom_auth_elements) {
        if (loadhidden) {
          custom_auth_elements[idx].disabled = false;
        } else {
          custom_auth_elements[idx].disabled = true;
        }
      }
      var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("extensions.tbdialout.");
      prefs.setBoolPref("custominbackground", loadhidden);
    }
  },

  openHelp: function () {
    var helpurl = "https://www.oak-wood.co.uk/oss/tbdialout/confighelp";
    //var click_re = "^http(s)?://www.oak-wood.co.uk/";
    tbdialoututils.openInTab(helpurl, helpurl);
  },

  openPassWarn: function () {
    var warnurl = "chrome://tbdialout/content/passwarn.xhtml";
    var dialogWin = window.openDialog(warnurl, "tbdo_pass_warn", "width=800px,height=350px", this.extension);
  },


  saveCustomPassword: function() {
    this.savePassword("custompass_text", "custompass"); 
  },

  saveAmiPassword: function() {
    this.savePassword("amisecret_text", "ami.secret"); 
  },

  savePassword: function (source, type) {
    tbdialoututils.logger(5, "tbdialoutprefs.savePassword called for type " + type);
    var secret = document.getElementById(source).value;
    tbdialoututils.setPass(type, secret);
  },
  
  retrievePasswords: function () {
    tbdialoututils.logger(5, "tbdialoutprefs.retrievePasswords called");
    document.getElementById("amisecret_text").value = tbdialoututils.getPass('ami.secret');
    document.getElementById("custompass_text").value = tbdialoututils.getPass('custompass');
  },


}

document.addEventListener('DOMContentLoaded', () => {
  i18n.updateDocument({
      extension: tbdialoutprefs.extension,
  }
);
}, { once: true });