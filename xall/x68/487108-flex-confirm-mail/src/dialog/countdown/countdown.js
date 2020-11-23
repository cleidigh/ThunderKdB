/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import '/extlib/l10n.js';
import * as Dialog from '/extlib/dialog.js';

import {
  configs
} from '/common/common.js';

const mCounter = document.getElementById('count');
const mSkipButton = document.getElementById('skip');
const mCancelButton = document.getElementById('cancel');

configs.$loaded.then(async () => {
  mCounter.textContent = configs.countdownSeconds;

  if (configs.countdownAllowSkip) {
    Dialog.initAcceptButton(mSkipButton);
  }
  else {
    mSkipButton.style.display = 'none';
  }

  Dialog.initCancelButton(mCancelButton);

  mCancelButton.focus();
  await Dialog.notifyReady();

  window.addEventListener('resize', () => {
    configs.countdownDialogWidth = window.outerWidth;
    configs.countdownDialogHeight = window.outerHeight;
  });
  window.addEventListener(Dialog.TYPE_MOVED, event => {
    configs.countdownDialogLeft = event.detail.left;
    configs.countdownDialogTop = event.detail.top;
  });

  const start = Date.now();
  window.setInterval(() => {
    const rest = Math.ceil(configs.countdownSeconds - ((Date.now() - start) / 1000));
    mCounter.textContent = rest;
    if (rest <= 0)
      Dialog.accept();
  }, 250);
});
