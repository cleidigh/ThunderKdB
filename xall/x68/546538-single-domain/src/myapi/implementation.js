var myServices = ChromeUtils.import("resource://gre/modules/Services.jsm");
var myMailServices = ChromeUtils.import("resource:///modules/MailServices.jsm");
var Services = myServices.Services;
var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      myapi : {
        setWindowListener(domain,Version,titles) {
          var WindowListener = {
              onOpenWindow: function(xulWindow) {
                  var my_compose_window = xulWindow.QueryInterface(
                      Components.interfaces.nsIInterfaceRequestor).
                      getInterface(Components.interfaces.nsIDOMWindow);
                  function onWindowLoad() {
                      my_compose_window.removeEventListener("load",onWindowLoad);
                      var document = my_compose_window.document;
                      if (document.documentElement.getAttribute("windowtype") ==   "msgcompose") {
                        var mySendButton = document.getElementById("button-send");
                        var myAlertForClosure = function(event) {myAlertToSend(event,domain,Version,titles);}
                        var  myAlertForClosureCommand = function(event) {myAlertToSendCommand(event,domain,Version,titles);}
                        mySendButton.addEventListener("click",myAlertForClosure,true);
                        var mySendMenu = document.getElementById("menu-item-send-now");
                        document.addEventListener("command",myAlertForClosureCommand,true);
                      }
                  }
                  my_compose_window.addEventListener("load",onWindowLoad);
              },
          };
          Services.wm.addListener(WindowListener);
        },
        async myExpandRecipients() {
          var win = Services.wm.getMostRecentWindow("msgcompose");
       	  var gCompose = win["gMsgCompose"];
       	  win.Recipients2CompFields(gCompose.compFields);
       	  win.expandRecipients()
       	  win.CompFields2Recipients(gCompose.compFields);
       	},
      }
    }
  }
};

function myAlertToSend(e,domain,Version,titles) {

// myExpandRecipients run here rather than trying to refer to it above
//let sending = document.runtime.sendMessage({"type": "Hello"})
  var win = Services.wm.getMostRecentWindow("msgcompose");
  var gCompose = win["gMsgCompose"];
  console.log("First " + gCompose.compFields);
  console.log(JSON.stringify(gCompose.compFields));
  //if (gCompose.compFields.to == "" && gCompose.compFields.cc == "" && gCompose.compFields.bcc == "") {
        win.Recipients2CompFields(gCompose.compFields);
  //}
  console.log("Second " + gCompose.compFields);
  console.log(JSON.stringify(gCompose.compFields));
  //if (MailingListFound(gCompose.compFields.to) || MailingListFound(gCompose.compFields.cc) || MailingListFound(gCompose.compFields.bcc)) {
      win.expandRecipients()
  //}
  console.log("Third " + gCompose.compFields);
  //win.CompFields2Recipients(gCompose.compFields);
  console.log("Fourth " + gCompose.compFields);
  console.log(JSON.stringify(gCompose.compFields));

  //---------------------------------------------------------------------- Works despite error
  var identityElement = win.document.getElementById("msgIdentity");
	var mySender = identityElement.value;
  var mySenderDomain = mySender.slice(mySender.indexOf("@") + 1);
  if  (mySenderDomain.indexOf(">")) {
    mySenderDomain = mySenderDomain.slice(0,mySenderDomain.indexOf(">"));
    }
  if (mySenderDomain == domain) {
    if (Version !== "" ) {gCompose.compFields.setHeader("Version",Version);}
  };
  var row = 0;
  var conSep = "";
  var Sep = "";
  var Recipients = "";
  var controlledRecipients = "";
  var cancelSend = 1;
  var TitleBox = [];
  var SlashStr = String.fromCharCode(92) + "n";
  if (titles[0] == "|" ) {
    titles = titles.slice(1);
  }
  while (titles.indexOf("|") > 0) {
    TitleBox[row] = titles.slice(0,titles.indexOf("|"));
    TitleBox[row] = TitleBox[row].replace(SlashStr + SlashStr,SlashStr)
    titles = titles.slice(titles.indexOf("|") + 1)
    row++
  }
  TitleBox[row] = titles;
  console.log(TitleBox);
  var winTitle = TitleBox[0];
  var winLabel = TitleBox[1];
  var winQuestion = TitleBox[2];
  var winSend = TitleBox[3];
  var winListTitle = TitleBox[4];
  var winCancel = TitleBox[5];
	var check = { value: false };
  var recipient;
  var TotalAdresses = gCompose.compFields.to
  if (TotalAdresses != "") {
    if (gCompose.compFields.cc != "") {
      TotalAdresses = TotalAdresses + ", " + gCompose.compFields.cc
    }
  } else {
    TotalAdresses = gCompose.compFields.cc
  }
  if (TotalAdresses != "") {
    if (gCompose.compFields.bcc != "") {
      TotalAdresses = TotalAdresses + ", " + gCompose.compFields.bcc
    }
  } else {
    TotalAdresses = gCompose.compFields.bcc
  }
  console.log("About to test: " + TotalAdresses + "*");

  while (TotalAdresses.indexOf(",") > 0) {
    if (TotalAdresses.indexOf("@") > TotalAdresses.indexOf(",")) {
      TotalAdresses = TotalAdresses.slice(TotalAdresses.indexOf("<"))
    }
    recipient = TotalAdresses.slice(0,TotalAdresses.indexOf(","));
    TotalAdresses = TotalAdresses.slice(TotalAdresses.indexOf(",") + 1)

		if (recipient.indexOf(domain) > 0)  {
			controlledRecipients += conSep + recipient; conSep = ", ";
		} else {
			Recipients += Sep + recipient; Sep = ", ";
		}
		}
  if (TotalAdresses.indexOf(domain) > 0)  {
		controlledRecipients += conSep + TotalAdresses; conSep = ", ";
	} else {
		Recipients += Sep + TotalAdresses; Sep = ", ";
	}
  console.log(mySender + " " +domain);
  console.log("Recipients " + Recipients + " controlledRecipients " + controlledRecipients);
  if (mySender.indexOf(domain) > 0) {
  	if (Recipients !== "") {
      console.log("Recipients " + Recipients);
  		winLabel +=  '\n' + winListTitle + '\n' + Recipients + '\n'  + winQuestion + '\n';
  		cancelSend = Services.prompt.confirmEx(win,winTitle,winLabel,Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING +
            Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_IS_STRING +
            Services.prompt.BUTTON_POS_0_DEFAULT,
            winCancel, winSend, null,"", check)
  		}
  	}
  	else {
  	if (controlledRecipients !== "") {
  console.log("controlledRecipients " + controlledRecipients);
  		winLabel +=  '\n' + winListTitle + '\n' + controlledRecipients + '\n' + winQuestion + '\n';
  console.log("Checking");
  		cancelSend = Services.prompt.confirmEx(win,winTitle,winLabel,Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING +
            Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_IS_STRING +
            Services.prompt.BUTTON_POS_0_DEFAULT,
            winCancel, winSend, null,"", check)
  		}
  	}
  console.log("Tried dialog box - cancelSend is " + cancelSend);
  if(!cancelSend) {
  		e.preventDefault();
  	} else {
  switch (e.target.id) {
    case "key_send":
      console.log("KeySend");
      win.SendMessageWithCheck();
      break;
    case "cmd_sendNow":
      console.log("SendNow");
      win.SendMessage();
      break;
    case "key_sendLater":
    case "cmd_sendLater":
      console.log("SendLater");
      win.SendMessageLater();
      break;
    }
}
}
function MailingListFound(ListOfAddresses) {
  while (ListOfAddresses.indexOf(",") > 0) {
    var CurrentAddress = ListOfAddresses.slice(0,ListOfAddresses.indexOf(",") - 1);
    var ListOfAddresses = ListOfAddresses.slice(ListOfAddresses.indexOf(",") + 1)

		if (CurrentAddress.indexOf(",") == 0)  {
			return true
		}

  }
return false
}

function myGetInputElement(row) {
	var win = Services.wm.getMostRecentWindow("msgcompose");
	var document = win.document;
	return document.getElementById("addressCol2#" + row);
}

function myAlertToSendCommand(e,domain,Version,titles) {

  switch (e.target.id) {
    case "key_sendLater":
    case "key_send":
    case "cmd_sendNow":
    case "cmd_sendLater":
      e.stopPropagation();
      myAlertToSend(e,domain,Version,titles);
    case "else" : break;
    }
}
