if (typeof contacttabs == "undefined") {
  var contacttabs = {};
};

Components.utils.import("resource:///modules/mailServices.js");
Components.utils.import("chrome://contacttabs/content/cotaAbookManager.js");

// abCommon.js requires this to be globally available
var gAddressBookBundle;
var gEditCard;

contacttabs.PhotoEditor = new function() {
  var pub = {};
  var self = this;

  pub.init = function() {
    window.addEventListener("unload",
                            self.unload,
                            false);
    gAddressBookBundle = document.getElementById("bundle_addressBook");
  }

  pub.photoEditorLoaded = function() {
    var params = window.arguments[0];
    var cardproperty = params.card;

    gEditCard = {};
    gEditCard.card = params.card;

    var photoType = cardproperty.getProperty("PhotoType", "");
    document.getElementById("PhotoType").value = photoType;
    loadPhoto(cardproperty);
    setCardEditorPhoto(photoType, cardproperty);
  }

  pub.photoEditorClosedOK = function() {
    var params = window.arguments[0];
    var out = params.out;

    out.photoType = document.getElementById("PhotoType").value;

    if(out.photoType == 'file') {
      var file = document.getElementById("PhotoFile").file;
      var photoURI = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService)
        .newFileURI(file)
        .spec;

      out.uri = photoURI;
    }
    else if(out.photoType == 'web') {
      out.uri = document.getElementById("PhotoURI").value;
    }

    out.action = 'OK';
  }

  pub.photoEditorClosedCancel = function() {
    var params = window.arguments[0];
    var out = params.out;

    out.action = 'cancel';
  }

  return pub;
}

window.addEventListener("load",
                        contacttabs.PhotoEditor.init,
                        false);
