Components.utils.import("resource://gre/modules/Services.jsm");

UseBccInsteadC.createDbObserver =
{
  // Components.interfaces.nsIObserver
  observe: function(aMsgFolder, aTopic, aData)
  {
    UseBccInsteadC.createDbObserver.addCustomColumnHandler();
  },

  addCustomColumnHandler: function()
  {
    gDBView.addColumnHandler("colExtendedRecipients", UseBccInsteadC.extendedRecipientsColumnHandler);
  }
}

UseBccInsteadC.extendedReipientsColumn =
{
  headerParser: Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser),

  // this will be populated with the string TB optionally places in emails having only BCC recipients
  undisclosedString: null,

  buildCellResultString: function(messageHdr)
  {
    var author = messageHdr.author;
    var toRecipients = messageHdr.recipients;
    var ccRecipients = messageHdr.ccList;
    var bccRecipients = messageHdr.bccList;

    // if there are TO recipients that are NOT the string TB optionally uses or the author string which TB uses
    // if the optional string is NOT employed, return those
    if((toRecipients) && (toRecipients != "") && (!toRecipients.match(UseBccInsteadC.extendedReipientsColumn.undisclosedString)) && (toRecipients != author))
    {
      return UseBccInsteadC.extendedReipientsColumn.prettyUpResults(toRecipients);
    }

    // otherwise, if there are CC recipients, return those
    if((ccRecipients) && (ccRecipients != ""))
    {
      return UseBccInsteadC.extendedReipientsColumn.prettyUpResults(ccRecipients);
    }

    // otherwise, if there are BCC recipients, return those
    if((bccRecipients) && (bccRecipients != ""))
    {
      return UseBccInsteadC.extendedReipientsColumn.prettyUpResults(bccRecipients);
    }

    // not sure what else to do if we get here, so return a blank string
    return "";
  },

  prettyUpResults: function(emailAddresses)
  {
    var addressesOnly = new Object();
    var namesOnly = new Object();
    var fullResults = new Object();
    var entryCount = 0;

    // the input string should be comma-separated email addresses, some of which will have both names
    // and email addresses. break up the string into its components
    entryCount = UseBccInsteadC.extendedReipientsColumn.headerParser.parseHeadersWithArray(emailAddresses, addressesOnly, namesOnly, fullResults);

    var result = "";

    // go through the arrays of results giving prefereance to displaying the name, if any, over the
    // email address. this is what TB seems to do in the normal, recipient column we hope to replace.
    // this result is not perfect in all cases but it is close enough
    for(var i = 0; i < entryCount; i++)
    {
      var str = "";
      if((namesOnly.value[i]) && (namesOnly.value[i] != ""))
      {
        str = namesOnly.value[i];
      }
      else
      {
        str = addressesOnly.value[i];
      }

      if(str.indexOf(',') >= 0)
      {
        str = "\"" + str + "\"";
      }

      if(i > 0)
      {
        result += ",";
      }

      result += str;
    }

    return result;
  },

  // just used for research
  enumProperties: function(message)
  {
    var e = message.propertyEnumerator;
    while(e.hasMore())
    {
      var name = e.getNext();
      dump("Property : " + name + " value: " + message.getProperty(name) + "\n");
    }
  },

  onLoad: function()
  {
    // remove to avoid duplicate initialization
    var s = "";

    removeEventListener("load", UseBccInsteadC.extendedReipientsColumn.onLoad, true);

    // get the string that TB will use if it places the optional TO header for emails with only BCC recipients.
    // note: this will also work if the user has created a custom string as described at http://forums.mozillazine.org/viewtopic.php?p=4882345
// Changed for TB 63
//    var stringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
//    var bundle = stringBundleService.createBundle("chrome://messenger/locale/messengercompose/composeMsgs.properties");
    var bundle = Services.strings.createBundle("chrome://messenger/locale/messengercompose/composeMsgs.properties");

    if(UseBccInsteadC.UseBccInsteadCUtil.isTB31())
    {
      s = bundle.GetStringFromName("undisclosedRecipients");
    }
    else
    {
      s = bundle.GetStringFromName("12566");
    }

    UseBccInsteadC.extendedReipientsColumn.undisclosedString = new RegExp("^" + s + "\: *;$");

    // listen for creation of DB views
    var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(UseBccInsteadC.createDbObserver, "MsgCreateDBView", false);
  }
}

window.addEventListener("load", UseBccInsteadC.extendedReipientsColumn.onLoad, false);
