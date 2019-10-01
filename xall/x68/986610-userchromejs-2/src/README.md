userChromeJS add-on for Thunderbird 60+
=======================================

This add-on allows you to create a file called "userChrome.js" in the "chrome" folder inside your Thunderbird profile, which is then loaded into every new Thunderbird window that opens.

It is a bare-bones re-implementation of the [old userChromeJS add-on](http://userchromejs.mozdev.org/), which has been unmaintained for a long time.

Unlike that old add-on, which provided a bunch of helper functions you could call in your userChrome.JS, this add-on is (currently) more basic. It has no helper functions. All it does is load your userChrome.js file into new windows. Any functionality you want, you'll have to build yourself.

I am open to the possibility of adding a library of helper functions back to the add-on over time, and perhaps also creating a repository of code snippets thta do various specific things which shouldn't be shipped with the add-on itself but might be useful for people to look at. For the time being, however, I'm releasing this as-is for people to start using. And by "people" I mean me, because the reason I built this was so that I could start using Thunderbird 68 without losing all of the customizations in my userChrome.js file.

The home page of this add-on is currently [on Github](https://github.com/jikamens/userChromeJS). Also feel free to [contact me](mailto:jik@kamens.us) with questions or feedback.

This add-on is Copyright (C) 2019 Jonathan Kamens. It is released under the terms of the [Mozilla Public License Version 2.0](LICENSE.txt), a copy of which is included in the add-on in the file "LICENSE.txt".
