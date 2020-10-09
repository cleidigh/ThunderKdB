window.onload = function() {

//Localisation
  document.getElementById("prefsNonBCCLimit").textContent = browser.i18n.getMessage("prefsNonBCCLimit");
  document.getElementById("prefsStrictLimit").textContent = browser.i18n.getMessage("prefsStrictLimit"); 

// Retrieve the stored prefs
// Prefs are set up in background.js which always seems to run first
  var prefs = new Object() ;
  let gettingItem = browser.storage.local.get('prefs');
  gettingItem.then(onGot, onError);

  function onGot(item) {
      prefs = item['prefs'] ;

// Populate prefs on page
      var maxNonBCCParam = document.querySelector('#maxNonBCC');
      maxNonBCCParam.value = prefs['maxNonBCC'] ;

      var strictLimit = document.querySelector('#strictLimit');
      strictLimit.checked = prefs['strictLimit'] ;
    }

  function onError(error) {
    console.log("Limit non-BCC recipients: "+ error)
  }

// Listen for change to a pref
  const inputMaxNonBCC = document.getElementById('maxNonBCC');
  inputMaxNonBCC.addEventListener('change', updateValue);

  const inputStrictLimit = document.getElementById('strictLimit');
  inputStrictLimit.addEventListener('change', updateStrict);

// Update to max non-BCC number
  function updateValue(e) {
    prefs['maxNonBCC'] = e.srcElement.value;
    browser.storage.local.set({'prefs': prefs}, onCompletion ) ;
// Send new prefs to background
    browser.runtime.sendMessage(prefs).catch();
  }

// Update to strict limit checkbox
  function updateStrict(e) {
    prefs['strictLimit'] = e.srcElement.checked;
    browser.storage.local.set({'prefs': prefs}, onCompletion ) ;
// Send new prefs to background
    browser.runtime.sendMessage(prefs).catch();
  }

  function onCompletion() {                /* log error is there is one */
    if (chrome.runtime.lastError) {
      console.error("Limit non-BCC recipients: "+ chrome.runtime.lastError);
    }
  }

};
