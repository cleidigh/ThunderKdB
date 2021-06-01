// The ExtendedFieldURI for the PersonalHomePage property.
// We're assuming that this is the only extended field we use.
const kPersonalHomePage = {
  PropertyTag: "0x3a50",
  PropertyType: "String",
};

/**
 * Map { address book id {string} -> EWS server {EWSAccount}}
 */
EWSAccount.gAddressBooks = new Map();

/**
 * Turns a Thunderbird contact into EWS fields.
 *
 * @param aProperties {Object} The Thunderbird contact's properties
 * @returns           {Object} The EWS fields
 *
 * The fields are an intermediate format which can be readily transformed
 * into either a creation or an update request as desired.
 */
EWSAccount.convertProperties = function(aProperties) {
  let fields = {
    t$Body: aProperties.Notes ? {
      BodyType: "Text",
      _TextContent_: aProperties.Notes,
    } : "",
    t$ExtendedProperty: aProperties.WebPage2 ? {
      t$ExtendedFieldURI: kPersonalHomePage,
      t$Value: aProperties.WebPage2,
    } : "",
    t$DisplayName: aProperties.DisplayName || "",
    t$GivenName: aProperties.FirstName || "",
    t$Nickname: aProperties.NickName || "",
    t$CompanyName: aProperties.Company || "",
    // These are placeholders so that the fields are created in schema order.
    // The appropriate fields are filled in below.
    t$Emailaddress$EmailAddress1: "",
    t$Emailaddress$EmailAddress2: "",
    t$Emailaddress$EmailAddress3: "",
    t$PhysicalAddress$Street$Home: aProperties.HomeAddress || "",
    t$PhysicalAddress$City$Home: aProperties.HomeCity || "",
    t$PhysicalAddress$State$Home: aProperties.HomeState || "",
    t$PhysicalAddress$CountryOrRegion$Home: aProperties.HomeCountry || "",
    t$PhysicalAddress$PostalCode$Home: aProperties.HomeZipCode || "",
    t$PhysicalAddress$Street$Business: aProperties.WorkAddress || "",
    t$PhysicalAddress$City$Business: aProperties.WorkCity || "",
    t$PhysicalAddress$State$Business: aProperties.WorkState || "",
    t$PhysicalAddress$CountryOrRegion$Business: aProperties.WorkCountry || "",
    t$PhysicalAddress$PostalCode$Business: aProperties.WorkZipCode || "",
    t$PhoneNumber$HomePhone: aProperties.HomePhone || "",
    t$PhoneNumber$BusinessPhone: aProperties.WorkPhone || "",
    t$PhoneNumber$BusinessFax: aProperties.FaxNumber || "",
    t$PhoneNumber$Pager: aProperties.PagerNumber || "",
    t$PhoneNumber$MobilePhone: aProperties.CellularNumber || "",
    // The properties are strings so it's easier to concatenate them into a date.
    t$Birthday: aProperties.BirthMonth && aProperties.BirthDay ? `${aProperties.BirthYear || 1604}-${aProperties.BirthMonth.padStart(2, 0)}-${aProperties.BirthDay.padStart(2, 0)}T00:00:00Z` : "",
    t$BusinessHomePage: aProperties.WebPage1 || "",
    t$Department: aProperties.Department || "",
    t$ImAddress$ImAddress1: aProperties._AimScreenName || "",
    t$JobTitle: aProperties.JobTitle || "",
    t$Surname: aProperties.LastName || "",
  };
  // Use the original key, if we have it.
  let primaryEmailKey = aProperties.PrimaryEmailKey || "EmailAddress1";
  fields["t$EmailAddress$" + primaryEmailKey] = aProperties.PrimaryEmail || "";
  let primaryNumber = parseInt(primaryEmailKey.replace("EmailAddress", ""));
  let secondEmailKey = aProperties.SecondEmailKey ? aProperties.SecondEmailKey : `EmailAddress${  primaryNumber ? primaryNumber + 1 : 2 }`;
  fields["t$EmailAddress$" + secondEmailKey] = aProperties.SecondEmail || "";
  return fields;
}

/**
 * In EWS, contact update and creation APIs need different data formats.
 *
 * We internally use update format and this function converts it
 * into the create format.
 * Merge EWS fields into an EWS contact suitable for creation.
 *
 * @param aFields {Object} EWS fields
 * @returns       {Object} An EWS contact
 *
 * For example, if the flattened contact has the fields:
 *
 * t$PhysicalAddress$State$Home: "OR",
 * t$PhysicalAddress$CountryOrRegion$Home: "USA",
 * t$PhysicalAddress$State$Business: "CA",
 * t$PhysicalAddress$CountryOrRegion$Business: "USA",
 *
 * then the merged contact will have the field:
 *
 * t$PhysicalAddresses: {
 *   t$Entry: [{
 *     Key: "Home",
 *     t$State: "OR",
 *     t$CountryOrRegion: "USA",
 *   }, {
 *     Key: "Business",
 *     t$State: "CA",
 *     t$CountryOrRegion: "USA",
 *   }],
 * },
 */
EWSAccount.mergeFields = function(aFields) {
  let result = {};
  for (let key in aFields) {
    if (aFields[key]) {
      let parts = key.split("$");
      if (parts.length > 2) {
        let fieldIndex = parts.pop();
        let tag = "t$" + parts[1];
        let subtag = parts[2] ? "t$" + parts[2] : "_TextContent_";
        tag += tag.endsWith("s") ? "es" : "s"; // indexed fields are plural
        if (!result[tag]) {
          result[tag] = {
            t$Entry: [],
          };
        }
        let entry = result[tag].t$Entry.find(entry => entry.Key == fieldIndex);
        if (!entry) {
          entry = {
            Key: fieldIndex,
          };
          result[tag].t$Entry.push(entry);
        }
        entry[subtag] = aFields[key];
      } else {
        result[key] = aFields[key];
      }
    }
  }
  return result;
}

// Handle contact modifications.
browser.contacts.onCreated.addListener(async contact => {
  try {
    let addressBook = contact.parentId;
    let account = EWSAccount.gAddressBooks.get(addressBook);
    if (account) {
      let fields = EWSAccount.convertProperties(contact.properties);
      let create = {
        m$CreateItem: {
          m$Items: {
            t$Contact: EWSAccount.mergeFields(fields),
          },
        },
      };
      let response = await account.CallService(null, create); // ews.js
      let itemId = response.Items.Contact.ItemId.Id;
      let changeKey = response.Items.Contact.ItemId.ChangeKey;
      // Save everything back to storage.
      account.contacts.fields[itemId] = fields;
      account.contacts.ids[itemId] = contact.id;
      account.contacts.itemIds[contact.id] = itemId;
      account.contacts.changeKeys[itemId] = changeKey;
      browser.storage.local.set(account.storage);
      // Update the change key on the Thunderbird contact too.
      browser.contacts.update(contact.id, { ChangeKey: changeKey });
    }
  } catch (ex) {
    ShowContactWriteFailure(ex);
  }
});
browser.contacts.onUpdated.addListener(async contact => {
  try {
    let addressBook = contact.parentId;
    let account = EWSAccount.gAddressBooks.get(addressBook);
    if (account) {
      let itemId = account.contacts.itemIds[contact.id];
      let changeKey = account.contacts.changeKeys[itemId];
      let oldFields = account.contacts.fields[itemId];
      if (!oldFields) {
        // This must be an error contact. Ignore it.
        return;
      }
      let request = {
        m$UpdateItem: {
          m$ItemChanges: {
            t$ItemChange: {
              t$ItemId: {
                Id: itemId,
                ChangeKey: changeKey,
              },
              t$Updates: {
                t$SetItemField: [],
                t$DeleteItemField: [],
              },
            },
          },
          ConflictResolution: "AlwaysOverwrite",
        },
      };
      let newFields = EWSAccount.convertProperties(contact.properties);
      if (!deepCompareUnordered(newFields, oldFields)) {
        let updates = request.m$UpdateItem.m$ItemChanges.t$ItemChange.t$Updates;
        for (let key in newFields) {
          if (!deepCompareUnordered(newFields[key], oldFields[key])) {
            let value = newFields[key];
            let field = {};
            if (key == "t$ExtendedProperty") {
              field.t$ExtendedFieldURI = kPersonalHomePage;
            } else {
              let parts = key.split("$");
              parts[0] = key == "t$Body" ? "item" : "contacts";
              if (parts.length > 2) {
                let fieldIndex = parts.pop();
                field.t$IndexedFieldURI = {
                  FieldURI: parts.join(":"),
                  FieldIndex: fieldIndex,
                };
                if (value) {
                  let subtag = parts[2] ? "t$" + parts[2] : "_TextContent_";
                  let entry = {
                    Key: fieldIndex,
                  };
                  entry[subtag] = value;
                  value = {
                    t$Entry: entry,
                  };
                  key = "t$" + parts[1];
                  key += key.endsWith("s") ? "es" : "s"; // indexed fields are plural
                }
              } else {
                field.t$FieldURI = {
                  FieldURI: parts.join(":"),
                };
              }
            }
            if (!value) {
              updates.t$DeleteItemField.push(field);
            } else {
              field.t$Contact = {};
              field.t$Contact[key] = value;
              updates.t$SetItemField.push(field);
            }
          }
        }
        let response = await account.CallService(null, request); // ews.js
        let changeKey = response.Items.Contact.ItemId.ChangeKey;
        // Save everything back to storage.
        account.contacts.fields[itemId] = newFields;
        account.contacts.changeKeys[itemId] = changeKey;
        browser.storage.local.set(account.storage);
        // Update the change key on the Thunderbird contact too.
        browser.contacts.update(contact.id, { ChangeKey: changeKey });
      }
    }
  } catch (ex) {
    ShowContactWriteFailure(ex);
  }
});
browser.contacts.onDeleted.addListener(async (addressBook, id) => {
  try {
    let account = EWSAccount.gAddressBooks.get(addressBook);
    if (account) {
      let itemId = account.contacts.itemIds[id];
      if (itemId) {
        delete account.contacts.ids[itemId];
        delete account.contacts.itemIds[id];
        browser.storage.local.set(account.storage);
        let request = {
          m$DeleteItem: {
            m$ItemIds: {
              t$ItemId: {
                Id: itemId,
              },
            },
            DeleteType: "MoveToDeletedItems",
          },
        };
        await account.CallService(null, request);
      }
    }
  } catch (ex) {
    if (ex.type == "ErrorItemNotFound") {
      // Already deleted. Ignore.
    } else {
      ShowContactWriteFailure(ex);
    }
  }
});

/**
 * Turns an array of entries into a dictionary based on the entry's Key.
 *
 * @param aCategory {Object?} The category with the Entry value(s)
 * @returns         {Object}  The dictionary of values
 */
EWSAccount.prototype.explodeEntry = function(aCategory) {
  let result = {};
  for (let entry of ensureArray(aCategory && aCategory.Entry)) {
    result[entry.Key] = entry;
  }
  return result;
}

/**
 * Turn an EWS Contact into an TB addressbook-compatible contact.
 *
 * @param aContact {Object}  The EWS Contact
 * @returns        {Object}  The contact
 *   ItemId        {String}  The EWS id of the contact
 *   ChangeKey     {String}  The EWS change key of the contact
 *   *             {String?} Other addressbook properties
 *
 * Note: The returned object includes all supported property keys,
 * but the values for missing properties will be empty.
 * This is in case the value was removed from an existing contact.
 */
EWSAccount.prototype.convertContact = function(aContact) {
  aContact.EmailAddresses = ensureArray(aContact.EmailAddresses && aContact.EmailAddresses.Entry).filter(entry => !entry.RoutingType || entry.RoutingType == "SMTP");
  aContact.PhysicalAddresses = this.explodeEntry(aContact.PhysicalAddresses);
  aContact.PhoneNumbers = this.explodeEntry(aContact.PhoneNumbers);
  return {
    ItemId: aContact.ItemId && aContact.ItemId.Id || "",
    ChangeKey: aContact.ItemId && aContact.ItemId.ChangeKey || "",
    FirstName: aContact.GivenName || "",
    LastName: aContact.Surname || "",
    DisplayName: aContact.DisplayName || "",
    NickName: aContact.Nickname || "",
    PrimaryEmail: aContact.EmailAddresses[0] && aContact.EmailAddresses[0].Value || "",
    PrimaryEmailKey: aContact.EmailAddresses[0] && aContact.EmailAddresses[0].Key || "",
    SecondEmail: aContact.EmailAddresses[1] && aContact.EmailAddresses[1].Value || "",
    SecondEmailKey: aContact.EmailAddresses[1] && aContact.EmailAddresses[1].Key || "",
    HomeAddress: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.Street || "",
    HomeCity: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.City || "",
    HomeState: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.State || "",
    HomeZipCode: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.PostalCode || "",
    HomeCountry: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.CountryOrRegion || "",
    WebPage2: aContact.ExtendedProperty && aContact.ExtendedProperty.Value || "", // this is normally an array, but we're only requesting one property
    WorkAddress: aContact.PhysicalAddresses.Business && aContact.PhysicalAddresses.Business.Street || "",
    WorkCity: aContact.PhysicalAddresses.Business && aContact.PhysicalAddresses.Business.City || "",
    WorkState: aContact.PhysicalAddresses.Business && aContact.PhysicalAddresses.Business.State || "",
    WorkZipCode: aContact.PhysicalAddresses.Business && aContact.PhysicalAddresses.Business.PostalCode || "",
    WorkCountry: aContact.PhysicalAddresses.Business && aContact.PhysicalAddresses.Business.CountryOrRegion || "",
    WebPage1: aContact.BusinessHomePage || "",
    HomePhone: aContact.PhoneNumbers.HomePhone && aContact.PhoneNumbers.HomePhone.Value || "",
    WorkPhone: aContact.PhoneNumbers.BusinessPhone && aContact.PhoneNumbers.BusinessPhone.Value || "",
    FaxNumber: aContact.PhoneNumbers.BusinessFax && aContact.PhoneNumbers.BusinessFax.Value || "",
    PagerNumber: aContact.PhoneNumbers.Pager && aContact.PhoneNumbers.Pager.Value || "",
    CellularNumber: aContact.PhoneNumbers.MobilePhone && aContact.PhoneNumbers.MobilePhone.Value || "",
    JobTitle: aContact.JobTitle || "",
    Department: aContact.Department || "",
    Company: aContact.CompanyName || "",
    Notes: aContact.Body && aContact.Body.Value || "",
    _AimScreenName: aContact.ImAddresses && aContact.ImAddresses.Entry && aContact.ImAddresses.Entry.Value || "",
    BirthYear: aContact.Birthday ? aContact.Birthday.slice(0, 4) : "",
    BirthMonth: aContact.Birthday ? aContact.Birthday.slice(5, 7) : "",
    BirthDay: aContact.Birthday ? aContact.Birthday.slice(8, 10) : "",
  };
}

/**
 * Updates the mapping between Items and Contacts and removes stale entries.
 *
 * @param aManager     {Object}        browser.contacts or browser.mailingLists
 * @param aCache       {inout Object}  The stored contacts or lists mappings
 *   ids               {Object}        A mapping from item ids to ids
 *   itemIds           {Object}        A mapping from ids to item ids
 * @param aAddressBook {Array[Object]} The Thunderbird contacts or lists
 * @param aItems       {Array[Object]} The EWS items
 *
 * The cache contains mappings from Thunderbird ids to EWS ItemIds and
 * vice versa for both contacts and distributon lists.
 */
EWSAccount.prototype.ReconcileDeletions = function(aManager, aCache, aAddressBook, aItems) {
  // Delete mappings for items which don't exist locally.
  let ids = aAddressBook.map(node => node.id);
  for (let id in aCache.itemIds) {
    if (!ids.includes(id)) {
      delete aCache.fields[aCache.itemIds[id]];
      delete aCache.changeKeys[aCache.itemIds[id]];
      delete aCache.ids[aCache.itemIds[id]];
      delete aCache.itemIds[id];
    }
  }
  // Delete mappings for nodes which don't exist on the server.
  let itemIds = aItems.map(item => item.ItemId.Id);
  for (let itemId in aCache.ids) {
    if (!itemIds.includes(itemId)) {
      delete aCache.fields[itemId];
      delete aCache.changeKeys[itemId];
      delete aCache.itemIds[aCache.ids[itemId]];
      delete aCache.ids[itemId];
    }
  }
  // Delete nodes which don't have a mapping (probably deleted above).
  for (let id of ids) {
    if (!aCache.itemIds[id]) {
      aManager.delete(id).catch(logError);
    }
  }
}

/**
 * Downloads contacts from the EWS server and updates a local addressbook.
 *
 * @param aMsgWindow {Integer}
 */
EWSAccount.prototype.ResyncContacts = async function(aMsgWindow) {
  let request = {
    m$GetFolder: {
      m$FolderShape: {
        t$BaseShape: "Default",
      },
      m$FolderIds: {
        t$DistinguishedFolderId: [{
          Id: "contacts",
        }],
      },
    },
  };
  let query = {
    m$FindItem: {
      m$ItemShape: {
        t$BaseShape: "IdOnly",
      },
      m$IndexedPageItemView: {
        BasePoint: "Beginning",
        Offset: 0,
      },
      m$ParentFolderIds: {
        t$DistinguishedFolderId: [{
          Id: "contacts",
        }],
      },
      Traversal: "Shallow",
    },
  };
  let fetch = {
    m$GetItem: {
      m$ItemShape: {
        t$BaseShape: "Default",
        t$BodyType: "Text",
        t$AdditionalProperties: {
          t$FieldURI: [{
            FieldURI: "contacts:Birthday",
          }, {
            FieldURI: "contacts:BusinessHomePage",
          }, {
            FieldURI: "contacts:Department",
          }, {
            FieldURI: "contacts:DisplayName",
          }, {
            FieldURI: "contacts:GivenName",
          }, {
            FieldURI: "contacts:Nickname",
          }, {
            FieldURI: "contacts:Surname",
          }, {
            FieldURI: "item:Body", // contacts:Notes requires 2010_SP2
          }],
          // For some reason BusinessHomePage (0x3a51) has a FieldURI,
          // but PersonalHomePage (0x3a50) does not, so we use the tag.
          t$ExtendedFieldURI: [kPersonalHomePage],
        },
      },
      m$ItemIds: {
        t$ItemId: [{
          //Id:
        }],
      },
    },
  };
  // These need to be outside the try/catch blocks.
  let addressBook;
  let hostname;
  // Try and find the address book we created last time. If it's no longer
  // there, or if we've never created an address book, then create one.
  try {
    let id = await browser.incomingServer.getStringValue(this.serverID, "addressBook");
    addressBook = await browser.addressBooks.get(id, true);
  } catch (ex) {
    let response = await this.CallService(aMsgWindow, request); // ews.js
    let identity = await browser.incomingServer.getIdentity(this.serverID);
    let name = identity.email.slice(identity.email.indexOf("@") + 1) + " " + response.Folders.ContactsFolder.DisplayName;
    let id = await browser.addressBooks.create({name});
    await browser.incomingServer.setStringValue(this.serverID, "addressBook", id);
    addressBook = { id };
  }
  // Stop listening to contact updates.
  EWSAccount.gAddressBooks.delete(addressBook.id);
  let contacts = [];
  let lists = [];
  try {
    for (;;) {
      let response = await this.CallService(aMsgWindow, query); // ews.js
      if (response.RootFolder.Items) {
        contacts = contacts.concat(ensureArray(response.RootFolder.Items.Contact));
        lists = lists.concat(ensureArray(response.RootFolder.Items.DistributionList));
      }
      if (response.RootFolder.IndexedPagingOffset == response.RootFolder.TotalItemsInView) {
        break;
      }
      query.m$FindItem.m$IndexedPageItemView.Offset = response.RootFolder.IndexedPagingOffset;
    }
    hostname = "ews$" + await browser.incomingServer.getHostName(this.serverID);
    this.storage = await browser.storage.local.get(hostname);
    if (!this.storage[hostname]) {
      this.storage[hostname] = {
        contacts: { fields: {}, ids: {}, itemIds: {}, changeKeys: {}, },
        mailingLists: { fields: {}, ids: {}, itemIds: {}, changeKeys: {}, },
      };
    };
    // XXX For old profiles
    if (!this.storage[hostname].contacts.fields) {
      this.storage[hostname].contacts.fields = {};
    }
    if (!this.storage[hostname].mailingLists.fields) {
      this.storage[hostname].mailingLists.fields = {};
    }
    this.contacts = this.storage[hostname].contacts;
    this.mailingLists = this.storage[hostname].mailingLists;
    // Delete any stale data.
    this.ReconcileDeletions(browser.contacts, this.contacts, addressBook.contacts || [], contacts);
    this.ReconcileDeletions(browser.mailingLists, this.mailingLists, addressBook.mailingLists || [], lists);
  } catch (ex) {
    ShowContactError(addressBook.id, ex);
    // Don't throw this because it will just get reported twice.
    return;
  }
  // Update or create contacts from the server's list of items.
  for (let contact of contacts) {
    try {
      let id = this.contacts.ids[contact.ItemId.Id];
      if (!id) {
        fetch.m$GetItem.m$ItemIds.t$ItemId[0].Id = contact.ItemId.Id;
        let response = await this.CallService(aMsgWindow, fetch); // ews.js
        let properties = this.convertContact(response.Items.Contact);
        // Prefer the display name of personal contacts by default,
        // but allow the user to change it, so only set it on first creation.
        properties.PreferDisplayName = kPreferDisplayNameTrue;
        id = await browser.contacts.create(addressBook.id, null, properties);
        // Also track the new mapping.
        this.contacts.ids[contact.ItemId.Id] = id;
        this.contacts.itemIds[id] = contact.ItemId.Id;
        this.contacts.changeKeys[contact.ItemId.Id] = contact.ItemId.ChangeKey;
        this.contacts.fields[contact.ItemId.Id] = EWSAccount.convertProperties(properties);
      } else if (contact.ItemId.ChangeKey != this.contacts.changeKeys[contact.ItemId.Id]) {
        fetch.m$GetItem.m$ItemIds.t$ItemId[0].Id = contact.ItemId.Id;
        let response = await this.CallService(aMsgWindow, fetch); // ews.js
        let properties = this.convertContact(response.Items.Contact);
        await browser.contacts.update(id, properties);
        this.contacts.changeKeys[contact.ItemId.Id] = contact.ItemId.ChangeKey;
        this.contacts.fields[contact.ItemId.Id] = EWSAccount.convertProperties(properties);
      }
    } catch (ex) {
      ShowContactError(addressBook.id, ex);
    }
  }
  // Update or create mailing lists from the server's lists.
  for (let list of lists) {
    try {
      fetch.m$GetItem.m$ItemIds.t$ItemId[0].Id = list.ItemId.Id;
      let response = await this.CallService(aMsgWindow, fetch); // ews.js
      list = response.Items.DistributionList;
      let id = this.mailingLists.ids[list.ItemId.Id];
      if (!id) {
        id = await browser.mailingLists.create(addressBook.id, { name: list.DisplayName, description: list.Body ? list.Body.Value : "" });
        // Also track the new mapping.
        this.mailingLists.ids[list.ItemId.Id] = id;
        this.mailingLists.itemIds[id] = list.ItemId.Id;
      } else {
        browser.mailingLists.update(id, { name: list.DisplayName, description: list.Body ? list.Body.Value : "" });
      }
      // Reconcile the list's members.
      let members = [];
      for (let member of ensureArray(list.Members && list.Members.Member)) {
        let itemId = member.Mailbox && member.Mailbox.ItemId && member.Mailbox.ItemId.Id;
        if (itemId && this.contacts.ids[itemId]) {
          members.push(this.contacts.ids[itemId]);
        }
      }
      for (let member of await browser.mailingLists.listMembers(id)) {
        let index = members.indexOf(member.id);
        if (index < 0) {
          await browser.mailingLists.removeMember(id, member.id);
        } else {
          // This is an existing member, so we don't need to add it.
          members.splice(index, 1);
        }
      }
      for (let member of members) {
        await browser.mailingLists.addMember(id, member);
      }
    } catch (ex) {
      ShowContactError(addressBook.id, ex);
    }
  }
  // Save our updated mappings.
  browser.storage.local.set(this.storage);
  // Start listening to contact updates.
  EWSAccount.gAddressBooks.set(addressBook.id, this);
}

EWSAccount.prototype.DownloadGAL = async function(aMsgWindow) {
  let addressBook;
  // Try and find the address book we created last time. If it's no longer
  // there, or if we've never created an address book, then create one.
  try {
    let id = await browser.incomingServer.getStringValue(this.serverID, "GAL");
    addressBook = await browser.addressBooks.get(id, true);
  } catch (ex) {
    let identity = await browser.incomingServer.getIdentity(this.serverID);
    let name = identity.email.slice(identity.email.indexOf("@") + 1) + " GAL";
    let id = await browser.addressBooks.create({name});
    await browser.incomingServer.setStringValue(this.serverID, "GAL", id);
    addressBook = { id: id, contacts: [], mailingLists: [] };
  }
  browser.uiTweaks.markAddressBookAsReadOnly(addressBook.id);
  try {
    let response;
    let contactMap = {};
    for (let contact of addressBook.contacts) {
      contactMap[contact.properties.PrimaryEmail] = contact;
    }
    let resolvedNames = {};
    for (let i = 10; i < 36; i++) {
      let query = {
        m$ResolveNames: {
          m$UnresolvedEntry: "smtp:" + i.toString(36), // 'a' .. 'z'
          ReturnFullContactData: true,
        },
      };
      try {
        response = await this.CallService(aMsgWindow, query); // ews.js
      } catch (ex) {
        if (ex.type == "ErrorNameResolutionNoResults") {
          continue; // No results for this letter, just continue with next one.
        }
        throw ex;
      }
      for (let resolution of ensureArray(response.ResolutionSet.Resolution)) {
        if (!resolution.Contact) {
          // This is a match from the Contacts folder, but we don't need that.
          continue;
        }
        // This API returns up to four email addresses;
        // the Mailbox contains one while the Contact can contain three.
        // We'll combine the four addresses into a single array.
        let emailAddresses = ensureArray(resolution.Contact.EmailAddresses.Entry).map(entry => entry.Value);
        emailAddresses.unshift(resolution.Mailbox.RoutingType + ":" + resolution.Mailbox.EmailAddress);
        // The primary SMTP address is always prefixed with SMTP:
        let primaryEmail = (emailAddresses.find(address => address.startsWith("SMTP:")) || "").slice(5);
        // Secondary SMTP addresses are prefixed with smtp: so just find one
        let secondEmail = (emailAddresses.find(address => address.startsWith("smtp:")) || "").slice(5);
        // Tweak the result to be in convertContact format.
        resolution.Contact.EmailAddresses = {
          Entry: [{
            Value: primaryEmail,
          }, {
            Value: secondEmail,
          }],
        };
        resolvedNames[primaryEmail] = this.convertContact(resolution.Contact);
      }
    }
    for (let primaryEmail in resolvedNames) {
      let contact = contactMap[primaryEmail];
      if (contact) {
        this.UpdateContact(contact, resolvedNames[primaryEmail]);
        delete contactMap[primaryEmail];
      } else {
        // Don't prefer the display name of GAL contacts by default,
        // but allow the user to change it, so only set it on first creation.
        resolvedNames[primaryEmail].PreferDisplayName = kPreferDisplayNameFalse;
        await browser.contacts.create(addressBook.id, null, resolvedNames[primaryEmail]);
      }
    }
    for (let primaryEmail in contactMap) {
      browser.contacts.delete(contactMap[primaryEmail].id);
    }
  } catch (ex) {
    ShowContactError(addressBook.id, ex);
    // Don't throw this because it will just get reported twice.
    return;
  }
}

EWSAccount.prototype.ResyncAddressBooks = async function(aMsgWindow) {
  noAwait(this.ResyncContacts(aMsgWindow), logError);

  let enableGAL = await browser.incomingServer.getBooleanValue(this.serverID, "GAL_enabled");
  if (enableGAL) {
    noAwait(this.DownloadGAL(aMsgWindow), logError);
  } else if (browser.autoComplete && !this.autoCompleteListener) {
    let identity = await browser.incomingServer.getIdentity(this.serverID);
    let dirName = identity.email.slice(identity.email.indexOf("@") + 1) + " GAL";
    this.autoCompleteListener = this.AutoComplete.bind(this);
    browser.autoComplete.onAutoComplete.addListener(this.autoCompleteListener, {dirName, isSecure: true});
  }
}

EWSAccount.prototype.AutoComplete = async function(aSearchString) {
  let query = {
    m$ResolveNames: {
      m$UnresolvedEntry: 'smtp:' + aSearchString,
      ReturnFullContactData: true,
    },
  };
  try {
    response = await this.CallService(null, query); // ews.js
  } catch (ex) {
    if (ex.type == "ErrorNameResolutionNoResults") {
      return [];
    }
    logError(ex);
    throw ex;
  }
  let results = [];
  for (let resolution of ensureArray(response.ResolutionSet.Resolution)) {
    if (!resolution.Contact) {
      // This is a match from the Contacts folder, but we don't need that.
      continue;
    }
    // This API returns up to four email addresses;
    // the Mailbox contains one while the Contact can contain three.
    // We'll combine the four addresses into a single array.
    let emailAddresses = ensureArray(resolution.Contact.EmailAddresses.Entry).map(entry => entry.Value);
    emailAddresses.unshift(resolution.Mailbox.RoutingType + ":" + resolution.Mailbox.EmailAddress);
    // The primary SMTP address is always prefixed with SMTP:
    let primaryEmail = (emailAddresses.find(address => address.startsWith("SMTP:")) || "").slice(5);
    // Secondary SMTP addresses are prefixed with smtp: so just find one
    let secondEmail = (emailAddresses.find(address => address.startsWith("smtp:")) || "").slice(5);
    // Tweak the result to be in convertContact format.
    resolution.Contact.EmailAddresses = {
      Entry: [{
        Value: primaryEmail,
      }, {
        Value: secondEmail,
      }],
    };
    results.push(this.convertContact(resolution.Contact));
  }
  return results;
}

/**
 * Updates a Thunderbird contact if any properties are out of date.
 *
 * @param aContact    {Contact} The Thunderbird contact object
 *        id          {String}  The contact's id
 *        properties  {Object}  The current properties
 * @param aProperties {Object}  The desired properties
 *
 * Desired properties will be blank where existing properties are to be deleted.
 */
EWSAccount.prototype.UpdateContact = function(aContact, aProperties) {
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
