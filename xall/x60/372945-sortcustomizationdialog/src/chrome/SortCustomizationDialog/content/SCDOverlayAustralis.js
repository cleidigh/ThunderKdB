/*# -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Mozilla Communicator client code, released
# March 31, 1998.
#
# The Initial Developer of the Original Code is
# Netscape Communications Corporation.
# Portions created by the Initial Developer are Copyright (C) 1998-1999
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Joachim Herb <joachim.herb@gmx.de>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/

if (typeof org_mozdev_SortCustomizationDialog == "undefined") {
  var org_mozdev_SortCustomizationDialog = {};
};

Components.utils.import("chrome://SortCustomizationDialog/content/addonLookup.jsm",
                        org_mozdev_SortCustomizationDialog);

org_mozdev_SortCustomizationDialog.Overlay = function() {
  var pub = {};

  var gFilter = null;
  var gToolbox;
  var gVisiblePalette = new Object;

  var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                  .getService(Components.interfaces.nsIConsoleService);
  var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                             .getService(Components.interfaces.nsIPrefService)
                             .getBranch("extensions.SortCustomizationDialog.");

  function debugLog(str) {
    if (prefBranch.getBoolPref("debugLog"))
      aConsoleService.logStringMessage(Date() + " SCD: " + str);
  }

  function get_url_prefix(aButton) {
    let reg = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                        .getService(Components.interfaces["nsIChromeRegistry"]);
    if (aButton.nodeName != "toolbarbutton") {
      let firstButton = aButton.getElementsByTagName("toolbarbutton");
      if (firstButton && firstButton[0] &&
          firstButton[0].nodeName == "toolbarbutton")
        aButton = firstButton[0];
    }
    let res = "";
    try {
      let imageURL;

      if (aButton.hasAttribute("image")) {
        imageURL = aButton.getAttribute("image");
      }
      if (!imageURL) {
        imageURL = window.getComputedStyle(aButton, null).listStyleImage;
      }
//      debugLog("imageURL: " + imageURL);

      let imageURIs = imageURL.match(/url\(\"(.*)\"\)$/);
//      debugLog("test: " + imageURIs);
      let imageURI;
      if (imageURIs) {
        imageURI = imageURIs[1];
      } else {
        imageURI = imageURL;
      }

//      debugLog("imageURL: " + imageURI);
      let ios = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces["nsIIOService"]);
      let uri;
      let uriSpec;

      if (imageURI.indexOf("chrome://") >= 0) {
        uri = ios.newURI(imageURI, null, null);
        uriSpec = reg.convertChromeURL(uri).spec
      } else {
        uriSpec = imageURI;
      }

//      debugLog("uri: " + uriSpec);
      let url_prefix;
      if (org_mozdev_SortCustomizationDialog.haveCache()) {
//        debugLog("xxx: " + uriSpec);
//        debugLog("yyy: " + org_mozdev_SortCustomizationDialog.getAddonName(uriSpec));
        res = org_mozdev_SortCustomizationDialog.getAddonName(uriSpec);
      } else {
        if (imageURL) {
          url_prefix = imageURL.match(/url\(\"chrome:\/\/([^\/]+)\/.*/);
        }
        if (url_prefix && url_prefix.length >= 1) {
          //debugLog("get_url_prefix " + url_prefix[1]);
           res = url_prefix[1];
        }
      }
    }
    catch(e) {
      debugLog("xxxxxx" + e);
    }
    return res;
  }

  function sort_unique(arr) {
    arr = arr.sort();
    var ret = [arr[0]];
    for (var i = 1; i < arr.length; i++) { // start loop at 1 as element 0 can never be a duplicate
        if (arr[i-1] !== arr[i]) {
            ret.push(arr[i]);
        }
    }
    return ret;
  }

  function sortPalette(aToolbox) {
    debugLog("start sortPalette");
//    debugLog("cache: " + JSON.stringify(org_mozdev_SortCustomizationDialog.allAddons()));
    if (document.getElementById("SCD_buttonsort") &&
        document.getElementById("SCD_buttonsort").getAttribute("value") == "off") {
      debugLog("do not sort!");
      return;
    }
    if (aToolbox) {
      let buttonKeys = [];
      let buttons = [];
      let urlPrefixes = [];
      let buttonURLPrefix = {};
      let templateNode = aToolbox.palette.lastChild;

      let buttonsStr = prefBranch.getCharPref("existingButtons");
      let existingButtons = JSON.parse(buttonsStr);
      existingButtons = existingButtons[aToolbox.id];
      debugLog("sortPalette "+ buttonsStr);

      let customizableToolbars = document.querySelectorAll("toolbar[customizable=true]:not([autohide=true])");
      let toolbar;
      for (toolbar of customizableToolbars) {
        debugLog("sortPalette toolbar: " + toolbar.id);
        let paletteItems = toolbar.getElementsByTagName("toolbarpaletteitem");
        if (paletteItems) {
          for (let button = paletteItems[0]; button; button = button.nextSibling) {
            let ttURLPrefix = "";
            let urlPrefix = "";
            if (document.getElementById("SCD_buttonsort") &&
                document.getElementById("SCD_buttonsort").getAttribute("value") == "addon") {
//              debugLog("sort by addon");
              urlPrefix = get_url_prefix(button);
              debugLog("urlPrefix: " + urlPrefix);
              ttURLPrefix = urlPrefix;
            }
            let titleUp = button.getAttribute("title");
            let title = titleUp.toLowerCase();
            if (title == "") {
              titleUp = button.getAttribute("label");
              title = titleUp.toLowerCase();
            }
            if (title) {
              if (ttURLPrefix != "") {
                titleUp = ttURLPrefix + " - " + titleUp;
              }
              button.setAttribute("tooltiptext", titleUp);
              urlPrefixes[title] = urlPrefix;
            }
          }
        };
      };


      let counter = 0;
      while (templateNode) {
//        debugLog("templateNode: " + templateNode.id);
        let urlPrefix = "";
        let ttURLPrefix = "";
        let newButton = false;

        if (document.getElementById("SCD_buttonsort") &&
            document.getElementById("SCD_buttonsort").getAttribute("value") == "addon") {
//          debugLog("sort by addon");
          urlPrefix = get_url_prefix(templateNode);
//          debugLog("urlPrefix: " + urlPrefix);
          ttURLPrefix = urlPrefix;
          if (existingButtons && existingButtons.indexOf(templateNode.id) == -1) {
            urlPrefix = "~~~~~~~~~~~~~~~~~~~~" + urlPrefix;
            newButton = true;
            debugLog("new: " + templateNode.id);
          } else {
            urlPrefixes.push(urlPrefix);
          }
        }
        let titleUp = templateNode.getAttribute("title");
        let title = titleUp.toLowerCase();
        if (title == "") {
          titleUp = templateNode.getAttribute("label");
          title = titleUp.toLowerCase();
        }
        if (title) {
          title = urlPrefix + " - " + title + counter;
//          debugLog("titlestr: " + title);
          if (ttURLPrefix != "") {
            titleUp = ttURLPrefix + " - " + titleUp;
          }
          buttonKeys.push(title);
          buttons[title] = templateNode.id;
          templateNode.setAttribute("tooltiptext", titleUp);
          urlPrefixes[title] = urlPrefix;
          if (newButton) {
            templateNode.setAttribute("newButton", "true");
          } else {
            templateNode.removeAttribute("newButton");
          }
          buttonURLPrefix[title] = urlPrefix;
        }
        let oldTemplateNode = templateNode;
        templateNode = templateNode.previousSibling;
        counter += 1;
      }

      buttonKeys.sort();
      let urlPrefixesUniq = sort_unique(urlPrefixes);
      debugLog("buttonKeys " + JSON.stringify(buttonKeys));
      debugLog("sortPalette " + JSON.stringify(urlPrefixesUniq));
      for (let i = 0; i < buttonKeys.length; i++) {
        let button = document.getElementById(buttons[buttonKeys[i]]);
        if (button) {
          if (document.getElementById("SCD_buttonsort") &&
              document.getElementById("SCD_buttonsort").getAttribute("value") == "addon" &&
              buttonURLPrefix[buttonKeys[i]] != "") {
            button.setAttribute("urlPrefix", buttonURLPrefix[buttonKeys[i]]);
            let bc = urlPrefixesUniq.indexOf(buttonURLPrefix[buttonKeys[i]]);
            if (bc != -1) {
              button.setAttribute("bcolor", bc % 2);
            }
          } else {
            button.removeAttribute("bcolor");
          }
          aToolbox.palette.appendChild(document.getElementById(buttons[buttonKeys[i]]));
        };
      };
    }
    debugLog("stop sortPalette");
  }

  function overlayDepopulatePalette(aToolbox) {
    debugLog("overlayDepopulatePalette "+ aToolbox.id);
    let strPref = prefBranch.getCharPref("existingButtons");
    debugLog("strPref: "+ strPref);
    let existingButtons = JSON.parse(strPref);
    debugLog("existing buttons: "+ existingButtons);
    existingButtons[aToolbox.id] = [];
    if (aToolbox && aToolbox.firstChild) {
      let button = aToolbox.palette.firstChild;
      for (; button; button = button.nextSibling) {
        debugLog("overlayDepopulatePalette: " + button.id);
        existingButtons[aToolbox.id].push(button.id);
      }
      let customizableToolbars = document.querySelectorAll("toolbar[customizable=true]:not([autohide=true])");
      let toolbar;
      for (toolbar of customizableToolbars) {
        debugLog("overlayDepopulatePalette toolbar: " + toolbar.id);
        let paletteItems = toolbar.getElementsByTagName("toolbarpaletteitem");
        if (paletteItems) {
          for (let button = paletteItems[0]; button; button = button.nextSibling) {
            debugLog("overlayDepopulatePalette toolbar button: " + button.id);
            existingButtons[aToolbox.id].push(button.id);
          }
        };
      };
    }
    let buttonsStr = JSON.stringify(existingButtons);
    debugLog("overlayDepopulatePalette "+ buttonsStr);
    prefBranch.setCharPref("existingButtons", buttonsStr);
    debugLog("stop overlayDepopulatePalette");
  }

  pub.monkeypatch = function () {
    debugLog("monkeypatch start");
    if (gCustomizeMode)
    debugLog("gCustomizeMode" + gCustomizeMode);

    if (gCustomizeMode) {
      if (   (typeof(gCustomizeMode.populatePalette) != "undefined")
          && (gCustomizeMode.populatePalette)) {
        debugLog("monkeypatch populatePalette");
        (function(){
          gCustomizeMode.oldPopulatePalette = gCustomizeMode.populatePalette;
          gCustomizeMode.populatePalette = function() {
            debugLog("monkeypatch populatePalette start");
            gCustomizeMode.oldPopulatePalette();
            gToolbox = this.window.gNavToolbox;
            sortPalette(gToolbox);
            gVisiblePalette = this.visiblePalette;
            debugLog("monkeypatch populatePalette stop");
          };
        })();
        if (   (typeof(gCustomizeMode.depopulatePalette) != "undefined")
            && (gCustomizeMode.depopulatePalette)) {
          debugLog("monkeypatch depopulatePalette");
          (function(){
            gCustomizeMode.oldDepopulatePalette = gCustomizeMode.depopulatePalette;
            gCustomizeMode.depopulatePalette = function() {
              debugLog("monkeypatch depopulatePalette start");
              gToolbox = this.window.gNavToolbox;
              overlayDepopulatePalette(gToolbox);
              gCustomizeMode.oldDepopulatePalette();
              debugLog("monkeypatch depopulatePalette stop");
            };
          })();
        };
        if (   (typeof(gCustomizeMode._onDragEnd) != "undefined")
            && (gCustomizeMode._onDragEnd)) {
          debugLog("monkeypatch _onDragEnd");
          (function(){
            gCustomizeMode.oldOnDragEnd = gCustomizeMode._onDragEnd;
            gCustomizeMode._onDragEnd = function(aEvent) {
              debugLog("monkeypatch _onDragEnd start");
              gCustomizeMode.oldOnDragEnd(aEvent);
              gToolbox = this.window.gNavToolbox;
              sortPalette(gToolbox);
              debugLog("monkeypatch _onDragEnd stop");
            };
          })();
        };
      };
    }
    debugLog("monkeypatch stop");
  };

  pub.onload = function () {
    debugLog("start onload");
    org_mozdev_SortCustomizationDialog.Overlay.monkeypatch();
    gFilter = document.getElementById("SCD_TextboxFilter");
    debugLog("stop onload");
  };

  pub.filterDialog = function () {
    debugLog("filterDialog start");
    let filter = gFilter.value.toLowerCase();
    let paletteChild = gVisiblePalette.firstChild;
    let nextChild;
    while (paletteChild) {
      nextChild = paletteChild.nextElementSibling;
      let id = paletteChild.id.replace("wrapper-", "");
      let title = paletteChild.getAttribute("tooltiptext").toLowerCase();
      let hide = filter != "" && title.indexOf(filter) == -1;
      if (hide) {
        debugLog("hide paletteChild: " + paletteChild.id);
        debugLog("hide title: " + title);
        paletteChild.setAttribute("hidden", "true");
      }
      else {
        debugLog("unhide paletteChild: " + paletteChild.id);
        debugLog("unhide title: " + title);
        paletteChild.removeAttribute("hidden");
      }
      paletteChild = nextChild;
    }

    debugLog("filterDialog stop");
    return;
  };

  pub.updateSort = function () {
    debugLog("updateSort start");
    if (gToolbox) {
      sortPalette(gToolbox);
    }
    debugLog("updateSort stop");
  }

  return pub;
}();


window.addEventListener("load", org_mozdev_SortCustomizationDialog.Overlay.onload, true);
