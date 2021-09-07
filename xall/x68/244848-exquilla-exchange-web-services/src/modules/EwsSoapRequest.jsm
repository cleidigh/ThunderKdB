/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

// Implements soap request, transitioning from msqEwsSoapRequest.cpp

const EXPORTED_SYMBOLS = ["EwsSoapRequest"];

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
ChromeUtils.defineModuleGetter(this, "OS", "resource://gre/modules/osfile.jsm");
Cu.importGlobalProperties(["DOMParser", "Element", "XMLSerializer"]);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("native");
  return _log;
});
ChromeUtils.defineModuleGetter(this, "kOAuth2Password",
                               "resource://exquilla/EwsOAuth2.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNativeFolder",
                               "resource://exquilla/EwsNativeFolder.jsm");
ChromeUtils.defineModuleGetter(this, "SoapTransport",
                               "resource://exquilla/SoapTransport.jsm");
ChromeUtils.defineModuleGetter(this, "Base64", "resource://exquilla/Base64.jsm");

ChromeUtils.defineModuleGetter(this, "EWStoPL", "resource://exquilla/EWStoPL.js");

const kMigrationNeedsPrompt = 0;
const kMigrationInapplicable = 1;
const kMigrationNeverPrompt = 2;
const kMigrationSucceeded = 3;

// namespaces
const nsTypes = "http://schemas.microsoft.com/exchange/services/2006/types";
const nsMessages = "http://schemas.microsoft.com/exchange/services/2006/messages";
const nsEnvelope = "http://schemas.xmlsoap.org/soap/envelope/";
const nsEncoding = "http://schemas.xmlsoap.org/soap/encoding/";

// map of beginning of itemClass to EWS element type
// value if [elementName, xml function]
let gClassMap = { "IPM.Item": ["Item", "itemToItemXML"],
                  "IPM.Post": ["PostItem", "itemToPostXML"],
                  "IPM.Note": ["Message", "itemToMessageXML"],
                  "IPM.Contact": ["Contact", "itemToContactXML"],
                };

// constructed strings

// basic soap request, use expression:
// kSOAPp1 + requestVersion + kSOAPp2 + body + kSOAPp3
const kSOAPp1 =
'<s:Envelope' +
' xmlns:s="' + nsEnvelope +
'" xmlns:enc="' + nsEncoding +
'" xmlns:t="' + nsTypes +
'" xmlns="' + nsTypes +
'" xmlns:m="' + nsMessages +
'"><s:Header><t:RequestServerVersion Version="';
const kSOAPp2 =
 '"/></s:Header><s:Body>';
const kSOAPp3 ='</s:Body></s:Envelope>';

const PR_ATTR_HIDDEN = "0x10f4";

// Map of response message name to types
// See ArrayOfResponseMessagesType
const kResponseMessageType = {
  CreateFolderResponseMessage: "_FolderInfoResponseType",
  GetFolderResponseMessage: "_FolderInfoResponseType",
  MoveFolderResponseMessage: "_FolderInfoResponseType",
  DeleteFolderResponseMessage: "_ResponseMessageType",
  FindFolderResponseMessage: "_FindFolderResponseType",
  SyncFolderItemsResponseMessage: "_SyncFolderItemsType",
  GetItemResponseMessage: "_ItemInfoResponseType",
  CreateItemResponseMessage: "_ItemInfoResponseType",
  SendItemResponseMessage: "_ResponseMessageType",
  GetAttachmentResponseMessage: "_AttachmentInfoResponseType",
  CopyItemResponseMessage: "_ItemInfoResponseType",
  MoveItemResponseMessage: "_ItemInfoResponseType",
  DeleteItemResponseMessage: "_ResponseMessageType",
  CreateAttachmentResponseMessage: "_AttachmentInfoResponseType",
  FindItemResponseMessage: "_FindItemResponseType",
  ResolveNamesResponseMessage: "_ResolveNamesResponseType",
  UpdateItemResponseMessage: "_ItemInfoResponseType",
  ExpandDLResponseMessage: "_ExpandDLResponseType",
  SubscribeResponseMessage: "_SubscribeResponseType",
  UnsubscribeResponseMessage: "_UnsubscribeResponseType",
  GetStreamingEventsResponseMessage: "_GetStreamingEventsResponseMessageType",
}

// adapted from npm sanitize-filename
function sanitizeFilename(name) {
  const illegalRe = /[\/\?<>\\:\*\|":]/g;
  const controlRe = /[\x00-\x1f\x80-\x9f]/g;
  const reservedRe = /^\.+$/;
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  const windowsTrailingRe = /[\. ]+$/;
  const replacement = "_";

  let sanitized = name
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement);
  return sanitized.substring(0, 100);
}
// object constructors
//const PropertyList = new PropertyList();

// Get either a folderId or distinguished folder id from a nativeFolder, and
//  use it to initialize a property list.
function setFolderId(nativeFolder, folderPL) {
  let anyFolderId = nativeFolder.distinguishedFolderId;
  let isDistinguished = true;
  if (!anyFolderId) {
    isDistinguished = false;
    anyFolderId = nativeFolder.folderId;
    if (!anyFolderId) {
      log.warn("folder has no Id");
      throw Cr.NS_ERROR_NOT_INITIALIZED;
    }
  }
  let folderIdPL = folderPL.getPropertyList("FolderId");
  if (!folderIdPL) {
    folderIdPL = new PropertyList();
    folderPL.AppendProperlyList("FolderId", folderIdPL);
  }
  if (isDistinguished) {
    folderId.setAttribute("DistinguishedFolderId", anyFolderId);
  }
  else {
    folderId.setAttribute("FolderId", anyFolderId);
  }
}

// prepare a FolderIds XML string
// @parm aNativeFolders: array of EwsNativeFolder objects
function folderIdsXML(aNativeFolders)
{
  let xml = '<m:FolderIds>';
  for (let nativeFolder of aNativeFolders) {
    xml += folderIdXML(nativeFolder)
  }
  xml += '</m:FolderIds>';
  return xml;
}

function folderIdXML(aNativeFolder) {
  let xml = '';
  if (aNativeFolder.distinguishedFolderId) {
    xml +=
      `<DistinguishedFolderId Id="${_(aNativeFolder.distinguishedFolderId)}"/>`
  }
  else if (aNativeFolder.folderId) {
    xml +=
      `<FolderId Id="${_(aNativeFolder.folderId)}"/>`;
  }
  else {
    throw CE("missing folderId", Cr.NS_ERROR_NOT_INITIALIZED);
  }
  return xml;
}

// shorthand to return the value of an element child, of type nsTypes
function typeValue(element, name)
{
  try {
    return element.getElementsByTagNameNS(nsTypes, name)[0].textContent;
  }
  catch (e) {return "";}
}

// shorthand to return an int value of an element child, of type nsTypes
function typeValueInt(element, name)
{
  try {
    return parseInt(element.getElementsByTagNameNS(nsTypes, name)[0].textContent);
  }
  catch (e) {return 0;}
}

// get content safely
function safeContent(aElement, aType, aName)
{
  let content = null;
  try {
    content = aElement.getElementsByTagNameNS(aType, aName)[0].textContent;
  } catch (e) {}
  return content;
}

/*
<t:Folder>
<t:FolderId Id="AAMkAGFkYTY1YjZkLTIyZjctNDcyNy1hMmU4LTU1ZDA5ZmJiZjYzMQAuAAAAAAChmrQMyFlTQqhQxGONw0aJAQDnL5cEvLu1Ro/1QGwGrPfJAAAAvW4FAAA=" ChangeKey="AQAAABYAAADnL5cEvLu1Ro/1QGwGrPfJAACYcMid"/>
<t:ParentFolderId Id="AAMkAGFkYTY1YjZkLTIyZjctNDcyNy1hMmU4LTU1ZDA5ZmJiZjYzMQAuAAAAAAChmrQMyFlTQqhQxGONw0aJAQDnL5cEvLu1Ro/1QGwGrPfJAAAAvW4CAAA=" ChangeKey="AQAAAA=="/>
<t:FolderClass>IPF.Note</t:FolderClass>
<t:DisplayName>Inbox</t:DisplayName>
<t:TotalCount>54</t:TotalCount>
<t:ChildFolderCount>3</t:ChildFolderCount>
<t:ExtendedProperty>
<t:ExtendedFieldURI PropertyTag="0x10f4" PropertyType="Boolean"/>
<t:Value>false</t:Value>
</t:ExtendedProperty>
<t:UnreadCount>0</t:UnreadCount>
</t:Folder>
*/

// Update a native folder from a t:Folder element
// @parm EwsNativeFolder folder, the folder to update
// @parm Element element, a t:Folder element
function updateFromFolderElement(folder, element)
{
  folder.folderClass = typeValue(element, "FolderClass");
  folder.displayName = typeValue(element, "DisplayName");
  folder.totalCount = typeValueInt(element, "TotalCount");
  folder.childFolderCount = typeValueInt(element, "ChildFolderCount");
  folder.unreadCount = typeValueInt(element, "UnreadCount");

  let parentFolderIdElement =
    element.getElementsByTagNameNS(nsTypes, "ParentFolderId")[0];
  let parentFolderId = parentFolderIdElement.getAttribute("Id");

  // update parent, but make sure we are not our own parent!
  if (folder.folderId == parentFolderId) {
    log.warn("Trying to make a folder its own parent: " + folder.displayName);
  }
  else {
    folder.parentFolderId = parentFolderId;
  }

  // set hidden, defaulting to not hidden
  let hidden = false;
  try {
    let extendedProperties =
      element.getElementsByTagNameNS(nsTypes, "ExtendedProperty");
    for (let extendedProperty of extendedProperties) {
      let extendedFieldURI =
        extendedProperty.getElementsByTagNameNS(nsTypes, "ExtendedFieldURI")[0];
      if (extendedFieldURI.getAttribute("PropertyTag") == PR_ATTR_HIDDEN) {
        let hiddenString = typeValue(extendedProperty, "Value");
        hidden == (hiddenString != "true");
        break;
      }
    }
  } catch(e) {
    log.warn("Did not find Hidden in folder properties: " + e);
  }
  folder.hidden = hidden;
}

// make sure that the parent subfolder ids include a folder
function updateParentSubfolders(folder)
{
  let parentFolder = folder.mailbox.getNativeFolder(folder.parentFolderId);
  let subfolderIds = parentFolder.subfolderIds;

  let maybeFolder = parentFolder.getSubfolderNamed(folder.displayName);
  if (maybeFolder)
  {
    // compare the folderIds
    if (maybeFolder.folderId == folder.folderId) {
      return;
    }

    // Change of existing folderId
    folder.mailbox.removeFolderFromCache(maybeFolder.folderId);
    let maybeIndex = subfolderIds.indexOf(maybeFolder.folderId);
    if (maybeIndex != -1)
      subfolderIds.removeAt(maybeIndex);
  }

  if (subfolderIds.indexOf(folder.folderId) == -1) {
    subfolderIds.append(folder.folderId);
  }
}

/*
<FolderShape>
<BaseShape xmlns="http://schemas.microsoft.com/exchange/services/2006/types">Default</BaseShape>
<AdditionalProperties xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
<FieldURI FieldURI="folder:ParentFolderId"/>
<FieldURI FieldURI="folder:FolderClass"/>
<ExtendedFieldURI PropertyTag="0x10f4" PropertyType="Boolean"/>
</AdditionalProperties>
</FolderShape>
*/

// prepare a FolderShape XML string
function folderShapeXML()
{
  let xml = '<m:FolderShape><BaseShape>Default</BaseShape><AdditionalProperties>';
  xml += '<FieldURI FieldURI="folder:ParentFolderId"/>';
  xml += '<FieldURI FieldURI="folder:FolderClass"/>';
  xml += '<ExtendedFieldURI PropertyTag="0x10f4" PropertyType="Boolean"/>';
  xml += '</AdditionalProperties></m:FolderShape>';
  return xml;
}

// SOAPMessage implementation
var global = this;
function SoapMessage() {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);
}

SoapMessage.prototype = {

  //   The document which captures the message, if any.
  // attribute Document message;
  get message() {
    if (this._message)
      return this._message;
    if (this._messageString)
      this._message =
        new DOMParser().parseFromString(this._messageString, "text/xml");
    return this._message;
  },
  set message(a) { this._message = a;},

  //   messageString. If set in the call, use this string instead of a DOM message
  // attribute AString messageString;
  get messageString() { return this._messageString ? this._messageString : null;},
  set messageString(a) { this._messageString = a;},

  //   SOAP envelope from the document.
  // readonly attribute Element envelope;
  get envelope() {
    let message = this.message;
    if (!message) {
      return null;
    }
    return message.documentElement;
  },

  //   SOAP header from the envelope.
  // readonly attribute Element header;
  get header() {
    if (this.envelope) {
      return this.envelope.getElementsByTagNameNS(nsEnvelope, "Header")[0];
    }
    return null;
  },

  //   SOAP body from the envelope.
  // readonly attribute Element body;
  get body() {
    if (this.envelope) {
      return this.envelope.getElementsByTagNameNS(nsEnvelope, "Body")[0];
    }
    return null;
  },

  //   Encodes the specified parameters into this message, if
  //   this message type supports it.
  // void encode(in unsigned short aVersion,
  //             in AString aMethodName, in AString aTargetObjectURI,
  //             in unsigned long aHeaderBlockCount,
  //             [array,
  //             size_is(aHeaderBlockCount)] in msqISOAPHeaderBlock
  //            aHeaderBlocks, in unsigned long aParameterCount,[array,
  //                                                         size_is
  //                                                         (aParameterCount)]
  //             in msqISOAPParameter aParameters);

  // The remaining methods will go away when we are done converting from C++
}

// SOAPCall implementation
function SoapCall() {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);
  this._useProgress = false;
}

SoapCall.prototype = {
  __proto__: SoapMessage.prototype,

    /// SOAPCall implementation.

  // The URI to which the message will be sent
  //attribute AString transportURI;
  get transportURI() { return this._transportURI;},
  set transportURI(a) { this._transportURI = a;},

  //   Asynchronously invoke the call.
  // SOAPCallCompletion asyncInvoke(in SOAPResponseListener aListener,
  //                               [optional] in AString aUser,
  //                               [optional] in AString aPassword,
  //                               [optional] in AString aDomain);
  asyncInvoke(listener, username, password, domain, accessToken)
  {
    if (!this.transportURI)
      throw CE("No transport URI was specified", Cr.NS_ERROR_NOT_INITIALIZED);

    let transport = new SoapTransport();
    let response = new SoapResponse();
    if (username)
      transport.user = username;
    if (password)
      transport.password = password;
    if (domain)
      transport.domain = domain;
    if (accessToken)
      transport.accessToken = accessToken;
    if (this.useragent)
      transport.useragent = this.useragent;
    return transport.asyncCall(this, listener, response);
  },

  //   user (optional) A username for authentication if necessary.
  // attribute AString user;
  get user() { return this._user;},
  set user(a) { this._user = a;},

  //   password (optional) A password for authentication if necessary.
  // attribute AString password;
  get password() { return this._password;},
  set password(a) { this._password = a;},

  //   noParse: set to true if the response should not be parsed into xml.
  // attribute bool noParse;
  get noParse() { return !!this._noParse;},
  set noParse(a) { this._noParse = !!a;},

  //   useragent (optional) The User-Agent string to pass in the http request
  // attribute ACString useragent;
  get useragent() { return this._useragent ? this._useragent : "";},
  set useragent(a) { this._useragent = a;},

  get useProgress() { return this._useProgress;},
  set useProgress(a) { this._useProgress = a;},
}

function SoapResponse() {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);
}

// SOAPResponse implementation
SoapResponse.prototype = {
  __proto__: SoapMessage.prototype,

  /// HTML request code
  // attribute unsigned long htmlStatus;
  get htmlStatus() { return this._htmlStatus;},
  set htmlStatus(a) { this._htmlStatus = a;},

  /// HTML request text
  // attribute ACString htmlText;
  get htmlText() { return this._htmlText;},
  set htmlText(a) { this._htmlText = a;},

  // The underlying xml request, needed for error handling  and recovery
  // attribute XMLHttpRequest xhr;
  get xhr() { return this._xhr;},
  set xhr(a) { this._xhr = a;},
}

// Main class.
var gInstanceCount = 0;
function EwsSoapRequest() {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);

  this._retriedOAuth = false;

  // generally used values.
  this._inProgress = false;
  this._isAborted = false;

  // specific values used by various methods
  this._nativeFolder = null;
  this._instanceCount = ++gInstanceCount;
  this._requestName = "";
  this._attachments = null; // array of msqIEwsNativeAttachments
  this._nextIdIndex = 0; // used to sequence through a list of items
  this._ids = null; // a stringArray of ids to process
  this._isMove = null; // is a copy request a move?
  //log.debug("new EwsSoapRequest instance# " + this._instanceCount);
  this._items = null; // saved items to update
  this._getBody = false;

  // the property list of the response
  this._result = null;
  this._doError = false;

  // partial progress string that has not been processed
  this._partialProgress = "";
}

EwsSoapRequest.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },

  // Used to identify this as an EwsSoapRequest
  get EwsSoapRequest() {
    return this;
  },

  abort() {
    if (!this._isAborted) {
      this._isAborted = true;
      if (this.soapResponse && this.soapResponse.xhr) {
        log.debug("aborting soap request");
        this.soapResponse.xhr.abort();
      }
    }
  },

  get isAborted() { return this._isAborted;},
 
  get inProgress() { return this._inProgress;},
  set inProgress(a) { this._inProgress = a;},

  get requestName() { return this._requestName;},
  set requestName(a) { this._requestName = a;},

  get result() {
    return this._result;
  },
  set result(a) { this._result = a;},

  // Implementation in JS (if any) of methods in XPCOM interfaces.

  // EwsSoapRequest overrides
  getOnline(aResponse)
  {
    dl("ewsSoapRequestComponent: getOnline()");
    this._nativeFolder = this.mailbox.getNativeFolder("msgfolderroot");
    let body =
      '<m:GetFolder>' +
      '<m:FolderShape><BaseShape>IdOnly</BaseShape></m:FolderShape>' +
      '<m:FolderIds><DistinguishedFolderId Id="msgfolderroot"/></m:FolderIds>' +
      '</m:GetFolder>';
    this._setupSoapCall("GetOnline", aResponse, body);
  },

  getFolder(aResponse, aNativeFolder)
  {
    dl("ewsSoapRequestComponent: getFolder()");
    this._nativeFolder = aNativeFolder;

    let body = `<m:GetFolder>${folderShapeXML()}` +
               `${folderIdsXML([aNativeFolder])}</m:GetFolder>`;
    this._setupSoapCall("GetFolder", aResponse, body);
  },

  getFolders(aResponse, aNativeFolders)
  {
    log.config("ewsSoapRequestComponent: getFolders()");
    if (!aNativeFolders || !aNativeFolders.length)
      throw CE("no folders requested in getFolders");
    this._nativeFolders = aNativeFolders;
    this._nextFolderIndex = 0;
    let body = `<m:GetFolder>${folderShapeXML()}` +
               `${(folderIdsXML(aNativeFolders))}</m:GetFolder>`;
    this._setupSoapCall("GetFolders", aResponse, body);
  },

  createFolder(aResponse, aParentFolder, aChildFolder)
  {
    log.config("ewsSoapRequestComponent: createFolder() displayName=" +
       aChildFolder.displayName);
    this._nativeFolder = aChildFolder;
    if (!aChildFolder.folderClass)
      aChildFolder.folderClass = "IPF.Note";
    if (!aParentFolder.folderId && !aParentFolder.distinguishedFolderId)
      throw CE("Parent folder must have an id");
    if (aParentFolder.folderId)
      aChildFolder.parentFolderId = aParentFolder.folderId;

    let body =
      `<m:CreateFolder>` +
        `<m:ParentFolderId>${folderIdXML(aParentFolder)}</m:ParentFolderId>` +
        `<m:Folders>` +
          `<Folder>` +
            `<FolderClass>${_(aChildFolder.folderClass)}</FolderClass>` +
            `<DisplayName>${_(aChildFolder.displayName)}</DisplayName>` +
          `</Folder>` +
        `</m:Folders>` +
      `</m:CreateFolder>`;
    this._setupSoapCall("CreateFolder", aResponse, body);
  },

  createFolders(aResponse, aParentFolder, aChildFolders)
  {
    this._nativeFolders = aChildFolders;
    this._nextFolderIndex = 0;
    if (!aParentFolder.folderId && !aParentFolder.distinguishedFolderId)
      throw CE("Parent folder must have an id");

    let body =
      `<m:CreateFolder>` +
        `<m:ParentFolderId>${folderIdXML(aParentFolder)}</m:ParentFolderId>` +
        `<m:Folders>`;
    for (let childFolder of aChildFolders) {
      log.config("ewsSoapRequestComponent: createFolders() displayName=" +
                childFolder.displayName);
      if (!childFolder.folderClass)
        childFolder.folderClass = "IPF.Note";
      if (aParentFolder.folderId)
        childFolder.parentFolderId = aParentFolder.folderId;
      body +=
          `<Folder>` +
            `<FolderClass>${_(childFolder.folderClass)}</FolderClass>` +
            `<DisplayName>${_(childFolder.displayName)}</DisplayName>` +
          `</Folder>`;
    }
    body +=
        `</m:Folders>` +
      `</m:CreateFolder>`;
    this._setupSoapCall("CreateFolders", aResponse, body);
  },

  moveFolders(aResponse, aSourceFolderIds, aDestFolder)
  {
    log.config("ewsSoapRequestComponent: moveFolders()");
    this._nativeFolder = aDestFolder;
    this._ids = aSourceFolderIds;
    this._nextFolderIndex = 0;

    // set destination folder
    if (!aDestFolder.folderId)
      throw CE("Destination folder must have an id");

    let body =
      `<m:MoveFolder>` +
        `<m:ToFolderId>${folderIdXML(aDestFolder)}</m:ToFolderId>` +
        `<m:FolderIds>`;
    for (let i = 0; i < aSourceFolderIds.length; i++) {
      body += `<FolderId Id="${_(aSourceFolderIds.getAt(i))}"/>`;
    }
    body +=
        `</m:FolderIds>` +
      `</m:MoveFolder>`;
    this._setupSoapCall("MoveFolders", aResponse, body);
  },

  deleteFolder(aResponse, aNativeFolder, aMoveToDeletedItems)
  {
    log.config("ewsSoapRequestComponent: deleteFolder()");
    this._nativeFolder = aNativeFolder;

    let body =
      `<m:DeleteFolder DeleteType="` +
        (aMoveToDeletedItems ? 'MoveToDeletedItems' : 'HardDelete') + '">' +
        folderIdsXML([aNativeFolder]) +
      `</m:DeleteFolder>`;
    this._setupSoapCall("DeleteFolder", aResponse, body);
  },

  deleteFolders(aResponse, aFolderIds, aMoveToDeletedItems)
  {
    log.config("ewsSoapRequestComponent: deleteFolders()");
    this._ids = aFolderIds;  // a StringArray
    this._nextFolderIndex = 0;
    let folders = [];
    for (let i = 0; i < aFolderIds.length; i++) {
     let nativeFolder = this.mailbox.getNativeFolder(aFolderIds.getAt(i));
     log.config("Deleting native folder " + nativeFolder.displayName);
     folders.push(nativeFolder);
    }
    let body =
      `<m:DeleteFolder DeleteType="` +
        (aMoveToDeletedItems ? 'MoveToDeletedItems' : 'HardDelete') + '">' +
        folderIdsXML(folders) +
      `</m:DeleteFolder>`;
    this._setupSoapCall("DeleteFolders", aResponse, body);
  },

/*
<env:Body><FindFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages" Traversal="Deep">
<FolderShape><BaseShape xmlns="http://schemas.microsoft.com/exchange/services/2006/types">Default</BaseShape>
<AdditionalProperties xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
<FieldURI FieldURI="folder:ParentFolderId"/>
<FieldURI FieldURI="folder:FolderClass"/>
<ExtendedFieldURI PropertyTag="0x10f4" PropertyType="Boolean"/>
</AdditionalProperties></FolderShape>
<IndexedPageFolderView MaxEntriesReturned="100" Offset="0" BasePoint="Beginning"/>
<ParentFolderIds><DistinguishedFolderId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="msgfolderroot"/>
</ParentFolderIds></FindFolder></env:Body>
*/
  discoverSubfolders(aResponse, aNativeFolder, aMaxEntriesReturned, aOffset)
  {
    log.config("ewsSoapRequestComponent: discoverSubfolders()");
    this._nativeFolder = aNativeFolder;
    let body =
      `<m:FindFolder Traversal="Deep">` +
        `${folderShapeXML()}` +
        `<m:IndexedPageFolderView ` +
          `MaxEntriesReturned="${aMaxEntriesReturned || 100}" ` +
          `Offset="${aOffset}" ` +
          `BasePoint="Beginning"/>` +
        `<m:ParentFolderIds>${folderIdXML(aNativeFolder)}</m:ParentFolderIds>` +
      '</m:FindFolder>';
    this._setupSoapCall("DiscoverSubfolders", aResponse, body);
  },

/*
<env:Body><SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
<ItemShape><BaseShape xmlns="http://schemas.microsoft.com/exchange/services/2006/types">IdOnly</BaseShape>
<AdditionalProperties xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
<FieldURI FieldURI="item:ItemClass"/>
</AdditionalProperties></ItemShape>
<SyncFolderId><FolderId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAM...5R2AAA="/>
</SyncFolderId>
<SyncState>H4s...EgIAAA==</SyncState><MaxChangesReturned>100</MaxChangesReturned></SyncFolderItems></env:Body>
*/

  syncFolderItemsProperties(aResponse, aNativeFolder, aSyncState, aItems,
                            aMaxChangesReturned)
  {
    log.config("ewsSoapRequestComponent: syncFolderItemsProperties()");
    this._nativeFolder = aNativeFolder;
    this._items = aItems; // changed items will be stored here as EwsNativeItem
    let body =
      `<m:SyncFolderItems>` +
        `<m:ItemShape>` +
           `<BaseShape>IdOnly</BaseShape>` +
           `<AdditionalProperties>` +
             `<FieldURI FieldURI="item:ItemClass"/>` +
           `</AdditionalProperties>` +
          `</m:ItemShape>` +
        `<m:SyncFolderId>${folderIdXML(aNativeFolder)}</m:SyncFolderId>` +
        (aSyncState ? `<m:SyncState>${_(aSyncState)}</m:SyncState>` : `<m:SyncState/>`) +
        `<m:MaxChangesReturned>${aMaxChangesReturned}</m:MaxChangesReturned>` +
      `</m:SyncFolderItems>`;
    this._setupSoapCall("SyncFolderItemsProperties", aResponse, body);
  },

  generateError(aResponse)
  {
    log.config("ewsSoapRequestComponent: generateError()");
    let body = '<m:GenerateError/>';
    this._setupSoapCall("GenerateError", aResponse, body);
  },

  getItemBodies(aResponse, aNativeItems)
  {
    log.config("ewsSoapRequestComponent: getItemBodies()");
    let body =
      `<m:GetItem>` +
        `<m:ItemShape>` +
          `<BaseShape>IdOnly</BaseShape>` +
          `<AdditionalProperties>` +
            `<FieldURI FieldURI="item:Body"/>` +
          `</AdditionalProperties>` +
        `</m:ItemShape>` +
        `<m:ItemIds>`;
    for (let i = 0; i < aNativeItems.length; i++) {
      let item = aNativeItems.queryElementAt(i, Ci.nsISupports).wrappedJSObject;
      body += `<ItemId Id="${_(item.itemId)}"/>`;
    }
    body += `</m:ItemIds></m:GetItem>`;
    this._setupSoapCall("GetItemBodies", aResponse, body);
  },

  getItemsMimeContent(aResponse, aNativeItems)
  {
    log.config("ewsSoapRequestComponent: GetItemsMimeContent()");
    let body =
      `<m:GetItem>` +
        `<m:ItemShape>` +
          `<BaseShape>IdOnly</BaseShape>` +
          `<AdditionalProperties>` +
            `<FieldURI FieldURI="item:MimeContent"/>` +
          `</AdditionalProperties>` +
        `</m:ItemShape>` +
        `<m:ItemIds>`;
    for (let i = 0; i < aNativeItems.length; i++) {
      let item = aNativeItems.queryElementAt(i, Ci.nsISupports).wrappedJSObject;
      body += `<ItemId Id="${_(item.itemId)}"/>`;
    }
    body += `</m:ItemIds></m:GetItem>`;
    this._setupSoapCall("GetItemsMimeContent", aResponse, body);
  },

/*
<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
<SavedItemFolderId>
<FolderId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMk..."/>
</SavedItemFolderId>
<Items>
<Contact xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
<Culture>en-US</Culture>
<FileAs>SomeFileAs</FileAs>
<DisplayName>The display name</DisplayName>
<GivenName>SomeGivenName</GivenName>
<EmailAddresses>
<Entry Key="EmailAddress1">somebody@example.org</Entry>
<Entry Key="EmailAddress2">second@example.com</Entry>
</EmailAddresses>
<PhysicalAddresses>
<Entry Key="Home">
<Street>One Microsoft Way</Street>
<City>Redmond</City>
<State>WA</State>
</Entry>
<Entry Key="Business">
<Street>10110 177th Ave NE</Street>
<City>Redmond</City>
<State>WA</State>
</Entry>
</PhysicalAddresses>
<Surname>SomeSurname</Surname>
</Contact></Items></CreateItem>
*/
  createItem(aResponse, item, aMessageDisposition)
  {
    log.config("ewsSoapRequestComponent: CreateItem()");
    // JS-processed itemClass
    let jsClasses = ["IPM.Item", "IPM.Post", "IPM.Note", "IPM.Contact"];
    if (jsClasses.every(ewsClass => !item.itemClass.startsWith(ewsClass))) {
      log.warn("CreateItem does not support this item class: " + item.itemClass + " using generic item class");
    }

    this._nativeItem = item;

    let itemName = "Item";
    let itemFunction = "itemToItemXML";
    for (let itemClassStart in gClassMap) {
      if (item.itemClass.startsWith(itemClassStart)) {
        itemName = gClassMap[itemClassStart][0];
        itemFunction = gClassMap[itemClassStart][1];
        break;
      }
    }

    let disposition = (itemName != "Message") ? "" :
      ` MessageDisposition="${aMessageDisposition || 'SaveOnly'}"`;

    let body =
      `<m:CreateItem${disposition}>` +
        `<m:SavedItemFolderId>` +
          `<FolderId Id="${_(item.folderId)}"/>` +
        `</m:SavedItemFolderId>` +
        `<m:Items>`;

    body += `<${itemName}>${EWStoPL[itemFunction](item, true)}</${itemName}>`;
    body += `</m:Items></m:CreateItem>`;
    this._setupSoapCall("CreateItem", aResponse, body);
  },

/*
<?xml version="1.0"?>
<Body>
  <SendItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages" SaveItemToFolder="false">
    <ItemIds>
        <ItemId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMkAGQzY2E5ZjA3LWE3MTUtNDY5Zi05M2ZjLTM4MTgwYjhhOTZlOABGAAAAAABTdrosZnUQTY8VYjBkqTSCBwAlHg+JR6cWRLoRNW2wKLfVAAAADBxgAAAlHg+JR6cWRLoRNW2wKLfVAACWDVDHAAA=" ChangeKey="CQAAABYAAAAlHg+JR6cWRLoRNW2wKLfVAACWDfP8"/>
    </ItemIds>
  </SendItem>
</Body>
*/
  sendItem(aResponse, aNativeItem, aSaveItem, aSavedItemFolderId) {
    log.config("ewsSoapRequestComponent sendItem()");
    let body =
      `<m:SendItem SaveItemToFolder="${aSaveItem ? 'true' : 'false'}">` +
        `<m:ItemIds><ItemId Id="${_(aNativeItem.itemId)}"` +
                          ` ChangeKey="${_(aNativeItem.changeKey)}"/>` +
        `</m:ItemIds>`;
    if (aSavedItemFolderId && aSaveItem) {
      body += `<m:SavedItemFolderId><FolderId Id="${_(aSavedItemFolderId)}"/>` +
              `</m:SavedItemFolderId>`;
    }
    body += `</m:SendItem>`;
    this._setupSoapCall("SendItem", aResponse, body);
  },

/*
<env:Body>
    <GetAttachment xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
    <AttachmentIds>
        <AttachmentId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMkAGQz...."/>
    </AttachmentIds>
</GetAttachment>
</env:Body>

<GetAttachmentResponseMessage ResponseClass="Success">
    <ResponseCode>NoError</ResponseCode>
    <Attachments>
        <FileAttachment>
            <AttachmentId Id="AAMkAGQzY..."/>
            <Name>attachment.txt</Name>
            <ContentType>text/plain</ContentType>
            <Content>VGhpcyBpcyBhIHNob3J0IHRlc3QKb2YgYXR0YWNobWVudHMuCg==</Content>
        </FileAttachment>
    </Attachments>
</GetAttachmentResponseMessage>
*/

  getAttachment(aResponse, aNativeAttachment) {
    log.config("ewsSoapRequestComponent getAttachment()");
    this._attachments = [aNativeAttachment];
    if (!aNativeAttachment.attachmentId) {
      throw CE("Attachment has no ID", Cr.NS_ERROR_NOT_INITIALIZED);
    }

    let body = `<m:GetAttachment>`;
    if (!aNativeAttachment.isFileAttachment) {
      body +=
        `<m:AttachmentShape>` +
          `<IncludeMimeContent>true</IncludeMimeContent>` +
        `</m:AttachmentShape>`;
    }
    body +=
      `<m:AttachmentIds>` +
        `<AttachmentId Id="${_(aNativeAttachment.attachmentId)}"></AttachmentId>` +
      `</m:AttachmentIds>`;
    body += `</m:GetAttachment>`;
    this._setupSoapCall("GetAttachment", aResponse, body);
  },

/*
<CopyItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
  <ToFolderId>
    <FolderId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMkAGQz..."/>
  </ToFolderId>
  <ItemIds>
    <ItemId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMkAGQz..."/>
  </ItemIds>
</CopyItem>

<m:CopyItemResponse"><m:ResponseMessages><m:CopyItemResponseMessage ResponseClass="Success">
  <m:ResponseCode>NoError</m:ResponseCode>
  <m:Items>
    <t:Message>
      <t:ItemId Id="AAMkAGQ..." ChangeKey="CQAA..."/>
    </t:Message>
  </m:Items>
</m:CopyItemResponseMessage></m:ResponseMessages></m:CopyItemResponse>
*/
  copyItems(aResponse, aDestFolder, aItemIds, aIsMove) {
    log.config("copyItems()");
    this._nativeFolder = aDestFolder;
    this._ids = aItemIds;
    this._isMove = aIsMove;
    let body = `<m:${aIsMove ? "MoveItem" : "CopyItem"}>` +
      `<m:ToFolderId>${folderIdXML(aDestFolder)}</m:ToFolderId>` +
      `<m:ItemIds>`;
    for (let i = 0; i < aItemIds.length; i++) {
      body += `<ItemId Id="${_(aItemIds.getAt(i))}"/>`;
    }
    body += `</m:ItemIds></m:${aIsMove ? "MoveItem" : "CopyItem"}>`;
    this._setupSoapCall("CopyItems", aResponse, body);
  },

/*
<DeleteItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages" DeleteType="HardDelete">
  <ItemIds>
    <ItemId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMk..."/>
  </ItemIds>
</DeleteItem>

<m:DeleteItemResponse>
  <m:ResponseMessages>
    <m:DeleteItemResponseMessage ResponseClass="Success">
      <m:ResponseCode>NoError</m:ResponseCode>
    </m:DeleteItemResponseMessage>
  </m:ResponseMessages>
</m:DeleteItemResponse>
*/

  deleteItems(aResponse, aItemIds, aMoveToDeletedItems) {
    log.config("deleteItems()");
    // xxx todo: This method no longer supports calendar item deletes with
    //           recurring items. See the original C++ soapRequest.
    let body = `<m:DeleteItem DeleteType="${aMoveToDeletedItems ? "MoveToDeletedItems" : "HardDelete"}">`;
    body += `<m:ItemIds>`;
    for (let i = 0; i < aItemIds.length; i++) {
      body += `<ItemId Id="${_(aItemIds.getAt(i))}"/>`;
    }
    body += `</m:ItemIds></m:DeleteItem>`;
    this._setupSoapCall("DeleteItems", aResponse, body);
  },

/*
<CreateAttachment xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
  <ParentItemId Id="AAMkAGQz..."/>
  <Attachments>
    <FileAttachment xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
      <Name>thefile.txt</Name>
      <ContentType>text/plain</ContentType>
      <t:Content xmlns="">VGhpcyBp...</t:Content>
    </FileAttachment>
  </Attachments>
</CreateAttachment>

<m:CreateAttachmentResponseMessage ResponseClass="Success">
  <m:ResponseCode>NoError</m:ResponseCode>
  <m:Attachments>
    <t:FileAttachment>
      <t:AttachmentId Id="AAMkAGQzY..." RootItemId="..." RootItemChangeKey="CQAAA..."/>
    </t:FileAttachment>
  </m:Attachments>
</m:CreateAttachmentResponseMessage>
*/

  createAttachment(aResponse, aNativeAttachment) {
    log.config("ewsSoapRequest createAttachment() with fileURL " + aNativeAttachment.fileURL);
    this._attachments = [aNativeAttachment];
    let parentItemId = aNativeAttachment.parentItem.itemId;
    let body = `<m:CreateAttachment>`;
    body += `<m:ParentItemId Id="${_(parentItemId)}"/>`;
    body += `<m:Attachments><FileAttachment>`;
    body += `<Name>${_(aNativeAttachment.name)}</Name>`;
    body += `<ContentType>${_(aNativeAttachment.contentType)}</ContentType>`;
    if (aNativeAttachment.contentId) {
      body += `<ContentId>${_(aNativeAttachment.contentId)}</ContentId>`;
      if (this.mailbox.serverVersion &&
          this.mailbox.serverVersion != "2007sp1")
      {
        // server supports inline
        body += `<IsInline>true</IsInline>`;
      }
    }
    // get the file content
    let uri = Services.io.newURI(aNativeAttachment.fileURL, null, null);
    let file = uri.QueryInterface(Ci.nsIFileURL).file;
    let istream = Cc["@mozilla.org/network/file-input-stream;1"]
                    .createInstance(Ci.nsIFileInputStream);
    istream.init(file, -1, -1, 0);
    let bstream = Cc["@mozilla.org/binaryinputstream;1"]
                    .createInstance(Ci.nsIBinaryInputStream);
    bstream.setInputStream(istream);
    let content = bstream.readBytes(bstream.available());
    istream.close();
    body += `<Content>${btoa(content)}</Content>`;
    body += `</FileAttachment></m:Attachments>`;
    body += `</m:CreateAttachment>`;
    this._setupSoapCall("CreateAttachment", aResponse, body);
  },

/*
<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages" Traversal="Shallow">
  <ItemShape>
    <BaseShape xmlns="http://schemas.microsoft.com/exchange/services/2006/types">IdOnly</BaseShape>
    <AdditionalProperties xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
      <FieldURI FieldURI="item:ItemClass"/>
      <ExtendedFieldURI PropertyTag="0x0E69" PropertyType="Boolean"/>
    </AdditionalProperties>
  </ItemShape>
  <IndexedPageItemView MaxEntriesReturned="500" Offset="0" BasePoint="Beginning"/>
  <ParentFolderIds>
    <FolderId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMkAGQz..."/>
  </ParentFolderIds>
</FindItem>

<m:FindItemResponseMessage ResponseClass="Success">
  <m:ResponseCode>NoError</m:ResponseCode>
  <m:RootFolder IndexedPagingOffset="1" TotalItemsInView="1" IncludesLastItemInRange="true">
    <t:Items>
      <t:Message>
        <t:ItemId Id="AAMkAG..." ChangeKey="CQAAABY..."/>
        <t:ItemClass>IPM.Item</t:ItemClass>
        <t:ExtendedProperty>
          <t:ExtendedFieldURI PropertyTag="0xe69" PropertyType="Boolean"/>
          <t:Value>true</t:Value>
        </t:ExtendedProperty>
      </t:Message>
    </t:Items>
  </m:RootFolder>
</m:FindItemResponseMessage>
*/

  getAllIds(aResponse, aNativeFolder, aOffset, aMaxItems) {
    log.config("getAllIds()");
    let body =
      `<m:FindItem Traversal="Shallow">` +
        `<m:ItemShape>` +
         `<BaseShape>IdOnly</BaseShape>` +
         `<AdditionalProperties>` +
           `<FieldURI FieldURI="item:ItemClass"/>` +
           `<ExtendedFieldURI PropertyTag="0x0E69" PropertyType="Boolean"/>` +
          `</AdditionalProperties>` +
        `</m:ItemShape>` +
        `<m:IndexedPageItemView MaxEntriesReturned="${aMaxItems}" Offset="${aOffset}" BasePoint="Beginning"/>` +
        `<m:ParentFolderIds>${folderIdXML(aNativeFolder)}</m:ParentFolderIds>` +
      `</m:FindItem>`;
    this._setupSoapCall("GetAllIds", aResponse, body);
  },

/*
<ResolveNames xmlns="http://schemas.microsoft.com/exchange/services/2006/messages" ReturnFullContactData="true">
  <UnresolvedEntry>Test</UnresolvedEntry>
</ResolveNames>

<m:ResolveNamesResponseMessage ResponseClass="Warning">
  <m:MessageText>Multiple results were found.</m:MessageText>
  <m:ResponseCode>ErrorNameResolutionMultipleResults</m:ResponseCode>
  <m:DescriptiveLinkKey>0</m:DescriptiveLinkKey>
  <m:ResolutionSet TotalItemsInView="3" IncludesLastItemInRange="true">
  <t:Resolution>
    <t:Mailbox>
      <t:Name>test@exquilla.com</t:Name>
      <t:EmailAddress>test@exquilla.com</t:EmailAddress>
      <t:RoutingType>SMTP</t:RoutingType>
      <t:MailboxType>Mailbox</t:MailboxType>
    </t:Mailbox>
    <t:Contact>
      <t:DisplayName>Test User</t:DisplayName>
      <t:Culture>en-US</t:Culture>
      <t:GivenName>Test</t:GivenName>
      <t:CompanyName>exquilla_com</t:CompanyName>
      <t:EmailAddresses>
        <t:Entry Key="EmailAddress1">smtp:test@exquilla-com.sherweb2010.com</t:Entry>
        <t:Entry Key="EmailAddress2">SMTP:test@exquilla.com</t:Entry>
      </t:EmailAddresses>
      <t:PhysicalAddresses>
        <t:Entry Key="Business">
          <t:CountryOrRegion>United States</t:CountryOrRegion>
        </t:Entry>
      </t:PhysicalAddresses>
      <t:ContactSource>ActiveDirectory</t:ContactSource>
      <t:Surname>User</t:Surname>
    </t:Contact>
  </t:Resolution>
  <t:Resolution>
    <t:Mailbox>
      <t:Name>test2@exquilla.com</t:Name>
      <t:EmailAddress>test2@exquilla.com</t:EmailAddress>
      <t:RoutingType>SMTP</t:RoutingType>
      <t:MailboxType>Mailbox</t:MailboxType>
    </t:Mailbox>
    <t:Contact>
      <t:DisplayName>Test 2</t:DisplayName>
      <t:Culture>en-US</t:Culture>... etc
      </t:Mailbox>
    </t:Resolution>
  </m:ResolutionSet>
</m:ResolveNamesResponseMessage>
*/
  resolveNames(aResponse, aEntry, aReturnFullContactData) {
    log.config("resolveNames");
    let body = `<m:ResolveNames ReturnFullContactData="${aReturnFullContactData ? "true" : "false"}">` +
      `<m:UnresolvedEntry>${_(aEntry)}</m:UnresolvedEntry>` +
      `</m:ResolveNames>`;
    this._setupSoapCall("ResolveNames", aResponse, body);
  },

  deleteDeletedOccurrences(aResponse, aItem, aMoveToDeletedItems) {
    throw CE("delete deleted occurances not implemented", Cr.NS_ERROR_NOT_IMPLEMENTED);
  },
/*
StreamingSubscriptionRequest example from:
 https://msdn.microsoft.com/EN-US/library/office/dn458792%28v=exchg.150%29.aspx?f=255&MSPPError=-2147217396#bk_cestreamews

    <m:Subscribe>
      <m:StreamingSubscriptionRequest>
        <t:FolderIds>
          <t:DistinguishedFolderId Id="inbox" />
        </t:FolderIds>
        <t:EventTypes>
          <t:EventType>NewMailEvent</t:EventType>
          <t:EventType>CreatedEvent</t:EventType>
          <t:EventType>DeletedEvent</t:EventType>
          <t:EventType>ModifiedEvent</t:EventType>
          <t:EventType>MovedEvent</t:EventType>
          <t:EventType>CopiedEvent</t:EventType>
          <t:EventType>FreeBusyChangedEvent</t:EventType>
        </t:EventTypes>
      </m:StreamingSubscriptionRequest>
    </m:Subscribe>
*/
  subscribeNotifications(aResponse, aNativeFolders, aCheckAll) {
    if (this.mailbox.serverVersion == "2007sp1")
      throw CE("Not supported in 2007sp1", NS_ERROR_NOT_IMPLEMENTED);

    // We can't use `folderIdsXML()` here because that puts the `FolderIds`
    // element in the `messages` namespace but `StreamingSubscriptionRequest`
    // is a special snowflake and needs it in the `types` namespace.
    let body = 
      `<m:Subscribe>` +
        `<m:StreamingSubscriptionRequest SubscribeToAllFolders="${aCheckAll ? 'true' : 'false'}">` +
          (aCheckAll ? "" : `<FolderIds>` + aNativeFolders.map(folderIdXML) + `</FolderIds>`) +
          `<EventTypes>` +
            //`<EventType>NewMailEvent</EventType>` +
            //`<EventType>CreatedEvent</EventType>` +
            //`<EventType>DeletedEvent</EventType>` +
            `<EventType>ModifiedEvent</EventType>` +
            //`<EventType>MovedEvent</EventType>` +
            //`<EventType>CopiedEvent</EventType>` +
          `</EventTypes>` +
          
        `</m:StreamingSubscriptionRequest>` +
      `</m:Subscribe>`;
    this._setupSoapCall("SubscribeNotifications", aResponse, body);
  },

  unsubscribeNotifications(aResponse, aSubscriptionId) {
    if (this.mailbox.serverVersion == "2007sp1")
      throw CE("Not supported in 2007sp1", NS_ERROR_NOT_IMPLEMENTED);
    let body =
      `<m:Unsubscribe>` +
        `<m:SubscriptionId>${aSubscriptionId}</m:SubscriptionId>` +
      `</m:Unsubscribe>`;
    this._setupSoapCall("UnsubscribeNotifications", aResponse, body);
  },
/*

  Sample GetStreamingEvents call:

    <m:GetStreamingEvents>
      <m:SubscriptionIds>
        <t:SubscriptionId>JgBibjFwcjAzbWIyMDIubmFtcHJkMDMucHJvZC5vdXRsb29rLmNvbRAAAADwXxVesOnHS5BxUHKwAW88SHjwd1iB0Ag=</t:SubscriptionId>
      </m:SubscriptionIds>
      <m:ConnectionTimeout>30</m:ConnectionTimeout>
    </m:GetStreamingEvents>
*/

  getNotifications(aResponse, aSubscriptionId, aTimeout) {
    if (this.mailbox.serverVersion == "2007sp1")
      throw CE("Not supported in 2007sp1", NS_ERROR_NOT_IMPLEMENTED);
    let body =
      `<m:GetStreamingEvents>` +
        `<m:SubscriptionIds>` +
          `<SubscriptionId>${aSubscriptionId}</SubscriptionId>` +
        `</m:SubscriptionIds>` +
        `<m:ConnectionTimeout>${aTimeout}</m:ConnectionTimeout>` +
      `</m:GetStreamingEvents>`;
    this._setupSoapCall("GetNotifications", aResponse, body);
  },

/*
<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
<ItemShape>
    <BaseShape xmlns="http://schemas.microsoft.com/exchange/services/2006/types">IdOnly</BaseShape>
    <AdditionalProperties xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
    <FieldURI FieldURI="item:ParentFolderId"/>
    <FieldURI FieldURI="item:DateTimeCreated"/>
    <FieldURI FieldURI="item:DateTimeReceived"/>
    <FieldURI FieldURI="item:DisplayTo"/>
    <FieldURI FieldURI="item:DisplayCc"/>
    <FieldURI FieldURI="item:Categories"/>
    <FieldURI FieldURI="item:Subject"/>
    <FieldURI FieldURI="item:Size"/>
    <FieldURI FieldURI="item:ItemClass"/>
    <FieldURI FieldURI="item:Culture"/>
    <FieldURI FieldURI="item:InReplyTo"/>
    <FieldURI FieldURI="item:Importance"/>
    <FieldURI FieldURI="item:Attachments"/>
    <FieldURI FieldURI="item:HasAttachments"/>
    <FieldURI FieldURI="item:Body"/>
</AdditionalProperties>
</ItemShape>
<ItemIds>
    <ItemId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMkAGQz..." ChangeKey="CQAAABY..."/>
</ItemIds>
</GetItem>

<GetItemResponseMessage ResponseClass="Success">
    <ResponseCode>NoError</ResponseCode>
    <Items>
        <Message>
            <ItemId Id="AAMkAG..." ChangeKey="CQAAAB..."/>
            <ParentFolderId Id="AAMkAGQz..." ChangeKey="AQAAAA=="/>
            <ItemClass>IPM.Item</ItemClass>
            <Subject>a test item</Subject>
            <Body BodyType="Text">the body</Body>
            <DateTimeReceived>2016-07-25T03:21:03Z</DateTimeReceived>
            <Size>366</Size>
            <Categories>
                <String>cat1</String>
                <String>cat2</String>
            </Categories>
            <Importance>Low</Importance>
            <InReplyTo>repliedMessageId</InReplyTo>
            <DateTimeCreated>2016-07-25T03:21:03Z</DateTimeCreated>
            <DisplayCc/>
            <DisplayTo/>
            <HasAttachments>false</HasAttachments>
            <Culture>en-US</Culture>
        </Message>
    </Items>
</GetItemResponseMessage>

*/
  getChangedItemProperties(aResponse, aFolder, aItemIds, aGetBody) {
    try {
      log.config("ewsSoapRequest: getChangedItemProperties for folder " + aFolder.displayName + " aGetBody? " + aGetBody);
    } catch(ex) {}
    let itemIdsXml = `<m:ItemIds>`;
    let somethingToDo = false;
    let itemClass;
    this._items = [];
    for (let i = 0; i < aItemIds.length; i++) {
      let itemId = aItemIds.getAt(i);
      // We'll skip if the item is deleted. (The original C++ had this comment,
      // but no code to implement it. I'll leave this for now since I need to
      // do a through review of delete management anyway.)

      // We can only update items with the same item class.
      let item = this.mailbox.getItem(itemId);
      let thisItemClass = item.itemClass;
      if (!itemClass)
        itemClass = thisItemClass;
      else if (thisItemClass != itemClass) {
        log.warn("Can't get changed for multiple items with different classes " +
                 itemClass + " , " + thisItemClass);
        continue;
      }
      this._items.push(item);
      itemIdsXml += `<ItemId Id="${_(item.itemId)}"`;
      if (item.changeKey)
        itemIdsXml += ` ChangeKey="${_(item.changeKey)}"/>`;
      else
        itemIdsXml += `/>`;
      somethingToDo = true;
    }
    itemIdsXml += `</m:ItemIds>`;

    if (!somethingToDo)
    {
      // there is nothing to do. I need to tell the caller not
      //  to do the soap call, so I'll just pick an error to signify that. This
      //  is a status and not an error.
      throw CE("No valid item ids to get", Cr.NS_ERROR_NOT_AVAILABLE);
    }

    let someFolder = aFolder;
    if (!someFolder) {
      // folder could be missing if recovering from missing folder ids. Any
      // folder will do here since this is a service.
      someFolder = new EwsNativeFolder();
    }
    let propertyNames = someFolder.getItemPropertyNames(itemClass);
    let pXml = `<AdditionalProperties>`;
    for (let i = 0; i < propertyNames.length; i++) {
      let propertyName = propertyNames.getAt(i);
      let slashPosition = propertyName.indexOf("/");
      if (propertyName.startsWith("item:ExtendedProperty")) {

        // add an extended property
        // like "item:ExtendedProperty:0x1081/Integer"
        let propertyTag = propertyName.substr(22, 6);
        let propertyType = propertyName.substr(29);
        pXml += `<ExtendedFieldURI PropertyTag="${propertyTag}" PropertyType="${propertyType}"/>`;
      }
      else if (slashPosition >= 0) {
        // add an Indexed FieldURI like "contacts:EmailAddress/EmailAddress1"
        // <IndexedFieldURI FieldURI="contacts:PhysicalAddress:Street" FieldIndex="Home"/>
        let fieldURI = propertyName.substr(0, slashPosition);
        let fieldIndex = propertyName.substr(slashPosition + 1);
        pXml += `<IndexedFieldURI FieldURI="${fieldURI}" FieldIndex="${fieldIndex}"/>`;
      }
      else {
        // Skip the body unless aGetBody set.
        if (propertyName == "item:Body" && !aGetBody)
          continue;
        pXml += `<FieldURI FieldURI="${propertyName}"/>`;
        this._getBody = true;
      }
    }

    pXml += `</AdditionalProperties>`;

    // Now we can assemble the complete request
    let body = `<m:GetItem><m:ItemShape>` +
               `<BaseShape>IdOnly</BaseShape>` +
               pXml + `</m:ItemShape>` +
               itemIdsXml + `</m:GetItem>`;
    this._setupSoapCall("GetChangedItemProperties", aResponse, body);
  },

/*
<Body>
    <UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages" ConflictResolution="AlwaysOverwrite" MessageDisposition="SaveOnly">
    <ItemChanges>
      <ItemChange xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
        <ItemId Id="AAMkAGQzY2E5ZjA3LWE3MTUtNDY5Zi05M2ZjLTM4MTgwYjhhOTZlOABGAAAAAABTdrosZnUQTY8VYjBkqTSCBwAlHg+JR6cWRLoRNW2wKLfVAACWGC6jAAAlHg+JR6cWRLoRNW2wKLfVAACWGC6tAAA=" ChangeKey="CQAAABYAAAAlHg+JR6cWRLoRNW2wKLfVAACWGDC8"/>
        <Updates>
            <SetItemField>
                <FieldURI FieldURI="message:IsRead"/>
                <Message>
                    <IsRead>1</IsRead>
                </Message>
            </SetItemField>
        </Updates>
    </ItemChange>
</ItemChanges>
</UpdateItem>
</Body>

<Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
<m:UpdateItemResponse xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages" xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
<m:ResponseMessages>
    <m:UpdateItemResponseMessage ResponseClass="Success">
        <m:ResponseCode>NoError</m:ResponseCode>
        <m:Items>
            <t:Message>
                <t:ItemId Id="AAMkAGQzY2E5ZjA3LWE3MTUtNDY5Zi05M2ZjLTM4MTgwYjhhOTZlOABGAAAAAABTdrosZnUQTY8VYjBkqTSCBwAlHg+JR6cWRLoRNW2wKLfVAACWGC6jAAAlHg+JR6cWRLoRNW2wKLfVAACWGC6tAAA=" ChangeKey="CQAAAA=="/>
            </t:Message>
        </m:Items>
        <m:ConflictResults>
            <t:Count>0</t:Count>
        </m:ConflictResults>
    </m:UpdateItemResponseMessage>
</m:ResponseMessages>
</m:UpdateItemResponse>
</Body>
*/

  saveManyUpdates(aResponse, aNativeItems) {
    log.config("saveManyUpdates()\n");
    // We save the items because, if new, they may not have been cached by a
    // a blank or false itemId.
    this._items = aNativeItems;
    let classType = "Unknown";
    let itemChangesXML = `<m:ItemChanges>`;
    for (let i = 0; i < aNativeItems.length; i++) {
      let item = aNativeItems.queryElementAt(i, Ci.nsISupports).wrappedJSObject;
      let thisClassType;

      // When deleting unread items, a race condition may result in the delete
      //  before an update. Detect that the item is deleted, and skip the update
      if (item.flags & item.DeletedOnServerBit)
      {
        log.debug("Not updating item because it has already been deleted");
        continue;
      }

      let itemClass = item.itemClass;
      if (itemClass.startsWith("IPM.Note") ||
          itemClass.startsWith("REPORT.IPM.Note") ||
          itemClass.startsWith("IPM.Schedule.Meeting")) {
        thisClassType = "Note";
      }
      else if (itemClass.startsWith("IPM.Appointment") ||
               itemClass.startsWith("IPM.OLE.CLASS.{00061055-0000-0000-C000-000000000046}")) {
        thisClassType = "Event";
      }
      else {
        thisClassType = "Other";
      }

      // You cannot mix classtypes.
      if (classType == "Unknown")
        classType = thisClassType;
      else if (classType != thisClassType) {
        log.warn("you cannot mix classtypes in an update, update incomplete");
        continue;
      }

      if (!item.itemId && !item.parentId) {
        log.warn("itemId and parentId are empty in an update");
        continue;
      }

      if (!item.changeKey) {
        log.warn("changeKey is empty in an update");
        continue;
      }

      let localProperties = item.localProperties;
      let updatesFullPL = localProperties ? localProperties.getPropertyList("Updates") : null;
      if (!localProperties || !updatesFullPL) {
        log.warn("localProperties or updates are empty in an update");
        continue;
      }

      // The updates property list may contain some items that are not to be included
      //  in the real updates request, but instead are used in post processing
      //  for special handling. Clone the list to delete those items.
      let excludedFields = new Utils.StringArray();
      excludedFields.append("DeletedOccurrences");
      let updatesPL = updatesFullPL.clone(excludedFields);

      // Are there any changes?
      if (!updatesPL.length) {
        log.warn("Skipping item update with no changes");
        continue;
      }

      let itemIdXML;
      // use parentId if present (for Calendar)
      if (item.parentId) {
        itemIdXML = `<OccurrenceItemId` +
                      ` RecurringMasterId="${_(item.parentId)}" ` +
                      ` ChangeKey="${_(item.changeKey)}"/>`;
      }
      else {
        itemIdXML = `<ItemId` +
                      ` Id="${_(item.itemId)}"` +
                      ` ChangeKey="${_(item.changeKey)}"/>`;
      }

      itemChangesXML += `<ItemChange>${itemIdXML}` +
                        EWStoPL.plToXML("Updates", null, updatesPL) +
                        `</ItemChange>`;
    }
    itemChangesXML += `</m:ItemChanges>`;

    let updateItemAttributesXML = ` ConflictResolution="AlwaysOverwrite"`;
    switch (classType) {
      case "Note" :
        updateItemAttributesXML += ` MessageDisposition="SaveOnly"`;
        break;
     case "Event" :
        updateItemAttributesXML += ` SendMeetingInvitationsOrCancellations="SendToNone"`;
    }
   let body = `<m:UpdateItem${updateItemAttributesXML}>` +
                `${itemChangesXML}</m:UpdateItem>`;
   this._setupSoapCall("SaveManyUpdates", aResponse, body);
  },

  saveUpdates(aResponse, aNativeItem) {
    let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    items.appendElement(aNativeItem, false);
    return this.saveManyUpdates(aResponse, items);
  },

/*
<Body>
  <ExpandDL xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
    <Mailbox>
      <ItemId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMkA..."/>
    </Mailbox>
  </ExpandDL>
</Body>

<Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <m:ExpandDLResponse xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages" xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
    <m:ResponseMessages>
      <m:ExpandDLResponseMessage ResponseClass="Success">
        <m:ResponseCode>NoError</m:ResponseCode>
        <m:DLExpansion TotalItemsInView="1" IncludesLastItemInRange="true">
          <t:Mailbox>
            <t:Name>somebody@example.org</t:Name>
            <t:EmailAddress>somebody@example.org</t:EmailAddress>
            <t:RoutingType>SMTP</t:RoutingType>
            <t:MailboxType>OneOff</t:MailboxType>
          </t:Mailbox>
        </m:DLExpansion>
      </m:ExpandDLResponseMessage>
    </m:ResponseMessages>
  </m:ExpandDLResponse>
</Body>
*/
  expandDL(aResponse, aNativeItem) {
    this._item = aNativeItem;
    let body =
      `<m:ExpandDL><m:Mailbox><ItemId Id="${_(aNativeItem.itemId)}"/></m:Mailbox></m:ExpandDL>`;
    this._setupSoapCall("ExpandDL", aResponse, body);
  },

  get soapCall() {
    return this._soapCall;
  },
  set soapCall(a) { this._soapCall = a;},

  get soapResponse() {
    return this._soapResponse;
  },
  set soapResponse(a) { this._soapResponse = a;},

  logElement(text, element)
  {
    // Do we need to do mailbox logging?
    if (!this.mailbox.soapLogFile)
      return; // Logging disabled, nothing to log

    this.mailbox.writeToSoapLog(text + " " + (new Date()).toISOString() + ":\n");
    // we will clone the element since we will be modifying it for security reasons
    //  before logging.
    let elementClone = element.cloneNode(true);

    // strip unwanted content from the output
    // We have to handle t:Content separately because EWS seems to get confused
    //  with the normal Mozilla output using default higher-level namespaces
    stripText(elementClone, "t:Content", "");
    stripText(elementClone, "Content", nsTypes);

    if (!Services.prefs.getBoolPref("extensions.exquilla.logBodies"))
    {
      stripText(elementClone, "Body", nsTypes);
      stripText(elementClone, "Subject", nsTypes);
    }

    let serializer = new XMLSerializer();
    let logString = serializer.serializeToString(elementClone);
    if (logString)
      this.mailbox.writeToSoapLog(logString + "\n");
    else
      this.mailbox.writeToSoapLog("DOM element is invalid or empty\n");
  },

  async invoke()
  {
    //log.debug("ewsSoapRequestComponent.invoke instance# " + this._instanceCount);

    // start a soap call
    this._inProgress = true;

    let soapCall = this.soapCall;

    // logging of the call
    // xxx todo: detect if logging is enabled before copying string
    let text = "\nSOAP call envelope URI: " + soapCall.transportURI;
    if (soapCall.envelope) {
      this.logElement(text, soapCall.envelope);
    }
    else if (soapCall.messageString) {
      this._logElementString(text, soapCall.messageString);
    }
    else {
      this._logElementString(text, "Missing SOAP call");
    }

    // xxx todo: if this returns an error, maybe we should not be calling
    //           onStartRequest
    if (this.ewsResponse) {
      this.ewsResponse.onStartRequest(this);
    }
    else {
      log.info("no ewsResponse, did we double invoke this request?");
    }

    let rv = Cr.NS_ERROR_FAILURE;
    do
    { // break on error

      // Report an error if offline
      if (Services.io.offline)
      {
        rv = Cr.NS_ERROR_NOT_AVAILABLE;
        this._error("Network Unavailable", "Offline",
                    "Attempt to access server while offline");
        break;
      }

      let username = this.mailbox.username;
      let domain = this.mailbox.domain;
      let authMethod = this.mailbox.authMethod;
      let accessToken;
      let password;
      try {
        password = this.mailbox.password;
      } catch (e) {}
      if (this.mailbox.ewsURL.startsWith("https://outlook.office365.com/") && authMethod != Ci.nsMsgAuthMethod.OAuth2 && authMethod != kOAuth2Password) {
        let migrationData = {};
        this.mailbox._postEvent("OAuthMigrationPrompt", migrationData, Cr.NS_OK);
        if (migrationData.migrationState == kMigrationNeedsPrompt) {
          try {
            if (await this.mailbox.oAuth2Login.isOffice365()) {
              let bundle = Services.strings.createBundle("chrome://exquilla/locale/exquilla.properties");
              let title = bundle.GetStringFromName("Office365OAuthTitle");
              let message = bundle.GetStringFromName("Office365OAuthMessage");
              let buttons = Ci.nsIPrompt.BUTTON_TITLE_OK * Ci.nsIPrompt.BUTTON_POS_0 + Ci.nsIPrompt.BUTTON_TITLE_IS_STRING * Ci.nsIPrompt.BUTTON_POS_1;
              let dontAskAgain = {};
              let dontAskTitle = null;
              if (migrationData.migrationTries++ > 2) {
                dontAskTitle = bundle.GetStringFromName("Office365OAuthNever");
              }
              if (Services.prompt.confirmEx(Services.ww.activeWindow, title, message, Ci.nsIPrompt.STD_OK_CANCEL_BUTTONS, null, null, null, dontAskTitle, dontAskAgain) == 0) {
                try {
                  migrationData.authMethod = this.mailbox.authMethod = authMethod = await this.mailbox.oAuth2Login.detectAuthMethod();
                  migrationData.migrationState = kMigrationSucceeded;
                  let migrationEx = new Error();
                  migrationEx.code = "migration-success";
                  log.error("Migration succeeded", migrationEx);
                } catch (ex) {
                  ex.parameters = { type: ex.type, code: ex.code, name: ex.name, result: ex.result };
                  ex.type = "migration-fail";
                  log.error("Migration failure", ex);
                }
              }
              if (dontAskAgain.value) {
                migrationData.migrationState = kMigrationNeverPrompt;
                let migrationEx = new Error();
                migrationEx.code = "migration-never";
                log.error("Migration never prompt", migrationEx);
              }
            } else {
              migrationData.migrationState = kMigrationInapplicable;
              let migrationEx = new Error();
              migrationEx.code = "migration-is-hotmail";
              log.error("Migration is Hotmail", migrationEx);
            }
            this.mailbox._postEvent("OAuthMigration", migrationData, Cr.NS_OK);
          } catch (ex) {
            // Network error detecting the account type. Try again next restart.
            log.warn(ex);
          }
        }
      }
      if (!password && authMethod == Ci.nsMsgAuthMethod.passwordCleartext) {
        rv = Cr.NS_ERROR_NOT_INITIALIZED;
        this._error("Password missing", "PasswordMissing", "");
        break;
      }
      if (authMethod == Ci.nsMsgAuthMethod.OAuth2 || authMethod == kOAuth2Password) {
        try {
          // May open a window and wait for user to login, i.e. may block for minutes.
          accessToken = await this.mailbox.oAuth2Login.getAccessToken();
        } catch (e) {
          log.warn(se(e));
          rv = Cr.NS_ERROR_NOT_INITIALIZED;
          this._error(e.name, e.type, e.message);
          break;
        }
      }

      // Set a custom useragent
      let useragent = Services.prefs.getCharPref("extensions.exquilla.useragent");
      if (!useragent && !(useragent == "default"))
        soapCall.useragent = useragent;

      let completion = soapCall.asyncInvoke(this, username, password, domain, accessToken);
      this._soapResponse = completion.mResponse;
      rv = Cr.NS_OK;
    } while (false);

    if (rv != Cr.NS_OK) {
      log.info("soap request invocation failed");
      if (this.ewsResponse)
      {
        this.ewsResponse.onStopRequest(this, rv);
        this.ewsResponse = null;
      }
      if (this.mailbox) {
        this.mailbox.finishRequest(this);
      }
    }
  },

  // SOAPResponseListener overrides
  async handleResponse(/* in SOAPResponse */   aResponse,
                       /* in SOAPCall aCall */ aCall,
                       /* in nsresult */       aStatus,
                       /* in boolean */        aLast)
  {
    //dl("ewsSoapRequestComponent: handleResponse instance# " + this._instanceCount + " for " + this.requestName);

    this._soapResponse = aResponse;
    if (!aLast) {
      log.debug("handleResponse with !done, progress presumably");
      //log.info("messageString: " + aResponse.messageString);
      this._partialProgress += aResponse.messageString;

      let elementText;
      let notifiedFolderIds = new Set(); // folderIds receiving notifications
      do { // break when error or done
        elementText = "";

        // Find the initial "<"
        let beginTag = this._partialProgress.indexOf("<");
        if (beginTag == -1)
          break;

        // Get the tag name
        let nextGT = this._partialProgress.indexOf(">", beginTag + 1);
        if (nextGT == -1)
          break;
        let nextSpace = this._partialProgress.indexOf(" ", beginTag + 1);
        let endTag = Math.min(nextSpace, nextGT);

        // Try to find the closing tag
        let closeTag = "</" + this._partialProgress.substring(beginTag + 1, endTag) + ">";
        log.debug("Looking for closeTag " + closeTag);
        let endElement = this._partialProgress.indexOf(closeTag, beginTag + 1);
        if (endElement == -1)
          break;

        // We found a complete element, let the dom parser handle.
        elementText = this._partialProgress.substring(beginTag, endElement + closeTag.length);
        this._partialProgress = this._partialProgress.substring(endElement + closeTag.length);
        if (this._partialProgress.length) {
          log.debug("partial text fragment remains after element removed");
          //log.debug("partial text is: " + this._partialProgress);
          //log.debug("elementText is " + elementText);
        }

        // parse the string into DOM
        let elementDOM =
          new DOMParser().parseFromString(elementText, "text/xml");

        // parse the DOM into PropertyList
        let envelopePL = EWStoPL.domToVariant(elementDOM.documentElement);

        // Process the response. We only support GetStreamingEventsResponseMessage.

        // Success or error
        let streamingResponsePL = envelopePL.getPropertyList("Body/GetStreamingEventsResponse/ResponseMessages");
        for (let i = 0; i < streamingResponsePL.length; i++) {
          let responseMessage = streamingResponsePL.getPropertyListAt(i);
          if (responseMessage) {
            let responseClass = responseMessage.getAString("$attributes/ResponseClass");
            if (responseClass != "Success") {
              log.config("response error getting notifications");
              if (this.ewsResponse) {
                this.ewsResponse.onNotify(this, null, Cr.NS_ERROR_FAILURE);
              }
              continue;
            }
            //log.debug("ResponseMessage is\n" + stringPL(responseMessage));
            let notifications = responseMessage.getPropertyLists("Notifications/Notification");
            for (let notification of notifications) {
              // A notification consists of a SubscriptionId, optional PreviousWatermark
              // and MoreEvents, followed by an unbounded number of eventType objects. All
              // we care about are folders that we need to update.
              for (let k = 0; k < notification.length; k++) {
                let elementName = notification.getNameAt(k);
                if (["SubscriptionId", "PreviousWaterMark", "MoreEvents"].includes(elementName))
                  continue;
                //log.debug("Notification Event has name " + notification.getNameAt(k));
                let notificationEvent = notification.getPropertyListAt(k);
                // If the event is for a folder, we add that folder. If for an item, we add
                // the item's parent
                let folderId = notificationEvent.getAString("FolderId/$attributes/Id");
                if (!folderId)
                  folderId = notificationEvent.getAString("ParentFolderId/$attributes/Id");
                if (folderId)
                  notifiedFolderIds.add(folderId);
              }
            }
          }
        }
        // If we processed an element, and a fragment remains, try again.
      } while (elementText && this._partialProgress);
      for (let folderId of notifiedFolderIds) {
        let nativeFolder = this.mailbox.getNativeFolder(folderId);
        log.debug("Need to update folder " + nativeFolder.displayName);
        if (this.ewsResponse) {
          this.ewsResponse.onNotify(this, nativeFolder, Cr.NS_OK);
        }
      }
      return;
    }

    if (aStatus != Cr.NS_OK)
      log.debug("handleResponse with error " + aStatus);
    // Logging of the response
    try {
      if ( (aStatus != Cr.NS_ERROR_ABORT) &&
            aResponse && this.mailbox.soapLogFile) {
        if (aResponse.body)
          this.logElement("SOAP response body", aResponse.body);
        else if (aResponse.xhr && aResponse.xhr.responseText)
          this._logElementString("SOAP response text (body missing)",
                                 aResponse.xhr.responseText);
        else {
          log.warn("Could not log soap response due to missing response");
          this._logElementString("Could not log soap response due to missing response");
        }
      }
    } catch (e) {log.warn(se(e));}

    // Error response logging.
    let haveFault = false;
    let errorReturn = (aStatus == Cr.NS_OK) ? Cr.NS_ERROR_FAILURE : aStatus;
    let htmlStatus = aResponse ? aResponse.htmlStatus : 0;

    do { // break when done checking faults
      if (aStatus == Cr.NS_ERROR_ABORT) {
        this._error("Abort", "Abort", "Request aborted");
        haveFault = true;
        break;
      }

      if (!aCall) {
        this._error("CallSetupFailure",
                    "NullCall",
                    "Failed to setup html call");
        haveFault = true;
        break;
      }
      if (!aResponse) {
        this._error("HtmlRequestFailure",
                    "NullResponse",
                    "Html request failed");
        haveFault = true;
        break;
      }

      // Look for a SOAP fault.
      let fault = aResponse.fault;
      if (fault) {
        this._error("SoapFault", fault.faultCode, fault.faultString);
        haveFault = true;
        break;
      }

      if (htmlStatus == 401 &&
          (this.mailbox.authMethod == Ci.nsMsgAuthMethod.OAuth2 ||
           this.mailbox.authMethod == kOAuth2Password) &&
          !this._retriedOAuth) {
        // The OAuth2 access token is no longer valid.
        try {
          this._retriedOAuth = true; // avoid loops
          this.mailbox.oAuth2Login.clearAccessToken();
          // Get a new access token, transparently using refresh token, background password login,
          // or interactive login (e.g. for MFA), as needed.
          // Given that this may wait for the end user, this may block for minutes.
          let accessToken = await this.mailbox.oAuth2Login.getAccessToken();
          let completion = aCall.asyncInvoke(this, null, null, null, accessToken);
          this._soapResponse = completion.mResponse;
          return;
        } catch (e) {
          log.warn(se(e));
          this._error(e.name, e.type, e.message);
          haveFault = true;
          errorReturn = e.result || Cr.NS_ERROR_FAILURE;
          break;
        }
      }

      // HTML status errors.
      if (htmlStatus < 200 || htmlStatus >= 300) {
        let htmlText = htmlStatus ? aResponse.htmlText :
                                   "Could not find server";
        this._error("HtmlRequestError", "HtmlStatus" + htmlStatus, htmlText);
        haveFault = true;
        break;
      }

      if (aStatus != Cr.NS_OK && aStatus != Cr.NS_ERROR_NET_TIMEOUT) {
        this._error("Error status in handleResponse", "ResponseErrorStatus",
                    "Error status in handleResponse");
        haveFault = true;
        break;
      }

      // Calls using progress should have been processed during the
      //  progress call, so content does not matter here.
      if (aCall.useProgress)
        break;
      let bodyElement = aResponse.body;
      if (this.doError == 1) {
        bodyElement = null;
        log.warn("Doing soap request test for simulated missing body");
      }
      if (!bodyElement) {
        this._error("Missing Body", "NullBody",
          "not valid SOAP message (missing body)");
        haveFault =true;
        break;
      }

      // the main response element, eg GetFolderResponse
      let responseHead = bodyElement.firstChild;
      if (!responseHead) {
        this._error("no responseHead", "NullResponseHead",
                    "null SOAP message (body is empty)");
        haveFault = true;
        break;
      }

      // ResponseMessages
      let responseMessages = responseHead.firstChild;
      if (!responseMessages) {
        this._error("no response messages", "NullResponseMessages",
                    "missing response messages element");
        haveFault = true;
        break;
      }

      // loop through all response messages
      let responseCount = 0;
      for (let response of responseMessages.children) {
        // We have a design flaw here, that we are allowing multiple response
        // messages, but the property list result, which is processed per
        // responseMessages, is a single-valued attribute of the request. Maybe
        // only one responseMessage is allowed?
        //if (++responseCount > 1)
        //  log.warn("Multiple response messages, property list result not handled");
        let responseClass = response.getAttribute("ResponseClass");
        let responseLocalName = response.localName;
        log.debug("responseLocalName: " + responseLocalName +
                  ", responseClass: " + responseClass);
        if (responseClass == "Error") {
          // Certain error response codes are not processed as errors, or will be handled in
          // the type-specific handler.
          let responseCodes = response.getElementsByTagNameNS(nsMessages, "ResponseCode");
          let responseCode = (responseCodes && responseCodes[0]) ?
            responseCodes[0].textContent : "";
          log.debug("responseCode is " + responseCode);
          if (responseCode != "ErrorNameResolutionNoResults" &&
              responseCode != "ErrorNameResolutionMultipleResults" &&
              responseCode != "ErrorItemNotFound" && 
              responseCode != "ErrorFolderExists")
          {
            haveFault = true;
            // We expect an error information in the response
            let messageTexts = response.getElementsByTagNameNS(nsMessages, "MessageText");
            let messageText = (messageTexts && messageTexts[0]) ?
              messageTexts[0].textContent : "";
            this._error("EWS Response error in request " + this.requestName, responseCode, messageText);
            continue;
          }
        }

        // maybe we should do this on demand only?
        //this.result = EWStoPL.domToVariant(response);

        // map the response message to the proper handleResponse
        let handler = kResponseMessageType[responseLocalName];
        if (!handler || !(handler in this)) {
          log.warn("No handler for response type " + responseLocalName);
          haveFault = true;
          continue;
        }
        //log.debug("response handler is " + handler);
        // Allow response handlers to throw a specific error
        try {
          haveFault = !this[handler](response);
        } catch (ex) {
          errorReturn = ex.result;
          log.debug("Handler returned error: " + ex);
          haveFault = true;
          continue;
        }
      }
    } while (false);

    // don't bother showing dom if html completely failed, like offline
    if (haveFault && htmlStatus && aStatus != Cr.NS_ERROR_ABORT && aStatus != Cr.NS_ERROR_NET_TIMEOUT) {
      showDOMElements(aCall, aResponse);
    }
    if (this.ewsResponse) {
      this.ewsResponse.onStopRequest(this, haveFault ? errorReturn : Cr.NS_OK);
      this.ewsResponse = null;
    }
    if (this.mailbox) {
      this.mailbox.finishRequest(this);
    }
    return; // no throw as we responded with error codes successfully.
  }, // handleResponse

  get doError() { return this._doError;},
  set doError(val) { this._doError = val;},

  get ewsResponse() {
    return this._ewsResponse;
  },
  set ewsResponse(a) { this._ewsResponse = a;},

  // helper methods
  _error(aResponseError, aResponseCode, aMessageText)
  {
    log.info(aResponseError +
             " messageText: " + aMessageText +
             " responseCode: " + aResponseCode);
    if (this.ewsResponse) {
      this.ewsResponse.errorResponse(this,
        aResponseError, aResponseCode, aMessageText);
    }
  },

  _FindFolderResponseType(response)
  {
    let isOk = true;
    if (this.requestName == "DiscoverSubfolders") {
      let rootFolderElement =
        response.getElementsByTagNameNS(nsMessages, "RootFolder")[0];
      // Note that IncludesLastItemInRange is processed in the machine

      // <m:RootFolder><t:Folders>
      let foldersElement = rootFolderElement.firstElementChild;
      for (let folderElement of foldersElement.children) {
        try {
          // <t:Folder>
          let folderIdElement =
            folderElement.getElementsByTagNameNS(nsTypes, "FolderId")[0];
          let folderId = folderIdElement.getAttribute("Id");
          let nativeFolder = this.mailbox.getNativeFolder(folderId);
          nativeFolder.changeKey = folderIdElement.getAttribute("ChangeKey");
          updateFromFolderElement(nativeFolder, folderElement);
          nativeFolder.verifiedOnline = true;
        } catch (e) { log.warn("FindFolder error " + e); isOk = false;}
      }
      this.mailbox.updateSubfolderIds();
    }
    else {
      log.warn("Unexpected requestName " + this.requestName);
      isOk = false;
    }
    return isOk;
  },

  _ResponseMessageType(response)
  {
    let isOk = false;
    if (this.requestName == "DeleteFolder") {
      this.mailbox.removeFolderFromCache(this._nativeFolder.folderId);
      this.mailbox.updateSubfolderIds();
      isOk = true;
    }
    else if (this.requestName == "DeleteFolders") {
      let folderId = this._ids.getAt(this._nextFolderIndex++);
      this.mailbox.removeFolderFromCache(folderId);
      this.mailbox.updateSubfolderIds();
      isOk = true;
    }
    else if (this.requestName == "SendItem" ||
             this.requestName == "DeleteItems") {
      isOk = true;
    }
    else {
      log.warn("Unexpected requestName in ResponseMessageType");
    }
    return isOk;
  },

  // response message processing by localName, return true on success
  _FolderInfoResponseType(response) {

      // specific error handling
    // If the folder exists, we need to inform the caller so that it
    // can decide whether to proceed.
    let responseClass = response.getAttribute("ResponseClass");
    if (responseClass == "Error") {
      let responseCodes = response.getElementsByTagNameNS(nsMessages, "ResponseCode");
      let responseCode = (responseCodes && responseCodes[0]) ?
        responseCodes[0].textContent : "";
      if (responseCode == "ErrorFolderExists")
        throw CE("Folder exists", Cr.NS_ERROR_FILE_ALREADY_EXISTS);
      else
        throw CE("FoldeInfoResponse error: " + responseCode);
    }

    // <m:Folders>
    let foldersElement =
      response.getElementsByTagNameNS(nsMessages, "Folders")[0];
    let isOk = true;
    for (let folderElement of foldersElement.children) { // <t:Folder>
      let nativeFolder;
      let parentFolderId;
      if (this.requestName == "MoveFolders") {
        // this._nativeFolder is the parent!
        parentFolderId = this._nativeFolder.folderId;
        nativeFolder =
          this.mailbox.getNativeFolder(this._ids.getAt(this._nextFolderIndex++));
      }
      else if (this._nativeFolder)
        nativeFolder = this._nativeFolder;
      else if (this._nativeFolders) {
        nativeFolder = this._nativeFolders[this._nextFolderIndex++];
      }
      let folderIdElement =
        folderElement.getElementsByTagNameNS(nsTypes, "FolderId")[0];
      let folderId = folderIdElement.getAttribute("Id");
      if (folderId != nativeFolder.folderId) {
        this.mailbox.setNativeFolderId(nativeFolder, folderId);
      }

      nativeFolder.changeKey = folderIdElement.getAttribute("ChangeKey");

      if (this.requestName == "GetOnline") {
        this.mailbox.rootFolderId = folderId;
        continue;
      }
      else if(this.requestName == "GetFolder" ||
              this.requestName == "GetFolders") {
        // update all folder properties
        updateFromFolderElement(nativeFolder, folderElement);
        nativeFolder.verifiedOnline = true;
      }
      else if (this.requestName == "CreateFolder" ||
               this.requestName == "CreateFolders") {

        // No specific response needed.
        nativeFolder.verifiedOnline = true;
      }
      else if (this.requestName == "MoveFolders") {
        nativeFolder.parentFolderId = parentFolderId;
      }
      else {
        log.warn("Unexpected requestName");
        isOk = false;
      }
      updateParentSubfolders(nativeFolder);
    }
    if (!isOk)
      log.info("GetFolderResponseMessage returning failure");
    return isOk;
  },

  _SyncFolderItemsType(response)
  {
    let isOk = true;

    try {
    this._items.clear();
    let folder = this._nativeFolder;
    folder.syncState = safeContent(response, nsMessages, "SyncState");
    let includesLast = safeContent(response, nsMessages, "IncludesLastItemInRange");
    folder.syncItemsPending = (includesLast == "false");

    // After a successful sync, we no longer need the folder's new list
    folder.newItems = null; // since we always create a blank one when we ask

    let changeElements = response
      .getElementsByTagNameNS(nsMessages, "Changes")[0].children;
    log.config("changes count is " + changeElements.length);

    // get the changes, and apply them to the native folder
    for (let changeElement of changeElements) {
      let didNotChange = false;

      let changeType = changeElement.localName;
      log.debug(`change type is ${_(changeType)}`);

      let itemElement = ["Create","Update"].includes(changeType) ?
        changeElement.firstChild : changeElement;

      // process the itemId element
      let itemIdElement = itemElement.getElementsByTagNameNS(nsTypes, "ItemId")[0];
      let itemId = itemIdElement.getAttribute("Id");
      // Even though the sync reports a changeKey, we do not want to Update it
      // since we did not get complete properties.
      let itemClass = safeContent(itemElement, nsTypes, "ItemClass");

      // xxx I did not implement a delete of itemId from the change action
      // PL from the C++ version.

      let changedItem = this.mailbox.createItem(itemId, itemClass, folder);
      let properties = changedItem.properties;

      // Now that we have the info, process the changes
      if (changeType == "Create") {
        // Because we can create items with incomplete metadata, on at least
        //  the create we will read the properties from the server
        changedItem.needsProperties = true;
        changedItem.newOnServer = true;
      }
      else if (changeType == "Delete") {
        changedItem.raiseFlags(changedItem.DeletedOnServerBit);
        changedItem.clearFlags(changedItem.AllLocally);
        changedItem.needsProperties = false;
      }
      else if (changeType == "Update") {
        // I thought that I could skip updates if we already supposedly had the
        //  properties, for example if we did a local change. But tests revealed a
        //  risk that these changes are only available in the cached copy, and
        //  not in the persisted copy. So get the updates anyway for now.
        //nsString existingChangeKey;
        //changedItem->GetChangeKey(existingChangeKey);
        //if (changeKey.Equals(existingChangeKey))
        //{
        //  changedItem->SetNeedsProperties(PR_FALSE);
        //  didNotChange = PR_TRUE;
        //}
        //else
        changedItem.needsProperties = true;
        changedItem.updatedOnServer = true;
      }
      else if (changeType == "ReadFlagChange") {
        // For reasons I do not understand, the changekey on readflagchange operations is always "CQAAAA=="
        //changedItem->SetChangeKey(changeKey);
        let isReadText = itemElement.getElementsByTagNameNS(nsTypes, "IsRead")[0].textContent;
        let newIsRead = isReadText == "true";
        let oldIsRead = properties && properties.getBoolean("IsRead");
        // xxx todo: don'r reread item for a simple isRead change
        if (!properties || (newIsRead !== oldIsRead)) {
          changedItem.updatedOnServer = true;
          changedItem.needsProperties = true;
        }
        else {
          didNotChange = true;
        }
        log.debug("SyncFolderItems ReadFlagChange oldIsRead = " + oldIsRead + " newIsRead is " + newIsRead);
      }
      else {
        log.warn(`Unexpected change type ${changeType}`);
        isOk = false;
      }

      if (changeType != "Delete") {
        if (!properties || !properties.length) {
          // changedItem has no existing properties
          changedItem.needsProperties = true;
          didNotChange = false;
        }
      }

      // communicate whether it actually changed
      if (didNotChange) {
        changedItem.processingFlags |= changedItem.DidNotChange;
      }
      else {
        changedItem.processingFlags &= ~changedItem.DidNotChange;
      }
      this._items.appendElement(changedItem, false);
    }
  }
  catch (e) {log.warn(se(e)); isOk = false;}
  finally { return isOk;}
  },

  _ItemInfoResponseType(response)
  {
    let isOk = true;
    let responseClass = response.getAttribute("ResponseClass");
    let responseCode = "";
    if (responseClass == "Error") {
      let responseCodes = response.getElementsByTagNameNS(nsMessages, "ResponseCode");
      responseCode = (responseCodes && responseCodes[0]) ?
                      responseCodes[0].textContent : "";
      log.debug("_ItemInfoResponseType responseCode is " + responseCode);

      // Error handlers for different types, else return error
      if (this.requestName == "GetChangedItemProperties") {
        let nativeItem = this._items.shift();
        if (responseCode == "ErrorItemNotFound") {
          nativeItem.raiseFlags(nativeItem.DeletedOnServerBit);
          return true;
        }
      }
      return false;
    }
    try {
      let itemElements = response.getElementsByTagNameNS(nsMessages, "Items")[0]
                                 .children;
      for (let itemElement of itemElements) {
        let itemIdElement = itemElement.getElementsByTagNameNS(nsTypes, "ItemId")[0];
        let itemId = itemIdElement.getAttribute("Id");
        let changeKey = itemIdElement.getAttribute("ChangeKey");

        if (this.requestName == "GetItemBodies") {
          let nativeItem = this.mailbox.getItem(itemId);
          let bodyElement = itemElement.getElementsByTagNameNS(nsTypes, "Body")[0];
          nativeItem.body = bodyElement.textContent;

          let bodyType = bodyElement.getAttribute("BodyType");
          if (bodyType == "HTML") {
            nativeItem.flags |= nativeItem.BodyIsHtml;
          }
          else {
            nativeItem.flags &= ~nativeItem.BodyIsHtml;
          }
        }
        else if (this.requestName == "GetItemsMimeContent") {
          let nativeItem = this.mailbox.getItem(itemId);
          let mimeContentElement =
            itemElement.getElementsByTagNameNS(nsTypes, "MimeContent")[0];
          // mimeContent is base64 encoded. I'm going to ignore all of the
          // warnings about UTF8. xxx ToDo figure this out.
          let mimeContentEncoded = mimeContentElement.textContent;
          nativeItem.mimeContent = atobUTF(mimeContentEncoded);
          nativeItem.mimeCharacterSet = mimeContentElement.getAttribute("CharacterSet");
        }
        else if (this.requestName == "CreateItem") {
          let nativeItem = this._nativeItem;
          // This is a new native item id
          if (nativeItem.itemId) {
            if (!nativeItem.previousId)
              nativeItem.previousId = nativeItem.itemId;
            this.mailbox.changeItemId(nativeItem, itemId);
          }
          else {
            nativeItem.itemId = itemId;
          }
          nativeItem.changeKey = changeKey;
          nativeItem.clearFlags(nativeItem.HasTempId |
                                nativeItem.NewLocally);
          this.mailbox.ensureItemCached(nativeItem);
        }
        else if (this.requestName == "CopyItems") {
          // XXX todo - we should not be storing this in the folder since
          // it is a request-specific object. Multiple requests could clobber
          // this!
          let newItems = this._nativeFolder.newItems;
          let newItem;
          let currentIndex = this._nextIdIndex++;
          if (newItems.length >= currentIndex + 1) {
            try {
              newItem = newItems.queryElementAt(currentIndex, Ci.nsISupports).wrappedJSObject;
            }
            catch (e) {
              // if this fails, it just means that the new items were not previously cloned
            }
          }
          let oldItem = this.mailbox.getItem(this._ids.getAt(currentIndex));
          if (!newItem) {
            // We'll create the new item from the old.
            newItem = oldItem.clone(itemId, changeKey, this._nativeFolder);
            newItems.appendElement(newItem, false);
          }
          else {
            newItem.itemId = itemId;
            newItem.changeKey = changeKey;
          }
          newItem.clearFlags(newItem.DeletedBit |
                             newItem.AllLocally |
                             newItem.HasTempId);
          // The newItem is not recognized by the sync state of the folder. If that new item
          //  is deleted remotely, the change in sync state does not result in any item change
          //  events (instead of doing a create then delete of the same item). So we can't trust
          //  sync state to clean up for us, and we must flag the need to recheck this item on resync.
          newItem.raiseFlags(newItem.NeedsResync);

          if (this._isMove)
            oldItem.raiseFlags(oldItem.DeletedOnServerBit);
        }
        else if (this.requestName == "GetChangedItemProperties") {
          let nativeItem = this._items.shift();
          if (nativeItem.itemId != itemId) {
            log.warn("saved item has different itemId than response");
            nativeItem = this.mailbox.getItem(itemId);
          }
          nativeItem.changeKey = changeKey;
          let Item_PL = EWStoPL.domToVariant(itemElement);
          // We will update the existing property list to remove unused content.
          Item_PL.removeElement("ItemId");

          // When aGetBody is set, this is stored separately
          let hasBody = false;
          if (this._getBody)
          {
            let body = Item_PL.getAString("Body");
            nativeItem.body = body;
            hasBody = true;
            let flags = nativeItem.flags;
            let bodyType = Item_PL.getAString("Body/$attributes/BodyType");
            if (bodyType == "HTML")
              flags |= nativeItem.BodyIsHtml;
            else
              flags &= ~nativeItem.BodyIsHtml;
            nativeItem.flags = flags;
            Item_PL.removeElement("Body");

            // Note we are not persisting the body here. Let the machine, which can handle
            // async, do that.
          }

          if (hasBody)
            nativeItem.processingFlags |= nativeItem.HasBody;
          else
            nativeItem.processingFlags &= ~nativeItem.HasBody;

          nativeItem.properties = Item_PL;
          nativeItem.clearFlags(nativeItem.DeletedLocally
                              | nativeItem.UpdatedLocally
                              | nativeItem.NewLocally
                              | nativeItem.NeedsResync);
          nativeItem.needsProperties = false;

          let parentFolderId = Item_PL.getAString("ParentFolderId/$attributes/Id");
          Item_PL.removeElement("ParentFolderId");
          nativeItem.folderId = parentFolderId;

          // Check if the item class changed. This probably should never happen,
          // but I do it in tests.
          let oldItemClass = nativeItem.itemClass;
          let itemClass = Item_PL.getAString("ItemClass");
          if (itemClass && (itemClass != oldItemClass))
          {
            nativeItem.itemClass = itemClass;
            log.warn("Item class changed, we don't really handle this: " + itemClass);
          }
        }

        else if (this.requestName == "SaveManyUpdates" ||
                 this.requestName == "SaveUpdates") {
          let item = this._items.queryElementAt(this._nextIdIndex++, Ci.nsISupports).wrappedJSObject;
          if ( (item.flags & item.HasTempId) ||
               !(item.itemId == itemId)) {
            this.mailbox.changeItemId(item, itemId);
          }
          item.changeKey = changeKey;
          item.clearFlags(item.AllLocally |
                          item.HasTempId);
          // Now that we have saved the updates, clear them.
          let updatesPL = item.localProperties.getPropertyList("Updates");
          // Scan through the updates, removing all elements except "DeletedOccurrences"
          for (let jp1 = updatesPL.length; jp1 > 0; jp1--) {
            let name = updatesPL.getNameAt(jp1 - 1);
            if (name != "DeletedOccurrences")
              updatesPL.removeElementAt(jp1 - 1);
          }
        }
        else {
          // no action needed
          log.debug("Unhandled requestName " + this.requestName);
          isOk = true;
        }
      }
    }
    catch (e) {
      isOk = false;
      log.warn(se(e));
    }
    finally {
      return isOk;
    }
  },

  _AttachmentInfoResponseType(response) {
    dl("_AttachmentInfoResponseType");
    let isOk = true;
    try {
      let attachmentElements =
        response.getElementsByTagNameNS(nsMessages, "Attachments")[0]
                .children;
      for (let attachmentElement of attachmentElements) {
        let nativeAttachment = this._attachments.shift();
        let attachmentIdElement =
          attachmentElement.getElementsByTagNameNS(nsTypes, "AttachmentId")[0];
        let attachmentId = attachmentIdElement.getAttribute("Id");
        switch (this.requestName) {
          case "GetAttachment": {
            // Make sure that the attachmentID is as expected
            if (attachmentId != nativeAttachment.attachmentId) {
              throw CE("Attachment Id did not match expected");
            }
            let contentEncoded = "";
            let saveName = nativeAttachment.name || "NamelessAttachment";
            saveName = sanitizeFilename(saveName);
            let isEmail = false;
            if (attachmentElement.localName == "FileAttachment") {
              // process as file
              log.debug("Processing attachment " + nativeAttachment.name +
                        " as file with content");
              contentEncoded =
                attachmentElement.getElementsByTagNameNS(nsTypes, "Content")[0]
                                 .textContent;
            }
            else {
              // treat this as a saved EWS email
              isEmail = true;
              saveName += ".eml";
              contentEncoded =
                attachmentElement.getElementsByTagNameNS(nsTypes, "MimeContent")[0]
                                 .textContent;
            }
            let contentDecodedArray = Base64.toByteArray(contentEncoded);
            // content is base64 encoded, so convert
            //let contentDecoded = atobUTF(contentEncoded);
            // TODO: this does not work
            //let contentDecodedPreamble = "";
            //for (let i = 0; i < contentDecodedArray.length && i < 64; i++) {
            //  contentDecodedPreamble += contentDecodedArray[i];
            //}
            let extraPreamble = "";
            if (isEmail) {
              // We are treating all non-FileAttachments as emails. If it does
              // not look like an email, add a header.
              //if (!contentDecodedPreamble.startsWith("From") &&
              //    !contentDecodedPreamble.startsWith("Received:") &&
              //    !contentDecodedPreamble.startsWith("Date:"))
              //{
              //  // append a dummy Subject header to the string
              //  extraPreamble = "Subject: " + saveName + "\r\n\r\n";
              //}
            }
            // store this in a local file
            let file = this.mailbox.attachmentsDirectory;
            file.append(saveName);
            log.info("Creating file for attachment at " + file.path);
            try {
              file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
            } catch (ex) {
              // We can get an error NS_ERROR_FILE_TOO_BIG if there are too many files with the same name
              // so that we cannot create a unique file. But for any error, try again with a random
              // name.
              log.config("Error creating unique file: " + ex);
              let uuidName = Cc["@mozilla.org/uuid-generator;1"]
                               .getService(Ci.nsIUUIDGenerator)
                               .generateUUID()
                               .toString();
              // purge the { and } from the ends
              uuidName = uuidName.substr(1, uuidName.length - 2);
              // locate the extension of the original name
              let lastDotIndex = saveName.lastIndexOf(".");
              let extension = lastDotIndex == -1 ? "" : saveName.substr(lastDotIndex);
              saveName = uuidName + extension;
              file = this.mailbox.attachmentsDirectory;
              file.append(saveName);
              log.info("Creating file for attachment at " + file.path);
              file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
            }
            if (!file.exists())
              throw CE("Could not create file for attachment");

            let stream = Cc["@mozilla.org/network/safe-file-output-stream;1"]
                           .createInstance(Ci.nsIFileOutputStream);
            stream.init(file, 0x04 | 0x08 | 0x20, 0o600, 0); // readwrite, create, truncate
            let buffer  = Cc["@mozilla.org/network/buffered-output-stream;1"]
                            .createInstance(Ci.nsIBufferedOutputStream);
            buffer.init(stream, 4096);
            let bstream = Cc["@mozilla.org/binaryoutputstream;1"]
                            .createInstance(Ci.nsIBinaryOutputStream);
            bstream.setOutputStream(buffer);
            if (extraPreamble.length) {
              log.debug("We're intepreting this non-file attachment as a pseudo email");
              bstream.write(extraPreamble, extraPreamble.length);
            }
            let byteArray = [...contentDecodedArray];
            bstream.writeByteArray(byteArray, byteArray.length);
            if (buffer instanceof Ci.nsISafeOutputStream) {
              buffer.finish();
            } else {
              buffer.close();
            }
            // Note that bstream does not seem to need closing.

            nativeAttachment.fileURL = Services.io.newFileURI(file).spec;
            dl("fileURL is " + nativeAttachment.fileURL);
          }
          break;

          case "CreateAttachment": {
            let rootItemId = attachmentIdElement.getAttribute("RootItemId");
            let rootItemChangeKey = attachmentIdElement.getAttribute("RootItemChangeKey");
            let rootItem = this.mailbox.getItem(rootItemId);
            rootItem.changeKey = rootItemChangeKey;
            nativeAttachment.attachmentId = attachmentId;
            break;
          }

          default:
            throw CE("Unexpected responseName", Cr.NS_ERROR_NOT_IMPLEMENTED);
        } // end switch
      } // end for
    } // end try
    catch (e) {
      isOk = false;
      log.warn(se(e));
    }
    finally {
      return isOk;
    }
  },

  _FindItemResponseType(response)
  {
    // Currently the processing of info for this is done by the caller.
    this.result = EWStoPL.domToVariant(response);
    return true;
  },

  _ResolveNamesResponseType(response)
  {
    // Currently the processing of info for this is done by the caller.
    this.result = EWStoPL.domToVariant(response);
    return true;
  },

  _ExpandDLResponseType(response)
  {
    let dlExpansionPL = EWStoPL.domToVariant(response).getPropertyList("DLExpansion");
    this._item.dlExpansion = dlExpansionPL;
    return true;
  },

  _SubscribeResponseType(response)
  {
    // Currently the processing of info for this is done by the caller.
    this.result = EWStoPL.domToVariant(response);
    return true;
  },

  _UnsubscribeResponseType(response)
  {
    // Currently the processing of info for this is done by the caller.
    this.result = EWStoPL.domToVariant(response);
    return true;
  },

  _GetStreamingEventsResponseMessageType(response)
  {
    // Currently the processing of info for this is done by the caller.
    this.result = EWStoPL.domToVariant(response);
    return true;
  },

  // Prepare for a soap call.
  _setupSoapCall(aRequestName, aResponse, aBody)
  {
    if (!this.mailbox)
      throw CE("Missing mailbox in SOAP call for " + aRequestName);
    if (!this.mailbox.ewsURL)
      throw CE("Missing transportURI in SOAP call for " + aRequestName);

    this.soapCall = new SoapCall();
    this.soapCall.transportURI = this.mailbox.ewsURL;
    if (aRequestName == "GetOnline")
      this.soapCall.noParse = true;
    if (aRequestName == "GetNotifications") {
      this.soapCall.useProgress = true;
      this.soapCall.noParse = true;
    }

    this.requestName = aRequestName;
    this.ewsResponse = aResponse;

    let requestVersion;
    switch (this.mailbox.serverVersion) {
      case "2010sp1":
        requestVersion = "Exchange2010_SP1";
        break;
      default:
        requestVersion = "Exchange2007_SP1";
        break;
    }
    this.soapCall.messageString =
      kSOAPp1 + requestVersion + kSOAPp2 + aBody + kSOAPp3;
  },

  // Log a string, with descriptive text, to the SOAP log
  _logElementString(aText, aString)
  {
    // if (this.mailbox.soapLogFile)
    {
      this.mailbox.writeToSoapLog(aText + " - " +
                                   (new Date()).toString() + "\n");
      this.mailbox.writeToSoapLog(aString);
      this.mailbox.writeToSoapLog("\n");
    }
  },

};

// helper functions
function showDOMElements(soapCall, soapResponse)
{ try { // do not throw on error.
    if (soapCall) {
      let soapString = soapCall.messageString ||
                       stringXMLResponse(soapCall.message.documentElement);
      log.config("SOAP call DOM Element is:\n" + soapString);
    }
    else {
      log.config("SOAP call DOM element missing");
    }
    if (soapResponse) {
      let soapString = stringXMLResponse(soapResponse.message.documentElement);
      log.config("SOAP response DOM Element is:\n" + soapString);
    }
    else {
      log.config("SOAP response DOM element missing");
    }
  } catch (e) { log.config("showDOMElements failed: " + e);}
}

// escape XML
const XML_CHAR_MAP = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;'
};

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, ch => XML_CHAR_MAP[ch]);
}
const _ = escapeXml;

// strip text from a dom element
function stripText(aElement, aName, aNamespace)
{
  if (!aElement || !Element.isInstance(aElement))
    return;

  let nodes = aElement.getElementsByTagNameNS(aNamespace, aName);
  for (let i = 0; i < nodes.length; i++)
  {
    let node = nodes.item(i);
    if (node)
    {
      // we'll replace the child of this item, if it is text, with dummy text
      for (let child = node.firstChild; child; child = child.nextSibling)
      {
        if (child.nodeType == child.TEXT_NODE || child.nodeType == child.CDATA_SECTION_NODE)
          child.data = "...hidden...";
      }
    }
  }
}
