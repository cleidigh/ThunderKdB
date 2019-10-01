"Reply to Multiple Messages" Thunderbird / SeaMonkey add-on
===========================================================

![Add-on Icon](icon64.png)

This Thunderbird / SeaMonkey add-on adds two commands to the "Message" menu and the context menu that pops up when you right-click on the message pane: "Reply to Selected" and "Reply All to Selected". These commands are disabled and/or hidden when fewer than two messages are selected in the message list.

The "Reply to Selected" command opens a composition window with the senders of all the selected messages filled in as the addressees of the draft. Furthermore, if the selected messages share a common string at the end of their Subject lines, the Subject of the new draft will be pre-populated with it.

The "Reply All to Selected" command functions similarly, but it includes the "To" recipients of the selected messages as "To" recipients of the draft and the "CC" recipients of the selected messages as "CC" recipients of the draft.

In the add-on's preferences, you can tell it to use "BCC" For addressees instead of "To" and "CC".

In the add-on's preferences, you can also tell it not to put the message IDs of the messages you're replying to in the header of the reply. These message IDs are used by clients to thread discussions properly. However, since message IDs often contain the email domains of the people who sent messages, including them in a reply could reveal information about other participants in the thread. It doesn't make much sense to use enable this feature unless you also enable the "Use BCC" feature mentioned above!

Availability
------------

https://github.com/jikamens/reply-to-multiple-messages<br/>
https://addons.mozilla.org/thunderbird/addon/reply-to-multiple-messages/

Copyright
---------

Copyright 2017 Jonathan Kamens.

License
-------

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
