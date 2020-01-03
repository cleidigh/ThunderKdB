var dispMUA =
{
  bundle: null,
  Info: {},
  arDispMUAOverlay: new Array(),
  strOverlayFilename: "dispMuaOverlay.csv",
  arDispMUAAllocation: {},
}

dispMUA.StreamListener =
{
  content: "",
  found: false,
  //onDataAvailable: (request, context, inputStream, offset, count) =>
  //The onDataAvailable method lost its context argument. This was removed in bug 1525319 which breaks the API.
  //https://bugzilla.mozilla.org/show_bug.cgi?id=1525319
  onDataAvailable: (request, inputStream, offset, count) =>
  {
    try
    {
      var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
      sis.init(inputStream);

      if (!this.found)
      {
        this.content += sis.read(count);
        this.content = this.content.replace(/\r/g, "");
        var pos = this.content.indexOf("\n\n");

        if (pos > -1)
        {
          // last header line must end with LF -> pos+1 !!!
          this.content = this.content.substr(0, pos + 1);
          this.found = true;
        }
      }
    }
    catch(ex) { }
  },
  //onStartRequest: (request, context) =>
  onStartRequest: (request) =>
  {
    this.content = "";
    this.found = false;
  },
  //onStopRequest: (aRequest, aContext, aStatusCode) =>
  onStopRequest: (aRequest, aStatusCode) =>
  {
    dispMUA.headers = Components.classes["@mozilla.org/messenger/mimeheaders;1"].createInstance(Components.interfaces.nsIMimeHeaders);
    dispMUA.headers.initialize(this.content, this.content.length);
    dispMUA.headerdata = this.content;
    dispMUA.searchIcon("");
  }
}

dispMUA.loadHeaderData = () =>
{
  dispMUA.Info["STRING"] = "";
  dispMUA.setInfo(false, []);
  dispMUA.showInfo();
  var msgURI = null;

  if (gDBView)
  {
    msgURI = gDBView.URIForFirstSelectedMessage;
  }

  if (msgURI == null)
  {
    return;
  }

  var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
  var msgService = messenger.messageServiceFromURI(msgURI);
  msgService.CopyMessage(msgURI, dispMUA.StreamListener, false, null, msgWindow, {});
}

dispMUA.getHeader = (key) =>
{
  var value = dispMUA.headers.extractHeader(key, false);

  if (value == null)
  {
    value = "";
  }

  value = value.replace(/\s+/g, " ");
  return(value);
}

dispMUA.searchIcon = (strUserAgent) =>
{
  if (!strUserAgent)
  {
    strUserAgent = dispMUA.getHeader("user-agent");
  }

  if (!strUserAgent)
  {
    strUserAgent = dispMUA.getHeader("x-mailer");

    if (!strUserAgent)
    {
      strUserAgent = dispMUA.getHeader("x-newsreader");
    }
  }

  var strExtra = "";

  if (dispMUA.getHeader("x-bugzilla-reason"))
  {
    strExtra = "bugzilla";
  }
  else if (dispMUA.getHeader("x-php-bug"))
  {
    strExtra = "phpbug";
  }
  //not good. If not found and an Office 365 user, the icon will be Office 365
  else if (/*dispMUA.getHeader("x-ms-office365-filtering-correlation-id") &&
           dispMUA.getHeader("x-ms-publictraffictype"))*/
           // thanks silversonic https://twitter.com/silversonicboom
           (dispMUA.getHeader("X-MS-Exchange-CrossTenant-fromentityheader").toLowerCase() == "hosted" &&
            dispMUA.getHeader("X-MS-Exchange-CrossTenant-mailboxtype").toLowerCase() == "hosted") ||
           (dispMUA.getHeader("X-MS-Exchange-CrossTenant-fromentityheader").toLowerCase() == "hosted" &&
            dispMUA.getHeader("X-MS-Exchange-Transport-CrossTenantHeadersStamped") != "")
          )
  {
    strExtra = "o365";
  }
  else if (dispMUA.getHeader("X-Correlation-ID"))
  {
    if (dispMUA.getHeader("X-Correlation-ID") == dispMUA.getHeader("Message-ID"))
      strExtra = "fairemail" ;
  }

  strUserAgent = strUserAgent.replace(/(^\s+)|(\s+$)/g, "");
  dispMUA.Info["STRING"] = "";
  dispMUA.setInfo(false, []);

  if (strUserAgent != "")
  {
    dispMUA.Info["STRING"] = strUserAgent;
    var lower = strUserAgent.toLowerCase();

    //user overlay array
    for (let key in dispMUA.arDispMUAOverlay)
    {
      if (lower.indexOf(key) > -1)
      {
        //an overlay icon already has the full path in it, including the protocol
        dispMUA.Info["PATH"] = "";
        dispMUA.Info["ICON"] = dispMUA.arDispMUAOverlay[key];
        //that the user knows he made the crap
        dispMUA.Info["STRING"] = strUserAgent + "\n" +
                                 "User override icon" + "\n" +
                                 "Key: " + key + "\n" +
                                 "Icon: " + dispMUA.Info["ICON"];
        dispMUA.Info["FOUND"] = true;
        break ;
      }
    }

    if (!dispMUA.Info["FOUND"])
    {
      for (let key in dispMUA.arDispMUAAllocation["fullmatch"])
      {
        if (lower == key)
        {
          dispMUA.setInfo(true, dispMUA.arDispMUAAllocation["fullmatch"][key]);
          break;
        }
      }
    }

    if (!dispMUA.Info["FOUND"])
    {
      dispMUA.scan("presearch", strUserAgent);
    }

    if (!dispMUA.Info["FOUND"])
    {
      var chLetter = lower.substr(0, 1);

      if (dispMUA.arDispMUAAllocation[chLetter])
      {
        for (let key in dispMUA.arDispMUAAllocation[chLetter])
        {
          if (lower.substr(0, key.length) == key)
          {
            dispMUA.setInfo(true, dispMUA.arDispMUAAllocation[chLetter][key]);
            break;
          }
        }
      }
    }

    if (!dispMUA.Info["FOUND"])
    {
      dispMUA.scan("postsearch", strUserAgent);
    }

    if (!dispMUA.Info["FOUND"])
    {
      dispMUA.Info["ICON"] = "unknown.png";
    }

    if (dispMUA.Info["ICON"] == "thunderbird.png")
    {
      if (lower.indexOf("; linux") > -1)
      {
        dispMUA.Info["ICON"] = "thunderbird-linux.png";
      }
      else if ((lower.indexOf("(windows") > -1) || (lower.indexOf("; windows") > -1))
      {
        dispMUA.Info["ICON"] = "thunderbird-windows.png";
      }
      else if ((lower.indexOf("(macintosh") > -1) || (lower.indexOf("; intel mac") > -1) || (lower.indexOf("; ppc mac") > -1))
      {
        dispMUA.Info["ICON"] = "thunderbird-mac.png";
      }
      else if (lower.indexOf("; sunos") > -1)
      {
        dispMUA.Info["ICON"] = "thunderbird-sunos.png";
      }
      else if (lower.indexOf("; freebsd") > -1)
      {
        dispMUA.Info["ICON"] = "thunderbird-freebsd.png";
      }
      else if (lower.indexOf("(x11") > -1)
      {
        dispMUA.Info["ICON"] = "thunderbird-x11.png";
      }
    }
  }
  else if (strExtra != "")
  {
    if (strExtra == "bugzilla")
    {
      dispMUA.Info["ICON"] = "bugzilla.png";
      dispMUA.Info["STRING"] = "X-Bugzilla-Reason";
      dispMUA.Info["FOUND"] = true;
    }
    else if (strExtra == "phpbug")
    {
      dispMUA.Info["ICON"] = "bug.png";
      dispMUA.Info["STRING"] = "X-PHP-Bug";
      dispMUA.Info["FOUND"] = true;
    }
    else if (strExtra == "o365")
    {
      dispMUA.Info["ICON"] = "o365outlook.png";
      dispMUA.Info["STRING"] = "Office 365 Outlook";
      dispMUA.Info["URL"] = "https://outlook.com";
      dispMUA.Info["FOUND"] = true;
    }
    else if (strExtra == "fairemail")
    {
      dispMUA.Info["ICON"] = "fairemail.png";
      dispMUA.Info["STRING"] = "FairEmail";
      dispMUA.Info["URL"] = "https://email.faircode.eu/";
      dispMUA.Info["FOUND"] = true;
    }
  }
  else if (dispMUA.getHeader("organization") != "")
  {
    dispMUA.getInfo("Organization", "organization");
  }
  else if (dispMUA.getHeader("x-mimeole") != "")
  {
    dispMUA.getInfo("X-MimeOLE", "x-mimeole");
  }
  else if (dispMUA.getHeader("message-id") != "")
  {
    dispMUA.getInfo("Message-ID", "message-id");
  }
  if (dispMUA.Info["ICON"] == "empty.png" && dispMUA.getHeader("DKIM-Signature") != "")
  {
    dispMUA.getInfo("DKIM-Signature", "dkim-signature");
  }

  dispMUA.showInfo();
}

dispMUA.scan = (index, value) =>
{
  var lower = value.toLowerCase();

  for (let key in dispMUA.arDispMUAAllocation[index])
  {
    if (lower.indexOf(key) > -1)
    {
      dispMUA.setInfo(true, dispMUA.arDispMUAAllocation[index][key]);
      break;
    }
  }
}

dispMUA.getInfo = (header) =>
{
  var index = header.toLowerCase();
  var value = dispMUA.getHeader(index);
  dispMUA.Info["STRING"] = header + ": " + value;
  dispMUA.scan(index, value);

  if (dispMUA.Info["NAME"])
  {
    dispMUA.Info["STRING"] = dispMUA.Info["NAME"] + "\n" + dispMUA.Info["STRING"];
  }
}

dispMUA.setInfo = (found, info) =>
{
  dispMUA.Info["FOUND"] = found;
  dispMUA.Info["PATH"] = "chrome://dispmua/content/48x48/";
  dispMUA.Info["ICON"] = "empty.png";
  dispMUA.Info["URL"] = "";
  dispMUA.Info["NAME"] = "";

  if (info[0])
  {
    dispMUA.Info["ICON"] = info[0];
  }

  if (info[1])
  {
    dispMUA.Info["URL"] = info[1];
  }

  if (info[2])
  {
    dispMUA.Info["NAME"] = info[2];
  }
}

dispMUA.showInfo = () =>
{
  var strTooltip = dispMUA.Info["STRING"];
  var pos = strTooltip.indexOf("\n");

  if (pos != -1)
  {
    strTooltip = dispMUA.Info["STRING"].substr(0, pos);
  }

  var elem = document.getElementById("dispMUAbroadcast");

  if (elem == null)
  {
    elem = document.getElementById("dispMUAicon");
  }

  elem.setAttribute("src", dispMUA.Info["PATH"] + dispMUA.Info["ICON"]);
  elem.setAttribute("tooltiptext", strTooltip);
  elem.setAttribute("image", dispMUA.Info["PATH"] + dispMUA.Info["ICON"]); //feat of strength
  elem.setAttribute("title", strTooltip); //feat of strength
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
  var iconPosition;
  try {
    iconPosition = prefs.getBoolPref("extensions.dispMUA.iconPosition");
  } catch (e) {
    iconPosition = false;
  }
  elem.setAttribute("iconPosition", iconPosition ? "left" : "right");
  var mini = document.getElementById("dispMUAicon-mini");

  if (mini)
  {
    mini.src = elem.src;
    mini.setAttribute("tooltiptext", strTooltip);
    mini.image = elem.image; //feat of strength
    mini.setAttribute("title", strTooltip); //feat of strength
    mini.setAttribute("iconPosition", elem.getAttribute("iconPosition"));
  }
  dispMUA.changeIconPosition(iconPosition);
}

/*
*  change icon position
*  iconPosition: true = lest, false = right(default)
*/
dispMUA.changeIconPosition = (iconPosition) =>
{
  var dispMUAelem = document.getElementById("dispMUA");
  var cohe = document.getElementById("CompactHeader_collapsedHeaderView");
  if (iconPosition)
  {
    document.getElementById("expandedHeadersBottomBox").insertBefore(document.getElementById("dispMUA"), document.getElementById("expandedHeaders2"));
    if (cohe) {
      document.getElementById("CompactHeader_collapsedHeaderView").insertBefore(document.getElementById("CompactHeader_dispMUA2line"), document.getElementById("CompactHeader_copyPopup"));
      //document.getElementById("CompactHeader_collapsedHeaderView").insertBefore(document.getElementById("CompactHeader_dispMUAcompact"), document.getElementById("CompactHeader_copyPopup"));
      document.getElementById("expandedHeadersBottomBox").insertBefore(document.getElementById("CompactHeader_dispMUAexp"), document.getElementById("expandedHeaders2"));
    }
  } else {
    document.getElementById("expandedHeadersBottomBox").insertBefore(document.getElementById("dispMUA"), document.getElementById("otherActionsBox"));
    if (cohe) {
      document.getElementById("CompactHeader_collapsedHeaderView").appendChild(document.getElementById("CompactHeader_dispMUA2line"));
      //document.getElementById("CompactHeader_collapsedHeaderView").appendChild(document.getElementById("CompactHeader_dispMUAcompact"));
      document.getElementById("expandedHeadersBottomBox").appendChild(document.getElementById("CompactHeader_dispMUAexp"));
    }
  }
}

/*
*  load a data file now based on JSON
*/
dispMUA.loadJSON = (fname) =>
{
  var req = new XMLHttpRequest();
  req.open("GET", "chrome://dispmua/content/" + fname , true);
  req.overrideMimeType("text/plain; charset=x-user-defined");

  req.onreadystatechange = (aEvt) =>
  {
    if (req.readyState == 4)
    {
      dispMUA.arDispMUAAllocation = JSON.parse(req.responseText);
    }
  }

  req.send(null);
}

/*
*  loads the user agent overlay file in which users can define their own icons
*
*  The overlay file has a semi-csv format.
*  - On every line, there have to be two strings, split by a comma ","
*  - The first string is the *lowercase* search string which shall match the user agent
*  - The second is the absolute path to the icon
*  If the search string shall include a comma itself, you can quote it.
*    So >"money,inc",/data/icons/money.png< would match the user agent
*    >Mail by Money,Inc. at Cayman Islands< but not >Moneymaker mailer<
*  There is no check for a third (or higher) column, so everything
*    behind the comma is used as the filename.
*  The filename may be quoted as well.
*/
dispMUA.loadMUAOverlayFile = () =>
{
  var istream;

  try
  {
    var service = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
    var file = service.get("ProfD", Components.interfaces.nsIFile);
    file.append(dispMUA.strOverlayFilename);
    istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
    istream.init(file, 0x01, 0444, 0);
    istream.QueryInterface(Components.interfaces.nsILineInputStream);
  }
  catch(e)
  {
    return;
  }

  var line = {}, hasmore;
  var strLine, nEndQuote, nCommaPos;
  var strKey, strValue;

  do
  {
    hasmore = istream.readLine(line);
    strLine = line.value;

    if (strLine.substr(0, 1) == "#")
    {
      //comment
      continue;
    }

    if (strLine.substr(0, 1) == "\"")
    {
      //with quotes
      //find end quote
      nEndQuote = strLine.indexOf("\"", 2);

      if (nEndQuote == -1)
      {
        //no endquote? Bad line!
        continue;
      }

      nCommaPos = strLine.indexOf(",", nEndQuote);
    }
    else
    {
      //no quote
      nCommaPos = strLine.indexOf(",");
    }

    if (nCommaPos == -1)
    {
      //no comma? Bad line!
      continue;
    }

    strKey = dispMUA.stripSurroundingQuotes(strLine.substr(0, nCommaPos));
    strValue = dispMUA.stripSurroundingQuotes(strLine.substr(nCommaPos + 1));
    dispMUA.arDispMUAOverlay[strKey] = strValue;
  }
  while(hasmore);

  istream.close();
}

dispMUA.stripSurroundingQuotes = (string) =>
{
  if (string.substr(0, 1) == "\"" && string.substr(string.length - 1) == "\"")
  {
    string = string.substr(1);
    string = string.substr(0, string.length - 1);
  }

  return(string);
}

dispMUA.checktext = () =>
{
  var selectedText = dispMUA.checktextGetSelectedText();
  dispMUA.searchIcon(selectedText);
}

dispMUA.checktextPopup = () =>
{ 
  var selectedText = dispMUA.checktextGetSelectedText();
  var elem = document.getElementById("dispmua-checktext");
  elem.hidden = true;
       
  if (selectedText != "")
  {
    if (selectedText.length > 18)
    {
      selectedText = selectedText.substr(0, 14) + "...";
    }

    var menuText = "dispMUA: \"" + selectedText + "\"";
    elem.setAttribute ("label", menuText);
    elem.hidden = false;
  }
}

dispMUA.checktextGetSelectedText = () =>
{ 
  var node = document.popupNode;
  var selection = "";

  if ((node instanceof HTMLTextAreaElement) || (node instanceof HTMLInputElement && node.type == "text"))
  {
    selection = node.value.substring(node.selectionStart, node.selectionEnd);
  }
  else
  {
    var focusedWindow = new XPCNativeWrapper(document.commandDispatcher.focusedWindow, "document", "getSelection()");
    selection = focusedWindow.getSelection().toString();
  }

  selection = selection.replace(/(^\s+)|(\s+$)/g, "");
  return(selection);
}

dispMUA.infopopup = () =>
{
  if ( dispMUA.Info["STRING"] == "" )
  {
    //alert ( dispMUA.bundle.getString ( "dispMUA.NoUserAgent" ) ) ;
    alert(dispMUA.bundle.GetStringFromName("dispMUA.NoUserAgent"));
  }
  else if (dispMUA.Info["ICON"] == "empty.png")
  {
  }
  else
  {
    var param = new Array(
      dispMUA.Info["PATH"] + dispMUA.Info["ICON"],
      dispMUA.Info["STRING"],
      "#990000",
      //dispMUA.bundle.getString ( "dispMUA.NOTsupported" ) ,
      dispMUA.bundle.GetStringFromName("dispMUA.NOTsupported"),
      dispMUA.Info["URL"],
      dispMUA.headerdata
    ) ;

    if (dispMUA.Info["FOUND"])
    {
      param[2] = "#008800";
      //param[3] = dispMUA.bundle.getString ( "dispMUA.supported" ) ;
      param[3] = dispMUA.bundle.GetStringFromName("dispMUA.supported");
    }

    window.openDialog("chrome://dispmua/content/feedback.xul",
      "feedback", "chrome=yes,centerscreen",
      param[0], param[1], param[2], param[3], param[4], param[5]);
  }
}
