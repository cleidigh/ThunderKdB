if(!removeDupes) var removeDupes={};


removeDupes.ShowDuplicateMessages =
{
  msgServiceMbox     : 0,
  msgServiceImap     : 0,
  messageTable       : 0,
  msgWindow          : 0,
  gMessageList       : 0,
  treeChildren       : 0,
  numMessageToDelete : 0,
  debugInfo          : 0,
  gdbview            : 0,
  parent             : 0,


 makeNewRow : function ( i, flag, author, recipient, subject, folder, date, linecount)
 {
   var cell0    = document.createXULElement("treecell");
   var cell1    = document.createXULElement("treecell");
   var cell2    = document.createXULElement("treecell");
   var cell3    = document.createXULElement("treecell");
   var cell4    = document.createXULElement("treecell");
   var cell5    = document.createXULElement("treecell");
   var cell6    = document.createXULElement("treecell");
   var cell7    = document.createXULElement("treecell");

   cell0.setAttribute("id", "messageid");
   cell1.setAttribute("id", "flagCol");
   cell2.setAttribute("id", "senderCol");
   cell3.setAttribute("id", "recipientCol");
   cell4.setAttribute("id", "subjectCol");
   cell5.setAttribute("id", "folderCol");
   cell6.setAttribute("id", "dateCol");
   cell7.setAttribute("id", "linecountCol");

   cell0.setAttribute("label", i);
   cell1.setAttribute("label", flag);
   cell2.setAttribute("label", author);
   cell3.setAttribute("label", recipient);
   cell4.setAttribute("label", subject);
   cell5.setAttribute("label", folder);
   cell6.setAttribute("label", date );
   cell7.setAttribute("label", linecount );

   var userRow  = document.createXULElement("treerow");
   userRow.appendChild(cell0);
   userRow.appendChild(cell1);
   userRow.appendChild(cell2);
   userRow.appendChild(cell3);
   userRow.appendChild(cell4);
   userRow.appendChild(cell5);
   userRow.appendChild(cell6);
   userRow.appendChild(cell7);

   return userRow;
 },


 getMessage : function ( uri )
 {

   var message = null;
   var msgFormat = ( uri.split (":"))[0];
   if ( msgFormat == "imap-message" )
     message = msgServiceImap.messageURIToMsgHdr ( uri );
   else if ( msgFormat == "mailbox-message" )
     message = msgServiceMbox.messageURIToMsgHdr ( uri );
   else
   {
     alert ( "Unknown message format: " + msgFormat );
     return null;
   }
   return message;
 },


 addMessageToDialog : function ( i )
 {
   var j=messageTable[i].next;
   var message  = this.getMessage ( messageTable[i].messageUri );
   var message2 = this.getMessage ( messageTable[j].messageUri );

   var userRow1,userRow2;
   if (messageTable[i].isDuplicate)
   {
     userRow1  = this.makeNewRow ( i, "DEL",  message.mime2DecodedAuthor, message.mime2DecodedRecipients, message.mime2DecodedSubject, message.folder.abbreviatedName, this.time2Human (message.date), message.lineCount );
     numMessageToDelete++;
   }
   else
     userRow1  = this.makeNewRow ( i, "KEEP", message.mime2DecodedAuthor, message.mime2DecodedRecipients, message.mime2DecodedSubject, message.folder.abbreviatedName, this.time2Human (message.date), message.lineCount );
   if (messageTable[j].isDuplicate)
   {
     userRow2  = this.makeNewRow ( j, "DEL",  message2.mime2DecodedAuthor, message2.mime2DecodedRecipients, message2.mime2DecodedSubject, message2.folder.abbreviatedName, this.time2Human (message2.date), message.lineCount );
     numMessageToDelete++;
   }
   else
     userRow2  = this.makeNewRow ( j, "KEEP",  message2.mime2DecodedAuthor, message2.mime2DecodedRecipients, message2.mime2DecodedSubject, message2.folder.abbreviatedName, this.time2Human (message2.date), message.lineCount );
   var treeItem  = document.createXULElement("treeitem");
   var treeItem1 = document.createXULElement("treeitem");
   var treeItem2 = document.createXULElement("treeitem");
   var userRow   = document.createXULElement("treerow");
   var treeChld  = document.createXULElement("treechildren");
   var cell      = document.createXULElement("treecell");

   cell.setAttribute("label", "xxx");
   userRow.appendChild(cell);

   treeItem1.appendChild(userRow1);
   treeItem2.appendChild(userRow2);

   treeChld.appendChild(treeItem1);
   treeChld.appendChild(treeItem2);

   while (messageTable[j].next >=0 )
   {
     j = messageTable[j].next;
     var message = this.getMessage ( messageTable[j].messageUri );

     var userRow3;
     if (messageTable[j].isDuplicate)
     {
       userRow3 = this.makeNewRow ( j, "DEL",  message.mime2DecodedAuthor, message.mime2DecodedRecipients, message.mime2DecodedSubject, message.folder.abbreviatedName, this.time2Human (message.date), message.lineCount );
       numMessageToDelete++;
     }
     else
       userRow3 = this.makeNewRow ( j, "KEEP", message.mime2DecodedAuthor, message.mime2DecodedRecipients, message.mime2DecodedSubject, message.folder.abbreviatedName, this.time2Human (message.date), message.lineCount );
     var treeItem3 = document.createXULElement("treeitem");
     treeItem3.appendChild(userRow3);
     treeChld.appendChild(treeItem3);
     i++;
   }

   treeItem.appendChild(userRow);
   treeItem.appendChild(treeChld);
   treeItem.setAttribute("container", true );
   treeItem.setAttribute("open", true );

   treeChildren.appendChild(treeItem);

   return i;
 },


 initTree : function ()
 {
   document.getElementById("buttonDefault").disabled = true;
   document.getElementById("buttonSelDel").disabled  = true;
   document.getElementById("buttonSelKeep").disabled = true;
   this.initTree2 (0, this);
 },


 initTree2 : function (j, obj)
 {
   for ( var i=j; i<messageTable.length; i++ )
   {
     if (messageTable[i].next >=0 )
       i = obj.addMessageToDialog ( i );
     if (i > j+25)
     {
       document.getElementById("label2").value = dfBundle.getFormattedString("showdupes.todelete", [numMessageToDelete] );
       document.getElementById("label3").value = i + " / " + messageTable.length;
       dfStatusText = i + " / " + messageTable.length;

       setTimeout ( function () {obj.initTree2(i+1, obj);}, 10);
       return;
     }
   }

   document.getElementById("label2").value = dfBundle.getFormattedString("showdupes.todelete", [numMessageToDelete] );
   document.getElementById("label3").value = "";
   document.getElementById("buttonDefault").disabled = false;
   document.getElementById("buttonSelDel").disabled  = false;
   document.getElementById("buttonSelKeep").disabled = false;
 },


 Init : function ()
 {
   document.addEventListener("dialogaccept", function() {removeDupes.ShowDuplicateMessages.doRemoveDuplicateMessages()}); // This replaces ondialogaccept in XUL.
   document.addEventListener("dialogextra2", function() {removeDupes.ShowDuplicateMessages.showRemoveDuplicatesAbout()});
   var messageServiceImap = Components.classes["@mozilla.org/messenger/messageservice;1?type=imap"];
   var messageServiceMbox = Components.classes["@mozilla.org/messenger/messageservice;1?type=mailbox-message"];
   msgServiceImap     = messageServiceImap.getService(Components.interfaces.nsIMsgMessageService);
   msgServiceMbox     = messageServiceMbox.getService(Components.interfaces.nsIMsgMessageService);
   debugInfo    = removeDupes.PrefDialog.checkDebugInfoPref();
   autodelete   = removeDupes.PrefDialog.checkAutodeletePref();
   dfStatusText = window.arguments[0];
   messageTable = window.arguments[1];
   msgWindow    = window.arguments[2];
   gdbview      = window.arguments[3];
   parent       = window.arguments[4];
   dfBundle     = document.getElementById("bundle_removedupes");

   if (autodelete)
   {
     this.doRemoveDuplicateMessages ();
     close ();
   }
   else
   {
     document.getElementById("label1").value = dfBundle.getFormattedString("showdupes.total", [messageTable.length] );

     gMessageList = document.getElementById("messageList");
     gMessageList.currentItem=null;
     treeChildren=document.getElementById("messageListChildren");

     // Show recipient column if recipients were compared
     if ( removeDupes.PrefDialog.checkRecipientPref() )
     {
       var recipientCol=document.getElementById("recipientCol");
       recipientCol.setAttribute("hidden",false);
     }

     // Show linecount column if linecounts were compared
     if ( removeDupes.PrefDialog.checkLinecountPref() )
     {
       var linecountCol=document.getElementById("linecountCol");
       linecountCol.setAttribute("hidden",false);
     }

     numMessageToDelete = 0;

     this.initTree ();
   }
 },


 time2Human : function ( time )
 {
   var d = new Date( time / 1000 );

   var h   = d.getHours();
   var min = d.getMinutes();
   var day = d.getDate();
   var mon = d.getMonth()+1;
   var y   = d.getYear();
   if (h  <10) h   = "0" + h;
   if (min<10) min = "0" + min;
   if (day<10) day = "0" + day;
   if (mon<10) mon = "0" + mon;
   if (y>2000) y-=2000;
   else if (y>1900) y-=1900;
   else if (y>100)  y-=100;
   if (y<10)   y="0"+y;

   dateString = day + "." + mon + "." + y + " " + h + ":" + min;
   return dateString;
 },


 doRemoveDuplicateMessages : function ()
 {
   try
   {
     msgWindow.displayHTMLInMessagePane ("", dfBundle.getString("showdupes.closemessage") );
   }
   catch (e)
   {
     msgWindow.displayHTMLInMessagePane ("", dfBundle.getString("showdupes.closemessage"), false );
   }

   var messagesToRemove;
   messagesToRemove = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);

   for ( var i=0; i<messageTable.length; i++ )
   {
     if ( messageTable[i].isDuplicate )
     {
       var message = this.getMessage ( messageTable[i].messageUri )
       if (debugInfo)
       {
         if ( confirm ( "Delete Message: " + i + "\n" + messageTable[i].id + "\n" + message.folder.URI + "\n" + messageTable[i].messageUri ) )
         {
           messagesToRemove.appendElement ( message, false );
         }
       }
       else
       {
         messagesToRemove.appendElement ( message, false );
       }
     }
   }

   var messageCount = 0;
   messageCount = messagesToRemove.length;

   if ( messageCount )
   {
     var message = this.getMessage ( messageTable[0].messageUri );
     try
     {
       var bConfirmed = true;
       var confirmDelete = true;

       if (confirmDelete) {
         bConfirmed = confirm ( dfBundle.getFormattedString("showdupes.totalconfirm", [messageCount]) );
       }
       if (bConfirmed) {
         if ( messageCount > 1000 )
           message.folder.deleteMessages ( messagesToRemove, msgWindow, false, false, null, false);
         else
           message.folder.deleteMessages ( messagesToRemove, msgWindow, false, false, null, true);
       }
     }
     catch(e)
     {
        alert (e);
     }
   }

   while (parent.folderList.pop());
   while (parent.messageTable.pop());
 },


 messageListClick : function (event)
 {
   if (event)
     if (event.button != 0)
     {
       return;
     }

   try
   {
     var idx= gMessageList.currentIndex;
     var id = "xxx";
     try
     {
       id = gMessageList.view.getCellText(idx, "messageid" );
     }
     catch (e)
     {
       id = gMessageList.view.getCellText(idx, gMessageList.columns.getNamedColumn("messageid") );
     }

     if ( id == "xxx" ) return;

     var message = this.getMessage ( messageTable[id].messageUri );
     let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
     let win = wm.getMostRecentWindow("mail:3pane");
     if (win)
     {
       win.focus();
       win.gFolderTreeView.selectFolder(message.folder);
       win.gFolderDisplay.selectMessage(message);
     }
     else
     {
       MailUtils.displayMessage(message);
     }

   }
   catch (e)
     {alert(e.message);return;}
 },


 messageListContextmenu : function (event)
 {
   var idx       = gMessageList.currentIndex;
   var id        = -1;
   try
   {
     id = gMessageList.view.getCellText(idx, "messageid" );
   }
   catch (e)
   {
     id = gMessageList.view.getCellText(idx, gMessageList.columns.getNamedColumn("messageid") );
   }
   if ( id == -1 )
     return;

   var msguri    = messageTable[id].messageUri;
   var message   = this.getMessage ( msguri );
   var msgFormat = (msguri.split (":"))[0];
   alert ( dfBundle.getFormattedString("showdupes.information", [message.mime2DecodedAuthor, message.mime2DecodedSubject, msguri, message.folder.URI, msgFormat]) );
   if (!debugInfo) return;
 },


 messageListDblClick : function (event)
 {
   this.togleSelectedMessageFromList();
 },


  messageListMiddleClick : function(event) {
    if (event.which == 2) {
      this.togleSelectedMessageFromList();
    }
  },


 getRow : function ( tree, cellattribute, cellattvalue )
 {
   if ( tree.nodeName == "treecell" && tree.getAttribute("id") == cellattribute && tree.getAttribute("label") == cellattvalue )
   {
     return tree.parentNode;
   }

   for ( var node=tree.firstChild; node; node=node.nextSibling )
   {
     var row = this.getRow ( node, cellattribute, cellattvalue );
     if (row != null) return row;
   }

   return null;
 },


 togleSelectedMessageFromList : function ()
 {
   var idx= gMessageList.currentIndex;
   var view = gMessageList.view;
   var id = -1;

   try
   {
     id = view.getCellText(idx, "messageid" );
   }
   catch (e)
   {
     id = view.getCellText(idx, gMessageList.columns.getNamedColumn("messageid") );
   }

   if ( id == - 1 )
     return;

   var row = this.getRow ( treeChildren, "messageid", id );
   if ( id == "xxx" ) return;

   if ( messageTable[id].isDuplicate == false)
   {
     messageTable[id].isDuplicate = true;
     row.firstChild.nextSibling.setAttribute("label", "DEL");
     numMessageToDelete++;
   }
   else
   {
     messageTable[id].isDuplicate = false;
     row.firstChild.nextSibling.setAttribute("label", "KEEP");
     numMessageToDelete--;
   }

   document.getElementById("label2").value = dfBundle.getFormattedString("showdupes.todelete", [numMessageToDelete] );
 },

 doSelectAllDefault : function ()
 {
   while (treeChildren.firstChild)
    treeChildren.removeChild (treeChildren.firstChild);

   for ( var i=0; i<messageTable.length; i++ )
   {
       messageTable[i].isDuplicate = messageTable[i].isDuplicateDefault;
   }

   numMessageToDelete = 0;
   this.initTree();
 },


 doSelectAllDelete : function ()
 {
   while (treeChildren.firstChild)
    treeChildren.removeChild (treeChildren.firstChild);

   for ( var i=0; i<messageTable.length; i++ )
     messageTable[i].isDuplicate = true;

   numMessageToDelete = 0;
   this.initTree();
 },


 doSelectAllNoDelete : function ()
 {
   while (treeChildren.firstChild)
    treeChildren.removeChild (treeChildren.firstChild);

   for ( var i=0; i<messageTable.length; i++ )
     messageTable[i].isDuplicate = false;

   numMessageToDelete = 0;
   this.initTree();
 },


 showRemoveDuplicatesAbout : function()
 {
   window.openDialog("chrome://removedupes/content/removedupesabout.xul", "removedupesprefs", "chrome" );
 }

}
