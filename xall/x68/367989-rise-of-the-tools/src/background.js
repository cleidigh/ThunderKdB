// Note: we don't catch Promise errors in this file, as the best curse of action
// would be logging them and they are already logged by default.

// Called for each window present while starting up, and any window opened
// afterwards
const windowRegistrationListener = function(windowInfo) {
  if (windowInfo.id && windowInfo.type === "normal") {
    messenger.ex_raisetoolbar.raiseMainToolbar(windowInfo.id);
  }
}
messenger.windows.onCreated.addListener(windowRegistrationListener);
messenger.windows.getAll().then(windowInfos => {
  for (let windowInfo of windowInfos) {
    windowRegistrationListener(windowInfo);
  }
});
