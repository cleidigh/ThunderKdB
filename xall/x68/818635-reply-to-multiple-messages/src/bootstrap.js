// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright 2017 Jonathan Kamens.

// https://developer.mozilla.org/en-US/docs/Extensions/bootstrap.js
// Also, lots of code here cribbed from
// https://developer.mozilla.org/en-US/Add-ons/How_to_convert_an_overlay_extension_to_restartless

const {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");
const {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
const {MailServices} = ChromeUtils.import(
    "resource:///modules/MailServices.jsm");

prefBranch = Services.prefs;
prefPrefix = "extensions.reply-to-multiple-messages";
bccPref = prefPrefix + ".use_bcc";
refsPref = prefPrefix + ".hide_references";
prefsLoaded = false;

function startup(data, reason) {
    setEverythingUp("startup");
    logger.trace("startup");
}

function setEverythingUp(which) {
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    ///   string id
    ///   string version
    ///   nsIFile installPath
    ///   nsIURI resourceURI
    /// 
    /// Reason types:
    ///   APP_STARTUP
    ///   ADDON_ENABLE
    ///   ADDON_INSTALL
    ///   ADDON_UPGRADE
    ///   ADDON_DOWNGRADE
    loadDefaultPreferences();
    initLogging();
    logger.trace("setEverythingUp");
    if (which == "startup") {
        Services.obs.addObserver(WindowObserver, "mail-startup-done", false);
        forEachOpenWindow(loadIntoWindow);
    }
}

function shutdown(data, reason) {
    try {
        logger.trace("shutdown");
    } catch {}
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    ///   string id
    ///   string version
    ///   nsIFile installPath
    ///   nsIURI resourceURI
    /// 
    /// Reason types:
    ///   APP_SHUTDOWN
    ///   ADDON_DISABLE
    ///   ADDON_UNINSTALL
    ///   ADDON_UPGRADE
    ///   ADDON_DOWNGRADE
    if (reason == APP_SHUTDOWN)
        return;

    forEachOpenWindow(unloadFromWindow);
    Services.obs.removeObserver(WindowObserver, "mail-startup-done");

    // HACK WARNING: The Addon Manager does not properly clear all addon
    //               related caches on update; in order to fully update images
    //               and locales, their caches need clearing here
    Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}

function install(data, reason) {
    setEverythingUp("install");
    logger.trace("install");
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    ///   string id
    ///   string version
    ///   nsIFile installPath
    ///   nsIURI resourceURI
    /// 
    /// Reason types:
    ///   ADDON_INSTALL
    ///   ADDON_UPGRADE
    ///   ADDON_DOWNGRADE
}

function uninstall(data, reason) {
    logger.trace("uninstall");
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    ///   string id
    ///   string version
    ///   nsIFile installPath
    ///   nsIURI resourceURI
    /// 
    /// Reason types:
    ///   ADDON_UNINSTALL
    ///   ADDON_UPGRADE
    ///   ADDON_DOWNGRADE
}

function loadIntoWindow(window) {
    logger.trace("loadInToWindow");
    var document = window.document;
    var menu = document.getElementById("messageMenuPopup");
    if (! menu) {
        return;
    }

    if (document.getElementById("rtmm_menu_reply")) {
        // Already done during startup!
        return;
    }

    var old_menuitem = document.getElementById("menu_forwardMsg");

    var new_menuitem = document.createXULElement("menuitem");
    new_menuitem.setAttribute("id", "rtmm_menu_reply");
    new_menuitem.setAttribute("label", "Reply to Selected");
    // Closure so we have access to window.
    var replyToSelectedClosure = function(event) { replyToSelected(window); };
    new_menuitem.addEventListener("command", replyToSelectedClosure);
    menu.insertBefore(new_menuitem, old_menuitem);

    new_menuitem = document.createXULElement("menuitem");
    new_menuitem.setAttribute("id", "rtmm_menu_replyAll");
    new_menuitem.setAttribute("label", "Reply All to Selected");
    // Closure so we have access to window.
    var replyAllToSelectedClosure = function(event) {
        replyAllToSelected(window); };
    new_menuitem.addEventListener("command", replyAllToSelectedClosure);
    menu.insertBefore(new_menuitem, old_menuitem);

    var contextMenu = document.getElementById("mailContext");
    old_menuitem = document.getElementById("mailContext-forward");
    new_menuitem = document.createXULElement("menuitem");
    new_menuitem.setAttribute("id", "rtmm_menuContext_reply");
    new_menuitem.setAttribute("label", "Reply to Selected");
    new_menuitem.addEventListener("command", replyToSelectedClosure);
    contextMenu.insertBefore(new_menuitem, old_menuitem);

    new_menuitem = document.createXULElement("menuitem");
    new_menuitem.setAttribute("id", "rtmm_menuContext_replyAll");
    new_menuitem.setAttribute("label", "Reply All to Selected");
    new_menuitem.addEventListener("command", replyAllToSelectedClosure);
    contextMenu.insertBefore(new_menuitem, old_menuitem);

    // Isn't it just AWESOME what I have to add these menu commands in THREE
    // DIFFERENT PLACES?! Way, to go, Thunderbird developers, great job making
    // it easy for add-on developers to add new commands!
    if (! isSeaMonkey()) {
        var appMenu = document.getElementById("appmenu_messageMenuPopup");
        old_menuitem = document.getElementById("appmenu_forwardMsg");
        new_menuitem = document.createXULElement("menuitem");
        new_menuitem.setAttribute("id", "rtmm_appmenu_reply");
        new_menuitem.setAttribute("label", "Reply to Selected");
        new_menuitem.addEventListener("command", replyToSelectedClosure);
        appMenu.insertBefore(new_menuitem, old_menuitem);

        new_menuitem = document.createXULElement("menuitem");
        new_menuitem.setAttribute("id", "rtmm_appmenu_replyAll");
        new_menuitem.setAttribute("label", "Reply All to Selected");
        new_menuitem.addEventListener("command", replyAllToSelectedClosure);
        appMenu.insertBefore(new_menuitem, old_menuitem);
    }

    // So, the object here is for the menu command to be greyed out when no
    // messages are selected. For other command in this menu, that's
    // implemented by the mailMessageMenuItems commandset, which has
    // commandupdater set to true and oncommandupdate set to
    // goUpdateMailMenuItems(this). I can't horn in on that action since my
    // menu command isn't part of that controller, so I need to create a
    // different commandset with my own handler.
    //
    // I think the "right" way to do this is to create a command object inside
    // the the commandset and then associate that command object with the
    // menuitem by setting its "command" attribute, but when I try that the
    // command never gets executed, and I can't figure out what I'm doing
    // wrong, and it's not like it's documented properly anywhere, so I'm
    // throwing up my hands and doing it in a hacky way.
    var mailCommands = document.getElementById("mailCommands");
    var rtmmCommands = document.createXULElement("commandset");
    rtmmCommands.setAttribute("id", "rtmmCommands");
    rtmmCommands.setAttribute("commandupdater", "true");
    rtmmCommands.setAttribute("events", "create-menu-message");
    // Closure so we have access to window in the event listener.
    var updateMenuItemsClosure = function(event) {
        updateMenuItems(window, updateMenuItemsClosure); };
    rtmmCommands.addEventListener("commandupdate", updateMenuItemsClosure);

    mailCommands.appendChild(rtmmCommands);

    contextMenu.addEventListener("popupshowing", updateMenuItemsClosure);
}

function unloadFromWindow(window) {
    logger.trace("unloadFromWindow");
    /* call/move your UI tear down function here */
    document = window.document;

    // Delete nodes in the opposite order that they were added.
    var mailCommands = document.getElementById("mailCommands");
    var rtmmCommands = document.getElementById("rtmmCommands");
    mailCommands.removeChild(rtmmCommands);

    var menu = document.getElementById("messageMenuPopup");
    var menuitem = document.getElementById("rtmm_menu_replyAll");
    menu.removeChild(menuitem);
    menuitem = document.getElementById("rtmm_menu_reply");
    menu.removeChild(menuitem);

    menu = document.getElementById("mailContext");
    menuitem = document.getElementById("rtmm_menuContext_replyAll");
    menu.removeChild(menuitem);
    menuitem = document.getElementById("rtmm_menuContext_reply");
    menu.removeChild(menuitem);

    if (! isSeaMonkey()) {
        menu = document.getElementById("appmenu_messageMenuPopup");
        menuitem = document.getElementById("rtmm_appmenu_replyAll");
        menu.removeChild(menuitem);
        menuitem = document.getElementById("rtmm_appmenu_reply");
        menu.removeChild(menuitem);
    }    
}

function forEachOpenWindow(todo) { // Apply a function to all open windows
    logger.trace("forEachOpenWindow");
    for (let window of Services.wm.getEnumerator("mail:3pane")) {
        todo(window);
    }
}

var WindowObserver = {
    observe: function(aSubject, aTopic, aData) {
        logger.trace("WindowObserver.observe");
        var window = aSubject;
        var document = window.document;
        if (document.documentElement.getAttribute("windowtype") ==
            "mail:3pane") {
            loadIntoWindow(window);
        }
    },
};

// Class for building address lists.
function AddressList() {
    this.addresses = "";
}
AddressList.prototype.add = function(newAddresses) {
    if (this.addresses) {
        if (newAddresses) {
            this.addresses += ", " + newAddresses;
        }
        return;
    }
    this.addresses = newAddresses;
}
AddressList.prototype.stringify = function(otherAddresses) {
    // XXX Remove aliases to me at some point, maybe?
    return MailServices.headerParser.removeDuplicateAddresses(
        this.addresses, otherAddresses);
}

// Class for building ID lists.
function IdList() {
    this.strIds = "";
}
IdList.prototype.add = function(strNewIds) {
    // Whitespace between IDs is optional in the RFC, so add it if it's
    // missing before splitting.
    strNewIds = strNewIds.replace(/>([^\s])/g, '> $1');
    var newIds = strNewIds.split(/\s+/);
    for (var i in newIds) {
        if (this.strIds.indexOf(newIds[i]) == -1) {
            if (this.strIds) {
                this.strIds += " " + newIds[i];
            }
            else {
                this.strIds = newIds[i];
            }
        }
    }
}
IdList.prototype.stringify = function() {
    return this.strIds;
}

// Class for generating a smart reply subject from a bunch of subjects.
function SmartReplySubject() {
    this.commonSuffix = "";
    this.maxLength = 0;
    this.averageLength = 0;
    this.subjectCount = 0;
}
SmartReplySubject.prototype.add = function(newSubject) {
    newSubject = newSubject.trim();
    if (! newSubject) {
        return;
    }

    if (! this.commonSuffix) {
        this.commonSuffix = newSubject;
        this.maxLength = this.averageLength = newSubject.length;
        this.subjectCount = 1;
        return;
    }

    var i = this.commonSuffix.length;
    var j = newSubject.length;
    
    while (i && j) {
        if (this.commonSuffix[i - 1] != newSubject[j - 1]) {
            break;
        }
        i--; j--;
    }

    this.commonSuffix = newSubject.substring(j);
    if (newSubject.length > this.maxLength) {
        this.maxLength = newSubject.length;
    }
    this.averageLength = (this.subjectCount * this.averageLength +
                          newSubject.length) / (this.subjectCount + 1);
    this.subjectCount++;
}
SmartReplySubject.prototype.stringify = function() {
    // I'm not sure yet what I want to use use as the logic here. I'm tracking
    // both the maximum and average subject lengths above, but I'm not sure I
    // really want to be so smart as to use them. For the time being, I'm just
    // going to return it if it's anything at all.
    var stripped = this.commonSuffix.replace(/^re:\s*/i, "");
    return "Re: " + stripped;
}

function IdentityFinder() {
    this.serverIdentities = [];
    this.addressIdentities = [];
}
IdentityFinder.prototype.addMessage = function(hdr) {
    // Count the first identity of the server of the folder the message is in.
    // Count the identities associated with recipient email addresses.
    var accountManager = MailServices.accounts;
    var server = hdr.folder.server;
    serverIdentity = accountManager.getFirstIdentityForServer(server);
    if (serverIdentity) {
        key = serverIdentity.key;
        if (this.serverIdentities[key]) {
            this.serverIdentities[key]++;
        }
        else {
            this.serverIdentities[key] = 1;
        }
        logger.debug("IdentityFinder: Counted identity " +
                     serverIdentity.email + " (" + serverIdentity.key +
                     ") for folder server");
    }

    var headerParser = MailServices.headerParser;
    var recipients = headerParser.extractHeaderAddressMailboxes(
        hdr.getStringProperty("recipients"));
    var ccs = headerParser.extractHeaderAddressMailboxes(
        hdr.getStringProperty("ccList"));
    var recipientAddresses = recipients.split(",").concat(ccs.split(","));
    for (var i in recipientAddresses) {
        this.addAddress(server, recipientAddresses[i]);
    }
}
IdentityFinder.prototype.addAddress = function(server, addr) {
    // First try to find the address in the server's identities. If that
    // doesn't work, fall back on finding the address in all available
    // identities.
    if (! addr) {
        return;
    }
    var accountManager = MailServices.accounts;
    if (this.addAddressIdentity(
        accountManager.getIdentitiesForServer(server).enumerate(), addr)) {
        logger.debug("IdentityFinder: Found identity for " + addr +
                     " on server of folder");
        return;
    }
    if (this.addAddressIdentity(
        accountManager.allIdentities.enumerate(), addr)) {
        logger.debug("IdentityFinder: Found identity for " + addr +
                     " on different server");
    }
    else {
        logger.debug("IdentityFinder: Could not find identity for " + addr);
    }
}
IdentityFinder.prototype.addAddressIdentity = function(identities, addr) {
    addr = addr.toLowerCase();
    while (identities.hasMoreElements()) {
        var identity = identities.getNext();
        var email = identity.email;
        if (email && email.toLowerCase() == addr) {
            var key = identity.key;
            if (this.addressIdentities[key]) {
                this.addressIdentities[key]++;
            }
            else {
                this.addressIdentities[key] = 1;
            }
            logger.debug("IdentityFinder: Counted identity " + email + " (" +
                         key + ") for recipient");
            return true;
        }
    }
    return false;
}
IdentityFinder.prototype.get = function() {
    // If we successfully identified any addressee identities, then use the one
    // that got the votes. Otherwise, use the server identity that got the most
    // votes.
    var accountManager = MailServices.accounts;
    var max = 0;
    var maxKey;
    for (var key in this.addressIdentities) {
        if (this.addressIdentities[key] > max) {
            max = this.addressIdentities[key]
            maxKey = key;
        }
    }
    if (max) {
        logger.debug("IdentityFinder: Using identity " + maxKey + " (" + max +
                     " votes)");
        return accountManager.getIdentity(maxKey);
    }
    for (var key in this.serverIdentities) {
        if (this.serverIdentities[key] > max) {
            max = this.serverIdentities[key];
            maxKey = key;
        }
    }
    if (max) {
        logger.debug("IdentityFinder: Using identity " + maxKey + " (" + max +
                     " votes)");
        return accountManager.getIdentity(maxKey);
    }
    logger.debug("IdentityFinder: Using default identity");
    return null;
}

function replyToSelectedExtended(window, replyAll) {
    logger.debug("Entering replyToSelected");
    var tmp;
    var gFolderDisplay = window["gFolderDisplay"];
    var goDoCommand = window["goDoCommand"];
    if (gFolderDisplay.selectedCount < 1) {
        return;
    }
    if (gFolderDisplay.selectedCount == 1) {
        goDoCommand(replyAll ? "cmd_replyall" : "cmd_reply");
        return;
    }

    var collectedRecipients = new AddressList();
    var collectedCCs = new AddressList();
    var collectedReferences = new IdList();
    var collectedInReplyTo = new IdList();
    var collectedSubject = new SmartReplySubject();
    var identityFinder = new IdentityFinder();

    for (var i in gFolderDisplay.selectedMessages) {
        var msg = gFolderDisplay.selectedMessages[i];
        logger.debug("----------");
        identityFinder.addMessage(msg);
        var subject = msg.getStringProperty("subject");
        // Wrapping this and the subsequent ones in the if isn't actually
        // functionally necessary, but it reduces unnecessary logging.
        if (subject) {
            logger.debug("Adding subject " + subject);
            collectedSubject.add(subject);
        }

        var sender = msg.getStringProperty("replyTo") ||
            msg.getStringProperty("sender");
        if (sender) {
            logger.debug("Adding recipient " + sender);
            collectedRecipients.add(sender);
        }

        if (replyAll) {
            var recipients = msg.getStringProperty("recipients");
            if (recipients) {
                logger.debug("Adding recipients from to " + recipients);
                collectedRecipients.add(recipients);
            }
            var ccList = msg.getStringProperty("ccList");
            if (ccList) {
                logger.debug("Adding CCs " + ccList);
                collectedCCs.add(ccList);
            }
        }

        var references = msg.getStringProperty("references");
        if (references) {
            logger.debug("Adding references " + references);
            collectedReferences.add(references);
        }

        var message_id = msg.getStringProperty("message-id");
        if (message_id) {
            if (message_id[0] != '<') {
                message_id = '<' + message_id + '>';
            }
            logger.debug("Adding message-id " + message_id);
            collectedInReplyTo.add(message_id);
        }
        else {
            logger.error("No message ID!");
        }
    }

    loadDefaultPreferences(); // Just in case it failed before
    var use_bcc = prefBranch.getBoolPref(bccPref);
    var hide_references = prefBranch.getBoolPref(refsPref);

    var inReplyTo = collectedInReplyTo.stringify();

    if (inReplyTo) {
        logger.debug("Appending in-reply-to to references");
        collectedReferences.add(inReplyTo);
    }

    var references = collectedReferences.stringify();

    var recipients = collectedRecipients.stringify("");
    var ccs = collectedCCs.stringify(recipients);
    var subject = collectedSubject.stringify();

    logger.debug("Final values:");
    logger.debug("Subject: " + subject);
    logger.debug("To: " + recipients);
    if (replyAll) {
        logger.debug("CC: " + ccs);
    }
    logger.debug("In-Reply-To: " + inReplyTo);
    logger.debug("References: " + references);

    var msgComposeService = MailServices.compose;
    var params = Components.
        classes["@mozilla.org/messengercompose/composeparams;1"].
        createInstance(Components.interfaces.nsIMsgComposeParams);
    params.identity = identityFinder.get();
    var fields = Components.
        classes["@mozilla.org/messengercompose/composefields;1"].
        createInstance(Components.interfaces.nsIMsgCompFields);
    fields.subject = subject;
    if (use_bcc) {
        collectedRecipients.add(ccs);
        fields.bcc = collectedRecipients.stringify("");
        logger.debug("Using BCC field");
    }
    else {
        fields.to = recipients;
        if (replyAll && ccs) {
            fields.cc = ccs;
        }
    }
    if (hide_references) {
        logger.debug("Omitting references");
    }
    else {
        // N.B. I can't set In-Reply-To right now. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1368345 .
        if (references) {
            fields.references = references;
        }
    }
    params.type = Components.interfaces.nsIMsgCompType.New;
    params.format = Components.interfaces.nsIMsgCompFormat.Default;
    params.composeFields = fields;
    msgComposeService.OpenComposeWindowWithParams(null, params);
}

function replyToSelected(window) {
    return replyToSelectedExtended(window, false);
}

function replyAllToSelected(window) {
    return replyToSelectedExtended(window, true);
}

function updateMenuItems(window, listener) {
    logger.debug("Entering updateMenuItems");
    var document = window.document;
    var command = document.getElementById("rtmm_menu_reply");
    if (! command) {
        // Add-on has been disabled.
        var contextMenu = document.getElementById("mailContext");
        contextMenu.removeEventListener("popupshowing", listener);
        logger.debug("Removed listener from context menu");
        return;
    }
    var gFolderDisplay = window["gFolderDisplay"];
    var disabled = gFolderDisplay.selectedCount < 2;
    if (disabled) {
        logger.debug("Disabling menu items");
    }
    else {
        logger.debug("Enabling menu items");
    }
    command.disabled = disabled;
    command = document.getElementById("rtmm_menu_replyAll");
    command.disabled = disabled;
    command = document.getElementById("rtmm_menuContext_reply");
    command.disabled = disabled;
    command.hidden = disabled;
    command = document.getElementById("rtmm_menuContext_replyAll");
    command.disabled = disabled;
    command.hidden = disabled;

    if (! isSeaMonkey()) {
        command = document.getElementById("rtmm_appmenu_reply");
        command.disabled = disabled;
        command.hidden = disabled;
        command = document.getElementById("rtmm_appmenu_replyAll");
        command.disabled = disabled;
        command.hidden = disabled;
    }
}

function loadDefaultPreferences() {
    try {
        // Might not be defined yet
        logger.trace("loadDefaultPreferences");
    } catch {}
    if (prefsLoaded) {
        return;
    }
    // This might fail during add-on installation.
    try {
        var {DefaultPreferencesLoader} = ChromeUtils.import(
            "chrome://reply-to-multiple-messages/content/" +
            "defaultPreferencesLoader.jsm");
    }
    catch {
        return;
    }
    var loader = new DefaultPreferencesLoader();
    loader.parseUri("chrome://reply-to-multiple-messages/content/prefs.js");
    initLogging();
    prefsLoaded = true;
}

function initLogging() {
    try {
        delete Log4Moz.repository._loggers[prefPrefix];
    }
    catch (ex) {}
    logger = Log4Moz.getConfiguredLogger(prefPrefix,
                                         Log4Moz.Level.Trace,
                                         Log4Moz.Level.Info,
                                         Log4Moz.Level.Debug);
    observer = { observe: initLogging }
    Services.prefs.addObserver(prefPrefix + ".logging.console", observer,
                               false);
    Services.prefs.addObserver(prefPrefix + ".logging.dump", observer, false);
    logger.debug("Initialized logging for Reply to Multiple Messages");
}

function isSeaMonkey() {
    return(appName() == "SeaMonkey");
}

_appName = null;

function appName() {
    if (! _appName) {
        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULAppInfo);
        _appName = appInfo.name;
    }
    return _appName;
}
