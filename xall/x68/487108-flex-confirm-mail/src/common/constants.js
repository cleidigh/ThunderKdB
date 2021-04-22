/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const TYPE_COMPOSE_STARTED = 'compose-started';
export const TYPE_COMPOSE_SOMETHING_COPIED = 'compose-something-copied';
export const TYPE_COMPOSE_SOMETHING_PASTED = 'compose-something-pasted';
export const TYPE_MESSAGE_DISPLAY_SOMETHING_COPIED = 'message-display-something-copied';

export const HOST_ID = 'com.clear_code.flexible_confirm_mail_we_host';
export const HOST_COMMAND_FETCH = 'fetch';
export const HOST_COMMAND_CHOOSE_FILE = 'choose-file';

export const CONFIRMATION_MODE_NEVER = 0;
export const CONFIRMATION_MODE_ALWAYS = 1;
export const CONFIRMATION_MODE_ONLY_MODIFIED = 2;

export const CLIPBOARD_STATE_SAFE = 0;
export const CLIPBOARD_STATE_PASTED_TO_DIFFERENT_SIGNATURE_MAIL = 1 << 0;
export const CLIPBOARD_STATE_PASTED_TOO_LARGE_TEXT = 1 << 1;
export const CLIPBOARD_STATE_UNSAFE = (1 << 0) | (1 << 1);

export const ATTENTION_HIGHLIGHT_MODE_NEVER = 0;
export const ATTENTION_HIGHLIGHT_MODE_ALWAYS = 1;
export const ATTENTION_HIGHLIGHT_MODE_ONLY_WITH_ATTACHMENTS = 2;

export const ATTENTION_CONFIRMATION_MODE_NEVER = 0;
export const ATTENTION_CONFIRMATION_MODE_ALWAYS = 1;
export const ATTENTION_CONFIRMATION_MODE_ONLY_WITH_ATTACHMENTS = 2;

export const SOURCE_CONFIG = 0;
export const SOURCE_FILE = 1;
