var EXPORTED_SYMBOLS = ["gENForwardUtils", "gENFPreferences"];

var gENForwardUtils = {
  limitPremium: [200, 200], //[size max, sent max]
  limitPlus: [50, 200], //[size max, sent max]

  getMaxSize: function (account) {
    if (!account) account = gENFPreferences.copyUnicharPref("account_type", "premium");
    var ret = 0;
    switch (account) {
      case "plus":
        ret = this.limitPlus[0];
        break;
      case "premium":
        ret = this.limitPremium[0];
        break;
      default:
        ret = this.limitPlus[0];
        break;
    }

    return ret;
  },

  getMaxSend: function (account) {
    if (!account) account = gENFPreferences.copyUnicharPref("account_type", "premium");
    var ret = 0;
    switch (account) {
      case "plus":
        ret = this.limitPlus[1];
        break;
      case "premium":
        ret = this.limitPremium[1];
        break;
      default:
        ret = this.limitPlus[1];
        break;
    }

    return ret;
  },

  //this shall be called only within experiments scope
  checkMsgSize: function (msgFile) {
    if (gENFPreferences.getBoolPref("alert_limit", false)) {
      var size = msgFile.fileSize;
      return size < this.getMaxSize() * 1024 * 1024;
    } else {
      return true;
    }
  },

  checkSentTimes: function () {
    if (gENFPreferences.getBoolPref("alert_limit", false)) {
      var sent = gENFPreferences.getIntPref("sent_times", 0);
      return sent < this.getMaxSend();
    } else {
      return true;
    }
  },

  checkLimitExpires: function (force) {
    if (force || gENFPreferences.getBoolPref("alert_limit", false)) {
      var date = this.localDateToEnDate(new Date());
      var today = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
      var last = gENFPreferences.copyUnicharPref("sent_date", "");
      return today != last;
    } else {
      return true;
    }
  },

  //change local date to california date
  localDateToEnDate: function (date) {
    var localTime = date.getTime();
    var gmt = localTime + date.getTimezoneOffset() * 60 * 1000;
    var enDate = new Date(gmt + (-8 * 60 * 60 * 1000));
    return enDate;
  },

  //this shall be called only within experiments scope
  writeStringToFile: function (name, str) {
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties)
      .get("ProfD", Components.interfaces.nsIFile);
    file.append("EnForward");
    file.append(name);
    if (file.exists()) {
      file.remove(true);
    }
    file.create(file.NORMAL_FILE_TYPE, 0o666);

    var ioService = Components.classes['@mozilla.org/network/io-service;1']
      .getService(Components.interfaces.nsIIOService);

    var fileStream = Components.classes['@mozilla.org/network/file-output-stream;1']
      .createInstance(Components.interfaces.nsIFileOutputStream);
    fileStream.init(file, 2, 0x200, false);

    var converterStream = Components
      .classes['@mozilla.org/intl/converter-output-stream;1']
      .createInstance(Components.interfaces.nsIConverterOutputStream);
    converterStream.init(fileStream, "UTF-8", 0,
      Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
    converterStream.writeString(str);
    converterStream.close();
    fileStream.close();
  },

  //this shall be called only within experiments scope
  loadFileToString: function (name) {
    var ret = "";
    try {
      var file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("ProfD", Components.interfaces.nsIFile);
      file.append("EnForward");
      file.append(name);

      if (file.exists()) {
        var stream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
        stream.init(file, 1, 0, false);
        var converterStream = Components
          .classes['@mozilla.org/intl/converter-input-stream;1']
          .createInstance(Components.interfaces.nsIConverterInputStream);
        converterStream.init(stream, "UTF-8", stream.available(),
          Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
        var fileObj = {};
        converterStream.readString(stream.available(), fileObj);
        converterStream.close();
        stream.close();
        ret = fileObj.value ? fileObj.value : "";
      }
    } catch (e) {
      ret = "";
    }
    return ret;
  },

  //this shall be called only within experiments scope
  getFileInst: function (name) {
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties)
      .get("ProfD", Components.interfaces.nsIFile);
    file.append("EnForward");
    file.append(name);

    return file;
  },

  getElementsByAttribute: function (name, value, aWindow) {
    return value ?
      aWindow.document.querySelectorAll(`[${name}="${value}"]`) :
      aWindow.document.querySelectorAll(`[${name}]`);
  }
};

//temp workaround for pref
var gENFPreferences = {
  prefs: [],
  default_prefs: [],
  callback: null,
  monitoredPrefs: [],

  init: async function () {
    this.default_prefs["email"] = "";
    this.default_prefs["forward_mode"] = 0;
    this.default_prefs["forward_id"] = "auto";
    this.default_prefs["send_interval"] = 1;
    this.default_prefs["save_sent"] = true;
    this.default_prefs["mark_as_forwarded"] = true;
    this.default_prefs["del_org_msg"] = false;
    this.default_prefs["show_conf_dialog"] = true;
    this.default_prefs["account_type"] = "premium";
    this.default_prefs["alert_limit"] = false;
    this.default_prefs["title"] = "%S";
    this.default_prefs["rm_re_fwd"] = false;
    this.default_prefs["rm_mltag"] = false;
    this.default_prefs["notebook"] = "";
    this.default_prefs["tags"] = "";
    this.default_prefs["add_msg_tags"] = false;
    this.default_prefs["ignored_tags"] = "";
    this.default_prefs["add_header"] = false;
    this.default_prefs["add_footer"] = false;
    this.default_prefs["mailto_link"] = false;
    this.default_prefs["header_use_html"] = false;
    this.default_prefs["footer_use_html"] = false;
    this.default_prefs["attachments_forward_mode"] = 0;
    this.default_prefs["attachments_ext_filter"] = "";
    this.default_prefs["attachments_size_filter"] = 0;
    this.default_prefs["onenote_email"] = "me@onenote.com";
    this.default_prefs["onenote_forward_id"] = "";
    this.default_prefs["onenote_send_interval"] = 1;
    this.default_prefs["onenote_save_sent"] = true;
    this.default_prefs["onenote_mark_as_forwarded"] = true;
    this.default_prefs["onenote_del_org_msg"] = false;
    this.default_prefs["onenote_title"] = "%S";
    this.default_prefs["onenote_rm_re_fwd"] = false;
    this.default_prefs["onenote_rm_mltag"] = false;
    this.default_prefs["onenote_attachments_forward_mode"] = 0;
    this.default_prefs["onenote_attachments_ext_filter"] = "";
    this.default_prefs["onenote_attachments_size_filter"] = 0;
    this.default_prefs["preview_mode"] = false;
    this.default_prefs["sent_date"] = "";
    this.default_prefs["sent_times"] = 0;
    //New prefs from EnForward 2
    this.default_prefs["post_tags"] = "";
    this.default_prefs["post_tags_rm"] = "";
    this.default_prefs["onenote_post_tags"] = "";
    this.default_prefs["onenote_post_tags_rm"] = "";
    this.default_prefs["header_text"] = "";
    this.default_prefs["footer_text"] = "";
    this.default_prefs["onenote_service_name"] = "OneNote";
    this.default_prefs["onenote_show_conf_dialog"] = true;
    this.default_prefs["default_service"] = 0; //0: evernote, 1: other
  },

  getIntPref: function (str, def) {
    let val = this.prefs[str];
    return val === undefined ? def : val;
  },

  getBoolPref: function (str, def) {
    let val = this.prefs[str];
    return val === undefined ? def : val;
  },

  copyUnicharPref: function (str, def) {
    let val = this.prefs[str];
    return val === undefined ? def : val;
  },

  setIntPref: function (str, val) {
    this.prefs[str] = val;
    this.firePrefChangedEvent(str, "int", val);
    return true;
  },

  setBoolPref: function (str, val) {
    this.prefs[str] = val;
    this.firePrefChangedEvent(str, "bool", val);
    return true;
  },

  setUnicharPref: function (str, val) {
    this.prefs[str] = val;
    this.firePrefChangedEvent(str, "char", val);
    return true;
  },

  getDefaultPrefs: function () {
    return this.default_prefs;
  },

  setMonitoredPrefs: function(monitoredPrefs) {
    this.monitoredPrefs = monitoredPrefs;    
  },

  registerListener: function (monitoredPrefs, fire) {
    this.callback = fire;
  },
  
  removeListener: function () {
    this.callback = null;
  },

  firePrefChangedEvent: function (str, type, val) {
    if (this.callback && this.monitoredPrefs.indexOf(str) >= 0) {
      switch (type) {
        case "int":
          this.callback.async(str, type, val, null, null);
          break;
        case "bool":
          this.callback.async(str, type, null, val, null);
          break;
        case "char":
          this.callback.async(str, type, null, null, val);
          break;
        default:
          break;
      }
    }
  }
};
