if (typeof contacttabs == "undefined") {
  var contacttabs = {};
};

/**
 * cota.TabMonitor manages the content of the cota search field similar to
 * Gloda search:
 * - if the user switches to a cota tab, the search field will contain the string
 *   used to find (and open) this contact.
 *
 * - So, if the user has two  cota tabs open, the search field will contain the
 *   search term for the current tab.
*
 * - If the user switches  switch to a completely different tab, say a folder tab,
 *   the search field is emptied.
 */
contacttabs.SearchFieldTabMonitor = function() {
  var self = this;
  var pub = {};

  pub.monitorName = 'cotaSearchFieldTabMonitor';

  pub.onTabTitleChanged = function(aTab) {}

  pub.onTabSwitched = function(aTab, aOldTab) {
    var cotaSearchInput = document.getElementById("cotaSearchInput");

    if(aTab.mode.name == 'cota-cardViewTab') {
      if(aTab._ext.cotaSearchFieldTabMonitor &&
         aTab._ext.cotaSearchFieldTabMonitor.searchValue) {
        cotaSearchInput.value = aTab._ext.cotaSearchFieldTabMonitor.searchValue;
      }
    }
    else {
      cotaSearchInput.value = '';
    }
  }

  pub.onTabOpened = function(aTab, aIsFirstTab, aWasCurrentTab) {
    if(aTab.mode.name == 'cota-cardViewTab') {
      var cotaSearchInput = document.getElementById("cotaSearchInput");

      aTab._ext.cotaSearchFieldTabMonitor = {};
      aTab._ext.cotaSearchFieldTabMonitor.searchValue = cotaSearchInput.value;
    }
  }

  pub.onTabClosing = function(aTab) {
  }

  pub.onTabPersist = function(aTab) {
    var ret = null

    if(aTab.mode.name == 'cota-cardViewTab') {
      if(aTab._ext.cotaSearchFieldTabMonitor &&
         aTab._ext.cotaSearchFieldTabMonitor.searchValue) {
        ret = {
          searchValue: aTab._ext.cotaSearchFieldTabMonitor.searchValue
        }
      }
    }

    return ret;
  }

  pub.onTabRestored = function(aTab, aState, aIsFirstTab) {
    if(aState) {
      aTab._ext.cotaSearchFieldTabMonitor = {};
      aTab._ext.cotaSearchFieldTabMonitor.searchValue = aState.searchValue;
    }
  }

  return pub;
}
