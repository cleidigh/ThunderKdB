/*
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Created on September 4th, 2012 by Uri Hartmann
 * http://uri2x.wordpress.com
 *
 */

Components.utils.import("resource://gre/modules/Services.jsm");

var hyperactiveProgressDialog =
{
  showError: function()
  {
    var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
      getService(Components.interfaces.nsIPromptService);

    var aButtonFlags = (ps.BUTTON_POS_0*ps.BUTTON_TITLE_IS_STRING)+(ps.BUTTON_POS_1*ps.BUTTON_TITLE_CANCEL);

    if (ps.confirmEx(window, this.bundle.GetStringFromName("hyperactive"),
      this.bundle.GetStringFromName("warningInvalidLink")+"\n"+
        this.urls[this.urlsPosition]+"\n",
      aButtonFlags,
      document.documentElement.getButton("accept").label,
      "", "", null,
      {value: false}) == 0)
    {
      window.arguments[0].abort = false;
    }

    window.close();
  },

  // httpRequest.onreadystatechange
  onRequestReadyState: function()
  {
    if (this.readyState >= 3)
    {
      if (this.readyState == 3)
        this.isValid = true;

      // readyState == 3 / status 0 works well for FTP, and does not interfere with HTTP
      if ((this.status == 200) || (this.isValid))
      {
        // Link validated!
        this.dialog.testNextURL(1);
      } else
      {
        this.dialog.showError();
      }
    }
  },

  testNextURL: function (adv)
  {
    if (adv)
      this.urlsPosition++;

    if (this.urlsPosition >= this.urls.length)
    {
      // All links were tested - close the dialog
      window.arguments[0].abort = false;
      window.close();
    } else
    {
      var url = this.urls[this.urlsPosition];

      // Show only the first 60 characters of the URL
      document.getElementById("titleLabel").value = (url.length > 60 ? url.substring(0,60)+"..." : url);

      // Update progress bar
      document.getElementById("progressBar").value = 100*(this.urlsPosition/(this.urls.length));

      // Test for the hyperlink's validity
      this.httpRequest.isValid = false;
      this.httpRequest.open("HEAD", url, true);
      this.httpRequest.send();
    }
  },

  onLoad: function ()
  {
    this.bundle = Services.strings.createBundle("chrome://hyperactive/locale/hyperactive.properties");

    // Load text for the controls
    document.title = this.bundle.GetStringFromName("hyperactive");
    document.documentElement.getButton("accept").label = this.bundle.GetStringFromName((window.arguments[0].isSave ? "saveNow" : "sendNow"));

    this.urls = window.arguments[0].urls;
    this.urlsPosition = 0;

    this.httpRequest = new XMLHttpRequest();
    this.httpRequest.onreadystatechange = this.onRequestReadyState;
    this.httpRequest.dialog = this;

    this.testNextURL(false);
  },

  onCancel: function ()
  {
    window.close();
  },

  onSend: function ()
  {
    window.arguments[0].abort = false;
    window.close();
  }
}
