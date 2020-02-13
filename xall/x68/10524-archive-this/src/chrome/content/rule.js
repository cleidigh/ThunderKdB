"use strict";

var ArchiveRule = {
  console: Components.classes["@mozilla.org/consoleservice;1"].
           getService(Components.interfaces.nsIConsoleService),
  header : new String("From"),
  comparison : new Object(),
  value : new String(""),
  folder : new String(""),
  compType : { is:0, contains:1, beginsWith:2 },

  matches : function (header, mimeHeader)
  {
    var headerValue;
    switch (this.header)
    {
      case 'From':
        headerValue = header.mime2DecodedAuthor;
        break;
      case 'To':
        headerValue = header.mime2DecodedRecipients;
        break;
      case 'To or Cc':
        headerValue = header.mime2DecodedRecipients + ", " + header.ccList;
        break;
      case 'Subject':
        headerValue = header.mime2DecodedSubject;
        break;
      case 'Cc':
        headerValue = header.ccList;
        break;
      case 'To/From':
        headerValue = header.mime2DecodedRecipients 
                      + ", " + header.mime2DecodedAuthor;
        break;
      case 'To/Cc/From/Bcc':
        headerValue = header.mime2DecodedRecipients 
                      + ", " + header.ccList
                      + ", " + header.mime2DecodedAuthor
                      + ", " + header.bccList;
        break;
      case 'Message-ID':
        headerValue = header.messageId;
        break;
      default:
        headerValue = mimeHeader.extractHeader(this.header,true);
    }

    if (headerValue == null)
    {
      return false;
    }

    if (this.comparison == ArchiveRule.compType.is)
    {
      if (headerValue.toLocaleLowerCase() == this.value.toLocaleLowerCase())
        { return true; }
    }
    else if (this.comparison == ArchiveRule.compType.contains)
    {
      if (headerValue.toLocaleLowerCase().indexOf(this.value.toLocaleLowerCase()) >= 0) 
       { return true; }
    }
    else if (this.comparison == ArchiveRule.compType.beginsWith)
    {
      if (headerValue.toLocaleLowerCase().indexOf(this.value.toLocaleLowerCase()) == 0) 
        { return true; }
    }

    return false;
  },

  init : function (text)
  {
    var val = text.split('|',4);
    this.header     = val[0];
    this.comparison = val[1];
    this.value      = val[2];
    this.folder     = val[3];
  }
}

function archiveThisClone (obj)
{
  if(obj == null || typeof(obj) != 'object') return obj;

  var newObj = new Object();

  for(var i in obj)
  {
    newObj[i] = archiveThisClone(obj[i]);
  }
  return newObj;
}
