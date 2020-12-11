/* global ChromeUtils:readonly */
/* exported displayReceivedHeader */

"use strict";

const {ExtensionCommon} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const {ExtensionSupport} = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
const {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

// eslint-disable-next-line no-var
var displayReceivedHeader = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {

        /**
         * Get the Document for a specific message shown in a tab.
         * Returns null if a different message is shown.
         *
         * Borrowed from dkim_verifier by Philippe Lieser.
         *
         * @param {number} tabId
         * @param {number} messageId
         * @returns {Document?}
         */
        function getDocumentForCurrentMsg(tabId, messageId) {
            const {ExtensionParent} = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
            const target = ExtensionParent.apiManager.global.tabTracker.getTab(tabId);
            const window = Components.utils.getGlobalForObject(target);
            const msg = context.extension.messageManager.convert(window.gFolderDisplay.selectedMessage);
            if (msg.id !== messageId) return null;
            return window.document;
        }

        context.callOnClose(this);
        return {
            displayReceivedHeader: {
                init() {
                    // Listen for the main Thunderbird windows opening.
                    ExtensionSupport.registerWindowListener("displayReceivedHeaderListener", {
                        chromeURLs: ["chrome://messenger/content/messenger.xhtml"],
                        onLoadWindow(window) {
                            const {document} = window;
                            const expandedHeaders2 = document.getElementById("expandedHeaders2");

                            if (expandedHeaders2) {
                                const element = document.createElement("tr");
                                element.id = "expandedReceivedRow";

                                const headerRowTitle = document.createElement("th");
                                const headerRowTitleLabel = document.createXULElement("label");
                                headerRowTitleLabel.id = "expandedReceivedLabel";
                                headerRowTitleLabel.classList.add("headerName");
                                headerRowTitleLabel.value = "Received";
                                headerRowTitleLabel.control = "receivedReceivedHeader";
                                headerRowTitle.appendChild(headerRowTitleLabel);

                                const headerRowValue = document.createElement("td");
                                headerRowValue.id = "receivedReceivedHeader";

                                element.appendChild(headerRowTitle);
                                element.appendChild(headerRowValue);
                                expandedHeaders2.appendChild(element);
                            } else {
                                throw Error("Could not find the expandedHeaders2 element");
                            }
                        },
                    });
                },
                setReceivedHeaderHidden(tabId, messageId, hidden) {
                    const document = getDocumentForCurrentMsg(tabId, messageId);
                    if (!document) return;

                    const mailHeaderfield = document.getElementById("expandedReceivedRow");
                    mailHeaderfield.hidden = hidden;
                },
                setReceivedHeaderValue(tabId, messageId, headersArray) {
                    const document = getDocumentForCurrentMsg(tabId, messageId);
                    if (!document) return;

                    const headerRowValue = document.createElement("td");
                    headerRowValue.id = "receivedReceivedHeader";

                    headersArray.forEach(function (item) {
                        const mailHeaderfield = document.createXULElement("mail-headerfield");
                        mailHeaderfield.flex = "1";
                        mailHeaderfield.textContent = item;

                        headerRowValue.appendChild(mailHeaderfield);
                    });

                    const mailHeaderfield = document.getElementById("expandedReceivedRow");
                    const oldChild = document.getElementById("receivedReceivedHeader");
                    mailHeaderfield.replaceChild(headerRowValue, oldChild);
                },
            },
        };
    }

    // eslint-disable-next-line class-methods-use-this
    close() {
        for (const window of Services.wm.getEnumerator("mail:3pane")) {
            const expandedReceivedRow = window.document.getElementById("expandedReceivedRow");
            if (expandedReceivedRow) {
                expandedReceivedRow.remove();
            }
        }
        ExtensionSupport.unregisterWindowListener("displayReceivedHeaderListener");
    }
};
