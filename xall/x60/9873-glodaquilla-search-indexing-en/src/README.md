# glodaquilla

GlodaQuilla is a Thunderbird addon used to show some details of the
gloda (global database) indexing status.

About this Add-on
GlodaQuilla allows suppression or enabling of indexing, using inherited properties. It can be done at the account level, or for a tree of related folders. Indexing is changed in the Account Manager for individual accounts, or using “Folder Properties” dialog for individual folders.

It also adds three columns to the Thunderbird message pane that are primarily useful to developers of the indexing functionality:

* OnDisk indicates whether a particular message has been downloaded to the local message store, or is stored offline in an IMAP folder or newsgroup.
* Gloda id is the identifier used by gloda to uniquely identify a particular message.
* Gloda dirty indicates messages that gloda needs to process.

This addon was updated from https://github.com/opto/glodaquilla with the following notes:

"rkent's glodaquilla addon for Thunderbird updated for TB60. I only tested the gloda_dirty/gloda_id stuff"
