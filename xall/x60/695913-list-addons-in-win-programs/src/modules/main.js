/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var BASE = 'extensions.list-addons-in-win-programs@clear-code.com.';
var prefs = require('lib/prefs').prefs;
{
  if (prefs.getDefaultPref(BASE + 'debug') === null)
    prefs.setDefaultPref(BASE + 'debug', false);
}

var registry = require('registry').registry;
var { AddonManager } = Cu.import('resource://gre/modules/AddonManager.jsm', {});
var { Services } = Cu.import('resource://gre/modules/Services.jsm', {});
var { FileUtils } = Cu.import('resource://gre/modules/FileUtils.jsm', {});

var exePath = FileUtils.getFile("XREExeF", []).path;
var basePath = 'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall';
var addonBasePath = basePath + '\\' + Services.appinfo.ID + '.';

function log(message) {
  if (prefs.getPref(BASE + 'debug')) {
    console.log("[list-addons-in-win-programs] " + message);
  }
}

log('Services.appinfo.ID: ' + Services.appinfo.ID);
log('Services.appinfo.name: ' + Services.appinfo.name);

function createRegistryKey(aAddon) {
  log('createRegistryKey');
  var key = addonBasePath + aAddon.id;
  log('key: ' + key);
  return key;
}

function registerUninstallInfo(aKey, aAddon) {
  log('registerUninstallInfo');
  log('aKey: ' + aKey);
  log('aAddon.id: ' + aAddon.id);
  registry.setValue(aKey + '\\' + 'DisplayName', Services.appinfo.name + ': ' + aAddon.name);
  registry.setValue(aKey + '\\' + 'DisplayVersion', aAddon.version);
  registry.setValue(aKey + '\\' + 'UninstallString', exePath);
  registry.setValue(aKey + '\\' + 'DisplayIcon', exePath + ',0');
  registry.setValue(aKey + '\\' + 'Publisher', aAddon.creator.name);
}

AddonManager.getAllAddons(function(aAddons) {
  var registeringKeys = [];
  aAddons.forEach(function(aAddon) {
    log('aAddon.id: ' + aAddon.id);
    log('aAddon.name: ' + aAddon.name);
    log('aAddon.type: ' + aAddon.type);
    log('aAddon.hidden: ' + aAddon.hidden);
    if (aAddon.type !== 'extension')
      return;
    if (aAddon.hidden)
      return;
    var key = createRegistryKey(aAddon);
    registerUninstallInfo(key, aAddon);
    registeringKeys.push(key);
  });
  log('registeringKeys: ' + JSON.stringify(registeringKeys));

  var existingKeys = registry.getChildren(basePath);
  log('existingKeys: ' + existingKeys.join('\n'));
  existingKeys.forEach(function(key) {
    log('existing key: ' + key);
    log('indexOf: ' + registeringKeys.indexOf(key));
    if (key.indexOf(addonBasePath) !== 0)
      return;
    if (registeringKeys.indexOf(key) === -1) {
      log('registry.clear: ' + key);
      registry.clear(key);
    }
  });
});

/**
 * A handler for shutdown event. This will be called when the addon
 * is disabled or uninstalled (include updating).
 */
function shutdown(aReason) {
  log('shutdown');
  log('aReason: ' + aReason);
  switch (aReason) {
    case 'ADDON_DISABLE':
    case 'ADDON_UNINSTALL':
      var existingKeys = registry.getChildren(basePath);
      log('existingKeys: ' + existingKeys.join('\n'));
      existingKeys.forEach(function(key) {
        log('existing key: ' + key);
        log('indexOf: ' + key.indexOf(addonBasePath));
        if (key.indexOf(addonBasePath) === 0) {
          registry.clear(key);
        }
      });
      break;
  }
}
