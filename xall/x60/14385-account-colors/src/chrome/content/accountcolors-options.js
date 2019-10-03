/************************************************************************/
/*                                                                      */
/*      Account Colors  -  Thunderbird Extension  -  Options            */
/*                                                                      */
/*      Javascript for Options dialog                                   */
/*                                                                      */
/*      Copyright (C) 2008-2018  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  16 Nov 2018                                       */
/*                                                                      */
/************************************************************************/

"use strict";

var accountColorsOptions =
{
    appInfo: Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo),
    versionComparator: Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator),
    tbVersion: "",
    
    runtime: Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime),
    
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.accountcolors."),
    
    accountManager: Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager),
    
    pickerButton: null,
    
    /********************************************************************/
    
    /* Initialise preferences */
    
    initPrefs: function()
    {
        var container,template,accountidbox,account,identity,index,acc,id;
        var background,menulist,fontstyle,fontsize;
        var checkbox,checkstate;
        var accounts = new Array();
        var identities = new Array();
        
        /* Determine Thunderbird version and set attribute */
        
        if (accountColorsOptions.versionComparator.compare(accountColorsOptions.appInfo.version,"60.0a1") >= 0) accountColorsOptions.tbVersion = "60.0";
        else if (accountColorsOptions.versionComparator.compare(accountColorsOptions.appInfo.version,"38.0a1") >= 0) accountColorsOptions.tbVersion = "38.0";
        else accountColorsOptions.tbVersion = "31.0";
        
        document.getElementById("accountcolors-options").setAttribute("accountcolors-tbversion",accountColorsOptions.tbVersion);
        
        /* Add listener for mousedown on picker panel */
        
        document.getElementById("accountcolors-picker-panel").addEventListener("mousedown",accountColorsOptions.pickerPanelMouseDown,false);
        
        /* Add listeners for popupshowing on font/background palettes */
        
        document.getElementById("accountcolors-picker-fontpalette").addEventListener("popupshowing",accountColorsOptions.pickerPaletteShowing,false);
        document.getElementById("accountcolors-picker-bkgdpalette").addEventListener("popupshowing",accountColorsOptions.pickerPaletteShowing,false);
        
        /* Account/Identity Colors */
        
        index = 0;
        
        accounts = accountColorsOptions.accountManager.accounts;
        
        for (acc = 0; acc < accountColorsUtilities.getLength(accounts); acc++)
        {
            account = accountColorsUtilities.getAccount(accounts,acc);
            
            identities = account.identities;
            
            if (accountColorsUtilities.getLength(identities) == 0)  /* Local Folders account or Blogs & Newsfeeds account */
            {
                container = document.getElementById("accountcolors-accountidbox-container");  /* accountidbox container */
                template = document.getElementById("accountcolors-accountidbox");  /* accountidbox template */
                
                accountidbox = container.appendChild(template.cloneNode(true));  /* add new accountidbox */
                
                accountidbox.setAttribute("id","accountcolors-accountidbox"+index);
                accountidbox.children[0].setAttribute("id","accountcolors-accountname"+index);
                accountidbox.children[1].setAttribute("id","accountcolors-identityname"+index);
                accountidbox.children[2].setAttribute("id","accountcolors-fontpicker"+index);
                accountidbox.children[3].setAttribute("id","accountcolors-bkgdpicker"+index);
                
                document.getElementById("accountcolors-accountidbox"+index).setAttribute("ac-accountidkey",account.key);
                document.getElementById("accountcolors-accountidbox"+index).setAttribute("ac-accountidtype","account");
                document.getElementById("accountcolors-accountidbox"+index).hidden = false;
                
                document.getElementById("accountcolors-identityname"+index).style.borderColor = "#E0E0E0";
                document.getElementById("accountcolors-identityname"+index).style.backgroundColor = "#F0F0F0";
                
                document.getElementById("accountcolors-accountname"+index).value = account.incomingServer.prettyName;
                
                try
                {
                    document.getElementById("accountcolors-accountname"+index).style.color = accountColorsOptions.prefs.getCharPref(account.key+"-fontcolor");
                    accountColorsOptions.pickerSetColor("accountcolors-fontpicker"+index,accountColorsOptions.prefs.getCharPref(account.key+"-fontcolor"));
                }
                catch(e)
                {
                    if (account.incomingServer == accountColorsOptions.accountManager.localFoldersServer)
                    {
                        try  /* compatibility with Version 3.0 */
                        {
                            document.getElementById("accountcolors-accountname"+index).style.color = accountColorsOptions.prefs.getCharPref("idLF"+"-fontcolor");
                            accountColorsOptions.pickerSetColor("accountcolors-fontpicker"+index,accountColorsOptions.prefs.getCharPref("idLF"+"-fontcolor"));
                        }
                        catch (e)
                        {
                            document.getElementById("accountcolors-accountname"+index).style.color = "#000000";
                            accountColorsOptions.pickerSetColor("accountcolors-fontpicker"+index,"#000000");
                        }
                    }
                    else
                    {
                        document.getElementById("accountcolors-accountname"+index).style.color = "#000000";
                        accountColorsOptions.pickerSetColor("accountcolors-fontpicker"+index,"#000000");
                    }
                }
                
                try
                {
                    document.getElementById("accountcolors-accountname"+index).style.backgroundColor = accountColorsOptions.prefs.getCharPref(account.key+"-bkgdcolor");
                    accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+index,accountColorsOptions.prefs.getCharPref(account.key+"-bkgdcolor"));
                }
                catch(e)
                {
                    if (account.incomingServer == accountColorsOptions.accountManager.localFoldersServer)
                    {
                        try  /* compatibility with Version 3.0 */
                        {
                            document.getElementById("accountcolors-accountname"+index).style.backgroundColor = accountColorsOptions.prefs.getCharPref("idLF"+"-bkgdcolor");
                            accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+index,accountColorsOptions.prefs.getCharPref("idLF"+"-bkgdcolor"));
                        }
                        catch (e)
                        {
                            document.getElementById("accountcolors-accountname"+index).style.backgroundColor = "#FFFFFF";
                            accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+index,"#FFFFFF");
                        }
                    }
                    else
                    {
                        document.getElementById("accountcolors-accountname"+index).style.backgroundColor = "#FFFFFF";
                        accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+index,"#FFFFFF");
                    }
                }
                
                index++;
            }
            else
            {    
                for (id = 0; id < accountColorsUtilities.getLength(identities); id++)
                {
                    container = document.getElementById("accountcolors-accountidbox-container");  /* accountidbox container */
                    template = document.getElementById("accountcolors-accountidbox");  /* accountidbox template */
                    
                    accountidbox = container.appendChild(template.cloneNode(true));  /* add new accountidbox */
                    
                    accountidbox.setAttribute("id","accountcolors-accountidbox"+index);
                    accountidbox.children[0].setAttribute("id","accountcolors-accountname"+index);
                    accountidbox.children[1].setAttribute("id","accountcolors-identityname"+index);
                    accountidbox.children[2].setAttribute("id","accountcolors-fontpicker"+index);
                    accountidbox.children[3].setAttribute("id","accountcolors-bkgdpicker"+index);
                    
                    identity = accountColorsUtilities.getIdentity(identities,id);
                    
                    document.getElementById("accountcolors-accountidbox"+index).setAttribute("ac-accountidkey",identity.key);
                    document.getElementById("accountcolors-accountidbox"+index).setAttribute("ac-accountidtype","accountid");
                    document.getElementById("accountcolors-accountidbox"+index).hidden = false;
                    
                    if (id > 0)  /* not default identity */
                    {
                        document.getElementById("accountcolors-accountidbox"+index).setAttribute("ac-accountidtype","id");
                        document.getElementById("accountcolors-accountname"+index).style.visibility = "hidden";
                    }
                    
                    document.getElementById("accountcolors-accountname"+index).value = account.incomingServer.prettyName;
                    document.getElementById("accountcolors-identityname"+index).value = identity.identityName;
                    
                    try
                    {
                        document.getElementById("accountcolors-accountname"+index).style.color = accountColorsOptions.prefs.getCharPref(identity.key+"-fontcolor");
                        document.getElementById("accountcolors-identityname"+index).style.color = accountColorsOptions.prefs.getCharPref(identity.key+"-fontcolor");
                        accountColorsOptions.pickerSetColor("accountcolors-fontpicker"+index,accountColorsOptions.prefs.getCharPref(identity.key+"-fontcolor"));
                    }
                    catch(e)
                    {
                        try  /* compatibility with Version 2.0 */
                        {
                            document.getElementById("accountcolors-accountname"+index).style.color = accountColorsOptions.prefs.getCharPref(account.key+"-fontcolor");
                            document.getElementById("accountcolors-identityname"+index).style.color = accountColorsOptions.prefs.getCharPref(account.key+"-fontcolor");
                            accountColorsOptions.pickerSetColor("accountcolors-fontpicker"+index,accountColorsOptions.prefs.getCharPref(account.key+"-fontcolor"));
                        }
                        catch (e)
                        {
                            document.getElementById("accountcolors-accountname"+index).style.color = "#000000";
                            document.getElementById("accountcolors-identityname"+index).style.color = "#000000";
                            accountColorsOptions.pickerSetColor("accountcolors-fontpicker"+index,"#000000");
                        }
                    }
                    
                    try
                    {
                        document.getElementById("accountcolors-accountname"+index).style.backgroundColor = accountColorsOptions.prefs.getCharPref(identity.key+"-bkgdcolor");
                        document.getElementById("accountcolors-identityname"+index).style.backgroundColor = accountColorsOptions.prefs.getCharPref(identity.key+"-bkgdcolor");
                        accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+index,accountColorsOptions.prefs.getCharPref(identity.key+"-bkgdcolor"));
                    }
                    catch(e)
                    {
                        try  /* compatibility with Version 2.0 */
                        {
                            document.getElementById("accountcolors-accountname"+index).style.backgroundColor = accountColorsOptions.prefs.getCharPref(account.key+"-bkgdcolor");
                            document.getElementById("accountcolors-identityname"+index).style.backgroundColor = accountColorsOptions.prefs.getCharPref(account.key+"-bkgdcolor");
                            accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+index,accountColorsOptions.prefs.getCharPref(account.key+"-bkgdcolor"));
                        }
                        catch (e)
                        {
                            document.getElementById("accountcolors-accountname"+index).style.backgroundColor = "#FFFFFF";
                            document.getElementById("accountcolors-identityname"+index).style.backgroundColor = "#FFFFFF";
                            accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+index,"#FFFFFF");
                        }
                    }
                    
                    index++;
                }
            }
        }
        
        container = document.getElementById("accountcolors-accountidbox-container");  /* accountidbox container */
        template = document.getElementById("accountcolors-accountidbox");  /* accountidbox template */
        container.removeChild(template);
        
        /* Folder Pane Options */
        
        checkbox = document.getElementById("accountcolors-folder-setfontstyle");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-setfontstyle");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-folder-fontstyle");
        menulist.disabled = !checkbox.checked;
        menulist.appendItem("Normal",0);
        menulist.appendItem("Italic",1);
        menulist.appendItem("Bold",2);
        menulist.appendItem("Bold Italic",3);
        try
        {
            fontstyle = accountColorsOptions.prefs.getIntPref("folder-fontstyle");
            menulist.selectedIndex = fontstyle;
        }
        catch(e)
        {
            menulist.selectedIndex = 2;
        }
        
        checkbox = document.getElementById("accountcolors-folder-setfontsize");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-setfontsize");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-folder-fontsize");
        menulist.disabled = !checkbox.checked;
        for (index = 10; index <= 18; index++)
        {
            menulist.appendItem(index,index);
        }
        try
        {
            fontsize = accountColorsOptions.prefs.getIntPref("folder-fontsize");
            menulist.selectedIndex = fontsize-10;
        }
        catch(e)
        {
            menulist.selectedIndex = 2;
        }
        
        checkbox = document.getElementById("accountcolors-folder-colorfont");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-colorfont");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-colorbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-colorbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-colorfldfont");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-colorfldfont");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-colorfldbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-colorfldbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-defaultbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-defaultbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-boldnewmail");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-boldnewmail");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-undernewmail");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-undernewmail");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-noboldunread");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-noboldunread");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-showlines");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-showlines");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-darkerbar");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-darkerbar");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-incspacing");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-incspacing");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-folder-hoverselect");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("folder-hoverselect");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        /* Thread Pane Options */
        
        checkbox = document.getElementById("accountcolors-thread-setfontstyle");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-setfontstyle");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-thread-fontstyle");
        menulist.disabled = !checkbox.checked;
        menulist.appendItem("Normal",0);
        menulist.appendItem("Italic",1);
        menulist.appendItem("Bold",2);
        menulist.appendItem("Bold Italic",3);
        try
        {
            fontstyle = accountColorsOptions.prefs.getIntPref("thread-fontstyle");
            menulist.selectedIndex = fontstyle;
        }
        catch(e)
        {
            menulist.selectedIndex = 0;
        }
        
        checkbox = document.getElementById("accountcolors-thread-setfontsize");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-setfontsize");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-thread-fontsize");
        menulist.disabled = !checkbox.checked;
        for (index = 10; index <= 18; index++)
        {
            menulist.appendItem(index,index);
        }
        try
        {
            fontsize = accountColorsOptions.prefs.getIntPref("thread-fontsize");
            menulist.selectedIndex = fontsize-10;
        }
        catch(e)
        {
            menulist.selectedIndex = 2;
        }
        
        checkbox = document.getElementById("accountcolors-thread-setfromstyle");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-setfromstyle");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-thread-fromstyle");
        menulist.disabled = !checkbox.checked;
        menulist.appendItem("Normal",0);
        menulist.appendItem("Italic",1);
        menulist.appendItem("Bold",2);
        menulist.appendItem("Bold Italic",3);
        try
        {
            fontstyle = accountColorsOptions.prefs.getIntPref("thread-fromstyle");
            menulist.selectedIndex = fontstyle;
        }
        catch(e)
        {
            menulist.selectedIndex = 0;
        }
        
        checkbox = document.getElementById("accountcolors-thread-setfromsize");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-setfromsize");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-thread-fromsize");
        menulist.disabled = !checkbox.checked;
        for (index = 10; index <= 18; index++)
        {
            menulist.appendItem(index,index);
        }
        try
        {
            fontsize = accountColorsOptions.prefs.getIntPref("thread-fromsize");
            menulist.selectedIndex = fontsize-10;
        }
        catch(e)
        {
            menulist.selectedIndex = 2;
        }
        
        checkbox = document.getElementById("accountcolors-thread-colorfont");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-colorfont");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-colorbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-colorbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-colorfrom");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-colorfrom");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-colorother");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-colorother");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-hdraccount");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-hdraccount");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-boldsubject");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-boldsubject");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-boldfrom");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-boldfrom");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-showstripes");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-showstripes");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-darkerbar");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-darkerbar");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-incspacing");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-incspacing");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-thread-hoverselect");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("thread-hoverselect");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        /* Message Pane, Message Tab & Message Window Options */
        
        checkbox = document.getElementById("accountcolors-message-setfontstyle");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("message-setfontstyle");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-message-fontstyle");
        menulist.disabled = !checkbox.checked;
        menulist.appendItem("Normal",0);
        menulist.appendItem("Italic",1);
        menulist.appendItem("Bold",2);
        menulist.appendItem("Bold Italic",3);
        try
        {
            fontstyle = accountColorsOptions.prefs.getIntPref("message-fontstyle");
            menulist.selectedIndex = fontstyle;
        }
        catch(e)
        {
            menulist.selectedIndex = 2;
        }
        
        checkbox = document.getElementById("accountcolors-message-setfontsize");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("message-setfontsize");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-message-fontsize");
        menulist.disabled = !checkbox.checked;
        for (index = 10; index <= 22; index++)
        {
            menulist.appendItem(index,index);
        }
        try
        {
            fontsize = accountColorsOptions.prefs.getIntPref("message-fontsize");
            menulist.selectedIndex = fontsize-10;
        }
        catch(e)
        {
            menulist.selectedIndex = 2;
        }
        
        checkbox = document.getElementById("accountcolors-message-setfromstyle");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("message-setfromstyle");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-message-fromstyle");
        menulist.disabled = !checkbox.checked;
        menulist.appendItem("Normal",0);
        menulist.appendItem("Italic",1);
        menulist.appendItem("Bold",2);
        menulist.appendItem("Bold Italic",3);
        try
        {
            fontstyle = accountColorsOptions.prefs.getIntPref("message-fromstyle");
            menulist.selectedIndex = fontstyle;
        }
        catch(e)
        {
            menulist.selectedIndex = 0;
        }
        
        checkbox = document.getElementById("accountcolors-message-setfromsize");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("message-setfromsize");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-message-fromsize");
        menulist.disabled = !checkbox.checked;
        for (index = 10; index <= 22; index++)
        {
            menulist.appendItem(index,index);
        }
        try
        {
            fontsize = accountColorsOptions.prefs.getIntPref("message-fromsize");
            menulist.selectedIndex = fontsize-10;
        }
        catch(e)
        {
            menulist.selectedIndex = 2;
        }
        
        checkbox = document.getElementById("accountcolors-message-colorfont");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("message-colorfont");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-message-colorbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("message-colorbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-message-colorfrom");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("message-colorfrom");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-message-hdraccount");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("message-hdraccount");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-message-defaultbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("message-defaultbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        /* Compose Window Options */
        
        checkbox = document.getElementById("accountcolors-compose-setfontstyle");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-setfontstyle");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-compose-fontstyle");
        menulist.disabled = !checkbox.checked;
        menulist.appendItem("Normal",0);
        menulist.appendItem("Italic",1);
        menulist.appendItem("Bold",2);
        menulist.appendItem("Bold Italic",3);
        try
        {
            fontstyle = accountColorsOptions.prefs.getIntPref("compose-fontstyle");
            menulist.selectedIndex = fontstyle;
        }
        catch(e)
        {
            menulist.selectedIndex = 0;
        }
        
        checkbox = document.getElementById("accountcolors-compose-setfontsize");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-setfontsize");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-compose-fontsize");
        menulist.disabled = !checkbox.checked;
        for (index = 10; index <= 22; index++)
        {
            menulist.appendItem(index,index);
        }
        try
        {
            fontsize = accountColorsOptions.prefs.getIntPref("compose-fontsize");
            menulist.selectedIndex = fontsize-10;
        }
        catch(e)
        {
            menulist.selectedIndex = 2;
        }
        
        checkbox = document.getElementById("accountcolors-compose-setidfontstyle");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-setidfontstyle");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-compose-idfontstyle");
        menulist.disabled = !checkbox.checked;
        menulist.appendItem("Normal",0);
        menulist.appendItem("Italic",1);
        menulist.appendItem("Bold",2);
        menulist.appendItem("Bold Italic",3);
        try
        {
            fontstyle = accountColorsOptions.prefs.getIntPref("compose-idfontstyle");
            menulist.selectedIndex = fontstyle;
        }
        catch(e)
        {
            menulist.selectedIndex = 0;
        }
        
        checkbox = document.getElementById("accountcolors-compose-setidfontsize");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-setidfontsize");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        menulist = document.getElementById("accountcolors-compose-idfontsize");
        menulist.disabled = !checkbox.checked;
        for (index = 10; index <= 22; index++)
        {
            menulist.appendItem(index,index);
        }
        try
        {
            fontsize = accountColorsOptions.prefs.getIntPref("compose-idfontsize");
            menulist.selectedIndex = fontsize-10;
        }
        catch(e)
        {
            menulist.selectedIndex = 2;
        }
        
        checkbox = document.getElementById("accountcolors-compose-colorfont");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-colorfont");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-colorbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-colorbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-colorfromfont");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-colorfromfont");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-colorfrombkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-colorfrombkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-colortofont");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-colortofont");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-colortobkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-colortobkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-coloratmfont");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-coloratmfont");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-coloratmbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-coloratmbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-blackhdrlabels");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-blackhdrlabels");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-colorhdrbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-colorhdrbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-blackfieldfont");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-blackfieldfont");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-whitefieldbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-whitefieldbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-defaultbkgd");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-defaultbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("accountcolors-compose-hoverfrom");
        try
        {
            checkstate = accountColorsOptions.prefs.getBoolPref("compose-hoverfrom");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
    },
    
    /********************************************************************/
    
    /* Save preferences */
    
    savePrefs: function()
    {
        var container,accountidkey,index;
        
        /* Account/Identity Colors */
        
        container = document.getElementById("accountcolors-accountidbox-container");  /* accountidbox container */
        
        for (index = 0; index < container.children.length; index++)
        {
            if (document.getElementById("accountcolors-accountidbox"+index).hidden == false)
            {
                accountidkey = document.getElementById("accountcolors-accountidbox"+index).getAttribute("ac-accountidkey");
                accountColorsOptions.prefs.setCharPref(accountidkey+"-fontcolor",accountColorsOptions.pickerGetColor("accountcolors-fontpicker"+index));
                accountColorsOptions.prefs.setCharPref(accountidkey+"-bkgdcolor",accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index));
            }
        }
        
        /* Folder Pane Options */
        
        accountColorsOptions.prefs.setBoolPref("folder-setfontstyle",document.getElementById("accountcolors-folder-setfontstyle").checked);
        accountColorsOptions.prefs.setIntPref("folder-fontstyle",document.getElementById("accountcolors-folder-fontstyle").value);
        accountColorsOptions.prefs.setBoolPref("folder-setfontsize",document.getElementById("accountcolors-folder-setfontsize").checked);
        accountColorsOptions.prefs.setIntPref("folder-fontsize",document.getElementById("accountcolors-folder-fontsize").value);
        accountColorsOptions.prefs.setBoolPref("folder-colorfont",document.getElementById("accountcolors-folder-colorfont").checked);
        accountColorsOptions.prefs.setBoolPref("folder-colorbkgd",document.getElementById("accountcolors-folder-colorbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("folder-colorfldfont",document.getElementById("accountcolors-folder-colorfldfont").checked);
        accountColorsOptions.prefs.setBoolPref("folder-colorfldbkgd",document.getElementById("accountcolors-folder-colorfldbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("folder-defaultbkgd",document.getElementById("accountcolors-folder-defaultbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("folder-boldnewmail",document.getElementById("accountcolors-folder-boldnewmail").checked);
        accountColorsOptions.prefs.setBoolPref("folder-undernewmail",document.getElementById("accountcolors-folder-undernewmail").checked);
        accountColorsOptions.prefs.setBoolPref("folder-noboldunread",document.getElementById("accountcolors-folder-noboldunread").checked);
        accountColorsOptions.prefs.setBoolPref("folder-showlines",document.getElementById("accountcolors-folder-showlines").checked);
        accountColorsOptions.prefs.setBoolPref("folder-darkerbar",document.getElementById("accountcolors-folder-darkerbar").checked);
        accountColorsOptions.prefs.setBoolPref("folder-incspacing",document.getElementById("accountcolors-folder-incspacing").checked);
        accountColorsOptions.prefs.setBoolPref("folder-hoverselect",document.getElementById("accountcolors-folder-hoverselect").checked);
        
        /* Thread Pane Options */
        
        accountColorsOptions.prefs.setBoolPref("thread-setfontstyle",document.getElementById("accountcolors-thread-setfontstyle").checked);
        accountColorsOptions.prefs.setIntPref("thread-fontstyle",document.getElementById("accountcolors-thread-fontstyle").value);
        accountColorsOptions.prefs.setBoolPref("thread-setfontsize",document.getElementById("accountcolors-thread-setfontsize").checked);
        accountColorsOptions.prefs.setIntPref("thread-fontsize",document.getElementById("accountcolors-thread-fontsize").value);
        accountColorsOptions.prefs.setBoolPref("thread-setfromstyle",document.getElementById("accountcolors-thread-setfromstyle").checked);
        accountColorsOptions.prefs.setIntPref("thread-fromstyle",document.getElementById("accountcolors-thread-fromstyle").value);
        accountColorsOptions.prefs.setBoolPref("thread-setfromsize",document.getElementById("accountcolors-thread-setfromsize").checked);
        accountColorsOptions.prefs.setIntPref("thread-fromsize",document.getElementById("accountcolors-thread-fromsize").value);
        accountColorsOptions.prefs.setBoolPref("thread-colorfont",document.getElementById("accountcolors-thread-colorfont").checked);
        accountColorsOptions.prefs.setBoolPref("thread-colorbkgd",document.getElementById("accountcolors-thread-colorbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("thread-colorfrom",document.getElementById("accountcolors-thread-colorfrom").checked);
        accountColorsOptions.prefs.setBoolPref("thread-colorother",document.getElementById("accountcolors-thread-colorother").checked);
        accountColorsOptions.prefs.setBoolPref("thread-hdraccount",document.getElementById("accountcolors-thread-hdraccount").checked);
        accountColorsOptions.prefs.setBoolPref("thread-boldsubject",document.getElementById("accountcolors-thread-boldsubject").checked);
        accountColorsOptions.prefs.setBoolPref("thread-boldfrom",document.getElementById("accountcolors-thread-boldfrom").checked);
        accountColorsOptions.prefs.setBoolPref("thread-showstripes",document.getElementById("accountcolors-thread-showstripes").checked);
        accountColorsOptions.prefs.setBoolPref("thread-darkerbar",document.getElementById("accountcolors-thread-darkerbar").checked);
        accountColorsOptions.prefs.setBoolPref("thread-incspacing",document.getElementById("accountcolors-thread-incspacing").checked);
        accountColorsOptions.prefs.setBoolPref("thread-hoverselect",document.getElementById("accountcolors-thread-hoverselect").checked);
        
        /* Message Pane, Message Tab & Message Window Options */
        
        accountColorsOptions.prefs.setBoolPref("message-setfontstyle",document.getElementById("accountcolors-message-setfontstyle").checked);
        accountColorsOptions.prefs.setIntPref("message-fontstyle",document.getElementById("accountcolors-message-fontstyle").value);
        accountColorsOptions.prefs.setBoolPref("message-setfontsize",document.getElementById("accountcolors-message-setfontsize").checked);
        accountColorsOptions.prefs.setIntPref("message-fontsize",document.getElementById("accountcolors-message-fontsize").value);
        accountColorsOptions.prefs.setBoolPref("message-setfromstyle",document.getElementById("accountcolors-message-setfromstyle").checked);
        accountColorsOptions.prefs.setIntPref("message-fromstyle",document.getElementById("accountcolors-message-fromstyle").value);
        accountColorsOptions.prefs.setBoolPref("message-setfromsize",document.getElementById("accountcolors-message-setfromsize").checked);
        accountColorsOptions.prefs.setIntPref("message-fromsize",document.getElementById("accountcolors-message-fromsize").value);
        accountColorsOptions.prefs.setBoolPref("message-colorfont",document.getElementById("accountcolors-message-colorfont").checked);
        accountColorsOptions.prefs.setBoolPref("message-colorbkgd",document.getElementById("accountcolors-message-colorbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("message-colorfrom",document.getElementById("accountcolors-message-colorfrom").checked);
        accountColorsOptions.prefs.setBoolPref("message-defaultbkgd",document.getElementById("accountcolors-message-defaultbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("message-hdraccount",document.getElementById("accountcolors-message-hdraccount").checked);
        
        /* Compose Window Options */
        
        accountColorsOptions.prefs.setBoolPref("compose-setfontstyle",document.getElementById("accountcolors-compose-setfontstyle").checked);
        accountColorsOptions.prefs.setIntPref("compose-fontstyle",document.getElementById("accountcolors-compose-fontstyle").value);
        accountColorsOptions.prefs.setBoolPref("compose-setfontsize",document.getElementById("accountcolors-compose-setfontsize").checked);
        accountColorsOptions.prefs.setIntPref("compose-fontsize",document.getElementById("accountcolors-compose-fontsize").value);
        accountColorsOptions.prefs.setBoolPref("compose-setidfontstyle",document.getElementById("accountcolors-compose-setidfontstyle").checked);
        accountColorsOptions.prefs.setIntPref("compose-idfontstyle",document.getElementById("accountcolors-compose-idfontstyle").value);
        accountColorsOptions.prefs.setBoolPref("compose-setidfontsize",document.getElementById("accountcolors-compose-setidfontsize").checked);
        accountColorsOptions.prefs.setIntPref("compose-idfontsize",document.getElementById("accountcolors-compose-idfontsize").value);
        accountColorsOptions.prefs.setBoolPref("compose-colorfont",document.getElementById("accountcolors-compose-colorfont").checked);
        accountColorsOptions.prefs.setBoolPref("compose-colorbkgd",document.getElementById("accountcolors-compose-colorbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("compose-colorfromfont",document.getElementById("accountcolors-compose-colorfromfont").checked);
        accountColorsOptions.prefs.setBoolPref("compose-colorfrombkgd",document.getElementById("accountcolors-compose-colorfrombkgd").checked);
        accountColorsOptions.prefs.setBoolPref("compose-colortofont",document.getElementById("accountcolors-compose-colortofont").checked);
        accountColorsOptions.prefs.setBoolPref("compose-colortobkgd",document.getElementById("accountcolors-compose-colortobkgd").checked);
        accountColorsOptions.prefs.setBoolPref("compose-coloratmfont",document.getElementById("accountcolors-compose-coloratmfont").checked);
        accountColorsOptions.prefs.setBoolPref("compose-coloratmbkgd",document.getElementById("accountcolors-compose-coloratmbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("compose-blackhdrlabels",document.getElementById("accountcolors-compose-blackhdrlabels").checked);
        accountColorsOptions.prefs.setBoolPref("compose-colorhdrbkgd",document.getElementById("accountcolors-compose-colorhdrbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("compose-blackfieldfont",document.getElementById("accountcolors-compose-blackfieldfont").checked);
        accountColorsOptions.prefs.setBoolPref("compose-whitefieldbkgd",document.getElementById("accountcolors-compose-whitefieldbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("compose-defaultbkgd",document.getElementById("accountcolors-compose-defaultbkgd").checked);
        accountColorsOptions.prefs.setBoolPref("compose-hoverfrom",document.getElementById("accountcolors-compose-hoverfrom").checked);
    },
    
    /********************************************************************/
    
    /* Update functions */
    
    setMenuState: function(element)
    {
        document.getElementById(element.substr(0,element.lastIndexOf("-")+1)+element.substr(element.lastIndexOf("-")+4)).disabled = !document.getElementById(element).checked;
    },
    
    updateFontColor: function(index)
    {
        var i;
        
        if (document.getElementById("accountcolors-accountidbox"+index).getAttribute("ac-accountidtype") != "id")
        {
            if (accountColorsOptions.prefs.getBoolPref("picker-autobkgd"))
            {
                accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+index,accountColorsOptions.autoBkgdColor(accountColorsOptions.pickerGetColor("accountcolors-fontpicker"+index)));
            }
        }
        
        document.getElementById("accountcolors-accountname"+index).style.color = accountColorsOptions.pickerGetColor("accountcolors-fontpicker"+index);
        document.getElementById("accountcolors-accountname"+index).style.backgroundColor = accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index);
        
        if (document.getElementById("accountcolors-accountidbox"+index).getAttribute("ac-accountidtype") != "account")
        {
            document.getElementById("accountcolors-identityname"+index).style.color = accountColorsOptions.pickerGetColor("accountcolors-fontpicker"+index);
            document.getElementById("accountcolors-identityname"+index).style.backgroundColor = accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index);
        }
        
        if (document.getElementById("accountcolors-accountidbox"+index).getAttribute("ac-accountidtype") == "accountid")
        {
            if (accountColorsOptions.prefs.getBoolPref("picker-applyall"))
            {
                for (i = index+1; document.getElementById("accountcolors-accountidbox"+i).getAttribute("ac-accountidtype") == "id"; i++)
                {
                    accountColorsOptions.pickerSetColor("accountcolors-fontpicker"+i,accountColorsOptions.pickerGetColor("accountcolors-fontpicker"+index));
                    accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+i,accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index));
                    
                    document.getElementById("accountcolors-accountname"+i).style.color = accountColorsOptions.pickerGetColor("accountcolors-fontpicker"+index);
                    document.getElementById("accountcolors-accountname"+i).style.backgroundColor = accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index);
                    
                    document.getElementById("accountcolors-identityname"+i).style.color = accountColorsOptions.pickerGetColor("accountcolors-fontpicker"+index);
                    document.getElementById("accountcolors-identityname"+i).style.backgroundColor = accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index);
                }
            }
        }
    },
    
    updateBkgdColor: function(index)
    {
        var i;
        
        document.getElementById("accountcolors-accountname"+index).style.backgroundColor = accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index);
        
        if (document.getElementById("accountcolors-accountidbox"+index).getAttribute("ac-accountidtype") != "account")
        {
            document.getElementById("accountcolors-identityname"+index).style.backgroundColor = accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index);
        }
        
        if (document.getElementById("accountcolors-accountidbox"+index).getAttribute("ac-accountidtype") == "accountid")
        {
            if (accountColorsOptions.prefs.getBoolPref("picker-applyall"))
            {
                for (i = index+1; document.getElementById("accountcolors-accountidbox"+i).getAttribute("ac-accountidtype") == "id"; i++)
                {
                    accountColorsOptions.pickerSetColor("accountcolors-bkgdpicker"+i,accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index));
                    
                    document.getElementById("accountcolors-accountname"+i).style.backgroundColor = accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index);
                    
                    document.getElementById("accountcolors-identityname"+i).style.backgroundColor = accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index);
                }
            }
        }
    },
    
    autoBkgdColor: function(fontcolor)
    {
        var red,green,blue;
        
        red = parseInt(fontcolor.substr(1,2),16);
        red = (255-Math.round((255-red)/8.5)).toString(16).toUpperCase();
        
        green = parseInt(fontcolor.substr(3,2),16);
        green = (255-Math.round((255-green)/8.5)).toString(16).toUpperCase();
        
        blue = parseInt(fontcolor.substr(5,2),16);
        blue = (255-Math.round((255-blue)/8.5)).toString(16).toUpperCase();
        
        if (fontcolor == "#000000") red = green = blue = "FF";
        
        return ("#" + red + green + blue);
    },
    
    /********************************************************************/
    
    /* Color picker functions */
    
    pickerOpen: function(button)
    {
        var index,hbox,r,g,b;
        var rgbColors = new Array();
        var HSV = new Object();
        
        document.getElementById("accountcolors-picker-panel").hidePopup();
        
        accountColorsOptions.pickerButton = button;
        
        document.getElementById("accountcolors-picker-separator-2").hidden = true;
        
        if (button.id.indexOf("font") >= 0)
        {
            document.getElementById("accountcolors-picker-separator-2").hidden = false;
            
            document.getElementById("accountcolors-picker-fonttitle").hidden = false;
            document.getElementById("accountcolors-picker-bkgdtitle").hidden = true;
            
            document.getElementById("accountcolors-picker-fontpalette").hidden = false;
            document.getElementById("accountcolors-picker-bkgdpalette").hidden = true;
            
            document.getElementById("accountcolors-picker-autobkgd-box").hidden = false;
        }
        else
        {
            document.getElementById("accountcolors-picker-fonttitle").hidden = true;
            document.getElementById("accountcolors-picker-bkgdtitle").hidden = false;
            
            document.getElementById("accountcolors-picker-fontpalette").hidden = true;
            document.getElementById("accountcolors-picker-bkgdpalette").hidden = false;
            
            document.getElementById("accountcolors-picker-autobkgd-box").hidden = true;
        }
        
        document.getElementById("accountcolors-picker-autobkgd").checked = accountColorsOptions.prefs.getBoolPref("picker-autobkgd");
        
        index = Number(button.id.substr(24));
        if (document.getElementById("accountcolors-accountidbox"+index).getAttribute("ac-accountidtype") != "id")
        {
            document.getElementById("accountcolors-picker-separator-2").hidden = false;
            
            document.getElementById("accountcolors-picker-applyall-box").hidden = false;
        }
        else document.getElementById("accountcolors-picker-applyall-box").hidden = true;
        
        document.getElementById("accountcolors-picker-applyall").checked = accountColorsOptions.prefs.getBoolPref("picker-applyall");
        
        document.getElementById("accountcolors-picker-panel").openPopup(button,"after_end",0,1,false,false,null);
        
        hbox = document.getAnonymousElementByAttribute(button,"class","box-inherit button-box");
        rgbColors = hbox.style.getPropertyValue("background-color").match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
        
        r = Number(rgbColors[1]);
        g = Number(rgbColors[2]);
        b = Number(rgbColors[3]);
        
        accountColorsOptions.pickerRGBtoHSV(r,g,b,HSV);
        accountColorsOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
        
        document.getElementById("accountcolors-picker-autobkgd").checked = accountColorsOptions.prefs.getBoolPref("picker-autobkgd");
        
        window.addEventListener("keypress",accountColorsOptions.pickerReturn,true);
    },
    
    pickerRGBScaleChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        r = document.getElementById("accountcolors-picker-scale-r").value;
        g = document.getElementById("accountcolors-picker-scale-g").value;
        b = document.getElementById("accountcolors-picker-scale-b").value;
        
        accountColorsOptions.pickerRGBtoHSV(r,g,b,HSV);
        accountColorsOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerHSVScaleChange: function()
    {
        var h,s,v;
        var RGB = new Object();
        
        h = document.getElementById("accountcolors-picker-scale-h").value;
        s = document.getElementById("accountcolors-picker-scale-s").value;
        v = document.getElementById("accountcolors-picker-scale-v").value;
        
        accountColorsOptions.pickerHSVtoRGB(h,s,v,RGB);
        accountColorsOptions.pickerUpdateElements(RGB.r,RGB.g,RGB.b,h,s,v);
    },
    
    pickerRGBValueChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        r = document.getElementById("accountcolors-picker-value-r").value;
        g = document.getElementById("accountcolors-picker-value-g").value;
        b = document.getElementById("accountcolors-picker-value-b").value;
        
        accountColorsOptions.pickerRGBtoHSV(r,g,b,HSV);
        accountColorsOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerHSVValueChange: function()
    {
        var h,s,v;
        var RGB = new Object();
        
        h = document.getElementById("accountcolors-picker-value-h").value;
        s = document.getElementById("accountcolors-picker-value-s").value;
        v = document.getElementById("accountcolors-picker-value-v").value;
        
        accountColorsOptions.pickerHSVtoRGB(h,s,v,RGB);
        accountColorsOptions.pickerUpdateElements(RGB.r,RGB.g,RGB.b,h,s,v);
    },
    
    pickerHexStrChange: function()
    {
        var hexstr,i,value,r,g,b;
        var HSV = new Object();
        
        hexstr = document.getElementById("accountcolors-picker-hexstr").value;
        
        for (i = 0; i < hexstr.length; i++)
        {
            if (hexstr.charAt(i) >= "0" && hexstr.charAt(i) <= "9") continue;
            if (hexstr.charAt(i) >= "A" && hexstr.charAt(i) <= "F") continue;
            if (hexstr.charAt(i) >= "a" && hexstr.charAt(i) <= "f") continue;
            hexstr = hexstr.substr(0,i) + hexstr.substr(i+1);
            i--;
        }
        
        hexstr = hexstr.toUpperCase();
        hexstr = hexstr.substr(-6);
        while (hexstr.length < 6) hexstr = "0" + hexstr;
        
        i = document.getElementById("accountcolors-picker-hexstr").selectionEnd;
        i += 6-document.getElementById("accountcolors-picker-hexstr").textLength;
        document.getElementById("accountcolors-picker-hexstr").value = hexstr; 
        document.getElementById("accountcolors-picker-hexstr").selectionEnd = i;
        
        value = parseInt(hexstr,16);
        
        r = (value >> 16) & 0xFF;
        g = (value >> 8) & 0xFF;
        b =  value & 0xFF;
        
        accountColorsOptions.pickerRGBtoHSV(r,g,b,HSV);
        accountColorsOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerPaletteChange: function()
    {
        var button,hexstr,value,r,g,b;
        var HSV = new Object();
        
        /* Gets called twice for each change to palette color - may be bug in <colorpicker> */
        
        button = accountColorsOptions.pickerButton;
        
        if (button.id.indexOf("font") >= 0) hexstr = document.getElementById("accountcolors-picker-fontpalette").color.substr(1);
        else hexstr = document.getElementById("accountcolors-picker-bkgdpalette").color.substr(1);
        
        value = parseInt(hexstr,16);
        
        r = (value >> 16) & 0xFF;
        g = (value >> 8) & 0xFF;
        b =  value & 0xFF;
        
        accountColorsOptions.pickerRGBtoHSV(r,g,b,HSV);
        accountColorsOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerAutoBkgdChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        if (document.getElementById("accountcolors-picker-fontpalette").open ||
            document.getElementById("accountcolors-picker-bkgdpalette").open)
        {
            document.getElementById("accountcolors-picker-autobkgd").checked = !document.getElementById("accountcolors-picker-autobkgd").checked;
            
            document.getElementById("accountcolors-picker-fontpalette").hidePopup();
            document.getElementById("accountcolors-picker-bkgdpalette").hidePopup();
        }
        else
        {
            accountColorsOptions.prefs.setBoolPref("picker-autobkgd",document.getElementById("accountcolors-picker-autobkgd").checked);
            
            r = document.getElementById("accountcolors-picker-scale-r").value;
            g = document.getElementById("accountcolors-picker-scale-g").value;
            b = document.getElementById("accountcolors-picker-scale-b").value;
            
            accountColorsOptions.pickerRGBtoHSV(r,g,b,HSV);
            accountColorsOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
        }
    },
    
    pickerApplyAllChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        if (document.getElementById("accountcolors-picker-fontpalette").open ||
            document.getElementById("accountcolors-picker-bkgdpalette").open)
        {
            document.getElementById("accountcolors-picker-applyall").checked = !document.getElementById("accountcolors-picker-applyall").checked;
            
            document.getElementById("accountcolors-picker-fontpalette").hidePopup();
            document.getElementById("accountcolors-picker-bkgdpalette").hidePopup();
        }
        else
        {
            accountColorsOptions.prefs.setBoolPref("picker-applyall",document.getElementById("accountcolors-picker-applyall").checked);
            
            r = document.getElementById("accountcolors-picker-scale-r").value;
            g = document.getElementById("accountcolors-picker-scale-g").value;
            b = document.getElementById("accountcolors-picker-scale-b").value;
            
            accountColorsOptions.pickerRGBtoHSV(r,g,b,HSV);
            accountColorsOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
        }
    },
    
    pickerUpdateElements: function(r,g,b,h,s,v)
    {
        var value,hexlo,hexhi,hexstr,i,button,index;
        var RGB = new Object();
        var HSV = new Object();
        
        var fontPaletteColors = new Array(
            "FFFFFF","CCCCCC","C0C0C0","999999","666666","333333","000000",
            "FFCCCC","FF6666","FF0000","CC0000","990000","660000","330000",
            "FFCC99","FF9966","FF9900","FF6600","CC6600","993300","663300",
            "FFFF99","FFFF66","FFCC66","FFCC33","CC9933","996633","663333",
            "FFFFCC","FFFF33","FFFF00","FFCC00","999900","666600","333300",
            "99FF99","66FF99","33FF33","33CC00","009900","006600","003300",
            "99FFFF","33FFFF","66CCCC","00CCCC","339999","336666","003333", 
            "CCFFFF","66FFFF","33CCFF","3366FF","3333FF","000099","000066", 
            "CCCCFF","9999FF","6666CC","6633FF","6600CC","333399","330099",
            "FFCCFF","FF99FF","CC66CC","CC33CC","993399","663366","330033");
        
        var bkgdPaletteColors = new Array(
            "FFFFFF","F9F9F9","F8F8F8","F3F3F3","EDEDED","E7E7E7","E1E1E1",
            "FFF9F9","FFEDED","FFE1E1","F9E1E1","F3E1E1","EDE1E1","E7E1E1",
            "FFF9F3","FFF3ED","FFF3E1","FFEDE1","F9EDE1","F3E7E1","EDE7E1",
            "FFFFF3","FFFFED","FFF9ED","FFF9E7","F9F3E7","F3EDE7","EDE7E7",
            "FFFFF9","FFFFE7","FFFFE1","FFF9E1","F3F3E1","EDEDE1","E7E7E1",
            "F3FFF3","EDFFF3","E7FFE7","E7F9E1","E1F3E1","E1EDE1","E1E7E1",
            "F3FFFF","E7FFFF","EDF9F9","E1F9F9","E7F3F3","E7EDED","E1E7E7",
            "F9FFFF","EDFFFF","E7F9FF","E7EDFF","E7E7FF","E1E1F3","E1E1ED",
            "F9F9FF","F3F3FF","EDEDF9","EDE7FF","EDE1F9","E7E7F3","E7E1F3",
            "FFF9FF","FFF3FF","F9EDF9","F9E7F9","F3E7F3","EDE7ED","E7E1E7");
        
        /* Update RGB scales and values */
        
        document.getElementById("accountcolors-picker-scale-r").value = r;
        document.getElementById("accountcolors-picker-scale-g").value = g;
        document.getElementById("accountcolors-picker-scale-b").value = b;
        
        document.getElementById("accountcolors-picker-value-r").value = r;
        document.getElementById("accountcolors-picker-value-g").value = g;
        document.getElementById("accountcolors-picker-value-b").value = b;
        
        hexlo = accountColorsOptions.pickerMakeHexStr(0,g,b);
        hexhi = accountColorsOptions.pickerMakeHexStr(255,g,b);
        document.getElementById("accountcolors-picker-scale-r").style.setProperty("background-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        hexlo = accountColorsOptions.pickerMakeHexStr(r,0,b);
        hexhi = accountColorsOptions.pickerMakeHexStr(r,255,b);
        document.getElementById("accountcolors-picker-scale-g").style.setProperty("background-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        hexlo = accountColorsOptions.pickerMakeHexStr(r,g,0);
        hexhi = accountColorsOptions.pickerMakeHexStr(r,g,255);
        document.getElementById("accountcolors-picker-scale-b").style.setProperty("background-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        /* Update HSV scales and values */
        
        document.getElementById("accountcolors-picker-scale-h").value = h;
        document.getElementById("accountcolors-picker-scale-s").value = s;
        document.getElementById("accountcolors-picker-scale-v").value = v;
        
        document.getElementById("accountcolors-picker-value-h").value = h;
        document.getElementById("accountcolors-picker-value-s").value = s;
        document.getElementById("accountcolors-picker-value-v").value = v;
        
        document.getElementById("accountcolors-picker-scale-h").style.setProperty("background-image","-moz-linear-gradient(left,red,yellow,lime,aqua,blue,fuchsia,red)","");
        
        accountColorsOptions.pickerHSVtoRGB(0,0,v,RGB);
        hexlo = accountColorsOptions.pickerMakeHexStr(RGB.r,RGB.g,RGB.b);
        accountColorsOptions.pickerHSVtoRGB(h,100,v,RGB);
        hexhi = accountColorsOptions.pickerMakeHexStr(RGB.r,RGB.g,RGB.b);
        document.getElementById("accountcolors-picker-scale-s").style.setProperty("background-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        accountColorsOptions.pickerHSVtoRGB(h,s,100,RGB);
        hexhi = accountColorsOptions.pickerMakeHexStr(RGB.r,RGB.g,RGB.b);
        document.getElementById("accountcolors-picker-scale-v").style.setProperty("background-image","-moz-linear-gradient(left,#000000,#" + hexhi + ")","");
        
        /* Update hex string */
        
        r = document.getElementById("accountcolors-picker-scale-r").value;
        g = document.getElementById("accountcolors-picker-scale-g").value;
        b = document.getElementById("accountcolors-picker-scale-b").value;
        
        hexstr = accountColorsOptions.pickerMakeHexStr(r,g,b);
        
        document.getElementById("accountcolors-picker-hexstr").value = hexstr; 
        
        /* Update palette and sample */
        
        button = accountColorsOptions.pickerButton;
        
        if (button.id.indexOf("font") >= 0)
        {
            for (i = 0; i < fontPaletteColors.length; i++) if (hexstr == fontPaletteColors[i]) break;
            
            if (i < fontPaletteColors.length) document.getElementById("accountcolors-picker-fontpalette").color = "#" + hexstr;
            else
            {
                document.getElementById("accountcolors-picker-fontpalette").color = "";
                if (document.getElementById("accountcolors-picker-fontpalette").mPicker.mSelectedCell)
                    document.getElementById("accountcolors-picker-fontpalette").mPicker.mSelectedCell.removeAttribute("selected");
            }
            
            index = Number(button.id.substr(24));
            document.getElementById("accountcolors-picker-sample").style.setProperty("color","#" + hexstr,"");
            if (document.getElementById("accountcolors-accountidbox"+index).getAttribute("ac-accountidtype") != "id")
            {
                if (accountColorsOptions.prefs.getBoolPref("picker-autobkgd"))
                    document.getElementById("accountcolors-picker-sample").style.setProperty("background-color",accountColorsOptions.autoBkgdColor("#" + hexstr),"");
                else document.getElementById("accountcolors-picker-sample").style.setProperty("background-color",accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+index),"");
            }
            else
            {
                for (i = index-1; i >= 0 && document.getElementById("accountcolors-accountidbox"+i).getAttribute("ac-accountidtype") == "id"; i--) ;
                document.getElementById("accountcolors-picker-sample").style.setProperty("background-color",accountColorsOptions.pickerGetColor("accountcolors-bkgdpicker"+i),"");
            }
        }
        else
        {
            for (i = 0; i < bkgdPaletteColors.length; i++) if (hexstr == bkgdPaletteColors[i]) break;
            
            if (i < bkgdPaletteColors.length) document.getElementById("accountcolors-picker-bkgdpalette").color = "#" + hexstr;
            else
            {
                document.getElementById("accountcolors-picker-bkgdpalette").color = "";
                if (document.getElementById("accountcolors-picker-bkgdpalette").mPicker.mSelectedCell)
                    document.getElementById("accountcolors-picker-bkgdpalette").mPicker.mSelectedCell.removeAttribute("selected");
            }
            
            index = Number(button.id.substr(24));
            document.getElementById("accountcolors-picker-sample").style.setProperty("color",accountColorsOptions.pickerGetColor("accountcolors-fontpicker"+index),"");
            document.getElementById("accountcolors-picker-sample").style.setProperty("background-color","#" + hexstr,"");
        }
    },
    
    pickerPanelMouseDown: function(event)
    {
        if (document.getElementById("accountcolors-picker-fontpalette").open ||
            document.getElementById("accountcolors-picker-bkgdpalette").open)
        {
            if (event.originalTarget.id == "accountcolors-picker-okay" ||
                event.originalTarget.id == "accountcolors-picker-cancel" ||
                event.originalTarget.id == "accountcolors-picker-autobkgd" ||
                event.originalTarget.id == "accountcolors-picker-applyall")
            {
                /* keep palette open so it can be detected by pickerOkay/pickerClose/pickerAutoBkgdChange */
            }
            else
            {
                document.getElementById("accountcolors-picker-fontpalette").hidePopup();
                document.getElementById("accountcolors-picker-bkgdpalette").hidePopup();
            }
        }
    },
    
    pickerPaletteShowing: function(event)
    {
        var separator;
        
        separator = document.getElementById("accountcolors-picker-separator-1");
        
        event.originalTarget.moveTo(separator.boxObject.screenX+6,separator.boxObject.screenY+6);
    },
    
    pickerClose: function()
    {
        if (document.getElementById("accountcolors-picker-fontpalette").open ||
            document.getElementById("accountcolors-picker-bkgdpalette").open)
        {
            document.getElementById("accountcolors-picker-fontpalette").hidePopup();
            document.getElementById("accountcolors-picker-bkgdpalette").hidePopup();
        }
        else document.getElementById("accountcolors-picker-panel").hidePopup();
        
        window.removeEventListener("keypress",accountColorsOptions.pickerReturn,true);
    },
    
    pickerOkay: function()
    {
        var button,hexstr,hbox;
        
        if (document.getElementById("accountcolors-picker-fontpalette").open ||
            document.getElementById("accountcolors-picker-bkgdpalette").open)
        {
            document.getElementById("accountcolors-picker-fontpalette").hidePopup();
            document.getElementById("accountcolors-picker-bkgdpalette").hidePopup();
        }
        else
        {
            button = accountColorsOptions.pickerButton;
            
            hexstr = document.getElementById("accountcolors-picker-hexstr").value;
            
            hbox = document.getAnonymousElementByAttribute(button,"class","box-inherit button-box");
            hbox.style.setProperty("background-color","#" + hexstr,"");
            
            document.getElementById("accountcolors-picker-panel").hidePopup();
            
            if (button.id.indexOf("font") >= 0) accountColorsOptions.updateFontColor(Number(button.id.substr(24)));
            else accountColorsOptions.updateBkgdColor(Number(button.id.substr(24)));
        }
        
        window.removeEventListener("keypress",accountColorsOptions.pickerReturn,true);
    },
    
    pickerReturn: function (event)
    {
        if (event.keyCode == event.DOM_VK_RETURN)
        {
            accountColorsOptions.pickerOkay();
            
            event.preventDefault();
            event.stopPropagation();
        }
    },
    
    pickerGetColor: function(pickerId)
    {
        var button,hbox,r,g,b,hexstr;
        var rgbColors = new Array();
        
        button = document.getElementById(pickerId);
        
        hbox = document.getAnonymousElementByAttribute(button,"class","box-inherit button-box");
        rgbColors = hbox.style.getPropertyValue("background-color").match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
        
        r = Number(rgbColors[1]).toString(16).toUpperCase();
        if (r.length < 2) r = "0" + r;
        g = Number(rgbColors[2]).toString(16).toUpperCase();
        if (g.length < 2) g = "0" + g;
        b = Number(rgbColors[3]).toString(16).toUpperCase();
        if (b.length < 2) b = "0" + b;
        
        hexstr = r + g + b;
        
        return ("#" + hexstr);
    },
    
    pickerSetColor: function(pickerId,color)
    {
        var button,hbox;
        
        button = document.getElementById(pickerId);
        
        hbox = document.getAnonymousElementByAttribute(button,"class","box-inherit button-box");
        hbox.style.setProperty("background-color",color,"");
    },
    
    pickerMakeHexStr: function(r,g,b)
    {
        var hexstr;
        
        r = r.toString(16).toUpperCase();
        if (r.length < 2) r = "0" + r;
        g = g.toString(16).toUpperCase();
        if (g.length < 2) g = "0" + g;
        b = b.toString(16).toUpperCase();
        if (b.length < 2) b = "0" + b;
        
        hexstr = "" + r + g + b;
        
        return hexstr;
    },
        
    pickerRGBtoHSV: function(r,g,b,HSV)
    {
        var min,max,chroma,h,s,v;
        
        r = r/255;
        g = g/255;
        b = b/255;
        
        min = Math.min(r,g,b);
        max = Math.max(r,g,b);
        chroma = max-min;
        
        v = max;
        
        if (chroma == 0) s = 0;
        else s = chroma/max;
        
        if (chroma == 0) h = 0;                 /* greys */
        else if (r == max) h = (g-b)/chroma+0;  /* between yellow and magenta */
        else if (g == max) h = (b-r)/chroma+2;  /* between cyan and yellow */
        else if (b == max) h = (r-g)/chroma+4;  /* between magenta and cyan */
        if (h < 0) h = h+6;
        h = h/6;
        
        HSV.h = Math.round(h*360);
        HSV.s = Math.round(s*100);
        HSV.v = Math.round(v*100);
    },
    
    pickerHSVtoRGB: function(h,s,v,RGB)
    {
        var i,f,chroma,x0,x1,r,g,b;
        
        h = h/360;
        s = s/100;
        v = v/100;
        
        i = Math.floor(h*6);
        f = h*6-i;
        chroma = v*s;
        x0 = chroma*f;
        x1 = chroma*(1-f);
        
        switch (i%6)
        {
            case 0: r = chroma; g = x0; b = 0; break;
            case 1: r = x1; g = chroma; b = 0; break;
            case 2: r = 0; g = chroma; b = x0; break;
            case 3: r = 0; g = x1; b = chroma; break;
            case 4: r = x0; g = 0; b = chroma; break;
            case 5: r = chroma; g = 0; b = x1; break;
        }
        
        r = r+(v-chroma);
        g = g+(v-chroma);
        b = b+(v-chroma);
        
        RGB.r = Math.round(r*255);
        RGB.g = Math.round(g*255);
        RGB.b = Math.round(b*255);
    }
};
    