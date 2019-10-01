Components.utils.import('resource://gre/modules/Services.jsm');

const PREF_BRANCH_PREFIX = 'extensions.layoutswitcher.';
const PREF_THRESHOLD = PREF_BRANCH_PREFIX + 'threshold';
const PREF_UI = 'mail.pane_config.dynamic';
const WINDOW_TYPE = 'mail:3pane';
const WINDOW_URI = 'chrome://messenger/content/messenger.xul';

let threshold;
let originalPrefValue;

function install(aParams, aReason) {
}
function uninstall(aParams, aReason) {
}
function startup(aParams, aReason) {
  originalPrefValue = Services.prefs.getIntPref(PREF_UI);

  let defaultPrefs = Services.prefs.getDefaultBranch(null);
  defaultPrefs.setIntPref(PREF_THRESHOLD, 1300);
  threshold = Services.prefs.getIntPref(PREF_THRESHOLD);
  Services.prefs.addObserver(PREF_BRANCH_PREFIX, prefObserver, false);

  windowController.enumerate(windowController.paint);
  Services.ww.registerNotification(windowController);
}
function shutdown(aParams, aReason) {
  if (aReason == APP_SHUTDOWN) {
    return;
  }

  windowController.enumerate(windowController.reallyUnpaint);
  Services.ww.unregisterNotification(windowController);

  Services.prefs.removeObserver(PREF_BRANCH_PREFIX, prefObserver);
  Services.prefs.setIntPref(PREF_UI, originalPrefValue);
}

let prefObserver = {
  observe: function(aSubject, aTopic, aData) {
    if (aData == PREF_THRESHOLD) {
      threshold = Services.prefs.getIntPref(PREF_THRESHOLD);
      windowController.enumerate(windowController.paint);
    }
  }
};

let windowController = {
  enumerate: function(aCallback) {
    let enumerator = Services.wm.getEnumerator(WINDOW_TYPE);
    while (enumerator.hasMoreElements()) {
      aCallback(enumerator.getNext());
    }
  },
  paint: function(aWindow) {
    if (aWindow.location == WINDOW_URI) {
      if (!('LayoutSwitcher' in aWindow)) {
        aWindow.LayoutSwitcher = {};
        aWindow.LayoutSwitcher.hsc = windowController.handleStateChange;
      }
      if ('mql' in aWindow.LayoutSwitcher) {
        aWindow.LayoutSwitcher.mql.removeListener(aWindow.LayoutSwitcher.hsc);
      }
      aWindow.LayoutSwitcher.mql = aWindow.matchMedia('(min-width: ' + threshold + 'px)');
      aWindow.LayoutSwitcher.mql.addListener(aWindow.LayoutSwitcher.hsc);
      aWindow.LayoutSwitcher.hsc(aWindow.LayoutSwitcher.mql);
    }
  },
  unpaint: function(aWindow) {
    if (aWindow.location == WINDOW_URI && 'LayoutSwitcher' in aWindow) {
      aWindow.LayoutSwitcher.mql.removeListener(aWindow.LayoutSwitcher.hsc);
    }
  },
  reallyUnpaint: function(aWindow) {
    windowController.unpaint(aWindow);
    delete aWindow.LayoutSwitcher;
  },
  observe: function(aSubject, aTopic, aData) {
    aSubject.addEventListener('load', function() {
      windowController.paint(aSubject);
    }, false);
  },
  handleStateChange: function(mql) {
    Services.prefs.setIntPref(PREF_UI, mql.matches ? 2 : 0);
  }
};
