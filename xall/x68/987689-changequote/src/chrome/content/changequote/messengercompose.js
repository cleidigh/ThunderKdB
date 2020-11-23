// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Global variables 
var CQprefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

var {MailUtils} = ChromeUtils.import("resource:///modules/MailUtils.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://changequote/content/changequote/changequote.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
    var CQcomposeHeader;
    var TBComposeStartupOriginal = window.ComposeStartup;
    window.ComposeStartup = function (recycled, aParams) {
        try {
            if (! String.trim) { // Thunderbird 3 and higher has this feature built-in so we can skip this code
                var CQmail_inline_attach = CQprefs.getBoolPref("mail.inline_attachments");
                var CQreply_without_attach = CQprefs.getBoolPref("changequote.reply.without_inline_images");
                if (CQmail_inline_attach && CQreply_without_attach) {
                    CQprefs.setBoolPref("mail.inline_attachments", false);
                    CQbodyListener.restoreInlineAttPref = true;
                }
            }
            if (aParams)
                var par = aParams;
            else
                var par = window.arguments[0];
            var html = par.identity.composeHtml;
            if (CQprefs.getPrefType("mailnews.reply_header_authorwrotesingle") > 0)
                var pref = "mailnews.reply_header_authorwrotesingle";
            else
                var pref = "mailnews.reply_header_authorwrote";
            CQcomposeHeader = CQprefs.getStringPref(pref);
            if (par.format == 2 || (par.format == 0 && ! html) ||  (par.format == 3 && html) ) {
                var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
                str.data = CQcomposeHeader.replace(/\(\[\[\).+?\(\]\]\)/g,"");
                CQprefs.setStringPref(pref, str);
            }
        }
        catch(e) {};
        TBComposeStartupOriginal.apply(this,arguments);	
    };
    
    var CompFields2RecipientsOrig = window.CompFields2Recipients;
    window.CompFields2Recipients = function(msgCompFields) {
        if (CQprefs.getBoolPref("changequote.headers.ignore_reply_to")) {
            var uri = window.gMsgCompose.originalMsgURI;
            var CQmessenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
            CQmessenger = CQmessenger.QueryInterface(Components.interfaces.nsIMessenger);
            var hdr = CQmessenger.messageServiceFromURI(uri).messageURIToMsgHdr(uri);
            var from = hdr.mime2DecodedAuthor;
            msgCompFields.to = from;
            CQprefs.setBoolPref("changequote.headers.ignore_reply_to", false);
        }
        CompFields2RecipientsOrig(msgCompFields);
    };
    
    
    window.addEventListener("compose-window-reopen", CQbodyListener.start, true);
    CQmsgWindowInit();
}

function onUnload(deactivatedWhileWindowOpen) {
  // Cleaning up the window UI is only needed when the
  // add-on is being deactivated/removed while the window
  // is still open. It can be skipped otherwise.
  if (!deactivatedWhileWindowOpen) {
    return
  }

}

function CQrestoreHTMLtags() {
    var doc = document.getElementById("content-frame").contentDocument;
    var inner = doc.body.innerHTML;
    if (! window.gMsgCompose.composeHTML || inner.length < 20 || inner.indexOf("([[)") < 0)
        return;
    inner = inner.replace(/\(\[\[\)/g,"<");
    inner = inner.replace(/\(\]\]\)/g,">");
    doc.body.innerHTML = inner;
    if (! CQbodyListener.QACM) {
        var imgs = doc.getElementsByTagName("img");
        for (var i=0; i<imgs.length;i++) {
            var img = imgs[i];
            var src = img.src;
            src = src.replace("%7C", ":");
            img.setAttribute("src", src);
        }
    }
    var id = window.changequote.CQgetCurrentIdentity();
    if (! id.replyOnTop) {
        content.scroll(0,10000);
        GetCurrentEditor().endOfDocument();
    }
}

var CQbodyListener = {
    start : function() {
        if (CQprefs.getPrefType("changequote.auto_quote.reverse_key") > 0) {
            var identity = CQprefs.getCharPref("changequote.auto_quote.reverse_key");
            var prefName = "mail.identity."+identity+".auto_quote";
            CQprefs.deleteBranch("changequote.auto_quote.reverse_key");
            setTimeout(function() {CQprefs.setBoolPref(prefName, ! CQprefs.getBoolPref(prefName));}, 500);
        }
        if (CQbodyListener.restoreInlineAttPref) {
            setTimeout(function() {CQprefs.setBoolPref("mail.inline_attachments", true);}, 1000);
        }
    }
};

var CQedListener = {
    NotifyDocumentCreated : function() {},
    NotifyDocumentStateChanged : function(nowDirty) {
        if ( ! (CQprefs.getIntPref("changequote.headers.type") == 0 && CQprefs.getBoolPref("changequote.headers.label_bold")) &&
            ! (CQprefs.getIntPref("changequote.headers.type") == 2 && 
            (CQprefs.getBoolPref("changequote.headers.custom_news_html_enabled") || CQprefs.getBoolPref("changequote.headers.custom_html_enabled")) 
            ))
            return;	
        if (! nowDirty) {
            var type = window.gMsgCompose.type;
            // If it's not a reply, we don't need to do anything 
            if (type != 1 && type !=2 && type !=6 && type !=7 && type !=8)
                return;
            CQrestoreHTMLtags();		
        }
    },
    NotifyDocumentWillBeDestroyed : function() {}
};
    
function CQmsgWindowInit() {
    if (typeof QuoteAndComposeManager != "undefined") 
        CQbodyListener.QACM = true;
    var cf = document.getElementById("content-frame");
    cf.addEventListener("load", cfAddLis, true);
    CQbodyListener.start();
}

function cfAddLis() {
    var ed = window.GetCurrentEditor();
    ed.addDocumentStateListener(CQedListener);
}
