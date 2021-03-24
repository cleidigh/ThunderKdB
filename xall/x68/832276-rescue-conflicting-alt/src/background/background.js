/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  log,
} from '/common/common.js';
import * as MessageBody from '/extlib/messageBody.js';

MessageBody.setLogger(log);

/*
// for solo message windows
browser.windows.onCreated.addListener(async window => {
  if (window.type != 'messageDisplay')
    return;

  const tabs = await browser.tabs.query({ windowId: window.id });
  if (tabs.length == 0)
    return;

  const tab = tabs[0];
  log('window created: tab = ', tab);

  const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
  log('window created: message = ', message);
  if (!message)
    return;

  onMessageDisplayed(tab, message);
});
*/

browser.messageDisplay.onMessageDisplayed.addListener(onMessageDisplayed);

async function onMessageDisplayed(tab, message) {
  log('onMessageDisplayed ', tab, message);
  const bodies = await MessageBody.getAllBodies(message.id);
  log('bodies: ', bodies);

  let plaintextCount = 0;
  let htmlCount = 0;
  for (const body of bodies) {
    switch (body.type) {
      case MessageBody.TYPE_PLAINTEXT:
        plaintextCount++;
        break;

      case MessageBody.TYPE_HTML:
        htmlCount++;
        break;

      default:
        break;
    }
  }

  log('count: ', { plaintextCount, htmlCount });
  if (plaintextCount <= 1 && htmlCount <= 1)
    return;

  let extraBodies;
  const reversedBodies = bodies.reverse();
  const lastHTMLIndex = reversedBodies.findIndex(body => body.type == MessageBody.TYPE_HTML);
  if (lastHTMLIndex > -1) {
    extraBodies = reversedBodies.filter((_item, index) => index != lastHTMLIndex);
  }
  else {
    const lastPlaintextIndex = reversedBodies.findIndex(body => body.type == MessageBody.TYPE_PLAINTEXT);
    extraBodies = reversedBodies.filter((_item, index) => index != lastPlaintextIndex);
  }
  extraBodies.reverse();
  log('extraBodies: ', extraBodies);

  if (extraBodies.length == 0)
    return;

  await browser.tabs.executeScript(tab.id, {
    file: '/common/message-display-script.js'
  });;
  await browser.tabs.executeScript(tab.id, {
    code: `renderExtraBodies(${JSON.stringify(extraBodies)})`
  });
}
