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

//if(!de_ggbs) var de_ggbs={};    //might fail because of race condition
if(!de_ggbs_cs2c) var de_ggbs_cs2c={};

if (!de_ggbs_cs2c.caf) de_ggbs_cs2c.caf = function() {
////////////////////////

  var console = Services.console;
  var main = Services.wm.getMostRecentWindow("mail:3pane");
  if (main) {
    var gComponent=main.de_ggbs_cs2c.CS2C;
    console.logStringMessage('cs2c: copiesandfolder.js: using module');
  } else {
    gComponent=null;
//TODO: ALERT
    Components.utils.reportError('CopySent2Current: copiesandfolder.js: ALERT: module NOT found: '+e);
  }
  var pub = {
    gBase:     0x100,
    gSentAlso: 0x10,
    gTrash:    0x20,
    gDefSent:  0x1,
    CS2C:      gComponent,
  };

  //public function are define as
  //  pub.name = function(args) {...}
  //and must be called as de_ggbs_cs2c.caf.name
  //
  //Internal functions are defined normally as
  //  function name(args) {...}
  //and are called without 'this.'

  pub.setPickersState = function(event)
  {
//dump('pub.setPickersState\n');
      document.getElementById('msgFccAccountPicker').setAttribute("disabled", "true");
      document.getElementById('msgFccFolderPicker').setAttribute("disabled", "true");
      this.gui("false");

      var radioElemValue = event.target.value;
      gFccRadioElemChoice = radioElemValue;

      var checker=document.getElementById('de-ggbs-cs2c-fcc2_toSend');
      if (checker.checked) gFccRadioElemChoice|=this.gSentAlso;
      var noCopy=document.getElementById('de-ggbs-cs2c-fcc_noCopyIsTrash');
      if (noCopy.checked) gFccRadioElemChoice|=this.gTrash;

      var radio = document.getElementById("de-ggbs-cs2c-fcc_def");
      if (radio.selectedItem) {
        var defElemValue = radio.selectedItem.value;
        if (defElemValue!=0)
          gFccRadioElemChoice |= this.gDefSent;
        else
          gFccRadioElemChoice &= ~this.gDefSent;
      } else {
        radioElem = document.getElementById("de-ggbs-cs2c-fcc_defiscur");
        radioElem.radioGroup.selectedItem = radioElem;
      }
  }
  pub.setCheckersState = function(event)
  {
//dump('pub.setCheckersState\n');
    if (gFccRadioElemChoice>=this.gBase) { //test should not be necessary
      var checkElemValue = event.target.checked;
      var bit=event.target.id=='de-ggbs-cs2c-fcc2_toSend'       ? this.gSentAlso :
              event.target.id=='de-ggbs-cs2c-fcc_noCopyIsTrash' ? this.gTrash    :
              0;
      if (checkElemValue)
        gFccRadioElemChoice |= bit;
      else
        gFccRadioElemChoice &= ~bit;
    }
  }

  pub.setDefaultsState = function(event)
  {
//dump('pub.setDefaultsState\n');
    if (gFccRadioElemChoice>=this.gBase) { //test should not be necessary
      var defElemValue = event.target.value;
      if (defElemValue!=0)
        gFccRadioElemChoice |= this.gDefSent;
      else
        gFccRadioElemChoice &= ~this.gDefSent;
    }
  }

  pub.gui = function(disable) {
//dump('CS2C: gui called '+disable+'\n');
    document.getElementById('de-ggbs-cs2c-fcc2_toSend').setAttribute("disabled", disable);
    var noCopy=document.getElementById('de-ggbs-cs2c-fcc_noCopyIsTrash');
    noCopy.setAttribute("disabled", disable);

    var radio = document.getElementById("de-ggbs-cs2c-fcc_def");
  //  radio.setAttribute("disabled", disable);  //does not work :-(
    for (var i=0; i<radio.childNodes.length; i++)
      radio.childNodes[i].setAttribute("disabled", disable);
  }

  return pub;

}();

/////////////////////////////////////////////////////////////////////////////
// save references to the original version of these functions
// they will become overloaded with modified versions
if (!de_ggbs_cs2c.ol) {
  Services.console.logStringMessage('cs2c: caf: saving original functions');
//dump('cs2c: caf: saving original functions\n');
  //Services.console.logStringMessage('cs2c: caf: onSave='+window.onSave);  //account
  //Services.console.logStringMessage('cs2c: caf: onOk='+window.onOk);      //identities
  de_ggbs_cs2c.ol = {
    savedOnInitCopiesAndFolders: onInitCopiesAndFolders,
    savedOnSaveCopiesAndFolders: onSaveCopiesAndFolders,
    savedSetupFccItems:          setupFccItems,
    savedsetPickersState:        setPickersState
  }

  /* Overloaded from chrome/messenger/content/messenger/am-copies.js, also called from am-identity-edit.js */
  window.onInitCopiesAndFolders=function () {
    Services.console.logStringMessage('cs2c: caf: onInitCopiesAndFolders');
//dump('cs2c: caf: onInitCopiesAndFolders\n');
    de_ggbs_cs2c.ol.savedOnInitCopiesAndFolders();  // call original version, calls setupFccItems()
      //dumps: Error in setting initial folder display on pickers

    //dump('onInitCopiesAndFolders my part, gFccRadioElemChoice='+gFccRadioElemChoice+'\n');
    if (!document.getElementById("de-ggbs-cs2c-fcc_all").hidden) {
      // hide the 'reply to original folder' checkbox
      var rfp=document.getElementById("identity.fccReplyFollowsParent"); // a checkbox
      if (rfp) rfp.hidden=true;


      if (gFccRadioElemChoice>=de_ggbs_cs2c.caf.gBase) {
        var radioElem = document.getElementById("de-ggbs-cs2c-fcc_selectOnSend");
        radioElem.radioGroup.selectedItem = radioElem;

        if (gFccRadioElemChoice&de_ggbs_cs2c.caf.gSentAlso)
          document.getElementById("de-ggbs-cs2c-fcc2_toSend").checked=true;
        var noCopy=document.getElementById('de-ggbs-cs2c-fcc_noCopyIsTrash');
        if (gFccRadioElemChoice&de_ggbs_cs2c.caf.gTrash)
          noCopy.checked=true;

        if (gFccRadioElemChoice&de_ggbs_cs2c.caf.gDefSent) {
          radioElem = document.getElementById("de-ggbs-cs2c-fcc_defissent");
          radioElem.radioGroup.selectedItem = radioElem;
        } else {
          radioElem = document.getElementById("de-ggbs-cs2c-fcc_defiscur");
          radioElem.radioGroup.selectedItem = radioElem;
        }
      }
    }
  }

  /* Overloaded from chrome/messenger/content/messenger/am-copies.js */
  window.onSaveCopiesAndFolders=function () {
    Services.console.logStringMessage('cs2c: caf: onSaveCopiesAndFolders');
//dump('cs2c: caf: onSaveCopiesAndFolders\n');
    var rec=gFccRadioElemChoice;
      // since (at least) TB38, gFccRadioElemChoice might be reset to 0
      // by onSaveCopiesAndFolders()

    // call original version
    de_ggbs_cs2c.ol.savedOnSaveCopiesAndFolders();

    if (rec>=de_ggbs_cs2c.caf.gBase) { //added!
      gFccRadioElemChoice=rec;
  //dump('save: gFccRadioElemChoice='+gFccRadioElemChoice+'\n');
      var formElement = document.getElementById("identity.fccFolderPickerMode");
      formElement.setAttribute("value", gFccRadioElemChoice);
    }

  }

  /* Overloaded from chrome/messenger/content/messenger/am-copies.js */
  window.setupFccItems=function () {
    Services.console.logStringMessage('cs2c: caf: setupFccItems');
//dump('cs2c: caf: setupFccItems\n');
    de_ggbs_cs2c.ol.savedSetupFccItems();   // call original version
      //dumps: Error in setting Fcc elements.

  //dump('setupFccItems my part\n');
    var checked = document.getElementById("identity.doFcc").checked;
    if (checked && gFccRadioElemChoice>=de_ggbs_cs2c.caf.gBase) {
      var Picker = document.getElementById('msgFccAccountPicker');
      Picker.setAttribute("disabled", "true");
      Picker = document.getElementById('msgFccFolderPicker');
      Picker.setAttribute("disabled", "true");
      de_ggbs_cs2c.caf.gui("false");
    } else {
      de_ggbs_cs2c.caf.gui("true");
    }
  }

  /* Overloaded from chrome/messenger/content/messenger/am-copies.js */
  window.setPickersState=function (enablePickerId, disablePickerId, event) {
    Services.console.logStringMessage('cs2c: caf: setPickersState('+enablePickerId+','+disablePickerId+')');
//dump('cs2c: caf: setPickersState('+enablePickerId+','+disablePickerId+')\n');
    // when this is called we (sometimes) must disable our elements
    if (enablePickerId=='msgFccAccountPicker' || disablePickerId=='msgFccAccountPicker')
      de_ggbs_cs2c.caf.gui("true");
    de_ggbs_cs2c.ol.savedsetPickersState(enablePickerId, disablePickerId, event);
    return;
  }

}
