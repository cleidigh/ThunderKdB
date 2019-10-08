if(!org) var org={};
if(!org.janek) org.janek={};

Components.utils.import("resource://gre/modules/Services.jsm");

org.janek.identitychooser_preferences = new function() {
  var self = this;
  self.identitiesHelper = org.janek.identitychooser_identitieshelper();
  self.prefsHelper = org.janek.identitychooser_prefshelper();
  self.colorizeDisabledColor = "#EEEEEE";

  self.prefCheckboxes = ['extendButtonNewmsg',
                         'extendButtonReply',
                         'extendButtonForward',
                         'extendMailtoLinks',
                         'extendEmailAddress',
                         'highlightCurrentAccountIdentities'
                        ];

  var pub = {};

  //
  // Initialize class
  //
  pub.init = function() {
    document.addEventListener('dialogaccept', pub.onPrefWindowAccept);

    self.prefCheckboxes.forEach(function(i) {
      document.getElementsByClassName(i)[0].checked = self.prefsHelper.getBoolPref(i);
    });

    var identitiesConfigListBox =
      document.getElementById("identitychooser-config-listbox");

    var allIdentities =
      self.identitiesHelper.getIdentitiesAccountListUserSorted();
    for(var i = 0; i < allIdentities.length; i++)
      {
        var identity = allIdentities[i].identity;

        var identityNameListCell =
            self.createIdentityNameListCell(identity);
        identityNameListCell.setAttribute("width",
                                          "350");
        var identityIncludeInMenuListCell =
            self.createIdentityIncludeInMenuListCell(identity);
        identityIncludeInMenuListCell.setAttribute("width",
                                                   "80");

        var identityColorPickerListCell =
          self.createIdentityColorPickerListCell(identity);
        identityColorPickerListCell.setAttribute("width",
                                                 "50");

        var listItem = document.createElement("richlistitem");
        listItem.setAttribute("identityKey",
                              identity.key);
        listItem.setAttribute("allowevents", "true");
        listItem.appendChild(identityNameListCell);
        listItem.appendChild(identityIncludeInMenuListCell);
        listItem.appendChild(identityColorPickerListCell);
        identitiesConfigListBox.appendChild(listItem);
      }

    self.identitiesListBoxClicked();

    identitiesConfigListBox.addEventListener("click",
                                             self.identitiesListBoxClicked,
                                             false);

    // Register event listener for shutdown
    window.addEventListener("unload", self.onUnload, false);
  };

  self.identitiesListBoxClicked = function() {
    var identitiesConfigListBox =
      document.getElementById("identitychooser-config-listbox");

    document.getElementById("move-up-button").disabled =
      (identitiesConfigListBox.selectedCount < 1);
    document.getElementById("move-down-button").disabled =
      (identitiesConfigListBox.selectedCount < 1);
  }

  self.createColorPreference = function(identity) {
    var colorPreference = document.createElement("preference");
    colorPreference.setAttribute(
      "id",
      self.prefsHelper.getFullColorPrefKey(identity));
    colorPreference.setAttribute(
      "name",
      self.prefsHelper.getFullColorPrefKey(identity));
    colorPreference.setAttribute("type",
                                 "string");

    return colorPreference;
  }

  self.createWarnIfUsedPreference = function(identity) {
    var preference = document.createElement("preference");
    preference.setAttribute(
      "id",
      self.prefsHelper.getFullWarnIfUsedPrefKey(identity));
    preference.setAttribute(
      "name",
      self.prefsHelper.getFullWarnIfUsedPrefKey(identity));
    preference.setAttribute("type",
                            "bool");

    return preference;
  }

  self.createIncludeInMenuPreference = function(identity) {
    var preference = document.createElement("preference");
    preference.setAttribute(
      "id",
      self.prefsHelper.getFullIncludeInMenuPrefKey(identity));
    preference.setAttribute(
      "name",
      self.prefsHelper.getFullIncludeInMenuPrefKey(identity));
    preference.setAttribute("type",
                            "bool");

    return preference;
  }

  self.createIdentityNameListCell = function(identity) {
    var l = document.createElement("description");

    l.setAttribute("class",
                   "identityName");
    l.setAttribute("value",
                   self.identitiesHelper.identityToString(identity));

    return l;
  }

  self.createIdentityIncludeInMenuListCell = function(identity) {
    var l = document.createElement("box");

    l.setAttribute("class",
                   "includeInMenu");

    var checkBox = document.createElement("checkbox");

    checkBox.setAttribute(
      "preference",
      self.prefsHelper.getFullIncludeInMenuPrefKey(identity));
    checkBox.setAttribute("class", "includeInMenuCB")
    checkBox.setAttribute("checked",
                          self.prefsHelper.getPrefIncludeInMenu(identity));

    l.appendChild(checkBox);

    return l;
  }

  self.createIdentityColorPickerListCell = function(identity) {
    var l = document.createElement("box");
    l.setAttribute("class",
                   "color");

    var colorizeIdentityCheckBox = document.createElement("checkbox");
    colorizeIdentityCheckBox.setAttribute("class", "colorizeIdentityCB");

    colorizeIdentityCheckBox.setAttribute(
      "checked",
      self.prefsHelper.getPrefColorizeIdentity(identity));
    colorizeIdentityCheckBox.addEventListener(
      "CheckboxStateChange",
      self.enableColorPickerCheckBoxClicked,
      false);
    l.appendChild(colorizeIdentityCheckBox);

    var identityColorPicker = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
    identityColorPicker.setAttribute("type", "color");
    identityColorPicker.setAttribute("class", "colorPicker");
    if(colorizeIdentityCheckBox.getAttribute("checked") == "true")
      {
        identityColorPicker.value = self.prefsHelper.getPrefColor(identity);
      }
    else
      {
        identityColorPicker.value = self.colorizeDisabledColor;
        identityColorPicker.setAttribute("disabled", true);
      }
    l.appendChild(identityColorPicker);

    return l;
  }

  self.enableColorPickerCheckBoxClicked = function(event, src) {
    var checkBoxState = event.currentTarget.checked;
    var colorPicker = event.currentTarget.nextSibling;

    colorPicker.disabled = !checkBoxState;
    if(colorPicker.disabled)
      {
        colorPicker.value = self.colorizeDisabledColor;
      }
    else
      {
        var identityKey =
          event.currentTarget.parentNode.parentNode.getAttribute("identityKey");
        var identity = self.identitiesHelper.findIdentity(identityKey);
        colorPicker.value = self.prefsHelper.getPrefColor(identity);
      }
  }

  self.createWarnIfUsedListCell = function(identity) {
    var l = document.createElement("listcell");

    l.setAttribute("class",
                   "warnIfUsed");

    var vbox = document.createElement("box");
    vbox.setAttribute("id", "configurebox" + identity.key);
    var checkBox = document.createElement("checkbox");
    checkBox.setAttribute(
      "preference",
      self.prefsHelper.getFullWarnIfUsedPrefKey(identity));
    checkBox.setAttribute("checked",
                          self.prefsHelper.getPrefWarnIfUsed(identity));
    checkBox.addEventListener(
      "CheckboxStateChange",
      self.warnIfUsedCheckBoxClicked,
      false);

    var configureButton = document.createElement("button");
    configureButton.setAttribute("label", "...");
    configureButton.setAttribute("class", "configurebutton");
    configureButton.addEventListener("click",
                                     self.openWarnIfUsedOptionsDialog,
                                     false);
    if(self.prefsHelper.getPrefWarnIfUsed(identity) == false)
      {
        configureButton.setAttribute("disabled", "true");
      }

    vbox.appendChild(checkBox);
    vbox.appendChild(configureButton);

    l.appendChild(vbox);

    return l;
  }

  self.warnIfUsedCheckBoxClicked = function(event, src) {
    var checkBoxState = event.currentTarget.checked;
    var configureButton = event.currentTarget.nextSibling;

    configureButton.disabled = !checkBoxState;
  }

  self.openWarnIfUsedOptionsDialog = function(event, src) {
    if(event.currentTarget.disabled)
      {
        return;
      }

    var listItem = event.currentTarget.parentNode.parentNode.parentNode;
    var identityKey = listItem.getUserData("identity");
    var identity = self.identitiesHelper.findIdentity(identityKey);

    var warnIfUsedMode = listItem.getUserData("warnMode");
    if(warnIfUsedMode == null)
      {
        warnIfUsedMode = self.prefsHelper.getPrefWarnIfUsedMode(identity);
      }

    var params = {inWarnMode: warnIfUsedMode,
                  outWarnMode: null};
    window.openDialog("chrome://identitychooser/content/identitychooser-sendwarning-options.xul", "",
                      "chrome, dialog, modal, resizable=yes",
                      params).focus();

    listItem.setUserData("warnMode", params.outWarnMode, null);
  }

  self.onUnload = function() {
    window.removeEventListener("load",
                               org.janek.identitychooser_preferences.init,
                               false);
    window.removeEventListener("unload", self.onUnload, false);

    var identitiesConfigListBox =
      document.getElementById("identitychooser-config-listbox");
    identitiesConfigListBox.removeEventListener("click",
                                                self.identitiesListBoxClicked,
                                                false);
    var prefsService = Services.prefs;
    if(prefsService.getBoolPref("browser.preferences.instantApply").value)
      {
        var identityConfigPanel =
          document.getElementById("identitychooser-identity-config-panel");

        identityConfigPanel.removeEventListener("click",
                                                pub.onPrefWindowAccept,
                                                false);
      }
  }

  pub.moveSelectedIdentityUp = function() {
    var listBox =
      document.getElementById("identitychooser-config-listbox");

    if(listBox.selectedCount == 1)
      {
        var curSelectedIndex = listBox.selectedIndex;

        if(curSelectedIndex - 1 >= 0)
          {
            var curItem = listBox.selectedItem;
            var prevSibling = curItem.previousSibling;

            listBox.removeChild(curItem);
            listBox.insertBefore(curItem, prevSibling);
            listBox.selectedItem = curItem;
          }
      }
  }

  pub.moveSelectedIdentityDown = function() {
    var listBox =
      document.getElementById("identitychooser-config-listbox");

    if(listBox.selectedCount == 1)
      {
        var curSelectedIndex = listBox.selectedIndex;

        if(curSelectedIndex + 1 < listBox.itemCount)
          {
            var curItem = listBox.selectedItem;
            var nextSibling = curItem.nextSibling;

            listBox.removeChild(curItem);
            listBox.insertBefore(curItem, nextSibling.nextSibling);
            listBox.selectedItem = curItem;
          }
      }
  }

  pub.onPrefWindowAccept = function() {
    self.prefCheckboxes.forEach(function(i) {
      self.prefsHelper.setBoolPref(i, document.getElementsByClassName(i)[0].checked);
    });

    var listBox =
      document.getElementById("identitychooser-config-listbox");
    for(var i = 0; i < listBox.itemCount; i++)
      {
        var listItem = listBox.getItemAtIndex(i);
        var identityKey = listItem.getAttribute("identityKey");
        var identity = {
          "key" : identityKey
        };

        self.prefsHelper.setMenuPosition(identity, i);

        var includeInMenu = listItem.getElementsByClassName("includeInMenuCB")[0];
        self.prefsHelper.setPrefIncludeInMenu(identity,
                                              includeInMenu.checked);

        var colorPicker = listItem.getElementsByClassName("colorPicker")[0];
        if(!colorPicker.disabled)
          {
            self.prefsHelper.setPrefColor(identity,
                                          colorPicker.value);
          }
        self.prefsHelper.setPrefColorizeIdentity(identity,
                                                 !colorPicker.disabled);
      }

    return true;
  }

  return pub;
};


// Init class after windows loaded
window.addEventListener("load",
                        org.janek.identitychooser_preferences.init,
                        false);
