"use strict";
/* ***** BEGIN LICENSE BLOCK *****
* Version: MIT/X11 License
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*
* Contributor(s):
* Dmitry Gutov <dgutov@yandex.ru> (Original Author)
* Erik Vold <erikvvold@gmail.com>
*
* ***** END LICENSE BLOCK ***** */

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Speak Words.
 *
 * The Initial Developer of the Original Code is The Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Edward Lee <edilee@mozilla.com>
 *   Erik Vold <erikvvold@gmail.com>
 *   Michael Kraft <morac99-firefox2@yahoo.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

(function(global) {
  let positions = {};

  /*
   * Assigns position that will be used by `restorePosition`
   * if the button is not found on any toolbar's current set.
   * If `beforeID` is null, or no such item is found on the toolbar,
   * the button will be added to the end.
   * @param beforeID ID of the element before which the button will be inserted.
   */
  global.setDefaultPosition = function(buttonID, toolbarID, beforeID) {
    positions[buttonID] = [toolbarID, beforeID];
  };

  /*
   * Restores the button's saved position.
   * @param {XULDocument} doc XUL window document.
   * @param {XULElement} button button element.
   */
  global.restorePosition = function(doc, button) {
    function $(sel, all) {
      return doc[all ? "querySelectorAll" : "getElementById"](sel);
    }

    ($("navigator-toolbox") || $("mail-toolbox")).palette.appendChild(button);

    let toolbar, currentset, idx,
        toolbars = $("toolbar", true);
    for (let i = 0; i < toolbars.length; ++i) {
      let tb = toolbars[i];
      currentset = getCurrentset(tb),
      idx = currentset.indexOf(button.id);// jshint ignore:line
      if (idx != -1) {
        toolbar = tb;
        break;
      }
    }

    // saved position not found, using the default one, if any
    if (!toolbar && (button.id in positions)) {
      let [tbID, beforeID] = positions[button.id];
      toolbar = $(tbID);
      [currentset, idx] = persist(doc, toolbar, button.id, beforeID);
    }

    if (toolbar) {
      if (idx != -1) {
        // inserting the button before the first item in `currentset`
        // after `idx` that is present in the document
        for (let i = idx + 1; i < currentset.length; ++i) {
          let before = $(currentset[i]);
          if (before) {
            toolbar.insertItem(button.id, before);
            return;
          }
        }
      }
      toolbar.insertItem(button.id);
    }
  };

  function persist(document, toolbar, buttonID, beforeID) {
    let currentset = getCurrentset(toolbar),
        idx = (beforeID && currentset.indexOf(beforeID)) || -1;
    if (idx != -1) {
      currentset.splice(idx, 0, buttonID);
    } else {
      currentset.push(buttonID);
    }
    toolbar.setAttribute("currentset", currentset.join(","));
    document.persist(toolbar.id, "currentset");
    return [currentset, idx];
  }

  function getCurrentset(toolbar) {
    return (toolbar.getAttribute("currentset") ||
            toolbar.getAttribute("defaultset")).split(",");
  }
})(this);// jshint ignore:line


/**
 * Save callbacks to run when unloading. Optionally scope the callback to a
 * container, e.g., window. Provide a way to run all the callbacks.
 *
 * @usage unload(): Run all callbacks and release them.
 *
 * @usage unload(callback): Add a callback to run on unload.
 * @param [function] callback: 0-parameter function to call on unload.
 * @return [function]: A 0-parameter function that undoes adding the callback.
 *
 * @usage unload(callback, container) Add a scoped callback to run on unload.
 * @param [function] callback: 0-parameter function to call on unload.
 * @param [node] container: Remove the callback when this container unloads.
 * @return [function]: A 0-parameter function that undoes adding the callback.
 */
function unload(callback, container) {
  // Initialize the array of unloaders on the first usage
  let unloaders = unload.unloaders;
  if (!unloaders)
    unloaders = unload.unloaders = [];

  // Calling with no arguments runs all the unloader callbacks
  if (!callback) {
    //unloaders.slice().forEach((unloader) => unloader());
    unloaders.slice().forEach(function(unloader) {unloader();});
    unloaders.length = 0;
    return;
  }

  // The callback is bound to the lifetime of the container if we have one
  if (container) {
    // Remove the unloader when the container unloads
    container.addEventListener("unload", unloader, false);

    // Wrap the callback to additionally remove the unload listener
    let origCallback = callback;
    callback = function() {
      container.removeEventListener("unload", unloader, false);
      removeUnloader();
      origCallback();
    };
  }

  // Wrap the callback in a function that ignores failures
  function unloader() {
    try {
      callback();
    }
    catch(ex) {}
  }
  unloaders.push(unloader);

  // Provide a way to remove the unloader
  function removeUnloader() {
    let index = unloaders.indexOf(unloader);
    if (index !== -1)
      unloaders.splice(index, 1);
  }
  return removeUnloader;
}
