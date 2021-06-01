const kFirstRunURL = "https://www.beonex.com/owl/log/install";
const kUnsupportedVersionURL = "https://www.beonex.com/owl/unsupported?oldVersion=%version%";

/** Extended flag for whether a message is a draft. */
const MAPI_MSGFLAG_UNSENT = 8;
const MAPI_MSGFLAG_READ = 1;

/**
 * Map from folder types to nsMsgFolder flag names.
 */
var kFolderTypes = {
  msgfolderroot: "", // must be the first entry
  inbox: "Inbox",
  drafts: "Drafts",
  sentitems: "SentMail",
  junkemail: "Junk",
  deleteditems: "Trash",
  outbox: "Queue",
};

var gStringBundle;
async function onInit() {
  gStringBundle = new StringBundle("owl");

  let firstRunTime = await browser.extPrefs.getStringValue("first_run");
  if (!firstRunTime) {
    if (await browser.addonPrivate.isFirstRun()) {
      await fetch(kFirstRunURL);
      browser.extPrefs.setStringValue("first_run", String(Date.now()));
    }
  }
}
addEventListener("DOMContentLoaded", onInit);


class OwlAccount {
    constructor(serverID) {
      /**
      * {string} the ID of this incoming server in the Thunderbird preferences
      */
      this.serverID = serverID;

      /**
      * The main OWA/EWS url for that server.
      * The value is a URL object as this allows easy extraction of the hostname.
      *
      * {URL} OWA/EWS url
      */
      this.serverURL = null;
    }
}

/**
 * Generic error class for error with extra data for logging purposes
 */
class ParameterError extends Error {
  constructor(type, message, parameters) {
    if (!message) {
      try {
        message = gStringBundle.get("error." + type);
      } catch (ex) {
        logError(new Error("Translation missing for error " + type));
      }
    }
    super(message);
    this.type = type;
    this.parameters = parameters;
  }
}

/**
 * Used to create an exception from an error identifier.
 *
 * @param aCode {String} The error identifier. (See VerifyLogin.)
 *
 * The message for the exception is automatically read from the string bundle.
 */
class OwlError extends Error { // TODO extends ParameterError
  constructor(code, serverMessage) {
    var message = serverMessage || code;
    try {
      message = gStringBundle.get("error." + code);
      if (serverMessage) {
        message += " (" + serverMessage + ")";
      }
    } catch (ex) {
      logError(new Error("Translation missing for error " + code));
    }
    super(message);
    this.code = code;
  }
}

class TooManyRequestsServerError extends OwlError {
  constructor(serverMessage) {
    super("server-overloaded", serverMessage);
  }
}

class InvalidSyncStateServerError extends OwlError {
  constructor(serverMessage) {
    super("invalid-sync-state", serverMessage);
  }
}

class ExchangeVersionError extends OwlError { // TODO extends ParameterError
  constructor(version, serverMessage) {
    super(version ? "unsupported-exchange-version" : "unknown-exchange-version", serverMessage);
    if (version) {
      this.message = this.message.replace("%version%", version);
    }

    // Open webpage
    let url = kUnsupportedVersionURL.replace("%version%", version || "unknown");
    //OpenOrSwitchToURL(url);
  }
}

/**
 * Returns a stringified object of the important properties of an error.
 *
 * @param ex The error or exception to be serialised
 * @returns {Error} new object with a message containing JSON
 *    The properties of |ex| are copied here.
 *
 * An additional benefit is that the stack we see here ends at the
 * Extension Manager, so we can concatenate the experiment's stack.
 */
function serialiseError(ex) {
  return new Error(JSON.stringify(Object.assign({
    // We need to copy the important properties manually, because
    // message, name and stack aren't enumerable, so won't normally get copied.
    message: ex.message,
    name: ex.name,
    stack: ex.stack,
  }, ex)));
}


async function OpenOrSwitchToURL(aURL)
{
  let tabs = await browser.tabs.query({ url: aURL, currentWindow: true });
  if (tabs[0]) {
    browser.tabs.update(tabs[0].id, { active: true });
  } else {
    browser.tabs.create({ url: aURL });
  }
}

/**
 * Convert from an Exchange-format email address object to Thunderbird style.
 */
function EWS2MailboxObject(aAddress)
{
  return {
    name: aAddress.Name || "",
    email: aAddress.EmailAddress || "",
  };
}

/**
 * Convert from a Thunderbird-style email address object to Exchange format.
 */
function MailboxObject2EWS(aAddress) {
  return {
    t$Name: aAddress.name,
    t$EmailAddress: aAddress.email,
  };
}

/**
 * Convert from a Thunderbird-style email address object to OWA format.
 */
function MailboxObject2OWA(aAddress) {
  return {
    Name: aAddress.name,
    EmailAddress: aAddress.email,
  };
}

/**
 * Takes a list of folders from Exchange and converts it into a tree.
 *
 * @param aFolders      {Array[Object]} A list of Exchange folder objects
 * @param aRootFolderId {String}        The folder id of the root pseudo-folder
 * @param aExtraFolders {Array[FolderTree]?} Folders to be added to the server
 * @returns             {Array[FolderTree]}  The top-level folders
 * @see Microsoft documentation for the properties of Exchange folder objects
 * @type FolderTree {Object} An object representing a folder hierarchy
 *         id       {String} The folder id of the folder
 *         name     {String} The display name of the folder
 *         type     {String} The special folder type
 *         total    {Number} The total number of messages in the folder
 *         unread   {Number} The number of unread messages in the folder
 *         children {Array[FolderTree]} A tree of child folder objects
 *
 * This function filters on the class of the folder, but not the type.
 * The caller must not pass folders that are not of Folder type.
 *
 * Note: If the parent of a folder cannot be found,
 *       it will be added as a child of the root instead.
 *       A numeric suffix will be added in the UI
 *       if the name would otherwise conflict.
 *       The name on the server is not changed.
 */
function ConvertFolderList(aFolders, aRootFolderId, aExtraFolders = [])
{
  let allFolders = [];
  allFolders.id = aRootFolderId;
  /// A map of folder IDs to the array that will hold child folders.
  let folderMap = {};
  // Initialise the map with the root of the folder hierarchy.
  folderMap[aRootFolderId] = allFolders;
  for (let folder of aFolders) {
    if (!folder.FolderClass || folder.FolderClass == "IPF.Note" ||
        folder.FolderClass.startsWith("IPF.Note.")) {
      let id = folder.FolderId.Id;
      // Add the current folder's child array to the map.
      folderMap[id] = [];
      // Add the folder details to the parent's child array.
      // If the parent isn't found then add it as an extra folder instead.
      (folderMap[folder.ParentFolderId.Id] || aExtraFolders).push({
        id: id,
        name: folder.DisplayName,
        type: kFolderTypes[folder.DistinguishedFolderId] || "",
        total: folder.TotalCount,
        unread: folder.UnreadCount,
        children: folderMap[id],
      });
    }
  }
  // Extra folders (shared folders and orphans) get added to the server.
  for (let extra of aExtraFolders) {
    let name = extra.name;
    let count = 0;
    // If the name duplicates an existing folder, add suffix -1 (or -2 etc.)
    while (allFolders.find(folder => folder.name == extra.name)) {
      extra.name = name + --count;
    }
    allFolders.push(extra);
  }
  return allFolders;
}

/**
 * Deep compare two objects for equality, with an optional comparator that
 * can be used to override the comparison on a case-by-case basis.
 * Only values that can be passed across an extension API are supported.
 * Objects compare equal if they have the same keys and their values compare.
 */
function deepCompare(a, b, comparator) {
  if (comparator) {
    let comparison = comparator(a, b);
    if (typeof(comparison) == "boolean") { // if comparator returns null, use default rules below
      return comparison;
    }
  }
  if (typeof(a) != typeof(b)) {
    return false;
  }
  if (typeof(a) != "object" || a == null) {
    return a == b;
  }
  let keysA = Object.keys(a);
  let keysB = Object.keys(b);
  if (keysA.length != keysB.length) {
    return false;
  }
  return keysA.every(key => deepCompare(a[key], b[key], comparator));
}

/**
 * Compares two arrays *independently of the order of their elements*.
 * Returns undefined if neither parameter is an array.
 */
function arrayCompareUnordered(a, b) {
  if (Array.isArray(a) != Array.isArray(b)) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length != b.length) {
      return false;
    }
    let clone = [...b];
    for (let aValue of a) {
      let index = clone.findIndex(bValue => deepCompare(aValue, bValue, arrayCompareUnordered));
      if (index < 0) {
        return false;
      }
      clone.splice(index, 1);
    }
    return true;
  }
  return null; // use default comparator for other value types
}

/**
 * Recursively compare two objects, but compare arrays equal if they contain
 * the same values *independently of their order*.
 */
function deepCompareUnordered(a, b) {
  return deepCompare(a, b, arrayCompareUnordered);
}

/**
 * Get a translated string from a string bundle
 *
 * @param aBundleName  {String} filename of the string bundle.
 *   "foo" loads …/locale/en/foo.properties
 * @param aID {String} the name of the resource
 * @returns           {String} The translated label
 */
function GetString(aBundleName, aID)
{
  return new StringBundle(aBundleName).get(aID);
}

/**
 * Returns base URLs for resource files of this extension.
 *
 * @returns {
 *   extBaseURL {URL} e.g. moz-ext://…/
 *   localeURL {URL} e.g. moz-ext://…/locale/de/
 * }
 */
function GetExtensionURL(aBundleName, aID)
{
  return {
    extBaseURL: chrome.extension.getURL(""),
    localeURL: chrome.extension.getURL("locale/" + getExtLocale() + "/"),
  };
}
