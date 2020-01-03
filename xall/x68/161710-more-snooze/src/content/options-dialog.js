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
 * Cyrille Nocus
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Martin Pecka
 * James Hibbard
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

/* global ChromeUtils document */
/* exported prefs */

const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

class Preferences {
  constructor() {
    this.defaults = ['cb_30m', 'cb_01h', 'cb_03h', 'cb_01d', 'cb_03d', 'cb_01w'];

    this.preferences = [
      { id: 'extensions.moresnooze.cb_05m', type: 'bool' },
      { id: 'extensions.moresnooze.cb_10m', type: 'bool' },
      { id: 'extensions.moresnooze.cb_15m', type: 'bool' },
      { id: 'extensions.moresnooze.cb_20m', type: 'bool' },
      { id: 'extensions.moresnooze.cb_30m', type: 'bool' },
      { id: 'extensions.moresnooze.cb_40m', type: 'bool' },
      { id: 'extensions.moresnooze.cb_50m', type: 'bool' },
      { id: 'extensions.moresnooze.cb_01h', type: 'bool' },
      { id: 'extensions.moresnooze.cb_02h', type: 'bool' },
      { id: 'extensions.moresnooze.cb_03h', type: 'bool' },
      { id: 'extensions.moresnooze.cb_06h', type: 'bool' },
      { id: 'extensions.moresnooze.cb_09h', type: 'bool' },
      { id: 'extensions.moresnooze.cb_12h', type: 'bool' },
      { id: 'extensions.moresnooze.cb_15h', type: 'bool' },
      { id: 'extensions.moresnooze.cb_01d', type: 'bool' },
      { id: 'extensions.moresnooze.cb_02d', type: 'bool' },
      { id: 'extensions.moresnooze.cb_03d', type: 'bool' },
      { id: 'extensions.moresnooze.cb_04d', type: 'bool' },
      { id: 'extensions.moresnooze.cb_05d', type: 'bool' },
      { id: 'extensions.moresnooze.cb_01w', type: 'bool' },
      { id: 'extensions.moresnooze.cb_02w', type: 'bool' },
    ];

    this.branchName = 'extensions.moresnooze.';
    this.branchNameLength = this.branchName.length;
    this.branch = Services.prefs.getBranch(this.branchName);
  }

  init() {
    for (const pref of this.preferences) {
      const element = document.getElementById(pref.id);
      const prefName = pref.id.substring(this.branchNameLength);

      element.setAttribute('checked', this.branch.getBoolPref(prefName) ? 'true' : 'false');
    }
  }

  save (prefName) {
    const element = document.getElementById(`extensions.moresnooze.${prefName}`);
    this.branch.setBoolPref(prefName, element.getAttribute('checked') === 'true');
  }

  saveAll () {
    for (const pref of this.preferences) {
      const element = document.getElementById(pref.id);
      const prefName = pref.id.substring(this.branchNameLength);

      this.branch.setBoolPref(prefName, element.getAttribute('checked') === 'true');
    }
  }

  checkboxCtrl(operation) {
    const checkboxes = document.querySelectorAll('checkbox');

    if(operation === 'select') checkboxes.forEach(cb => cb.checked = true);
    if(operation === 'deselect') checkboxes.forEach(cb => cb.checked = false);
    if(operation === 'reload') checkboxes.forEach((cb) => {
      cb.checked = this.defaults.includes(cb.id.replace('extensions.moresnooze.', '')) ? true : false;
    });

    this.saveAll();
  }
}

const prefs = new Preferences;
