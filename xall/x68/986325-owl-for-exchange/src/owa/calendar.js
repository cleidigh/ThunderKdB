/// OWA does its own translation on FieldURI values.
/// This means that the FieldURI is the same as the property name
/// (with exceptions for FreeBusyType and EnhancedLocation)
/// where EWS would normally want a prefix of "item:" or "calendar:".
/// Task-specific items (which EWS would normally prefix with "task:")
/// are instead prefixed with "Task".
OWAAccount.kFieldMap = {
  Subject: "",
  Body: "",
  Sensitivity: "",
  Categories: "",
  IsAllDayEvent: "",
  StartTimeZone: "",
  Start: "",
  EndTimeZone: "",
  End: "",
  FreeBusyType: "LegacyFreeBusyStatus",
  Importance: "",
  ReminderDueBy: "",
  ReminderIsSet: "",
  ReminderMinutesBeforeStart: "",
  Location: "EnhancedLocation",
  Recurrence: "",
  RequiredAttendees: "",
  OptionalAttendees: "",
  UID: "",
  DueDate: "TaskDueDate",
  CompleteDate: "TaskCompleteDate",
  PercentComplete: "TaskPercentComplete",
  StartDate: "TaskStartDate",
};

/// Converts Lightning participation status into OWA response values.
OWAAccount.kResponseMap = {
  DECLINED: "Decline",
  TENTATIVE: "Tentative",
  ACCEPTED: "Accept",
};

/**
 * Synchronise calendar or task items from Exchange.
 *
 * @param aDelegate  {String}         The other user whose folder to sync
 * @param aFolder    {String}         The distinguished folder id to sync
 * @param aSyncState {String}         The previous sync state (empty if none)
 * @returns          {Object}         Details on the found changes
 *   events          {Array[Object]}  A list of new or changed items
 *   deletions       {Array[String]?} A list of deleted item ids
 *   syncState       {String}         The state to use on the next call
 *   done            {Boolean}        False if there are more changes waiting
 */
OWAAccount.prototype.SyncEvents = async function(aDelegate, aFolder, aSyncState) {
  const kFirstSync = 1000; // very first sync, always request 1000
  const kSyncPeek = 5;     // resync, try just 5 to start with
  const kSyncMore = 1000;  // resync, after first peek wasn't enough
  let initialLoad = true;
  let resultPage = 0;
  let lastModifiedTime = "";
  try {
    if (aSyncState) {
      ({ initialLoad, resultPage, lastModifiedTime } = JSON.parse(aSyncState));
    }
  } catch (ex) {
    // old-style sync state
    if (aSyncState.length < 20) {
      resultPage = Number(aSyncState);
    } else {
      lastModifiedTime = aSyncState;
      initialLoad = false;
    }
  }
  let continueSync = false;
  let query = {
    __type: "FindItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "FindItemRequest:#Exchange",
      ItemShape: {
        __type: "ItemResponseShape:#Exchange",
        BaseShape: "IdOnly",
        AdditionalProperties: [{
          __type: "PropertyUri:#Exchange",
          FieldURI: "item:LastModifiedTime",
        }],
      },
      ParentFolderIds: [{
        __type: "DistinguishedFolderId:#Exchange",
        Id: aFolder,
      }],
      Traversal: "Shallow",
      Paging: {
        __type: "IndexedPageView:#Exchange",
        BasePoint: "Beginning",
        Offset: resultPage,
        MaxEntriesReturned: kFirstSync,
      },
      ViewFilter: "All",
      IsWarmUpSearch: false,
      FocusedViewFilter: -1,
      Grouping: null,
      SortOrder: [{
        __type: "SortResults:#Exchange",
        Order: "Ascending",
        Path: {
          __type: "PropertyUri:#Exchange",
          FieldURI: "item:LastModifiedTime",
        },
      }],
    },
  };
  if (aDelegate) {
    query.Body.ParentFolderIds[0].Mailbox = {
      EmailAddress: aDelegate,
    };
  }
  let items = [];
  if (initialLoad) {
    // Use the sync state to break the download up into individual pages.
    let response = await this.CallService("FindItem", query); // owa.js
    items = response.RootFolder.Items;
    if (items.length) {
      resultPage = response.RootFolder.IndexedPagingOffset;
      if (resultPage == response.RootFolder.TotalItemsInView) {
        // We finished the download, so switch to updating by date.
        initialLoad = false;
        resultPage = 0;
        lastModifiedTime = items[items.length - 1].LastModifiedTime;
      } else {
        // Let the caller know that there are more items waiting.
        // We can do this because the items are in ascending date,
        // so we haven't reached the newest item yet.
        continueSync = true;
      }
    }
  } else {
    // We can't add a date filter to our query, so we just have to
    // work through by descending order of last modified until we
    // find an item older than we last checked i.e. the sync state.
    query.Body.SortOrder[0].Order = "Descending";
    query.Body.Paging.MaxEntriesReturned = kSyncPeek;
    while (true) {
      let response = await this.CallService("FindItem", query);
      if (!response.RootFolder.Items.length) {
        break;
      }
      let oldIndex = response.RootFolder.Items.findIndex(item => item.LastModifiedTime < lastModifiedTime);
      if (oldIndex >= 0) {
        items = items.concat(response.RootFolder.Items.slice(0, oldIndex));
        break;
      }
      items = items.concat(response.RootFolder.Items);
      query.Body.Paging.Offset = response.RootFolder.IndexedPagingOffset;
      query.Body.Paging.MaxEntriesReturned = kSyncMore;
    }
    if (items.length) {
      lastModifiedTime = items[0].LastModifiedTime;
    }
  }
  if (items.length) {
    // Note: Not using GetCalendarEvent because it won't give us some fields
    // we use: ReminderDueBy TextBody ModifiedOccurrences DeletedOccurrences
    // DateTimeStamp StartTimeZone EndTimeZone
    let fetch = {
      __type: "GetItemJsonRequest:#Exchange",
      Header: {
        __type: "JsonRequestHeaders:#Exchange",
        RequestServerVersion: "Exchange2013",
      },
      Body: {
        __type: "GetItemRequest:#Exchange",
        ItemShape: {
          __type: "ItemResponseShape:#Exchange",
          BaseShape: "Default",
          AdditionalProperties: [{
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:Categories",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:Importance",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:DateTimeCreated",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:Sensitivity",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:ReminderIsSet",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:ReminderDueBy",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:ReminderMinutesBeforeStart",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:LastModifiedTime",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:DateTimeReceived",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "item:TextBody",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:IsAllDayEvent",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:IsCancelled",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:RequiredAttendees",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:OptionalAttendees",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:Recurrence",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:ModifiedOccurrences",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:DeletedOccurrences",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:UID",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:RecurrenceId",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:DateTimeStamp",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:StartTimeZone",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:EndTimeZone",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:EnhancedLocation",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "task:CompleteDate",
          }, {
            __type: "PropertyUri:#Exchange",
            FieldURI: "task:Recurrence",
          }],
        },
        ItemIds: items.map(item => ({
          __type: "ItemId:#Exchange",
          Id: item.ItemId.Id,
        })),
      },
    };
    let result = await this.CallService("GetItem", fetch); // owa.js
    items = result.ResponseMessages ? result.ResponseMessages.Items.map(item => item.Items[0]) : result.Items;
    for (let item of items) {
      if (item.ModifiedOccurrences) {
        fetch.Body.ItemIds = item.ModifiedOccurrences.map(item => ({
          __type: "ItemId:#Exchange",
          Id: item.ItemId.Id,
        }));
        let result = await this.CallService("GetItem", fetch); // owa.js
        item.ModifiedOccurrences = result.ResponseMessages ? result.ResponseMessages.Items.map(item => item.Items[0]) : result.Items;
      }
    }
  }
  return {
    events: items.map(OWAAccount.ConvertEvent),
    deletions: initialLoad ? [] : null,
    syncState: JSON.stringify({ initialLoad, resultPage, lastModifiedTime }),
    done: !continueSync,
  };
}

/**
 * Find items that have been deleted on the server.
 *
 * @param aItemIds   {Array[String]} The event ids to check
 * @returns          {Array[String]} The deleted ids
 */
OWAAccount.prototype.FindDeleted = async function(aItemIds) {
  let fetch = {
    __type: "GetItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "GetItemRequest:#Exchange",
      ItemShape: {
        __type: "ItemResponseShape:#Exchange",
        BaseShape: "IdOnly",
      },
      ItemIds: aItemIds.map(itemid => ({
        __type: "ItemId:#Exchange",
        Id: itemid,
      })),
    },
  };
  try {
    let result = await this.CallService("GetItem", fetch); // owa.js
    if (!result.ResponseMessages) {
      // This was a single item and it succeeded.
      return [];
    }
    for (let item of result.ResponseMessages.Items) {
      if (item.ResponseClass == "Success") {
        aItemIds.splice(aItemIds.indexOf(item.Items[0].ItemId.Id), 1);
      }
    }
  } catch (ex) {
    // Don't throw if this was a deletion of a single item; we expect that.
    if (aItemIds.length > 1 || ex.type != "ErrorItemNotFound") {
      throw ex;
    }
  }
  return aItemIds;
}

/**
 * Convert an Exchange calendar or task item to an intermediate JSON format.
 * Exceptions to recurring tasks are converted recursively.
 *
 * @param aEvent {Object} The calendar or task item in OWA format.
 * @returns      {Object}
 *
 * Note: This is a static method.
 */
OWAAccount.ConvertEvent = function(aEvent) {
  return {
    uid: aEvent.UID || aEvent.ItemId.Id,
    itemid: aEvent.ItemId.Id,
    title: aEvent.Subject,
    startDate: aEvent.Start || aEvent.StartDate || aEvent.Recurrence && aEvent.Recurrence.EndDateRecurrence && aEvent.Recurrence.EndDateRecurrence.StartDate.slice(0, 10),
    startTimeZone: OWAAccount.ExtractTimezone(aEvent.StartTimeZone || {}),
    endDate: aEvent.End,
    endTimeZone: OWAAccount.ExtractTimezone(aEvent.EndTimeZone || aEvent.StartTimeZone || {}),
    isAllDayEvent: aEvent.IsAllDayEvent,
    isCancelled: aEvent.IsCancelled,
    creationDate: aEvent.DateTimeCreated,
    lastModifiedTime: aEvent.LastModifiedTime,
    dueDate: aEvent.DueDate,
    completedDate: aEvent.CompleteDate,
    percentComplete: aEvent.PercentComplete,
    stampTime: aEvent.DateTimeStamp,
    priority: aEvent.Importance == "High" ? 1 : aEvent.Importance == "Low" ? 9 : 5,
    privacy: kPrivacyMap[aEvent.Sensitivity] || "unset",
    status: kStatusMap[aEvent.FreeBusyType] || "unset",
    reminder: aEvent.ReminderIsSet ? aEvent.ReminderMinutesBeforeStart * -60 : null,
    location: aEvent.Location && aEvent.Location.DisplayName,
    categories: aEvent.Categories || [],
    description: aEvent.TextBody && aEvent.TextBody.Value,
    recurrenceId: aEvent.RecurrenceId,
    recurrence: OWAAccount.ConvertRecurrence(aEvent.Recurrence),
    deletions: aEvent.DeletedOccurrences ? aEvent.DeletedOccurrences.map(occurrence => occurrence.Start) : [],
    modifications: aEvent.ModifiedOccurrences ? aEvent.ModifiedOccurrences.map(OWAAccount.ConvertEvent) : [],
    organizer: aEvent.Organizer && aEvent.Organizer.Mailbox && EWS2MailboxObject(aEvent.Organizer.Mailbox),
    requiredAttendees: aEvent.RequiredAttendees ? aEvent.RequiredAttendees.map(OWAAccount.ConvertAttendee) : [],
    optionalAttendees: aEvent.OptionalAttendees ? aEvent.OptionalAttendees.map(OWAAccount.ConvertAttendee) : [],
  };
}

/**
 * Get the time zone from an OWA time zone object.
 *
 * @param aTimezone {Object}
 *          Id      {String} The time zone id
 *          Name    {String} The time zone name
 *
 * For some reason Exchange sometimes uses the Id and sometimes the Name...
 */
OWAAccount.ExtractTimezone = function(aTimezone) {
  return aTimezone.Id || aTimezone.Name;
}

/**
 * Convert Exchange recurrence data to an intermediate JSON format.
 *
 * @param aRecurrence {Object} The OWA recurrence data.
 * @returns           {Object}
 *
 * Note: This is a static method.
 */
OWAAccount.ConvertRecurrence = function(aRecurrence) {
  if (!aRecurrence) {
    return null;
  }
  // OWA recurrence dates use a custom format (date + timezone).
  // We only need the date, which is the first 10 characters.
  let pattern = aRecurrence.RecurrencePattern;
  return {
    count: aRecurrence.RecurrenceRange.NumberOfOccurrences || 0,
    until: aRecurrence.RecurrenceRange.EndDate && aRecurrence.RecurrenceRange.EndDate.slice(0, 10),
    type: pattern.__type.startsWith("Daily") ? "DAILY" : pattern.__type.startsWith("Weekly") ? "WEEKLY" : pattern.Month ? "YEARLY" : "MONTHLY",
    // RelativeYearly, RelativeMonthly, Weekly
    daysOfWeek: pattern.DaysOfWeek ? pattern.DaysOfWeek.split(" ").map(day => kDays.indexOf(day) + 1) : null,
    // RelativeYearly, RelativeMonthly
    weekOfMonth: kWeeks.indexOf(pattern.DayOfWeekIndex) + 1,
    // AbsoluteYearly, AbsoluteMonthly
    dayOfMonth: pattern.DayOfMonth || 0,
    // RelativeYearly, AbsoluteYearly
    monthOfYear: kMonths.indexOf(pattern.Month) + 1,
    // RelativeMonthly, AbsoluteMonthly, Weekly, Daily
    // Default to 1 in case this is a yearly recurrence.
    interval: pattern.Interval || 1,
  };
}

/**
 * Convert Exchange attendee data to an intermediate JSON format.
 *
 * @param aRecurrence {Object} The OWA attendee data.
 * @returns           {Object}
 *
 * Note: This is a static method.
 */
OWAAccount.ConvertAttendee = function(aAttendee) {
  let attendee = EWS2MailboxObject(aAttendee.Mailbox);
  attendee.participation = kParticipationMap[aAttendee.ResponseType];
  return attendee;
}

/**
 * Convert a calendar event or task to an OWA object.
 *
 * @param aEvent {Object} The calendar event or task in Owl format.
 * @returns      {Object} The item in OWA format.
 */
OWAAccount.ConvertToOWA = function(aFolder, aEvent) {
  let recurrence;
  if (aEvent.recurrence) {
    recurrence = {
      __type: "RecurrenceType:#Exchange",
    };
    let recurrenceType = aEvent.recurrence.type[0] + aEvent.recurrence.type.slice(1).toLowerCase();
    if (recurrenceType == "Yearly") {
      delete aEvent.recurrence.interval;
    }
    if (recurrenceType == "Yearly" || recurrenceType == "Monthly") {
      recurrenceType = (aEvent.recurrence.dayOfMonth ? "Absolute" : "Relative") + recurrenceType;
    }
    recurrence.RecurrencePattern = {
      "__type": recurrenceType + "Recurrence:#Exchange",
      Interval: aEvent.recurrence.interval,
      DaysOfWeek: aEvent.recurrence.daysOfWeek && aEvent.recurrence.daysOfWeek.map(day => kDays[day - 1]).join(" "),
      FirstDayOfWeek: kDays[aEvent.recurrence.firstDayOfWeek - 1],
      DayOfWeekIndex: kWeeks[aEvent.recurrence.weekOfMonth - 1],
      DayOfMonth: aEvent.recurrence.dayOfMonth,
      Month: kMonths[aEvent.recurrence.monthOfYear - 1],
    };
    if (aEvent.recurrence.count) {
      recurrence.RecurrenceRange = {
        __type: "NumberedRecurrence:#Exchange",
        StartDate: aEvent.recurrence.from || aEvent.startDate.slice(0, 10),
        NumberOfOccurrences: aEvent.recurrence.count,
      };
    } else if (aEvent.recurrence.until) {
      recurrence.RecurrenceRange = {
        __type: "EndDateRecurrence:#Exchange",
        StartDate: aEvent.recurrence.from || aEvent.startDate.slice(0, 10),
        EndDate: aEvent.recurrence.until,
      };
    } else {
      recurrence.RecurrenceRange = {
        __type: "NoEndRecurrence:#Exchange",
        StartDate: aEvent.recurrence.from || aEvent.startDate.slice(0, 10),
      };
    }
  }
  if (aFolder == "tasks") {
    return {
      __type: "Task:#Exchange",
      Subject: aEvent.title,
      Body: {
        __type: "BodyContentType:#Exchange",
        BodyType: "Text",
        Value: aEvent.description,
      },
      Sensitivity: aEvent.privacy == "CONFIDENTIAL" ? "Confidential" : aEvent.privacy == "PRIVATE" ? "Private" : "Normal",
      Categories: aEvent.categories,
      Importance: aEvent.priority && aEvent.priority < 5 ? "Low" : aEvent.priority > 5 ? "High" : "Normal",
      ReminderIsSet: aEvent.reminder != null,
      ReminderMinutesBeforeStart: aEvent.reminder / -60 | 0,
      CompleteDate: aEvent.completedDate,
      DueDate: aEvent.dueDate,
      PercentComplete: aEvent.percentComplete,
      Recurrence: recurrence,
      StartDate: aEvent.startDate,
    };
  }
  return {
    __type: "CalendarItem:#Exchange",
    Subject: aEvent.title,
    Body: {
      __type: "BodyContentType:#Exchange",
      BodyType: "Text",
      Value: aEvent.description,
    },
    Sensitivity: aEvent.privacy == "CONFIDENTIAL" ? "Confidential" : aEvent.privacy == "PRIVATE" ? "Private" : "Normal",
    Categories: aEvent.categories,
    Importance: aEvent.priority && aEvent.priority < 5 ? "Low" : aEvent.priority > 5 ? "High" : "Normal",
    ReminderIsSet: aEvent.reminder != null,
    ReminderMinutesBeforeStart: aEvent.reminder / -60 | 0,
    UID: aEvent.uid,
    // DateTimeStamp?
    IsAllDayEvent: aEvent.isAllDayEvent,
    Start: aEvent.startDate,
    End: aEvent.endDate,
    FreeBusyType: aEvent.status == "OPAQUE" ? "Busy" : "Free",
    RequiredAttendees: aEvent.requiredAttendees.map(attendee => ({
      __type: "AttendeeType:#Exchange",
      Mailbox: MailboxObject2OWA(attendee),
    })),
    OptionalAttendees: aEvent.optionalAttendees.map(attendee => ({
      __type: "AttendeeType:#Exchange",
      Mailbox: MailboxObject2OWA(attendee),
    })),
    Recurrence: recurrence,
    Location: {
      __type: "EnhancedLocation:#Exchange",
      DisplayName: aEvent.location,
      PostalAddress: {
        __type: "PersonaPostalAddress:#Exchange",
        Type: "Business",
        LocationSource: "None",
      },
    },
    StartTimeZone: {
      __type: "TimeZoneDefinitionType:#Exchange",
      Id: kTimeZoneMap[aEvent.startTimeZone] || aEvent.startTimeZone,
    },
    EndTimeZone: {
      __type: "TimeZoneDefinitionType:#Exchange",
      Id: kTimeZoneMap[aEvent.endTimeZone] || aEvent.endTimeZone,
    }
  };
}

/**
 * Create a calendar item
 *
 * @param aFolder {String} The distinguished folder id
 * @param aEvent  {Object} The item to create
 * @returns       {Object}
 *   uid    {String} The new item's UID
 *   itemid {String} The id of the new item
 */
OWAAccount.prototype.CreateEvent = async function(aFolder, aEvent, aNotify) {
  let invitation = await this.FindInvitationToRespond(aEvent);
  if (invitation) {
    return invitation;
  }
  let create = {
    __type: "CreateItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
      TimeZoneContext: {
        __type: "TimeZoneContext:#Exchange",
        TimeZoneDefinition: {
          __type: "TimeZoneDefinitionType:#Exchange",
          Id: kTimeZoneMap[aEvent.startTimeZone] || "UTC",
        },
      },
    },
    Body: {
      __type: "CreateItemRequest:#Exchange",
      Items: [OWAAccount.ConvertToOWA(aFolder, aEvent)],
      SavedItemFolderId: {
        __type: "TargetFolderId:#Exchange",
        BaseFolderId: {
          __type: "DistinguishedFolderId:#Exchange",
          Id: aFolder,
        },
      },
      SendMeetingInvitations: aNotify ? "SendToAllAndSaveCopy" : "SendToNone",
    },
  };
  let response = await this.CallService("CreateItem", create); // owa.js
  if (aFolder != "tasks") { // TODO make the type a property of the object
    // Need an extra server roundtrip to get the UID.
    let fetch = {
      __type: "GetItemJsonRequest:#Exchange",
      Header: {
        __type: "JsonRequestHeaders:#Exchange",
        RequestServerVersion: "Exchange2013",
      },
      Body: {
        __type: "GetItemRequest:#Exchange",
        ItemShape: {
          __type: "ItemResponseShape:#Exchange",
          BaseShape: "IdOnly",
          AdditionalProperties: [{
            __type: "PropertyUri:#Exchange",
            FieldURI: "calendar:UID",
          }],
        },
        ItemIds: [{
          __type: "ItemId:#Exchange",
          Id: response.Items[0].ItemId.Id,
        }],
      },
    };
    response = await this.CallService("GetItem", fetch); // owa.js
  }
  return {
    uid: response.Items[0].UID || response.Items[0].ItemId.Id,
    itemid: response.Items[0].ItemId.Id,
  };
}

/**
 * Look for an invitation for a given meeting, to avoid creating a duplicate.
 * This can happen if the event hasn't been synchronised yet.
 *
 * @param aEvent {Object}  The meeting
 * @returns      {Object?} The invitation
 */
OWAAccount.prototype.FindInvitationToRespond = async function(aEvent) {
  let responseTag = OWAAccount.kResponseMap[aEvent.participation];
  if (!responseTag) {
    return null;
  }
  let itemId = await browser.calendarProvider.getCurrentInvitation();
  if (!itemId) {
    return null;
  }
  let fetch = {
    __type: "GetItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "GetItemRequest:#Exchange",
      ItemShape: {
        __type: "ItemResponseShape:#Exchange",
        BaseShape: "IdOnly",
        AdditionalProperties: [{
          __type: "PropertyUri:#Exchange",
          FieldURI: "meeting:AssociatedCalendarItemId",
        }],
      },
      ItemIds: [{
        __type: "ItemId:#Exchange",
        Id: itemId,
      }],
    },
  };
  let result = await this.CallService("GetItem", fetch); // owa.js
  if (!result.Items || !result.Items[0].AssociatedCalendarItemId) {
    return null;
  }
  itemId = result.Items[0].AssociatedCalendarItemId.Id;
  fetch.Body.ItemIds[0].Id = itemId;
  fetch.Body.ItemShape.AdditionalProperties[0].FieldURI = "calendar:UID";
  result = await this.CallService("GetItem", fetch); // owa.js
  if (!result.Items || result.Items[0].UID != aEvent.uid) {
    return null;
  }
  await this.RespondToInvitation(itemId, responseTag, false);
  return {
    uid: aEvent.uid,
    itemid: itemId,
  };
}

/**
 * Update a calendar item
 *
 * @param aFolder   {String} The distinguished folder id
 * @param aNewEvent {Object} The new properties of the item
 * @param aOldEvent {Object} The old properties of the item
 *
 * This method is also used to delete recurrences of master recurring items.
 */
OWAAccount.prototype.UpdateEvent = async function(aFolder, aNewEvent, aOldEvent, aNotify) {
  let deletions = aNewEvent.deletions;
  if (deletions) {
    if (aOldEvent.deletions) {
      deletions = deletions.filter(deletion => !aOldEvent.deletions.includes(deletion));
    }
    if (deletions.length) {
      let request = {
        __type: "DeleteItemJsonRequest:#Exchange",
        Header: {
          __type: "JsonRequestHeaders:#Exchange",
          RequestServerVersion: "Exchange2013",
        },
        Body: {
          __type: "DeleteItemRequest:#Exchange",
          ItemIds: deletions.map(deletion => ({
            __type: "OccurrenceItemId:#Exchange",
            RecurringMasterId: aNewEvent.itemid,
            InstanceIndex: deletion,
          })),
          DeleteType: "MoveToDeletedItems",
          SendMeetingCancellations: aNotify ? "SendToAllAndSaveCopy" : "SendToNone",
          SuppressReadRecipts: true,
        },
      };
      try {
        await this.CallService("DeleteItem", request); // owa.js
      } catch (ex) {
        if (ex.type == "ErrorItemNotFound" ||
            ex.type == "ErrorCalendarOccurrenceIsDeletedFromRecurrence") {
          // Already deleted. Ignore.
        } else {
          throw ex;
        }
      }
      return;
    }
  }
  let newEvent = OWAAccount.ConvertToOWA(aFolder, aNewEvent);
  let oldEvent = OWAAccount.ConvertToOWA(aFolder, aOldEvent);
  // OWA ignores a time zone change unless we include the time as well.
  if (aNewEvent.startTimeZone != aOldEvent.startTimeZone) {
    delete oldEvent.Start;
  }
  if (aNewEvent.endTimeZone != aOldEvent.endTimeZone) {
    delete oldEvent.End;
  }
  let updates = [];
  for (let key in OWAAccount.kFieldMap) {
    if (JSON.stringify(newEvent[key]) != JSON.stringify(oldEvent[key])) {
      let field = {
        __type: newEvent[key] != null ? "SetItemField:#Exchange" : "DeleteItemField:#Exchange",
        Path: {
          __type: "PropertyUri:#Exchange",
          FieldURI: OWAAccount.kFieldMap[key] || key,
        },
      };
      if (newEvent[key] != null) {
        field.Item = {
          __type: newEvent.__type,
        };
        field.Item[key] = newEvent[key];
      }
      updates.push(field);
    }
  }
  let itemId = aNewEvent.index ? {
    __type: "OccurrenceItemId:#Exchange",
    RecurringMasterId: aNewEvent.itemid,
    InstanceIndex: aNewEvent.index,
  } : {
    __type: "ItemId:#Exchange",
    Id: aNewEvent.itemid,
  };
  let request = {
    __type: "UpdateItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
      TimeZoneContext: {
        __type: "TimeZoneContext:#Exchange",
        TimeZoneDefinition: {
          __type: "TimeZoneDefinitionType:#Exchange",
          Id: kTimeZoneMap[aNewEvent.startTimeZone] || "UTC",
        },
      },
    },
    Body: {
      __type: "UpdateItemRequest:#Exchange",
      ItemChanges: [{
        __type: "ItemChange:#Exchange",
        Updates: updates,
        ItemId: itemId,
      }],
      ConflictResolution: "AlwaysOverwrite",
      MessageDisposition: "SaveOnly",
      SendCalendarInvitationsOrCancellations: aNotify ? "SendToChangedAndSaveCopy" : "SendToNone",
      SuppressReadReceipts: true,
    },
  };
  let response = await this.CallService("UpdateItem", request); // owa.js
  let responseTag = OWAAccount.kResponseMap[aNewEvent.participation];
  if (responseTag) {
    // If this is a recurring instance, we have to notify because
    // Lightning won't tell us the original master recurrence later.
    let isRecurrence = aNewEvent.index > 0;
    await this.RespondToInvitation(response.Items[0].ItemId.Id, responseTag, isRecurrence);
  }
}

/**
 * Update the participation for an invitation
 *
 * @param aEventId      {String}  The id of the invitation to update
 * @param aIsRecurrence {Boolean} Whether this is a recurrence instance
 * @param aParticipaton {String}  The new participation status
 */
OWAAccount.prototype.NotifyParticipation = async function(aEventId, aParticipation, aIsRecurrence) {
  if (aIsRecurrence) {
    return; // We don't support this after the fact, due to Lightning weirdness.
  }
  let responseTag = OWAAccount.kResponseMap[aParticipation];
  if (!responseTag || responseTag == "Decline") {
    // We don't support this after the fact, because the item is already gone.
    return;
  }
  await this.RespondToInvitation(aEventId, responseTag, true);
}

/**
 * Respond to an invitation
 *
 * @param aEventId    {String}  The invitation to be responded to
 * @param aReponse    {String}  The response to be made
 * @param aSend       {Boolean} Whether to notify the organiser
 */
OWAAccount.prototype.RespondToInvitation = async function(aEventId, aResponse, aSend)
{
  if (aResponse == "Decline") {
    // We have to notify because we won't have a second chance.
    aSend = true;
  }
  let respond = {
    __type: "RespondToCalendarEventJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "RespondToCalendarEventRequest:#Exchange",
      EventId: {
        __type: "ItemId:#Exchange",
        Id: aEventId,
        // XXX is the ChangeKey needed here?
      },
      Response: aResponse,
      SendResponse: aSend,
    },
  };
  await this.CallService("RespondToCalendarEvent", respond); // owa.js
}

/**
 * Delete a calendar or task item
 *
 * @param aEventId {String} The id of the item to delete
 */
OWAAccount.prototype.DeleteEvent = async function(aEventId, aNotify) {
  let request = {
    __type: "DeleteItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "DeleteItemRequest:#Exchange",
      ItemIds: [{
        __type: "ItemId:#Exchange",
        Id: aEventId,
      }],
      DeleteType: "MoveToDeletedItems",
      SendMeetingCancellations: aNotify ? "SendToAllAndSaveCopy" : "SendToNone",
      AffectedTaskOccurrences: "AllOccurrences",
      SuppressReadRecipts: true,
    },
  };
  try {
    await this.CallService("DeleteItem", request); // owa.js
  } catch (ex) {
    if (ex.type == "ErrorItemNotFound") {
      // Already deleted. Ignore.
    } else {
      throw ex;
    }
  }
}

/**
 * Get free/busy status for a user.
 *
 * @param aAttendee {String} The user whose free/busy status to query.
 * @returns         {Array[Object]} An array of status intervals
 *   type  {Number} The type of interval (see calIFreeBusyInterval)
 *   start {String} The start of the interval, in UTC
 *   end   {String} The end of the interval, in UTC
 */
OWAAccount.prototype.GetFreeBusy = async function(aAttendee, aStartTime, aEndTime) {
  let query = {
    request: {
      __type: "GetUserAvailabilityInternalJsonRequest:#Exchange",
      Header: {
        __type: "JsonRequestHeaders:#Exchange",
        RequestServerVersion: "Exchange2013",
        TimeZoneContext: {
          __type: "TimeZoneContext:#Exchange",
          TimeZoneDefinition: {
            __type: "TimeZoneDefinitionType:#Exchange",
            Id: "UTC",
          },
        },
      },
      Body: {
        __type: "GetUserAvailabilityRequest:#Exchange",
        MailboxDataArray: [{
          __type: "MailboxData:#Exchange",
          Email: {
            __type: "EmailAddress:#Exchange",
            Address: aAttendee,
          },
        }],
        FreeBusyViewOptions: {
          __type: "FreeBusyViewOptions:#Exchange",
          TimeWindow: {
            __type: "Duration:#Exchange",
            StartTime: aStartTime,
            EndTime: aEndTime,
          },
          RequestedView: "FreeBusy",
        },
      },
    },
  };
  let response = await this.CallService("GetUserAvailabilityInternal", query); // owa.js
  if (!response.Responses[0].CalendarView.Items) {
    // No results, probably because the email address was not found.
    return [];
  }
  return response.Responses[0].CalendarView.Items.map(event => ({
    type: kBusyMap[event.FreeBusyType],
    // Free/Busy is a special snowflake and gives us Zulu local time, not UTC.
    start: event.Start + "Z",
    end: event.End + "Z",
  }));
}

/**
 * Listens for requests from the backend.
 *
 * This is the central function switchboard to allow callbacks from the
 * calendarProvider web experiement into our code.
 *
 * Called by calendar.js::Calendar::callExtension().
 *
 * @param aServerId   {String} The account's server key
 * @param aOperation  {String} The requested operation
 * @param aParameters {Object} Operation-specific parameters
 * @returns           {Any?}   Operation-dependent return value
 */
browser.calendarProvider.dispatcher.addListener(async function(aServerId, aOperation, aParameters) {
  try {
    await EnsureLicensed(); // licence.js
    let account = await gOWAAccounts.get(aServerId);
    switch (aOperation) {
    case "SyncEvents":
      return await account.SyncEvents(aParameters.delegate, aParameters.folder, aParameters.syncState);
    case "FindDeleted":
      return await account.FindDeleted(aParameters.itemids);
    case "CreateEvent":
      return await account.CreateEvent(aParameters.folder, aParameters.event, aParameters.notify);
    case "UpdateEvent":
      return await account.UpdateEvent(aParameters.folder, aParameters.newEvent, aParameters.oldEvent, aParameters.notify);
    case "NotifyParticipation":
      return await account.NotifyParticipation(aParameters.id, aParameters.participation, aParameters.isRecurrence);
    case "DeleteEvent":
      return await account.DeleteEvent(aParameters.id, aParameters.notify);
    case "GetFreeBusy":
      return await account.GetFreeBusy(aParameters.attendee, aParameters.start, aParameters.end);
    }
    throw new Error("Not Implemented");
  } catch (ex) {
    // serialise the exception properties, because only .message and .stack survive the boundary,
    // but we need all the Error properties, like code/type, parameters etc..
    // CallExtension() on the other side will de-serialise it again and reconstruct the object.
    throw serialiseError(ex); // owl.js
  }
}, "owl");
