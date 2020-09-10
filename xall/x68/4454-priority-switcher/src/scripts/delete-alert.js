document.getElementById("buttonCancel").addEventListener("click", async () => {
  let windowId = (await browser.windows.getCurrent()).id;
  await browser.windows.remove(windowId);
});

document.getElementById("buttonDelete").addEventListener("click", async () => {
  let skip = document.getElementById("skipPriority").checked;
  await browser.runtime.sendMessage({
    message: "DELETE_CONFIRMED",
    skipPriority: skip
  });
  let windowId = (await browser.windows.getCurrent()).id;
  await browser.windows.remove(windowId);
});

translate();