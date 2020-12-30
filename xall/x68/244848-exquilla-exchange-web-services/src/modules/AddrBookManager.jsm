/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["AddrBookManager"];

ChromeUtils.defineModuleGetter(
  this,
  "AppConstants",
  "resource://gre/modules/AppConstants.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "closeConnectionTo",
  "resource:///modules/AddrBookDirectory.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "Services",
  "resource://gre/modules/Services.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "SimpleEnumerator",
  "resource:///modules/AddrBookUtils.jsm"
);

const { clearTimeout, setTimeout } = ChromeUtils.import(
  "resource://gre/modules/Timer.jsm"
);
const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);
XPCOMUtils.defineLazyServiceGetter(
  this,
  "env",
  "@mozilla.org/process/environment;1",
  "nsIEnvironment"
);

/** Directory type constants, as defined in nsDirPrefs.h. */
const LDAP_DIRECTORY_TYPE = 0;
const MAPI_DIRECTORY_TYPE = 3;
const JS_DIRECTORY_TYPE = 101;
const CARDDAV_DIRECTORY_TYPE = 102;

/** Test for valid directory URIs. */
const URI_REGEXP = /^([\w-]+):\/\/([\w\.-]*)([?/:].*|$)/;

/**
 * Valid boolean operation types, indexed by their nsIAbBooleanOperationType
 * (which sadly isn't scriptable)
 */
const BOOLEAN_OPERATION_TYPES = ["and", "or", "not"];

/**
 * Valid boolean condition types, indexed by their nsIAbBooleanConditionType
 * (which uses a different naming scheme)
 */
const BOOLEAN_CONDITION_TYPES = ["ex", "!ex", "c", "!c", "=", "!=", "bw", "ew", "lt", "gt", "~=", "regex"];

/**
 * All registered nsIAbListener objects. Keys to this map are the listeners
 * themselves; values are a bitmap of events to notify. See nsIAbListener.idl.
 */
let listeners = new Map();

/**
 * When initialized, a map of nsIAbDirectory objects. Keys to this map are
 * the directories' URIs.
 */
let store = null;

/**
 * Parses the first operation of an addressbook query string.
 *
 * @param {string} query
 * @returns [
 *   {nsISupports}, The parsed part of the query
 *   {string}] The rest of the query, if any
 */
function parseExpression(aQuery) {
  let match = aQuery.match(/^\((\w+)(\(.+)/);
  if (match) {
    let type = match[1].toLowerCase();
    if (!BOOLEAN_OPERATION_TYPES.includes(type)) {
      throw new Components.Exception("Unrecognised boolean operation", Cr.NS_ERROR_FAILURE);
    }
    let expressions = [];
    let expression;
    let tail = match[2];
    do {
      [expression, tail] = parseExpression(tail);
      expressions.push(expression);
    } while (tail[0] == "(");
    if (tail[0] != ")") {
      throw new Components.Exception("Unclosed boolean operation", Cr.NS_ERROR_FAILURE);
    }
    let boolean = Cc["@mozilla.org/boolean-expression/n-peer;1"].createInstance(Ci.nsIAbBooleanExpression);
    boolean.operation = BOOLEAN_OPERATION_TYPES.indexOf(type);
    boolean.expressions = expressions;
    return [boolean, tail.slice(1)];
  }
  match = aQuery.match(/^\(([^(),]+),([^(),]+),([^(),]+)\)(.*)/);
  if (match) {
    let type = match[2].toLowerCase();
    if (!BOOLEAN_CONDITION_TYPES.includes(type)) {
      throw new Components.Exception("Unrecognised boolean condition", Cr.NS_ERROR_FAILURE);
    }
    let boolean = Cc["@mozilla.org/boolean-expression/condition-string;1"].createInstance(Ci.nsIAbBooleanConditionString);
    boolean.condition = BOOLEAN_CONDITION_TYPES.indexOf(type);
    boolean.name = decodeURIComponent(match[1]);
    boolean.value = decodeURIComponent(match[3]);
    return [boolean, match[4]];
  }
  throw new Components.Exception("Malformed query", Cr.NS_ERROR_FAILURE);
}

/**
 * A pre-sorted list of directories in the right order, to be returned by
 * AddrBookManager.directories. That function is called a lot, and there's
 * no need to sort the list every time.
 *
 * Call updateSortedDirectoryList after `store` changes and before any
 * notifications happen.
 */
let sortedDirectoryList = [];
function updateSortedDirectoryList() {
  sortedDirectoryList = [...store.values()];
  sortedDirectoryList.sort((a, b) => {
    let aPosition = a.dirPrefId ? a.getIntValue("position", 0) : 0;
    let bPosition = b.dirPrefId ? b.getIntValue("position", 0) : 0;
    if (aPosition != bPosition) {
      return aPosition - bPosition;
    }
    return a.URI < b.URI ? -1 : 1;
  });
}

/**
 * Initialise an address book directory by URI.
 *
 * @param {string} uri - URI for the directory.
 * @param {boolean} shouldStore - Whether to keep a reference to this address
 *   book in the store.
 * @returns {nsIAbDirectory}
 */
function createDirectoryObject(uri, shouldStore = false) {
  let scheme = Services.io.extractScheme(uri);
  let dir = Cc[
    `@mozilla.org/addressbook/directory;1?type=${scheme}`
  ].createInstance(Ci.nsIAbDirectory);

  try {
    if (shouldStore) {
      // This must happen before .init is called, or the OS X provider breaks
      // in some circumstances. If .init fails, we'll remove it again.
      store.set(uri, dir);
    }
    dir.init(uri);
  } catch (ex) {
    if (shouldStore) {
      store.delete(uri);
    }
    throw ex;
  }

  return dir;
}

/**
 * Read the preferences and create any address books defined there.
 */
function ensureInitialized() {
  if (store !== null) {
    return;
  }

  store = new Map();

  for (let pref of Services.prefs.getChildList("ldap_2.servers.")) {
    try {
      if (pref.endsWith(".dirType")) {
        let prefName = pref.substring(0, pref.length - 8);
        let dirType = Services.prefs.getIntPref(pref);
        let fileName = Services.prefs.getStringPref(`${prefName}.filename`, "");
        let uri = Services.prefs.getStringPref(`${prefName}.uri`, "");

        // Address books used to be created by directory factories,
        // but these days we have to hard-code them here.
        switch (dirType) {
          case LDAP_DIRECTORY_TYPE:
            if (!uri.startsWith("ldap://") && !uri.startsWith("ldaps://")) {
              continue;
            }
            uri = `moz-abldapdirectory://${prefName}`;
            break;
          case MAPI_DIRECTORY_TYPE:
            if (env.exists("MOZ_AUTOMATION")) {
              continue;
            }
            if (Services.prefs.getIntPref(`${prefName}.position`, 1) < 1) {
              // Migration: the previous address book manager set the position
              // value to 0 to indicate the removal of an address book.
              Services.prefs.clearUserPref(`${prefName}.position`);
              Services.prefs.setIntPref(pref, -1);
              continue;
            }
            if (uri.startsWith("moz-aboutlookdirectory://")) {
              // The outlook interface can expose multiple address books.
              // This used to be handled by the directory factory.
              let outlookInterface = Cc[
                "@mozilla.org/addressbook/outlookinterface;1"
              ].getService(Ci.nsIAbOutlookInterface);
              for (let folderURI of outlookInterface.getFolderURIs(uri)) {
                let dir = createDirectoryObject(folderURI, true);
                store.set(folderURI, dir);
              }
              continue;
            }
            break;
          case JS_DIRECTORY_TYPE:
            if (!fileName) {
              continue;
            }
            uri = `jsaddrbook://${fileName}`;
            break;
          case CARDDAV_DIRECTORY_TYPE:
            if (!fileName) {
              continue;
            }
            uri = `jscarddav://${fileName}`;
            break;
        }
        createDirectoryObject(uri, true);
      }
    } catch (ex) {
      Cu.reportError(ex);
    }
  }

  updateSortedDirectoryList();
}

Services.obs.addObserver(() => {
  // Clear the store. The next call to ensureInitialized will recreate it.
  store = null;
}, "addrbook-reload");

/** Cache for the cardForEmailAddress function, and timer to clear it. */
let addressCache = new Map();
let addressCacheTimer = null;

/**
 * @implements nsIAbManager
 * @implements nsICommandLineHandler
 */
function AddrBookManager() {}
AddrBookManager.prototype = {
  QueryInterface: ChromeUtils.generateQI([
    "nsIAbManager",
    "nsICommandLineHandler",
  ]),
  classID: Components.ID("{224d3ef9-d81c-4d94-8826-a79a5835af93}"),

  /* nsIAbManager */

  get directories() {
    ensureInitialized();
    return new SimpleEnumerator(sortedDirectoryList.slice());
  },
  getDirectory(uri) {
    if (uri.startsWith("moz-abdirectory://")) {
      throw new Components.Exception(
        "The root address book no longer exists",
        Cr.NS_ERROR_FAILURE
      );
    }

    ensureInitialized();
    if (store.has(uri)) {
      return store.get(uri);
    }

    let scheme = Services.io.extractScheme(uri);
    if (scheme == "jscarddav") {
      throw Components.Exception(
        `No ${scheme} directory for uri=${uri}`,
        Cr.NS_ERROR_UNEXPECTED
      );
    }
    if (scheme == "jsaddrbook") {
      let uriParts = URI_REGEXP.exec(uri);
      if (!uriParts) {
        throw Components.Exception(uri, Cr.NS_ERROR_MALFORMED_URI);
      }
      let [, scheme, fileName, tail] = uriParts;
      if (tail.startsWith("/MailList")) {
        let parent = this.getDirectory(`${scheme}://${fileName}`);
        for (let list of parent.childNodes) {
          list.QueryInterface(Ci.nsIAbDirectory);
          if (list.URI == uri) {
            return list;
          }
        }
        throw Components.Exception(
          `No ${scheme} directory for uri=${uri}`,
          Cr.NS_ERROR_UNEXPECTED
        );
      }
    }
    // `tail` could either point to a mailing list or a query.
    // Both of these will be handled differently in future.
    return createDirectoryObject(uri);
  },
  getDirectoryFromId(dirPrefId) {
    ensureInitialized();
    for (let dir of store.values()) {
      if (dir.dirPrefId == dirPrefId) {
        return dir;
      }
    }
    return null;
  },
  getDirectoryFromUID(uid) {
    ensureInitialized();
    for (let dir of store.values()) {
      if (dir.UID == uid) {
        return dir;
      }
    }
    return null;
  },
  newAddressBook(dirName, uri, type, prefName) {
    function ensureUniquePrefName() {
      let leafName = dirName.replace(/\W/g, "");
      if (!leafName) {
        leafName = "_nonascii";
      }

      let existingNames = Array.from(store.values(), dir => dir.dirPrefId);
      let uniqueCount = 0;
      prefName = `ldap_2.servers.${leafName}`;
      while (existingNames.includes(prefName)) {
        prefName = `ldap_2.servers.${leafName}_${++uniqueCount}`;
      }
    }

    if (!dirName) {
      throw new Components.Exception(
        "dirName must be specified",
        Cr.NS_ERROR_INVALID_ARG
      );
    }

    ensureInitialized();

    switch (type) {
      case LDAP_DIRECTORY_TYPE: {
        let file = Services.dirsvc.get("ProfD", Ci.nsIFile);
        file.append("ldap.sqlite");
        file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o644);

        ensureUniquePrefName();
        Services.prefs.setStringPref(`${prefName}.description`, dirName);
        Services.prefs.setStringPref(`${prefName}.filename`, file.leafName);
        Services.prefs.setStringPref(`${prefName}.uri`, uri);

        uri = `moz-abldapdirectory://${prefName}`;
        let dir = createDirectoryObject(uri, true);
        this.notifyDirectoryItemAdded(null, dir);
        updateSortedDirectoryList();
        Services.obs.notifyObservers(dir, "addrbook-directory-created");
        break;
      }
      case MAPI_DIRECTORY_TYPE: {
        if (store.has(uri)) {
          throw Components.Exception(
            `Can't create new ab of type=${type} - already exists`,
            Cr.NS_ERROR_UNEXPECTED
          );
        }

        Services.prefs.setIntPref(`${prefName}.dirType`, MAPI_DIRECTORY_TYPE);
        Services.prefs.setStringPref(
          `${prefName}.description`,
          "chrome://messenger/locale/addressbook/addressBook.properties"
        );
        Services.prefs.setStringPref(`${prefName}.uri`, uri);

        if (uri.startsWith("moz-aboutlookdirectory://")) {
          let outlookInterface = Cc[
            "@mozilla.org/addressbook/outlookinterface;1"
          ].getService(Ci.nsIAbOutlookInterface);
          for (let folderURI of outlookInterface.getFolderURIs(uri)) {
            let dir = createDirectoryObject(folderURI, true);
            this.notifyDirectoryItemAdded(null, dir);
            updateSortedDirectoryList();
            Services.obs.notifyObservers(dir, "addrbook-directory-created");
          }
        } else {
          let dir = createDirectoryObject(uri, true);
          this.notifyDirectoryItemAdded(null, dir);
          updateSortedDirectoryList();
          Services.obs.notifyObservers(dir, "addrbook-directory-created");
        }
        break;
      }
      case JS_DIRECTORY_TYPE:
      case CARDDAV_DIRECTORY_TYPE: {
        let file = Services.dirsvc.get("ProfD", Ci.nsIFile);
        file.append("abook.sqlite");
        file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o644);

        ensureUniquePrefName();
        Services.prefs.setStringPref(`${prefName}.description`, dirName);
        Services.prefs.setIntPref(`${prefName}.dirType`, type);
        Services.prefs.setStringPref(`${prefName}.filename`, file.leafName);

        let scheme = type == JS_DIRECTORY_TYPE ? "jsaddrbook" : "jscarddav";
        uri = `${scheme}://${file.leafName}`;
        let dir = createDirectoryObject(uri, true);
        this.notifyDirectoryItemAdded(null, dir);
        updateSortedDirectoryList();
        Services.obs.notifyObservers(dir, "addrbook-directory-created");
        break;
      }
      default:
        throw Components.Exception("", Cr.NS_ERROR_UNEXPECTED);
    }

    return prefName;
  },
  deleteAddressBook(uri) {
    let dir = this.getDirectory(uri);
    if (!dir) {
      throw new Components.Exception(
        `Address book not found: ${uri}`,
        Cr.NS_ERROR_UNEXPECTED
      );
    }

    if (dir.isMailList) {
      let parent = this.getDirectory(uri.slice(0, uri.lastIndexOf("/")));
      parent.deleteDirectory(dir);
      return;
    }

    let prefName = dir.dirPrefId;
    let dirType = Services.prefs.getIntPref(`${prefName}.dirType`, 0);
    let fileName = dir.fileName;

    // Deleting the built-in address books is very bad.
    if (["ldap_2.servers.pab", "ldap_2.servers.history"].includes(prefName)) {
      throw new Components.Exception(
        "Refusing to delete a built-in address book",
        Cr.NS_ERROR_FAILURE
      );
    }

    Services.prefs.clearUserPref(`${prefName}.description`);
    if (dirType == MAPI_DIRECTORY_TYPE) {
      // The prefs for this directory type are defaults. Setting the dirType
      // to -1 ensures the directory is ignored.
      Services.prefs.setIntPref(`${prefName}.dirType`, -1);
    } else {
      if (dirType == CARDDAV_DIRECTORY_TYPE) {
        Services.prefs.clearUserPref(`${prefName}.carddav.token`);
        Services.prefs.clearUserPref(`${prefName}.carddav.url`);
      }
      Services.prefs.clearUserPref(`${prefName}.dirType`);
    }
    Services.prefs.clearUserPref(`${prefName}.filename`);
    Services.prefs.clearUserPref(`${prefName}.uid`);
    Services.prefs.clearUserPref(`${prefName}.uri`);
    store.delete(uri);
    updateSortedDirectoryList();

    // Clear this reference to the deleted address book.
    if (Services.prefs.getStringPref("mail.collect_addressbook") == uri) {
      Services.prefs.clearUserPref("mail.collect_addressbook");
    }

    if (fileName) {
      let file = Services.dirsvc.get("ProfD", Ci.nsIFile);
      file.append(fileName);
      closeConnectionTo(file).then(() => {
        if (file.exists()) {
          file.remove(false);
        }
        this.notifyDirectoryDeleted(null, dir);
        Services.obs.notifyObservers(dir, "addrbook-directory-deleted");
      });
    } else {
      this.notifyDirectoryDeleted(null, dir);
      Services.obs.notifyObservers(dir, "addrbook-directory-deleted");
    }
  },
  addAddressBookListener(listener, notifyFlags) {
    listeners.set(listener, notifyFlags);
  },
  removeAddressBookListener(listener) {
    listeners.delete(listener);
  },
  notifyItemPropertyChanged(item, property, oldValue, newValue) {
    for (let [listener, notifyFlags] of listeners.entries()) {
      if (notifyFlags & Ci.nsIAbListener.itemChanged) {
        try {
          listener.onItemPropertyChanged(item, property, oldValue, newValue);
        } catch (ex) {
          Cu.reportError(ex);
        }
      }
    }
  },
  notifyDirectoryItemAdded(parentDirectory, item) {
    for (let [listener, notifyFlags] of listeners.entries()) {
      if (notifyFlags & Ci.nsIAbListener.itemAdded) {
        try {
          listener.onItemAdded(parentDirectory, item);
        } catch (ex) {
          Cu.reportError(ex);
        }
      }
    }
  },
  notifyDirectoryItemDeleted(parentDirectory, item) {
    for (let [listener, notifyFlags] of listeners.entries()) {
      if (notifyFlags & Ci.nsIAbListener.directoryItemRemoved) {
        try {
          listener.onItemRemoved(parentDirectory, item);
        } catch (ex) {
          Cu.reportError(ex);
        }
      }
    }
  },
  notifyDirectoryDeleted(parentDirectory, directory) {
    for (let [listener, notifyFlags] of listeners.entries()) {
      if (notifyFlags & Ci.nsIAbListener.directoryRemoved) {
        try {
          listener.onItemRemoved(parentDirectory, directory);
        } catch (ex) {
          Cu.reportError(ex);
        }
      }
    }
  },
  mailListNameExists(name) {
    ensureInitialized();
    for (let dir of store.values()) {
      if (dir.hasMailListWithName(name)) {
        return true;
      }
    }
    return false;
  },
  /**
   * Finds out if the directory name already exists.
   * @param {string} name - The name of a directory to check for.
   */
  directoryNameExists(name) {
    ensureInitialized();
    for (let dir of store.values()) {
      if (dir.dirName.toLowerCase() === name.toLowerCase()) {
        return true;
      }
    }
    return false;
  },
  generateUUID(directoryId, localId) {
    return `${directoryId}#${localId}`;
  },
  cardForEmailAddress(emailAddress) {
    if (!emailAddress) {
      return null;
    }

    if (addressCacheTimer) {
      clearTimeout(addressCacheTimer);
    }
    addressCacheTimer = setTimeout(() => {
      addressCacheTimer = null;
      addressCache.clear();
    }, 60000);

    if (addressCache.has(emailAddress)) {
      return addressCache.get(emailAddress);
    }

    for (let directory of sortedDirectoryList) {
      try {
        let card = directory.cardForEmailAddress(emailAddress);
        if (card) {
          addressCache.set(emailAddress, card);
          return card;
        }
      } catch (ex) {
        // Directories can throw, that's okay.
      }
    }

    addressCache.set(emailAddress, null);
    return null;
  },

  /* nsICommandLineHandler */

  get helpInfo() {
    return "  -addressbook       Open the address book at startup.\n";
  },
  handle(commandLine) {
    let found = commandLine.handleFlag("addressbook", false);
    if (!found) {
      return;
    }

    Services.ww.openWindow(
      null,
      "chrome://messenger/content/addressbook/addressbook.xhtml",
      "_blank",
      "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar",
      null
    );
    commandLine.preventDefault = true;
  },

  // This is here because it lives in Services.ab in Thunderbird 68.
  // After support is dropped it can be moved to the directory component.
  convertQueryStringToExpression(aQuery) {
    let [expression, tail] = parseExpression(aQuery.replace(/^\?|\s/g, ""));
    if (tail) {
      throw new Components.Exception("Trailing characters in query string", Cr.NS_ERROR_FAILURE);
    }
    return expression;
  },

  get wrappedJSObject() {
    return this;
  },
};
