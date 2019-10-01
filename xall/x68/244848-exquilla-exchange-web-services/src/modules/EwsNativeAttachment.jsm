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

const EXPORTED_SYMBOLS = ["EwsNativeAttachment"];

var Cu = Components.utils;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("native");
  return _log;
});
ChromeUtils.defineModuleGetter(this, "Services",
                               "resource://gre/modules/Services.jsm");

function EwsNativeAttachment() {
  this._isFileAtachment = true;
}

EwsNativeAttachment.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },

  // Used to identify this as an EwsNativeAttachment
  get EwsNativeAttachment() {
    return this;
  },

  get parentItem()  { return this._item;},
  set parentItem(a) { this._item = a;},

  get attachmentId()  { return this._attachmentId;},
  set attachmentId(a) {
    this._attachmentId = a;
    // If we are doing an initial assignment, then no PLs should exist, and we can rely
    //  on the side effects in getting the PLs to assign the id. Otherwise, we need to reset
    //  the ids in each of the PLs
    this._getAttachmentPL();
    this._getLocalAttachmentPL();
    this._attachmentPL.setAString("AttachmentId/$attributes/Id", a);
    this._localAttachmentPL.setAString("AttachmentId/$attributes/Id", a);
  },

  get name() {
    this._getAttachmentPL();
    return this._attachmentPL.getAString("Name");
  },
  set name(a) {
    this._getAttachmentPL();
    this._attachmentPL.setAString("Name", a);
  },

  get contentType() {
    this._getAttachmentPL();
    return this._attachmentPL.getAString("ContentType");
  },
  set contentType(a) {
    this._getAttachmentPL();
    this._attachmentPL.setAString("ContentType", a);
  },

  get contentId() {
    this._getAttachmentPL();
    return this._attachmentPL.getAString("ContentId");
  },
  set contentId(a) {
    this._getAttachmentPL();
    this._attachmentPL.setAString("ContentId", a);
  },

  get fileURL() {
    this._getLocalAttachmentPL();
    return this._localAttachmentPL.getAString("ContentLocation");
  },
  set fileURL(a) {
    this._getLocalAttachmentPL();
    this._localAttachmentPL.setAString("ContentLocation", a);
  },

  get isFileAttachment() { return this._isFileAttachment;},
  set isFileAttachment(a) { this._isFileAttachment = a;},

  get size() {
    this._getAttachmentPL();
    return this._attachmentPL.getAString("Size");
  },

  get downloaded() {
    if (!this.fileURL)
      return false;
    try {
      var attachmentFile = Services.io.newURI(this.fileURL, null, null)
                                   .QueryInterface(Ci.nsIFileURL)
                                   .file;
    } catch (e) {}
    if (attachmentFile)
      return attachmentFile.exists()
    return false;
  },

    // helper functions

  // reads the attachment PL from the native item, and sets the internal value.
  _getAttachmentPL() {
    if (this._attachmentPL)
      return;
    if (!this._item)
      throw CE("native attachment has no corresponding native item", Cr.NS_ERROR_NOT_INITIALIZED);
    this._attachmentPL = this._getAttachmentPLFromProperties(this._item.properties);
  },

  // reads the local attachment PL from the native item, and sets the internal value.
  _getLocalAttachmentPL() {
    if (this._localAttachmentPL)
      return;
    if (!this._item)
      throw CE("native attachment has no corresponding native item", Cr.NS_ERROR_NOT_INITIALIZED);
    this._localAttachmentPL = this._getAttachmentPLFromProperties(this._item.localProperties);
  },

  // returns that attachment PL, creating if needed.
  _getAttachmentPLFromProperties(aProperties)
  {
    let attachmentsPL = aProperties.getPropertyList("Attachments");
    if (!attachmentsPL)
    {
      attachmentsPL = new PropertyList();
      aProperties.appendPropertyList("Attachments", attachmentsPL);
    }
    let attachmentPL;
    for (let index = 0; index < attachmentsPL.length; index++)
    {
      attachmentPL = attachmentsPL.getPropertyListAt(index);
      if (!attachmentPL)
      {
        log.error("missing property list");
        continue;
      }
      if (attachmentPL.getAString("AttachmentId/$attributes/Id") ==
          this._attachmentId)
      {
        return attachmentPL;
      }
    }
    // didn't find, need to add
    attachmentPL = new PropertyList();
    attachmentsPL.appendPropertyList("FileAttachment", attachmentPL);
    attachmentPL.setAString("AttachmentId/$attributes/Id", this._attachmentId);
    return attachmentPL;
  },

}
