UseBccInsteadC.UseBccInsteadC =
{
  originalSendMessage: null,
  originalSendMessageWithCheck: null,
  originalSendMessageLater: null,
  prompts: Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),
  rdfs: Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService),
  doNotSend : 0,
  sendWithConversion: 1,
  sendWithoutConversion: 2,
  sound: null,

  init: function()
  {
    // at this time, we work by hooking the global functions below. at some later
    // point, we may wish to respond to events that are delivered when a message
    // is sent. at that time, we would comment the following 3 lines and uncomment
    // the fourth line and the event handler function that follows
    this.originalSendMessage = SendMessage;
    this.originalSendMessageWithCheck = SendMessageWithCheck;
    this.originalSendMessageLater = SendMessageLater;
  //window.addEventListener("compose-send-message", UseBccInsteadC.eventHandler, true);
  },

//eventHandler: function(event)
//{
//  // do not continue unless this is an actual send event
//  if(!(event.msg_type == nsIMsgCompDeliverMode.Now || event.msg_type == nsIMsgCompDeliverMode.Later))
//  {
//    return;
//  }
//
//  if(!UseBccInsteadC.check())
//  {
//    event.preventDefault();
//  }
//},

  confirm: function()
  {
    var title = "UseBccInsteadC - ";
    var message = null;

    var forceNoSend = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.forceNoSend", false);

    if(forceNoSend)
    {
      title += UseBccInsteadC.UseBccInsteadCUtil.getLocalizedString("confirm.NoSendTitle");
      message = UseBccInsteadC.UseBccInsteadCUtil.getLocalizedString("confirm.NoSendMessage");
      this.prompts.alert(window, title, message);
      return false;
    }

    title += UseBccInsteadC.UseBccInsteadCUtil.getLocalizedString("confirm.Title");
    message = UseBccInsteadC.UseBccInsteadCUtil.getLocalizedString("confirm.Message");

    var soundSource = null;

    switch(UseBccInsteadC.UseBccInsteadCUtil.getOsType())
    {
      case "WINNT":
      {
        soundSource = "chrome://usebccinsteadC/content/UseBccAlert.wav";
        break;
      }

      case "Linux":
      case "Darwin":
      {
        // do nothing for now
        break;
      }
    }

    if(null == this.sound)
    {
      this.sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
      this.sound.init();
    }

    var play = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.playSound", false);
    if(play && (null != soundSource))
    {
      this.sound.play(Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI(soundSource, null, null));
    }

    var lastCheckedState = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.lastCheckedState", false);

    var checkedState = {value: lastCheckedState};
    var result = this.prompts.confirmCheck(window, title, message, UseBccInsteadC.UseBccInsteadCUtil.getLocalizedString("confirm.checkLabel"), checkedState);
    if(!result)
    {
      return this.doNotSend;
    }
    else
    {
      if(checkedState.value)
      {
        UseBccInsteadC.UseBccInsteadCUtil.setBoolPref("extensions.usebccinsteadC.lastCheckedState", true);
        return this.sendWithConversion;
      }
      else
      {
        UseBccInsteadC.UseBccInsteadCUtil.setBoolPref("extensions.usebccinsteadC.lastCheckedState", false);
        return this.sendWithoutConversion;
      }
    }
  },

  getAddressBooks: function()
  {
    // search through all of our local address books looking for a match
    if(UseBccInsteadC.UseBccInsteadCUtil.isTB2())
    {
      var parentDir = this.rdfs.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
      return parentDir.childNodes;
    }
    else
    {
      var abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
      return abManager.directories;
    }
  },

  cleanString: function(input)
  {
    var result = input;

    // remove any enclosing quotes
    var len = input.length;
    if((input.charAt(0) == '"') && (input.charAt(len - 1) == '"'))
    {
      result = input.slice(1, len - 1);
    }

    // remove any escaped quotes
    result = result.toString();
    return result;
  },

  splitParts: function(recipient)
  {
    var result = new Array();
    result[0] = null;
    result[1] = null;

    // tb addressees generally have two parts with the second enclosed in <> so
    // split them apart but beware that < and > can be placed in an entry's
    // description so use the last ones found
    var j = recipient.lastIndexOf("<");

    if(j > -1)
    {
      var k = recipient.lastIndexOf(">");
      if((k > -1) && (k > j))
      {
        // extract the two parts
        result[0] = UseBccInsteadC.UseBccInsteadCUtil.trim(recipient.substr(0, (j-1)));
        result[0] = this.cleanString(result[0]);
        result[1] = UseBccInsteadC.UseBccInsteadCUtil.trim(recipient.substr((j+1), (k-j-1)));
        result[1] = this.cleanString(result[1]);
      }
    }
    else
    {
      // we have only one part. this should only be the case of an email address
      // that is NOT on file in an address book
      result[0] = UseBccInsteadC.UseBccInsteadCUtil.trim(recipient);
      result[0] = this.cleanString(result[0]);
    }

    return result;
  },

  isMailingList: function(recipient)
  {
    var abManager = null;
    var parts = this.splitParts(recipient);

    if(UseBccInsteadC.UseBccInsteadCUtil.isTB2())
    {
      abManager = Components.classes["@mozilla.org/addressbook;1"].getService(Components.interfaces.nsIAddressBook);
    }
    else
    {
      abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
    }

    // if there is no mailing list with this name, we can safely conclude this is
    // not a mailing list
    if(!abManager.mailListNameExists(parts[0]))
    {
      return false;
    }

    // there can only be one mailing list with a given name but there can be an
    // address book card and a mailing list that share the same name (damn it).
    // so we have to find out if this recipient refers to a list or a card
    var addressBooks = this.getAddressBooks();

    // we must check each of the address books
    while(addressBooks.hasMoreElements())
    {
      var addrbook = addressBooks.getNext();
      if(addrbook instanceof Components.interfaces.nsIAbDirectory)
      {
        addrbook = addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);

        // look at each element of the collection of mailing lists (if any)
        var count = (UseBccInsteadC.UseBccInsteadCUtil.isTB2()) ? addrbook.addressLists.Count() : addrbook.addressLists.length;
        for(var i = 0; i < count; i++)
        {
          var list = null;

          if(UseBccInsteadC.UseBccInsteadCUtil.isTB2())
          {
            list = addrbook.addressLists.GetElementAt(i).QueryInterface(Components.interfaces.nsIAbDirectory);
          }
          else
          {
            list = addrbook.addressLists.queryElementAt(i, Components.interfaces.nsIAbDirectory);
          }

          // if we find a list with a name that matches the first part, we must check
          // further
          if(list.dirName == parts[0])
          {
            // if the list has no description, then parts one and two will be identical
            // and we can safely conclude we have a matching mailing list
            if((list.description == null) || (list.description == ""))
            {
              if(parts[0] == parts[1])
              {
                return true;
              }
            }
            else
            {
              // if the list does have a desctiption and it matches the second part
              // we can safely conclude we have a matching list
              if(list.description == parts[1])
              {
                return true;
              }
            }
          }
        }
      }
    }

    // if we get here we have not found a matching list in any of the address books
    return false;
  },

  check: function()
  {
    // the options panel ensures that the forceBcc pref value is a boolean value
    // but if the user changes this to a non-boolean value via the prefs file
    // catch it here and enforce a false value
    var forceBcc = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.forceBcc", false);

    var recipients = document.getElementById("addressingWidget");
    if(!recipients)
    {
      return this.sendWithoutConversion;
    }

    var recipientCount = recipients.getRowCount();

    if(UseBccInsteadC.UseBccInsteadCUtil.isTB24())
    {
      var compFieldsBefore = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);

      Recipients2CompFields(compFieldsBefore);
      Recipients2CompFields(gMsgCompose.compFields);

      expandRecipients();

      if((compFieldsBefore.to != gMsgCompose.compFields.to) || (compFieldsBefore.cc != gMsgCompose.compFields.cc))
      {
        return this.confirm();
      }
    }

    if(recipientCount < 1)
    {
      return this.sendWithoutConversion;
    }

    var hasNonBccMailingLists = false;
    var notBccCount = 0;
    for(var i = 0; i < recipientCount; i++)
    {
      var elementId = "addressCol1#" + (i+1);
      var recipientType = document.getElementById(elementId);
      if(recipientType)
      {
        elementId = "addressCol2#" + (i+1);
        var recipientAddr = document.getElementById(elementId);
        var recipient = "";

        if(recipientAddr)
        {
          recipient = UseBccInsteadC.UseBccInsteadCUtil.trim(recipientAddr.value);
        }

        var recipientsOnLine = 0;

        // ignore empty addressing slots
        if("" == recipient)
        {
          continue;
        }
        else
        {
          // and beware of multiple recipients on a single line
          var recipientArray = recipient.split(/[,;]/g);
          for(var j = 0;  j < recipientArray.length; j++)
          {
            if("" != UseBccInsteadC.UseBccInsteadCUtil.trim(recipientArray[j]))
            {
              recipientsOnLine++;
            }
          }
        }

        switch(recipientType.value)
        {
          case "addr_bcc":
          case "addr_newsgroups":
          case "addr_reply":
          case "addr_followup":
          {
            break;
          }

          case "addr_to":
          case "addr_cc":
          {
            // if we are to automatically substitute BCC for TO or CC, do it here
            // and be done with it
            if(forceBcc)
            {
              recipientType.value = "addr_bcc";
              break;
            }

            if(this.isMailingList(recipient))
            {
              hasNonBccMailingLists = true;
            }

            notBccCount += recipientsOnLine;
            break;
          }
        }
      }
    }

    var configuredCount = UseBccInsteadC.UseBccInsteadCUtil.getIntPref("extensions.usebccinsteadC.nonBccCount", 10);
    if(configuredCount < 0)
    {
      configuredCount = 10;
    }

    if(hasNonBccMailingLists || (notBccCount > configuredCount))
    {
      return this.confirm();
    }
    else
    {
      return this.sendWithoutConversion;
    }
  },

  invokeOriginalSend: function(originalSendFunction)
  {
    var result = this.check();
    switch(result)
    {
      case this.sendWithConversion:
      {
        this.performConversion();
        // do not break so we drop through and call the original function
      }

      case this.sendWithoutConversion:
      {
        originalSendFunction();
        break;
      }

      case this.doNotSend:
      default:
      {
        // do nothing
      }
    }
  },

  performConversion: function()
  {
    var recipients = document.getElementById("addressingWidget");
    var recipientCount = recipients.getRowCount();

    for(var i = 0; i < recipientCount; i++)
    {
      var elementId = "addressCol1#" + (i+1);
      var recipientType = document.getElementById(elementId);

      if(recipientType)
      {
        switch(recipientType.value)
        {
          case "addr_to":
          case "addr_cc":
          {
            recipientType.value = "addr_bcc";
            break;
          }

          default:
          {
            // do nothing
          }
        }
      }
    }
  }
}

UseBccInsteadC.UseBccInsteadC.init();

SendMessage = function()
{
  UseBccInsteadC.UseBccInsteadC.invokeOriginalSend(UseBccInsteadC.UseBccInsteadC.originalSendMessage);
}

SendMessageWithCheck = function()
{
  UseBccInsteadC.UseBccInsteadC.invokeOriginalSend(UseBccInsteadC.UseBccInsteadC.originalSendMessageWithCheck);
}

SendMessageLater = function()
{
  UseBccInsteadC.UseBccInsteadC.invokeOriginalSend(UseBccInsteadC.UseBccInsteadC.originalSendMessageLater);
}
