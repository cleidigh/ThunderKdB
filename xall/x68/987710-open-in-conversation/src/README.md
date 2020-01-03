# Open In Conversation

Thunderbird add-on to make the default message list action "Open Message in Conversation"

## How it Works

First, be sure you have message threading enabled (*View* > *Sort by* > *Threaded*). Then, right-click on a thread. Notice the option "Open Message in Conversation":

<img src="docs/context-menu-open-in-conversation.png" width="600">

Basically, this add-on makes that the default action when you press "Enter" or double-click a message.

This works best when you don't have the "multi-pane" layout (i.e. you open messages in a new tab instead of viewing them in a pane).

The window that opens contains not only the messages in the thread that are in your inbox, but also ones in other folders (so you can see sent messages in there too).

## Installation

Download [thunderbird-open-in-conversation.xpi](https://github.com/jhartz/thunderbird-open-in-conversation/raw/master/thunderbird-open-in-conversation.xpi). Then, in Thunderbird, go to *Tools* > *Add-ons*, choose *Extensions* in the pane on the left, click the gear drop-down, select *Install Add-on From File*, and choose "thunderbird-open-in-conversation.xpi".

For Thunderbird to be able to identify conversations, the setting *Enable Global Search and Indexer* needs to be enabled in *Preferences* > *Advanced* > *General*.

## License

This project is licensed under the Mozilla Public License version 2. For more, see the [LICENSE](LICENSE) file.
