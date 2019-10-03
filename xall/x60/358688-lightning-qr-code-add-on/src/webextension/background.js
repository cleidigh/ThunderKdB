"use strict";

const settings = {
    padding: {
        id: "padding",
        input: { type: "range", min: "4", max: "32", step: "4", value: "4" }
    },
    techinfo: {
        id: "techinfo",
        input: { type: "checkbox", checked: false }
    },
    copydelay: {
        id: "copydelay",
        input: { type: "range", min: "0", max: "30", step: "1", value: "0" }
    },
    copycolor: {
        id: "copycolor",
        input: { type: "color", value: "#ff0000" }
    },
    usedesc: {
        id: "usedesc",
        input: { type: "checkbox", checked: true }
    },
    useorganizer: {
        id: "useorganizer",
        input: { type: "checkbox", checked: false }
    },
    useattendees: {
        id: "useattendees",
        input: { type: "checkbox", checked: false }
    },
    usealarms: {
        id: "usealarms",
        input: { type: "checkbox", checked: false }
    },
    logging: {
        id: "logging",
        input: { type: "checkbox", checked: false }
    },
};

function getSetting(setting) {
    browser.storage.local.get(setting)
        .then(results => {
            // If the old preferences data has not been imported yet...
            if (!results[setting]) {
                // Ask the legacy part to dump the needed data and send it back
                // to the background page...
                browser.runtime.sendMessage({type: "import-legacy-data"}).then(reply => {
                    if (reply) {
                        // Where it can be saved using the WebExtensions storage API.
                        browser.storage.local.set(reply);
                    }
                });
            }
        });
}

/* Used by options.js so we can define settings in one place */
function getSettings() {
    return settings;
}

Object.keys(settings).map(getSetting);
