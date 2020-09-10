window.onload = function() {

//Localisation
  document.getElementById("title").textContent = browser.i18n.getMessage("title");
  document.getElementById("label").textContent = browser.i18n.getMessage("label");
  document.getElementById("mytitle").textContent = browser.i18n.getMessage("mytitle");
  document.getElementById("labelquestion").textContent = "\n" + browser.i18n.getMessage("labelquestion") + "\n";
  document.getElementById("accept").value = browser.i18n.getMessage("accept");
  document.getElementById("cancel").value = browser.i18n.getMessage("cancel");

// Arguments
URL = document.URL.split('%20').join(" ");
URL = URL.split('%3C').join("<");
URL = URL.split('%3E').join(">");
  console.log(URL);
  addresses = URL;
  var point = addresses.indexOf("?") + 1;
  addresses = addresses.slice(point);
  console.log(addresses);
  document.getElementById("addresses").textContent = addresses ;
}


document.getElementById("accept").addEventListener('click', okpressed);
document.getElementById("cancel").addEventListener('click', cancelpressed);

function okpressed() {
  // console.log("OK pressed");
  // console.log("Checkbox: " + bccall);
  browser.runtime.sendMessage({msg:"send_ok"}).catch();
}

function cancelpressed() {
  // console.log("CANCEL pressed");
  // console.log("Checkbox: " + bccall);
  browser.runtime.sendMessage({msg:"send_cancel"}).catch();
}
