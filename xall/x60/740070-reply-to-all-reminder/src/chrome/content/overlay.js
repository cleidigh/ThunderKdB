window.addEventListener("load", function(e) { 
  startup();
}, false);

function startup() {
  var stringBundle = document.getElementById("replytoallreminder-string-bundle");
  var confirmationString = stringBundle.getString("confirmationString");

  var _MsgReplySender = MsgReplySender;
  MsgReplySender = function(event) {
    var selectedMessage = gFolderDisplay.selectedMessage;
    if (selectedMessage.recipients.indexOf(",") != -1 || selectedMessage.ccList != "") {
      if (confirm(confirmationString)) {
        _MsgReplySender(event);
      }
    }
    else {
      _MsgReplySender(event);
    }
  }
}