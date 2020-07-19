'use strict';

const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

class Preferences {
  constructor() {
    this.branchName = 'extensions.LightningColorReminders.';
    this.branchNameLength = this.branchName.length;
    this.branch = Services.prefs.getBranch(this.branchName);
  }

  init() {
    const thicknessDropdown = document.getElementById('LightningColorReminders.Thickness_input');
    thicknessDropdown.selectedIndex = this.branch.getIntPref('Thickness') - 1;

    const positionDropdown = document.getElementById('LightningColorReminders.Position_input');
    positionDropdown.selectedIndex = Array.from(positionDropdown.querySelectorAll('menuitem'))
                                          .map(el => el.value)
                                          .indexOf(this.branch.getStringPref('Position'));
  }

  save (obj) {
    if (obj.el === 'Thickness') this.branch.setIntPref('Thickness', obj.value);
    if (obj.el === 'Position') this.branch.setStringPref('Position', obj.value);
  }
}

const prefs = new Preferences;
