var uploads = new Map();

async function getOAuthToken(accountId) {
  let accountInfo = await browser.storage.local.get([accountId]);
  if (!accountInfo[accountId] || !("oauth_token" in accountInfo[accountId])) {
    throw new Error("No OAuth token found.");
  }
  return accountInfo[accountId].oauth_token;
}

browser.cloudFile.onFileUpload.addListener(async (account, { id, name, data }) => {
  let oauthToken = await getOAuthToken(account.id);
  let uploadInfo = { abortController: new AbortController() };
  uploads.set(id, uploadInfo);

  let url = "https://content.dropboxapi.com/2/files/upload";
  let headers = {
    "authorization": `Bearer ${oauthToken}`,
    "content-type": "application/octet-stream",
    "Dropbox-API-Arg": JSON.stringify({
      "path": `/${name}`,
      "mode": "add",
      "autorename": true,
      "mute": false,
    }).replace(/[\u007f-\uffff]/g, (c) => {
      let unicode = `000${c.charCodeAt(0).toString(16)}`.slice(-4);
      return `\\u${unicode}`;
    }),
  };
  let fetchInfo = {
    mode: "cors",
    method: "POST",
    headers,
    body: data,
    signal: uploadInfo.abortController.signal,
  };
  let response = await fetch(url, fetchInfo);
  let json = await response.json();

  uploadInfo.path = json.path_display;

  url = "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings";
  headers = {
    "authorization": headers.authorization,
    "content-type": "application/json",
  };
  fetchInfo = {
    mode: "cors",
    method: "POST",
    headers,
    body: JSON.stringify({
      path: json.path_display,
      settings: { requested_visibility: "public" },
    }),
    signal: uploadInfo.abortController.signal,
  };
  response = await fetch(url, fetchInfo);
  json = await response.json();

  if (response.status != 200) {
    if (json.error[".tag"] == "shared_link_already_exists") {
      url = "https://api.dropboxapi.com/2/sharing/list_shared_links";
      fetchInfo.body = JSON.stringify({ path: uploadInfo.path });
      response = await fetch(url, fetchInfo);
      json = await response.json();
      json = json.links[0];
    }
  }

  delete uploadInfo.abortController;

  if (json && json.url) {
    return { url: json.url };
  }

  throw new Error("Upload failed.");
});

browser.cloudFile.onFileUploadAbort.addListener((account, id) => {
  let uploadInfo = uploads.get(id);
  if (uploadInfo && uploadInfo.abortController) {
    uploadInfo.abortController.abort();
  }
});

browser.cloudFile.onFileDeleted.addListener(async (account, id) => {
  let uploadInfo = uploads.get(id);
  if (!uploadInfo || !("path" in uploadInfo)) {
    return;
  }

  let oauthToken = await getOAuthToken(account.id);
  let url = "https://api.dropboxapi.com/2/files/delete_v2";
  let headers = {
    "authorization": `Bearer ${oauthToken}`,
    "content-type": "application/json",
  };
  let fetchInfo = {
    mode: "cors",
    method: "POST",
    headers,
    body: JSON.stringify({ path: uploadInfo.path }),
  };
  await fetch(url, fetchInfo);

  uploads.delete(id);
});

browser.cloudFile.getAllAccounts().then(async (accounts) => {
  for (let account of accounts) {
    try {
      await getOAuthToken(account.id);
      await browser.cloudFile.updateAccount(account.id, { configured: true });
    } catch (ex) {
    }
  }
});
