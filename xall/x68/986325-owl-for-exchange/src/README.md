An extension for Firefox and/or Thunderbird that allows to access
emails (and later calendar) on Microsoft Exchange servers, using the
OWA protocol that is primarily used by the Outlook Web Access web interface.

To install the extension, do one of the following:
- Create a file `extensions\owlwebext@beonex.com` in your profile folder that contains the full path (including trailing `/`) to the extension
- In the Error Console, evaluate `openContentTab("about:debugging")` and load the extension as a temporary extension
- Package the extension as an XPI, disable extension signing, and install the extension

Current status: An empty account object can be created that is present in the folder pane and can be deleted in the account manager. To create an account object, create variables `fullName`, `email` and `hostname`, then use the following code in the Error Console:
    
    server = MailServices.accounts.createIncomingServer(email, hostname, "owl");
    server.valid = true;
    identity = MailServices.accounts.createIdentity();
    identity.fullName = fullName;
    identity.email = email;
    identity.valid = true;
    account = MailServices.accounts.createAccount();
    account.addIdentity(identity);
    account.incomingServer = server;

Currently to do initial folder discovery you need to select the account in the folder pane and click the Get Messages toolbarbutton. You will then be prompted to log in, unless you already have a password saved in the password manager. After each implicit or explicit log in, the remote address book is downloaded into a local address book.

Folders can be created, deleted, moved and renamed. Selecting a folder automatically triggers a resynchronisation with the server, removing old headers, updating the unread/flagged status on existing headers, and downloading new headers.

Selecting a message displays the message content in the message pane. You can also open attachments from the message, although you can't save them yet. You can mark messages as (un)read or (un)flagged. Messages can be copied and moved between accounts. They can be moved to trash or deleted permanently.
