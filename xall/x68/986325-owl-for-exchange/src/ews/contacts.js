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
 * Turn an EWS Contact into an addressbook-compatible contact.
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
  aContact.EmailAddresses = this.explodeEntry(aContact.EmailAddresses);
  aContact.PhysicalAddresses = this.explodeEntry(aContact.PhysicalAddresses);
  aContact.PhoneNumbers = this.explodeEntry(aContact.PhoneNumbers);
  return {
    ItemId: aContact.ItemId.Id,
    ChangeKey: aContact.ItemId.ChangeKey,
    FirstName: aContact.GivenName || "",
    LastName: aContact.CompleteName && aContact.CompleteName.LastName || "",
    DisplayName: aContact.DisplayName || "",
    NickName: aContact.CompleteName && aContact.CompleteName.Nickname || "",
    PrimaryEmail: aContact.EmailAddresses.EmailAddress1 && aContact.EmailAddresses.EmailAddress1.Value || "",
    SecondEmail: aContact.EmailAddresses.EmailAddress2 && aContact.EmailAddresses.EmailAddress2.Value || "",
    HomeAddress: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.Street || "",
    HomeCity: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.City || "",
    HomeState: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.State || "",
    HomeZipCode: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.PostalCode || "",
    HomeCountry: aContact.PhysicalAddresses.Home && aContact.PhysicalAddresses.Home.CountryOrRegion || "",
    WebPage2: aContact.ExtendedProperty && aContact.ExtendedProperty.Value || "", // this is normally an array, but we're only requesting one property
    WorkAddress: aContact.PhysicalAddresses.Business && aContact.PhysicalAddresses.Business.Street || "",
    WorkCity: aContact.PhysicalAddresses.Business && aContact.PhysicalAddresses.Business.WorkCity || "",
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
 * @param aCache       {Object}        The stored contacts or lists mappings
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
      delete aCache.changeKeys[aCache.itemIds[id]];
      delete aCache.ids[aCache.itemIds[id]];
      delete aCache.itemIds[id];
    }
  }
  // Delete mappings for nodes which don't exist on the server.
  let itemIds = aItems.map(item => item.ItemId.Id);
  for (let itemId in aCache.ids) {
    if (!itemIds.includes(itemId)) {
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
        t$AdditionalProperties: {
          t$FieldURI: [{
            FieldURI: "contacts:BusinessHomePage",
          }, {
            FieldURI: "item:Body",
          }],
          // For some reason BusinessHomePage (0x3a51) has a FieldURI,
          // but PersonalHomePage (0x3a50) does not, so we use the tag.
          t$ExtendedFieldURI: [{
            PropertyTag: "0x3a50",
            PropertyType: "String",
          }],
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
  let addressBook, hostname, storage;
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
    storage = await browser.storage.local.get(hostname);
    if (!storage[hostname]) {
      storage[hostname] = {
        contacts: { ids: {}, itemIds: {}, changeKeys: {}, },
        mailingLists: { ids: {}, itemIds: {}, changeKeys: {}, },
      };
    };
    // Delete any stale data.
    this.ReconcileDeletions(browser.contacts, storage[hostname].contacts, addressBook.contacts || [], contacts);
    this.ReconcileDeletions(browser.mailingLists, storage[hostname].mailingLists, addressBook.mailingLists || [], lists);
  } catch (ex) {
    browser.contacts.create(addressBook.id, null, {
      DisplayName: ex.message,
      Notes: ex.stack,
    });
    return;
  }
  // Update or create contacts from the server's list of items.
  for (let contact of contacts) {
    try {
      let id = storage[hostname].contacts.ids[contact.ItemId.Id];
      if (!id) {
        fetch.m$GetItem.m$ItemIds.t$ItemId[0].Id = contact.ItemId.Id;
        let response = await this.CallService(aMsgWindow, fetch); // ews.js
        id = await browser.contacts.create(addressBook.id, null, this.convertContact(response.Items.Contact));
        // Also track the new mapping.
        storage[hostname].contacts.ids[contact.ItemId.Id] = id;
        storage[hostname].contacts.itemIds[id] = contact.ItemId.Id;
        storage[hostname].contacts.changeKeys[contact.ItemId.Id] = contact.ItemId.ChangeKey;
      } else if (contact.ItemId.ChangeKey != storage[hostname].contacts.changeKeys[contact.ItemId.Id]) {
        fetch.m$GetItem.m$ItemIds.t$ItemId[0].Id = contact.ItemId.Id;
        let response = await this.CallService(aMsgWindow, fetch); // ews.js
        await browser.contacts.update(id, this.convertContact(response.Items.Contact));
        storage[hostname].contacts.changeKeys[contact.ItemId.Id] = contact.ItemId.ChangeKey;
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
      fetch.m$GetItem.m$ItemIds.t$ItemId[0].Id = list.ItemId.Id;
      let response = await this.CallService(aMsgWindow, fetch); // ews.js
      list = response.Items.DistributionList;
      let id = storage[hostname].mailingLists.ids[list.ItemId.Id];
      if (!id) {
        id = await browser.mailingLists.create(addressBook.id, { name: list.DisplayName, description: list.Body ? list.Body.Value : "" });
        // Also track the new mapping.
        storage[hostname].mailingLists.ids[list.ItemId.Id] = id;
        storage[hostname].mailingLists.itemIds[id] = list.ItemId.Id;
      } else {
        browser.mailingLists.update(id, { name: list.DisplayName, description: list.Body ? list.Body.Value : "" });
      }
      // Reconcile the list's members.
      let members = [];
      for (let member of ensureArray(list.Members && list.Members.Member)) {
        let itemId = member.Mailbox && member.Mailbox.ItemId && member.Mailbox.ItemId.Id;
        if (itemId && storage[hostname].contacts.ids[itemId]) {
          members.push(storage[hostname].contacts.ids[itemId]);
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
      logError(ex);
      browser.contacts.create(addressBook.id, null, {
        DisplayName: ex.message,
        Notes: ex.stack,
      });
    }
  }
  // Save our updated mappings.
  browser.storage.local.set(storage);
}
