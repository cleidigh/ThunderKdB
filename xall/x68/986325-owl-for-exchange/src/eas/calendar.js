const kHalfHour = 30 * 60 * 1000; // milliseconds
const kDeletionException = "1";
const kRequiredAttendee = "1";
const kOptionalAttendee = "2";

/// Lightning participation status corresponding to EAS response tags.
/// The array is offset by 1 so we have to add 1 to the result of `indexOf()`.
const kResponses = ["ACCEPTED", "TENTATIVE", "DECLINED"];

/// Converts EAS privacy values into Lightning privacy values.
const kPrivacies = ["PUBLIC",, "PRIVATE", "CONFIDENTIAL"];

/// Converts EAS status values into Lightning status values.
const kStatuses = ["TRANSPARENT", "OPAQUE", "OPAQUE", "OPAQUE", "OPAQUE"];

/// Converts EAS response type into Lightning participation type.
const kParticipations = [,, "TENTATIVE", "ACCEPTED", "DECLINED"];

/// Converts EAS Free/Busy status into Lightning status.
const kBusyValues = [1, 8, 2, 4, 0];

/// Converts EAS recurrence types into Lightning types.
const kRecurrenceTypes = ["DAILY", "WEEKLY", "MONTHLY", "MONTHLY",, "YEARLY", "YEARLY"];

/**
 * Synchronise calendar or task items from EAS.
 *
 * @param aFolder    {String}        The distinguished folder id to sync
 * @param aSyncState {String}        The previous sync state (empty if none)
 * @returns          {Object}        Details on the found changes
 *   events          {Array[Object]} A list of new or changed items
 *   deletions       {Array[String]} A list of deleted item ids
 *   syncState       {String}        The state to use on the next call
 *   done            {Boolean}       False if there are more changes waiting
 */
EASAccount.prototype.SyncEvents = async function(aFolder, aSyncState) {
  let collectionId = await browser.incomingServer.getStringValue(this.serverID, aFolder + "_serverid");
  if (!aSyncState) {
    let init = {
      Sync: {
        Collections: {
          Collection: {
            SyncKey: "0",
            CollectionId: collectionId,
            //Supported: /* TODO */,
          },
        },
      },
    };
    let response = await this.CallService(null, "Sync", init); // eas.js
    aSyncState = response.Collections.Collection.SyncKey;
  }
  let sync = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: aSyncState,
          CollectionId: collectionId,
          WindowSize: "512",
          Options: {
            BodyPreference: {
              Type: "1",
            },
          },
        },
      },
    },
  };
  try {
    let response = await this.CallService(null, "Sync", sync); // eas.js
    let collection = response ? response.Collections.Collection : { SyncKey: aSyncState };
    let result = {
      events: ensureArray(collection.Commands && collection.Commands.Add).concat(ensureArray(collection.Commands && collection.Commands.Change)).map(({ ServerId, ApplicationData }) => this.ConvertEvent(ServerId, ApplicationData)),
      deletions: ensureArray(collection.Commands && collection.Commands.Delete).map(item => item.ServerId),
      syncState: collection.SyncKey,
      done: collection.MoreAvailable == null,
    };
    if (result.done) {
      this.ListenToFolder(collectionId, aFolder[0].toUpperCase() + aFolder.slice(1));
    }
    return result;
  } catch (ex) {
    if (ex.code == kItemSyncKeyError) {
      return null;
    }
    throw ex;
  }
}

/**
 * Convert an EAS calendar or task item to an intermediate JSON format.
 * Exceptions to recurring tasks are converted recursively.
 *
 * @param aServerId  {Object} The item's id on the server.
 * @param aEvent     {Object} The calendar or task item in EAS format.
 * @param aException {Object} An exception of a recurring event.
 * @returns          {Object}
 */
EASAccount.prototype.ConvertEvent = function(aServerId, aEvent, aException = aEvent) {
  let exceptions = ensureArray(aException.Exceptions && aException.Exceptions.Exception);
  let attendees = ensureArray(aException.Attendees && aException.Attendees.Attendee || aEvent.Attendees && aEvent.Attendees.Attendee).map(EASAccount.ConvertAttendee);
  let timezone = EASAccount.ExtractTimezone(aEvent.Timezone);
  return {
    uid: aEvent.UID || aServerId,
    itemid: aServerId,
    title: aException.Subject || aEvent.Subject,
    startDate: iCalDate2ISO(aException.StartTime || aEvent.StartTime) || aEvent.StartDate || aEvent.Recurrence && aEvent.Recurrence.Start,
    startTimeZone: timezone,
    endDate: iCalDate2ISO(aException.EndTime || aEvent.EndTime),
    endTimeZone: timezone,
    isAllDayEvent: (aException.AllDayEvent || aEvent.AllDayEvent) == "1",
    isCancelled: !!((aException.MeetingStatus || aEvent.MeetingStatus) & 4),
    // creationDate: not supported
    // lastModifiedTime: not supported
    dueDate: aEvent.DueDate,
    completedDate: aEvent.DateCompleted,
    // percentComplete: not supported
    stampTime: iCalDate2ISO(aException.DtStamp || aEvent.DtStamp),
    priority: aEvent.Importance && 9 - 4 * aEvent.Importance,
    privacy: kPrivacies[aException.Sensitivity || aEvent.Sensitivity] || "unset",
    status: kStatuses[aException.BusyStatus || aEvent.BusyStatus] || "unset",
    reminder: aException.Reminder || aEvent.Reminder ? (aException.Reminder || aEvent.Reminder) * -60 : null, // TODO task reminders
    location: aException.Location || aEvent.Location,
    categories: ensureArray(aException.Categories && aException.Categories.Category || aEvent.Categories && aEvent.Categories.Category),
    description: aException.Body && aException.Body.Data || aEvent.Body && aEvent.Body.Data,
    recurrenceId: iCalDate2ISO(aException.ExceptionStartTime),
    recurrence: EASAccount.ConvertRecurrence(aException.Recurrence),
    deletions: exceptions.filter(exception => exception.Deleted == kDeletionException).map(exception => exception.ExceptionStartTime).map(iCalDate2ISO),
    modifications: exceptions.filter(exception => exception.Deleted != kDeletionException).map(exception => this.ConvertEvent(aServerId, aEvent, exception)),
    organizer: { name: aEvent.OrganizerName, email: aEvent.OrganizerEmail },
    requiredAttendees: attendees.filter(attendee => attendee.type == kRequiredAttendee),
    optionalAttendees: attendees.filter(attendee => attendee.type == kOptionalAttendee),
  };
}

/**
 * Extract the time zone name from EAS time zone data.
 *
 * @param aTimezone {String} The EAS time zone data.
 * @returns         {String}
 *
 * Note: This is a static method.
 * The EAS string is a base-64 encoded 172-byte blob.
 * The 32 words starting at byte offset 4 are the time zone id.
 * If this is blank, then we fall back to the time zone name,
 * which is stored in the 32 words starting at byte offset 88.
 */
EASAccount.ExtractTimezone = function(aTimezone) {
  if (!aTimezone) {
    return null;
  }
  let buffer = Uint8Array.from(atob(aTimezone), c => c.charCodeAt()).buffer;
  let timezone = String.fromCharCode(...new Uint16Array(buffer, 4, 32)).replace(/\0+$/, "");
  return timezone || String.fromCharCode(...new Uint16Array(buffer, 88, 32)).replace(/\0+$/, "");
}

/**
 * Convert EAS recurrence data to an intermediate JSON format.
 *
 * @param aRecurrence {Object} The EAS recurrence data.
 * @returns           {Object}
 *
 * Note: This is a static method.
 */
EASAccount.ConvertRecurrence = function(aRecurrence) {
  if (!aRecurrence) {
    return null;
  }
  // The Until date might be in ISO or iCal format.
  // date2iCal will convert both formats to iCal format,
  // and we can then safely pass that to iCalDate2ISO.
  return {
    count: aRecurrence.Occurrences && parseInt(aRecurrence.Occurrences) || 0,
    until: aRecurrence.Until && iCalDate2ISO(date2iCal(aRecurrence.Until)).slice(0, 10),
    type: kRecurrenceTypes[aRecurrence.Type],
    // Type of 0, 1, 3, or 6
    daysOfWeek: aRecurrence.DayOfWeek && [1, 2, 3, 4, 5, 6, 7].filter(day => aRecurrence.DayOfWeek & 1 << day - 1),
    // Type of 3 or 6
    weekOfMonth: parseInt(aRecurrence.WeekOfMonth) || 0,
    // Type of 2 or 5
    dayOfMonth: parseInt(aRecurrence.DayOfMonth) || 0,
    // Type of 5 or 6
    monthOfYear: parseInt(aRecurrence.MonthOfYear) || 0,
    // This is supposed to default to 1 but just in case...
    interval: parseInt(aRecurrence.Interval) || 1,
  };
}

/**
 * Convert EAS attendee data to an intermediate JSON format.
 *
 * @param aRecurrence {Object} The EAS attendee data.
 * @returns           {Object}
 *
 * Note: This is a static method.
 */
EASAccount.ConvertAttendee = function(aAttendee) {
  return {
    name: aAttendee.Name,
    email: aAttendee.Email,
    participation: kParticipations[aAttendee.AttendeeStatus] || "NEEDS_ACTION",
    type: aAttendee.AttendeeType,
  }
}

/**
 * Convert a calendar event or task to an EAS object.
 *
 * @param aEvent {Object} The calendar event or task in Owl format.
 * @returns      {Object} The item in EAS format.
 *
 * Note: This is a static method.
 */
EASAccount.ConvertToEAS = function(aFolder, aEvent) {
  let event = aFolder == "tasks" ? {
    // Tasks namespace
    DateCompleted: aEvent.completedDate,
    DueDate: aEvent.dueDate,
    Importance: aEvent.importance && String((9 - aEvent.importance) >> 2),
    StartDate: aEvent.startDate,
  } : {
    // Calendar namespace
    ExceptionStartTime: date2iCal(aEvent.recurrenceId),
    Timezone: !aEvent.recurrenceId && EASAccount.CreateTimezone(aEvent.startTimeZone),
    AllDayEvent: aEvent.isAllDayEvent ? "1" : "0",
    Attendees: {
      Attendee: aEvent.requiredAttendees.map(attendee => ({ Email: attendee.email, Name: attendee.name, AttendeeType: kRequiredAttendee })).concat(aEvent.optionalAttendees.map(attendee => ({ Email: attendee.email, Name: attendee.name, AttendeeType: kOptionalAttendee }))),
    },
    BusyStatus: aEvent.status == "OPAQUE" ? "2" : aEvent.status == "TRANSPARENT" ? "0" : "-1",
    DtStamp: date2iCal(aEvent.stampTime),
    EndTime: date2iCal(aEvent.endDate),
    Location: aEvent.location,
    Reminder: aEvent.reminder == null ? null : String(aEvent.reminder / -60 | 0),
    StartTime: date2iCal(aEvent.startDate),
    UID: !aEvent.recurrenceId && aEvent.uid,
  };
  // Both namespaces
  event.Categories = {
    Category: aEvent.categories,
  };
  event.Sensitivity = kPrivacies.includes(aEvent.privacy) ? String(kPrivacies.indexOf(aEvent.privacy)) : "0";
  if (aEvent.recurrence) {
    event.Recurrence = {
      Type: String(kRecurrenceTypes.indexOf(aEvent.recurrence.type) + !!aEvent.recurrence.weekOfMonth),
      Occurrences: aEvent.recurrence.count && String(aEvent.recurrence.count),
      Interval: String(aEvent.recurrence.interval),
      WeekOfMonth: aEvent.recurrence.weekOfMonth && String(aEvent.recurrence.weekOfMonth),
      DayOfWeek: aEvent.recurrence.daysOfWeek && String(aEvent.recurrence.daysOfWeek.reduce((bitmask, day) => bitmask | 1 << day - 1, 0)),
      MonthOfYear: aEvent.recurrence.monthOfYear && String(aEvent.recurrence.monthOfYear),
      Until: aEvent.recurrence.until && aEvent.recurrence.until + "T00:00:00.000Z",
      DayOfMonth: aEvent.recurrence.dayOfMonth && String(aEvent.recurrence.dayOfMonth),
      FirstDayOfWeek: aEvent.recurrence.firstDayOfWeek && String(aEvent.recurrence.firstDayOfWeek - 1),
    };
    if (aFolder != "tasks") {
      event.Recurrence.Until = date2iCal(event.Recurrence.Until);
    }
  }
  event.Subject = aEvent.title;
  // AirSyncBase namespace
  event.Body = {
    Type: "1",
    Data: [aEvent.description || ""],
  };
  return event;
}

/**
 * Create EAS time zone data.
 *
 * @param aTimezone {String} The time zone name.
 * @returns         {String} The EAS time zone data.
 *
 * Note: This is a static method.
 * The EAS string is a base-64 encoded 172-byte blob.
 * The 32 words starting at byte offset 4 are the time zone name.
 * This seems to be all that EAS is interested in.
 */
EASAccount.CreateTimezone = function(aTimezone) {
  if (!aTimezone) {
    return null;
  }
  let unicode = new Uint16Array(86);
  let pos = 2;
  for (let c of kTimeZoneMap[aTimezone] || aTimezone) {
    unicode[pos++] = c.charCodeAt();
  }
  return btoa(String.fromCharCode(...new Uint8Array(unicode.buffer)));
}

/**
 * Create a calendar or task item
 *
 * @param aFolder     {String} The distinguished folder id
 * @param aSyncState {String} The folder sync state
 * @param aEvent      {Object} The item to create
 * @returns           {Object}
 *   uid    {String} The new item's UID
 *   itemid {String} The id of the new item
 */
EASAccount.prototype.CreateEvent = async function(aFolder, aSyncState, aEvent, aNotify) {
  let invitation = await this.FindInvitationToRespond(aEvent);
  if (invitation) {
    return invitation;
  }
  let collectionId = await browser.incomingServer.getStringValue(this.serverID, aFolder + "_serverid");
  let clientId = aEvent.uid || await EASAccount.NextClientId();
  let create = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: aSyncState,
          CollectionId: collectionId,
          GetChanges: "0",
          Commands: {
            Add: {
              ClientId: clientId,
              ApplicationData: EASAccount.ConvertToEAS(aFolder, aEvent),
            },
          },
        },
      },
    },
  };
  let response = await this.CallService(null, "Sync", create); // eas.js
  if (response.Collections.Collection.Status != "1") {
    throw new EASError(null, "Sync", create, response.Collections.Collection.Status);
  }
  if (response.Collections.Collection.Responses.Add.Status != "1") {
    throw new EASError(null, "Sync", create, response.Collections.Collection.Responses.Add.Status);
  }
  let fetch = {
    ItemOperations: {
      Fetch: {
        Store: "Mailbox",
        ServerId: response.Collections.Collection.Responses.Add.ServerId,
        CollectionId: collectionId,
        Options: {
          BodyPreference: {
            Type: "1",
            TruncationSize: "0",
          },
        },
      },
    },
  };
  let result = await this.CallService(null, "ItemOperations", fetch); // eas.js;
  if (result.Response.Fetch.Status != "1") {
    throw new EASError(null, "ItemOperations", fetch, result.Response.Fetch.Status);
  }
  return {
    uid: result.Response.Fetch.Properties.UID || result.Response.Fetch.ServerId,
    itemid: result.Response.Fetch.ServerId,
    syncState: response.Collections.Collection.SyncKey,
  };
}

/**
 * Look for an invitation for a given meeting, to avoid creating a duplicate.
 * This can happen if the event hasn't been synchronised yet.
 *
 * @param aEvent {Object}  The meeting
 * @returns      {Object?} The invitation
 */
EASAccount.prototype.FindInvitationToRespond = async function(aEvent) {
  let responseCode = kResponses.indexOf(aEvent.participation) + 1;
  if (!responseCode) {
    return null;
  }
  let { itemId, folderId } = await browser.calendarProvider.getCurrentInvitation();
  if (!itemId || !folderId) {
    return null;
  }
  let fetch = {
    ItemOperations: {
      Fetch: {
        Store: "Mailbox",
        ServerId: itemId,
        CollectionId: folderId,
        Options: {
          BodyPreference: {
            Type: "1",
            TruncationSize: "0",
          },
        },
      },
    },
  };
  let results = await this.CallService(null, "ItemOperations", fetch); // eas.js;
  if (results.Response.Fetch.Status != "1") {
    throw new EASError(null, "ItemOperations", fetch, results.Response.Fetch.Status);
  }
  if (!results.Response.Fetch.Properties.MeetingRequest) {
    return null;
  }
  let globalObjId = atob(results.Response.Fetch.Properties.MeetingRequest.GlobalObjId);
  let bytes = Uint8Array.from(globalObjId, c => c.charCodeAt());
  let words = new Uint32Array(bytes.buffer);
  let byteCount = words[9] - 13;
  if (globalObjId.length > 52 && globalObjId.slice(40, 48) == "vCal-Uid" && byteCount > 0 && byteCount + 52 < bytes.length) {
    // This was actually a wrapped foreign UID. Extract the original UID.
    bytes = bytes.slice(52, 52 + byteCount);
  } else {
    // This was a UID generated by Exchange. Ensure that word four is zero.
    // https://docs.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-asemail/dbbd9273-0cc2-4832-9f5f-39caf3a1067d
    words[4] = 0;
  }
  let uid = bytes.reduce((s, c) => s + c.toString(16).padStart(2, 0), "");
  if (uid != aEvent.uid.toLowerCase()) {
    return null;
  }
  itemId = await this.RespondToInvitation(folderId, itemId, null, responseCode);
  return {
    uid: aEvent.uid,
    itemid: itemId,
  };
}

/**
 * Update a calendar or task item
 *
 * @param aFolder      {String} The distinguished folder id
 * @param aSyncState   {String} The folder sync state
 * @param aMasterEvent {Object} The properties of the recurring master
 * @param aNewEvent    {Object} The new properties of the item
 * @param aOldEvent    {Object} The old properties of the item
 *
 * This method is also used to delete recurrences of master recurring items.
 */
EASAccount.prototype.UpdateEvent = async function(aFolder, aSyncState, aMasterEvent, aNewEvent, aOldEvent, aNotify) {
  let collectionId = await browser.incomingServer.getStringValue(this.serverID, aFolder + "_serverid");
  let responseCode = kResponses.indexOf(aNewEvent.participation) + 1;
  if (responseCode) {
    await this.RespondToInvitation(collectionId, aNewEvent.itemid, aNewEvent.recurrenceId, responseCode);
    return;
  }
  let data = EASAccount.ConvertToEAS(aFolder, aMasterEvent);
  if (aNewEvent.recurrenceId) {
    data.Exceptions = {
      Exception: EASAccount.ConvertToEAS(aFolder, aNewEvent),
    };
    // We can clear the exception's location by using an empty tag.
    if (!data.Exceptions.Exception.Location) {
      data.Exceptions.Exception.Location = {};
    }
    // For an empty subject the best we can do is to inherit from the master.
    if (!data.Exceptions.Exception.Subject) {
      data.Exceptions.Exception.Subject = {};
    }
    // Other fields don't accept empty tags at all so delete them instead.
    if (!data.Exceptions.Exception.Categories.length) {
      delete data.Exceptions.Exception.Categories;
    }
    if (!data.Exceptions.Exception.Attendees.length) {
      delete data.Exceptions.Exception.Attendees;
    }
  } else if (aNewEvent.deletedIds) {
    let deletedIds = aNewEvent.deletedIds;
    if (aOldEvent.deletedIds) {
      deletedIds = deletedIds.filter(deletion => !aOldEvent.deletedIds.includes(deletion));
    }
    data.Exceptions = {
      Exception: deletedIds.map(id => ({
        Deleted: "1",
        ExceptionStartTime: date2iCal(id),
      })),
    };
  }
  let request = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: aSyncState,
          CollectionId: collectionId,
          GetChanges: "0",
          Commands: {
            Change: {
              ServerId: aNewEvent.itemid,
              ApplicationData: data,
            },
          },
        },
      },
    },
  };
  let response = await this.CallService(null, "Sync", request); // eas.js
  if (response.Collections.Collection.Status != "1") {
    throw new EASError(null, "Sync", request, response.Collections.Collection.Status);
  }
  if (response.Collections.Collection.Responses) {
    throw new EASError(null, "Sync", request, response.Collections.Collection.Responses.Change.Status);
  }
  return response.Collections.Collection.SyncKey;
}

/**
 * Update the participation for an invitation
 *
 * @param aContent      {String} The notification in MIME format
 */
EASAccount.prototype.NotifyParticipation = async function(aContent) {
  let send = {
    SendMail: {
      ClientId: await EASAccount.NextClientId(),
      SaveInSentItems: {},
      Mime: new TextEncoder().encode(aContent),
    },
  };
  await this.CallService(null, "SendMail", send); // eas.js
}

/**
 * Respond to an invitation
 *
 * @param aCollectionId {String}  The server id of the calendar folder
 * @param aEventId      {String}  The master invitation to be responded to
 * @param aRecurrenceId {String}  The recurring instance to be responded to
 * @param aReponseCode  {Integer} The response to be made
 *
 * Note: This just updates the state on the server.
 * The caller must still send the email as necessary.
 */
EASAccount.prototype.RespondToInvitation = async function(aCollectionId, aEventId, aRecurrenceId, aResponseCode)
{
  let respond = {
    MeetingResponse: {
      Request: {
        UserResponse: aResponseCode,
        CollectionId: aCollectionId,
        RequestId: aEventId,
        InstanceId: aRecurrenceId,
      },
    },
  };
  let response = await this.CallService(null, "MeetingResponse", respond); // eas.js
  if (response.Result.Status != "1") {
    throw new EASError(null, "MeetingResponse", respond, response.Result.Status);
  }
  return response.Result.CalendarId;
}

/**
 * Delete a calendar or task item
 *
 * @param aFolder    {String} The distinguished folder id
 * @param aSyncState {String} The folder sync state
 * @param aEventId   {String} The id of the item to delete
 */
EASAccount.prototype.DeleteEvent = async function(aFolder, aSyncState, aEventId) {
  let collectionId = await browser.incomingServer.getStringValue(this.serverID, aFolder + "_serverid");
  let request = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: aSyncState,
          CollectionId: collectionId,
          GetChanges: "0",
          Commands: {
            Delete: {
              ServerId: aEventId,
            },
          },
        },
      },
    },
  };
  let response = await this.CallService(null, "Sync", request); // eas.js
  if (response.Collections.Collection.Status != "1") {
    throw new EASError(null, "Sync", request, response.Collections.Collection.Status);
  }
  if (response.Collections.Collection.Responses) {
    throw new EASError(null, "Sync", request, response.Collections.Collection.Responses.Delete.Status);
  }
  return response.Collections.Collection.SyncKey;
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
EASAccount.prototype.GetFreeBusy = async function(aAttendee, aStartTime, aEndTime) {
  let query = {
    ResolveRecipients: {
      To: aAttendee,
      Options: {
        Availability: {
          StartTime: aStartTime,
          EndTime: aEndTime,
        },
      },
    },
  };
  let response = await this.CallService(null, "ResolveRecipients", query); // eas.js
  if (response.Response.Status != "1") {
    throw new EASError(null, "ResolveRecipients", query, response.Response.Status);
  }
  if (response.Response.Recipient.Availability.Status != "1") {
    throw new EASError(null, "ResolveRecipients", query, response.Response.Recipient.Availability.Status);
  }
  let date = new Date(aStartTime);
  let end = aStartTime;
  return response.Response.Recipient.Availability.MergedFreeBusy.split("").map(type => {
    let start = end;
    date.setTime(date.getTime() + kHalfHour);
    end = date.toISOString();
    type = kBusyValues[type];
    return { type, start, end };
  });
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
    let account = gEASAccounts.get(aServerId);
    switch (aOperation) {
    case "SyncEvents":
      return await account.SyncEvents(aParameters.folder, aParameters.syncState);
    case "CreateEvent":
      return await account.CreateEvent(aParameters.folder, aParameters.syncState, aParameters.event, aParameters.notify);
    case "UpdateEvent":
      return await account.UpdateEvent(aParameters.folder, aParameters.syncState, aParameters.masterEvent, aParameters.newEvent, aParameters.oldEvent, aParameters.notify);
    case "NotifyParticipation":
      return await account.NotifyParticipation(aParameters.content);
    case "DeleteEvent":
      return await account.DeleteEvent(aParameters.folder, aParameters.syncState, aParameters.id);
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
}, "owl-eas");
