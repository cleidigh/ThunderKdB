= Open Google Calendar =

This extension uses the new special tab features of Thunderbird 3 to open Google
Calendar inside a Thunderbird tab.  The Google Calendar Tab extension was created
as an example extension which could be copied for other sites to use.  Eventually
this system will likely be replaced by something like Jetpack for Thunderbird
which would make it much easier to create and distribute simple tab opening
extensions like this one.

It's a fork of repository archived : https://github.com/clarkbw/google-calendar-tab by Bryan Clark
but compatible with Thunderbird Version 60.*

Initial Blog Post:
http://clarkbw.net/blog/2009/11/23/google-calendar-in-thunderbird-tabs/

Initial Source Code:
http://hg.mozilla.org/users/clarkbw_gnome.org/opengooglecalendar/

== How it Works ==

(after installing)

This extension adds a "tab shortcut" to the tab bar as well as an item to the
Tools menu which will open up Google Calendar in a new tab.

On first use you should see the Google Calendar login page.  When you login you
will be prompted by a notification bar which can save your username and password
for the site.  This password can be removed from the Security -> Passwords
section of your preferences.
