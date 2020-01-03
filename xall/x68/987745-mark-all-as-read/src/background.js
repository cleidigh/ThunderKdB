function markAllAsRead() {

  console.log('Mark All As Read clicked!');
  var ts = Math.round((new Date()).getTime());

  tabsQueryInfo = {
    active: true,
    currentWindow: true
  }

  messageProperties = {
    read: true
  }

  async function markMessagesAsRead(messages){
    var newts = Math.round((new Date()).getTime());
    for (i in messages){
      browser.messages.update(messages[i].id, messageProperties)
    }
  }

  browser.mailTabs.query(tabsQueryInfo).then((tabs) => {
      //Gets the current displayed folder on the active tab on the active window
      currentFolder = tabs[0].displayedFolder;
      messagesQueryInfo = {
        unread: true,
        folder: currentFolder
      }

      //Gets unread messages from the current folder
      browser.messages.query(messagesQueryInfo).then(async (messageList) => {
        markMessagesAsRead(messageList.messages)

        list = messageList
        while (list.id) {
          list = await browser.messages.continueList(list.id)
          markMessagesAsRead(list.messages)
        }
      })
    })
}

browser.browserAction.onClicked.addListener(markAllAsRead);
