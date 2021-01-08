/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 357:
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
;// CONCATENATED MODULE: ./addon/content/reducer-summary.js
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
      await dispatch(messageActions.showMsgDetails({
        id: msg.id,
        detailsShowing: true
      }));
    }
  }
}

var summaryActions = {
  replaceConversation({
    summary,
    messages
  }) {
    return async (dispatch, getState) => {
      await handleShowDetails(messages, getState(), dispatch, () => {
        dispatch(summarySlice.actions.replaceSummaryDetails(summary));
        return dispatch({
          type: "REPLACE_CONVERSATION_DETAILS",
          messages
        });
      });
    };
  },

  appendMessages({
    summary,
    messages
  }) {
    return async (dispatch, getState) => {
      await handleShowDetails(messages, getState(), dispatch, () => {
        return dispatch({
          type: "APPEND_MESSAGES",
          messages
        });
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
    return async () => {
      const dest = await browser.convContacts.makeMimeAddress({
        name,
        email
      });
      await browser.convContacts.composeNew({
        to: dest
      }).catch(console.error);
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
      getMail3Pane().messenger.launchExternalURL(url);
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
const summarySlice = redux_toolkit_esm.createSlice({
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

      let mainVersion = browserVersion?.split(".")[0];
      return { ...state,
        browserForegroundColor,
        browserBackgroundColor,
        defaultFontSize,
        defaultDetailsShowing,
        // Thunderbird 81 has built-in PDF viewer.
        hasBuiltInPdf: mainVersion >= 81,
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
});
globalThis.conversationSummaryActions = summaryActions;
;// CONCATENATED MODULE: ./addon/content/reducer-messages.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* global Conversations, Conversation, BrowserSim, topMail3Pane */

const initialMessages = {
  msgData: []
};

function modifyOnlyMsg(currentState, msgUri, modifier) {
  const newState = { ...currentState
  };
  const newMsgData = [];

  for (let i = 0; i < currentState.msgData.length; i++) {
    if (currentState.msgData[i].msgUri == msgUri) {
      newMsgData.push(modifier({ ...currentState.msgData[i]
      }));
    } else {
      newMsgData.push(currentState.msgData[i]);
    }
  }

  newState.msgData = newMsgData;
  return newState;
}

function modifyOnlyMsgId(currentState, id, modifier) {
  const newState = { ...currentState
  };
  const newMsgData = [];

  for (let i = 0; i < currentState.msgData.length; i++) {
    if (currentState.msgData[i].id == id) {
      newMsgData.push(modifier({ ...currentState.msgData[i]
      }));
    } else {
      newMsgData.push(currentState.msgData[i]);
    }
  }

  newState.msgData = newMsgData;
  return newState;
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
    msgUrls, isThreaded, ++Conversations.counter, isInTab);
    let browserFrame = window.frameElement; // Because Thunderbird still hasn't fixed that...

    if (browserFrame) {
      browserFrame.setAttribute("context", "mailContext");
    }

    freshConversation.outputInto(window, async function (aConversation) {
      // This is a stripped-down version of what's in msgWindowApi.js,
      //  make sure the two are in sync!
      Conversations.currentConversation = aConversation;
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
      await dispatch(summarySlice.actions.setConversationState({
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
      await dispatch(summarySlice.actions.setSystemOptions({
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
      // rewriting - it may be better to have a completely seperate message
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

      await dispatch({
        type: "MSG_UPDATE_DATA_ID",
        msgData: {
          attachments,
          attachmentsPlural: await browser.conversations.makePlural(browser.i18n.getMessage("pluralForm"), browser.i18n.getMessage("attachments.numAttachments"), numAttachments),
          id,
          needsLateAttachments: false
        }
      });
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
      if (Conversations.currentConversation) {
        const msg = Conversations.currentConversation.getMessage(msgUri);

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
      const msg = Conversations.currentConversation.getMessageByApiId(id); // Turn remote content message "off", as although it has it, it can be loaded.

      msg.hasRemoteContent = false;
      const msgData = await msg.toReactData();
      dispatch({
        type: "MSG_UPDATE_DATA",
        msgData
      });
    };
  },

  alwaysShowRemoteContent({
    id,
    realFrom
  }) {
    return async dispatch => {
      await browser.conversations.alwaysShowRemoteContent(realFrom);
      const msg = Conversations.currentConversation.getMessageByApiId(id); // Turn remote content message "off", as although it has it, it can be loaded.

      msg.hasRemoteContent = false;
      const msgData = await msg.toReactData();
      dispatch({
        type: "MSG_UPDATE_DATA",
        msgData
      });
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
      const msg = Conversations.currentConversation.getMessage(msgUri);
      msg.msgPluginNotification(topMail3Pane(window), notificationType, extraData);
    };
  },

  tagClick({
    msgUri,
    event,
    details
  }) {
    return async () => {
      const msg = Conversations.currentConversation.getMessage(msgUri);
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
      await dispatch({
        type: "MSG_UPDATE_DATA_ID",
        msgData: {
          isPhishing: false
        }
      });
    };
  },

  showMsgDetails({
    id,
    detailsShowing
  }) {
    return async (dispatch, getState) => {
      if (!detailsShowing) {
        await dispatch({
          type: "MSG_HDR_DETAILS",
          detailsShowing: false,
          id
        });
        return;
      }

      let currentMsg = getState().messages.msgData.find(msg => msg.id == id); // If we already have header information, don't get it again.

      if (currentMsg?.extraLines?.length) {
        await dispatch({
          type: "MSG_HDR_DETAILS",
          detailsShowing: true,
          id
        });
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
        dispatch({
          type: "MSG_HDR_DETAILS",
          extraLines,
          detailsShowing: true,
          id
        });
      } catch (ex) {
        console.error(ex);
      }
    };
  }

};
function messages(state = initialMessages, action) {
  switch (action.type) {
    case "REPLACE_CONVERSATION_DETAILS":
      {
        return { ...state,
          ...action.messages
        };
      }

    case "APPEND_MESSAGES":
      {
        const newState = { ...state
        };
        newState.msgData = newState.msgData.concat(action.messages.msgData);
        return newState;
      }

    case "MSG_EXPAND":
      {
        return modifyOnlyMsg(state, action.msgUri, msg => {
          const newMsg = { ...msg
          };
          newMsg.expanded = action.expand;
          return newMsg;
        });
      }

    case "TOGGLE_CONVERSATION_EXPANDED":
      {
        const newState = { ...state
        };
        const newMsgData = [];

        for (let msg of newState.msgData) {
          const newMsg = { ...msg,
            expanded: action.expand
          };
          newMsgData.push(newMsg);
        }

        newState.msgData = newMsgData;
        return newState;
      }

    case "MSG_UPDATE_DATA":
      {
        return modifyOnlyMsg(state, action.msgData.msgUri, msg => {
          return { ...msg,
            ...action.msgData
          };
        });
      }

    case "MSG_UPDATE_DATA_ID":
      {
        return modifyOnlyMsgId(state, action.msgData.id, msg => {
          return { ...msg,
            ...action.msgData
          };
        });
      }

    case "MSG_ADD_SPECIAL_TAG":
      {
        return modifyOnlyMsg(state, action.uri, msg => {
          let newSpecialTags;

          if (!("specialTags" in msg)) {
            newSpecialTags = [action.tagDetails];
          } else {
            newSpecialTags = [...msg.specialTags, action.tagDetails];
          }

          return { ...msg,
            specialTags: newSpecialTags
          };
        });
      }

    case "MSG_REMOVE_SPECIAL_TAG":
      {
        return modifyOnlyMsg(state, action.uri, msg => {
          if (!msg.specialTags) {
            return msg;
          }

          const newSpecialTags = [...msg.specialTags];
          return { ...msg,
            specialTags: newSpecialTags.filter(t => t.name != action.tagDetails.name)
          };
        });
      }

    case "MARK_AS_JUNK":
      {
        // This action should only be activated when the conversation is not a
        //  conversation in a tab AND there's only one message in the conversation,
        //  i.e. the currently selected message
        browser.conversations.markSelectedAsJunk(action.isJunk).catch(console.error);

        if (!action.isJunk) {
          // TODO: We should possibly wait until we get the notification before
          // clearing the state here.
          return modifyOnlyMsgId(state, action.id, msg => {
            const newMsg = { ...msg
            };
            newMsg.isJunk = action.isJunk;
            return newMsg;
          });
        }

        return state;
      }

    case "MSG_HDR_DETAILS":
      {
        return modifyOnlyMsgId(state, action.id, msg => {
          const newMsg = { ...msg
          };
          newMsg.detailsShowing = action.detailsShowing;

          if ("extraLines" in action) {
            newMsg.extraLines = action.extraLines;
          }

          return newMsg;
        });
      }

    case "REMOVE_MESSAGE_FROM_CONVERSATION":
      {
        const newState = { ...state
        };
        const newMsgData = [];

        for (let i = 0; i < state.msgData.length; i++) {
          if (state.msgData[i].msgUri != action.msgUri) {
            newMsgData.push(state.msgData[i]);
          }
        }

        newState.msgData = newMsgData;
        return newState;
      }

    case "CLEAR_SCROLLTO":
      {
        return modifyOnlyMsgId(state, action.id, msg => {
          return { ...msg,
            scrollTo: false
          };
        });
      }

    case "MSG_SHOW_NOTIFICATION":
      {
        return modifyOnlyMsg(state, action.msgData.msgUri, msg => {
          const newMsg = { ...msg
          };

          if ("extraNotifications" in msg) {
            let i = msg.extraNotifications.findIndex(n => n.type == action.msgData.notification.type);

            if (i != -1) {
              newMsg.extraNotifications = [...msg.extraNotifications];
              newMsg.extraNotifications[i] = action.msgData.notification;
            } else {
              newMsg.extraNotifications = [...msg.extraNotifications, action.msgData.notification];
            }
          } else {
            newMsg.extraNotifications = [action.msgData.notification];
          }

          return newMsg;
        });
      }

    default:
      {
        return state;
      }
  }
}
;// CONCATENATED MODULE: ./addon/content/reducer.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



const conversationApp = redux/* combineReducers */.UY({
  messages: messages,
  summary: summarySlice.reducer
});
;// CONCATENATED MODULE: ./addon/content/reducer-deps.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
let oldPrint = window.print;
async function initialize() {
  // This provides simulation for the WebExtension environment whilst we're still
  // being loaded in a privileged process.
  // eslint-disable-next-line
  globalThis.browser = await BrowserSim.getBrowserAsync();
  globalThis.print = reducer_deps_printConversation;
}
/* global Conversations */

function reducer_deps_printConversation(event) {
  for (let {
    message: m
  } of Conversations.currentConversation.messages) {
    m.dumpPlainTextForPrinting();
  }

  oldPrint();
}
// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(697);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);
;// CONCATENATED MODULE: ./addon/content/conversationFooter.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





class _ConversationFooter extends react.PureComponent {
  constructor(props) {
    super(props);
    this.forwardConversation = this.forwardConversation.bind(this);
    this.printConversation = this.printConversation.bind(this);
  }

  forwardConversation() {
    this.props.dispatch(summaryActions.forwardConversation());
  }

  printConversation() {
    this.props.dispatch(summaryActions.printConversation());
  }

  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: "bottom-links"
    }, /*#__PURE__*/react.createElement("a", {
      className: "link",
      onClick: this.forwardConversation
    }, browser.i18n.getMessage("message.forwardConversation")), " "); // TODO: Get printing working again.
    // –{" "}
    // <a className="link" onClick={this.printConversation}>
    //   {browser.i18n.getMessage("message.printConversation")}
    // </a>
  }

}

_ConversationFooter.propTypes = {
  dispatch: (prop_types_default()).func.isRequired
};
const ConversationFooter = es/* connect */.$j()(_ConversationFooter);
;// CONCATENATED MODULE: ./addon/content/svgIcon.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * A basic SVG icon rendered using the `xlinkHref` ability
 * of SVGs. You can specify the full path, or just the hash.
 *
 * @param {*} { fullPath, hash }
 * @returns {React.ReactNode}
 */

function SvgIcon({
  fullPath,
  hash
}) {
  fullPath = fullPath || `material-icons.svg#${hash}`;
  return /*#__PURE__*/react.createElement("svg", {
    className: "icon",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    xmlnsXlink: "http://www.w3.org/1999/xlink"
  }, /*#__PURE__*/react.createElement("use", {
    xlinkHref: fullPath
  }));
}
SvgIcon.propTypes = {
  fullPath: (prop_types_default()).string,
  hash: (prop_types_default()).string
};
;// CONCATENATED MODULE: ./addon/content/conversationHeader.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */






const LINKS_REGEX = /((\w+):\/\/[^<>()'"\s]+|www(\.[-\w]+){2,})/;

class LinkifiedSubject extends react.PureComponent {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    this.props.dispatch(summaryActions.openLink({
      url: event.target.title
    }));
    event.preventDefault();
  }

  render() {
    let subject = this.props.subject;

    if (this.props.loading) {
      subject = browser.i18n.getMessage("message.loading");
    } else if (!subject) {
      subject = browser.i18n.getMessage("message.noSubject");
    }

    if (LINKS_REGEX.test(this.props.subject)) {
      let contents = [];
      let text = subject;

      while (text && LINKS_REGEX.test(text)) {
        let matches = LINKS_REGEX.exec(text);
        let [pre, ...post] = text.split(matches[1]);
        let link = /*#__PURE__*/react.createElement("a", {
          href: matches[1],
          title: matches[1],
          className: "link",
          onClick: this.handleClick
        }, matches[1]);

        if (pre) {
          contents.push(pre);
        }

        contents.push(link);
        text = post.join(matches[1]);
      }

      if (text) {
        contents.push(text);
      }

      return /*#__PURE__*/react.createElement("div", {
        className: "subject",
        title: this.props.subject
      }, /*#__PURE__*/react.createElement("span", null, contents));
    }

    return /*#__PURE__*/react.createElement("div", {
      className: "subject",
      title: this.props.subject
    }, this.props.subject);
  }

}

LinkifiedSubject.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  loading: (prop_types_default()).bool.isRequired,
  subject: (prop_types_default()).string.isRequired
};

class _ConversationHeader extends react.PureComponent {
  constructor(props) {
    super(props);
    this.archiveToolbar = this.archiveToolbar.bind(this);
    this.delete = this.delete.bind(this);
    this.detachTab = this.detachTab.bind(this);
    this.expandCollapse = this.expandCollapse.bind(this);
    this.junkConversation = this.junkConversation.bind(this);
    this.toggleRead = this.toggleRead.bind(this);
  }

  archiveToolbar(event) {
    this.props.dispatch(messageActions.archiveConversation());
  }

  delete(event) {
    this.props.dispatch(messageActions.deleteConversation());
  }
  /**
   * This function gathers various information, encodes it in a URL query
   * string, and then opens a regular chrome tab that contains our
   * conversation.
   */


  detachTab(event) {
    this.props.dispatch(messageActions.detachTab());
  }

  get areSomeMessagesCollapsed() {
    return !this.props.msgData?.some(msg => msg.expanded);
  }

  get areSomeMessagesUnread() {
    return this.props.msgData?.some(msg => !msg.read);
  }

  get canJunk() {
    // TODO: Disable if in just a new tab? (e.g. double-click)
    // as per old comment:
    // We can never junk a conversation in a new tab, because the junk
    // command only operates on selected messages, and we're not in a
    // 3pane context anymore.
    return this.props.msgData && this.props.msgData.length <= 1 && this.props.msgData.some(msg => !msg.isJunk);
  }

  expandCollapse(event) {
    this.props.dispatch({
      type: "TOGGLE_CONVERSATION_EXPANDED",
      expand: this.areSomeMessagesCollapsed
    });
  }

  junkConversation(event) {
    // This callback is only activated when the conversation is not a
    //  conversation in a tab AND there's only one message in the conversation,
    //  i.e. the currently selected message
    this.props.dispatch({
      type: "MARK_AS_JUNK",
      id: this.props.msgData[0].id,
      isJunk: true
    });
  } // Mark the current conversation as read/unread. The conversation driver
  //  takes care of setting the right class on us whenever the state
  //  changes...


  toggleRead(event) {
    this.props.dispatch(messageActions.toggleConversationRead({
      read: this.areSomeMessagesUnread
    }));
  }

  render() {
    document.title = this.props.subject;
    return /*#__PURE__*/react.createElement("div", {
      className: "conversationHeaderWrapper"
    }, /*#__PURE__*/react.createElement("div", {
      className: "conversationHeader"
    }, /*#__PURE__*/react.createElement(LinkifiedSubject, {
      dispatch: this.props.dispatch,
      loading: this.props.loading,
      subject: this.props.subject
    }), /*#__PURE__*/react.createElement("div", {
      className: "actions"
    }, /*#__PURE__*/react.createElement("button", {
      className: "button-flat",
      title: browser.i18n.getMessage("message.trash.tooltip"),
      onClick: this.delete
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "delete"
    })), /*#__PURE__*/react.createElement("button", {
      className: "button-flat",
      title: browser.i18n.getMessage("message.archive.tooltip"),
      onClick: this.archiveToolbar
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "archive"
    })), this.canJunk && /*#__PURE__*/react.createElement("button", {
      className: "button-flat junk-button",
      title: browser.i18n.getMessage("message.junk.tooltip"),
      onClick: this.junkConversation
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "whatshot"
    })), /*#__PURE__*/react.createElement("button", {
      className: "button-flat",
      title: browser.i18n.getMessage("message.expand.tooltip"),
      onClick: this.expandCollapse
    }, /*#__PURE__*/react.createElement("svg", {
      className: `icon expand ${this.areSomeMessagesCollapsed ? "" : "collapse"}`,
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, /*#__PURE__*/react.createElement("use", {
      className: "expand-more",
      xlinkHref: "material-icons.svg#expand_more"
    }), /*#__PURE__*/react.createElement("use", {
      className: "expand-less",
      xlinkHref: "material-icons.svg#expand_less"
    }))), /*#__PURE__*/react.createElement("button", {
      className: `button-flat ${this.areSomeMessagesUnread ? "unread" : ""}`,
      title: browser.i18n.getMessage("message.read.tooltip"),
      onClick: this.toggleRead
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "new"
    })), /*#__PURE__*/react.createElement("button", {
      className: "button-flat",
      title: browser.i18n.getMessage("message.detach.tooltip"),
      onClick: this.detachTab
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "open_in_new"
    })))));
  }

}

_ConversationHeader.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  loading: (prop_types_default()).bool.isRequired,
  subject: (prop_types_default()).string.isRequired,
  msgData: (prop_types_default()).array.isRequired
};
const ConversationHeader = es/* connect */.$j(state => {
  return {
    loading: state.summary.loading,
    subject: state.summary.subject,
    msgData: state.messages.msgData
  };
})(_ConversationHeader);
;// CONCATENATED MODULE: ./addon/content/reducer-attachments.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const attachmentActions = {
  previewAttachment({
    name,
    url,
    isPdf,
    maybeViewable
  }) {
    return async (dispatch, getState) => {
      if (maybeViewable) {
        // Can't use browser.tabs.create because imap://user@bar/ is an
        // illegal url.
        browser.conversations.createTab({
          url,
          type: "contentTab",
          windowId: getState().summary.windowId
        });
      }

      if (isPdf) {
        browser.conversations.createTab({
          url: "chrome://conversations/content/pdfviewer/wrapper.xhtml?uri=" + encodeURIComponent(url) + "&name=" + encodeURIComponent(name),
          type: "chromeTab",
          windowId: getState().summary.windowId
        });
      }
    };
  },

  downloadAll({
    id
  }) {
    return async () => {
      await browser.conversations.downloadAllAttachments(id);
    };
  },

  downloadAttachment({
    id,
    attachmentUrl
  }) {
    return async () => {
      await browser.conversations.downloadAttachment(id, attachmentUrl);
    };
  },

  openAttachment({
    id,
    attachmentUrl
  }) {
    return async () => {
      await browser.conversations.openAttachment(id, attachmentUrl);
    };
  },

  detachAttachment({
    id,
    attachmentUrl,
    shouldSave
  }) {
    return async () => {
      await browser.conversations.detachAttachment(id, attachmentUrl, shouldSave);
    };
  },

  showGalleryView({
    id
  }) {
    return async (dispatch, getState) => {
      let msgUri = await browser.conversations.getMessageUriForId(id);
      await browser.tabs.create({
        url: "/gallery/index.html?uri=" + encodeURI(msgUri),
        windowId: getState().summary.windowId
      });
    };
  }

};
;// CONCATENATED MODULE: ./addon/content/attachments.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




const ICON_MAPPING = new Map([["application/msword", "x-office-document"], ["application/vnd.ms-excel", "x-office-spreadsheet"], ["application/vnd.ms-powerpoint", "x-office-presentation"], ["application/rtf", "x-office-document"], ["application/zip", "package-x-generic"], ["application/bzip2", "package-x-generic"], ["application/x-gzip", "package-x-generic"], ["application/x-tar", "package-x-generic"], ["application/x-compressed", "package-x-generic"], // "message/": "email",
["text/x-vcalendar", "x-office-calendar"], ["text/x-vcard", "x-office-address-book"], ["text/html", "text-html"], ["application/pdf", "application-pdf"], ["application/x-pdf", "application-pdf"], ["application/x-bzpdf", "application-pdf"], ["application/x-gzpdf", "application-pdf"]]);
const FALLBACK_ICON_MAPPING = new Map([// Fallbacks, at the end.
["video/", "video-x-generic"], ["audio/", "audio-x-generic"], ["image/", "image-x-generic"], ["text/", "text-x-generic"]]);
const PDF_MIME_TYPES = ["application/pdf", "application/x-pdf", "application/x-bzpdf", "application/x-gzpdf"];
const RE_MSGKEY = /number=(\d+)/;

class Attachment extends react.PureComponent {
  constructor(props) {
    super(props);
    this.preview = this.preview.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.downloadAttachment = this.downloadAttachment.bind(this);
    this.openAttachment = this.openAttachment.bind(this);
    this.deleteAttachment = this.deleteAttachment.bind(this);
    this.detachAttachment = this.detachAttachment.bind(this);
  }

  isImage(contentType) {
    return contentType.startsWith("image/");
  }

  isViewable(contentType) {
    return this.isImage(contentType) || contentType.startsWith("text/");
  }

  isPdf(contentType) {
    return PDF_MIME_TYPES.includes(contentType);
  }

  preview() {
    // Keep similar capabilities as previous versions where the user
    // can click the attachment to open the pdf.
    if (this.isPdf(this.props.contentType) && this.props.hasBuiltInPdf) {
      this.openAttachment();
      return;
    }

    this.props.dispatch(attachmentActions.previewAttachment({
      name: this.props.name,
      url: this.props.url,
      isPdf: this.isPdf(this.props.contentType),
      maybeViewable: this.isViewable(this.props.contentType)
    }));
  }

  onDragStart(event) {
    let info;

    if (/(^file:|&filename=)/.test(this.props.url)) {
      info = this.props.url;
    } else {
      info = this.props.url + "&type=" + this.props.contentType + "&filename=" + encodeURIComponent(this.props.name);
    }

    event.dataTransfer.setData("text/x-moz-url", `${info}\n${this.props.name}\n${this.props.size}`);
    event.dataTransfer.setData("text/x-moz-url-data", this.props.url);
    event.dataTransfer.setData("text/x-moz-url-desc", this.props.name);
    event.dataTransfer.setData("application/x-moz-file-promise-url", this.props.url);
    event.dataTransfer.setData("application/x-moz-file-promise", null);
    event.stopPropagation();
  }

  downloadAttachment() {
    this.props.dispatch(attachmentActions.downloadAttachment({
      id: this.props.id,
      attachmentUrl: this.props.url
    }));
  }

  openAttachment() {
    this.props.dispatch(attachmentActions.openAttachment({
      id: this.props.id,
      attachmentUrl: this.props.url
    }));
  }

  detachAttachment() {
    this.props.dispatch(attachmentActions.detachAttachment({
      id: this.props.id,
      attachmentUrl: this.props.url,
      shouldSave: true
    }));
  }

  deleteAttachment() {
    this.props.dispatch(attachmentActions.detachAttachment({
      id: this.props.id,
      attachmentUrl: this.props.url,
      shouldSave: false
    }));
  }

  iconForMimeType(mimeType) {
    if (ICON_MAPPING.has(mimeType)) {
      return ICON_MAPPING.get(mimeType) + ".svg";
    }

    let split = mimeType.split("/");

    if (split.length && FALLBACK_ICON_MAPPING.has(split[0] + "/")) {
      return FALLBACK_ICON_MAPPING.get(split[0] + "/") + ".svg";
    }

    return "gtk-file.png";
  }

  render() {
    const isPdf = this.isPdf(this.props.contentType);
    const enablePreview = isPdf || this.isViewable(this.props.contentType);
    const imgTitle = enablePreview ? browser.i18n.getMessage("attachments.viewAttachment.tooltip") : "";
    let thumb;
    let imgClass;

    if (this.isImage(this.props.contentType)) {
      thumb = this.props.url.replace(RE_MSGKEY, "number=" + this.props.messageKey);
      imgClass = "resize-me";
    } else {
      thumb = "icons/" + this.iconForMimeType(this.props.contentType);
      imgClass = "mime-icon";
    } // TODO: Drag n drop
    // Note: contextmenu is only supported in Gecko, though React will complain
    // about it.
    // Hoping to turn this into WebExtension based context menus at some
    // stage: https://github.com/thunderbird-conversations/thunderbird-conversations/issues/1416

    /* eslint-disable react/no-unknown-property */


    return /*#__PURE__*/react.createElement("li", {
      className: "attachment",
      contextmenu: `attachmentMenu-${this.props.anchor}`
    }, /*#__PURE__*/react.createElement("div", {
      className: "attachmentThumb" + (enablePreview ? " view-attachment" : ""),
      draggable: "true",
      onClick: this.preview,
      onDragStart: this.onDragStart
    }, /*#__PURE__*/react.createElement("img", {
      className: imgClass,
      src: thumb,
      title: imgTitle
    })), /*#__PURE__*/react.createElement("div", {
      className: "attachmentInfo align"
    }, /*#__PURE__*/react.createElement("span", {
      className: "filename"
    }, this.props.name), /*#__PURE__*/react.createElement("span", {
      className: "filesize"
    }, this.props.formattedSize), /*#__PURE__*/react.createElement("div", {
      className: "attachActions"
    }, isPdf && !this.props.hasBuiltInPdf && /*#__PURE__*/react.createElement("a", {
      className: "icon-link preview-attachment",
      title: browser.i18n.getMessage("attachments.preview.tooltip"),
      onClick: this.preview
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "visibility"
    })), /*#__PURE__*/react.createElement("a", {
      className: "icon-link download-attachment",
      title: browser.i18n.getMessage("attachments.download.tooltip"),
      onClick: this.downloadAttachment
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "file_download"
    })), /*#__PURE__*/react.createElement("a", {
      className: "icon-link open-attachment",
      title: browser.i18n.getMessage("attachments.open.tooltip"),
      onClick: this.openAttachment
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "search"
    })))), /*#__PURE__*/react.createElement("menu", {
      id: `attachmentMenu-${this.props.anchor}`,
      type: "context"
    }, /*#__PURE__*/react.createElement("menuitem", {
      label: browser.i18n.getMessage("attachments.context.open"),
      onClick: this.openAttachment
    }), /*#__PURE__*/react.createElement("menuitem", {
      label: browser.i18n.getMessage("attachments.context.save"),
      onClick: this.downloadAttachment
    }), /*#__PURE__*/react.createElement("menuitem", {
      label: browser.i18n.getMessage("attachments.context.detach"),
      onClick: this.detachAttachment
    }), /*#__PURE__*/react.createElement("menuitem", {
      label: browser.i18n.getMessage("attachments.context.delete"),
      onClick: this.deleteAttachment
    })));
    /* eslint-enable react/no-unknown-property */
  }

}

Attachment.propTypes = {
  anchor: (prop_types_default()).string.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  contentType: (prop_types_default()).string.isRequired,
  formattedSize: (prop_types_default()).string.isRequired,
  hasBuiltInPdf: (prop_types_default()).bool.isRequired,
  messageKey: (prop_types_default()).number.isRequired,
  name: (prop_types_default()).string.isRequired,
  size: (prop_types_default()).number.isRequired,
  url: (prop_types_default()).string.isRequired,
  id: (prop_types_default()).number.isRequired
};
class Attachments extends react.PureComponent {
  constructor() {
    super();
    this.showGalleryView = this.showGalleryView.bind(this);
    this.downloadAll = this.downloadAll.bind(this);
  }

  showGalleryView() {
    this.props.dispatch(attachmentActions.showGalleryView({
      type: "SHOW_GALLERY_VIEW",
      id: this.props.id
    }));
  }

  downloadAll() {
    this.props.dispatch(attachmentActions.downloadAll({
      id: this.props.id
    }));
  }

  render() {
    const showGalleryLink = this.props.attachments.some(a => a.contentType.startsWith("image/"));
    return /*#__PURE__*/react.createElement("ul", {
      className: "attachments"
    }, /*#__PURE__*/react.createElement("div", {
      className: "attachHeader"
    }, this.props.attachmentsPlural, /*#__PURE__*/react.createElement("a", {
      className: "icon-link download-all",
      onClick: this.downloadAll,
      title: browser.i18n.getMessage("attachments.downloadAll.tooltip")
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "file_download"
    })), showGalleryLink && /*#__PURE__*/react.createElement("a", {
      onClick: this.showGalleryView,
      className: "icon-link view-all",
      title: browser.i18n.getMessage("attachments.gallery.tooltip")
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "photo_library"
    }))), this.props.attachments.map(attachment => /*#__PURE__*/react.createElement(Attachment, {
      anchor: attachment.anchor,
      dispatch: this.props.dispatch,
      key: attachment.anchor,
      contentType: attachment.contentType,
      formattedSize: attachment.formattedSize,
      hasBuiltInPdf: this.props.hasBuiltInPdf,
      messageKey: this.props.messageKey,
      id: this.props.id,
      name: attachment.name,
      size: attachment.size,
      url: attachment.url
    })));
  }

}
Attachments.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  attachments: (prop_types_default()).array.isRequired,
  attachmentsPlural: (prop_types_default()).string.isRequired,
  hasBuiltInPdf: (prop_types_default()).bool.isRequired,
  messageKey: (prop_types_default()).number.isRequired,
  id: (prop_types_default()).number.isRequired
};
;// CONCATENATED MODULE: ./addon/content/contactDetail.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */







class _ContactDetail extends react.PureComponent {
  constructor(props) {
    super(props);
    this.addContact = this.addContact.bind(this);
    this.editContact = this.editContact.bind(this);
    this.createFilter = this.createFilter.bind(this);
    this.copyEmail = this.copyEmail.bind(this);
    this.sendEmail = this.sendEmail.bind(this);
    this.showInvolving = this.showInvolving.bind(this);
    this.onGeneralClick = this.onGeneralClick.bind(this);
  }

  onGeneralClick(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  addContact(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch(summaryActions.addContact({
      name: this.props.name,
      email: this.props.realEmail
    }));
  }

  createFilter(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch(summaryActions.createFilter({
      email: this.props.realEmail
    }));
  }

  copyEmail(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch(summaryActions.copyEmail({
      email: this.props.realEmail
    }));
  }

  editContact(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch(summaryActions.editContact({
      email: this.props.realEmail
    }));
  }

  sendEmail(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch(summaryActions.sendEmail({
      name: this.props.name,
      email: this.props.realEmail
    }));
  }

  showInvolving(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch(summaryActions.showMessagesInvolving({
      name: this.props.name,
      email: this.props.realEmail
    }));
  }

  render() {
    const name = this.props.name;
    const pos = this.props.parentSpan && this.props.parentSpan.getBoundingClientRect() || {
      left: 0,
      top: 0,
      bottom: 0
    };
    const elm = /*#__PURE__*/react.createElement("div", {
      className: "tooltip",
      style: {
        left: pos.left,
        top: pos.top + window.scrollY + (pos.bottom - pos.top) * 2
      },
      onClick: this.onGeneralClick
    }, /*#__PURE__*/react.createElement("div", {
      className: "arrow"
    }), /*#__PURE__*/react.createElement("div", {
      className: "arrow inside"
    }), /*#__PURE__*/react.createElement("div", {
      className: "authorInfoContainer"
    }, /*#__PURE__*/react.createElement("div", {
      className: "authorInfo"
    }, /*#__PURE__*/react.createElement("span", {
      className: "name",
      title: name
    }, name), /*#__PURE__*/react.createElement("span", {
      className: "authorEmail"
    }, /*#__PURE__*/react.createElement("span", {
      className: "authorEmailAddress",
      title: this.props.realEmail
    }, this.props.realEmail), /*#__PURE__*/react.createElement("button", {
      className: "copyEmail",
      title: browser.i18n.getMessage("contact.copyEmailTooltip"),
      onClick: this.copyEmail
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "content_copy"
    })))), /*#__PURE__*/react.createElement("div", {
      className: "authorPicture"
    }, /*#__PURE__*/react.createElement("img", {
      src: this.props.avatar
    }))), /*#__PURE__*/react.createElement("div", {
      className: "tipFooter"
    }, /*#__PURE__*/react.createElement("button", {
      className: "sendEmail",
      title: browser.i18n.getMessage("contact.sendEmailTooltip"),
      onClick: this.sendEmail
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "mail"
    })), /*#__PURE__*/react.createElement("button", {
      className: "showInvolving",
      title: browser.i18n.getMessage("contact.recentConversationsTooltip"),
      onClick: this.showInvolving
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "history"
    })), this.props.contactId ? /*#__PURE__*/react.createElement("button", {
      className: "editContact",
      title: browser.i18n.getMessage("contact.editContactTooltip"),
      onClick: this.editContact
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "edit"
    })) : /*#__PURE__*/react.createElement("button", {
      className: "addContact",
      title: browser.i18n.getMessage("contact.addContactTooltip"),
      onClick: this.addContact
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "add"
    })), /*#__PURE__*/react.createElement("button", {
      className: "createFilter",
      onClick: this.createFilter
    }, browser.i18n.getMessage("contact.createFilterTooltip")))); // In TB 68, when an element with `tabIndex` gets focused,
    // it gets set as the position parent. It shouldn't. To resolve
    // this issue, reparent the popup to <body> so its parent will never
    // change. See https://github.com/thunderbird-conversations/thunderbird-conversations/pull/1432

    return /*#__PURE__*/react_dom.createPortal(elm, document.querySelector("body"));
  }

}

_ContactDetail.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  name: (prop_types_default()).string.isRequired,
  email: (prop_types_default()).string.isRequired,
  realEmail: (prop_types_default()).string.isRequired,
  avatar: (prop_types_default()).string.isRequired,
  contactId: (prop_types_default()).string,
  parentSpan: (prop_types_default()).object.isRequired
};
const ContactDetail = es/* connect */.$j()(_ContactDetail);
;// CONCATENATED MODULE: ./addon/content/messageActionButton.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



const ActionsToInfoMap = {
  draft: {
    title: "action.editDraft",
    icon: "edit"
  },
  editAsNew: {
    title: "action.editNew",
    icon: "edit"
  },
  reply: {
    title: "action.reply",
    icon: "reply"
  },
  replyAll: {
    title: "action.replyAll",
    icon: "reply_all"
  },
  replyList: {
    title: "action.replyList",
    icon: "list"
  },
  forward: {
    title: "action.forward",
    icon: "forward"
  },
  archive: {
    title: "action.archive",
    icon: "archive"
  },
  delete: {
    title: "action.delete",
    icon: "delete"
  },
  classic: {
    title: "action.viewClassic",
    icon: "open_in_new"
  },
  source: {
    title: "action.viewSource",
    icon: "code"
  }
};
function ActionButton({
  type,
  callback,
  className,
  showString
}) {
  const info = ActionsToInfoMap[type];
  const title = browser.i18n.getMessage(info.title);

  function action(event) {
    callback({
      type,
      shiftKey: event && event.shiftKey
    }, event);
  }

  return /*#__PURE__*/react.createElement("button", {
    className: className || "",
    title: title,
    onClick: action
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    hash: info.icon
  }), " ", !!showString && title);
}
ActionButton.propTypes = {
  callback: (prop_types_default()).func.isRequired,
  className: (prop_types_default()).string,
  showString: (prop_types_default()).bool,
  type: (prop_types_default()).string.isRequired
};
;// CONCATENATED MODULE: ./addon/content/messageHeaderOptions.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */






class OptionsMoreMenu extends react.PureComponent {
  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: "tooltip tooltip-menu menu"
    }, /*#__PURE__*/react.createElement("div", {
      className: "arrow"
    }), /*#__PURE__*/react.createElement("div", {
      className: "arrow inside"
    }), /*#__PURE__*/react.createElement("ul", null, /*#__PURE__*/react.createElement("li", {
      className: "action-reply"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "reply"
    })), this.props.multipleRecipients && /*#__PURE__*/react.createElement("li", {
      className: "action-replyAll"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "replyAll"
    })), this.props.recipientsIncludeLists && /*#__PURE__*/react.createElement("li", {
      className: "action-replyList"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "replyList"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-editNew"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "editAsNew"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-forward dropdown-sep"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "forward"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-archive"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "archive"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-delete"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "delete"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-classic"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "classic"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-source"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "source"
    }))));
  }

}

OptionsMoreMenu.propTypes = {
  multipleRecipients: (prop_types_default()).bool.isRequired,
  recipientsIncludeLists: (prop_types_default()).bool.isRequired,
  msgSendAction: (prop_types_default()).func.isRequired
};
class MessageHeaderOptions extends react.PureComponent {
  constructor(props) {
    super(props);
    this.replyAction = this.replyAction.bind(this);
    this.showDetails = this.showDetails.bind(this);
    this.displayMenu = this.displayMenu.bind(this);
    this.state = {
      expanded: false
    };
  }

  componentWillUnmount() {
    if (this.clickListener) {
      document.removeEventListener("click", this.clickListener);
      document.removeEventListener("keypress", this.keyListener);
      document.removeEventListener("blur", this.keyListener);
      this.clickListener = null;
      this.keyListener = null;
    }
  }

  replyAction(msg, event) {
    event.stopPropagation();
    event.preventDefault();
    const payload = {
      id: this.props.id,
      shiftKey: msg.shiftKey
    };
    let action = null;

    switch (msg.type) {
      case "draft":
        action = messageActions.editDraft(payload);
        break;

      case "reply":
        action = messageActions.reply(payload);
        break;

      case "replyAll":
        action = messageActions.replyAll(payload);
        break;

      case "replyList":
        action = messageActions.replyList(payload);
        break;

      case "forward":
        action = messageActions.forward(payload);
        break;

      case "editAsNew":
        action = messageActions.editAsNew(payload);
        break;

      case "archive":
        action = messageActions.archive({
          id: this.props.id
        });
        break;

      case "delete":
        action = messageActions.delete({
          id: this.props.id
        });
        break;

      case "classic":
        action = messageActions.openClassic(payload);
        break;

      case "source":
        action = messageActions.openSource(payload);
        break;

      default:
        console.error("Don't know how to create an action for", msg);
    }

    this.props.dispatch(action);
  }

  showDetails(event) {
    event.preventDefault();
    event.stopPropagation(); // Force a blur, so that the button looks correct after clicking.

    event.target.blur();
    this.props.dispatch(messageActions.showMsgDetails({
      id: this.props.id,
      detailsShowing: !this.props.detailsShowing
    }));
  }

  displayMenu(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.clickListener) {
      this.clickListener = event => {
        this.clearMenu();
      };

      this.keyListener = event => {
        if (event.keyCode == KeyEvent.DOM_VK_ESCAPE) {
          this.clearMenu();
        }
      };

      this.onBlur = event => {
        this.clearMenu();
      };

      document.addEventListener("click", this.clickListener);
      document.addEventListener("keypress", this.keyListener);
      document.addEventListener("blur", this.onBlur);
    }

    this.setState(prevState => ({
      expanded: !prevState.expanded
    }));
  }

  clearMenu() {
    this.setState({
      expanded: false
    });

    if (this.clickListener) {
      document.removeEventListener("click", this.clickListener);
      document.removeEventListener("keypress", this.keyListener);
      document.removeEventListener("blur", this.keyListener);
      this.clickListener = null;
      this.keyListener = null;
    }
  }

  render() {
    let actionButtonType = "reply";

    if (this.props.recipientsIncludeLists) {
      actionButtonType = "replyList";
    } else if (this.props.multipleRecipients) {
      actionButtonType = "replyAll";
    } else if (this.props.isDraft) {
      actionButtonType = "draft";
    }

    return /*#__PURE__*/react.createElement("div", {
      className: "options"
    }, !!this.props.attachments.length && /*#__PURE__*/react.createElement("span", {
      className: "attachmentIcon"
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "attachment"
    })), /*#__PURE__*/react.createElement("span", {
      className: "date"
    }, /*#__PURE__*/react.createElement("span", {
      title: this.props.fullDate
    }, this.props.date)), this.props.expanded && /*#__PURE__*/react.createElement("span", {
      className: "mainActionButton"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.replyAction,
      className: "icon-link",
      type: actionButtonType
    })), this.props.expanded && /*#__PURE__*/react.createElement("span", {
      className: "details" + this.props.detailsShowing ? "details-hidden" : 0
    }, /*#__PURE__*/react.createElement("a", {
      className: "icon-link",
      onClick: this.showDetails,
      title: browser.i18n.getMessage(this.props.detailsShowing ? "message.hideDetails.tooltip" : "message.showDetails.tooltip")
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: this.props.detailsShowing ? "info" : "info_outline"
    }))), this.props.expanded && /*#__PURE__*/react.createElement("span", {
      className: "dropDown"
    }, /*#__PURE__*/react.createElement("button", {
      onClick: this.displayMenu,
      className: "icon-link top-right-more",
      title: browser.i18n.getMessage("message.moreMenu.tooltip")
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "more_vert"
    })), this.state.expanded && /*#__PURE__*/react.createElement(OptionsMoreMenu, {
      recipientsIncludeLists: this.props.recipientsIncludeLists,
      msgSendAction: this.replyAction,
      multipleRecipients: this.props.multipleRecipients
    })));
  }

}
MessageHeaderOptions.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  date: (prop_types_default()).string.isRequired,
  detailsShowing: (prop_types_default()).bool.isRequired,
  expanded: (prop_types_default()).bool.isRequired,
  fullDate: (prop_types_default()).string.isRequired,
  id: (prop_types_default()).number.isRequired,
  attachments: (prop_types_default()).array.isRequired,
  multipleRecipients: (prop_types_default()).bool.isRequired,
  recipientsIncludeLists: (prop_types_default()).bool.isRequired,
  isDraft: (prop_types_default()).bool.isRequired
};
;// CONCATENATED MODULE: ./addon/content/messageTags.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



/**
 * Determine if a background color is light enough to require dark text.
 *
 * @param {string} color
 * @returns {boolean}
 */

function isColorLight(color) {
  const rgb = color.substr(1) || "FFFFFF";
  const [, r, g, b] = rgb.match(/(..)(..)(..)/).map(x => parseInt(x, 16) / 255);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.8;
}

function MessageTag({
  onClickX,
  expanded,
  name,
  color
}) {
  const isLight = isColorLight(color);
  return /*#__PURE__*/react.createElement("li", {
    className: "tag" + (isLight ? " light-tag" : ""),
    style: {
      backgroundColor: color
    }
  }, name, expanded && /*#__PURE__*/react.createElement("span", {
    className: "tag-x",
    onClick: onClickX
  }, " ", "x"));
}
MessageTag.propTypes = {
  onClickX: (prop_types_default()).func.isRequired,
  expanded: (prop_types_default()).bool.isRequired,
  name: (prop_types_default()).string.isRequired,
  color: (prop_types_default()).string.isRequired
};
function MessageTags({
  expanded,
  tags = [],
  onTagsChange
}) {
  function removeTag(tagId) {
    const filtered = tags.filter(tag => tag.key !== tagId);

    if (filtered.length !== tags.length) {
      // Only trigger a change if we actually removed a tag
      onTagsChange(filtered);
    }
  }

  return /*#__PURE__*/react.createElement("ul", {
    className: "tags regular-tags"
  }, tags.map((tag, i) => /*#__PURE__*/react.createElement(MessageTag, {
    color: tag.color,
    expanded: expanded,
    key: i,
    name: tag.name,
    onClickX: () => {
      removeTag(tag.key);
    }
  })));
}
MessageTags.propTypes = {
  expanded: (prop_types_default()).bool.isRequired,
  tags: (prop_types_default()).array.isRequired,
  onTagsChange: (prop_types_default()).func.isRequired
};

function DkimTooltip({
  strings
}) {
  const [primaryString, secondaryStrings = []] = strings;
  const primaryTooltip = /*#__PURE__*/react.createElement("div", null, primaryString);
  const secondaryTooltip = secondaryStrings.length ? /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("hr", null), secondaryStrings.map((s, i) => /*#__PURE__*/react.createElement("div", {
    key: i
  }, s)), /*#__PURE__*/react.createElement("div", null)) : null;
  return /*#__PURE__*/react.createElement("span", null, primaryTooltip, secondaryTooltip);
}

DkimTooltip.propTypes = {
  strings: (prop_types_default()).array.isRequired
};
function SpecialMessageTag({
  icon,
  name,
  title = "",
  tooltip = {},
  onClick = null,
  classNames
}) {
  return /*#__PURE__*/react.createElement("li", {
    className: classNames + " special-tag" + (onClick ? " can-click" : ""),
    title: title,
    onClick: onClick
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    fullPath: icon
  }), name, tooltip.type === "dkim" && /*#__PURE__*/react.createElement(DkimTooltip, {
    strings: tooltip.strings
  }));
}
SpecialMessageTag.propTypes = {
  classNames: (prop_types_default()).string.isRequired,
  icon: (prop_types_default()).string.isRequired,
  name: (prop_types_default()).string.isRequired,
  title: (prop_types_default()).string,
  onClick: (prop_types_default()).func,
  tooltip: (prop_types_default()).object
};
function SpecialMessageTags({
  onTagClick,
  onFolderClick = null,
  specialTags,
  inView,
  folderName
}) {
  let folderItem = null;

  if (folderName && !inView) {
    folderItem = /*#__PURE__*/react.createElement("li", {
      className: "in-folder",
      onClick: onFolderClick,
      title: browser.i18n.getMessage("tags.jumpToFolder.tooltip")
    }, browser.i18n.getMessage("tags.inFolder", [folderName]));
  }

  return /*#__PURE__*/react.createElement("ul", {
    className: "tags special-tags"
  }, specialTags && specialTags.map((tag, i) => /*#__PURE__*/react.createElement(SpecialMessageTag, {
    classNames: tag.classNames,
    icon: tag.icon,
    key: i,
    name: tag.name,
    onClick: tag.details && (event => onTagClick(event, tag)),
    title: tag.title,
    tooltip: tag.tooltip
  })), folderItem);
}
SpecialMessageTags.propTypes = {
  onTagClick: (prop_types_default()).func.isRequired,
  onFolderClick: (prop_types_default()).func,
  folderName: (prop_types_default()).string.isRequired,
  inView: (prop_types_default()).bool.isRequired,
  specialTags: (prop_types_default()).array
};
;// CONCATENATED MODULE: ./addon/content/messageHeader.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */








class Fade extends react.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      fadeIn: false,
      fadeOut: false
    };
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.trigger && this.props.trigger) {
      let stateUpdate = {};

      if (this.fadeOutTimeout) {
        clearTimeout(this.fadeOutTimeout);
        delete this.fadeOutTimeout;

        if (this.state.fadeOut) {
          stateUpdate.fadeOut = false;
        } // Since we're already showing the tooltip, don't bother
        // with fading it in again.


        this.setState({
          fadeIn: false,
          fadeOut: false
        });
        return;
      }

      stateUpdate.fadeIn = true;
      this.setState(stateUpdate);
      this.fadeInTimeout = setTimeout(() => {
        this.setState({
          fadeIn: false
        });
        delete this.fadeInTimeout;
      }, 400);
    } else if (prevProps.trigger && !this.props.trigger) {
      let stateUpdate = {};

      if (this.fadeInTimeout) {
        clearTimeout(this.fadeInTimeout);
        delete this.fadeInTimeout;
      }

      stateUpdate.fadeOut = true;
      this.setState(stateUpdate);
      this.fadeOutTimeout = setTimeout(() => {
        this.setState({
          fadeOut: false
        });
        delete this.fadeOutTimeout;
      }, 400);
    }
  }

  componentWillUnmount() {
    if (this.fadeInTimeout) {
      clearTimeout(this.fadeInTimeout);
      delete this.fadeInTimeout;
    }

    if (this.fadeOutTimeout) {
      clearTimeout(this.fadeOutTimeout);
      delete this.fadeOutTimeout;
    }
  }

  render() {
    if (this.props.trigger || this.state.fadeOut) {
      let transition = this.state.fadeIn ? "transition-in" : "";

      if (!transition && this.state.fadeOut) {
        transition = "transition-out";
      }

      return /*#__PURE__*/react.createElement("span", {
        className: transition
      }, this.props.children);
    }

    return null;
  }

}

Fade.propTypes = {
  children: (prop_types_default()).object.isRequired,
  trigger: (prop_types_default()).bool.isRequired
};
class ContactLabel extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.state = {
      hover: false
    };
  }

  onMouseOver(event) {
    if (this.fadeOutTimeout) {
      clearTimeout(this.fadeOutTimeout);
      delete this.fadeOutTimeout;
      this.setState({
        hover: true
      });
      return;
    }

    this.timeout = setTimeout(() => {
      this.setState({
        hover: true
      });
      delete this.timeout;
    }, 400);
  }

  onMouseOut(event) {
    if (this.timeout) {
      clearTimeout(this.timeout);
      delete this.timeout;
    }

    this.fadeOutTimeout = setTimeout(() => {
      this.setState({
        hover: false
      });
      delete this.fadeOutTimeout;
    }, 400);
  }

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      delete this.timeout;
    }

    if (this.fadeOutTimeout) {
      clearTimeout(this.fadeOutTimeout);
      delete this.fadeOutTimeout;
    }
  }

  render() {
    return /*#__PURE__*/react.createElement("span", {
      className: this.props.className,
      onMouseOver: this.onMouseOver,
      onMouseOut: this.onMouseOut,
      ref: s => this.span = s
    }, /*#__PURE__*/react.createElement(Fade, {
      trigger: this.state.hover
    }, /*#__PURE__*/react.createElement(ContactDetail, {
      parentSpan: this.span,
      name: this.props.contact.name,
      email: this.props.contact.displayEmail,
      realEmail: this.props.contact.email,
      avatar: this.props.contact.avatar,
      contactId: this.props.contact.contactId
    })), /*#__PURE__*/react.createElement("span", null, this.props.separator), /*#__PURE__*/react.createElement("span", {
      className: "tooltipWrapper contact"
    }, /*#__PURE__*/react.createElement("span", {
      className: "contactName"
    }, this.props.detailView && !!this.props.contact.contactId && "\u2605 ", this.props.contact.name.trim(), this.props.contact.extra && /*#__PURE__*/react.createElement("label", {
      xmlns: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      crop: "center",
      className: "contactExtra",
      value: `(${this.props.contact.extra})`
    }), !this.props.detailView && this.props.contact.displayEmail && /*#__PURE__*/react.createElement("span", {
      className: "smallEmail"
    }, " ", "<", this.props.contact.displayEmail.trim(), ">"), this.props.detailView && this.props.contact.email && /*#__PURE__*/react.createElement("span", {
      className: "smallEmail"
    }, " ", "<", this.props.contact.email.trim(), ">"), this.props.detailView && /*#__PURE__*/react.createElement("br", null))));
  }

}
ContactLabel.propTypes = {
  className: (prop_types_default()).string.isRequired,
  contact: (prop_types_default()).object.isRequired,
  detailView: (prop_types_default()).bool.isRequired,
  separator: (prop_types_default()).string
};
class MessageHeader extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onClickHeader = this.onClickHeader.bind(this);
    this.onClickStar = this.onClickStar.bind(this);
  }

  onClickHeader() {
    this.props.dispatch({
      type: "MSG_EXPAND",
      expand: !this.props.expanded,
      msgUri: this.props.msgUri
    });

    if (!this.props.expanded) {
      this.props.dispatch({
        type: "MARK_AS_READ",
        expand: !this.props.expanded,
        msgUri: this.props.msgUri
      });
    }
  }

  onClickStar(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch(messageActions.setStarred({
      id: this.props.id,
      starred: !this.props.starred
    }));
  }

  _getSeparator(index, length) {
    if (index == 0) {
      return "";
    }

    if (index < length - 1) {
      return browser.i18n.getMessage("header.commaSeparator");
    }

    return browser.i18n.getMessage("header.andSeparator");
  }

  render() {
    const allTo = [...this.props.to, ...this.props.cc, ...this.props.bcc]; // TODO: Maybe insert this after contacts but before snippet:
    // <span class="bzTo"> {{str "message.at"}} {{bugzillaUrl}}</span>

    return /*#__PURE__*/react.createElement("div", {
      className: "messageHeader" + (this.props.expanded ? " expanded" : ""),
      onClick: this.onClickHeader
    }, /*#__PURE__*/react.createElement("div", {
      className: "shrink-box"
    }, /*#__PURE__*/react.createElement("div", {
      className: "star" + (this.props.starred ? " starred" : ""),
      onClick: this.onClickStar
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "star"
    })), this.props.from.avatar.startsWith("chrome:") ? /*#__PURE__*/react.createElement("abbr", {
      className: "contactInitials",
      style: this.props.from.colorStyle
    }, this.props.from.initials) : /*#__PURE__*/react.createElement("span", {
      className: "contactAvatar",
      style: {
        backgroundImage: `url('${this.props.from.avatar}')`
      }
    }, "\u00a0"), " ", /*#__PURE__*/react.createElement(ContactLabel, {
      className: "author",
      contact: this.props.from,
      detailView: false
    }), this.props.expanded && !this.props.detailsShowing && browser.i18n.getMessage("header.to") + " ", this.props.expanded && !this.props.detailsShowing && allTo.map((contact, index) => /*#__PURE__*/react.createElement(ContactLabel, {
      className: "to",
      contact: contact,
      detailView: false,
      key: index,
      separator: this._getSeparator(index, allTo.length)
    })), !this.props.expanded && /*#__PURE__*/react.createElement("span", {
      className: "snippet"
    }, /*#__PURE__*/react.createElement(MessageTags, {
      onTagsChange: tags => {
        this.props.dispatch(messageActions.setTags({
          id: this.props.id,
          tags
        }));
      },
      expanded: false,
      tags: this.props.tags
    }), /*#__PURE__*/react.createElement(SpecialMessageTags, {
      onTagClick: (event, tag) => {
        this.props.dispatch(messageActions.tagClick({
          event,
          msgUri: this.props.msgUri,
          details: tag.details
        }));
      },
      folderName: this.props.shortFolderName,
      inView: this.props.inView,
      specialTags: this.props.specialTags
    }), this.props.snippet)), /*#__PURE__*/react.createElement(MessageHeaderOptions, {
      dispatch: this.props.dispatch,
      date: this.props.date,
      detailsShowing: this.props.detailsShowing,
      expanded: this.props.expanded,
      fullDate: this.props.fullDate,
      id: this.props.id,
      attachments: this.props.attachments,
      multipleRecipients: this.props.multipleRecipients,
      recipientsIncludeLists: this.props.recipientsIncludeLists,
      isDraft: this.props.isDraft
    }));
  }

}
MessageHeader.propTypes = {
  bcc: (prop_types_default()).array.isRequired,
  cc: (prop_types_default()).array.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  date: (prop_types_default()).string.isRequired,
  detailsShowing: (prop_types_default()).bool.isRequired,
  expanded: (prop_types_default()).bool.isRequired,
  from: (prop_types_default()).object.isRequired,
  fullDate: (prop_types_default()).string.isRequired,
  id: (prop_types_default()).number.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  attachments: (prop_types_default()).array.isRequired,
  multipleRecipients: (prop_types_default()).bool.isRequired,
  recipientsIncludeLists: (prop_types_default()).bool.isRequired,
  inView: (prop_types_default()).bool.isRequired,
  isDraft: (prop_types_default()).bool.isRequired,
  shortFolderName: (prop_types_default()).string.isRequired,
  snippet: (prop_types_default()).string.isRequired,
  starred: (prop_types_default()).bool.isRequired,
  tags: (prop_types_default()).array.isRequired,
  to: (prop_types_default()).array.isRequired,
  specialTags: (prop_types_default()).array
};
;// CONCATENATED MODULE: ./addon/content/messageDetails.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




class ContactLine extends react.PureComponent {
  render() {
    return this.props.contacts.map((to, i) => {
      return /*#__PURE__*/react.createElement(ContactLabel, {
        className: "",
        contact: to,
        detailView: true,
        key: i
      });
    });
  }

}

ContactLine.propTypes = {
  className: (prop_types_default()).string.isRequired,
  contacts: (prop_types_default()).array.isRequired
};
class MessageDetails extends react.PureComponent {
  render() {
    return /*#__PURE__*/react.createElement("div", null, !!this.props.from && /*#__PURE__*/react.createElement("div", {
      className: "detailsLine fromLine"
    }, /*#__PURE__*/react.createElement("u", null, browser.i18n.getMessage("message.fromHeader")), " ", /*#__PURE__*/react.createElement(ContactLabel, {
      className: "",
      contact: this.props.from,
      detailView: true
    })), !!this.props.to.length && /*#__PURE__*/react.createElement("div", {
      className: "detailsLine toLine"
    }, /*#__PURE__*/react.createElement("u", null, browser.i18n.getMessage("message.toHeader")), " ", /*#__PURE__*/react.createElement(ContactLine, {
      className: "to",
      contacts: this.props.to
    })), !!this.props.cc.length && /*#__PURE__*/react.createElement("div", {
      className: "detailsLine ccLine"
    }, /*#__PURE__*/react.createElement("u", null, browser.i18n.getMessage("message.ccHeader")), " ", /*#__PURE__*/react.createElement(ContactLine, {
      className: "cc",
      contacts: this.props.cc
    })), !!this.props.bcc.length && /*#__PURE__*/react.createElement("div", {
      className: "detailsLine bccLine"
    }, /*#__PURE__*/react.createElement("u", null, browser.i18n.getMessage("compose.fieldBcc")), " ", /*#__PURE__*/react.createElement(ContactLine, {
      className: "bcc",
      contacts: this.props.bcc
    })), !!this.props.extraLines?.length && this.props.extraLines.map((line, i) => {
      return /*#__PURE__*/react.createElement("div", {
        className: "detailsLine",
        key: i
      }, /*#__PURE__*/react.createElement("u", null, line.key, ":"), " ", line.value);
    }));
  }

}
MessageDetails.propTypes = {
  bcc: (prop_types_default()).array.isRequired,
  cc: (prop_types_default()).array.isRequired,
  extraLines: (prop_types_default()).array,
  from: (prop_types_default()).object.isRequired,
  to: (prop_types_default()).array.isRequired
};
;// CONCATENATED MODULE: ./addon/content/messageFooter.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




class MessageFooter extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onActionButtonClick = this.onActionButtonClick.bind(this);
  }

  onActionButtonClick(msg) {
    const payload = {
      id: this.props.id,
      shiftKey: msg.shiftKey
    };
    let action = null;

    switch (msg.type) {
      case "draft":
        action = messageActions.editDraft(payload);
        break;

      case "reply":
        action = messageActions.reply(payload);
        break;

      case "replyAll":
        action = messageActions.replyAll(payload);
        break;

      case "replyList":
        action = messageActions.replyList(payload);
        break;

      case "forward":
        action = messageActions.forward(payload);
        break;

      default:
        console.error("Don't know how to create an action for", msg);
    }

    this.props.dispatch(action);
  }

  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: "messageFooter"
    }, /*#__PURE__*/react.createElement("div", {
      className: "footerActions"
    }, this.props.isDraft && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "draft"
    }), !this.props.isDraft && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "reply"
    }), !this.props.isDraft && this.props.multipleRecipients && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "replyAll"
    }), !this.props.isDraft && this.props.recipientsIncludeLists && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "replyList"
    }), !this.props.isDraft && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "forward"
    })));
  }

}
MessageFooter.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  id: (prop_types_default()).number.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  multipleRecipients: (prop_types_default()).bool.isRequired,
  recipientsIncludeLists: (prop_types_default()).bool.isRequired,
  isDraft: (prop_types_default()).bool.isRequired
};
;// CONCATENATED MODULE: ./addon/content/quoting.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* Below are hacks heuristics for finding quoted parts in a given email */
class _Quoting {
  _canInclude(aNode) {
    let v = aNode.tagName?.toLowerCase() == "br" || aNode.nodeType == aNode.TEXT_NODE && aNode.textContent.trim() === ""; // if (v) dump("Including "+aNode+"\n");

    return v;
  }

  _isBody(aNode) {
    if (aNode.tagName?.toLowerCase() == "body") {
      return true;
    }

    let count = 0;

    for (let node of aNode.parentNode.childNodes) {
      // dump(node+" "+node.nodeType+"\n");
      switch (node.nodeType) {
        case node.TEXT_NODE:
          if (node.textContent.trim().length) {
            count++;
          }

          break;

        case node.ELEMENT_NODE:
          count++;
          break;
      }
    } // dump(count+"\n");


    return count == 1 && this._isBody(aNode.parentNode);
  }

  _implies(a, b) {
    return !a || a && b;
  }
  /* Create a blockquote that encloses everything relevant, starting from marker.
   * Marker is included by default, remove it later if you need to. */


  _encloseInBlockquote(aDoc, marker) {
    if (marker.previousSibling && this._canInclude(marker.previousSibling)) {
      this._encloseInBlockquote(aDoc, marker.previousSibling);
    } else if (!marker.previousSibling && !this._isBody(marker.parentNode)) {
      this._encloseInBlockquote(aDoc, marker.parentNode);
    } else if (this._implies(marker == marker.parentNode.firstChild, !this._isBody(marker.parentNode))) {
      let blockquote = aDoc.createElement("blockquote");
      blockquote.setAttribute("type", "cite");
      marker.parentNode.insertBefore(blockquote, marker);

      while (blockquote.nextSibling) {
        blockquote.appendChild(blockquote.nextSibling);
      }
    }
  }

  _trySel(aDoc, sel, remove) {
    let marker = aDoc.querySelector(sel);

    if (marker) {
      this._encloseInBlockquote(aDoc, marker);

      if (remove) {
        marker.remove();
      }
    }

    return marker != null;
  }
  /* Hotmails use a <hr> to mark the start of the quoted part. */


  convertHotmailQuotingToBlockquote1(aDoc) {
    /* We make the assumption that no one uses a <hr> in their emails except for
     * separating a quoted message from the rest */
    this._trySel(aDoc, "body > hr, \
       body > div > hr, \
       body > pre > hr, \
       body > div > div > hr, \
       hr#stopSpelling", true);
  }

  convertMiscQuotingToBlockquote(aDoc) {
    this._trySel(aDoc, ".yahoo_quoted");
  }
  /* Stupid regexp that matches:
   * ----- Something that supposedly says the text below is quoted -----
   * Fails 9 times out of 10. */


  convertForwardedToBlockquote(aDoc) {
    const re = /^\s*(-{5,15})(?:\s*)(?:[^ \f\n\r\t\v\u00A0\u2028\u2029-]+\s+)*[^ \f\n\r\t\v\u00A0\u2028\u2029-]+(\s*)\1\s*/gm;

    const walk = aNode => {
      for (const child of aNode.childNodes) {
        const txt = child.textContent;
        const m = txt.match(re);

        if (child.nodeType == child.TEXT_NODE && !txt.includes("-----BEGIN PGP") && !txt.includes("----END PGP") && m && m.length) {
          const marker = m[0]; // dump("Found matching text "+marker+"\n");

          const i = txt.indexOf(marker);
          const t1 = txt.substring(0, i);
          const t2 = txt.substring(i + 1, child.textContent.length);
          const tn1 = aDoc.createTextNode(t1);
          const tn2 = aDoc.createTextNode(t2);
          child.parentNode.insertBefore(tn1, child);
          child.parentNode.insertBefore(tn2, child);
          child.remove();

          this._encloseInBlockquote(aDoc, tn2);

          let ex = new Error();
          ex.found = true;
          throw ex;
        } else if (m?.length) {
          // We only move on if we found the matching text in the parent's text
          // content, otherwise, there's no chance we'll find it in the child's
          // content.
          walk(child);
        }
      }
    };

    try {
      walk(aDoc.body);
    } catch (ex) {
      if (!ex.found) {
        throw ex;
      }
    }
  }
  /* If [b1] is a blockquote followed by [ns] whitespace nodes followed by [b2],
   * append [ns] to [b1], then append all the child nodes of [b2] to [b1],
   * effectively merging the two blockquotes together. */


  fusionBlockquotes(aDoc) {
    let blockquotes = new Set(aDoc.getElementsByTagName("blockquote"));

    for (let blockquote of blockquotes) {
      let isWhitespace = function (n) {
        return n && (n.tagName?.toLowerCase() == "br" || n.nodeType == n.TEXT_NODE && n.textContent.match(/^\s*$/));
      };

      let isBlockquote = function (b) {
        return b?.tagName?.toLowerCase() == "blockquote";
      };

      let blockquoteFollows = function (n) {
        return n && (isBlockquote(n) || isWhitespace(n) && blockquoteFollows(n.nextSibling));
      };

      while (blockquoteFollows(blockquote.nextSibling)) {
        while (isWhitespace(blockquote.nextSibling)) {
          blockquote.appendChild(blockquote.nextSibling);
        }

        if (isBlockquote(blockquote.nextSibling)) {
          let next = blockquote.nextSibling;

          while (next.firstChild) {
            blockquote.appendChild(next.firstChild);
          }

          blockquote.parentNode.removeChild(next);
          blockquotes.delete(next);
        } else {
          console.warn("What?!");
        }
      }
    }
  }
  /**
   * Use heuristics to find common types of email quotes and
   * wrap them in `<blockquote></blockquote>` tags.
   *
   * @param {HTMLDocument | string} doc
   * @returns {HTMLDocument | string}
   * @memberof _Quoting
   */


  normalizeBlockquotes(doc) {
    // We want to return the same type of object that was passed to us. We allow
    // both a string and an HTMLDom object.
    const origType = typeof doc;

    if (origType === "string") {
      const parser = new DOMParser();
      doc = parser.parseFromString(doc, "text/html");
    }

    try {
      // These operations mutate the Dom
      this.convertHotmailQuotingToBlockquote1(doc);
      this.convertForwardedToBlockquote(doc);
      this.convertMiscQuotingToBlockquote(doc);
      this.fusionBlockquotes(doc);
    } catch (e) {
      console.log(e);
    }

    if (origType === "string") {
      return doc.outerHTML;
    }

    return doc;
  }

}

var Quoting = new _Quoting();
;// CONCATENATED MODULE: ./addon/content/messageIFrame.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





let index = 0; // From https://searchfox.org/mozilla-central/rev/ec806131cb7bcd1c26c254d25cd5ab8a61b2aeb6/parser/nsCharsetSource.h
// const kCharsetFromChannel = 11;

const kCharsetFromUserForced = 13;
const domParser = new DOMParser();
const TOGGLE_TEMPLATE = `<button
    class="link"
    style="cursor: pointer; user-select: none; background-color: inherit; border: inherit;"
    show-text=""
    hide-text=""
  >
    SHOW/HIDE
  </button>`;
/**
 * Create a DOM node that, when clicked, will hide or unhide `node`.
 * The returned DOM node is automatically attached to the DOM right before `node`.
 *
 * @param {*} node
 * @param {*} {
 *     showText,
 *     hideText,
 *     linkClass = "",
 *     smallSize = 11,
 *     linkColor = "orange",
 *     startHidden = true,
 *     onToggle = () => {},
 *   }
 * @returns
 */

function createToggleForNode(node, {
  showText,
  hideText,
  linkClass = "",
  smallSize = 11,
  linkColor = "orange",
  startHidden = true,
  onToggle = () => {}
}) {
  const toggle = domParser.parseFromString(TOGGLE_TEMPLATE, "text/html").body.childNodes[0];
  toggle.setAttribute("show-text", showText);
  toggle.setAttribute("hide-text", hideText);
  toggle.style.color = linkColor;
  toggle.style.fontSize = smallSize;
  toggle.classList.add(...linkClass.split(/\s/));

  function show() {
    toggle.textContent = `- ${toggle.getAttribute("hide-text")} -`;
    toggle.setAttribute("state", "visible");
    node.style.display = ""; // The callback may want to do something with the size of the revealed node, so call the callback after it's visible

    onToggle(true, node);
  }

  function hide() {
    toggle.textContent = `- ${toggle.getAttribute("show-text")} -`;
    toggle.setAttribute("state", "hidden"); // The callback may want to do something with the size of the revealed node, so call the callback before it's hidden

    onToggle(false, node);
    node.style.display = "none";
  }

  toggle.addEventListener("click", event => {
    if (toggle.getAttribute("state") === "visible") {
      hide();
    } else {
      show();
    }
  }, true);

  if (startHidden) {
    hide();
  } else {
    show();
  }

  node.insertAdjacentElement("beforebegin", toggle);
  return toggle;
}
/**
 * Generate a callback for the `onToggle` function of a toggle element.
 * The callback will automatically resize the supplied iframe to grow or
 * shrink depending on whether the toggle is in the open state or closed state.
 *
 * @param {*} iframe
 * @returns
 */


function toggleCallbackFactory(iframe) {
  return (visible, node) => {
    const cs = iframe.contentWindow.getComputedStyle(node);
    const h = node.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);

    if (visible) {
      iframe.style.height = parseFloat(iframe.style.height) + h + "px";
    } else {
      iframe.style.height = parseFloat(iframe.style.height) - h + "px";
    }
  };
}
/**
 * This class exists because we need to manually manage the iframe - we don't
 * want it reloading every time a prop changes.
 *
 * We only load the iframe when we need to - when it is expanded. If it is
 * collapsed, we avoid it. This helps performance.
 *
 * The height mechanism is awkward - we generally set the height short when
 * we start to render it, then expand it to the correct height once loaded,
 * which attempts to avoid a sub-scroll.
 */


class MessageIFrame extends react.Component {
  constructor(props) {
    super(props);
    this.index = index++;
    this.currentUrl = null;
    this.loading = false;
    this.onClickIframe = this.onClickIframe.bind(this);
  }

  componentDidUpdate(prevProps) {
    let startLoad = false; // dueToExpansion is used so that we can indicate if this load is happening
    // as a result of an expansion or not. If it is a user expansion, we don't
    // want to scroll the message to view, since the user may be viewing somewhere
    // else.

    this.dueToExpansion = undefined;

    if (prevProps.neckoUrl != this.props.neckoUrl && this.props.expanded) {
      // This is a hack which ensures that the iframe is a minimal height, so
      // that when the message loads, the scroll height is set correctly, rather
      // than to the potential height of the previously loaded message.
      // TODO: Could we use a client height somewhere along the line?
      this.iframe.classList.remove("hidden");
      this.iframe.style.height = "20px";
      startLoad = true;
      this.dueToExpansion = false;
    }

    if (this.props.expanded) {
      this.iframe.classList.remove("hidden");

      if (this.currentUrl != this.props.msgUri || prevProps.hasRemoteContent && !this.props.hasRemoteContent || !prevProps.smimeReload && this.props.smimeReload) {
        startLoad = true;

        if (this.dueToExpansion === undefined) {
          this.dueToExpansion = true;
        }

        this.iframe.style.height = "20px";
      }
    } else {
      // Never start a load if we're going to be hidden.
      startLoad = false; // If we're changing URL, then also force the iframe to be about:blank.
      // This ensures that if the message is subsequently expanded, the proper
      // notifications are sent.

      if (prevProps.neckoUrl != this.props.neckoUrl) {
        this.iframe.src = "about:blank";
        this.currentUrl = "about:blank";
      }

      this.iframe.classList.add("hidden");
    }

    if (startLoad) {
      const docShell = this.iframe.contentWindow.docShell;
      docShell.appType = Ci.nsIDocShell.APP_TYPE_MAIL;
      docShell.charset = "UTF-8";
      const cv = docShell.contentViewer;
      cv.hintCharacterSet = "UTF-8"; // This used to be kCharsetFromChannel = 11, however in 79/80 the code changed.
      // This still needs to be forced, because bug 829543 isn't fixed yet.

      cv.hintCharacterSetSource = kCharsetFromUserForced;
      this.loading = true;
      this.currentUrl = this.props.msgUri;
      this.props.dispatch(summaryActions.msgStreamMsg({
        docshell: this.iframe.contentWindow.docShell,
        dueToExpansion: this.dueToExpansion,
        msgUri: this.props.msgUri
      }));
    }
  }

  componentDidMount() {
    // TODO: Currently this must be an iframe created in the xul namespace,
    // otherwise remote content blocking doesn't work. Figure out why the normal
    // iframe has a originator location of `chrome://messenger/content/messenger.xul`
    // rather than imap://.... (or whatever).
    this.iframe = this.div.ownerDocument.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "iframe");
    this.iframe.setAttribute("style", "height: 20px; overflow-y: hidden");
    this.iframe.setAttribute("type", "content");
    this.iframe.addEventListener("click", this.onClickIframe);
    this.div.appendChild(this.iframe);
    const docShell = this.iframe.contentWindow.docShell;
    docShell.appType = Ci.nsIDocShell.APP_TYPE_MAIL;
    docShell.charset = "UTF-8";
    const cv = docShell.contentViewer;
    cv.hintCharacterSet = "UTF-8"; // This used to be kCharsetFromChannel = 11, however in 79/80 the code changed.
    // This still needs to be forced, because bug 829543 isn't fixed yet.

    cv.hintCharacterSetSource = kCharsetFromUserForced;
    this.registerListeners();

    if (this.props.expanded) {
      this.currentUrl = this.props.msgUri;
      this.loading = true;
      this.dueToExpansion = false;
      this.props.dispatch(summaryActions.msgStreamMsg({
        docshell: docShell,
        msgUri: this.props.msgUri
      }));
    } else {
      this.iframe.classList.add("hidden");
    }
  }

  componentWillUnmount() {
    if (this.loading) {
      this.props.dispatch(summaryActions.msgStreamLoadFinished({
        dueToExpansion: this.dueToExpansion
      }));
      this.loading = false;
    }

    if (!this._loadListener) {
      return;
    }

    this.iframe.removeEventListener("load", this._loadListener, {
      capture: true
    });
    delete this._loadListener;
    this.iframe.removeEventListener("DOMContentLoaded", this._domloadListener, {
      capture: true
    });
    delete this._domloadListener;
  }

  registerListeners() {
    if (!this._loadListener) {
      this._loadListener = this._onLoad.bind(this);
      this.iframe.addEventListener("load", this._loadListener, {
        capture: true
      });
      this._domloadListener = this._onDOMLoaded.bind(this);
      this.iframe.addEventListener("DOMContentLoaded", this._domloadListener, {
        capture: true
      });
    }
  }

  adjustHeight() {
    const iframeDoc = this.iframe.contentDocument; // The +1 here is due to having occasionally seen issues on Mac where
    // the frame just doesn't quite scroll properly. In this case,
    // getComputedStyle(body).height is .2px greater than the scrollHeight.
    // Hence we try to work around that here.
    // In #1517 made it +3 as occasional issues were still being seen with
    // some messages.

    const scrollHeight = iframeDoc.body.scrollHeight + 3;
    this.iframe.style.height = scrollHeight + "px"; // So now we might overflow horizontally, which causes a horizontal
    // scrollbar to appear, which narrows the vertical height available,
    // which causes a vertical scrollbar to appear.

    let iframeStyle = window.getComputedStyle(this.iframe);
    let iframeExternalWidth = parseInt(iframeStyle.width); // 20px is a completely arbitrary default value which I hope is
    // greater

    if (iframeDoc.body.scrollWidth > iframeExternalWidth) {
      this.iframe.style.height = iframeDoc.body.scrollHeight + 20 + "px";
    }
  }

  _onLoad(event) {
    if (event.target.documentURI == "about:blank") {
      return;
    } // TODO: Handle BIDI


    this.adjustHeight();
    this.loading = false;
    this.props.dispatch(summaryActions.msgStreamLoadFinished({
      dueToExpansion: this.dueToExpansion,
      msgUri: this.props.msgUri,
      iframe: this.iframe
    }));
  }

  tweakFonts(iframeDoc) {
    if (!this.props.prefs.tweakBodies) {
      return [];
    }

    let textSize = Math.round(this.props.defaultFontSize * this.props.tenPxFactor * 1.2); // Assuming 16px is the default (like on, say, Linux), this gives
    //  18px and 12px, which is what Andy had in mind.
    // We're applying the style at the beginning of the <head> tag and
    //  on the body element so that it can be easily overridden by the
    //  html.
    // This is for HTML messages only.

    let styleRules = [];

    if (iframeDoc.querySelectorAll(":not(.mimemail-body) > .moz-text-html").length) {
      styleRules = ["body, table {", // "  line-height: 112.5%;",
      "  font-size: " + textSize + "px;", "}"];
    } // Do some reformatting + deal with people who have bad taste. All these
    // rules are important: some people just send messages with horrible colors,
    // which ruins the conversation view. Gecko tends to automatically add
    // padding/margin to html mails. We still want to honor these prefs but
    // usually they just black/white so this is pretty much what we want.


    let fg = this.props.browserForegroundColor;
    let bg = this.props.browserBackgroundColor;
    styleRules = styleRules.concat(["body {", "  margin: 0; padding: 0;", "  color: " + fg + "; background-color: " + bg + ";", "}"]);
    return styleRules;
  }

  detectQuotes(iframe) {
    // Launch various crappy pieces of code heuristics to
    // convert most common quoting styles to real blockquotes. Spoiler:
    // most of them suck.
    Quoting.normalizeBlockquotes(iframe.contentDocument);

    function getQuoteLength(node) {
      try {
        const style = iframe.contentWindow.getComputedStyle(node);
        return parseInt(style.height) / (parseInt(style.fontSize) * 1.5);
      } catch (e) {// message arrived and window is not displayed, arg,
        // cannot get the computed style, BAD
      }

      return undefined;
    } // If the first email contains quoted text, it was probably forwarded to us
    // and we don't have the previous email for reference. In this case, don't normalize
    // the quote. See:
    // https://github.com/thunderbird-conversations/thunderbird-conversations/issues/179


    if (this.props.initialPosition > 0) {
      const win = iframe.contentWindow; // We look for the first blockquote that is long enough to be hidden

      for (const blockquote of win.document.querySelectorAll("blockquote")) {
        if (getQuoteLength(blockquote) > this.props.prefs.hideQuoteLength) {
          createToggleForNode(blockquote, {
            hideText: browser.i18n.getMessage("messageBody.hideQuotedText"),
            showText: browser.i18n.getMessage("messageBody.showQuotedText"),
            linkClass: "showhidequote",
            smallSize: this.props.prefs.tweakChrome ? this.props.defaultFontSize * this.props.tenPxFactor * 1.1 : Math.round(100 * this.props.defaultFontSize * 11 / 12) / 100,
            linkColor: "orange",
            onToggle: toggleCallbackFactory(iframe)
          }); // We only put a show/hide button on the first suitable quote,
          // so if we've made it thus far, we're done.

          break;
        }
      }
    }
  }

  detectSigs(iframe) {
    if (!this.props.prefs.hideSigs) {
      return;
    }

    const win = iframe.contentWindow;
    const sigNode = win.document.querySelector(".moz-txt-sig");

    if (sigNode) {
      createToggleForNode(sigNode, {
        hideText: browser.i18n.getMessage("messageBody.hideSigText"),
        showText: browser.i18n.getMessage("messageBody.showSigText"),
        linkClass: "showhidesig",
        smallSize: this.props.prefs.tweakChrome ? this.props.defaultFontSize * this.props.tenPxFactor * 1.1 : Math.round(100 * this.props.defaultFontSize * 11 / 12) / 100,
        linkColor: "rgb(56, 117, 215)",
        onToggle: toggleCallbackFactory(iframe)
      });
    }
  }

  injectCss(iframeDoc) {
    // !important because messageContents.css is appended after us when the html
    // is rendered
    return ['blockquote[type="cite"] {', "  border-right-width: 0px;", "  border-left: 1px #ccc solid;", "  color: #666 !important;", "}", "span.moz-txt-formfeed {", "  height: auto;", "}"];
  }

  _onDOMLoaded(event) {
    if (event.target.documentURI == "about:blank") {
      return;
    }

    const iframeDoc = this.iframe.contentDocument;
    let styleRules = this.tweakFonts(iframeDoc);

    if (!(this.props.realFrom && this.props.realFrom.includes("bugzilla-daemon"))) {
      this.detectQuotes(this.iframe);
    }

    this.detectSigs(this.iframe);
    styleRules = styleRules.concat(this.injectCss(iframeDoc)); // Ugly hack (once again) to get the style inside the
    // <iframe>. I don't think we can use a chrome:// url for
    // the stylesheet because the iframe has a type="content"

    let style = iframeDoc.createElement("style");
    style.appendChild(iframeDoc.createTextNode(styleRules.join("\n")));
    let head = iframeDoc.body.previousElementSibling;
    head.appendChild(style);
    this.adjustHeight();
  }

  onClickIframe(event) {
    this.props.dispatch(messageActions.clickIframe({
      event
    }));
  }

  render() {
    // TODO: See comment in componentDidMount
    // <iframe className={`iframe${this.index}`} type="content" ref={f => this.iframe = f}/>
    return /*#__PURE__*/react.createElement("div", {
      className: `iframewrap${this.index}`,
      ref: d => this.div = d
    });
  }

}
MessageIFrame.propTypes = {
  browserBackgroundColor: (prop_types_default()).string.isRequired,
  browserForegroundColor: (prop_types_default()).string.isRequired,
  defaultFontSize: (prop_types_default()).number.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  expanded: (prop_types_default()).bool.isRequired,
  hasRemoteContent: (prop_types_default()).bool.isRequired,
  initialPosition: (prop_types_default()).number.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  neckoUrl: (prop_types_default()).string.isRequired,
  smimeReload: (prop_types_default()).bool.isRequired,
  tenPxFactor: (prop_types_default()).number.isRequired,
  prefs: (prop_types_default()).object.isRequired,
  realFrom: (prop_types_default()).string.isRequired
};
;// CONCATENATED MODULE: ./addon/content/messageNotification.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





class RemoteContentNotification extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onAlwaysShowRemote = this.onAlwaysShowRemote.bind(this);
    this.onShowRemote = this.onShowRemote.bind(this);
  }

  onShowRemote() {
    this.props.dispatch(messageActions.showRemoteContent({
      id: this.props.id
    }));
  }

  onAlwaysShowRemote() {
    this.props.dispatch(messageActions.alwaysShowRemoteContent({
      id: this.props.id,
      realFrom: this.props.realFrom
    }));
  }

  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: "remoteContent notificationBar"
    }, browser.i18n.getMessage("notification.remoteContentBlockedMsg") + " ", /*#__PURE__*/react.createElement("span", {
      className: "show-remote-content"
    }, /*#__PURE__*/react.createElement("a", {
      className: "link",
      onClick: this.onShowRemote
    }, browser.i18n.getMessage("notification.showRemote")), " - "), /*#__PURE__*/react.createElement("span", {
      className: "always-display"
    }, /*#__PURE__*/react.createElement("a", {
      className: "link",
      onClick: this.onAlwaysShowRemote
    }, browser.i18n.getMessage("notification.alwaysShowRemote", [this.props.realFrom]))));
  }

}

RemoteContentNotification.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  id: (prop_types_default()).number.isRequired,
  realFrom: (prop_types_default()).string.isRequired
};

class GenericSingleButtonNotification extends react.PureComponent {
  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: this.props.barClassName + " notificationBar"
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: this.props.iconName
    }), this.props.notificationText, " ", /*#__PURE__*/react.createElement("span", {
      className: this.props.buttonClassName
    }, /*#__PURE__*/react.createElement("a", {
      onClick: this.props.onButtonClick
    }, this.props.buttonTitle)));
  }

}

GenericSingleButtonNotification.propTypes = {
  barClassName: (prop_types_default()).string.isRequired,
  buttonClassName: (prop_types_default()).string.isRequired,
  hideIcon: (prop_types_default()).bool,
  onButtonClick: (prop_types_default()).func.isRequired,
  buttonTitle: (prop_types_default()).string.isRequired,
  iconName: (prop_types_default()).string.isRequired,
  notificationText: (prop_types_default()).string.isRequired
};

class GenericMultiButtonNotification extends react.PureComponent {
  constructor(props) {
    super(props);
  }

  onClick(actionParams) {
    this.props.dispatch(messageActions.notificationClick({
      msgUri: this.props.msgUri,
      notificationType: this.props.type,
      ...actionParams
    }));
  }

  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: this.props.barClassName + " notificationBar"
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: this.props.iconName
    }), this.props.notificationText, " ", this.props.buttons.map((button, i) => /*#__PURE__*/react.createElement("button", {
      className: button.classNames,
      tooltiptext: button.tooltiptext,
      key: i,
      onClick: this.onClick.bind(this, button.actionParams)
    }, button.textContent)));
  }

}

GenericMultiButtonNotification.propTypes = {
  barClassName: (prop_types_default()).string.isRequired,
  buttons: (prop_types_default()).object.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  hideIcon: (prop_types_default()).bool,
  iconName: (prop_types_default()).string.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  notificationText: (prop_types_default()).string.isRequired,
  type: (prop_types_default()).string.isRequired
};

class JunkNotification extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.props.dispatch({
      type: "MARK_AS_JUNK",
      isJunk: false,
      id: this.props.id
    });
  }

  render() {
    return /*#__PURE__*/react.createElement(GenericSingleButtonNotification, {
      barClassName: "junkBar",
      buttonClassName: "notJunk",
      buttonTitle: browser.i18n.getMessage("notification.notJunk"),
      iconName: "whatshot",
      notificationText: browser.i18n.getMessage("notification.junkMsg"),
      onButtonClick: this.onClick
    });
  }

}

JunkNotification.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  id: (prop_types_default()).number.isRequired
};

class OutboxNotification extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.props.dispatch(messageActions.sendUnsent());
  }

  render() {
    return /*#__PURE__*/react.createElement(GenericSingleButtonNotification, {
      barClassName: "outboxBar",
      buttonClassName: "sendUnsent",
      buttonTitle: browser.i18n.getMessage("notification.sendUnsent"),
      iconName: "inbox",
      notificationText: browser.i18n.getMessage("notification.isOutboxMsg"),
      onButtonClick: this.onClick
    });
  }

}

OutboxNotification.propTypes = {
  dispatch: (prop_types_default()).func.isRequired
};

class PhishingNotification extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.props.dispatch(messageActions.ignorePhishing({
      id: this.props.id
    }));
  }

  render() {
    return /*#__PURE__*/react.createElement(GenericSingleButtonNotification, {
      barClassName: "phishingBar",
      buttonClassName: "ignore-warning",
      buttonTitle: browser.i18n.getMessage("notification.ignoreScamWarning"),
      iconName: "warning",
      notificationText: browser.i18n.getMessage("notification.scamMsg"),
      onButtonClick: this.onClick
    });
  }

}

PhishingNotification.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  id: (prop_types_default()).number.isRequired
};
class MessageNotification extends react.PureComponent {
  render() {
    if (this.props.isPhishing) {
      return /*#__PURE__*/react.createElement(PhishingNotification, {
        dispatch: this.props.dispatch,
        id: this.props.id
      });
    }

    if (this.props.hasRemoteContent) {
      return /*#__PURE__*/react.createElement(RemoteContentNotification, {
        dispatch: this.props.dispatch,
        id: this.props.id,
        realFrom: this.props.realFrom
      });
    }

    if (this.props.canUnJunk) {
      return /*#__PURE__*/react.createElement(JunkNotification, {
        dispatch: this.props.dispatch,
        id: this.props.id
      });
    }

    if (this.props.isOutbox) {
      return /*#__PURE__*/react.createElement(OutboxNotification, {
        dispatch: this.props.dispatch
      });
    }

    if (this.props.extraNotifications && this.props.extraNotifications.length) {
      // Only display the first notification.
      const notification = this.props.extraNotifications[0];
      return /*#__PURE__*/react.createElement(GenericMultiButtonNotification, {
        barClassName: notification.type + "Bar",
        buttons: notification.buttons || [],
        iconName: notification.iconName,
        dispatch: this.props.dispatch,
        msgUri: this.props.msgUri,
        notificationText: notification.label,
        type: notification.type
      });
    }

    return null;
  }

}
MessageNotification.propTypes = {
  canUnJunk: (prop_types_default()).bool.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  extraNotifications: (prop_types_default()).array,
  hasRemoteContent: (prop_types_default()).bool.isRequired,
  isPhishing: (prop_types_default()).bool.isRequired,
  isOutbox: (prop_types_default()).bool.isRequired,
  id: (prop_types_default()).number.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  realFrom: (prop_types_default()).string.isRequired
};
;// CONCATENATED MODULE: ./addon/content/quickReply.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function QuickReply() {
  return /*#__PURE__*/react.createElement("div", {
    className: "quickReply disabled",
    dir: "ltr"
  }, /*#__PURE__*/react.createElement("small", null, /*#__PURE__*/react.createElement("i", null, "Quick Reply is temporarily disabled due to needing rewriting for Thunderbird 78+.")));
}
QuickReply.propTypes = {}; // These are the templates originally from stub.html for quickReply. Moved here
// to help tidy that up and prepare.
// The quick reply goes after the messaeFooter - if it is the last message
// in the list.

/*
 <!-- This should be in the quickReply if above -->
 <!-- {{tmpl "quickReply" this}} -->
 <script id="quickReplyTemplate" type="text/x-handlebars-template"><![CDATA[
   <div class="quickReply" ondragover="quickReplyCheckDrag(event);" ondrop="quickReplyDrop(event);">
     <div class="quickReplyContacts">
       <div class="quickReplyContactsHeader">
         {{str "mostFrequentContacts"}}
       </div>
       <div class="quickReplyContactsBox">
       </div>
       <div class="quickReplyContactsMore">
         <a class="quickReplyContactsMoreLink">
           {{str "showMore"}}
         </a>
       </div>
     </div>
     <div class="quickReplyBox">
       <div class="replyHeader">
         <div class="quickReplyRecipients">
           <ul class="fromField">
             {{str "fieldFrom"}}
             <li class="senderSwitcher"><a class="switchLeft" onclick="gComposeSession.cycleSender(-1)">◂</a> <a class="switchRight" onclick="gComposeSession.cycleSender(1)">▸</a></li>
             <li class="senderName"></li>,
             <li class="replyMethod">
               <input type="radio" name="reply-method" value="reply"
                 onchange="changeComposeFields('reply')" id="reply-radio"
               /><label for="reply-radio">{{str "reply"}}</label>
             </li>
             <li class="replyMethod replyMethod-replyAll">
               <input type="radio" name="reply-method" value="replyAll"
                 onchange="changeComposeFields('replyAll')" id="replyAll-radio"
               /><label for="replyAll-radio">{{str "replyAll"}}</label>
             </li>
             <li class="replyMethod replyMethod-replyList">
               <input type="radio" name="reply-method" value="replyList"
                 onchange="changeComposeFields('replyList')" id="replyList-radio"
               /><label for="replyList-radio">{{str "replyList"}}</label>
             </li>
             <li class="replyMethod">
               <input type="radio" name="reply-method" value="forward"
                 onchange="changeComposeFields('forward')" id="forward-radio"
               /><label for="forward-radio">{{str "forward"}}</label>
             </li>
             <li class="firstBar">|</li>
             <li class="showCc"><a onclick="showCc(); editFields('cc');" href="javascript:">{{str "addCc"}}</a> |</li>
             <li class="showBcc"><a onclick="showBcc(); editFields('bcc');" href="javascript:">{{str "addBcc"}}</a> |</li>
             <li class="addAttachment"><a onclick="addAttachment();" href="javascript:">{{str "addAttachment"}}</a></li>
           </ul>
           <div class="editRecipientList editToList">
             <div class="label">{{str "fieldTo"}}</div>
             <div class="editInput"><input type="text" id="to" /></div>
           </div>
           <div class="editRecipientList editCcList" style="display: none">
             <div class="label">{{str "fieldCc"}}</div>
             <div class="editInput"><input type="text" id="cc" /></div>
           </div>
           <div class="editRecipientList editBccList" style="display: none">
             <div class="label">{{str "fieldBcc"}}</div>
             <div class="editInput"><input type="text" id="bcc" /></div>
           </div>
           <div class="editRecipientList editSubject" style="display: none">
             <div class="label">{{str "fieldSubject"}}</div>
             <div class="editInput"><input type="text" id="subject" /></div>
           </div>
           <ul class="recipientList toList">
             {{str "fieldTo"}}
             <li>{{str "pleaseWait"}}</li>
             <li class="add-more">&#xa0;- <a href="javascript:" onclick="editFields('to');">{{str "compose.editField}}</a></li>
           </ul>
           <ul class="recipientList ccList" style="display: none;">
             {{str "fieldCc"}}
             <li>{{str "pleaseWait"}}</li>
             <li class="add-more">&#xa0;- <a href="javascript:" onclick="editFields('cc');">{{str "compose.editField"}}</a></li>
           </ul>
           <ul class="recipientList bccList" style="display: none;">
             {{str "fieldBcc"}}
             <li>{{str "pleaseWait"}}</li>
             <li class="add-more">&#xa0;- <a href="javascript:" onclick="editFields('bcc');">{{str "compose.editField"}}</a></li>
           </ul>
         </div>
         <ul class="enigmail" style="display: none;">
           <li class="replyEncrypt">
             <input type="checkbox" name="enigmail-reply-encrypt" id="enigmail-reply-encrypt"
             /><label for="enigmail-reply-encrypt">{{str "encrypt"}}</label>
           </li>
           <li class="replySign">
             <input type="checkbox" name="enigmail-reply-sign" id="enigmail-reply-sign"
             /><label for="enigmail-reply-sign">{{str "sign"}}</label>
           </li>
           <li class="replyPgpMime">
             <input type="checkbox" name="enigmail-reply-pgpmime" id="enigmail-reply-pgpmime"
             /><label for="enigmail-reply-pgpmime">PGP/MIME</label>
           </li>
         </ul>
         <div class="quickReplyAttachments">
         </div>
         <div class="quickReplyHeader" style="display: none; overflow: auto">
           <span class="statusMessage" style="float: left;"></span>
           <span class="statusPercentage" style="float: right;"></span>
           <span class="statusThrobber" style="float: right;">
             <span class="loader" style="vertical-align: middle;"></span>
           </span>
         </div>
       </div>

       <ul class="inputs">
         <li class="reply expand" ondragenter="quickReplyDragEnter(event);">
           <div class="textWrap">
             <div class="quickReplyIcon"><span>{{str "reply"}}</span> <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="material-icons.svg#reply"></use></svg></div>
             <iframe mozframetype="content" class="textarea sans"></iframe>
           </div>
         </li>

         <li class="replyAll expand" ondragenter="quickReplyDragEnter(event);">
           <div class="textWrap">
             <div class="quickReplyIcon"><span>{{str "replyAll"}}</span> <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="material-icons.svg#reply_all"></use></svg></div>
             <iframe mozframetype="content" class="textarea sans"></iframe>
           </div>
         </li>
       </ul>

       <div class="replyFooter" style="overflow: auto" tabindex="-1">
         <button id="send" style="float:right;margin-left:3px;" onclick="gComposeSession.send();">
           {{str "send"}}
         </button>
         <button id="sendArchive" style="float:right;margin-left:3px;"
             onclick="gComposeSession.send({ archive: true });">
           {{str "sendArchive"}}
         </button>
         <button id="save" style="float:right" onclick="onSave();">{{str "save"}}</button>
         <a class="discard" href="javascript:" id="discard"
           onclick="confirmDiscard()">{{str "discard"}}</a>
       </div>
     </div>
   </div>
   ]]>
 </script>
 <script id="quickReplyAttachmentTemplate" type="text/x-handlebars-template"><![CDATA[
   <ul class="quickReplyAttachment">
     {{str "attachment"}}:
     <li>{{name}}</li> ({{size}}) -
     <a href="javascript:" class="openAttachmentLink">{{str "open"}}</a> -
     <a href="javascript:" class="removeAttachmentLink">{{str "removeAttachment"}}</a>
   </ul>
   ]]>
 </script>
*/
// Old Message.js event handlers:
//
// this.register(".quickReply", function(event) {
//   event.stopPropagation();
// }, { action: "keyup" });
// this.register(".quickReply", function(event) {
//   event.stopPropagation();
// }, { action: "keypress" });
// this.register(".quickReply", function(event) {
//   // Ok, so it's actually convenient to register our event listener on the
//   //  .quickReply node because we can easily prevent it from bubbling
//   //  upwards, but the problem is, if a message is appended at the end of
//   //  the conversation view, this event listener is active and the one from
//   //  the new message is active too. So we check that the quick reply still
//   //  is inside our dom node.
//   if (!self._domNode.getElementsByClassName("quickReply").length)
//     return;
//
//   let window = self._conversation._htmlPane;
//
//   switch (event.keyCode) {
//     case mainWindow.KeyEvent.DOM_VK_RETURN:
//       if (isAccel(event)) {
//         if (event.shiftKey)
//           window.gComposeSession.send({ archive: true });
//         else
//           window.gComposeSession.send();
//       }
//       break;
//
//     case mainWindow.KeyEvent.DOM_VK_ESCAPE:
//       Log.debug("Escape from quickReply");
//       self._domNode.focus();
//       break;
//   }
//   event.stopPropagation();
// }, { action: "keydown" });
;// CONCATENATED MODULE: ./addon/content/message.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */












function isAccel(event) {
  if (window.navigator.platform.includes("Mac")) {
    return event.metaKey;
  }

  return event.ctrlKey;
}

class Message extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onSelected = this.onSelected.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    if (this.lastScrolledMsgUri != this.props.message.msgUri && this.props.message.scrollTo) {
      this.lastScrolledMsgUri = this.props.message.msgUri; // The header is 44px high (yes, this is hard coded and ugly).

      window.requestAnimationFrame(() => {
        window.scrollTo(0, this.li.getBoundingClientRect().top + window.scrollY + 5 - 44);
        this.onSelected();
      }); // For any time we're mounting a new message, we're going to be loading
      // it as well. That means we don't need to clear the scrollTo flag here,
      // we can leave that to componentDidUpdate.
    }

    this.checkLateAttachments();
  }

  componentDidUpdate(prevProps) {
    if (this.props.message.expanded && !this.props.iframesLoading) {
      this.handleAutoMarkAsRead();
    } else if (!this.props.message.expanded || this.props.message.read) {
      this.removeScrollListener();
    }

    if (!this.props.message.scrollTo) {
      return;
    }

    if (this.lastScrolledMsgUri != this.props.message.msgUri || prevProps.iframesLoading && !this.props.iframesLoading) {
      this.lastScrolledMsgUri = this.props.message.msgUri; // The header is 44px high (yes, this is harcodeadly ugly).

      window.requestAnimationFrame(() => {
        window.scrollTo(500, this.li.getBoundingClientRect().top + window.scrollY + 5 - 44);
        this.onSelected(); // Only clear scrollTo if we're now not loading any iframes for
        // this message. This should generally mean we get to scroll to the
        // right place most of the time.

        if (!this.props.iframesLoading) {
          this.props.dispatch({
            type: "CLEAR_SCROLLTO",
            id: this.props.message.id
          });
        }
      });
    }

    this.checkLateAttachments();
  }

  componentWillUnmount() {
    this.removeScrollListener();
  }

  checkLateAttachments() {
    if (this.props.message.expanded && this.props.message.needsLateAttachments) {
      this.props.dispatch(messageActions.getLateAttachments({
        id: this.props.message.id
      }));
    }
  }

  removeScrollListener() {
    if (this._scrollListener) {
      document.removeEventListener("scroll", this._scrollListener, true);
      delete this._scrollListener;
    }
  } // Handles setting up the listeners for if we should mark as read when scrolling.


  handleAutoMarkAsRead() {
    // If we're already read, not expanded or auto read is turned off, then we
    // don't need to add listeners.
    if (!this.props.autoMarkAsRead || !this.props.message.expanded || this.props.message.read) {
      this.removeScrollListener();
      return;
    }

    if (this._scrollListener) {
      return;
    }

    this._topInView = false;
    this._bottomInView = false;
    this._scrollListener = this.onScroll.bind(this);
    document.addEventListener("scroll", this._scrollListener, true);
  }

  onSelected() {
    this.props.dispatch(messageActions.selected({
      msgUri: this.props.message.msgUri
    }));
  }

  onKeyDown(event = {}) {
    const {
      key,
      shiftKey
    } = event;
    const shortcut = `${isAccel(event) ? "accel-" : ""}${key}`;

    function stopEvent() {
      event.stopPropagation();
      event.preventDefault();
    } // Handle the basic keyboard shortcuts


    switch (shortcut) {
      case "accel-r":
      case "accel-R":
        this.props.dispatch(messageActions.reply({
          msgUri: this.props.message.msgUri,
          shiftKey
        }));
        stopEvent();
        break;

      case "accel-l":
        this.props.dispatch(messageActions.forward({
          msgUri: this.props.message.msgUri
        }));
        break;

      case "accel-u":
        this.props.dispatch(messageActions.openSource({
          msgUri: this.props.message.msgUri
        }));
        break;

      case "a":
        this.props.dispatch(messageActions.archive({
          id: this.props.message.id
        }));
        break;

      case "o":
        this.props.dispatch({
          type: "MSG_EXPAND",
          msgUri: this.props.message.msgUri
        });
        break;

      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        this.props.dispatch(messageActions.toggleTagByIndex({
          id: this.props.message.id,
          tags: this.props.message.tags,
          // Tag indexes start at 0
          index: +shortcut - 1
        }));
        stopEvent();
        break;

      case "0":
        // Remove all tags
        this.props.dispatch(messageActions.setTags({
          id: this.props.message.id,
          tags: []
        }));
        stopEvent();
        break;

      case "f":
        this.props.advanceMessage(1);
        stopEvent();
        break;

      case "b":
        this.props.advanceMessage(-1);
        stopEvent();
        break;

      default:
        break;
    }

    this.onSelected();
  }

  onScroll() {
    const rect = this.li.getBoundingClientRect();

    if (!this._topInView) {
      const top = rect.y;

      if (top > 0 && top < window.innerHeight) {
        this._topInView = true;
      }
    }

    if (!this._bottomInView) {
      const bottom = rect.y + rect.height;

      if (bottom > 0 && bottom < window.innerHeight) {
        this._bottomInView = true;
      }
    }

    if (this._topInView && this._bottomInView) {
      if (!this.props.message.read) {
        this.props.dispatch(messageActions.markAsRead({
          id: this.props.message.id
        }));
      }

      this.removeScrollListener();
    }
  }

  render() {
    // TODO: For printing, we used to have a container in-between the iframe
    // and attachments container. Need to figure out how to get that back in
    // and working.
    // <div class="body-container"></div>
    return /*#__PURE__*/react.createElement("li", {
      className: "message",
      ref: li => {
        this.li = li;
        this.props.setRef(li);
      },
      tabIndex: this.props.index + 1,
      onFocusCapture: this.onSelected,
      onClickCapture: this.onSelected,
      onKeyDownCapture: this.onKeyDown
    }, /*#__PURE__*/react.createElement(MessageHeader, {
      dispatch: this.props.dispatch,
      bcc: this.props.message.bcc,
      cc: this.props.message.cc,
      date: this.props.message.date,
      detailsShowing: this.props.message.detailsShowing,
      expanded: this.props.message.expanded,
      from: this.props.message.from,
      to: this.props.message.to,
      fullDate: this.props.message.fullDate,
      id: this.props.message.id,
      msgUri: this.props.message.msgUri,
      attachments: this.props.message.attachments,
      multipleRecipients: this.props.message.multipleRecipients,
      recipientsIncludeLists: this.props.message.recipientsIncludeLists,
      inView: this.props.message.inView,
      isDraft: this.props.message.isDraft,
      shortFolderName: this.props.message.shortFolderName,
      snippet: this.props.message.snippet,
      starred: this.props.message.starred,
      tags: this.props.message.tags,
      specialTags: this.props.message.specialTags
    }), this.props.message.expanded && this.props.message.detailsShowing && /*#__PURE__*/react.createElement(MessageDetails, {
      bcc: this.props.message.bcc,
      cc: this.props.message.cc,
      extraLines: this.props.message.extraLines,
      from: this.props.message.from,
      to: this.props.message.to
    }), this.props.message.expanded && /*#__PURE__*/react.createElement(MessageNotification, {
      canUnJunk: this.props.message.isJunk && !this.props.displayingMultipleMsgs,
      dispatch: this.props.dispatch,
      extraNotifications: this.props.message.extraNotifications,
      hasRemoteContent: this.props.message.hasRemoteContent,
      isPhishing: this.props.message.isPhishing,
      isOutbox: this.props.message.isOutbox,
      id: this.props.message.id,
      msgUri: this.props.message.msgUri,
      realFrom: this.props.message.realFrom
    }), /*#__PURE__*/react.createElement("div", {
      className: "messageBody"
    }, this.props.message.expanded && /*#__PURE__*/react.createElement(SpecialMessageTags, {
      onFolderClick: () => {
        this.props.dispatch(messageActions.switchToFolderAndMsg({
          id: this.props.message.id
        }));
      },
      onTagClick: (event, tag) => {
        this.props.dispatch(messageActions.tagClick({
          event,
          msgUri: this.props.message.msgUri,
          details: tag.details
        }));
      },
      folderName: this.props.message.folderName,
      inView: this.props.message.inView,
      specialTags: this.props.message.specialTags
    }), this.props.message.expanded && /*#__PURE__*/react.createElement(MessageTags, {
      onTagsChange: tags => {
        this.props.dispatch(messageActions.setTags({
          id: this.props.message.id,
          tags
        }));
      },
      expanded: true,
      tags: this.props.message.tags
    }), /*#__PURE__*/react.createElement(MessageIFrame, {
      browserBackgroundColor: this.props.browserBackgroundColor,
      browserForegroundColor: this.props.browserForegroundColor,
      defaultFontSize: this.props.defaultFontSize,
      dispatch: this.props.dispatch,
      expanded: this.props.message.expanded,
      hasRemoteContent: this.props.message.hasRemoteContent,
      smimeReload: this.props.message.smimeReload,
      initialPosition: this.props.message.initialPosition,
      msgUri: this.props.message.msgUri,
      neckoUrl: this.props.message.neckoUrl,
      tenPxFactor: this.props.tenPxFactor,
      prefs: this.props.prefs,
      realFrom: this.props.message.realFrom
    }), this.props.message.expanded && !!this.props.message.attachments.length && /*#__PURE__*/react.createElement(Attachments, {
      dispatch: this.props.dispatch,
      attachments: this.props.message.attachments,
      attachmentsPlural: this.props.message.attachmentsPlural,
      hasBuiltInPdf: this.props.hasBuiltInPdf,
      messageKey: this.props.message.messageKey,
      id: this.props.message.id
    })), this.props.message.expanded && /*#__PURE__*/react.createElement(MessageFooter, {
      dispatch: this.props.dispatch,
      id: this.props.message.id,
      msgUri: this.props.message.msgUri,
      multipleRecipients: this.props.message.multipleRecipients,
      recipientsIncludeLists: this.props.message.recipientsIncludeLists,
      isDraft: this.props.message.isDraft
    }), this.props.isLastMessage && this.props.message.expanded && !this.props.hideQuickReply && /*#__PURE__*/react.createElement(QuickReply, null));
  }

}
Message.propTypes = {
  autoMarkAsRead: (prop_types_default()).bool.isRequired,
  browserBackgroundColor: (prop_types_default()).string.isRequired,
  browserForegroundColor: (prop_types_default()).string.isRequired,
  defaultFontSize: (prop_types_default()).number.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  displayingMultipleMsgs: (prop_types_default()).bool.isRequired,
  iframesLoading: (prop_types_default()).number.isRequired,
  index: (prop_types_default()).number.isRequired,
  isLastMessage: (prop_types_default()).bool.isRequired,
  hasBuiltInPdf: (prop_types_default()).bool.isRequired,
  hideQuickReply: (prop_types_default()).bool.isRequired,
  message: (prop_types_default()).object.isRequired,
  tenPxFactor: (prop_types_default()).number.isRequired,
  prefs: (prop_types_default()).object.isRequired,
  setRef: (prop_types_default()).func.isRequired,
  advanceMessage: (prop_types_default()).func.isRequired
};
;// CONCATENATED MODULE: ./addon/content/messageList.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





function _MessageList(props) {
  // Keep a reference to child elements so `.focus()`
  // can be called on them in response to a `advanceMessage()`
  // call. The actual ref is stored in `React.useRef().current`
  const {
    current: childRefs
  } = react.useRef([]);

  function setRef(index, ref) {
    childRefs[index] = ref;
  }

  function advanceMessage(index, step) {
    const ref = childRefs[index + step];

    if (!ref) {
      return;
    }

    ref.focus();
  }

  return /*#__PURE__*/react.createElement("ul", {
    id: "messageList"
  }, !!props.messages.msgData && props.messages.msgData.map((message, index) => /*#__PURE__*/react.createElement(Message, {
    key: index,
    autoMarkAsRead: props.summary.autoMarkAsRead,
    browserBackgroundColor: props.summary.browserBackgroundColor,
    browserForegroundColor: props.summary.browserForegroundColor,
    defaultFontSize: props.summary.defaultFontSize,
    dispatch: props.dispatch,
    displayingMultipleMsgs: !!props.messages.length,
    hasBuiltInPdf: props.summary.hasBuiltInPdf,
    hideQuickReply: props.summary.hideQuickReply,
    iframesLoading: props.summary.iframesLoading,
    index: index,
    isLastMessage: index == props.messages.msgData.length - 1,
    message: message,
    tenPxFactor: props.summary.tenPxFactor,
    prefs: props.summary.prefs,
    advanceMessage: (step = 1) => {
      advanceMessage(index, step);
    },
    setRef: ref => {
      setRef(index, ref);
    }
  })));
}

_MessageList.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  messages: (prop_types_default()).object.isRequired,
  summary: (prop_types_default()).object.isRequired
};
const MessageList = es/* connect */.$j(state => {
  return {
    messages: state.messages,
    summary: state.summary
  };
})(_MessageList);
;// CONCATENATED MODULE: ./addon/content/conversationWrapper.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */








class _ConversationWrapper extends react.PureComponent {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this._setHTMLAttributes(); // When moving to a WebExtension page this can simply be moved to CSS (see
    // options.css).


    browser.conversations.getLocaleDirection().then(dir => {
      document.documentElement.setAttribute("dir", dir);
    });
    this.props.dispatch(messageActions.waitForStartup());
  }

  componentDidUpdate(prevProps) {
    this._setHTMLAttributes(prevProps);
  }

  _setHTMLAttributes(prevProps) {
    if (prevProps && this.props.OS == prevProps.OS && this.props.tweakChrome == prevProps.tweakChrome) {
      return;
    }

    const html = document.body.parentNode;

    if (this.props.tweakChrome && this.props.OS) {
      html.setAttribute("os", this.props.OS);
    } else {
      html.removeAttribute("os");
    }
  }

  render() {
    return /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("div", {
      className: "hidden",
      id: "tooltipContainer"
    }), /*#__PURE__*/react.createElement(ConversationHeader, null), /*#__PURE__*/react.createElement(MessageList, null), /*#__PURE__*/react.createElement(ConversationFooter, null));
  }

}

_ConversationWrapper.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  tweakChrome: (prop_types_default()).bool.isRequired,
  OS: (prop_types_default()).string
};
const ConversationWrapper = es/* connect */.$j(state => {
  return {
    tweakChrome: !!state.summary.prefs && state.summary.prefs.tweakChrome,
    OS: state.summary.OS
  };
})(_ConversationWrapper);
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
    }, /*#__PURE__*/react.createElement(ConversationWrapper)), conversationContainer);
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
/******/ 			[357,592]
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
/******/ 	return __webpack_require__.x();
/******/ })()
;