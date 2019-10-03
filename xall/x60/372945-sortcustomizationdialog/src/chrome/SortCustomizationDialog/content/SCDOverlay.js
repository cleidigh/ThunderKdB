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
  var gFilteredButtons = new Object;
  var oldInitWithToolbox;
  var gToolbox;

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
      debugLog("imageURL: " + imageURL);

      let imageURIs = imageURL.match(/url\(\"(.*)\"\)$/);
      debugLog("test: " + imageURIs);
      let imageURI;
      if (imageURIs) {
        imageURI = imageURIs[1];
      } else {
        imageURI = imageURL;
      }

      debugLog("imageURL: " + imageURI);
      let ios = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces["nsIIOService"]);
      let uri;
      debugLog("before newURI ");
      let uriSpec;

      if (imageURI.indexOf("chrome://") >= 0) {
        uri = ios.newURI(imageURI, null, null);
        uriSpec = reg.convertChromeURL(uri).spec
      } else {
        uriSpec = imageURI;
      }

      debugLog("uri: " + uriSpec);
      let url_prefix;
      if (org_mozdev_SortCustomizationDialog.haveCache()) {
        debugLog("xxx: " + uriSpec);
        debugLog("yyy: " + org_mozdev_SortCustomizationDialog.getAddonName(uriSpec));
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
      debugLog("xxxxxx");
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

      let counter = 0;
      while (templateNode) {
        debugLog("templateNode: " + templateNode.id);
        let urlPrefix = "";
        let ttURLPrefix = "";
        let newButton = false;
        //if (prefBranch.getIntPref("sortBy") == 1) {
        if (document.getElementById("SCD_buttonsort") &&
            document.getElementById("SCD_buttonsort").getAttribute("value") == "addon") {
          urlPrefix = get_url_prefix(templateNode);
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
          debugLog("titlestr: " + title);
          titleUp = ttURLPrefix + " - " + titleUp;
          buttonKeys.push(title);
          buttons[title] = document.importNode(templateNode, true);
          if (urlPrefix != "")
            buttons[title].setAttribute("tooltiptext2", titleUp);
          urlPrefixes[title] = urlPrefix;
          if (newButton) {
            buttons[title].setAttribute("newButton", "true");
          } else {
            buttons[title].removeAttribute("newButton");
          }
          buttonURLPrefix[title] = urlPrefix;
        }
        let oldTemplateNode = templateNode;
        templateNode = templateNode.previousSibling;
        if (title) {
          aToolbox.palette.removeChild(oldTemplateNode);
        }
        counter += 1;
      }

      buttonKeys.sort();
      let urlPrefixesUniq = sort_unique(urlPrefixes);
      debugLog("buttonKeys " + JSON.stringify(buttonKeys));
      debugLog("sortPalette " + JSON.stringify(urlPrefixesUniq));
      for (let i = 0; i < buttonKeys.length; i++) {
        if (document.getElementById("SCD_buttonsort") &&
            document.getElementById("SCD_buttonsort").getAttribute("value") == "addon" &&
            buttonURLPrefix[buttonKeys[i]] != "") {
          buttons[buttonKeys[i]].setAttribute("urlPrefix", buttonURLPrefix[buttonKeys[i]]);
          let bc = urlPrefixesUniq.indexOf(buttonURLPrefix[buttonKeys[i]]);
          if (bc != -1) {
            buttons[buttonKeys[i]].setAttribute("bcolor", bc % 2);
          }
        } else {
          buttons[buttonKeys[i]].removeAttribute("bcolor");
        }
        aToolbox.palette.appendChild(buttons[buttonKeys[i]]);
      }
    }
    debugLog("stop sortPalette");
  }

  function overlayCustomizeDone(aEvent, aToolbox) {

    debugLog("overlayCustomizeDone "+ aToolbox.id);

    let existingButtons = JSON.parse(prefBranch.getCharPref("existingButtons"));
    existingButtons[aToolbox.id] = [];
    if (aToolbox && aToolbox.firstChild) {
      let button = aToolbox.palette.firstChild
      for (; button; button = button.nextSibling) {
        //debugLog("overlayCustomizeDone " + button.id);
        existingButtons[aToolbox.id].push(button.id);
      }
    }
    let buttonsStr = JSON.stringify(existingButtons);
    debugLog("overlayCustomizeDone "+ buttonsStr);
    prefBranch.setCharPref("existingButtons", buttonsStr);
    debugLog("stop overlayCustomizeDone");
  }

  function overlayCleanUpItemForPalette(aItem, aWrapper) {
    if (aItem.hasAttribute("newButton")) {
      aWrapper.setAttribute("newButton", aItem.getAttribute("newButton"));
    }
    if (aItem.hasAttribute("bcolor")) {
      aWrapper.setAttribute("bcolor", aItem.getAttribute("bcolor"));
    }
    if (aItem.hasAttribute("urlPrefix")) {
      aWrapper.setAttribute("urlPrefix", aItem.getAttribute("urlPrefix"));
    }
    if (aItem.hasAttribute("tooltiptext2")) {
      aWrapper.setAttribute("tooltiptext", aItem.getAttribute("tooltiptext2"));
    }
  }

  pub.monkeypatch = function () {
    debugLog("monkeypatch start");
    if ((typeof(cleanUpItemForPalette) != "undefined") && (cleanUpItemForPalette)) {
      debugLog("monkeypatch cleanUpItemForPalette");
      let oldCleanUpItemForPalette = cleanUpItemForPalette;
      cleanUpItemForPalette = function(aItem, aWrapper) {
        oldCleanUpItemForPalette(aItem, aWrapper);
        overlayCleanUpItemForPalette(aItem, aWrapper);
      }
    }
    if ((typeof(InitWithToolbox) != "undefined") && (InitWithToolbox)) {
      debugLog("monkeypatch InitWithToolbox");
      oldInitWithToolbox = InitWithToolbox;
      InitWithToolbox = function(aToolbox) {
        gToolbox = aToolbox;
        sortPalette(aToolbox);
        let oldCustomizeDone = aToolbox.customizeDone;
        aToolbox.customizeDone = function(aEvent) {
          overlayCustomizeDone(aEvent, aToolbox);
          oldCustomizeDone(aEvent);
        };
        oldInitWithToolbox(aToolbox);
      }
    }
    if ((typeof(getCurrentItemIds) != "undefined") && (getCurrentItemIds)) {
      debugLog("monkeypatch getCurrentItemIds");
      let oldgetCurrentItemIds = getCurrentItemIds;
      getCurrentItemIds = function() {
        debugLog("monkeypatched getCurrentItemIds start");
        let currentItems = oldgetCurrentItemIds();
        if (gFilteredButtons)
          for (let buttons in gFilteredButtons) {
            currentItems[buttons] = 1;
          }
//        for(let itemKey in currentItems) {
//          debugLog("monkeypatched getCurrentItemIds " + itemKey);
//        }
        debugLog("monkeypatched getCurrentItemIds stop");
        return currentItems;
      }
    }
    debugLog("monkeypatch stop");
  };

  pub.onload = function () {
    debugLog("start onload");
    let searchBox = document.getElementById("SCD_searchbox");
    let donebutton = document.getElementById("donebutton");
    if (donebutton && searchBox) {
      donebutton.parentElement.insertBefore(searchBox, donebutton);
    }
    gFilter = document.getElementById("SCD_TextboxFilter");
    debugLog("stop onload");
  };

  pub.filterDialog = function () {
    debugLog("filterDialog start");
    let filter = gFilter.value.toLowerCase();
    let changed = false;
    gFilteredButtons = new Object;
    unwrapToolbarItems();
    buildPalette();
    wrapToolbarItems();
    toolboxChanged();

    let paletteItems = document.getElementById("main-box")
                               .getElementsByTagName("toolbarpaletteitem");

    for (let i = 0; i < paletteItems.length; i++) {
      let aChild = paletteItems[i];
      let id = aChild.id.replace("wrapper-", "");
      let title = aChild.getAttribute("tooltiptext").toLowerCase();
//      let title = aChild.getAttribute("title").toLowerCase();
//      if (title == "") {
//        title = aChild.getAttribute("label").toLowerCase();
//      }
      let hide = filter != "" && title.indexOf(filter) == -1;
      let oldhide = (id in gFilteredButtons);
      if (oldhide != hide) {
        changed = true;
        if (hide)
          gFilteredButtons[id] = 1;
        else
          delete gFilteredButtons[id];
      }

    }

    debugLog("filterDialog 1");

    {
      unwrapToolbarItems();
      buildPalette();
      wrapToolbarItems();
      toolboxChanged();
      debugLog("filterDialog changed 2");
    }
    debugLog("filterDialog stop");
  };

  pub.updateSort = function () {
    debugLog("updateSort start");
    if (gToolbox) {
      sortPalette(gToolbox);
      oldInitWithToolbox(gToolbox);
    }
    debugLog("updateSort stop");
  }

  return pub;
}();


org_mozdev_SortCustomizationDialog.Overlay.monkeypatch();
window.addEventListener("load", org_mozdev_SortCustomizationDialog.Overlay.onload, true);
