/*
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

"use strict"; // use strict mode


// For updating the state of the "Enable mail folder key navigation" menu item
// in response to changes in settings saved in storage.local.
var updateMenuItem = function(itemId) {
  let iid = itemId;
  return async (changes, areaName) => {
  	if (areaName!="local") {
  	  return;
    }
    console.debug("keynav.updateMenuItem: making changes");
    let menuProperties = {};
    if (changes.hasOwnProperty("MailFolderKeyNav")) {
  	  menuProperties.checked = changes.MailFolderKeyNav.newValue;
      await applyKeyNavToAllWindows(changes.MailFolderKeyNav.newValue);
      console.debug("keynav.updateMenuItem: updated key navigation setting");
    }
    if (changes.hasOwnProperty("MailFolderKeyNavMenuItem")) {
      menuProperties.enabled = changes.MailFolderKeyNavMenuItem.newValue;
      menuProperties.visible = changes.MailFolderKeyNavMenuItem.newValue;
      console.debug("keynav.updateMenuItem: Updated context menu item visibility setting");
    }
    messenger.menus.update(iid, menuProperties);
    console.debug("keynav.updateMenuItem: done");
  };
}

 
// enable/disable key navigation on the mail folder tree of a specified window
async function applyKeyNavToWindow(windowId) {
  // Get saved settings
  const settings = await getSavedSettings();
  console.debug("keynav.applyKeyNavToWindow: calling enableKeyNavigation");
  // Apply key navigation setting to mail folder tree
  await messenger.FolderUI.enableKeyNavigation(windowId, settings.MailFolderKeyNav);
  console.debug("keynav.applyKeyNavToWindow: enableKeyNavigation done");
}

// enable/disable key navigation on the mail folder tree of all windows
async function applyKeyNavToAllWindows() {
  // Get saved settings
  const settings = await getSavedSettings();
  console.debug("keynav.applyKeyNavToAllWindows: looping through all windows");
  let windows = await messenger.windows.getAll({windowTypes:["normal"]});
  for (let win of windows) {
    // Apply key navigation setting to mail folder tree
    await messenger.FolderUI.enableKeyNavigation(win.id, settings.MailFolderKeyNav);
  } // for
  console.debug("keynav.applyKeyNavToAllWindows: done looping through windows");
}


// For displaying a "What's New" dialog
function setKeyNavOnInstall(details) {
	if (details.reason=="update") {
    messenger.windows.create({
      allowScriptsToClose: true,
      //focused: true, //not allowed in Thunderbird
      state: "maximized",
      type: "popup",
      url: "whatsnew/whatsnew.html"
    });
  }
}


// Initialise extension
(async function() {
  console.debug("keynav.init: starting");
  // Get saved settings
  const settings = await getSavedSettings(); // check if the settings are saved, otherwise use defaults
  console.debug("keynav.init: setting up context menu entry");
  // Set up menu
  let itemId = messenger.menus.create({
    id: "appmenu_MailFolderKeyNavMenuItem",
    type: "checkbox",
    contexts: ["folder_pane"],
    title: messenger.i18n.getMessage("menu_EnableMailFolderKeyNav.label"),
    checked: settings.MailFolderKeyNav,
    visible: settings.MailFolderKeyNavMenuItem,
    enabled: settings.MailFolderKeyNavMenuItem,
    onclick: async function(ev) {
      await messenger.storage.local.set({"MailFolderKeyNav": ev.checked});
    }
  });
  messenger.storage.onChanged.addListener(updateMenuItem(itemId));
  // Initialise all existing windows
  console.debug("keynav.init: applying key navigation to all windows");
  await applyKeyNavToAllWindows();
  console.debug("keynav.init: done");
})();


// Set up listeners
// Since this is just a bug-fix release, there's no What's New dialog 
// to display. The following line is commented so it doesn't get set up.
//messenger.runtime.onInstalled.addListener(setKeyNavOnInstall ); // display a What's New dialog on installation

messenger.windows.onCreated.addListener(window => {
  console.debug("keynav.windows.onCreated: fired");
	applyKeyNavToWindow(window.id)
	.then(() => {
		console.debug("keynav.windows.onCreated: applyKeyNavToWindow done");
	});
});
	