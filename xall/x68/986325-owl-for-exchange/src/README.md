An extension for Firefox and/or Thunderbird that allows to access
emails (and later calendar) on Microsoft Exchange servers, using the
OWA protocol that is primarily used by the Outlook Web Access web interface.

To install the extension, do one of the following:
- Create a file `extensions\owlwebext@beonex.com` in your profile folder that contains the full path (including trailing `/`) to the extension
- In the Error Console, evaluate `openContentTab("about:debugging")` and load the extension as a temporary extension
- Package the extension as an XPI, disable extension signing, and install the extension

Current status: An account can be created throught the Thunderbird new account wizard or through a manual setup page accessible via the extension preferences.
    
Folders can be created, deleted, moved and renamed. Selecting a folder automatically triggers a resynchronisation with the server, removing old headers, updating the unread/flagged status on existing headers, and downloading new headers.

Selecting a message displays the message content in the message pane. You can also open or save attachments from the message. You can mark messages as (un)read or (un)flagged. Messages can be copied and moved between accounts. They can be moved to trash or deleted permanently.

This branch has experimental Lightning support as a calendar provider. Once you log in to an EWS account, a calendar will be added to Lightning and will populate some detauls about your events. Note that although the calendar appears to be writable, attempting to edit the details will fail. (Unfortunately read-only view shows fewer details.)

Lightning will attempt to recreate the calendar on restart, but this will probably fail. In this case the calendar will be automatically recreated after the account logs on.
