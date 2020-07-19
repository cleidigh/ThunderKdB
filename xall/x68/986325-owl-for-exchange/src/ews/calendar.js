/// A list of Exchange calendar and task property names
/// and a flag for what the Exchange field prefix is.
const kFieldMap = {
  t$Subject: true, // item:Subject
  t$Categories: true,
  t$Importance: true,
  t$Body: true,
  t$Sensitivity: true,
  t$ReminderDueBy: true,
  t$ReminderMinutesBeforeStart: true,
  t$ReminderIsSet: true,
  t$Recurrence: false, // both calendar:Recurrence and task:Recurrence
  t$LegacyFreeBusyStatus: false, // calendar:LegacyFreeBusyStatus
  t$Location: false,
  t$RequiredAttendees: false,
  t$OptionalAttendees: false,
  t$UID: false,
  t$StartTimeZone: false,
  t$EndTimeZone: false,
  // Note: These appear after the time zone because Exchange uses local time.
  t$Start: false,
  t$End: false,
  t$IsAllDayEvent: false,
  t$StartDate: false, // task:StartDate
  t$DueDate: false,
  t$CompleteDate: false,
  t$PercentComplete: false,
};

/// Converts Lightning participation status into Exchange response tags.
const kResponseMap = {
  DECLINED: "t$DeclineItem",
  TENTATIVE: "t$TentativelyAcceptItem",
  ACCEPTED: "t$AcceptItem",
};

/// Converts Lightning time zones into Exchange time zones
/// (Lightning automatically recognises Exchange time zones).
const kTimeZoneMap = {
  "Australia/Darwin": "AUS Central Standard Time",
  "Australia/Sydney": "AUS Eastern Standard Time",
  "America/Anchorage": "Alaskan Standard Time",
  "Asia/Riyadh": "Arab Standard Time",
  "Asia/Dubai": "Arabian Standard Time",
  "Asia/Baghdad": "Arabic Standard Time",
  "America/Argentina/Buenos_Aires": "Argentina Standard Time",
  "America/Halifax": "Atlantic Standard Time",
  "Asia/Baku": "Azerbaijan Standard Time",
  "Atlantic/Azores": "Azores Standard Time",
  "America/Regina": "Canada Central Standard Time",
  "Atlantic/Cape_Verde": "Cape Verde Standard Time",
  "Asia/Yerevan": "Caucasus Standard Time",
  "Australia/Adelaide": "Cen. Australia Standard Time",
  "America/Guatemala": "Central America Standard Time",
  "Asia/Almaty": "Central Asia Standard Time",
  "America/Cuiaba": "Central Brazilian Standard Time",
  "Europe/Budapest": "Central Europe Standard Time",
  "Europe/Warsaw": "Central European Standard Time",
  "Pacific/Guadalcanal": "Central Pacific Standard Time",
  "America/Chicago": "Central Standard Time",
  "America/Mexico_City": "Central Standard Time (Mexico)",
  "Asia/Shanghai": "China Standard Time",
  "Africa/Nairobi": "E. Africa Standard Time",
  "Australia/Brisbane": "E. Australia Standard Time",
  "America/Sao_Paulo": "E. South America Standard Time",
  "America/New_York": "Eastern Standard Time",
  "Africa/Cairo": "Egypt Standard Time",
  "Asia/Yekaterinburg": "Ekaterinburg Standard Time",
  "Europe/Kiev": "FLE Standard Time",
  "Europe/London": "GMT Standard Time",
  "Europe/Bucharest": "GTB Standard Time",
  "Asia/Tbilisi": "Georgian Standard Time",
  "America/Godthab": "Greenland Standard Time",
  "Atlantic/Reykjavik": "Greenwich Standard Time",
  "Pacific/Honolulu": "Hawaiian Standard Time",
  "Asia/Kolkata": "India Standard Time",
  "Asia/Tehran": "Iran Standard Time",
  "Asia/Jerusalem": "Israel Standard Time",
  "Asia/Amman": "Jordan Standard Time",
  "Asia/Seoul": "Korea Standard Time",
  "Indian/Mauritius": "Mauritius Standard Time",
  "America/Montevideo": "Montevideo Standard Time",
  "Africa/Casablanca": "Morocco Standard Time",
  "America/Denver": "Mountain Standard Time",
  "America/Chihuahua": "Mountain Standard Time (Mexico)",
  "Asia/Yangon": "Myanmar Standard Time",
  "Asia/Novosibirsk": "N. Central Asia Standard Time",
  "Africa/Windhoek": "Namibia Standard Time",
  "Asia/Kathmandu": "Nepal Standard Time",
  "Pacific/Auckland": "New Zealand Standard Time",
  "Asia/Irkutsk": "North Asia East Standard Time",
  "Asia/Krasnoyarsk": "North Asia Standard Time",
  "America/Santiago": "Pacific SA Standard Time",
  "America/Los_Angeles": "Pacific Standard Time",
  "America/Tijuana": "Pacific Standard Time (Mexico)",
  "Asia/Karachi": "Pakistan Standard Time",
  "America/Asuncion": "Paraguay Standard Time",
  "Europe/Paris": "Romance Standard Time",
  "Europe/Moscow": "Russian Standard Time",
  "America/Cayenne": "SA Eastern Standard Time",
  "America/Bogota": "SA Pacific Standard Time",
  "America/La_Paz": "SA Western Standard Time",
  "Asia/Bangkok": "SE Asia Standard Time",
  "Pacific/Apia": "Samoa Standard Time",
  "Asia/Singapore": "Singapore Standard Time",
  "Africa/Johannesburg": "South Africa Standard Time",
  "Asia/Colombo": "Sri Lanka Standard Time",
  "Asia/Taipei": "Taipei Standard Time",
  "Australia/Hobart": "Tasmania Standard Time",
  "Asia/Tokyo": "Tokyo Standard Time",
  "Pacific/Tongatapu": "Tonga Standard Time",
  "America/Indiana/Indianapolis": "US Eastern Standard Time",
  "America/Phoenix": "US Mountain Standard Time",
  "America/Caracas": "Venezuela Standard Time",
  "Asia/Vladivostok": "Vladivostok Standard Time",
  "Australia/Perth": "W. Australia Standard Time",
  "Africa/Lagos": "W. Central Africa Standard Time",
  "Europe/Berlin": "W. Europe Standard Time",
  "Asia/Tashkent": "West Asia Standard Time",
  "Pacific/Port_Moresby": "West Pacific Standard Time",
  "Asia/Yakutsk": "Yakutsk Standard Time",
};

/// Converts Exchange privacy values into Lightning privacy values.
const kPrivacyMap = {
  "Normal": "PUBLIC",
  "Private": "PRIVATE",
  "Confidential": "CONFIDENTIAL",
};

/// Converts Exchange status values into Lightning status values.
const kStatusMap = {
  Free: "TRANSPARENT",
  Busy: "OPAQUE",
  OOF: "OPAQUE",
  WorkingElsewhere: "OPAQUE",
};

/// Converts Exchange response type into Lightning participation type.
const kParticipationMap = {
  Organizer: "ACCEPTED",
  Tentative: "TENTATIVE",
  Accept: "ACCEPTED",
  Decline: "DECLINED",
  Unknown: "NEEDS-ACTION",
  NoResponseReceived: "NEEDS-ACTION",
};

/// Converts Exchange Free/Busy status into Lightning status.
const kBusyMap = {
  NoData: 0,
  Free: 1,
  Busy: 2,
  OOF: 4,
  Tentative: 8,
};

/// Exchange recurrence rules use month, week and day names.
const kMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const kWeeks = ["First", "Second", "Third", "Fourth", "Last"];
const kDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Synchronise calendar or task items from Exchange.
 *
 * @param aDelegate  {String}        The other user whose folder to sync
 * @param aFolder    {String}        The distinguished folder id to sync
 * @param aSyncState {String}        The previous sync state (empty if none)
 * @returns          {Object}        Details on the found changes
 *   events          {Array[Object]} A list of new or changed items
 *   deletions       {Array[String]} A list of deleted item ids
 *   syncState       {String}        The state to use on the next call
 *   done            {Boolean}       False if there are more changes waiting
 */
EWSAccount.prototype.SyncEvents = async function(aDelegate, aFolder, aSyncState) {
  let sync = {
    m$SyncFolderItems: {
      m$ItemShape: {
        t$BaseShape: "IdOnly",
      },
      m$SyncFolderId: {
        t$DistinguishedFolderId: {
          Id: aFolder,
        },
      },
      m$SyncState: aSyncState || null,
      m$MaxChangesReturned: EWSAccount.kMaxSyncChanges,
    },
  };
  if (aDelegate) {
    sync.m$SyncFolderItems.m$SyncFolderId.t$DistinguishedFolderId.t$Mailbox = {
      t$EmailAddress: aDelegate,
    };
  }
  try {
    let response = await this.CallService(null, sync); // ews.js
    let items = ensureArray(response.Changes.Update).concat(ensureArray(response.Changes.Create));
    if (items.length) {
      let fetch = {
        m$GetItem: {
          m$ItemShape: {
            t$BaseShape: "Default",
            t$BodyType: "Text",
            t$AdditionalProperties: {
              t$FieldURI: [{
                FieldURI: "item:Body",
              }, {
                FieldURI: "item:Categories",
              }, {
                FieldURI: "item:Importance",
              }, {
                FieldURI: "item:DateTimeCreated",
              }, {
                FieldURI: "item:Sensitivity",
              }, {
                FieldURI: "item:ReminderIsSet",
              }, {
                FieldURI: "item:ReminderDueBy",
              }, {
                FieldURI: "item:ReminderMinutesBeforeStart",
              }, {
                FieldURI: "item:LastModifiedTime",
              }, {
                FieldURI: "item:DateTimeReceived",
              }, {
                FieldURI: "calendar:IsAllDayEvent",
              }, {
                FieldURI: "calendar:IsCancelled",
              }, {
                FieldURI: "calendar:RequiredAttendees",
              }, {
                FieldURI: "calendar:OptionalAttendees",
              }, {
                FieldURI: "calendar:Recurrence",
              }, {
                FieldURI: "calendar:ModifiedOccurrences",
              }, {
                FieldURI: "calendar:DeletedOccurrences",
              }, {
                FieldURI: "calendar:UID",
              }, {
                FieldURI: "calendar:RecurrenceId",
              }, {
                FieldURI: "calendar:DateTimeStamp",
              }, {
                FieldURI: "calendar:StartTimeZone",
              }, {
                FieldURI: "calendar:EndTimeZone",
              }, {
                FieldURI: "task:CompleteDate",
              }, {
                FieldURI: "task:Recurrence",
              }],
            },
          },
          m$ItemIds: {
            t$ItemId: items.map(EWSAccount.GetItem).map(item => item.ItemId),
          },
        },
      };
      let result = await this.CallService(null, fetch); // ews.js
      items = ensureArray(result).map(item => item.Items).map(EWSAccount.GetItem);
      for (let item of items) {
        if (item.ModifiedOccurrences) {
          fetch.m$GetItem.m$ItemIds.t$ItemId = ensureArray(item.ModifiedOccurrences.Occurrence).map(item => item.ItemId);
          let result = await this.CallService(null, fetch); // ews.js
          item.ModifiedOccurrences.Occurrence = ensureArray(result).map(item => item.Items).map(EWSAccount.GetItem);
        }
      }
    }
    return {
      events: items.map(EWSAccount.ConvertEvent),
      deletions: ensureArray(response.Changes.Delete).map(item => item.ItemId.Id),
      syncState: response.SyncState,
      done: response.IncludesLastItemInRange == "true",
    };
  } catch (ex) {
    if (ex instanceof InvalidSyncStateServerError) {
      return null; // because exception types don't cross webextension calls
    }
    throw ex;
  }
}

/**
 * Convert an Exchange calendar or task item to an intermediate JSON format.
 * Exceptions to recurring tasks are converted recursively.
 *
 * @param aEvent {Object} The calendar or task item in EWS format.
 * @returns      {Object}
 *
 * Note: This is a static method.
 */
EWSAccount.ConvertEvent = function(aEvent) {
  return {
    uid: aEvent.UID || aEvent.ItemId.Id,
    itemid: aEvent.ItemId.Id,
    title: aEvent.Subject,
    startDate: aEvent.Start || aEvent.StartDate || aEvent.Recurrence && aEvent.Recurrence.EndDateRecurrence && aEvent.Recurrence.EndDateRecurrence.StartDate.slice(0, 10),
    startTimeZone: EWSAccount.ExtractTimezone(aEvent.StartTimeZone || {}),
    endDate: aEvent.End,
    endTimeZone: EWSAccount.ExtractTimezone(aEvent.EndTimeZone || aEvent.StartTimeZone || {}),
    isAllDayEvent: aEvent.IsAllDayEvent == "true",
    isCancelled: aEvent.IsCancelled == "true",
    creationDate: aEvent.DateTimeCreated,
    lastModifiedTime: aEvent.LastModifiedTime,
    dueDate: aEvent.DueDate,
    completedDate: aEvent.CompleteDate,
    percentComplete: aEvent.PercentComplete && parseInt(aEvent.PercentComplete),
    stampTime: aEvent.DateTimeStamp,
    priority: aEvent.Importance == "High" ? 1 : aEvent.Importance == "Low" ? 9 : 5,
    privacy: kPrivacyMap[aEvent.Sensitivity] || "unset",
    status: kStatusMap[aEvent.LegacyFreeBusyStatus] || "unset",
    reminder: aEvent.ReminderIsSet == "true" ? aEvent.ReminderMinutesBeforeStart * -60 : null,
    location: aEvent.Location,
    categories: ensureArray(aEvent.Categories && aEvent.Categories.String),
    description: aEvent.Body && aEvent.Body.Value,
    recurrenceId: aEvent.RecurrenceId,
    recurrence: EWSAccount.ConvertRecurrence(aEvent.Recurrence),
    deletions: ensureArray(aEvent.DeletedOccurrences && aEvent.DeletedOccurrences.DeletedOccurrence).map(occurrence => occurrence.Start),
    modifications: ensureArray(aEvent.ModifiedOccurrences && aEvent.ModifiedOccurrences.Occurrence).map(EWSAccount.ConvertEvent),
    organizer: aEvent.Organizer && aEvent.Organizer.Mailbox && EWS2MailboxObject(aEvent.Organizer.Mailbox),
    requiredAttendees: ensureArray(aEvent.RequiredAttendees && aEvent.RequiredAttendees.Attendee).map(EWSAccount.ConvertAttendee),
    optionalAttendees: ensureArray(aEvent.OptionalAttendees && aEvent.OptionalAttendees.Attendee).map(EWSAccount.ConvertAttendee),
  };
}

/**
 * Get the time zone from an EWS time zone object.
 *
 * @param aTimezone {Object}
 *          Id      {String} The time zone id
 *          Name    {String} The time zone name
 *
 * For some reason Exchange sometimes uses the Id and sometimes the Name...
 */
EWSAccount.ExtractTimezone = function(aTimezone) {
  return aTimezone.Id || aTimezone.Name;
}

/**
 * Convert Exchange recurrence data to an intermediate JSON format.
 *
 * @param aRecurrence {Object} The EWS recurrence data.
 * @returns           {Object}
 *
 * Note: This is a static method.
 */
EWSAccount.ConvertRecurrence = function(aRecurrence) {
  if (!aRecurrence) {
    return null;
  }
  // EWS recurrence dates use a custom format (date + timezone).
  // We only need the date, which is the first 10 characters.
  let schedule = aRecurrence.RelativeYearlyRecurrence || aRecurrence.AbsoluteYearlyRecurrence || aRecurrence.RelativeMonthlyRecurrence || aRecurrence.AbsoluteMonthlyRecurrence || aRecurrence.WeeklyRecurrence || aRecurrence.DailyRecurrence;
  return {
    count: aRecurrence.NumberedRecurrence && parseInt(aRecurrence.NumberedRecurrence.NumberOfOccurrences) || 0,
    until: aRecurrence.EndDateRecurrence && aRecurrence.EndDateRecurrence.EndDate.slice(0, 10),
    type: aRecurrence.DailyRecurrence ? "DAILY" : aRecurrence.WeeklyRecurrence ? "WEEKLY" : schedule.Month ? "YEARLY" : "MONTHLY",
    // RelativeYearly, RelativeMonthly, Weekly
    daysOfWeek: schedule.DaysOfWeek ? schedule.DaysOfWeek.split(" ").map(day => kDays.indexOf(day) + 1) : null,
    // RelativeYearly, RelativeMonthly
    weekOfMonth: kWeeks.indexOf(schedule.DayOfWeekIndex) + 1,
    // AbsoluteYearly, AbsoluteMonthly
    dayOfMonth: parseInt(schedule.DayOfMonth) || 0,
    // RelativeYearly, AbsoluteYearly
    monthOfYear: kMonths.indexOf(schedule.Month) + 1,
    // RelativeMonthly, AbsoluteMonthly, Weekly, Daily
    // Default to 1 in case this is a yearly recurrence.
    interval: parseInt(schedule.Interval) || 1,
  };
}

/**
 * Convert Exchange attendee data to an intermediate JSON format.
 *
 * @param aRecurrence {Object} The EWS attendee data.
 * @returns           {Object}
 *
 * Note: This is a static method.
 */
EWSAccount.ConvertAttendee = function(aAttendee) {
  let attendee = EWS2MailboxObject(aAttendee.Mailbox);
  attendee.participation = kParticipationMap[aAttendee.ResponseType];
  return attendee;
}

/**
 * Convert a calendar event or task to an EWS object.
 *
 * @param aEvent {Object} The calendar event or task in Owl format.
 * @returns      {Object} The item in EWS format.
 */
EWSAccount.ConvertToEWS = function(aFolder, aEvent) {
  let event = {};
  // These have to be set in schema order.
  event.t$Subject = aEvent.title;
  if (aEvent.privacy == "PUBLIC") {
    event.t$Sensitivity = "Normal";
  } else if (aEvent.privacy == "PRIVATE") {
    event.t$Sensitivity = "Private";
  } else if (aEvent.privacy == "CONFIDENTIAL") {
    event.t$Sensitivity = "Confidential";
  }
  event.t$Body = {
    BodyType: "Text",
    _TextContent_: aEvent.description,
  };
  if (aEvent.categories.length) {
    event.t$Categories = {
      t$String: aEvent.categories,
    };
  }
  if (aEvent.priority) {
    if (aEvent.priority > 5) {
      event.t$Importance = "Low";
    } else if (aEvent.priority < 5) {
      event.t$Importance = "High";
    } else {
      event.t$Importance = "Normal";
    }
  }
  event.t$ReminderIsSet = aEvent.reminder != null;
  event.t$ReminderMinutesBeforeStart = aEvent.reminder / -60 | 0;
  // Calendar-specific fields.
  event.t$UID = aEvent.uid;
  // event.t$DateTimeStamp = aEvent.stampTime;
  if (aFolder == "calendar") {
    event.t$Start = aEvent.startDate;
  }
  if (aEvent.endDate) {
    event.t$End = aEvent.endDate;
  }
  event.t$IsAllDayEvent = aEvent.isAllDayEvent;
  if (aEvent.status == "TRANSPARENT") {
    event.t$LegacyFreeBusyStatus = "Free";
  } else if (aEvent.status == "OPAQUE") {
    event.t$LegacyFreeBusyStatus = "Busy";
  }
  if (aEvent.location) {
    event.t$Location = aEvent.location;
  }
  if (aEvent.requiredAttendees.length) {
    event.t$RequiredAttendees = {
      t$Attendee: aEvent.requiredAttendees.map(attendee => ({
        t$Mailbox: MailboxObject2EWS(attendee),
      })),
    };
  }
  if (aEvent.optionalAttendees.length) {
    event.t$OptionalAttendees = {
      t$Attendee: aEvent.optionalAttendees.map(attendee => ({
        t$Mailbox: MailboxObject2EWS(attendee),
      })),
    };
  }
  // Task fields are all in alphabetical order, which simplifies things.
  if (aEvent.completedDate) {
    event.t$CompleteDate = aEvent.completedDate;
  }
  if (aEvent.dueDate) {
    event.t$DueDate = aEvent.dueDate;
  }
  if (aEvent.percentComplete) {
    event.t$PercentComplete = aEvent.percentComplete;
  }
  // Both calendar and tasks have a recurrence field.
  // Other shared fields were put under item, but not this one. Sigh...
  if (aEvent.recurrence) {
    event.t$Recurrence = {};
    let recurrenceType = aEvent.recurrence.type[0] + aEvent.recurrence.type.slice(1).toLowerCase();
    if (recurrenceType == "Yearly") {
      aEvent.recurrence.interval = null;
    }
    if (recurrenceType == "Yearly" || recurrenceType == "Monthly") {
      recurrenceType = (aEvent.recurrence.dayOfMonth ? "Absolute" : "Relative") + recurrenceType;
    }
    event.t$Recurrence["t$" + recurrenceType + "Recurrence"] = {
      t$Interval: aEvent.recurrence.interval,
      t$DaysOfWeek: aEvent.recurrence.days && aEvent.recurrence.days.map(day => kDays[day - 1]).join(" "),
      t$FirstDayOfWeek: kDays[aEvent.recurrence.firstDayOfWeek - 1],
      t$DayOfWeekIndex: kWeeks[aEvent.recurrence.weekOfMonth - 1],
      t$DayOfMonth: aEvent.recurrence.dayOfMonth,
      t$Month: kMonths[aEvent.recurrence.monthOfYear - 1],
    };
    if (aEvent.recurrence.count) {
      event.t$Recurrence.t$NumberedRecurrence = {
        t$StartDate: aEvent.recurrence.from || aEvent.startDate.slice(0, 10),
        t$NumberOfOccurrences: aEvent.recurrence.count,
      };
    } else if (aEvent.recurrence.until) {
      event.t$Recurrence.t$EndDateRecurrence = {
        t$StartDate: aEvent.recurrence.from || aEvent.startDate.slice(0, 10),
        t$EndDate: aEvent.recurrence.until,
      };
    } else {
      event.t$Recurrence.t$NoEndRecurrence = {
        t$StartDate: aEvent.recurrence.from || aEvent.startDate.slice(0, 10),
      };
    }
  }
  if (aFolder == "tasks") {
    event.t$StartDate = aEvent.startDate;
  }
  // These calendar fields are newer so they are last in the schema.
  if (aEvent.startTimeZone) {
    event.t$StartTimeZone = {
      Id: kTimeZoneMap[aEvent.startTimeZone] || aEvent.startTimeZone,
    };
  }
  if (aEvent.endTimeZone) {
    event.t$EndTimeZone = {
      Id: kTimeZoneMap[aEvent.endTimeZone] || aEvent.endTimeZone,
    };
  }
  return event;
}

/**
 * Create a calendar or task item
 *
 * @param aFolder {String} The distinguished folder id
 * @param aEvent  {Object} The item to create
 * @returns       {Object}
 *   uid    {String} The new item's UID
 *   itemid {String} The id of the new item
 */
EWSAccount.prototype.CreateEvent = async function(aFolder, aEvent, aNotify) {
  let invitation = await this.FindInvitationToRespond(aEvent);
  if (invitation) {
    return invitation;
  }
  let event = EWSAccount.ConvertToEWS(aFolder, aEvent);
  let create = {
    m$CreateItem: {
      m$Items: {},
      SendMeetingInvitations: aNotify ? "SendToAllAndSaveCopy" : "SendToNone",
    },
  };
  if (aFolder == "calendar") {
    create.m$CreateItem.m$Items.t$CalendarItem = event;
  }
  if (aFolder == "tasks") {
    create.m$CreateItem.m$Items.t$Task = event;
  }
  let response = await this.CallService(null, create); // ews.js
  if (aFolder == "calendar") {
    let fetch = {
      m$GetItem: {
        m$ItemShape: {
          t$BaseShape: "IdOnly",
          t$AdditionalProperties: {
            t$FieldURI: [{
              FieldURI: "calendar:UID",
            }],
          },
        },
        m$ItemIds: {
          t$ItemId: EWSAccount.GetItem(response.Items).ItemId,
        },
      },
    };
    response = await this.CallService(null, fetch); // ews.js
  }
  let newEvent = EWSAccount.GetItem(response.Items);
  return {
    uid: newEvent.UID || newEvent.ItemId.Id,
    itemid: newEvent.ItemId.Id,
  };
}

/**
 * Look for an invitation for a given meeting, to avoid creating a duplicate.
 * This can happen if the event hasn't been synchronised yet.
 *
 * @param aEvent {Object}  The meeting
 * @returns      {Object?} The invitation
 */
EWSAccount.prototype.FindInvitationToRespond = async function(aEvent) {
  let responseTag = kResponseMap[aEvent.participation];
  if (!responseTag) {
    return null;
  }
  let find = {
    m$FindItem: {
      m$ItemShape: {
        t$BaseShape: "IdOnly",
      },
      m$Restriction: {
        t$IsEqualTo: {
          t$ExtendedFieldURI: {
            DistinguishedPropertySetId: "Meeting",
            PropertyId: 0x23,
            PropertyType: "Binary",
          },
          t$FieldURIOrConstant: {
            t$Constant: {
              Value: btoa(aEvent.uid.replace(/../g, hex => String.fromCharCode(parseInt(hex, 16)))), // UID is hex encoded but Find wants Base 64 encoding
            },
          },
        },
      },
      m$ParentFolderIds: {
        t$DistinguishedFolderId: {
          Id: aFolder,
        },
      },
    },
  };
  let result = await this.CallService(null, find); // ews.js
  if (!result.RootFolder.Items || !result.RootFolder.Items.CalendarItem || !result.RootFolder.Items.CalendarItem.ItemId) {
    return null;
  }
  await this.RespondToInvitation(result.RootFolder.Items.CalendarItem.ItemId, responseTag, "SaveOnly");
  return {
    uid: aEvent.uid,
    itemid: result.RootFolder.Items.CalendarItem.ItemId.Id,
  };
}

/**
 * Update a calendar or task item
 *
 * @param aFolder   {String} The distinguished folder id
 * @param aNewEvent {Object} The new properties of the item
 * @param aOldEvent {Object} The old properties of the item
 *
 * This method is also used to delete recurrences of master recurring items.
 */
EWSAccount.prototype.UpdateEvent = async function(aFolder, aNewEvent, aOldEvent, aNotify) {
  let deletions = aNewEvent.deletions;
  if (deletions) {
    if (aOldEvent.deletions) {
      deletions = deletions.filter(deletion => !aOldEvent.deletions.includes(deletion));
    }
    if (deletions.length) {
      let request = {
        m$DeleteItem: {
          m$ItemIds: {
            t$OccurrenceItemId: deletions.map(deletion => ({
              RecurringMasterId: aNewEvent.itemid,
              InstanceIndex: deletion,
            })),
          },
          DeleteType: "MoveToDeletedItems",
          SendMeetingCancellations: aNotify ? "SendToAllAndSaveCopy" : "SendToNone",
          SuppressReadReceipts: true,
        },
      };
      if (this.requestVersion < kExchange2013) {
        // SuppressReadReceipts did not exist in Exchange 2010
        delete request.m$DeleteItem.SuppressReadReceipts;
      }
      try {
        let response = await this.CallService(null, request); // ews.js
        if (response.errors && response.errors.length) { // some succeeded, some failed
          throw response.errors[0];
        }
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
  let request = {
    m$UpdateItem: {
      m$ItemChanges: {
        t$ItemChange: {},
      },
      ConflictResolution: "AlwaysOverwrite",
      MessageDisposition: "SaveOnly",
      SendMeetingInvitationsOrCancellations: aNotify ? "SendToChangedAndSaveCopy" : "SendToNone",
      SuppressReadReceipts: true,
    },
  };
  if (this.requestVersion < kExchange2013) {
    // SuppressReadReceipts did not exist in Exchange 2010
    delete request.m$UpdateItem.SuppressReadReceipts;
  }
  let changeKey = null;
  if (this.requestVersion < kExchange2013) {
    let fetch = {
      m$GetItem: {
        m$ItemShape: {
          t$BaseShape: "IdOnly",
        },
        m$ItemIds: {
          t$ItemId: {
            Id: aNewEvent.itemid,
          },
        },
      },
    };
    let response = await this.CallService(null, fetch); // ews.js
    changeKey = EWSAccount.GetItem(response.Items).ItemId.ChangeKey;
  }
  let itemChange = request.m$UpdateItem.m$ItemChanges.t$ItemChange;
  if (aNewEvent.index) {
    itemChange.t$OccurrenceItemId = {
      RecurringMasterId: aNewEvent.itemid,
      ChangeKey: changeKey,
      InstanceIndex: aNewEvent.index,
    };
    if (!changeKey) {
      delete itemChange.t$OccurrenceItemId.ChangeKey;
    }
  } else {
    itemChange.t$ItemId = {
      Id: aNewEvent.itemid,
      ChangeKey: changeKey,
    };
    if (!changeKey) {
      delete itemChange.t$ItemId.ChangeKey;
    }
  }
  let updates = {
    t$SetItemField: [],
    t$DeleteItemField: [],
  };
  let newEvent = EWSAccount.ConvertToEWS(aFolder, aNewEvent);
  let oldEvent = EWSAccount.ConvertToEWS(aFolder, aOldEvent);
  // Exchange stores the date in local time, so that changing the time zone
  // will change the UTC time, unless we remind Exchange of what it should be.
  if (aNewEvent.startTimeZone != aOldEvent.startTimeZone) {
    delete oldEvent.t$Start;
  }
  if (aNewEvent.endTimeZone != aOldEvent.endTimeZone) {
    delete oldEvent.t$End;
  }
  for (let key in kFieldMap) {
    if (JSON.stringify(newEvent[key]) != JSON.stringify(oldEvent[key])) {
      let namespace = kFieldMap[key] ? "item:" : aFolder == "tasks" ? "task:" : "calendar:";
      let field = {
        t$FieldURI: {
          FieldURI: namespace + key.slice(2),
        },
      };
      if (newEvent[key] == null) {
        updates.t$DeleteItemField.push(field);
      } else {
        if (aFolder == "calendar") {
          field.t$CalendarItem = {};
          field.t$CalendarItem[key] = newEvent[key];
        }
        if (aFolder == "tasks") {
          field.t$Task = {};
          field.t$Task[key] = newEvent[key];
        }
        updates.t$SetItemField.push(field);
      }
    }
  }
  request.m$UpdateItem.m$ItemChanges.t$ItemChange.t$Updates = updates;
  let response = await this.CallService(null, request); // ews.js
  let responseTag = kResponseMap[aNewEvent.participation];
  if (responseTag) {
    // If this is a recurring instance, we have to notify because
    // Lightning won't tell us the original master recurrence later.
    let isRecurrence = aNewEvent.index > 0;
    await this.RespondToInvitation(response.Items.CalendarItem.ItemId, responseTag,
      isRecurrence ? "SendAndSaveCopy" : "SaveOnly");
  }
}

/**
 * Update the participation for an invitation
 *
 * @param aEventId      {String}  The id of the invitation to update
 * @param aParticipaton {String}  The new participation status
 * @param aIsRecurrence {Boolean} Whether this is a recurrence instance
 */
EWSAccount.prototype.NotifyParticipation = async function(aEventId, aParticipation, aIsRecurrence) {
  if (aIsRecurrence) {
    return; // We don't support this after the fact, due to Lightning weirdness.
  }
  let responseTag = kResponseMap[aParticipation];
  if (!responseTag || responseTag == "t$DeclineItem") {
    // We don't support this after the fact, because the item is already gone.
    return;
  }
  let fetch = {
    m$GetItem: {
      m$ItemShape: {
        t$BaseShape: "IdOnly",
      },
      m$ItemIds: {
        t$ItemId: {
          Id: aEventId,
        }
      },
    },
  };
  let response = await this.CallService(null, fetch); // ews.js
  await this.RespondToInvitation(response.Items.CalendarItem.ItemId, responseTag, "SendAndSaveCopy");
}

/**
 * Respond to an invitation
 *
 * @param aEventId     {Object} The invitation to be responded to
 *          Id         {String}
 *          ChangeKey  {String}
 * @param aReponseTag  {String} The response to be made
 * @param aDisposition {String} Whether to notify the organiser
 *
 * aDisposition is either "SaveOnly" (don't notify) or "SendAndSaveCopy".
 */
EWSAccount.prototype.RespondToInvitation = async function(aEventId, aResponseTag, aNotify)
{
  if (aResponseTag == "t$DeclineItem") {
    // We have to notify because we won't have a second chance.
    aNotify = "SendAndSaveCopy";
  }
  let respond = {
    m$CreateItem: {
      m$Items: {},
      MessageDisposition: aNotify,
    },
  };
  respond.m$CreateItem.m$Items[aResponseTag] = {
    t$ReferenceItemId: aEventId,
  };
  try {
    await this.CallService(null, respond); // ews.js
  } catch (ex) {
    switch (ex.type) {
    case "ErrorCalendarIsCancelledForDecline":
      // Exchange deletes declined pending invitations.
      // For convenience, emulate this for cancelled invitations.
      return this.DeleteEvent(aEventId.Id, true);
    case "ErrorCalendarIsCancelledForTentative":
    case "ErrorCalendarIsCancelledForAccept":
      ex.report = false;
      throw ex;
    default:
      throw ex;
    }
  }
}

/**
 * Delete a calendar or task item
 *
 * @param aEventId {String} The id of the item to delete
 */
EWSAccount.prototype.DeleteEvent = async function(aEventId, aNotify) {
  let request = {
    m$DeleteItem: {
      m$ItemIds: {
        t$ItemId: {
          Id: aEventId,
        },
      },
      DeleteType: "MoveToDeletedItems",
      SendMeetingCancellations: aNotify ? "SendToAllAndSaveCopy" : "SendToNone",
      AffectedTaskOccurrences: "AllOccurrences",
      SuppressReadReceipts: true,
    },
  };
  if (this.requestVersion < kExchange2013) {
    // SuppressReadReceipts did not exist in Exchange 2010
    delete request.m$DeleteItem.SuppressReadReceipts;
  }
  try {
    await this.CallService(null, request); // ews.js
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
EWSAccount.prototype.GetFreeBusy = async function(aAttendee, aStartTime, aEndTime) {
  let query = {
    m$GetUserAvailabilityRequest: {
      m$MailboxDataArray: {
        t$MailboxData: {
          t$Email: {
            t$Address: aAttendee,
            t$AttendeeType: "Required",
          },
        },
      },
      t$FreeBusyViewOptions: {
        t$TimeWindow: {
          t$StartTime: aStartTime,
          t$EndTime: aEndTime,
        },
        t$RequestedView: "FreeBusy",
      },
    },
  };
  let response = await this.CallService(null, query); // ews.js
  return ensureArray(response.FreeBusyView.CalendarEventArray && response.FreeBusyView.CalendarEventArray.CalendarEvent).map(event => ({
    type: kBusyMap[event.BusyType],
    // Free/Busy is a special snowflake and gives us Zulu local time, not UTC.
    start: event.StartTime + "Z",
    end: event.EndTime + "Z",
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
    let account = await gEWSAccounts.get(aServerId);
    switch (aOperation) { // all these operations live in emails.js
    case "SyncEvents":
      return await account.SyncEvents(aParameters.delegate, aParameters.folder, aParameters.syncState);
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
}, "owl-ews");
