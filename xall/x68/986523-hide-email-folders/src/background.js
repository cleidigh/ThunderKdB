// function to hide the email folder in the given main window (if it is a normal main window)
function hideemailFolder(window) {
   if (window.type != "normal")
      return;

   // hide email folders for the given window
   messenger.myapi.hideemailfolder(window.id);
}

// register a event listener for newly opened windows, to
// automatically call hideemailFolders() for them
messenger.windows.onCreated.addListener(hideemailFolder);


// run thru all already opened main windows (type = normal) and hide email folders
// this will take care of all windows already open while the add-on is being installed or
// activated during the runtime of Thunderbird.
async function init() {
   let windows = await messenger.windows.getAll({windowTypes: ["normal"]});
   for (let window of windows) {
      hideemailFolder(window);
   }
}

// run init()
init();
