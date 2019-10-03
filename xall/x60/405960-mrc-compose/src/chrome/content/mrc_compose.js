
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
 * The Original Code is MRC Compose
 * Parts of this code are Thunderbird
 *
 * The Initial Developer of the Original Code is
 * Michel Renon (renon@mrc-consultant.net)
 * The developer of the Thunderbird Code is Mozilla
 *
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
 * Portions created by Mozilla is Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Contributor(s):
 * Andreas Wagner <mail@andreaswagner.org>
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



/*
 *
 * MRC_COMPOSE
 * ===========
 *
 * provides 6 fields (To, CC, Bcc, ReplyTo, NewsGroup, FollowTo).
 * Each field can contains several adresses, separated by commas.
 * Each field has autocomplete, with options.
 *
 *
 *
 * Organization of code
 * ====================
 *
 * the fields defined in xul file, have callbacks :
 *  - mrcRecipientKeyPress
 *  - mrcRecipientKeyUp
 * These callback use a variable 'mrcAComplete' that provide the complete
 * behaviour of autocomplete.
 *
 * mrcAComplete define pseudo private methods by prefixing them with '_'.
 *
 *
 * The subtle part is :
 * search() and buildResultList() are proxys of internal methods.
 * They choose an internal method depending of the value of the 'param_mode' field.
 * It allows the dev to define several behaviour of search/display.
 * For example, the 2 first modes are :
 *  - 1 : one simple query ("fields contains")
 *        and one simple display (order by lastName and display)
 *  - 2 : 3 queries ("fields begins with", "fields contains but not begin", "group contains")
 *         [ update : that has been optimized to the 2 first queries]
 *        one display : the panel has 3 part, one for each list of results
 *  - 3 : one simple query ("fields contains")
 *        one display : 1 part for each AddressBook
 *
 */


/*
 *
 * TODO :
 *
 *  - allow another view of fields : verticaly ?
 *    I heard of one user being interested in having the email as a vertical list
 *
 *  - les focus à l'ouverture ne semblent plus marcher correctement avec TB24
 *
 *   - mdoif fenetre prefs : afficher le texte dans des tooltips
 */


// "use strict";

ChromeUtils.import("chrome://mrc_compose/content/mrc_tools.js");




/*
 *
 * New versions of 4 existing methods (from Mozilla Thunderbird) :
 *   - Recipients2CompFields()
 *   - CompFields2Recipients()
 *      --> cf <src>/mail/components/compose/content/addressingWidgetOverlay.js
 *   - LoadIdentity()
 *      --> cf <src>/mail/components/compose/content/MsgComposeCommand.js
 *   - AddRecipient()
 *      --> cf <src>/mail/components/compose/content/MsgComposeCommand.js
 *   - AddRecipientsArray()
 *      --> cd <src>/mail/components/compose/content/MsgComposeCommand.js
 *   - updateSendLock()
 *      --> cd <src>/mail/components/compose/content/MsgComposeCommand.js
 */

function Recipients2CompFields(msgCompFields)
{
  if (msgCompFields)
  {
    let i = 1;
    let addrTo = "";
    let addrCc = "";
    let addrBcc = "";
    let addrReply = "";
    let addrNg = "";
    let addrFollow = "";
    let addrOther = "";
    let to_Sep = "";
    let cc_Sep = "";
    let bcc_Sep = "";
    let reply_Sep = "";
    let ng_Sep = "";
    let follow_Sep = "";

    let getValue = function(elementId) {
        let inputField = document.getElementById(elementId);
        let fieldValue = inputField.value;
        if (fieldValue == null) {
            fieldValue = inputField.getAttribute("value");
        }
        // TB31 : need to clean unused comma
        let nb = fieldValue.length - 1;
        let found = false;
        while(found == false) {
            let c = fieldValue.charAt(nb);
            if (c == mrcAComplete.SEP || c == mrcAComplete.PART_PREFIX) {
                nb = nb - 1;
            } else {
                found = true;
            }
        }
        fieldValue = fieldValue.substring(0, nb+1);

        return fieldValue;
    };
    addrTo = getValue("msgTO");
    addrCc = getValue("msgCC");
    addrBcc = getValue("msgBCC");
    addrReply = getValue("msgREPLY");
    addrNg = getValue("msgNG");
    addrFollow = getValue("msgFOLLOW");

    msgCompFields.to = addrTo;
    msgCompFields.cc = addrCc;
    msgCompFields.bcc = addrBcc;
    msgCompFields.replyTo = addrReply;
    msgCompFields.newsgroups = addrNg;
    msgCompFields.followupTo = addrFollow;
    // msgCompFields.otherRandomHeaders = addrOther; // TB38
  }
  else {
    dump("Message Compose Error: msgCompFields is null (ExtractRecipients)");
  }
}

function CompFields2Recipients(msgCompFields)
{
  if (msgCompFields) {
    let mimeConvert = MailServices.mimeConverter;
    // Warning in extension validator
    // top.MAX_RECIPIENTS = 0;
    let msgReplyTo = msgCompFields.replyTo;
    let msgTo = msgCompFields.to;
    let msgCC = msgCompFields.cc;
    let msgBCC = msgCompFields.bcc;
    let msgRandomHeaders = msgCompFields.otherRandomHeaders;
    let msgNewsgroups = msgCompFields.newsgroups;
    let msgFollowupTo = msgCompFields.followupTo;
    let havePrimaryRecipient = false;

    // cleaning CR and LF :
    // TB inserts some \n to have some default formatting ( < 70 cols ?).
    // we don't need it anymore (and we check also for \r )
    let reN = new RegExp("\n", "g");
    let reR = new RegExp("\r", "g");
    msgTo = msgTo.replace(reN, "").replace(reR, "");
    msgCC = msgCC.replace(reN, "").replace(reR, "");
    msgBCC = msgBCC.replace(reN, "").replace(reR, "");
    msgReplyTo = msgReplyTo.replace(reN, "").replace(reR, "");
    msgNewsgroups = msgNewsgroups.replace(reN, "").replace(reR, "");
    msgFollowupTo = msgFollowupTo.replace(reN, "").replace(reR, "");

    // define values of fields
    let f = function(elt_id, value, field) {
        let recipient = null;
        if (mimeConvert) {
            try {
                recipient = value;
                recipient = mimeConvert.decodeMimeHeader(recipient, null, false, true);
            } catch (ex) {
            }
        }
        if (!recipient) {
            recipient = value;
        }
        let inputField = document.getElementById(elt_id);
        inputField.value = recipient;
        if (recipient != "" && mrcAComplete.param_add_comma) {
            inputField.value += mrcAComplete.PART_SUFFIX+mrcAComplete.SEP+mrcAComplete.PART_PREFIX;
        }

        if (field != "") {
            mrcAComplete.updateFieldVisibilityOnLoad(field);
        }
        // in order to resize, we need to have the value and the visibility defined
        mrcRecipientResize(inputField);
        mrcAComplete.updateNbRecipients(inputField);
    };
    f("msgTO", msgTo, "");
    f("msgCC", msgCC, "fieldCC");
    f("msgBCC", msgBCC, "fieldBCC");
    f("msgREPLY", msgReplyTo, "fieldREPLY");
    f("msgNG", msgNewsgroups, "fieldNG");
    f("msgFOLLOW", msgFollowupTo, "fieldFOLLOW");

    // CompFields2Recipients is called whenever a user replies or edits an existing message. We want to
    // add all of the recipients for this message to the ignore list for spell check
    // addRecipientsToIgnoreList((gCurrentIdentity ? gCurrentIdentity.identityName + ', ' : '') + msgTo + ', ' + msgCC + ', ' + msgBCC);

    mrcComposeFocus();
  }
}

function LoadIdentity(startup)
{
    var identityElement = document.getElementById("msgIdentity");
    var prevIdentity = gCurrentIdentity;

    if (identityElement) {
        var idKey = identityElement.value; // TB24, TB31
        var idKey = identityElement.selectedItem.getAttribute("identitykey"); // TB38
        gCurrentIdentity = MailServices.accounts.getIdentity(idKey);
        /*
        let accountKey = null;
        // Set the account key value on the menu list.
        if (identityElement.selectedItem) {
          accountKey = identityElement.selectedItem.getAttribute("accountkey");
          identityElement.setAttribute("accountkey", accountKey);
          hideIrrelevantAddressingOptions(accountKey);
        }

        let maxRecipients = awGetMaxRecipients();
        for (let i = 1; i <= maxRecipients; i++)
        {
          let params = JSON.parse(awGetInputElement(i).searchParam);
          params.idKey = idKey;
          params.accountKey = accountKey;
          awGetInputElement(i).searchParam = JSON.stringify(params);
        }
        */
        if (!startup && prevIdentity && idKey != prevIdentity.key)
        {
          var prevReplyTo = prevIdentity.replyTo;
          var prevCc = "";
          var prevBcc = "";
          var prevReceipt = prevIdentity.requestReturnReceipt;
          var prevDSN = prevIdentity.DSN;
          var prevAttachVCard = prevIdentity.attachVCard;

          if (prevIdentity.doCc) {
            prevCc += prevIdentity.doCcList;
          }
          if (prevIdentity.doBcc) {
            prevBcc += prevIdentity.doBccList;
          }
          var newReplyTo = gCurrentIdentity.replyTo;
          var newCc = "";
          var newBcc = "";
          var newReceipt = gCurrentIdentity.requestReturnReceipt;
          var newDSN = gCurrentIdentity.DSN;
          var newAttachVCard = gCurrentIdentity.attachVCard;

          if (gCurrentIdentity.doCc) {
            newCc += gCurrentIdentity.doCcList;
          }
          if (gCurrentIdentity.doBcc) {
            newBcc += gCurrentIdentity.doBccList;
          }
          var needToCleanUp = false;
          var msgCompFields = gMsgCompose.compFields;

          if (!gReceiptOptionChanged &&
              prevReceipt == msgCompFields.returnReceipt &&
              prevReceipt != newReceipt)
          {
            msgCompFields.returnReceipt = newReceipt;
            document.getElementById("returnReceiptMenu").setAttribute('checked',msgCompFields.returnReceipt);
          }

          if (!gDSNOptionChanged &&
              prevDSN == msgCompFields.DSN &&
              prevDSN != newDSN)
          {
            msgCompFields.DSN = newDSN;
            document.getElementById("dsnMenu").setAttribute('checked',msgCompFields.DSN);
          }

          if (!gAttachVCardOptionChanged &&
              prevAttachVCard == msgCompFields.attachVCard &&
              prevAttachVCard != newAttachVCard)
          {
            msgCompFields.attachVCard = newAttachVCard;
            document.getElementById("cmd_attachVCard").setAttribute('checked',msgCompFields.attachVCard);
          }
        /*
          if (newReplyTo != prevReplyTo)
          {
            needToCleanUp = true;
            if (prevReplyTo != "")
              awRemoveRecipients(msgCompFields, "addr_reply", prevReplyTo);
            if (newReplyTo != "")
              awAddRecipients(msgCompFields, "addr_reply", newReplyTo);
          }

          if (newCc != prevCc)
          {
            needToCleanUp = true;
            if (prevCc != "")
              awRemoveRecipients(msgCompFields, "addr_cc", prevCc);
            if (newCc != "")
              awAddRecipients(msgCompFields, "addr_cc", newCc);
          }

          if (newBcc != prevBcc)
          {
            needToCleanUp = true;
            if (prevBcc != "")
              awRemoveRecipients(msgCompFields, "addr_bcc", prevBcc);
            if (newBcc != "")
              awAddRecipients(msgCompFields, "addr_bcc", newBcc);
          }

          if (needToCleanUp)
            awCleanupRows();
        */
            // start of specific code
            if (newReplyTo != prevReplyTo)
            {
                if (prevReplyTo != "") {
                    mrcAComplete._removeRecipient('fieldREPLY', prevReplyTo);
                }
                if (newReplyTo != "") {
                    mrcAComplete._insertRecipient('fieldREPLY', newReplyTo);
                }
                mrcAComplete.updateFieldVisibilityOnLoad('fieldREPLY');
            }

            if (newCc != prevCc)
            {
                if (prevCc != "") {
                    mrcAComplete._removeRecipient('fieldCC', prevCc);
                }
                if (newCc != "") {
                    mrcAComplete._insertRecipient('fieldCC', newCc);
                }
                mrcAComplete.updateFieldVisibilityOnLoad('fieldCC');
            }

            if (newBcc != prevBcc)
            {
                if (prevBcc != "") {
                    mrcAComplete._removeRecipient('fieldBCC', prevBcc);
                }
                if (newBcc != "") {
                    mrcAComplete._insertRecipient('fieldBCC', newBcc);
                }
                mrcAComplete.updateFieldVisibilityOnLoad('fieldBCC');
            }
            // end of specific code
          try {
            gMsgCompose.identity = gCurrentIdentity;
          } catch (ex) {
            dump("### Cannot change the identity: " + ex + "\n");
          }

          var event = document.createEvent('Events');
          event.initEvent('compose-from-changed', false, true);
          document.getElementById("msgcomposeWindow").dispatchEvent(event);
        }

      if (!startup) {
          if (getPref("mail.autoComplete.highlightNonMatches")) {
            document.getElementById('addressCol2#1').highlightNonMatches = true;
          }

          addRecipientsToIgnoreList(gCurrentIdentity.identityName);  // only do this if we aren't starting up....it gets done as part of startup already
      }
    }
}

// public method called by the address picker sidebar
function AddRecipient(recipientType, address)
{
    // mrcLog("AddRecipient("+recipientType+", "+address+")");
    switch(recipientType) {
        case "addr_to" :
            mrcAComplete._insertRecipient('fieldTO', address);
            mrcAComplete.forceFieldVisibility('fieldTO', true);
            mrcAComplete.updateFieldUI('fieldTO');
            // special TB 24 ; TB 17 does not need the parameter
            updateSendCommands(true);
            break;

        case "addr_cc" :
            mrcAComplete._insertRecipient('fieldCC', address);
            mrcAComplete.forceFieldVisibility('fieldCC', true);
            mrcAComplete.updateFieldUI('fieldCC');
            // special TB 24 ; TB 17 does not need the parameter
            updateSendCommands(true);
            break;

        case "addr_bcc" :
            mrcAComplete._insertRecipient('fieldBCC', address);
            mrcAComplete.forceFieldVisibility('fieldBCC', true);
            mrcAComplete.updateFieldUI('fieldBCC');
            // special TB 24 ; TB 17 does not need the parameter
            updateSendCommands(true);
            break;
    }
}




// TB 51+ SPECIFIC

// Public method called by the contants sidebar.
function AddRecipientsArray(aRecipientType, aAddressArray)
{
    mrcLog("AddRecipientsArray("+aRecipientType+", "+aAddressArray+")");
    switch(aRecipientType) {
        case "addr_to" :
            mrcAComplete._insertRecipient('fieldTO', aAddressArray);
            mrcAComplete.forceFieldVisibility('fieldTO', true);
            mrcAComplete.updateFieldUI('fieldTO');
            // special TB 24 ; TB 17 does not need the parameter
            updateSendCommands(true);
            break;

        case "addr_cc" :
            mrcAComplete._insertRecipient('fieldCC', aAddressArray);
            mrcAComplete.forceFieldVisibility('fieldCC', true);
            mrcAComplete.updateFieldUI('fieldCC');
            // special TB 24 ; TB 17 does not need the parameter
            updateSendCommands(true);
            break;

        case "addr_bcc" :
            mrcAComplete._insertRecipient('fieldBCC', aAddressArray);
            mrcAComplete.forceFieldVisibility('fieldBCC', true);
            mrcAComplete.updateFieldUI('fieldBCC');
            // special TB 24 ; TB 17 does not need the parameter
            updateSendCommands(true);
            break;
    }
}

/**
 * Keep the Send buttons disabled until any recipient is entered.
 */
function updateSendLock()
{
  gSendLocked = true;
  if (!gMsgCompose) {
    return;
  }

  // Enable the send buttons if anything useable was entered into at least one
  // recipient field.
  var nb_total_recipients = mrcAComplete.getNbTotalRecipients();
  gSendLocked = nb_total_recipients == 0;
}


// function AdjustFocus() {
//    mrcComposeFocus();
// }


/*
 *
 * ==================================================================
 * specific code for MRC AUTOCOMPLETE
 * ==================================================================
 *
 */

/*
 * javascript utilities
 */


function removeChildren(element) {
    let children = element.childNodes;
    let nbChildren = children.length;
    for (let c = nbChildren-1 ; c >= 0 ; c--) {
        element.removeChild(children[c]);
    }
}


function appendChildrenList(obj,  children) {
    for (let z =0 ; z < children.length ; z++) {
        obj.appendChild(children[z]);
    }
}

function debug_obj(obj){
    let txt = "";
    for (let i in obj) {
        txt += i+":"+obj[i]+"||";
    }
    mrcLog(txt);
}

function _get(obj, field_name, default_value) {
    if (obj.hasOwnProperty(field_name)) {
        return obj[field_name]
    } else {
        return default_value;
    }
}

function now() {
    let currentdate = new Date();
    let text = "";
    // day/month/year
    // text +=  currentdate.getDate() + "/"
    //        + (currentdate.getMonth()+1)  + "/"
    //        + currentdate.getFullYear() + " @ ";
    // H:M:S
    text += currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();
    // milliseconds
    text += ":" + currentdate.getMilliseconds();
    return text;
}

// from http://stackoverflow.com/questions/1374126/how-to-extend-an-array-with-an-existing-javascript-array
/*
 * incompatible with TB
 *
Array.prototype.mrc_extend = function (other_array) {
    // you should include a test to check whether other_array really is an array
    other_array.forEach(function(v) {this.push(v)}, this);
}
*/
function array_extend(src_array, other_array) {
    // you should include a test to check whether other_array really is an array
    other_array.forEach(function(v) {this.push(v)}, src_array);
}


/*
 * the manager of autocomplete
 */
var mrcAComplete = {

    /*
     *
     * constants used by manager
     *
     */

    NBSP : "\u00a0",

    // class names for html elements
    ID_PREFIX : "",
    CONTAINER_CLASSNAME : "container",
    ITEM_CLASSNAME : "item",
    SELECT_CLASSNAME : "select",
    SEP_CLASSNAME : "sep",
    INFO_CLASSNAME : "info",
    TITLE_CLASSNAME : "title",
    EMAIL_CLASSNAME : "email",
    NBINGROUP_CLASSNAME : "nbingroup",
    POPULARITY_CLASSNAME : "popularity",
    HIDDENNAME_CLASSNAME : "hiddenname",
    ALERT_INFO_CLASSNAME : "alert-info",
    ALERT_ERROR_CLASSNAME : "alert-error",
    ALERT_WARNING_CLASSNAME : "alert-warning",

    // html namespace in order to integrate html elements into xul
    HTMLNS : "http://www.w3.org/1999/xhtml",

    // the separator used to split liste of emails
    SEP : ",",

    PART_PREFIX : " ",
    PART_SUFFIX : "",

    // define the ids of all elements for each field
    // format :
    //      {
    //        key : ['boxId':val1, 'txtId':val2, 'nbId':val3, 'warnId':val4, 'menuId':val5]
    //      }
    // key : an internal identifier of the field : 'fieldTO', 'fieldCC'...
    // val1 : id of the box, the whole line containing the label, the field and the warning
    // val2 : id of the textfield
    // val3 : id of the number textfield
    // val4 : id of the warning label
    // val5 : id of the menuitem
    FIELDS : {
            'fieldTO' :     {'boxId':'box-to', 'txtId':'msgTO', 'nbId':'nbTO', 'warnId':'warning_nbTO', 'menuId':'' },
            'fieldCC' :     {'boxId':'box-cc', 'txtId':'msgCC', 'nbId':'nbCC', 'warnId':'warning_nbCC', 'menuId':'menu-box-cc' },
            'fieldBCC' :    {'boxId':'box-bcc', 'txtId':'msgBCC', 'nbId':'nbBCC', 'warnId':'', 'menuId':'menu-box-bcc' },
            'fieldREPLY' :  {'boxId':'box-reply', 'txtId':'msgREPLY', 'nbId':'nbREPLY', 'warnId':'', 'menuId':'menu-box-reply' },
            'fieldNG' :     {'boxId':'box-ng', 'txtId':'msgNG', 'nbId':'nbNG', 'warnId':'', 'menuId':'menu-box-ng' },
            'fieldFOLLOW' : {'boxId':'box-follow', 'txtId':'msgFOLLOW', 'nbId':'nbFOLLOW', 'warnId':'', 'menuId':'menu-box-follow' },
            },

    COLLECTED_ADDRESS_BOOK_URI : "moz-abmdbdirectory://history.mab",

    // Values of deck of autocomplete panel
    DECK_WAITING : 0,
    DECK_AUTOCOMPLETE : 1,
    DECK_TYPEMORE : 2,

    // the delay with no search before purging archive of searchListeners
    DELAY_PURGE_ARCHIV : 60 * 1000, // 1 minute
    // DELAY_PURGE_ARCHIV : 10 * 1000, // 10 s for DEBUG



    /*
     *
     * parameters (may be changed by preferences dialog)
     *
     */

    // value to compute automatic height of textboxes
    // std textbox is
    // ubuntu :  28px for first line, then 17px for others
    // windows : 20px and 13px
    // mac :     20px and 14 px
    param_line_height : 17, // pixels
    param_first_line_height : 28, // pixels
    param_max_nb_line : 5,
    // param_max_height : this.param_first_line_height + (this.param_max_nb_line-1)*this.param_line_height,
    param_max_height : 96,


    // three levels sort
    param_sort_field_level_1 : 'mrcPopularity',
    param_sort_field_level_2 : 'lastName',
    param_sort_field_level_3 : 'firstName',
    // others values to test
    // param_sort_field_level_1 : 'firstName',
    // param_sort_field_level_2 : 'lastName',

    // we show the number of recipients in a field, if it is above that value
    param_min_recipients_show : 2,
    // we want to show a warning if too much recipients in TO and CC fields
    // --> "use BCC instead"
    param_max_recipients_warning : 10,
    // do we add a comma after the inserted contact ?
    param_add_comma : false,

    // the delay between 2 identical searches (milliseconds)
    param_min_search_delay : 500,

    // the timeout of search (milliseconds)
    param_search_timeout : 5000,

    // start the autocomplete search when a min number of chars is entered
    param_search_min_char : 1,

    // search on 'collected' address book
    param_search_collected_ab : false,

    // the each part of autocomplete panel should contains max number of element
    param_max_elements_part_menu : 30, // default value for param_mode:1
    // param_max_elements_part_menu : 15, // default value for param_mode:2

    // param_mode : we have defined multiple behaviours for search/show result
    // because it's impossible to have 'one fits all'...
    //
    // available param_modes :
    // - 1
    //    the list contains 1 part :
    //       - 'contains' : contacts & lists whose fields(*) contains X with (except those in part 1)
    //
    //     * : fields are 'PrimaryEmail', 'FirstName', 'LastName', 'NickName' for contacts
    //         fields is 'LastName' for list
    //
    // - 2
    //    the list contains 3 parts :
    //       - 'begin' :    contacts whose fields(*) begin with X
    //       - 'contains' : contacts whose fields(*) contains X with (except those in part 1)
    //       - 'list' :     groups whose fields(*) contains X
    //
    //     * : fields are 'PrimaryEmail', 'FirstName', 'LastName', 'NickName' for contacts
    //         fields is 'LastName' for list
    //
    // - 3
    //    the list contains 1 part for each AddressBook:
    //       - 'contains' : contacts & lists whose fields(*) contains X
    //
    //     * : fields are 'PrimaryEmail', 'FirstName', 'LastName', 'NickName' for contacts
    //         fields is 'LastName' for list
    //
    // - 4
    //    the list contains 1 part :
    //       - 'begin' : contacts & lists whose fields(*) begin with X
    //
    //     * : fields are 'PrimaryEmail', 'FirstName', 'LastName', 'NickName' for contacts
    //         fields is 'LastName' for list
    //
    param_mode : 1,

    // the list of ab where search is performed
    param_search_ab_URI : "",

    // automatic height
    param_automatic_height: true,

    // show popularity for each result
    param_show_popularity : false,

    // help define initial values of some preferences
    param_first_load_done : false,

    // (temporary) : allow user to select code for LDAP Searches
    param_ldap_search_version : "TB24",

    // show panel with info "no result" if no result found
    param_show_no_result : false,

    // show placeholder for each textfield
    param_show_placeholder : false,

    // store above constants as options (modifiable by user)
    prefs : null,






    /*
     *
     * utilities fields (defined at init of object, act as cache)
     *
     */

    // address book manager
    abManager : Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager),
    // mime header parser
    mhParser : MailServices.headerParser,




    /*
     *
     * the real fields of object
     *
     */

    // the array that stores the cards listed by the popup panel
    panelCards : [],
    // the index of selected card : ACHTUNG : 1-based : 1..array.length
    indexSelectedCard : 0,
    // the associated textbox, where the autocomplete is activated
    currentTextBox : null,

    // the results of search
    lastQuery : "", // the last searched text (OPTIMIZATION & Xul bug workaround)
    // when the popup is opened, for one real keystroke, we receive two identical 'keyup' events.
    // The workaround is to cache the search item and to perform search only if it changed
    // or if a there is enough delay between the two searches.
    lastQueryTime: 0,
    // the results of search
    datas : {},  // it's a dict : every key/value is a part of the result (defined by 'param_mode')
    // the total number of results
    nbDatas : 0,
    // the errors reported when searching
    errors : [],
    // the warnings reported when searching
    warnings : [],
    // the infos repoerted when searching
    infos : [],
    // uniq id of each future search :
    // will allow handling of several callback returns of ldap searches
    // and filter obsolete ones
    searchID : 0,
    // the list of searched address books, at each request, stored as a dict
    searchedAB : {},
    // the list of old searchlisteners (mostly LDAP) that have not been completed before timeout.
    // Kept to avoid crashes if callback occurs after a long time.
    // In std TB code, there is a timeout of 60s before deleting them.
    searchedAB_archiv : [],
    // The timeout of archiv. It allows purging the archiv after a long time.
    timeout_archiv : null,

    // define the values of all elements for each field
    // format :
    //      {
    //        key : ['enabled' : val1, 'checked' : val2]
    //      }
    // key : an internal identifier of the field : 'fieldTO', 'fieldCC'...
    // val1 : boolean, the state of checkbox : true --> enabled ; false --> disabled/dimmed
    // val2 : boolean, the value of checkbox : true --> checked ; false --> non-checked
    field_states : {
            // 'fieldTO' :     [true, true],
            'fieldCC' :     {'enabled':false, 'checked':false, 'force':false},
            'fieldBCC' :    {'enabled':false, 'checked':false, 'force':false},
            'fieldREPLY' :  {'enabled':false, 'checked':false, 'force':false},
            'fieldNG' :     {'enabled':false, 'checked':false, 'force':false},
            'fieldFOLLOW' : {'enabled':false, 'checked':false, 'force':false},
    },

    field_nb_recipients : {
            'fieldTO' :     0,
            'fieldCC' :     0,
            'fieldBCC' :    0,
            'fieldREPLY' :  0,
            'fieldNG' :     0,
            'fieldFOLLOW' : 0,
    },

    // Cache for _splitEmailList()
    _splitEmail_cache_data : null,
    _splitEmail_cache_output : [],


    // Cache for keyUp
    _textPart_cache : "",




    /*
     *
     *
     * specific methods : startup(), shutdown()
     * and an observer for preferences
     *
     *
     */
    startup: function() {
        /*
         * Initialize the extension
         * Register to receive notifications of preference changes
         *
         */
        this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
                             .getService(Components.interfaces.nsIPrefService)
                             .getBranch("extensions.mrccompose.");
        // this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
        this.prefs.addObserver("", this, false);

        this.param_line_height = this.prefs.getIntPref("line_height");
        this.param_first_line_height = this.prefs.getIntPref("first_line_height");
        this.param_max_nb_line = this.prefs.getIntPref("max_nb_line");
        this.param_max_height = this.param_first_line_height + (this.param_max_nb_line-1)*this.param_line_height;
        this.param_sort_field_level_1 = this.prefs.getCharPref("sort_field_level_1");
        this.param_sort_field_level_2 = this.prefs.getCharPref("sort_field_level_2");
        this.param_sort_field_level_3 = this.prefs.getCharPref("sort_field_level_3");
        this.param_min_recipients_show = this.prefs.getIntPref("min_recipients_show");
        this.param_max_recipients_warning = this.prefs.getIntPref("max_recipients_warning");
        this.param_add_comma = this.prefs.getBoolPref("add_comma");
        this.param_min_search_delay = this.prefs.getIntPref("min_search_delay");
        this.param_search_timeout = this.prefs.getIntPref("search_timeout");
        this.param_search_min_char = this.prefs.getIntPref("search_min_char");
        this.param_search_collected_ab = this.prefs.getBoolPref("search_collected_ab");
        this.param_max_elements_part_menu = this.prefs.getIntPref("max_elements_part_menu");
        this.param_mode = this.prefs.getIntPref("mode");
        this.param_automatic_height = this.prefs.getBoolPref("automatic_height");
        this.param_show_popularity = this.prefs.getBoolPref("show_popularity");
        this.param_search_ab_URI = this.prefs.getCharPref("search_ab_URI");
        this.param_first_load_done = this.prefs.getBoolPref("first_load_done");
        this.param_ldap_search_version = this.prefs.getCharPref("ldap_search_version");
        this.param_show_no_result = this.prefs.getBoolPref('show_no_result');
        this.param_show_placeholder = this.prefs.getBoolPref('show_placeholder');


        this.field_states['fieldCC'].force = this.prefs.getBoolPref("force_cc");
        this.field_states['fieldBCC'].force = this.prefs.getBoolPref("force_bcc");

        // update specials values
        this._prefLoaded();


        // TEST : try to get TB version
        var info = Components.classes["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);
        // Get the name of the application running us
        // info.name; // Returns "Firefox" for Firefox or "Thunderbird" for TB
        // info.version; // Returns "2.0.0.1" for Firefox version 2.0.0.1, "24.5.0"
        // mrcLog("APP NAME="+info.name+" ; APP VERSION="+info.version);
        // APP NAME=Thunderbird ; APP VERSION=24.5.0

        var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                           .getService(Components.interfaces.nsIXULRuntime);
        var os_name = xulRuntime.OS.toLowerCase();
        // mrcLog("OS = "+xulRuntime.OS);
        // 'Linux', 'WINNT', 'Darwin'

        // Adapt visibility of placeholders, based on prefs.
        if (this.param_show_placeholder == false) {
            let fields = ["msgTO", "msgCC", "msgBCC", "msgREPLY", "msgNG", "msgFOLLOW"];
            for (let index in fields) {
                let test = document.getElementById(fields[index]);
                test.setAttribute("placeholder", "");
            }
        }


        /*
         *
         *
         *
         * https://developer.mozilla.org/en-US/Add-ons/How_to_convert_an_overlay_extension_to_restartless#Step_7_Manually_handle_global_CSS_Stylesheets
         * STEP 7
         *
         */
        Components.utils.import("resource://gre/modules/Services.jsm");
        var styleSheets = ["chrome://mrc_compose/skin/theme/mrc_compose_"+os_name+".css"];

        // Load stylesheets
        let styleSheetService= Components.classes["@mozilla.org/content/style-sheet-service;1"]
                                         .getService(Components.interfaces.nsIStyleSheetService);
        for (let i=0,len=styleSheets.length ; i<len ; i++) {
            let styleSheetURI = Services.io.newURI(styleSheets[i], null, null);
            styleSheetService.loadAndRegisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
        }
    },

    shutdown: function() {
        /*
         *
         */
        this.prefs.removeObserver("", this);
    },

    observe: function(subject, topic, data) {
        /*
         *  method to implement nsIPrefBranch interface
         *
         */
        mrcLog("nsIPrefBranch::observe : "+subject+","+topic+","+data);
        if (topic != "nsPref:changed") {
            return;
        }
        switch(data)  {
            case "line_height":
                this.param_line_height = this.prefs.getIntPref("line_height");
                this.param_max_height = this.param_first_line_height + (this.param_max_nb_line-1)*this.param_line_height;
                break;
            case "first_line_height":
                this.param_first_line_height = this.prefs.getIntPref("first_line_height");
                this.param_max_height = this.param_first_line_height + (this.param_max_nb_line-1)*this.param_line_height;
                break;
            case "max_nb_line":
                this.param_max_nb_line = this.prefs.getIntPref("max_nb_line");
                this.param_max_height = this.param_first_line_height + (this.param_max_nb_line-1)*this.param_line_height;
                break;
            case "sort_field_level_1":
                this.param_sort_field_level_1 = this.prefs.getCharPref("sort_field_level_1");
                break;
            case "sort_field_level_2":
                this.param_sort_field_level_2 = this.prefs.getCharPref("sort_field_level_2");
                break;
            case "sort_field_level_3":
                this.param_sort_field_level_3 = this.prefs.getCharPref("sort_field_level_3");
                break;
            case "min_recipients_show":
                this.param_min_recipients_show = this.prefs.getIntPref("min_recipients_show");
                break;
            case "max_recipients_warning":
                this.param_max_recipients_warning = this.prefs.getIntPref("max_recipients_warning");
                break;
            case "add_comma":
                this.param_add_comma = this.prefs.getBoolPref("add_comma");
                break;
            case "min_search_delay":
                this.param_min_search_delay = this.prefs.getIntPref("min_search_delay");
                break;
            case "search_timeout":
                this.param_search_timeout = this.prefs.getIntPref("search_timeout");
                break;
            case "search_min_char":
                this.param_search_min_char = this.prefs.getIntPref("search_min_char");
                break;
            case "search_collected_ab":
                this.param_search_collected_ab = this.prefs.getBoolPref("search_collected_ab");
                break;
            case "max_elements_part_menu":
                this.param_max_elements_part_menu = this.prefs.getIntPref("max_elements_part_menu");
                break;
            case "mode":
                this.param_mode = this.prefs.getIntPref("mode");
                break;
            case "automatic_height":
                this.param_automatic_height = this.prefs.getBoolPref("automatic_height");
                break;
            case "show_popularity":
                this.param_show_popularity = this.prefs.getBoolPref("show_popularity");
                break;
            case "search_ab_URI":
                this.param_search_ab_URI = this.prefs.getCharPref("search_ab_URI");
                break;
            case "first_load_done":
                this.param_first_load_done = this.prefs.getBoolPref("first_load_done");
                break;
            case "force_bcc":
                this.field_states['fieldBCC'].force = this.prefs.getBoolPref("force_bcc");
                this.updateFieldVisibilityOnLoad('fieldBCC');
                break;
            case "force_cc":
                this.field_states['fieldCC'].force = this.prefs.getBoolPref("force_cc");
                this.updateFieldVisibilityOnLoad('fieldCC');
                break;
            case "ldap_search_version":
                this.param_ldap_search_version = this.prefs.getCharPref("ldap_search_version");
                break;
            case "show_no_result":
                this.param_show_no_result = this.prefs.getBoolPref("show_no_result");
                break;
        }
    },




    /*
     *
     *
     * pseudo private methods (just begin with '_')
     *
     *
     */

    /*
     * hash method
     *
     * from http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascrip-jquery
     * answer : http://stackoverflow.com/a/15710692
     *
     */
    _hashCode : function(s) {
        return s.split("").reduce(function(a,b) {
                a=((a<<5)-a)+b.charCodeAt(0);
                return a&a;
            });
    },

    _prefLoaded : function() {
        /*
         *
         *
         */
        let first_load_done = this.prefs.getBoolPref("first_load_done");
        if (!first_load_done) {
            this.param_search_ab_URI = this.prefs.getCharPref("search_ab_URI");
            // Create pref with all address books
            let abItems = [];
            let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
            let allAddressBooks = abManager.directories;
            while (allAddressBooks.hasMoreElements()) {
                let ab = allAddressBooks.getNext();
                if (ab instanceof Components.interfaces.nsIAbDirectory &&  !ab.isRemote) {
                    abItems.push(ab.URI);
                }
            }
            let ab_uri = abItems.join(";;;");
            this.param_search_ab_URI = ab_uri;
            this.prefs.setCharPref("search_ab_URI", ab_uri);
            this.prefs.setBoolPref("first_load_done", true);
        }
    },


    _splitEmailList : function (data) {
        /*
         * split a list of complete emails, separated by commas
         *
         * each complete email can have two parts :
         * [diplayName] <email>
         * displayName is optionnal
         *
         * displayName can contains specials characters :
         * if it contains ',', displayName is quoted
         * if it contains quote, the quote is backslashed
         * if it contains a backslash, it is backslashed
         *
         * ex :
         *   John DOE <john.doe@isp.com>
         *   "DOE, John" <john.doe@isp.com>
         *   "DOE, John (\"Jojo\")" <john.doe@isp.com>
         *   "DOE, John \\/" <john.doe@isp.com>
         *
         * params :
         *   data : text, the list of emails
         *
         * returns :
         *    array of emails, still quoted and backslashed
         *
         */


        /*
         *  Version with internal API :
         *  MailServices.headerParser.parseHeadersWithArray()
         *
         * but there is a problem in a special case :
         * when the data contains "xxx, yyyy, zzz,"
         * the internal API returns : [xxx,yyyy,zzz] instead of [xxx,yyyy,zzz,].
         * This prevents the current mrcCompose code to add new recipients.
         *
         * The internal API is useful after editing, but not during editing.
         * Until a workaround is found, I keep my javascript version.
         *
         *
        let addresses = {};         // 'value' : list of emails : veronica@achorn.com
        let names = {};             // 'value' : list of names : Achorn, Veronica
        let fullNames = {};         // 'value' : list of 'name <email>' : "Achorn, Veronica" <veronica@achorn.com>
                                    //            with quotes if necessary
        let numAddresses =  0;
        numAddresses = MailServices.headerParser.parseHeadersWithArray(data, addresses, names, fullNames);
        // return fullNames.value;
        // need to make a copy ?
        var output = [];
        for (let i=0 ; i < numAddresses ; i++) {
            output.push(fullNames.value[i]);
        }
        return output;
        */
        // mrcLog("_splitEmailList:'"+data+"'");
        let output1 = this._splitEmail_cache_output;
        if (data != this._splitEmail_cache_data) {

            output1 = this._splitEmailList_js_version(data);
            // mrcLog("1 : "+output1.join("||"));
            // mrcLog("2 : "+output.join("||"));

            this._splitEmail_cache_data = data;
            this._splitEmail_cache_output = output1;
        }
        return output1;
    },

    _splitEmailList_js_version : function (data, separator, quote, escaper) {
        /*
         * Split a list of complete emails, separated by commas (default).
         *
         * each complete email can have two parts :
         * [diplayName] <email>
         * displayName is optionnal
         *
         * displayName can contains specials characters :
         * if it contains ',', displayName is quoted
         * if it contains quote, the quote is backslashed
         * if it contains a backslash, it is backslashed
         *
         * ex :
         *   John DOE <john.doe@isp.com>
         *   "DOE, John" <john.doe@isp.com>
         *   "DOE, John (\"Jojo\")" <john.doe@isp.com>
         *   "DOE, John \\/" <john.doe@isp.com>
         *
         * params :
         *   data : text, the list of emails
         *   separator : (optional) default is comma
         *   quote : (optional) default is quote
         *   escaper : (optional) default is backslash
         *
         * returns :
         *    array of emails, still quoted and backslashed
         */
        separator = mrcPick(separator, ',');
        quote = mrcPick(quote, '"');
        escaper = mrcPick(escaper, '\\');

        // separator and escaper MUST BE 1 char length

        let output = [];
        let nbData = data.length;
        let inQuote = false;
        let curChar = '';
        let part = '';
        let doPushPart = false;
        let doPushChar = true;
        let doEscapeNextChar = false;

        // we parse the data, iterate over each character
        for (let i=0 ; i<nbData ; i++) {
            curChar = data[i];
            doPushPart = false;
            doPushChar = true;

            if (doEscapeNextChar === false) {
                // previous char was NOT an 'escaper'
                // we make std process

                // quote handling
                if (curChar === quote) {
                    inQuote = ! inQuote;
                }
                // separator handling
                if (inQuote === false) {
                    if (curChar === separator) {
                        doPushPart = true;
                        doPushChar = false;
                    }
                }
                // escaper handling
                if (curChar === escaper) {
                    // escape next char
                    // and keep the escaper !
                    doPushChar = true;
                    doEscapeNextChar = true;
                }
            } else {
                // previous char was an 'escaper'
                // no tests : we insert that car directly
                doPushChar = true;
                doEscapeNextChar = false;
            }

            // now execute actions for current char
            if (doPushChar) {
                part += curChar;
            }
            if (doPushPart) {
                output.push(part);
                part = '';
            }
        }

        // always a value
        output.push(part);
        return output;
    },

    _myEncode : function(txt) {
        /*
         * utility to encode text
         *
         * params :
         *   txt : the text to encode
         * return
         *   the text encoded
         */
        // default : we make essentials encoding : replace chars that break html
        txt = txt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // return encodeURI(txt);
        // TODO : use the correct API to encode texts

        return txt;
    },

    _applyBold : function(src, part, typeSearch) {
        /*
         * apply bold html style to some parts of text
         *
         * we are obliged to write our own method to put some part of text in bold
         * if we use replace() and regexp, we still have small but annoying problems :
         * txt = txt.replace(part, "<b>"+part+"</b>");
         *     txt="firstName lastName <email>", part="na" --> "firstName lastName <email>", should be "first<b>Na</b>me last<b>Na</b>me <email>"
         *     ---> replace is case-sensitive
         * txt = txt.replace(new RegExp(part, "gi"), "<b>"+part+"</b>");
         *     txt="firstName lastName <email>", part="na" --> "first<b>na</b>me last<b>na</b>me <email>", should be "first<b>Na</b>me last<b>Na</b>me <email>"
         *     ---> replaced text has lost his case
         *
         * We must also integrate the encode method.
         * Otherwise, we can have bad results if encoding is applied before :
         *   src : 'lastname <nickname>'
         *   src encoded : 'lastname &lt;nickname&gt;'
         *   if we have to apply bold for 't' :
         *   'las<b>t</b>name &l<b>t</b>;nickname&g<b>t</b>;' ==> html error
         *
         *
         * params :
         *   src : the text to modify
         *   part : the text to search in src ; will be bolded in src
         *   typeSearch : 'begins' or 'contains' ; info to optimize changes : only in the begining of src or globaly in src
         * return :
         *   src modify with html bold style
         */
        let tagStart = "<b>";
        let tagEnd = "</b>";
        let exp = new RegExp(part, "i");
        let dest = "";
        let doSearch = true;
        while (doSearch) {
            let pos = src.search(exp);
            if (pos >= 0) {
                let doReplace;
                if (typeSearch == 'begin') {
                    if (pos == 0) {
                        doReplace = true;
                    } else {
                        doReplace = false;
                    }
                } else {
                    // 'contains' : always replace
                    doReplace = true;
                }

                if (doReplace) {
                    dest += this._myEncode(src.substring(0, pos)) + tagStart + this._myEncode(src.substring(pos, pos+part.length)) + tagEnd;
                } else {
                    dest += this._myEncode(src.substring(0, pos)) + this._myEncode(src.substring(pos, pos+part.length));
                }
                src = src.substring(pos+part.length);
            } else {
                dest += this._myEncode(src);
                doSearch = false;
            }
        }
        return dest;
    },

    _applyBoldNode : function(src, part, typeSearch) {
        /*
         * Apply bold html style to some parts of text
         * and returns DOM nodes that represent the bolded text.
         *
         * we are obliged to write our own method to put some part of text in bold
         * if we use replace() and regexp, we still have small but annoying problems :
         * txt = txt.replace(part, "<b>"+part+"</b>");
         *     txt="firstName lastName <email>", part="na" --> "firstName lastName <email>", should be "first<b>Na</b>me last<b>Na</b>me <email>"
         *     ---> replace is case-sensitive
         * txt = txt.replace(new RegExp(part, "gi"), "<b>"+part+"</b>");
         *     txt="firstName lastName <email>", part="na" --> "first<b>na</b>me last<b>na</b>me <email>", should be "first<b>Na</b>me last<b>Na</b>me <email>"
         *     ---> replaced text has lost is case
         *
         * We must also integrate the encode method.
         * Otherwise, we can have bad results if encoding is applied before :
         *   src : 'lastname <nickname>'
         *   src encoded : 'lastname &lt;nickname&gt;'
         *   if we have to apply bold for 't' :
         *   'las<b>t</b>name &l<b>t</b>;nickname&g<b>t</b>;' ==> html error
         *
         *
         * params :
         *   src : the text to modify
         *   part : the text to search in src ; will be bolded in src
         *   typeSearch : 'begins' or 'contains' ; info to optimize changes : only in the begining of src or globaly in src
         * return :
         *   array of DOM nodes
         */
        let exp = new RegExp(part, "i");
        let dest = [];
        let doSearch = true;
        while (doSearch) {
            let pos = src.search(exp);
            if (pos >= 0) {
                let doReplace;
                if (typeSearch == 'begin') {
                    if (pos == 0) {
                        doReplace = true;
                    } else {
                        doReplace = false;
                    }
                } else {
                    // 'contains' : always replace
                    doReplace = true;
                }

                if (doReplace) {
                    dest.push(document.createTextNode(src.substring(0, pos)));
                    let b = document.createElementNS(mrcAComplete.HTMLNS, "b");
                    b.appendChild(document.createTextNode(src.substring(pos, pos+part.length)));
                    dest.push(b);
                } else {
                    dest.push(document.createTextNode(src.substring(0, pos)));
                    dest.push(document.createTextNode(src.substring(pos, pos+part.length)));
                }
                src = src.substring(pos+part.length);
            } else {
                dest.push(document.createTextNode(src));
                doSearch = false;
            }
        }
        return dest;
    },
    _getPartByPos : function(src, pos) {
        /*
         * in a text separated by commas, search the subtext corresponding to the position
         *
         * params :
         *   src : the text separated by commas
         *   pos : the character position
         * return :
         *   a dict :
         *       'b'            : the position where the found part begins
         *       'e'            : the position where the found part ends
         *       'i'            : the index of the found part
         *       'isFirstPart'  : is it the first part ?
         *       'isLastPart'   : is it the last part ?
         */
        let res = this._splitEmailList(src);
        let splitBegin = 0;
        let splitEnd = 0;
        let splitIndex = 0;
        let splitLength = 0;
        let textLength = 0;
        for (let i = 0 ; i < res.length ; i++) {
            splitLength = res[i].length;
            splitBegin = textLength;
            splitEnd = splitBegin+splitLength;
            textLength += splitLength + this.SEP.length;
            if (pos < textLength) {
                splitIndex = i;
                break;
            }
        }
        return {
                'b' : splitBegin,
                'e' : splitEnd,
                'i' : splitIndex,
                'isFirstPart' : splitIndex == 0,
                'isLastPart' : splitIndex == res.length-1,
            }
    },

    _getPartByIndex : function(src, idx) {
        /*
         * in a text separated by commas, search the subtext corresponding to the part index
         *
         * params :
         *   src : the text separated by commas
         *   idx : the idx of part
         * return :
         *   a dict :
         *       'b'            : the position where the found part begins
         *       'e'            : the position where the found part ends
         *       'i'            : the index of the found part
         *       'isFirstPart'  : is it the first part ?
         *       'isLastPart'   : is it the last part ?
         */
        let res = this._splitEmailList(src);
        let splitBegin = 0;
        let splitEnd = 0;
        let splitIndex = 0;
        let textLength = 0;
        for (let i = 0 ; i < res.length ; i++) {
            splitLength = res[i].length;
            splitBegin = textLength;
            splitEnd = splitBegin+splitLength;
            textLength += splitLength + this.SEP.length;
            if (i == idx) {
                splitIndex = i;
                break;
            }
        }
        return {
                'b' : splitBegin,
                'e' : splitEnd,
                'i' : splitIndex,
                'isFirstPart' : splitIndex == 0,
                'isLastPart' : splitIndex == res.length-1,
            }
    },

    _insertInPart : function(src, pos, txt) {
        /*
         * in a text separated by commas, replace the subtext corresponding to the part index
         *
         * params :
         *   src : the text separated by commas
         *   pos : the character position
         *   txt : the text to insert in the part defined by pos
         * return :
         *   dict :
         *       'text'         : the text with the part replaced
         *       'b'            : the position where the text was inserted
         *       'e'            : the position of end of inserted text
         *       'isFirstPart'  : is it the first part ?
         *       'isLastPart'   : is it the last part ?
         */
        // we search the beginning and the end of the part
        let res = this._getPartByPos(src, pos);
        let newTxt = "";
        if (res['isFirstPart'] == false) {
            newTxt += src.substring(0, res['b']) + this.PART_PREFIX;
        }
        newTxt += txt + this.PART_SUFFIX + src.substring(res['e']);
        let values = {
                'text' : newTxt,
                'b' : res['b'],
                'e' : res['b'] + this.PART_PREFIX.length + txt.length + this.PART_SUFFIX.length,
                'isFirstPart' : res['isFirstPart'],
                'isLastPart' : res['isLastPart'],
            }
        return values;
    },

    _elementInsertInPart : function(element, pos, txt) {
        /*
         * In a html dom element (with text separated by commas),
         * replace the subtext corresponding to the part index.
         * Also update cursor and size of element.
         *
         * params :
         *   element : the html dom element (with text separated by commas)
         *   pos : the character position
         *   txt : the text to insert in the part defined by pos
         * return :
         *   none
         */
        let oldTxt = element.value;
        let v = this._insertInPart(oldTxt, pos, txt);
        element.value = v['text'];

        // optionaly add a comma
        if (this.param_add_comma && v['isLastPart']) {
            element.value += this.PART_SUFFIX+this.SEP+this.PART_PREFIX;
            // update text cursor : put it at the end of the text
            let sel = element.value.length;
            element.setSelectionRange(sel, sel);
        } else {
            // update text cursor : put it at the end of the inserted text
            // we just use the returned position of insertion
            let sel = v['e'];
            element.setSelectionRange(sel, sel);
        }
        // force textbox height
        if (this.param_automatic_height)
            mrcRecipientResize(element);
    },

    _removeInPart : function(src, txt) {
        /*
         * in a text separated by commas, remove the subtext
         *
         * params :
         *   src : the text separated by commas
         *   txt : the text to remove
         * return :
         *   dict :
         *       'text'         : the text with the part removed
         */
        let addresses = this._splitEmailList(src);
        let newAdresses = [];
        // need to count only non-empty values
        for (let i=0, l=addresses.length ; i < l ; i++) {
            let t = addresses[i].trim();
            let pos = t.indexOf(txt);
            if (pos == -1)
                newAdresses.push(t);
        }
        let newTxt = newAdresses.join( this.PART_SUFFIX+this.SEP+this.PART_PREFIX );
        let values = {
                'text' : newTxt,
            }
        return values;
    },


    _elementRemoveInPart : function(element, txt) {
        /*
         * In a html dom element (with text separated by commas),
         * replace the subtext corresponding to the part index.
         * Also update cursor and size of element.
         *
         * params :
         *   element : the html dom element (with text separated by commas)
         *   txt : the text to remove
         * return :
         *   none
         */
        let oldTxt = element.value;
        let v = this._removeInPart(oldTxt, txt);
        element.value = v['text'];

        // update text cursor : put it at the end of the inserted text
        let sel = element.value.length;
        sel = 0;
        element.setSelectionRange(sel, sel);

        // force textbox height
        if (this.param_automatic_height) {
            mrcRecipientResize(element);
        }
    },

    _unSelectCurrent : function() {
        /*
         * unselect the current div in the panel
         *
         * params :
         *   none
         * return:
         *   none
         */
        let elt = document.getElementById(this.ID_PREFIX+this.indexSelectedCard);
        if (typeof elt !== "undefined" && elt !== null) {
            elt.className = elt.className.replace(this.SELECT_CLASSNAME, "");
        }
        this.indexSelectedCard = 0;
    },


    _select : function(newIndex) {
        /*
         * select a div in the panel
         *
         * params :
         *   newIndex : the index of the div to select
         * return :
         *   none
         */
        this.indexSelectedCard = newIndex;
        let elt = document.getElementById(this.ID_PREFIX+this.indexSelectedCard);
        if (typeof elt !== "undefined" && elt !== null) {
            elt.className += " "+this.SELECT_CLASSNAME;
        }
    },


    _makeFullAddress : function(a, b) {
        let res = "";
        let temp = typeof mrcAComplete.mhParser.makeFullAddressString;
        // mrcLog("typeof makeFullAddressString ="+temp);

        if (typeof mrcAComplete.mhParser.makeFullAddress === "function") {
            // TB 24
            res = this.mhParser.makeFullAddress(a, b);
        } else {
            // >= TB 29
            // res = this.mhParser.makeMailboxObject(a, b).toString();
            // THIS API DOES NOT PERFORM NECESSARY ENCODINGS...
            // ie : Doe, John <john.doe@free.fr> ==> "Doe, John" <john.doe@free.fr>
            // so it is completely useless...

            // so we have to do them ourselve.
            // we perform encodings on name only
            res = a;
            // first the backslash
            res = res.replace(/\\/g, "\\\\");
            // then the quotes
            res = res.replace(/"/g, '\\"');
            // finally, add quotes if comma
            if (res.indexOf(",") >= 0) {
                res = '"' + res + '"';
            }

            // then we add the email
            res = res + " <" + b + ">";
        }
        // mrcLog("_makeFullAddress="+res);
        return res;
    },


    /*
     * Searches
     *
     *
     * available criteria :
     * '=' IS
     * '!=' IS NOT
     * 'lt' LESS THAN
     * 'gt' GREATER THAN
     * 'bw' BEGINS WITH
     * 'ew' ENS WITH
     * 'c' CONTAINS
     * '!c' NOT CONTAINS
     * '~=' SOUNDS LIKE
     * 'regexp' REGEXP
     *
     *
     *
     * code from std search from the address book window
     *
     * let query = Services.prefs.getComplexValue("mail.addr_book.quicksearchquery.format", Components.interfaces.nsIPrefLocalizedString).data;
     *   --> query = "?(or(PrimaryEmail,c,@V)(DisplayName,c,@V)(FirstName,c,@V)(LastName,c,@V))"
     */



    // sort elements
    _sort_card : function(a,b) {
        // returns :
        //  -1 if a < b
        //   0 if a == b
        //   1 if a > b
        /*
            sample code to compare by date
            da = new Date(a.aDateField);
            db = new Date(b.aDateField);
            return da-db;
         */

        let f = function(obj, field) {
            let v = 0;
            if (field === 'mrcPopularity') {
                // v = parseInt(obj.getProperty("PopularityIndex", "0"));
                v = parseInt(obj[field]);
            } else {
                v = obj[field];
            }
            if (typeof(v) === 'string') {
                v = v.toLowerCase()
            }
            return v
        };

        // order :
        let def = {'mrcPopularity' : -1, 'firstName' : 1, 'lastName' : 1}
        let o1 = def[mrcAComplete.param_sort_field_level_1];
        let o2 = def[mrcAComplete.param_sort_field_level_2];
        let o3 = def[mrcAComplete.param_sort_field_level_3];

        // sort by names (lastName then firstName
        let a1 = f(a, mrcAComplete.param_sort_field_level_1);
        let b1 = f(b, mrcAComplete.param_sort_field_level_1);
        let a2 = f(a, mrcAComplete.param_sort_field_level_2);
        let b2 = f(b, mrcAComplete.param_sort_field_level_2);
        let a3 = f(a, mrcAComplete.param_sort_field_level_3);
        let b3 = f(b, mrcAComplete.param_sort_field_level_3);
        if (a1 < b1) return -1*o1;
        if (a1 > b1) return 1*o1;
        // here a1 == b1 --> compare next field
        if (a2 < b2) return -1*o2;
        if (a2 > b2) return 1*o2;
        // here a2 == b2 --> compare next field
        if (a3 < b3) return -1*o3;
        if (a3 > b3) return 1*o3;
        // complete equality...
        return 0;
    },

    _removeDuplicatecards : function(arr) {
        /*
         * remove duplicate cards from a list
         * (based on field 'primaryEmail')
         *
         * params :
         *   arr : the arr of cards
         * return:
         *   array of cards
         */
        // bizarre way of doing :
        // store cards as properties of an object, the name of property being the unique field !!
        let obj = {};
        for (let i=0, l=arr.length ; i<l; i++) {
            try {
                // we store only the first occurence of duplicates
                // if (!obj[arr[i].primaryEmail])
                //    obj[arr[i].primaryEmail] = arr[i];
                let prop = _get(arr[i], "primaryEmail", "");
                let prop2 = _get(obj, prop, "");
                if (prop2 == "") {
                    obj[prop] = arr[i];
                }

            } catch (e) {
                mrcLogError(e, "_removeDuplicatecards()");
            }
        }
        // obj nows contains unique properties
        // build a std array cards
        let out = [];
        for (let i in obj) {
            out.push(obj[i]);
        }
        return out;
    },

    _createMyCard : function(abcard) {
        /*
         * xxx
         *
         * params :
         *   abcard : xxx
         * return
         *   object
         */
        let temp = {
            'primaryEmail' : abcard.primaryEmail,
            'secondEmail' : abcard.getProperty("SecondEmail", ""),
            'displayName' : abcard.displayName,
            'firstName' : abcard.firstName,
            'lastName' : abcard.lastName,
            'nickName' : abcard.nickName,
            'mrcPopularity' : abcard.getProperty("PopularityIndex", "0"),
            'isMailList' : abcard.isMailList,
            'mailListURI' : abcard.mailListURI,
            };
        // create a hash of all properties
        let props = "";
        for(let prop in temp) {
            props += temp[prop];
        }
        temp.hash = this._hashCode(props);
        return temp;
    },

    _createResCard : function(mycard, primary, text) {
        /*
         * xxx
         *
         * params :
         *   mycard : xxx
         *   primary :
         *   text :
         * return
         *   object
         */
        let temp = {
            'text' : text,
            'email' : primary ? mycard.primaryEmail : mycard.secondEmail,
            'isMailList' : mycard.isMailList,
            'mailListURI' : mycard.mailListURI,
        };
        return temp;
    },


    _initSearchID : function() {
        /*
         * Reinit internal fields for a future search
         */
        this.searchID++;
        // mrcLog(now()+" _initSearchID : "+this.searchID);
        this.search_res1 = [];
        this.search_res2 = [];
        this.search_res3 = [];
    },

    _obsoleteSearchID : function() {
        /*
         * Mark current search as obsolete
         */
        this.searchID++;
    },

    _archiveSearchListeners : function() {
        /*
         * Move search listeners from 'searchedAB' to archive.
         */
        let keys = Object.keys(this.searchedAB);
        for (let i=0, l=keys.length ; i<l; i++) {
            let k = keys[i];
            // Stop LDAP query
            this.searchedAB[k]._query.stopQuery(0);

            this.searchedAB_archiv.push(this.searchedAB[k]);
            delete this.searchedAB[k];
        }
        // this.searchedAB = {}; // implicitely done
    },

    _purgeArchiv : function() {
        /*
         * Simply empty list of archived search listeners,
         * the GC will make the real job later.
         */
        // SPECIAL :
        // As it is a call-back, we can't use 'this'
        // instead, we must use the let 'mrcAComplete'
        // mrcLog("AVANT purge:"+mrcAComplete.searchedAB_archiv.join("||"));
        let l = mrcAComplete.searchedAB_archiv.length;
        mrcAComplete.searchedAB_archiv.splice(0, l);
        // mrcLog("APRES purge:"+mrcAComplete.searchedAB_archiv.join("||"));
    },

    _createHashSearchListener : function(searchListener) {
        /*
         *
         *
         */
        let temp = searchListener.addressBook.dirName + searchListener.searchID;
        // let hash = this._hashCode(temp); // no need to create a real hash
        let hash = temp;
        // mrcLog("_createHashSearchListener : "+hash);
        return hash;
    },

    _initSearchListeners : function() {
        this.allListenersStarted = false;
        this._archiveSearchListeners();
        this._initSearchID();
        // mrcLog(now()+" _initSearchListeners : "+this.searchID);
    },


    _addSearchListener : function(abSearchListener) {
        abSearchListener.hash = this._createHashSearchListener(abSearchListener);
        let key = abSearchListener.hash;
        this.searchedAB[key] = abSearchListener;
        // mrcLog("_addSearchListener : "+abSearchListener.addressBook.URI+":"+abSearchListener.hash+", "+this.allListenersStarted);
    },

    _completeSearchListener : function(abSearchListener) {
        /*
         * Perform actions when a search is finished on ONE addressbook.
         */
        // mrcLog(now()+" _completeSearchListener : "+abSearchListener.searchID+"/"+this.searchID+":"+abSearchListener.addressBook.dirName);
        if (abSearchListener.searchID == this.searchID) {
            // OK, it's a searchListener for current search
            switch(this.param_mode) {
                case 1:
                    // Add results for current searchListenet in global results
                    // this.search_res1.mrc_extend(abSearchListener.localRes);
                    array_extend(this.search_res1, abSearchListener.localRes);
                    break;

                case 2:
                    // Add results for current searchListenet in global results
                    // this.search_res1.mrc_extend(abSearchListener.localRes1);
                    // this.search_res2.mrc_extend(abSearchListener.localRes2);
                    // this.search_res3.mrc_extend(abSearchListener.localRes3);
                    array_extend(this.search_res1, abSearchListener.localRes1);
                    array_extend(this.search_res2, abSearchListener.localRes2);
                    array_extend(this.search_res3, abSearchListener.localRes3);
                    break;

                case 3:
                    // sum localRes in global res
                    abSearchListener.localRes = this._removeDuplicatecards(abSearchListener.localRes);
                    abSearchListener.localRes.sort(this._sort_card);

                    this.datas[abSearchListener.addressBook.dirName] = abSearchListener.localRes;
                    this.nbDatas += abSearchListener.localRes.length;
                    break;

                case 4:
                    // Add results for current searchListenet in global results
                    // this.search_res1.mrc_extend(abSearchListener.localRes);
                    array_extend(this.search_res1, abSearchListener.localRes);
                    break;
            }
            // remove listener from searched list
            let key = abSearchListener.hash;
            if (key in this.searchedAB) {
                // Stop if LDAP query
                if (this.searchedAB[key].hasOwnProperty("_query")) {
                    this.searchedAB[key]._query.stopQuery(0);
                }
                delete this.searchedAB[key];
            }


            // mrcLog("_completeSearchListener : "+abSearchListener.addressBook.URI+":"+this.searchedAB+", "+this.allListenersStarted);
            // Then test if search is complete for all addressbooks.
            this._testSearchComplete();
        } else {
            // it's an obsolete searchListener :
            // mrcLog("_completeSearchListener : "+abSearchListener.addressBook.URI+":obsolete = "+abSearchListener.searchID);
        }
    },

    _timeOutSearchListener : function(originalSearchID) {
        /*
         * Perform actions when search timeout has been trigerred
         *
         * params :
         *   originalSearchID : the searchID at the time the timeout was created
         *
         */
        if (originalSearchID == this.searchID) {
            // make any search obsolete
            this._obsoleteSearchID();
            // mrcLog(now()+" _timeOutSearchListener : "+this.searchID);

            let keys = Object.keys(this.searchedAB);
            // mrcLog("_timeOutSearchListener() keys="+keys+":"+(typeof keys));
            for (let i=0, l=keys.length ; i<l; i++) {
                let k = keys[i];
                // mrcLog("k="+k);
                this._addWarningTimeout(this.searchedAB[k].addressBook.dirName);
            }

            // force search complete
            this._archiveSearchListeners();
            this._testSearchComplete();
        } else {
            // This timeout is obsolete : noting to do.
        }
    },

    _testSearchComplete : function() {
        // mrcLog(now()+" _testSearchComplete : "+this.searchID);
        let keys = Object.keys(this.searchedAB);
        if (keys.length == 0 && this.allListenersStarted == true) {
            /*
             * Perform actions when ALL searches are completed.
             */

            // make any search obsolete
            this._obsoleteSearchID();

            // stop the current timeout
            clearTimeout(this.searchTimeOut);
            // mrcLog("clearTimeout() ");

            // then handle results
            switch(this.param_mode) {
                case 1:
                    //
                    this.search_res1 = this._removeDuplicatecards(this.search_res1);
                    this.search_res1.sort(this._sort_card);

                    this.datas = {'contains' : this.search_res1};
                    this.nbDatas = this.search_res1.length;
                    break;

                case 2:
                    //
                    this.search_res1 = this._removeDuplicatecards(this.search_res1);
                    this.search_res2 = this._removeDuplicatecards(this.search_res2);
                    this.search_res3 = this._removeDuplicatecards(this.search_res3);

                    // special : we exclude  items of list2 that are in list1,
                    // we use the hash code of each card.
                    // We create a list of hashes of res1.
                    let res1 = this.search_res1.map(function(e) {return e.hash});
                    let res2 = []
                    for(let i=0, l=this.search_res2.length ; i < l; i++) {
                        if (res1.indexOf(this.search_res2[i].hash) == -1) {
                            res2.push(this.search_res2[i]);
                        }
                    }
                    this.search_res2 = res2;

                    this.search_res1.sort(this._sort_card);
                    this.search_res2.sort(this._sort_card);
                    this.search_res3.sort(this._sort_card);

                    this.datas = {'begin' : this.search_res1, 'contains' : this.search_res2, 'list' : this.search_res3};
                    this.nbDatas = this.search_res1.length+this.search_res2.length+this.search_res3.length;
                    break;

                case 3:
                    // Nothing, already done.
                    break;

                case 4:
                    //
                    this.search_res1 = this._removeDuplicatecards(this.search_res1);
                    this.search_res1.sort(this._sort_card);

                    this.datas = {'begin' : this.search_res1};
                    this.nbDatas = this.search_res1.length;
                    break;

            }

            if (this.nbDatas == 0 && this.param_show_no_result) {
                this._addInfoNoResult();
            }

            if (this.cbSearch) {
                this.cbSearch();
            }
            // mrcLog("archiv="+this.searchedAB_archiv.length);
        }
    },

    _startWaitingSearchListeners : function() {
        this.allListenersStarted = true;
        // clear previous timeout
        if (this.searchTimeOut) {
            clearTimeout(this.searchTimeOut);
        }
        // and start new search timeout :
        // we keep the current searchID in a closure, for the callback to compare.
        let tempSearchID = this.searchID;
        this.searchTimeOut = setTimeout(function () {
                mrcAComplete._timeOutSearchListener(tempSearchID);
            }, this.param_search_timeout);

        // mrcLog("_startWaitingSearchListeners ");
        this._testSearchComplete();
    },

    _addInfoNoResult : function() {
        /*
         * Add an info message saying that no results have been found.
         *
         * params :
         *   None
         * return
         *   none
         */
        let message = this.getString("no_result");
        this.infos.push(message);
    },

    _addErrorAddressBook : function(ab_name) {
        /*
         * Add an error message for an addressBook name
         *
         * params :
         *   ab_name : the name of address book
         * return
         *   none
         */
        let message = this.getString("ab_error");
        message = message.replace(/%s/g, ab_name);
        this.errors.push(message);
    },

    _addWarningTimeout : function(ab_name) {
        /*
         * Add a timeout warning message for an addressBook name
         *
         * params :
         *   ab_name : the name of address book
         * return
         *   none
         */
        let message = this.getString("ab_timeout");
        message = message.replace(/%s/g, ab_name);
        this.warnings.push(message);
    },

    /*
     *
    Infos for LDAP searches :
        https://wiki.mozilla.org/MailNews:LDAP_Address_Books

        https://wiki.mozilla.org/Mozilla_LDAP_SDK_Programmer%27s_Guide/Using_Filter_Configuration_Files_With_LDAP_C_SDK

        NS_SCRIPTABLE NS_IMETHOD CreateFilter(PRUint32 aMaxSize, const nsACString & aPattern,
                                            const nsACString & aPrefix, const nsACString & aSuffix,
                                            const nsACString & aAttr, const nsACString & aValue,
                                            nsACString & _retval NS_OUTPARAM) = 0;

     */

    _search_mode_1 : function(aString) {
        /*
         * search for mode 1, put results in internal fields
         *
         * the list contains 1 part :
         *   'contains' : contacts & lists whose fields contains X
         *
         * params :
         *   aString : the text to search in fields of address book
         *   cbSearch : the callback when search is done
         * return:
         *   none
         */
        // use DisplayName and NickName
        let baseQuery = "(or(PrimaryEmail,@C,@V)(SecondEmail,@C,@V)(FirstName,@C,@V)(LastName,@C,@V)(DisplayName,@C,@V)(NickName,@C,@V))";

        // one search : CONTAINS
        let searchQuery1 = baseQuery.replace(/@C/g, 'c');
        searchQuery1 = searchQuery1.replace(/@V/g, encodeURIComponent(aString));
        // ldap query template
        let filterTemplate = "(|(mail=*%v*)(givenName=*%v*)(sn=*%v*)(displayName=*%v*)(cn=*%v*))";

        let allAddressBooks = this.abManager.directories;

        // init listeners
        this._initSearchListeners();

        while (allAddressBooks.hasMoreElements()) {
            let ab = allAddressBooks.getNext();
            if (ab instanceof Components.interfaces.nsIAbDirectory &&  !ab.isRemote) {
                // recherche 1
                // mrcLog("AB LOCAL = " + ab.dirName);
                let doSearch = this.param_search_ab_URI.indexOf(ab.URI) >= 0;
                if (doSearch) {
                    try {
                        // add a sync search listener
                        let that = this;
                        let abSearchListener = {
                            searchID : this.searchID,
                            addressBook : ab,
                            isRemote : false,
                            cbObject : that,
                            localRes : [],
                        }
                        this._addSearchListener(abSearchListener);

                        let childCards1 = this.abManager.getDirectory(ab.URI + "?" + searchQuery1).childCards;
                        while (childCards1.hasMoreElements()) {
                            let card = childCards1.getNext();
                            if (card instanceof Components.interfaces.nsIAbCard) {
                                // a list has no email, but we want to keep it
                                if (card.isMailList) {
                                    abSearchListener.localRes.push(this._createMyCard(card));
                                } else if (card.primaryEmail != "")
                                    // filter real cards without email
                                    abSearchListener.localRes.push(this._createMyCard(card));
                            }
                        }

                        // finish the listener
                        this._completeSearchListener(abSearchListener);
                    } catch (e) {
                        this._addErrorAddressBook(ab.dirName);
                        mrcLogError(e, "_search_mode_1()");
                    }
                }
            } else {
                if (ab instanceof Components.interfaces.nsIAbLDAPDirectory) {
                    // mrcLog("param_search="+this.param_search_ab_URI+" ; ab.URI="+ab.URI)
                    // check if user wants to search in this AB
                    let doSearch = this.param_search_ab_URI.indexOf(ab.URI) >= 0;
                    if (doSearch) {
                        try {
                            // mrcLog("AB LDAP = " + ab.dirName);
                            /* CODE FOR TB 24 to 31? */
                            // if (this.param_ldap_search_version == 'TB24') {
                            if (true) {
                                // mrcLog(ab.dirName+" : LDAP search TB24");
                                let query =
                                    Components.classes["@mozilla.org/addressbook/ldap-directory-query;1"]
                                            .createInstance(Components.interfaces.nsIAbDirectoryQuery);

                                let attributes =
                                    Components.classes["@mozilla.org/addressbook/ldap-attribute-map;1"]
                                            .createInstance(Components.interfaces.nsIAbLDAPAttributeMap);
                                attributes.setAttributeList("DisplayName",
                                    ab.attributeMap.getAttributeList("DisplayName", {}), true);
                                attributes.setAttributeList("PrimaryEmail",
                                    ab.attributeMap.getAttributeList("PrimaryEmail", {}), true);

                                let args =
                                    Components.classes["@mozilla.org/addressbook/directory/query-arguments;1"]
                                            .createInstance(Components.interfaces.nsIAbDirectoryQueryArguments);

                                // Create filter from filter template and search string
                                let ldapSvc = Components.classes["@mozilla.org/network/ldap-service;1"]
                                                        .getService(Components.interfaces.nsILDAPService);
                                let filterPrefix = "";
                                let filterSuffix = "";
                                let filterAttr = "";
                                let filter = ldapSvc.createFilter(1024, filterTemplate, filterPrefix, filterSuffix, filterAttr, aString);
                                if (!filter) {
                                    throw new Error("Filter string is empty, check if filterTemplate variable is valid in prefs.js.");
                                }

                                args.typeSpecificArg = attributes;
                                args.querySubDirectories = true;
                                args.filter = filter;

                                // add an async search listener
                                let that = this;
                                let abDirSearchListener = {
                                    searchID : this.searchID,
                                    addressBook : ab,
                                    isRemote : true,
                                    cbObject : that,
                                    localRes : [],

                                    // special LDAP : keep refs of local var to prevent any GC (--> crashes)
                                    _query : query,
                                    _attrs : attributes,
                                    _args : args,

                                    onSearchFinished : function(aResult, aErrorMesg) {
                                        if (aResult == Components.interfaces.nsIAbDirectoryQueryResultListener.queryResultComplete) {
                                            this.cbObject._completeSearchListener(this);
                                        }
                                    },

                                    onSearchFoundCard : function(aCard) {
                                        this.localRes.push(this.cbObject._createMyCard(aCard));
                                    }
                                };

                                this._addSearchListener(abDirSearchListener);
                                query.doQuery(ab, args, abDirSearchListener, ab.maxHits, 0);
                            } else {
                                // mrcLog(ab.dirName+" : LDAP search TB31");
                                /* CODE FOR TB >= 29 */
                                /*
                                let that = this;

                                function acObserver() {}

                                acObserver.prototype = {
                                    _search: null,
                                    _result: null,
                                    searchID : this.searchID,
                                    addressBook : ab,
                                    isRemote : true,
                                    cbObject : that,
                                    localRes : null,

                                    onSearchResult: function (aSearch, aResult) {
                                        this._search = aSearch;
                                        this._result = aResult;
                                        for (var i = 0; i < aResult.matchCount; i++) {
                                            aResult.QueryInterface(Components.interfaces.nsIAbAutoCompleteResult);
                                            var aCard = aResult.getCardAt(i);
                                            this.cbObject.search_res1.push(this.cbObject._createMyCard(aCard));
                                        }
                                        this.cbObject._completeSearchListener(this);
                                    },

                                    onUpdateSearchResult: function(search, result) {}
                                };

                                var acs = Components.classes["@mozilla.org/autocomplete/search;1?name=ldap"]
                                    .getService(Components.interfaces.nsIAutoCompleteSearch);

                                var params = JSON.stringify({ idKey: gCurrentIdentity.key });

                                var obs = new acObserver();
                                acs.startSearch(aString, params, null, obs);

                                this._addSearchListener(obs);
                                */
                            }
                        } catch (e) {
                            this._addErrorAddressBook(ab.dirName);
                            mrcLogError(e, "_search_mode_1()");
                        }
                    }
                }
            }
        }

        this._startWaitingSearchListeners();
    },

    _search_mode_2 : function(aString, cbSearch) {
        /*
         * search for mode 2, put results in internal fields
         *
         * the list contains 3 parts :
         *    'begin' :    contacts whose fields begin with X
         *    'contains' : contacts whose fields contains X (except those in part 1)
         *    'list' :     groups whose fields begin or contains X
         *
         * params :
         *   aString : the text to search in fields of address book
         * return:
         *   none
         */
        // use DisplayName or NickName ?
        let baseQuery = "(or(PrimaryEmail,@C,@V)(SecondEmail,@C,@V)(FirstName,@C,@V)(LastName,@C,@V)(DisplayName,@C,@V)(NickName,@C,@V))";

        // first search : BEGIN WITH
        let searchQuery1 = baseQuery.replace(/@C/g, 'bw');
        searchQuery1 = searchQuery1.replace(/@V/g, encodeURIComponent(aString));
        // ldap query template
        let filterTemplate1 = "(|(mail=%v*)(givenName=%v*)(sn=%v*)(displayName=%v*)(cn=%v*))";

        // second search : CONTAINS
        // We will make the exclusion manually, after all searches completed.
        let searchQuery2 = baseQuery.replace(/@C/g, 'c');
        searchQuery2 = searchQuery2.replace(/@V/g, encodeURIComponent(aString));
        // ldap query template
        let filterTemplate2 = "(|(mail=*%v*)(givenName=*%v*)(sn=*%v*)(displayName=*%v*)(cn=*%v*))";

        // third search : GROUP CONTAINS
        // unused because first query uses field 'LastName'
        /*
        let searchQuery3 = "(and(IsMailList,=,TRUE)(LastName,c,@V))";
        searchQuery3 = searchQuery3.replace(/@V/g, encodeURIComponent(aString));
        // ldap query template
        // TODO : add field to search group
        let filterTemplate3 = "(|(mail=*%v*)(givenName=*%v*)(sn=*%v*)(displayName=*%v*)(cn=*%v*))";
        */

        // init listeners
        this._initSearchListeners();

        let allAddressBooks = this.abManager.directories;
        while (allAddressBooks.hasMoreElements()) {
            let ab = allAddressBooks.getNext();
            if (ab instanceof Components.interfaces.nsIAbDirectory &&  !ab.isRemote) {

                let doSearch = this.param_search_ab_URI.indexOf(ab.URI) >= 0;
                if (doSearch) {
                    try {
                        // add a sync search listener
                        let that = this;
                        let abSearchListener = {
                            searchID : this.searchID,
                            addressBook : ab,
                            isRemote : false,
                            cbObject : that,
                            localRes1 : [],
                            localRes2 : [],
                            localRes3 : [],
                        }
                        this._addSearchListener(abSearchListener);

                        // search 1
                        let childCards1 = this.abManager.getDirectory(ab.URI + "?" + searchQuery1).childCards;
                        while (childCards1.hasMoreElements()) {
                            card = childCards1.getNext();
                            if (card instanceof Components.interfaces.nsIAbCard) {
                                if (card.isMailList) { // necessary
                                    abSearchListener.localRes3.push(this._createMyCard(card));
                                } else if (card.primaryEmail != "")
                                    abSearchListener.localRes1.push(this._createMyCard(card));
                            }
                        }

                        // search 2
                        let childCards2 = this.abManager.getDirectory(ab.URI + "?" + searchQuery2).childCards;
                        msg = "";
                        while (childCards2.hasMoreElements()) {
                            card = childCards2.getNext();
                            if (card instanceof Components.interfaces.nsIAbCard) {
                                if (card.isMailList) { // necessary
                                    abSearchListener.localRes3.push(this._createMyCard(card));
                                } else if (card.primaryEmail != "")
                                    abSearchListener.localRes2.push(this._createMyCard(card));
                            }
                        }
                        // search 3
                        // unused
                        /*
                        let childCards3 = mrcAbManager.getDirectory(ab.URI + "?" + searchQuery3).childCards;
                        // mrcLog(ab.dirName+" : "+searchResult.toString());
                        msg = "";
                        while (childCards3.hasMoreElements()) {
                            card = childCards3.getNext();
                            if (card instanceof Components.interfaces.nsIAbCard) {
                                res3.push(this._createMyCard(card));
                            }
                        }
                        */
                        // finish the listener
                        this._completeSearchListener(abSearchListener);
                    } catch (e) {
                        this._addErrorAddressBook(ab.dirName);
                        mrcLogError(e, "_search_mode_1()");
                    }
                }
            } else {
                // Parts of the code in this block are copied from
                //http://hg.mozilla.org/comm-central/file/tip/mailnews/addrbook/src/nsAbLDAPAutoCompleteSearch.js
                if (ab instanceof Components.interfaces.nsIAbLDAPDirectory) {
                    // check if user wants to search in this AB
                    let doSearch = this.param_search_ab_URI.indexOf(ab.URI) >= 0;
                    if (doSearch) {
                        try {
                            /*
                             * CODE UNNECESSARY BECAUSE MRC COMPOSE DISABLES THOSE OPTIONS
                            let acDirURI = null;
                            if (gCurrentIdentity.overrideGlobalPref) {
                                acDirURI = gCurrentIdentity.directoryServer;
                            }
                            else {
                                if (Services.prefs.getBoolPref("ldap_2.autoComplete.useDirectory")) {
                                    acDirURI = Services.prefs.getCharPref("ldap_2.autoComplete.directoryServer");
                                }
                            }
                            if (!acDirURI) {
                                continue;
                            }
                            */

                            // MODE 2 HAS ONLY CODE FOR TB24 : is it ok with TB29+ ?
                            // if (this.param_ldap_search_version == 'TB24') {

                            /* CODE FOR TB 24-31 */
                            let that = this;

                            let ldapSvc = Components.classes["@mozilla.org/network/ldap-service;1"]
                                .getService(Components.interfaces.nsILDAPService);
                            let filterPrefix = "";
                            let filterSuffix = "";
                            let filterAttr = "";

                            // search 1 : BEGINS WITH
                            // Create filter from filter template and search string
                            let filter1 = ldapSvc.createFilter(1024, filterTemplate1, filterPrefix, filterSuffix, filterAttr, aString);
                            if (!filter1) {
                                throw new Error("Filter string is empty, check if filterTemplate variable is valid in prefs.js.");
                            }

                            let query1 =
                                Components.classes["@mozilla.org/addressbook/ldap-directory-query;1"]
                                    .createInstance(Components.interfaces.nsIAbDirectoryQuery);

                            let attributes1 =
                                Components.classes["@mozilla.org/addressbook/ldap-attribute-map;1"]
                                    .createInstance(Components.interfaces.nsIAbLDAPAttributeMap);
                            attributes1.setAttributeList("DisplayName",
                                ab.attributeMap.getAttributeList("DisplayName", {}), true);
                            attributes1.setAttributeList("PrimaryEmail",
                                ab.attributeMap.getAttributeList("PrimaryEmail", {}), true);

                            let args1 =
                                Components.classes["@mozilla.org/addressbook/directory/query-arguments;1"]
                                    .createInstance(Components.interfaces.nsIAbDirectoryQueryArguments);

                            args1.typeSpecificArg = attributes1;
                            args1.querySubDirectories = true;
                            args1.filter = filter1;

                            // add an async search listener
                            let abDirSearchListener1 = {
                                searchID : this.searchID,
                                addressBook : ab,
                                isRemote : true,
                                cbObject : that,
                                localRes1 : [],
                                localRes2 : [],
                                localRes3 : [],

                                // special LDAP : keep refs of local var to prevent any GC (--> crashes)
                                _query : query1,
                                _attrs : attributes1,
                                _args : args1,

                                onSearchFinished : function(aResult, aErrorMesg) {
                                    if (aResult == Components.interfaces.nsIAbDirectoryQueryResultListener.queryResultComplete) {
                                        this.cbObject._completeSearchListener(this);
                                    }
                                },

                                onSearchFoundCard : function(aCard) {
                                    // TODO : check if "card.isMailList" is OK
                                    if (card.isMailList) {
                                        this.localRes3.push(this.cbObject._createMyCard(aCard));
                                    } else {
                                        this.localRes1.push(this.cbObject._createMyCard(aCard));
                                    }
                                }
                            };

                            this._addSearchListener(abDirSearchListener1);
                            query1.doQuery(ab, args1, abDirSearchListener1, ab.maxHits, 0);

                            // search 2 : CONTAINS
                            // Create filter from filter template and search string
                            let filter2 = ldapSvc.createFilter(1024, filterTemplate2, filterPrefix, filterSuffix, filterAttr, aString);
                            if (!filter2) {
                                throw new Error("Filter string is empty, check if filterTemplate variable is valid in prefs.js.");
                            }

                            let query2 =
                                Components.classes["@mozilla.org/addressbook/ldap-directory-query;1"]
                                    .createInstance(Components.interfaces.nsIAbDirectoryQuery);

                            let attributes2 =
                                Components.classes["@mozilla.org/addressbook/ldap-attribute-map;1"]
                                    .createInstance(Components.interfaces.nsIAbLDAPAttributeMap);
                            attributes2.setAttributeList("DisplayName",
                                ab.attributeMap.getAttributeList("DisplayName", {}), true);
                            attributes2.setAttributeList("PrimaryEmail",
                                ab.attributeMap.getAttributeList("PrimaryEmail", {}), true);

                            let args2 =
                                Components.classes["@mozilla.org/addressbook/directory/query-arguments;1"]
                                    .createInstance(Components.interfaces.nsIAbDirectoryQueryArguments);

                            args2.typeSpecificArg = attributes2;
                            args2.querySubDirectories = true;
                            args2.filter = filter2;

                            // add an async search listener
                            let abDirSearchListener2 = {
                                searchID : this.searchID,
                                addressBook : ab,
                                isRemote : true,
                                cbObject : that,
                                localRes1 : [],
                                localRes2 : [],
                                localRes3 : [],

                                // special LDAP : keep refs of local var to prevent any GC (--> crashes)
                                _query : query2,
                                _attrs : attributes2,
                                _args : args2,

                                onSearchFinished : function(aResult, aErrorMesg) {
                                    if (aResult == Components.interfaces.nsIAbDirectoryQueryResultListener.queryResultComplete) {
                                        this.cbObject._completeSearchListener(this);
                                    }
                                },

                                onSearchFoundCard : function(aCard) {
                                    // TODO : check if "card.isMailList" is OK
                                    if (card.isMailList) {
                                        this.localRes3.push(this.cbObject._createMyCard(aCard));
                                    } else {
                                        this.localRes2.push(this.cbObject._createMyCard(aCard));
                                    }
                                }
                            };

                            this._addSearchListener(abDirSearchListener2);
                            query2.doQuery(ab, args2, abDirSearchListener2, ab.maxHits, 0);


                            // search 3 : GROUP
                            // unused
                            /*
                            var filter3 = ldapSvc.createFilter(1024, filterTemplate3, filterPrefix, filterSuffix, filterAttr, aString);
                            if (!filter3)
                                throw new Error("Filter string is empty, check if filterTemplate variable is valid in prefs.js.");

                            args.typeSpecificArg = attributes;
                            args.querySubDirectories = true;
                            args.filter = filter3;

                            // add an async search listener
                            let that = this;
                            var abDirSearchListener3 = {
                                addressBook : ab,
                                isRemote : true,
                                cbObject : that,
                                localRes : null,

                                // special LDAP : keep refs of local var to prevent any GC (--> crashes)
                                _query : queryXX,
                                _attrs : attributesXX,
                                _args : argsXX,

                                onSearchFinished : function(aResult, aErrorMesg) {
                                    if (aResult == Components.interfaces.nsIAbDirectoryQueryResultListener.queryResultComplete) {
                                        this.cbObject._completeSearchListener(this);
                                    }
                                },

                                onSearchFoundCard : function(aCard) {
                                    this.localRes3.push(this.cbObject._createMyCard(aCard));
                                }
                            };

                            this._addSearchListener(abDirSearchListener3);
                            query.doQuery(ab, args, abDirSearchListener3, ab.maxHits, 0);
                            */
                        } catch (e) {
                            this._addErrorAddressBook(ab.dirName);
                            mrcLogError(e, "_search_mode_2()");
                        }
                    }
                }
            }
        }

        this._startWaitingSearchListeners();
    },

    _search_mode_3 : function(aString) {
        /*
         * search for mode 3, put results in internal fields
         *
         * the list contains 1 part for each AddressBook :
         *    contacts & lists whose fields contains X
         *
         * params :
         *   aString : the text to search in fields of address book
         * return:
         *   none
         */
        // use DisplayName and NickName
        let baseQuery = "(or(PrimaryEmail,@C,@V)(SecondEmail,@C,@V)(FirstName,@C,@V)(LastName,@C,@V)(DisplayName,@C,@V)(NickName,@C,@V))";

        // one search : CONTAINS
        let searchQuery1 = baseQuery.replace(/@C/g, 'c');
        searchQuery1 = searchQuery1.replace(/@V/g, encodeURIComponent(aString));
        // ldap query template
        let filterTemplate = "(|(mail=*%v*)(givenName=*%v*)(sn=*%v*)(displayName=*%v*)(cn=*%v*))";

        // init listeners
        this._initSearchListeners();

        let allAddressBooks = this.abManager.directories;
        while (allAddressBooks.hasMoreElements()) {
            let ab = allAddressBooks.getNext();
            if (ab instanceof Components.interfaces.nsIAbDirectory &&  !ab.isRemote) {
                // recherche 1
                let doSearch = this.param_search_ab_URI.indexOf(ab.URI) >= 0;
                if (doSearch) {
                    try {
                        // add a sync search listener
                        let that = this;
                        let abSearchListener = {
                            searchID : this.searchID,
                            addressBook : ab,
                            isRemote : false,
                            cbObject : that,
                            localRes : [],
                        }
                        this._addSearchListener(abSearchListener);

                        let childCards1 = this.abManager.getDirectory(ab.URI + "?" + searchQuery1).childCards;
                        while (childCards1.hasMoreElements()) {
                            card = childCards1.getNext();
                            if (card instanceof Components.interfaces.nsIAbCard) {
                                // a list has no email, but we want to keep it
                                if (card.isMailList) {
                                    abSearchListener.localRes.push(this._createMyCard(card));
                                } else if (card.primaryEmail != "")
                                    // filter real cards without email
                                    abSearchListener.localRes.push(this._createMyCard(card));
                            }
                        }
                        // finish the listener
                        this._completeSearchListener(abSearchListener);
                    } catch (e) {
                        this._addErrorAddressBook(ab.dirName);
                        mrcLogError(e, "_search_mode_1()");
                    }
                }
            } else {
                if (ab instanceof Components.interfaces.nsIAbLDAPDirectory) {
                    // check if user wants to search in this AB
                    let doSearch = this.param_search_ab_URI.indexOf(ab.URI) >= 0;
                    if (doSearch) {
                        try {
                            // if (this.param_ldap_search_version == 'TB24') {
                            if (true) {
                                // mrcLog(ab.dirName+" : LDAP search TB24");
                                /* CODE FOR TB 24-31? */

                                let query =
                                    Components.classes["@mozilla.org/addressbook/ldap-directory-query;1"]
                                        .createInstance(Components.interfaces.nsIAbDirectoryQuery);

                                let attributes =
                                    Components.classes["@mozilla.org/addressbook/ldap-attribute-map;1"]
                                        .createInstance(Components.interfaces.nsIAbLDAPAttributeMap);
                                attributes.setAttributeList("DisplayName",
                                    ab.attributeMap.getAttributeList("DisplayName", {}), true);
                                attributes.setAttributeList("PrimaryEmail",
                                    ab.attributeMap.getAttributeList("PrimaryEmail", {}), true);

                                let args =
                                    Components.classes["@mozilla.org/addressbook/directory/query-arguments;1"]
                                        .createInstance(Components.interfaces.nsIAbDirectoryQueryArguments);

                                // Create filter from filter template and search string
                                let ldapSvc = Components.classes["@mozilla.org/network/ldap-service;1"]
                                                        .getService(Components.interfaces.nsILDAPService);
                                let filterPrefix = "";
                                let filterSuffix = "";
                                let filterAttr = "";
                                let filter = ldapSvc.createFilter(1024, filterTemplate, filterPrefix, filterSuffix, filterAttr, aString);
                                if (!filter) {
                                    throw new Error("Filter string is empty, check if filterTemplate variable is valid in prefs.js.");
                                }

                                args.typeSpecificArg = attributes;
                                args.querySubDirectories = true;
                                args.filter = filter;

                                // add an async search listener
                                let that = this;
                                let abDirSearchListener = {
                                    searchID : this.searchID,
                                    addressBook : ab,
                                    isRemote : true,
                                    cbObject : that,
                                    localRes : [],

                                    // special LDAP : keep refs of local var to prevent any GC (--> crashes)
                                    _query : query,
                                    _attrs : attributes,
                                    _args : args,

                                    onSearchFinished : function(aResult, aErrorMesg) {
                                        if (aResult == Components.interfaces.nsIAbDirectoryQueryResultListener.queryResultComplete) {
                                            this.cbObject._completeSearchListener(this);
                                        }
                                    },

                                    onSearchFoundCard : function(aCard) {
                                        this.localRes.push(this.cbObject._createMyCard(aCard));
                                    }
                                };

                                this._addSearchListener(abDirSearchListener);
                                query.doQuery(ab, args, abDirSearchListener, ab.maxHits, 0);

                            } else {
                                // mrcLog(ab.dirName+" : LDAP search TB31");
                                /* CODE FOR TB >= 29 */
                                /*
                                let that = this;

                                function acObserver() {}

                                acObserver.prototype = {
                                    _search: null,
                                    _result: null,
                                    searchID : this.searchID,
                                    addressBook : ab,
                                    isRemote : true,
                                    cbObject : that,
                                    localRes : [],

                                    onSearchResult: function (aSearch, aResult) {
                                        this._search = aSearch;
                                        this._result = aResult;
                                        for (var i = 0; i < aResult.matchCount; i++) {
                                            aResult.QueryInterface(Components.interfaces.nsIAbAutoCompleteResult);
                                            var aCard = aResult.getCardAt(i);
                                            this.localRes.push(this.cbObject._createMyCard(aCard));
                                        }
                                        this.cbObject._completeSearchListener(this);
                                    },

                                    onUpdateSearchResult: function(search, result) {}
                                };

                                var acs = Components.classes["@mozilla.org/autocomplete/search;1?name=ldap"]
                                    .getService(Components.interfaces.nsIAutoCompleteSearch);

                                var params = JSON.stringify({ idKey: gCurrentIdentity.key });

                                var obs = new acObserver();
                                acs.startSearch(aString, params, null, obs);

                                this._addSearchListener(obs);
                                */
                            }
                        } catch (e) {
                            this._addErrorAddressBook(ab.dirName);
                            mrcLogError(e, "_search_mode_3()");
                            // mrcLog(ab.dirName+" : LDAP _search_mode_3 ERROR");
                        }
                    }
                }
            }
        }

        this._startWaitingSearchListeners();
    },

    _search_mode_4 : function(aString) {
        /*
         * search for mode 4, put results in internal fields
         *
         * the list contains 1 part :
         *   'begin' : contacts & lists whose fields begins with X
         *
         * params :
         *   aString : the text to search in fields of address book
         *   cbSearch : the callback when search is done
         * return:
         *   none
         */
        // use DisplayName and NickName
        let baseQuery = "(or(PrimaryEmail,@C,@V)(SecondEmail,@C,@V)(FirstName,@C,@V)(LastName,@C,@V)(DisplayName,@C,@V)(NickName,@C,@V))";

        // one search : CONTAINS
        let searchQuery1 = baseQuery.replace(/@C/g, 'bw');
        searchQuery1 = searchQuery1.replace(/@V/g, encodeURIComponent(aString));
        // ldap query template
        let filterTemplate = "(|(mail=%v*)(givenName=%v*)(sn=%v*)(displayName=%v*)(cn=%v*))";

        let allAddressBooks = this.abManager.directories;

        // init listeners
        this._initSearchListeners();

        while (allAddressBooks.hasMoreElements()) {
            let ab = allAddressBooks.getNext();
            if (ab instanceof Components.interfaces.nsIAbDirectory &&  !ab.isRemote) {
                // recherche 1
                // mrcLog("AB LOCAL = " + ab.dirName);
                let doSearch = this.param_search_ab_URI.indexOf(ab.URI) >= 0;
                if (doSearch) {
                    try {
                        // add a sync search listener
                        let that = this;
                        let abSearchListener = {
                            searchID : this.searchID,
                            addressBook : ab,
                            isRemote : false,
                            cbObject : that,
                            localRes : [],
                        }
                        this._addSearchListener(abSearchListener);

                        let childCards1 = this.abManager.getDirectory(ab.URI + "?" + searchQuery1).childCards;
                        while (childCards1.hasMoreElements()) {
                            let card = childCards1.getNext();
                            if (card instanceof Components.interfaces.nsIAbCard) {
                                // a list has no email, but we want to keep it
                                if (card.isMailList) {
                                    abSearchListener.localRes.push(this._createMyCard(card));
                                } else if (card.primaryEmail != "") {
                                    // filter real cards without email
                                    abSearchListener.localRes.push(this._createMyCard(card));
                                }
                            }
                        }

                        // finish the listener
                        this._completeSearchListener(abSearchListener);
                    } catch (e) {
                        this._addErrorAddressBook(ab.dirName);
                        mrcLogError(e, "_search_mode_4()");
                    }
                }
            } else {
                if (ab instanceof Components.interfaces.nsIAbLDAPDirectory) {
                    // mrcLog("param_search="+this.param_search_ab_URI+" ; ab.URI="+ab.URI)
                    // check if user wants to search in this AB
                    let doSearch = this.param_search_ab_URI.indexOf(ab.URI) >= 0;
                    if (doSearch) {
                        try {
                            // mrcLog("AB LDAP = " + ab.dirName);
                            /* CODE FOR TB 24 to 31? */
                            // if (this.param_ldap_search_version == 'TB24') {
                            if (true) {
                                // mrcLog(ab.dirName+" : LDAP search TB24");
                                let query =
                                    Components.classes["@mozilla.org/addressbook/ldap-directory-query;1"]
                                            .createInstance(Components.interfaces.nsIAbDirectoryQuery);

                                let attributes =
                                    Components.classes["@mozilla.org/addressbook/ldap-attribute-map;1"]
                                            .createInstance(Components.interfaces.nsIAbLDAPAttributeMap);
                                attributes.setAttributeList("DisplayName",
                                    ab.attributeMap.getAttributeList("DisplayName", {}), true);
                                attributes.setAttributeList("PrimaryEmail",
                                    ab.attributeMap.getAttributeList("PrimaryEmail", {}), true);

                                let args =
                                    Components.classes["@mozilla.org/addressbook/directory/query-arguments;1"]
                                            .createInstance(Components.interfaces.nsIAbDirectoryQueryArguments);

                                // Create filter from filter template and search string
                                let ldapSvc = Components.classes["@mozilla.org/network/ldap-service;1"]
                                                        .getService(Components.interfaces.nsILDAPService);
                                let filterPrefix = "";
                                let filterSuffix = "";
                                let filterAttr = "";
                                let filter = ldapSvc.createFilter(1024, filterTemplate, filterPrefix, filterSuffix, filterAttr, aString);
                                if (!filter) {
                                    throw new Error("Filter string is empty, check if filterTemplate variable is valid in prefs.js.");
                                }

                                args.typeSpecificArg = attributes;
                                args.querySubDirectories = true;
                                args.filter = filter;

                                // add an async search listener
                                let that = this;
                                let abDirSearchListener = {
                                    searchID : this.searchID,
                                    addressBook : ab,
                                    isRemote : true,
                                    cbObject : that,
                                    localRes : [],

                                    // special LDAP : keep refs of local var to prevent any GC (--> crashes)
                                    _query : query,
                                    _attrs : attributes,
                                    _args : args,

                                    onSearchFinished : function(aResult, aErrorMesg) {
                                        if (aResult == Components.interfaces.nsIAbDirectoryQueryResultListener.queryResultComplete) {
                                            this.cbObject._completeSearchListener(this);
                                        }
                                    },

                                    onSearchFoundCard : function(aCard) {
                                        this.localRes.push(this.cbObject._createMyCard(aCard));
                                    }
                                };

                                this._addSearchListener(abDirSearchListener);
                                query.doQuery(ab, args, abDirSearchListener, ab.maxHits, 0);
                            } else {
                                // mrcLog(ab.dirName+" : LDAP search TB31");
                                /* CODE FOR TB >= 29 */
                                /*
                                let that = this;

                                function acObserver() {}

                                acObserver.prototype = {
                                    _search: null,
                                    _result: null,
                                    searchID : this.searchID,
                                    addressBook : ab,
                                    isRemote : true,
                                    cbObject : that,
                                    localRes : null,

                                    onSearchResult: function (aSearch, aResult) {
                                        this._search = aSearch;
                                        this._result = aResult;
                                        for (var i = 0; i < aResult.matchCount; i++) {
                                            aResult.QueryInterface(Components.interfaces.nsIAbAutoCompleteResult);
                                            var aCard = aResult.getCardAt(i);
                                            this.cbObject.search_res1.push(this.cbObject._createMyCard(aCard));
                                        }
                                        this.cbObject._completeSearchListener(this);
                                    },

                                    onUpdateSearchResult: function(search, result) {}
                                };

                                var acs = Components.classes["@mozilla.org/autocomplete/search;1?name=ldap"]
                                    .getService(Components.interfaces.nsIAutoCompleteSearch);

                                var params = JSON.stringify({ idKey: gCurrentIdentity.key });

                                var obs = new acObserver();
                                acs.startSearch(aString, params, null, obs);

                                this._addSearchListener(obs);
                                */
                            }
                        } catch (e) {
                            this._addErrorAddressBook(ab.dirName);
                            mrcLogError(e, "_search_mode_4()");
                        }
                    }
                }
            }
        }

        this._startWaitingSearchListeners();
    },

    _buildOneResult_Card : function(card, textBold, typeSearch, primaryEmail) {
        /*
         * call-back to build text for one card.
         * we suppose that the email will always be defined.
         *
         * params:
         *   card : the current card (not LIST)
         *   textBold : the searched text that will be in bold
         *   typeSearch : the type of search : 'begin' or 'contains'
         *   primaryEmail : true or false, indicate that we force the primary email or second
         * return:
         *   a dict :
         *     'text' : the text built for the card : name <email>
         *     'html' : the html text built for the card
         *     'node' : array of DOM nodes built for the card
         */
        // SPECIAL :
        // As it is a call-back, we can't use 'this'
        // instead, we must use the let 'mrcAComplete'


        let cardText = "";
        let cardHtml = "";
        let cardNodes = [];
        // we assemble the fields with html styling
        let fields = mrcAComplete.getFieldsForCardName(card);
        if (primaryEmail) {
            // ----------------
            // text version
            let names = []; // build the list of non-empty text fields
            for (let i=0,l=fields['name'].length ; i<l ; i++) {
                if (card[fields['name'][i]] != "") {
                    names.push(card[fields['name'][i]]);
                }
            }
            cardText = mrcAComplete._makeFullAddress(names.join(" "), card['primaryEmail']);

            // ----------------
            // node version
            for (let i=0,l=fields['name'].length ; i<l ; i++) {
                cardNodes.push.apply(cardNodes, mrcAComplete._applyBoldNode(card[fields['name'][i]], textBold, typeSearch));
                cardNodes.push(document.createTextNode(" "));
            }
            let aspan = document.createElementNS(mrcAComplete.HTMLNS, "span");
            aspan.setAttribute("class", mrcAComplete.EMAIL_CLASSNAME);
            aspan.appendChild(document.createTextNode("<"));
            appendChildrenList(aspan,  mrcAComplete._applyBoldNode(card['primaryEmail'], textBold, typeSearch));
            aspan.appendChild(document.createTextNode(">"));
            cardNodes.push(aspan);

            // popularity, only for primary email
            if (mrcAComplete.param_show_popularity) {
                cardNodes.push(document.createTextNode(mrcAComplete.NBSP));
                let aspan = document.createElementNS(mrcAComplete.HTMLNS, "span");
                aspan.setAttribute("class", mrcAComplete.POPULARITY_CLASSNAME);
                aspan.appendChild(document.createTextNode("("+parseInt(card.mrcPopularity)+")"));
                cardNodes.push(aspan);
            }
        } else {
            // ----------------
            // text version
            let names = []; // build the list of non-empty text fields
            for (let i=0,l=fields['name'].length ; i<l ; i++) {
                if (card[fields['name'][i]] != "") {
                    names.push(card[fields['name'][i]]);
                }
            }
            cardText = mrcAComplete._makeFullAddress(names.join(" "), card['secondEmail']);

            // ----------------
            // node version
            let aspan = document.createElementNS(mrcAComplete.HTMLNS, "span");
            aspan.setAttribute("class", mrcAComplete.HIDDENNAME_CLASSNAME);
            for (let i=0,l=fields['name'].length ; i<l ; i++) {
                appendChildrenList(aspan, mrcAComplete._applyBoldNode(card[fields['name'][i]], textBold, typeSearch));
                aspan.appendChild(document.createTextNode(" "));
            }
            cardNodes.push(aspan);

            let aspan2 = document.createElementNS(mrcAComplete.HTMLNS, "span");
            aspan2.setAttribute("class", mrcAComplete.EMAIL_CLASSNAME);
            aspan2.appendChild(document.createTextNode("<"));
            appendChildrenList(aspan2, mrcAComplete._applyBoldNode(card['secondEmail'], textBold, typeSearch));
            aspan2.appendChild(document.createTextNode(">"));
            cardNodes.push(aspan2);

        }
        return {'text': cardText, 'html': cardHtml, 'node' : cardNodes};
    },

    _buildOneResult_List : function(card, textBold, typeSearch, primaryEmail) {
        /*
         * call-back to build text for one card of type LIST
         *
         * params:
         *   card : the current card of type LIST
         *   textBold : the searched text that will be in bold
         *   typeSearch : the type of search : 'begin' or 'contains'
         *   primaryEmail : true or false, indicate that we force the primary email or second
         * return:
         *   a dict :
         *     'text' : the text built for the card : name <email>
         *     'html' : the html text built for the card
         *     'node' : array of DOM nodes built for the card
         */
        // SPECIAL :
        // As it is a call-back, we can't use 'this'
        // instead, we must use the let 'mrcAComplete'

        // get number of contacts in the list
        let childs = MailServices.ab.getDirectory(card.mailListURI).addressLists;
        let nb = childs.length;

        // ----------------
        // text version
        let cardText = ""; // Wil be defined only when the user selects it.
        // No real options of presentation : a list has only 'lastname' field.

        // ----------------
        // html version : UNUSED
        let cardHtml = "";

        // ----------------
        // node version
        let cardNodes = [];
        cardNodes.push.apply(cardNodes, mrcAComplete._applyBoldNode(card.lastName, textBold, typeSearch));
        cardNodes.push(document.createTextNode(mrcAComplete.NBSP));
        let aspan = document.createElementNS(mrcAComplete.HTMLNS, "span");
        aspan.setAttribute("class", mrcAComplete.NBINGROUP_CLASSNAME);
        if (nb <= 1) {
            aspan.appendChild(document.createTextNode("("+nb+mrcAComplete.NBSP+mrcAComplete.getString('contact')+")"));
        } else {
            aspan.appendChild(document.createTextNode("("+nb+mrcAComplete.NBSP+mrcAComplete.getString('contacts')+")"));
        }
        cardNodes.push(aspan);

        return {'text': cardText, 'html': cardHtml, 'node' : cardNodes};
    },

    _buildOneResult_CardList : function(card, textBold, typeSearch, primaryEmail) {
        /*
         * call-back to build text for one card
         *
         * params:
         *   card : the current card (LIST or not)
         *   textBold : the searched text that will be in bold
         *   typeSearch : the type of search : 'begin' or 'contains'
         *   primaryEmail : true or false, indicate that we force the primary email or second
         * return:
         *   a dict :
         *     'text' : the text built for the card : name <email>
         *     'html' : the html text built for the card
         *     'node' : array of DOM nodes built for the card
         */
        // SPECIAL :
        // As it is a call-back, we can't use 'this'
        // instead, we must use the let 'mrcAComplete'
        if (card.isMailList) {
            return mrcAComplete._buildOneResult_List(card, textBold, typeSearch, primaryEmail);
        } else {
            return mrcAComplete._buildOneResult_Card(card, textBold, typeSearch, primaryEmail);
        }
    },

    _buildOnePart : function(params) {
        /*
         * build one part of results list, with results of search
         *
         * params:
         *   params : a dict of parameters :
         *            'data' : the key of the data to use in the dict 'this.datas'
         *            'cb' : callback to build the text of each result
         *            'search' : the type of search : 'begin' or 'contains'
         *            'text_part' : the searched text that will be in bold
         *            'title' : (optional) the title of the part
         * return:
         *   the html div created or false
         */
        let nb = this.datas[params['data']].length;
        if (nb > 0) {
            let nb_limited = Math.min(nb, this.param_max_elements_part_menu);
            let partDiv = document.createElement("div");
            partDiv.className += " "+this.CONTAINER_CLASSNAME;
            // we add title ?
            if(params['title']) {
                let txt = this._myEncode(params['title']);
                let div = document.createElementNS(this.HTMLNS, "div");
                div.setAttribute("class", " "+this.TITLE_CLASSNAME);
                div.appendChild(document.createTextNode(txt));
                partDiv.appendChild(div);
            }
            // we add elements
            for (let i=0 ; i < nb_limited ; i++) {
                let card = this.datas[params['data']][i];
                // show the card with the primary email
                let div = document.createElementNS(this.HTMLNS, "div");
                let rv = params['cb'](card, params['text_part'], params['search'], true);
                this.panelCards.push(this._createResCard(card, true, rv.text));
                appendChildrenList(div, rv.node);
                div.setAttribute("class", " "+this.ITEM_CLASSNAME);
                div.addEventListener("click", mrcRecipientClick, false);
                div.setAttribute("id", this.ID_PREFIX+this.panelCards.length);
                partDiv.appendChild(div);

                // show the card with the optional second email
                if (card.secondEmail) {
                    let div = document.createElementNS(this.HTMLNS, "div");
                    let rv = params['cb'](card, params['text_part'], params['search'], false);
                    this.panelCards.push(this._createResCard(card, false, rv.text));
                    appendChildrenList(div, rv.node);
                    div.className += " "+this.ITEM_CLASSNAME;
                    div.setAttribute("class", " "+this.ITEM_CLASSNAME);
                    div.addEventListener("click", mrcRecipientClick, false);
                    div.setAttribute("id", this.ID_PREFIX+this.panelCards.length);
                    partDiv.appendChild(div);
                }
            }
            // more element ?
            if (nb > nb_limited) {
                let div = document.createElementNS(this.HTMLNS, "div");
                let delta = nb-nb_limited;
                if (delta == 1) {
                    div.appendChild(document.createTextNode("1 "+this.getString('one_contact_supp'))); // TODO : better layout
                } else {
                    div.appendChild(document.createTextNode(delta.toString()+" "+this.getString('n_contacts_supp'))); // TODO : better layout
                }
                div.setAttribute("class", " "+this.INFO_CLASSNAME);
                partDiv.appendChild(div);
            }
            return partDiv;
        } else {
            return false;
        }
    },

    _buildResultInfos : function(popupDiv) {
        /*
         * Add informations about search informations.
         *
         * params :
         *   popupDiv : the html element in which we have to add informations
         * return :
         *   none
         */
        if (this.infos.length > 0) {
            // only one error div, with several lines (one for each warning)
            let infoDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
            infoDiv.setAttribute("class", " "+this.ALERT_INFO_CLASSNAME);
            for (let i=0, len=this.infos.length ; i < len ; i++) {
                let pDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
                pDiv.appendChild(document.createTextNode(this.infos[i]));
                infoDiv.appendChild(pDiv);
            }
            popupDiv.appendChild(infoDiv);
        }
    },

    _buildResultWarnings : function(popupDiv) {
        /*
         * Add informations about search warnings.
         *
         * params :
         *   popupDiv : the html element in which we have to add informations
         * return :
         *   none
         */
        this.warnings = this._removeDuplicatecards(this.warnings);
        if (this.warnings.length > 0) {
            // only one error div, with several lines (one for each warning)
            let errorDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
            errorDiv.setAttribute("class", " "+this.ALERT_WARNING_CLASSNAME);
            for (let i=0, len=this.warnings.length ; i < len ; i++) {
                let pDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
                pDiv.appendChild(document.createTextNode(this.warnings[i]));
                errorDiv.appendChild(pDiv);
            }
            popupDiv.appendChild(errorDiv);
        }
    },

    _buildResultErrors : function(popupDiv) {
        /*
         * Add informations about search errors.
         *
         * params :
         *   popupDiv : the html element in which we have to add informations
         * return :
         *   none
         */
        if (this.errors.length > 0) {
            // only one error div, with several lines (one for each error)
            let errorDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
            errorDiv.setAttribute("class", " "+this.ALERT_ERROR_CLASSNAME);
            for (let i=0, len=this.errors.length ; i < len ; i++) {
                let pDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
                pDiv.appendChild(document.createTextNode(this.errors[i]));
                errorDiv.appendChild(pDiv);
            }

            // more info message
            let div = document.createElementNS(this.HTMLNS, "div");
            div.setAttribute("class", " "+this.INFO_CLASSNAME);
            div.appendChild(document.createTextNode(this.getString('more_info_see_console')));
            errorDiv.appendChild(div);

            popupDiv.appendChild(errorDiv);
        }
    },

    _buildResultList_mode_1 : function(textBold) {
        /*
         * build the html list of results for mode 1, with results of search
         *
         * params :
         *   textBold : the searched text, that will be written in bold
         * return :
         *   none
         */
        // remove old elements
        let popupDiv = document.getElementById("msgAutocompletePanelDiv");
        removeChildren(popupDiv);
        // empty associated internals fields
        this.panelCards.length = 0;
        this.indexSelectedCard = -1;

        // we build div for every part
        let divs = [];
        let params = [ {'data' : 'contains', 'cb' : this._buildOneResult_CardList, 'search' : 'contains', 'text_part' : textBold},
                     ];
        for (let i=0, len=params.length ; i < len ; i++) {
            let res = this._buildOnePart(params[i]);
            if (res) {
                divs.push(res);
            }
        }

        // we assemble divs with separators
        for (let i=0, len=divs.length ; i < len ; i++) {
            popupDiv.appendChild(divs[i]);
            if (i < len-1) {
                // if it's not last, add a separator
                let sep = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
                sep.className += " "+this.SEP_CLASSNAME;
                popupDiv.appendChild(sep);
            }
        }

        // Add infos if there are some
        this._buildResultInfos(popupDiv);
        // Add infos about warnings if there are some
        this._buildResultWarnings(popupDiv);
        // Add infos about errors if there are some
        this._buildResultErrors(popupDiv);

        // select first element
        if (this.nbDatas > 0) {
            this._select(1);
        }

        // we take care of memory : emptying unused arrays:
        this.datas['contains'].length = 0;
    },

    _buildResultList_mode_2 : function(textBold) {
        /*
         * build the html list of results for mode 1, with results of search
         *
         * params :
         *   textBold : the searched text, that will be written in bold
         * return :
         *   none
         */
        // remove old elements
        let popupDiv = document.getElementById("msgAutocompletePanelDiv");
        removeChildren(popupDiv);
        // empty associated internals fields
        this.panelCards.length = 0;
        this.indexSelectedCard = -1;

        // we build div for every part
        let divs = [];
        let params = [ {'data' : 'begin', 'cb' : this._buildOneResult_Card, 'search' : 'begin', 'text_part' : textBold},
                       {'data' : 'contains', 'cb' : this._buildOneResult_Card, 'search' : 'contains', 'text_part' : textBold},
                       {'data' : 'list', 'cb' : this._buildOneResult_List, 'search' : 'contains', 'text_part' : textBold} ];
        for (let i=0, len=params.length ; i < len ; i++) {
            let res = this._buildOnePart(params[i]);
            if (res) {
                divs.push(res);
            }
        }

        // we assemble divs with separators
        for (let i=0, len=divs.length ; i < len ; i++) {
            popupDiv.appendChild(divs[i]);
            if (i < len-1) {
                // if it's not last, add a separator
                let sep = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
                sep.className += " "+this.SEP_CLASSNAME;
                popupDiv.appendChild(sep);
            }
        }

        // Add infos if there are some
        this._buildResultInfos(popupDiv);
        // Add infos about warnings if there are some
        this._buildResultWarnings(popupDiv);
        // Add infos about errors if there are some
        this._buildResultErrors(popupDiv);

        // select first element
        if (this.nbDatas > 0) {
            this._select(1);
        }

        // we take care of memory : emptying unused arrays:
        this.datas['begin'].length = 0;
        this.datas['contains'].length = 0;
        this.datas['list'].length = 0;
    },

    _buildResultList_mode_3 : function(textBold) {
        /*
         * build the html list of results for mode 3, with results of search
         *
         * params :
         *   textBold : the searched text, that will be written in bold
         * return :
         *   none
         */
        // remove old elements
        let popupDiv = document.getElementById("msgAutocompletePanelDiv");
        removeChildren(popupDiv);
        // empty associated internals fields
        this.panelCards.length = 0;
        this.indexSelectedCard = -1;

        // we build div for every part
        // but the number of part is dynamic
        let divs = [];
        let params = [];
        for (let i in this.datas) {
            let t = {'data' : i, 'cb' : this._buildOneResult_CardList, 'search' : 'contains', 'text_part' : textBold, 'title' : i};
            params.push(t);
        }
        for (let i=0, len=params.length ; i < len ; i++) {
            let res = this._buildOnePart(params[i]);
            if (res) {
                divs.push(res);
            }
        }

        // we assemble divs with separators
        for (let i=0, len=divs.length ; i < len ; i++) {
            popupDiv.appendChild(divs[i]);
            if (i < len-1) {
                // if it's not last, add a separator
                let sep = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
                sep.className += " "+this.SEP_CLASSNAME;
                popupDiv.appendChild(sep);
            }
        }

        // Add infos if there are some
        this._buildResultInfos(popupDiv);
        // Add infos about warnings if there are some
        this._buildResultWarnings(popupDiv);
        // Add infos about errors if there are some
        this._buildResultErrors(popupDiv);

        // select first element
        if (this.nbDatas > 0) {
            this._select(1);
        }

        // we take care of memory : emptying unused arrays:
        for (let i in this.datas) {
            this.datas[i].length = 0;
        }
    },

    _buildResultList_mode_4 : function(textBold) {
        /*
         * build the html list of results for mode 4, with results of search
         *
         * params :
         *   textBold : the searched text, that will be written in bold
         * return :
         *   none
         */
        // remove old elements
        let popupDiv = document.getElementById("msgAutocompletePanelDiv");
        removeChildren(popupDiv);
        // empty associated internals fields
        this.panelCards.length = 0;
        this.indexSelectedCard = -1;

        // we build div for every part
        let divs = [];
        let params = [ {'data' : 'begin', 'cb' : this._buildOneResult_CardList, 'search' : 'begin', 'text_part' : textBold},
                     ];
        for (let i=0, len=params.length ; i < len ; i++) {
            let res = this._buildOnePart(params[i]);
            if (res) {
                divs.push(res);
            }
        }

        // we assemble divs with separators
        for (let i=0, len=divs.length ; i < len ; i++) {
            popupDiv.appendChild(divs[i]);
            if (i < len-1) {
                // if it's not last, add a separator
                let sep = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
                sep.className += " "+this.SEP_CLASSNAME;
                popupDiv.appendChild(sep);
            }
        }

        // Add infos if there are some
        this._buildResultInfos(popupDiv);
        // Add infos about warnings if there are some
        this._buildResultWarnings(popupDiv);
        // Add infos about errors if there are some
        this._buildResultErrors(popupDiv);

        // select first element
        if (this.nbDatas > 0) {
            this._select(1);
        }

        // we take care of memory : emptying unused arrays:
        this.datas['begin'].length = 0;
    },

    _doEmptyPanel : function() {

        let popupDiv = document.getElementById("msgAutocompletePanelDiv");
        removeChildren(popupDiv);
        // empty associated internals fields
        this.panelCards.length = 0;
        this.indexSelectedCard = -1;
    },

    _getNbRecipients : function(textAddress) {
        /*
         * from a text separated by commas, compute the number
         * of non-empty parts.
         *
         * params :
         *   textAddress : the text separated by commas
         * return :
         *   the number of non-enpty parts
         */
        let addresses = this._splitEmailList(textAddress);
        let nb = addresses.length;
        // need to count only non-empty values
        nb = 0;
        for (let i=0, l=addresses.length ; i < l ; i++) {
            let t = addresses[i].trim();
            if (t != '') {
                nb++;
            }
        }

        // TODO : need to count only valid values (real emails) ?

        return nb;
    },




    _updateAllFieldAction : function() {
        /*
         * Updates menuitems for all fields
         *
         * params:
         *   none
         * return:
         *   none
         */
        for (let i in this.field_states) {
            this._updateFieldAction(i);
        }
    },

    _updateFieldAction : function(field) {
        /*
         * Update the menuitem associated to a field
         *
         * params:
         *   field : the field
         * returns:
         *   none
         */
        if (this.FIELDS[field].menuId != "") {
            let menu = document.getElementById(this.FIELDS[field].menuId);
            if (this.field_states[field].force) {
                menu.setAttribute("checked", "true");
                menu.disabled = true;
            } else {
                menu.disabled = ! (this.field_states[field].enabled);
                menu.setAttribute("checked", this.field_states[field].checked ? "true" : "false" );
            }
        }
    },

    _getFieldFromTextElement : function(element) {
        /*
         * utility : return the field based on the text field
         *
         */
        let field = "";
        for (let i in this.FIELDS) {
            if (this.FIELDS[i].txtId == element.id) {
                field = i;
            }
        }
        return field;
    },


    _removeRecipient : function(field, email) {

        if (this.FIELDS[field]) {
            try {
                let element = document.getElementById(this.FIELDS[field].txtId);

                this._elementRemoveInPart(element, email);
                this.updateNbRecipients(element);

                // to be coherent : inform TB that content of current Msg has really changed
                gContentChanged=true;
            } catch (e) {
                mrcLogError(e, " _removeRecipient()");
            }
        }
    },

    _insertRecipient : function(field, email) {

        if (this.FIELDS[field]) {
            try {
                if (email != null && email != "") {
                    // mrcLog("DEBUG _insertRecipient() : "+field+", "+email);
                    let element = document.getElementById(this.FIELDS[field].txtId);
                    this._elementInsertInPart(element, element.value.length, email);
                    this.updateNbRecipients(element);

                    // to be coherent : inform TB that content of current Msg has really changed
                    gContentChanged=true;
                }
            } catch (e) {
                mrcLogError(e, " _insertRecipient()");
            }
        }
    },


    /*
     *
     *
     * public methods
     *
     *
     */

    getString : function(key) {
        /*
         * wrapper for localization
         *
         * params :
         *   key : the name of the property
         * return :
         *   the value of property in the current language
         */
        let res = key;
        try {
            let bundle = document.getElementById("mrcComposeStringBundle");
            if (bundle) {
                res = bundle.getString(key);
            } else {
                res = key;
            }
        } catch(e) {
            res = key;
        }
        return res
        /*
         * Alternate way
         *
        let bundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
        let bundle = bundleService.createBundle("chrome://mrc_compose/locale/mrc_compose.properties");
        let str = bundle.GetStringFromName(key);
        return str;
        */
    },


    getFieldsForCardName: function(card) {
        /*
         * return fields name in order to build a text version of the card
         *
         * params :
         *   card : the address book card
         * return :
         *   a dict :
         *       'name' : a list of fields names
         *       'email' : a list of fields names
         */
        // rules for choosing a name
        let fieldsName = [];
        if (card.displayName != "") {
            fieldsName.push('displayName');
        } else {
            if (card.lastName != "" || card.firstName != "") {
                if (card.firstName != "") fieldsName.push('firstName');
                if (card.lastName != "") fieldsName.push('lastName');
            } else if (card.nickName) {
                fieldsName.push('nickName');
            } else {
                // other fields ??? company, phonetic fields...
            }
        }
        // rules for choosing an email
        // no rule today
        let fieldsEmail = ['primaryEmail'];

        return {'name' : fieldsName, 'email' : fieldsEmail};
    },

    getCardAsText : function(card){
        /*
         * returns the card's complete name as text (with quotes)
         *
         * check if it the right method (fields) to show
         * ie : use 'nickName', 'displayName', 'phoneticName'...????
         * is there an official API that handle that ??? NO...
         * email = card.firstName+" "+card.lastName+" <"+card.primaryEmail+">";
         *
         * ==> cf mail/components/addrbook/content/abCommon.js : GenerateAddressFromCard
         *
         * params :
         *   card : the address book card
         * return :
         *   the text
         */
        let fields = this.getFieldsForCardName(card);
        let names = []; // build the list of non-empty text fields
        for (let i=0,l=fields['name'].length ; i<l ; i++) {
            if (card[fields['name'][i]] != "") {
                names.push(card[fields['name'][i]]);
            }
        }
        let emails = []; // build the list of non-empty text fields
        for (let i=0,l=fields['email'].length ; i<l ; i++) {
            if (card[fields['email'][i]] != "") {
                emails.push(card[fields['email'][i]]);
            }
        }
        // let cardText = this.mhParser.makeMailboxObject(names.join(" "), emails.join(" ")).toString();
        // let cardText = this.mhParser.makeFullAddress(names.join(" "), emails.join(" "));
        let cardText = this._makeFullAddress(names.join(" "), emails.join(" "));
        return cardText;
    },

    getCurrentPart : function(text, pos) {
        /*
         * in a text separated by commas, compute the index of part
         * that contains a character defined by his position
         *
         * params :
         *   text : the text separated by commas
         *   pos : the position of character
         * return :
         *   the index of part
         */
        let splits = this._splitEmailList(text);
        let res = this._getPartByPos(text, pos);
        return splits[res['i']];
    },

    needSearch : function(newQuery) {
        /*
         * compute if we need to perform a new query.
         * Impose a delay between two identical searches.
         *
         * params :
         *   newQuery : the text to search
         * return :
         *   true or false
         */
        let now = new Date().getTime();
        return ((this.lastQuery != newQuery) || ((now - this.lastQueryTime) > this.param_min_search_delay));
    },

    search : function(aString, event, element, cbSearch) {
        /*
         * official call to perform search on address book.
         * dynamic call of internal search method
         *
         * params :
         *   aString : the text to search
         *   event : event that generated the search
         *   element : the html field element that generated the search
         *   cbSearch : the callback when search is done
         * return :
         *   none
         */
        // mrcLog(now()+" search() "+this.searchID);
        this.datas = {}; // TODO : check if it's the right way to empty dictionary
        this.errors = [];
        this.warnings = [];
        this.infos = [];
        this.nbDatas = 0;
        let meth = "_search_mode_"+this.param_mode;
        this.cbSearch = cbSearch

        // stop the purge timeout
        clearTimeout(this.timeout_archiv);

        // show panel with spinning image while searching
        let deck = document.getElementById('deckAutocompletePanel');
        deck.selectedIndex = this.DECK_WAITING;
        this._doEmptyPanel();
        this.openPopup(event, element);

        try {
            this[meth](aString);
            // DEBUG :
            // Force some GC to simulate some low-memory context found by some users.
            // For LDAP searches, it brings some crashes until all variables where referenced.
            // Components.utils.forceGC();
        } catch (e) {
            mrcLogError(e, "SEARCH()");
        }
    },

    finishSearch : function(aString, event, element) {
        /*
         * Perform actions after search is complete.
         *
         * params :
         *   aString : the searched text
         *   event : the event that generated the search
         *   element : the html textfield associated to the event
         * return:
         *   non
         */
        this.lastQuery = aString;
        this.lastQueryTime = new Date().getTime()
        // Is there something to show ? results, infos, warnings or errors ?
        let nb = this.nbDatas + this.infos.length + this.warnings.length + this.errors.length;
        // mrcLog(nb, "finishSearch, nb=");
        if (nb > 0) {
            this.buildResultList(aString);
            this.openPopup(event, element);
        } else {
            this.hidePopup();
        }

        // start the purge timeout
        // this.timeout_archiv = setTimeout(this._purgeArchiv, this.DELAY_PURGE_ARCHIV);
        // To avoid AMO warning, we copy code of _purgeArchiv().
        this.timeout_archiv = setTimeout(function() {
                /*
                 * Simply empty list of archived search listeners,
                 * the GC will make the real job later.
                 */
                // SPECIAL :
                // As it is a call-back, we can't use 'this'
                // instead, we must use the let 'mrcAComplete'
                // mrcLog("AVANT purge:"+mrcAComplete.searchedAB_archiv.join("||"));
                let l = mrcAComplete.searchedAB_archiv.length;
                mrcAComplete.searchedAB_archiv.splice(0, l);
                // mrcLog("APRES purge:"+mrcAComplete.searchedAB_archiv.join("||"));
            }, this.DELAY_PURGE_ARCHIV);
    },

    infoTypeMore : function(aString, event, element) {

        // show panel with spinning image while searching
        let deck = document.getElementById('deckAutocompletePanel');
        deck.selectedIndex = this.DECK_TYPEMORE;
        // prepare message for user
        let delta = this.param_search_min_char - aString.length;
        let message = this.getString("type_more");
        message = message.replace(/%s/g, delta);
        // put message in panel
        let label = document.getElementById('labelTypeMore');
        label.value = message;

        this._doEmptyPanel();
        this.openPopup(event, element);
    },

    buildResultList : function(textPart) {
        /*
         * official call to perform search on address book.
         * dynamic call of internal builList method
         *
         * params :
         *   textPart : the searched text
         * return :
         *   none
         */
        /*
        let panel = document.getElementById('msgAutocompletePanel');
        panel.height = '10px';
        */
        let deck = document.getElementById('deckAutocompletePanel');
        deck.selectedIndex = this.DECK_AUTOCOMPLETE;

        let meth = "_buildResultList_mode_"+this.param_mode;
        this[meth](textPart);
    },

    selectPrevious : function() {
        /*
         * select previous div in panel.
         *
         * params :
         *   none
         * return :
         *   none
         */
        let newIndex = 0;
        if (this.indexSelectedCard <= 1) {
            newIndex = this.panelCards.length;
        } else {
            newIndex = this.indexSelectedCard-1;
        }
        this._unSelectCurrent();
        this._select(newIndex);
    },

    selectNext : function() {
        /*
         * select next div in panel
         *
         * params :
         *   none
         * return :
         *   none
         */
        let newIndex = 0;
        if (this.indexSelectedCard >= this.panelCards.length) {
            newIndex = 1;
        } else {
            newIndex = this.indexSelectedCard+1;
        }
        this._unSelectCurrent();
        this._select(newIndex);
    },

    select : function(newIndex) {
        /*
         * select a div in panel.
         *
         * params :
         *   newIndex : the index of div
         * return :
         *   none
         */
        let tempIndex = Math.min(newIndex, this.panelCards.length);
        tempIndex = Math.max(tempIndex, 1);
        this._unSelectCurrent();
        this._select(tempIndex);
    },

    updateFieldVisibilityOnLoad : function(field) {
        /*
         * update the UI xxxxxxxxxxx
         *
         * params :
         *   field : the internal identifier of field
         * return :
         *   none
         */
        // check the element : is it one of the N fields ?
        if (this.FIELDS[field]) {
            // Ensure height can change.
            mrcCompose_WORKAROUND_Height();
            try{
                let fieldElement = document.getElementById(this.FIELDS[field].txtId);
                let nbRecipients = this._getNbRecipients(fieldElement.value);
                let idBox = this.FIELDS[field].boxId;
                let box = document.getElementById(idBox);
                if (nbRecipients==0 && !this.field_states[field].force) {
                    box.collapsed = true;
                    this.field_states[field].enabled = true;
                    this.field_states[field].checked = false;
                } else {
                    box.collapsed = false;
                    this.field_states[field].enabled = false;
                    this.field_states[field].checked = true;
                }
                this._updateFieldAction(field);
            } catch (e) {
                mrcLogError(e, "updateFieldVisibility()");
            }
        }
    },

    updateFieldUIAfterKeyUp : function(element) {
        /*
         * update the UI that handle fields :
         * user entered text in textfield 'element',
         * update the associated menuitem
         *
         * params :
         *   element : html field with adresses
         * return :
         *   none
         */
        let field = this._getFieldFromTextElement(element);
        this.updateFieldUI(field);
    },

    updateFieldUI : function(field) {
        /*
         * update the UI that handle fields :
         *
         * params :
         *   field : text
         * return :
         *   none
         */
        if (field != "" && this.field_states[field]) {
            let idBox = this.FIELDS[field].boxId;
            let box = document.getElementById(idBox);
            let idTxt = this.FIELDS[field].txtId;
            let txt = document.getElementById(idTxt);
            if (txt.value == "") {
                this.field_states[field].enabled = true;
            } else {
                this.field_states[field].enabled = false;
            }
            this._updateFieldAction(field);
        }
    },

    changeFieldVisibility : function(field) {
        /*
         * Update UI and objects in response to a field visibilty change
         *
         */

        if (this.FIELDS[field]) {
            // Ensure height can change.
            mrcCompose_WORKAROUND_Height();
            try {
                let idBox = this.FIELDS[field].boxId;
                let box = document.getElementById(idBox);
                box.collapsed = ! box.collapsed;
                this.field_states[field].checked = ! box.collapsed;

                // Update UI
                this._updateFieldAction(field);

                if (box.collapsed == false) {
                    let txt = document.getElementById(this.FIELDS[field].txtId);
                    mrcRecipientResize(txt);
                    txt.focus();
                }
            } catch (e) {
                mrcLogError(e, "changeFieldVisibility("+field+")");
            }
        }
    },

    forceFieldVisibility : function(field, visible) {
        /*
         * Update UI and objects in response to a field visibilty change
         *
         */

        if (this.FIELDS[field]) {
            try {
                let idBox = this.FIELDS[field].boxId;
                let box = document.getElementById(idBox);
                let newCollapsed = ! visible;
                if (newCollapsed != box.collapsed) {
                    this.changeFieldVisibility(field);
                }
            } catch (e) {
                mrcLogError(e, "forceFieldVisibility()");
            }
        }
    },

    updateNbRecipients : function(element, collapseIfZero) {
        /*
         * update the UI with the number of recipient for an html email field
         *
         * params :
         *   element : the html field with adresses
         *   collapseIfZero : hide the info if 0 recipients
         * return :
         *   none
         */
        // optional parameter
        collapseIfZero = mrcPick(collapseIfZero, false);

        // check the element : is it one of the 3 fields ?
        let field = this._getFieldFromTextElement(element);
        if (field != "") {
            let txt = "";
            let nbRecipients = this._getNbRecipients(element.value);
            this.field_nb_recipients[field] = nbRecipients;
            let idLabel = this.FIELDS[field].nbId;
            let idWarning = this.FIELDS[field].warnId;

            if (collapseIfZero && (nbRecipients==0)) {
                // in the current version, 'collapseIfZero' is always false,
                // so this code is useless
                let label = document.getElementById(idLabel);
                label.value = "";
                label.collapsed = true;
                if (idWarning != '') {
                    let item = document.getElementById(idWarning);
                    item.hidden = true;
                }
            } else {
                if (nbRecipients >= this.param_min_recipients_show) {
                    txt = "("+nbRecipients+")";
                }
                let label = document.getElementById(idLabel);
                label.value = txt;
                label.collapsed = false;
                if (idWarning != '') {
                    let item = document.getElementById(idWarning);
                    if (nbRecipients > this.param_max_recipients_warning) {
                        item.hidden = false;
                    } else {
                        item.hidden = true;
                    }
                }
            }
        }
    },




    validate : function() {
        /*
         * enter the selected card from the panel in the html email textfield
         *
         * params :
         *   none
         * return :
         *   none
         */
        let email = "";
        // get current card
        let card = this.panelCards[this.indexSelectedCard-1];
        if (typeof card !== "undefined") {
            // console.log(" debug validate:", card);
            mrcLog(card, " debug validate:");
            if (card.isMailList) {
                // add emails of every member of the list
                let childs = MailServices.ab.getDirectory(card.mailListURI).addressLists;
                let nb = childs.length;
                let emailList = [];
                for (let i=0 ; i < nb ; i++) {
                    card = childs.queryElementAt(i, Components.interfaces.nsIAbCard);
                    emailList.push(this.getCardAsText(card));
                }
                email = emailList.join(this.PART_SUFFIX+this.SEP+this.PART_PREFIX);
            } else {
                // --> enter his email in the text
                email = card.text;
                // mrcLog("EMAIL = "+email);
            }
            this._elementInsertInPart(this.currentTextBox, this.currentTextBox.selectionStart, email);
            this.updateNbRecipients(this.currentTextBox);

            // to be coherent : inform TB that content of current Msg has really changed
            gContentChanged=true;
        }
    },

    openPopup : function(event, element) {
        /*
         * open the result panel for a html textfield
         *
         * params :
         *   none
         * return :
         *   none
         */
        this.currentTextBox = element;
        let popup = document.getElementById("msgAutocompletePanel");
        popup.openPopup(element, "after_start", 0, 0, false, true, event);
    },

    hidePopup : function() {
        /*
         * close the result panel
         *
         * params :
         *   none
         * return :
         *   none
         */
        // make any search obsolete
        this._obsoleteSearchID();

        let popup = document.getElementById("msgAutocompletePanel");
        popup.hidePopup();
        this.currentTextBox = null;
    },


    getNbTotalRecipients : function() {
        /*
         * compute the total nb recipients,
         * from fields TO, CC and BCC.
         *
         * params :
         *   none
         * return :
         *   int
         */
        nb = 0;
        nb += this.field_nb_recipients['fieldTO'];
        nb += this.field_nb_recipients['fieldCC'];
        nb += this.field_nb_recipients['fieldBCC'];
        return nb;
    },
}

// Workaround for compatibility with other addons, specially Stationery :
// they force the height of the recipients panels.
function mrcCompose_WORKAROUND_Height() {
    let headerToolbar = document.getElementById("MsgHeadersToolbar");
    headerToolbar.setAttribute("minheight", "10");
    // compat TB24
    headerToolbar.removeAttribute("height");
    // compat Stationery : it forces the 'height' and 'min-height' in "style" attribute
    headerToolbar.removeAttribute("style");
}

function mrcComposeFocus() {

    // set focus to default "TO" field
    let fieldFocus = "";
    let msgTo = document.getElementById("msgTO");
    // dump("DEBUG mrcComposeFocus\n");

    // gMsgCompose is defined when that callback is fired.
    if (gMsgCompose.composeHTML) {
        if (msgTo.value == "") {
            // empty TO : new or forward message
            fieldFocus = mrcAComplete.prefs.getCharPref("first_focus");
        } else {
            // non-empty TO : reply message
            fieldFocus = mrcAComplete.prefs.getCharPref("first_focus_reply_html");
        }
        if (fieldFocus == "content") {
            fieldFocus = "content-frame";
        }
        // here, the default focus is the content textfield
        // change focus only if necessary
        if (fieldFocus != "default"){
            // need a special way to change focus in HTML mode :
            // cf https://bugzilla.mozilla.org/show_bug.cgi?id=207527
            let myStateListener = {
              NotifyComposeFieldsReady: function() {
              },

              NotifyComposeBodyReady: function() {
                let msg = document.getElementById(fieldFocus);
                msg.focus();
                // dump("set html focus to '"+fieldFocus+"'\n");
              },

              ComposeProcessDone: function(aResult) {
              },

              SaveInFolderDone: function(folderURI) {
              }
            };
            gMsgCompose.RegisterStateListener(myStateListener);
        } else {
            // dump("No change for HTML focus");
        }
    } else {
        if (msgTo.value == "") {
            // empty TO : new or forward message
            fieldFocus = mrcAComplete.prefs.getCharPref("first_focus");
        } else {
            // non-empty TO : reply message
            fieldFocus = mrcAComplete.prefs.getCharPref("first_focus_reply");
        }
        if (fieldFocus == "content") {
            fieldFocus = "content-frame";
        }
        // Here, no default focus (maybe in the old adressingWindget ?)
        // change focus only if necessary
        if (fieldFocus != "default"){
            // simple way in plain text message : doesn't work anymore in TB24
            // let msg = document.getElementById(fieldFocus);
            // msg.focus();
            // dump("set focus to '"+fieldFocus+"'\n");

            // need a special way to change focus in simple mode :
            // cf https://bugzilla.mozilla.org/show_bug.cgi?id=207527
            let myStateListener = {
              NotifyComposeFieldsReady: function() {
              },

              NotifyComposeBodyReady: function() {
                let msg = document.getElementById(fieldFocus);
                msg.focus();
                // dump("set focus to '"+fieldFocus+"'\n");
              },

              ComposeProcessDone: function(aResult) {
              },

              SaveInFolderDone: function(folderURI) {
              }
            };
            gMsgCompose.RegisterStateListener(myStateListener);


        } else {
            // dump("No change for simple text focus");
        }
    }
}

window.addEventListener("load", function(e) {
        // dump("DEBUG : load compose window\n");
        mrcAComplete.startup();
    }, false);

window.addEventListener("unload", function(e) {
        mrcAComplete.shutdown();
    }, false);



/*
 *
 *
 * UI CallBacks
 *
 *
 *
 *
 */

function mrcRecipientKeyPress(event, element) {
    /*
     * call-back for 'keypress' event
     *
     *
     * Here we can intercept key event BEFORE being integrated into the text.
     *
     * So we take care of keys :
     * UP, DOWN, ENTER, TAB
     *
     * If the panel is present or not, their behaviour will be different
     */
    gContentChanged=true;

    let popup = document.getElementById("msgAutocompletePanel");
    if (popup.state == "open" || popup.state == "showing") { // TODO : check if 'showing' is ok
        switch(event.keyCode) {
            // case KeyEvent.DOM_VK_DELETE:
            // case KeyEvent.DOM_VK_BACK_SPACE:

            case KeyEvent.DOM_VK_UP:
                // select previous element of autocomplete div
                mrcAComplete.selectPrevious();
                event.stopPropagation();
                event.preventDefault(); // MOST IMPORTANT LINE : avoid the handling by the textbox
                break;

            case KeyEvent.DOM_VK_DOWN:
                // select next element of autocomplete div
                mrcAComplete.selectNext();
                event.stopPropagation();
                event.preventDefault(); // MOST IMPORTANT LINE : avoid the handling by the textbox
                break;

            case KeyEvent.DOM_VK_ESCAPE:
                // simply close the popup
                // bug ? no effet here
                // mrcAComplete.hidePopup();
                break;

            case KeyEvent.DOM_VK_TAB:
            case KeyEvent.DOM_VK_RETURN:
                // validate current element of autocomplete div
                mrcAComplete.validate();
                // then close popup
                mrcAComplete.hidePopup();
                event.stopPropagation();
                event.preventDefault(); // MOST IMPORTANT LINE : avoid the handling by the textbox
                break;
        }
    } else {
        // default behaviour

        // update the # of recipients of the current textbox
        // mrcAComplete.updateNbRecipients(element);
    }
}

function mrcRecipientKeyUp(event, element) {
    /*
     * call-back for 'keyup' event
     *
     * Here we can intercept key event AFTER being integrated into the text.
     * --> we can analyse the text and if necessary, open the panel
     *
     */
    // www.the-art-of-web.com/javascript/escape
    gContentChanged = true;
    // mrcLog("keyCode="+event.keyCode);
    let sel = element.selectionStart;
    let textPart = mrcAComplete.getCurrentPart(element.value, sel).trim();
    let canUpdatePanel = true;
    let canUpdateUI = true;

    // TODO : ajouter un cache sur textPart pour optimiser

    let popup = document.getElementById("msgAutocompletePanel");
    if (popup.state == "open" || popup.state == "showing") { // TODO : check if 'showing' is ok
        switch(event.keyCode) {
            case KeyEvent.DOM_VK_TAB:
            case KeyEvent.DOM_VK_UP:
            case KeyEvent.DOM_VK_DOWN:
            case KeyEvent.DOM_VK_RETURN:
            case KeyEvent.DOM_VK_ESCAPE:
                canUpdatePanel = false;
                event.stopPropagation();
                event.preventDefault(); // MOST IMPORTANT LINE : avoid the handling by the textbox
        }
    } else {
        // default behaviour
        // we suppose the search will be done and the popup opened

        // text inserted --> automatic height
        if (mrcAComplete.param_automatic_height) {
            mrcRecipientResize(element);
        }
        // SPECIAL
        switch(event.keyCode) {
            case KeyEvent.DOM_VK_ESCAPE:
                canUpdatePanel = false;
                canUpdateUI = false;
                // simply close the popup
                mrcAComplete.hidePopup();
                break;
        }
    }


    // TODO
    // revoir la gestion des flèches dans les différents cas

    switch(event.keyCode) {
        case KeyEvent.DOM_VK_PAGE_UP:
        case KeyEvent.DOM_VK_PAGE_DOWN:
        case KeyEvent.DOM_VK_END:
        case KeyEvent.DOM_VK_HOME:
        case KeyEvent.DOM_VK_LEFT:
        case KeyEvent.DOM_VK_UP:
        case KeyEvent.DOM_VK_RIGHT:
        case KeyEvent.DOM_VK_DOWN:

            // optimize with cache
            if (textPart == mrcAComplete._textPart_cache) {
                // no need to update UI
                canUpdateUI = false;
                // no need to search
                canUpdatePanel = false;
            } else {
                // mrcLog("texPart changed:"+textPart);
                // no need to update UI
                canUpdateUI = false;
                // need to search
                canUpdatePanel = true;
            }
            break;
    }

    // fill cache for next keyups
    mrcAComplete._textPart_cache = textPart;

    if (canUpdateUI) {
        // update the UI that handle fields
        mrcAComplete.updateFieldUIAfterKeyUp(element);

        // update the # of recipients of the current textbox
        mrcAComplete.updateNbRecipients(element);

        // special TB 24 ; TB 17 does not need the parameter
        updateSendCommands(true);
    }

    if (canUpdatePanel) {
        if (textPart.length >= mrcAComplete.param_search_min_char) {

            /*
            TODO :
            test si le textPart est déjà un email complet "xxxxx <yyy@isp.com>"
            ou non.
            * si oui, faire la recherche sur l'email ! pour etre sur de retrouver le contact

            regex simple pour chercher un email
                /\S+@\S+\.\S+/

                Example JavaScript function:

                function validateEmail(email)
                {
                    var re = /\S+@\S+\.\S+/;
                    return re.test(email);

            */

            // mrcLog("textPart:'"+textPart+"'");
            let re = /<\S+@\S+\.\S+>$/;
            let res = re.exec(textPart);
            if (res && res.length > 0) {
                // we extract the pure email
                let raw = res[0];
                // mrcLog("raw:'"+raw+"'");
                textPart = raw.slice(1,-1);
                // mrcLog("new textPart:'"+textPart+"'");

            }


            if (mrcAComplete.needSearch(textPart)) {
                // perform search
                // mrcLog("searching:'"+textPart+"'");
                mrcAComplete.search(textPart, event, element, function callback_search() {
                        mrcAComplete.finishSearch(textPart, event, element)
                    });
            }
        } else if (textPart.length == 0) {

            mrcAComplete.hidePopup();
        } else {
            // not enough caracters to start searching : tell that to user
            mrcAComplete.infoTypeMore(textPart, event, element);
        }
    }
}

function mrcRecipientResize(element, maxi) {
    /*
     * call-back for 'overflow' event
     *
     */
    try {
        // maxi = mrcAComplete._pick(maxi, mrcAComplete.param_max_height);
        maxi = mrcAComplete.param_max_height;

        // Ensure height can change.
        mrcCompose_WORKAROUND_Height();

        let sh1 = element.inputField.scrollHeight;
        element.height = 'auto'; // ==> forces the textbox to recompute scrollHeight to adapt to current value
        let sh2 = element.inputField.scrollHeight;
        let fnbLines = sh2 / mrcAComplete.param_line_height;
        let nbLines = Math.round(fnbLines);
        let nHeight = mrcAComplete.param_first_line_height + (nbLines-1)*mrcAComplete.param_line_height;
        let h = Math.min(Math.max(nHeight,mrcAComplete.param_first_line_height), maxi);
        // dump("h1="+sh1+"  h2="+sh2+"  fnbLines="+fnbLines+"  nbLines="+nbLines+"  nHeight="+nHeight+"  h="+h+"\n");
        element.height = h;
        let sh3 = element.inputField.scrollHeight;
        mrcLog("Resize : "+element.id+" : h1="+sh1+"  h2="+sh2+"  fnbLines="+fnbLines+"  nbLines="+nbLines+"  nHeight="+nHeight+"  h="+h+"  h3="+sh3);
    } catch (e) {
        mrcLogError(e, "mrcRecipientResize()");
    }
}

function mrcRecipientClick(event) {
    /*
     * call-back for 'click' event
     *
     */
    let id = event.currentTarget.id;
    let pos = id.indexOf(mrcAComplete.ID_PREFIX);
    if (pos == 0) {
        // extract index from id of element
        let index = id.substr(mrcAComplete.ID_PREFIX.length);
        // select the clicked element
        mrcAComplete.select(index);
        // validate it
        mrcAComplete.validate();
        // then close popup
        mrcAComplete.hidePopup();
    }
}

function mrcChangeFieldVisibility(event, field) {
    /*
     * call-back for checkboxes 'show XXX'
     *
     */
    mrcAComplete.changeFieldVisibility(field);
}

function mrcMinimizeFields(event) {
    /*
     * call-back for button 'Minimize' :
     *
     * reduce all fields to one-line-height
     *
     */
    try {
        for (let i in mrcAComplete.FIELDS) {
            let element = document.getElementById(mrcAComplete.FIELDS[i].txtId);
            // mrcLog(i+", height="+element.height+", sh="+element.inputField.scrollHeight);
            /*
             * TODO : BUG : DOES NOT WORK IF THE TEXTFIELD HAS >1 LINE AND NO SCROLLBAR
             * CAN'T FIND WHY... SEEMS AN INTERNAL BEHAVIOUR OF XUL ???
             *
             * AND CAN'T FORCE THE SCROLLBAR TO APPEAR BEFORE NEEDED
             *
             *
             * TESTED WITH A RESIZER IN XUL :
             *     <resizer element="msgTO" dir="bottomright" left="0" top="0" width="16" height="16"/>
             * ...WORKS PERFECTLY WITH THE MOUSE !
             */

            // HACK : force scrollHeight AND delay some processing...
            if (element.scrollHeight <= element.height) {
                element.height = 'auto'; // ==> forces the textbox to recompute scrollHeight to adapt to current value
                // we just force the scrollheight to force the appearance of scrollbar
                element.inputField.scrollHeight = 1000;
                element.scrollHeight = 1000;

                // let t = mrcAComplete.param_first_line_height.toString()+'px';
                // element.setAttribute("height", t);

                // HACK continue after a delay...
                let t = setTimeout( function() {mrcMinimizeFields_2(element)}, 10);
            } else {

                element.height = 'auto'; // ==> forces the textbox to recompute scrollHeight to adapt to current value
                element.height = mrcAComplete.param_first_line_height;
            }
        }
    } catch (e) {
        mrcLogError(e, "mrcMinimizeFields()");
    }
}

function mrcMinimizeFields_2(element) {
    /*
     * call-back for button 'Minimize' :
     *
     * reduce all fields to one-line-height
     *
     */
    try {
        let t = mrcAComplete.param_first_line_height.toString()+'px';
        element.setAttribute("height", t);
    } catch (e) {
        mrcLogError(e, "mrcMinimizeFields_2()");
    }
}

function mrcMaximizeFields(event) {
    /*
     * call-back for button 'Maximize'
     * expand all fields to their maximum
     *
     */
    try {
        for (let i in mrcAComplete.FIELDS) {
            let element = document.getElementById(mrcAComplete.FIELDS[i].txtId);
            mrcRecipientResize(element);
        }
    } catch (e) {
        mrcLogError(e, "mrcMaximizeFields()");
    }
}

function mrcOpenPreferences(event) {
    /*
     * call-back for button 'Preferences'
     * Open mrcCompose's preferences window
     *
     */
    try {
        window.openDialog('chrome://mrc_compose/content/options.xul',' My Option Dialog','chrome,toolbar');
    } catch (e) {
        mrcLogError(e, "mrcOpenPreferences()");
    }
}
