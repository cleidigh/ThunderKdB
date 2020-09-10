var priorityTable = {
  "p_1": "1",
  "p_2": "2",
  "p_3": "3",
  "p_4": "4",
  "p_5": "5",
  "p_high": "1",
  "p_normal": "3",
  "p_low": "5",
  "p_urgent": "1",
  "p_non-urgent": "5"
};

browser.runtime.sendMessage({
  message: "GET_CURRENT_MSG_PRIORITY"
});

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.message) {
    case "SEND_CURRENT_MSG_PRIORITY":
      init(message.priority);
      break;
    default:
  }
});

async function init(priority) {
  translate();

  let result = await browser.storage.local.get("deleteButtonEn");
  if (result.deleteButtonEn) {
    document.getElementById("deleteArea").setAttribute("class", "box-visible");
  }
  
  let selectedMessages = await getCurrentMessages();
  if (selectedMessages.length > 0) {
    priority = priority ? priorityTable["p_" + priority.toLowerCase()] : null;

    if (priority) {
      document.priolist.priority.value = priority;
    }

    for (let i = 0; i < document.priolist.priority.length; i++) {
      document.priolist.priority[i].addEventListener("change", () => {
        changePriority();
      });
    }
  } else {
    console.log("No message is selected");
  }
}

async function changePriority() {
  let priority = document.priolist.priority.value;

  //update priority by background.js
  await browser.runtime.sendMessage({
    message: "PRIORITY_CHANGED",
    priority: priority
  });

  //close popup automatically
  window.close();
}

//returns upto 100 selected messages
async function getCurrentMessages() {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  let messages = [];

  try {
    if (tabs[0].mailTab) {
      let msgs = await browser.mailTabs.getSelectedMessages(tabs[0].id);
      messages = msgs.messages;
    } else {
      let msg = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
      if (msg) messages.push(msg);
    }
  } catch (e) {
    console.log("No message is selected and displayed." + e);
  }

  return messages;
}
