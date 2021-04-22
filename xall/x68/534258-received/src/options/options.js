/* global browser */

"use strict";

function saveOptions(e) {
    e.preventDefault();

    browser.storage.local.set({
        regexp: document.querySelector("#regexp").value
    });
}

function restoreOptions() {
    browser.storage.local.get("regexp").then(({regexp}) => {
        document.querySelector("#regexp").value = regexp;
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
