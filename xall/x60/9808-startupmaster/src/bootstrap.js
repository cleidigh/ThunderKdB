function startup(data, reason) {
  Components.utils.import("chrome://startupmaster/content/startupmaster.jsm");
  startupmaster.core.setdefaults();
  if(reason == APP_STARTUP) {
    startupmaster.core.init();
  }
  startupmaster.ui.init();
  if(reason == ADDON_ENABLE || reason == ADDON_INSTALL) {
    startupmaster.inst.setupmp();
  }
}

function shutdown(data, reason) {
  Components.utils.import("chrome://startupmaster/content/startupmaster.jsm");
  startupmaster.ui.cleanup();
  if(reason == ADDON_DISABLE || reason == ADDON_UNINSTALL) {
    startupmaster.inst.removemp();
  }
  Components.utils.unload("chrome://startupmaster/content/startupmaster.jsm");
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

