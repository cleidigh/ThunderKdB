/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2012 */

"use strict";

Components.utils.import("resource:///modules/iteratorUtils.jsm");
Components.utils.import("resource:///modules/Services.jsm");
Components.utils.import("resource:///modules/mailServices.js");

var unreadHierarchy = {
  __proto__: IFolderTreeMode,

  PREF_ROOT: "extensions.fp-unread.",

  generateMap: function generateMap(ftv) {
    let accounts = gFolderTreeView._sortedAccounts();

    // force each root folder to do its local subfolder discovery.
    MailUtils.discoverFolders();

    return accounts.reduce((accts, acct) => {
        if (unreadHierarchy.shouldShowItem) {
            accts.push(new unreadHierarchy.ftvItem(acct.incomingServer.rootFolder));
        }
        return accts;
    }, []);
  },

  OnItemAdded: function() {},
  OnItemRemoved: function() {},
  OnItemPropertyChanged: function() {},
  OnItemIntPropertyChanged: function(aItem, aProperty, aOld, aNew) {
    if (gFolderTreeView.mode == "unread_hierarchy" &&
        aProperty == "TotalUnreadMessages" &&
        ((aOld == 0) ^ (aNew == 0))) {
      gFolderTreeView._rebuild();
    }
  },
  OnItemBoolPropertyChanged: function(aItem, aProperty, aOld, aNew) {},
  OnItemUnicharPropertyChanged: function(aItem, aProperty, aOld, aNew) {},
  OnItemPropertyFlagChanged: function(aItem, aProperty, aOld, aNew) {},

  OnItemEvent: function() {},

  observe: function(aSubject, aTopic, aData) {
    gFolderTreeView._rebuild();
  },

  shouldShowItem: function uh_shouldShowItem(aFolderItem) {
    let folder = aFolderItem._folder;

    function checkDisplayedFolder() {
      let show = false;
      if (unreadHierarchy.getPref("alwaysshow.displayed") &&
          gFolderDisplay.displayedFolder &&
          gFolderDisplay.displayedFolder.URI == folder.URI) {
        show = true;
      }
      return show;
    }

    function checkFolderType(prefName, flag) {
      let shouldShow = false;
      if (unreadHierarchy.getPref(prefName)) {
        let folderOrChild = folder.getFolderWithFlags(flag);
        shouldShow = !!folderOrChild;
      }
      return shouldShow;
    }

    function checkShow(prefName, flag) {
      return checkFolderType("alwaysshow." + prefName, flag);
    }

    /* TODO Next Version
    function checkHide(prefName, flag) {
      return !checkFolderType("alwayshide." + prefName, flag);
    }
    */

    let showForDisplayedFolder = checkDisplayedFolder();
    const mff = Components.interfaces.nsMsgFolderFlags;
    let showForFlag = checkShow("inbox", mff.Inbox) ||
                      checkShow("drafts", mff.Drafts) ||
                      checkShow("templates", mff.Templates) ||
                      checkShow("sent", mff.SentMail) ||
                      checkShow("trash", mff.Trash) ||
                      checkShow("favorite", mff.Favorite);

    /* TODO Next Version
    showForFlag = showForFlag &&
                  (checkHide("trash", mff.Trash) ||
                     checkHide("spam", mff.Spam));
    */

    return (showForDisplayedFolder || showForFlag || folder.getNumUnread(true));
  },

  checkOpenFolder: function uh_checkOpenFolder(aFolderItem) {
    if (unreadHierarchy.getPref("forceExpand")) {
      let tree = gFolderTreeView;
      let idx = tree.getIndexOfFolder(aFolderItem);
      if (idx != null) {
        if (!tree._rowMap[idx].open) {
          tree._toggleRow(idx, true);
        }
      } else {
        // In our case this shouldn't happen, but just to be sure...
        let folderTreeMode = tree._modes[tree._mode];
        let parent = folderTreeMode.getParentOfFolder(aFolderItem);
        if (parent && unreadHierarchy.checkOpenFolder(parent)) {
          let idx = tree.getIndexOfFolder(aFolderItem);
          if (idx != null) {
            tree._toggleRow(idx, true);
          }
        }
      }
    }
  },

  getPref: function uh_getPref(aPrefName) {
    let prefName = unreadHierarchy.PREF_ROOT + aPrefName;
    try {
      return Services.prefs.getBoolPref(prefName);
    } catch (e) {
      return false;
    }
  },
  getString: function uh_getString(aStringName) {
    let bundleURL= "chrome://fp-unread/locale/fp-unread.properties";
    let bundle = Services.strings.createBundle(bundleURL);
    return bundle.GetStringFromName(aStringName);
  },

  load: function uh_load() {
    const nIFL = Components.interfaces.nsIFolderListener;
    MailServices.mailSession.AddFolderListener(unreadHierarchy, nIFL.all);
    Services.prefs.addObserver(unreadHierarchy.PREF_ROOT, unreadHierarchy, false);
  },

  unload: function uh_unload() {
    MailServices.mailSession.RemoveFolderListener(unreadHierarchy);
    Services.prefs.removeObserver(unreadHierarchy.PREF_ROOT, unreadHierarchy);
  }
};

unreadHierarchy.ftvItem = function uh_ftvItem(aFolder, aParent) {
  ftvItem.apply(this, arguments);
  if (aParent) {
    this._parent = aParent;
    this._level = (aParent.level || 0) + 1;
  }
}

unreadHierarchy.ftvItem.prototype = {
    __proto__: ftvItem.prototype,

    get children() {
      if (!this._children) {
        this._children = [];
        let iter = fixIterator(this._folder.subFolders,
                               Components.interfaces.nsIMsgFolder);
        for (let f of iter) {
          let itm = new unreadHierarchy.ftvItem(f, this);
          if (unreadHierarchy.shouldShowItem(itm)) {
            // This function will make sure the folder is expanded. Unfortunately
            // we have to do it on a timeout, otherwise persistence might close
            // the folder again.
            setTimeout(function() { unreadHierarchy.checkOpenFolder(f); }, 0);

            // Now add the node to our cached children
            this._children.push(itm);
          }
        }
        sortFolderItems(this._children);
      }
      return this._children;
    }
};

// Add listeners and folder tree mode
window.addEventListener("unload", unreadHierarchy.unload, false);
window.addEventListener("load", unreadHierarchy.load, false);
gFolderTreeView.registerFolderTreeMode("unread_hierarchy",
                                       unreadHierarchy,
                                       unreadHierarchy.getString("unreadHierarchy"));
