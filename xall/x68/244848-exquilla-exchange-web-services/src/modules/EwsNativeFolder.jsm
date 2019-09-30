/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

const EXPORTED_SYMBOLS = ["EwsNativeFolder"];

var Cu = Components.utils;
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNativeService",
                               "resource://exquilla/EwsNativeService.jsm");
Utils.importLocally(this);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("native");
  return _log;
});
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");

// definitions of item properties by class
// standard class IPM.Note properties
var kNotePropertyNames = {
common: [
  "item:ParentFolderId",
  "item:DateTimeCreated",
  "item:DateTimeReceived",
  "item:DisplayTo",
  "item:DisplayCc",
  "item:Categories",
  "item:Subject",
  "item:Size",
  "item:ItemClass",
  "item:Culture",
  "item:InReplyTo",
  "item:Importance",
  "item:Attachments",
  "item:HasAttachments",
  "item:Body",
  "item:ExtendedProperty:0x1081/Integer", // PR_LAST_VERB_EXECUTED
  "item:ExtendedProperty:0x1090/Integer", // PR_FLAG_STATUS
  "item:ExtendedProperty:0x1095/Integer", // PR_FOLLOWUP_ICON
  "item:ExtendedProperty:0x0E2B/Integer", // PR_TODO_ITEM_FLAGS
  "item:InternetMessageHeaders",
  "message:Sender",
  "message:IsRead",
  "message:InternetMessageId",
  "message:From",
  "message:References",
  "message:ToRecipients",
  "message:CcRecipients",
  "message:BccRecipients",
  "message:ReplyTo",
  ],
  "2007sp1": [],
  "2010sp1": [],
};

// standard class IPM.Appointment properties
var kAppointmentPropertyNames = {
common: [
  "item:ParentFolderId",
  "item:ItemClass",
  "item:Subject",
  "item:Sensitivity",
  "item:Attachments",
  "item:DateTimeCreated",
  "item:Body",
  "item:Categories",
  "item:Importance",
  "item:HasAttachments",
  "item:Culture",
  "calendar:UID",
  "calendar:RecurrenceId",
  "calendar:Start",
  "calendar:End",
  "calendar:IsAllDayEvent",
  "calendar:LegacyFreeBusyStatus",
  "calendar:IsCancelled",
  "calendar:IsRecurring",
  "calendar:Location",
  "calendar:CalendarItemType",
  "calendar:Duration",
  "calendar:Recurrence",
  "calendar:ModifiedOccurrences",
  "calendar:DeletedOccurrences",
  ],
  "2007sp1": ["calendar:MeetingTimeZone",],
  "2010sp1": ["calendar:StartTimeZone",
              "calendar:EndTimeZone"],
};

// standard class IPM.OLE.CLASS.{00061055-0000-0000-C000-000000000046} properties
var kOccurrencePropertyNames = {
common: [
  "item:ParentFolderId",
  "item:ItemClass",
  "item:Subject",
  "item:Sensitivity",
  "item:Attachments",
  "item:DateTimeCreated",
  "item:Body",
  "item:Categories",
  "item:Importance",
  "item:HasAttachments",
  "item:Culture",
  "calendar:UID",
  "calendar:RecurrenceId",
  "calendar:Start",
  "calendar:End",
  "calendar:IsAllDayEvent",
  "calendar:LegacyFreeBusyStatus",
  "calendar:IsCancelled",
  "calendar:IsRecurring",
  "calendar:Location",
  "calendar:Organizer",
  "calendar:CalendarItemType",
  "calendar:Duration",
  "calendar:Recurrence",
  "calendar:ModifiedOccurrences",
  "calendar:DeletedOccurrences",
  ],
  "2007sp1": ["calendar:MeetingTimeZone",],
  "2010sp1": ["calendar:StartTimeZone",
              "calendar:EndTimeZone"],
};

// generic item properties
var kItemPropertyNames = {
common: [
  "item:ParentFolderId",
  "item:DateTimeCreated",
  "item:DateTimeReceived",
  "item:DisplayTo",
  "item:DisplayCc",
  "item:Categories",
  "item:Subject",
  "item:Size",
  "item:ItemClass",
  "item:Culture",
  "item:InReplyTo",
  "item:Importance",
  "item:Attachments",
  "item:HasAttachments",
  ],
  "2007sp1": [],
  "2010sp1": [],
};

// standard class IPM.Post properties
var kPostItemPropertyNames = {
common: [
  "item:ParentFolderId",
  "item:DateTimeCreated",
  "item:DateTimeReceived",
  "item:DisplayTo",
  "item:DisplayCc",
  "item:Categories",
  "item:Subject",
  "item:Size",
  "item:ItemClass",
  "item:Culture",
  "item:InReplyTo",
  "item:Importance",
  "item:Attachments",
  "item:HasAttachments",
  "message:Sender",
  "message:IsRead",
  "message:InternetMessageId",
  "message:From",
  "message:References",
  ],
  "2007sp1": [],
  "2010sp1": [],
};

// standard class IPM.Contact properties
// Note that contact photo is an EWS 2010 feature, but I am using 2007SP1
var kContactPropertyNames = {
common: [
  "item:ParentFolderId",
  "item:Categories",
  "item:Culture",
  "item:DateTimeCreated",
  "item:Attachments",
  "item:HasAttachments",
  "item:Body",
  "item:ItemClass",
  "contacts:FileAs",
  "contacts:CompanyName",
  "contacts:GivenName",
  "contacts:DisplayName",
  "contacts:MiddleName",
  "contacts:Surname",
  "contacts:Nickname",
  "contacts:SpouseName",
  "contacts:JobTitle",
  "contacts:Birthday",
  "contacts:BusinessHomePage",
  "contacts:Department",
  "contacts:EmailAddress/EmailAddress1",
  "contacts:EmailAddress/EmailAddress2",
  "contacts:EmailAddress/EmailAddress3",
  "contacts:PhysicalAddress:Street/Business",
  "contacts:PhysicalAddress:City/Business",
  "contacts:PhysicalAddress:State/Business",
  "contacts:PhysicalAddress:CountryOrRegion/Business",
  "contacts:PhysicalAddress:PostalCode/Business",
  "contacts:PhysicalAddress:Street/Home",
  "contacts:PhysicalAddress:City/Home",
  "contacts:PhysicalAddress:State/Home",
  "contacts:PhysicalAddress:CountryOrRegion/Home",
  "contacts:PhysicalAddress:PostalCode/Home",
  "contacts:PhoneNumber/HomePhone",
  "contacts:PhoneNumber/HomeFax",
  "contacts:PhoneNumber/BusinessPhone",
  "contacts:PhoneNumber/BusinessFax",
  "contacts:PhoneNumber/Pager",
  "contacts:PhoneNumber/MobilePhone",
  "contacts:PhoneNumber/CarPhone",
  "contacts:ImAddress/ImAddress1",
  ],
  "2007sp1": [],
  "2010sp1": [],
};

var kDistListPropertyNames = {
common: [
  "item:ParentFolderId",
  "item:Categories",
  "item:Culture",
  "item:Attachments",
  "item:HasAttachments",
  "item:Body",
  "item:ItemClass",
  "contacts:DisplayName",
  ],
  "2007sp1": [],
  "2010sp1": [],
};

// meeting item properties
var kMeetingMessagePropertyNames = {
common: [
  "item:ParentFolderId",
  "item:ItemClass",
  "item:Attachments",
  "item:MimeContent",
  "item:Subject",
  "item:DateTimeReceived",
  "item:Size",
  "item:Categories",
  "item:HasAttachments",
  "item:Importance",
  "item:InReplyTo",
  "item:InternetMessageHeaders",
  "item:DateTimeCreated",
  "item:Body",
  "item:DisplayTo",
  "item:DisplayCc",
  "item:Culture",
  "item:ExtendedProperty:0x1081/Integer", // PR_LAST_VERB_EXECUTED
  "item:ExtendedProperty:0x1090/Integer", // PR_FLAG_STATUS
  "item:ExtendedProperty:0x1095/Integer", // PR_FOLLOWUP_ICON
  "item:ExtendedProperty:0x0E2B/Integer", // PR_TODO_ITEM_FLAGS
  "message:Sender",
  "message:IsRead",
  "message:InternetMessageId",
  "message:From",
  "message:References",
  "message:ToRecipients",
  "message:CcRecipients",
  "message:BccRecipients",
  "message:ReplyTo",
  "meeting:AssociatedCalendarItemId",
  "meeting:IsOutOfDate",
  "meeting:ResponseType",
  "calendar:UID",
  ],
  "2007sp1": [],
  "2010sp1": [],
};


// meeting item properties
var kMeetingRequestPropertyNames = {
common: [
  "item:ParentFolderId",
  "item:ItemClass",
  "item:Attachments",
  "item:MimeContent",
  "item:Subject",
  "item:DateTimeReceived",
  "item:Size",
  "item:Categories",
  "item:HasAttachments",
  "item:Importance",
  "item:InReplyTo",
  "item:InternetMessageHeaders",
  "item:DateTimeCreated",
  "item:Body",
  "item:DisplayTo",
  "item:DisplayCc",
  "item:Culture",
  "item:ExtendedProperty:0x1081/Integer", // PR_LAST_VERB_EXECUTED
  "item:ExtendedProperty:0x1090/Integer", // PR_FLAG_STATUS
  "item:ExtendedProperty:0x1095/Integer", // PR_FOLLOWUP_ICON
  "item:ExtendedProperty:0x0E2B/Integer", // PR_TODO_ITEM_FLAGS
  "message:Sender",
  "message:IsRead",
  "message:InternetMessageId",
  "message:From",
  "message:References",
  "message:ToRecipients",
  "message:CcRecipients",
  "message:BccRecipients",
  "message:ReplyTo",
  "meeting:AssociatedCalendarItemId",
  "meeting:IsOutOfDate",
  "meeting:ResponseType",
  "calendar:UID",
  "calendar:Start",
  "calendar:End",
  "calendar:IsAllDayEvent",
  "calendar:Location",
  "calendar:When",
  "calendar:IsMeeting",
  "calendar:IsCancelled",
  "calendar:CalendarItemType",
  "calendar:Organizer",
  ],
  "2007sp1": ["calendar:MeetingTimeZone",],
  "2010sp1": ["calendar:StartTimeZone",
              "calendar:EndTimeZone"],
};

// Map from folder type to property names
var kPropertyNamesMap = {
  Note: kNotePropertyNames,
  Appointment: kAppointmentPropertyNames,
  Occurrence: kOccurrencePropertyNames,
  Item: kItemPropertyNames,
  Post: kPostItemPropertyNames,
  Contact: kContactPropertyNames,
  DistList: kDistListPropertyNames,
  MeetingRequest: kMeetingRequestPropertyNames,
  MeetingMessage: kMeetingMessagePropertyNames,
}

// Map from folder type to hasBodyProperty
var kHasBodyPropertyMap = {
  Note: false,
  Appointment: true,
  Occurrence: true,
  Item: false,
  Post: false,
  Contact: true,
  DistList: true,
}

function EwsNativeFolder()
{
  this._folderId = "";
  this._distinguishedFolderId = "";
  this._parentFolderId = "";
  this._displayName = "";
  this._unreadCount = 0;
  this._totalCount = 0;
  this._childFolderCount = 0;
  this._folderClass = "";
  this._searchParameters = "";
  this._managedFolderInformation = "";
  this._changeKey = "";
  this._syncState = "";
  this._verifiedOnline = false;
  this._syncItemsPending = false;
  this._subfolderIds = null;
  this._mailboxURI = "";
  this._newItems = null;
  this._folderURI = "";
  this._hidden = false;
}

EwsNativeFolder.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },

  // Used to identify this as an EwsNativeFolder
  get EwsNativeFolder() {
    return this;
  },

  // because of caching, only the owning msqEwsNativeMailbox should set
  // the folderId of a native folder
  // attribute AString folderId;
  get folderId() { return this._folderId;},
  set folderId(a) {
    //log.config('setting native folderId');
    this._folderId = a;
    if (this.mailbox)
      this.mailbox.ensureCached(this);
    else
      log.warning('mailbox not found');
  },

  //attribute AString distinguishedFolderId;
  get distinguishedFolderId() { return this._distinguishedFolderId;},
  set distinguishedFolderId(a) {
    this._distinguishedFolderId = a;
    if (this.mailbox)
      this.mailbox.ensureCached(this);
    else
      log.warning('mailbox not found');
  },

  //attribute AString parentFolderId;
  get parentFolderId() { return this._parentFolderId;},
  set parentFolderId(a) { this._parentFolderId = a;},

  //attribute AString displayName;
  get displayName() { return this._displayName;},
  set displayName(a) { this._displayName = a;},

  //attribute long unreadCount;
  get unreadCount() { return this._unreadCount;},
  set unreadCount(a) { this._unreadCount = a;},

  //attribute long totalCount;
  get totalCount() { return this._totalCount;},
  set totalCount(a) { this._totalCount = a;},

  //attribute long childFolderCount;
  get childFolderCount() { return this._childFolderCount;},
  set childFolderCount(a) { this._childFolderCount = a;},

  //attribute AString folderClass;
  get folderClass() { return this._folderClass;},
  set folderClass(a) { this._folderClass = a;},

  //attribute AString searchParameters;
  get searchParameters() { return this._searchParameters;},
  set searchParameters(a) { this._searchParameters = a;},

  //attribute AString managedFolderInformation;
  get managedFolderInformation() { return this._managedFolderInformation;},
  set managedFolderInformation(a) { this._managedFolderInformation = a;},

  //attribute AString changeKey;
  get changeKey() { return this._changeKey;},
  set changeKey(a) { this._changeKey = a;},

  //attribute AString syncState;
  get syncState() { return this._syncState || "";},
  set syncState(a) { this._syncState = a || "";},

  /// This is set when an online soap request confirms that this folder exists
  //attribute boolean verifiedOnline;
  get verifiedOnline() { return this._verifiedOnline;},
  set verifiedOnline(a) { this._verifiedOnline = a;},

  // did the last sync still have items remaining?
  //attribute boolean syncItemsPending;
  get syncItemsPending() { return this._syncItemsPending;},
  set syncItemsPending(a) { this._syncItemsPending = a;},

  //readonly attribute StringArray subfolderIds;
  get subfolderIds() {
    if (!this._subfolderIds)
      this._subfolderIds = new StringArray();
    return this._subfolderIds;
  },

  // Is this folder a subfolder of deleteditems?
  //readonly attribute boolean isDeleted;
  get isDeleted() {
    if (this.parentFolderId && this.parentFolderId.length) {
      let parentFolder = this.mailbox.getNativeFolderFromCache(this.parentFolderId);
      if (!parentFolder)
        return false;
      if (parentFolder.distinguishedFolderId == "deleteditems")
        return true;
      return parentFolder.isDeleted;
    }
    return false;
  },

  //attribute EwsNativeMailbox mailbox;
  get mailbox() {
    let nativeService = new EwsNativeService();
    // to prevent leaks, don't store this locally. Instead, lookup
    return nativeService.getNativeMailbox(this._mailboxURI);
  },
  set mailbox(a) { this._mailboxURI = a.serverURI;},

  // This array of EwsNativeItem objects are new items in the folder from a copy,
  //  that have not been persisted, and do not match the sync state
  //attribute nsIMutableArray newItems;
  get newItems() {
    if (!this._newItems)
      this._newItems = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    return this._newItems;
  },
  set newItems(a) { this._newItems = a;},

  /// folderURI provides the glue to the local folder
  //attribute AUTF8String folderURI;
  get folderURI() { return this._folderURI;},
  set folderURI(a) { this._folderURI = a;},

  get hidden() { return this._hidden;},
  set hidden(a) { this._hidden = a;},

  /**
   * Get property names of an item. This is dependent on the
   * IPM class of the object, and the serverVersion of the
   * mailbox.
   */
  //StringArray getItemPropertyNames(in AString ipmClass);
  getItemPropertyNames: function _getItemPropertyNames(aIpmClass) {
    let xaNames = new StringArray();
    let jaNames = kPropertyNamesMap[getItemStandardClass(aIpmClass)];
    for (let name of jaNames.common)
      xaNames.append(name);

    // version-specific properties
    let versionAdds = jaNames[this.mailbox.serverVersion];
    if (versionAdds) {
      for (let name of versionAdds)
        xaNames.append(name);
    }

    return xaNames;
  },

  itemHasBodyProperty: function _itemHasBodyProperty(aIpmClass) {
    let result = false;
    try {
      result = kHasBodyPropertyMap[getItemStandardClass(aIpmClass)];
    }
    catch (e) {
      log.warning("error in itemHasBodyProperty class=<" + aIpmClass + "> : " + e);
    }
    finally {
      return result;
    }
  },

  /// get an item by id
  //EwsNativeItem getItem(in AString aItemId);
  getItem: function _getItem(aItemId) {
    return this.mailbox.getItem(aItemId);
  },

  /// create an item (deprecated, use the mailbox method instead)
  //EwsNativeItem createItem(in AString aItemId, in AString aItemClass);
  createItem: function _createItem(aItemId, aItemClass) {
    return this.mailbox.createItem(aItemId, aItemClass, this);
  },

  getSubfolderNamed: function _getSubfolderNamed(aName) {
    let mailbox = this.mailbox;
    let foundFolder = null;
    for (let i = 0; i < (this._subfolderIds ? this._subfolderIds.length : 0); i++) {
      let subFolder = mailbox.getNativeFolder(this._subfolderIds.getAt(i));
      if (subFolder.displayName == aName) {
        foundFolder = subFolder;
        break;
      }
    }
    return foundFolder;
  },

};

  // helper functions
function getItemStandardClass(aIpmClass) {
  let standardClass = "Item";
  if (/^IPM\.Note/.test(aIpmClass) ||
      /^REPORT\.IPM\.Note/.test(aIpmClass))
    standardClass = "Note";
  else if (/^IPM\.Contact/.test(aIpmClass))
    standardClass = "Contact";
  else if (/^IPM\.DistList/.test(aIpmClass))
    standardClass = "DistList";
  else if (/^IPM\.Appointment/.test(aIpmClass))
    standardClass = "Appointment";
  else if (/^IPM\.OLE\.CLASS\.\{00061055-0000-0000-C000-000000000046\}/.test(aIpmClass))
    standardClass = "Occurrence";
  else if (/^IPM\.Post/.test(aIpmClass))
    standardClass = "Post";
  else if(/^IPM\.Schedule\.Meeting\.Request/.test(aIpmClass))
    standardClass = "MeetingRequest";
  else if(/^IPM\.Schedule\.Meeting\.Notification/.test(aIpmClass))
    standardClass = "Note";
  else if(/^IPM\.Schedule\.Meeting/.test(aIpmClass))
    standardClass = "MeetingMessage";
  return standardClass;
}
