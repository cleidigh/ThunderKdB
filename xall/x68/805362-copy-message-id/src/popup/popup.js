// Copy the message ID!
copyMessageID().catch(reportError);

async function copyMessageID() {
  let tabs = await browser.tabs.query({active: true, currentWindow: true});
  if (tabs.length != 1) {
    throw new Error("Expected a single selected tab (got " + tabs.length + ")");
  }

  tabID = tabs[0].id;

  let message = await browser.messageDisplay.getDisplayedMessage(tabID);
  if (!message) {
    throw new Error("No message selected");
  }

  var options = {
    prefix: "",
    suffix: "",
    copyBrackets: false,
    urlEncode: false,
    raw: false
  };
  let config = await browser.storage.local.get("copyID");
  if (config.copyID) {
    options = config.copyID;
  }

  var message_id = "";
  if (options.raw) {
    let raw = await browser.messages.getRaw(message.id);

    // Split into header and body by splitting on double newline.
    var parts = raw.split(/\n\n|\r\n\r\n|\r\r/);

    // Split into each line and maintain whitepsace
    var lines = parts[0].match(/^.*((\n|\r\n|\r)|$)/gm);

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // Match the Message-ID tag, case insensitive.
      if (line.match(/^message-id:/im)) {
        message_id = line;
      } else if (message_id != "") {
        // Subsequent lines of a message ID spread across multiple lines
        // must start with whitespace
        if (!/^\s/.test(line)) {
          break;
        }
        message_id += line;
      }
    }
    if (message_id == "") {
      throw new Error("No Message-ID found in raw email text");
    }

    // Remove whitespace from the end of the string.
    message_id = message_id.trimEnd();
  } else {
    let parts = await browser.messages.getFull(message.id);
    message_id = parts.headers["message-id"][0];
  }

  await doCopy(message_id, options);
}

async function doCopy(message_id, options) {
  console.log(message_id);
  // Remove the brackets from the message-id to maintain backwards compatability.
  if (!options.copyBrackets &&
      message_id[0] == '<' &&
      message_id[message_id.length - 1] == '>') {
    message_id = message_id.slice(1,-1);
  }
  if (options.urlEncode) {
    message_id = encodeURIComponent(message_id);
  }
  console.log("prefix: " + options.prefix + " Suffix: " + options.suffix);
  let s = options.prefix + message_id + options.suffix;
  await navigator.clipboard.writeText(s);
  console.log("successfully copied message ID");
  reportSuccess(s);
}

function reportSuccess(message_id) {
  var time = 1500;
  document.querySelector("#message-id").append(message_id);
  var timeout = setTimeout(() => {  window.close(); }, time);
  // Stop the window close timeout if the user is interacting with it.
  document.onmouseover = function() {
    clearTimeout(timeout);
  }
  document.onmouseout = function() {
    timeout = setTimeout(() => {  window.close(); }, time);
  }
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportError(error) {
  document.body.style.background = "#C80000";
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-string").append(error.message);
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(`Failed to copy message ID: ${error.message}`);
}
