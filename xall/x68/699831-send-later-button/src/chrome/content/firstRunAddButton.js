/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var SendLaterButton = {

  prefs: Services.prefs,
  vc: Services.vc,
  
  onload: function SendLaterButton_onload() {
    window.removeEventListener('load', onload, false);

    var firstRun = SendLaterButton.prefs.getBoolPref('extensions.sendlaterbutton@thunderbird-mail.de.firstRun');
    if (firstRun) {
      var myId = "SLB_send_later_button"; // ID of button to add
      var afterId = "button-send";    // ID of element to insert after
      var toolBar = document.getElementById('composeToolbar2') || document.getElementById('composeToolbar');
      if(toolBar!=null){
        var curSet  = toolBar.currentSet.split(",");
        if (curSet.indexOf(myId) == -1) {
          var pos = curSet.indexOf(afterId) + 1 || curSet.length;
          var set = curSet.slice(0, pos).concat(myId).concat(curSet.slice(pos));
          toolBar.setAttribute("currentset", set.join(","));
          toolBar.currentSet = set.join(",");
          document.persist(toolBar.id, "currentset");
        }
        SendLaterButton.prefs.setBoolPref('extensions.sendlaterbutton@thunderbird-mail.de.firstRun', false);
      }
    }
  }
}

window.addEventListener('load', SendLaterButton.onload, false);