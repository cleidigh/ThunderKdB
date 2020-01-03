/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is MoreSnooze Extension code.
 *
 * The Initial Developer of the Original Code is
 * James Hibbard
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Martin Pecka
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/* global document, MutationObserver, Components, MozXULElement */

'use strict';

Components.utils.import('resource://gre/modules/Preferences.jsm');

const prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
const prefsList = [
  { name: 'cb_05m', label: '&moreSnooze.cb_05m;', value: 5 },
  { name: 'cb_10m', label: '&moreSnooze.cb_10m;', value: 10 },
  { name: 'cb_15m', label: '&moreSnooze.cb_15m;', value: 15 },
  { name: 'cb_20m', label: '&moreSnooze.cb_20m;', value: 20 },
  { name: 'cb_30m', label: '&moreSnooze.cb_30m;', value: 30 },
  { name: 'cb_40m', label: '&moreSnooze.cb_40m;', value: 40 },
  { name: 'cb_50m', label: '&moreSnooze.cb_50m;', value: 50 },
  { name: 'cb_01h', label: '&moreSnooze.cb_01h;', value: 60 },
  { name: 'cb_02h', label: '&moreSnooze.cb_02h;', value: 120 },
  { name: 'cb_03h', label: '&moreSnooze.cb_03h;', value: 180 },
  { name: 'cb_06h', label: '&moreSnooze.cb_06h;', value: 360 },
  { name: 'cb_09h', label: '&moreSnooze.cb_09h;', value: 540 },
  { name: 'cb_12h', label: '&moreSnooze.cb_12h;', value: 720 },
  { name: 'cb_15h', label: '&moreSnooze.cb_15h;', value: 900 },
  { name: 'cb_01d', label: '&moreSnooze.cb_01d;', value: 1440 },
  { name: 'cb_02d', label: '&moreSnooze.cb_02d;', value: 2880 },
  { name: 'cb_03d', label: '&moreSnooze.cb_03d;', value: 4320 },
  { name: 'cb_04d', label: '&moreSnooze.cb_04d;', value: 5760 },
  { name: 'cb_05d', label: '&moreSnooze.cb_05d;', value: 7200 },
  { name: 'cb_01w', label: '&moreSnooze.cb_01w;', value: 10080 },
  { name: 'cb_02w', label: '&moreSnooze.cb_02w;', value: 20160 },
];

function newMenuItem(item) {
  return (
    MozXULElement.parseXULToFragment(
      `<menuitem label="${item.label}" value="${item.value}" oncommand="snoozeItem(event)" />`,
      [ 'chrome://moresnooze/locale/moresnooze.dtd' ]
    )
  );
}

function buildCustomSnoozeMenus() {
  const selectedPrefs = prefsList.filter(pref => prefs.getBoolPref(`extensions.moresnooze.${pref.name}`));
  const menus = document.querySelectorAll('[is="calendar-snooze-popup"]');

  menus.forEach((menu) => {
    const items = menu.querySelectorAll('menuitem:not(.unit-menuitem)');
    items.forEach((item) => { item.parentNode.removeChild(item); });

    [...selectedPrefs].reverse().forEach((pref) => {
      menu.prepend(newMenuItem({ label: pref.label, value: pref.value }));
    });
  });
}

const prefObserver = {
  register() {
    const prefService = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefService);

    this.branch = prefService.getBranch('extensions.moresnooze.');

    if (!('addObserver' in this.branch)){
      this.branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    }

    this.branch.addObserver('', this, false);
  },

  unregister() {
    this.branch.removeObserver('', this);
  },

  observe() {
    buildCustomSnoozeMenus();
  }
};

prefObserver.register();

const mutationObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.attributeName === 'title') buildCustomSnoozeMenus();
  });
});

mutationObserver.observe(
  document.querySelector('#calendar-alarm-dialog'),
  { attributes: true }
);
