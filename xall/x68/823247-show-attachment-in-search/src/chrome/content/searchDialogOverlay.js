 /* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 * Copyright: opto (Klaus)
 * */



//Components.utils.import("resource:///modules/MailUtils.js");
//Components.utils.import("resource://gre/modules/PluralForm.jsm");
//Components.utils.import("resource://gre/modules/Services.jsm");
//Components.utils.import("resource:///content/SearchDialog.js");



/* import-globals-from folderDisplay.js */



var gCurrentFolder;

var gFolderDisplay;

var gMessageDisplay;


//var dlog = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);


function show_attachment_column ()
{

//      dlog.logStringMessage("attachment");
//alert("test2");
searchOnLoad();
// gMessageDisplay = new MessageDisplayWidget();
 
//alert("test2a");
  gFolderDisplay.setColumnStates({
    subjectCol: { visible: true },
    correspondentCol: { visible: true },
    dateCol: { visible: true },
    locationCol: { visible: true },
    attachmentCol:   { visible: true , ordinal: 1},
  });
//alert("test3");
}