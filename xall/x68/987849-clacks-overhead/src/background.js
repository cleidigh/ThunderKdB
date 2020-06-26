const tabs = {};
const clacksMessage = {};
const emailId = {};

function clearClacks(tabId, tabClosed) {
  clearInterval(tabs[tabId]);

  delete tabs[tabId];
  delete clacksMessage[tabId];
  delete emailId[tabId];

  if (!tabClosed) {
    browser.messageDisplayAction.setIcon({
      path: {
        16: 'data/Clacks16/BLANK.png',
        32: 'data/Clacks32/BLANK.png',
        64: 'data/Clacks64/BLANK.png',
      },
      tabId: tabId,
    });
    browser.messageDisplayAction.setTitle({ tabId: tabId, title: 'Clacks' });
  }
}
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  clearClacks(tabId, true);
});

browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
  browser.messages.getFull(message.id).then((res) => {
    if (emailId[tab.id] !== message.id) {
      clearClacks(tab.id, false);
    }
    if ('x-clacks-overhead' in res.headers && emailId[tab.id] !== message.id) {
      let loop = 0;
      let pos = 0;
      clacksMessage[tab.id] = `+${res.headers['x-clacks-overhead']}`;
      emailId[tab.id] = message.id;

      browser.messageDisplayAction.setTitle({ tabId: tab.id, title: clacksMessage[tab.id] });

      tabs[tab.id] = setInterval(() => {
        loop += 1;
        if (loop > 4) { loop = 0; }
        if (loop < 1) {
          browser.messageDisplayAction.setIcon({
            path: {
              16: 'data/Clacks16/BLANK.png',
              32: 'data/Clacks32/BLANK.png',
              64: 'data/Clacks64/BLANK.png',
            },
            tabId: tab.id,
          });
          pos += 1;
        } else {
          const currentClacks = clacksMessage[tab.id];
          if (currentClacks.length - 1 < pos) { pos = 0; }
          if (currentClacks.charAt(pos) === ' ') {
            browser.messageDisplayAction.setIcon({
              path: {
                16: 'data/Clacks16/SPACE.png',
                32: 'data/Clacks32/SPACE.png',
                64: 'data/Clacks64/SPACE.png',
              },
              tabId: tab.id,
            });
          } else if (currentClacks.charAt(pos) === '+') {
            browser.messageDisplayAction.setIcon({
              path: {
                16: 'data/Clacks16/END.png',
                32: 'data/Clacks32/END.png',
                64: 'data/Clacks64/END.png',
              },
              tabId: tab.id,
            });
          } else {
            try {
              browser.messageDisplayAction.setIcon({
                path: {
                  16: `data/Clacks16/${currentClacks.charAt(pos).toUpperCase()}.png`,
                  32: `data/Clacks32/${currentClacks.charAt(pos).toUpperCase()}.png`,
                  64: `data/Clacks64/${currentClacks.charAt(pos).toUpperCase()}.png`,
                },
                tabId: tab.id,
              });
            } catch (e) {
              browser.messageDisplayAction.setIcon({
                path: {
                  16: 'data/Clacks16/SPACE.png',
                  32: 'data/Clacks32/SPACE.png',
                  64: 'data/Clacks64/SPACE.png',
                },
                tabId: tab.id,
              });
            }
          }
        }
      }, 1000);
    }
  });
});
