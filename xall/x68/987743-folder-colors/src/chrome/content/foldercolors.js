/**
 * Color Folders v1.0
 * Color Folders v1.1
 *   Modified to follow the API change in Gecko 22 and onwards
 *   (NB: TB replaced Gecko 17 with "24" at TB 24)
 *   thanks so much to Strim for providing thie modification.
 * Copyright(c) 2011-2013 fisheater
 * Released under Mozilla Public License, version 2.0
 *
 * Corrected, resurrected, restaurated, extended and republished by
 * Lab5 ( www.lab5.ch ), anno 2019
 * as: Colored Folders v1.2
 *
 * Forked by Brooks Kline to support TB 68+, as:
 * Folder Colors v1.0.0
 * Folder Colors v1.0.1
 *
 */


// define main object and methods

let fCMain = {

  init: function() {

    window.removeEventListener("load", fCMain.init, false);

    // START: override getCellProperties()

    gFolderTreeView.originalGetCellProperties = gFolderTreeView.getCellProperties;

    gFolderTreeView.getCellProperties = function(row, col) {

      let props = gFolderTreeView.originalGetCellProperties(row, col);

      if (col.id == "folderNameCol") {

        let folder = gFolderTreeView.getFolderForIndex(row);
        //let folderColor;
        //if ( folderColor = folder.getStringProperty("folderColor") ) {
        let folderColor = folder.getStringProperty("folderColor");

        if (folderColor) {

          /* DEPRECATED
          // color name conversion from v0.9 convention to keep compatibility with existing folders
          var compatibility = fCMain.compatibility[folderColor];
          if (compatibility) {
            folderColor = compatibility;
          }
          */

          // save folder color

          props += " " + folderColor;

        }

      }

      return props;

    }

    // END: override getCellProperties()


    // addEventListener for onPopupShowing for folderPaneContext

    let elm = document.getElementById("folderPaneContext");
    elm.addEventListener("popupshowing", fCMain.onPopupShowing, false);

    // addEventListener for onCommand for folderColorPopup

    elm = document.getElementById("folderColorPopup");
    elm.addEventListener("command", fCMain.setFolderColor, false);

    // addEventListener for onSelect for folderColorPicker (capture = true)

    elm = document.getElementById("folderColorPicker");
    elm.addEventListener("select", fCMain.setFolderColor, true);

  }, // END init()


  // event listener for popup menu

  setFolderColor: function(event) {

    let id = event.target.id;
    let folderColor;

    if (id == "folderColorPicker") {

      // TODO: revisit/fix this:
      folderColor = document.getElementById("folderColorPicker").color;
      folderColor = "folderColor" + folderColor.substring( 1, 7 );

    } else if (id != "folderColorPopup") {

      folderColor = event.target.value;

      if (folderColor == "folderColorDefault") {

        folderColor = "";

      }

    }

    // apply for all selected folders

    let folders = gFolderTreeView.getSelectedFolders();

    for (let fndx in folders) {

      let folder = folders[fndx];
      folder.setStringProperty("folderColor", folderColor);

    }

    // close popup; necessary as selecting colorpicker does not close popup
    // must be here otherwise 'selectedFolders' are lost and gets back to
    // previous selection

    document.getElementById("folderPaneContext").hidePopup();

    // force redraw the folder pane

    let box = document.getElementById("folderTree").boxObject;
    box.QueryInterface(Components.interfaces.nsITreeBoxObject);
    box.invalidate();

  }, // END setFolderColor()


  // event listener for popup showing

  onPopupShowing: function(event) {

    if (event.target.id == "folderPaneContext") {

      const specialFolderFlagsMask = nsMsgFolderFlags.Inbox | nsMsgFolderFlags.Drafts
        | nsMsgFolderFlags.SentMail | nsMsgFolderFlags.Trash | nsMsgFolderFlags.Templates
        | nsMsgFolderFlags.Archive | nsMsgFolderFlags.Junk | nsMsgFolderFlags.Queue;

      let folders = gFolderTreeView.getSelectedFolders();
      let type = "";


      // examine folder type(s)

      for  (let fndx in folders) {

        let folder = folders[fndx];

        // disable menu "folderPaneContext-colorFolders" if any of the folders
        // are special

        if ( folder.isServer || folder.flags & specialFolderFlagsMask ) {

          type = "special";
          break;

        } else if ( folder.flags & nsMsgFolderFlags.Virtual ) {

          // standard folder icons in popup if not all types are the same

          if (type == "") {

            type = "virtual";

          } else if (type != "virtual") {

            type = "normal";
            break;

          }

        } else if ( folder.server.type == "nntp" || folder.server.type == "rss" ) {

          // standard folder icons in popup if not all types are the same

          if (type == "") {

            type = folder.server.type;

          } else if (type != folder.server.type) {

            type = "normal";
            break;

          }

        } else {

          type = "normal";

        }

      }


      let aMenu = document.getElementById("folderPaneContext-colorFolders");

      if ( type == "special" ) {

        // disabling menu "folderPaneContext-colorFolders" if any one of
        // folders is special

        aMenu.disabled = true;

      } else {

        aMenu.disabled = false;

        let aPopup = document.getElementById("folderColorPopup");

        if (type == "virtual" ) {

          // virtual folder icons in popup if all folders are virtual

          aPopup.setAttribute("class", "folderColorVirtual", "");

        } else if (type == "rss" ) {

          // rss folder icons in popup if all folders are rss

          aPopup.setAttribute("class", "folderColorRss", "");

        } else if (type == "nntp" ) {

          // nntp folder icons in popup if all folders are nntp

          aPopup.setAttribute("class", "folderColorNntp", "");

        } else {

          // standard folder icons in popup if any one of folders is normal

          aPopup.setAttribute("class", "folderColorDefault", "");

        }

        // set "More Colors..." menu and icon

        let folderColor = document.getElementById("folderColorPicker").color;

        folderColor = "folderColor" + folderColor.substring(1, 7);
        aPopup = document.getElementById("folderColorMoreColors");
        aPopup.setAttribute("class", "menu-iconic " + folderColor, "")

      }

    }

  } // END onPopupShowing()


  /* DEPRECATED
  compatibility: {
    folderColorG0:          "folderColorCCCCCC",
    folderColorG1:          "folderColorFFFFFF",
    folderColorG2:          "folderColor333333",
    folderColorRed:         "folderColorCC0000",
    folderColorYellow:      "folderColorFF9900",
    folderColorYellowGreen: "folderColor33CC00",
    folderColorGreen:       "folderColor009900",
    folderColorCyan:        "folderColor00CCCC",
    folderColorBlue:        "folderColor000099",
    folderColorViolet:      "folderColor6633FF",
    folderColorMagenta:     "folderColorCC33CC"
  }
  */

};


// add listener to main window

window.addEventListener("load", fCMain.init, false);
