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

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("base");
  return _log;
});

ChromeUtils.defineModuleGetter(this, "JSAccountUtils", "resource://exquilla/JSAccountUtils.jsm");
ChromeUtils.defineModuleGetter(this, "JaBaseUrl",
                               "resource://exquilla/JaBaseUrl.jsm");

const ATTACHMENT_QUERY = "part=1.";

// Main class.
var global = this;
function EwsUrl(aDelegator, aBaseInterfaces) {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);

  // Superclass constructor
  JaBaseUrl.call(this, aDelegator, aBaseInterfaces);

  // I'm not sure why I have to call this again, as it is called in the
  // base constructor, but without it this method will not find the
  // interfaces beyond nsISupports.
  //aBaseInterfaces.forEach(iface => this.cppBase instanceof iface);

  // instance variables
  this._itemId = null;
  this._messageKey = null;
  this._urlType = -1; // unknown;
}

// Extend the base properties.
EwsUrl.Properties = {
  __proto__: JaBaseUrl.Properties,

  contractID: "@mesquilla.com/messenger/ewsmailnewsurl;1",
  classID: Components.ID("{86D28AF0-73F0-4728-8377-A9D4836B7BC3}"),

// Add an additional interface only needed by this custom class.
  extraInterfaces: [],
}

// Extend the base class methods.
EwsUrl.prototype = {
  // Typical boilerplate to include in all implementations.
  __proto__: JaBaseUrl.prototype,

  // Used to identify this as an EwsUrl
  get EwsUrl() {
    return this;
  },

  // InterfaceRequestor override, needed if extraInterfaces.
  getInterface: function(iid) {
    for (let iface of EwsUrl.Properties.extraInterfaces) {
      if (iid.equals(iface)) {
        return this;
      }
    }
    return this.QueryInterface(iid);
  },

  // nsIMsgMailNewsUrl overrides
  // Note that these overrides do not work post-gecko58, but in gecko59
  // equivalent funtionality was added ins JaAccount.
  IsUrlType(aType) { return aType == this._urlType;},

  get server() {
    if (!this.folder)
      throw Cr.NS_ERROR_NOT_INITIALIZED;
    return this.folder.server;
  },

  // EwsUrl implementation

  /// EWS id for item, set by prepare url in server
  // attribute AString itemId;
  get itemId() { return this._itemId;},
  set itemId(aVal) {this._itemId = aVal;},

  /// Does this url refer to an attachment?
  //readonly attribute boolean isAttachment;
  get isAttachment() {
    // We look to see if the URL has an attachment query
    let query = this.QueryInterface(Ci.nsIURL).query;
    return (query && query.indexOf(ATTACHMENT_QUERY) != -1);
  },

  /// Attachment sequence number, that is the nth attachment for the item.
  /// Returns -1 for not valid url
  //readonly attribute long attachmentSequence;
  get attachmentSequence() {
    try {
      // Find the location of the attachment query.
      let result = -1;
      let query= this.query;
      let attachmentRequestOffset = query.indexOf(ATTACHMENT_QUERY);
      if (attachmentRequestOffset < 0) {
        log.warn("This is not an attachment URL");
        return -1;
      }
      // strip up to the sequence string
      query = query.substr(attachmentRequestOffset + ATTACHMENT_QUERY.length);
      // strip off everything but numbers
      query = query.match(/^(\d)*/);
      if (query && query[0]) {
        // The first attachment is 2, so subtract 2.
        result = parseInt(query[0], 10);
        if (result !== NaN) {
          result -= 2;
        }
      }
      if (result >= 0)
        return result;
      return -1;
    } catch(ex) {
      throw(CE("Failed to parse attachment number: " + ex, Cr.NS_ERROR_FAILURE));
    }
  },

  /// skink message key, set by prepare url in server
  //attribute unsigned long messageKey;
  get messageKey() {return this._messageKey;},
  set messageKey(val) { this._messageKey = val;},

  /// native EWS mailbox
  //readonly attribute EwsNativeMailbox mailbox;
  get mailbox() {
    return safeGetJS(this.server).nativeMailbox;
  },

  /// urlType (copy, move, display) from nsIMsgMailNewsUrl
  //void setUrlType(in unsigned long aType);
  setUrlType: function(aType) {
    this._urlType = aType;
    try { // Only works post gecko58
      this.cppBase.QueryInterface(Ci.msgIJaUrl).setUrlType(aType);
    } catch(e) {
      log.debug("Failed to set url type using msgIJaUrl. Not a problem in TB 52: " + e);
    }
  },
}

// Constructor
function EwsUrlConstructor() {
}

// Constructor prototype (not instance prototype).
EwsUrlConstructor.prototype = {
  classID: EwsUrl.Properties.classID,
  _xpcom_factory: JSAccountUtils.jaFactory(EwsUrl.Properties, EwsUrl),
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsUrlConstructor]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
