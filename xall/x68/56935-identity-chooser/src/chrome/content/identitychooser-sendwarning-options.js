if(!org) var org={};
if(!org.janek) org.janek={};

org.janek.identitychooser_sendwarning_options = new function() {
  var self = this;
  self.prefsHelper = org.janek.identitychooser_prefshelper();

  self.warnIfUsedMode = null;
  var pub = {};

  pub.onLoad = function() {
    sizeToContent();

    var radioGroupWarn = document.getElementById("identitychooser-warn-group");
    var radioWarnAlways = document.getElementById("identitychooser-warn-always");
    var radioWarnAbook = document.getElementById("identitychooser-warn-addressbook");
    radioWarnAbook.addEventListener("command",
                                    self.radioWarnAbookCommand,
                                    false);
    self.warnIfUsedMode = window.arguments[0].inWarnMode;

    if(self.warnIfUsedMode == 'always')
      {
        radioGroupWarn.selectedItem = radioWarnAlways;
      }
    else
      {
        radioGroupWarn.selectedItem = radioWarnAbook;
        document.getElementById("identitychooser-warn-abooklist").disabled = false;
      }

    self.initAbookMenuPopup(self.warnIfUsedMode);
  }

  pub.onCloseOK = function() {
    var radioWarnAbook = document.getElementById("identitychooser-warn-addressbook");

    if(radioWarnAbook.selected)
      {
        var abookComboBox = document.getElementById("identitychooser-warn-abooklist");
        window.arguments[0].outWarnMode = abookComboBox.value;
      }
    else
      {
        window.arguments[0].outWarnMode = 'always';
      }
  }

  pub.onCloseCancel = function() {
    window.arguments[0].outWarnMode = self.warnIfUsedMode;
  }

  self.initAbookMenuPopup = function(defaultAbookUri) {
    var abookComboBox = document.getElementById("identitychooser-warn-abooklist");
    var abManager = Components.classes["@mozilla.org/abmanager;1"]
      .getService(Components.interfaces.nsIAbManager);

    var allAddressBooks = abManager.directories;

    var menuPopup =
      document.getElementById("identitychooser-warn-abook-popup");
    var abookComboBox =
      document.getElementById("identitychooser-warn-abooklist");
    var defaultAbookItem = null;
    while (allAddressBooks.hasMoreElements()) {
      var addressBook = allAddressBooks.getNext();

      if (addressBook instanceof Components.interfaces.nsIAbDirectory &&
          !addressBook.isRemote) {

        var menuItem = document.createElement("menuitem");
        menuItem.setAttribute("label", addressBook.dirName);
        menuItem.setAttribute("value", addressBook.URI);

        if(addressBook.URI == defaultAbookUri)
          {
            defaultAbookItem = menuItem;
          }

        menuPopup.appendChild(menuItem);
      }
    }

    if(defaultAbookItem == null)
      {
        abookComboBox.selectedIndex = 0;
      }
    else
      {
        abookComboBox.selectedItem = defaultAbookItem;
      }
  }

  self.radioWarnAbookCommand = function(event, src) {
    if(event.currentTarget.selected)
      {
        document.getElementById("identitychooser-warn-abooklist").disabled = false;
      }
    else
      {
        document.getElementById("identitychooser-warn-abooklist").disabled = true;
      }
  }

  return pub;
};
