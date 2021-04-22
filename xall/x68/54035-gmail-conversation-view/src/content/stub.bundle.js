/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 901:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "o": () => /* binding */ messageActions,
/* harmony export */   "B": () => /* binding */ messagesSlice
/* harmony export */ });
/* harmony import */ var _reducer_summary_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(850);
/* harmony import */ var _reduxjs_toolkit__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(407);
/* harmony import */ var _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(415);
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* global Conversation, BrowserSim, topMail3Pane */


 // Prefer the global browser object to the imported one.

window.browser = window.browser || _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_1__/* .browser */ .Xh;
const initialMessages = {
  msgData: []
};

function modifyOnlyMsg(state, msgUri, modifier) {
  return { ...state,
    msgData: state.msgData.map(msg => msg.msgUri == msgUri ? modifier(msg) : msg)
  };
}

function modifyOnlyMsgId(state, id, modifier) {
  return { ...state,
    msgData: state.msgData.map(msg => msg.id == id ? modifier(msg) : msg)
  };
}

async function getPreference(name, defaultValue) {
  const prefs = await browser.storage.local.get("preferences");
  return prefs?.preferences?.[name] ?? defaultValue;
} // TODO: Once the WebExtension parts work themselves out a bit more,
// determine if this is worth sharing via a shared module with the background
// scripts, or if it doesn't need it.


async function setupConversationInTab(params, isInTab) {
  let isThreaded = params.get("isThreaded");
  isThreaded = !!parseInt(isThreaded); // If we start up Thunderbird with a saved conversation tab, then we
  // have no selected message. Fallback to the usual mode.

  if (!isThreaded && !topMail3Pane(window).gFolderDisplay.selectedMessage) {
    isThreaded = true;
  }

  if (window.frameElement) {
    window.frameElement.setAttribute("tooltip", "aHTMLTooltip");
  }

  const msgUrls = params.get("urls").split(",");
  const msgIds = [];

  for (const url of msgUrls) {
    const id = await browser.conversations.getMessageIdForUri(url);

    if (id) {
      msgIds.push(id);
    }
  } // It might happen that there are no messages left...


  if (!msgIds.length) {
    document.getElementById("messageList").textContent = browser.i18n.getMessage("message.movedOrDeletedConversation");
  } else {
    window.Conversations = {
      currentConversation: null,
      counter: 0
    };
    let freshConversation = new Conversation(window, // TODO: This should really become ids at some stage, but we need to
    // teach Conversation how to handle those.
    msgUrls, isThreaded, ++window.Conversations.counter, isInTab);
    let browserFrame = window.frameElement; // Because Thunderbird still hasn't fixed that...

    if (browserFrame) {
      browserFrame.setAttribute("context", "mailContext");
    }

    freshConversation.outputInto(window, async function (aConversation) {
      // This is a stripped-down version of what's in msgWindowApi.js,
      //  make sure the two are in sync!
      window.Conversations.currentConversation = aConversation;
      aConversation.completed = true; // TODO: Re-enable this.
      // registerQuickReply();
      // That's why we saved it before...
      // newComposeSessionByDraftIf();
      // TODO: expandQuickReply isn't defined anywhere. Should it be?
      // let willExpand = parseInt(params.get("willExpand"));
      // if (willExpand)
      //   expandQuickReply();
      // Create a new rule that will override the default rule, so that
      // the expanded quick reply is twice higher.

      document.body.classList.add("inTab"); // Do this now so as to not defeat the whole expand/collapse
      // logic.

      if (await browser.conversations.getCorePref("mailnews.mark_message_read.auto")) {
        const markAsReadAfterDelay = await browser.conversations.getCorePref("mailnews.mark_message_read.delay");
        let markAsReadDelay = 0;

        if (markAsReadAfterDelay) {
          markAsReadDelay = await browser.conversations.getCorePref("mailnews.mark_message_read.delay.interval");
        }

        setTimeout(function () {
          for (const id of msgIds) {
            browser.messages.update(id, {
              read: true
            }).catch(console.error);
          }
        }, markAsReadDelay * 1000);
      }
    });
  }
}

const messageActions = {
  waitForStartup() {
    return async dispatch => {
      const params = new URL(document.location).searchParams;
      const isInTab = params.has("urls");
      const topWin = topMail3Pane(window);
      await dispatch(_reducer_summary_js__WEBPACK_IMPORTED_MODULE_0__/* .summaryActions.setConversationState */ .v.setConversationState({
        isInTab,
        tabId: BrowserSim.getTabId(topWin, window),
        windowId: BrowserSim.getWindowId(topWin)
      }));
      const platformInfo = await browser.runtime.getPlatformInfo();
      const browserInfo = await browser.runtime.getBrowserInfo();
      const defaultFontSize = await browser.conversations.getCorePref("font.size.variable.x-western");
      const browserForegroundColor = await browser.conversations.getCorePref("browser.display.foreground_color");
      const browserBackgroundColor = await browser.conversations.getCorePref("browser.display.background_color");
      const defaultDetailsShowing = (await browser.conversations.getCorePref("mail.show_headers")) == 2;
      await dispatch(_reducer_summary_js__WEBPACK_IMPORTED_MODULE_0__/* .summaryActions.setSystemOptions */ .v.setSystemOptions({
        browserForegroundColor,
        browserBackgroundColor,
        defaultDetailsShowing,
        defaultFontSize,
        hideQuickReply: await getPreference("hide_quick_reply", false),
        OS: platformInfo.os,
        browserVersion: browserInfo.version
      }));

      if (!isInTab) {
        return;
      }

      await new Promise((resolve, reject) => {
        let tries = 0;

        function checkStarted() {
          let mainWindow = topMail3Pane(window);

          if (mainWindow.Conversations && mainWindow.Conversations.finishedStartup) {
            resolve();
          } else {
            // Wait up to 10 seconds, if it is that slow we're in trouble.
            if (tries >= 100) {
              console.error("Failed waiting for monkeypatch to finish startup");
              reject();
              return;
            }

            tries++;
            setTimeout(checkStarted, 100);
          }
        }

        checkStarted();
      });
      await dispatch(messageActions.initializeMessageThread({
        isInTab: true,
        params
      })); // We used to have a function for opening the window as a quick compose
      // in a tab. We'll need to figure out how to do this once we finish
      // rewriting - it may be better to have a completely separate message
      // composition option.
      // } else if (params.get("quickCompose")) {
      //   masqueradeAsQuickCompose();
      // }
    };
  },

  getLateAttachments({
    id
  }) {
    return async dispatch => {
      const attachments = await browser.conversations.getLateAttachments(id);
      const numAttachments = attachments.length; // This is bug 630011, remove when fixed

      const unknown = browser.i18n.getMessage("attachments.sizeUnknown");

      for (let i = 0; i < numAttachments; i++) {
        // -1 means size unknown
        let formattedSize = unknown;

        if (attachments[i].size != -1) {
          formattedSize = await browser.conversations.formatFileSize(attachments[i].size);
        }

        attachments[i].formattedSize = formattedSize;
      }

      await dispatch(messagesSlice.actions.msgUpdateDataId({
        msgData: {
          attachments,
          attachmentsPlural: await browser.conversations.makePlural(browser.i18n.getMessage("pluralForm"), browser.i18n.getMessage("attachments.numAttachments"), numAttachments),
          id,
          needsLateAttachments: false
        }
      }));
    };
  },

  initializeMessageThread({
    isInTab,
    params
  }) {
    return async (dispatch, getState) => {
      if (getState().summary.isInTab) {
        setupConversationInTab(params, isInTab).catch(console.error);
      }
    };
  },

  editDraft({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginEdit(id, "editDraft").catch(console.error);
    };
  },

  editAsNew({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginEdit(id, "editAsNew").catch(console.error);
    };
  },

  reply({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginReply(id, "replyToSender").catch(console.error);
    };
  },

  replyAll({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginReply(id, "replyToAll").catch(console.error);
    };
  },

  replyList({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginReply(id, "replyToList").catch(console.error);
    };
  },

  forward({
    id,
    shiftKey
  }) {
    return async () => {
      let forwardMode = (await browser.conversations.getCorePref("mail.forward_message_mode")) ?? 0;
      browser.conversations.beginForward(id, forwardMode == 0 ? "forwardAsAttachment" : "forwardInline").catch(console.error);
    };
  },

  archive({
    id
  }) {
    return async () => {
      browser.messages.archive([id]).catch(console.error);
    };
  },

  delete({
    id
  }) {
    return async () => {
      browser.messages.delete([id]).catch(console.error);
    };
  },

  openClassic({
    id
  }) {
    return async () => {
      browser.conversations.openInClassic(id).catch(console.error);
    };
  },

  openSource({
    id
  }) {
    return async () => {
      browser.conversations.openInSourceView(id).catch(console.error);
    };
  },

  setTags({
    id,
    tags
  }) {
    return async () => {
      browser.messages.update(id, {
        tags: tags.map(t => t.key)
      }).catch(console.error);
    };
  },

  toggleTagByIndex({
    id,
    index,
    tags
  }) {
    return async () => {
      browser.messages.listTags().then(allTags => {
        // browser.messages.update works via arrays of tag keys only,
        // so strip away all non-key information
        allTags = allTags.map(t => t.key);
        tags = tags.map(t => t.key);
        const toggledTag = allTags[index]; // Toggling a tag that is out of range does nothing.

        if (!toggledTag) {
          return null;
        }

        if (tags.includes(toggledTag)) {
          tags = tags.filter(t => t !== toggledTag);
        } else {
          tags.push(toggledTag);
        }

        return browser.messages.update(id, {
          tags
        });
      }).catch(console.error);
    };
  },

  setStarred({
    id,
    starred
  }) {
    return async () => {
      browser.messages.update(id, {
        flagged: starred
      }).catch(console.error);
    };
  },

  markAsRead({
    id
  }) {
    return async () => {
      browser.messages.update(id, {
        read: true
      }).catch(console.error);
    };
  },

  selected({
    msgUri
  }) {
    return async () => {
      if (window.Conversations?.currentConversation) {
        const msg = window.Conversations.currentConversation.getMessage(msgUri);

        if (msg) {
          msg.onSelected();
        }
      }
    };
  },

  toggleConversationRead({
    read
  }) {
    return async (dispatch, getState) => {
      const state = getState().messages;

      for (let msg of state.msgData) {
        browser.messages.update(msg.id, {
          read
        }).catch(console.error);
      }
    };
  },

  archiveConversation() {
    return async (dispatch, getState) => {
      const state = getState();
      let msgs;

      if (state.summary.isInTab || (await getPreference("operate_on_conversations", false))) {
        msgs = state.messages.msgData.map(msg => msg.id);
      } else {
        if ("getDisplayedMessages" in browser.messageDisplay) {
          msgs = await browser.messageDisplay.getDisplayedMessages(state.summary.tabId);
        } else {
          msgs = await browser.convMsgWindow.getDisplayedMessages(state.summary.tabId);
        }

        msgs = msgs.map(m => m.id);
      }

      browser.messages.archive(msgs).catch(console.error);
    };
  },

  deleteConversation() {
    return async (dispatch, getState) => {
      const state = getState();
      let msgs;

      if (state.summary.isInTab || (await getPreference("operate_on_conversations", false))) {
        msgs = state.messages.msgData.map(msg => msg.id);
      } else {
        if ("getDisplayedMessages" in browser.messageDisplay) {
          msgs = await browser.messageDisplay.getDisplayedMessages(state.summary.tabId);
        } else {
          msgs = await browser.convMsgWindow.getDisplayedMessages(state.summary.tabId);
        }

        msgs = msgs.map(m => m.id);
      }

      try {
        await browser.messages.delete(msgs);
      } catch (ex) {
        console.error(ex);
      }

      if (state.summary.isInTab) {
        // The additional nulls appear to be necessary due to our browser proxying.
        let currentTab = await browser.tabs.query({
          active: true,
          currentWindow: null,
          lastFocusedWindow: null,
          title: null,
          windowId: state.summary.windowId,
          windowType: null
        });
        await browser.tabs.remove(currentTab[0].id);
      }
    };
  },

  clickIframe({
    event
  }) {
    return () => {
      // Hand this off to Thunderbird's content clicking algorithm as that's simplest.
      if (!topMail3Pane(window).contentAreaClick(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
  },

  showRemoteContent({
    id
  }) {
    return async dispatch => {
      await browser.conversations.showRemoteContent(id);
      const msg = window.Conversations.currentConversation.getMessageByApiId(id); // Turn remote content message "off", as although it has it, it can be loaded.

      msg.hasRemoteContent = false;
      const msgData = await msg.toReactData();
      dispatch(messagesSlice.actions.msgUpdateData({
        msgData
      }));
    };
  },

  alwaysShowRemoteContent({
    id,
    realFrom
  }) {
    return async dispatch => {
      await browser.conversations.alwaysShowRemoteContent(realFrom);
      const msg = window.Conversations.currentConversation.getMessageByApiId(id); // Turn remote content message "off", as although it has it, it can be loaded.

      msg.hasRemoteContent = false;
      const msgData = await msg.toReactData();
      dispatch(messagesSlice.actions.msgUpdateData({
        msgData
      }));
    };
  },

  detachTab() {
    return async (dispatch, getState) => {
      const state = getState(); // TODO: Fix re-enabling composition when expanded into new tab.
      // let willExpand = element.hasClass("expand") && startedEditing();
      // First, save the draft, and once it's saved, then move on to opening the
      // conversation in a new tab...
      // onSave(() => {

      const urls = state.messages.msgData.map(x => x.msgUri);
      BrowserSim.callBackgroundFunc("_window", "openConversation", [state.summary.windowId, urls // "&willExpand=" + Number(willExpand);
      ]);
    };
  },

  notificationClick({
    msgUri,
    notificationType,
    extraData
  }) {
    return async () => {
      const msg = window.Conversations.currentConversation.getMessage(msgUri);
      msg.msgPluginNotification(topMail3Pane(window), notificationType, extraData);
    };
  },

  tagClick({
    msgUri,
    event,
    details
  }) {
    return async () => {
      const msg = window.Conversations.currentConversation.getMessage(msgUri);
      msg.msgPluginTagClick(topMail3Pane(window), event, details);
    };
  },

  switchToFolderAndMsg({
    id
  }) {
    return async () => {
      browser.conversations.switchToFolderAndMsg(id).catch(console.error);
    };
  },

  sendUnsent() {
    return async () => {
      browser.conversations.sendUnsent().catch(console.error);
    };
  },

  ignorePhishing({
    id
  }) {
    return async dispatch => {
      await browser.conversations.ignorePhishing(id);
      await dispatch(messagesSlice.actions.msgUpdateDataId({
        msgData: {
          isPhishing: false
        }
      }));
    };
  },

  showMsgDetails({
    id,
    detailsShowing
  }) {
    return async (dispatch, getState) => {
      if (!detailsShowing) {
        await dispatch(messagesSlice.actions.msgHdrDetails({
          detailsShowing: false,
          id
        }));
        return;
      }

      let currentMsg = getState().messages.msgData.find(msg => msg.id == id); // If we already have header information, don't get it again.

      if (currentMsg?.extraLines?.length) {
        await dispatch(messagesSlice.actions.msgHdrDetails({
          detailsShowing: true,
          id
        }));
        return;
      }

      let msg = await browser.messages.getFull(id);

      try {
        let extraLines = [{
          key: browser.i18n.getMessage("message.headerFolder"),
          value: currentMsg.folderName
        }];
        const interestingHeaders = ["mailed-by", "x-mailer", "mailer", "date", "user-agent", "reply-to"];

        for (const h of interestingHeaders) {
          if (h in msg.headers) {
            let key = h; // Not all the header names are translated.

            if (h == "date") {
              key = browser.i18n.getMessage("message.headerDate");
            }

            extraLines.push({
              key,
              value: msg.headers[h]
            });
          }
        }

        extraLines.push({
          key: browser.i18n.getMessage("message.headerSubject"),
          value: currentMsg?.subject
        });
        dispatch(messagesSlice.actions.msgHdrDetails({
          extraLines,
          detailsShowing: true,
          id
        }));
      } catch (ex) {
        console.error(ex);
      }
    };
  },

  markAsJunk(action) {
    return async dispatch => {
      // This action should only be activated when the conversation is not a
      //  conversation in a tab AND there's only one message in the conversation,
      //  i.e. the currently selected message
      await browser.conversations.markSelectedAsJunk(action.isJunk).catch(console.error);
      dispatch(messagesSlice.actions.msgSetIsJunk(action));
    };
  }

};
const messagesSlice = _reduxjs_toolkit__WEBPACK_IMPORTED_MODULE_2__.createSlice({
  name: "messages",
  initialState: initialMessages,
  reducers: {
    replaceConversationDetails(state, {
      payload
    }) {
      const {
        messages
      } = payload;
      return { ...state,
        ...messages
      };
    },

    appendMessages(state, {
      payload
    }) {
      const {
        messages
      } = payload;
      return { ...state,
        msgData: state.msgData.concat(messages.msgData)
      };
    },

    msgExpand(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.msgUri, msg => ({ ...msg,
        expanded: payload.expand
      }));
    },

    toggleConversationExpanded(state, {
      payload
    }) {
      return { ...state,
        msgData: state.msgData.map(m => ({ ...m,
          expanded: payload.expand
        }))
      };
    },

    msgUpdateData(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.msgData.msgUri, msg => ({ ...msg,
        ...payload.msgData
      }));
    },

    msgUpdateDataId(state, {
      payload
    }) {
      return modifyOnlyMsgId(state, payload.msgData.id, msg => ({ ...msg,
        ...payload.msgData
      }));
    },

    msgAddSpecialTag(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.uri, msg => ({ ...msg,
        specialTags: (msg.specialTags || []).concat(payload.tagDetails)
      }));
    },

    msgRemoveSpecialTag(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.uri, msg => {
        if (msg.specialTags == null) {
          return msg;
        }

        return { ...msg,
          specialTags: msg.specialTags.filter(t => t.name != payload.tagDetails.name)
        };
      });
    },

    msgSetIsJunk(state, {
      payload
    }) {
      return payload.isJunk ? state : modifyOnlyMsgId(state, payload.id, msg => ({ ...msg,
        isJunk: false
      }));
    },

    msgHdrDetails(state, {
      payload
    }) {
      return modifyOnlyMsgId(state, payload.id, msg => {
        if (payload.extraLines != null) {
          return { ...msg,
            detailsShowing: payload.detailsShowing
          };
        }

        return { ...msg,
          detailsShowing: payload.detailsShowing,
          extraLines: payload.extraLines
        };
      });
    },

    removeMessageFromConversation(state, {
      payload
    }) {
      return { ...state,
        msgData: state.msgData.filter(m => m.msgUri !== payload.msgUri)
      };
    },

    clearScrollto(state, {
      payload
    }) {
      return modifyOnlyMsgId(state, payload.id, msg => {
        return { ...msg,
          scrollTo: false
        };
      });
    },

    msgShowNotification(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.msgData.msgUri, msg => {
        // We put the notification on the end of the `extraNotifications` list
        // unless there is a notification with a matching type, in which case
        // we update it in place.
        let modifiedInPlace = false;
        let extraNotifications = (msg.extraNotifications || []).map(n => {
          if (n.type === payload.msgData.notification.type) {
            modifiedInPlace = true;
            return payload.msgData.notification;
          }

          return n;
        });

        if (!modifiedInPlace) {
          extraNotifications.push(payload.msgData.notification);
        }

        return { ...msg,
          extraNotifications
        };
      });
    }

  }
});
Object.assign(messageActions, messagesSlice.actions);

/***/ }),

/***/ 850:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "v": () => /* binding */ summaryActions,
/* harmony export */   "o": () => /* binding */ summarySlice
/* harmony export */ });
/* harmony import */ var _reduxjs_toolkit__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(407);
/* harmony import */ var _reducer_messages_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(901);
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* global Conversations, getMail3Pane, topMail3Pane, printConversation */


const initialSummary = {
  browserForegroundColor: "#000000",
  browserBackgroundColor: "#FFFFFF",
  conversation: null,
  defaultFontSize: 15,
  hasBuiltInPdf: false,
  hasIdentityParamsForCompose: false,
  hideQuickReply: false,
  iframesLoading: 0,
  isInTab: false,
  // TODO: What is loading used for?
  loading: true,
  OS: "win",
  tabId: null,
  tenPxFactor: 0.7,
  subject: "",
  windowId: null,
  defaultDetailsShowing: false
};

async function handleShowDetails(messages, state, dispatch, updateFn) {
  let defaultShowing = state.summary.defaultDetailsShowing;

  for (let msg of messages.msgData) {
    msg.detailsShowing = defaultShowing;
  }

  await updateFn();

  if (defaultShowing) {
    for (let msg of state.messages.msgData) {
      await dispatch(_reducer_messages_js__WEBPACK_IMPORTED_MODULE_0__/* .messageActions.showMsgDetails */ .o.showMsgDetails({
        id: msg.id,
        detailsShowing: true
      }));
    }
  }
}

const summaryActions = {
  replaceConversation({
    summary,
    messages
  }) {
    return async (dispatch, getState) => {
      await handleShowDetails(messages, getState(), dispatch, () => {
        dispatch(summarySlice.actions.replaceSummaryDetails(summary));
        return dispatch(_reducer_messages_js__WEBPACK_IMPORTED_MODULE_0__/* .messageActions.replaceConversationDetails */ .o.replaceConversationDetails({
          messages
        }));
      });
    };
  },

  appendMessages({
    summary,
    messages
  }) {
    return async (dispatch, getState) => {
      await handleShowDetails(messages, getState(), dispatch, () => {
        return dispatch(_reducer_messages_js__WEBPACK_IMPORTED_MODULE_0__/* .messageActions.appendMessages */ .o.appendMessages({
          messages
        }));
      });
    };
  },

  showMessagesInvolving({
    name,
    email
  }) {
    return async (dispatch, getState) => {
      await browser.convContacts.showMessagesInvolving({
        email,
        title: browser.i18n.getMessage("involvingTabTitle", [name]),
        windowId: getState().summary.windowId
      }).catch(console.error);
    };
  },

  sendEmail({
    name,
    email
  }) {
    return async (dispatch, getState) => {
      let state = getState();
      let dest = await browser.convContacts.makeMimeAddress({
        name,
        email
      });

      if (state.summary.hasIdentityParamsForCompose) {
        // Ideally we should use the displayed folder, but the displayed message
        // works fine, as we'll only
        let tab = await browser.mailTabs.query({
          active: true,
          currentWindow: true
        });
        let account = await browser.accounts.get(tab[0].displayedFolder.accountId);
        await browser.compose.beginNew({
          identityId: account.identities[0].id,
          to: dest
        });
      } else {
        await browser.convContacts.composeNew({
          to: dest
        }).catch(console.error);
      }
    };
  },

  createFilter({
    email
  }) {
    return async (dispatch, getState) => {
      browser.conversations.createFilter(email, getState().summary.windowId).catch(console.error);
    };
  },

  copyEmail({
    email
  }) {
    return () => {
      navigator.clipboard.writeText(email);
    };
  },

  editContact({
    email
  }) {
    return () => {
      browser.convContacts.beginEdit({
        email
      });
    };
  },

  addContact({
    email,
    name
  }) {
    return () => {
      browser.convContacts.beginNew({
        email,
        displayName: name
      }); // TODO: In theory we should be updating the store so that the button can
      // then be updated to indicate this is now in the address book. However,
      // until we start getting the full conversation messages hooked up, this
      // won't be easy. As this is only a small bit of hidden UI, we can punt on
      // this for now.
    };
  },

  openLink({
    url
  }) {
    return () => {
      if ("openDefaultBrowser" in browser.windows) {
        browser.windows.openDefaultBrowser(url);
      } else {
        getMail3Pane().messenger.launchExternalURL(url);
      }
    };
  },

  printConversation() {
    return () => {
      // TODO: Fix printing
      printConversation();
    };
  },

  forwardConversation() {
    return async () => {
      try {
        await Conversations.currentConversation.forward();
      } catch (e) {
        console.error(e);
      }
    };
  },

  msgStreamLoadFinished({
    dueToExpansion,
    msgUri,
    iframe
  }) {
    return async (dispatch, getState) => {
      if (!dueToExpansion) {
        dispatch(summarySlice.actions.decIframesLoading());
      } // It might be that we're trying to send a message on unmount, but the
      // conversation/message has gone away. If that's the case, we just skip
      // and move on.


      const {
        summary
      } = getState();

      if (summary.conversation?.getMessage) {
        const msg = summary.conversation.getMessage(msgUri);

        if (msg) {
          msg.postStreamMessage(topMail3Pane(window), iframe);
        }
      }
    };
  },

  msgStreamMsg({
    dueToExpansion,
    msgUri,
    docshell
  }) {
    return async (dispatch, getState) => {
      if (!dueToExpansion) {
        dispatch(summarySlice.actions.incIframesLoading());
      }

      const {
        summary
      } = getState();
      let message = summary.conversation.getMessage(msgUri); // The message might not be found, if so it has probably been deleted from
      // under us, so just continue and not blow up.

      if (message) {
        message.streamMessage(topMail3Pane(window).msgWindow, docshell);
      } else {
        console.warn("Could not find message for streaming", msgUri);
      }
    };
  }

};
const summarySlice = _reduxjs_toolkit__WEBPACK_IMPORTED_MODULE_1__.createSlice({
  name: "summary",
  initialState: initialSummary,
  reducers: {
    incIframesLoading(state) {
      return { ...state,
        iframesLoading: state.iframesLoading + 1
      };
    },

    decIframesLoading(state) {
      return { ...state,
        // Never decrement below zero
        iframesLoading: Math.max(state.iframesLoading - 1, 0)
      };
    },

    setConversationState(state, {
      payload
    }) {
      const {
        isInTab,
        tabId,
        windowId
      } = payload;
      return { ...state,
        isInTab,
        tabId,
        windowId
      };
    },

    setSystemOptions(state, {
      payload
    }) {
      const {
        OS,
        browserForegroundColor,
        browserBackgroundColor,
        defaultFontSize,
        defaultDetailsShowing,
        browserVersion,
        hideQuickReply
      } = payload;
      let tenPxFactor = 0.625;

      if (OS == "mac") {
        tenPxFactor = 0.666;
      } else if (OS == "win") {
        tenPxFactor = 0.7;
      }

      let [mainVersion, minorVersion] = browserVersion?.split(".");
      return { ...state,
        browserForegroundColor,
        browserBackgroundColor,
        defaultFontSize,
        defaultDetailsShowing,
        // Thunderbird 81 has built-in PDF viewer.
        hasBuiltInPdf: mainVersion >= 81,
        hasIdentityParamsForCompose: mainVersion > 78 || mainVersion == 78 && minorVersion >= 6,
        hideQuickReply,
        OS,
        tenPxFactor
      };
    },

    replaceSummaryDetails(state, {
      payload
    }) {
      if (payload) {
        return { ...state,
          ...payload
        };
      }

      return state;
    }

  }
}); // We don't really care about drawing a distinction between
// actions and thunks, so we make the actions and thunks
// available from the same object.

Object.assign(summaryActions, summarySlice.actions);
globalThis.conversationSummaryActions = summaryActions;

/***/ }),

/***/ 993:
/***/ ((__unused_webpack___webpack_module__, __unused_webpack___webpack_exports__, __webpack_require__) => {


// EXTERNAL MODULE: ./node_modules/react/index.js
var react = __webpack_require__(294);
// EXTERNAL MODULE: ./node_modules/react-dom/index.js
var react_dom = __webpack_require__(935);
// EXTERNAL MODULE: ./node_modules/@reduxjs/toolkit/dist/redux-toolkit.esm.js + 3 modules
var redux_toolkit_esm = __webpack_require__(407);
// EXTERNAL MODULE: ./node_modules/react-redux/es/index.js + 15 modules
var es = __webpack_require__(308);
// EXTERNAL MODULE: ./node_modules/redux/es/redux.js
var redux = __webpack_require__(890);
// EXTERNAL MODULE: ./addon/content/reducer/reducer-messages.js
var reducer_messages = __webpack_require__(901);
// EXTERNAL MODULE: ./addon/content/reducer/reducer-summary.js
var reducer_summary = __webpack_require__(850);
;// CONCATENATED MODULE: ./addon/content/reducer/reducer.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



const conversationApp = redux/* combineReducers */.UY({
  messages: reducer_messages/* messagesSlice.reducer */.B.reducer,
  summary: reducer_summary/* summarySlice.reducer */.o.reducer
});
;// CONCATENATED MODULE: ./addon/content/reducer/reducer-deps.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
let oldPrint = window.print;
async function initialize() {
  // This provides simulation for the WebExtension environment whilst we're still
  // being loaded in a privileged process.
  // eslint-disable-next-line
  globalThis.browser = await BrowserSim.getBrowserAsync();
  globalThis.print = printConversation;
}
/* global Conversations */

function printConversation(event) {
  for (let {
    message: m
  } of Conversations.currentConversation.messages) {
    m.dumpPlainTextForPrinting();
  }

  oldPrint();
}
// EXTERNAL MODULE: ./addon/content/components/conversation/conversationWrapper.jsx + 17 modules
var conversationWrapper = __webpack_require__(694);
;// CONCATENATED MODULE: ./addon/content/stub.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* global conversationStore:true */







document.addEventListener("DOMContentLoaded", () => {
  conversationStore = redux_toolkit_esm.configureStore({
    reducer: conversationApp,
    // XXX bug #1461. Remove this code when that bug is resolved.
    //
    // By default RTK includes the serializableCheck
    // Redux middleware which makes sure the Redux state
    // and all Redux actions are serializable. We want this to
    // be the case in the long run, but there are a few places
    // where it will take more work to eliminate the non-serializable
    // data. As a temporary workaround, exclude that data from the
    // checks.
    middleware: redux_toolkit_esm.getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["summary/replaceSummaryDetails"],
        ignoredPaths: ["summary.conversation"]
      }
    })
  }); // Once we can potentially load in a WebExtension scope, then we should
  // be able to remove this.

  initialize().then(() => {
    const conversationContainer = document.getElementById("conversationWrapper");
    react_dom.render( /*#__PURE__*/react.createElement(es/* Provider */.zt, {
      store: conversationStore
    }, /*#__PURE__*/react.createElement(conversationWrapper/* ConversationWrapper */.k)), conversationContainer);
  }).catch(console.error);
}, {
  once: true
});

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	// It's empty as some runtime module handles the default behavior
/******/ 	__webpack_require__.x = x => {}
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/harmony module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.hmd = (module) => {
/******/ 			module = Object.create(module);
/******/ 			if (!module.children) module.children = [];
/******/ 			Object.defineProperty(module, 'exports', {
/******/ 				enumerable: true,
/******/ 				set: () => {
/******/ 					throw new Error('ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ' + module.id);
/******/ 				}
/******/ 			});
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/runtimeId */
/******/ 	(() => {
/******/ 		__webpack_require__.j = 831;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			831: 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[993,592]
/******/ 		];
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = x => {};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime, executeModules] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkthunderbirdconversations"] = self["webpackChunkthunderbirdconversations"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 		
/******/ 		function checkDeferredModulesImpl() {
/******/ 			var result;
/******/ 			for(var i = 0; i < deferredModules.length; i++) {
/******/ 				var deferredModule = deferredModules[i];
/******/ 				var fulfilled = true;
/******/ 				for(var j = 1; j < deferredModule.length; j++) {
/******/ 					var depId = deferredModule[j];
/******/ 					if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferredModules.splice(i--, 1);
/******/ 					result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 				}
/******/ 			}
/******/ 			if(deferredModules.length === 0) {
/******/ 				__webpack_require__.x();
/******/ 				__webpack_require__.x = x => {};
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		var startup = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			// reset startup function so it can be called again when more startup code is added
/******/ 			__webpack_require__.x = startup || (x => {});
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	// run startup
/******/ 	__webpack_require__.x();
/******/ })()
;