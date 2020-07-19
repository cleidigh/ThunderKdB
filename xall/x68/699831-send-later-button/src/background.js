function clickAction() {
  browser.myapi.sendLater();
}
browser.composeAction.onClicked.addListener(clickAction);

// only for reference:
// - At the moment it's not possible to observe 
//   the main send action button to enable/disable this 
//   add-ons button according to the main send button
// - If it would be possible to observe, the enable /
//   disable action could be done with the following
//   functions:
//   browser.composeAction.enable();
//   browser.composeAction.disable();
