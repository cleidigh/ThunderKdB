/*
 * Copy Patch Thunderbird Add-On
 *
 * Copyright (c) Jan Kiszka, 2019-2020
 *
 * Authors:
 *  Jan Kiszka <jan.kiszka@web.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

async function getCurrentWindow()
{
    let windows = await messenger.windows.getAll();

    for (let window of windows) {
        if ((window.type === "messageDisplay" || window.type === "normal")
            && window.focused === true)
            return window;
    }
    return null;
}

function main()
{
    messenger.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getMsg") {
            return messenger.CopyPatch.getSelectedMessage(sender.tab.windowId);
        }
        if (request.action === "clipboardWrite") {
            navigator.clipboard.writeText(request.text);

            messenger.messageDisplayAction.setBadgeBackgroundColor(
                {tabId: sender.tab.id, color: "green"});
            messenger.messageDisplayAction.setBadgeText(
                {tabId: sender.tab.id, text: "✔"});
            setTimeout(() => {
                messenger.messageDisplayAction.setBadgeText(
                    {tabId: sender.tab.id, text: null});
            }, 500);
        }
    });

    messenger.messageDisplayAction.onClicked.addListener(tab => {
        messenger.tabs.executeScript(tab.id, {file: "content-script.js"});
    });

    messenger.commands.onCommand.addListener(async (name) => {
        if (name !== "copyPatch") {
            return;
        }

        let window = await getCurrentWindow();
        if (window) {
            let tabs = await messenger.tabs.query({windowId: window.id});
            if (await messenger.messageDisplayAction.isEnabled({tabId: tabs[0].id})) {
                messenger.tabs.executeScript(tabs[0].id,
                                             {file: "content-script.js"});
            }
        }
    });

    messenger.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
        msg = await messenger.CopyPatch.getSelectedMessage(tab.windowId);

        /* detect patch pattern in the body */
        if (msg.body.indexOf("\n---") >= 0 && msg.body.indexOf("\n+++") >= 0) {
            messenger.messageDisplayAction.enable(tab.id);
        } else {
            messenger.messageDisplayAction.disable(tab.id);
        }
    });
}

main();
