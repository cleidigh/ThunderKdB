/**
 * Saves the Preferences in the Browser Storage
 * @param {Event} e 
 */
function saveOptions(e) {
  e.preventDefault();
  const browser = window.browser.extension.getBackgroundPage().browser;
  const form = document.getElementById('preferences');
  const pref_is_active = document.getElementById('pref_is_active').checked;
  // Speichern
  browser.storage.sync.set({
    pref_is_active: pref_is_active,
    pref_active_accounts: document.getElementById('pref_active_accounts').value,
    pref_worker_id: document.getElementById('pref_worker_id').value,
    pref_zeiterfassung_url: document.getElementById('pref_zeiterfassung_url').value
  }).then((result) => {
    if(typeof result === typeof undefined) {
      const success_msg = document.createElement("div");
      success_msg.classList.add('success_box');
      success_msg.innerHTML = 'Die Einstellungen wurden gespeichert.';
      success_msg.class = 'test';
      form.prepend(success_msg);
    }
  });
}

/**
 * 
 */
function restoreOptions() {
  var form = document.getElementById('preferences');
  var input_text = form.querySelectorAll('input[type="text"]');
  const browser = window.browser.extension.getBackgroundPage().browser;
  for (var input of input_text) {
    (function(input_id){
      browser.storage.sync.get(input_id).then(function(result) {
        if(result[input_id]) {
          document.getElementById(input_id).value = result[input_id];
        }
      }, (error) => {
        console.error(error);
      });
    }(input.id))
  
  }
  // Handle the checkbox
  browser.storage.sync.get('pref_is_active').then(function(result) {
    if(result.pref_is_active) {
      document.getElementById('pref_is_active').checked = true;
    }
  });
}

function fill_labels() {
  const browser = window.browser.extension.getBackgroundPage().browser;
  var form = document.getElementById('preferences');
  var span_list = form.getElementsByTagName('span');
  for (let span of span_list) {
    span.innerHTML = browser.i18n.getMessage(span.dataset.locale);
  }
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", fill_labels);
document.querySelector("form").addEventListener("submit", saveOptions);
