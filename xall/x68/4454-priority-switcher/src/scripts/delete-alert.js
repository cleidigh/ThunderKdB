document.getElementById("buttonCancel").addEventListener("click", async () => {
  await closeWindow();
});

document.getElementById("buttonDelete").addEventListener("click", async () => {
  let skip = document.getElementById("skipPriority").checked;
  await browser.runtime.sendMessage({
    message: "DELETE_CONFIRMED",
    skipPriority: skip
  });
  await closeWindow();
});

async function closeWindow() {
  let windowId = (await browser.windows.getCurrent()).id;
  await browser.runtime.sendMessage({
    message: "CLOSE_REQ",
    windowId: windowId
  });
}

translate();