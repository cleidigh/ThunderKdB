"Remote Content By Folder" Thunderbird / SeaMonkey add-on
=========================================================

This Thunderbird / SeaMonkey add-on tells Thunderbird whether or not to allow or block the display of remote content in messages added to folders (usually, but not always, newly received messages) by matching regular expressions specified by the user against the names of the folders containing the messages.

The user can specify the regular expression whose matching folders allow remote content to display automatically and/or a separate regular expression whose matching folders block remote content automatically.

By default, the "allow" regexp is checked first, then the "block" regexp, and if neither matches, the add-on does nothing. There is a checkbox in the preferences which can be checked to reverse the order of the checks.

Availability
------------

https://github.com/jikamens/remote-content-by-folder<br/>
https://addons.thunderbird.net/thunderbird/addon/remote-content-by-folder/

Copyright
---------

Copyright 2017 Jonathan Kamens.

License
-------

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
