# About

This is an add-on for Mozilla Thunderbird that displays birthdays from the
addressbooks as events in Lightning.


# Installation

Go to https://addons.mozilla.org/thunderbird/addon/thunderbirthday/ and follow
the installation instructions there.


# Credits

A huge thanks to all contributors of this extensions!

* Philipp Kewisch -- The author of the google calendar provider, which
  served as skeleton for ThunderBirthDay
* Michael Kurz -- For the active testing and the support in bug smashing!
* edvoldi -- A very eager tester from www.sunbird-kalender.de/forum/
* Babelzilla and the translators there -- See datails in install.rdf
* www.icondrawer.com -- For making the duty free icon used for this extension

And many other testers...


# Known issues

* calIItemBase.id
    - The ID is not unique yet. Until now, it is an MD5 hash of the Name,
      the birthday and the calendar's URI. This makes it pretty unique, but
      not entirely unique. One idea is to generate a random MD5 hash and
      save it in a new field with the nsIAddrDatabase interface.

* calICalendar.getItems()
    - Until now, the occurrences of a recurring item as returned by the
      TBD data provider do not have the same title as the base item. Users
      retrieving occurences with the calIItemBase.getOccurrencesBetween()
      will get occurrences with the same title as the base item (no age in
      parenthesis). Maybe implementing the calIItemBase interface is a
      solution...

* Anyway, if you read this and have any ideas, suggestions, critics or
  whatsoever, please let me know!


# Possible new features

This list is not up-to-date. Please have a look at
http://ingomueller.net/mozilla/thunderbirthday/wishlist for a more detailed and
up-to-date version of this list.

* The description on AMO has to be improved: it has to be clear to the user
  that ThunderBirthDay provides a new type of calendar and that it doesn't
  just export events.

* Maybe we can use nsIAddrDBListener to track changes to the address
  book, so there is no need to refresh anymore, or at least, changes
  will be tracked immediately.

* Possibility to choose a user defined field where the birthday is
  stored instead of the mostly unaccessible fields birthday, birthmonth
  and birthyear. Maybe even possibility to choose format (dd.mm.yyyy).

* Possibility to choose between birthdays, anniversaries and both. Like
  the feature above, the coise can be stored in the calendar uri as
  paremters like this: moz-abmdbdirectory://abook.mab?type=birthday&field=user1

* Replace the modify dialog of events for TBD-calenders with the
  property dialog of the concerned addressbook card (not sure about
  that one yet).

* Maybe it's a good idea to create calendar with default settings when
  installing ThunderBirthDay, as some people don't seem to read the
  instructions carefully enough and don't know how it works then.

* Extend properties dialog of thunderbirthday-calendars, adding possibility
  to change addressbook, birthdate field and other settings.

* Implement alarms, with global and per calendar settings. Maybe the
  necessary data can be saved in new fields with the nsIAddrDatabase
  interface. Reminder-emails might also be a nice feature.

* Let the user set all kind of things, globally and per calendar:
  (1) the format of the events title, (2) category, ...

* A wish from a user: Possibility to have birthdays without the year
  being set. Not sure about how to implement this...


# Resources for developers

* http://ingomueller.net/mozilla/thunderbirthday -- The projects home page
* http://rfc.net/rfc2445.html -- RFC2445 - Internet Calendaring and
  Scheduling Core Object Specification (iCalendar)
* http://mxr.mozilla.org/ -- Source code of Thunderbird and Lighting
* http://mxr.mozilla.org/mozilla/source/calendar/base/public/calICalendar.idl --
  Specification of the calICalendar interface - the main interface TBD is
  implementing.

