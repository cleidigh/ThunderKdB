/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Dialog from '/extlib/dialog.js';

import {
  configs,
  log,
  sendToHost
} from '/common/common.js';
import * as Constants from '/common/constants.js';
import { RecipientClassifier } from '/common/recipient-classifier.js';

import * as ListUtils from './list-utils.js';

Dialog.setLogger(log);

const TYPE_NEWLY_COMPOSED   = 'new-message';
const TYPE_REPLY            = 'reply';
const TYPE_DRAFT            = 'draft';
const TYPE_TEMPLATE         = 'template';
const TYPE_EXISTING_MESSAGE = 'edit-as-new-message';

function getMessageSignature(message) {
  const author = message.from || message.author || '';
  const authorAddressMatched = author.match(/<([^>]+)>$/);
  return JSON.stringify({
    subject: message.subject || null,
    from: (authorAddressMatched ? authorAddressMatched[1] : author) || null,
    to: (message.to || message.recipients || []).sort(),
    cc: (message.cc || message.ccList || []).sort(),
    bcc: (message.bcc || message.bccList || []).sort()
  });
}


// There is no API to detect starting of a message composition,
// so we now wait for a message from a new composition content.
const mDetectedMessageTypeForTab = new Map();
const mDetectedClipboardStateForTab = new Map();
const mInitialSignatureForTab = new Map();
const mInitialSignatureForTabWithoutSubject = new Map();
const mLastContextMessagesForTab = new Map();
browser.runtime.onMessage.addListener((message, sender) => {
  switch (message && message.type) {
    case Constants.TYPE_COMPOSE_STARTED:
      log('TYPE_COMPOSE_STARTED received ', message, sender);
      browser.compose.getComposeDetails(sender.tab.id).then(async details => {
        const author = await getAddressFromIdentity(details.identityId);
        const signature = getMessageSignature({
          author,
          ...details
        });
        const signatureWithoutSubject = getMessageSignature({
          author,
          ...details,
          subject: null
        });
        const blankSignature = getMessageSignature({ author, subject: null, to: [], cc: [], bcc: [] });
        log('signature: ', signature);
        mInitialSignatureForTab.set(sender.tab.id, signature);
        mInitialSignatureForTabWithoutSubject.set(sender.tab.id, signatureWithoutSubject);
        const types = new Set(await getContainerFolderTypesFromSignature(signature));
        log('message types: ', types);
        const detectedType = (types.has('drafts') && !hasRecentlySavedDraftWithSignature(signature)) ?
          TYPE_DRAFT :
          types.has('templates') ?
            TYPE_TEMPLATE :
            (types.size > 0) ?
              TYPE_EXISTING_MESSAGE :
              (signature == blankSignature) ?
                TYPE_NEWLY_COMPOSED :
                TYPE_REPLY;
        log('detected type: ', detectedType)
        mDetectedMessageTypeForTab.set(sender.tab.id , detectedType);
        mLastContextMessagesForTab.delete(sender.tab.id);
      });
      break;

    case Constants.TYPE_COMPOSE_SOMETHING_COPIED:
      Promise.all([
        browser.compose.getComposeDetails(sender.tab.id),
        navigator.clipboard.readText(),
      ]).then(async results => {
        const [details, text] = results;
        const author = await getAddressFromIdentity(details.identityId);
        const messageSignature = getMessageSignature({author, ...details});
        configs.lastClipboardData = { messageSignature, text };
        log('configs.lastClipboardData updated by TYPE_COMPOSE_SOMETHING_COPIED: ', configs.lastClipboardData);
      });
      break;

    case Constants.TYPE_MESSAGE_DISPLAY_SOMETHING_COPIED:
      Promise.all([
        browser.messageDisplay.getDisplayedMessage(sender.tab.id),
        navigator.clipboard.readText(),
      ]).then(async results => {
        const [details, text] = results;
        const author = await getAddressFromIdentity(details.identityId);
        const messageSignature = getMessageSignature({author, ...details});
        configs.lastClipboardData = { messageSignature, text };
        log('configs.lastClipboardData updated by TYPE_MESSAGE_DISPLAY_SOMETHING_COPIED: ', configs.lastClipboardData);
      });
      break;

    case Constants.TYPE_COMPOSE_SOMETHING_PASTED:
      Promise.all([
        browser.compose.getComposeDetails(sender.tab.id),
        navigator.clipboard.readText(),
      ]).then(async results => {
        const [details, text] = results;
        const author = await getAddressFromIdentity(details.identityId);
        const messageSignature = getMessageSignature({author, ...details});
        const lastState = mDetectedClipboardStateForTab.get(sender.tab.id) || Constants.CLIPBOARD_STATE_SAFE;
        if (configs.lastClipboardData &&
            messageSignature != configs.lastClipboardData.messageSignature &&
            text == configs.lastClipboardData.text)
          mDetectedClipboardStateForTab.set(sender.tab.id, lastState | Constants.CLIPBOARD_STATE_PASTED_TO_DIFFERENT_SIGNATURE_MAIL);
        else if (configs.acceptablePastedTextLength >= 0 && text.length > configs.acceptablePastedTextLength)
          mDetectedClipboardStateForTab.set(sender.tab.id, lastState | Constants.CLIPBOARD_STATE_PASTED_TOO_LARGE_TEXT);
        log('pasted: new state => ', mDetectedClipboardStateForTab.get(sender.tab.id));
      });
      break;
  }
});
browser.composeScripts.register({
  js: [
    // This sends a Constants.TYPE_COMPOSE_STARTED message on load.
    { file: '/resources/compose.js' }
  ]
});
browser.messageDisplayScripts.register({
  js: [
    { file: '/resources/message-display.js' }
  ]
});

async function getAddressFromIdentity(id) {
  const accounts = await browser.accounts.list();
  for (const account of accounts) {
    for (const identity of account.identities) {
      if (identity.id == id)
        return identity.email;
    }
  }
  return null;
}

browser.menus.onShown.addListener((info, tab) => {
  const messages = info.selectedMessages && info.selectedMessages.messages;
  if (messages && messages.length > 0)
    mLastContextMessagesForTab.set(tab.id, messages);
  else
    mLastContextMessagesForTab.delete(tab.id);
});

// There is no API to detect that the compositing message was a draft, template or not,
// so we now find active tabs displaying messages with a signature same to the compositing message.
async function getContainerFolderTypesFromSignature(signature) {
  log('getContainerFolderTypesFromSignature: signature = ', signature);
  const mailTabs = await browser.mailTabs.query({});
  const results = await Promise.all(mailTabs.map(async mailTab => {
    const folder = mailTab.displayedFolder;
    log('getContainerFolderTypesFromSignature: mailTab = ', mailTab, folder);
    if (!folder)
      return false;

    const [displayMessage, selectedMessagesList] = await Promise.all([
      browser.messageDisplay.getDisplayedMessage(mailTab.id),
      browser.mailTabs.getSelectedMessages(mailTab.id).catch(_error => ({ messages: [] }))
    ]);
    const messages = [
      ...selectedMessagesList.messages,
      ...(mLastContextMessagesForTab.get(mailTab.id) || [])
    ];
    if (displayMessage)
      messages.push(displayMessage);
    log('getContainerFolderTypesFromSignature: messages = ', messages);
    for (const message of messages) {
      const testingSignature = getMessageSignature(message);
      if (testingSignature != signature)
        continue;
      log('message is found in the folder: ', folder, message);
      return folder.type;
    }
    return false;
  }));
  return results.filter(found => !!found);
}


// There is no API to detect that the compositing message was a draft or not,
// so we now check there is any recently saved draft with a signature same to the compositing message.
const mRecentlySavedDraftSignatures = new Set();
browser.messages.onNewMailReceived.addListener((folder, messages) => {
  if (folder.type != 'drafts')
    return;
  log('draft saved: ', messages);
  mRecentlySavedDraftSignatures.clear();
  for (const message of messages.messages) {
    mRecentlySavedDraftSignatures.add(getMessageSignature(message));
  }
});
function hasRecentlySavedDraftWithSignature(signature) {
  for (const savedSignature of mRecentlySavedDraftSignatures) {
    if (savedSignature == signature) {
      log('recently saved draft is matched to the editing message');
      return true;
    }
  }
  return false;
}


async function needConfirmationOnModified(tab, details) {
  const type = mDetectedMessageTypeForTab.get(tab.id);
  switch (type) {
    case TYPE_NEWLY_COMPOSED:
    case TYPE_DRAFT:
    case TYPE_TEMPLATE:
    case TYPE_EXISTING_MESSAGE:
      log('need confirmation: ', TYPE_NEWLY_COMPOSED);
      return true;

    default:
      break;
  }

  const clipboardState = mDetectedClipboardStateForTab.get(tab.id) || Constants.CLIPBOARD_STATE_SAFE;
  if (clipboardState & Constants.CLIPBOARD_STATE_UNSAFE) {
    log('need confirmation because unsafe text is pasted');
    return true;
  }

  const initialSignature = mInitialSignatureForTabWithoutSubject.get(tab.id);
  const author           = await getAddressFromIdentity(details.identityId);
  const currentSignature = getMessageSignature({ ...details, author, subject: null });
  log('signature check: ', { initialSignature, currentSignature });
  if (initialSignature &&
      currentSignature == initialSignature) {
    log('skip confirmation because recipients are not modified');
    return false;
  }

  log('need confirmation because recipients are modified');
  return true;
}


async function tryConfirm(tab, details, opener) {
  log('tryConfirm: ', tab, details, opener);
  const [
    to, cc, bcc,
    attentionDomains, attentionSuffixes, attentionTerms
  ] = await Promise.all([
    ListUtils.populateListAddresses(details.to),
    ListUtils.populateListAddresses(details.cc),
    ListUtils.populateListAddresses(details.bcc),
    getAttentionDomains(),
    getAttentionSuffixes(),
    getAttentionTerms()
  ]);
  log('attention list: ', { attentionDomains, attentionSuffixes, attentionTerms });
  const classifier = new RecipientClassifier({
    internalDomains: configs.internalDomains || [],
    attentionDomains
  });
  const classifiedTo = classifier.classify(to);
  const classifiedCc = classifier.classify(cc);
  const classifiedBcc = classifier.classify(bcc);
  log('classified results: ', { classifiedTo, classifiedCc, classifiedBcc });

  const allInternals = new Set([
    ...classifiedTo.internals,
    ...classifiedCc.internals,
    ...classifiedBcc.internals
  ]);
  const allExternals = new Set([
    ...classifiedTo.externals,
    ...classifiedCc.externals,
    ...classifiedBcc.externals
  ]);
  if (configs.skipConfirmationForInternalMail &&
      allExternals.size == 0) {
    log('skip confirmation because there is no external recipient');
    return;
  }
  if (allInternals.size + allExternals.size <= configs.minConfirmationRecipientsCount) {
    log('skip confirmation because there is too few recipients ',
        allInternals.size + allExternals.size,
        '<=',
        configs.minRecipientsCount);
    return;
  }

  log('show confirmation ', tab, details);

  const dialogParams = {
    url:    '/dialog/confirm/confirm.html',
    modal:  !configs.debug,
    opener,
    width:  configs.confirmDialogWidth,
    height: configs.confirmDialogWidth
  };
  if (configs.alwaysLargeDialog) {
    dialogParams.width = Math.max(
      configs.alwaysLargeDialogMinWidth,
      Math.ceil(parseInt(screen.availWidth * 0.9) / 2)
    );
    dialogParams.height = parseInt(screen.availHeight * 0.9);
    dialogParams.left = parseInt((screen.availWidth - dialogParams.width) / 2);
    dialogParams.top = parseInt((screen.availHeight - dialogParams.height) / 2);
  }
  else {
    if (typeof configs.confirmDialogLeft == 'number')
      dialogParams.left = configs.confirmDialogLeft;
    if (typeof configs.confirmDialogTop == 'number')
      dialogParams.top = configs.confirmDialogTop;
  }

  return Dialog.open(
    dialogParams,
    {
      details,
      internals: [
        ...classifiedTo.internals.map(recipient => ({ ...recipient, type: 'To' })),
        ...classifiedCc.internals.map(recipient => ({ ...recipient, type: 'Cc' })),
        ...classifiedBcc.internals.map(recipient => ({ ...recipient, type: 'Bcc' }))
      ],
      externals: [
        ...classifiedTo.externals.map(recipient => ({ ...recipient, type: 'To' })),
        ...classifiedCc.externals.map(recipient => ({ ...recipient, type: 'Cc' })),
        ...classifiedBcc.externals.map(recipient => ({ ...recipient, type: 'Bcc' }))
      ],
      attachments: await browser.compose.listAttachments(tab.id),
      attentionDomains,
      attentionSuffixes,
      attentionTerms
    }
  );
}

async function getAttentionDomains() {
  switch (configs.attentionDomainsSource) {
    default:
    case Constants.SOURCE_CONFIG:
      return configs.attentionDomains || [];

    case Constants.SOURCE_FILE: {
      if (!configs.attentionDomainsFile)
        return [];
      const response = await sendToHost({
        command: Constants.HOST_COMMAND_FETCH,
        params: {
          path: configs.attentionDomainsFile
        }
      });
      return response ? response.contents.trim().split(/[\s,|]+/).filter(part => !!part) : [];
    };
  }
}

async function getAttentionSuffixes() {
  switch (configs.attentionSuffixesSource) {
    default:
    case Constants.SOURCE_CONFIG:
      return configs.attentionSuffixes || [];

    case Constants.SOURCE_FILE: {
      if (!configs.attentionSuffixesFile)
        return [];
      const response = await sendToHost({
        command: Constants.HOST_COMMAND_FETCH,
        params: {
          path: configs.attentionSuffixesFile
        }
      });
      return response ? response.contents.trim().split(/[\s,|]+/).filter(part => !!part) : [];
    };
  }
}

async function getAttentionTerms() {
  switch (configs.attentionTermsSource) {
    default:
    case Constants.SOURCE_CONFIG:
      return configs.attentionTerms || [];

    case Constants.SOURCE_FILE: {
      if (!configs.attentionTermsFile)
        return [];
      const response = await sendToHost({
        command: Constants.HOST_COMMAND_FETCH,
        params: {
          path: configs.attentionTermsFile
        }
      });
      return response ? response.contents.trim().split(/[\s,|]+/).filter(part => !!part) : [];
    };
  }
}


browser.compose.onBeforeSend.addListener(async (tab, details) => {
  await configs.$loaded;
  const composeWin = await browser.windows.get(tab.windowId);

  switch (configs.confirmationMode) {
    case Constants.CONFIRMATION_MODE_NEVER:
      log('skip confirmation');
      break;

    default:
    case Constants.CONFIRMATION_MODE_ONLY_MODIFIED:
      if (!(await needConfirmationOnModified(tab, details)))
        break;
    case Constants.CONFIRMATION_MODE_ALWAYS: {
      try {
        await tryConfirm(tab, details, composeWin);
      }
      catch(error) {
        log('confirmation canceled ', error);
        return { cancel: true };
      }
    }; break;
  }

  if (configs.showCountdown) {
    log('show countdown');

    const dialogParams = {
      url:    '/dialog/countdown/countdown.html',
      modal:  !configs.debug,
      opener: composeWin,
      width:  configs.countdownDialogWidth,
      height: configs.countdownDialogHeight
    }
    if (typeof configs.countdownDialogLeft == 'number')
      dialogParams.left = configs.countdownDialogLeft;
    if (typeof configs.countdownDialogTop == 'number')
      dialogParams.top = configs.countdownDialogTop;

    try {
      await Dialog.open(dialogParams);
    }
    catch(error) {
      log('countdown canceled ', error);
      return { cancel: true };
    }
  }

  log('confirmed: OK to send');
  mDetectedMessageTypeForTab.delete(tab.id)
  mInitialSignatureForTab.delete(tab.id);
  mInitialSignatureForTabWithoutSubject.delete(tab.id);
  mRecentlySavedDraftSignatures.clear();
  mLastContextMessagesForTab.clear();
  return;
});
