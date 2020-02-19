/************************************************************************/
/*                                                                      */
/*      Account Colors  -  Thunderbird Extension  -  3Pane Window       */
/*                                                                      */
/*      Javascript for 3Pane Window overlay                             */
/*                                                                      */
/*      Copyright (C) 2008-2020  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  10 Feb 2020                                       */
/*                                                                      */
/************************************************************************/

/************************************************************************/
/*                                                                      */
/*  Changes in Thunderbird 68.0                                         */
/*                                                                      */
/*  Overview of changes:                                                */
/*                                                                      */
/*    - https://developer.thunderbird.net/add-ons/tb68/changes          */
/*                                                                      */
/*  Reference for removed nsITreeBoxObject interface:                   */
/*                                                                      */
/*    - https://developer.mozilla.org/en-US/docs/Mozilla/Tech/          */
/*              XPCOM/Reference/Interface/nsITreeBoxObject              */
/*                                                                      */
/************************************************************************/

/************************************************************************/
/*                                                                      */
/*  Color Received Messages by Identity instead of Account:             */
/*                                                                      */
/*  Could easily change getAccountKey() to getIdentityKey() and then    */
/*  color font and background in thread pane and message pane using     */
/*  identity instead of account.  In essence, getIdentityKey() would    */
/*  ignore msgHdr.accountKey and just search for matching identity.     */
/*                                                                      */
/************************************************************************/

"use strict";

var accountColors3Pane =
{
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.accountcolors."),
    
    mailPrefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("mail."),
    
    otherPrefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
    
    promptService: Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),
    
    accountManager: Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager),
    
    winmed: Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator),
    
    hoverRow: null,
    
    dragOnRow: null,
    
    /* Listen for changes to account colors settings */
    
    prefsObserver:
    {
        register: function()
        {
            /* Add the observer */
            
            accountColors3Pane.prefs.addObserver("",this,false);
        },
        
        observe: function(subject,topic,data)
        {
            var element;
            
            if (topic != "nsPref:changed") return;
            
            /* Generate CSS tree coloring rules */
            
            accountColors3Pane.generateRules();
            
            /* Update Folder Pane */
            
            accountColors3Pane.folderPane();
            
            element = document.getElementById("folderTree");  /* Force re-load of Folder Tree */
            element.invalidate();
            
            element = document.getElementById("folderTree");  /* Causes CSS Folder Tree -moz-tree-row height change to take effect */
            element.style.visibility = "hidden";
            element.style.visibility = "";
            
            /* Update Thread Pane */
            
            accountColors3Pane.threadPane();
            
            element = document.getElementById("threadTree");  /* Force re-load of Thread Tree */
            element.invalidate();
            
            element = document.getElementById("threadTree");  /* Causes CSS Thread Tree -moz-tree-row height change to take effect */
            element.style.visibility = "hidden";
            element.style.visibility = "";
            
            /* Update Message Pane & Message Tab */
            
            accountColors3Pane.messagePane();
        }
    },
    
    /* Listen for changes to mail settings - to detect add/remove account */
    
    mailPrefsObserver:
    {
        register: function()
        {
            /* Add the observer */
            
            accountColors3Pane.mailPrefs.addObserver("",this,false);
        },
        
        observe: function(subject,topic,data)
        {
            if (topic != "nsPref:changed") return;
			
            /* Validate coloring preferences */
            
            accountColors3Pane.validatePrefs();
        }
    },
    
    /* On Load */
    
    onLoad: function()
    {
        window.removeEventListener("load",accountColors3Pane.onLoad,false);
        
        /* Wait for Thunderbird to finish parsing CSS style sheets and initializing folder tree */
        
        window.setTimeout(checkReady,10);
        
        function checkReady()
        {
            var i,ready,sheet,count,row;
            
            ready = false;
             
            try
            {
                for (i = 0; i < document.styleSheets.length; i++)
                {
                    if (document.styleSheets[i].href == "chrome://accountcolors/skin/accountcolors-3panewindow-generated.css")
                    {
                        sheet = document.styleSheets[i];
                    }
                }
                
                count = sheet.cssRules.length;  /* throws exception if parsing of CSS not complete */
                
                row = gFolderTreeView.getIndexOfFolder(gFolderTreeView.getSelectedFolders()[0]);  /* throws exception if folder tree not initialized */
                
                ready = true;
            }
            catch (e)
            { 
                window.setTimeout(checkReady,20);
            }
            
            if (ready) window.setTimeout(function() { accountColors3Pane.initializePanes(); },0);  /* break execution */
        }
    },
    
    /* Initialize Folder/Thread/Message Panes */
    
    initializePanes: function()
    {
        var row;
        
        /* Validate coloring preferences */
        
        accountColors3Pane.validatePrefs();
        
        /* Generate CSS tree coloring rules */
        
        accountColors3Pane.generateRules();
        
        /* Register preferences observers */
        
        accountColors3Pane.prefsObserver.register();
        
        accountColors3Pane.mailPrefsObserver.register();
        
        /* Add listeners for Folder/Thread/Message Panes */
        
        window.addEventListener("load",accountColors3Pane.folderPane,false);
        
        document.getElementById("folderTree").addEventListener("select",accountColors3Pane.threadPane,false);
        document.getElementById("folderTree").addEventListener("mousemove",accountColors3Pane.onMouseMove,false);
        document.getElementById("folderTree").addEventListener("dragover",accountColors3Pane.onDragOver,false);
        document.getElementById("folderTree").addEventListener("dragleave",accountColors3Pane.onDrop,false);
        document.getElementById("folderTree").addEventListener("drop",accountColors3Pane.onDrop,false);
        
        //document.getElementById("threadTree").addEventListener("select",accountColors3Pane.messagePane,false);  /* changes color too soon */
        //document.getElementById("msgHeaderView").addEventListener("load",accountColors3Pane.messagePane,false);  /* not fired if no content */
        document.getElementById("tabmail").addEventListener("load",accountColors3Pane.messagePane,true);
        document.getElementById("threadTree").addEventListener("mousemove",accountColors3Pane.onMouseMove,false);
        
        /* Setup for Folder/Thread Panes */
        
        accountColors3Pane.folderSetup();
        
        accountColors3Pane.threadSetup();
        
        /* Initial calls for Folder/Thread/Message Panes */
        
        accountColors3Pane.folderPane();
        
        accountColors3Pane.threadPane();
        
        accountColors3Pane.messagePane();
        
        /* Selecting folder in folder pane forces coloring of thread pane */
        /* Selecting top and bottom folders in folder pane forces coloring of all of folder pane */
        
        row = gFolderTreeView.getIndexOfFolder(gFolderTreeView.getSelectedFolders()[0]);
        
        if (gFolderTreeView._rowMap.length)
        {
            gFolderTreeView.selectFolder(gFolderTreeView._rowMap[gFolderTreeView._rowMap.length-1]._folder);
            gFolderTreeView.selectFolder(gFolderTreeView._rowMap[0]._folder);
            gFolderTreeView.selectFolder(gFolderTreeView._rowMap[row]._folder);
        }
    },
    
    /* Validate account/identity font and background coloring preferences */
    
    validatePrefs: function()
    {
        var index,acc,account,id,identity,accountkey,identitykey;
        var accounts = new Array();
        var identities = new Array();
        var accountsprefs = new Array();
        var identitiesprefs = new Array();
        
        /* Add coloring preferences for added account */
        
        index = 0;
        
        accounts = accountColors3Pane.accountManager.accounts;
        
        for (acc = 0; acc < accountColorsUtilities.getLength(accounts); acc++)
        {
            account = accountColorsUtilities.getAccount(accounts,acc);
            
            identities = account.identities;
            
            if (accountColorsUtilities.getLength(identities) == 0)  /* Local Folders account or Blogs & Newsfeeds account */
            {
                if (!accountColors3Pane.prefs.prefHasUserValue(account.key + "-fontcolor") ||
                    !accountColors3Pane.prefs.prefHasUserValue(account.key + "-bkgdcolor"))
                {
                    accountColors3Pane.prefs.setCharPref(account.key + "-fontcolor","#000000");
                    accountColors3Pane.prefs.setCharPref(account.key + "-bkgdcolor","#FFFFFF");
                }
                
                index++;
            }
            else
            {
                for (id = 0; id < accountColorsUtilities.getLength(identities); id++)
                {
                    identity = accountColorsUtilities.getIdentity(identities,id);
                    
                    if (!accountColors3Pane.prefs.prefHasUserValue(identity.key + "-fontcolor") ||
                        !accountColors3Pane.prefs.prefHasUserValue(identity.key + "-bkgdcolor"))
                    {
                        accountColors3Pane.prefs.setCharPref(identity.key + "-fontcolor","#000000");
                        accountColors3Pane.prefs.setCharPref(identity.key + "-bkgdcolor","#FFFFFF");
                    }
                    
                    index++;
                }
            }
        }
        
        /* Remove coloring preferences for removed account */
        
        accountsprefs = accountColors3Pane.prefs.getChildList("account",{});
        
        for (acc = 0; acc < accountsprefs.length; acc++)
        {
            accountkey = accountsprefs[acc].substr(0,accountsprefs[acc].indexOf("-"));
            
            if (!accountColors3Pane.mailPrefs.prefHasUserValue("account." + accountkey + ".server") ||
                accountColors3Pane.mailPrefs.prefHasUserValue("account." + accountkey + ".identities"))
            {
                accountColors3Pane.prefs.clearUserPref(accountkey + "-fontcolor");
                accountColors3Pane.prefs.clearUserPref(accountkey + "-bkgdcolor");
            }
        }
        
        identitiesprefs = accountColors3Pane.prefs.getChildList("id",{});
        
        for (id = 0; id < identitiesprefs.length; id++)
        {
            identitykey = identitiesprefs[id].substr(0,identitiesprefs[id].indexOf("-"));
            
            if (!accountColors3Pane.mailPrefs.prefHasUserValue("identity." + identitykey + ".useremail"))
            {
                accountColors3Pane.prefs.clearUserPref(identitykey + "-fontcolor");
                accountColors3Pane.prefs.clearUserPref(identitykey + "-bkgdcolor");
            }
        }
    },
    
    /* Generate CSS coloring rules for folderTree and threadTree */
    
    generateRules: function()
    {
        var i,sheet,color;
        var children = new Array();
        
        for (i = 0; i < document.styleSheets.length; i++)
        {
            if (document.styleSheets[i].href == "chrome://accountcolors/skin/accountcolors-3panewindow-generated.css")
            {
                sheet = document.styleSheets[i];
            }
        }
        
        while (sheet.cssRules.length > 0) sheet.deleteRule(0);
        
        children = accountColors3Pane.prefs.getChildList("account",{});
        
        for (i = 0; i < children.length; i++)
        {
            color = accountColors3Pane.prefs.getCharPref(children[i]).substr(1);
            
            if (children[i].substr(children[i].length-9) == "fontcolor")
            {
                sheet.insertRule("#folderPaneBox #folderTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,not-dragOn) { color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule("#threadPaneBox #threadTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,untagged) { color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule(":root[lwt-tree] #folderPaneBox #folderTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,not-dragOn) { color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule(":root[lwt-tree] #threadPaneBox #threadTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,untagged) { color: #" + color + "; }",sheet.cssRules.length);
            }
            else if (children[i].substr(children[i].length-9) == "bkgdcolor")
            {
                sheet.insertRule("#folderPaneBox #folderTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected,not-dragOn) { background-color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule("#threadPaneBox #threadTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected) { background-color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule(":root[lwt-tree] #folderPaneBox #folderTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected,not-dragOn) { background-color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule(":root[lwt-tree] #threadPaneBox #threadTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected) { background-color: #" + color + "; }",sheet.cssRules.length);
            }
        }
        
        children = accountColors3Pane.prefs.getChildList("id",{});
        
        for (i = 0; i < children.length; i++)
        {
            color = accountColors3Pane.prefs.getCharPref(children[i]).substr(1);
            
            if (children[i].substr(children[i].length-9) == "fontcolor")
            {
                sheet.insertRule("#folderPaneBox #folderTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,not-dragOn) { color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule("#threadPaneBox #threadTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,untagged) { color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule(":root[lwt-tree] #folderPaneBox #folderTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,not-dragOn) { color: #" + color + " !important; }",sheet.cssRules.length);  /* !important necessary to override new mail font color in Dark Theme */
                sheet.insertRule(":root[lwt-tree] #threadPaneBox #threadTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,untagged) { color: #" + color + " !important; }",sheet.cssRules.length);  /* !important necessary to override unread message font color in Dark Theme */
            }
            else if (children[i].substr(children[i].length-9) == "bkgdcolor")
            {
                sheet.insertRule("#folderPaneBox #folderTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected,not-dragOn) { background-color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule("#threadPaneBox #threadTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected) { background-color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule(":root[lwt-tree] #folderPaneBox #folderTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected,not-dragOn) { background-color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule(":root[lwt-tree] #threadPaneBox #threadTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected) { background-color: #" + color + "; }",sheet.cssRules.length);
            }
        }
    },
    
    /* Detect mouse hovering over row in folder or thread pane */
    
    onMouseMove: function(event)
    {
        accountColors3Pane.hoverRow = this.getRowAt(event.clientX,event.clientY);
    },
    
    /* Detect message dragged over row in folder pane */

    onDragOver: function(event)
    {
        /* Derived from dragover event handler in tree.xml */
        
        var rowHeight,eventY,orientation;
        var row = { };
        var col = { };
        var child = { };
        
        this.getCellAt(event.clientX,event.clientY,row,col,child);
        
        rowHeight = this.rowHeight;
        eventY = event.clientY-this.treeBody.boxObject.y-rowHeight*(row.value-this.getFirstVisibleRow());
        
        if (row.value == -1) orientation = Components.interfaces.nsITreeView.DROP_ON;
        else if (eventY > rowHeight*0.75) orientation = Components.interfaces.nsITreeView.DROP_AFTER;
        else if (eventY < rowHeight*0.25) orientation = Components.interfaces.nsITreeView.DROP_BEFORE;
        else orientation = Components.interfaces.nsITreeView.DROP_ON;
        
        if (!gFolderTreeView.canDrop(row.value,orientation)) row.value = null;
        
        accountColors3Pane.dragOnRow = row.value;
    },
    
    onDrop: function(event)
    {
        if (accountColors3Pane.dragOnRow != null)
        { 
            accountColors3Pane.dragOnRow = null;
            gFolderTreeView._tree.invalidate();
        }
    },
    
    /* Folder Pane in Main Tab */
    
    folderSetup: function()
    {
        /* replace getCellProperties in folderPane.js with new_getCellProperties */
        
        gFolderTreeView.accountcolors_old_getCellProperties = gFolderTreeView.getCellProperties;
        
        gFolderTreeView.getCellProperties =   
        function new_getCellProperties(row,col)
        {
            var props,server,account,accountidkey;
            var fontcolor,fontstyle,fontsize;
            var bkgdcolor,red,green,blue,brightness;
            
            props = gFolderTreeView.accountcolors_old_getCellProperties(row,col);  /* call original handler */
            
            server = gFolderTreeView._rowMap[row]._folder.server;
            account = accountColors3Pane.accountManager.FindAccountForServer(server);
            
            if (account.defaultIdentity == null) accountidkey = account.key;
            else accountidkey = account.defaultIdentity.key;
            
            /* add extra properties for not-hover, not-dragOn, not-selected */
            /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
            
            if (row != accountColors3Pane.hoverRow)
            {
                props += " " + "not-hover";
            }
            
            if (row != accountColors3Pane.dragOnRow)
            {
                props += " " + "not-dragOn";
            }            
            
            if (!gFolderTreeView.selection.isSelected(row))
            {
                props += " " + "not-selected";
            }
            
            if (col.id == "folderNameCol")
            {
                /* add extra properties for font color, font style, font size, folder font color, no bold on unread, and show tree lines */
                /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
                
                if (gFolderTreeView._rowMap[row]._folder.isServer)  /* account folder */
                {
                    /* Color account font */
                    
                    if (accountColors3Pane.prefs.getBoolPref("folder-colorfont"))
                    {
                        fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
                        props += " " + "ac-fc-"+fontcolor.substr(1,6);
                    }
                    
                    /* Account font style */
                    
                    if (accountColors3Pane.prefs.getBoolPref("folder-setfontstyle"))
                    {
                        fontstyle = accountColors3Pane.prefs.getIntPref("folder-fontstyle");
                        
                        switch (fontstyle)
                        { 
                            case 0: /* Normal */
                                props += " " + "ac-fs-normal";
                                break;
                            case 1: /* Italic */
                                props += " " + "ac-fs-italic";
                                break;
                            case 2: /* Bold */
                                props += " " + "ac-fs-bold";
                                break;
                              case 3: /* Bold Italic */
                                props += " " + "ac-fs-bolditalic";
                              break;
                        }
                    }
                    
                    /* Account font size */
                    
                    if (accountColors3Pane.prefs.getBoolPref("folder-setfontsize"))
                    {
                        if (accountColors3Pane.prefs.getBoolPref("folder-incspacing"))
                        {
                            fontsize = accountColors3Pane.prefs.getIntPref("folder-fontsize");
                            props += " " + "ac-fs-"+fontsize+"-is";
                        }
                        else
                        {
                            fontsize = accountColors3Pane.prefs.getIntPref("folder-fontsize");
                            props += " " + "ac-fs-"+fontsize;
                        }
                    }
                } 
                else  /* sub-folder */
                {
                    /* Color folder font */
                    
                    if (accountColors3Pane.prefs.getBoolPref("folder-colorfldfont"))
                    {
                        fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
                        props += " " + "ac-fc-"+fontcolor.substr(1,6);
                    }
                    
                    /* No bold on Folders with unread messages */
                    
                    if (accountColors3Pane.prefs.getBoolPref("folder-noboldunread"))
                    {
                        props += " " + "ac-noboldunread";
                    }
                }
                
                /* Show tree lines */
                
                if ((accountColors3Pane.prefs.getBoolPref("folder-colorbkgd") && gFolderTreeView._rowMap[row]._folder.isServer) ||
                    (accountColors3Pane.prefs.getBoolPref("folder-colorfldbkgd") && !gFolderTreeView._rowMap[row]._folder.isServer))
                {
                    bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
                    
                    if (!(accountColors3Pane.prefs.getBoolPref("folder-defaultbkgd") && bkgdcolor == "#FFFFFF"))
                    {
                        red = parseInt(bkgdcolor.substr(1,2),16);
                        green = parseInt(bkgdcolor.substr(3,2),16);
                        blue = parseInt(bkgdcolor.substr(5,2),16);
                        
                        brightness = 0.299*red+0.587*green+0.114*blue;                    
                        
                        if (brightness >= 144) props += " " + "ac-blackline";
                        else props += " " + "ac-whiteline";
                    }
                    else if (accountColors3Pane.prefs.getBoolPref("folder-lightpanebkgd"))
                    {
                        props += " " + "ac-blackline";
                    }
                    else if (accountColors3Pane.prefs.getBoolPref("folder-darkpanebkgd"))
                    {
                        props += " " + "ac-whiteline";
                    }
                }
            }
            else  /* any other column */
            {
                /* add extra properties for font color */
                /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
                
                /* Color unread/total/size fonts */
                
                if (accountColors3Pane.prefs.getBoolPref("folder-colorother"))
                {
                    fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
                    props += " " + "ac-fc-"+fontcolor.substr(1,6);
                }
            }
            
            return props;
        };
        
        /* replace getRowProperties in folderPane.js with new_getRowProperties */
        
        gFolderTreeView.accountcolors_old_getRowProperties = gFolderTreeView.getRowProperties;
        
        gFolderTreeView.getRowProperties =   
        function new_getRowProperties(row)
        {
            var props,server,account,accountidkey;
            var bkgdcolor,red,green,blue,brightness;
            
            props = gFolderTreeView.accountcolors_old_getRowProperties(row);  /* call original handler */
            
            server = gFolderTreeView._rowMap[row]._folder.server;
            account = accountColors3Pane.accountManager.FindAccountForServer(server);
            
            if (account.defaultIdentity == null) accountidkey = account.key;
            else accountidkey = account.defaultIdentity.key;
            
            /* add extra properties for not-hover, not-dragOn, not-selected, not-focused, background color, folder background color, and darker selection bar */
            /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
            
            if (row != accountColors3Pane.hoverRow)
            {
                props += " " + "not-hover";
            }
            
            if (row != accountColors3Pane.dragOnRow)
            {
                props += " " + "not-dragOn";
            }            
            
            if (!gFolderTreeView.selection.isSelected(row))
            {
                props += " " + "not-selected";
            }
            
            if (!document.getElementById("folderTree").focused)
            {
                props += " " + "not-focused";
            }
            
            /* Color account/folders background */
            
            if ((accountColors3Pane.prefs.getBoolPref("folder-colorbkgd") && gFolderTreeView._rowMap[row]._folder.isServer) ||
                (accountColors3Pane.prefs.getBoolPref("folder-colorfldbkgd") && !gFolderTreeView._rowMap[row]._folder.isServer))
            {
                bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
                
                if (!(accountColors3Pane.prefs.getBoolPref("folder-defaultbkgd") && bkgdcolor == "#FFFFFF"))
                {
                    props += " " + "ac-bc-"+bkgdcolor.substr(1,6);
                }
            }
                
            /* Darker unfocused select bar */
            
            if (accountColors3Pane.prefs.getBoolPref("folder-darkerbar"))
            {
                props += " " + "ac-darkerbar";
            }
            
            return props;
        };
    },
    
    folderPane: function()
    {
        var element,fontsize;
        
        /* Black/White row fonts */
        
        if (accountColors3Pane.prefs.getBoolPref("folder-blackrowfont"))
        {
            element = document.getElementById("folderTree");
            element.setAttribute("ac-blackrowfont","");
            element.removeAttribute("ac-whiterowfont");
        }
        else if (accountColors3Pane.prefs.getBoolPref("folder-whiterowfont"))
        {
            element = document.getElementById("folderTree");
            element.removeAttribute("ac-blackrowfont");
            element.setAttribute("ac-whiterowfont","");
        }
        else
        {
            element = document.getElementById("folderTree");
            element.removeAttribute("ac-blackrowfont");
            element.removeAttribute("ac-whiterowfont");
        }
        
        /* Light/Dark pane background */
        
        if (accountColors3Pane.prefs.getBoolPref("folder-lightpanebkgd"))
        {
            element = document.getElementById("folderTree");
            element.setAttribute("ac-lightpanebkgd","");
            element.removeAttribute("ac-darkpanebkgd");
        }
        else if (accountColors3Pane.prefs.getBoolPref("folder-darkpanebkgd"))
        {
            element = document.getElementById("folderTree");
            element.removeAttribute("ac-lightpanebkgd");
            element.setAttribute("ac-darkpanebkgd","");
        }
        else
        {
            element = document.getElementById("folderTree");
            element.removeAttribute("ac-lightpanebkgd");
            element.removeAttribute("ac-darkpanebkgd");
        }
        
        /* Bold on accounts/folders with new mail */
        
        if (accountColors3Pane.prefs.getBoolPref("folder-boldnewmail"))
        {
            element = document.getElementById("folderTree");
            element.setAttribute("ac-boldnewmail","");
        }
        else
        {
            element = document.getElementById("folderTree");
            element.removeAttribute("ac-boldnewmail");
        }
        
        /* Underline on accounts/folders with new mail */
        
        if (accountColors3Pane.prefs.getBoolPref("folder-undernewmail"))
        {
            element = document.getElementById("folderTree");
            element.setAttribute("ac-undernewmail","");
        }
        else
        {
            element = document.getElementById("folderTree");
            element.removeAttribute("ac-undernewmail");
        }
        
        /* Show tree lines */
        
        if (accountColors3Pane.prefs.getBoolPref("folder-showlines"))
        {
            element = document.getElementById("folderTree");
            element.setAttribute("ac-showlines","");
        }
        else
        {
            element = document.getElementById("folderTree");
            element.removeAttribute("ac-showlines");
        }
        
        /* Increase row spacing based on account font size */
        
        if (accountColors3Pane.prefs.getBoolPref("folder-incspacing"))
        {
            fontsize = accountColors3Pane.prefs.getIntPref("folder-fontsize");
            element = document.getElementById("folderTree");
            element.setAttribute("ac-is",fontsize);
        }
        else
        {
            element = document.getElementById("folderTree");
            element.removeAttribute("ac-is");
        }
        
        /* Reinstate default hover and select styles */
        
        if (accountColors3Pane.prefs.getBoolPref("folder-hoverselect"))
        {
            element = document.getElementById("folderTree");
            element.setAttribute("ac-hoverselect","");
        }
        else
        {
            element = document.getElementById("folderTree");
            element.removeAttribute("ac-hoverselect");
        }
        
        element = document.getElementById("folderTree");  /* Causes CSS Folder Tree -moz-tree-row height change to take effect */
        element.style.visibility = "hidden";
        element.style.visibility = "";
    },
    
    /* Thread Pane in Main Tab */
    
    threadSetup: function()
    {
        var obsServ;
        
        /* Observer for creation of new view */
        
        obsServ = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        obsServ.addObserver(accountColors3Pane.threadDBObserver,"MsgCreateDBView",false);
    },
    
    threadDBObserver:
    {
        observe: function(msgfolder,topic,data)
        { 
            var i,col,tree;
            
            /* Add column handler for all columns in Thread Tree */
            
            gDBView.addColumnHandler("threadCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("flaggedCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("attachmentCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("unreadButtonColHeader",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("subjectCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("senderCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("recipientCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("correspondentCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("junkStatusCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("receivedCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("dateCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("statusCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("sizeCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("tagsCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("accountCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("priorityCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("unreadCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("totalCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("locationCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("idCol",accountColors3Pane.threadColumnHandler);
        }
    }, 
    
    threadColumnHandler:
    {
        /* Thread column Handler functions for nsITreeView called from nsMsgDBView.cpp */
        /* - for getRowProperties: m_customColumnHandlers[i]->GetRowProperties(index,extra) */
        /* - for other functions: colHandler->getCellProperties(row,col,properties) */
        
        getCellProperties: function(row,col)
        {
            var props,msgUri,msgHdr,accountkey,account,accountidkey,folder,server,value;
            var fontcolor,fontstyle,fontsize,fromcolor,fromstyle,fromsize;
            
            props = " ";
            
            msgUri = gDBView.getURIForViewIndex(row);
            msgHdr = messenger.msgHdrFromURI(msgUri);
            
            /* Color based on received account */
            
            if (accountColors3Pane.prefs.getBoolPref("thread-hdraccount"))  /* color using account in message header */
            {
                accountkey = accountColorsUtilities.getAccountKey(msgHdr);  /* null string if sent message */
                account = accountColors3Pane.accountManager.getAccount(accountkey);
                
                if (account == null) accountidkey = null;  /* sent message */
                else if (account.defaultIdentity == null) accountidkey = account.key;
                else accountidkey = account.defaultIdentity.key;
            }
            else  /* color using account in which folder is located */
            {
                folder = msgHdr.folder;
                server = folder.server;
                account = accountColors3Pane.accountManager.FindAccountForServer(server);
                
                if (account.defaultIdentity == null) accountidkey = account.key;
                else accountidkey = account.defaultIdentity.key;
            }
            
            /* add extra properties for not-hover and not-selected */
            /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
            
            if (row != accountColors3Pane.hoverRow)
            {
                props += " " + "not-hover";
            }            
            
            if (!gDBView.selection.isSelected(row))
            {
                props += " " + "not-selected";
            }
                
            if (col.id == "subjectCol")
            {
                /* add extra properties for font color, font style, font size and bold subject */
                /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
                
                /* Color subject font */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-colorfont"))
                {
                    fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
                    props += " " + "ac-fc-"+fontcolor.substr(1,6);
                }
                
                /* Subject font style */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-setfontstyle"))
                {
                    fontstyle = accountColors3Pane.prefs.getIntPref("thread-fontstyle");
                    
                    switch (fontstyle)
                    { 
                        case 0: /* Normal */
                            props += " " + "ac-fs-normal";
                            break;
                        case 1: /* Italic */
                            props += " " + "ac-fs-italic";
                            break;
                        case 2: /* Bold */
                            props += " " + "ac-fs-bold";
                            break;
                        case 3: /* Bold Italic */
                            props += " " + "ac-fs-bolditalic";
                            break;
                    }
                }
                
                /* Subject font size */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-setfontsize"))
                {
                    if (accountColors3Pane.prefs.getBoolPref("thread-incspacing"))
                    {
                        fontsize = accountColors3Pane.prefs.getIntPref("thread-fontsize");
                        props += " " + "ac-fs-"+fontsize+"-is";
                    }
                    else
                    {
                        fontsize = accountColors3Pane.prefs.getIntPref("thread-fontsize");
                        props += " " + "ac-fs-"+fontsize;
                    }
                }
                
                /* Bold Subject on unread messages */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-boldsubject"))
                {
                    props += " " + "ac-boldsubject";
                }
            }
            else if (col.id == "senderCol")
            {
                /* add extra properties for from color, from style, from size and bold */
                /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
                
                /* Color from font */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-colorfrom"))
                {
                    fromcolor = accountColorsUtilities.fontColorPref(accountidkey);
                    props += " " + "ac-fc-"+fromcolor.substr(1,6);
                }
                
                /* From font style */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-setfromstyle"))
                {
                    fromstyle = accountColors3Pane.prefs.getIntPref("thread-fromstyle");
                    
                    switch (fromstyle)
                    { 
                        case 0: /* Normal */
                            props += " " + "ac-fs-normal";
                            break;
                        case 1: /* Italic */
                            props += " " + "ac-fs-italic";
                            break;
                        case 2: /* Bold */
                            props += " " + "ac-fs-bold";
                            break;
                        case 3: /* Bold Italic */
                            props += " " + "ac-fs-bolditalic";
                            break;
                    }
                }
                
                /* From font size */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-setfromsize"))
                {
                    if (accountColors3Pane.prefs.getBoolPref("thread-incspacing"))
                    {
                        fromsize = accountColors3Pane.prefs.getIntPref("thread-fromsize");
                        props += " " + "ac-fs-"+fromsize+"-is";
                    }
                    else
                    {
                        fromsize = accountColors3Pane.prefs.getIntPref("thread-fromsize");
                        props += " " + "ac-fs-"+fromsize;
                    }
                }
                
                /* Bold from on unread messages */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-boldfrom"))
                {
                    props += " " + "ac-boldfrom";
                }
            }
            else if (col.id == "correspondentCol")
            {
                /* add extra properties for recipient/date/size/account/etc (other) color */
                /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
                
                /* Get outgoing and incoming properties - which are set in nsMsgDBView.cpp only if there is no custom column handler */
                
                gDBView.removeColumnHandler(col.id);
                value = gDBView.getCellProperties(row,col);
                gDBView.addColumnHandler(col.id,this);
                
                if (value.indexOf("outgoing") >= 0) props += " " + "outgoing";
                else if (value.indexOf("incoming") >= 0) props += " " + "incoming";
                
                /* Color recipient/date/size/account/etc fonts */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-colorother"))
                {
                    fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
                    props += " " + "ac-fc-"+fontcolor.substr(1,6);
                }
            }
            else  /* any other column */
            {
                /* add extra properties for recipient/date/size/account/etc (other) color */
                /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
                
                /* Color recipient/date/size/account/etc fonts */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-colorother"))
                {
                    fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
                    props += " " + "ac-fc-"+fontcolor.substr(1,6);
                }
            }
            
            return props;
        },
        
        getRowProperties: function(row)
        {
            var props,msgUri,msgHdr,accountkey,account,accountidkey,folder,server;
            var bkgdcolor;
            
            props = " ";
            
            msgUri = gDBView.getURIForViewIndex(row);
            msgHdr = messenger.msgHdrFromURI(msgUri);
            
            /* Color based on received account */
            
            if (accountColors3Pane.prefs.getBoolPref("thread-hdraccount"))  /* color using account in message header */
            {
                accountkey = accountColorsUtilities.getAccountKey(msgHdr);  /* null string if sent message */
                account = accountColors3Pane.accountManager.getAccount(accountkey);
                
                if (account == null) accountidkey = null;  /* sent message */
                else if (account.defaultIdentity == null) accountidkey = account.key;
                else accountidkey = account.defaultIdentity.key;
            }
            else  /* color using account in which folder is located */
            {
                folder = msgHdr.folder;
                server = folder.server;
                account = accountColors3Pane.accountManager.FindAccountForServer(server);
                
                if (account.defaultIdentity == null) accountidkey = account.key;
                else accountidkey = account.defaultIdentity.key;
            }
            
            /* add extra properties for not-hover, not-selected, not-focused, background color, show row stripes, darker selection bar */
            /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
            
            if (row != accountColors3Pane.hoverRow)
            {
                props += " " + "not-hover";
            }
            
            if (!gDBView.selection.isSelected(row))
            {
                props += " " + "not-selected";
            }
            
            if (!document.getElementById("threadTree").focused)
            {
                props += " " + "not-focused";
            }
            
            /* Color row background */
            
            if (accountColors3Pane.prefs.getBoolPref("thread-colorbkgd"))
            {
                bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
                props += " " + "ac-bc-"+bkgdcolor.substr(1,6);
            }
            
            /* Show row stripes */
            
            if (accountColors3Pane.prefs.getBoolPref("thread-showstripes"))
            {
                props += " " + "ac-showstripes";
            }
            
            /* Darker unfocused select bar */
            
            if (accountColors3Pane.prefs.getBoolPref("thread-darkerbar"))
            {
                props += " " + "ac-darkerbar";
            }
            
            return props;
        },
        
        getImageSrc: function(row,col)
        {
            /* original handler always returns null string */
            
            return "";
        },
        
        getCellText: function(row,col)
        {
            /* original handler called */
            
            var value,msgUri,msgHdr,accountkey,account;
            
            gDBView.removeColumnHandler(col.id);
            value = gDBView.getCellText(row,col);
            gDBView.addColumnHandler(col.id,this);
            
            /* Color based on received account */
            
            if (accountColors3Pane.prefs.getBoolPref("thread-hdraccount"))  /* color using account in message header */
            {
                if (col.id == "accountCol")
                {
                    msgUri = gDBView.getURIForViewIndex(row);
                    msgHdr = messenger.msgHdrFromURI(msgUri);
                    
                    accountkey = accountColorsUtilities.getAccountKey(msgHdr);
                    account = accountColors3Pane.accountManager.getAccount(accountkey);
                    
                    if (account != null) value = account.incomingServer.prettyName;
                }
            }
            
            return value;
        },
        
        cycleCell: function(row,col)
        {
            /* original handler called */
            
            var value;
            
            gDBView.removeColumnHandler(col.id);
            value = gDBView.cycleCell(row,col);
            gDBView.addColumnHandler(col.id,this);
            
            return value;
        },
        
        isEditable: function(row,col)
        {
            /* original handler always returns false */
            
            return false;
        },
        
        /* Functions for nsIMsgCustomColumnHandler */
        
        getSortStringForRow: function(hdr)
        {
            /* custom handler not called for standard columns */
            
            return "";
        },
        
        getSortLongForRow: function(hdr)
        {
            /* custom handler not called for standard columns */
            
            return 0;
        },
        
        isString: function()
        {
            /* custom handler not called for standard columns */
            
            return true;
        }
    },
    
    threadPane: function()
    {
        var element,fontsize,fromsize;
        
        /* Black/White row fonts */
        
        if (accountColors3Pane.prefs.getBoolPref("thread-blackrowfont"))
        {
            element = document.getElementById("threadTree");
            element.setAttribute("ac-blackrowfont","");
            element.removeAttribute("ac-whiterowfont");
        }
        else if (accountColors3Pane.prefs.getBoolPref("thread-whiterowfont"))
        {
            element = document.getElementById("threadTree");
            element.removeAttribute("ac-blackrowfont");
            element.setAttribute("ac-whiterowfont","");
        }
        else
        {
            element = document.getElementById("threadTree");
            element.removeAttribute("ac-blackrowfont");
            element.removeAttribute("ac-whiterowfont");
        }
        
        /* Light/Dark pane background */
        
        if (accountColors3Pane.prefs.getBoolPref("thread-lightpanebkgd"))
        {
            element = document.getElementById("threadTree");
            element.setAttribute("ac-lightpanebkgd","");
            element.removeAttribute("ac-darkpanebkgd");
        }
        else if (accountColors3Pane.prefs.getBoolPref("thread-darkpanebkgd"))
        {
            element = document.getElementById("threadTree");
            element.removeAttribute("ac-lightpanebkgd");
            element.setAttribute("ac-darkpanebkgd","");
        }
        else
        {
            element = document.getElementById("threadTree");
            element.removeAttribute("ac-lightpanebkgd");
            element.removeAttribute("ac-darkpanebkgd");
        }
        
        /* Bold subject/from on unread messages */
        
        if (accountColors3Pane.prefs.getBoolPref("thread-boldsubject") || accountColors3Pane.prefs.getBoolPref("thread-boldfrom"))
        {
            element = document.getElementById("threadTree");
            element.setAttribute("ac-boldsubjectfrom","");
        }
        else
        {
            element = document.getElementById("threadTree");
            element.removeAttribute("ac-boldsubjectfrom");
        }
        
        /* Increase row spacing based on subject/from font sizes */
        
        if (accountColors3Pane.prefs.getBoolPref("thread-incspacing"))
        {
            fontsize = accountColors3Pane.prefs.getIntPref("thread-fontsize");
            fromsize = accountColors3Pane.prefs.getIntPref("thread-fromsize");
            if (fromsize > fontsize) fontsize = fromsize;
            element = document.getElementById("threadTree");
            element.setAttribute("ac-is",fontsize);
        }
        else
        {
            element = document.getElementById("threadTree");
            element.removeAttribute("ac-is");
        }
        
        /* Reinstate default hover and select styles */
        
        if (accountColors3Pane.prefs.getBoolPref("thread-hoverselect"))
        {
            element = document.getElementById("threadTree");
            element.setAttribute("ac-hoverselect","");
        }
        else
        {
            element = document.getElementById("threadTree");
            element.removeAttribute("ac-hoverselect");
        }
        
        element = document.getElementById("threadTree");  /* Causes CSS Thread Tree -moz-tree-row height change to take effect */
        element.style.visibility = "hidden";
        element.style.visibility = "";
    },
    
    /* Message Pane in Main Tab, Message Tab or Conversation Tab */
    
    messagePane: function()
    {
        var msgUri,msgHdr,accountkey,account,accountidkey,folder,server;
        var element,fontcolor,bkgdcolor,fontstyle,style,weight,fontsize;
        
        try
        { 
            msgUri = gMessageDisplay.folderDisplay.selectedMessageUris[0];  
        }
        catch (e)
        {
            return;  /* message not selected */
        }
        
        msgHdr = messenger.msgHdrFromURI(msgUri);
        
        /* Color based on received account */
        
        if (accountColors3Pane.prefs.getBoolPref("message-hdraccount"))  /* color using account in message header */
        {
            accountkey = accountColorsUtilities.getAccountKey(msgHdr);  /* null string if sent message */
            account = accountColors3Pane.accountManager.getAccount(accountkey);
            
            if (account == null) accountidkey = null;  /* sent message */
            else if (account.defaultIdentity == null) accountidkey = account.key;
            else accountidkey = account.defaultIdentity.key;
        }
        else  /* color using account in which folder is located */
        {
            folder = msgHdr.folder;
            server = folder.server;
            account = accountColors3Pane.accountManager.FindAccountForServer(server);
            
            if (account.defaultIdentity == null) accountidkey = account.key;
            else accountidkey = account.defaultIdentity.key;
        }
        
        /* Color subject font */
        
        if (accountColors3Pane.prefs.getBoolPref("message-colorfont"))
        {
            fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
            
            document.getElementById("expandedsubjectBox").style.color = fontcolor;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) element.style.color = fontcolor;
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) element.style.color = fontcolor;
        }
        else
        {
            document.getElementById("expandedsubjectBox").style.color = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) element.style.color = "";
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) element.style.color = "";
        }
        
        /* Color header background */
        
        if (accountColors3Pane.prefs.getBoolPref("message-colorbkgd"))
        {
            bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
            if (accountColors3Pane.prefs.getBoolPref("message-defaultbkgd") && bkgdcolor == "#FFFFFF") bkgdcolor = "";
            
            document.getElementById("expandedHeaderView").style.backgroundColor = bkgdcolor;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsedHeaderView");
            if (element != null) element.style.backgroundColor = bkgdcolor;
        }
        else
        {
            document.getElementById("expandedHeaderView").style.backgroundColor = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsedHeaderView");
            if (element != null) element.style.backgroundColor = "";
        }
        
        /* Color from font */
        
        if (accountColors3Pane.prefs.getBoolPref("message-colorfrom"))
        {
            fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
            
            document.getElementById("expandedfromBox").children[0].children[0].style.color = fontcolor;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            if (element != null) element.children[0].children[0].style.color = fontcolor;
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            if (element != null) element.children[0].children[0].style.color = fontcolor;
        }
        else
        {
            document.getElementById("expandedfromBox").children[0].children[0].style.color = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            if (element != null) element.children[0].children[0].style.color = "";
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            if (element != null) element.children[0].children[0].style.color = "";
        }
        
        /* Black/White header labels */
        
        if (accountColors3Pane.prefs.getBoolPref("message-blackhdrlabels"))
        {
            document.getElementById("expandedfromLabel").style.color = "black";
            document.getElementById("expandedsubjectLabel").style.color = "black";
            document.getElementById("expandedtoLabel").style.color = "black";
            document.getElementById("expandedtoBox").children[0].children[0].style.color = "black";
            document.getElementById("expandedtoBox").children[1].style.color = "black";
            document.getElementById("dateValueBox").style.color = "black";
            document.getElementById("header-view-toolbar").style.color = "black";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LdateBox");
            if (element != null) element.style.color = "black";
        }
        else if (accountColors3Pane.prefs.getBoolPref("message-whitehdrlabels"))
        {
            document.getElementById("expandedfromLabel").style.color = "white";
            document.getElementById("expandedsubjectLabel").style.color = "white";
            document.getElementById("expandedtoLabel").style.color = "white";
            document.getElementById("expandedtoBox").children[0].children[0].style.color = "white";
            document.getElementById("expandedtoBox").children[1].style.color = "white";
            document.getElementById("dateValueBox").style.color = "white";
            document.getElementById("header-view-toolbar").style.color = "white";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LdateBox");
            if (element != null) element.style.color = "white";
        }
        else
        {
            document.getElementById("expandedfromLabel").style.color = "";
            document.getElementById("expandedsubjectLabel").style.color = "";
            document.getElementById("expandedtoLabel").style.color = "";
            document.getElementById("expandedtoBox").children[0].children[0].style.color = "";
            document.getElementById("expandedtoBox").children[1].style.color = "";
            document.getElementById("dateValueBox").style.color = "";
            document.getElementById("header-view-toolbar").style.color = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LdateBox");
            if (element != null) element.style.color = "";
        }
        
        /* Subject font style */
        
        if (accountColors3Pane.prefs.getBoolPref("message-setfontstyle"))
        {
            fontstyle = accountColors3Pane.prefs.getIntPref("message-fontstyle");
            
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
            
            document.getElementById("expandedsubjectBox").style.fontStyle = style;
            document.getElementById("expandedsubjectBox").style.fontWeight = weight;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) element.style.fontStyle = "";
            if (element != null) element.style.fontWeight = "";
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) element.style.fontStyle = "";
            if (element != null) element.style.fontWeight = "";
        }
        else
        {
            document.getElementById("expandedsubjectBox").style.fontStyle = "";
            document.getElementById("expandedsubjectBox").style.fontWeight = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) element.style.fontStyle = "";
            if (element != null) element.style.fontWeight = "";
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) element.style.fontStyle = "";
            if (element != null) element.style.fontWeight = "";
        }
        
        /* Subject font size */
        
        if (accountColors3Pane.prefs.getBoolPref("message-setfontsize"))
        {
            fontsize = accountColors3Pane.prefs.getIntPref("message-fontsize");
            
            document.getElementById("expandedsubjectBox").style.fontSize = fontsize+"px";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) element.style.fontSize = fontsize+"px";
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) element.style.fontSize = fontsize+"px";
        }
        else
        {
            document.getElementById("expandedsubjectBox").style.fontSize = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LsubjectBox");
            if (element != null) element.style.fontSize = "";
            
            element = document.getElementById("CompactHeader_collapsed2LsubjectBox");
            if (element != null) element.style.fontSize = "";
        }
        
        /* From font style */
        
        if (accountColors3Pane.prefs.getBoolPref("message-setfromstyle"))
        {
            fontstyle = accountColors3Pane.prefs.getIntPref("message-fromstyle");
            
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
            
            document.getElementById("expandedfromBox").children[0].children[0].style.fontStyle = style;
            document.getElementById("expandedfromBox").children[0].children[0].style.fontWeight = weight;
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            if (element != null) element.children[0].children[0].style.fontStyle = style;
            if (element != null) element.children[0].children[0].style.fontWeight = weight;
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            if (element != null) element.children[0].children[0].style.fontStyle = style;
            if (element != null) element.children[0].children[0].style.fontWeight = weight;
        }
        else
        {
            document.getElementById("expandedfromBox").children[0].children[0].style.fontStyle = "";
            document.getElementById("expandedfromBox").children[0].children[0].style.fontWeight = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            if (element != null) element.children[0].children[0].style.fontStyle = "";
            if (element != null) element.children[0].children[0].style.fontWeight = "";
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            if (element != null) element.children[0].children[0].style.fontStyle = "";
            if (element != null) element.children[0].children[0].style.fontWeight = "";
        }
        
        /* From font size */
        
        if (accountColors3Pane.prefs.getBoolPref("message-setfromsize"))
        {
            fontsize = accountColors3Pane.prefs.getIntPref("message-fromsize");
            
            document.getElementById("expandedfromBox").children[0].children[0].style.fontSize = fontsize+"px";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            if (element != null) element.children[0].children[0].style.fontSize = fontsize+"px";
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            if (element != null) element.children[0].children[0].style.fontSize = fontsize+"px";
        }
        else
        {
            document.getElementById("expandedfromBox").children[0].children[0].style.fontSize = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            if (element != null) element.children[0].children[0].style.fontSize = "";
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            if (element != null) element.children[0].children[0].style.fontSize = "";
        }
    },
    
    cmdOptions: function()
    {
        var optionsWindow;
        
        optionsWindow = accountColors3Pane.winmed.getMostRecentWindow("accountcolors-options");
        
        if (optionsWindow) optionsWindow.focus();
        else window.openDialog("chrome://accountcolors/content/accountcolors-options.xul","","chrome,dialog,titlebar,centerscreen",null);
    }
};

window.addEventListener("load",accountColors3Pane.onLoad,false);
