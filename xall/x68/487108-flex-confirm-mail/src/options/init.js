/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  sendToHost,
} from '/common/common.js';
import * as Constants from '/common/constants.js';
import Options from '/extlib/Options.js';
import '/extlib/l10n.js';
import * as Dialog from '/extlib/dialog.js';

const options = new Options(configs);

function onConfigChanged(key) {
  switch (key) {
    case 'debug':
      document.documentElement.classList.toggle('debugging', configs.debug);
      break;
  }
}
configs.$addObserver(onConfigChanged);


/*
function activateField(field) {
  field.classList.remove('disabled');
  field.disabled = false;
  for (const subField of field.querySelectorAll('input, textarea, button, select')) {
    subField.classList.remove('disabled');
    subField.disabled = false;
  }
}

function deactivateField(field) {
  field.classList.add('disabled');
  field.disabled = true;
  for (const subField of field.querySelectorAll('input, textarea, button, select')) {
    subField.classList.add('disabled');
    subField.disabled = true;
  }
}
*/

function initArrayTypeTextArea(textarea) {
  // Use dataset.arrayConfigKey instead of dataset.configKey,
  // to prevent handling of input field by Ootions.js itself
  textarea.value = (configs[textarea.dataset.arrayConfigKey] || []).join('\n');
  textarea.addEventListener('input', () => {
    throttledUpdateArrayTypeTextArea(textarea);
  });
  textarea.addEventListener('change', () => {
    throttledUpdateArrayTypeTextArea(textarea);
  });
}

function throttledUpdateArrayTypeTextArea(textarea) {
  const key = textarea.dataset.arrayConfigKey;
  if (throttledUpdateArrayTypeTextArea.timers.has(key))
    clearTimeout(throttledUpdateArrayTypeTextArea.timers.get(key));
  textarea.dataset.configValueUpdating = true;
  throttledUpdateArrayTypeTextArea.timers.set(key, setTimeout(() => {
    throttledUpdateArrayTypeTextArea.timers.delete(key);
    const value = textarea.value.trim().split(/[\s,|]+/).filter(part => !!part);
    configs[key] = value;
    setTimeout(() => {
      textarea.dataset.configValueUpdating = false;
    }, 50);
  }, 250));
}
throttledUpdateArrayTypeTextArea.timers = new Map();

async function chooseFile({ title, role, displayName, pattern, fileName }) {
  const response = await sendToHost({
    command: Constants.HOST_COMMAND_CHOOSE_FILE,
    params: { title, role, displayName, pattern, fileName }
  });
  return response ? response.path.trim() : '';
}


window.addEventListener('DOMContentLoaded', async () => {
  await configs.$loaded;

  /* This always fails even if the native messaging host is available...
  const response = await sendToHost({ command: 'echo' });
  if (!response) {
    for (const field of document.querySelectorAll('.require-native-messaging-host')) {
      deactivateField(field);
    }
  }
  */

  for (const textarea of document.querySelectorAll('textarea.array-type-config')) {
    initArrayTypeTextArea(textarea);
  }

  const attentionDomainsField = document.querySelector('#attentionDomainsField');
  attentionDomainsField.classList.toggle(
    'locked',
    configs.$isLocked('attentionDomains') ||
    (configs.$isLocked('attentionDomainsSoruce') &&
     configs.attentionDomainsSoruce == Constants.SOURCE_FILE)
  );
  if (attentionDomainsField.classList.contains('locked'))
    attentionDomainsField.disabled = true;

  const attentionDomainsFile = document.querySelector('#attentionDomainsFile');
  attentionDomainsFile.classList.toggle(
    'locked',
    configs.$isLocked('attentionDomainsFile') ||
    (configs.$isLocked('attentionDomainsSoruce') &&
     configs.attentionDomainsSoruce == Constants.SOURCE_CONFIG)
  );
  Dialog.initButton(document.querySelector('#attentionDomainsFileChoose'), async _event => {
    const path = await chooseFile({
      title:       browser.i18n.getMessage('config_attentionDomainsFile_button_dialogTitle'),
      role:        'AttentionDomainsFileChoose',
      displayName: `${browser.i18n.getMessage('config_attentionDomainsFile_button_dialogDisplayName')} (*.*)`,
      pattern:     '*.*',
      fileName:    attentionDomainsFile.value || ''
    });
    if (path)
      configs.attentionDomainsFile = attentionDomainsFile.value = path;
  });
  if (attentionDomainsFile.classList.contains('locked'))
    attentionDomainsFile.disabled = true;


  const attentionSuffixesField = document.querySelector('#attentionSuffixesField');
  attentionSuffixesField.classList.toggle(
    'locked',
    configs.$isLocked('attentionSuffixes') ||
    (configs.$isLocked('attentionSuffixesSoruce') &&
     configs.attentionSuffixesSoruce == Constants.SOURCE_FILE)
  );
  if (attentionSuffixesField.classList.contains('locked'))
    attentionSuffixesField.disabled = true;

  const attentionSuffixesFile = document.querySelector('#attentionSuffixesFile');
  attentionSuffixesFile.classList.toggle(
    'locked',
    configs.$isLocked('attentionSuffixesFile') ||
    (configs.$isLocked('attentionSuffixesSoruce') &&
     configs.attentionSuffixesSoruce == Constants.SOURCE_CONFIG)
  );
  Dialog.initButton(document.querySelector('#attentionSuffixesFileChoose'), async _event => {
    const path = await chooseFile({
      title:       browser.i18n.getMessage('config_attentionSuffixesFile_button_dialogTitle'),
      role:        'AttentionSuffixesFileChoose',
      displayName: `${browser.i18n.getMessage('config_attentionSuffixesFile_button_dialogDisplayName')} (*.*)`,
      pattern:     '*.*',
      fileName:    attentionSuffixesFile.value || ''
    });
    if (path)
      configs.attentionSuffixesFile = attentionSuffixesFile.value = path;
  });
  if (attentionSuffixesFile.classList.contains('locked'))
    attentionSuffixesFile.disabled = true;


  const attentionTermsField = document.querySelector('#attentionTermsField');
  attentionTermsField.classList.toggle(
    'locked',
    configs.$isLocked('attentionTerms') ||
    (configs.$isLocked('attentionTermsSoruce') &&
     configs.attentionTermsSoruce == Constants.SOURCE_FILE)
  );
  if (attentionTermsField.classList.contains('locked'))
    attentionTermsField.disabled = true;

  const attentionTermsFile = document.querySelector('#attentionTermsFile');
  attentionTermsFile.classList.toggle(
    'locked',
    configs.$isLocked('attentionTermsFile') ||
    (configs.$isLocked('attentionTermsSoruce') &&
     configs.attentionTermsSoruce == Constants.SOURCE_CONFIG)
  );
  Dialog.initButton(document.querySelector('#attentionTermsFileChoose'), async _event => {
    const path = await chooseFile({
      title:       browser.i18n.getMessage('config_attentionTermsFile_button_dialogTitle'),
      role:        'AttentionTermsFileChoose',
      displayName: `${browser.i18n.getMessage('config_attentionTermsFile_button_dialogDisplayName')} (*.*)`,
      pattern:     '*.*',
      fileName:    attentionTermsFile.value || ''
    });
    if (path)
      configs.attentionTermsFile = attentionTermsFile.value = path;
  });
  if (attentionTermsFile.classList.contains('locked'))
    attentionTermsFile.disabled = true;

  options.buildUIForAllConfigs(document.querySelector('#debug-configs'));
  onConfigChanged('debug');

  for (const container of document.querySelectorAll('section, fieldset, p, div')) {
    const allFields = container.querySelectorAll('input, textarea, select');
    const lockedFields = container.querySelectorAll('.locked input, .locked textarea, .locked select, input.locked, textarea.locked, select.locked');
    container.classList.toggle('locked', allFields.length == lockedFields.length);
  }

  document.documentElement.classList.add('initialized');
}, { once: true });
