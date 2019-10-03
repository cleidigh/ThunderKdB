/************************************************************************/
/*                                                                      */
/*      Account Colors  -  Thunderbird Extension  -  3Pane Window       */
/*                                                                      */
/*      Javascript for 3Pane Window overlay                             */
/*                                                                      */
/*      Copyright (C) 2008-2018  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  16 Nov 2018                                       */
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
            var boxobject,element;
            
            if (topic != "nsPref:changed") return;
            
            /* Generate CSS tree coloring rules */
            
            accountColors3Pane.generateRules();
            
            /* Update Folder Pane */
            
            accountColors3Pane.folderPane();
            
            boxobject = document.getElementById("folderTree").boxObject;  /* Force re-load of Folder Tree */ 
            boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
            boxobject.invalidate();
            
            element = document.getElementById("folderTree");  /* Causes CSS Folder Tree -moz-tree-row height change to take effect */
            element.style.visibility = "hidden";
            element.style.visibility = "";
            
            /* Update Thread Pane */
            
            accountColors3Pane.threadPane();
            
            boxobject = document.getElementById("threadTree").boxObject;  /* Force re-load of Folder Tree */
            boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
            boxobject.invalidate();
            
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
        var i,oldprefs,preftype;
        var children = new Array();
        
        window.removeEventListener("load",accountColors3Pane.onLoad,false);
        
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
        
        //document.getElementById("threadTree").addEventListener("select",accountColors3Pane.messagePane,false);  /* changes color to soon */
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
        var i,sheet,preftype,color;
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
            preftype = accountColors3Pane.prefs.getPrefType(children[i]);
            
            color = accountColors3Pane.prefs.getCharPref(children[i]).substr(1);
            
            if (children[i].substr(children[i].length-9) == "fontcolor")
            {
                sheet.insertRule("#folderTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,not-dragOn) { color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule("#threadTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected) { color: #" + color + "; }",sheet.cssRules.length);
            }
            else if (children[i].substr(children[i].length-9) == "bkgdcolor")
            {
                sheet.insertRule("#folderTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected,not-dragOn) { background-color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule("#threadTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected) { background-color: #" + color + "; }",sheet.cssRules.length);
            }
        }
        
        children = accountColors3Pane.prefs.getChildList("id",{});
        
        for (i = 0; i < children.length; i++)
        {
            preftype = accountColors3Pane.prefs.getPrefType(children[i]);
            
            color = accountColors3Pane.prefs.getCharPref(children[i]).substr(1);
            
            if (children[i].substr(children[i].length-9) == "fontcolor")
            {
                sheet.insertRule("#folderTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected,not-dragOn) { color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule("#threadTree treechildren::-moz-tree-cell-text(ac-fc-" + color + ",not-selected) { color: #" + color + "; }",sheet.cssRules.length);
            }
            else if (children[i].substr(children[i].length-9) == "bkgdcolor")
            {
                sheet.insertRule("#folderTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected,not-dragOn) { background-color: #" + color + "; }",sheet.cssRules.length);
                sheet.insertRule("#threadTree treechildren::-moz-tree-row(ac-bc-" + color + ",not-selected) { background-color: #" + color + "; }",sheet.cssRules.length);
            }
        }
    },
    
    /* Detect mouse hovering over row in folder or thread pane */
    
    onMouseMove: function(event)
    {
        var treeBoxObject;
        
        treeBoxObject = this.treeBoxObject;
        
        accountColors3Pane.hoverRow = this.treeBoxObject.getRowAt(event.clientX,event.clientY);
    },
    
    /* Detect message dragged over row in folder pane */

    onDragOver: function(event)
    {
        /* Derived from dragover event handler in tree.xml */
        /* Refer to nsITreeBoxObject.idl */
        
        var rowHeight,eventY,orientation;
        var row = { };
        var col = { };
        var child = { };
        
        this.treeBoxObject.getCellAt(event.clientX,event.clientY,row,col,child);
        
        rowHeight = this.treeBoxObject.rowHeight;
        eventY = event.clientY-this.treeBoxObject.treeBody.boxObject.y-rowHeight*(row.value-this.treeBoxObject.getFirstVisibleRow());
        
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

            props = gFolderTreeView.accountcolors_old_getCellProperties(row,col);  /* call original handler */
            
            if (col.id == "folderNameCol")
            {
                server = gFolderTreeView._rowMap[row]._folder.server;
                account = accountColors3Pane.accountManager.FindAccountForServer(server);
                
                if (account.defaultIdentity == null) accountidkey = account.key;
                else accountidkey = account.defaultIdentity.key;
                
                /* add extra properties for not-hover, not-dragOn, not-selected, font color, font style, font size, folder font color, no bold on unread, and show tree lines */
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
                
                if (gFolderTreeView._rowMap[row]._folder.isServer)
                {
                    /* Account font color */
                    
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
                else
                {
                    /* Folder font color */
                    
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
                
                if (accountColors3Pane.prefs.getBoolPref("folder-showlines"))
                {
                    props += " " + "ac-showlines";
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
            var bkgdcolor;
            
            props = gFolderTreeView.accountcolors_old_getRowProperties(row);  /* call original handler */
            
            server = gFolderTreeView._rowMap[row]._folder.server;
            account = accountColors3Pane.accountManager.FindAccountForServer(server);
            
            if (account.defaultIdentity == null) accountidkey = account.key;
            else accountidkey = account.defaultIdentity.key;
            
            /* add extra properties for not-hover, not-dragOn, not-selected, not-focused, background color, folder background color and darker selection bar */
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
            
            if (!document.getElementById("folderTree").treeBoxObject.focused)
            {
                props += " " + "not-focused";
            }
            
            if (gFolderTreeView._rowMap[row]._folder.isServer)
            {
                /* Account background color */
                
                if (accountColors3Pane.prefs.getBoolPref("folder-colorbkgd"))
                {
                    bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
                    if (bkgdcolor != "#FFFFFF" || !accountColors3Pane.prefs.getBoolPref("folder-defaultbkgd"))
                    {
                        props += " " + "ac-bc-"+bkgdcolor.substr(1,6);
                    }
                }
            }
            else
            {
                /* Folder background color */
                
                if (accountColors3Pane.prefs.getBoolPref("folder-colorfldbkgd"))
                {
                    bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
                    if (bkgdcolor != "#FFFFFF" || !accountColors3Pane.prefs.getBoolPref("folder-defaultbkgd"))
                    {
                        props += " " + "ac-bc-"+bkgdcolor.substr(1,6);
                    }
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
        
        /* Bold on Accounts/Folders with new mail */
        
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
        
        /* Underline on Accounts/Folders with new mail */

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
        
        /* Increase row spacing based on Account font size */
        
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
            
            /* Add column handler for subject/from/recipient/date/size/account/priority columns in Thread Tree */
            
            gDBView.addColumnHandler("subjectCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("senderCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("recipientCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("dateCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("sizeCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("accountCol",accountColors3Pane.threadColumnHandler);
            gDBView.addColumnHandler("priorityCol",accountColors3Pane.threadColumnHandler);
        }
    }, 
    
    threadColumnHandler:
    {
        /* Functions for nsITreeView */
        
        getCellProperties: function(row,col)
        {
            var props,msgUri,msgHdr,accountkey,account,accountidkey,folder,server;
            var fontcolor,fontstyle,fontsize,fromcolor,fromstyle,fromsize,othercolor;
            
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
            
            if (col.id == "subjectCol")
            {
                /* add extra properties for not-hover, not-selected, font color, font style, font size and bold subject */
                /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
                
                if (row != accountColors3Pane.hoverRow)
                {
                    props += " " + "not-hover";
                }            
                
                if (!gDBView.selection.isSelected(row))
                {
                    props += " " + "not-selected";
                }
                
                /* Subject font color */
                
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
                /* add extra properties for not-hover, not-selected, from color, from style, from size and bold */
                /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
                
                if (row != accountColors3Pane.hoverRow)
                {
                    props += " " + "not-hover";
                }
                
                if (!gDBView.selection.isSelected(row))
                {
                    props += " " + "not-selected";
                }
                
                /* From font color */
                
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
                
                /* Bold From on unread messages */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-boldfrom"))
                {
                    props += " " + "ac-boldfrom";
                }
            }
            else if (col.id == "recipientCol" || col.id == "dateCol" || col.id == "sizeCol" || col.id == "accountCol" || col.id == "priorityCol")
            {
                /* add extra properties for not-hover, not-selected, recipient/date/size/account/priority (other) color */
                /* required to select tree element styles defined in accountcolors-3panewindow[-generated].css */
                
                if (row != accountColors3Pane.hoverRow)
                {
                    props += " " + "not-hover";
                }
                
                if (!gDBView.selection.isSelected(row))
                {
                    props += " " + "not-selected";
                }
                
                /* Recipient/Date/Size/Account/Priority fonts color */
                
                if (accountColors3Pane.prefs.getBoolPref("thread-colorother"))
                {
                    othercolor = accountColorsUtilities.fontColorPref(accountidkey);
                    props += " " + "ac-fc-"+othercolor.substr(1,6);
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
            
            if (!document.getElementById("threadTree").treeBoxObject.focused)
            {
                props += " " + "not-focused";
            }
            
            /* Row background color */
            
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
            /* original handler always returns nothing */
            
            return null;
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
            
            return;
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
        
        /* Bold Subject/From on unread messages */
        
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
        
        /* Increase row spacing based on Subject/From font size */
        
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
        
        /* Subject font color */
        
        if (accountColors3Pane.prefs.getBoolPref("message-colorfont"))
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
        
        if (accountColors3Pane.prefs.getBoolPref("message-colorbkgd"))
        {
            bkgdcolor = accountColorsUtilities.bkgdColorPref(accountidkey);
            if (bkgdcolor == "#FFFFFF" && accountColors3Pane.prefs.getBoolPref("message-defaultbkgd")) bkgdcolor = "";
            
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
        
        if (accountColors3Pane.prefs.getBoolPref("message-colorfrom"))
        {
            fontcolor = accountColorsUtilities.fontColorPref(accountidkey);
            
            element = document.getElementById("expandedfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = fontcolor;
            
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
            document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = "";
            
            /* For CompactHeader add-on */
            
            element = document.getElementById("CompactHeader_collapsed1LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = "";
            
            element = document.getElementById("CompactHeader_collapsed2LfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            if (element != null) document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.color = "";
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
        
        if (accountColors3Pane.prefs.getBoolPref("message-setfontsize"))
        {
            fontsize = accountColors3Pane.prefs.getIntPref("message-fontsize");
            
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
            
            element = document.getElementById("expandedfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontStyle = style;
            document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontWeight = weight;
            
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
            document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontStyle = "";
            document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontWeight = "";
            
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
        
        if (accountColors3Pane.prefs.getBoolPref("message-setfromsize"))
        {
            fontsize = accountColors3Pane.prefs.getIntPref("message-fromsize");
            
            element = document.getElementById("expandedfromBox");
            element = document.getAnonymousElementByAttribute(element,"anonid","emailAddresses").children[0];
            document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontSize = fontsize+"px";
            
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
            document.getAnonymousElementByAttribute(element,"anonid","emaillabel").style.fontSize = "";
            
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
        
        optionsWindow = accountColors3Pane.winmed.getMostRecentWindow("accountcolors-options");
        
        if (optionsWindow) optionsWindow.focus();
        else window.openDialog("chrome://accountcolors/content/accountcolors-options.xul","","chrome,dialog,titlebar,centerscreen",null);
    }
};

window.addEventListener("load",accountColors3Pane.onLoad,false);
