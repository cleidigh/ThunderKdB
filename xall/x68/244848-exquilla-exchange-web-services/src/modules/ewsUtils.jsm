/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file contains general purpose routines usable in ExQuilla. Some
// are adapted from core Mozilla code, hence the MPL license.

var EXPORTED_SYMBOLS = ["Utils"];

// Create an ews contacts directory

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CE = Components.Exception;

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Log } = ChromeUtils.import("resource://gre/modules/Log.jsm");
var { Preferences } = ChromeUtils.import("resource://gre/modules/Preferences.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Cu.importGlobalProperties(["fetch"]);
ChromeUtils.defineModuleGetter(this, "Base64", "resource://exquilla/Base64.jsm");
//ChromeUtils.defineModuleGetter(this, "TextEncoder", "resource://exquilla/TextEncoder.jsm");
ChromeUtils.defineModuleGetter(this, "jsmime", "resource:///modules/jsmime.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices", "resource:///modules/MailServices.jsm");
ChromeUtils.defineModuleGetter(this, "AddonManager",
                               "resource://gre/modules/AddonManager.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "OS", "resource://gre/modules/osfile.jsm");
Cu.importGlobalProperties(["Element", "XMLSerializer"]);

let versionComparator = Cc["@mozilla.org/xpcom/version-comparator;1"]
                          .getService(Ci.nsIVersionComparator);
var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);

// create a shared rotating log file appender
// extend the rotating file appender to do new lines using windows endings

var Utils = {};

// converts result numeric to string, such as NS_ERROR_REDIRECT_LOOP
function CN(result) {return CE("undefined", result).name;}

// return and callback with timer

// global reference to protect timers from gc
var timers = [];

function callLater(func, delay)
{
  let realDelay = delay ? delay : 0;
  let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timers.push(timer);
  timer.initWithCallback(
    function()
    {
      func();
      for (let i = 0; i < timers.length; i++)
      {
        if (timers[i] === timer)
        {
          timers = timers.splice(i, 1);
          break;
        }
      }
      timer = null;;
    },
    realDelay, Ci.nsITimer.TYPE_ONE_SHOT);
}

function se(error) // string error
{
  let jsFrame;
  let str = 'javascript error: ' + error + '\n';
  if (error)
  {
    str += (error.fileName ? ' file: ' + error.fileName : "") + ' line: ' + error.lineNumber + ' \n';
    jsFrame = error.stack;
  }
  if (!jsFrame)
    jsFrame = Components.stack;
  while (jsFrame)
  {
    let addString = jsFrame.toString() + ' \n';
    // skip re() and se() calls
    //if ( (addString.indexOf(":: se ::") == -1) &&
    //     (addString.indexOf(":: re ::") == -1))
      str += addString;
    jsFrame = jsFrame.caller;
  }
  return str;
}

function re(error, message)
{
  log.error(message, error);
  throw error;
}

// Used to set a C++ break in a js routine
function catchMe()
{
  dl('catchMe()');
  let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
  try {
    messenger.navigatePos = 10000;
  } catch (e) {}
}

function dl(t) {
  dump(t + "\n");
}

function aPL(aName, aParametersArray)
{
  let propertyList = new PropertyList();
  for (let i = 0; i < aParametersArray.length; i++)
  {
    propertyList.appendElement(aName, aParametersArray[i]);
  }

  return propertyList;
}

function oPL(aObject)
{
  let propertyList = new PropertyList();
  for (let item in aObject)
  {
    let valueEx = aObject[item];
    if (Array.isArray(valueEx))
    {
      for (let arrayEx of valueEx)
        propertyList.appendElement(item, arrayEx);
    }
    else
      propertyList.appendElement(item, valueEx);
  }
  return propertyList;
}

function stringPL(aList, aPrefix)
{
  let result = "";

  if (!(aList && aList.PropertyList))
  {
    result += 'aList not a property list, it is :' + aList + '\n';
    return result;
  }

  let prefix = "";
  if (typeof aPrefix != 'undefined' && aPrefix != "")
    prefix = aPrefix + '/';

  let enumerator = aList.enumerate();
  while (enumerator.hasMoreElements())
  {
    let nameObject = {};
    let property = enumerator.getNext(nameObject);
    let name = nameObject.value;
    if (property && property.PropertyList)
    {
      result += 'property <' + prefix + name + '> is PropertyList' + '\n';
      result += stringPL(property, prefix + name);
    }
    else
      result += 'property <' + prefix + name + '> is <' + property + '>' + '\n';
  }

  // show attributes
  let attributes;
  try {
    attributes = aList.getValue('$attributes');
  } catch (e) {} // not $attributes in list
  if (attributes)
  {
    if (!attributes.PropertyList)
    {
      result += '$attributes value is not a property list' + '\n';
      return result;
    }
    enumerator = attributes.enumerate();
    while (enumerator.hasMoreElements())
    {
      let nameObject = {};
      let property = enumerator.getNext(nameObject);
      let name = nameObject.value;
      result += 'attribute <' + prefix + '$attributes/' + name + '> is <' + property + '>' + '\n';
    }
  }

  // show value
  let valueElement;
  try {
    valueElement = aList.getValue('$value');
  } catch (e) {}
  if (valueElement)
  {
    result += '$value <' + prefix + '> is <' + aList.getAString('$value') + '>\n';
  }
  return result;
}

function showPL(pl)
{
  dl(stringPL(pl));
}

function domWindow()
{
  return Services.ww.activeWindow;
}

// debug utilities
function dumpXMLResponse(aElement) {
  try {
  var serializer = new XMLSerializer();
  let element;
  if (aElement.nodeType == aElement.DOCUMENT_NODE)
    element = aElement.documentElement;
  else
    element = aElement;
  if (!Element.isInstance(element)) {
    dump(se("element is not a DOM Element\n"));
    return;
  }
  //var prettyText = XML(serializer.serializeToString(element)).toXMLString();
  var prettyText = serializer.serializeToString(element);
  dump(prettyText);
  dump('\n');
  } catch (e)
  {
    dump(e + '\n');
    dl('element is ' + element);
    if (element.nodeType == element.DOCUMENT_NODE)
      dl('documentElement is ' + element.documentElement.nodeName);
    dl('nodeName: <' + element.nodeName + '>');
    let nodeList = element.childNodes;
    for (let i = 0; i < nodeList.length; i++)
      dl('child <' + nodeList[i].nodeName + '>');
  }
}

function stringXMLResponse(aElement) {
  try {
  var serializer = new XMLSerializer();
  let element;
  if (aElement.nodeType == aElement.DOCUMENT_NODE)
    element = aElement.documentElement;
  else
    element = aElement;
  // No more E4X :(
  // return XML(serializer.serializeToString(element)).toXMLString();
  return serializer.serializeToString(element);
  } catch (e) {return 'could not stringify DOM element'}
}

// import into a given scope the symbols in this module
// Importing into this always seems to import into the highest
// level object, and also the local namespace. So this function
// makes sense in a module, but in a function attached to a
// public window it should not be used, as there is no benefit
// of this over just using the module export.
function importLocally(scope)
{
  for (let method in Utils)
  {
    if (typeof scope[method] == 'undefined')
      scope[method] = Utils[method];
  }

  // also import standard abbreviations

  if (typeof scope.Cc == 'undefined') scope.Cc = Cc;
  if (typeof scope.Ci == 'undefined') scope.Ci = Ci;
  if (typeof scope.Cu == 'undefined') scope.Cu = Cu;
  if (typeof scope.Cr == 'undefined') scope.Cr = Cr;
  if (typeof scope.CE == 'undefined') scope.CE = CE;
}

// logging message
function addFileLine(args)
{
  let jsFrame = Components.stack.caller.caller;
  let str = '';
  try {
    str += "(in file " + jsFrame.filename + ", line " + jsFrame.lineNumber + ")";
  } catch (e) {};
  args.push(str);
  return args;
}

function getMsgDBHdrFromURI(aMsgURI)
{
  return Cc["@mozilla.org/messenger;1"]
           .createInstance(Ci.nsIMessenger)
           .messageServiceFromURI(aMsgURI)
           .messageURIToMsgHdr(aMsgURI);
}

// This progress listener is used to detect state stop as part of form-based authentication
function ProgressListener(aCallback)
{
  this.mCallback = aCallback;
}

ProgressListener.prototype.onStateChange = function onStateChange(aWebProgress, aRequest, aStateFlags)
{ try {
  if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP && this.mCallback)
  {
    this.mCallback(aWebProgress, aRequest);
  }
} catch (e) {re(e);}};

ProgressListener.prototype.QueryInterface = function QueryInterface(aIID)
{
  if (aIID.equals(Ci.nsIWebProgressListener)   ||
      aIID.equals(Ci.nsISupportsWeakReference) ||
      aIID.equals(Ci.nsISupports))
    return this;
  throw Cr.NS_NOINTERFACE;
}

// dummy calls
ProgressListener.prototype.onProgressChange = function() {};
ProgressListener.prototype.onLocationChange = function() {};
ProgressListener.prototype.onStatusChange = function() {};
ProgressListener.prototype.onSecurityChange = function() {};

// Open a content tab with URL aUrl, click handler string regex aStrRegEx
function openContentTab(aUrl, aStrRegEx, aDelay, aOnLoad, aOnListener, aSetTab)
{
  callLater( function _openTab()
  {
    let mail3PaneWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Ci.nsIWindowMediator)
                            .getMostRecentWindow("mail:3pane");
    let tabmail = mail3PaneWindow.document.getElementById("tabmail");
    let args =  { contentPage: aUrl,
                  background: false,
                  clickHandler: "exquilla.siteClickHandler(event, new RegExp(\"" + aStrRegEx + "\"));",
                };
    if (aOnLoad) args.onLoad = aOnLoad;
    if (aOnListener) args.onListener = aOnListener;

    let tab = tabmail.openTab('contentTab', args);
    if (aSetTab)
      aSetTab(tab);
  },
  aDelay);
}

// Manage the list of allowable ntlm URIs in network.automatic-ntlm-auth.trusted-uris
function manageNtlmUri(aSpec, aAdd)
{
  let uri = newParsingURI(aSpec);
  // scheme://host:port is the format
  let host = uri.scheme + "://" + uri.hostPort;
  log.info( "manageNtlmUri " + (aAdd ? "Adding" : "Removing") + " Spec " + aSpec + " host " + host);

  const pref = "network.automatic-ntlm-auth.trusted-uris";
  let hosts = Services.prefs.getCharPref(pref).split(",");
  // Don't allow an empty array entry
  if ( (hosts.length == 1) && !hosts[0].length)
    hosts = [];
  let changed = false;
  let existingIndex = hosts.indexOf(host.toLowerCase());

  // add new entries
  if (existingIndex == -1 && aAdd)
  {
    hosts.push(host.toLowerCase());
    changed = true;
  }

  // remove existing entry
  if (existingIndex != -1 && !aAdd)
  {
    hosts.splice(existingIndex, 1);
    changed = true;
  }

  if (changed)
  {
    Services.prefs.setCharPref(pref, hosts.join(","));
    log.debug("Changed ntlm pref to " + Services.prefs.getCharPref(pref));
  }
  return changed;
}

// object constructors

// exports
Utils.callLater = callLater;
Utils.se = se;
Utils.re = re;
Utils.getExtensionVersion = getExtensionVersion;
Utils.catchMe = catchMe;
Utils.dl = dl;
Utils.aPL = aPL;
Utils.oPL = oPL;
Utils.stringPL = stringPL;
Utils.showPL = showPL;
Utils.domWindow = domWindow;
Utils.dumpXMLResponse = dumpXMLResponse;
Utils.stringXMLResponse = stringXMLResponse;
Utils.importLocally = importLocally;
Utils.getMsgDBHdrFromURI = getMsgDBHdrFromURI;
Utils.CN = CN;
Utils.ProgressListener = ProgressListener;
Utils.openContentTab = openContentTab;
Utils.manageNtlmUri = manageNtlmUri;
Utils.StringArray = StringArray;
Utils.PropertyList = PropertyList;

Utils.postMoz6 = true;

//
// This is a very simple generator-based async framework. Original implementation
//  was in TweeQuilla loadSkinkGlue
//
function AsyncDriver()
{
  this.curGenerator = null;
  this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
}

AsyncDriver.prototype =
{
  nextStep: function asc_nextStep(aStatus)
  {
    // delay with a timer to prevent premature callbacks
    function _nextStep(aaStatus, curGenerator)
    {
      try {
        if (aaStatus)
        {
          curGenerator.send(aaStatus);
        }
        else
        {
          curGenerator.next();
        }
      }
      catch (ex) {
        if (ex != StopIteration) {
          re(ex, 'ExQuilla generator exception');
          curGenerator.next();
        }
      }
    }

    let curGenerator = this.curGenerator;
    this.timer.initWithCallback( function() {
        _nextStep(aStatus, curGenerator);
      },
	    0, Ci.nsITimer.TYPE_ONE_SHOT);
    return true;
  },

  runAsync: function asc_runAsync(aGenerator)
  {
    this.curGenerator = aGenerator.next ? aGenerator : aGenerator();
    this.nextStep();
  }
}

function MachineListener(asyncDriver)
{
  this.asyncDriver = asyncDriver;
}
MachineListener.prototype =
{
  onEvent: function onEvent(aItem, aEvent, aData, result)
  {
    if (aEvent == "StopMachine")
      this.asyncDriver.nextStep({aItem: aItem, aEvent: aEvent, aData: aData, result: result});
  },
};

// async nsIMsgCopyServiceListener implementation
function CopyServiceListener(asyncDriver)
{
  this.asyncDriver = asyncDriver;
}

CopyServiceListener.prototype =
{
  QueryInterface: ChromeUtils.generateQI([Ci.nsIMsgCopyServiceListener]),
  OnStartCopy: function() {},
  OnProgress: function(aProgress, aProgressMax) {},
  SetMessageKey: function(aKey) { },
  GetMessageId: function(aMessageId) {},
  SetMessageId: function(aMessageId) {},
  OnStopCopy: function(aStatus) {
   this.asyncDriver.nextStep({result: aStatus});
  },
};

// nsIUrlListener implementation
function UrlListener(asyncDriver)
{
  this.asyncDriver = asyncDriver;
}

UrlListener.prototype =
{
  QueryInterface: ChromeUtils.generateQI([Ci.nsIUrlListener]),
  OnStartRunningUrl: function(aUri) {},
  OnStopRunningUrl: function(aUri, aResult) {
    this.asyncDriver.nextStep({uri: aUri, result: aResult});
  },
};

/**
 * an enumeration of items in a JS array.
 *
 */
function ArrayEnumerator(aItems) {
  this._index = 0;
  this._contents = aItems;
}

ArrayEnumerator.prototype = {
  _index: 0,

  [Symbol.iterator]() {
    return this._contents.values();
  },

  hasMoreElements: function _hasMoreElements() {
    return this._index < this._contents.length;
  },

  getNext: function _getNext() {
    return this._contents[this._index++];
  },

  QueryInterface: function _QueryInterface(aId)
  {
    if (aId.equals(Ci.nsISupports) ||
        aId.equals(Ci.nsISimpleEnumerator))
        return this;
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
};

function getQueryVariable(variable, spec) {
  // adapted from http://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
  // by Tarik http://stackoverflow.com/users/44852/tarik
  let start = spec.indexOf("?");
  if (start == -1)
    start = spec.indexOf("&");
  if (start == -1)
    return null;
  let query = spec.substring(start + 1);
  let vars = query.split("&");
  for (let q of vars) {
    let pair = q.split("=");
    if (decodeURIComponent(pair[0]) == variable)
      return decodeURIComponent(pair[1]);
  }
  return null;
}

// parses ewsMessageURI
 //   adapted from nsParseLocalMessageURI
 // exquilla-message://server/folder1/folder2#123?header=none or
 // exquilla-message://server/folder1/folder2#1234&part=1.2
 //
 // puts folder URI in folderURI (exquilla://server/folder1/folder2)
 // message key number in key
 //
 // returns [folderURI, key, query]
 //
function parseMessageURI(uri)
{
  let querySeparator = uri.indexOf("?");
  // allow malformed uri with missing ?
  if (querySeparator == -1)
    querySeparator = uri.indexOf("&");
  let queryStr = (querySeparator != -1) ? uri.substr(querySeparator + 1) : "";

  let keySeparator = uri.indexOf("#");
  let pathSeparator = (keySeparator == -1) ? querySeparator : keySeparator;

  let folderURI = (pathSeparator == -1) ?
                    uri : uri.substring(0, pathSeparator);

  // cut out the -message part of the protocol
  folderURI = folderURI.replace("-message", "");

  // locate the ref part of the URL
  let keyStr = "";
  if (keySeparator != -1) {
    let keyEnd = (querySeparator == -1) ? uri.length : querySeparator;
    keyStr = uri.substring(keySeparator + 1, keyEnd);
  }
  else
  {
    // find the key in number= query
    keyStr = getQueryVariable("number", uri);
  }
  let keyInt = keyStr ? parseInt(keyStr, 10) : -1;
  return [folderURI, keyInt, queryStr];
}

function getEwsIncomingServerFromURI(aURI)
{
  let parsingURL = newParsingURI(aURI);
  let serverURI = parsingURL.prePath;
  // remove any folder suffix from the URL
  parsingURL = newParsingURI(serverURI);

  try {
    var msgServer = MailServices.accounts.findServerByURI(parsingURL, false);
  } catch (e) {
    //EWS_LOG_DEBUG_TEXT8("Failed to find EWS server with URI", nsCString(aURI).get());
    // I disabled this error, because in bug 1995 a log file with lots of foreign
    // exquilla URIs ends up here, and spews zillions of error messages, effectively
    // hanging the program. Downstream code ignores the error but can handle null URI.
    dl("no URI from findServerByURI in getEwsIncomingServerFromURI");
    return null;
  }
  // previously this returned the ews server, but because of getInterface we must now
  // return the skink server
  return msgServer;
}

Utils.AsyncDriver = AsyncDriver;
Utils.MachineListener = MachineListener;
Utils.CopyServiceListener = CopyServiceListener;
Utils.UrlListener = UrlListener;
Utils.ArrayEnumerator = ArrayEnumerator;
Utils.getQueryVariable = getQueryVariable;
Utils.parseMessageURI = parseMessageURI;
Utils.getEwsIncomingServerFromURI = getEwsIncomingServerFromURI;

// utf-friendly base64
function btoaUTF(string) {
  let encoder = new TextEncoder();
  return Base64.fromByteArray(encoder.encode(string));
}

function atobUTF(b64) {
  let decoder = new TextDecoder();
  return decoder.decode(Base64.toByteArray(b64));
}

Utils.atobUTF = atobUTF;
Utils.btoaUTF = btoaUTF;

// helper function to extend a display name, returns [extendedDisplayName, path]
function extendDisplayName(aDisplayName, aNativeFolder)
{
  let displayName = aDisplayName;
  let nativeMailbox = aNativeFolder.mailbox;

  // path will not use the email address in the root
  let path = displayName;

  // also prepend any parent folder names, up to the root folder
  let currentFolder = aNativeFolder;
  while (currentFolder)
  {
    let currentDFolderId = currentFolder.distinguishedFolderId;
    let parentId;
    let dfolderId;
    let parentFolder;
    if (currentDFolderId != "msgfolderroot")
    {
      parentId = currentFolder.parentFolderId;
      parentFolder = nativeMailbox.getNativeFolderFromCache(parentId);
      if (parentFolder)
        dfolderId = parentFolder.distinguishedFolderId;
    }

    let parentExtendedDisplayName = "";
    let parentDisplayName = "";

    // Has to work for GAL as well as normal contact folders
    if (!parentFolder || dfolderId == "msgfolderroot")
    {
      // To distinguish folders when there are multiple accounts, we will represent the
      //  root folder by the email address
      parentExtendedDisplayName = nativeMailbox.username;
    }
    else
    {
      parentDisplayName = parentFolder.displayName
      parentExtendedDisplayName = parentDisplayName;
    }

    parentExtendedDisplayName += "/" + displayName;
    displayName = parentExtendedDisplayName;

    // path does not have the user name for the root folder
    if (parentDisplayName)
      parentDisplayName += "/";
    parentDisplayName += path;
    path = parentDisplayName;
    if (dfolderId == "msgfolderroot")
      break;
    currentFolder = parentFolder;
  }
  return [displayName, path];
}
Utils.extendDisplayName = extendDisplayName;

// given a property list for an item, generate message header string using jsmime
function plToHeaders(properties)
{
  function addSimpleHeader(headerName, propertyName) {
    let v = properties.getAString(propertyName || headerName);

    // We had one case where a long References value was delimited by commas, not
    // by the expected spaces. Detect long values and split by spaces if needed.
    if (v && (v.length > 300) && (headerName == "References")) {
      let commaSplit = v.split(",");
      if (commaSplit.length > 1) {
        v = commaSplit[0];
        for (let i = 1; i < commaSplit.length; i++) {
          v += " " + commaSplit[i];
        }
      }
    }

    if (v) headers.set(headerName, [v]);
  }

  function addAddressesHeader(headerName, propertyName) {
    let pls = properties.getPropertyLists(propertyName + "/Mailbox");
    if (pls && pls.length) {
      let contacts = [];
      for (let contact of pls) {
        let name = contact.getAString("Name");
        let address = contact.getAString("EmailAddress");
        contacts.push({name: name, email: address});
      }
      headers.set(headerName, contacts);
    }
  }

  let headers = new Map();

  addSimpleHeader("Subject");
  addSimpleHeader("message-id", "InternetMessageId");
  addSimpleHeader("References");

  // from
  let fromPL = properties.getPropertyList("From/Mailbox");
  if (fromPL && fromPL.length) {
    let fromName = fromPL.getAString("Name");
    let fromAddress = fromPL.getAString("EmailAddress");
    headers.set("from", [{name: fromName, email: fromAddress}]);
  }

  // date
  let dateTimeReceived = properties.getAString("DateTimeReceived");
  if (dateTimeReceived) {
    let dateObj = new Date(dateTimeReceived);
    headers.set("date", [dateObj]);
  }

  // Multi-valued addresses
  addAddressesHeader("to", "ToRecipients");
  addAddressesHeader("cc", "CcRecipients");
  addAddressesHeader("bcc", "BccRecipients");
  addAddressesHeader("reply-to", "ReplyTo");

  return jsmime.headeremitter.emitStructuredHeaders(headers, {});
}
Utils.plToHeaders = plToHeaders;

// Given an XPCOM object following JaBase conventions, get a
// memory-safe JS wrapper. If, for example, obj is a reference
// to the delegator, then we must use getInterface to get
// a real reference to the JS object.
function safeGetJS(obj, type) {
  let jsXPObject = null;
  try {
    jsXPObject = obj.QueryInterface(Ci.nsIInterfaceRequestor)
                    .getInterface(Ci.nsISupports);
  } catch (e) {}
  if (jsXPObject && jsXPObject.wrappedJSObject &&
      (!type || jsXPObject.wrappedJSObject[type]))
    return jsXPObject.wrappedJSObject;
  return null;
}
Utils.safeGetJS = safeGetJS;

function generateRandomString(wantedLength)
{
  // generate a random string for use in the boundary

  let rg = Cc["@mozilla.org/security/random-generator;1"]
             .getService(Ci.nsIRandomGenerator);
  let bytes = rg.generateRandomBytes(wantedLength);
  return bytes.map(byte => byte.toString(16)).join("");
}
Utils.generateRandomString = generateRandomString;

// adapted from FeedUtils.jsm
function getSanitizedFolderName(aProposedName) {
  if (!aProposedName)
    aProposedName = "a" + generateRandomString(16);
  // Clean up the name for the strictest fs (fat) and to ensure portability.
  // 1) Replace line breaks and tabs '\n\r\t' with a -.
  // 2) Remove nonprintable ascii.
  // 3) Remove invalid win chars '* | \ / : < > ? "'.
  // 4) Remove leading and trailing '.' as starting/ending with one is trouble on osx/win.
  // 5) No leading/trailing spaces.
  let folderName = aProposedName.replace(/[\n\r\t]+/g, "-")
                                .replace(/[\x00-\x1F]+/g, "")
                                .replace(/[*|\\\/:<>?"]+/g, "")
                                .trim();
  folderName = folderName.replace(/^[\.]+/g, "").replace(/[\.]+$/g, "");

  // Prefix with __ if name is:
  // 1) a reserved win filename.
  // 2) an undeletable/unrenameable special folder name (bug 259184).
  if (folderName.toUpperCase()
                .match(/^COM\d$|^LPT\d$|^CON$|PRN$|^AUX$|^NUL$|^CLOCK\$/) ||
      folderName.toUpperCase()
                .match(/^INBOX$|^OUTBOX$|^UNSENT MESSAGES$|^TRASH$/))
    folderName = "__" + folderName;

  return folderName;
}
Utils.getSanitizedFolderName = getSanitizedFolderName;

// This routine provides a (possibly) translated message to
//  status feedback
function showStatusFeedback(aName)
{
  showStatusFeedbackString(aName, "");
}
Utils.showStatusFeedback = showStatusFeedback;

function showStatusFeedbackString(aName, aParameter)
{
  let text = "";
  try { // break on error
    let statusFeedback = MailServices.mailSession
                                     .topmostMsgWindow
                                     .statusFeedback;

    if (aName) {
      let bundle = Services.strings.createBundle("chrome://exquilla/locale/exquilla.properties");

      if (aParameter)
        text = bundle.formatStringFromName(aName, [aParameter], 1);
      else
        text = bundle.GetStringFromName(aName);
      if (!text)
      {
        log.warn("Could not get translated text, using code instead");
        text = aName;
      }
    }

    log.debug("showStatusFeedbackString: " + text);
    statusFeedback.showStatusString(text);
  } catch (e) { log.warn("failed to get status feedback");}
}
Utils.showStatusFeedbackString = showStatusFeedbackString;

// dispatch an event later on the current thread
function dispatchOnEvent(aListener, aItem, aEvent, aData, aResult) {
  Services.tm.currentThread.dispatch(() => {
    aListener.onEvent(aItem, aEvent, aData, aResult);
  }, Ci.nsIEventTarget.DISPATCH_NORMAL);
}
Utils.dispatchOnEvent = dispatchOnEvent;

// call the folder lookup service to get an existing folder
function getExistingFolder(aFolderURI) {
  if (!aFolderURI)
    return null;
  return Cc["@mozilla.org/mail/folder-lookup;1"]
           .getService(Ci.nsIFolderLookupService)
           .getFolderForURL(aFolderURI);
}
Utils.getExistingFolder = getExistingFolder;


// See NS_MsgStripRE, strips Re-like characters from front of subject
function stripRe(aString) {
  let result = aString;
  // todo: decode then recode
  let checkStrings = ["Re", "RE", "re", "rE"];
  let localizedRe = "";
  const PREF_STRING = 32;
  try {
    if (Services.prefs.getPrefType("mailnews.localizedRe") == PREF_STRING) {
      localizedRe = Services.prefs
                            .getComplexValue("mailnews.localizedRe", Ci.nsIPrefLocalizedString)
                            .data;
      if (localizedRe) {
        let newStrings = localizedRe.split(",");
        for (let newString of newStrings)
          checkStrings.push(newString);
      }
    }
  } catch (e) {}  // Don't fail if pref problem.

  // we cannot strip "Re:" for MIME encoded subject without modifying the original
  let mimeConverter; // save mimeConverter as a flag for needs re-encoding
  if (result.includes("=?")) {
    mimeConverter = MailServices.mimeConverter;
    let decodedString = mimeConverter.decodeMimeHeader(result, null, false, true);
    result = decodedString || result;
  }

  let hasChanged = false;
  let foundRe = true; // dummy value to kickoff loop
  while (result.length && foundRe) {
    foundRe = false;
    for (let re of checkStrings) {
      if (result.startsWith(re)) {
        // Skip for Re: (with colon)
        if (result[re.length] == ":") {
          // skip over re
          result = result.substring(re.length + 1)
                         .trimLeft();
          hasChanged = true;
          foundRe = true;
          break;
        }
        // Skip for Re[n]:
        if (result[re.length] == "[") {
          let closeIndex = result.indexOf("]:")
          if (closeIndex < 0 || isNaN(result.substring(re.length + 1, closeIndex)))
            continue; // not a valid strip
          result = result.substring(closeIndex + 2)
                         .trimLeft();
          hasChanged = true;
          foundRe = true;
          break;
        }
      }
    }
  }
  if (mimeConverter) {
    if (hasChanged)
    {
      // need to encode again
      let headerName = "Subject: ";
      result = mimeConverter.encodeMimePartIIStr_UTF8(
        result, false, "UTF-8", headerName.length, 1024);
    }
    else
      result = aString;
  }
  return [result, hasChanged];
}
Utils.stripRe = stripRe;

function executeSoon(aFunction)
{
  Services.tm.mainThread.dispatch(aFunction, Ci.nsIEventTarget.DISPATCH_NORMAL);
}
Utils.executeSoon = executeSoon;


// Check for valid return code
function CS(result) {
  return result == Components.results.NS_OK;
}
Utils.CS = CS;

// XPCOM-indifferent replacement for instanceOf
function safeInstanceOf(obj, iface) {
  try {
    if (obj &&
        (typeof obj) == "object" &&
        !!obj.QueryInterface &&
        obj.QueryInterface(iface))
    return true;
  } catch (e) {}
  // Try getInterface
  try {
    if (obj &&
        (typeof obj) == "object" &&
        !!obj.getInterface &&
        !!obj.getInterface(iface))
      return true;
  } catch (e) {}
  return false;
}
Utils.safeInstanceOf = safeInstanceOf;

// safe query interface, returns null if failure
function safeQueryInterface(obj, iface) {
  let result = null;
  try {
    result = obj.QueryInterface(iface);
  }
  catch (e) {}
  return result;
}
Utils.safeQueryInterface = safeQueryInterface;

function ServerAppender() {
}

ServerAppender.prototype = {
  level: Log.Level.Error,
  append: logErrorToServer,
  toString: function() {
    return "ServerAppender";
  },
};

async function logErrorToServer(logMessage)
{
  try {
    const kErrorLogURL = "https://api.beonex.com/error/log";
    const kExtPrefBranch = "extensions.exquilla.";
    var shouldSendLogs = Services.prefs.getBranch(kExtPrefBranch).getBoolPref("sendErrorLogs", true);
    if (!shouldSendLogs) {
      return;
    }

    let ex = logMessage.params || new Error();
    let type = ex.type || ex.code || ex.name;
    if (!type && ex instanceof Ci.nsIException) {
      type = "0x" + ex.result.toString(16);
    }
    let body = {
      message: logMessage.message,
      type: type,
      stack: getStack(ex),
      app: "exquilla",
      version: "exq-" + await getExtensionVersion(),
      hostAppVersion: Services.appinfo.version,
      user: getEmailAddressForUser(),
      exchangeURL: getLoginURLForUser(),
      parameters: ex.parameters,
    }
    if (logMessage.params) {
      let message = logMessage.params.message || String(logMessage.params);
      if (body.message) {
        body.message += " (" + message + ")";
      } else {
        body.message = message;
      }
    }
    console.log("sending to server:");
    console.log(body);
    await fetch(kErrorLogURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (ex) {
    console.error(ex);
  }
}

function getStack(ex) {
  var stack = ex.stack || new Error().stack;
  return stack
    .replace(/jar:file:[^!]*xpi!/g, "")
    .replace(/->/g, "\n");
}

async function getExtensionVersion()
{
  let addon = await AddonManager.getAddonByID("exquilla@mesquilla.com");
  return addon.version;
}

/**
 * Converts an nsIArray into an Array.
 *
 * @param aIArray {nsIArray}
 * @param aUUID   {nsIIDRef} The type of XPCOM elements of the array
 * @returns       {Array}
 *
 * If the parameter is not an nsIArray then it is simply returned.
 * This is useful for functions that need to be backward compatible.
 */
function toArray(aIArray, aUUID) {
  if (aIArray instanceof Ci.nsIArray) {
    let array = [];
    for (let i = 0; i < aIArray.length; i++) {
      array.push(aIArray.queryElementAt(i, aUUID));
    }
    return array;
  }
  return aIArray;
}
Utils.toArray = toArray;

/**
 * Opens the ExQuilla account creation wizard.
 */
function openAccountWizard(window) {
  try { /* COMPAT for TB 68 */
    Services.catMan.getCategoryEntry("Gecko-Content-Viewers", "mozilla.application/cached-xul");
    Services.ww.openWindow(null, "chrome://exquilla/content/ewsAccountWizard.xul",
                "AccountWizard", "chrome,modal,titlebar,centerscreen", null);
  } catch (ex) { /* COMPAT for TB 68 */
    Services.ww.openWindow(null, "chrome://exquilla/content/ewsAccountWizard.xhtml",
                "AccountWizard", "chrome,modal,titlebar,centerscreen", null);
  } // COMPAT for TB 68
}
Utils.openAccountWizard = openAccountWizard;

/**
 * Returns the email address of the first ExQuilla account,
 * or failing that, the primary email address in TB
 */
function getEmailAddressForUser() {
  try {
    for (let account of /* COMPAT for TB 68 */toArray(MailServices.accounts.accounts, Ci.nsIMsgAccount)) {
      if (account.incomingServer.type == "exquilla") {
        return account.defaultIdentity.email;
      }
    }
  } catch (ex) {
    console.error(ex);
  }
  try {
    return MailServices.accounts.defaultAccount.defaultIdentity.email;
  } catch (ex) {
    console.error(ex);
    return "unknown";
  }
}

/**
 * Returns the EWS URL of the first ExQiilla account.
 */
function getLoginURLForUser() {
  try {
    for (let account of /* COMPAT for TB 68 */toArray(MailServices.accounts.accounts, Ci.nsIMsgAccount)) {
      if (account.incomingServer.type == "exquilla") {
        let server = safeGetJS(account.incomingServer, "EwsIncomingServer");
        return server.ewsURL;
      }
    }
  } catch (ex) {
    console.error(ex);
    return null;
  }
}

// Rotating Log Appender, see log4moz RotatingFileAppender. Also, we do
// not truncate each file on restart like Log.FileAppender
// (Variation of Log.BoundedFileAppender)

const ONE_BYTE = 1;
const ONE_KILOBYTE = 1024 * ONE_BYTE;
const ONE_MEGABYTE = 1024 * ONE_KILOBYTE;

class RotatingFileAppender extends Log.Appender {
  constructor(path, formatter, maxSize = 4 * ONE_MEGABYTE) {
    super(formatter);
    this._name = "RotatingFileAppender";
    this._encoder = new TextEncoder();
    this._path = path;
    this._file = null;
    this._fileReadyPromise = null;
    dl("New RotatingFileAppender");
    this._size = 0;
    this._maxSize = maxSize;
    this._rotateFilePromise = null;
    this._pendingFile = null;
    this._pendingLogs = [];
  }

  async _openFile() {
    dl("_openFile for RotatingLogAppender at " + this._path);
    try {
      this._pendingFile = await OS.File.open(this._path,
        {write: true, append: true});
    } catch (err) {
      if (err instanceof OS.File.Error) {
        this._pendingFile = null;
      } else {
        throw err;
      }
    }
  }

  async _getFile() {
    await this._openFile();
    let fileStat = await this._pendingFile.stat();
    this._size += fileStat.size;
    this._file = this._pendingFile;
    this._pendingFile = null;
    this._fileReadyPromise = null;
    let pendingMessages = "";
    let pendingLog = this._pendingLogs.shift();
    for (; pendingLog; pendingLog = this._pendingLogs.shift()) {
      pendingMessages += pendingLog + "\n";
    }
    if (pendingMessages) {
      let byteArray = this._encoder.encode(pendingMessages);
      this._file.write(byteArray);
    }
  }

  doAppend(formatted) {
    this._size += formatted.length;
    if (this._file &&
        !this._rotateFilePromise &&
        this._size < this._maxSize) {
      let byteArray = this._encoder.encode(formatted + "\n");
      this._file.write(byteArray);
      return;
    }

    this._pendingLogs.push(formatted);
    if (this._fileReadyPromise || this._rotateFilePromise) {
      return; // just waiting to get the file
    }

    if (!this._file) {
      this._fileReadyPromise = this._getFile();
      return;
    }

    this._rotateFilePromise = (async () => {
      await this.reset();
      this._rotateFilePromise = null;
      if (!this._file)
        this._fileReadyPromise = this._getFile();
    })();
    return;
  }

  async reset() {
    dl("RotatingFileLog reset");
    this._size = 0;
    if (this._fileReadyPromise) {
      dl("_fileReadyPromise found during reset");
      // An attempt to open the file may still be in progress.
      await this._fileReadyPromise;
      this._fileReadyPromise = null;
    }
    await this._file.close();

    // copy to -1 version
    // parse the filename and extension
    let lastDot = this._path.lastIndexOf(".");
    let ext = (lastDot >= 0 ) ? this._path.substring(lastDot) : "";
    let basename = this._path.substring(0, lastDot);
    let nextName = basename + "-1" + ext;
    dl("Moving _file in fileClosePromise");
    this._file = null;
    return OS.File.move(this._path, nextName);
  }
}

// pads a number n to size spaces, with leadinf zeros.
function pad(n, size) {
  return (n + Math.pow(10, size)).toString().slice(-size);
}

// Make a file appender to share
var fileAppender = null; 
var formatter = null;
class EwsFormatter extends Log.BasicFormatter {
  format(message) {
    let mDate = new Date(message.time);
    let dateString = mDate.getFullYear() + "-" +
                     pad((mDate.getMonth() + 1), 2) + "-" +
                     pad(mDate.getDate(), 2) + " " +
                     pad(mDate.getHours(), 2) + ":" +
                     pad(mDate.getMinutes(), 2) + ":" +
                     pad(mDate.getSeconds(), 2) + "." +
                     pad(mDate.getMilliseconds(), 3);
    return dateString + "\t" +
           message.loggerName + "\t" +
           message.levelDesc + "\t" +
           this.formatText(message);
  }
}

// Adapted from core examples, including JSAccountUtils.jsm
// Sample usage from JSAccountUtils:
// Logger definitions.
//const LOGGER_NAME = "JsAccount";
//const PREF_BRANCH_LOG = "mailnews.jsaccount.log.";
//const PREF_LOG_LEVEL = PREF_BRANCH_LOG + "level";
//const PREF_LOG_DUMP = PREF_BRANCH_LOG + "dump";
//const LOG_LEVEL_DEFAULT = "Info"
//const LOG_DUMP_DEFAULT = true;

// We'll have internal defaults, global defaults, and individual
// method possibilities.
function configureLogging(localName)
{
  dump("ExQuilla Configure logging for " + localName + "\n");
  //var stack = new Error().stack;
  //dump("Stack: " + stack + "\n");
  const LOGGER_NAME = "exquilla." + localName;
  let log = Log.repository.getLogger(LOGGER_NAME);
  if (log.appenders.length) // Has this already been configured?
    return log;

  const PREF_BRANCH_LOG = "extensions.exquilla.log.";
  const PREF_BRANCH_LOCAL_LOG = PREF_BRANCH_LOG + localName;
  const PREF_LOG_LEVEL = PREF_BRANCH_LOG + "level"; // "Info"
  const PREF_LOG_DUMP = PREF_BRANCH_LOG + "dump"; // boolean
  const PREF_LOG_FILE = PREF_BRANCH_LOG + "file"; // boolean
  const PREF_LOG_SIZE = PREF_BRANCH_LOG + "filesize"; // max size of file in bytes
  const PREF_LOG_LOCAL_LEVEL = PREF_BRANCH_LOCAL_LOG + ".level";
  const PREF_LOG_LOCAL_DUMP = PREF_BRANCH_LOCAL_LOG + ".dump";
  const PREF_LOG_CONSOLE = PREF_BRANCH_LOCAL_LOG + ".console";
  const PREF_LOG_LOCAL_FILE = PREF_BRANCH_LOCAL_LOG + ".file";
  const LOG_LEVEL_DEFAULT = "Config";
  const LOG_LEVEL_CONSOLE_DEFAULT = "Info";
  const LOG_DUMP_DEFAULT = true;
  const LOG_FILE_DEFAULT = true;
  const LOG_SIZE_DEFAULT = 4*ONE_MEGABYTE;

  if (!formatter) {
    formatter = new EwsFormatter();
  }

  // Global defaults
  let glevel = Preferences.get(PREF_LOG_LEVEL, LOG_LEVEL_DEFAULT);
  log.level = Log.Level[glevel];
  let logDumping = Preferences.get(PREF_LOG_DUMP, LOG_DUMP_DEFAULT);
  let logLevelConsole = Preferences.get(PREF_LOG_CONSOLE, LOG_LEVEL_CONSOLE_DEFAULT);
  let logFile = Preferences.get(PREF_LOG_FILE, LOG_FILE_DEFAULT);
  let logSize = Preferences.get(PREF_LOG_SIZE, LOG_SIZE_DEFAULT);

  // Local defaults
  let llevel = Preferences.get(PREF_LOG_LOCAL_LEVEL, glevel);
  logDumping = Preferences.get(PREF_LOG_LOCAL_DUMP, logDumping);
  logFile = Preferences.get(PREF_LOG_LOCAL_FILE, logFile);

  // Only recreate the file appender once per session. Use non-null false
  // to clear.
  if (fileAppender === null) {
    let file = Services.dirsvc.get("ProfD", Ci.nsIFile);
    file.append("exquillalog.txt");
    fileAppender = new RotatingFileAppender(file.path, formatter, logSize);
    fileAppender.level = Log.Level[llevel];
  }

  // Log messages need to go to the browser console.
  let consoleAppender = new Log.ConsoleAppender(formatter);
  // Limit the console to info or higher
  consoleAppender.level = Log.Level[logLevelConsole];
  log.addAppender(consoleAppender);

  // Errors need to go to the server.
  let serverAppender = new ServerAppender();
  log.addAppender(serverAppender);

  // If enabled in the preferences, add a dump appender.
  if (logDumping) {
    let dumpAppender = new Log.DumpAppender(formatter);
    dumpAppender.level = Log.Level[llevel];
    dump("Setting up ExQuilla logging to dump for " + localName + " with level:" + llevel + "\n");
    log.addAppender(dumpAppender);
  }
  else
    dump("NOT Setting up ExQuilla logging to dump\n");

  // If enabled in the preferences, add a file appender.
  if (logFile && fileAppender) {
    log.addAppender(fileAppender);
  }

  // I can't seem to quit writing warning
  log.warning = log.warn;
  return log;
}
Utils.configureLogging = configureLogging;

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("base");
  return _log;
});

XPCOMUtils.defineLazyGetter(Utils, "ewsLog", () => {
  if (!_log) _log = Utils.configureLogging("base");
  return _log;
});

// Call at shutdown to flush the log.
async function promiseFlushLogging()
{
  if (!fileAppender) {
    dl("No file appender found for flushing");
    return;
  }

  log.removeAppender(fileAppender);
  if (fileAppender._rotateFilePromise)
    await fileAppender._rotateFilePromise;

  if (fileAppender._fileReadyPromise)
    await fileAppender._fileReadyPromise;
  
  if (fileAppender._file) {
    dl("starting close");
    await fileAppender._file.close();
    dl("finished close");
    fileAppender._file = null;
    fileAppender = false;
  }
  else
    dl("fileAppender._file not found\n");
  dl("Done shutting down logging");
}
Utils.promiseFlushLogging = promiseFlushLogging;

// returns the gecko platform major version as an integer
function platformMajorVersion() {
  let platformVersion = Services.appinfo.platformVersion;
  return parseInt(platformVersion.match(/^\d*/));
}
Utils.platformMajorVersion = platformMajorVersion;

// returns an input stream with available string content
function inputStreamFromString(aString) {
  let pipe = Cc["@mozilla.org/pipe;1"]
               .createInstance(Ci.nsIPipe);
  const UINT32_MAX = 0xffffffff;
  pipe.init(true, false, 0, UINT32_MAX);
  utfStringToStream(aString, pipe.outputStream);
  pipe.outputStream.close();
  return pipe.inputStream;
}
Utils.inputStreamFromString = inputStreamFromString;

// writes a string to an output stream as UTF-8
function utfStringToStream(aString, aOutputStream) {
  let converterOutputStream = Cc["@mozilla.org/intl/converter-output-stream;1"]
                                .createInstance(Ci.nsIConverterOutputStream);
  if (platformMajorVersion() >= 56) {
    converterOutputStream.init(aOutputStream, "UTF-8");
  }
  else {
    converterOutputStream.init(aOutputStream, "UTF-8", 0, 0x0000);
  }
  if (!converterOutputStream.writeString(aString)) {
    throw CE("Failed to write string to output stream");
  }
}
Utils.utfStringToStream = utfStringToStream;

// Create a uri from a standard URI to use simply for parsing the spec. This
// is not a valid URI for use with the protocol so do not save it - but on the
// other hand its creation is without side effects that can arise from trying to
// create a temporary but real URI simply for parsing purposes.
function newParsingURI(aSpec) {
  let uri = Services.io.newURI("http://localhost");
  if (Ci.nsIURIMutator) {
    uri = uri.mutate().setSpec(aSpec).finalize();
  } else {
    uri.spec = aSpec;
  }
  return uri;
}
Utils.newParsingURI = newParsingURI;
