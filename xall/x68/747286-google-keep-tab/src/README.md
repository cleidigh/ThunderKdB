# Google Keep Tab
Unofficial Google Keep add-on for Thunderbird, it adds a button that opens a Google Keep tab in Thunderbird.
The [home page](https://addons.mozilla.org/thunderbird/addon/thunderkeepplus/) of the extension contains some pictures and reviews.

#### Installing 
Simply search for Google Keep inside Thunderbird and the addon should show up.

#### Installing from sources
Download the repository, zip it, rename it to Google-Keep-Tab.xpi and choose install addon from file in Thunderbird.

In linux the xpi file can be created with the following commands
* `git clone https://github.com/Garoe/Thunderbird-Google-Keep-Tab`
* `cd ./Thunderbird-Google-Keep-Tab`
* `VERSION=$(cat ./manifest.json | jq --raw-output '.version')`
* `zip -r "../Google-Keep-Tab-${VERSION}-tb.xpi" *`
