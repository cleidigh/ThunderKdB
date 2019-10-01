browser.windows.onCreated.addListener(function() {browser.browserAction.getPopup({})});

function onCreated() {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log('Item created successfully');
  }
};

browser.menus.create({
  id: 'taskview1',
  title: 'View to put task view up',
  contexts: ['browser_action']
}, onCreated);

browser.menus.create({
  id: 'taskview2',
  title: 'View to put task view neutrally',
  contexts: ['browser_action']
}, onCreated);

browser.menus.create({
  id: 'taskview3',
  title: 'View to put task view vertically',
  contexts: ['browser_action']
}, onCreated);