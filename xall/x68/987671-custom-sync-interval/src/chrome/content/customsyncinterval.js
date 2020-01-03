"use strict";

let customSyncInterval = {
    // DOM elements needed in event handlers
    customRow: null,
    customInput: null,
    menuList: document.getElementById("calendar-refreshInterval-menulist"),

    // helpers

    createLabel: function(label, id) {
        const labelElement = document.createElement("label");
        labelElement.setAttribute("disable-with-calendar", true);
        labelElement.setAttribute("id", id);
        labelElement.setAttribute("value", label);
        return labelElement;
    },

    insertAfter: function(element, toInsert) {
        element.parentNode.insertBefore(toInsert, element.nextSibling);
    },

    // event handlers

    onAcceptDialog: function() {
        // inject custom value into menu list before settings are stored by the
        // original accept handler
        if (customSyncInterval.menuList.value == -1) {
            customSyncInterval.menuList.value = customSyncInterval.customInput.value;
        }
        return customSyncInterval.originalOnAcceptDialog();
    },

    onCommandListener: function(event) {
        if (event.target.value == -1) {
            showElement(customSyncInterval.customRow);
        } else {
            hideElement(customSyncInterval.customRow);
        }
    },

    // main code

    injectCustomSyncInput: function() {
        const intervalRow = document.getElementById("calendar-refreshInterval-row");
        const manualMenuEntry = document.getElementById("calendar-refreshInterval-manual");
        const everyMinuteString = PluralForm.get(3, cal.l10n.getCalString("calendarPropertiesEveryMinute"));
        const strings = document.getElementById("customsyncinterval-strings");
        const every = everyMinuteString.split("#1")[0].trim();
        const minute = everyMinuteString.split("#1")[1].trim();

        // dynamically generate DOM elements for custom value entry:
        // "Custom..." menu item
        const customItem = document.createXULElement("menuitem");
        customItem.setAttribute("value", -1);
        customItem.setAttribute("label", strings.getString("custominterval"));
        customSyncInterval.insertAfter(manualMenuEntry, customItem);

        // initially hidden row with labels and input field
        const customRow = document.createXULElement("row");
        customRow.setAttribute("id", "calendar-customInterval-row");
        customRow.setAttribute("hidden", true);

        // no label for this row
        customRow.appendChild(document.createXULElement("spacer"));

        // hbox for proper alignment
        const box = document.createXULElement("hbox");
        box.setAttribute("align", "center");
        customRow.appendChild(box);

        // first label ("Every")
        box.appendChild(customSyncInterval.createLabel(every, "label1"));

        // the input field
        const customInput = document.createElement("textbox");
        customInput.setAttribute("id", "custom-interval-textbox");
        customInput.setAttribute("disable-with-calendar", true);
        customInput.setAttribute("flex", 1);
        customInput.setAttribute("value", 0);
        customInput.setAttribute("type", "number");
        customInput.setAttribute("min", 0);
        customInput.addEventListener("blur", customSyncInterval.onBlurListener);
        customSyncInterval.customInput = customInput;
        box.appendChild(customInput);

        // second label ("minutes")
        box.appendChild(customSyncInterval.createLabel(minute, "label2"));

        // finally add everything to the DOM
        customSyncInterval.menuList.addEventListener("command", customSyncInterval.onCommandListener);
        customSyncInterval.customRow = customRow;
        customSyncInterval.insertAfter(intervalRow, customRow);

        // monkey patch the dialog accept event handler
        customSyncInterval.originalOnAcceptDialog = onAcceptDialog;
        onAcceptDialog = customSyncInterval.onAcceptDialog;
    }
};

window.addEventListener("load", customSyncInterval.injectCustomSyncInput);
