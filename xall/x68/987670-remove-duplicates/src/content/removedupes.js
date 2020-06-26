if(!removeDupes) var removeDupes={};

removeDupes.Rdm =
{
  msgServiceImap : Components.classes["@mozilla.org/messenger/messageservice;1?type=imap"].getService(Components.interfaces.nsIMsgMessageService),
  msgServiceMbox : Components.classes["@mozilla.org/messenger/messageservice;1?type=mailbox-message"].getService(Components.interfaces.nsIMsgMessageService),

  dfProgbar    : 0,
  dfStatusText : 0,
  dfBundle     : 0,

  messageTable      : new Array(),
  messageTable2     : new Array(),
  numTotalMessages  : 0,
  numCurrentMessage : 0,
  busy              : false,
  folderList        : new Array(),
  folderMessages    : 0,

  checkMessageId     : false,
  checkDateInSeconds : false,
  checkDate          : false,
  checkSubject       : false,
  checkAuthor        : false,
  checkLinecount     : false,
  checkBody          : false,
  checkRecipient     : false,
  subFolderFirst     : false,
  ignoreSubFolders   : false,
  excludeTrashcan    : false,
  excludeSentfolder  : false,
  excludeArchives    : false,
  autodelete         : false,
  debugInfo          : false,
  lowMemThreshold    : 200000,
  useLessMemory      : false,
  prefPreferedDelete : false,
  delayed            : false,
  reverseSearch      : false,

  MSG_FOLDER_FLAG_NEWSGROUP  : 0x0001,
  MSG_FOLDER_FLAG_NEWS_HOST  : 0x0002,
  MSG_FOLDER_FLAG_MAIL       : 0x0004,
  MSG_FOLDER_FLAG_DIRECTORY  : 0x0008,
  MSG_FOLDER_FLAG_VIRTUAL    : 0x0020,
  MSG_FOLDER_FLAG_SUBSCRIBED : 0x0040,
  MSG_FOLDER_FLAG_TRASH      : 0x0100,
  MSG_FOLDER_FLAG_SENTMAIL   : 0x0200,
  MSG_FOLDER_FLAG_INBOX      : 0x1000,
  MSG_FOLDER_FLAG_IMAPBOX    : 0x2000,
  MSG_FOLDER_FLAG_ARCHIVES   : 0x4000,
  MSG_FOLDER_FLAG_JUNK       : 0x40000000,


  messageSort3 : function ( a, b )
  {
    var m1 = a.split(" ");
    var m2 = b.split(" ");

    if ( m1[1] < m2[1] ) return true;
    if ( m1[1] > m2[1] ) return false;
    if ( m1[2] < m2[2] ) return true;
    return false;
  },


  messageSort2 : function ( a, b )
  {
    if ( a.hash > b.hash ) return 1;
    if ( a.hash < b.hash ) return -1;
    return b.id - a.id;
  },


  // class that stores messages and addition information
  messageClass : function ( uri, hash, id )
  {
    this.messageUri = uri;     // pointer to the message
    this.hash = hash;          // hash of the message
    this.id = id;              // unique id (number) of the message. smaller ids will be deleted first
  },


  messageClass2 : function ( uri )
  {
    this.messageUri = uri;     // pointer so the message
    this.next = -1;            // if the message is a duplicate, we store here the array index of the next duplicate message
    this.isDuplicate = false;  // marked as duplicate? then we can delete it
    this.isDuplicateDefault = false;  // marked as duplicate? then we can delete it
  },


// gets body text of a message
//    in: aMessageHeader    nsIMsgDBHdr - header of a message
//    => body of the message as text
  getMessageBody : function (aMessageHeader)
  {
    var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
    var listener = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance(Components.interfaces.nsISyncStreamListener);
    var uri = aMessageHeader.folder.getUriForMsg(aMessageHeader);
    messenger.messageServiceFromURI(uri).streamMessage(uri, listener, null, null, false, "");
    var folder = aMessageHeader.folder;
    return folder.getMsgTextFromStream(listener.inputStream, aMessageHeader.Charset, 65536, 32768, false, true, { });
  }, // end getMessageBody


  // calculate the message hash depending on the user configuration
  messageHash : function ( message, i, numCount, obj )
  {
    var hash = "";
    if ( checkMessageId     ) hash = hash + "_" + message.messageId;
    if ( checkDateInSeconds ) hash = hash + "_" + message.dateInSeconds;
    if ( checkDate          ) hash = hash + "_" + Math.round(message.dateInSeconds/86400);
    if ( checkSubject       ) hash = hash + "_" + message.subject.replace(/\"/g, "");//";
    if ( checkAuthor        ) hash = hash + "_" + message.author.replace(/\"/g, "");//"
    if ( checkLinecount     ) hash = hash + "_" + message.lineCount;
    if ( checkRecipient     ) hash = hash + "_" + message.recipients.replace(/\"/g, "") + "_" + message.ccList.replace(/\"/g, "");//"
    if ( checkBody          )
    {

      MsgHdrToMimeMessage(message, null, function(aMsgHdr, aMimeMsg)
      {
        var attachmentsRead = 0;
        var attachmentsSize = -1;
        var message_        = message;
        var i_              = i;
        var numCount_       = numCount;
        var obj_            = obj;
        var hash_           = hash;
        messageAtt          = "";
        var body            = obj.getMessageBody (message_);

        let attachments = aMimeMsg.allUserAttachments || aMimeMsg.allAttachments;
        for (let j = 0; j <  aMimeMsg.parts.length; j++)
        {
          let p = aMimeMsg.parts[j];

          if (p.parts)
          {
            for (let i=0; i<p.parts.length; i++)
            {
              let part = p.parts[i];
              if ( part.contentType.substr(0,5) == "text/" )
              {
                messageAtt = messageAtt + part.body;
              }
            }
          }
        }

        attachmentsSize = attachments.length;
        if (attachments.length == 0)
        {
          hash_ = hash_ + " " + removeDupes.Md5.hex_md5 (body + messageAtt);
          if (obj.useLessMemory)
          {
            hash_ = hash_.replace (/ /g, "%20");
            hash_ = removeDupes.Md5.hex_md5(hash_);
          }

          obj.addMessageToTable ( message_, i_, numCount_, obj_, hash_ );
          return;
        }

        for (let i=0; i<attachments.length; i++)
        {
          let att     = attachments[i];
          let url     = Services.io.newURI(att.url, null, null);
          let channel = Services.io.newChannelFromURI(url,
                                                      null,
                                                      Services.scriptSecurityManager.getSystemPrincipal(),
                                                      null,
                                                      Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
                                                      Ci.nsIContentPolicy.TYPE_OTHER);
          let chunks  = [];
          let unicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
          createInstance(Ci.nsIScriptableUnicodeConverter);
          unicodeConverter.charset = "UTF-8";
          let listener =
          {
            setMimeHeaders: function () {},
            onStartRequest: function (aRequest, aContext) {},
            onStopRequest: function (aRequest, aContext, aStatusCode)
            {
              let data = chunks.join("");
              messageAtt = messageAtt + data.substr(0,1028);
              attachmentsRead++;
              if (attachmentsRead == attachmentsSize)
              {
// TODO add message to array and continue with next one
                hash_ = hash_ + " " + removeDupes.Md5.hex_md5 (body + messageAtt);
                if (obj.useLessMemory)
                {
                  hash_ = hash_.replace (/ /g, "%20");
                  hash_ = removeDupes.Md5.hex_md5(hash_);
                }

                obj.addMessageToTable ( message_, i_, numCount_, obj_, hash_ );
              }
            },
            onDataAvailable: function (aRequest, aStream, aOffset, aCount)
            {
              let data = NetUtil.readInputStreamToString(aStream, aCount);
              chunks.push(data);
            },
            QueryInterface: ChromeUtils.generateQI([Components.interfaces.nsISupports, Components.interfaces.nsIStreamListener,
                            Components.interfaces.nsIMsgQuotingOutputStreamListener, Components.interfaces.nsIRequestObserver])
          };

          channel.asyncOpen(listener, null);
        }
      }, false);
    }

    return hash;
  },


  removeDuplicateMessages : function ()
  {
    this.dfBundle = document.getElementById("bundle_removedupes");

    if (this.busy)
    {
      if ( confirm ( this.dfBundle.getString("removedupes.busy") + "\n" +
                     this.dfBundle.getString("removedupes.killprocess") ) )
      {
         this.busy = false;
         // todo: kill other process
      }
      else
      {
         return;
      }
    }
    else
    {
       this.busy = true;
    }

    checkMessageId       = removeDupes.PrefDialog.checkMessageIdPref();
    checkDateInSeconds   = removeDupes.PrefDialog.checkDateInSecondsPref();
    checkDate            = removeDupes.PrefDialog.checkDatePref();
    checkSubject         = removeDupes.PrefDialog.checkSubjectPref();
    checkAuthor          = removeDupes.PrefDialog.checkAuthorPref();
    checkLinecount       = removeDupes.PrefDialog.checkLinecountPref();
    checkBody            = removeDupes.PrefDialog.checkBodyPref();
    checkRecipient       = removeDupes.PrefDialog.checkRecipientPref();
    reverseSearch        = removeDupes.PrefDialog.checkReverseSearchPref();
    subFolderFirst       = removeDupes.PrefDialog.checkSubFolderFirstPref();
    ignoreSubFolders     = removeDupes.PrefDialog.checkIgnoreSubFoldersPref();
    excludeTrashcan      = removeDupes.PrefDialog.checkExcludeTrashcanPref();
    excludeSentfolder    = removeDupes.PrefDialog.checkExcludeSentfolderPref();
    excludeArchives      = removeDupes.PrefDialog.checkExcludeArchivesPref();
    autodelete           = removeDupes.PrefDialog.checkAutodeletePref();
    debugInfo            = removeDupes.PrefDialog.checkDebugInfoPref();
    prefPreferedDelete   = removeDupes.PrefDialog.checkPreferedDeletePref ();

    var dfProgpanel = document.getElementById("statusbar-progresspanel");
    dfProgpanel.collapsed = false;
    this.dfProgbar = document.getElementById("statusbar-icon");
    this.dfProgbar.removeAttribute("hidden");
    this.dfProgbar.setAttribute("mode", "normal");
    this.dfProgbar.value = 0;
    this.dfStatusText = document.getElementById("statusText");
    this.numCurrentMessage = 0;
    this.numTotalMessages = 0;
    while (this.folderList.pop());
    while (this.messageTable.pop());
    while (this.messageTable2.pop());


    // Find all folder we want to search for duplicate messages
    var folders = GetSelectedMsgFolders();
    for (var i in folders)
    {
      this.buildUpFolderList ( folders[i] );
    }
    if (reverseSearch)
    {
      this.folderList.reverse();
    }

    if (this.numTotalMessages > this.lowMemThreshold )
    {
      alert ( this.dfBundle.getFormattedString("removedupes.memwarning", [this.lowMemThreshold]) );
      this.useLessMemory = true;
    }
    // Collect all messages from folders in the folderList and store then in the messageTable
    if (checkBody)
    {
      this.findMessagesInFolderAsync ( 0, 0, this );
    }
    else
    {
      this.findMessagesInFolder ( 0, 0, this );
    }
  },


  buildUpFolderList : function ( folder )
  {
    if ( folder.flags & this.MSG_FOLDER_FLAG_NEWSGROUP )
      return;

    if ( excludeTrashcan )
      if ( folder.flags & this.MSG_FOLDER_FLAG_TRASH )
        return;

    if ( excludeSentfolder )
      if ( folder.flags & this.MSG_FOLDER_FLAG_SENTMAIL )
        return;

    if ( excludeArchives )
      if ( folder.flags & this.MSG_FOLDER_FLAG_ARCHIVES )
        return;

    if ( !subFolderFirst )
      this.folderList.push ( folder )

    if ( !ignoreSubFolders )
    {
      if (folder.hasSubFolders)
      {
        var subFolders;
        subFolders = folder.subFolders;
        while ( subFolders.hasMoreElements() )
        {
          var f = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
          this.buildUpFolderList (f);
        }
      }
    }

    if ( subFolderFirst )
      this.folderList.push ( folder )

    // Only count the message number for non virtual folders
    if ( !(folder.flags & this.MSG_FOLDER_FLAG_VIRTUAL) )
      this.numTotalMessages += folder.getTotalMessages (false);
  },


  findMessagesInFolder : function ( i, numCount, obj )
  {
    // Did we scan all folders?
    if ( i >= obj.folderList.length )
    {
      obj.dfProgbar.value = 100;
      obj.dfStatusText.label = obj.dfBundle.getFormattedString("removedupes.searchduplicates", [obj.numTotalMessages, obj.numTotalMessages]);
      obj.searchDuplicates();
      return;
    }

    var folder = obj.folderList[i];
    var name   = folder.abbreviatedName;

    if ( numCount == 0 )
    {
      // Get an iterator for the messages of current folder
      try
      {
        obj.folderMessages = folder.messages;
      }
      catch (ex)
      {
        // If we could not process the folder, we proceed with the next one
        obj.findMessagesInFolder ( i+1, 0, obj );
        return;
      }
    }

    while (obj.folderMessages.hasMoreElements())
    {
      try
      {
        // Get the next message in the current folder
        obj.debugInfo = removeDupes.PrefDialog.checkDebugInfoPref();
        var message   = obj.folderMessages.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
        var hash      = obj.messageHash ( message, 0, 0, null );

        if (obj.useLessMemory)
        {
          var s = "" + message.folder.getUriForMsg (message) +" "+ hash +" "+ obj.messageTable.length
          obj.messageTable.push ( s );
          if (obj.debugInfo)
            console.log ( "lowmem A: " + s );
        }
        else
        {
          // more readable, but also more memory consuming
          var m = new obj.messageClass ( message.folder.getUriForMsg (message), hash, obj.messageTable.length );
          if (obj.debugInfo)
            console.log ( "normmem A: "+message.folder.getUriForMsg (message) +"\nB: "+ hash +"\nC: "+ obj.messageTable.length );
          obj.messageTable.push ( m );
        }
        obj.numCurrentMessage ++;
        numCount ++;
      }
      catch (e)
      {
        delete obj.messageTable;
        alert ( e.message );
        return;
      }
      // Update progress bar after every 100 messages
      if ( obj.numCurrentMessage%100 == 0 )
      {
        obj.dfProgbar.value = 100 * obj.numCurrentMessage / obj.numTotalMessages;
        obj.dfStatusText.label = obj.dfBundle.getFormattedString("removedupes.searchduplicates", [obj.numCurrentMessage, obj.numTotalMessages]);
        setTimeout ( function() {obj.findMessagesInFolder(i, numCount, obj);}, 10 );
        return;
      }
    }

    //
    obj.findMessagesInFolder ( i+1, 0, obj);
  },


  findMessagesInFolderAsync : function ( i, numCount, obj )
  {
    // Did we scan all folders?
    if ( i >= obj.folderList.length )
    {
      obj.dfProgbar.value = 100;
      obj.dfStatusText.label = obj.dfBundle.getFormattedString("removedupes.searchduplicates", [obj.numTotalMessages, obj.numTotalMessages]);
      obj.searchDuplicates();
      return;
    }

    var folder = obj.folderList[i];
    var name   = folder.abbreviatedName;

    if ( numCount == 0 )
    {
      // Get an iterator for the messages of current folder
      try
      {
        obj.folderMessages = folder.messages;
      }
      catch (ex)
      {
        // If we could not process the folder, we proceed with the next one
        obj.findMessagesInFolderAsync ( i+1, 0, obj, null );
        return;
      }
    }

    if (obj.folderMessages.hasMoreElements())
    {
      try
      {
        // Get the next message in the current folder
        obj.debugInfo = removeDupes.PrefDialog.checkDebugInfoPref();
        var message   = obj.folderMessages.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
        var hash      = obj.messageHash ( message, i, numCount, obj );
      }
      catch(ex)
      {
      }
    }
    else
    {
      obj.findMessagesInFolderAsync ( i+1, 0, obj );
    }
  },


  addMessageToTable : function ( message, i, numCount, obj, hash )
  {
    try
    {
      if (obj.useLessMemory)
      {
        var s = "" + message.folder.getUriForMsg (message) +" "+ hash +" "+ obj.messageTable.length
        obj.messageTable.push ( s );
        if (obj.debugInfo)
          console.log ( "lowmem A: " + s );
      }
      else
      {
        // more readable, but also more memory consuming
        var m = new obj.messageClass ( message.folder.getUriForMsg (message), hash, obj.messageTable.length );
        if (obj.debugInfo)
          console.log ( "normmem A: "+message.folder.getUriForMsg (message) +"\nB: "+ hash +"\nC: "+ obj.messageTable.length );
        obj.messageTable.push ( m );
      }
      obj.numCurrentMessage ++;
      numCount ++;
    }
    catch (e)
    {
      delete obj.messageTable;
      alert ( e.message );
    }

    // Update progress bar after every 100 messages
    if ( obj.numCurrentMessage<10 || obj.numCurrentMessage%10 == 0 )
    {
      obj.dfProgbar.value = 100 * obj.numCurrentMessage / obj.numTotalMessages;
      obj.dfStatusText.label = obj.dfBundle.getFormattedString("removedupes.searchduplicates", [obj.numCurrentMessage, obj.numTotalMessages]);
    }

    obj.findMessagesInFolderAsync ( i, numCount, obj );
  },


  getMessage : function ( uri, obj )
  {
    var message = null;
    var msgFormat = ( uri.split (":"))[0];
    if ( msgFormat == "imap-message" )
      message = obj.msgServiceImap.messageURIToMsgHdr ( uri );
    else if ( msgFormat == "mailbox-message" )
      message = obj.msgServiceMbox.messageURIToMsgHdr ( uri );
    else
    {
      alert ( "Unknown message format: " + msgFormat );
      return null;
    }
    return message;
  },


  searchDuplicates2 : function (j)
  {
    obj=removeDupes.Rdm;
    for (var i=j; i < obj.messageTable.length-1; i++)
    {
      var uri0  = -1;
      if (obj.messageTable2.length>0)
        uri0 = obj.messageTable2[obj.messageTable2.length-1].messageUri;

      if (obj.useLessMemory)
      {
        var uri1  = obj.messageTable[i].split(" ")[0];
        var uri2  = obj.messageTable[i+1].split(" ")[0];
        var hash1 = obj.messageTable[i].split(" ")[1];
        var hash2 = obj.messageTable[i+1].split(" ")[1];
      }
      else
      {
        var uri1  = obj.messageTable[i].messageUri;
        var uri2  = obj.messageTable[i+1].messageUri;
        var hash1 = obj.messageTable[i].hash;
        var hash2 = obj.messageTable[i+1].hash;
      }
      /*
      var m1 = getMessage ( uri1 );
      var m2 = getMessage ( uri2 );
      alert ("1: " + m1. subject + " (" + m1.flags + ")\n2: " + m2.subject + " (" + m2.flags + ")");
      // */

      var foundRead;
      if ( hash1 == hash2 )
      {
        if ( obj.messageTable2.length>0 && uri0 == uri1 )
        {
          obj.messageTable2[obj.messageTable2.length-1].next = obj.messageTable2.length;
        }
        else
        {
          foundRead = false;
          var m1         = new obj.messageClass2 (uri1);
          m1.next        = obj.messageTable2.length+1;
          m1.isDuplicate = false;
          m1.isDuplicateDefault = false;
          obj.messageTable2.push ( m1 );
        }

        var m2         = new obj.messageClass2 (uri2);
        m2.next        = -1;
        m2.isDuplicate = true;
        m2.isDuplicateDefault = true;
        obj.messageTable2.push ( m2 );


        // größte bzw. kleinste E-Mail behalten
        //
        if ( prefPreferedDelete == 2 || prefPreferedDelete == 3 )
        {
          // sortiere die e-mails so um, dass die größte immer an ende der liste
          // steht und als nicht zu löschen markiert wird. dadurch bleibt die größte
          // email erhalten und alle anderen werden gelöscht
          var m1 = obj.getMessage ( uri1, obj );
          var m2 = obj.getMessage ( uri2, obj );
          // vorherige email (m1) größer als aktuelle email (m2), dann muss getauscht werden
          if ( prefPreferedDelete == 2 )
            if ( m1.messageSize > m2.messageSize )
            {
              var h = obj.messageTable2[obj.messageTable2.length-1];
              obj.messageTable2[obj.messageTable2.length-1] = obj.messageTable2[obj.messageTable2.length-2];
              obj.messageTable2[obj.messageTable2.length-2] = h;
              obj.messageTable2[obj.messageTable2.length-1].next = -1;
              obj.messageTable2[obj.messageTable2.length-2].next = obj.messageTable2.length-1;
            }
            else
            {
              obj.messageTable2[obj.messageTable2.length-2].isDuplicate = true;
              obj.messageTable2[obj.messageTable2.length-1].isDuplicate = false;
              obj.messageTable2[obj.messageTable2.length-2].isDuplicateDefault = true;
              obj.messageTable2[obj.messageTable2.length-1].isDuplicateDefault = false;
            }
          if ( prefPreferedDelete == 3 )
            if ( m1.messageSize < m2.messageSize )
            {
              var h = obj.messageTable2[obj.messageTable2.length-1];
              obj.messageTable2[obj.messageTable2.length-1] = obj.messageTable2[obj.messageTable2.length-2];
              obj.messageTable2[obj.messageTable2.length-2] = h;
              obj.messageTable2[obj.messageTable2.length-1].next = -1;
              obj.messageTable2[obj.messageTable2.length-2].next = obj.messageTable2.length-1;
            }
            else
            {
              obj.messageTable2[obj.messageTable2.length-2].isDuplicate = true;
              obj.messageTable2[obj.messageTable2.length-1].isDuplicate = false;
              obj.messageTable2[obj.messageTable2.length-2].isDuplicateDefault = true;
              obj.messageTable2[obj.messageTable2.length-1].isDuplicateDefault = false;
            }
        }

        // ungelesene E-Mail bevorzugt behalten
        //
        if ( prefPreferedDelete == 1 )
        {
          if (!foundRead)
          {
            var m1 = obj.getMessage ( uri1, obj );
            var m2 = obj.getMessage ( uri2, obj );
  //alert ( m1.flags + " " + m2.flags + "\n" + uri1 + " " + uri2 );
            // erste gelesen
            if ( m1.flags%2 == 1 )
            {
              foundRead = true;
            }
            // erste ungelesen, zweite gelesen
            if ( m1.flags%2 == 0 && m2.flags%2 == 1 )
            {
              obj.messageTable2[obj.messageTable2.length-2].isDuplicate = true;
              obj.messageTable2[obj.messageTable2.length-1].isDuplicate = false;
              obj.messageTable2[obj.messageTable2.length-2].isDuplicateDefault = true;
              obj.messageTable2[obj.messageTable2.length-1].isDuplicateDefault = false;
              foundRead = true;
            }
            // beide ungelesen
            if ( m1.flags%2 == 0 && m2.flags%2 == 0 )
            {
              var h = obj.messageTable2[obj.messageTable2.length-1];
              obj.messageTable2[obj.messageTable2.length-1] = obj.messageTable2[obj.messageTable2.length-2];
              obj.messageTable2[obj.messageTable2.length-2] = h;
              obj.messageTable2[obj.messageTable2.length-1].next = -1;
              obj.messageTable2[obj.messageTable2.length-2].next = obj.messageTable2.length-1;
            }
          }
        }

        // beantwortete E-Mail bevorzugt behalten
        //
        if ( prefPreferedDelete == 4 )
        {
          if (!foundRead)
          {
            var m1 = obj.getMessage ( uri1, obj );
            var m2 = obj.getMessage ( uri2, obj );

  // alert ( m1.flags + " " + m2.flags + "\n" + uri1 + " " + uri2 );

            // erste beantwortet
            if ( m1.flags&2 == 2 )
            {
              foundRead = true;
            }
            // erste unbeantwortet, zweite beantwortet
            if ( m1.flags&2 == 0 && m2.flags&2 == 2 )
            {
              obj.messageTable2[obj.messageTable2.length-2].isDuplicate = true;
              obj.messageTable2[obj.messageTable2.length-1].isDuplicate = false;
              obj.messageTable2[obj.messageTable2.length-2].isDuplicateDefault = true;
              obj.messageTable2[obj.messageTable2.length-1].isDuplicateDefault = false;
              foundRead = true;
            }
            // beide unbeantwortet
            if ( m1.flags&2 == 0 && m2.flags&2 == 0 )
            {
              var h = obj.messageTable2[obj.messageTable2.length-1];
              obj.messageTable2[obj.messageTable2.length-1] = obj.messageTable2[obj.messageTable2.length-2];
              obj.messageTable2[obj.messageTable2.length-2] = h;
              obj.messageTable2[obj.messageTable2.length-1].next = -1;
              obj.messageTable2[obj.messageTable2.length-2].next = obj.messageTable2.length-1;
            }
          }
        }

      }


      if (i%500 == 0)
      {
        obj.dfStatusText.label = obj.dfBundle.getString("removedupes.phase") + " 3: " + i + " / " + obj.messageTable.length;
        obj.dfProgbar.value = 100 * i / obj.messageTable.length;

        setTimeout ( function() {obj.searchDuplicates2(i+1);}, 10 );
        return;
      }
    }

    obj.dfStatusText.label = obj.messageTable.length + " " + obj.dfBundle.getString("removedupes.compared");
    obj.dfProgbar.value = 100;
    while (obj.messageTable.pop());
    obj.removedupesDone();
  },


  searchDuplicates : function ()
  {
    if (this.useLessMemory)
    {
      removeDupes.QuickSort.SetArray (this.messageTable);
      removeDupes.QuickSort.SetCompare (this.messageSort3);
      removeDupes.QuickSort.SetDoneFunction (this.searchDuplicates2);
      removeDupes.QuickSort.Start ();
    }
    else
    {
      this.messageTable.sort (this.messageSort2);
      this.searchDuplicates2 (0);
    }
  },


  removedupesDone : function ()
  {
    if ( this.folderList.length >= 0 )
    {
      var showDuplicatesDialog = removeDupes.PrefDialog.checkShowDuplicatesDialogPref ();

      if ( this.messageTable2.length > 0 || showDuplicatesDialog )
      {
        var gdbview = gDBView;
        window.openDialog("chrome://removedupes/content/showdupes.xul", "showdupes", "chrome", this.dfStatusText, this.messageTable2, msgWindow, gdbview, this );
        this.dfProgbar.setAttribute("hidden", true);
        //obj.dfStatusText.label = "";
      }
      else
      {
        this.dfProgbar.setAttribute("hidden", true);
        alert ( this.dfBundle.getString("removedupes.noduplicates") );
        obj.dfStatusText.label = "";
      }
    }
    this.busy = false;
  }
}
