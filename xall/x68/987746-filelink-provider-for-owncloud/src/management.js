let form = document.querySelector("form");
let serverUrl = form.querySelector(`input[name="serverUrl"]`);
let username = form.querySelector(`input[name="username"]`);
let token = form.querySelector(`input[name="token"]`);
let path = form.querySelector(`input[name="path"]`);
let button = form.querySelector("button");
let accountId = new URL(location.href).searchParams.get("accountId");

(() => {
  for (let element of document.querySelectorAll("[data-message]")) {
    element.textContent = browser.i18n.getMessage(element.dataset.message);
  }
})();

browser.storage.local.get([accountId]).then(accountInfo => {
  if (accountId in accountInfo) {
    if ("serverUrl" in accountInfo[accountId]) {
      serverUrl.value = accountInfo[accountId].serverUrl;
    }
    if ("username" in accountInfo[accountId]) {
      username.value = accountInfo[accountId].username;
    }
    if ("token" in accountInfo[accountId]) {
      token.value = accountInfo[accountId].token;
    }
    if ("path" in accountInfo[accountId]) {
      path.value = accountInfo[accountId].path;
    }
  }
});

button.onclick = async () => {

  if (!form.checkValidity()) {
    console.log("form is invalid");
    return;
  }

  serverUrl.disabled = username.disabled = token.disabled = path.disabled = button.disabled = true;
  let serverUrl_value = serverUrl.value;
  if (!serverUrl_value.endsWith("/")) {
    serverUrl_value += "/";
    serverUrl.value = serverUrl_value;
  }
  let path_value = path.value;
  if (!path_value.endsWith("/")) {
    path_value += "/";
    path.value = path_value;
  }
  if (!path_value.startsWith("/")) {
    path_value = "/" + path_value;
    path.value = path_value;
  }

  let start = Date.now();
  await browser.storage.local.set({
    [accountId]: {
      serverUrl: serverUrl_value,
      username: username.value,
      token: token.value,
      path: path_value
    },
  });
  await browser.cloudFile.updateAccount(accountId, { configured: true });
  setTimeout(() => {
    serverUrl.disabled = username.disabled = token.disabled = path.disabled = button.disabled = false;
  }, Math.max(0, start + 500 - Date.now()));
};
