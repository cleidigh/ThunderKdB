/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs
} from '/common/common.js';

async function getListFromAddress(address) {
  const addressbooks = await browser.addressBooks.list();
  for (const addressbook of addressbooks) {
    const mailingLists = await browser.mailingLists.list(addressbook.id);
    for (const mailingList of mailingLists) {
      if (address == `${mailingList.name} <${mailingList.description || mailingList.name}>`)
        return mailingList;
    }
  }
  return null;
}

function contactToAddress(contact) {
  let displayName = contact.properties.DisplayName;
  if (!displayName) {
    const nameElements = [];
    if (contact.properties.FirstName)
      nameElements.push(contact.properties.FirstName);
    if (contact.properties.LastName)
      nameElements.push(contact.properties.LastName);
    if (configs.showLastNameFirst)
      nameElements.reverse();
    displayName = nameElements.join(' ');
  }
  const address = contact.properties.PrimaryEmail || contact.properties.SecondEmail;
  if (displayName)
    return `${displayName} <${address}>`;
  return address;
}

export async function populateListAddresses(addresses) {
  const populated = await Promise.all(addresses.map(async address => {
    const list = await getListFromAddress(address);
    if (!list)
      return address;
    const contacts = await browser.mailingLists.listMembers(list.id);
    return contacts.map(contactToAddress);
  }));
  return populated.flat();
}
