/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of FiltaQuilla, Custom Filter Actions, by Mesquilla.
 *
 * FiltaQuilla is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * You should have received a copy of the GNU General Public License
 * along with FiltaQuilla.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is FiltaQuilla code.
 *
 * The Initial Developer of the Original Code is
 * Kent James <rkent@mesquilla.com>
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
 */

(function mailingListFilter()
{
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;

  // global scope variables
  this.mailingListFilter = {};

  // local shorthand for the global reference
  var self = this.mailingListFilter;

  self.initialized = false;
  self.name = mailingListFilter;

  const mailingListFilterStrings = Cc["@mozilla.org/intl/stringbundle;1"]
                                .getService(Ci.nsIStringBundleService)
                                .createBundle("chrome://mailing-list-filter/locale/mailing-list-filter.properties");

  const headerParser = Cc["@mozilla.org/messenger/headerparser;1"]
                          .getService(Ci.nsIMsgHeaderParser);

  const abManager = Cc["@mozilla.org/abmanager;1"]
                       .getService(Ci.nsIAbManager);

  // cache the values of commonly used search operators
  let nsMsgSearchOp = Ci.nsMsgSearchOp;
  let IsInAB = nsMsgSearchOp.IsInAB;
  let IsntInAB = nsMsgSearchOp.IsntInAB;

  self._init = function()
  {
    self.strings = document.getElementById("mailing-list-filter-strings");

    self.match = function mailingList_match(aMsgHdr, aSearchValue, aSearchOp, searchRecipients)
    {
      let dir = abManager.getDirectory(aSearchValue);
      if (!dir) {
        Cu.reportError("During filter action, can't find directory: " + aSearchValue);
        return;
      }

      let addresses = {};
      addressesString = aMsgHdr.author;
      if (searchRecipients)
          addressesString = aMsgHdr.recipients + "," + aMsgHdr.ccList;
      headerParser.parseHeadersWithArray(addressesString, addresses, {}, {});
      let address = addresses.value[0];

      let matches = false;

      if (dir.isMailList) {
          // unfortunately cardForEmailAddress doesn't work as expected for mailing lists
          let cards = dir.childCards;
          while (cards.hasMoreElements())
          {
              let card = cards.getNext().QueryInterface(Ci.nsIAbCard);
              if (card.hasEmailAddress(address)) {
                  matches = true;
                  break;
              }
          }
      } else {
          matches = (dir.cardForEmailAddress(address) !== null);
      }

      if (aSearchOp == IsInAB)
          return matches;
      else
          return !matches;
    };

    self.mailingList_getEnabled = self.mailingList_getAvailable = function (scope, op)
    {
        return _isLocalSearch(scope);
    };

    self.mailingList_getAvailableOperators = function (scope, length)
    {
        if (!_isLocalSearch(scope))
        {
          length.value = 0;
          return [];
        }
        length.value = 2;
        return [IsInAB, IsntInAB];
    };

    // search in mailing list by author
    self.mailingList = 
    {
      id: "mailing-list-filter@peci1.cz#mailingList",
      name: self.strings.getString("mailing-list-filter.term.name"),
      getEnabled: self.mailingList_getEnabled,
      needsBody: false,
      getAvailable: self.mailingList_getAvailable,
      getAvailableOperators: self.mailingList_getAvailableOperators,
      match: function(aMsgHdr, aSearchValue, aSearchOp)
      {
          return self.match(aMsgHdr, aSearchValue, aSearchOp, false);
      }
    };

    // search in mailing list by recipients
    self.mailingListRecipients = 
    {
      id: "mailing-list-filter@peci1.cz#mailingListRecipients",
      name: self.strings.getString("mailing-list-filter.termRecipients.name"),
      getEnabled: self.mailingList_getEnabled,
      needsBody: false,
      getAvailable: self.mailingList_getAvailable,
      getAvailableOperators: self.mailingList_getAvailableOperators,
      match: function(aMsgHdr, aSearchValue, aSearchOp)
      {
          return self.match(aMsgHdr, aSearchValue, aSearchOp, true);
      }
    };
  };

  // extension initialization

  self.onLoad = function() {
    if (self.initialized)
      return;
    self._init();

    var filterService = Cc["@mozilla.org/messenger/services/filters;1"]
                        .getService(Ci.nsIMsgFilterService);

    filterService.addCustomTerm(self.mailingList);
    filterService.addCustomTerm(self.mailingListRecipients);

    self.initialized = true;
  };

  // is this search scope local, and therefore valid for db-based terms?
  function _isLocalSearch(aSearchScope)
  {
    switch (aSearchScope) {
      case Ci.nsMsgSearchScope.offlineMail:
      case Ci.nsMsgSearchScope.offlineMailFilter:
      case Ci.nsMsgSearchScope.onlineMailFilter:
      case Ci.nsMsgSearchScope.localNews:
        return true;
      default:
        return false;
    }
  }
})();

window.addEventListener("load", function(e) { mailingListFilter.onLoad(e); }, false);
