/**
 * preventCachingOverlay.js
 * Copyright (C) 2013 LEAP
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along
 */


// The following variable will hold the current account being edited after
// onPreInit() is called.
var currentAccount = null;


// The following function disables UI items that would allow a user to turn on
// offline caching for a LEAP account. It acts on am-offline.xul items that
// can be accessed in Thunderbird by choosing:
//
//   Edit -> Account Settings... -> Synchronization and Storage.
// In order to be somewhat consistent, we only disable those items if the
// account already has its offline caching turned off. Accounts created with
// the Bitmask wizard are created with offline caching turned off (and so the
// UI items are disabled from the beginning). Accounts created manually will
// have offline caching turned on by default, and thus need a way to disable
// it if the user ever wants to. Once offline caching is disabled, then the
// user will not be able to turn it on again for Leap accounts.
function disableOfflineCaching()
{
  var disabled;
  var checkbox = document.getElementById("offline.folders")
  // For now, we consider a LEAP account every account whose incoming server
  // has a hostname equal to IMAP_HOST and port equal to IMAP_PORT.
  if (currentAccount.incomingServer.port == IMAP_PORT &&
      currentAccount.incomingServer.hostName == IMAP_HOST &&
      checkbox.checked == false)
    disabled = true;
  else
    disabled = false;
  // The "Keep messsages for this account on this computer" checkbox.
  checkbox.disabled = disabled;
  // The "Advanced..." button.
  document.getElementById("selectImapFoldersButton").disabled = disabled;
}


// Clone 'am-offline.js' onPreInit() so we can store the current account.
var oldOnPreInit = onPreInit.bind({});

// Store current account and call old onPreInit().
var onPreInit = function(account, accountValues)
{
  currentAccount = account;
  oldOnPreInit(account, accountValues);
}


// Clone 'am-offline.js' onInit() so we can disable offline caching.
var oldOnInit = onInit.bind({});

// Call old onInit() and disable offline caching.
var onInit = function(aPageId, aServerId)
{
  oldOnInit(aPageId, aServerId);
  disableOfflineCaching();
}

