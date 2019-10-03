/************************************************************************/
/*                                                                      */
/*      Account Colors  -  Thunderbird Extension  -  Message Window     */
/*                                                                      */
/*      Javascript for Message Window overlay                           */
/*                                                                      */
/*      Copyright (C) 2008-2018  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  16 Nov 2018                                       */
/*                                                                      */
/************************************************************************/

"use strict";

var accountColorsMessage =
{
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.accountcolors."),
    
    promptService: Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),
    
    accountManager: Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager),
    
    winmed: Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator),
    
    /* Listen for changes to settings */
    
    prefsObserver:
    {
        register: function()
        {
            /* Add the observer */
            accountColorsMessage.prefs.addObserver("",this,false);
        },
        
        observe: function(subject,topic,data)
        {
            var element;
            
            if (topic != "nsPref:changed") return;
            
            /* Update Message Pane & Message Tab */
            
            accountColorsMessage.messageWindow();
        }
    },
    
    /* On Load */
    
    onLoad: function()
    {
        window.removeEventListener("load",accountColorsMessage.onLoad,false);
        
        /* Register preferences observer */
        
        accountColorsMessage.prefsObserver.register();
        
        /* Add listeners for Message Window */
        
        document.getElementById("messagepane").addEventListener("load",accountColorsMessage.messageWindow,true);
        
        /* Initial call for Message Window */
        
        accountColorsMessage.messageWindow();
    },
    
    /* Message Window */
    
    messageWindow: function()
    {
        var msgHdr,accountkey,account,accountidkey,folder,server;
        var element,fontcolor,bkgdcolor,fontstyle,style,weight,fontsize;
        
        if (gFolderDisplay != null) msgHdr = gFolderDisplay.selectedMessage;  /* if message already displayed */
        else if ("wrappedJSObject" in window.arguments[0]) msgHdr = window.arguments[0].wrappedJSObject.msgHdr;
        else if (window.arguments[0] instanceof Components.interfaces.nsIMsgDBHdr) msgHdr = window.arguments[0];
        else return;
        
        /* Color based on received account */
        
        if (accountColorsMessage.prefs.getBoolPref("message-hdraccount"))  /* color using account in message header */
        {
            accountkey = accountColorsUtilities.getAccountKey(msgHdr);  /* null string if sent message */
            account = accountColorsMessage.accountManager.getAccount(accountkey);
            
            if (account == null) accountidkey = null;  /* sent message */
            else if (account.defaultIdentity == null) accountidkey = account.key;
            else accountidkey = account.defaultIdentity.key;
        }
        else  /* color using account in which folder is located */
        {
            folder = msgHdr.folder;
            server = folder.server;
            account = accountColorsMessage.accountManager.FindAccountForServer(server);
            
            if (account.defaultIdentity == null) accountidkey = account.key;
            else accountidkey = account.defaultIdentity.key;
        }
        
        /* Subject font color */
        
        if (accountColorsMessage.prefs.getBoolPref("message-colorfont"))
        {
            fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
            
            element = document.getElementById("expandedsubjectBox");
            document.getAnonymousElementByAttribute(element,"class","headerValue").style.color = fontcolor;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.color = fontcolor;

            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.color = fontcolor;
        }
        else
        {
            element = document.getElementById("expandedsubjectBox");
            document.getAnonymousElementByAttribute(element,"class","headerValue").style.color = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.color = "";

            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.color = "";
        }
        
        /* Subject background color */
        
        if (accountColorsMessage.prefs.getBoolPref("message-colorbkgd"))
        {
            bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
            if (bkgdcolor == "#FFFFFF" && accountColorsMessage.prefs.getBoolPref("message-defaultbkgd")) bkgdcolor = "";
            
            element = document.getElementById("expandedHeaderView");
            element.style.backgroundColor = bkgdcolor;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsedHeaderView");
            if (element != null) element.style.backgroundColor = bkgdcolor;
        }
        else
        {
            element = document.getElementById("expandedHeaderView");
            element.style.backgroundColor = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsedHeaderView");
            if (element != null) element.style.backgroundColor = "";
        }
        
        /* From font color */
        
        if (accountColorsMessage.prefs.getBoolPref("message-colorfrom"))
        {
            fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
            
            element = document.getElementById("expandedfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = fontcolor;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = fontcolor;
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = fontcolor;
        }
        else
        {
            element = document.getElementById("expandedfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = "";
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = "";
        }
        
        /* Subject font style */
        
        if (accountColorsMessage.prefs.getBoolPref("message-setfontstyle"))
        {
            fontstyle = accountColorsMessage.prefs.getIntPref("message-fontstyle");
            
            switch (fontstyle)
            { 
                case 0: /* Normal */
                    style = "normal";
                    weight = "normal";
                    break;
                case 1: /* Italic */
                    style = "italic";
                    weight = "normal";
                    break;
                case 2: /* Bold */
                    style = "normal";
                    weight = "bold";
                    break;
                case 3: /* Bold Italic */
                    style = "italic";
                    weight = "bold";
                    break;
            }
            
            element = document.getElementById("expandedsubjectBox");
            document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontStyle = style;
            document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontWeight = weight;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontStyle = style;
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontWeight = weight;
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontStyle = style;
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontWeight = weight;
        }
        else
        {
            element = document.getElementById("expandedsubjectBox");
            document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontStyle = "";
            document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontWeight = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontStyle = "";
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontWeight = "";
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontStyle = "";
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontWeight = "";
        }
        
        /* Subject font size */
        
        if (accountColorsMessage.prefs.getBoolPref("message-setfontsize"))
        {
            fontsize = accountColorsMessage.prefs.getIntPref("message-fontsize");
            
            element = document.getElementById("expandedsubjectBox");
            document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontSize = fontsize+"px";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontSize = fontsize+"px";
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontSize = fontsize+"px";
        }
        else
        {
            element = document.getElementById("expandedsubjectBox");
            document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontSize = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontSize = "";
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) document.getAnonymousElementByAttribute(element,"class","headerValue").style.fontSize = "";
        }
        
        /* From font style */
        
        if (accountColorsMessage.prefs.getBoolPref("message-setfromstyle"))
        {
            fontstyle = accountColorsMessage.prefs.getIntPref("message-fromstyle");
            
            switch (fontstyle)
            { 
                case 0: /* Normal */
                    style = "normal";
                    weight = "normal";
                    break;
                case 1: /* Italic */
                    style = "italic";
                    weight = "normal";
                    break;
                case 2: /* Bold */
                    style = "normal";
                    weight = "bold";
                    break;
                case 3: /* Bold Italic */
                    style = "italic";
                    weight = "bold";
                    break;
            }
            
            element = document.getElementById("expandedfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontStyle = style;
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontWeight = weight;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontStyle = style;
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontWeight = weight;
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontStyle = style;
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontWeight = weight;
        }
        else
        {
            element = document.getElementById("expandedfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontStyle = "";
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontWeight = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontStyle = "";
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontWeight = "";
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontStyle = "";
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontWeight = "";
        }
        
        /* From font size */
        
        if (accountColorsMessage.prefs.getBoolPref("message-setfromsize"))
        {
            fontsize = accountColorsMessage.prefs.getIntPref("message-fromsize");
            
            element = document.getElementById("expandedfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontSize = fontsize+"px";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontSize = fontsize+"px";
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontSize = fontsize+"px";
        }
        else
        {
            element = document.getElementById("expandedfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontSize = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontSize = "";
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontSize = "";
        }
    },
    
    cmdOptions: function()
    {
        var optionsWindow;
        
        optionsWindow = accountColorsMessage.winmed.getMostRecentWindow("accountcolors-options");
        
        if (optionsWindow) optionsWindow.focus();
        else window.openDialog("chrome://accountcolors/content/accountcolors-options.xul","","chrome,dialog,titlebar,centerscreen",null);
    }
};

window.addEventListener("load",accountColorsMessage.onLoad,false);   /* first */
//window.addEventListener("focus",accountColorsMessage.messageWindow,false);  /* second */
