"use strict";
var miczImapDraftUnread = {
    
    currentOS:'',

    init: function(){
      //dump('>>>>>>>> miczImapDraftUnread init...'+"\r\n");
      //dump('>>>>>>>> nsMsgFolderFlagType.Drafts: '+ nsMsgFolderFlagType.Drafts+"\r\n");
      var nsIFolderListener = Components.interfaces.nsIFolderListener;
      var notifyFlags = nsIFolderListener.added;
      var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"]. getService(Components.interfaces.nsIMsgMailSession);
      mailSession.AddFolderListener(miczImapDraftUnread.iduFolderListener,notifyFlags);
      
      // Returns "WINNT" on Windows Vista, XP, 2000, and NT systems;
      // "Linux" on GNU/Linux; and "Darwin" on Mac OS X.
      this.currentOS = miczImapDraftUnreadOSUtils.getCurrentOS();
      //dump('>>>>>>>> miczImapDraftUnread currentOS: '+this.currentOS+"\r\n");
      
      //check if we are on OSX, so the clearNew fuction is useless
      if(miczImapDraftUnreadOSUtils.onOSX(this.currentOS)){
        //dump('>>>>>>>> miczImapDraftUnread we are on OSX!'+"\r\n");
        let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        prefs = prefs.getBranch("extensions.miczImapDraftUnread.");
        prefs.setBoolPref("clearNew",false);
        prefs.setBoolPref("makeRead",true);
      }
    },

    iduFolderListener:
    {
         OnItemAdded: function(parentItem, item, view) {
            if(parentItem.flags & 0x00000400) { //It's a draft folder!!
              //dump( 'OnItemAdded: '+parentItem.flags.toString(16) +"\r\n");
                let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
                prefs = prefs.getBranch("extensions.miczImapDraftUnread.");
                let p_makeRead=prefs.getBoolPref("makeRead");
                let p_clearNew=prefs.getBoolPref("clearNew");
                if(p_makeRead){
                  parentItem.markAllMessagesRead(null);
                }
                if(p_clearNew){
                  parentItem.clearNewMessages();
                }
              //parentItem.getTotalMessages(null);
            }
         },
         OnItemRemoved: function(parentItem, item, view) { },
         OnItemPropertyChanged: function(item, property, oldValue, newValue) { },
         OnItemIntPropertyChanged: function(item, property, oldValue, newValue) { },
         OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) { },
         OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) { },
         OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) { },
         OnItemEvent: function(folder, event) { }
    }

};
window.addEventListener("load", miczImapDraftUnread.init, false);
