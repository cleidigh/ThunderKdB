var dispMUA =
{
  loaded: null,
  Info: {},
  //arDispMUAOverlay: new Array(),
  arDispMUAAllocation: {},
  identityId: null
}

dispMUA.getHeader = (key) =>
{
  //var value = dispMUA.headers.extractHeader(key, false);
  var value = dispMUA.headers[key];

  if (value == null) value = "";
  else value = value.toString();

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
      strUserAgent = dispMUA.getHeader("x-mail-agent");
    }
    if (!strUserAgent)
    {
      strUserAgent = dispMUA.getHeader("x-newsreader");
    }
  }
  //X-Mailer may be MIME encoded. Ignored if not UTF-8
  const target = "=?UTF-8?B?";
  if (strUserAgent.startsWith(target)) {
    let regExp = new RegExp(target.replace(/\?/g, "\\?"), "g");
    strUserAgent = strUserAgent.replace(/\s/, "");
    strUserAgent = strUserAgent.replace(regExp, "");
    strUserAgent = strUserAgent.replace(/\?=/g, "");
    strUserAgent = decodeURIComponent(escape(atob(strUserAgent)));
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
           (dispMUA.getHeader("x-ms-exchange-crosstenant-fromentityheader").toLowerCase() == "hosted" &&
            dispMUA.getHeader("x-ms-exchange-crosstenant-mailboxtype").toLowerCase() == "hosted") ||
           (dispMUA.getHeader("x-ms-exchange-crosstenant-fromentityheader").toLowerCase() == "hosted" &&
            dispMUA.getHeader("x-ms-exchange-transport-crosstenantheadersstamped") != "")
          )
  {
    strExtra = "o365";
  }
  else if (dispMUA.getHeader("x-ms-exchange-crosstenant-fromentityheader").toLowerCase() == "internet" &&
           dispMUA.getHeader("x-originatororg").toLowerCase() == "outlook.com")
  {
    strExtra = "oweb";
  }
  else if (dispMUA.getHeader("x-ms-exchange-crosstenant-fromentityheader").toLowerCase() == "internet" &&
           dispMUA.getHeader("x-originatororg").toLowerCase() == "email.teams.microsoft.com")
  {
    strExtra = "msteams";
  }
  else if (dispMUA.getHeader("x-correlation-id"))
  {
    if (dispMUA.getHeader("x-correlation-id") == dispMUA.getHeader("message-id"))
      strExtra = "fairemail" ;
  }
  else if (dispMUA.getHeader("x-ebay-mailtracker"))
  {
    let re = /d=(export\.)?ebay\.[\.a-z]{2,6};/m
    //if (re.test(dispMUA.headers.extractHeader("dkim-signature", true))) strExtra = "ebay" ;
    if (dispMUA.headers["dkim-signature"]) {
      if (re.test(dispMUA.headers["dkim-signature"].join("\n"))) strExtra = "ebay" ;
      else if (dispMUA.getHeader("message-id").endsWith("@starship>")) strExtra = "ebay" ;
    }
  }
  else if (dispMUA.getHeader("sender") == dispMUA.getHeader("from"))
  {
    if (dispMUA.getHeader("sender").endsWith("ebay.com>")) strExtra = "ebay" ;
  }
  else if (dispMUA.getHeader("x-pardot-route") && dispMUA.getHeader("x-pardot-lb"))
  {
    strExtra = "pardot" ;
  }

  strUserAgent = strUserAgent.replace(/(^\s+)|(\s+$)/g, "");
  dispMUA.Info["STRING"] = "";
  dispMUA.setInfo(false, []);

  if (strUserAgent != "")
  {
    dispMUA.Info["STRING"] = strUserAgent;
    //var lower = strUserAgent.toLowerCase();
    //MUA string starts with "WebService", Yahoo! Mail, maybe
    var lower = strUserAgent.toLowerCase().replace(/^webservice\/[0-9\. ]+/, "");

    //user overlay array
    /*
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
    */

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
      let re = /rv:(\d{1,2}\.\d)/g;
      let arr = re.exec(lower);
      let rv = 2;
      if (arr) rv = Number(arr[1]);
      re = /thunderbird[\/ ]([0-9a-z\.]+)/;
      arr = re.exec(lower);
      let ver = arr[1];
      let tb = "thunderbird";
      if (ver.indexOf('a') > 0) tb = "daily";
      else if (ver.indexOf('b') > 0) tb = "earibird";
      else if (rv >= 60) tb += "60";
      tb += "-";
      if (lower.indexOf("; linux") > -1)
      {
        dispMUA.Info["ICON"] = tb + "linux.png";
      }
      else if ((lower.indexOf("(windows") > -1) || (lower.indexOf("; windows") > -1))
      {
        dispMUA.Info["ICON"] = tb + "windows.png";
      }
      else if ((lower.indexOf("(macintosh") > -1) || (lower.indexOf("; intel mac") > -1) || (lower.indexOf("; ppc mac") > -1))
      {
        dispMUA.Info["ICON"] = tb + "mac.png";
      }
      else if (lower.indexOf("; sunos") > -1)
      {
        dispMUA.Info["ICON"] = tb + "sunos.png";
      }
      else if (lower.indexOf("; freebsd") > -1)
      {
        dispMUA.Info["ICON"] = tb + "freebsd.png";
      }
      else if (lower.indexOf("(x11") > -1)
      {
        dispMUA.Info["ICON"] = tb + "x11.png";
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
    else if (strExtra == "oweb")
    {
      dispMUA.Info["ICON"] = "o365outlook.png";
      dispMUA.Info["STRING"] = "Outlook.com";
      dispMUA.Info["URL"] = "https://outlook.com";
      dispMUA.Info["FOUND"] = true;
    }
    else if (strExtra == "msteams")
    {
      dispMUA.Info["ICON"] = "microsoftteams.png";
      dispMUA.Info["STRING"] = "Microsoft Teams";
      dispMUA.Info["URL"] = "https://www.microsoft.com/microsoft-365/microsoft-teams/group-chat-software";
      dispMUA.Info["FOUND"] = true;
    }
    else if (strExtra == "fairemail")
    {
      dispMUA.Info["ICON"] = "fairemail.png";
      dispMUA.Info["STRING"] = "FairEmail";
      dispMUA.Info["URL"] = "https://email.faircode.eu/";
      dispMUA.Info["FOUND"] = true;
    }
    else if (strExtra == "ebay")
    {
      dispMUA.Info["ICON"] = "ebay2012.png";
      dispMUA.Info["STRING"] = "eBay";
      dispMUA.Info["URL"] = "https://www.ebay.com/";
      dispMUA.Info["FOUND"] = true;
    }
    else if (strExtra == "pardot")
    {
      dispMUA.Info["ICON"] = "pardot.png";
      dispMUA.Info["STRING"] = "Pardot";
      dispMUA.Info["URL"] = "https://www.pardot.com/";
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
  if (dispMUA.Info["ICON"] == "empty.png" && dispMUA.getHeader("dkim-signature") != "")
  {
    dispMUA.getInfo("DKIM-Signature", "dkim-signature");
  }

  //dispMUA.showInfo();
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
  //dispMUA.Info["PATH"] = "chrome://dispmua/content/48x48/";
  //moz-extension://<extension-UUID>/
  dispMUA.Info["PATH"] = "content/48x48/";
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
  var mini = document.getElementById("dispMUAicon-mini");

  if (mini)
  {
    mini.src = elem.src;
    mini.setAttribute("tooltiptext", strTooltip);
    mini.image = elem.image; //feat of strength
    mini.setAttribute("title", strTooltip); //feat of strength
  }
}

// load a data file now based on JSON
dispMUA.loadJSON = (fname) =>
{
  var req = new XMLHttpRequest();
  //req.open("GET", "chrome://dispmua/content/" + fname , true);
  req.open("GET", "content/" + fname , true);
  req.overrideMimeType("application/json; charset=UTF-8");

  req.onreadystatechange = (aEvt) =>
  {
    if (req.readyState == 4)
    {
      dispMUA.arDispMUAAllocation = JSON.parse(req.responseText);
    }
  }

  req.send(null);
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

    window.openDialog("content/feedback.xhtml",
      "feedback", "chrome=yes,centerscreen",
      param[0], param[1], param[2], param[3], param[4], param[5]);
  }
}
