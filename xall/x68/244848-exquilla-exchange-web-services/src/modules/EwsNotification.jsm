/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2017 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

// This module manages streaming notifications.
var EXPORTED_SYMBOLS = ["EwsNotification"];

var Cu = Components.utils;

// Ews-related address book methods.

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");
ChromeUtils.defineModuleGetter(this, "PromiseUtils",
                               "resource://exquilla/PromiseUtils.jsm");
ChromeUtils.defineModuleGetter(this, "EwsSoapRequest",
                               "resource://exquilla/EwsSoapRequest.jsm");

var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("base");
  return _log;
});

function EwsNotification(aEwsIncomingServer) {
  this._skinkServer = aEwsIncomingServer;
  this._subscriptionId = "";
  this._active = false;
  this._request = null; // active request needing aborting on shutdown

  // The observer service owns this notification.
  Services.obs.addObserver(this, "profile-change-net-teardown", false);
  Services.obs.addObserver(this, "network:offline-status-changed", false);
  log.info("Starting EwsNotification");
}

EwsNotification.prototype = {
  async startNotifications() {
    let ewsServer = safeGetJS(this._skinkServer);
    try {
      this._active = true;
      while (this._active && !Services.io.offline) {
        let checkAll = this._skinkServer.getBoolValue("check_all_folders_for_new");
        log.config("startNotifications for server " + this._skinkServer.serverURI + " checkAll is " + checkAll);
        let folders = [];
        if (!checkAll) {
          // add the inbox
          let skinkInbox = this._skinkServer.rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Inbox);
          let ewsInbox = safeGetJS(skinkInbox);
          let nativeInbox = ewsInbox.nativeMailbox.getNativeFolderFromCache(ewsInbox.folderId);
          if (nativeInbox)
            folders.push(nativeInbox);
          else {
            // Hmmm, no inbox, what do do? Let's just check all
            checkAll = true;
          }
        }
        {
          let response = new PromiseUtils.SoapResponse();
          let request = new EwsSoapRequest();
          request.mailbox = ewsServer.nativeMailbox;
          request.subscribeNotifications(response, folders, checkAll);
          request.invoke();
          this._request = request;
          log.debug("Waiting for subscribe");
          let result = await response.promise;
          log.debug("Done waiting for subscribe");
          this._request = null;

          if (result.status != Cr.NS_OK) {
            log.warn("Could not setup notification subscription for " + this._skinkServer.serverURI);
            this._subscriptionId = "";
            throw CE("Notification Setup Failed");
          }
          else {
            this._subscriptionId = result.request.result.getAString("SubscriptionId");
            log.config("started subscription with ID " + this._subscriptionId);
          }
        }

        // now start responding to notifications. This is an infinite loop that continues
        // until an abort is received at shutdown.
        {
          let done = false;
          while (!done && this._subscriptionId && this._active) {
            try {
              let response = new PromiseUtils.SoapResponse(this);
              let request = new EwsSoapRequest();
              request.mailbox = ewsServer.nativeMailbox;
              let REFRESH_INTERVAL_MINUTES = 30;
              request.getNotifications(response, this._subscriptionId, REFRESH_INTERVAL_MINUTES);
              request.invoke();
              this._request = request;
              log.debug("Starting listening for notification events");
              let result = await response.promise;
              log.debug("Done listening for notification events");
              if (result.status == Cr.NS_ERROR_ABORT) {
                log.config("Aborting ews notifications");
                done = true;
              }
              else if (result.status != Cr.NS_OK && result.status != Cr.NS_ERROR_NET_TIMEOUT) {
                // unsubscribe and try again
                if (this._subscriptionId) {
                  let response = new PromiseUtils.SoapResponse();
                  let request = new EwsSoapRequest();
                  request.mailbox = ewsServer.nativeMailbox;
                  request.unsubscribeNotifications(response, this._subscriptionId);
                  request.invoke();
                  this._subscriptionId = null;
                  log.debug("Starting unsubscribe");
                  await response.promise;
                  log.debug("Done with unsubscribe");
                }
              }
              this._request = null;
            } catch (ex) {
              log.warn("Error return while getting notifications");
              done = true;
            }
          } // while !done
        }
        if (this._active)
          log.debug("Restarting notifications");
        else
          log.debug("Exiting notifications");
      } // while (this._active)
    } catch (ex) {
      log.debug("Exiting EwsNotification.startNotification with failure");
      this._active = false;
      return;
    }
    log.debug("Exiting EwsNotification.startNotification with success");
    this._active = false;
  },

  stopNotifications() {
    throw CE("stopNotifications not implemented");
  },

  onEvent(aItem, aEvent, aData, aResult) {
    log.debug("EwsNotification event " + aEvent + " aResult " + aResult + " for server " + this._skinkServer.serverURI);
    if (aEvent == "SoapNotify") {
      if (aResult != Cr.NS_OK) {
        // error in notification
        this.cancel();
        return;
      }
      // update the changed folder
      let skinkFolder = aData && aData.folderURI ? getExistingFolder(aData.folderURI) : null;
      if (skinkFolder) {
        log.debug("Need to update skink folder " + skinkFolder.name);
        skinkFolder.updateFolder(null);
      } else {
        log.debug("SoapNotify folder not found");
      }
    }
  },

  observe(subject, topic, data) {
    if (topic == "profile-change-net-teardown") {
      Services.obs.removeObserver(this, "network:offline-status-changed");
      Services.obs.removeObserver(this, "profile-change-net-teardown");
      log.debug("Quitting EwsNotification at application quit");
      this._active = false;
      this.cancel();
    }
    else if (topic == "network:offline-status-changed") {
      if (Services.io.offline) {
        log.debug("Quitting EwsNotifications since going offline");
        this._active = false;
        this.cancel();
      } else {
        log.debug("restarting EwsNotifications while going online");
        this.startNotifications();
      }
    }
  },

  cancel() {
    if (this._request) {
      log.debug("Aborting existing xhr for ews notifications");
      this._request.soapResponse.xhr.abort();
    }
  },
}
