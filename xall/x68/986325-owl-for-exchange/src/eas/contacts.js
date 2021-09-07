/**
 * These are the contact properties we support.
 * This tells EAS which properties we are clearing and which we are ignoring.
 */
EASAccount.kSupported = {
  // Contacts namespace
  Birthday: {},
  BusinessAddressCity: {},
  BusinessAddressCountry: {},
  BusinessAddressPostalCode: {},
  BusinessAddressState: {},
  BusinessAddressStreet: {},
  BusinessFaxNumber: {},
  BusinessPhoneNumber: {},
  CompanyName: {},
  Department: {},
  Email1Address: {},
  Email2Address: {},
  FirstName: {},
  HomeAddressCity: {},
  HomeAddressCountry: {},
  HomeAddressPostalCode: {},
  HomeAddressState: {},
  HomeAddressStreet: {},
  HomePhoneNumber: {},
  JobTitle: {},
  LastName: {},
  MobilePhoneNumber: {},
  PagerNumber: {},
  WebPage: {},
  // Contacts2 namespace
  IMAddress: {},
  NickName: {},
};

/**
 * Map { address book id {string} -> EAS server {EASAccount}}
 */
EASAccount.gAddressBooks = new Map();

/**
 * Turns a Thunderbird contact into EAS data.
 *
 * @param aProperties {Object} The Thunderbird contact's properties
 * @returns           {Object} The EAS data
 */
EASAccount.convertProperties = function(aProperties) {
  return {
    // Except for Body, all properties are optional, and if omitted,
    // EAS will delete their value (if they are in our supported list).
    // This is fine, as we automatically omit empty properties anyway.
    // However, Notes won't get overwritten if we don't supply a Body.
    // The data tag is also required, so if there are no notes, we
    // need to supply an empty tag. The value {} achieves this.
    Body: {
      Type: "1",
      Data: aProperties.Notes || {},
    },
    FirstName: aProperties.FirstName,
    LastName: aProperties.LastName,
    NickName: aProperties.NickName,
    Email1Address: aProperties.PrimaryEmail,
    Email2Address: aProperties.SecondEmail,
    HomeAddressStreet: aProperties.HomeAddress,
    HomeAddressCity: aProperties.HomeCity,
    HomeAddressState: aProperties.HomeState,
    HomeAddressPostalCode: aProperties.HomeZipCode,
    HomeAddressCountry: aProperties.HomeCountry,
    // WebPage2 not supported by ActiveSync
    BusinessAddressStreet: aProperties.WorkAddress,
    BusinessAddressCity: aProperties.WorkCity,
    BusinessAddressState: aProperties.WorkState,
    BusinessAddressPostalCode: aProperties.WorkZipCode,
    BusinessAddressCountry: aProperties.WorkCountry,
    WebPage: aProperties.WebPage1,
    HomePhoneNumber: aProperties.HomePhone,
    BusinessPhoneNumber: aProperties.WorkPhone,
    BusinessFaxNumber: aProperties.FaxNumber,
    PagerNumber: aProperties.PagerNumber,
    MobilePhoneNumber: aProperties.CellularNumber,
    JobTitle: aProperties.JobTitle,
    Department: aProperties.Department,
    CompanyName: aProperties.Company,
    IMAddress: aProperties._AimScreenName,
    Birthday: aProperties.BirthMonth && aProperties.BirthDay && `${aProperties.BirthYear || 1604}-${aProperties.BirthMonth.padStart(2, 0)}-${aProperties.BirthDay.padStart(2, 0)}T00:00:00.000Z`, // EAS requires millisecond accuracy for Birthdays... go figure.
  };
}

/**
 * Send a contact creation or update to the OWA server.
 *
 * @param contact {Object} The Thunderbird contact node
 */
EASAccount.contactsListener = async function(contact) {
  try {
    let addressBook = contact.parentId;
    let account = EASAccount.gAddressBooks.get(addressBook);
    if (account) {
      let fields = EASAccount.convertProperties(contact.properties);
      let syncKey = await browser.incomingServer.getStringValue(account.serverID, "contacts_synckey");
      let contacts = await browser.incomingServer.getStringValue(account.serverID, "contacts_serverid");
      let sync = {
        Sync: {
          Collections: {
            Collection: {
              SyncKey: syncKey,
              CollectionId: contacts,
              GetChanges: "0",
              Commands: {},
            },
          },
        },
      };
      if (account.contacts.serverIds[contact.id]) {
        sync.Sync.Collections.Collection.Commands.Change = {
          ServerId: account.contacts.serverIds[contact.id],
          ApplicationData: fields,
        };
      } else {
        sync.Sync.Collections.Collection.Commands.Add = {
          ClientId: await EASAccount.NextClientId(),
          ApplicationData: fields,
        };
      }
      let response = await account.CallService(null, "Sync", sync); // ews.js
      if (response.Collections.Collection.Status != "1") {
        throw new EASError(null, "Sync", sync, response.Collections.Collection.Status);
      }
      syncKey = response.Collections.Collection.SyncKey;
      browser.incomingServer.setStringValue(account.serverID, "contacts_synckey", syncKey);
      if (response.Collections.Collection.Responses) {
        if (response.Collections.Collection.Responses.Change) {
          throw new EASError(null, "Sync", sync, response.Collections.Collection.Responses.Change.Status);
        }
        if (response.Collections.Collection.Responses.Add) {
          if (response.Collections.Collection.Responses.Add.Status != "1") {
            throw new EASError(null, "Sync", sync, response.Collections.Collection.Responses.Add.Status);
          }
          let serverId = response.Collections.Collection.Responses.Add.ServerId;
          // Also track the new mapping.
          account.contacts.ids[serverId] = contact.id;
          account.contacts.serverIds[contact.id] = serverId;
          browser.storage.local.set(account.storage);
        }
      }
    }
  } catch (ex) {
    logError(ex);
  }
};
// Handle contact modifications.
browser.contacts.onCreated.addListener(EASAccount.contactsListener);
browser.contacts.onUpdated.addListener(EASAccount.contactsListener);
browser.contacts.onDeleted.addListener(async (addressBook, id) => {
  try {
    let account = EASAccount.gAddressBooks.get(addressBook);
    if (account) {
      let serverId = account.contacts.serverIds[id];
      if (serverId) {
        delete account.contacts.ids[serverId];
        delete account.contacts.serverIds[id];
        browser.storage.local.set(account.storage);
        let syncKey = await browser.incomingServer.getStringValue(account.serverID, "contacts_synckey");
        let contacts = await browser.incomingServer.getStringValue(account.serverID, "contacts_serverid");
        let sync = {
          Sync: {
            Collections: {
              Collection: {
                SyncKey: syncKey,
                CollectionId: contacts,
                GetChanges: "0",
                Commands: {
                  Delete: {
                    ServerId: serverId,
                  },
                },
              },
            },
          },
        };
        let response = await account.CallService(null, "Sync", sync);
        if (response.Collections.Collection.Status != "1") {
          throw new EASError(null, "Sync", sync, response.Collections.Collection.Status);
        }
        syncKey = response.Collections.Collection.SyncKey;
        browser.incomingServer.setStringValue(account.serverID, "contacts_synckey", syncKey);
        if (response.Collections.Collection.Responses) {
          throw new EASError(null, "Sync", sync, response.Collections.Collection.Responses.Delete.Status);
        }
      }
    }
  } catch (ex) {
    if (ex.code == kItemNotFound) {
      // Already deleted. Ignore.
    } else {
      logError(ex);
    }
  }
});

/**
 * Turn an EAS Contact into an TB addressbook-compatible contact.
 *
 * @param aServerId {String}  The EAS id of the contact
 * @param aData     {Object}  The EAS contact data
 * @returns         {Object}  The contact
 *
 * Note: The returned object includes all supported property keys,
 * but the values for missing properties will be empty.
 * This is in case the value was removed from an existing contact.
 */
EASAccount.prototype.convertContact = async function(aData) {
  let primaryEmail = await browser.webAccount.extractMailboxes(aData.Email1Address || "");
  let secondEmail = await browser.webAccount.extractMailboxes(aData.Email2Address || "");
  return {
    FirstName: aData.FirstName || "",
    LastName: aData.LastName || "",
    DisplayName: await browser.webAccount.formatDisplayName(aData.FirstName || "", aData.LastName || ""),
    NickName: aData.NickName || "",
    PrimaryEmail: primaryEmail[0] && primaryEmail[0].EmailAddress || "",
    SecondEmail: secondEmail[0] && secondEmail[0].EmailAddress || "",
    HomeAddress: aData.HomeAddressStreet || "",
    HomeCity: aData.HomeAddressCity || "",
    HomeState: aData.HomeAddressState || "",
    HomeZipCode: aData.HomeAddressPostalCode || "",
    HomeCountry: aData.HomeAddressCountry || "",
    // WebPage2 not supported by ActiveSync
    WorkAddress: aData.BusinessAddressStreet || "",
    WorkCity: aData.BusinessAddressCity || "",
    WorkState: aData.BusinessAddressState || "",
    WorkZipCode: aData.BusinessAddressPostalCode || "",
    WorkCountry: aData.BusinessAddressCountry || "",
    WebPage1: aData.WebPage || "",
    HomePhone: aData.HomePhoneNumber || "",
    WorkPhone: aData.BusinessPhoneNumber || "",
    FaxNumber: aData.BusinessFaxNumber || "",
    PagerNumber: aData.PagerNumber || "",
    CellularNumber: aData.MobilePhoneNumber || "",
    JobTitle: aData.JobTitle || "",
    Department: aData.Department || "",
    Company: aData.CompanyName || "",
    Notes: aData.Body && aData.Body.Data || "",
    _AimScreenName: aData.IMAddress || "",
    BirthYear: aData.Birthday ? aData.Birthday.slice(0, 4) : "",
    BirthMonth: aData.Birthday ? aData.Birthday.slice(5, 7) : "",
    BirthDay: aData.Birthday ? aData.Birthday.slice(8, 10) : "",
  };
}

/**
 * Downloads contacts from the EAS server and updates a local addressbook.
 *
 * @param aMsgWindow {Integer}
 */
EASAccount.prototype.ResyncContacts = async function(aMsgWindow) {
  let syncKey = "";
  let addressBook;
  let hostname = "eas$" + await browser.incomingServer.getHostName(this.serverID);
  this.storage = await browser.storage.local.get(hostname);
  // Try and find the address book we created last time. If it's no longer
  // there, or if we've never created an address book, then create one.
  try {
    let id = await browser.incomingServer.getStringValue(this.serverID, "addressBook");
    addressBook = await browser.addressBooks.get(id, true);
    syncKey = await browser.incomingServer.getStringValue(this.serverID, "contacts_synckey");
  } catch (ex) {
    let identity = await browser.incomingServer.getIdentity(this.serverID);
    let name = await browser.incomingServer.getStringValue(this.serverID, "contacts_name");
    name = identity.email.slice(identity.email.indexOf("@") + 1) + " " + name;
    let id = await browser.addressBooks.create({name});
    this.storage[hostname] = {
      contacts: { ids: {}, serverIds: {}, },
      mailingLists: { ids: {}, serverds: {}, },
    };
    await browser.storage.local.set(this.storage);
    await browser.incomingServer.setStringValue(this.serverID, "contacts_synckey", "");
    await browser.incomingServer.setStringValue(this.serverID, "addressBook", id);
    addressBook = { id, contacts: [], mailingLists: [] };
  }
  this.contacts = this.storage[hostname].contacts;
  this.mailingLists = this.storage[hostname].mailingLists;
  // Stop listening to contact updates.
  EASAccount.gAddressBooks.delete(addressBook.id);
  let contacts = await browser.incomingServer.getStringValue(this.serverID, "contacts_serverid");
  if (!syncKey) {
    let init = {
      Sync: {
        Collections: {
          Collection: {
            SyncKey: "0",
            CollectionId: contacts,
            Supported: EASAccount.kSupported,
          },
        },
      },
    };
    let response = await this.CallService(aMsgWindow, "Sync", init); // eas.js
    syncKey = response.Collections.Collection.SyncKey;
    await browser.incomingServer.setStringValue(this.serverID, "contacts_synckey", syncKey);
  }
  let sync = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: syncKey,
          CollectionId: contacts,
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
    for (;;) {
      let response = await this.CallService(aMsgWindow, "Sync", sync); // ews.js
      if (!response) { // empty response if nothing to do
        break;
      }
      let collection = response.Collections.Collection;
      syncKey = collection.SyncKey;
      if (collection.Commands) {
        for (let deletion of ensureArray(collection.Commands.Delete)) {
          let id = this.contacts.ids[deletion.ServerId];
          if (id) {
            try {
              await browser.contacts.delete(id);
            } catch (ex) {
              // Probably contact not found, so who cares?
              logError(ex);
              await browser.contacts.create(addressBook.id, null, {
                DisplayName: ex.message,
                Notes: ex.stack,
              });
            }
            delete this.contacts.ids[deletion.ServerId];
            delete this.contacts.serverIds[id];
          }
        }
        for (let change of ensureArray(collection.Commands.Add).concat(ensureArray(collection.Commands.Change))) {
          let properties = await this.convertContact(change.ApplicationData);
          let id = this.contacts.ids[change.ServerId];
          if (id) {
            try {
              await browser.contacts.update(id, properties);
            } catch (ex) {
              logError(ex);
              await browser.contacts.create(addressBook.id, null, {
                DisplayName: ex.message,
                Notes: ex.stack,
              });
              // Maybe the contact wasn't found. Let's try adding it instead.
              delete this.contacts.serverIds[id];
              id = null;
            }
          }
          if (!id) {
            try {
              id = await browser.contacts.create(addressBook.id, null, properties);
              // Also track the new mapping.
              this.contacts.ids[change.ServerId] = id;
              this.contacts.serverIds[id] = change.ServerId;
            } catch (ex) {
              logError(ex);
              await browser.contacts.create(addressBook.id, null, {
                DisplayName: ex.message,
                Notes: ex.stack,
              });
            }
          }
        }
      }
      // Save our updated mappings.
      browser.storage.local.set(this.storage);
      await browser.incomingServer.setStringValue(this.serverID, "contacts_synckey", syncKey);
      if (collection.MoreAvailable == null) {
        break;
      }
    }
    // Start listening to contact updates.
    EASAccount.gAddressBooks.set(addressBook.id, this);
    this.ListenToFolder(contacts, "Contacts");
  } catch (ex) {
    if (ex.code == kItemSyncKeyError) {
      await browser.incomingServer.setStringValue(this.serverID, "contacts_synckey", "");
    }
    browser.contacts.create(addressBook.id, null, {
      DisplayName: ex.message,
      Notes: ex.stack,
    });
  }
}

EASAccount.prototype.DownloadGAL = async function(aMsgWindow) {
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
  try {
    let response;
    let contactMap = {};
    for (let contact of addressBook.contacts) {
      contactMap[contact.properties.PrimaryEmail] = contact;
    }
    let resolvedNames = {};
    for (let i = 10; i < 36; i++) {
      let search = {
        Search: {
          Store: {
            Name: "GAL",
            Query: i.toString(36), // 'a' .. 'z'
          },
        },
      };
      response = await this.CallService(aMsgWindow, "Search", search); // eas.js
      if (response.Response.Store.Status != "1") {
        logError(new EASError(null, "Sync", search, response.Response.Store.Status));
      }
      for (let result of ensureArray(response.Response.Store.Result)) {
        resolvedNames[result.Properties.EmailAddress] = {
          DisplayName: result.Properties.DisplayName || "",
          WorkPhone: result.Properties.Phone || "",
          JobTitle: result.Properties.Title || "",
          Company: result.Properties.Company || "",
          FirstName: result.Properties.FirstName || "",
          LastName: result.Properties.LastName || "",
          HomePhone: result.Properties.HomePhone || "",
          CellularNumber: result.Properties.MobilePhone || "",
          PrimaryEmail: result.Properties.EmailAddress || "",
        };
      }
    }
    for (let primaryEmail in resolvedNames) {
      let contact = contactMap[primaryEmail];
      if (contact) {
        this.UpdateContact(contact, resolvedNames[primaryEmail]);
        delete contactMap[primaryEmail];
      } else {
        browser.contacts.create(addressBook.id, null, resolvedNames[primaryEmail]);
      }
    }
    for (let primaryEmail in contactMap) {
      browser.contacts.delete(contactMap[primaryEmail].id);
    }
  } catch (ex) {
    browser.contacts.create(addressBook.id, null, {
      DisplayName: ex.message,
      Notes: ex.stack,
    });
    throw ex;
  }
}

EASAccount.prototype.ResyncAddressBooks = async function(aMsgWindow) {
  noAwait(this.ResyncContacts(aMsgWindow), logError);

  let enableGAL = await browser.incomingServer.getBooleanValue(this.serverID, "GAL_enabled");
  if (enableGAL) {
    noAwait(this.DownloadGAL(aMsgWindow), logError);
  }
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
EASAccount.prototype.UpdateContact = function(aContact, aProperties) {
  let changes = null;
  for (let prop in aProperties) {
    if (aProperties[prop] != (aContact.properties[prop] || "")) {
      if (!changes) {
        changes = {};
      }
      changes[prop] = aProperties[prop];
    }
  }
  if (changes) {
    browser.contacts.update(aContact.id, changes);
  }
}
