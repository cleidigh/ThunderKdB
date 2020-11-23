const NEW_LINE = "\n";
const DOUBLE_DASH = "--";

const PLAINTEXT_SIGNATURE_SEPARATOR = DOUBLE_DASH + " " + NEW_LINE;

const CLASS_MOZ_SIGNATURE = "moz-signature";
const CLASS_SIGNATURE_SWITCH_SUFFIX = "signature-switch-suffix";

const ATTRIBUTE_SIGNATURE_SWITCH_ID = "signature-switch-id";
const ATTRIBUTE_MOZ_DIRTY = "_moz_dirty";
const ATTRIBUTE_COLS = "cols";

const WINDOW_TYPE_MESSAGE_COMPOSE = "messageCompose";

const REPLY_SUBJECT_PREFIX = "Re:";
const FORWARD_SUBJECT_PREFIX = "Fwd:";

const MENU_ROOT_ID = "signature_switch";
const MENU_ID_SEPARATOR = "_";
const MENU_SUBENTRY_ID_PREFIX = MENU_ROOT_ID + MENU_ID_SEPARATOR;
const MENU_ENTRY_ONOFF = "on-off";
const MENU_ENTRY_OPTIONS = "options";

const COMMAND_SWITCH = "switch";
const COMMAND_NEXT = "next";
const COMMAND_PREVIOUS = "previous";

// ---------------------------------------------------------------------------------------------------------------------

let composeActionTabId;
let composeActionSignatureId;

/* =====================================================================================================================
   init ...
 */

(() => {
    // compose script
    browser.composeScripts.register({
        js: [ {file: "/compose/compose.js"} ]
    });

    // context-menu
    createContextMenu();

    // listeners
    addContextMenuListener();
    addStorageChangeListener();
    addCommandListener();
    addMessageListener();
    addBrowserActionListener();
    addComposeActionListener();
    addWindowCreateListener();
})();

/* =====================================================================================================================
   context-menu ...
 */

function createContextMenu() {
    browser.menus.remove(MENU_ROOT_ID);

    browser.storage.local.get().then(localStorage => {
        let menuItems = [];

        menuItems.push({
            id: MENU_ROOT_ID,
            title: i18n("extensionName"),
            contexts: [
                // TODO
                // the MailExtension-API currently lacks a suitable context-type for the composer-window (see: https://thunderbird-webextensions.readthedocs.io/en/latest/menus.html#menus-contexttype);
                // so this won't work atm
                "editable"
            ]
        });

        menuItems.push({
            id: MENU_SUBENTRY_ID_PREFIX + MENU_ENTRY_ONOFF,
            parentId: MENU_ROOT_ID,
            title: i18n("menuOnOff")
        });

        menuItems.push({
            parentId: MENU_ROOT_ID,
            type: "separator"
        });

        if (localStorage.signatures) {
            localStorage.signatures.forEach(signature => {
                menuItems.push({
                    id: MENU_SUBENTRY_ID_PREFIX + signature.id,
                    title: truncateString(signature.name),
                    parentId: MENU_ROOT_ID
                });
            });

            menuItems.push({
                parentId: MENU_ROOT_ID,
                type: "separator"
            });

            menuItems.push({
                id: MENU_SUBENTRY_ID_PREFIX + MENU_ENTRY_OPTIONS,
                parentId: MENU_ROOT_ID,
                title: i18n("menuOptions")
            });

            createMenuItems(menuItems);
        }
    });
}

function createMenuItems(items) {
    if (typeof items !== undefined && items.length > 0) {
        browser.menus.create(items.pop(), createMenuItems(items));
    }
}

/* =====================================================================================================================
   listeners ...
 */

function addContextMenuListener() {
    browser.menus.onClicked.addListener(async (info, tab) => {
        let commandOrSignatureId = info.menuItemId.startsWith(MENU_SUBENTRY_ID_PREFIX) ? info.menuItemId.substring(info.menuItemId.lastIndexOf(MENU_ID_SEPARATOR + 1)) : undefined;

        switch (info.menuItemId) {
            case MENU_ENTRY_ONOFF:
                searchSignatureInComposer(tab.id).then(foundSignatureId => {
                    if (foundSignatureId === "") {
                        appendDefaultSignatureToComposer(tab.id);
                    } else {
                        removeSignatureFromComposer(tab.id);
                    }
                })
                break;
            case MENU_ENTRY_OPTIONS:
                openOptions();
                break;
            default:
                appendSignatureViaIdToComposer(commandOrSignatureId, tab.id);
                break;
        }
    });
}

function addStorageChangeListener() {
    browser.storage.onChanged.addListener(changes => {
        let changedItems = Object.keys(changes);

        for (let item of changedItems) {
            switch (item) {
                case "signatures":
                    if (JSON.stringify(changes[item].newValue) !== JSON.stringify(changes[item].oldValue)) {
                        createContextMenu();
                    }
                    break;
            }
        }
    });
}

function addCommandListener() {
    browser.commands.onCommand.addListener(name => {
        browser.windows.getAll().then(windows => {
            for (let window of windows) {
                if (window.type === WINDOW_TYPE_MESSAGE_COMPOSE && window.focused) {
                    browser.tabs.query({windowId: window.id}).then(async tabs => {
                        let mailTabId = tabs[0].id;
                        let foundSignatureId = await searchSignatureInComposer(mailTabId);

                        switch (name) {
                            case COMMAND_SWITCH:
                                if (foundSignatureId === "") {
                                    appendDefaultSignatureToComposer(mailTabId);
                                } else {
                                    removeSignatureFromComposer(mailTabId);
                                }
                                break;
                            case COMMAND_NEXT:
                            case COMMAND_PREVIOUS:
                                if (foundSignatureId === "") {
                                    appendDefaultSignatureToComposer(mailTabId);
                                } else {
                                    let signatureIds = await getAllSignatureIds();
                                    let signatureIndex = signatureIds.indexOf(foundSignatureId);
                                    if (signatureIndex !== -1) {
                                        let newSignatureIndex;
                                        if (name === COMMAND_NEXT) {
                                            newSignatureIndex = signatureIndex === (signatureIds.length - 1) ? 0 : signatureIndex + 1;
                                        } else {
                                            newSignatureIndex = signatureIndex === 0 ? signatureIds.length - 1 : signatureIndex - 1;
                                        }

                                        appendSignatureViaIdToComposer(signatureIds[newSignatureIndex], mailTabId);
                                    }
                                }
                                break;
                        }
                    });
                    break;
                }
            }
        });
    });
}

function addMessageListener() {
    browser.runtime.onMessage.addListener(request => {
        switch (request.type) {
            case "switchSignature":
                if (request.value === "on") {
                    appendDefaultSignatureToComposer();
                } else {
                    removeSignatureFromComposer();
                }
                break;
            case "insertSignature":
                appendSignatureViaIdToComposer(request.value);
                break;
            case "isSignaturePresent":
                return Promise.resolve({result: composeActionSignatureId !== ""});
            case "focusOptionsWindow":
                browser.windows.update(request.value, {
                    drawAttention: true,
                    focused: true}
                );
                break;
            default:
                console.log("invalid message type!");
        }
    });
}

function addBrowserActionListener() {
    browser.browserAction.onClicked.addListener(() => {
        openOptions();
    });
}

function addComposeActionListener() {
    browser.composeAction.onClicked.addListener(tab => {
        composeActionTabId = tab.id;

        searchSignatureInComposer().then(foundSignatureId => {
            composeActionSignatureId = foundSignatureId;
        });

        // "dirty hack" ;-)
        // (this way we can have both a popup(script) and the click-event in here)
        browser.composeAction.setPopup({popup: "/compose/popup.html"});
        browser.composeAction.openPopup();
        browser.composeAction.setPopup({popup: ""});
    });
}

function addWindowCreateListener() {
    browser.windows.onCreated.addListener(window => {
        if (window.type === WINDOW_TYPE_MESSAGE_COMPOSE) {
            browser.tabs.query({windowId: window.id}).then(async tabs => {
                let tabId = tabs[0].id;

                let storage = await browser.storage.local.get();
                let details = await browser.compose.getComposeDetails(tabId);

                let isReply = details.subject.startsWith(REPLY_SUBJECT_PREFIX);
                let isForward = details.subject.startsWith(FORWARD_SUBJECT_PREFIX);

                // check if it's a reply/forward and if we DON'T want to perform the default-action
                let noDefaultAction = (isReply && storage.repliesNoDefaultAction) || (isForward && storage.forwardingsNoDefaultAction === true);

                // check if we should ignore a the identity-sig b/c it's a reply or forwarding
                let ignoreIdentitySig = (isReply || isForward) && (!storage.identitiesUseAssignedSignatureOnReplyOrForwarding);

                // see if we can find an assigned signature for the current identity (but only if we don't ignore identitity-sigs)
                let identitySignatureId = "";
                if (!ignoreIdentitySig && storage.identities) {
                    for (let i = 0; i < storage.identities.length; i++) {
                        if (storage.identities[i].id === details.identityId) {
                            identitySignatureId = storage.identities[i].signatureId;
                            break;
                        }
                    }
                }

                // check if we have an signature sig AND if it should take precedence over the default action/sig
                let identitySigAvailableAndOverrulesDefault = (identitySignatureId !== "") && (storage.identitiesOverruleDefaultAction);

                if (!noDefaultAction && !identitySigAvailableAndOverrulesDefault) {
                    // check if a default-action is set
                    if (storage.defaultAction) {
                        // execute default-action
                        switch (storage.defaultAction) {
                            case "insert":
                                appendDefaultSignatureToComposer(tabId);
                                break;
                            case "off":
                                removeSignatureFromComposer(tabId);
                                break;
                            default:
                                // do nothing
                                break;
                        }
                    }
                } else if (identitySignatureId !== "") {
                    // insert identity sig
                    appendSignatureViaIdToComposer(identitySignatureId, tabId);
                }

                // don't trigger recipient-based auto-switch for replies/forwardings if disabled in options
                if (!(isReply && storage.repliesDisableAutoSwitch) ||
                    !(isForward && storage.forwardingsDisableAutoSwitch)) {
                    startRecipientChangeListener(tabId, 1000, "", storage.autoSwitchIncludeCc, storage.autoSwitchIncludeBcc);
                }

                // only enable identity-based auto-switch if activated in options
                if (storage.identitiesSwitchSignatureOnChange) {
                    startIdentityChangeListener(tabId, undefined, details.identityId);
                }
            });
        }
    });
}

/* =====================================================================================================================
   composer interaction ...
 */

async function appendSignatureToComposer(signature, tabId = composeActionTabId) {
    let details = await browser.compose.getComposeDetails(tabId);

    let signatureClasses = [ CLASS_MOZ_SIGNATURE ];

    let signatureAttributes = [
        {key: ATTRIBUTE_SIGNATURE_SWITCH_ID, value: signature.id},
        {key: ATTRIBUTE_MOZ_DIRTY, value: ""}
    ];

    let signatureElementProperties;

    if (details.isPlainText) {
        signatureElementProperties = {
            // when the body is still empty upon adding the sig, add a br _before_ the actual signature;
            // otherwise all entered text on top will be _inside_ the signature div - which is bad
            prepend: details.plainTextBody === "" ? {
                type: "br",
                attributes: [
                    {key: ATTRIBUTE_MOZ_DIRTY, value: ""}
                ]
            } : undefined,
            signature: {
                type: "div",
                classes: signatureClasses,
                attributes: signatureAttributes,
                innerHtml: await createSignatureForPlainTextComposer(signature.text)
            },
            // TB also always adds a new line at the end of a signature in plaintext mode
            postpend: {
                type: "br",
                classes: [
                    CLASS_SIGNATURE_SWITCH_SUFFIX // custom class for easier clean up later on
                ],
                attributes: [
                    {key: ATTRIBUTE_MOZ_DIRTY, value: ""}
                ]
            }
        };
    } else {
        // check if we need to use the plaintext-signature, b/c there's no html-signature available
        let plaintextFallback = signature.html === "";

        if (plaintextFallback) {
            // this attribute usually gets set by TB if a plaintext-sig is being used in HTML-mode
            signatureAttributes.push({key: ATTRIBUTE_COLS, value: "72"})
        }

        signatureElementProperties = {
            signature: {
                type: `${plaintextFallback ? "pre" : "div"}`,
                classes: signatureClasses,
                attributes: signatureAttributes,
                innerHtml: await createSignatureForHtmlComposer(plaintextFallback ? signature.text : signature.html)
            }
        };
    }

    // make sure to remove any existing signature beforehand
    await removeSignatureFromComposer(tabId);

    browser.tabs.sendMessage(tabId, {type: "appendSignature", value: signatureElementProperties});
}

async function appendDefaultSignatureToComposer(tabId = composeActionTabId) {
    browser.storage.local.get().then(async localStorage => {
        if (localStorage.signatures && localStorage.signatures.length > 0) {
            let allExistingSignatureIds = await getAllSignatureIds(localStorage.signatures);
            let actualDefaultSignature = undefined;

            if (localStorage.defaultSignature) {
                // check if the stored defaultSignatureId actually still exists
                if (allExistingSignatureIds.some(id => id === localStorage.defaultSignature)) {
                    for (let signature of localStorage.signatures) {
                        if (signature.id === localStorage.defaultSignature) {
                            actualDefaultSignature = signature;
                            break;
                        }
                    }
                }
            }

            // if the stored defaultSignatureId doesn't exist; use the first signature instead
            if (actualDefaultSignature === undefined) {
                actualDefaultSignature = localStorage.signatures[0];
            }

            appendSignatureToComposer(actualDefaultSignature, tabId);
        }
    });
}

async function appendSignatureViaIdToComposer(signatureId, tabId = composeActionTabId) {
    browser.storage.local.get().then(localStorage => {
        if (localStorage.signatures) {
            let signatures = localStorage.signatures;
            for (let signature of signatures) {
                if (signature.id === signatureId) {
                    appendSignatureToComposer(signature, tabId);
                    break;
                }
            }
        }
    });
}

async function removeSignatureFromComposer(tabId = composeActionTabId) {
    browser.tabs.sendMessage(tabId, {
        type: "removeSignature",
        value: {
            selector: `.${CLASS_MOZ_SIGNATURE}`,
            separator: `${DOUBLE_DASH} <br` // closing angle bracket omitted on purpose
        }
    });

    // also clean up extra trailing new lines (which we may have inserted on purpose when inserting the plaintext sig)
    browser.tabs.sendMessage(tabId, {
        type: "cleanUp",
        value: {
            selector: `.${CLASS_SIGNATURE_SWITCH_SUFFIX}`
        }
    });
}

async function searchSignatureInComposer(tabId = composeActionTabId) {
    return (await browser.tabs.sendMessage(tabId, {
        type: "searchSignature",
        value: {
            selector: `[${ATTRIBUTE_SIGNATURE_SWITCH_ID}].${CLASS_MOZ_SIGNATURE}`,
            idAttribute: ATTRIBUTE_SIGNATURE_SWITCH_ID}
    })).signatureId;
}

function autoSwitchBasedOnRecipients(tabId = composeActionTabId) {
    browser.compose.getComposeDetails(tabId).then(details => {
        browser.storage.local.get().then(localStorage => {
            if (localStorage.signatures) {
                for (let signature of localStorage.signatures) {
                    if (signature.autoSwitch && signature.autoSwitch.trim() !== "") {
                        let autoSwitchItems = signature.autoSwitch.split(",");
                        for (let autoSwitchItem of autoSwitchItems) {
                            let regEx = createRegexFromAutoSwitchString(autoSwitchItem.trim());
                            let checkRecipients = recipients => {
                                for (let recipient of recipients) {
                                    if (regEx.test(cleanseRecipientString(recipient))) {
                                        appendSignatureViaIdToComposer(signature.id, tabId);
                                        return true;
                                    }
                                }
                                return false;
                            };

                            if (checkRecipients(details.to)) {
                                return;
                            }
                            if (localStorage.autoSwitchIncludeCc && checkRecipients(details.cc)) {
                                return;
                            }
                            if (localStorage.autoSwitchIncludeBcc && checkRecipients(details.bcc)) {
                                return;
                            }
                        }
                    }
                }
            }
        });
    });
}

/* =====================================================================================================================
   signature creation ...
 */

async function createSignatureForPlainTextComposer(content) {
    // resolve fc-placeholders
    content = await searchAndReplaceFortuneCookiePlaceholder(content);

    // make sure we have a sig-separator
    if (!content.trim().startsWith(PLAINTEXT_SIGNATURE_SEPARATOR)) {
        content = PLAINTEXT_SIGNATURE_SEPARATOR + content;
    }

    // transform new-lines to BRs with mozdirty-attribute and return
    return content.replaceAll(NEW_LINE, `<br ${ATTRIBUTE_MOZ_DIRTY}="">`);
}

async function createSignatureForHtmlComposer(content) {
    // resolve placeholders
    content = await searchAndReplaceFortuneCookiePlaceholder(content);
    content = await searchAndReplaceImagePlaceholder(content);

    // prepend the sig-separator if activated in options
    if ((await browser.storage.local.get()).signatureSeparatorHtml) {
        content = `${DOUBLE_DASH} <br ${ATTRIBUTE_MOZ_DIRTY}="">${content}`;
    }

    return content;
}

async function searchAndReplaceImagePlaceholder(content) {
    if (new RegExp("\\{{.*?}}").test(content)) {
        await browser.storage.local.get().then(localStorage => {
            if (localStorage.images) {
                for (let image of localStorage.images) {
                    content = content.replaceAll(new RegExp("{{" + image.tag + "}}", "g"), image.data);
                }
            }
        });
    }

    return content;
}

async function searchAndReplaceFortuneCookiePlaceholder(content) {
    if (new RegExp("\\[\\[.*?\\]\\]").test(content)) {
        await browser.storage.local.get().then(localStorage => {
            if (localStorage.fortuneCookies) {
                for (let fortuneCookies of localStorage.fortuneCookies) {
                    content = content.replaceAll(new RegExp("\\[\\[" + fortuneCookies.tag + "\\]\\]", "g"), fortuneCookies.cookies[random(fortuneCookies.cookies.length) - 1]);
                }
            }
        });
    }

    return content;
}

/* =====================================================================================================================
   helpers ...
 */

async function startRecipientChangeListener(tabId, timeout = 1000, previousRecipients = "", includeCc = false, includeBcc = false) {
    try {
        let details = await browser.compose.getComposeDetails(tabId);
        let currentRecipients = "" + details.to;

        if (includeCc) {
            currentRecipients += " " + details.cc;
        }
        if (includeBcc) {
            currentRecipients += " " + details.bcc;
        }

        if (currentRecipients !== previousRecipients) {
            autoSwitchBasedOnRecipients(tabId);
        }

        setTimeout(() => {
            startRecipientChangeListener(tabId, timeout, currentRecipients, includeCc, includeBcc);
        }, timeout);
    } catch (e) {
        // tabId probably not valid anymore; window closed
    }
}

async function startIdentityChangeListener(tabId, timeout = 1000, previousIdentityId = "") {
    try {
        let currentIdentityId = (await browser.compose.getComposeDetails(tabId)).identityId;

        if (currentIdentityId !== previousIdentityId) {
            let mailAccounts = await browser.accounts.list();
            for (let mailAccount of mailAccounts) {
                for (let mailIdentity of mailAccount.identities) {
                    if (mailIdentity.id === currentIdentityId) {
                        let localStorage = await browser.storage.local.get();
                        if (localStorage.identities) {
                            let identities = localStorage.identities;
                            for (let i = 0; i < identities.length; i++) {
                                if (identities[i].id === mailIdentity.id) {
                                    appendSignatureViaIdToComposer(identities[i].signatureId, tabId);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        setTimeout(() => {
            startIdentityChangeListener(tabId, timeout, currentIdentityId);
        }, timeout);
    } catch (e) {
        // tabId probably not valid anymore; window closed
    }
}

function createRegexFromAutoSwitchString(autoSwitchString) {
    return new RegExp(autoSwitchString
        .replaceAll(".", "\.")
        .replaceAll("*", ".*"),
        "i");
}

function cleanseRecipientString(recipient) {
    // check if we got something like '"Moe Zilla" <moe@zilla.org>'; return plain email-address
    if (new RegExp(".*<.*>.*").test(recipient)) {
        recipient = recipient.substr(recipient.indexOf("<") + 1);
        recipient = recipient.substr(0, recipient.lastIndexOf(">"));
    }

    return recipient;
}
