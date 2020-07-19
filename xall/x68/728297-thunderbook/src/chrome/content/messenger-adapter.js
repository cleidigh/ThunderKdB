/* Copyright 2016-2019 Julien L. <julienl81@hotmail.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Module acting as an adapter to the Mozilla messenger API 
 * (Thunderbird UI, database of messages...)
 */

Components.utils.import("resource:///modules/gloda/mimemsg.js");

function Message(msgHdr) {
  this.msgHdr = msgHdr; // nsIMsgDBHdr

  this.id = function() {
    // messageId seems to be percent-encoded
    return decodeURIComponent(this.msgHdr.messageId);
  };

  this.subject = function() {
    return this.msgHdr.mime2DecodedSubject;
  };

  this.sender = function() {
    return this.msgHdr.mime2DecodedAuthor;
  };

  this.date = function() {
    // nsIMsgDBHdr.date is an integer representing a number of microseconds
    return new Date(this.msgHdr.date / 1000);
  };

  this.markAsRead = function() {
    this.msgHdr.markRead(true);
  };

}

var accountService = {

  defaultUserFullName: function() {
    var fullName = null;
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
      .getService(Components.interfaces.nsIMsgAccountManager);
    var account = acctMgr.defaultAccount; // nsIMsgAccount
    if (account) {
      var identity = account.defaultIdentity; // nsIMsgIdentity
      if (identity) {
        fullName = identity.fullName;
      }
    }
    return fullName;
  },

  userPreferredLanguage: function() {
    // See https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage/language
    return window.navigator.language;
  }
}

function InaccessibleFolderMessagesException(folder) {
   this.folder = folder;
}

var messageRepository = {

  unreadMessagesInFolder: function(folder) {
    var unreadMsgHdrs = new Array();

    if (!folder.isServer) {
      // There cannot be messages in the root folder of a server
      // Therefore accessing property messages throws an exception

      var msgHdrs = null;
      try {
        msgHdrs = folder.messages; // nsISimpleEnumerator of nsIMsgDBHdr
      } catch (exception) {
        // It may be that accessing messages of the folder generates an error
        // with code 0x80550005 (NS_MSG_ERROR_FOLDER_SUMMARY_OUT_OF_DATE).
        // This especially happens when an MBOX has just been imported
        // See these resources:
        // http://forums.mozillazine.org/viewtopic.php?f=19&t=3041079
        // http://mozilla.6506.n7.nabble.com/How-to-deconstruct-error-return-values-td185433.html
        console.error("An exception occurred while accessing messages for folder",
          folder.name, ":", exception);
        //alertFailure();
        throw new InaccessibleFolderMessagesException(folder);
      }

      while (msgHdrs.hasMoreElements()) {
        var msgHdr = msgHdrs.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
        if (!msgHdr.isRead) {
          var message = new Message(msgHdr);
          unreadMsgHdrs.push(message);
        }
      }
    }

    if (folder.hasSubFolders) {
      var subFolders = folder.subFolders; // nsISimpleEnumerator of nsIMsgFolder
      while (subFolders.hasMoreElements()) {
        var subFolder = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
        unreadMsgHdrs = unreadMsgHdrs.concat(this.unreadMessagesInFolder(subFolder));
      }
    }

    return unreadMsgHdrs;
  },

  unreadMessages: function() {
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
      .getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = acctMgr.accounts; // nsIArray of nsIMsgAccount

    var unreadMsgHdrs = new Array();
    for (var index = 0; index < accounts.length; index++) {
      var account = accounts.queryElementAt(index, Components.interfaces.nsIMsgAccount);
      var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder
      unreadMsgHdrs = unreadMsgHdrs.concat(this.unreadMessagesInFolder(rootFolder));
    }
    return unreadMsgHdrs;
  }

}

var messageContentService = {

  multipartContentTypes: ["message/rfc822", "multipart/mixed", "multipart/related", "multipart/alternative"],

  /**
   * Searches for the first message of the given type in the give MIME message.
   */
  messageBodyFrom: function(mimeMessage /* MimeMessage */, contentType) {
    var result = null;

    if (mimeMessage.contentType == contentType) {
      result = mimeMessage.body;
    } else if (this.multipartContentTypes.includes(mimeMessage.contentType)) {
      var parts = mimeMessage.parts;

      for (var index = 0; index < parts.length; index++) {
        var part = parts[index];
        result = this.messageBodyFrom(part, contentType);
        if (result != null) {
          break;
        }
      }
    }

    return result;
  },

  /**
   * Searches for the first HTML message.
   */
  htmlMessageBodyFrom: function(mimeMessage /* MimeMessage */) {
    return this.messageBodyFrom(mimeMessage, "text/html");
  },

  textMessageBodyFrom: function(mimeMessage /* MimeMessage */) {
    return this.messageBodyFrom(mimeMessage, "text/plain");
  },

  convertTextIntoHtml: function(text) {
    // This implementation is pretty basic since a paragraph in a plain text
    // may span over several lines (case of quoted-printable encoded
    // messages?). With this implementation, such a paragraph is actually
    // split in several small (76 characters max) paragraphs.
    return "\
<html>\
  <head>\
    <meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\">\
  </head>\
  <body>\
    <p>" + text.replace(/\n/g, "<br/>") + "\
   </p>\
  </body>\
</html>";
  },

  baseURLFrom: function(mimeMessage /* MimeMessage */) {
    return mimeMessage.headers["content-base"];
  },

  itemContentFrom: function(mimeMessage /* MimeMessage */) {
    // Try to find an HTML message first
    var content = messageContentService.htmlMessageBodyFrom(mimeMessage);
    if (!content) {
      // If not found, try to find a plain text message and convert it into HTML
      text = messageContentService.textMessageBodyFrom(mimeMessage);
      if (text) {
        content = messageContentService.convertTextIntoHtml(text);
      }
    }
    var baseURL = messageContentService.baseURLFrom(mimeMessage);
    var itemContent = new ItemContent(null, baseURL, content);
    return itemContent;
  },

  itemContentPromiseFrom: function(message) {
    return new Promise(function(resolve, reject) {
      var callback = function(msgHdr, mimeMsg) {
        resolve(mimeMsg);
      };
      MsgHdrToMimeMessage(message.msgHdr, null, callback);
    }).then(this.itemContentFrom);
  }
  
}

/*
 * Gets a localized string from its key.
 */
function _(key, array) {
  var stringBundle = document.getElementById("thunderbook-stringbundle");
  if (array) {
    return stringBundle.getFormattedString(key, array);
  } else {
    return stringBundle.getString(key);
  }
}

const BOOK_TITLE = {
  "en": "Unread Messages on %S",
  "fr": "Messages non lus au %S",
  "hu": "%S olvasatlan üzenetek"
};

function createBookFromMessages(messages) {
  var creationDate = new Date();
  // TODO: find a better idea ("Various authors"?)
  var creator = null; //accountService.defaultUserFullName();
  var publisher = "Thunderbook"; // TODO: add Thunderbook's homepage between parenthesis?
  var language = accountService.userPreferredLanguage();
  var title = BOOK_TITLE[languageFromLocale(language)];
  if (!title) {
    // Only some languages are supported
    // Default to English if user has another language
    language = "en";
    title = BOOK_TITLE[language];
  }
  title = title.replace("%S", creationDate.toLocaleDateString(language));
  var itemContentPromiseFactoryFrom = function(message) {
    return function() {
      return messageContentService.itemContentPromiseFrom(message);
    };
  };
  var items = [];
  for (var message of messages) {
    var item = new Item(message.id(), message.subject(), message.sender(), message.date(), itemContentPromiseFactoryFrom(message));
    items.push(item);
  }
  return new Book(title, language, creator, publisher, items);
}

function markMessagesAsReadAfterConfirmation(messages) {
  var result = confirm(_("messenger.success.window.content"));
  if (result) {
    for (var message of messages) {
      message.markAsRead();
    }
  }
}

function alertFailure() {
  alert(_("messenger.failure.window.content"));
}

function openFileSelectionWindowToExportAsEbookForMessages(messages /* array of nsIMsgDBHdr */) {
  var book = createBookFromMessages(messages);
  
  const nsIFilePicker = Components.interfaces.nsIFilePicker;
  var filePicker = Components.classes["@mozilla.org/filepicker;1"]
    .createInstance(nsIFilePicker);
  filePicker.init(window, _("messenger.filepicker.window.title"), nsIFilePicker.modeSave);
  filePicker.appendFilter(_("messenger.filepicker.filter.epub"), "*.epub");
  var formattedTitle = book.title()
    .replace(/ /g, "_")
    .toLowerCase();
  filePicker.defaultString = toFilename(formattedTitle, ".epub");

  var promise = new Promise(function(resolve, reject) {
    filePicker.open(function(result) {
      resolve(result);
    });
  }).then(function(result) {
    if (result == nsIFilePicker.returnOK || result == nsIFilePicker.returnReplace) {
      return book.writeToFile(filePicker.file).then(function() {
        markMessagesAsReadAfterConfirmation(messages);
      });
    }
  }).catch(function(exception) {
    console.error("An exception occurred during the asynchronous operation:", exception);
    alertFailure();
    throw exception;
  });
}

function buildRootFunction(collectMessages) {
  return function() {
    try {
      var messages = collectMessages();
      openFileSelectionWindowToExportAsEbookForMessages(messages);
    } catch (exception) {
      console.error("An exception occurred during the synchronous operation:", exception);
      if (exception instanceof InaccessibleFolderMessagesException) {
        alert(_("messenger.inaccessible.window.content", [exception.folder.prettyName]));
      } else {
        alertFailure();
      }
      throw exception;
    }
  }
}

var openFileSelectionWindowToExportAsEbook = buildRootFunction(function() {
  return messageRepository.unreadMessages();
});

var openFileSelectionWindowToExportAsEbookForFolder = buildRootFunction(function() {
  var folder = GetFirstSelectedMsgFolder(); // nsIMsgFolder
  return messageRepository.unreadMessagesInFolder(folder);
});
