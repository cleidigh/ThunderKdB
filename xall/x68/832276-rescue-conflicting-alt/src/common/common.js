/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';

const OVERRIDE_DEFAULT_CONFIGS = {}; /* Replace this for more customization on an enterprise use. */

export const configs = new Configs({

  configsVersion: 0,
  debug: false,

  ...OVERRIDE_DEFAULT_CONFIGS
}, {
  syncKeys: [] // sync storage values can be resolved with invalidly saved values, so we always ignmore sync storage...
  /*
  localKeys: [
    'configsVersion',
    'debug'
  ]
  */
});

export function log(message, ...args) {
  if (!configs || !configs.debug)
    return;

  const nest   = (new Error()).stack.split('\n').length;
  let indent = '';
  for (let i = 0; i < nest; i++) {
    indent += ' ';
  }
  console.log(`rescue-conflicting-alternatives: ${indent}${message}`, ...args);
}
