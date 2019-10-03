/**
 * launchAccountWizard.js
 * Copyright (C) 2013 LEAP
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along
 */


Components.utils.import("resource:///modules/mailServices.js");


/*****************************************************************************
 * Wizard functions.
 ****************************************************************************/

/**
 * Launch the wizard to configure a new LEAP account.
 */
function launchAccountWizard()
{
  msgNewBitmaskMailAccount(MailServices.mailSession.topmostMsgWindow, null, null);
}

/**
 * Open the New Mail Account Wizard, or focus it if it's already open.
 *
 * @param msgWindow a msgWindow for us to use to verify the accounts.
 * @param okCallback an optional callback for us to call back to if
 *                   everything's okay.
 * @param extraData an optional param that allows us to pass data in and
 *                  out.  Used in the upcoming AccountProvisioner add-on.
 * @see msgOpenAccountWizard below for the previous implementation.
 */
function msgNewBitmaskMailAccount(msgWindow, okCallback, extraData)
{
  if (!msgWindow)
    throw new Error("msgNewBitmaskMailAccount must be given a msgWindow.");
  let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService()
                     .QueryInterface(Components.interfaces.nsIWindowMediator);
  let existingWindow = wm.getMostRecentWindow("mail:bitmaskautoconfig");
  if (existingWindow)
    existingWindow.focus();
  else
    // disabling modal for the time being, see 688273 REMOVEME
    window.openDialog("chrome://bitmask/content/accountWizard/accountWizard.xul",
                      "AccountSetup", "chrome,titlebar,centerscreen",
                      {msgWindow:msgWindow,
                       okCallback:function () { updatePanel(); },
                       extraData:extraData});

}

