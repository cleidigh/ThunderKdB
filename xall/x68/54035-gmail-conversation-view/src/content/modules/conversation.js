/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["Conversation"];

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);

XPCOMUtils.defineLazyModuleGetters(this, {
  BrowserSim: "chrome://conversations/content/modules/browserSim.js",
  Gloda: "resource:///modules/gloda/GlodaPublic.jsm",
  MessageFromDbHdr: "chrome://conversations/content/modules/message.js",
  MessageFromGloda: "chrome://conversations/content/modules/message.js",
  msgHdrGetUri: "chrome://conversations/content/modules/misc.js",
  msgUriToMsgHdr: "chrome://conversations/content/modules/misc.js",
  setupLogging: "chrome://conversations/content/modules/misc.js",
  Services: "resource://gre/modules/Services.jsm",
  messageActions: "chrome://conversations/content/modules/misc.js",
});

XPCOMUtils.defineLazyGetter(this, "browser", function () {
  return BrowserSim.getBrowser();
});

XPCOMUtils.defineLazyGetter(this, "Log", () => {
  return setupLogging("Conversations.Conversation");
});

/**
 * @typedef Message
 * @see message.js
 */

/**
 * @typedef nsIMsgDBHdr
 * @see https://searchfox.org/comm-central/rev/9d9fac50cddfd9606a51c4ec3059728c33d58028/mailnews/base/public/nsIMsgHdr.idl#14
 */

const kMsgDbHdr = 0;
const kMsgGloda = 1;

// from mailnews/base/public/nsMsgFolderFlags.idl
const nsMsgFolderFlags_Drafts = 0x00000400;

// -- Some helpers for our message type

// Get the message-id of a message, be it a msgHdr or a glodaMsg.
function getMessageId({ type, message, msgHdr, glodaMsg }) {
  if (type == kMsgGloda) {
    return glodaMsg.headerMessageID;
  } else if (type == kMsgDbHdr) {
    return msgHdr.messageId;
  }

  Log.error("Bad message type");
  return null;
}

// Get the underlying msgHdr of a message. Might return undefined if Gloda
//  remembers dead messages (and YES this happens).
function toMsgHdr({ type, message, msgHdr, glodaMsg }) {
  if (type == kMsgGloda) {
    return glodaMsg.folderMessage;
  } else if (type == kMsgDbHdr) {
    return msgHdr;
  }

  Log.error("Bad message type");
  return undefined;
}

// Get a Date instance for the given message.
function msgDate({ type, message, msgHdr, glodaMsg }) {
  if (type == kMsgDbHdr) {
    return new Date(msgHdr.date / 1000);
  } else if (type == kMsgGloda) {
    return new Date(glodaMsg.date);
  }

  Log.error("Bad message type");
  return new Date();
}

async function messageFromGlodaIfOffline(conversation, glodaMsg, debug) {
  let msgHdr = glodaMsg.folderMessage;
  if (!msgHdr) {
    return null;
  }
  let needsLateAttachments =
    (!(msgHdr.folder instanceof Ci.nsIMsgLocalMailFolder) &&
      !(msgHdr.folder.flags & Ci.nsMsgFolderFlags.Offline)) || // online IMAP
    glodaMsg.isEncrypted || // encrypted message
    (glodaMsg.contentType + "").search(/^multipart\/encrypted(;|$)/i) == 0; // encrypted message
  const message = new MessageFromGloda(
    conversation,
    msgHdr,
    needsLateAttachments
  );
  await message.init(glodaMsg);
  return {
    type: kMsgGloda,
    message,
    glodaMsg,
    msgHdr: null,
    debug,
  };
}

async function messageFromDbHdr(conversation, msgHdr, debug) {
  const message = new MessageFromDbHdr(conversation, msgHdr);
  await message.init();
  return {
    type: kMsgDbHdr,
    message,
    msgHdr,
    glodaMsg: null,
    debug,
  };
}

// -- The actual conversation object

// We maintain the invariant that, once the conversation is built, this.messages
// matches exactly the DOM nodes with class "message" inside the displayed
// message list.
// So the i-th _message is also the i-th DOM node.
function Conversation(win, selectedMessages, counter, isInTab = false) {
  this._window = win;
  this._isInTab = isInTab;
  this._loadingStartedTime = Date.now();

  // We have the COOL invariant that this._initialSet is a subset of
  //   this.messages.map(x => toMsgHdr(x))
  // This is actually trickier than it seems because of the different view modes
  //  and because we can't directly tell whether a message is in the view if
  //  it's under a collapsed thread.
  // The invariant doesn't hold if the same message is present twice in the
  //  thread (like, you sent a message to yourself so it appears twice in your
  //  inbox that also searches sent folders). But we handle that case well.
  if (selectedMessages && typeof selectedMessages[0] == "string") {
    this._initialSet = selectedMessages.map((url) => msgUriToMsgHdr(url));
  } else {
    this._initialSet = selectedMessages;
  }
  // === Our "message" composite type ==
  //
  // this.messages = [
  //  {
  //    type: kMsgGloda or kMsgDbHdr
  //    message: the Message instance (see message.js)
  //    msgHdr: non-null if type == kMsgDbHdr
  //    glodaMsg: non-null if type == kMsgGloda
  //  },
  //  ... (moar messages) ...
  // ]
  this.messages = [];
  this.counter = counter; // RO
  // The Gloda query, so that it's not collected.
  this._query = null;
  // Function provided by the monkey-patch to do cleanup
  this._onComplete = null;
  // Set to true by the monkey-patch once the conversation is fully built.
  this.completed = false;
  // Ok, interesting bit. Thunderbird has that non-strict threading thing, i.e.
  //  it will thread messages together if they have a "Green Llama in your car"
  //  "Re: Green Llama in your car" subject pattern, and EVEN THOUGH they do not
  //  have the correct References: header set.
  // Until 2.0alpha2, what we would do is:
  //  - fetch the Gloda message collection,
  //  - pick the first Gloda message, get the message collection for its
  //  underlying conversation,
  //  - merge the results for the conversations with the initially selected set,
  //  - re-stream all other messages except for the first one, because we only
  //  have their nsIMsgDBHdr.
  // That's sub-optimal, because we actually have the other message's Gloda
  //  representations at hand, it's just that because the headers do not set the
  //  threading, gloda hasn't attached them to the first message.
  // The solution is to merge the initial set of messages, the gloda messages
  //  corresponding to the intermediate query, and the initially selected
  //  messages...
  this._intermediateResults = [];
}

Conversation.prototype = {
  // Cleans up the existing conversation, dropping the query so that we get
  // garbage collected.
  cleanup() {
    delete this._query;
    delete this._onComplete;
    delete this._htmlPane;
  },

  dispatch(action) {
    // If we don't have a htmlPane, we've probably been cleaned up.
    if (this._htmlPane) {
      this._htmlPane.conversationDispatch(action);
    }
  },

  getMessage(uri) {
    const msg = this.messages.find((m) => m.message._uri == uri);
    if (msg) {
      return msg.message;
    }
    return null;
  },

  getMessageByApiId(id) {
    const msg = this.messages.find((m) => m.message._id == id);
    if (msg) {
      return msg.message;
    }
    return null;
  },

  // This function contains the logic that runs a Gloda query on the initial set
  //  of messages in order to obtain the conversation. It takes care of filling
  //  this.messages with the right set of messages, and then moves on to
  //  _outputMessages.
  _fetchMessages: function _Conversation_fetchMessages() {
    let self = this;
    // This is a "classic query", i.e. the one we use all the time: just obtain
    //  a GlodaMessage for the selected message headers, and then pick the
    //  first one, get its underlying GlodaConversation object, and then ask for
    //  the GlodaConversation's messages.
    Gloda.getMessageCollectionForHeaders(
      self._initialSet,
      {
        async onItemsAdded(aItems) {
          if (!aItems.length) {
            Log.warn("Warning: gloda query returned no messages");
            // M = msgHdr, I = Initial, NG = there was no gloda query
            const messagePromises = self._initialSet.map((msgHdr) =>
              messageFromDbHdr(self, msgHdr, "MI+NG")
            );
            self.messages = await Promise.all(messagePromises);
            self._outputMessages().catch(console.error);
          } else {
            self._intermediateResults = aItems;
            self._query = aItems[0].conversation.getMessagesCollection(
              self,
              true
            );
          }
        },
        onItemsModified() {},
        onItemsRemoved() {},
        onQueryCompleted(aCollection) {},
      },
      null
    );
  },

  // This is the observer for the second Gloda query, the one that returns a
  // conversation.
  onItemsAdded(aItems) {
    // The first batch of messages will be treated in onQueryCompleted, this
    //  handler is only interested in subsequent messages.
    // If we are an old conversation that hasn't been collected, don't go
    //  polluting some other conversation!
    if (!this.completed || this._window.Conversations.counter != this.counter) {
      return;
    }
    // That's XPConnect bug 547088, so remove the setTimeout when it's fixed and
    //  bump the version requirements in install.rdf.template (might be fixed in
    //  time for Gecko 42, if we're lucky)
    // SO LOLZ: the comment above was written in 2011, Gecko 42 has been
    //  released, bug still isn't fixed.
    Services.tm.dispatchToMainThread(async () => {
      try {
        // We want at least all messages from the Gloda collection
        let messages = await Promise.all(
          aItems.map((glodaMsg) =>
            messageFromGlodaIfOffline(this, glodaMsg, "GA")
          )
        );
        // Filter out anything that doesn't have a message header.
        messages = messages.filter((message) => message);
        Log.debug(
          "onItemsAdded",
          messages.map((x) => x.debug + " " + getMessageId(x)).join(" ")
        );
        Log.debug(this.messages.length, "messages already in the conversation");
        // The message ids we already hold.
        let messageIds = {};
        // Remove all messages which don't have a msgHdr anymore
        for (let message of this.messages) {
          if (!toMsgHdr(message)) {
            Log.debug("Removing a message with no msgHdr");
            this.removeMessage(message.message);
          }
        }
        this.messages.map((m) => {
          messageIds[getMessageId(m)] =
            !toMsgHdr(m) || msgHdrIsDraft(toMsgHdr(m));
        });
        // If we've got a new header for a message that we used to know as a
        // draft, that means either the draft has been updated (autosave), or
        // the draft was actually sent. In both cases, we want to remove the old
        // draft.
        for (let x of messages) {
          let newMessageId = getMessageId(x);
          if (messageIds[newMessageId]) {
            Log.debug("Removing a draft...");
            let draft = this.messages.filter(
              (y) => getMessageId(y) == newMessageId
            )[0];
            this.removeMessage(draft.message);
            delete messageIds[newMessageId];
          }
        }
        // Don't add a message if we already have it.
        messages = messages.filter((x) => !(getMessageId(x) in messageIds));
        // Sort all the messages according to the date so that they are inserted
        // in the right order.
        let compare = (m1, m2) => msgDate(m1) - msgDate(m2);
        // We can sort now because we don't need the Message instance to be
        // fully created to get the date of a message.
        messages.sort(compare);
        this.appendMessages(messages).catch(console.error);
      } catch (e) {
        console.error(e);
      }
    });
  },

  onItemsModified(aItems) {
    Log.debug("Updating conversation", this.counter, "global state...");
    if (!this.completed) {
      Log.debug(`Abandoning items modified as not completed.`, aItems);
      return;
    }

    const byMessageId = new Map();
    for (const x of this.messages) {
      byMessageId.set(getMessageId(x), x.message);
    }
    const htmlPane = this._htmlPane;
    for (const glodaMsg of aItems) {
      // If you see big failures coming from the lines below, don't worry: it's
      //  just that an old conversation hasn't been GC'd and still receives
      //  notifications from Gloda. However, its DOM nodes are long gone, so the
      //  calls fail.
      const message = byMessageId.get(glodaMsg.headerMessageID);
      if (message) {
        (async () => {
          try {
            const data = await message.toReactData();
            this.dispatch(
              htmlPane.conversationControllerActions.updateConversation({
                messages: {
                  msgData: [data],
                },
                mode: "replaceMsg",
              })
            );
          } catch (ex) {
            if (ex.message != "Message no longer exists") {
              throw ex;
            }
          }
        })();
      }
    }
  },

  onItemsRemoved(aItems) {
    Log.debug("Updating conversation", this.counter, "global state...");
    if (!this.completed) {
      return;
    }

    // We (should) have the invariant that a conversation only has one message
    // with a given Message-Id.
    let byMessageId = {};
    for (let x of this.messages) {
      byMessageId[getMessageId(x)] = x.message;
    }
    for (let glodaMsg of aItems) {
      let msgId = glodaMsg.headerMessageID;
      if (
        msgId in byMessageId &&
        byMessageId[msgId]._msgHdr.messageKey == glodaMsg.messageKey
      ) {
        this.removeMessage(byMessageId[msgId]);
      }
    }
  },

  onQueryCompleted(aCollection) {
    // We'll receive this notification waaaay too many times, so if we've
    // already settled on a set of messages, let onItemsAdded handle the rest.
    // This is just for the initial building of the conversation.
    if (this.messages.length) {
      return;
    }
    // That's XPConnect bug 547088, so remove the setTimeout when it's fixed and
    //  bump the version requirements in install.rdf.template (might be fixed in
    //  time for Gecko 42, if we're lucky)
    Services.tm.dispatchToMainThread(async () => {
      try {
        // Beware, some bad things might have happened in the meanwhile...
        this._initialSet = this._initialSet.filter((msgHdr) =>
          msgHdr?.folder.msgDatabase.ContainsKey(msgHdr.messageKey)
        );
        // We want at least all messages from the Gloda collection + all
        //  messages from the intermediate set (see rationale in the
        //  initialization of this._intermediateResults).
        let msgPromises = aCollection.items.map((glodaMsg) =>
          messageFromGlodaIfOffline(this, glodaMsg, "GF")
        );
        let intermediateSet = this._intermediateResults.map((glodaMsg) =>
          messageFromGlodaIfOffline(this, glodaMsg, "GM")
        );
        this.messages = await Promise.all([...msgPromises, ...intermediateSet]);
        // Filter out anything that doesn't have a message header.
        this.messages = this.messages.filter((message) => message);
        // Here's the message IDs we know
        let messageIds = {};
        for (let m of this.messages) {
          messageIds[getMessageId(m)] = true;
        }
        // But Gloda might also miss some message headers
        for (let msgHdr of this._initialSet) {
          // Although _filterOutDuplicates is called eventually, don't uselessly
          //  create messages. The typical use case is when the user has a
          //  conversation selected, a new message arrives in that conversation,
          //  and we get called immediately. So there's only one message gloda
          //  hasn't indexed yet...
          // The extra check should help for cases where the fake header that
          //  represents the sent message has been replaced in the meanwhile
          //  with the real header...
          if (!(msgHdr.messageId in messageIds)) {
            this.messages.push(await messageFromDbHdr(this, msgHdr, "MI+G"));
          }
        }
        // Sort all the messages according to the date so that they are inserted
        // in the right order.
        let compare = (m1, m2) => msgDate(m1) - msgDate(m2);
        // We can sort now because we don't need the Message instance to be
        // fully created to get the date of a message.
        this.messages.sort(compare);
        this._outputMessages();
      } catch (e) {
        console.error(e);
      }
    });
  },

  /**
   * Remove a given message from the conversation.
   *
   * @param {Message} msg a Message as in modules/message.js
   */
  removeMessage(msg) {
    Log.debug("Removing message:", msg?._uri);
    // Move the quick reply to the previous message
    this.messages = this.messages.filter((x) => x.message != msg);
    this._initialSet = this._initialSet.filter((x) => x.message != msg);

    // TODO As everything is synchronous but react doesn't let us dispatch
    // from within a dispatch, then we have to dispatch this off to the main
    // thread.
    Services.tm.dispatchToMainThread(() => {
      this.dispatch(
        messageActions.removeMessageFromConversation({
          msgUri: msg._uri,
        })
      );
    });
  },

  // If a new conversation was launched, and that conversation finds out it can
  //  reuse us, it will call this method with the set of messages to append at the
  //  end of this conversation. This only works if the new messages arrive at
  //  the end of the conversation, I don't support the pathological case of new
  //  messages arriving in the middle of the conversation.
  async appendMessages(newMsgs) {
    // This is normal, the stupid folder tree view often reflows the
    //  whole thing and asks for a new ThreadSummary but the user hasn't
    //  actually changed selections.
    if (!newMsgs.length) {
      Log.debug("No messages to append");
      return;
    }

    Log.debug(
      "Appending",
      newMsgs.map((x) => x.debug + " " + getMessageId(x)).join(" ")
    );

    // All your messages are belong to us. This is especially important so
    //  that contacts query the right _contactManager through their parent
    //  Message. (Update: contactManager is now globally persistent via the
    //  background script, so there is only one to pick from.)
    for (let x of newMsgs) {
      x.message._conversation = this;
    }
    this.messages = this.messages.concat(newMsgs);

    // Update initialPosition
    for (
      let i = this.messages.length - newMsgs.length;
      i < this.messages.length;
      i++
    ) {
      this.messages[i].message.initialPosition = i;
    }
    const reactMsgData = [];
    for (const m of newMsgs) {
      reactMsgData.push(await m.message.toReactData());
    }

    this.dispatch(
      this._htmlPane.conversationControllerActions.updateConversation({
        mode: "append",
        messages: {
          msgData: reactMsgData,
        },
      })
    );
  },

  // Once we're confident our set of messages is the right one, we actually
  // start outputting them inside the DOM element we were given.
  async _outputMessages() {
    // Check to see if another conversation has started loading whilst we've
    // been creating. If so, abort and get out of here.
    if (this._window.Conversations.counter != this.counter) {
      Log.debug(
        "Race condition,",
        this.counter,
        "dying for",
        this._window.Conversations.counter
      );
      return;
    }

    if (this._window.Conversations.currentConversation) {
      // Gotta save the quick reply, if there's one! Please note that
      //  contentWindow.Conversations is still wired onto the old
      //  conversation. Updating the global Conversations object and loading
      //  the new conversation's draft is not our responsibility, it's that of
      //  the monkey-patch, and it's done at the very end of the process.
      // This call actually starts the save process off the main thread, but
      //  we're not doing anything besides saving the quick reply, so we don't
      //  need for this call to complete before going on.
      try {
        // TODO: Re-enable this.
        // this._htmlPane.onSave();
      } catch (e) {
        console.error(e);
      }
    }

    Log.debug(
      "Outputting",
      this.messages.map((x) => x.debug)
    );

    // Fill in the HTML right away. The has the nice side-effect of erasing the
    // previous conversation (but not the conversation-wide event handlers!)
    for (let i = 0; i < this.messages.length; i++) {
      // We need to set this before the call to reactMsgData.
      let msg = this.messages[i].message;
      msg.initialPosition = i;
    }

    let reactMsgData = [];
    let skippedMessages = 0;
    for (let [i, m] of this.messages.entries()) {
      let msgData;
      try {
        msgData = m.message.toReactData();
      } catch (ex) {
        if (ex.message != "Message no longer exists") {
          throw ex;
        }
        // Sometimes the message might have gone away before we get to render
        // it, or the API is confused and is trying to give us a dead message.
        reactMsgData.push(null);
        skippedMessages++;
        continue;
      }
      // inView indicates if the message is currently in the message list
      // view or not. If it isn't we don't show the folder name.
      msgData.initialPosition = i - skippedMessages;
      reactMsgData.push(msgData);
    }
    this.messages = this.messages.filter((m, i) => !!reactMsgData[i]);
    reactMsgData = reactMsgData.filter((m) => m);

    // Final check to see if another conversation has started loading whilst
    // we've been creating. If so, abort and get out of here.
    if (this._window.Conversations.counter != this.counter) {
      Log.debug(
        "Race condition,",
        this.counter,
        "dying for",
        this._window.Conversations.counter
      );
      return;
    }

    let initialSet = [];
    for (let msg of this._initialSet) {
      initialSet.push(
        await browser.conversations.getMessageIdForUri(msgHdrGetUri(msg))
      );
    }

    // We've completed the queries and we've only got the rendering left,
    // but we do want to receive the updates from gloda, so set this as
    // complete now to avoid potentially loosing data.
    this.completed = true;

    this.dispatch(
      this._htmlPane.conversationControllerActions.updateConversation({
        mode: "replaceAll",
        summary: {
          loading: false,
          loadingStartedTime: this._loadingStartedTime,
          autoMarkAsRead:
            Services.prefs.getBoolPref("mailnews.mark_message_read.auto") &&
            !Services.prefs.getBoolPref("mailnews.mark_message_read.delay"),
          initialSet,
        },
        messages: {
          msgData: reactMsgData,
        },
      })
    );

    // Now tell the monkeypatch that we've queued everything up.
    Services.tm.dispatchToMainThread(() =>
      this._onComplete().catch(console.error)
    );
  },

  // This is the starting point, this is where the Monkey-Patched threadSummary
  // or the event handlers ask for a conversation.
  outputInto(aHtmlPane, k) {
    this._htmlPane = aHtmlPane;
    this._onComplete = () => k(this);
    this._fetchMessages();
  },
};

/**
 * Tells if the message is a draft message
 *
 * @param {nsIMsgDBHdr} msgHdr The message header to examine
 * @returns {boolean}
 */
function msgHdrIsDraft(msgHdr) {
  return msgHdr.folder.getFlag(nsMsgFolderFlags_Drafts);
}
