const showPromptCheckbox = document.querySelector('#show-prompt');

document.addEventListener('DOMContentLoaded', () => {
  // We have to specify `browser.storage.local.get` argument to avoid this issue.
  // https://thunderbird.topicbox.com/groups/addons/T46e96308f41c0de1-Md71abae9ff7506f371f5e323/issues-with-browser-storage-local-get
  browser.storage.local.get('showPrompt').then((res) => {
    showPromptCheckbox.checked =
      res.showPrompt !== undefined ? res.showPrompt : false;
  });
});

showPromptCheckbox.addEventListener('change', () => {
  // We use storage.local instead of storage.sync because storage.sync is not persisted.
  browser.storage.local.set({
    showPrompt: document.querySelector('#show-prompt').checked,
  });
});
