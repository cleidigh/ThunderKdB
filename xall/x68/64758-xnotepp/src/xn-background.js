/*
 * Documentation:
 * https://github.com/thundernest/addon-developer-support/wiki/Using-the-WindowListener-API-to-convert-a-Legacy-Overlay-WebExtension-into-a-MailExtension-for-Thunderbird-78
 */

//TODO
/*
x   note does not close
displaying a new note by click triggers unload listener (ca. 6 times)
*/
const debug = true;

var lastTab=0, lastWindow=0;

var _preferences;


// This is the current "migration" version for preferences. You can increase it later
// if you happen to need to do more pref (or maybe other migrations) only once
// for a user.
const kCurrentLegacyMigration = 1;

// This is the list of defaults for the legacy preferences.
const kPrefDefaults = {
  usetag: false,
  dateformat: "yyyy-mm-dd - HH:MM",
  width: 250,
  height: 200,
  horPos: 250,
  vertPos: 250,
  show_on_select: true,
  show_first_x_chars_in_col: 20,
  storage_path: "[ProfD]XNote"
};

async function migratePrefs() {
  //console.debug("migratePrefs called.")
  const results = await browser.storage.local.get("preferences");

  const currentMigration =
    results.preferences && results.preferences.migratedLegacy
      ? results.preferences.migratedLegacy
      : 0;

  if (currentMigration >= kCurrentLegacyMigration) {
    return;
  }

  let prefs = results.preferences || {};

  if (currentMigration < 1) {
    for (const prefName of Object.getOwnPropertyNames(kPrefDefaults)) {
      prefs[prefName] = await browser.xnoteapi.getPref(prefName);
      if (prefs[prefName] === undefined) {
        prefs[prefName] = kPrefDefaults[prefName];
      }
    }
  }

  prefs.migratedLegacy = kCurrentLegacyMigration;
  console.debug("Storing migrated preferences.");
  await browser.storage.local.set({ "preferences": prefs });
}

async function getTbPref(name) {
  return browser.xnoteapi.getTbPref(name);
}

async function setTbPref(name, value) {
  browser.xnoteapi.setTbPref(name, value);
}

function getPreferences() {
  return _preferences;
}

async function setPreferences(preferences) {
  _preferences = preferences;
  browser.storage.local.set({ "preferences": _preferences })
  browser.xnoteapi.setPreferences(preferences);
}

async function selectDirectory(startDir, title) {
  let result = await browser.xnotefiles.selectDirectory(null, startDir, title);
  console.debug("select directory returns: "+result);
  return result;
}

async function getProfileDirectory() {
  return await browser.xnotefiles.getProfileDirectory();
}

async function appendRelativePath(basePath, extension){
  return await browser.xnotefiles.appendRelativePath(basePath, extension);
}

async function main() {
  await migratePrefs();

  _preferences = (await browser.storage.local.get("preferences")).preferences;
  if (debug) {
    console.debug({"Preferences" : _preferences});
  }
  await browser.xnoteapi.setPreferences(_preferences);
  await browser.xnoteapi.init();

  // landing windows.
  messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
    // if (temporary) return; // skip during development
    switch (reason) {
      case "install":
      {
        let url = browser.runtime.getURL("popup/installed.html");
        //await browser.tabs.create({ url });
        await browser.windows.create({ url, type: "popup", width: 910, height: 750, });
      }
      break;
      // see below
      case "update":
      {
        let url = browser.runtime.getURL("popup/update.html");
        //await browser.tabs.create({ url });
        await browser.windows.create({ url, type: "popup", width: 910, height: 750, });
      }
      break;
    // see below
    }
  });   

  messenger.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
    //console.log(`Message displayed in tab ${tab.id}: ${message.subject}`);
  });

//    messenger.messageDisplayAction.disable();
//    messenger.messageDisplayAction.setBadgeText({text:"test"});
  
  messenger.tabs.onActivated.addListener(async (activeInfo) => {
    //console.log("tab activated "+ activeInfo.tabId + " window: " + activeInfo.windowId);
    lastTab = activeInfo.tabId;
    lastWindow = activeInfo.windowId;
    let tabInfo = await messenger.tabs.get( activeInfo.tabId);
    if (!tabInfo.mailTab) messenger.xnoteapi.closeNoteWindow();
  });
  
  messenger.WindowListener.registerChromeUrl([ 
    ["content", "xnote", "chrome/content/"],
    ["resource", "xnote", "chrome/"],

    ["locale", "xnote", "en-US", "chrome/locale/en-US/"],
    ["locale", "xnote", "de", "chrome/locale/de/"],
    ["locale", "xnote", "fr-FR", "chrome/locale/fr-FR/"],
    ["locale", "xnote", "gl", "chrome/locale/gl/"],
    ["locale", "xnote", "it-IT", "chrome/locale/it-IT/"],
    ["locale", "xnote", "ja-JP", "chrome/locale/ja-JP/"],
    ["locale", "xnote", "nl-NL", "chrome/locale/nl-NL/"],
    ["locale", "xnote", "pl-PL", "chrome/locale/pl-PL/"],
    ["locale", "xnote", "pt-BR", "chrome/locale/pt-BR/"],
  ]);

  messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/xn-xnote-overlay.js");

  browser.browserAction.onClicked.addListener(async (tab, info) => {
    messenger.xnoteapi.initNote();
  });

  browser.browserAction.disable();

 /*
  * Start listening for opened windows. Whenever a window is opened, the registered
  * JS file is loaded. To prevent namespace collisions, the files are loaded into
  * an object inside the global window. The name of that object can be specified via
  * the parameter of startListening(). This object also contains an extension member.
  */
    messenger.WindowListener.startListening();
}

main().catch(console.error);