window.onload = function() {

//Localisation
  document.getElementById("labelDomain").textContent = browser.i18n.getMessage("labelDomain");
  document.getElementById("theDescription").textContent = browser.i18n.getMessage("theDescription");
  document.getElementById("buttonsaveOption").value = browser.i18n.getMessage("buttonsaveOption");

// Retrieve the stored prefs
// Same code here and in background.js in case this runs first if addon page open

  console.log("Looking at local storage");
  var prefs = new Object() ;
  let gettingItem = browser.storage.local.get('prefs');
  gettingItem.then(onGot, onError);


  function onGot(item) {
    console.log("Found in local storage " + JSON.stringify(item));
    if (item['prefs']!=null) {
      prefs = item['prefs'];
      if (prefs['domain'] == undefined) {
        prefs['domain'] = "";
      }
    }
    else {
// Set up defaults if prefs absent
      prefs['domain'] = "" ;
    }
 // Populate prefs on page
      var domainExcludePlace = document.querySelector('#domain');
      domainExcludePlace.value = prefs['domain'] ;
  }

  function onError(error) {
    console.log("Domain to exclude: "+ error)
  }

// Listen for change to a pref
  const inputDomainExclude = document.getElementById('buttonsaveOption');
  inputDomainExclude.addEventListener('click', updateValue);

  function updateValue(e) {
    console.log("Tried saving " + document.querySelector("#domain").value);

    prefs['domain'] = document.querySelector("#domain").value;
    //console.log(JSON.stringify(prefs));
    browser.storage.local.set({'prefs': prefs}).then(null, onCompletion ) ;
  }

  function onCompletion() {                /* log error is there is one */
    if (chrome.runtime.lastError) {
      console.error("Domain to exclude: "+ chrome.runtime.lastError);
    }
  }
};
