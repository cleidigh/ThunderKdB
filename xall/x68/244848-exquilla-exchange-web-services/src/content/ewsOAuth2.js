var [{ username, password }] = sendSyncMessage("ExQuillaAuthenticate");
var triedPassword = false;
addEventListener("load", function(event) {
  function usernamePrefill() {
    let inputs = [...content.document.querySelectorAll("input")];
    let usernameFields = inputs.filter(input => input.type == "email" ||
        input.type == "text" &&
        (input.id.toLowerCase().includes("user") || input.name.toLowerCase().includes("user") ||
         input.id.toLowerCase().includes("mail") || input.name.toLowerCase().includes("mail")));
    let submit = inputs.filter(input => input.type == "submit");
    if (usernameFields.length == 1 && submit.length == 1) {
      let usernameField = usernameFields[0];
      if (usernameField && !usernameField.value) {
        usernameField.value = username;
        usernameField.dispatchEvent(new content.Event("change"));
      }
    }
  }
  function passwordPrefill() {
    let inputs = [...content.document.querySelectorAll("input")];
    let passwordFields = inputs.filter(input => input.type == "password");
    let submitButtons = inputs.filter(input => input.type == "submit");
    if (passwordFields.length == 1 && submitButtons.length == 1) {
      let passwordField = passwordFields[0];
      if (password && !triedPassword) {
        // We recognised the fields. Fill in and submit the form.
        passwordField.value = password;
        passwordField.dispatchEvent(new content.Event("change"));
        submitButtons[0].focus();
        submitButtons[0].click();
        triedPassword = true;
      } else {
        passwordField.addEventListener("change", function() {
          sendSyncMessage("ExQuillaPasswordChange", { newPassword: passwordField.value });
        });
      }
    }
  }
  usernamePrefill();
  passwordPrefill();
  // The Microsoft OAuth login page creates the login form dynamically.
  // We have to give this a chance to happen before trying to submit it.
  // TODO Use a DOM MutationObserver *and* timeout of 100 ms
  content.setTimeout(passwordPrefill, 300);
  content.setTimeout(passwordPrefill, 1000);
}, true);
