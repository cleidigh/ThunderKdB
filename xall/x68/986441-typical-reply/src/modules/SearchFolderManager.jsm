/**
 * @fileOverview Search Folder Manager for Thunderbird
 * @author       ClearCode Inc.
 * @version      4
 *
 * @description
 *   Usage:
 *     Components.utills.import('resource://.../SerchFolderManager.jsm');
 *     new SerchFolderManager([
 *       { label:         'Important',
 *         subjectPrefix: '[Important]' },
 *       { label:         'FYI',
 *         conditions:    'OR (subject,begins with,FYI) OR (subject,begins with,[FYI])' },
 *       { label:         'DenyHosts Reports',
 *         subject:       'DenyHosts Report from www.example.com' },
 *       ...
 *     ]);
 *
 * @license
 *   The MIT License, Copyright (c) 2014-2018 ClearCode Inc.
 * @url https://github.com/clear-code/js-codemodule-search-folder-manager
 */

var EXPORTED_SYMBOLS = ['SearchFolderManager'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyServiceGetter(this,
                                   'AccountManager',
                                   '@mozilla.org/messenger/account-manager;1',
                                   'nsIMsgAccountManager');
XPCOMUtils.defineLazyServiceGetter(this,
                                   'MailSession',
                                   '@mozilla.org/messenger/services/session;1',
                                   'nsIMsgMailSession');

XPCOMUtils.defineLazyModuleGetter(this,
                                  'Services',
                                  'resource://gre/modules/Services.jsm');
XPCOMUtils.defineLazyModuleGetter(this,
                                  'MailServices',
                                  'resource:///modules/mailServices.js');
XPCOMUtils.defineLazyModuleGetter(this,
                                  'VirtualFolderHelper',
                                  'resource:///modules/virtualFolderWrapper.js');

/**
 * Initializes a search folder manager for given folder
 * definitions (search conditions).
 *
 * @param Array of Definition
 *        An array of search folder definitions (search conditions).
 *
 * Definition:
 *   @param label         String: the name of the folder
 *   @param conditions    String: the search conditions (optional)
 *   @param subject       String: the subject to be matched (optional)
 *   @param subjectPrefix String: the prefix of the subject to be matched (optional)
 *   @param searchTargets String: "all" or comma-separated URIs of mail folders (optional, default=all)
 */
function SearchFolderManager(aDefinitions) {
  this.definitions = aDefinitions;

  Services.obs.addObserver(this, 'mail-tabs-session-restored', false);
}
SearchFolderManager.prototype = {
  get allAccounts() {
    return this.toArray(AccountManager.accounts, Ci.nsIMsgAccount);
  },
  get allAccountKeys() {
    return this.allAccounts.map(function(aAccount) {
      return this.getAccountKey(aAccount);
    }, this).filter(function(aKey) {
      return aKey != '';
    });
  },
  toArray: function (aEnumerator, aInterface) {
    aInterface = aInterface || Ci.nsISupports;
    var array = [];
    if (Ci.nsISupportsArray && aEnumerator instanceof Ci.nsISupportsArray) {
      let count = aEnumerator.Count();
      for (let i = 0; i < count; i++) {
        array.push(aEnumerator.QueryElementAt(i, aInterface));
      }
    } else if (aEnumerator instanceof Ci.nsIArray) {
      let count = aEnumerator.length;
      for (let i = 0; i < count; i++) {
        array.push(aEnumerator.queryElementAt(i, aInterface));
      }
    } else if (aEnumerator instanceof Ci.nsISimpleEnumerator) {
      while (aEnumerator.hasMoreElements()) {
        array.push(aEnumerator.getNext().QueryInterface(aInterface));
      }
    }
    return array;
  },
  getDescendants: function(aRoot) {
    var folders = [];
    if ('descendants' in aRoot) { // Thunderbird 24
      let descendants = aRoot.descendants;
      for (let i = 0, maxi = descendants.length; i < maxi; i++) {
        let folder = descendants.queryElementAt(i, Ci.nsIMsgFolder);
        folders.push(folder);
      }
    } else { // Thunderbird 17 or olders
      let descendants = Cc['@mozilla.org/supports-array;1']
                          .createInstance(Ci.nsISupportsArray);
      aRoot.ListDescendents(descendants);
      for (let i = 0, maxi = descendants.Count(); i < maxi; i++) {
        let folder = descendants.GetElementAt(i).QueryInterface(Ci.nsIMsgFolder);
        folders.push(folder);
      }
    }
    return folders;
  },


  observe: function(aSubject, aTopic, aData) {
    Services.obs.removeObserver(this, 'mail-tabs-session-restored');
    // This must be done after mail-tabs-session-restored.
    // Otherwise, non-ASCII search conditions are not saved correctly.
    this.buildSearchFolders();

    this.startListenFolderChanges();
  },
  startListenFolderChanges: function() {
    var notifyFlags = Ci.nsIFolderListener.added |
                        Ci.nsIFolderListener.removed;
    MailSession.AddFolderListener(this, notifyFlags);
  },
  // nsIFolderListener
  OnItemAdded: function(aParent, aItem) {
    try {
      aItem = aItem.QueryInterface(Ci.nsIMsgFolder);
      if (aItem.flags & Ci.nsMsgFolderFlags.Virtual)
        return;
    } catch(e) {
      return;
    }
    this.buildSearchFoldersIn(aItem.rootFolder, {
      addedFolder: aItem.URI
    });
  },
  OnItemRemoved: function(aParent, aItem) {
    try {
      aItem = aItem.QueryInterface(Ci.nsIMsgFolder);
      if (aItem.flags & Ci.nsMsgFolderFlags.Virtual)
        return;
    } catch(e) {
      return;
    }
    this.buildSearchFoldersIn(aItem.rootFolder, {
      removedFolder: aItem.URI
    });
  },
  OnItemPropertyChanged: function() {},
  OnItemIntPropertyChanged: function() {},
  OnItemBoolPropertyChanged: function() {},
  OnItemUnicharPropertyChanged: function() {},
  OnItemEvent: function() {},

  buildSearchFolders: function() {
    this.allAccounts.forEach(function(aAccount) {
      if (!aAccount.incomingServer)
        return;
      this.buildSearchFoldersIn(aAccount.incomingServer.rootMsgFolder);
    }, this);
  },
  buildSearchFoldersIn: function(aRoot, aModification) {
    if (!aRoot)
      return;
    this.definitions.forEach(function(aDefinition) {
      try {
        this.buildSearchFolderIn(aDefinition, aRoot, aModification);
      }
      catch(e) {
        Cu.reportError(e);
      }
    }, this);
  },
  buildSearchFolderIn: function(aDefinition, aRoot, aModification) {
    if (!aDefinition.conditions &&
        !aDefinition.subjectPrefix &&
        !aDefinition.subject ||
        !aRoot)
      return;

    var searchTargets = aDefinition.searchTargets || 'all';
    var searchFolders;
    if (!aModification) {
      searchFolders = this.getSearchFolders(aRoot, searchTargets.split(/[,\s]+/));
      if (!searchFolders)
        return;
    }

    var name = 'autogen-' + aDefinition.label;

    var isCreation = false;
    var isModified = false;
    var virtualFolder;
    try {
      virtualFolder = aRoot.getChildNamed(name);
    } catch(e) {
      try {
        virtualFolder = aRoot.getChildNamed(aDefinition.label);
        if (!(virtualFolder.flags & Ci.nsMsgFolderFlags.Virtual))
          virtualFolder = null;
      } catch(e) {
        // folder not found!
      }
    }
    if (!virtualFolder) {
      isCreation = true;
      isModified = true;
      virtualFolder = aRoot.addSubfolder(name);
      virtualFolder.setFlag(Ci.nsMsgFolderFlags.Virtual);
    }

    // We always have to set prettyName because it is not saved.
    virtualFolder.prettyName = aDefinition.label;

    var wrapper = VirtualFolderHelper.wrapVirtualFolder(virtualFolder);

    var conditions = this.buildSearchCondition(aDefinition);
    if (wrapper.searchString != conditions) {
      wrapper.searchString = conditions;
      isModified = true;
    }
    var currentSearchFolders = wrapper.searchFolders.map(function(aFolder) {
      return aFolder.URI
    }).join('|');
    if (aModification) {
      searchFolders = currentSearchFolders.split('|');
      if (aModification.addedFolder) {
        let index = searchFolders.indexOf(aModification.addedFolder);
        if (index < 0) {
          searchFolders.push(aModification.addedFolder);
        }
      }
      if (aModification.removedFolder) {
        let index = searchFolders.indexOf(aModification.removedFolder);
        if (index > -1) {
          searchFolders.splice(index, 1);
        }
      }
      searchFolders = searchFolders.join('|');
    }
    if (currentSearchFolders != searchFolders) {
      wrapper.searchFolders = searchFolders;
      isModified = true;
    }
    if (isCreation) {
      wrapper.onlineSearch = false;
    }

    if (!isModified)
      return;

    wrapper.cleanUpMessageDatabase();
    if (isCreation) {
      virtualFolder.msgDatabase.Close(true);
      aRoot.NotifyItemAdded(virtualFolder);
    }
    try {
      MailServices.accounts.saveVirtualFolders();
    }
    catch(e) {
      // it raises the error but works as expected, so we simply ignore.
      if (!String(e).includes('File error: Not found'))
        throw e;
    }
  },
  getSearchFolders: function(aRoot, aKeys) {
    var flags = {};
    Object.keys(Ci.nsMsgFolderFlags).forEach(function(aKey) {
      flags[aKey.toLowerCase()] = Ci.nsMsgFolderFlags[aKey];
    });
    var folders = [];
    aKeys.some(function(aKey) {
      aKey = aKey.toLowerCase();
      if (aKey == 'all') {
        folders = this.getDescendants(aRoot).map(function(aFolder) {
          return aFolder.URI;
        });
        return true;
      }
      if (typeof flags[aKey] == 'number') {
        let folder = aRoot.getFolderWithFlags(flags[aKey]);
        if (folder)
          folders.push(folder.URI);
      }
      return false;
    }, this);
    try {
      if (folders.length > 0)
        folders.unshift(aRoot.URI);
    } catch(e) {
    }
    return folders.join('|');
  },
  buildSearchCondition: function(aDefinition) {
    if (aDefinition.conditions)
      return this.UnicodeToUTF8(aDefinition.conditions);

    if (aDefinition.subjectPrefix)
      return 'AND (subject,begins with,' + this.UnicodeToUTF8(aDefinition.subjectPrefix) + ')';

    return 'AND (subject,is,' + this.UnicodeToUTF8(aDefinition.subject) + ')';
  },
  UnicodeToUTF8: function(aString) {
    return unescape(encodeURIComponent(aString));
  }
};
