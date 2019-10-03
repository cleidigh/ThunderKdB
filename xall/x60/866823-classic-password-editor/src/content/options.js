/*
    Classic Password Editor, extension for Gecko applications
    Copyright (C) 2018  Daniel Dawson <danielcdawson@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

const Cc = Components.classes, Ci = Components.interfaces,
  Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");

var prefs = Services.prefs.getBranch("extensions.classicpasswordeditor.");

const $ = aEl => document.getElementById(aEl);

addEventListener(
  "load",
  () => {
    $("captureMode-label").style.visibility = "hidden";
    for (let idBase of
         ["displayMenuitem", "promptforctxmenudelete", "preselectCurrentSite",
          "alwaysShowPasswords", "alwaysPromptForMasterPassword"]) {
      let el = $(idBase + "-cb");
      el.checked = prefs.getBoolPref(el.getAttribute("pref"));
    }

    for (let idBase of
         ["renameMenuitemTo", "openspShortcutModifiers",
          "openspShortcutKey",]) {
      let el = $(idBase + "-text");
      el.value = prefs.getCharPref(el.getAttribute("pref"));
    }

    document.querySelectorAll("input[name=passwordfield-rg]")
    [prefs.getIntPref("showpassword")].checked = true;

    toggle_displayMenuitem();
    toggle_alwaysShowPasswords();
  },
  false);

addEventListener(
  "input",
  aEvt => {
    let t = aEvt.target;
    if (t.tagName == "input" && t.type == "text") {
      let p = t.getAttribute("pref");
      if (!p) return;
      prefs.setCharPref(p, t.value);
    }
  },
  false);

addEventListener(
  "click",
  aEvt => {
    let t = aEvt.target;
    if (t.tagName == "input") {
      let p = t.getAttribute("pref");
      if (!p) return;

      switch (t.type) {
      case "checkbox":
        prefs.setBoolPref(p, t.checked);
        break;

      case "radio":
        prefs.setIntPref(p, t.value);
        break;
      }
    }
  },
  false);

var keycodesToSymbols = {}, symbolsToKeycodes = {};
{
  let setupKeycodeTable = [
      0, "",
      3, "CANCEL",
      6, "HELP",
      8, "BACK_SPACE",
      9, "TAB",
     12, "CLEAR", "RETURN", "ENTER",
     16, "SHIFT", "CONTROL", "ALT", "PAUSE", "CAPS_LOCK",
     27, "ESCAPE",
     32, "SPACE", "PAGE_UP", "PAGE_DOWN", "END", "HOME", "LEFT", "UP", "RIGHT",
         "DOWN", "SELECT", "PRINT", "EXECUTE", "PRINTSCREEN", "INSERT",
         "DELETE",
     93, "CONTEXT_MENU",
     96, "NUMPAD0", "NUMPAD1", "NUMPAD2", "NUMPAD3", "NUMPAD4", "NUMPAD5",
         "NUMPAD6", "NUMPAD7", "NUMPAD8", "NUMPAD9", "MULTIPLY", "ADD",
         "SEPARATOR", "SUBTRACT", "DECIMAL", "DIVIDE",
         "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11",
         "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F21",
         "F22", "F23", "F24",
    144, "NUM_LOCK", "SCROLL_LOCK",
  ];

  let i = 0, keycode = 0;
  while (i < setupKeycodeTable.length) {
    let elem = setupKeycodeTable[i];
    let elemNum = parseInt(elem);
    if (!isNaN(elemNum)) {
      i++;
      keycode = elemNum;
      continue;
    }
    keycodesToSymbols[keycode] = elem;
    symbolsToKeycodes[elem] = keycode;
    i++;
    keycode++;
  }
}

function start_key_capture (aEvt) {
  $("captureMode-label").style.visibility = "visible";
  let btn = $("opensp_keypressrecv");
  btn.addEventListener("keypress", keycapture, false);
  btn.focus();
}

function keycapture (evt) {
  var modifiers = [];
  [["ctrlKey", "control"], ["altKey", "alt"],
   ["metaKey", "meta"], ["shiftKey", "shift"]].forEach(
    m => { if (evt[m[0]]) modifiers.push(m[1]); });
  modifiers = modifiers.join(",");

  if (evt.charCode == 0 || evt.location == 3 /* keypad */)
    var char = keycodesToSymbols[evt.keyCode];
  else
    var char = String.fromCharCode(evt.charCode);
  var modTxt = $("openspShortcutModifiers-text"),
      keyTxt = $("openspShortcutKey-text");
  modTxt.value = modifiers;
  var inpEvt = document.createEvent("Event");
  inpEvt.initEvent("input", true, true);
  modTxt.dispatchEvent(inpEvt);
  keyTxt.value = char;
  inpEvt = document.createEvent("Event");
  inpEvt.initEvent("input", true, true);
  keyTxt.dispatchEvent(inpEvt);

  evt.stopPropagation();
  $("captureMode-label").style.visibility = "hidden";
  $("opensp_keypressrecv").
    removeEventListener("keypress", keycapture, false);
  $("opensp_shortcut_capture-btn").focus();
}

function toggle_displayMenuitem () {
  let rmi_lbl = $("renameMenuitemTo-label"),
      rmi_text = $("renameMenuitemTo-text");
  if ($("displayMenuitem-cb").checked)
    for (let el of [rmi_lbl, rmi_text])
      el.removeAttribute("disabled");
  else
    for (let el of [rmi_lbl, rmi_text])
      el.setAttribute("disabled", "true");
}

function toggle_alwaysShowPasswords () {
  let fp_ck = $("alwaysPromptForMasterPassword-cb"),
      fp_ck_lbl = $("alwaysPromptForMasterPassword-label"),
      sp_rg_bases = ["alwayshide", "alwaysshow", "rememberlast",
                     "followspwin"];

  if ($("alwaysShowPasswords-cb").checked) {
    for (let el of [fp_ck, fp_ck_lbl]) el.removeAttribute("disabled");
    for (let idBase of sp_rg_bases)
      for (let id of [`passwordfield_${idBase}-rb`,
                      `passwordfield_${idBase}-label`])
        $(id).setAttribute("disabled", "true");
  } else {
    for (let el of [fp_ck, fp_ck_lbl]) el.setAttribute("disabled", "true");
    for (let idBase of sp_rg_bases)
      for (let id of [`passwordfield_${idBase}-rb`,
                      `passwordfield_${idBase}-label`])
        $(id).removeAttribute("disabled");
  }
}

let msgbar_focus = "", msgbar_mouse = "";

addEventListener(
  "focusin",
  aEvt => {
    let t = aEvt.target;
    if (t.hasAttribute("title")) {
      msgbar_focus = t.getAttribute("title");
      $("msgbar").textContent = msgbar_focus;
    }
  },
  false);

addEventListener(
  "focusout",
  aEvt => {
    msgbar_focus = "";
    $("msgbar").textContent = msgbar_focus;
  },
  false);

addEventListener(
  "mouseover",
  aEvt => {
    let t = aEvt.target;
    if (!t.hasAttribute("title") && t.tagName == "label") {
      t = $(t.getAttribute("for"));
      if (!t) return;
    }

    if (t.hasAttribute("title")) {
      msgbar_mouse = t.getAttribute("title");
      $("msgbar").textContent = msgbar_mouse;
    }
  },
  false);

addEventListener(
  "mouseout",
  aEvt => {
    msgbar_mouse = "";
    $("msgbar").textContent = msgbar_focus;
  },
  false);
