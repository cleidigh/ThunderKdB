async function init() {
  translate();
  let result = await browser.storage.local.get("openInActive");
  let checkbox = document.ntb_form.open_in_active;

  checkbox.checked = result.openInActive ? true : false;

  checkbox.addEventListener("input", async () => {
    let checked = document.ntb_form.open_in_active.checked;
    await browser.storage.local.set({openInActive: checked});
  });
}

init();
