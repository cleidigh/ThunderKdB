/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import '/extlib/l10n.js';
//import RichConfirm from '/extlib/RichConfirm.js';
import * as Dialog from '/extlib/dialog.js';

import {
  configs,
  log
} from '/common/common.js';

import * as Constants from '/common/constants.js';
import * as ResizableBox from '/common/resizable-box.js';
import { AttachmentClassifier } from '/common/attachment-classifier.js';

let mParams;
let mAttentionDomains;
let mAttachmentClassifier;

const mTopMessage          = document.querySelector('#top-message');
const mInternalsAllCheck   = document.querySelector('#internalsAll');
const mInternalsList       = document.querySelector('#internals');
const mExternalsAllCheck   = document.querySelector('#externalsAll');
const mExternalsList       = document.querySelector('#externals');
const mSubjectCheck        = document.querySelector('#subject');
const mSubjectField        = document.querySelector('#subjectField');
const mBodyCheck           = document.querySelector('#body');
const mBodyField           = document.querySelector('#bodyField');
const mAttachmentsAllCheck = document.querySelector('#attachmentsAll');
const mAttachmentsList     = document.querySelector('#attachments');
const mAcceptButton        = document.querySelector('#accept');
const mCancelButton        = document.querySelector('#cancel');

function onConfigChange(key) {
  const value = configs[key];
  switch (key) {
    case 'attentionDomainsHighlightMode':
      document.documentElement.classList.toggle('highlight-attention-domains', (
        value == Constants.ATTENTION_HIGHLIGHT_MODE_ALWAYS ||
        (value == Constants.ATTENTION_HIGHLIGHT_MODE_ONLY_WITH_ATTACHMENTS &&
         mParams.attachments.length > 0)
      ));
      break;

    case 'highlightExternalDomains':
      document.documentElement.classList.toggle('highlight-external-domains', value);
      break;

    case 'largeFontSizeForAddresses':
      document.documentElement.classList.toggle('large-font-size-for-addresses', value);
      break;

    case 'emphasizeRecipientType':
      document.documentElement.classList.toggle('emphasize-recipient-type', value);
      break;

    case 'emphasizeTopMessage':
      document.documentElement.classList.toggle('emphasize-top-message', value);
      break;

    case 'topMessage':
      mTopMessage.textContent = value;
      mTopMessage.classList.toggle('hidden', !value);
      break;

    case 'debug':
      document.documentElement.classList.toggle('debug', value);
      break;
  }
}
configs.$addObserver(onConfigChange);

configs.$loaded.then(async () => {
  mParams = await Dialog.getParams();
  log('confirmation dialog initialize ', mParams);

  mAttentionDomains = mParams.attentionDomains;
  mAttachmentClassifier = new AttachmentClassifier({
    attentionSuffixes: mParams.attentionSuffixes,
    attentionTerms:    mParams.attentionTerms
  });

  onConfigChange('attentionDomainsHighlightMode');
  onConfigChange('highlightExternalDomains');
  onConfigChange('largeFontSizeForAddresses');
  onConfigChange('emphasizeRecipientType');
  onConfigChange('emphasizeTopMessage');
  onConfigChange('topMessage');
  onConfigChange('debug');

  ResizableBox.init(configs.confirmDialogBoxSizes);

  initInternals();
  initExternals();
  initBodyBlock();
  initAttachments();

  mAcceptButton.disabled = !isAllChecked();
  document.addEventListener('change', _event => {
    mAcceptButton.disabled = !isAllChecked();
  });

  Dialog.initButton(mAcceptButton, async _event => {
    if (!isAllChecked() ||
        !(await confirmMultipleRecipientDomains()) ||
        !(await confirmAttentionDomains()) ||
        !(await confirmAttentionTerms()) ||
        !(await confirmAttentionSuffixes()))
      return;

    Dialog.accept();
  });
  Dialog.initCancelButton(mCancelButton);

  await Dialog.notifyReady();

  window.addEventListener('resize', () => {
    configs.confirmDialogWidth = window.outerWidth;
    configs.confirmDialogHeight = window.outerHeight;
  });
  window.addEventListener(Dialog.TYPE_MOVED, event => {
    configs.confirmDialogLeft = event.detail.left;
    configs.confirmDialogTop = event.detail.top;
  });

  window.addEventListener(ResizableBox.TYPE_RESIZED, event => {
    configs.confirmDialogBoxSizes = event.detail;
  });
  log('confirmation dialog initialize done');
});


function initInternals() {
  log('initInternals ', mParams.internals);
  mInternalsAllCheck.disabled = mParams.internals.length == 0;
  mInternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllInternals);
  mInternalsAllCheck.addEventListener('change', _event => {
    checkAll(mInternalsList, mInternalsAllCheck.checked);
  });
  mInternalsList.addEventListener('change', _event => {
    mInternalsAllCheck.checked = isAllChecked(mInternalsList);
  });
  for (const recipient of mParams.internals) {
    mInternalsList.appendChild(createRecipientRow(recipient));
  }
}

function initExternals() {
  log('initExternals ', mParams.externals);
  mExternalsAllCheck.disabled = mParams.externals.length == 0;
  mExternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllExternals);
  mExternalsAllCheck.addEventListener('change', _event => {
    checkAll(mExternalsList, mExternalsAllCheck.checked);
    for (const domainRow of mExternalsList.querySelectorAll('.row.domain')) {
      domainRow.classList.toggle('checked', mExternalsAllCheck.checked);
    }
  });
  mExternalsList.addEventListener('change', event => {
    const row = event.target.closest('.row');
    const domainRow = mExternalsList.querySelector(`.row.domain[data-domain="${row.dataset.domain}"]`);
    const recipientCheckboxes = mExternalsList.querySelectorAll(`.row.recipient[data-domain="${row.dataset.domain}"] input[type="checkbox"]`);
    domainRow.classList.toggle('checked', Array.from(recipientCheckboxes).every(checkbox => checkbox.checked));
    mExternalsAllCheck.checked = isAllChecked(mExternalsList);
  });

  const recipientsOfDomain = new Map();
  for (const recipient of mParams.externals) {
    const recipients = recipientsOfDomain.get(recipient.domain) || [];
    recipients.push(recipient);
    recipientsOfDomain.set(recipient.domain, recipients);
  }

  let groupCount = 0;
  for (const [domain, recipients] of recipientsOfDomain.entries()) {
    groupCount++;

    const domainRow = createDomainRow(domain);
    if (recipients.some(recipient => recipient.isAttentionDomain))
      domainRow.classList.add('attention');
    mExternalsList.appendChild(domainRow);

    const domainClass = groupCount % 2 ? 'domain-odd' : 'domain-even';
    for (const recipient of recipients) {
      const row = createRecipientRow(recipient);
      row.dataset.domain = domain;
      row.classList.add(domainClass);
      mExternalsList.appendChild(row);
    }
  }
}

function initBodyBlock() {
  log('initBodyBlock ', mParams.details.body);
  const container = document.querySelector('#bodyAndSubjectContainer');
  container.classList.toggle('hidden', !configs.requireCheckSubject && !configs.requireCheckBody);
  container.previousElementSibling.classList.toggle('hidden', container.classList.contains('hidden')); // splitter

  mSubjectCheck.closest('div').classList.toggle('hidden', !configs.requireCheckSubject);
  if (configs.requireCheckSubject) {
    mSubjectField.textContent = mParams.details.subject;
  }

  mBodyCheck.closest('div').classList.toggle('hidden', !configs.requireCheckBody);
  if (configs.requireCheckBody) {
    // The given message source has a "meta" tag with charset, but the body is already decoded.
    // We need to extract only its body part and render it with a Unicode encoding.
    const tree = (new DOMParser()).parseFromString(mParams.details.body, 'text/html');
    const bodySource = tree.querySelector('body').outerHTML;
    const source = `<!DOCTYPE html><html><meta charset="UTF-8">${bodySource}</html>`;
    mBodyField.src = `data:text/html,${encodeURIComponent(source)}`;
  }
}

function initAttachments() {
  log('initAttachments ', mParams.attachments);
  const container = mAttachmentsList.closest('fieldset');
  container.classList.toggle('hidden', !configs.requireCheckAttachment);
  container.previousElementSibling.classList.toggle('hidden', container.classList.contains('hidden')); // splitter
  if (!configs.requireCheckAttachment)
    return;

  mAttachmentsAllCheck.disabled = configs.requireReinputAttachmentNames || (mParams.attachments.length == 0);
  mAttachmentsAllCheck.classList.toggle('hidden', !configs.allowCheckAllAttachments);
  mAttachmentsAllCheck.addEventListener('change', _event => {
    checkAll(mAttachmentsList, mAttachmentsAllCheck.checked);
  });
  mAttachmentsList.addEventListener('change', _event => {
    mAttachmentsAllCheck.checked = isAllChecked(mAttachmentsList);
  });
  for (const attachment of mParams.attachments) {
    const row = createAttachmentRow(attachment);
    const hasAttentionSuffix = mAttachmentClassifier.hasAttentionSuffix(attachment.name);
    const hasAttentionTerm = mAttachmentClassifier.hasAttentionTerm(attachment.name);
    log('check attachment: ', attachment, { hasAttentionSuffix, hasAttentionTerm });
    if (hasAttentionSuffix || hasAttentionTerm)
      row.classList.add('attention');
    mAttachmentsList.appendChild(row);
  }
}

function createRecipientRow(recipient) {
  const row = createCheckableRow([`${recipient.type}:`, recipient.recipient]);
  row.setAttribute('title', foldLongTooltipText(`${recipient.type}: ${recipient.recipient}`));
  row.classList.add('recipient');
  row.lastChild.classList.add('flexible');
  if (recipient.isAttentionDomain)
    row.classList.add('attention');
  return row;
}

function createDomainRow(domain) {
  const row = createRow([domain]);
  row.setAttribute('title', foldLongTooltipText(domain));
  row.classList.add('domain');
  row.dataset.domain = domain;
  row.lastChild.classList.add('flexible');
  return row;
}

let mCreatedInputFieldCount = 0;

function createAttachmentRow(attachment) {
  const row = createCheckableRow([attachment.name]);
  row.setAttribute('title', foldLongTooltipText(attachment.name));
  row.classList.add('attachment');
  row.lastChild.classList.add('flexible');

  if (configs.requireReinputAttachmentNames) {
    const checkbox = row.querySelector('input[type="checkbox"]');
    checkbox.disabled = true;

    const column = row.insertBefore(document.createElement('span'), row.querySelector('label'));
    column.classList.add('column');
    column.classList.add('flexible');

    const field = column.appendChild(document.createElement('input'));
    field.id = `input-field-created-${mCreatedInputFieldCount++}`;
    field.type = 'text';
    field.placeholder = browser.i18n.getMessage('confirmDialogAttachmentNameReinputPlaceholder');
    field.addEventListener('input', () => {
      if (checkbox.checked == (field.value == attachment.name))
        return;

      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new CustomEvent('change', {
        detail:     checkbox.checked,
        bubbles:    true,
        cancelable: false,
        composed:   true
      }));
    });

    for (const label of row.querySelectorAll('label')) {
      label.setAttribute('for', field.id);
    }
  }

  return row;
}

let mCreatedCheckboxCount = 0;

function createCheckableRow(columns) {
  const row = createRow(columns);
  const checkbox = row.insertBefore(document.createElement('input'), row.firstChild);
  checkbox.id = `checkbox-created-${mCreatedCheckboxCount++}`;
  checkbox.type = 'checkbox';
  for (const label of row.querySelectorAll('label')) {
    label.setAttribute('for', checkbox.id);
  }
  return row;
}

function createRow(columns) {
  const row = document.createElement('div');
  row.classList.add('row');
  for (const column of columns) {
    const label = row.appendChild(document.createElement('label'));
    label.classList.add('column');
    const container = label.appendChild(document.createElement('span'));
    container.classList.add('flexible-container');
    container.appendChild(document.createElement('span')).textContent = column;
  }
  return row;
}

function foldLongTooltipText(text) {
  const max = configs.maxTooltipTextLength;
  const folded = [];
  while (text.length > 0) {
    folded.push(text.substring(0, max));
    text = text.substring(max);
  }
  return folded.join('\n');
}

function checkAll(container, checked) {
  for (const checkbox of container.querySelectorAll('input[type="checkbox"]')) {
    checkbox.checked = checked;
  }
}

function isAllChecked(container = document) {
  for (const checkbox of container.querySelectorAll('input[type="checkbox"]:not(.all-checkbox)')) {
    if (checkbox.classList.contains('hidden') ||
        checkbox.closest('.hidden'))
      continue;
    if (!checkbox.checked)
      return false;
  }
  return true;
}


async function confirmMultipleRecipientDomains() {
  log('confirmMultipleRecipientDomains shouldConfirm = ', configs.confirmMultipleRecipientDomains);
  if (!configs.confirmMultipleRecipientDomains)
    return true;

  const domains = new Set(mParams.externals.filter(recipient => recipient.type != 'Bcc').map(recipient => recipient.domain));
  log('confirmMultipleRecipientDomains domains = ', domains);
  if (domains.size <= 1)
    return true;

  const message = (
    configs.confirmMultipleRecipientDomainsDialogMessage.replace(/\%s/i, Array.from(domains).join('\n')) ||
    browser.i18n.getMessage('confirmMultipleRecipientDomainsMessage', [Array.from(domains).join('\n')])
  );
  return window.confirm(message);
  /*
  let result;
  try {
    result = await RichConfirm.showInPopup(mParams.windowId, {
      modal: true,
      type:  'common-dialog',
      url:   '/resources/blank.html',
      title: configs.confirmMultipleRecipientDomainsDialogTitle || browser.i18n.getMessage('confirmMultipleRecipientDomainsTitle'),
      message,
      buttons: [
        browser.i18n.getMessage('confirmMultipleRecipientDomainsAccept'),
        browser.i18n.getMessage('confirmMultipleRecipientDomainsCancel')
      ]
    });
  }
  catch(_error) {
    result = { buttonIndex: -1 };
  }
  log('confirmMultipleRecipientDomains result.buttonIndex = ', result.buttonIndex);
  switch (result.buttonIndex) {
    case 0:
      return true;
    default:
      return false;
  }
  */
}

async function confirmAttentionDomains() {
  const mode = configs.attentionDomainsConfirmationMode;
  const shouldConfirm = (
    mode == Constants.ATTENTION_CONFIRMATION_MODE_ALWAYS ||
    (mode == Constants.ATTENTION_CONFIRMATION_MODE_ONLY_WITH_ATTACHMENTS &&
     mParams.attachments.length > 0)
  );
  log('confirmAttentionDomains shouldConfirm = ', shouldConfirm);
  if (!shouldConfirm)
    return true;

  const attentionDomains = new Set(mAttentionDomains.map(domain => domain.toLowerCase()));
  const attentionRecipients = mParams.externals.filter(recipient => attentionDomains.has(recipient.domain.toLowerCase())).map(recipient => recipient.address);
  log('confirmAttentionDomains attentionRecipients = ', attentionRecipients);
  if (attentionRecipients.length == 0)
    return true;

  const message = (
    configs.attentionDomainDialogMessage.replace(/\%s/i, attentionRecipients.join('\n')) ||
    browser.i18n.getMessage('confirmAttentionDomainsMessage', [attentionRecipients.join('\n')])
  );
  return window.confirm(message);
  /*
  let result;
  try {
    result = await RichConfirm.showInPopup(mParams.windowId, {
      modal: true,
      type:  'common-dialog',
      url:   '/resources/blank.html',
      title: configs.attentionDomainDialogTitle || browser.i18n.getMessage('confirmAttentionDomainsTitle'),
      message,
      buttons: [
        browser.i18n.getMessage('confirmAttentionDomainsAccept'),
        browser.i18n.getMessage('confirmAttentionDomainsCancel')
      ]
    });
  }
  catch(_error) {
    result = { buttonIndex: -1 };
  }
  log('confirmAttentionDomains result.buttonIndex = ', result.buttonIndex);
  switch (result.buttonIndex) {
    case 0:
      return true;
    default:
      return false;
  }
  */
}

async function confirmAttentionTerms() {
  log('confirmAttentionTerms shouldConfirm = ', configs.attentionTermsConfirm);
  if (!configs.attentionTermsConfirm)
    return true;

  const attentionAttachments = mParams.attachments.filter(attachment => mAttachmentClassifier.hasAttentionTerm(attachment.name)).map(attachment => attachment.name);
  log('confirmAttentionTerms attentionAttachments = ', attentionAttachments);
  if (attentionAttachments.length == 0)
    return true;

  const message = (
    configs.attentionSuffixDialogMessage.replace(/\%s/i, attentionAttachments.join('\n')) ||
    browser.i18n.getMessage('confirmAttentionTermsMessage', [attentionAttachments.join('\n')])
  );
  return window.confirm(message);
  /*
  let result;
  try {
    result = await RichConfirm.showInPopup(mParams.windowId, {
      modal: true,
      type:  'common-dialog',
      url:   '/resources/blank.html',
      title: configs.attentionTermsDialogTitle || browser.i18n.getMessage('confirmAttentionTermsTitle'),
      message,
      buttons: [
        browser.i18n.getMessage('confirmAttentionTermsAccept'),
        browser.i18n.getMessage('confirmAttentionTermsCancel')
      ]
    });
  }
  catch(_error) {
    result = { buttonIndex: -1 };
  }
  log('confirmAttentionTerms result.buttonIndex = ', result.buttonIndex);
  switch (result.buttonIndex) {
    case 0:
      return true;
    default:
      return false;
  }
  */
}

async function confirmAttentionSuffixes() {
  log('confirmAttentionSuffixes shouldConfirm = ', configs.attentionSuffixesConfirm);
  if (!configs.attentionSuffixesConfirm)
    return true;

  const attentionAttachments = mParams.attachments.filter(attachment => mAttachmentClassifier.hasAttentionSuffix(attachment.name)).map(attachment => attachment.name);
  log('confirmAttentionSuffixes attentionAttachments = ', attentionAttachments);
  if (attentionAttachments.length == 0)
    return true;

  const message = (
    configs.attentionSuffixDialogMessage.replace(/\%s/i, attentionAttachments.join('\n')) ||
    browser.i18n.getMessage('confirmAttentionSuffixesMessage', [attentionAttachments.join('\n')])
  );
  return window.confirm(message);
  /*
  let result;
  try {
    result = await RichConfirm.showInPopup(mParams.windowId, {
      modal: true,
      type:  'common-dialog',
      url:   '/resources/blank.html',
      title: configs.attentionSuffixDialogTitle || browser.i18n.getMessage('confirmAttentionSuffixesTitle'),
      message,
      buttons: [
        browser.i18n.getMessage('confirmAttentionSuffixesAccept'),
        browser.i18n.getMessage('confirmAttentionSuffixesCancel')
      ]
    });
  }
  catch(_error) {
    result = { buttonIndex: -1 };
  }
  log('confirmAttentionSuffixes result.buttonIndex = ', result.buttonIndex);
  switch (result.buttonIndex) {
    case 0:
      return true;
    default:
      return false;
  }
  */
}
