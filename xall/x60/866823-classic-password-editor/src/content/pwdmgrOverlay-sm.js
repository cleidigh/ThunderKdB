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

document.addEventListener(
  "DOMContentLoaded",
  function dclHandler (ev) {
    cpEditor.genStrBundle =
      document.getElementById("classicpwdedit-gen-stringbundle");
    cpEditor.pmoStrBundle =
      document.getElementById("classicpwdedit-overlay-stringbundle");
    document.removeEventListener("DOMContentLoaded", dclHandler, false);
  },
  false);

window.addEventListener(
  "load",
  function _loadHandler () {
    var menuBtnAnon =
      document.getAnonymousNodes(document.getElementById("cpeMenuBtn"));
    var innerBtn = menuBtnAnon[1], dropMarker = menuBtnAnon[2];
    innerBtn.removeAttribute("class");
    dropMarker.removeAttribute("class");
    var innerBtnCS = getComputedStyle(innerBtn),
        dropMarkerStl = dropMarker.style;
    dropMarkerStl.marginTop = innerBtnCS.marginTop;
    dropMarkerStl.marginBottom = innerBtnCS.marginBottom;
    window.removeEventListener("load", _loadHandler, false);
  },
  false);

document.getElementById("passwordsTree").addEventListener(
  "select",
  () => {
    var selections = gDataman.getTreeSelections(gPasswords.tree);
    if (selections.length > 0) {
      document.getElementById("edit_signon").removeAttribute("disabled");
      document.getElementById("visit_site").removeAttribute("disabled");
      document.getElementById("cpeMenuBtn_editSignon").
        removeAttribute("disabled");
      if (!cpEditor.userChangedMenuBtn) {
        document.getElementById("cpeMenuBtn").command = "edit_signon";
        document.getElementById("cpeMenuBtn").
          setAttribute("icon", "properties");
      }
    } else if (!cpEditor.refreshing) {
      document.getElementById("cpeMenuBtn").command = "new_signon";
      document.getElementById("cpeMenuBtn").setAttribute("icon", "add");
      document.getElementById("edit_signon").setAttribute("disabled", "true");
      document.getElementById("visit_site").setAttribute("disabled", "true");
      document.getElementById("cpeMenuBtn_editSignon").
        setAttribute("disabled", "true");
      cpEditor.userChangedMenuBtn = false;
    }

    if (selections.length == 1) {
      document.getElementById("clone_signon").removeAttribute("disabled");
      document.getElementById("cpeMenuBtn_cloneSignon").
        removeAttribute("disabled");
    } else if (!cpEditor.refreshing) {
      document.getElementById("clone_signon").
        setAttribute("disabled", "true");
      document.getElementById("cpeMenuBtn_cloneSignon").
        setAttribute("disabled", "true");
    }
  },
  false);

var cpEditor = {
  prefs: Components.classes["@mozilla.org/preferences-service;1"].
         getService(Components.interfaces.nsIPrefService).
         getBranch("extensions.classicpasswordeditor."),

  userChangedMenuBtn: false,
  refreshing: false,

  menuBtnSel: function (ev, elem) {
    var mb = document.getElementById("cpeMenuBtn");
    switch(elem.id) {
    case "cpeMenuBtn_editSignon":
      mb.command = "edit_signon";
      mb.setAttribute("icon", "properties");
      this.editSignon();
      break;

    case "cpeMenuBtn_cloneSignon":
      mb.command = "clone_signon";
      mb.removeAttribute("icon");
      this.cloneSignon();
      break;

    case "cpeMenuBtn_newSignon":
      mb.command = "new_signon";
      mb.setAttribute("icon", "add");
      this.newSignon();
      break;
    }

    this.userChangedMenuBtn = true;
    ev.stopPropagation();
  },

  mcbWrapper: function (method) {
    return () => method.apply(this, arguments);
  },

  showErrorAlert: function (e) {
    let prompt = Components.classes["@mozilla.org/prompter;1"].
        getService(Components.interfaces.nsIPromptFactory).
        getPrompt(window.top, Components.interfaces.nsIPrompt),
      bag = prompt.QueryInterface(
        Components.interfaces.nsIWritablePropertyBag2);
    bag.setPropertyAsBool("allowTabModal", true);
    prompt.alert(this.genStrBundle.getString("error"),
                 this.pmoStrBundle.getFormattedString("badnewentry",
                                                      [e.message]));
  },

  CPE_WINDOW_NAME: "danieldawson:classicpasswordeditor",

  openCPEDialog: function (signon, mode, showingPasswords, ret) {
    var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].
      getService(Components.interfaces.nsIWindowWatcher);
    var oldWin = ww.getWindowByName(this.CPE_WINDOW_NAME, null);
    if (!oldWin)
      return window.openDialog(
        "chrome://classicpasswordeditor/content/pwdedit.xul",
        this.CPE_WINDOW_NAME, "centerscreen,dependent,dialog,chrome",
        signon, mode, showingPasswords, ret);
    else {
      oldWin.focus();
      return oldWin;
    }
  },

  _makeLoginInfo: props => {
    var li =
      Components.classes["@mozilla.org/login-manager/loginInfo;1"].
      createInstance(Components.interfaces.nsILoginInfo);
    li.init(props.hostname, props.formSubmitURL, props.httpRealm,
            props.username, props.password, props.usernameField,
            props.passwordField);
    return li;
  },

  _mergeSignonProps: function (oldSignon, newProps) {
    var merged = {};
    for (let prop in newProps)
      if (newProps[prop] === undefined)
        merged[prop] = oldSignon[prop];
      else
        merged[prop] = newProps[prop];

    return this._makeLoginInfo(merged);
  },

  editSignon: function () {
    var selections = gDataman.getTreeSelections(gPasswords.tree);
    if (selections.length == 0) return;
    var selSignons =
      selections.map(el => gPasswords.displayedSignons[el]);

    this.openCPEDialog(selSignons, 1, gPasswords.showPasswords,
                       { newSignon: null, callback: newSignon => {
      try {
        for (let i = 0; i < selSignons.length; i++)
          this.loginSvc.modifyLogin(
            selSignons[i], this._mergeSignonProps(selSignons[i], newSignon));
        this.refreshing = true;
        gPasswords.initialize();
        for (let i = 0; i < selections.length; i++)
          gPasswords.tree.view.selection.toggleSelect(selections[i]);
        this.refreshing = false;
      } catch (e) {
        window.setTimeout(this.mcbWrapper(this.showErrorAlert), 0, e)
      }
    }});
  },

  cloneSignon: function () {
    var selections = gDataman.getTreeSelections(gPasswords.tree);
    if (selections.length != 1) return;
    var signon = gPasswords.displayedSignons[selections[0]];

    this.openCPEDialog([signon], 2, gPasswords.showPasswords,
                       { newSignon: null, callback: newSignon => {
      try {
        var newLI = this._makeLoginInfo(newSignon);
        this.loginSvc.addLogin(newLI);
      } catch (e) {
        window.setTimeout(this.mcbWrapper(this.showErrorAlert), 0, e);
      }
    }});
  },

  newSignon: function () {
    this.openCPEDialog([], 0, gPasswords.showPasswords,
                       { newSignon: null, callback: newSignon => {
      try {
        var newLI = this._makeLoginInfo(newSignon);
        this.loginSvc.addLogin(newLI);
      } catch (e) {
        window.setTimeout(this.mcbWrapper(this.showErrorAlert), 0, e);
      }
    }});
  },

  visitSite: function () {
    var selections = gDataman.getTreeSelections(gPasswords.tree);
    if (selections.length == 0) return;
    var selSignons =
      selections.map(el => gPasswords.displayedSignons[el]);

    var curWin =
        Components.classes["@mozilla.org/appshell/window-mediator;1"].
        getService(Components.interfaces.nsIWindowMediator).
        getMostRecentWindow("navigator:browser");

    let error = false;
    for (let signon of selSignons) {
      try {
        curWin.openURL(signon.hostname);
      } catch (e if e.name == "NS_ERROR_MALFORMED_URI") {
        error = true;
      }
    }

    if (error) {
      Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Components.interfaces.nsIPromptService).
        alert(window, this.genStrBundle.getString("error"),
              this.pmoStrBundle.getString(
                selSignons.length == 1 ? "badurl" : "badmulturl"));
    }
  },
};

XPCOMUtils.defineLazyServiceGetter(cpEditor, "loginSvc",
                                   "@mozilla.org/login-manager;1",
                                   "nsILoginManager");
