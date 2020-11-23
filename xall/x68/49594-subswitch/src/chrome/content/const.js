if(!com) var com={};
if(!com.ktsystems) com.ktsystems={};
if(!com.ktsystems.subswitch) com.ktsystems.subswitch={};
if(!com.ktsystems.subswitch.Const) com.ktsystems.subswitch.Const={};

com.ktsystems.subswitch.Const = {
    PUBLIC_DIST : 'true',
    ENTRIES_SPLIT_SIGN : '##',
    ENTRY_SPLIT_SIGN : '~~',
    SUBSWITCH_MIME_HEADER : 'X-SubSwitch',
    CONFIGURATION_IDS : [
            "offbydefault",
            "contextmenu",
            "beforeMsgSubject",
            "addRDtoEmail",
            "loadRDfromEmail",
            "discoveryIgnoreSigns",
            "discoveryItemPattern",
            "discoveryIgnoreList"
         ],
    rx_user: "([a-zA-Z0-9][a-zA-Z0-9._-]*|\"([^\\\\\x80-\xff\015\012\"]|\\\\[^\x80-\xff])+\")",
    rx_domain: "([a-zA-Z0-9][a-zA-Z0-9._-]*\\.)*[a-zA-Z0-9][a-zA-Z0-9._-]*\\.[a-zA-Z]{2,5}",
    rx_wildcard: "[a-zA-Z0-9._-]*",
    subswitch_prefs: Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService)
        .getBranch("extensions.subjects_prefix_switch."),
    subswitch_str: Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString),

    SEQ_PAD_MASK : '0000000000',
    SEQ_MAX_VALUE: 9999999999
};

com.ktsystems.subswitch.Const.rx = "^" + com.ktsystems.subswitch.Const.rx_user + "\@" + com.ktsystems.subswitch.Const.rx_domain + "$";
