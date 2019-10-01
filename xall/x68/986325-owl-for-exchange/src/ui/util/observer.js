/**
 * Registers a callback for notifyGlobalObservers.
 *
 * @param aMsg      {String}                   The custom event type
 * @param aObserver {Function(aEvent {Event})} The callback
 */
function registerGlobalObserver(aMsg, aObserver) {
  let page = browser.extension.getBackgroundPage();
  page.addEventListener(aMsg, aObserver);
}

/**
 * Unregisters a callback for notifyGlobalObservers.
 *
 * @param aMsg      {String}                   The custom event type
 * @param aObserver {Function(aEvent {Event})} The callback
 */
function unregisterGlobalObserver(aMsg, aObserver) {
  let page = browser.extension.getBackgroundPage();
  page.removeEventListener(aMsg, aObserver);
}

/**
 * Notifies all callbacks registered with registerGlobalObserver.
 *
 * @param aMsg    {String} The custom event type
 * @param aDetail {Any}    Arbtirary event-specific data
 *
 * The data will be passed as `event.detail` in the callback.
 * The message will be passed as `event.type` in the callback.
 */
function notifyGlobalObservers(aMsg, aDetail) {
  let evt = new CustomEvent(aMsg, { detail: aDetail });
  let page = browser.extension.getBackgroundPage();
  page.dispatchEvent(evt);
}
