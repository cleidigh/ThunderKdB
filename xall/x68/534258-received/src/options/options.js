/* global browser:readonly */

"use strict";

function saveOptions(e) {
    e.preventDefault();

    browser.storage.local.set({
        regexp: document.querySelector("#regexp").value
    });
}

function restoreOptions() {
    browser.storage.local.get().then((res) => {
        document.querySelector("#regexp").value = res.regexp;
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
