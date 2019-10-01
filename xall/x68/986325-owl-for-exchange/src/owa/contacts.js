
/**
 * Map { address book id {string} -> OWA server {OWAAccount}}
 */
OWAAccount.gAddressBooks = new Map();

/**
 * Converts a contact properties object to a fields object that holds the
 * fields in the format that CreatePersona and UpdatePersona need.
 *
 * @param aProperties {Object} The properties in Thunderbird format
 * @returns           {Fields} The properties in OWA format
 *
 * Note: This is a constructor. Use new OWA.Fields(...) to create it.
 * TODO make this a |class|
 */
OWAContactFields = function(aProperties)
{
  // You'd better not have $#$ in any of these fields (except Country).
  aProperties.HomeFullAddress = [aProperties.HomeAddress, aProperties.HomeCity, aProperties.HomeState, aProperties.HomeZipCode, aProperties.HomeCountry].join("$#$");
  aProperties.WorkFullAddress = [aProperties.WorkAddress, aProperties.WorkCity, aProperties.WorkState, aProperties.WorkZipCode, aProperties.WorkCountry].join("$#$");
  // The properties are strings so it's easier to concatenate them into a date.
  if (aProperties.BirthMonth && aProperties.BirthDay) {
    aProperties.BirthDate = `${aProperties.BirthYear || 1604}-${aProperties.BirthMonth.padStart(2, 0)}-${aProperties.BirthDay.padStart(2, 0)}T00:00:00Z`;
  }
  for (let path in this) {
    this[path] = aProperties[this[path]] || "";
  }
}

OWAContactFields.prototype = {
  PersonaGivenNames: "FirstName",
  PersonaSurnames: "LastName",
  PersonaNicknames: "NickName",
  PersonaEmails1: "PrimaryEmail",
  PersonaEmails1OriginalDisplayNames: "PrimaryEmail", // OWA requires this
  PersonaEmails2: "SecondEmail",
  PersonaEmails2OriginalDisplayNames: "SecondEmail", // OWA requires this
  PersonaHomeAddresses: "HomeFullAddress",
  PersonaPersonalHomePages: "WebPage2",
  PersonaBusinessAddresses: "WorkFullAddress",
  PersonaBusinessHomePages: "WebPage1",
  PersonaHomePhones: "HomePhone",
  PersonaBusinessPhoneNumbers: "WorkPhone",
  PersonaWorkFaxes: "FaxNumber",
  PersonaPagers: "PagerNumber",
  PersonaMobilePhones: "CellularNumber",
  PersonaTitles: "JobTitle",
  PersonaDepartments: "Department",
  PersonaCompanyNames: "Company",
  PersonaBodies: "Notes",
  PersonaImAddresses: "_AimScreenName",
  PersonaBirthdaysLocal: "BirthDate",
};

/// Used to compare fields when creating a contact.
const OWANoFields = new OWAContactFields({});

/**
 * Create or update a contact.
 *
 * @param aNewFields {OWAContactFields} The new values of the fields
 * @param aOldFields {OWAContactFields} The previous values of the fields
 * @param aPersonaId {String} The existing PersonaId to be updated
 * @returns          {String} The PersonaId if it was created or updated
 *
 * If the two sets of fields are identical then nothing happens. Otherwise
 * if no PersonaId is specified then a new contact is created on the server.
 */
OWAAccount.prototype.CreateOrUpdatePersona = async function(aNewFields, aOldFields, aPersonaId) {
  let type = aPersonaId ? "Update" : "Create";
  let request = {
    request: {
      __type: type + "PersonaJsonRequest:#Exchange",
      Header: {
        __type: "JsonRequestHeaders:#Exchange",
        RequestServerVersion: "Exchange2013",
      },
      Body: {
        __type: type + "PersonaRequest:#Exchange",
        PersonTypeString: "Person",
        PropertyUpdates: [],
      },
    },
  };
  if (aPersonaId) {
    request.request.Body.PersonaId = {
      __type: "ItemId:#Exchange",
      Id: aPersonaId,
    };
  } else {
    request.request.Body.PersonaId = null;
    request.request.Body.ParentFolderId = {
      __type: "TargetFolderId:#Exchange",
      BaseFolderId: {
        __type: "DistinguishedFolderId:#Exchange",
        Id: "contacts",
      },
    };
  }
  for (let path in aNewFields) {
    if (aNewFields[path] != aOldFields[path]) {
      request.request.Body.PropertyUpdates.push({
        __type: "PersonaPropertyUpdate:#Exchange",
        Path: {
          __type: "PropertyUri:#Exchange",
          FieldURI: path,
        },
        OldValue: aOldFields[path],
        NewValue: aNewFields[path],
      });
    }
  }
  if (!request.request.Body.PropertyUpdates.length) {
    return "";
  }
  let response = await this.CallService(type + "Persona", request);
  return response.PersonaId.Id;
}

/**
 * Send a contact creation or update to the OWA server.
 *
 * @param aCreate {Boolean} Whether this is a new contact
 * @param contact {Object}  The Thunderbird contact node
 */
OWAAccount.contactsListener = async function(aCreate, contact) {
  try {
    let addressBook = contact.parentId;
    let account = OWAAccount.gAddressBooks.get(addressBook);
    if (account) {
      let personaId = account.contacts.personaIds[contact.id];
      let oldFields = OWANoFields;
      if (!aCreate) {
        oldFields = account.contacts.fields[personaId];
        if (!oldFields) {
          // No fields, so this must be an error contact. Ignore it.
          return;
        }
      }
      let newFields = new OWAContactFields(contact.properties);
      personaId = await account.CreateOrUpdatePersona(newFields, oldFields, personaId);
      if (personaId) {
        // If the operation succeeded then save everything back to storage.
        account.contacts.fields[personaId] = newFields;
        account.contacts.ids[personaId] = contact.id;
        account.contacts.personaIds[contact.id] = personaId;
        browser.storage.local.set(account.storage);
      }
    }
  } catch (ex) {
    logError(ex);
  }
}

// Handle contact modifications.
browser.contacts.onCreated.addListener(OWAAccount.contactsListener.bind(OWAAccount, true));
browser.contacts.onUpdated.addListener(OWAAccount.contactsListener.bind(OWAAccount, false));
browser.contacts.onDeleted.addListener(async (addressBook, id) => {
  try {
    let account = OWAAccount.gAddressBooks.get(addressBook);
    if (account) {
      let personaId = account.contacts.personaIds[id];
      if (personaId) {
        delete account.contacts.ids[personaId];
        delete account.contacts.personaIds[id];
        browser.storage.local.set(account.storage);
        let request = {
          request: {
            __type: "DeletePersonasRequest:#Exchange",
            ItemIds: [{
              __type: "ItemId:#Exchange",
              Id: personaId,
            }],
          },
        };
        await OWA.CallService(account.serverID, "DeletePersonas", request);
      }
    }
  } catch (ex) {
    logError(ex);
  }
});

/**
 * Get the full details for a contact and update it in Thunderbird.
 *
 * @param aPersonaId {String}  The OWA persona id
 * @param aContact   {Contact} The Thunderbird contact object
 * @param aReadOnly  {Boolean} Whether the contact is read-only
 */
OWAAccount.prototype.FullContactUpdate = async function(aPersonaId, aContact, aReadOnly) {
  try {
    let properties = await this.GetPersona(aPersonaId);
    properties.Notes = await this.GetNotesForPersona(aPersonaId);
    if (!aReadOnly) {
      // Update the fields in cache so that we ignore the change notification.
      this.contacts.fields[aPersonaId] = new OWAContactFields(properties);
      browser.storage.local.set(this.storage);
    }
    this.UpdateContact(aContact, properties);
  } catch (ex) {
    logError(ex);
    browser.contacts.update(aContact.id, {
      _AimScreenName: ex.message,
      Notes: ex.stack,
    });
  }
}

/**
 * Updates a Thunderbird contact if any properties are out of date.
 *
 * @param aContact    {Contact}    The Thunderbird contact object
 *        id          {String}     The contact's id
 *        properties  {Object}     The current properties
 * @param aProperties {Properties} The desired properties
 *
 * Desired properties will be blank where existing properties are to be deleted.
 */
OWAAccount.prototype.UpdateContact = function(aContact, aProperties) {
  let changes = null;
  for (let prop in aProperties) {
    if (aProperties[prop] != (aContact.properties[prop] || "")) {
      if (!changes) {
        changes = {};
      }
      changes[prop] = aProperties[prop];
    }
  }
  return changes && browser.contacts.update(aContact.id, changes);
}

/**
 * Get the description for a mailing list and update it in Thunderbird.
 *
 * @param aPersonaId {String} The OWA persona id
 * @param aId        {String} The Thunderbird mailing list id
 */
OWAAccount.prototype.UpdateDescriptionForList = async function(aPersonaId, aId, aName) {
  try {
    let notes = await this.GetNotesForPersona(aPersonaId);
    await browser.mailingLists.update(aId, { name: aName, description: notes });
  } catch (ex) {
    logError(ex);
  }
}

/**
 * Updates the mapping between Personas and Contacts and removes stale entries.
 *
 * @param aManager     {Object}        browser.contacts or browser.mailingLists
 * @param aCache       {Object}        The stored contacts or lists mappings
 *   fields            {Object}        A mapping from persona ids to Fields
 *   ids               {Object}        A mapping from persona ids to ids
 *   personaIds        {Object}        A mapping from ids to persona ids
 * @param aAddressBook {Arrag[Object]} The Thunderbird contacts or lists
 * @param aPersonas    {Array[Object]} The OWA personas or distribution lists
 *
 * The cache contains mappings from Thunderbird ids to OWA PersonaIds and
 * vice versa for both contacts and distributon lists.
 */
OWAAccount.prototype.ReconcileDeletions = function(aManager, aCache, aAddressBook, aPersonas) {
  // Delete mappings for personas which don't exist locally.
  let ids = aAddressBook.map(node => node.id);
  for (let id in aCache.personaIds) {
    if (!ids.includes(id)) {
      delete aCache.fields[aCache.personaIds[id]];
      delete aCache.ids[aCache.personaIds[id]];
      delete aCache.personaIds[id];
    }
  }
  // Delete mappings for nodes which don't exist on the server.
  let personaIds = aPersonas.map(persona => persona.PersonaId);
  for (let personaId in aCache.ids) {
    if (!personaIds.includes(personaId)) {
      delete aCache.fields[personaId];
      delete aCache.personaIds[aCache.ids[personaId]];
      delete aCache.ids[personaId];
    }
  }
  // Delete nodes which don't have a mapping (probably deleted above).
  for (let id of ids) {
    if (!aCache.personaIds[id]) {
      aManager.delete(id).catch(logError);
    }
  }
}

/**
 * Downloads contacts from the OWA server and updates a local addressbook.
 *
 * @param aFilter   {String} The OWA GetPeopleFilters response element
 */
OWAAccount.prototype.ResyncContacts = async function(aFilter) {
  // These need to be outside the try/catch blocks.
  let addressBook, fullContactUpdates, persons, lists;
  let contactMap = {};
  let hostname = this.serverURL.hostname;
  // Try and find the address book we created last time. If it's no longer
  // there, or if we've never created an address book, then create one.
  try {
    let id = await browser.incomingServer.getStringValue(this.serverID, "addressBook");
    addressBook = await browser.addressBooks.get(id, true);
    for (let contact of addressBook.contacts) {
      contactMap[contact.id] = contact;
    }
  } catch (ex) {
    let id = await browser.addressBooks.create({name: aFilter.DisplayName});
    await browser.incomingServer.setStringValue(this.serverID, "addressBook", id);
    addressBook = { id };
  }
  try {
    fullContactUpdates = await browser.incomingServer.getBooleanValue(this.serverID, "full_contact_updates");
    ({persons, lists} = await this.FindPeople(aFilter, addressBook.id));
    this.storage = await browser.storage.local.get(hostname); // TODO FIXME make this contacts only
    if (!this.storage[hostname]) {
      this.storage[hostname] = {
        contacts: { fields: {}, ids: {}, personaIds: {} },
        mailingLists: { fields: {}, ids: {}, personaIds: {} },
      };
    }
    // XXX For old profiles
    if (!this.storage[hostname].contacts.fields) {
      this.storage[hostname].contacts.fields = {};
    }
    if (!this.storage[hostname].mailingLists.fields) {
      this.storage[hostname].mailingLists.fields = {};
    }
    this.contacts = this.storage[hostname].contacts;
    this.mailingLists = this.storage[hostname].mailingLists;
    // Stop listening to contact updates.
    OWAAccount.gAddressBooks.delete(addressBook.id);
    // Delete any stale data.
    this.ReconcileDeletions(browser.contacts, this.contacts, addressBook.contacts || [], persons);
    this.ReconcileDeletions(browser.mailingLists, this.mailingLists, addressBook.mailingLists || [], lists);
  } catch (ex) {
    browser.contacts.create(addressBook.id, null, {
      DisplayName: ex.message,
      Notes: ex.stack,
    });
    throw ex;
  }
  // Update or create contacts from the server's list of persons.
  for (let properties of persons) {
    try {
      let id = this.contacts.ids[properties.PersonaId];
      let contact = contactMap[id];
      if (!contact) {
        id = await browser.contacts.create(addressBook.id, null, properties);
        contact = { id, properties };
        // Also track the new mapping.
        this.contacts.ids[properties.PersonaId] = id;
        this.contacts.personaIds[id] = properties.PersonaId;
      } else if (!fullContactUpdates) {
        // We're not going to download the full contact details,
        // so we need to ensure that the contact is up-to-date now.
        await this.UpdateContact(contact, properties);
      }
      this.contacts.fields[properties.PersonaId] = new OWAContactFields(properties);
      if (fullContactUpdates) {
        // This applies for both new and existing contacts.
        this.FullContactUpdate(properties.PersonaId, contact, false);
      }
    } catch (ex) {
      logError(ex);
      browser.contacts.create(addressBook.id, null, {
        DisplayName: ex.message,
        Notes: ex.stack,
      });
    }
  }
  // Update or create mailing lists from the server's lists.
  for (let list of lists) {
    try {
      let id = this.mailingLists.ids[list.PersonaId];
      if (id) {
        let existing = addressBook.mailingLists.find(list => list.id == id);
        browser.mailingLists.update(id, { name: list.name, description: existing.description });
      } else {
        id = await browser.mailingLists.create(addressBook.id, { name: list.name });
        // Also track the new mapping.
        this.mailingLists.ids[list.PersonaId] = id;
        this.mailingLists.personaIds[id] = list.PersonaId;
      }
      this.UpdateDescriptionForList(list.PersonaId, id, list.name);
      // Reconcile the list's members.
      let members = list.members;
      for (let member of await browser.mailingLists.listMembers(id)) {
        let index = members.indexOf(this.contacts.personaIds[member.id]);
        if (index < 0) {
          await browser.mailingLists.removeMember(id, member.id);
        } else {
          // This is an existing member, so we don't need to add it.
          members.splice(index, 1);
        }
      }
      for (let member of members) {
        await browser.mailingLists.addMember(id, this.contacts.ids[member]);
      }
    } catch (ex) {
      logError(ex);
      browser.contacts.create(addressBook.id, null, {
        DisplayName: ex.message,
        Notes: ex.stack,
      });
    }
  }
  // Save our updated mappings.
  browser.storage.local.set(this.storage);
  // Start listening to contact updates.
  OWAAccount.gAddressBooks.set(addressBook.id, this);
}

/**
 * Downloads the GAL from the OWA server and updates a local addressbook.
 *
 * @param aFilter   {String} The OWA GetPeopleFilters response element
 */
OWAAccount.prototype.DownloadGAL = async function(aFilter) {
  // These need to be outside the try/catch blocks.
  let addressBook, fullGALUpdates, persons, lists, personaIds, contactMap;
  // Try and find the address book we created last time. If it's no longer
  // there, or if we've never created an address book, then create one.
  try {
    let id = await browser.incomingServer.getStringValue(this.serverID, "GAL");
    addressBook = await browser.addressBooks.get(id, true);
  } catch (ex) {
    let id = await browser.addressBooks.create({name: aFilter.DisplayName});
    await browser.incomingServer.setStringValue(this.serverID, "GAL", id);
    addressBook = { id: id, contacts: [], mailingLists: [] };
  }
  try {
    // Whether to get all details of all contacts in the GAL. Do you need the phone numbers?
    // Needs one server request per contact.
    fullGALUpdates = await browser.incomingServer.getBooleanValue(this.serverID, "GAL_details");
    ({persons, lists} = await this.FindPeople(aFilter, addressBook.id));
    personaIds = persons.map(persona => persona.PersonaId);
    contactMap = {};
    for (let contact of addressBook.contacts) {
      if (personaIds.includes(contact.properties.PersonaId)) {
        contactMap[contact.properties.PersonaId] = contact;
      } else {
        browser.contacts.delete(contact.id);
      }
    }
    for (let list of addressBook.mailingLists) {
      browser.mailingLists.delete(list.id);
    }
  } catch (ex) {
    browser.contacts.create(addressBook.id, null, {
      DisplayName: ex.message,
      Notes: ex.stack,
    });
    throw ex;
  }
  // Update or create contacts from the server's list of persons.
  for (let properties of persons) {
    try {
      let contact = contactMap[properties.PersonaId];
      if (!contact) {
        id = await browser.contacts.create(addressBook.id, null, properties);
        contactMap[properties.PersonaId] = contact = { id, properties };
      } else if (!fullGALUpdates) {
        // We're not going to download the full contact details,
        // so we need to ensure that the contact is up-to-date now.
        await this.UpdateContact(contact, properties);
      }
      if (fullGALUpdates) {
        // This applies for both new and existing contacts.
        this.FullContactUpdate(properties.PersonaId, contact, true);
      }
    } catch (ex) {
      logError(ex);
      browser.contacts.create(addressBook.id, null, {
        DisplayName: ex.message,
        Notes: ex.stack,
      });
    }
  }
  // Create mailing lists from the server's lists.
  for (let list of lists) {
    try {
      let id = await browser.mailingLists.create(addressBook.id, { name: list.name });
      this.UpdateDescriptionForList(list.PersonaId, id, list.name);
      for (let member of list.members) {
        browser.mailingLists.addMember(id, contactMap[member].id);
      }
    } catch (ex) {
      logError(ex);
      browser.contacts.create(addressBook.id, null, {
        DisplayName: ex.message,
        Notes: ex.stack,
      });
    }
  }
}

OWAAccount.prototype.ResyncAddressBooks = async function() {
  let response = await this.CallService("GetPeopleFilters", {});
  let contacts = response.find(filter => !filter.IsReadOnly);
  if (contacts) {
    let identity = await browser.incomingServer.getIdentity(this.serverID);
    contacts.DisplayName = identity.email.slice(identity.email.indexOf("@") + 1) + " " + contacts.DisplayName;
    noAwait(this.ResyncContacts(contacts), logError);
  }

  let enableGAL = await browser.incomingServer.getBooleanValue(this.serverID, "GAL_enabled");
  if (enableGAL) {
    let GAL = response.find(filter => filter.FolderId.__type == "AddressListId:#Exchange");
    if (GAL) {
      noAwait(this.DownloadGAL(GAL), logError);
    }
  }
}

/**
 * Converts an OWA Persona to Thunderbird contact properties.
 *
 * @param aPersona {Object} An OWA Persona
 * @returns        {Object} Thunderbird contact properties.
 *
 * Note: This function is passed as a callback, so it has no `this`.
 */
OWAAccount.convertPersona = function(aPersona) {
  let homeAddress = aPersona.HomeAddressesArray && aPersona.HomeAddressesArray[0].Value;
  let workAddress = aPersona.BusinessAddressesArray && aPersona.BusinessAddressesArray[0].Value;
  let birthday = aPersona.BirthdaysLocalArray && aPersona.BirthdaysLocalArray[0].Value;
  return {
    PersonaId: aPersona.PersonaId.Id,
    FirstName: aPersona.GivenName || "",
    LastName: aPersona.Surname || "",
    DisplayName: aPersona.DisplayName || "",
    NickName: aPersona.Nickname || "",
    PrimaryEmail: aPersona.EmailAddress && aPersona.EmailAddress.EmailAddress || "",
    SecondEmail: aPersona.EmailAddresses && aPersona.EmailAddresses[1] && aPersona.EmailAddresses[1].EmailAddress || "",
    HomeAddress: homeAddress && homeAddress.Street || "",
    HomeCity: aPersona.HomeCity || "",
    HomeState: homeAddress && homeAddress.State || "",
    HomeZipCode: homeAddress && homeAddress.PostalCode || "",
    HomeCountry: homeAddress && homeAddress.Country || "",
    WebPage2: aPersona.PersonalHomePagesArray && aPersona.PersonalHomePagesArray[0].Value || "",
    WorkAddress: workAddress && workAddress.Street || "",
    WorkCity: aPersona.WorkCity || "",
    WorkState: workAddress && workAddress.State || "",
    WorkZipCode: workAddress && workAddress.PostalCode || "",
    WorkCountry: workAddress && workAddress.Country || "",
    WebPage1: aPersona.BusinessHomePagesArray && aPersona.BusinessHomePagesArray[0].Value || "",
    HomePhone: aPersona.HomePhonesArray && aPersona.HomePhonesArray[0].Value.Number || "",
    WorkPhone: aPersona.BusinessPhoneNumbersArray && aPersona.BusinessPhoneNumbersArray[0].Value.Number || "",
    FaxNumber: aPersona.WorkFaxesArray && aPersona.WorkFaxesArray[0].Value.Number || "",
    PagerNumber: aPersona.PagersArray && aPersona.PagersArray[0].Value.Number || "",
    CellularNumber: aPersona.MobilePhonesArray && aPersona.MobilePhonesArray[0].Value.Number || "",
    JobTitle: aPersona.Title || "",
    Department: aPersona.Department || "",
    Company: aPersona.CompanyName || "",
    Notes: aPersona.Notes || "",
    _AimScreenName: aPersona.ImAddress || "",
    BirthYear: birthday ? birthday.slice(0, 4) : "",
    BirthMonth: birthday ? birthday.slice(5, 7) : "",
    BirthDay: birthday ? birthday.slice(8, 10) : "",
  };
}

/**
 * Enumerate all the user's contacts and lists
 *
 * @param aFilter   {Object} The OWA GetPeopleFilters response element
 * @param aAddrBook {String} The address book to add error cards to
 * @returns         {Object}
 *   persons        {Array[Object]} An array of contact details
 *     PersonaId    {String}        The OWA Id of the contact
 *     *            {String}        Other addrbook properties
 *   lists          {Array[Object]} An array of mailing lists
 *    name          {String}        The list's name
 *    members       {Array[String]} An array of member persona ids
 */
OWAAccount.prototype.FindPeople = async function(aFilter, aAddrBook) {
  let query = {
    __type: "FindPeopleJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "FindPeopleRequest:#Exchange",
      IndexedPageItemView: {
        __type: "IndexedPageView:#Exchange",
        BasePoint: "Beginning",
        Offset: 0,
        MaxEntriesReturned: 100,
      },
      ParentFolderId: {
        __type: "TargetFolderId:#Exchange",
        BaseFolderId: aFilter.FolderId,
      },
      PersonaShape: {
        __type: "PersonaResponseShape:#Exchange",
        BaseShape: "Default",
      },
      QueryString: null,
      SearchPeopleSuggestionIndex: false,
      ShouldResolveOneOffEmailAddress: false,
    },
  };
  let group = {
    getGroupInfoRequest: {
      __type: "GetGroupInfoRequest:#Exchange",
      ItemId: {
        __type: "ItemId:#Exchange",
        //Id:
      },
      Paging: {
        __type: "IndexedPageView:#Exchange",
        BasePoint: "Beginning",
        MaxEntriesReturned: 10,
        Offset: 0,
      },
      ParentFolderId: {
        __type: "TargetFolderId:#Exchange",
        BaseFolderId: null,
      },
      ResultSet: 2,
    },
  };
  let persons = [];
  let lists = [];
  // First enumerate all the contacts and lists.
  for (;;) {
    let response = await this.CallService("FindPeople", query); // owa.js
    for (let result of response.ResultSet) {
      // This is an addressible contact or distribution list.
      // We don't need to manually expand addressible distribution lists,
      // so we just treat them as if they were contacts.
      if (result.EmailAddress && result.EmailAddress.EmailAddress) {
        persons.push(result);
      } else if (result.PersonaTypeString == "DistributionList") {
        lists.push(result);
      } else {
        persons.push(result);
      }
    }
    // OWA doesn't give us a direct reading of when we're finished.
    if (response.ResultSet.length < query.Body.IndexedPageItemView.MaxEntriesReturned) {
      break;
    }
    query.Body.IndexedPageItemView.Offset += query.Body.IndexedPageItemView.MaxEntriesReturned;
  }
  let itemIds = {};
  // Collect the itemIds we need to identify the mailing list members.
  for (let persona of persons) {
    if (persona.EmailAddress && persona.EmailAddress.ItemId) {
      itemIds[persona.EmailAddress.ItemId.Id] = persona.PersonaId.Id;
    }
  }
  // Get the persona ids of the members of all the lists.
  for (let i = 0; i < lists.length; i++) {
    try {
      group.getGroupInfoRequest.ItemId.Id = lists[i].EmailAddress.ItemId.Id;
      lists[i] = { PersonaId: lists[i].PersonaId.Id, name: lists[i].DisplayName || "", members: [] };
      group.getGroupInfoRequest.Paging.Offset = 0;
      for (;;) {
        let response = await this.CallService("GetGroupInfo", group); // owa.js
        if (!response.Members) {
          break;
        }
        for (let member of response.Members) {
          if (member.EmailAddress && member.EmailAddress.ItemId) {
            let personaId = itemIds[member.EmailAddress.ItemId.Id];
            if (personaId)
              lists[i].members.push(personaId);
          }
        }
        if (response.Members.length < group.getGroupInfoRequest.Paging.MaxEntriesReturned) {
          break;
        }
        group.getGroupInfoRequest.Paging.Offset += group.getGroupInfoRequest.Paging.MaxEntriesReturned;
      }
    } catch (ex) {
      logError(ex);
      lists.splice(i--, 1);
      browser.contacts.create(aAddrBook, null, {
        DisplayName: ex.message,
        Notes: ex.stack,
      });
    }
  }
  persons = persons.map(OWAAccount.convertPersona);
  return { persons, lists };
}

/**
 * Get the details of an existing OWA Persona.
 *
 * @param aPersonaId {String} The PersonaId to get the details.
 * @returns          {Object} Thunderbird properties for the persona.
 */
OWAAccount.prototype.GetPersona = async function(aPersonaId) {
  let fetch = {
    __type: "GetPersonaJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "GetPersonaRequest:#Exchange",
      PersonaId: {
        __type: "ItemId:#Exchange",
        Id: aPersonaId,
      },
    },
  };
  let persona = await this.CallService("GetPersona", fetch);
  return OWAAccount.convertPersona(persona.Persona);
}

/**
 * Get the notes of an existing OWA Persona.
 *
 * @param aPersonaId {String} The PersonaId to get the notes.
 * @returns          {String} The notes, or the empty string if there are none.
 */
OWAAccount.prototype.GetNotesForPersona = async function(aPersonaId) {
  let request = {
    getNotesForPersonaRequest: {
      __type: "GetNotesForPersonaRequest:#Exchange",
      MaxBytesToFetch: 512000,
      PersonaId: aPersonaId,
    }
  };
  let notes = await this.CallService("GetNotesForPersona", request);
  return notes.PersonaWithNotes && notes.PersonaWithNotes.BodiesArray[0].Value.Value || "";
}
