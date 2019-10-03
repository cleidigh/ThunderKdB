/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

window.addEventListener('DOMContentLoaded', function setDefaultColumnsSetup(aEvent) {
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const { Services } = Cu.import('resource://gre/modules/Services.jsm', {});
  const Prefs = Services.prefs;
  function normalizeColumns(aColumns) {
    aColumns = aColumns.trim().split(/[,\s]+/);
    aColumns = aColumns.filter(function(aColumn) {
      return Boolean(aColumn);
    });
    return aColumns;
  }

  function visibleColumns() {
    var columns = decodeURIComponent(escape(Prefs.getCharPref('extensions.set-default-columns@clear-code.com.columns')));
    return normalizeColumns(columns);
  }

  function orderedColumns() {
    var columns = decodeURIComponent(escape(Prefs.getCharPref('extensions.set-default-columns@clear-code.com.order')));
    return normalizeColumns(columns);
  }

  FolderDisplayWidget.prototype.DEFAULT_COLUMNS = visibleColumns();

  FolderDisplayWidget.prototype.__original__getDefaultColumnsForCurrentFolder = FolderDisplayWidget.prototype._getDefaultColumnsForCurrentFolder;
  FolderDisplayWidget.prototype._getDefaultColumnsForCurrentFolder = function(...aArgs) {
    var defaultColumns = this.__original__getDefaultColumnsForCurrentFolder(...aArgs);
    var names = Object.keys(defaultColumns);
    if (!names.length) {
      return defaultColumns;
    }
    var numOfUnknownColumns = 0;
    var columns = orderedColumns();
    for (let name of names) {
      let index = columns.indexOf(name);
      if (index < 0) {
        index = columns.length + numOfUnknownColumns++;
      }
      defaultColumns[name].ordinal = index;
    }
    return defaultColumns;
  };

  window.removeEventListener(aEvent.type, setDefaultColumnsSetup, false);
}, false);
