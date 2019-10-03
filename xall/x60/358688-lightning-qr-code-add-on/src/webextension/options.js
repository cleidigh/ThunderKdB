"use strict";

var settings;

const RANGE_VALUE_SUFFIX = "-value";

function restoreSetting(s) {
    var gettingItem = browser.storage.local.get(s);
    gettingItem.then(results => {
        if (results[s]) {
            var val = results[s];
            var input = document.querySelector("#" + s);
            if (input === undefined)
                return;
            var type = input.type;
            switch (type) {
            case "checkbox":
                val ? input.checked = val : input.setAttribute("checked", false);
                break;
            case "range":
                input.value = val;
                document.querySelector("#" + s + RANGE_VALUE_SUFFIX)
                    .innerHTML = val;
                break;
            case "color":
                input.value = val;
                break;
            }
        }
    });
}

function restoreSettings() {
    for (const s of Object.keys(settings)) {
        restoreSetting(settings[s].id);
    }
}

function saveSetting(id) {
    var val = undefined;
    var input = document.querySelector("#" + id);
    if (input === undefined)
        return;
    var type = input.type;
    switch (type) {
    case "checkbox":
        val = (input.checked ? true : false);
        break;
    case "range":
        val = parseInt(input.value);
        break;
    case "color":
        val = input.value;
        break;
    }
    if (typeof val !== undefined) {
        browser.storage.local.set({[id]: val});
        var message = {
            type: "update-legacy-setting",
            setting: id,
            value: val
        };
        browser.runtime.sendMessage(message);
    }
}

function filterSettingsByInputType(type) {
    return Object.values(settings).filter(function (s) {
        return s.input.type == type;
    });
}

function b18n(message) {
    return browser.i18n.getMessage(message);
}

function makeSectionHeader(id) {
    return '<h2 id="' + id + '">' + b18n(id) + '</h2>';
}

function makeLabel(forId) {
    return '<label for="' + forId + '">' + b18n(forId + "-label") + '</label>';
}

function makeDescription(id) {
    return '<div class="description">' + b18n(id + "-description") + '</div>';
}

function makeRangeInputOption(id, min, max, step, value) {
    return makeLabel(id) +
        '<input type="range" id="' + id + '" min="' + min +
        '" max="' + max + '" step="' + step + '" value="' + value + '">' +
        '<span id="' + id + RANGE_VALUE_SUFFIX + '">' + value + '</span>' +
        makeDescription(id);
}

function makeCheckBoxOption(id, checked) {
    return '<input type="checkbox" id="' + id + '"' +
        (checked ? ' checked>' : '>') +
        makeLabel(id) + makeDescription(id);
}

function makeColorOption(id, value) {
    return makeLabel(id) +
        '<input type="color" id="' + id + '" value="' + value + '">' +
        makeDescription(id);
}

function makeInputOption(setting) {
    var i = setting.input;
    switch (i.type) {
    case "range":
        return makeRangeInputOption(setting.id, i.min, i.max, i.step, i.value);
    case "checkbox":
        return makeCheckBoxOption(setting.id, i.checked);
    case "color":
        return makeColorOption(setting.id, i.value);
    }
}

function makeSection(header, settings) {
    return '<div class="browser-style">' +
        makeSectionHeader(header) +
        settings.map(makeInputOption).join("") +
        '</div>';
}

function makeOptions() {
    return makeSection("appearance-section",
                       [settings.padding, settings.techinfo]) +
        makeSection("clipboard-section" ,
                    [settings.copydelay, settings.copycolor]) +
        makeSection("data-section",
                    [settings.usedesc, settings.useorganizer,
                     settings.useattendees, settings.usealarms]) +
        makeSection("debugging-section",
                    [settings.logging]);
}

/* Automatically wire up range inputs with their number display
 * element so the latter gets updated whenever the range input value
 * changes. */
function connectRangeValues() {
    const rangeSettings = filterSettingsByInputType("range");
    let setValue = function(range, value) {
        if (range && value) {
            document.querySelector("#" + value).innerHTML =
                document.querySelector("#" + range).value;
        }
    }
    let vid = function(rid) {
        return rid + RANGE_VALUE_SUFFIX;
    }

    for (const rs of rangeSettings) {
        var r = document.querySelector("#" + rs.id);
        if (r) {
            setValue(rs.id, vid(rs.id));
            r.addEventListener("input", function(event) {
                setValue(event.currentTarget.id, vid(event.currentTarget.id));
            });
        }
    }
}

/* Wire up input elements to save settings on change */
function wireUpInputs() {
    for (const s of Object.values(settings)) {
        const input = document.querySelector("#" + s.id);
        if (input) {
            input.addEventListener("input", function(event) {
                saveSetting(event.currentTarget.id);
            });
        }
    }
}

function initOptions(backgroundPage) {
    // get settings from the background.js where they are defined
    settings = backgroundPage.getSettings();
    
    document.addEventListener("DOMContentLoaded", function() {
        document.querySelector("form").innerHTML = makeOptions();
        restoreSettings();
        connectRangeValues();
        wireUpInputs();
    });
}

var getting = browser.runtime.getBackgroundPage();
getting.then(initOptions,
             function () {
                 console.log("Could not retrieve settings from background page!");
             });
