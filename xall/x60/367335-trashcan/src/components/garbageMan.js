/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2012 */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://calendar/modules/calUtils.jsm");

function garbageMan() {
}

garbageMan.prototype = {
    // this must match whatever is in chrome.manifest!
    classID: Components.ID("{ac6ad220-90c7-4bbb-bbf6-07580789c7cb}"),
    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIObserver,
                                           Components.interfaces.calIObserver,
                                           Components.interfaces.calICalendarManagerObserver,
                                           Components.interfaces.calITrashcan]),

    trashcan: null,

    getCalendarById: function getCalendarById(aId) {
        let found = null;
        let calmgr = cal.getCalendarManager();
        for each (let calendar in calmgr.getCalendars({})) {
            if (calendar.id == aId) {
                found = calendar;
                break;
            }
        }

        return found;
    },

    ensureTrashcanExists: function() {
        let calmgr = cal.getCalendarManager();
        let calendars = calmgr.getCalendars({});
        let trashcan = this.getCalendarById("trashcan");

        if (!trashcan) {
            cal.LOG("[trashcan] Looks like the trashcan is missing, buying a new one.");
            let storageUrl = cal.makeURL("moz-storage-calendar://");
            trashcan = calmgr.createCalendar("storage", storageUrl);
            trashcan.id = "trashcan";
            calmgr.registerCalendar(trashcan);
        }

        // There is this wierd bug where sometimes the calendar looses its
        // properties. Until we find out why, lets work around by always setting
        // the properties
        trashcan.setProperty("color", "#cccccc");
        trashcan.setProperty("calendar-main-in-composite", false);
        trashcan.setProperty("suppressAlarms", true);
        trashcan.setProperty("capabilities.alarms.popup.supported", false);
        trashcan.setProperty("imip.identity.disabled", true);
        trashcan.setProperty("relaxedMode", true);
        trashcan.name = cal.calGetString("trashcan", "trashCalendarName", null, "trashcan");

        this.trashcan = trashcan;
    },

    setupCalendarObservers: function() {
        let calmgr = cal.getCalendarManager();
        calmgr.addObserver(this);
        for each (let calendar in calmgr.getCalendars({})) {
            this.onCalendarRegistered(calendar);
        }
    },

    onCalendarRegistered: function onCalendarRegistered(aCalendar) {
        aCalendar.addObserver(this);
    },

    onCalendarUnregistering: function onCalendarUnregistering(aCalendar) {
        aCalendar.removeObserver(this);
    },
    onCalendarDeleting: function(aCalendar) {
        if (aCalendar == this.trashcan) {
            cal.WARN("[trashcan] Someone stole the trashcan!");
            this.trashcan = null;
            this.ensureTrashcanExists();
        }
    },

    onDeleteItem: function onDeleteItem(aDeletedItem) {
        if (aDeletedItem.calendar != this.trashcan &&
            !this.trashcan.getProperty("disabled")) {
            let waste = aDeletedItem.clone();
            let trashcan = this.trashcan;
            waste.id = waste.calendar.id + "\uFFFD" + waste.id;
            waste.calendar = trashcan;
            if (waste.status == "CANCELLED") {
                waste.status = "CONFIRMED";
            }
            trashcan.adoptItem(waste, null);
        }
    },

    observe: function observe(subject, topic, data) {
        if (topic == "profile-after-change") {
            this.ensureTrashcanExists();
            this.setupCalendarObservers();
        }
    },

    emptyTrash: function emptyTrash(){
        // Deleting the trashcan will cause our observers to create a new one
        let calmgr = cal.getCalendarManager();
        calmgr.unregisterCalendar(this.trashcan);
        calmgr.deleteCalendar(this.trashcan);
    },

    restoreItem: function restoreItem(aItem) {
        let [calId, itemId] = aItem.id.split("\uFFFD");
        if (calId == null || itemId == null) {
            // Malformed item. Whats this doing in the trashcan?
            cal.ERROR("[trashcan] Who put '" + aItem.id + "' in our trashcan? That doesn't belong here!");
            return;
        }

        let item = aItem.clone();
        item.id = itemId;

        let sourceCalendar = this.getCalendarById(calId);
        let trashcan = this.trashcan;
        if (sourceCalendar) {
            sourceCalendar.adoptItem(item, {
                onGetItem: function() {},
                onOperationComplete: function(aCalendar, aStatus) {
                    if (Components.isSuccessCode(aStatus)) {
                        trashcan.deleteItem(aItem, null);
                    }
                }
            });
        }
    },

    onPropertyChanged: function(aCalendar, aProperty, aValue, aOldValue) {
        if (aCalendar == this.trashcan && aProperty == "readOnly" && aValue == true) {
            cal.WARN("[trashcan] Someone closed the lid, how should we throw in our trash now?");
            this.trashcan.readOnly = false;
        }
    },

    // Unused observer methods
    onStartBatch: function() {},
    onEndBatch: function() {},
    onLoad: function() {},
    onAddItem: function() {},
    onModifyItem: function() {},
    onError: function() {},
    onPropertyDeleting: function() {}
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([garbageMan]);
