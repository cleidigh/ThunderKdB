/*
    Classic Password Editor, extension for Gecko applications
    Copyright (C) 2017  Daniel Dawson <danielcdawson@gmail.com>

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

const $ = aEl => document.getElementById(aEl);

const Cc = Components.classes,
      Ci = Components.interfaces,
      prefs = Cc["@mozilla.org/preferences-service;1"].
              getService(Ci.nsIPrefService).
              getBranch("extensions.classicpasswordeditor."),
      THUNDERBIRD = "{3550f703-e582-4d05-9a08-453d09bdfdc6}",
      CONKEROR = "{a79fe89b-6662-4ff4-8e88-09950ad4dfde}";

var pwdCurHidden, genStrBundle, peStrBundle, haveOldSignon,
    oldSignons, editorMode, loginForms, curLoginIdx, oldUsername, oldPassword;

window.addEventListener(
  "DOMContentLoaded",
  function dclHandler (ev) {
    var pwdField = $("password_text");
    pwdCurHidden = (pwdField.type == "password");
    pwdField.setAttribute("type", "password");
    window.removeEventListener("DOMContentLoaded", dclHandler, false);
  },
  false);

window.addEventListener(
  "load",
  function loadHandler (ev) {
    genStrBundle = $("general-string-bundle");
    peStrBundle = $("pwdedit-string-bundle");

    oldSignons = window.arguments[0];
    editorMode = window.arguments[1];

    haveOldSignon = oldSignons.length > 0;
    if (!haveOldSignon)
      oldSignons[0] = { hostname: "", formSubmitURL: "", httpRealm: "",
                        username: "", password: "", usernameField: "",
                        passwordField: "" };

    if (editorMode == 0)
      $("header").setAttribute("title", peStrBundle.getString("newlogin"));
    else if (editorMode == 2)
      $("header").setAttribute("title", peStrBundle.getString("clonelogin"));
    else
      $("header").setAttribute(
        "title", peStrBundle.getString(oldSignons.length > 1 ? "editmultlogin"
                                                           : "editlogin"));

    var compositeSignon = intersectSignonProps(oldSignons);

    var props = [ "hostname", "formSubmitURL", "httpRealm",
                  "username", "password", "usernameField", "passwordField" ];
    for (let propName of props) {
      let tbox = $(propName + "_text");
      if (compositeSignon[propName] !== undefined) {
        tbox.indefinite = false;
        tbox.autoreindef = false;
        tbox.value = compositeSignon[propName];
      } else {
        tbox.indefinite = true;
        tbox.autoreindef = true;
      }
    }

    if (oldSignons.length > 1) {
      $("type_group").style.display = "none";
      $("type_caption").style.display = "none";

      let haveWebLogin = false, haveAnnotatedLogin = false;
      for (let i = 0; i < oldSignons.length; i++) {
        if (oldSignons[i].httpRealm)
          haveAnnotatedLogin = true;
        else
          haveWebLogin = true;
      }

      if (haveAnnotatedLogin)
        $("formSubmitURL_lbl").disabled = $("formSubmitURL_text").disabled =
          true;
      if (haveWebLogin)
        $("httpRealm_lbl").disabled = $("httpRealm_text").disabled =
          true;

    } else {
      let type;
      if (!oldSignons[0].httpRealm)
        type = 0;
      else
        type = 1;
      $("type_group").selectedIndex = type;

      handle_typeSelect();

      if (editorMode == 1)
        $("type_group").disabled = true;
    }

    window.setTimeout(afterLoadHandler, 1);
    window.removeEventListener("load", loadHandler, false);
  },
  false);

function afterLoadHandler () {
  var pwdShownInSPWin = window.arguments[2];
  var alwaysShowPwds = prefs.getBoolPref("always_show_passwords");
  var showpwd = prefs.getIntPref("showpassword");
  var pwdField = $("password_text");
  var showpwdButton = $("showPassword_btn");
  var hidepwdButton = $("hidePassword_btn");

  if (alwaysShowPwds && (pwdShownInSPWin || (haveOldSignon ? login() : true)))
    pwdCurHidden = false;
  else switch (showpwd) {
  case 0:
    pwdCurHidden = true;
    break;
  case 1:
    if (pwdShownInSPWin || (haveOldSignon ? login() : true))
      pwdCurHidden = false;
    break;
  case 2:
    if (!pwdCurHidden && !pwdShownInSPWin
        && (haveOldSignon ? !login() : false))
      pwdCurHidden = true;
    break;
  case 3:
    pwdCurHidden = !pwdShownInSPWin;
    break;
  }
  if (!pwdCurHidden) pwdField.removeAttribute("type");

  if (pwdField.hasAttribute("type") && pwdField.type == "password") {
    showpwdButton.hidden = false;
    hidepwdButton.hidden = true;
  } else {
    showpwdButton.hidden = true;
    hidepwdButton.hidden = false;
  }
}

function intersectSignonProps (aSignons) {
  const intersection = {};
  const propList = [ "hostname", "formSubmitURL", "httpRealm", "username",
                     "password", "usernameField", "passwordField" ];
  for (let signon of aSignons) {
    for (let prop of propList) {
      if (!intersection.hasOwnProperty(prop))
        intersection[prop] = signon[prop] !== undefined ? signon[prop] : null;
      else if (signon[prop] != intersection[prop])
        intersection[prop] = undefined;
    }
  }

  return intersection;
}

function login () {
  var token = Components.classes["@mozilla.org/security/pk11tokendb;1"].
                createInstance(Components.interfaces.nsIPK11TokenDB).
                getInternalKeyToken();
  if (!token.checkPassword("")) {
    try {
      token.login(true);
    } catch (e) { }
    return token.isLoggedIn();
  }
  return true;
}

function handle_typeSelect () {
  var idx = $("type_group").selectedIndex;
  if (idx == 0) {
    $("formSubmitURL_lbl").disabled = $("formSubmitURL_text").disabled =
      $("usernameField_lbl").disabled = $("usernameField_text").disabled =
      $("passwordField_lbl").disabled = $("passwordField_text").disabled =
      $("guessFromPage_btn").disabled = false;
    $("httpRealm_lbl").disabled = $("httpRealm_text").disabled = true;
  } else {
    $("formSubmitURL_lbl").disabled = $("formSubmitURL_text").disabled =
      $("usernameField_lbl").disabled = $("usernameField_text").disabled =
      $("passwordField_lbl").disabled = $("passwordField_text").disabled =
      $("guessFromPage_btn").disabled = true;
    $("httpRealm_lbl").disabled = $("httpRealm_text").disabled = false;
  }
}

function togglePasswordView () {
  var focusTarget;
  var pwdField = $("password_text");
  var showpwdButton = $("showPassword_btn");
  var hidepwdButton = $("hidePassword_btn");
  if (pwdField.type == "password") {
    if (pwdField.value != "" && !login()) return;
    pwdField.removeAttribute("type");
    showpwdButton.hidden = true;
    hidepwdButton.hidden = false;
    focusTarget = hidepwdButton;
  } else {
    pwdField.setAttribute("type", "password");
    showpwdButton.hidden = false;
    hidepwdButton.hidden = true;
    focusTarget = showpwdButton;
  }

  window.setTimeout(() => { focusTarget.focus(); }, 1);
}

function guessParameters () {
  // Locate the message manager for the last seen tab
  var browserMM =
    Cc["@mozilla.org/appshell/window-mediator;1"]
    .getService(Ci.nsIWindowMediator).getMostRecentWindow("navigator:browser")
    .gBrowser.selectedBrowser.messageManager;

  // Save existing username and password in editor
  oldUsername = $("username_text").value;
  oldPassword = $("password_text").value;

  // Ask frame script to find login form(s)
  var resultHandler = {
    receiveMessage ({ data: aLoginForms }) {
      browserMM.removeMessageListener(
        "ClassicPasswordEditor:loginformsresults", resultHandler);

      if (aLoginForms.length == 0) {
        Cc["@mozilla.org/embedcomp/prompt-service;1"].
          getService(Ci.nsIPromptService).
          alert(window, genStrBundle.getString("error"),
                peStrBundle.getString("nologinform"));
        return;
      }

      if (aLoginForms.length > 1) {
        $("prevForm_btn").hidden = false;
        $("nextForm_btn").hidden = false;
      } else {
        $("prevForm_btn").hidden = true;
        $("nextForm_btn").hidden = true;
      }

      loginForms = aLoginForms;
      _fillFromForm(0);
    },
  };

  browserMM.addMessageListener(
    "ClassicPasswordEditor:loginformsresults", resultHandler);
  browserMM.sendAsyncMessage("ClassicPasswordEditor:scanforloginforms");
}

function _fillFromForm (aIdx) {
  curLoginIdx = aIdx;
  var loginForm = loginForms[aIdx];
  $("hostname_text").value = loginForm.hostname;
  $("formSubmitURL_text").value = loginForm.formSubmitURL;
  $("usernameField_text").value = loginForm.usernameField;
  $("passwordField_text").value = loginForm.passwordField;
  if (loginForm.password == "") {
    $("username_text").value = oldUsername;
    $("password_text").value = oldPassword;
  } else {
    $("username_text").value = loginForm.username;
    $("password_text").value = loginForm.password;
  }

  for (let prfx of ["hostname", "formSubmitURL", "username", "password",
                         "usernameField", "passwordField"]) {
    let chgEvt = document.createEvent("Event");
    chgEvt.initEvent("change", true, true);
    $(prfx + "_text").dispatchEvent(chgEvt);
  }

  if (curLoginIdx == 0)
    $("prevForm_btn").disabled = true;
  else
    $("prevForm_btn").disabled = false;

  if (curLoginIdx == loginForms.length - 1)
    $("nextForm_btn").disabled = true;
  else
    $("nextForm_btn").disabled = false;
}

function prevForm () {
  if (curLoginIdx > 0) _fillFromForm(curLoginIdx - 1);
}

function nextForm () {
  if (curLoginIdx < loginForms.length - 1) _fillFromForm(curLoginIdx + 1);
}

function setNewSignon () {
  var hostname = $("hostname_text"),
      formSubmitURL = $("formSubmitURL_text"),
      httpRealm = $("httpRealm_text"),
      username = $("username_text"),
      password = $("password_text"),
      usernameField = $("usernameField_text"),
      passwordField = $("passwordField_text");
  var newProps = {
    hostname: hostname.qvalue,
    username: username.qvalue,
    password: password.qvalue,
  };

  if (oldSignons.length > 1)
    var type = -1;
  else
    var type = $("type_group").selectedIndex;

  if (type == -1) {
    newProps.formSubmitURL =
      formSubmitURL.indefinite ? undefined : formSubmitURL.disabled ? null :
      formSubmitURL.qvalue;
    newProps.httpRealm =
      httpRealm.indefinite ? undefined : httpRealm.disabled ? null :
      httpRealm.qvalue;
    newProps.usernameField =
      usernameField.indefinite ? undefined : usernameField.qvalue;
    newProps.passwordField =
      passwordField.indefinite ? undefined : passwordField.qvalue;
  } else if (type == 0) {
    newProps.formSubmitURL = formSubmitURL.qvalue;
    newProps.httpRealm = null;
    newProps.usernameField = usernameField.qvalue;
    newProps.passwordField = passwordField.qvalue;
  } else {
    newProps.formSubmitURL = null;
    newProps.httpRealm = httpRealm.qvalue;
    newProps.usernameField = newProps.passwordField = "";
  }

  if (!newProps.hostname && newProps.hostname !== undefined) {
    Cc["@mozilla.org/embedcomp/prompt-service;1"].
      getService(Ci.nsIPromptService).
      alert(window, genStrBundle.getString("error"),
            peStrBundle.getString("emptyhost"));
    return false;
  }

  if ((type == 0 && !newProps.formSubmitURL
       && newProps.formSubmitURL !== undefined)
      || (type == 1 && !newProps.httpRealm
          && newProps.httpRealm !== undefined)) {
    Cc["@mozilla.org/embedcomp/prompt-service;1"].
      getService(Ci.nsIPromptService).
      alert(window, genStrBundle.getString("error"),
            peStrBundle.getString("emptysecondary"));
    return false;
  }

  if (oldSignons.length > 1 && newProps.hostname !== undefined
      && newProps.httpRealm !== undefined
      && newProps.username !== undefined
      && (newProps.formSubmitURL !== undefined
          || newProps.httpRealm !== undefined)) {
    Cc["@mozilla.org/embedcomp/prompt-service;1"].
      getService(Ci.nsIPromptService).
      alert(window, genStrBundle.getString("error"),
            peStrBundle.getString("multduplogins"));
    return false;
  }

  if (window.arguments[3].callback) {
    let parentWindow = null;
    if (window.arguments[3].parentWindow)
      parentWindow = window.arguments[3].parentWindow;
    window.arguments[3].callback(newProps, parentWindow);
  } else
    window.arguments[3].newSignon = newProps;

  return true;
}
