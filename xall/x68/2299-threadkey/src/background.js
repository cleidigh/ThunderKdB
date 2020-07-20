/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 *
 * The Original Code is ThreadKey Extension.
 * The Initial Developer of the Original Code is Luca Porzio.
 * Portions created by the Initial Developer are Copyright (c) 2006
 * the Initial Deveoper. All Rights Reserved.
 *
 * Contributors:
 * Stefano Constantini, Onno Ekker
 */

"use strict";

let init = async() => {
  let l10nStrings = {};
  function getMessage(value) {
    l10nStrings[value] = browser.i18n.getMessage(value);
  }

  let strings = [
    "threadSortCmd.key",
    "threadSortCmd.modifiers",
    "unthreadSortCmd.key",
    "unthreadSortCmd.modifiers",
    "groupBySortCmd.key",
    "groupBySortCmd.modifiers",
    "overrideKey1.id",
    "overrideKey1.key",
    "overrideKey1.modifiers",
    "overrideKey2.id",
    "overrideKey2.key",
    "overrideKey2.modifiers",
    "overrideKey3.id",
    "overrideKey3.key",
    "overrideKey3.modifiers",
  ];
  strings.forEach(getMessage);

  let locale = browser.i18n.getUILanguage();
  messenger.myapi.startup(JSON.stringify(l10nStrings), locale);

  messenger.commands.onCommand.addListener((command) => {
    switch (command) {
      case "cmd_threadSort":
        messenger.myapi.threadSortCmd();
        break;
      case "cmd_unthreadSort":
        messenger.myapi.unthreadSortCmd();
        break;
      case "cmd_groupBySort":
        messenger.myapi.groupedBySortCmd();
        break;
    }
  });
}

init();
