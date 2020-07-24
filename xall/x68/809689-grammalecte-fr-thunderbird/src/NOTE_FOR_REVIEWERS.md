# Grammalecte for Firefox and Chrome and for Thunderbird

* [Website](https://grammalecte.net)
* [Source code](http://code.grammalecte.net:8080/home)

This extension offers a grammar checking tool for the French Language.


## WebExtension

The grammar checker runs in a Worker launched from the background script.
And text are analysed at users request. Results are displayed within
the webpages.

    Content-scripts <---> Background <---> Worker: Grammar checker (gce_worker.js)


### Folders

* grammalecte: the grammar checker (receive texts, analyse it and send back results).
* content_scripts (what is run in content-scripts).
* panel: browser_action panel, and other webpages (lexicon editor, conjugueur and other stuff).


### Building the extension with the source code

Extensions for LibreOffice, Firefox/Chrome and Thunderbird are generated in the folder `_build`.

Required:

* Python 3.7+ > [download](https://www.python.org/)
* NodeJS > [download](https://nodejs.org/)
  * npm (should be installed with NodeJS)
  * web-ext > [instructions](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)

Command to build:

    make.py fr -js

Build and rebuild data (may be not deterministic):

    make.py fr -js -b -d

If you got the source code from a zip archive, you must first uncompress the archive
in `gc_lang/fr/dictionnaire/lexique/corpus_data`. (It isn’t possible to upload the
source code as is to Mozilla website, as these files are considered too big.)


## MailExtension

The MailExtension is built upon the Grammalecte [WebExtension](https://addons.mozilla.org/fr/firefox/addon/grammalecte-fr/).

Both extensions use the same code. Only one file differs: manifest.json
