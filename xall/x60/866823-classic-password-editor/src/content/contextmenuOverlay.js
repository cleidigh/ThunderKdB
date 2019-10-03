/*
    Classic Password Editor, extension for Gecko applications
    Copyright (C) 2017  Daniel Dawson <danielcdawson@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

var Cu = Components.utils;
Cu.import("resource://classicpasswordeditor/ClassicPasswordEditor.jsm");

window.messageManager.loadFrameScript(
  "chrome://classicpasswordeditor/content/frame-script.js", true);

addEventListener(
  "load",
  function _loadHandler () {
    const prefix = "classicpasswordeditor-";

    function showItem (aId) {
      document.getElementById(prefix + aId).hidden = false;
    }

    function hideItem (aId) {
      document.getElementById(prefix + aId).hidden = true;
    }

    var contextshowingHandler = {
      receiveMessage ({ data }) {
        ClassicPasswordEditor.updateLoginInfo(data);
        let idList = ["ctxmenuseparator",
                      "savelogininfo", "editlogininfo", "deletelogininfo"];
        idList.forEach(data ? showItem : hideItem);
      },
    };

    window.messageManager.addMessageListener(
      "ClassicPasswordEditor:contextshowing", contextshowingHandler);
    removeEventListener("load", _loadHandler, false);
  },
  false);
