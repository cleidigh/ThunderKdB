// Saves options to chrome.storage
function save_options() {
  localStorage["server_ip"] = document.getElementById("server_ip").value;
  localStorage["token"] = document.getElementById("token").value;
  localStorage["prefix"] = document.getElementById("prefix").value;
  localStorage["peer"] = document.getElementById("peer").value;
  localStorage["dialplan_nr"] = document.getElementById("dialplan_nr").value;
  localStorage["is_https"] = document.getElementById("is_https").checked;
}

// stored in chrome.storage.
function restore_options() {
  if (localStorage.server_ip != undefined) {
    document.getElementById("server_ip").value = localStorage.server_ip;
  }
  if (localStorage.token != undefined) {
    document.getElementById("token").value = localStorage.token;
  }
  if (localStorage.prefix != undefined) {
    document.getElementById("prefix").value = localStorage.prefix;
  }
  if (localStorage.peer != undefined) {
    document.getElementById("peer").value = localStorage.peer;
  }
  if (localStorage.dialplan_nr != undefined) {
    document.getElementById("dialplan_nr").value = localStorage.dialplan_nr;
  }
  if (localStorage.is_https != undefined && localStorage.is_https === true) {
    document.getElementById("is_https").checked = localStorage.is_https;
  }
}

function initialise() {
  restore_options();
}

function localizeHtmlPage() {
  //Localize by replacing __MSG_***__ meta tags
  var objects = document.getElementsByTagName("tr");
  var title = document.getElementsByTagName("title");
  var button = document.getElementById("save");

  for (var j = 0; j < title.length; j++) {
    var t = title[j];

    var valStrH = t.innerText.toString();
    var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : "";
    });

    if (valNewH != valStrH) {
      t.innerText = valNewH;
    }
  }


  var valStrH = button.innerText.toString();
  var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
    return v1 ? chrome.i18n.getMessage(v1) : "";
  });

  if (valNewH != valStrH) {
    button.innerText = valNewH;
  }

  for (var j = 0; j < objects.length; j++) {
    var obj = objects[j];

    var valStrH = obj.children[0].innerText.toString();
    var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : "";
    });

    if (valNewH != valStrH) {
      obj.children[0].innerText = valNewH;
    }
  }
}

$(document).ready(function() {
  localizeHtmlPage();
  initialise();
  $(function() {
    $("#save").click(function() {
      save_options();
      // Update status to let user know options were saved.
      var status = document.getElementById("status");
      status.textContent = chrome.i18n.getMessage("options_saved");
      setTimeout(function() {
        status.textContent = "";
      }, 750);
    });
  });
});
