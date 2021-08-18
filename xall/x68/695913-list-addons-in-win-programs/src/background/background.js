/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

const HOST_ID = 'com.clear_code.list_addons_in_win_programs_we_host';

const mAddons = new Map();

browser.management.getAll().then(async addons => {
  console.log('initialization: try to register addons ', addons);
  await Promise.all(addons.map(addToRegistry));
  const ids = await getRegisteredAddonIds();
  console.log('initialization: try to unregister unknown addons ', ids);
  for (const id of ids) {
    if (!mAddons.has(id))
      removeFromRegistry(id);
  }
});

browser.management.onInstalled.addListener(addon => {
  console.log('onInstalled: ', addon);
  addToRegistry(addon);
});

// This won't be called when the addon is uninstalled via about:addons. Why?
browser.management.onUninstalled.addListener(addon => {
  console.log('onUninstalled: ', addon);
  removeFromRegistry(addon.id);
});

// This never been called...
browser.management.onDisabled.addListener(addon => {
  console.log('onDisabled: ', addon);
  if (addon.id != browser.runtime.id)
    return;

  for (const id of mAddons.keys()) {
    removeFromRegistry(id);
  }
});

async function addToRegistry(addon) {
  console.log('addToRegistry: ', addon);
  if (addon.type != 'extension') {
    console.log(' => ignore non-extension addon');
    return;
  }
  if (addon.id.endsWith('@search.mozilla.org')) {
    console.log(' => ignore default search providers');
    return;
  }
  mAddons.set(addon.id, addon);
  try {
    const response = await sendToHost({
      command: 'register-addon',
      params: {
        id:      addon.id,
        name:    addon.name,
        version: addon.version,
        creator: 'unknown',
      },
    });
    console.log('addToRegistry response: ', addon.id, response);
  }
  catch(error) {
    console.error(error);
  }
}

async function removeFromRegistry(id) {
  console.log('removeFromRegistry: ', id);
  mAddons.delete(id);
  try {
    const response = await sendToHost({
      command: 'unregister-addon',
      params: {
        id,
      },
    });
    console.log('removeFromRegistry response: ', id, response);
  }
  catch(error) {
    console.error(error);
  }
}

async function getRegisteredAddonIds() {
  try {
    const response = await sendToHost({
      command: 'list-registered-addons',
    });
    return response.ids;
  }
  catch(error) {
    console.error(error);
    return [];
  }
}

async function sendToHost(message) {
  try {
    const response = await browser.runtime.sendNativeMessage(HOST_ID, {
      ...message,
      logging: true,
    });
    if (!response || typeof response != 'object')
      throw new Error(`invalid response: ${String(response)}`);
    return response;
  }
  catch(error) {
    console.log('Error: failed to get response for message', message, error);
    return null;
  }
}
