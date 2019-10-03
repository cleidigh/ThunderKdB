/************************************************************************/
/*                                                                      */
/*      Account Colors  -  Thunderbird Extension  -  Compose Window     */
/*                                                                      */
/*      Javascript for Compose Window overlay                           */
/*                                                                      */
/*      Copyright (C) 2008-2018  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  16 Nov 2018                                       */
/*                                                                      */
/************************************************************************/

"use strict";

var accountColorsCompose =
{
    appInfo: Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo),
    versionComparator: Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator),
    tbVersion: "",
    
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
            accountColorsCompose.prefs.addObserver("",this,false);
        },
        
        observe: function(subject,topic,data)
        {
            if (topic != "nsPref:changed") return;
            
            /* Update Compose Window */
            
            accountColorsCompose.composeWindow();
        }
    },
    
    /* On Load */
    
    onLoad: function()
    {
        var element,style,fontcolor;
        
        window.removeEventListener("load",accountColorsCompose.onLoad,false);
        
        /* Determine Thunderbird version and set attribute */
        
        if (accountColorsCompose.versionComparator.compare(accountColorsCompose.appInfo.version,"60.0a1") >= 0) accountColorsCompose.tbVersion = "60.0";
        else if (accountColorsCompose.versionComparator.compare(accountColorsCompose.appInfo.version,"38.0a1") >= 0) accountColorsCompose.tbVersion = "38.0";
        else accountColorsCompose.tbVersion = "31.0";
        
        document.getElementById("msgcomposeWindow").setAttribute("accountcolors-tbversion",accountColorsCompose.tbVersion);
        
        /* Register preferences observer */
        
        accountColorsCompose.prefsObserver.register();
        
        /* Add listeners for Compose Window */
        
        window.addEventListener("compose-window-init",accountColorsCompose.composeWindow,true);
        window.addEventListener("compose-from-changed",accountColorsCompose.composeWindow,true);
        
        /* Initial call for Compose Window */
        
        accountColorsCompose.composeWindow();
    },
    
    /* Compose Window */
    
    composeWindow: function()
    {
        var i,menulist,accountidkey,menupopup,menuitem;
        var defaultbkgd,bkgdcolor,fontcolor,element,idkey,fontstyle,fontsize;
        
        menulist = document.getElementById("msgIdentity");
        
        if (accountColorsCompose.tbVersion >= +"38.0") accountidkey = menulist.selectedItem.getAttribute("identitykey");
        else accountidkey = menulist.selectedItem.value;
        
        bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
        
        if (accountColorsCompose.prefs.getBoolPref("compose-defaultbkgd") && bkgdcolor == "#FFFFFF") defaultbkgd = true;
        else defaultbkgd = false;
        
        /* Subject font color */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-colorfont"))  /* apply style */
        {
            element = document.getElementById("msgSubject");
            element.style.setProperty("color",accountColorsUtilities.fontColorPref(accountidkey),"");
        }
        else  /* remove style */
        {
            element = document.getElementById("msgSubject");
            element.style.removeProperty("color");
        }
        
        /* Subject background color */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-colorbkgd"))  /* apply style */
        {
            bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
            
            element = document.getElementById("msgSubject");
            if (defaultbkgd) element.style.removeProperty("background-color");
            else element.style.setProperty("background-color",bkgdcolor,"");
        }
        else  /* remove style */
        {
            element = document.getElementById("msgSubject");
            element.style.removeProperty("background-color");
        }
        
        /* From font color */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-colorfromfont"))  /* apply style */
        {
            element = document.getElementById("msgIdentity");
            element.style.setProperty("color",accountColorsUtilities.fontColorPref(accountidkey),"");
            
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label menulist-description");
            element.style.setProperty("color",accountColorsUtilities.fontColorPref(accountidkey),"");
            
            menupopup = document.getElementById("msgIdentityPopup");
            
            for (i = 0; i < menupopup.childNodes.length-1; i++)  /* exclude 'Customize From Address...' menu item */
            {
                menuitem = menupopup.childNodes[i];
                
                if (menuitem.localName == "menuitem")  /* not menu separator */
                {
                    if (accountColorsCompose.tbVersion >= +"38.0") idkey = menuitem.getAttribute("identitykey");
                    else idkey = menuitem.value;
                    
                    menuitem.style.setProperty("color",accountColorsUtilities.fontColorPref(idkey),"");
                    
                    element = document.getAnonymousElementByAttribute(menuitem,"class","menu-iconic-text menu-description");
                    element.style.setProperty("color",accountColorsUtilities.fontColorPref(idkey),"");
                }
            }
        }
        else  /* remove style */
        {
            element = document.getElementById("msgIdentity");
            element.style.removeProperty("color");
            
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label menulist-description");
            element.style.removeProperty("color");
            
            menupopup = document.getElementById("msgIdentityPopup");
            
            for (i = 0; i < menupopup.childNodes.length-1; i++)  /* exclude 'Customize From Address...' menu item */
            {
                menuitem = menupopup.childNodes[i];
                
                if (menuitem.localName == "menuitem")  /* not menu separator */
                {
                    menuitem.style.removeProperty("color");
                    
                    element = document.getAnonymousElementByAttribute(menuitem,"class","menu-iconic-text menu-description");
                    element.style.removeProperty("color");
                }
           }
        }
        
        /* From background color */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-colorfrombkgd"))  /* apply style */
        {
            bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
            
            if (defaultbkgd)
            {
                element = document.getElementById("msgIdentity");
                element.style.removeProperty("background-color");
            }
            else
            {
                element = document.getElementById("msgIdentity");
                element.style.setProperty("background-color",bkgdcolor,"");
            }
            
            menupopup = document.getElementById("msgIdentityPopup");
            
            for (i = 0; i < menupopup.childNodes.length-1; i++)  /* exclude 'Customize From Address...' menu item */
            {
                menuitem = menupopup.childNodes[i];
                
                if (menuitem.localName == "menuitem")  /* not menu separator */
                {
                    if (accountColorsCompose.tbVersion >= +"38.0") idkey = menuitem.getAttribute("identitykey");
                    else idkey = menuitem.value;
                    
                    menuitem.style.setProperty("background-color",accountColorsUtilities.bkgdColorPref(idkey),"");
                }
            }
        }
        else  /* remove style */
        {
            element = document.getElementById("msgIdentity");
            element.style.removeProperty("background-color");
            
            menupopup = document.getElementById("msgIdentityPopup");
            
            for (i = 0; i < menupopup.childNodes.length-1; i++)  /* exclude 'Customize From Address...' menu item */
            {
                menuitem = menupopup.childNodes[i];
                
                if (menuitem.localName == "menuitem")  /* not menu separator */
                {
                    menuitem.style.removeProperty("background-color");
                }
            }
        }
        
        /* To/Cc/Bcc fonts color */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-colortofont"))  /* apply style */
        {
            fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
            
            document.documentElement.style.setProperty("--ac-colortofont",fontcolor,"");
            document.getElementById("msgcomposeWindow").setAttribute("ac-colortofont","");
        }
        else  /* remove style */
        {
            document.documentElement.style.removeProperty("--ac-colortofont");
            document.getElementById("msgcomposeWindow").removeAttribute("ac-colortofont");
        }
        
        /* To/Cc/Bcc background color */
            
        if (accountColorsCompose.prefs.getBoolPref("compose-colortobkgd"))  /* apply style */
        {
            bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
            
            if (defaultbkgd)
            {
                document.documentElement.style.removeProperty("--ac-colortobkgd");
                document.getElementById("msgcomposeWindow").removeAttribute("ac-colortobkgd");
            }
            else
            {
                document.documentElement.style.setProperty("--ac-colortobkgd",bkgdcolor,"");
                document.getElementById("msgcomposeWindow").setAttribute("ac-colortobkgd","");
            }
        }
        else  /* remove style */
        {
            document.documentElement.style.removeProperty("--ac-colortobkgd");
            document.getElementById("msgcomposeWindow").removeAttribute("ac-colortobkgd");
        }
        
        /* Attachment font color */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-coloratmfont"))  /* apply style */
        {
            fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
            
            document.documentElement.style.setProperty("--ac-coloratmfont",fontcolor,"");
            document.getElementById("msgcomposeWindow").setAttribute("ac-coloratmfont","");
        }
        else  /* remove style */
        {
            document.documentElement.style.removeProperty("--ac-coloratmfont");
            document.getElementById("msgcomposeWindow").removeAttribute("ac-coloratmfont");
        }
        
        /* Attachment background color */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-coloratmbkgd"))  /* apply style */
        {
            bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
            
            element = document.getElementById("attachmentBucket");
            if (defaultbkgd) element.style.removeProperty("background-color");
            else element.style.setProperty("background-color",bkgdcolor,"");
        }
        else  /* remove style */
        {
            element = document.getElementById("attachmentBucket");
            element.style.removeProperty("background-color");
        }
        
        /* Header labels black */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-blackhdrlabels"))  /* apply style */
        {
            element = document.getElementById("addresses-box");
            element.style.setProperty("color","black","");
            
            element = document.getElementById("attachmentBucketCount");
            element.style.setProperty("color","black","");
                  
            document.getElementById("msgcomposeWindow").setAttribute("ac-blackhdrlabels","");
        }
        else  /* remove style */
        {
            element = document.getElementById("addresses-box");
            element.style.removeProperty("color");
            
            element = document.getElementById("attachmentBucketCount");
            element.style.removeProperty("color");
            
            document.getElementById("msgcomposeWindow").removeAttribute("ac-blackhdrlabels");
        }
        
        /* Header background color */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-colorhdrbkgd"))  /* apply style */
        {
            bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
            
            element = document.getElementById("msgheaderstoolbar-box");
            if (defaultbkgd) element.style.removeProperty("background-color");
            else element.style.setProperty("background-color",bkgdcolor,"");
        }
        else  /* remove style */
        {
            element = document.getElementById("msgheaderstoolbar-box");
            element.style.removeProperty("background-color");
        }
        
        /* Black field fonts */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-blackfieldfont"))  /* apply style */
        {
            document.getElementById("msgcomposeWindow").setAttribute("ac-blackfieldfont","");
        }
        else  /* remove style */
        {
            document.getElementById("msgcomposeWindow").removeAttribute("ac-blackfieldfont");
        }
        
        /* White field backgrounds on hover or focus */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-whitefieldbkgd"))  /* apply style */
        {
            document.getElementById("msgcomposeWindow").setAttribute("ac-whitefieldbkgd","");
        }
        else  /* remove style */
        {
            document.getElementById("msgcomposeWindow").removeAttribute("ac-whitefieldbkgd");
        }
        
        /* Reinstate default hover style on From menu */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-hoverfrom"))
        {
            document.getElementById("msgcomposeWindow").setAttribute("ac-hoverfrom","");
        }
        else
        {
            document.getElementById("msgcomposeWindow").removeAttribute("ac-hoverfrom");
        }
        
        /* Subject font style */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-setfontstyle"))  /* apply style */
        {
            fontstyle = accountColorsCompose.prefs.getIntPref("compose-fontstyle");
            
            element = document.getElementById("msgSubject");
            
            switch (fontstyle)
            { 
                case 0: /* Normal */
                    element.style.setProperty("font-style","normal","");
                    element.style.setProperty("font-weight","normal","");
                    break;
                case 1: /* Italic */
                    element.style.setProperty("font-style","italic","");
                    element.style.setProperty("font-weight","normal","");
                    break;
                case 2: /* Bold */
                    element.style.setProperty("font-style","normal","");
                    element.style.setProperty("font-weight","bold","");
                    break;
                case 3: /* Bold Italic */
                    element.style.setProperty("font-style","italic","");
                    element.style.setProperty("font-weight","bold","");
                    break;
            }
        }
        else  /* remove style */
        {
            element = document.getElementById("msgSubject");
            element.style.removeProperty("font-style");
            element.style.removeProperty("font-weight");
        }
        
        /* Subject font size */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-setfontsize"))  /* apply style */
        {
            fontsize = accountColorsCompose.prefs.getIntPref("compose-fontsize");
            
            element = document.getElementById("msgSubject");
            element.style.setProperty("font-size",fontsize+"px","");
        }
        else  /* remove style */
        {
            element = document.getElementById("msgSubject");
            element.style.removeProperty("font-size");
        }
        
        /* From font style */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-setidfontstyle"))  /* apply style */
        {
            fontstyle = accountColorsCompose.prefs.getIntPref("compose-idfontstyle");
            
            element = document.getElementById("msgIdentity");
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label");
            
            switch (fontstyle)
            { 
                case 0: /* Normal */
                    element.style.setProperty("font-style","normal","");
                    element.style.setProperty("font-weight","normal","");
                    break;
                case 1: /* Italic */
                    element.style.setProperty("font-style","italic","");
                    element.style.setProperty("font-weight","normal","");
                    break;
                case 2: /* Bold */
                    element.style.setProperty("font-style","normal","");
                    element.style.setProperty("font-weight","bold","");
                    break;
                case 3: /* Bold Italic */
                    element.style.setProperty("font-style","italic","");
                    element.style.setProperty("font-weight","bold","");
                    break;
            }
            
            element = document.getElementById("msgIdentity");
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label menulist-description");
            
            switch (fontstyle)
            { 
                case 0: /* Normal */
                    element.style.setProperty("font-style","normal","");
                    element.style.setProperty("font-weight","normal","");
                    break;
                case 1: /* Italic */
                    element.style.setProperty("font-style","italic","");
                    element.style.setProperty("font-weight","normal","");
                    break;
                case 2: /* Bold */
                    element.style.setProperty("font-style","normal","");
                    element.style.setProperty("font-weight","bold","");
                    break;
                case 3: /* Bold Italic */
                    element.style.setProperty("font-style","italic","");
                    element.style.setProperty("font-weight","bold","");
                    break;
            }
        }
        else  /* remove style */
        {
            element = document.getElementById("msgIdentity");
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label");
            element.style.removeProperty("font-style");
            element.style.removeProperty("font-weight");
            
            element = document.getElementById("msgIdentity");
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label menulist-description");
            element.style.removeProperty("font-style");
            element.style.removeProperty("font-weight");
        }
        
        /* Subject font size */
        
        if (accountColorsCompose.prefs.getBoolPref("compose-setidfontsize"))  /* apply style */
        {
            fontsize = accountColorsCompose.prefs.getIntPref("compose-idfontsize");
            
            element = document.getElementById("msgIdentity");
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label");
            element.style.setProperty("font-size",fontsize+"px","");
            
            element = document.getElementById("msgIdentity");
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label menulist-description");
            element.style.setProperty("font-size",fontsize+"px","");
        }
        else  /* remove style */
        {
            element = document.getElementById("msgIdentity");
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label");
            element.style.removeProperty("font-size");
            
            element = document.getElementById("msgIdentity");
            element = document.getAnonymousElementByAttribute(element,"class","menulist-label menulist-description");
            element.style.removeProperty("font-size");
        }
    },
    
    cmdOptions: function()
    {
        var optionsWindow;
        
        optionsWindow = accountColorsCompose.winmed.getMostRecentWindow("accountcolors-options");
        
        if (optionsWindow) optionsWindow.focus();
        else window.openDialog("chrome://accountcolors/content/accountcolors-options.xul","","chrome,dialog,titlebar,centerscreen",null);
    }
};

window.addEventListener("load",accountColorsCompose.onLoad,false);
