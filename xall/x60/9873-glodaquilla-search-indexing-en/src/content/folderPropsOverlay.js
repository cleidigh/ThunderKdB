/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of the application GlodaQuilla by Mesquilla.
 *
 * This application is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * You should have received a copy of the GNU General Public License
 * along with this application.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mesquilla code.
 *
 * The Initial Developer of the Original Code is
 * Kent James <rkent@mesquilla.com>
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
 */

 // folder properties overlay. Unfortunately there are not adequate ids in the
 // filter properties xul to make a normal overlay possible, so instead we have
 // to add our xul dynamically.

 
(function()
{
  // global scope variables
  this.glodaquillaFolderProps = {};

  // local shorthand for the global reference
  let self = this.glodaquillaFolderProps;

  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  
  // module-level variables
  Cu.import("resource://glodaquilla/inheritedPropertiesGrid.jsm");

  let folder; // nsIMsgFolder passed to the window

  self.onLoad = function onLoad(e)
  {
    // We won't add anything if glodaquilla properties are disabled
    let prefs = Cc["@mozilla.org/preferences-service;1"]
                  .getService(Ci.nsIPrefBranch);
    let enableInheritedProps = true;
    try {
      enableInheritedProps = prefs.getBoolPref("extensions.glodaquilla.enableInheritedProps");
    } catch (e) {}

    if (!enableInheritedProps)
      return;

    // Hide TB 3.1's indexing priority option
    let standardItem = document.getElementById('folderIncludeInGlobalSearch');
    if (standardItem)
      standardItem.setAttribute("hidden", "true");
    // Setup UI for the "glodaDoIndex" inherited property, but only for
    //  imap or local folders (which includes rss).
    folder = window.arguments[0].folder;
    if (!(folder instanceof Ci.nsIMsgLocalMailFolder) &&
        !(folder instanceof Ci.nsIMsgImapMailFolder))
      return;

    window.gInheritTarget = folder;

    // create or get the rows from the inherit grid
    let rows = InheritedPropertiesGrid.getInheritRows(document);
    let row = InheritedPropertiesGrid.createInheritRow("glodaDoIndex", folder, document);
    if (row)  // false means another extension is handling this, so quit
    {
      rows.appendChild(row);
      // extend the ondialogaccept attribute
      let dialog = document.getElementsByTagName("dialog")[0];
      dialog.setAttribute("ondialogaccept", "glodaquillaFolderProps.onAcceptInherit();" + 
                          dialog.getAttribute("ondialogaccept"));
    }
  };

  self.onAcceptInherit = function glodaDoIndexOnAcceptInherit()
  {
    try {
    let oldValue = folder.getStringProperty("glodaDoIndex");
    if (!oldValue)
      oldValue = "";
    InheritedPropertiesGrid.onAcceptInherit("glodaDoIndex", folder, document);
    let glodaDoIndex = folder.getStringProperty("glodaDoIndex");
    if (!glodaDoIndex)
      glodaDoIndex = "";

    // We need to propagate the glodaquilla values back to the core values,
    //  to keep them approximately in sync.
    if (glodaDoIndex == oldValue)
      return;

    Cu.import("resource:///modules/gloda/datastore.js");
    Cu.import("resource:///modules/gloda/datamodel.js");
    Cu.import("resource:///modules/gloda/gloda.js");

     // there is nothing to sync on TB 3.0
    if (typeof GlodaDatastore.getDefaultIndexingPriority == "undefined")
      return;

    const kIndexingDefaultPriority = GlodaFolder.prototype.kIndexingDefaultPriority;
    const kIndexingNeverPriority = GlodaFolder.prototype.kIndexingNeverPriority;
    const kNone = -2;
    const kUnchanged = -3;

    let glodaFolder  = GlodaDatastore._mapFolder(folder);
    indexingPriority = glodaFolder._indexingPriority;
    let defaultFolderPriority =
        GlodaDatastore.getDefaultIndexingPriority(folder);
    let changedIndexingPriority = kUnchanged;
    /*
    dump('glodaDoIndex: <' + glodaDoIndex +
         '>  indexingPriority: <' + indexingPriority +
         '>  defaultFolderPriority: <' + defaultFolderPriority +
         '>\n');
    */

    // Propagate glodaquilla property to core
    if (glodaDoIndex == "false")
      changedIndexingPriority = kIndexingNeverPriority;
    else if (glodaDoIndex == "")
      changedIndexingPriority = defaultFolderPriority;

    // If glodaDoIndex is Yes but don't inherit, then we want to remove any
    //  inhibiting from the core property.
    if (glodaDoIndex == "true")
    {
      if (defaultFolderPriority != kIndexingNeverPriority)
        changedIndexingPriority = defaultFolderPriority;
      else
        changedIndexingPriority = kIndexingDefaultPriority;
    }

    if (changedIndexingPriority != kUnchanged
        // && changedIndexingPriority != indexingPriority
       )
    {
      Gloda.setFolderIndexingPriority(folder, changedIndexingPriority);
      glodaFolder._indexingPriority = changedIndexingPriority;
    }  
  } catch (e) {Cu.reportError(e);};
  }


})();

window.addEventListener("load", function(e) { glodaquillaFolderProps.onLoad(e); }, false);
