/* ***** BEGIN LICENSE BLOCK *****
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * ***** END LICENSE BLOCK ***** */

if (!ch) var ch = {};
if (!ch.velox) ch.velox = {};
if (!ch.velox.tww) ch.velox.tww = {};

window.addEventListener("load", function() {

function toggleWordWrap()
{
  if (!gMsgCompose || gMsgCompose.composeHTML)
    return;

  if (gMsgCompose.editor.QueryInterface(Ci.nsIPlaintextEditor).wrapWidth > 0) {
    try {
      gMsgCompose.editor.QueryInterface(Ci.nsIPlaintextEditor).wrapWidth = 0
    }
    catch (e) { }
  } else {
    try {
      gMsgCompose.editor.QueryInterface(Ci.nsIPlaintextEditor).wrapWidth = gMsgCompose.wrapLength;
    }
    catch (e) { }
  }
}

function checkToggleWordWrapMenuEntry()
{
  if (!gMsgCompose || gMsgCompose.composeHTML) {
    document.getElementById("menu_togglewordwrap")
            .setAttribute('disabled', true);
  } else {
    document.getElementById("menu_togglewordwrap")
            .setAttribute('checked',gMsgCompose.editor
            .QueryInterface(Ci.nsIPlaintextEditor).wrapWidth == 0 ?
            false : true);
    document.getElementById("menu_togglewordwrap")
            .setAttribute('disabled', false);
  }
}

function checkTogglePreWrapContextMenuEntry()
{
  /* only needed for Thunderbird/Seamonkey - display an entry in the
   * context menu if the message body is shown in HTML mode
   */
  if (Services.prefs.getPrefType("mailnews.display.prefer_plaintext")
        == Services.prefs.PREF_BOOL
      && !Services.prefs.getBoolPref("mailnews.display.prefer_plaintext")) {
    document.getElementById("context-toggleprewrap").setAttribute('hidden', false);
    document.getElementById("context-toggleprewrap").setAttribute('checked',
      window.content.document.getElementById("toggleprewrap") ? true : false);
  } else {
    document.getElementById("context-toggleprewrap").setAttribute('hidden', true);
  }
}

function togglePreWrap()
{
  // if it's Thunderbird in plain text mode, then don't do anything
  if (Services.appinfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}"
      && Services.prefs.getPrefType("mailnews.display.prefer_plaintext")
         == Services.prefs.PREF_BOOL
      && Services.prefs.getBoolPref("mailnews.display.prefer_plaintext")) {
    return;
  }

  /* Firefox 39 and later: use the Message manager (multiprocess)
   * https://developer.mozilla.org/en-US/Firefox/Multiprocess_Firefox/Message_Manager
   */
  if (Services.mm && typeof gBrowser != "undefined") {
    gBrowser.selectedBrowser.messageManager.
             loadFrameScript("chrome://togglewordwrap/content/togglePreWrapFS.js", false);
    return;
  }

  var elem = window.content.document.getElementById("toggleprewrap");
  var mtpw = document.getElementById("menu_toggleprewrap");
  if (elem) {
    elem.parentNode.removeChild(elem);
    /* for Thunderbird, we only add a context menu,
     * so the "menu_toggleprewrap" element might not exist
     */
    if (mtpw) mtpw.setAttribute('checked', false);
  } else {
    var headElem = window.content.document.getElementsByTagName("head")[0];
    if (!headElem) {
      if (mtpw) mtpw.setAttribute('disabled', true);
      document.getElementById("context-toggleprewrap").setAttribute('disabled', true);
      return;
    }
    elem = window.content.document.createElement("style");
    elem.id = "toggleprewrap";
    elem.type = "text/css";
    elem.innerHTML = "pre { white-space: pre-wrap !important; word-break: break-all !important; } /* inserted by the Toggle Word Wrap extension */";
    headElem.appendChild(elem);
    if (mtpw) mtpw.setAttribute('checked', true);
  }
}

function checkTogglePreWrapMenuEntry()
{
  // classic code: for Firefox 38 and earlier, Thunderbird and Seamonkey

  var mtpw = document.getElementById("menu_toggleprewrap");
  var ctpw = document.getElementById("context-toggleprewrap");

  /* we don't want to show the menu entry in the
   * mail-related "View" menus
   */
  if (/(messenger(compose)?|messageWindow)\.xul$/.test(document.location)) {
    if (mtpw) mtpw.setAttribute('hidden', true);
    return;
  }

  // figure out if PRE wrapping is currently active or not
  var elem = window.content.document.getElementById("toggleprewrap");
  if (elem) {
    if (mtpw) mtpw.setAttribute('checked', true);
    if (ctpw) ctpw.setAttribute('checked', true);
  } else {
    if (mtpw) mtpw.setAttribute('checked', false);
    if (ctpw) ctpw.setAttribute('checked', false);
  }
  // if there's no head element, then we can't do anything useful... disable the item
  if (window.content.document.getElementsByTagName("head")[0]) {
    if (mtpw) mtpw.setAttribute('disabled', false);
    if (ctpw) ctpw.setAttribute('disabled', false);
  } else {
    if (mtpw) mtpw.setAttribute('disabled', true);
    if (ctpw) ctpw.setAttribute('disabled', true);
  }
}

function checkTogglePreWrapMenuEntryMM()
{
  // Firefox 39 and later: use the Message manager...
  if (Services.mm && typeof gBrowser != "undefined") {
    gBrowser.selectedBrowser.messageManager.
             addMessageListener("tpw-state", setTogglePreWrapMenuEntryMM);
    // since it's a very short script, specify inline with a data: URL
    gBrowser.selectedBrowser.messageManager.
             loadFrameScript('data:,sendSyncMessage("tpw-state", { enabled: (content.document.getElementById("toggleprewrap")) ? true : false } );', false);
  } else {
    // ... otherwise, fall back to the classic code
    checkTogglePreWrapMenuEntry();
  }
}

function setTogglePreWrapMenuEntryMM(message)
{
  /* Callback in the chrome process which processes the result
   * of the frame script loaded in checkTogglePreWrapMenuEntryMM()
   */
  gBrowser.selectedBrowser.messageManager.
           removeMessageListener("tpw-state", setTogglePreWrapMenuEntryMM);
  // adjust the menu states (tick marks)
  document.getElementById("menu_toggleprewrap").
           setAttribute("checked", message.data.enabled);
  document.getElementById("context-toggleprewrap").
           setAttribute("checked", message.data.enabled);
}

/* Replace GenericSendMessage() with a wrapper which makes sure that
 * "format=flowed" is not added when word wrapping has been disabled.
 * nsMsgCompUtils.cpp would do this even if wrapWidth has been set to 0
 * (and a message body with lines of more than 78 characters - something
 * which SHOULDn't really happen according to RFC 3676, but anyway...).
 * We therefore disable mailnews.send_plaintext_flowed temporarily, where
 * applicable.
 */
if (typeof GenericSendMessage == "function")
{
  var _GenericSendMessage = GenericSendMessage;
  GenericSendMessage = function(msgType)
  {
    const kTextFlowed = "mailnews.send_plaintext_flowed";
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefBranch);

    if (gMsgCompose && !gMsgCompose.composeHTML
        && !gMsgCompose.editor.QueryInterface(Ci.nsIPlaintextEditor).wrapWidth
        && prefs.getBoolPref(kTextFlowed)) {
      Services.console.logStringMessage("Toggle Word Wrap: temporarily disabling " + kTextFlowed);
      prefs.setBoolPref(kTextFlowed, false);
      _GenericSendMessage(msgType);
      prefs.setBoolPref(kTextFlowed, true);
      Services.console.logStringMessage("Toggle Word Wrap: " + kTextFlowed + " re-enabled");
    } else {
      _GenericSendMessage(msgType);
    }
  }
}

/* add our checkXYZ() functions to the relevant menus
 * format of the entries:  "menu_id : name_of_handler"
 */
var cmds = {
  // Thunderbird and Seamonkey
  optionsMenuPopup: checkToggleWordWrapMenuEntry,
  // Thunderbird and Seamonkey (message window)
  appmenu_View_Popup: checkTogglePreWrapMenuEntry,
  mailContext: checkTogglePreWrapContextMenuEntry,
  // Firefox
  menu_viewPopup: checkTogglePreWrapMenuEntryMM,
  // Seamonkey (browser window)
  menu_View_Popup: checkTogglePreWrapMenuEntry,
  // Firefox and Seamonkey (browser window)
  contentAreaContextMenu: checkTogglePreWrapMenuEntryMM
};
for (var id in cmds) {
  var elem = document.getElementById(id);
  if (elem)
    elem.addEventListener("popupshowing", cmds[id], true);
}

// functions we reference in toggleWordWrap.xul
ch.velox.tww.toggleWordWrap = toggleWordWrap;
ch.velox.tww.togglePreWrap = togglePreWrap;

}, false);
