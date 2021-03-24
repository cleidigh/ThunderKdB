/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export class Window {
  async init() {
    // Set up our monkey patches which aren't really listeners, but this
    // is a good way to manage them.
    browser.convMsgWindow.onMonkeyPatch.addListener(() => {});

    browser.convMsgWindow.onThreadPaneDoubleClick.addListener(
      async (windowId, msgHdrs) => {
        for (const hdr of msgHdrs) {
          const account = await browser.accounts.get(hdr.folder.accountId);
          if (account.type == "nntp" || account.type == "rss") {
            return {};
          }
        }
        const urls = [];
        for (const hdr of msgHdrs) {
          urls.push(await browser.conversations.getMessageUriForId(hdr.id));
        }
        await this.openConversation(windowId, urls);
        return {
          cancel: true,
        };
      }
    );

    browser.convMsgWindow.onThreadPaneMiddleClick.addListener(
      async (windowId, msgHdrs) => {
        for (const hdr of msgHdrs) {
          const account = await browser.accounts.get(hdr.folder.accountId);
          if (account.type == "nntp" || account.type == "rss") {
            return {};
          }
        }
        const urls = [];
        for (const hdr of msgHdrs) {
          urls.push(await browser.conversations.getMessageUriForId(hdr.id));
        }
        const url = this.makeConversationUrl(
          urls,
          await browser.convMsgWindow.isSelectionThreaded(windowId)
        );
        await browser.conversations.createTab({
          url,
          type: "chromeTab",
        });
        return {
          cancel: true,
        };
      }
    );

    browser.convMsgWindow.onSummarizeThread.addListener(async () => {});
  }

  async openConversation(windowId, urls) {
    const url = this.makeConversationUrl(
      urls,
      await browser.convMsgWindow.isSelectionThreaded(windowId)
    );

    switch (
      await browser.conversations.getCorePref("mail.openMessageBehavior")
    ) {
      case 0: // fall-through
      case 1:
        browser.convMsgWindow.openNewWindow(url);
        break;
      case 2:
        await browser.conversations.createTab({
          url,
          type: "contentTab",
        });
        break;
    }
  }

  /**
   * Makes a conversation url for opening in new windows/tabs.
   *
   * @param {Array} urls
   *   An array of urls to be opened.
   * @param {Boolean} [isSelectionThreaded]
   *   Is the selection threaded
   */
  makeConversationUrl(urls, isSelectionThreaded) {
    let queryString = "?urls=" + encodeURIComponent(urls.join(","));

    if (isSelectionThreaded) {
      queryString += "&isThreaded=" + (isSelectionThreaded ? 1 : 0);
    }
    return `chrome://conversations/content/stub.html${queryString}`;
  }
}
