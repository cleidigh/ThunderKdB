// Import any needed modules.
var {
    Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Global variables
var CQprefs = Components.classes["@mozilla.org/preferences-service;1"].
    getService(Components.interfaces.nsIPrefBranch);
var CQinlineImages = 0;

var CQmsgComposeType = Components.interfaces.nsIMsgCompType;
var CQmsgComposeFormat = Components.interfaces.nsIMsgCompFormat;

var {
    MailUtils
} = ChromeUtils.import("resource:///modules/MailUtils.jsm");
// values for "changequote.headers.type":
// 0 = extended headers
// 1 = standard headers
// 2 = customized headers via user.js file
//
// values for "changequote.headers.date_long_format":
// 0 = long, in locale time and in locale
// 1 = long, in locale time and in english
// 2 = long, from the original message header
// 3 = custom

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://changequote/content/changequote/changequote.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {

    // Overwrite the original functions of reply and quote

    if (typeof MsgReplyToListMessageORIG == "undefined" && typeof window.MsgReplyToListMessage != "undefined") {
        var MsgReplyToListMessageORIG = window.MsgReplyToListMessage;
        window.MsgReplyToListMessage = function (event) {
            var messageArray = [CQGetFirstSelectedMessage()];
            var CQheaders_news = CQprefs.getBoolPref("changequote.set.headers.news");
            if (CQheaders_news)
                loadHeader(messageArray[0], true, true, false);
            else
                standardHeader(messageArray[0]);
            MsgReplyToListMessageORIG.apply(this, arguments);
        };
    }

    if (typeof MsgReplySenderORIG == "undefined" && typeof window.MsgReplySender != "undefined") {
        var MsgReplySenderORIG = window.MsgReplySender;
        window.MsgReplySender = function MsgReplySender(event) {

            var CQreplyformat = CQprefs.getBoolPref("changequote.replyformat.enable");
            // Choose the format of reply: clone the format of the mail?
            if (CQreplyformat)
                window.changequote.CQcomposeMessage(CQmsgComposeType.ReplyToSender, -1, false);
            else {
                // So no - usual behaviour of TB
                if (event && event.shiftKey)
                    window.changequote.CQcomposeMessage(CQmsgComposeType.ReplyToSender, CQmsgComposeFormat.OppositeOfDefault, false);
                else
                    window.changequote.CQcomposeMessage(CQmsgComposeType.ReplyToSender, CQmsgComposeFormat.Default, false);
            }
        }
    }

    if (typeof MsgReplyToAllMessageORIG == "undefined" && typeof window.MsgReplyToAllMessage != "undefined") {
        var MsgReplyToAllMessageORIG = window.MsgReplyToAllMessage;
        window.MsgReplyToAllMessage = function MsgReplyToAllMessage(event) {

            var CQreplyformat = CQprefs.getBoolPref("changequote.replyformat.enable");
            if (CQreplyformat)
                window.changequote.CQcomposeMessage(CQmsgComposeType.ReplyAll, -1, false);
            else {
                // So no - usual behaviour of TB
                if (event && event.shiftKey)
                    window.changequote.CQcomposeMessage(CQmsgComposeType.ReplyAll, CQmsgComposeFormat.OppositeOfDefault, false);
                else
                    window.changequote.CQcomposeMessage(CQmsgComposeType.ReplyAll, CQmsgComposeFormat.Default, false);
            }
        }
    }

    if (typeof MsgReplyGroupORIG == "undefined" && typeof window.MsgReplyGroup != "undefined") {
        var MsgReplyGroupORIG = window.MsgReplyGroup;
        window.MsgReplyGroup = function MsgReplyGroup(event) {

            if (event && event.shiftKey)
                window.changequote.CQcomposeMessage(CQmsgComposeType.ReplyToGroup, CQmsgComposeFormat.OppositeOfDefault, true);
            else
                window.changequote.CQcomposeMessage(CQmsgComposeType.ReplyToGroup, CQmsgComposeFormat.Default, true);

            // if (CQinlineImages == 1)
            //	 preRestoreInline();
        }
    }

    if (typeof QuoteSelectedMessageORIG == "undefined" && typeof window.QuoteSelectedMessage != "undefined") {
        var QuoteSelectedMessageORIG = window.QuoteSelectedMessage;
        window.QuoteSelectedMessage = function () {
            var CQheaders_type = CQprefs.getIntPref("changequote.headers.type");
            var CQdateformat = CQprefs.getIntPref("changequote.headers.date_long_format");
            CQuse_date_long = CQprefs.getBoolPref("changequote.headers.date_long");
            var selectedURIs = GetSelectedMessages();
            if (selectedURIs) {
                for (i = 0; i < selectedURIs.length; i++) {
                    var uri = selectedURIs[i];
                    if (CQdateformat == 2)
                        CQparseheader(uri);
                    if (CQheaders_type == 0)
                        loadHeader(uri, false, false, true);
                    else if (CQheaders_type == 1)
                        standardHeader(null);
                    else
                        loadHeader(uri, true, false, true);
                    window.gMsgCompose.quoteMessage(uri);
                }
            }
        }
    }
    
    if (typeof MsgForwardMessageORIG == "undefined" && typeof window.MsgForwardMessage != "undefined") {
        var MsgForwardMessageORIG = window.MsgForwardMessage;
        window.MsgForwardMessage = function (event) {
            window.closeWindowOrMarkReadAfterReply(window.changequote.CQGetFirstSelectedMessage());
            MsgForwardMessageORIG.apply(this, arguments);        
        }
    }

    window.addEventListener("load", window.changequote.CQaddListener, false);
    window.addEventListener("unload", window.standardHeader, false);
    
    
    var replyToSenderButton = window.document.getElementById("hdrReplyToSenderButton");
    // Turn the button into a menu and add the popup menu.
    replyToSenderButton.setAttribute("type", "menu-button");
    replyToSenderButton.setAttribute("wantdropmarker", "true");
    replyToSenderButton.setAttribute("is","toolbarbutton-menu-button");
    var labelReplyToSenderButton = replyToSenderButton.getAttribute("label");
        
    var child1 = replyToSenderButton.removeChild(replyToSenderButton.childNodes[0]);
    var child2 = replyToSenderButton.removeChild(replyToSenderButton.childNodes[0]);
    
    replyToSenderButton.appendChild(window.MozXULElement.parseXULToFragment(`<menupopup id="hdrReplyToSenderDropdown" onpopupshowing="changequote.CQsetReverseLabelHRD()" >
        <menuseparator />
        <menuitem label="&CQlabelitem1;" tooltiptext="&CQlabelitem1;" oncommand="changequote.replyHTML(event,false);" />
        <menuitem label="&CQlabelitem2;"  tooltiptext="&CQlabelitem2;" oncommand="changequote.replyText(event,false);" />
        <menuseparator />
        <menuitem id="replyhtml_reversequote_hrd3" label="&CQlabelitem1; &noquote;" tooltiptext="&CQlabelitem1;" oncommand="changequote.replyHTML(event,true);" />
        <menuitem id="replytext_reversequote_hrd3" label="&CQlabelitem2;  &noquote;"  tooltiptext="&CQlabelitem2;" oncommand="changequote.replyText(event,true);" />
        <menuitem id="replyhtml_reversequote_hrd4" label="&CQlabelitem1; &yesquote;" tooltiptext="&CQlabelitem1;" oncommand="changequote.replyHTML(event,true);" />
        <menuitem id="replytext_reversequote_hrd4" label="&CQlabelitem2; &yesquote;"  tooltiptext="&CQlabelitem2;" oncommand="changequote.replyText(event,true);" />
        <menuseparator />
        <menuitem label="&CQnoReplyTo;" oncommand="changequote.CQnoReplyTo(event);" />
        </menupopup>
        <toolbarbutton id="hdrReplyToSenderButtonToolbar" class="box-inherit toolbarbutton-menubutton-button" flex="1" allowevents="true">
        </toolbarbutton>
        <dropmarker type="menu-button" class="toolbarbutton-menubutton-dropmarker"/>`,["chrome://changequote/locale/changequote.dtd"]));
    
    var hdrReplyToSenderButtonToolbar = window.document.getElementById("hdrReplyToSenderButtonToolbar");
    hdrReplyToSenderButtonToolbar.removeChild(hdrReplyToSenderButtonToolbar.childNodes[0]);
    hdrReplyToSenderButtonToolbar.removeChild(hdrReplyToSenderButtonToolbar.childNodes[0]);
    child1.setAttribute("type","menu-button");
    hdrReplyToSenderButtonToolbar.appendChild(child1);
    hdrReplyToSenderButtonToolbar.appendChild(child2);
    hdrReplyToSenderButtonToolbar.setAttribute("label",labelReplyToSenderButton);
    

    var hdrReplyButton = window.document.getElementById("hdrReplyButton");
    // Turn the button into a menu and add the popup menu.
    hdrReplyButton.setAttribute("type", "menu-button");
    hdrReplyButton.setAttribute("wantdropmarker", "true");
    hdrReplyButton.setAttribute("is","toolbarbutton-menu-button");
    var labelhdrReplyButton = hdrReplyButton.getAttribute("label");
        
    var child1 = hdrReplyButton.removeChild(hdrReplyButton.childNodes[0]);
    var child2 = hdrReplyButton.removeChild(hdrReplyButton.childNodes[0]);
    
    hdrReplyButton.appendChild(window.MozXULElement.parseXULToFragment(`<menupopup id="hdrReplyDropdown" onpopupshowing="changequote.CQsetReverseLabelHRD()">
		<menuseparator />
		<menuitem label="&CQlabelitem1;" tooltiptext="&CQlabelitem1;" oncommand="changequote.replyHTML(event,false);" />
		<menuitem label="&CQlabelitem2;"  tooltiptext="&CQlabelitem2;" oncommand="changequote.replyText(event,false);" />
		<menuseparator />
		<menuitem id="replyhtml_reversequote_hrd1" label="&CQlabelitem1; &noquote;" tooltiptext="&CQlabelitem1;" oncommand="changequote.replyHTML(event,true);" />
		<menuitem id="replytext_reversequote_hrd1" label="&CQlabelitem2;  &noquote;"  tooltiptext="&CQlabelitem2;" oncommand="changequote.replyText(event,true);" />
		<menuitem id="replyhtml_reversequote_hrd2" label="&CQlabelitem1; &yesquote;" tooltiptext="&CQlabelitem1;" oncommand="changequote.replyHTML(event,true);" />
		<menuitem id="replytext_reversequote_hrd2" label="&CQlabelitem2; &yesquote;"  tooltiptext="&CQlabelitem2;" oncommand="changequote.replyText(event,true);" />
		<menuseparator />
		<menuitem label="&CQnoReplyTo;" oncommand="changequote.CQnoReplyTo(event);" />
        </menupopup>
        <toolbarbutton id="hdrReplyButtonToolbar" class="box-inherit toolbarbutton-menubutton-button" flex="1" allowevents="true">
        </toolbarbutton>
        <dropmarker type="menu-button" class="toolbarbutton-menubutton-dropmarker"/>`,["chrome://changequote/locale/changequote.dtd"]));
    
    
    var hdrReplyButtonToolbar = window.document.getElementById("hdrReplyButtonToolbar");
    hdrReplyButtonToolbar.removeChild(hdrReplyButtonToolbar.childNodes[0]);
    hdrReplyButtonToolbar.removeChild(hdrReplyButtonToolbar.childNodes[0]);
    child1.setAttribute("type","menu-button");
    hdrReplyButtonToolbar.appendChild(child1);
    hdrReplyButtonToolbar.appendChild(child2);
    hdrReplyButtonToolbar.setAttribute("label",labelhdrReplyButton);
    

    var hdrReplyAllDropdown = window.document.getElementById("hdrReplyAllDropdown");
    hdrReplyAllDropdown.setAttribute("onpopupshowing", "changequote.CQsetReverseLabelAllHRD()");     
    
    hdrReplyAllDropdown.appendChild(window.MozXULElement.parseXULToFragment(`<menuseparator />
		<menuitem label="&CQlabelitem1;"  tooltiptext="&CQlabelitem1;" oncommand="changequote.replyAllHTML(event,false);" />
		<menuitem label="&CQlabelitem2;"  tooltiptext="&CQlabelitem2;"  oncommand="changequote.replyAllText(event,false);" />
		<menuseparator />
		<menuitem id="replyhtmlALL_reversequote_hrd1" label="&CQlabelitem1; &noquote;" tooltiptext="&CQlabelitem1;" oncommand="changequote.replyAllHTML(event,true);" />
		<menuitem id="replytextALL_reversequote_hrd1" label="&CQlabelitem2;  &noquote;"  tooltiptext="&CQlabelitem2;" oncommand="changequote.replyAllText(event,true);" />
		<menuitem id="replyhtmlALL_reversequote_hrd2" label="&CQlabelitem1; &yesquote;" tooltiptext="&CQlabelitem1;" oncommand="changequote.replyAllHTML(event,true);" />
		<menuitem id="replytextALL_reversequote_hrd2" label="&CQlabelitem2; &yesquote;"  tooltiptext="&CQlabelitem2;" oncommand="changequote.replyAllText(event,true);" />`,
        ["chrome://changequote/locale/changequote.dtd"]));


}

function onUnload(deactivatedWhileWindowOpen) {
    // Cleaning up the window UI is only needed when the
    // add-on is being deactivated/removed while the window
    // is still open. It can be skipped otherwise.
    if (!deactivatedWhileWindowOpen) {
        return
    }

}
