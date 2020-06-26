// Note: we don't catch Promise errors in this file, as the best curse of action
// would be logging them and they are already logged by default.

let mainWindows = []; // window ids of currently open main windows

// Called whenever a main window is attempting to close, instead of actually
// closing.
const windowClosingCallback = function(windowId) {
  let index = mainWindows.indexOf(windowId);
  if (index >= 0) {
    if (mainWindows.length <= 1) {
      // Attempt to close the last window; minimize it.
      messenger.windows.update(windowId, {
        "state": "minimized"
      });
      return;
    } else {
      // Permit closing non-last main windows.
      mainWindows.splice(index, 1);
    }
  }
  // Permit closing. As we locked the window, we need to unlock it first.
  messenger.ex_windows.unlockWindow(windowId).then(
    () => messenger.windows.remove(windowId)
  );
};
messenger.ex_windows.onClosing.addListener(windowClosingCallback);

// Called for each window present while starting up, and any window opened
// afterwards
const windowRegistrationListener = function(windowInfo) {
  if (windowInfo.id && windowInfo.type === "normal") {
    mainWindows.push(windowInfo.id);
    messenger.ex_windows.lockWindow(windowInfo.id);
  }
}
messenger.windows.onCreated.addListener(windowRegistrationListener);
messenger.windows.getAll().then(windowInfos => {
  for (let windowInfo of windowInfos) {
    windowRegistrationListener(windowInfo);
  }
});
