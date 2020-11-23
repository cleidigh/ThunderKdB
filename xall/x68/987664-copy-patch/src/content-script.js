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

function formatAddress(addressObject)
{
    /*
     * Strip "[ext]" tag in front of the sender name, proudly presented by
     * Siemens IT for emails with Siemens addresses coming in via external
     * lists.
     */
    let name = addressObject.name.replace(/^\[ext\] /, "");

    return name + " <" + addressObject.email + ">";
}

async function copyPatch()
{
    let msg = await messenger.runtime.sendMessage({action: "getMsg"});
    if (!msg) {
        return;
    }

    let patch = "";

    patch += "From: " + formatAddress(msg.header.from[0]) + "\n";
    patch += "Date: " + msg.header.date + "\n";
    patch += "Subject: " + msg.header.subject + "\n\n";

    /* Strip Windows line-feeds */
    patch += msg.body.replace(/\r/g, "");

    /* Get rid of O365 unsafe links */
    patch = patch.replace(
        /https:\/\/[^\.]+\.safelinks\.protection\.outlook\.com\/\?url=([^&]*)&[^>\s]*/g,
        function(match, p1, offset, string) {
            return decodeURIComponent(p1);
        });

    /* Cut off mailing list signatures after git's default */
    patch = patch.replace(/(^-- \n[0-9\.]+\n)[^]*/m, "$1");

    signedOfIndex = patch.indexOf("\nSigned-off-by: ");
    if (signedOfIndex >= 0) {
        /* Temporarily add a newline at the beginning to simplify matching. */
        patch = "\n" + patch;
        signedOfIndex += 1;

        let patchHead = patch.split("\n---\n")[0];
        let lastFrom = null;

        let lastFromStart = patchHead.lastIndexOf("\nFrom: ");
        if (lastFromStart >= 0) {
            let lastFromEnd = patchHead.indexOf("\n", lastFromStart + 1);
            if (lastFromEnd >= 0)
                lastFrom = patchHead.substring(lastFromStart + 7, lastFromEnd);
        }

        if (!lastFrom) {
            window.alert("WARNING: No valid author found.");
        } else if (patchHead.indexOf("\nSigned-off-by: " + lastFrom) < 0) {
            let replyTo = null;
            if (msg.header.replyTo) {
                replyTo = formatAddress(msg.header.replyTo[0]);
            }
            if (replyTo && patchHead.indexOf("\nSigned-off-by: " + replyTo) >= 0) {
                patch = patch.replace("\nFrom: " + lastFrom + "\n",
                                      "\nFrom: " + replyTo + "\n");
            } else {
                let signedOfEnd = patchHead.indexOf("\n", signedOfIndex + 1);
                if (signedOfEnd < 0) {
                    signedOfEnd = patchHead.length;
                }
                let signer = patchHead.substring(signedOfIndex + 16, signedOfEnd);
                let align = window.confirm(
                    "WARNING: Author and signed-off addresses differ:\n\n" +
                    "Author: " + lastFrom + "\n" +
                    "Signer: " + signer + "\n\n" +
                    "Set author to signer address?");
                if (align) {
                    patch = patch.replace("\nFrom: " + lastFrom + "\n",
                                          "\nFrom: " + signer + "\n");
                }
            }
        }

        /* Remove leading newline again. */
        patch = patch.substring(1);
    } else {
        window.alert("WARNING: No signed-off tag found.");
    }

    messenger.runtime.sendMessage({action: "clipboardWrite", text: patch});
}

copyPatch();
