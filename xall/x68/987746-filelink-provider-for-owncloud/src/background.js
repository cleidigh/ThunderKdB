var uploads = new Map();

// browser.cloudFile.onAccountAdded.addListener(async (account) => {
//   //console.log("Account Added", account.id)
// })

async function getAccountInfo(accountId) {
  let accountInfo = await browser.storage.local.get([accountId]);
  if (!accountInfo[accountId] || !("serverUrl" in accountInfo[accountId])) {
    throw new Error("No Accounts found.");
  }
  return accountInfo[accountId];
}

browser.cloudFile.onFileUpload.addListener(async (account, { id, name, data }) => {
  //console.log("onFileUpload", id, account, name);

  let accountInfo = await getAccountInfo(account.id);

  //console.log("accountInfo", accountInfo);

  let uploadInfo = {
    id,
    name,
    abortController: new AbortController(),
  };

  uploads.set(id, uploadInfo);

  let {serverUrl, username, token, path} = accountInfo;

  const authHeader = "Basic " + btoa(username + ":" + token);

  let url = serverUrl + "remote.php/dav/files/" + username + path + encodeURIComponent(name);

  let headers = {
    "Content-Type": "application/octet-stream",
    Authorization: authHeader
  };
  let fetchInfo = {
    method: "PUT",
    headers,
    body: data,
    signal: uploadInfo.abortController.signal,
  };

  //console.log("uploading to ", url, fetchInfo);

  let response = await fetch(url, fetchInfo);

  //console.log("file upload response", response);

  delete uploadInfo.abortController;
  if (response.status > 299) {
    throw new Error("response was not ok");
  }

  const newUrl = serverUrl + "ocs/v1.php/apps/files_sharing/api/v1/shares?format=json";
  uploadInfo.abortController = new AbortController();
  
  headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    Authorization: authHeader
  };

  fetchInfo = {
    method: "POST",
    headers,
    body: "shareType=3&path=" + encodeURIComponent(path + name),
    signal: uploadInfo.abortController.signal,
  };

  //console.log("requesting public link", newUrl, fetchInfo);

  response = await fetch(newUrl, fetchInfo);

  //console.log("public link response", response);

  if(response.ok)
  {
    let respJson = await response.json();
    return {url: respJson.ocs.data.url};
  }
  else
    return {aborted: true}

});

browser.cloudFile.onFileUploadAbort.addListener((account, id) => {
  //console.log("aborting upload", id);
  let uploadInfo = uploads.get(id);
  if (uploadInfo && uploadInfo.abortController) {
    uploadInfo.abortController.abort();
  }
});

browser.cloudFile.onFileDeleted.addListener(async (account, id) => {
  //console.log("delete upload", id);
  let uploadInfo = uploads.get(id);
  if (!uploadInfo) {
    return;
  }

  let accountInfo = await getAccountInfo(account.id);

  let {name} = uploadInfo;
  let {serverUrl, username, token, path} = accountInfo;

  const authHeader = "Basic " + btoa(username + ":" + token);

  let url = serverUrl + "remote.php/dav/files/" + username + path + encodeURIComponent(name);

  let headers = {
    Authorization: authHeader
  };

  let fetchInfo = {
    headers,
    method: "DELETE",
  };

  //console.log("sending delete", url, fetchInfo);

  let response = await fetch(url, fetchInfo);

  //console.log("delete response", response);

  uploads.delete(id);
  
  if (response.status > 299) {
    throw new Error("response was not ok");
  }

});

browser.cloudFile.getAllAccounts().then(async (accounts) => {
  let allAccountsInfo = await browser.storage.local.get();
  for (let account of accounts) {
    await browser.cloudFile.updateAccount(account.id, {
      configured: account.id in allAccountsInfo,
    });
  }
});
