/*
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Created on September 4th, 2012 by Uri Hartmann
 * http://uri2x.wordpress.com
 *
 * "All in all it's like the bird who's trapped alone inside the cage"
 *                           (Magpies on Fire / Red Hot Chili Peppers)
 *
 * =============================================================================
 *
 * To-do (contributions will be appreciated!):
 *
 * - Don't check URLs when the message is automatically saved as draft
 * - When an invalid link is found - focus/select it
 * - On-the-fly validation (similar to spell checking)
 * - Toolbar button for links scanning.
 *
 */

Components.utils.import("resource://gre/modules/Services.jsm");

var hyperactiveController =
{
  observe: function (aSubject, aTopic, aData)
  {
    // Observed a "mail:composeOnSend" topic
    aSubject.addEventListener("compose-send-message", hyperactiveController.onComposeSendMessage, true);
  },

  onComposeSendMessage: function(event)
  {
    this.removeEventListener("compose-send-message", arguments.callee, true);

    var msgcomposeWindow = this.document.getElementById("msgcomposeWindow");

    var mailBody = this.GetCurrentEditor().outputToString("text/plain", "");

    if (mailBody)
    {
      // Remove quoted lines
      var re = /[\r\n]?\s*>.*[\r\n]/g;
      mailBody = mailBody.replace(re, " ");

      // Extract URLs from mail body
      re = /(\b(https?|ftp):\/\/[-A-Z0-9+&@\/%?=~_|!:,.;]*[-A-Z0-9+&@\/%=~_|])/ig;
      var urls = mailBody.match(re);

      if (urls.length)
      {
        // Check if we're saving the message or sending it (to adjust the captions)
        var msgType = msgcomposeWindow.getAttribute("msgtype");
        var mcdm = Components.interfaces.nsIMsgCompDeliverMode;
        var msgTypeSave = (msgType == mcdm.Save) || (msgType == mcdm.SaveAs) ||
          (msgType == mcdm.SaveAsDraft) || (msgType == mcdm.SaveAsTemplate) ||
          (msgType == mcdm.AutoSaveAsDraft);

        var result = {urls: urls, abort:true, isSave: msgTypeSave};
        this.openDialog("chrome://hyperactive/content/progressDialog.xul",
          "hyperactiveProressDialog", "chrome,modal,centerscreen", result);
        if (result.abort)
          event.preventDefault();
      }
    }
  }
}

function startup(data, reason) {
  // For gecko < 10.0
  if (Services.vc.compare(Services.appinfo.platformVersion, "10.0") < 0)
    Components.manager.addBootstrappedManifestLocation(data.installPath);

  var observerService = Components.classes['@mozilla.org/observer-service;1'].
    getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(hyperactiveController, "mail:composeOnSend", false);
}

function shutdown(data, reason) {

  var observerService = Components.classes['@mozilla.org/observer-service;1'].
    getService(Components.interfaces.nsIObserverService);
  observerService.removeObserver(hyperactiveController, "mail:composeOnSend");

  // For gecko < 10.0
  if (Services.vc.compare(Services.appinfo.platformVersion, "10.0") < 0)
    Components.manager.removeBootstrappedManifestLocation(data.installPath);
}

function install(data, reason) { }
function uninstall(data, reason) { }
