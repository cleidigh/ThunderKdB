const commandNameMoveMessage = 'move-msg';
const commandNameFolderJump =  'fldr-jump';
const idMoveMessage = "#shortcut-message-move";
const idFolderJump = "#shortcut-folder-jump";
var shortCutCommands = {};

/**
 * Update the UI: set the value of the shortcut textbox.
 */
async function updateUI() {
  let commands = await browser.commands.getAll();
  for (command of commands) {
      shortCutCommands[ command.name ] = command.shortcut;
      if (command.name === commandNameMoveMessage) {
          document.querySelector( idMoveMessage ).value = command.shortcut;
      } else if (command.name === commandNameFolderJump) {
          document.querySelector( idFolderJump ).value = command.shortcut;
      }
  }
}

/**
 * Update the shortcut based on the value in the textbox.
 */
function updateShortcut() {
    updateShortcutCommand( commandNameMoveMessage, document.querySelector( idMoveMessage ).value);
    updateShortcutCommand( commandNameFolderJump, document.querySelector( idFolderJump ).value);
}

async function updateShortcutCommand( commandName, shortcut ){
    console.log ( shortCutCommands[ commandName ] );
    if (shortCutCommands[ commandName ] == shortcut ){
        return;  // command is not new
    }
    try {
        await browser.commands.update({
            name: commandName,
            shortcut: shortcut
        });
        alert( 'command '  + commandName + ' succesfully changed.');
    } catch ( err ) {
        alert( err );
    }
    updateUI() ;
}

/**
 * Reset the shortcut and update the textbox.
 */
async function resetShortcut() {
  await browser.commands.reset( commandNameMoveMessage );
  await browser.commands.reset( commandNameFolderJump );
  updateUI();
}

/**
 * Update the UI when the page loads.
 */
document.addEventListener('DOMContentLoaded', updateUI);

/**
 * Handle update and reset button clicks
 */
document.querySelector('#update').addEventListener('click', updateShortcut)
document.querySelector('#reset').addEventListener('click', resetShortcut)
