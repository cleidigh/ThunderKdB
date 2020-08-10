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

//
// implements EwsNativeItem

const EXPORTED_SYMBOLS = ["EwsNativeItem"];

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
Cu.importGlobalProperties(["DOMParser"]);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("native");
  return _log;
});
ChromeUtils.defineModuleGetter(this, "EwsNativeAttachment",
                               "resource://exquilla/EwsNativeAttachment.jsm");
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");

// Use only 15 bits in bitwise operations to avoid sign issues.
const ONES = 0x7fffffff;

ChromeUtils.defineModuleGetter(this, "NetUtil",
                               "resource://gre/modules/NetUtil.jsm");
ChromeUtils.defineModuleGetter(this, "EWStoPL",
                               "resource://exquilla/EWStoPL.js");

// static helper functiona
function removeNamedElements(aElement, aName)
{
  let nodeCollection = aElement.getElementsByTagName(aName);
  if (nodeCollection)
  {
    for (let i = nodeCollection.length - 1; i >= 0; i--)
      nodeCollection.item(i).parentNode.removeChild(node);
  }
}

function newPL() {
  return new PropertyList();
}

// Convert a properties string parsed into a DOM Element from one server type to another
function convertPropertiesElement(aElement, aFromType, aToType)
{
  if (aFromType == aToType)
    return;

  // from 2007sp1 to 2010sp1
  if (aFromType == "2007sp1" && aToType == "2010sp1")
  {
    log.info("Converting properties from 2007sp1 to 2010sp1");
    // convert  <xs:element name="MeetingTimeZone" type="t:TimeZoneType" minOccurs="0" />
    // to       <xs:element name="StartTimeZone" type="t:TimeZoneDefinitionType" minOccurs="0" maxOccurs="1" />

    // for now, we'll simply delete the element
    removeNamedElements(aElement, "MeetingTimeZone");
  }
  else if (aFromType == "2010sp1" && aToType == "2007sp1")
  {
    // Remove elements not valid in 2007sp1
    log.info("Converting properties from 2010sp1 to 2007");
    removeNamedElements(aElement, "StartTimeZone");
    removeNamedElements(aElement, "EndTimeZone");
  }
}

var global = this;
function EwsNativeItem() {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);

  this._itemId = "";
  this._distinguishedFolderId = "";
  this._previousId = "";
  this._parentId = "";
  this._originalStart = "";
  this._instanceIndex = null;
  this._itemClass = "";
  this._changeKey = "";
  this._folderId = "";
  this._mimeContent = null;
  this._mimeCharacterSet = null;
  this._flags = 0;
  this._processingFlags = 0;
  this._properties = null;
  this._dlExpansion = null;
  this._localProperties = null;
  this._mailboxWeak = null;
  this._body = "";
}

EwsNativeItem.prototype = {
  /*
   * Generic change management plan:
   *
   * Local changes: 
   *   - Skink base item changes (nsIMsgDBHdr, calIEvent, etc.)
   *   - Skink calls a colonial object method to do the change
   *   - Colonial method converts Skink base item changes into a new native propertyList for the item
   *   - Those new properties are merged into the datastore, with changes saved in the localProperties Update
   *   field, and UpdatedLocally flag set, all persisted in the datastore. Note changeKey does NOT change
   *   yet for the item, as the Updates are relative to the last changeKey
   *   - (Skink UI may be notified)
   *   - If online, folder update is initiated. Folder update first saves the Updates from any items with
   *   UpdatedLocally set. Acceptance of update results in UpdatedLocally cleared, and new item changeKey saved.
   *   Folder syncState is then requested, and a list of changedItems received. If the item changeKey does not
   *   match the existing changeKey, then needsProperties is set.
   *   - 
   *   
   */
  UpdatedOnServerBit: 0x00000001,
  NewOnServerBit:     0x00000002,
  DeletedOnServerBit: 0x00000004,
  AllOnServer:        0x00000007, // UpdatedOnServerBit | NewOnServerBit | DeletedOnServerBit;
  // The deleted bit signals that the message has been deleted in the local representation
  //  of the item (eg the nsIMsgDBHdr has been deleted from the folder)
  DeletedBit:         0x00000010, // item is deleted in the skink datastore
  BodyIsHtml:         0x00000040,
  HasOfflineBody:     0x00000080,
  Persisted:          0x00000100,
  DeletedLocally:     0x00000400,
  UpdatedLocally:     0x00000800, // changeKey represents pre-change value; properties include
                                  //  the changes, changes stored in Updates.
  NewLocally:         0x00001000,
  AllLocally:         0x00001c00, // DeletedLocally | UpdatedLocally | NewLocally;
  HasTempId:          0x00002000,
  Dirty:              0x00004000, // local representation may not match server
  NeedsResync:        0x00010000, // this item needs resync and is invalid until done

  /// combined set of processing flags, not persisted. Right now I am keeping
  /// these completely separate from the flags, yet still I am trying
  /// to not duplicate bits between the two. If needed, I could start
  /// duplicating.
  NeedsPropertiesBit: 0x00000008,
  HasBody:            0x00000020,
  // for recurring masters, do we need to get modified occurrences?
  // todo: this flag is only used in the C++ machine version, delete when C++ is removed
  NeedsOccurrences:   0x00000200,
  // For some reason, in sync we sometimes get a ReadFlagChanged report that is false. Flag those.
  DidNotChange:       0x00008000,
  // Item is deleted in datastore
  DeletedInDatastore: 0x00020000,

  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },

  // Used to identify this as an EwsNativeItem
  get EwsNativeItem() {
    return this;
  },

  classID:          Components.ID("{BE4E14E9-308D-41E2-92D7-E4F920776684}"),

  /**
   * This interface provides a local representation of an item
   *  as described by the EWS data model.
   */
  //attribute AString itemId;
  get itemId() { return this._itemId;},
  set itemId(aValue) {
    if (aValue == this._itemId)
      return;
    try {
      var mailbox = this.mailbox;
    } catch (e) { log.warn(e);}
    if (mailbox && this._itemId)
      mailbox.removeItemFromCache(this._itemId);
    this._itemId = aValue;
    if (mailbox && aValue)
      mailbox.ensureItemCached(this);
  },

  /**
   * The previous item id, used to report changes of the id. This is not persisted.
   */
  //attribute AString previousId;
  get previousId() { return this._previousId;},
  set previousId(aValue) {this._previousId = aValue;},

  /// IPM class
  //attribute AString itemClass;
  get itemClass() { return this._itemClass;},
  set itemClass(aValue) {this._itemClass = aValue;},

  /// change key
  //attribute AString changeKey;
  get changeKey() { return this._changeKey;},
  set changeKey(aValue) {this._changeKey = aValue;},

  /// folder id that contains the item
  //attribute AString folderId;
  get folderId() { return this._folderId;},
  set folderId(aValue) {this._folderId = aValue;},

  /// some items (like recurring item exceptions) are related to other items
  //attribute AString parentId;
  get parentId() { return this._parentId;},
  set parentId(aValue) {this._parentId = aValue;},

  /// OriginalStart for a recurrence, used by the datastore to index the item
  //attribute AString originalStart;
  get originalStart() { return this._originalStart;},
  set originalStart(aValue) {this._originalStart = aValue;},

  /// item id, replaced by parentId + "?OriginalStart=" + originalStart
  ///  when available. This is used for indexing in the datastore
  ///  and mailbox.
  ///
  //  This is only used in the currently unsupported calendar, so has not been
  //  tested in JS.
  //readonly attribute AString exItemId;
  get exItemId() {
    // When the native item has a parent id and originalStart,
    //  we return a modified itemId based on the parent. This should only be
    //  used locally!
    if (this._parentId.length > 0 ||
        this._originalStart.length > 0)
    {
      if (this._parentId.length == 0)
        dump("parentId is empty but originalStart is set\n");
      else if (this._originalStart.length == 0)
      {
        if (this._instanceIndex)
        {
          // So here is the thing. If we create an exception by instance index, then
          //  we don't know the original start date in the native layer. Then we
          //  cannot persist a correct local representation. We will flag
          //  this case as not implemented, and ask callers to deal with
          //  this.
          dump("Failing to return exItemId since we have instanceIndex but not originalStart\n");
          throw Cr.NS_ERROR_NOT_IMPLEMENTED;
        }
        dump("originalStart is empty but parentId is set\n");
      }
      else
      {
        let exId = this._parentId + "?OriginalStart=" + this._originalStart;
        return exId;
        // No, because we can have an ex id as well as a real id
        //this._flags |= this.HasTempId;
        //printf("Assigned extended item id <%S>\n", exId.get());
      }
      return "";  // with an empty string showing that we did not get this
    }
    return this._itemId;
  },

  /// instanceIndex, usable with parentId as a replacement for itemId
  //attribute unsigned long instanceIndex;
  get instanceIndex() { return this._instanceIndex;},
  set instanceIndex(aValue) {this._instanceIndex = aValue;},

  /// distinguished folder id that contains the item. This is a partial
  /// implementation, created initially only for create item.
  //attribute AString distinguishedFolderId;
  get distinguishedFolderId() { return this._distinguishedFolderId;},
  set distinguishedFolderId(aValue) {this._distinguishedFolderId = aValue;},

  /// item is newly updated on server
  //attribute boolean updatedOnServer;
  get updatedOnServer() {
    return !!(this._flags & this.UpdatedOnServerBit);
  },
  set updatedOnServer(value) {
    if (value) {
      this.raiseFlags(this.UpdatedOnServerBit);
      this.clearFlags(this.NewOnServerBit |
                      this.DeletedOnServerBit);
    }
    else
      this.clearFlags(this.UpdatedOnServerBit);
  },

  /// item is newly created on server
  //attribute boolean newOnServer;
  get newOnServer() {
    return !!(this._flags & this.NewOnServerBit);
  },
  set newOnServer(value) {
    if (value) {
      this.raiseFlags(this.NewOnServerBit);
      this.clearFlags(this.UpdatedOnServerBit |
                      this.DeletedOnServerBit);
    }
    else
      this.clearFlags(this.NewOnServerBit);
  },

  /// item is newly deleted on server
  //attribute boolean deletedOnServer;
  get deletedOnServer() {
    return !!(this._flags & this.DeletedOnServerBit);
  },
  set deletedOnServer(value) {
    if (value) {
      this.raiseFlags(this.DeletedOnServerBit);
      this.clearFlags(this.NewOnServerBit |
                      this.UpdatedOnServerBit);
    }
    else
      this.clearFlags(this.DeletedOnServerBit);
  },

  /// item change detected, needs SOAP update  This is intended for
  ///  internal use to detect when a second SOAP call is required to
  ///  update all properties
  //attribute boolean needsProperties;
  get needsProperties() { return !!(this._flags & this.NeedsPropertiesBit);},
  set needsProperties(aValue) {
    if (aValue)
      this.raiseFlags(this.NeedsPropertiesBit);
    else
      this.clearFlags(this.NeedsPropertiesBit);
  },

  /// item is marked as deleted on the server
  //attribute boolean deleted;
  get deleted() { return !!(this._flags & this.DeletedBit);},
  set deleted(aValue) {
    if (aValue)
      this.raiseFlags(this.DeletedBit);
    else
      this.clearFlags(this.DeletedBit);
  },

  // the main repository for properties
  //attribute PropertyList properties;
  get properties() { return this._properties;},
  set properties(aValue) {this._properties = aValue ? aValue.wrappedJSObject : null;},

  /// if this is a distribution list, the expansion
  //attribute PropertyList dlExpansion;
  get dlExpansion() { return this._dlExpansion;},
  set dlExpansion(aValue) {this._dlExpansion = aValue;},

  /// storage for properties that are not part of the SOAP representation
  //attribute PropertyList localProperties;
  get localProperties() {
    if (!this._localProperties)
      this._localProperties = newPL();
    return this._localProperties;
  },
  set localProperties(value) {this._localProperties = value;},

  /// string representation of properties for storage. Setting this will
  ///  also update the properties property list.
  //attribute AString propertiesString;
  get propertiesString() {
    if (!this._properties || this._properties.length == 0)
      return "";

    let elementName;

    if (this._itemClass == "IPM.Contact")
      elementName = "Contact";
    else if (this._itemClass == "IPM.Note")
      elementName = "Message";
    else if (this._itemClass == "IPM.Appointment" ||
             this._itemClass == "IPM.OLE.CLASS.{00061055-0000-0000-C000-000000000046}")
      elementName = "CalendarItem";
    else if (this._itemClass == "IPM.Task")
      elementName = "Task";
    else if (this._itemClass == "IPM.DistList")
      elementName = "DistributionList";
    else if (this._itemClass == "IPM.Schedule.Meeting.Request")
      elementName = "MeetingRequest";
    else if (this._itemClass == "IPM.Schedule.Meeting.Canceled")
      elementName = "MeetingCancellation";
    else if (this._itemClass == "IPM.Schedule.Meeting.Resp")
      elementName = "MeetingResponse";
    else
      elementName = "Item";

    let mailbox = this.mailbox;
    return EWStoPL.plToXML(elementName, mailbox.serverVersion,
                           this._properties);
  },
  set propertiesString(aString) {
    if (!aString) {
      log.warn("SetPropertiesString aString is Empty");
      this._properties = null;
      return;
    }

    let parsedElement = new DOMParser().parseFromString(aString, "text/xml")
                                        .documentElement;

    // We need to allow for different EWS types between a stored string and the mailbox.
    // I will use an attribute on the first element ewstype="2010sp1" for any type other than 2007
    let ewstype = parsedElement.getAttribute("ewstype");
    if (!ewstype)
      ewstype = "2007sp1";
    let mailbox = this.mailbox;
    if (!mailbox)
      throw Cr.NS_ERROR_UNEXPECTED;
    // Make sure that the string version matches the mailbox, else convert
    if (ewstype != mailbox.serverVersion)
      convertPropertiesElement(parsedElement, ewstype, mailbox.serverVersion);

    this._properties = EWStoPL.domToVariant(parsedElement).wrappedJSObject;
  },

  /// string representation of dlExpansion for storage. Setting this will
  ///  also update the dlExpansion property list.
  /// XXX ToDo testing of get/set dlExpansionString
  //attribute AString dlExpansionString;
  get dlExpansionString() {
    if (!this._itemClass.startsWith("IPM.DistList"))
      log.warn("get dlExpansionString, but only distribution lists have an expansion");
    if (!this._dlExpansion)
      return "";

    let res = EWStoPL.plToXML("DLExpansion", null, this._dlExpansion);
    return res;
  },
  set dlExpansionString(aString) {
    if (!aString) {
      log.info("Set dlExpansionString aString is Empty");
      this._dlExpansion = null;
      return;
    }
    let parsedElement = new DOMParser().parseFromString(aString, "text/xml")
                                       .documentElement;
    let mailbox = this.mailbox;
    if (!mailbox)
      throw Cr.NS_ERROR_UNEXPECTED;
    this._dlExpansion = EWStoPL.domToVariant(parsedElement);
  },

  /// native mailbox containing the item
  //attribute EwsNativeMailbox mailbox;
  get mailbox() {
    try {
      var mailbox = this._mailboxWeak.get();
    } catch (e) {}
    if (!mailbox)
      throw CE("Mailbox not initialized", Cr.NS_ERROR_NOT_INITIALIZED);
    return mailbox.wrappedJSObject;
  },
  set mailbox(value) {
    this._mailboxWeak = Cu.getWeakReference(value);
  },

  /// combined set of status flags, used in storage
  //attribute unsigned long flags;
  get flags() { return this._flags;},
  set flags(aValue) {this._flags = aValue;},

  /// set one or more flags
  //void raiseFlags(in unsigned long aFlags);
  raiseFlags(aFlags) { this._flags |= aFlags; },

  /// clear one or more flags
  //void clearFlags(in unsigned long aFlags);
  clearFlags(aFlags) { this._flags &= ~aFlags; },

  /// combined set of processing flags, not persisted. Right now I am keeping
  /// these completely separate from the flags, yet still I am trying
  /// to not duplicate bits between the two. If needed, I could start
  /// duplicating.
  //attribute unsigned long processingFlags;
  get processingFlags() { return this._processingFlags;},
  set processingFlags(aValue) {this._processingFlags = aValue;},

  /// message body
  //attribute AString body;
  get body() {
    if (this._body)
      return this._body;
    if (this._properties)
      return this._properties.getAString("Body");
    return "";
  },
  set body(value) {
    this._body = value;
    if (value)
      this._processingFlags |= this.HasBody;
    else
      this._processingFlags &= ~this.HasBody;
  },

  /// As an error check, I need to see if the body is empty. I don't want to copy
  ///  the entire string just to do that
  //readonly attribute boolean isBodyEmpty;
  get isBodyEmpty() {
    if (this._body)
      return false;
    if (this._properties &&
        this._properties.getAString("Body"))
      return false;
    return true;
  },

  /// MIME version of item
  //attribute ACString mimeContent;
  get mimeContent() { return this._mimeContent;},
  set mimeContent(aValue) {this._mimeContent = aValue;},

  /// character set for MIME item
  //attribute AString mimeCharacterSet;
  get mimeCharacterSet() { return this._mimeCharacterSet;},
  set mimeCharacterSet(aValue) {this._mimeCharacterSet = aValue;},

  // clone the item, giving it a new item id and change key
  //IEwsNativeItem clone(in AString itemId, in AString changeKey, in EwsNativeFolder aNewFolder);
  clone: function (aItemId, aChangeKey, aNativeFolder) {
    let mailbox;
    if (aNativeFolder)
      mailbox = aNativeFolder.mailbox;
    else
      mailbox = this.mailbox;
    if (!mailbox)
      throw Cr.NS_ERROR_NOT_INITIALIZED;

    let newItem = mailbox.createItem(aItemId, this._itemClass, aNativeFolder);

    let flags = this._flags & ~this.HasOfflineBody;
    let itemId = aItemId;
    if (!itemId) {
      itemId = Cc["@mozilla.org/uuid-generator;1"]
                 .getService(Ci.nsIUUIDGenerator)
                 .generateUUID()
                 .toString();
      flags |= this.HasTempId;
      newItem.itemId = itemId;
    }
    newItem.changeKey = aChangeKey;

    newItem.flags = flags;
    if (this.attachmentCount)
      newItem.raiseFlags(newItem.NeedsResync);

    newItem.processingFlags = this._processingFlags & ~this.HasBody;
    newItem.mimeContent = this._mimeContent;
    newItem.mimeCharacterSet = this._mimeCharacterSet;
    if (this._properties)
      newItem.properties = this._properties.clone(null);
    if (this._dlExpansion)
      newItem.dlExpansion = this._dlExpansion.clone(null);
    if (this._localProperties)
      newItem.localProperties = this._localProperties.clone(null);

    return newItem;
  },

  // If the existing item has an attachment, then the attachment list is no longer valid.
  //  I'll just mark it NeedsResync to flag that we need to reget the properties

  //EwsNativeAttachment getAttachmentById(in AString aAttachmentId);
  getAttachmentById: function(aAttachmentId) {
    if (!this._properties)
      throw Cr.NS_ERROR_UNEXPECTED;
    if (!aAttachmentId)
      throw Cr.NS_ERROR_ILLEGAL_VALUE;
    let attachmentsPL = this._properties.getPropertyList("Attachments");
    if (attachmentsPL && attachmentsPL.length) {
      for (let index = 0; index < attachmentsPL.length; index++) {
        let attachmentPL = attachmentsPL.getPropertyListAt(index);
        if (!attachmentPL) {
          log.error("missing property list");
          continue;
        }
        if (aAttachmentId == attachmentPL.getAString("AttachmentId/$attributes/Id")) {
          let attachment = new EwsNativeAttachment();
          attachment.parentItem = this;
          attachment.attachmentId = aAttachmentId;
          let type = attachmentsPL.getNameAt(index);
          //log.debug("attachment type(1) is " + type);
          attachment.isFileAttachment = type == "FileAttachment";
          return attachment;
        }
      }
    }
  },

  //EwsNativeAttachment getAttachmentByIndex(in long aIndex);
  getAttachmentByIndex: function(index) {
    if (!this._properties)
      throw Cr.NS_ERROR_UNEXPECTED;
    let attachmentsPL = this._properties.getPropertyList("Attachments");
    if (attachmentsPL && attachmentsPL.length) {
      let attachmentPL = attachmentsPL.getPropertyListAt(index);
      if (!attachmentPL) {
        log.error("missing property list");
      }
      else {
        let attachment = new EwsNativeAttachment();
        attachment.parentItem = this;
        attachment.attachmentId = attachmentPL.getAString("AttachmentId/$attributes/Id");
        let type = attachmentsPL.getNameAt(index);
        //log.debug("attachment type(2) is " + type);
        attachment.isFileAttachment = type == "FileAttachment";
        return attachment;
      }
    }
    return null;
  },

  // This creates the attachment, and adds it to the properties for the item
  //EwsNativeAttachment addAttachment(in AString aAttachmentId);
  addAttachment: function(aAttachmentId) {
    if (!this._properties)
      throw Cr.NS_ERROR_UNEXPECTED;
    let attachmentId = aAttachmentId;
    if (!attachmentId) {
      // We'll use a fake id if none exists.
      attachmentId = Cc["@mozilla.org/uuid-generator;1"]
                       .getService(Ci.nsIUUIDGenerator)
                       .generateUUID()
                       .toString();
    }
    else {
      // What do I do if this attachment already exists with this ID? For now, I'll return and warn
      let existingAttachment = this.getAttachmentById(attachmentId);
      if (existingAttachment) {
        log.info("Adding attachment that already exists, using existing attachment");
        return existingAttachment;
      }
    }

    let attachment = new EwsNativeAttachment();
    attachment.parentItem = this;
    attachment.attachmentId = attachmentId;
    this._properties.setBoolean("HasAttachments", true);
    return attachment;
  },

  //void removeAttachment(in EwsNativeAttachment aNativeAttachment);
  removeAttachment: function(attachment) {
    if (!this._properties)
      throw Cr.NS_ERROR_UNEXPECTED;
    if (!attachment)
      throw Cr.NS_ERROR_ILLEGAL_VALUE;

    // Delete the attachment file if stored in the profile.
    do { // break to continue without delete.
      let mailbox = this.mailbox;
      if (!mailbox) {
        log.warn("No mailbox found when trying to remove attachment");
        break;
      }
      if (!attachment.fileURL)
        break;
      let file = NetUtil.newURI(attachment.fileURL)
                        .QueryInterface(Ci.nsIFileURL)
                        .file;
      if (!file)
        break;
      if (mailbox.attachmentsDirectory.contains(file)) {
        log.debug("Deleting attachment file " + attachment.fileURL);
        try {
          file.remove(false);
        } catch (e) {
          e.code = "error-remove-local-attachment-file";
          log.error("Could not remove local attachment file, but continuing", e);
        }
      }
    } while (false);

    // Remove the attachment from the properties
    let attachmentsPL = this._properties.getPropertyList("Attachments");
    if (attachmentsPL && attachmentsPL.length) {
      for (let index = 0; index < attachmentsPL.length; index++) {
        let attachmentPL = attachmentsPL.getPropertyListAt(index);
        if (!attachmentPL) {
          log.error("missing property list");
          continue;
        }
        if (attachment.attachmentId == attachmentPL.getAString("AttachmentId/$attributes/Id")) {
          attachmentsPL.removeElementAt(index);
          return;
        }
      }
    }
   // failed to remove the attachment.
   throw Cr.NS_ERROR_NOT_AVAILABLE;
  },

  // Given newProperties, merge these into a local Updates PL (creating if needed). Does not persist.
  //void mergeChanges(in PropertyList newProperties);
  mergeChanges: function(newProperties) {
    let result = Cr.NS_OK;
    try {
    let mailbox = this.mailbox;
    if (!mailbox)
      throw CE("missing mailbox", Cr.NS_ERROR_UNEXPECTED);
    if (!this.itemId && !this.parentId)
      throw CE("missing either itemId or parentId", Cr.NS_ERROR_NOT_INITIALIZED);
    if (!this.changeKey)
      throw CE("Missing changeKey", Cr.NS_ERROR_NOT_INITIALIZED);
    if (!this.properties)
      throw CE("Missing properties", Cr.NS_ERROR_NOT_INITIALIZED);
    if (!this.folderId)
      throw CE("Missing folderId", Cr.NS_ERROR_NOT_INITIALIZED);
    let nativeFolder = mailbox.getNativeFolder(this.folderId)
    if (!nativeFolder)
      throw CE("Missing nativeFolder", Cr.NS_ERROR_NOT_INITIALIZED);
    if (!this.itemClass)
      throw CE("Missing itemClass", Cr.NS_ERROR_NOT_INITIALIZED);
    let localProperties = this.localProperties;
    let plUpdates = localProperties.getPropertyList("Updates");
    if (!plUpdates) {
      plUpdates = newPL();
      localProperties.appendPropertyList("Updates", plUpdates);
    }

    // We scan through all supported properties, and add SetItemField
    //  entries for detected changes.
    // XXX todo: Since the properties should only contain valid values, then why am I
    //           using the folder property names, instead of just scanning directly through
    //           the new property list?

    // Now we set all of the properties that we support updates for.
    // This is dependent on the item class.
    let itemPropertyNames = nativeFolder.getItemPropertyNames(this.itemClass);
    if (!itemPropertyNames)
      throw CE("Missing itemPropertyNames", Cr.NS_ERROR_NOT_INITIALIZED);

    let nameCount = itemPropertyNames.length;
    let changesCount = 0;
    for (let i = 0; i < nameCount; i++) {
      let valueOld = "";
      let valueNew = "";
      let propertyName = itemPropertyNames.getAt(i);
      // eg propertyName = contacts:PhysicalAddress:Street/Business
      // or              = item:ExtendedProperty:0x1081/Integer

      // As a convention, I represent indexed field URIS as
      //  FieldURI/FieldIndex in the properties. Detect these.
      // (fieldIndex is the Type for extended properties)
      let fieldIndex = '';
      let pos = propertyName.indexOf('/');
      if (pos >= 0) {
        fieldIndex = propertyName.substring(pos + 1);
        propertyName = propertyName.substring(0, pos);
      }

      // propertyName = contacts:PhysicalAddress:Street or
      // propertyName = item:ExtendedProperty:0x1234
      // fieldIndex = Business or (for extended properties) Integer
      pos = propertyName.indexOf(':');
      if (pos < 0)
        throw CE("Missing colon delimiter in propertyName", Cr.NS_ERROR_FAILURE);
      let shorterName = propertyName.substring(pos + 1);

      // certain properties cannot be updated
      if (shorterName == "RecurrenceId")
        continue;

      // shorterName  = PhysicalAddress:Street or ExtendedProperty:0x1234

      // the real name may also have a subitem separated by another colon
      pos = shorterName.indexOf(':');
      let subitem = '';
      if (pos >= 0)
      {
        subitem = shorterName.substring(pos + 1);
        shorterName = shorterName.substring(0, pos);
      }
      // shorterName = PhysicalAddress, subitem = Street
      // or shorterName = ExtendedProperty, subitem = 0x1234
      //dl('unparsed name is ' + itemPropertyNames.getAt(i));

          // Handle special case fields
      if (shorterName == "DeletedOccurrences")
      {
        throw CE("DeletedOccurrences not supported", Cr.NS_ERROR_NOT_IMPLEMENTED);
        // See the previous implementation of msqEwsNativeItem.cpp
      }
      else if (shorterName == "ExtendedProperty")
      {
        // get the extended property from new and old lists
        valueOld = this._getExtendedPropertyValue(subitem, this.properties);
        valueNew = this._getExtendedPropertyValue(subitem, newProperties);
      }
      // handle no-fieldIndex case
      else if (!fieldIndex)
      {
        // We only support changes to strings directly.
        valueOld = this._properties.getAString(shorterName);
        valueNew = newProperties.getAString(shorterName);
      }
      else
      {
        // pluralize the name
        if (shorterName.endsWith('s'))
          shorterName += 'es';
        else
          shorterName += 's';
        // shorterName = PhysicalAddresses

        let entries = this._properties.getPropertyList(shorterName);
        if (entries && entries.length)
        {
          let entry = entries.getPropertyListByAttribute(
            "Entry", "Key", fieldIndex);
          if (entry)
          {
            if (!subitem)
              valueOld = entry.getAString("$value");
            else
              valueOld = entry.getAString(subitem);
          }
        }

        // repeat for the new values
        entries = newProperties.getPropertyList(shorterName);
        if (entries && entries.length)
        {
          let entry = entries.getPropertyListByAttribute(
            "Entry", "Key", fieldIndex);
          if (entry)
          {
            if (!subitem)
              valueNew = entry.getAString("$value");
            else
              valueNew = entry.getAString(subitem);
          }
        }
      }
      //if (valueOld || valueNew) {
        //dl('valueOld = <' + valueOld + '>');
        //dl('valueNew = <' + valueNew + '>');
        //dl('shorterName is ' + shorterName);
        //dl('fieldIndex is ' + fieldIndex);
        //dl('subitem is ' + subitem);
      //}

      if (valueNew != valueOld)
      {
        changesCount++;
        // need to update this property
        // setup a change element
        let plChangeItemField = newPL();
        let plFieldURI = newPL();
        let plItem = newPL();
        if (!fieldIndex)
        { // plain field uri
          plChangeItemField.appendPropertyList("FieldURI", plFieldURI);
          plFieldURI.setAString("$attributes/FieldURI", propertyName);
          if (valueNew)
          {
            if (shorterName != "Body")
            {
              // We don't really have support for non-string items, but for now
              // we will guess bools by the value from JS of 'true' or 'false'
              if (valueNew == "false" || valueNew == "true")
                plItem.appendBoolean(shorterName, valueNew == "true");
              else
                plItem.appendString(shorterName, valueNew);
            }
            else // special handling for the body which needs an attribute
            {
              let plBody = newPL();
              plBody.setAString("$attributes/BodyType", "Text");
              plBody.setAString("$value", valueNew);
              plItem.appendPropertyList("Body", plBody);
            }
          }
        }
        // handle extended properties
        else if (shorterName == "ExtendedProperty") {
          // extended field uri
          // add an extended field uri
          plChangeItemField.appendPropertyList("ExtendedFieldURI", plFieldURI);
          plFieldURI.setAString("$attributes/PropertyTag", subitem);
          plFieldURI.setAString("$attributes/PropertyType", fieldIndex);
          // create an extended property
          if (valueNew)
          {
            let plExtendedProperty = newPL();
            plExtendedProperty.appendPropertyList("ExtendedFieldURI", plFieldURI);
            // We don't really have support for non-string items, but for now
            // we will guess bools by the value from JS of 'true' or 'false'
            if (valueNew == "false" || valueNew == "true")
              plExtendedProperty.appendBoolean("Value", valueNew == "true");
            else
              plExtendedProperty.appendString("Value", valueNew);
            plItem.appendPropertyList("ExtendedProperty", plExtendedProperty);
          }
        }
        else {
          // indexed field uri
          plChangeItemField.appendPropertyList("IndexedFieldURI", plFieldURI);
          plFieldURI.setAString("$attributes/FieldURI", propertyName);
          plFieldURI.setAString("$attributes/FieldIndex", fieldIndex);
          // create an indexed entry
          if (valueNew)
          {
            let plEntry = newPL();
            plEntry.setAString("$attributes/Key", fieldIndex);
            if (!subitem)
              plEntry.appendString("$value", valueNew);
            else
              plEntry.appendString(subitem, valueNew);
            let plEntryParent = newPL();
            plEntryParent.appendPropertyList("Entry", plEntry);
            plItem.appendPropertyList(shorterName, plEntryParent);
          }
        }

        if (valueNew)
        {
          let itemName;
          if (this._itemClass.startsWith("IPM.Note") ||
              this._itemClass.startsWith("REPORT.IPM.Note") ||
              this._itemClass.startsWith("IPM.Schedule.Meeting"))
            itemName = "Message";
          else if (this._itemClass.startsWith("IPM.Contact"))
            itemName = "Contact";
          else if (this._itemClass.startsWith("IPM.Appointment") ||
                   this._itemClass == "IPM.OLE.CLASS.{00061055-0000-0000-C000-000000000046}")
            itemName = "CalendarItem";
          else if (this._itemClass.startsWith("IPM.Post"))
            itemName = "PostItem";
          else
          {
            log.warn("Attempt to update an unsupported item type" + this._itemClass);
            itemName = "Item";
          }
          plChangeItemField.appendPropertyList(itemName, plItem);
          // XXX todo: I really need to prevent duplicate or reversing changes
          plUpdates.appendPropertyList("SetItemField", plChangeItemField);
        }
        // If the value length is 0, we will delete the item
        else
        {
          // certain fields cannot be deleted
          if (shorterName != "Subject")
            plUpdates.appendPropertyList("DeleteItemField", plChangeItemField);
        }
      }
    }

    // Even if there are no supported changes, the new property list might have some
    //  different entries (for example DeletedOccurrence).
    this._properties = newProperties;
    this._flags |= this.UpdatedLocally;

    // Are there any changes?
    if (!changesCount)
    {
      // tell the caller that nothing changed
      log.config("nativeItem.mergeChanges Nothing changed");
      result = Cr.NS_ERROR_ALREADY_INITIALIZED ;
    }

  } catch (e) {
      log.warn("Error merging changes: " + e);
      if (e instanceof Ci.nsIException)
        result = e.result;
      else
        result = Cr.NS_ERROR_FAILURE;
  } finally {
    return result;
  }},

  //readonly attribute unsigned long attachmentCount;
  get attachmentCount() {
    if (this._properties) {
      let attachmentsPL = this._properties.getPropertyList("Attachments");
      if (attachmentsPL && attachmentsPL.length)
        return attachmentsPL.length;
    }
    return 0;
  },

  // Convenience method to do a sync persist of the item, typically only
  //  used in error recovery.
  //void persist();
  persist: function () {
    let mailbox = this.mailbox;
    if (mailbox)
      mailbox.persistItem(this, null);
  },

  // Access an extended property by property tag
  //AString getExtendedProperty(in AString aPropertyTag);
  getExtendedProperty: function(aPropertyTag) {
    return this._getExtendedPropertyValue(aPropertyTag, this._properties);
  },

  // this is a service function not dependent on this native item, since we
  //  are given the property list (which is typically cloned from this item's properties)
  //void setExtendedProperty(in AString aPropertyTag, in AString aPropertyType, in AString aValue, in PropertyList aProperties);
  setExtendedProperty: function(aPropertyTag, aPropertyType, aValue, aProperties) {
    let foundIt = false;
    let extendedProperties = aProperties.getPropertyLists("ExtendedProperty");
    let plExtendedProperty;
    if (extendedProperties) {
      for (plExtendedProperty of extendedProperties) {
        if (plExtendedProperty) {
          let propertyTag = plExtendedProperty.getAString("ExtendedFieldURI/$attributes/PropertyTag");
          if (propertyTag == aPropertyTag) {
            foundIt = true;
            break;
          }
        }
      }
    }

    if (!foundIt) {
      // we have to create this element
      plExtendedProperty = newPL();
      plExtendedProperty.setAString("ExtendedFieldURI/$attributes/PropertyTag", aPropertyTag);
      plExtendedProperty.setAString("ExtendedFieldURI/$attributes/PropertyType", aPropertyType);
      aProperties.appendPropertyList("ExtendedProperty", plExtendedProperty);
    }
    plExtendedProperty.setAString("Value", aValue);
  },

  // helper functions
  _getExtendedPropertyValue: function(aPropertyTag, aProperties) {
    let extendedProperties = aProperties.getPropertyLists("ExtendedProperty");
    if (extendedProperties) {
      for (let plExtendedProperty of extendedProperties) {
        if (plExtendedProperty) {
          let propertyTag = plExtendedProperty.getAString("ExtendedFieldURI/$attributes/PropertyTag");
          if (propertyTag == aPropertyTag)
            return plExtendedProperty.getAString("Value");
        }
      }
    }
    // if we get here, then we failed to find the entry
    return "";
  },

  // nsresult GetEncoding(nsAString& aTypeNamespace, msqISchemaType* *aSchemaType, msqISOAPEncoding* *aSOAPEncoding);
  _getEncoding: function() {
    let mailbox = this.mailbox;
    if (!mailbox)
      throw Cr.NS_ERROR_UNEXPECTED;
    let typeNamespace = mailbox.typeNamespace;
    if (!typeNamespace)
      throw Cr.NS_ERROR_UNEXPECTED;

    let typeName = "ItemType";
    if (this._itemClass =="IPM.Contact")
      typeName = "ContactItemType";
    else if (this._itemClass == "IPM.Note")
      typeName = "MessageType";
    else if (this._itemClass == "IPM.Appointment" ||
             this._itemClass == "IPM.OLE.CLASS.{00061055-0000-0000-C000-000000000046}")
      typeName = "CalendarItemType";
    else if (this._itemClass == "IPM.Task")
      typeName = "TaskType";
    else if (this._itemClass == "IPM.DistList")
      typeName = "DistributionListType";
    else if (this._itemClass == "IPM.Schedule.Meeting.Request")
      typeName = "MeetingRequestMessageType";
    else if (this._itemClass == "IPM.Schedule.Meeting.Canceled")
      typeName = "MeetingCancellationMessageType";
    else if (this._itemClass == "IPM.Schedule.Meeting.Resp")
      typeName = "MeetingResponseMessageType";
    else if (this._itemClass.startsWith("IPM.DistList"))
      typeName = "ArrayOfDLExpansionType";

    //dl('typeName is ' + typeName);
    let schemaType = collection.getType(typeName, typeNamespace);
    if (!schemaType)
      throw Cr.NS_ERROR_FAILURE;
    let encoding = Cc["@mozilla.org/xmlextras/soap/encoding;1"]
                     .createInstance(Ci.msqISOAPEncoding);
    encoding.schemaCollection = collection;
    return [typeNamespace, schemaType, encoding];
  },
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsNativeItem]);
