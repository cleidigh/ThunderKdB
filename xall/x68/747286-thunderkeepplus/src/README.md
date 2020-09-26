# ThunderKeepPlus
Unofficial Google Keep extension for Thunderbird, it adds a button that opens a Google Keep tab in Thunderbird.
The [home page](https://addons.mozilla.org/thunderbird/addon/thunderkeepplus/) of the extension contains some pictures and reviews.

#### Installing 
Simply search for ThunderKeepPlus inside Thunderbird and the addon should show up.

#### Installing from sources
Download the repository, zip it, rename it to ThunderKeepPlus.xpi and choose install addon from file in Thunderbird.

In linux the xpi file can be created with the following commands
* `git clone https://github.com/Garoe/ThunderKeepPlus`
* `cd ./ThunderKeepPlus`
* `VERSION=$(cat ./manifest.json | jq --raw-output '.version')`
* `zip -r "../ThunderKeepPlus-${VERSION}-tb.xpi" *`
