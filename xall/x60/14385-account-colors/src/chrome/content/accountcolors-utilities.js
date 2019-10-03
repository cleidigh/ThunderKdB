/************************************************************************/
/*                                                                      */
/*      Account Colors  -  Thunderbird Extension  -  Utilities          */
/*                                                                      */
/*      Javascript for Utilities for all overlays                       */
/*                                                                      */
/*      Copyright (C) 2008-2015  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  25 Apr 2015                                       */
/*                                                                      */
/************************************************************************/

"use strict";

var accountColorsUtilities =
{
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.accountcolors."),
    
    accountManager: Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager),
    
    headerParser: Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser),
    
    debugCount: 0,
    
    /* Get account key for message */
    
    getAccountKey: function(msgHdr)
    {
        var accountkey;
        
        accountkey = "";
        
        if (true)  /* any received message (including message sent to self) */
        {
            if (msgHdr.accountKey != "")
            {
                /* POP3 received message in POP3 or Local In */
                
                accountkey = msgHdr.accountKey;
            }
            else
            {
                if (msgHdr.folder.server.type == "imap")  /* message in IMAP folder */
                {
                    /* IMAP received message in IMAP inbox */
                    /* POP3 received message in IMAP inbox */
                    
                    accountkey = accountColorsUtilities.findAccountKeyForRecipient(msgHdr,"imap");
                    
                    if (accountkey == "") accountkey = accountColorsUtilities.findAccountKeyForRecipient(msgHdr,"pop3");
                }
                else  /* message in POP3 or Local folder */
                {
                    /* IMAP received message in POP3 or Local inbox */
                    
                    accountkey = accountColorsUtilities.findAccountKeyForRecipient(msgHdr,"imap");
                }
            }
        }
        
        return accountkey;
    },
    
    /* Find account key for message recipient */
    
    findAccountKeyForRecipient: function(msgHdr,type)
    {
        var accountkey,identityindex,recipients,acc,account,id,identity,index;
        var accounts = new Array();
        var identities = new Array();
        
        accountkey = "";
        identityindex = 1000000;
        
        recipients = "," + accountColorsUtilities.headerParser.extractHeaderAddressMailboxes(msgHdr.recipients) + ",";
        recipients += accountColorsUtilities.headerParser.extractHeaderAddressMailboxes(msgHdr.ccList) + ",";
        recipients = recipients.toLowerCase().replace(/\s/g,"");
        
        accounts = accountColorsUtilities.accountManager.accounts;
        
        for (acc = 0; acc < accountColorsUtilities.getLength(accounts); acc++)
        {
            account = accountColorsUtilities.getAccount(accounts,acc);
            
            if (account.incomingServer.type == type)
            {            
                identities = account.identities;
                
                for (id = 0; id < accountColorsUtilities.getLength(identities); id++)
                {
                    identity = accountColorsUtilities.getIdentity(identities,id);
                    
                    index = recipients.indexOf("," + identity.email + ",")
                    
                    if (index >= 0)
                    {
                        if (account.incomingServer == msgHdr.folder.server) return account.key;
                        
                        if (index < identityindex)
                        {
                            accountkey = account.key;
                            identityindex = index;
                        }
                    }
                }
            }
        }
        
        return accountkey;
    },
    
    /* Get font color for account/identity */
    
    fontColorPref: function(accountidkey)
    {
        var fontcolor;
        
        try
        {
            fontcolor = accountColorsUtilities.prefs.getCharPref(accountidkey+"-fontcolor")
        }
        catch (e)
        {
            fontcolor = "#000000";
        }
        
        return fontcolor;
    },
    
    /* Get background color for account/identity */
    
    bkgdColorPref: function(accountidkey)
    {
        var bkgdcolor;
        
        try
        {
            bkgdcolor = accountColorsUtilities.prefs.getCharPref(accountidkey+"-bkgdcolor")
        }
        catch (e)
        {
            bkgdcolor = "#FFFFFF";
        }
        
        return bkgdcolor;
    },
    
    /* Get number of accounts/identities */
    
    getLength: function(items)
    {
        /* Thunderbird 20.0 - nsISupportsArray deprecated - length replaced Count()  */
        
        if (typeof items.length != "undefined") return items.length;
        else return items.Count();
    },
    
    /* Get account by index */
    
    getAccount: function(accounts,index)
    {
        /* Thunderbird 20.0 - nsISupportsArray deprecated - queryElementAt() replaced QueryElementAt()  */
        
        if (typeof accounts.length != "undefined") return accounts.queryElementAt(index,Components.interfaces.nsIMsgAccount);
        else return accounts.QueryElementAt(index,Components.interfaces.nsIMsgAccount);
    },
    
    /* Get identity by index */
    
    getIdentity: function(identities,index)
    {
        /* Thunderbird 20.0 - nsISupportsArray deprecated - queryElementAt() replaced QueryElementAt()  */
        
        if (typeof identities.length != "undefined") return identities.queryElementAt(index,Components.interfaces.nsIMsgIdentity);
        else return identities.QueryElementAt(index,Components.interfaces.nsIMsgIdentity);
    },
    
    /* Display debug message */
    
    debugMessage: function(module,information)
    {
        var info;
        
        accountColorsUtilities.debugCount++;
        info = document.getElementById("accountcolors-debug-info");
        info.label = accountColorsUtilities.debugCount + " - " + module + " - " + information;
    }
};
