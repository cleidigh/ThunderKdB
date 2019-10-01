UseBccInsteadCStateListener.prototype =
{
  prompts: Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),

  NotifyComposeFieldsReady: function()
  {
    // we use this to work-around the fact that TB caches compose windows
    // and so the onLoad event does not always get executed. jeeze!
    UseBccInsteadC.ComposeWindowOverlay.readyToolbarButton();
  },

  NotifyComposeBodyReady: function()
  {
    var origMsgHdr = null;

    if((gMsgCompose.type == Components.interfaces.nsIMsgCompType.ReplyAll) || (gMsgCompose.type == Components.interfaces.nsIMsgCompType.Template))
    {
      origMsgHdr = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger).msgHdrFromURI(gMsgCompose.originalMsgURI);
    }

    // check to see if we are doing a reply all or an edit as new to a message originally sent to us via BCC but there are other
    // recipients that are CC or TO
    if((gMsgCompose.type == Components.interfaces.nsIMsgCompType.ReplyAll) ||
      ((gMsgCompose.type == Components.interfaces.nsIMsgCompType.Template) && ((origMsgHdr.folder.flags & 4194304) == 0) && (("" != gMsgCompose.compFields.to) || ("" != gMsgCompose.compFields.cc))))
    {
      var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
      for(var i = 0; i < UseBccInsteadC.UseBccInsteadCUtil.getArrayCount(acctMgr.accounts); i++)
      {
        var account = UseBccInsteadC.UseBccInsteadCUtil.getArrayElement(acctMgr.accounts, i, Components.interfaces.nsIMsgAccount);
        if(account.key ==  origMsgHdr.accountKey)
        {
          // if the following test is true, then we were BCC'ed since the original receiving email is
          // not in either the recipients (TO) or CC list
          if(origMsgHdr.recipients.indexOf(account.defaultIdentity.email) == -1 &&
             origMsgHdr.ccList.indexOf(account.defaultIdentity.email) == -1)
          {
            var title = "UseBccInsteadC - ";
            var message = null;
            title += UseBccInsteadC.UseBccInsteadCUtil.getLocalizedString("confirm.UseCautionTitle");
            message = UseBccInsteadC.UseBccInsteadCUtil.getLocalizedString("confirm.UseCautionMessage");
            this.prompts.alert(window, title, message);
          }

          break;
        }
      }
    }

    if(UseBccInsteadC.ComposeWindowOverlay.isNewMessage())
    {
      var whatToDo = UseBccInsteadC.UseBccInsteadCUtil.getIntPref("extensions.usebccinsteadC.defaultNewMsgMode", -1);
      if(-1 != whatToDo)
      {
        UseBccInsteadC.ComposeWindowOverlay.changeAllRecipientsTo(whatToDo);
      }
    }

  //var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
  //var windows = ww.getWindowEnumerator();
  //
  //while(windows.hasMoreElements())
  //{
  //  var aWindow = windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
  //  if((aWindow.document.documentURI == "chrome://messenger/content/messenger.xul") ||
  //    (aWindow.document.documentURI == "chrome://messenger/content/messageWindow.xul"))
  //  {
  //    var label = aWindow.document.getElementById("UseBccInsteadCWhatToDo");
  //
  //    if(!label)
  //    {
  //      continue;
  //    }
  //
  //    var whatToDo = parseInt(label.value);
  //
  //    if(whatToDo != UseBccInsteadC.UseBccInsteadCUtil.NOTHING)
  //    {
  //      UseBccInsteadC.ComposeWindowOverlay.changeAllRecipientsTo(whatToDo);
  //      label.value = UseBccInsteadC.UseBccInsteadCUtil.NOTHING;
  //      return;
  //    }
  //  }
  //}
  },

  ComposeProcessDone: function(aResult)
  {
  },

  SaveInFolderDone: function(folderURI)
  {
  }
}

UseBccInsteadC.ComposeWindowOverlay =
{
  missingToolbarButton: false,
  originalFunction: null,

  init: function()
  {
    if(!UseBccInsteadC.ComposeWindowOverlay.originalFunction)
    {
      UseBccInsteadC.ComposeWindowOverlay.originalFunction = awAddRecipient;
    }
  },

  onToolboxCustomizeStart: function(event)
  {
    if(event.target == document.getElementById("compose-toolbox"))
    {
      // if our button is missing in its toolbox, note that this was the case
      // at the beginning of the customization
      if(null == document.getElementById("UseBccInsteadCComposeToolbarButton"))
      {
        UseBccInsteadC.ComposeWindowOverlay.missingToolbarButton = true;
      }
      else
      {
        UseBccInsteadC.ComposeWindowOverlay.missingToolbarButton = false;
      }
    }
  },

  onToolboxCustomizeEnd: function(event)
  {
    if(event.target == document.getElementById("compose-toolbox"))
    {
      if(null != document.getElementById("UseBccInsteadCComposeToolbarButton"))
      {
        if(UseBccInsteadC.ComposeWindowOverlay.missingToolbarButton == true)
        {
          UseBccInsteadC.ComposeWindowOverlay.readyToolbarButton();
          UseBccInsteadC.ComposeWindowOverlay.missingToolbarButton = false;
        }
      }
    }
  },

  onLoad: function()
  {
    // remove to avoid duplicate initialization
    removeEventListener("load", UseBccInsteadC.ComposeWindowOverlay.onLoad, true);

  //var widget = document.getElementById("taskPopup");
    var widget = document.getElementById("optionsMenuPopup");
    widget.addEventListener("popupshowing", UseBccInsteadC.ComposeWindowOverlay.onMenuPopup, false);

    widget = document.getElementById("msgComposeContext");
    widget.addEventListener("popupshowing", UseBccInsteadC.ComposeWindowOverlay.onContextMenuPopup, false);

  //widget = document.getElementById("UseBccInsteadCComposeToolbarButtonMenu");
  //widget.addEventListener("popupshowing", UseBccInsteadC.ComposeWindowOverlay.onToolbarButtonMenuPopup, false);

    // only works on TB 3.3 + so on earlier versions we have an ugly hack.
    // see UseBccInsteadCOnCustomizeClose() below and how it is called from
    // CustomizeToolbarWindowOverlay
    if(UseBccInsteadC.UseBccInsteadCUtil.isTB3_3())
    {
      window.addEventListener("beforecustomization", UseBccInsteadC.ComposeWindowOverlay.onToolboxCustomizeStart, false);
      window.addEventListener("aftercustomization", UseBccInsteadC.ComposeWindowOverlay.onToolboxCustomizeEnd, false);
    }
  },

  isUnaddressed: function()
  {
    // we define an unaddressed message as one having only a single, blank recipient but
    // we ignore reply-to recipients
    var numRecipients = UseBccInsteadC.ComposeWindowOverlay.getNumRecipients();
    var numRealRecipients = 0;
    for(var i = 0; i < numRecipients; i++)
    {
      var elementId = "addressCol1#" + (i+1);
      var recipientType = document.getElementById(elementId);
      if(recipientType)
      {
        switch(recipientType.value)
        {
          case "addr_reply":
          {
            // ignore these
            break;
          }

          case "":
          case "addr_to":
          {
            elementId = "addressCol2#" + (i+1);
            var recipientAddr = document.getElementById(elementId);
            if("" != UseBccInsteadC.UseBccInsteadCUtil.trim(recipientAddr.value))
            {
              return false;
            }
            else
            {
              numRealRecipients++;
            }

            break;
          }

          default:
          {
            return false;
          }
        }
      }
    }

    if(numRealRecipients > 1)
    {
      return false;
    }

    return true;
  },

  isNewMessage: function()
  {
    switch(gMsgCompose.type)
    {
      // these are always considered "new" messages even though mail to url will have an addressed
      // recipient from the mailto: link
      case Components.interfaces.nsIMsgCompType.New:
      case Components.interfaces.nsIMsgCompType.MailToUrl:
      case Components.interfaces.nsIMsgCompType.ForwardAsAttachment:
      case Components.interfaces.nsIMsgCompType.ForwardInline:
      {
        return true;
      }

      // these are considered "new" messages only if there are no existing recipients, save any
      // reply-to's
      case Components.interfaces.nsIMsgCompType.Draft:
      case Components.interfaces.nsIMsgCompType.Template:
      {
        if(UseBccInsteadC.ComposeWindowOverlay.isUnaddressed())
        {
          return true;
        }
      }

      default:
      {
        // do nothing
      }
    }

    return false;
  },

  onToolbarButtonMenuPopup: function(event)
  {
    var enabled = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.enableChangeAll", true);
    var menu = document.getElementById("UseBccInsteadCComposeToolbarButtonMenu");
    menu.setAttribute("hidden", !enabled);
  },

  onMenuPopup: function()
  {
    var enabled = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.enableChangeAll", true);
    var menu = document.getElementById("UseBccInsteadCReaddressMenu");
    menu.setAttribute("hidden", !enabled);
  },

  onContextMenuPopup: function()
  {
    var enabled = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.enableChangeAll", true);
    var menu = document.getElementById("UseBccInsteadCReaddressContextMenu");
    menu.setAttribute("hidden", !enabled);
  },

  getNumRecipients: function()
  {
    var recipients = document.getElementById("addressingWidget");
    return recipients.getRowCount();
  },

  readyToolbarButton: function()
  {
    var widget = document.getElementById("UseBccInsteadCComposeToolbarButton");

    // the button may not be shown on the window
    if(widget)
    {
      var enabled = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.enableChangeAll", true);

      if(!enabled)
      {
        widget.setAttribute("disabled", true);
      }
      else
      {
        widget.setAttribute("disabled", false);
      }
    }
  },

  changeAllRecipientsTo: function(toWhat)
  {
    var recipientCount = UseBccInsteadC.ComposeWindowOverlay.getNumRecipients();

    for(var i = 0; i < recipientCount; i++)
    {
      var elementId = "addressCol1#" + (i+1);
      var recipientType = document.getElementById(elementId);
      if(recipientType)
      {
        switch(recipientType.value)
        {
          case "addr_newsgroups":
          case "addr_reply":
          case "addr_followup":
          {
            break;
          }

          case "addr_bcc":
          case "addr_to":
          case "addr_cc":
          {
            switch(toWhat)
            {
              case UseBccInsteadC.UseBccInsteadCUtil.TO:
              {
                recipientType.value = "addr_to";
                break;
              }

              case UseBccInsteadC.UseBccInsteadCUtil.CC:
              {
                recipientType.value = "addr_cc";
                break;
              }

              case UseBccInsteadC.UseBccInsteadCUtil.BCC:
              {
                recipientType.value = "addr_bcc";
                break;
              }
            }
          }
        }
      }
    }
  }
}


function UseBccInsteadCStateListener()
{
}

function UseBccInsteadCOnCustomizeClose()
{
  // on TB 3.3 +, we are using events so this is not needed
  if(!UseBccInsteadC.UseBccInsteadCUtil.isTB3_3())
  {
    UseBccInsteadC.ComposeWindowOverlay.readyToolbarButton();
  }
}

UseBccInsteadC.ComposeWindowOverlay.init();

awAddRecipient = function(recipientType, address)
{
  // if the reply-to if being fiddled, just let TB do its normal thing. this can happen when
  // the user changes the account from which the email is being sent and that account has a
  // reply-to configured
  if(recipientType == "addr_reply")
  {
    UseBccInsteadC.ComposeWindowOverlay.originalFunction(recipientType, address);
    return;
  }

  var onDoubleClickHandler = (UseBccInsteadC.UseBccInsteadCUtil.isTB2()) ? "contactsListDoubleClick" : "contactsListOnClick";
  var whoCalled = awAddRecipient.caller;

  // check up the call stack to see if we were invoked via a double-click
  while(whoCalled != null)
  {
    // are we being called by the routine that splits multiple addresses on a single line
    if(whoCalled.name == "")
    {
      // if so, stop here
      break;
    }

    // are we being called by the Contacts Sidebar double click handler
    if(whoCalled.name == "csAddSelectedAddresses")
    {
      // if so, stop here
      break;
    }

    // are we being called by the standard contacts list double click handler
    if(whoCalled.name == onDoubleClickHandler)
    {
      // if so, stop here
      break;
    }

    // otherwise continue checking up the call stack
    whoCalled = whoCalled.caller;
  }

  var whatToDo = UseBccInsteadC.UseBccInsteadCUtil.getIntPref("extensions.usebccinsteadC.defaultNewMsgMode", 0);
  var newRecipientType = recipientType;

  switch(whatToDo)
  {
    case UseBccInsteadC.UseBccInsteadCUtil.CC:
    {
      newRecipientType = "addr_cc";
      break;
    }

    case UseBccInsteadC.UseBccInsteadCUtil.BCC:
    {
      newRecipientType = "addr_bcc";
      break;
    }

    default:
    {
      // do nothing
    }
  }

   // if we are invoked via double click (standard or Contacts Sidebar) or the splitting of multiple
   // addresses on a single line
  if(whoCalled)
  {
    // so employ what the user has set in the options
    UseBccInsteadC.ComposeWindowOverlay.originalFunction(newRecipientType, address);

    // this is what replaces the hard-coded To: on the newly added, empty entry
    awSetInputAndPopupValue(awGetInputElement(top.MAX_RECIPIENTS), "", awGetPopupElement(top.MAX_RECIPIENTS), newRecipientType, top.MAX_RECIPIENTS);
  }
  else
  {
    // use what is sent to us by the button/menu that invoked us
    UseBccInsteadC.ComposeWindowOverlay.originalFunction(recipientType, address);

    // this is what replaces the hard-coded To: on the newly added, empty entry
    awSetInputAndPopupValue(awGetInputElement(top.MAX_RECIPIENTS), "", awGetPopupElement(top.MAX_RECIPIENTS), recipientType, top.MAX_RECIPIENTS);
  }
}

window.addEventListener("load", UseBccInsteadC.ComposeWindowOverlay.onLoad, true);
window.addEventListener("compose-window-init", function (event)
{
  gMsgCompose.RegisterStateListener(new UseBccInsteadCStateListener());
},
true);
