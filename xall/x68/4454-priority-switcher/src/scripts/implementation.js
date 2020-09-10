var {
  ExtensionCommon
} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

//Define API
var prioritySwitcherApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);

    return {
      prioritySwitcherApi: {
        switchPriority: async function (id, priority) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          let db_priority = PSWMsgPriorityValue.convertToDBPriorityValue(priority);
          if (!db_priority) db_priority = 1; //none
          if (rw) {
            let msgHdr = context.extension.messageManager.get(id);
            msgHdr.priority = db_priority;
            msgHdr.folder.updateFolder(rw.msgWindow);
          }
        },

        getDBPriorityForMessage: async function (id) {
          let msgHdr = context.extension.messageManager.get(id);
          let priority = msgHdr ? PSWMsgPriorityValue.convertToXPriorityValue(msgHdr.priority) : null;
          return priority;
        },

        rewritePriority: async function (id, src) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          if (rw) {
            let msgHdr = context.extension.messageManager.get(id);
            PrioritySwitcher.rw = rw;
            await PrioritySwitcher.commit(msgHdr, src, rw.msgWindow);
            //Temp file is created but copying to TB db. Original message can be removed.
          }
        }

      }
    };
  }

  close() {
    //remove temp files
    PrioritySwitcher.finalize();
  }
}

//value of each priorities
var PSWMsgPriorityValue = {
  commit: -2,
  reset: -1,
  notSet: 0,
  none: 1,
  lowest: 2,
  low: 3,
  normal: 4,
  high: 5,
  highest: 6,

  convertToXPriorityValue: function (priority) {
    let ret = null;
    if (this.lowest <= priority && priority <= this.highest)
      ret = Math.abs(priority - 7);
    return ret;
  },

  convertToDBPriorityValue: function (priority) {
    let ret = null;
    if (1 <= priority && priority <= 5)
      ret = Math.abs(priority - 7);
    return ret;
  }
};

var PrioritySwitcher = {
  tempMsg: {},
  newKey: null,
  rw: null,
  commit: function (msgHdr, src, msgWindow) {
    let folder = msgHdr.folder;
    let server = folder.server.type;
    let hostName = folder.hostname;
    //RSS and News etc... are not supported
    if (server != "pop3" && server != "imap" && server != "none") return false;

    let key = msgHdr.messageKey;
    let file = this.makeTempMsgFile(msgHdr, src);
    if (!file) return false;

    let that = this;
    let copyListener = {
      QueryInterface: ChromeUtils.generateQI(["nsIMsgCopyServiceListener"]),
      GetMessageId: function (messageId) {},
      OnProgress: function (progress, progressMax) {},
      SetMessageKey: function (aKey) {
        that.newKey = aKey;
        let func = function () {
          that.correctMsgHdr();
        };
        that.rw.setTimeout(func, 1000);
      },
      OnStartCopy: function () {},
      OnStopCopy: async function (statusCode) {}
    };

    this.tempMsg = {
      file: file,
      folder: folder,
      msgHdr: msgHdr,
      flags: msgHdr.flags,
      junkscore: msgHdr.getStringProperty("junkscore"),
      label: msgHdr.label,
      keywords: msgHdr.getStringProperty("keywords")
    };

    msgHdr.folder.copyFileMessage(file, null, false, msgHdr.flags, msgHdr.keywords, msgWindow, copyListener);

    return true;
  },

  makeTempMsgFile: function (msgHdr, src) {
    let dirService = Components.classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties);
    let tmpDir = dirService.get("TmpD", Components.interfaces.nsIFile);
    tmpDir.append("PrioritySwitcher");
    tmpDir.append("psw_" + msgHdr.messageKey + ".eml");
    tmpDir.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0o666);

    let os = Components.classes['@mozilla.org/network/file-output-stream;1'].
    createInstance(Components.interfaces.nsIFileOutputStream);
    os.init(tmpDir, 2, 0x200, false); // open as "write only"
    os.write(src, src.length);
    os.close();

    return tmpDir;
  },

  correctMsgHdr: function () {
    let msgHdr = null;
    try {
      msgHdr = this.tempMsg.folder.GetMessageHeader(this.newKey);
    } catch (e) {
      //wait until msgHdr is available
      let that = this;
      let func = function () {
        that.correctMsgHdr();
      }
      this.rw.setTimeout(func, 1000);
      return;
    }

    msgHdr.setStringProperty("junkscore", this.tempMsg.junkscore);
    msgHdr.setStringProperty("label", this.tempMsg.label);
    msgHdr.setStringProperty("keywords", this.tempMsg.keywords);
  },

  finalize: function () {
    let dirService = Components.classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties);
    let tmpDir = dirService.get("TmpD", Components.interfaces.nsIFile);
    tmpDir.append("PrioritySwitcher");
    try {
      tmpDir.remove(true);
    } catch (e) {}
  }
};
