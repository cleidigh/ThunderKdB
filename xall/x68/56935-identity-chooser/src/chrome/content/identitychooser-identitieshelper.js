if(!org) var org={};
if(!org.janek) org.janek={};

Components.utils.import("resource:///modules/iteratorUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

org.janek.identitychooser_identitieshelper = function() {
  var self = this;
  self.mgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
    .getService(Components.interfaces.nsIMsgAccountManager);
  self.prefsHelper = org.janek.identitychooser_prefshelper();

  var pub = {};

  pub.identityToString = function(identity) {
    var str = "";
    if(identity.fullName != null)
      {
        str = identity.fullName;
      }
    if(identity.email != null)
      {
        str = str + ' <' + identity.email + '>';
      }

    return str;
  }

  self.isNonSuckyAccount = function(a) {
    return !!a.incomingServer;
  }

  self.sortAccounts = function(a, b) {
    if(self.mgr.defaultAccount != null) {
      if (a.key == self.mgr.defaultAccount.key)
        return -1;
      if (b.key == self.mgr.defaultAccount.key)
        return 1;
    }

    var aIsNews = a.incomingServer.type == "nntp";
    var bIsNews = b.incomingServer.type == "nntp";
    if (aIsNews && !bIsNews)
      return 1;
    if (bIsNews && !aIsNews)
      return -1;

    var aIsLocal = a.incomingServer.type == "none";
    var bIsLocal = b.incomingServer.type == "none";
    if (aIsLocal && !bIsLocal)
      return 1;
    if (bIsLocal && !aIsLocal)
      return -1;
    return 0;
  }

  self.getSortedAccounts = function() {
    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("start getSortedAccount");
      }

    var accounts = toArray(fixIterator(self.mgr.accounts,
                                       Components.interfaces.nsIMsgAccount));

    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("account manager account: " + accounts);
      }

    // Ugly hack to work around bug 41133. :-(
    accounts = accounts.filter(self.isNonSuckyAccount);
    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("non sucky accounts: " + accounts);
      }

    accounts.sort(self.sortAccounts);

    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("sorted non sucky accounts: " + accounts);
        Services.console.log("end getSortedAccount");
      }

    return accounts;
  }

  //
  // Iterate over all accounts and find every identity registered with
  // the account. Return an array of all identities of all accounts.
  //
  // Code adapted from MsgComposeCommands#FillIdentityList
  //
  pub.getAllIdentities = function() {
    var accounts = self.getSortedAccounts();

    var allIdentities = [];
    for(var accCount = 0; accCount < accounts.length; accCount++) {
      var account = accounts[accCount];

      if(!account)
        {
          continue;
        }

      var accountIdentities = toArray(fixIterator(account.identities,
                                                  Components.interfaces.nsIMsgIdentity));
      for(var identCount = 0;
          identCount < accountIdentities.length;
          identCount++)
        {
          allIdentities.push(accountIdentities[identCount]);
        }
    }

    return allIdentities;
  }

  //
  // Returns a list of tuples (identity, account) where the list is
  // sorted after the user specified order from the preferences.
  //
  // Use like this:
  //
  //  var allIdentities =
  //    self.identitiesHelper.getIdentitiesAccountListUserSorted();
  //   for(var i = 0; i < allIdentities.length; i++)
  //     {
  //       var identity = allIdentities[i].identity;
  //       var account = allIdentities[i].account;
  //       ...
  //       doStuff(identity);
  //     }
  //
  pub.getIdentitiesAccountListUserSorted = function() {
    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("start getIdentitiesAccountListUserSorted");
      }

    var accounts = self.getSortedAccounts();

    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("accounts: " + accounts);
      }

    var allIdentityAccountTupels = [];
    var newIdentityAccountTupels = [];
    for(var aCount = 0; aCount < accounts.length; aCount++) {
      var account = accounts[aCount];

      if(!account)
        {
          continue;
        }

    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("account: " + account);
      }

      var accountIdentities = toArray(fixIterator(account.identities,
                                                  Components.interfaces.nsIMsgIdentity));

      for(var iCount = 0; iCount < accountIdentities.length; iCount++)
        {
          var identity = accountIdentities[iCount]

          if(self.prefsHelper.getBoolPref("debugIdentities"))
            {
              Services.console.log("identity: " + identity);
            }

          var identityAccountTupel = {
            "identity" : identity,
            "account" : account,

            "toString" : function() {
              return this.identity.toString();
            }
          };

          if(self.prefsHelper.getBoolPref("debugIdentities"))
            {
              Services.console.log("hasMenuPosition: " +
                                      self.prefsHelper.hasMenuPosition(identity));
            }

          if(self.prefsHelper.hasMenuPosition(identity))
            {
              var userPosition = self.prefsHelper.getMenuPosition(identity);

              if(allIdentityAccountTupels[userPosition] == null)
                {
                  allIdentityAccountTupels[userPosition] = identityAccountTupel;
                }
              else
                {
                  newIdentityAccountTupels.push(identityAccountTupel);
                }
            }
          else
            {
              newIdentityAccountTupels.push(identityAccountTupel);
            }
        }
    }

    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("allIdentityAccountTupels: " +
                                allIdentityAccountTupels);
        Services.console.log("newIdentityAccountTupels: " +
                                newIdentityAccountTupels);
      }

    allIdentityAccountTupels =
      allIdentityAccountTupels.concat(newIdentityAccountTupels);

    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("allIdentityAccountTupels after concat: " +
                                allIdentityAccountTupels);
      }

    // It is possible that the user positions are not continous, i.e. after an
    // identity was deleted. Now we filter those empty array indexes.
    var filteredIdentityAccountTupels = [];
    for(var i = 0; i < allIdentityAccountTupels.length; i++)
      {
        if(allIdentityAccountTupels[i])
          {
            filteredIdentityAccountTupels.push(allIdentityAccountTupels[i]);
          }
      }

    if(self.prefsHelper.getBoolPref("debugIdentities"))
      {
        Services.console.log("filteredIdentityAccountTupels: " +
                                filteredIdentityAccountTupels);

        Services.console.log("end getIdentitiesAccountListUserSorted");
      }

    return filteredIdentityAccountTupels;
  }

  pub.findIdentity = function(identityId) {
    var allIdentities = pub.getAllIdentities();

    for(var i = 0; i < allIdentities.length; i++)
      {
        var identity = allIdentities[i];

        if(identity.key == identityId)
          {
            return identity;
          }
      }

    return null;
  }


  return pub;
};
