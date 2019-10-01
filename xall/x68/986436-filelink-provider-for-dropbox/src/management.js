let accountId = new URL(location.href).searchParams.get("accountId");

let notAuthed = document.getElementById("notAuthed");
let authed = document.getElementById("authed");

let input = notAuthed.querySelector("input");
let saveButton = document.getElementById("saveButton");
let cancelButton = document.getElementById("cancelButton");
let errorMessage = document.getElementById("errorMessage");
let responseMessage = document.getElementById("responseMessage");

let newTokenButton = document.getElementById("newTokenButton");

(() => {
  for (let element of document.querySelectorAll("[data-message]")) {
    element.textContent = browser.i18n.getMessage(element.dataset.message);
  }
  let stringParts = browser.i18n.getMessage("notAuthed_step1").split("%s");
  let step1 = notAuthed.querySelector("li");
  let link = step1.firstElementChild;

  for (let part of stringParts) {
    if (part == "%s") {
      step1.appendChild(link);
    } else {
      step1.appendChild(document.createTextNode(part));
    }
  }
})();

input.oninput = () => {
  saveButton.disabled = !notAuthed.checkValidity();
};

saveButton.onclick = async () => {
  input.disabled = saveButton.disabled = true;
  errorMessage.hidden = true;
  responseMessage.hidden = true;
  let start = Date.now();

  let url = "https://api.dropboxapi.com/oauth2/token";
  let data = new FormData();
  data.append("code", input.value);
  data.append("grant_type", "authorization_code");
  data.append("client_id", "m3ei52tfzq1erl4");
  /* eslint-disable */
  data.append("client_secret",
    // Thinly-veiled attempt to hide the client secret. Don't bother
    // decoding this. Get your own, it's easy. Here, I'll even give you
    // the URL you need: https://www.dropbox.com/developers/apps/create
    (a=>a["\x61\x74\x6f\x62"](a["\x53\x74\x72\x69\x6e\x67"]["\x66\x72\x6f"+
    "\x6d\x43\x68\x61\x72\x43\x6f\x64\x65"]["\x61\x70\x70\x6c\x79"](null,a[
    "\x41\x72\x72\x61\x79"]["\x6d\x61\x70"]("\x64\x58\x68\x31\x5a\x33\x32"+
    "\x76\x63\x58\x47\x77\x4f\x58\x47\x6f\x63\x58\x4f\x7b",b=>b["\x63\x68"+
    "\x61\x72\x43\x6f\x64\x65\x41\x74"](0)-1))))(this)
  );
  /* eslint-enable */

  let fetchInfo = {
    mode: "cors",
    method: "POST",
    body: data,
  };
  let response = await fetch(url, fetchInfo);
  if (response.ok) {
    let json = await response.json();
    await browser.storage.local.set({ [accountId]: { oauth_token: json.access_token } });
    await browser.cloudFile.updateAccount(accountId, { configured: true });
    setTimeout(() => {
      input.disabled = saveButton.disabled = false;
      notAuthed.hidden = true;
      authed.hidden = false;
    }, Math.max(0, start + 500 - Date.now()));
    return;
  }

  errorMessage.hidden = false;
  try {
    let json = await response.json();
    if ("error_description" in json) {
      responseMessage.querySelector("span").textContent = json.error_description;
      responseMessage.hidden = false;
    }
  } catch (ex) {
  }
  setTimeout(() => {
    input.value = "";
    input.disabled = saveButton.disabled = false;
    input.focus();
  }, Math.max(0, start + 500 - Date.now()));
};

cancelButton.onclick = () => {
  input.value = "";
  notAuthed.hidden = true;
  authed.hidden = false;
};

newTokenButton.onclick = () => {
  cancelButton.hidden = false;
  notAuthed.hidden = false;
  authed.hidden = true;
  input.focus();
};

browser.storage.local.get([accountId]).then((accountInfo) => {
  if (accountInfo[accountId] && "oauth_token" in accountInfo[accountId]) {
    authed.hidden = false;
  } else {
    notAuthed.hidden = false;
  }
});
