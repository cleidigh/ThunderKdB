/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2012 */

var trashcanExtension = {
    garbageMan: Components.classes["@mozilla.kewis.ch/garbage-man;1"]
                          .getService(Components.interfaces.calITrashcan),
    restoreItems: function restoreItems(aItems) {
        aItems.forEach(this.garbageMan.restoreItem, this.garbageMan);
    },

    agendaRestoreItem: function agendaRestoreItem() {
      let listItem  = document.getElementById("agenda-listbox").selectedItem;
      let selectedItem = listItem.getItem();
      if (selectedItem) {
        this.garbageMan.restoreItem(selectedItem);
      }
    },

    emptyTrash: function() this.garbageMan.emptyTrash()
};

window.addEventListener("load", function addListeners () {
    let itemContext = document.getElementById("calendar-item-context-menu");
    let taskContext = document.getElementById("taskitem-context-menu");
    let calendarListContext = document.getElementById("list-calendars-context-menu");
    let agendaContext = document.getElementById("agenda-menupopup");

    function garbageSetupContext(event) {
        let items = currentView().getSelectedItems({});
        let restoreMenuitem = document.getElementById("trashcan-restore-item-menuitem");
        restoreMenuitem.hidden = !(items.some(function(x) x.calendar.id == "trashcan"));
    }
    function garbageSetupTaskContext(event) {
        let items = getSelectedTasks(event);
        let restoreMenuitem = document.getElementById("trashcan-restore-task-menuitem");
        restoreMenuitem.hidden = !(items.some(function(x) x.calendar.id == "trashcan"));
    }
    function garbageSetupCalendarContext(event) {
        let isTC = (calendarListContext.contextCalendar &&
                    calendarListContext.contextCalendar.id == "trashcan");
        document.getElementById("trashcan-empty-trash").hidden = !isTC;
        document.getElementById("list-calendars-context-delete").hidden = isTC;
    }

    function agendaSetupContext(event) {
        let items = agendaListbox.getSelectedItems({});
        let restoreMenuitem = document.getElementById("trashcan-restore-agenda-menuitem");
        restoreMenuitem.hidden = !(items.some(function(x) x.calendar.id == "trashcan"));
    }



    itemContext.addEventListener("popupshowing", garbageSetupContext, false);
    taskContext.addEventListener("popupshowing", garbageSetupTaskContext, false);
    calendarListContext.addEventListener("popupshowing", garbageSetupCalendarContext, false);
    agendaContext.addEventListener("popupshowing", agendaSetupContext, false);

    window.addEventListener("unload", function removeListeners() {
        calendarListContext.removeEventListener("popupshowing", garbageSetupCalendarContext, false);
        taskContext.removeEventListener("popupshowing", garbageSetupTaskContext, false);
        itemContext.removeEventListener("popupshowing", garbageSetupContext, false);
        agendaContext.removeEventListener("popupshowing", agendaSetupContext, false);
    }, false);
}, false);
