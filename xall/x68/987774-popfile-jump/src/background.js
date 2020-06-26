async function execute() {
  messages = await browser.mailTabs.getSelectedMessages()
  
  messages.messages.forEach(async (message) => {
    messagePart = await browser.messages.getFull(message.id)
    messagePart.headers['x-popfile-link'].forEach((link) => {
      browser.tabs.create({
        url: link
      })
    })
  })
}

// エントリーポイント
browser.browserAction.onClicked.addListener(execute)

browser.commands.onCommand.addListener((command) => {
  execute()
})
