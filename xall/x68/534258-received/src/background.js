/* global browser */

"use strict";

function parseReceivedHeader(headerStr, regexp) {
    const captured = headerStr.match(new RegExp(regexp));
    if (captured === null) return null;
    captured.shift();
    // If the capturing group is optional ("* "or "?" quantifier) and didn’t match, its value is set to undefined.
    const filtered = captured.filter(function (element) {
        return typeof element !== "undefined";
    });
    if (!filtered.length) return null;
    return filtered;
}

function parseReceivedHeaders(headers, regexp) {
    const received = [];
    headers.forEach(function (header) {
        const parsed = parseReceivedHeader(header, regexp);
        if (parsed !== null)
            received.push(parsed);
    });
    return received;
}

browser.storage.local.get("regexp").then(({regexp}) => {
    if (!regexp) {
        browser.storage.local.set({regexp: "(.*)"});
    }
});

function displayReceivedHeader(tabId, messageId) {
    browser.messages.getFull(messageId).then((messagepart) => {
        const headers = messagepart.headers.received;
        if (headers) {
            browser.storage.local.get("regexp").then(({regexp}) => {
                const parsed = parseReceivedHeaders(headers, regexp);
                browser.displayReceivedHeader.setReceivedHeaderValue(tabId, parsed);
                browser.displayReceivedHeader.setReceivedHeaderHidden(tabId, !parsed.length);
            });
        } else {
            browser.displayReceivedHeader.setReceivedHeaderHidden(tabId, true);
        }
    });
}

browser.windows.getAll({populate: true, windowTypes: ["normal", "messageDisplay"]}).then((windows) => {
    windows.forEach(function (window) {
        browser.displayReceivedHeader.addHeadersToWindowById(window.id);
        window.tabs.filter((tab) => tab.active)
            .forEach(function (tab) {
                browser.messageDisplay.getDisplayedMessage(tab.id).then((message) => {
                    if (!message) return;
                    displayReceivedHeader(tab.id, message.id);
                });
            });
    });
});

browser.windows.onCreated.addListener((window) => {
    // Skip popup, devtools, etc.
    if (window.type !== "normal" && window.type !== "messageDisplay") return;
    browser.displayReceivedHeader.addHeadersToWindowById(window.id);
});

browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
    displayReceivedHeader(tab.id, message.id);
});
