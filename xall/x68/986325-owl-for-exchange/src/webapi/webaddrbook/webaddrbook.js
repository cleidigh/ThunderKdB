/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const uuidGenerator = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);

var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
try {
var {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm");
} catch (ex) {
var {MailServices} = ChromeUtils.import("resource:///modules/mailServices.js"); // COMPAT for TB 60
}

/**
 * COMPAT for TB 60
 * In Thunderbird trunk, an nsISimpleEnumerator is already an Iterator.
 * @param aXPCOMEnumerator {nsISimpleEnumerator}
 * @param aInterface       {nsIIDRef}
 * @returns                {Iterator}
 */
function iterateEnumerator(aXPCOMEnumerator, aInterface)
{
  return XPCOMUtils.IterSimpleEnumerator ? XPCOMUtils.IterSimpleEnumerator(aXPCOMEnumerator, aInterface) : aXPCOMEnumerator;
}

const AB_WINDOW_TYPE = "mail:addressbook";
const AB_WINDOW_URI = "chrome://messenger/content/addressbook/addressbook.xul";

const kPABDirectory = 2; // defined in nsDirPrefs.h

// nsIAbCard.idl contains a list of properties that Thunderbird uses. Extensions are not
// restricted to using only these properties, but the following properties cannot
// be modified by an extension.
const hiddenProperties = [
  "DbRowID", "LowercasePrimaryEmail", "LastModifiedDate",
  "PopularityIndex", "RecordKey", "UID",
];

var EventEmitter = ExtensionUtils.EventEmitter || ExtensionCommon.EventEmitter; // COMPAT for TB 60

/**
 * Cache of items in the address book "tree". This cache is
 * completely blown away by most changes, so operations should
 * be as lightweight as possible.
 *
 * @implements {nsIAbListener}
 * @implements {nsIObserver}
 */
 var cache = new class extends EventEmitter {
  _makeContactNode(contact, parent) {
    contact.QueryInterface(Ci.nsIAbCard);
    return {
      id: contact.UID,
      parentId: parent.UID,
      type: "contact",
      item: contact,
    };
  }
  _makeDirectoryNode(directory, parent = null) {
    directory.QueryInterface(Ci.nsIAbDirectory);
    let node = {
      id: directory.UID,
      type: directory.isMailList ? "mailingList" : "addressBook",
      item: directory,
    };
    if (parent) {
      node.parentId = parent.UID;
    }
    return node;
  }
  _populateListContacts(mailingList) {
    mailingList.contacts = {};
    for (let contact of iterateEnumerator(mailingList.item.addressLists.enumerate(), Ci.nsIAbCard)) {
      let newNode = this._makeContactNode(contact, mailingList.item);
      mailingList.contacts[newNode.id] = newNode;
    }
  }
  getListContacts(mailingList) {
    if (!mailingList.contacts) {
      this._populateListContacts(mailingList);
    }
    return Object.values(mailingList.contacts);
  }
  _populateContacts(addressBook) {
    addressBook.contacts = {};
    for (let contact of iterateEnumerator(addressBook.item.childCards, Ci.nsIAbCard)) {
      if (!contact.isMailList) {
        if (!this._contacts) {
          this._contacts = {};
        }
        let newNode = this._makeContactNode(contact, addressBook.item);
        this._contacts[newNode.id] = addressBook.contacts[newNode.id] = newNode;
      }
    }
  }
  getContacts(addressBook) {
    if (!addressBook.contacts) {
      this._populateContacts(addressBook);
    }
    return Object.values(addressBook.contacts);
  }
  _populateMailingLists(parent) {
    parent.mailingLists = {};
    for (let mailingList of iterateEnumerator(parent.item.addressLists.enumerate(), Ci.nsIAbDirectory)) {
      if (!this._mailingLists) {
        this._mailingLists = {};
      }
      let newNode = this._makeDirectoryNode(mailingList, parent.item);
      this._mailingLists[newNode.id] = parent.mailingLists[newNode.id] = newNode;
    }
  }
  getMailingLists(parent) {
    if (!parent.mailingLists) {
      this._populateMailingLists(parent);
    }
    return Object.values(parent.mailingLists);
  }
  get addressBooks() {
    if (!this._addressBooks) {
      this._addressBooks = {};
      for (let tld of iterateEnumerator(MailServices.ab.directories, Ci.nsIAbDirectory)) {
        if (!tld.readOnly) {
          this._addressBooks[tld.UID] = this._makeDirectoryNode(tld);
        }
      }
    }
    return this._addressBooks;
  }
  findAddressBookById(id) {
    let addressBook = this.addressBooks[id];
    if (addressBook) {
      return addressBook;
    }
    throw new ExtensionUtils.ExtensionError(`addressBook with id=${id} could not be found.`);
  }
  findMailingListById(id) {
    if (this._mailingLists && this._mailingLists[id]) {
      return this._mailingLists[id];
    }
    for (let addressBook of Object.values(this.addressBooks)) {
      if (!addressBook.mailingLists) {
        this._populateMailingLists(addressBook);
        if (addressBook.mailingLists[id]) {
          return addressBook.mailingLists[id];
        }
      }
    }
    throw new ExtensionUtils.ExtensionError(`mailingList with id=${id} could not be found.`);
  }
  findContactById(id) {
    if (this._contacts && this._contacts[id]) {
      return this._contacts[id];
    }
    for (let addressBook of Object.values(this.addressBooks)) {
      if (!addressBook.contacts) {
        this._populateContacts(addressBook);
        if (addressBook.contacts[id]) {
          return addressBook.contacts[id];
        }
      }
    }
    throw new ExtensionUtils.ExtensionError(`contact with id=${id} could not be found.`);
  }
  convert(node, complete) {
    if (node === null) {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map(i => this.convert(i, complete));
    }

    let copy = {};
    for (let key of ["id", "parentId", "type"]) {
      if (key in node) {
        copy[key] = node[key];
      }
    }

    if (complete) {
      if (node.type == "addressBook") {
        copy.mailingLists = this.convert(this.getMailingLists(node), true);
        copy.contacts = this.convert(this.getContacts(node), true);
      }
      if (node.type == "mailingList") {
        copy.contacts = this.convert(this.getListContacts(node), true);
      }
    }

    switch (node.type) {
      case "addressBook":
        copy.name = node.item.dirName;
        copy.readOnly = node.item.readOnly;
        break;
      case "contact": {
        copy.properties = {};
        for (let property of iterateEnumerator(node.item.properties, Ci.nsIProperty)) {
          if (!hiddenProperties.includes(property.name)) {
            switch (property.value) {
            case undefined:
            case null:
            case "":
              // If someone sets a property to one of these values,
              // the property will be deleted from the database.
              // However, the value still appears in the notification,
              // so we ignore it here.
              continue;
            }
            // WebExtensions complains if we use numbers.
            copy.properties[property.name] = "" + property.value;
          }
        }
        break;
      }
      case "mailingList":
        copy.name = node.item.dirName;
        copy.nickName = node.item.listNickName;
        copy.description = node.item.description;
        break;
    }

    return copy;
  }

  // nsIAbListener
  onItemAdded(parent, item) {
    parent.QueryInterface(Ci.nsIAbDirectory);
    if (parent.readOnly) {
      return;
    }

    if (item instanceof Ci.nsIAbDirectory) {
      item.QueryInterface(Ci.nsIAbDirectory);
      if (item.isMailList) {
        let newNode = this._makeDirectoryNode(item, parent);
        if (this._addressBooks && this._addressBooks[parent.UID] && this._addressBooks[parent.UID].mailingLists) {
          this._addressBooks[parent.UID].mailingLists[newNode.id] = newNode;
          if (!this._mailingLists) {
            this._mailingLists = {};
          }
          this._mailingLists[newNode.id] = newNode;
        }
        this.emit("mailing-list-created", newNode);
      } else if (!item.readOnly) {
        let newNode = this._makeDirectoryNode(item);
        if (this._addressBooks) {
          this._addressBooks[newNode.id] = newNode;
        }
        this.emit("address-book-created", newNode);
      }
    } else if (item instanceof Ci.nsIAbCard) {
      item.QueryInterface(Ci.nsIAbCard);
      if (!item.isMailList && parent.isMailList) {
        let newNode = this._makeContactNode(item, parent);
        if (this._mailingLists && this._mailingLists[parent.UID] && this._mailingLists[parent.UID].contacts) {
          this._mailingLists[parent.UID].contacts[newNode.id] = newNode;
        }
        this.emit("mailing-list-member-added", newNode);
      }
    }
  }
  // nsIAbListener
  onItemRemoved(parent, item) {
    parent = parent.QueryInterface(Ci.nsIAbDirectory);
    if (parent.readOnly) {
      return;
    }

    if (item instanceof Ci.nsIAbDirectory) {
      item.QueryInterface(Ci.nsIAbDirectory);
      if (item.isMailList) {
        if (this._mailingLists) {
          delete this._mailingLists[item.UID];
        }
        if (this._addressBooks && this._addressBooks[parent.UID] && this._addressBooks[parent.UID].mailingLists) {
          delete this._addressBooks[parent.UID].mailingLists[item.UID];
        }
        this.emit("mailing-list-deleted", parent, item);
      } else if (!item.readonly) {
        if (this._addressBooks && this._addressBooks[item.UID]) {
          if (this._contacts && this._addressBooks[item.UID].contacts) {
            for (let id in this._addressBooks[item.UID].contacts) {
              delete this._contacts[id];
            }
          }
          if (this._mailingLists && this._addressBooks[item.UID].mailingLists) {
            for (let id in this._addressBooks[item.UID].mailingLists) {
              delete this._mailingLists[id];
            }
          }
          delete this._addressBooks[item.UID];
        }
        this.emit("address-book-deleted", item);
      }
    } else if (item instanceof Ci.nsIAbCard) {
      item.QueryInterface(Ci.nsIAbCard);
      if (!item.isMailList) {
        if (parent.isMailList) {
          if (this._mailingLists && this._mailingLists[parent.UID]) {
            if (this._mailingLists[parent.UID].contacts) {
              delete this._mailingLists[parent.UID].contacts[item.UID];
            }
          }
          this.emit("mailing-list-member-removed", parent, item);
        } else {
          if (this._contacts) {
            delete this._contacts[item.UID];
          }
          if (this._addressBooks && this._addressBooks[parent.UID]) {
            if (this._addressBooks[parent.UID].contacts) {
              delete this._addressBooks[parent.UID].contacts[item.UID];
            }
          }
          this.emit("contact-deleted", parent, item);
        }
      }
    }
  }
  // nsIAbListener
  onItemPropertyChanged(item, property, oldValue, newValue) {
    if (item instanceof Ci.nsIAbDirectory) {
      item.QueryInterface(Ci.nsIAbDirectory);
      if (!item.readOnly && !item.isMailList) {
        this.emit("address-book-updated", this._makeDirectoryNode(item));
      }
    }
  }

  // nsIObserver
  observe(subject, topic, data) {
    switch (topic) {
      case "addrbook-contact-created": {
        let parentNode = this.findAddressBookById(data);
        let newNode = this._makeContactNode(subject, parentNode.item);
        if (this._addressBooks[data] && this._addressBooks[data].contacts) {
          this._addressBooks[data].contacts[newNode.id] = newNode;
          if (!this._contacts) {
            this._contacts = {};
          }
          this._contacts[newNode.id] = newNode;
        }
        this.emit("contact-created", newNode);
        break;
      }
      case "addrbook-contact-updated": {
        let parentNode = this.findAddressBookById(data);
        let newNode = this._makeContactNode(subject, parentNode.item);
        if (this._addressBooks[data] && this._addressBooks[data].contacts) {
          this._addressBooks[data].contacts[newNode.id] = newNode;
          this._contacts[newNode.id] = newNode;
        }
        if (this._addressBooks[data] && this._addressBooks[data].mailingLists) {
          for (let mailingList of Object.values(this._addressBooks[data].mailingLists)) {
            if (mailingList.contacts && mailingList.contacts[newNode.id]) {
              mailingList.contacts[newNode.id].item = subject;
            }
          }
        }
        this.emit("contact-updated", newNode);
        break;
      }
      case "addrbook-list-updated": {
        subject.QueryInterface(Ci.nsIAbDirectory);
        if (!subject.readOnly) {
          this.emit("mailing-list-updated", this.findMailingListById(subject.UID));
        }
        break;
      }
      case "addrbook-list-member-added": {
        let parentNode = this.findMailingListById(data);
        let newNode = this._makeContactNode(subject, parentNode.item);
        if (this._mailingLists && this._mailingLists[data] && this._mailingLists[data].contacts) {
          this._mailingLists[data].contacts[newNode.id] = newNode;
        }
        this.emit("mailing-list-member-added", newNode);
        break;
      }
    }
  }
};
MailServices.ab.addAddressBookListener(cache, Ci.nsIAbListener.all);
Services.obs.addObserver(cache, "addrbook-contact-created");
Services.obs.addObserver(cache, "addrbook-contact-updated");
Services.obs.addObserver(cache, "addrbook-list-updated");
Services.obs.addObserver(cache, "addrbook-list-member-added");

this.webAddrBook = class extends ExtensionAPI {
  onShutdown() {
    MailServices.ab.removeAddressBookListener(cache);
    Services.obs.removeObserver(cache, "addrbook-contact-created");
    Services.obs.removeObserver(cache, "addrbook-contact-updated");
    Services.obs.removeObserver(cache, "addrbook-list-updated");
    Services.obs.removeObserver(cache, "addrbook-list-member-added");
  }

  getAPI(context) {
    return {
      addressBooks: {
        openUI() {
          let topWindow = Services.wm.getMostRecentWindow(AB_WINDOW_TYPE);
          if (!topWindow) {
            // TODO: wait until window is loaded before resolving
            topWindow = Services.ww.openWindow(null, AB_WINDOW_URI, "_blank", "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar", null);
          }
          topWindow.focus();
        },
        closeUI() {
          for (let win of iterateEnumerator(Services.wm.getEnumerator(AB_WINDOW_TYPE), Ci.nsISupports)) {
            win.close();
          }
        },

        list(complete = false) {
          return cache.convert(Object.values(cache.addressBooks), complete);
        },
        get(id, complete = false) {
          return cache.convert(cache.findAddressBookById(id), complete);
        },
        create({ name }) {
          let dirName = MailServices.ab.newAddressBook(name, "", kPABDirectory);
          let directory = MailServices.ab.getDirectoryFromId(dirName);
          return directory.UID;
        },
        update(id, { name }) {
          let node = cache.findAddressBookById(id);
          node.item.dirName = name;
        },
        delete(id) {
          let node = cache.findAddressBookById(id);
          MailServices.ab.deleteAddressBook(node.item.URI);
        },

        onCreated: new ExtensionCommon.EventManager(context, "addressBooks.onCreated", fire => {
            let listener = (event, node) => {
              fire.sync(cache.convert(node));
            };

            cache.on("address-book-created", listener);
            return () => {
              cache.off("address-book-created", listener);
            };
          }).api(),
        onUpdated: new ExtensionCommon.EventManager(context, "addressBooks.onUpdated", fire => {
            let listener = (event, node) => {
              fire.sync(cache.convert(node));
            };

            cache.on("address-book-updated", listener);
            return () => {
              cache.off("address-book-updated", listener);
            };
          }).api(),
        onDeleted: new ExtensionCommon.EventManager(context, "addressBooks.onDeleted", fire => {
            let listener = (event, item) => {
              fire.sync(item.UID);
            };

            cache.on("address-book-deleted", listener);
            return () => {
              cache.off("address-book-deleted", listener);
            };
          }).api(),
      },
      contacts: {
        list(parentId) {
          let parentNode = cache.findAddressBookById(parentId);
          return cache.convert(cache.getContacts(parentNode), false);
        },
        get(id) {
          return cache.convert(cache.findContactById(id), false);
        },
        create(parentId, id, properties) {
          let card = Cc["@mozilla.org/addressbook/cardproperty;1"].createInstance(Ci.nsIAbCard);
          for (let [name, value] of Object.entries(properties)) {
            if (!hiddenProperties.includes(name)) {
              card.setProperty(name, value);
            }
          }
          let parentNode = cache.findAddressBookById(parentId);
          let newCard = parentNode.item.addCard(card);
          return newCard.UID;
        },
        update(id, properties) {
          let node = cache.findContactById(id);
          let parentNode = cache.findAddressBookById(node.parentId);

          for (let [name, value] of Object.entries(properties)) {
            if (!hiddenProperties.includes(name)) {
              node.item.setProperty(name, value);
            }
          }
          parentNode.item.modifyCard(node.item);
        },
        delete(id) {
          let node = cache.findContactById(id);
          let parentNode = cache.findAddressBookById(node.parentId);

          let cardArray = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
          cardArray.appendElement(node.item);
          parentNode.item.deleteCards(cardArray);
        },

        onCreated: new ExtensionCommon.EventManager(context, "contacts.onCreated", fire => {
            let listener = (event, node) => {
              fire.sync(cache.convert(node));
            };

            cache.on("contact-created", listener);
            return () => {
              cache.off("contact-created", listener);
            };
          }).api(),
        onUpdated: new ExtensionCommon.EventManager(context, "contacts.onUpdated", fire => {
            let listener = (event, node) => {
              fire.sync(cache.convert(node));
            };

            cache.on("contact-updated", listener);
            return () => {
              cache.off("contact-updated", listener);
            };
          }).api(),
        onDeleted: new ExtensionCommon.EventManager(context, "contacts.onDeleted", fire => {
            let listener = (event, parent, item) => {
              fire.sync(parent.UID, item.UID);
            };

            cache.on("contact-deleted", listener);
            return () => {
              cache.off("contact-deleted", listener);
            };
          }).api(),
      },
      mailingLists: {
        list(parentId) {
          let parentNode = cache.findAddressBookById(parentId);
          return cache.convert(cache.getMailingLists(parentNode), false);
        },
        get(id) {
          return cache.convert(cache.findMailingListById(id), false);
        },
        create(parentId, { name, nickName, description }) {
          let mailList = Cc["@mozilla.org/addressbook/directoryproperty;1"].createInstance();
          mailList.QueryInterface(Ci.nsIAbDirectory);
          mailList.isMailList = true;
          mailList.dirName = name;
          mailList.listNickName = (nickName === null) ? "" : nickName;
          mailList.description = (description === null) ? "" : description;

          let parentNode = cache.findAddressBookById(parentId);
          let newMailList = parentNode.item.addMailList(mailList);
          return newMailList.UID;
        },
        update(id, { name, nickName, description }) {
          let node = cache.findMailingListById(id);
          node.item.dirName = name;
          node.item.listNickName = (nickName === null) ? "" : nickName;
          node.item.description = (description === null) ? "" : description;
          node.item.editMailListToDatabase(null);
        },
        delete(id) {
          let node = cache.findMailingListById(id);
          MailServices.ab.deleteAddressBook(node.item.URI);
        },

        listMembers(id) {
          let node = cache.findMailingListById(id);
          return cache.convert(cache.getListContacts(node), false);
        },
        addMember(id, contactId) {
          let node = cache.findMailingListById(id);
          let contactNode = cache.findContactById(contactId);
          node.item.addCard(contactNode.item);
        },
        removeMember(id, contactId) {
          let node = cache.findMailingListById(id);
          let contactNode = cache.findContactById(contactId);

          let cardArray = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
          cardArray.appendElement(contactNode.item);
          node.item.deleteCards(cardArray);
        },

        onCreated: new ExtensionCommon.EventManager(context, "mailingLists.onCreated", fire => {
            let listener = (event, node) => {
              fire.sync(cache.convert(node));
            };

            cache.on("mailing-list-created", listener);
            return () => {
              cache.off("mailing-list-created", listener);
            };
          }).api(),
        onUpdated: new ExtensionCommon.EventManager(context, "mailingLists.onUpdated", fire => {
            let listener = (event, node) => {
              fire.sync(cache.convert(node));
            };

            cache.on("mailing-list-updated", listener);
            return () => {
              cache.off("mailing-list-updated", listener);
            };
          }).api(),
        onDeleted: new ExtensionCommon.EventManager(context, "mailingLists.onDeleted", fire => {
            let listener = (event, parent, item) => {
              fire.sync(parent.UID, item.UID);
            };

            cache.on("mailing-list-deleted", listener);
            return () => {
              cache.off("mailing-list-deleted", listener);
            };
          }).api(),
        onMemberAdded: new ExtensionCommon.EventManager(context, "mailingLists.onMemberAdded", fire => {
            let listener = (event, node) => {
              fire.sync(cache.convert(node));
            };

            cache.on("mailing-list-member-added", listener);
            return () => {
              cache.off("mailing-list-member-added", listener);
            };
          }).api(),
        onMemberRemoved: new ExtensionCommon.EventManager(context, "mailingLists.onMemberRemoved", fire => {
            let listener = (event, parent, item) => {
              fire.sync(parent.UID, item.UID);
            };

            cache.on("mailing-list-member-removed", listener);
            return () => {
              cache.off("mailing-list-member-removed", listener);
            };
          }).api(),
      },
    };
  }
};
