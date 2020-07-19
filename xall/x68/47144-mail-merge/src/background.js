"use strict";
browser.mailmerge.init();
browser.composeAction.onClicked.addListener(function() { browser.mailmerge.click(); });
browser.runtime.onUpdateAvailable.addListener(function() { /* null */ });
