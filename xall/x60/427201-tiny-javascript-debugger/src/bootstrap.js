/*global Components: false */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";


const Cu = Components.utils;

/* global APP_STARTUP: false, APP_SHUTDOWN: false */

function install() {}

function uninstall() {}

function startup(data, reason) {
  const {
    TinyjsdFactory
  } = Cu.import("chrome://tinyJsd/content/modules/tinyjsdFactory.jsm", {});
  const {
    TinyjsdOverlays
  } = Cu.import("chrome://tinyJsd/content/modules/tinyjsd-overlays.jsm", {});

  TinyjsdFactory.startup(reason, data);
  TinyjsdOverlays.startup(reason, data);

  // to communicate with WebExtension API:
  // data.webExtension.startup().then(api => {
  // });
}

function shutdown(data, reason) {
  if (reason === APP_SHUTDOWN) return;

  const {
    TinyjsdFactory
  } = Cu.import("chrome://tinyJsd/content/modules/tinyjsdFactory.jsm", {});
  const {
    TinyjsdOverlays
  } = Cu.import("chrome://tinyJsd/content/modules/tinyjsd-overlays.jsm", {});

  TinyjsdFactory.shutdown(reason, data);
  TinyjsdOverlays.shutdown(reason, data);

  Cu.unload("chrome://tinyJsd/content/modules/tinyjsd-overlays.jsm");
  Cu.unload("chrome://tinyJsd/content/modules/tinyjsdCommon.jsm");
  Cu.unload("chrome://tinyJsd/content/modules/tinyjsdFactory.jsm");
}
