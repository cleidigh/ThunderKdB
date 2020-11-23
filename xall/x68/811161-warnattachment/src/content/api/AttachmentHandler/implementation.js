// Experimental API: Allows to register a callback to the attachment opener

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const LISTENER_NAME = "warnattachmentExperimentListener_";

function log(msg){
  Services.console.logStringMessage(msg);
}


var AttachmentHandler = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      AttachmentHandler: {
        onOpenAttachment : new ExtensionCommon.EventManager({
            context,
            name: "AttachmentHandler.onOpenAttachment",
            register(fire){
                function callback(attachment){
                    return fire.async(attachment);
                }
                windowListener.add(callback);
                return function() {
                    windowListener.remove();
                };
            },
        }).api()
      }
    }
  }
};



// (This file had a lowercase E in Thunderbird 65 and earlier.)
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");

var windowListener = new class extends ExtensionCommon.EventEmitter {

  // save the original opener for attachments for later use
  setOldOpener (o){
      this.oldOpener = o;
  }

  // return the original opener
  getOldOpener(){
      return this.oldOpener;
  }

  constructor() {
    super();
    this.callbackCount = 0;
    this.oldOpener = undefined;
    this.callback = undefined;
  }

  add(callback) {
    this.callbackCount++;

    if (this.callbackCount == 1) {
      this.callback = callback;
      ExtensionSupport.registerWindowListener(LISTENER_NAME, {
        chromeURLs: [
          "chrome://messenger/content/messenger.xhtml",
          "chrome://messenger/content/messenger.xul",
          "chrome://messenger/content/messageWindow.xul",
          "chrome://messenger/content/messageWindow.xhtml",
        ],
        onLoadWindow: function(window) {
          windowListener.setOldOpener(window.AttachmentInfo.prototype.open);
          window.AttachmentInfo.prototype.open = function(attachment) {
              windowListener.callback({
                  contentType : this.contentType,
                  url : this.url,
                  uri : this.uri,
                  name : this.name,
                  displayName : this.displayName
              }).then(result => {
                  if (result) {
                      // Call original handler
                      windowListener.getOldOpener().apply(this, arguments);
                  } else {
                      // File blocked. Do nothing
                  }
              });
          }
        },
      });
    }
  }

  remove() {
    this.callbackCount--;

    if (this.callbackCount == 0) {
      for (let window of ExtensionSupport.openWindows) {
        if ([
          "chrome://messenger/content/messenger.xhtml",
          "chrome://messenger/content/messenger.xul",
          "chrome://messenger/content/messageWindow.xul",
          "chrome://messenger/content/messageWindow.xhtml",
        ].includes(window.location.href)) {
          window.AttachmentInfo.prototype.open = this.getOldOpener();
        }
      }
      ExtensionSupport.unregisterWindowListener(LISTENER_NAME);
      this.callback = undefined;
    }
  }
};



