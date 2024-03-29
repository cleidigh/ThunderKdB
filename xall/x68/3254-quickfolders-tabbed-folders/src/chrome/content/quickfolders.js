"use strict";
/* BEGIN LICENSE BLOCK

QuickFolders is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */

/*===============
  Project History
  ===============
	
	legacy history (0.9.3 - 3.14) moved to file: history_legacy.txt

=== 4.0 ===
	
  4.0 - 15/02/2015
    ### PREMIUM FEATURES
    ## [FR 25708] Allow customizing icons in Folder tree (Thunderbird only)
    ## [Bug 25645] Interface for adding custom Icons (16px*16px) to Tabs
    ## [FR 25825] quickMove feature - move mails to any folder by drag + entering name
		## [FR 23039] Support Line breaks to force Multiple Rows of Tabs 
		## [FR 24431] Optional Separators between tabs 
    ### FREE IMPROVEMENTS
    ## Allow dragging multiple folders to QuickFolders tab (Tb / SeaMonkey)
    ## Added "Download Now" Command for unsynchronized IMAP / Exchange folders.
		## Fixed [Bug 25697] - When clicked, tab is incorrectly flagged for invalid folder: this seemed to mainly affect Linux users on IMAP
		## Added new mail folder command: "Explore Folder Location..."
    ## Added prompt for subject line when sending support email
    ## Improved large font support and spacing, especially on current folder bar.
    ## Paint mode: holding CTRL while painting will advance to the next color, CTRL+SHIFT goes back to previous color
    ## Fixed: Active Tab font color wasn't set reliably if active tab palette differs from uncolored / standard tabs.
    ## Fixed [Bug 25722] Hover Tab color is overwritten when right-clicking a Tab
    ## Fixed [Bug 25721] Drag Over Color not working in 2 Color mode
    ## Fixed: In some cases QuickFolders loaded the default font color if the user has stored 
              certain color value (due to wrong use of prefHasUserValue)
	  ## Fixed: QuickFolders.Worker is undefined (quickfolders-filterWorker.js Line: 157)
    ## Fixed: Recent folder menu shows encoded path decreasing readability
    ## Fixed: Sometimes tabContainer.selectedIndex can be uninitialized leading to the set current folder failing (when clicking a QF tab)
    ## Fixed [Bug 25824] In Ubuntu, QuickFolders Toolbar color cannot be set
    ## Improved Current Folder bar in Single Message window. (Styling + moving through messages)
    ## Feature Request [Bug 25513] Mark message as read when moving: toggle extensions.quickfolders.markAsReadOnMove to true for this behavior
    ## Feature Request [Bug 25856] 'Display total number of messages' on a per button basis
    ## [Bug 25941] : drag to new folder on IMAP fails
    ## Added configuration setting for folder navigation buttons and hide by default to simplify
    ## Show subfolders in popup menus is now activated by default (extensions.quickfolders.showSubfolders)
    ## removed retired Thunderbird overlays (appversion<12)
    ### VISUAL IMPROVEMENTS
    ## Night Vision Palette for dark themes
    ## Revised Standard and Pastel Colors
    
	4.0.3 QuickFolders Pro final release - 07/03/2015
    ## [Bug 25939] Hide current folder tab in single message tab
    ## modify "Find Folder" Icon to tie in with quickJump feature
    ## simplify Options Icon
    ## add option to hide prev/next/parent buttons in current Folder bar
    ## add tooltips to current folder previous and next sibling
    ## QuickFolders label autohide?
    ## Add a (?) Icon and link beside the Filter button in Options to link to quickFilters!
    ## Use UITourHighlight (http://mxr.mozilla.org/mozilla-central/source/browser/base/content/browser.xul#241)
    ## or something similar to highlight new UI features
    ## Investigate how Preferences.loadFolderEntries() works when the results are not assigned to Model.selectedFolders
		
  4.1.1 QuickFolders Pro - 17/07/2015
    ## [Bug 26021] Postbox 4.0 Compatibility
    ## [Bug 26019] Premium feature - Added "Reading List" for storing bookmarks for important mails
    ## quickMove / quickJump - made shortcut less "greedy" so that CTRL+SHIFT or ALT+SHIFT do not trigger it. 
       But also allow more areas to use the shortcut from (folder tree, accounts tree [Postbox], conversation view)
       Improved the quickJump by accepting start text for ALL words in string (So if you type "mil" you can jump into the 
       folder "Steve Miller" by hitting Enter instantly, provided there is only 1 find result)
    ## Postbox / SeaMonkey - display the Icons menuitem on the QuickFolders Commands interface 
       (this doesn't support icons in the folder tree, but on the tabs themselves)
    ## Added Slovenian locale {thanks to Peter Klofutar - Babelzilla.org}
    ## "Remove from current category" had a bug that showed all categories if the FIRST category was removed from a Tab
    ## [Bug 25991] Disambiguate folders shown in quickMove Name Box 
        - added configuration options for the quickJump / quickMove results
        - increased default depth to 3 and include Account by default 
    ## Changed default of recentfolders.folderPathDetail to 2 
    ## [Bug 25864] By default, unread subfolders aren't highlighted. changing the defaults to make this simpler:
               [x] Also display totals of subfolders - true
               [x] Highlight Folders with new mail - true
               [x] Display Tabs with newly arrived mail italic
    ## Bugfix: Removed side effect that overwrites naming conventions of new filters created with quickFilters.
    ## [Bug 26046] Thunderbird 38 does not show customized Icons in folder tree
    ## Made highlighted new mail better readable
    ## Fixed: when mails are "queued" for a quickMove operation, using the keyboard shortcut "quickJump" temporarily 
       should not move the mails but navigate to the folder instead
    ## Fixed background color selection in Postbox when palette menu is used in options screen
    ## Added colored bottom line in Postbox in flat theme and interface to change its height.
    ## Bling: fixed gradient colors for uncolored inactive tabs in striped mode
       made text colors more consistent for striped tabs
       disable transparent / striped options when appropriate
       in striped mode, do not change color+background color when selecting a new color for inactive tab
    ## Postbox: when opening a single message window from search results, current folder bar is not initialized correctly
      
  4.2 QuickFolders Pro - 20/10/2015
    ## added support for domain licenses!
    ## [Bug 26065] - context menu disappears; in some rare cases the popup menus which are displayed on the first drag 
                     of a message to a QF tab will not be shown again until Thunderbird is restarted. Probably caused 
                     by an optional debug output.
    ## Fixed: Added support for brighttext themes - Dark Themes with [brighttext] attribute caused a 
              QuickFolders toggle button icon to break
    ## Support quickMove shortcuts from search results window (glodaList)
    ## Created Shim to avoid warnings: "JavaScript 1.6's for-each-in loops are deprecated;" without crashing Postbox
    ## [Bug 26070] = quickCopy - like quickMove but only copying an mail
    ## [Bug 26071] = Hotkey to toggle folder pane  ( F9 )
    ## [Bug 26088] = quickJump/quickMove Added support for searching child folders - add / search for children

  4.3 QuickFolders Pro - 02/01/2016
    ## Allow Tab Category of "Never" - Folder Aliases that only show up in quickMove / quickJump
		## [Bug 26116] Fixed: Tab Specific properties panel always jumps to primary screen.
    ## [Bug 25682] Allow displaying multiple categories concurrently  (Premium Feature)
		## Advanced Tab Properties: allow setting default identity and recipients (Premium Feature)
		## Version History doesn't show Donate reminders for Pro Users anymore 
		   (Javascript in browser / browser tabs must be enabled)
		## Remember last Settings Tab, even when closing window with Cancel button
		
  4.4.2 QuickFolders Pro - 21/02/2016
	  ## Compatibility fixes for Thunderbird 44.0 - 46.0
		## Increased minimum version to 34.0
		## [Bug 25941] Implemented new method "Drag to New Folder..." on Tabs for IMAP accounts (Thunderbird only; Postbox doesn't support asynchronous tasks yet)
		##             wrote some fix for the (timer-based) old code for Postbox
		## [Bug 26149] New Folder should be shown in Recent Folders history
		## Added selection box for not asking to go to next unread folder
	  ## Stop showing donation screen on upgrade for Pro Users - the logic was reversed in previous version
		## SeaMonkey: Fixed Error "Main is Null" when options is opened without visible mail window
		## [Bug 26150] quickJump - create child folder command [Premium Feature]
		## [Bug 26156] When creating a new subfolder it doesn't always show in Recent folder list
		## [Bug 26157] Add special icon for Deleted folders in recent folders list
		
  4.5 QuickFolders Pro - 24/07/2016
		## [Bug 26224] Dragging emails to quickfolder tab broken in Tb 48.0
		## [Bug 26223] Thunderbird 45.0: Notification Window is Larger and in workspace 
		## [Bug 26227] If none of the keyboard shortcuts in general settings are active, quickJump / quickMove keys will also not work.
	  ## [Bug 26178] Creating a new folder using the quickMove method (POP3) doesn't add this to the top of the recent folder list
		## [Bug 26202] Shift-[Key] shortcuts interferes with Thunderbird Conversations Addon
		## [Bug 26258] Postbox: collapsed accounts are not switched when clicking account tab
		
	4.6 QuickFolders Pro -  26/11/2016
		## [Bug 26283] add matches from quickfolders tabs for creating new subfolders
		## Relinked to new support site at quickfolder.org
	  ## Support copying and pasting the folder tabs definitions in order to edit them in a text editor.
		## Support for Postbox 5
		## Made coloring + styling (flat style) more reliable in SeaMonkey
		## Platform modernization: replaced old dragdrop events with drop events.
		## Ensured Compatibility with Fossamail 26.
		## New function for opening the folder of current mail
		
	4.7 QuickFolders Pro - 20/02/2017
	  ## [Bug 26313] Dragging quickfolder tabs (to re-order) broken in Tb 50.0b3
	  ## Added autocollapse function for Categories dropdown (Options > Advanced)
		## [Bug 25764] Add Configurable Button to Repair the Current Folder
		## [Bug 26268] Make popup menus for quickMove path wider
		## Completed Simplified Chinese Locale - thanks to YFdyh000 and Loviny at Babelzilla.org
		## [Bug 26321] 'Unreachable code after return statement'
		## [Bug 26323] Remove unnecessary padding on left of QuickFolders tab labels
		## Added Version number to subject line in Options / Support Tab / Contact Me
		## [Bug 26336] Confirmation to "Switch to Domain license?" is hidden behind options dialog.

	4.7.1 QuickFolders Pro - 01/03/2017
    ## [Bug 26346] On drag & drop, mouserollovered tabs' submenus do not close
		## [Bug 26348] Striped Style was permanently disabled.
		
	4.8 QuickFolders Pro - 27/11/2017
    ## [Bug 26439] Thunderbird 57 hangs on start with quickFilters enabled
		## [Bug 26452] Moving Mail to new folder fails when the (quickFilters) Filter Assistant is enabled.
	  ## [Bug 26372] After entering License Key Tabs are not displayed anymore
		## [Bug 26389] Single Mail Tab: clicking the current folder on Toolbar should open it.
		## [Bug 26387] 'Color is null' error in Linux when options window is opened.
		## [Bug 26409] quickMove - create new subfolder not working in empty parent. 
								   make it possible to create new subfolders using quickMove by 
									 entering parentFolder/New Folder even if the parent Folder has 
									 no child folders yet.
		## [Bug 26453] Seamonkey: The last selected QuickFolders Category is not Remembered.						 
		## ONGOING: Removing / Forking Deprecated code in preparation for the next big Thunderbird release (57+)
		
	4.8.1 QuickFolders Pro - 14/12/2017
	  ## [Bug 26454] Pro License screen - account dropdown not populated
		## [Bug 26455] Cannot paste folder tabs in Postbox
		## (Thunderbird & Postbox only) Improved Premium Feature Notifications to always show 
		## in a sliding notification bar on main window and not as Messagebox 

	4.8.2 QuickFolders Pro - 20/12/2017
	  ## emphasize Renew button (dark purple background, slight animation of background opacity)
		## improved display of expiry date better, days expired in tooltip

	4.8.3 QuickFolders Pro - 25/12/2017
	  ## translation updates
		## xmas days special sale 25% off
		
  4.9 QuickFolders Pro - 11/03/2018
		## [Bug 26470] Make QuickFolders compatible with Postbox beta 5.52 (modern Gecko build)
		## [Bug 26489] ESR 2018 readiness - Make QuickFolders compatible with Thunderbird 60
		## tidy up (don't show) own filter notification when quickFilters is installed.
		## Postbox: fix displaying advanced / debug settings when right-clicking some options / debug checkbox 
		## [Bug 26473] Added toolbar button to create subfolder (within the current folder)
		## [Bug 26474] "Tab-Specific Properties ..." Add Option to apply mail settings to subfolders
		## [Bug 26475]  Added Navigation Button "Skip to next Unread Folder" on Current Folder Toolbar.
		##     Leaves current folder even if it has unread 
		##     messages and continues to the next unread message in the next unread folder.

		## Allow asynchronous creation of subfolders during quickMove / quickJump in 
		##       new Postbox builds (5.52 and later, supporting Task)
		## Added Spanish locale {thanks to strel - Babelzilla.org}
		## Filter Assistant: remove unnecessary notification box if quickFilters is installed
		## Advanced Tab colors (postbox) temporary fixes with !important - see Interface.addCustomStyles()
		## Stability fixes around Util.CurrentFolder
		## [Bug 26481] Reading List: click on bookmarked mail should switch to already open mail Tab
		
	4.9.1 QuickFolders Pro - 13/03/2018
	  ## Decided to leave button on screen but serve premium notification on use
		## [Bug 26475] Improved toolbar icon for Tb 54.*
		
	4.10 QuickFolders Pro - 25/06/2018
	  ## Improved go to next unread folder to always go to first unread email 
		   (and not last current position in folder)
		## [Bug 26507] Colors menu should only be available on themes supporting it
		## [Bug 26514] Remove the QuickFolders Tab when deleting folder from its menu.
		## Fixed version links from Options dialog to support site to avoid showing promotions to Premium Users
		## [Bug 26517] Support moving multiple folders using Drag + Drop
		## Moderenised icon for photon look (Thunderbird 60)
		## Improved brighttext behavior + Apple Pills theming
		## Automatic Sanitizing of CSS values for Tab Specific custom CSS and current folder toolbar CSS strings
		
		
  4.11 QuickFolders Pro - 16/10/2018
		## [Bug 26565] Execute quickJump / quickMove with [Enter] if unique match
		## Added configurable shortcut for "Skip Unread Folder" (Premium Feature)
		## Some full themes (e.g. Nuvola) do not display the check mark for advanced tab properties
		## Redesigned (largely monochrome) toolbar icons for Photon look; includes improved brighttext support
		## Moved links from addons.mozilla.org to addons.thunderbird.net
		## Improved "unread email count" display by using Triangle instead of Plus sign [+]
		## [Bug 26570] only show "Mark Folder Read" command if folder has unread mails
		## [Bug 26571] option to hide QuickFolderes command submenu. 
		## Added an option to disable the "Open in New Tab" function.
		## Fixed getOrCreateFolder (creating folders asynchronously) for Thunderbird 60
		## [Bug 26566] Thunderbird 60 doesn't show custom icons in folder tree
		## [Bug 26575] Thunderbird 60: QF context menus broken.
		## Removed palette color names for stability
	
  4.11.1 QuickFolders Pro - 29/10/2018
	  ## [Bug 26592] 	Recent Folder items not working in Thunderbird 52 
		## [Bug 26590] 	Broken context menu command/s (Empty Junk...)

  4.12 QuickFolders Pro - 23/11/2018
		## [Bug 26602] PREMIUM FUNCTION: quickMove - prefill last folder option
	  ## Folder Tree Icons not shown in Thunderbird 52.9.1
		## [Bug 26600] Newly created folders should show up in Recent folders.
		## SeaMonkey: Added Repair Tree icons command to tools menu, changeed position of Current Folder Bar
		
	4.12.1	QuickFolders Pro - 03/12/2018
	  ## [Bug 26612] Tb 60.3.2 only displays first row of tabs
		## Russian Translation complete - thanks to Anton Pinsky and Solokot @ Babelzilla
		
  4.13.2 QuickFolders Pro - 25/02/2019
		## [Bug 26616] folder tree icons of folders without tab don't persist between sessions
		## removed code that automatically showed donation tab on update. Repurposed donate buttons for selling licenses.
		## [Bug 26644] High CPU usage caused by "Renew License" button.
		## fixed gradients to show correctly in Interlink Mail Client.
		## Added logic for extending license before expiry
		## Added platform specific style loading routine
		## Improved license parsing to make resilient against bad line break conversions
		
	4.13.3 Interlink only release - 27/02/2019
	  ## Fixed issue with legacy Iterator which is called for Application with Platform Version < 13
		##   which caused the quickMove / quickJump search function to malfunction - Interlink Only.
		
  4.13.4 QuickFolders Pro - 02/03/2019
    ## [Bug 26646] Error on Thunderbird start: ensureStyleSheetLoaded failed.

	4.14 QuickFolders Pro - 25/03/2019
	  ## [Bug 26645] Moving IMAP folders within the tree cuts off QF tabs
		## Fixed: No context menu was shown When right-clicking the current folder tab in Thunderbird 52
		   unless user executed double click .
		## Improved quickMove / quickJump actions: you can now enter multiple forward slashes to determine a chain of parent folders. 
		## Also moved "create new subfolder" entry to bottom and removed ... entry when any other entries are available.
	  ## Show the "already have a license" button on the registration screen when the license key is expired.
		## Tab Categories: replaced deprecated listbox with richlistbox
		## When selecting Folder Aliases (Never Show) from the Categories box, items that are categorized "Always show" 
		   are also displayed. from now on QuickFolders will not show the "Always" Item when "Folder Aliases" Category
			 is selected.
		## Support deleting multiple Categories from Category box. please only select Categories
		   you have defined yourself - you cannot select the built in categoires (Always / Never / Uncategorized)
			 in a multiple selection/
		## When deleting *all* user defined categories, the categories box was not hidden. I wrote a tidy up
		   routine that resets any tab that may lead to this problem (remove Show Always category from all tabs)
			 
	4.14.1 QuickFolders Pro - 24/04/2019
	  ## [Bug 26654] quickMove shortcuts triggered during in-mail search
		## replaced className logic with classList, where possible
		## quickMove: Improve remembering all entered parent folders when only a single match is found
		## Removed deprecated getCharPref: make remembering folder tabs preferences backwards 
		   compatible for older clients (Interlink) by using getComplexValue / getStringPref instead 
			 (getCharPref could lead to faulty characters when using extended character sets)
		## Japanese locale completed - thanks to Masahiko Imanaka 
		## Fixed: Message Navigation Buttons in Current Folder bar could not be hidden via options.		
		
	4.15 QuickFolders Pro - 21/05/2019
	  ## Option for lightweight theme integration - current folder bar can be skinned by theme
		## options for tweaking spacings around current folder bar
		## [Bug 26659] Advanced Tab Props - address options falsely always applies to subfolders 
		## [Bug 26665] quickMove: always support [Enter] to select the top item
		## quickMove: added [Up] key for immediately jumping to bottom of the list
		
		## => backported features into 4.12.2 for Interlink
		
	4.15.1 QuickFolders Pro - 04/06/2019
	  ## [Bug 24468] backup & restore functions
	  ## [Bug 26670] Improved keyboard navigation: ALT+DOWN for context menu
		
	4.15.3 QuickFolders Pro - 17/06/2019
	  ## [Bug 26671] Only one row of tabs after update to QuickFolders 4.15.1 - this can also lead to trailing tabs missing on screen.
		
	4.15.4 QuickFolders Pro - 09/07/2019
	  ## [Bug 26680] Create subfolder command with "/" stopped working
		
	4.15.5 QuickFolders Pro - 14/08/2019
		## [Bug 26681] On Current Folder Tab, "Mark Folder Read" is not displayed
		## Thunderbird 68 - the categories dialog does not show any categories
		   deleting the last one can make the folder tabs invisible if it is currently selected
		## removed 1px gap under QF tabs that shows in Thunderbird 68
		## Fixed some problems with deleting categories - 
		## Domain license renewal gave the wrong link when the green button (renew license)  was clicked
		   fixed to direct to https://sites.fastspring.com/quickfolders/instant/quickfoldersrenew
			 
	4.16 QuickFolders Pro - 01/09/2019
	  ## [Bug 26692] Advanced tab property - Option to omit specific folders from quickMove / quickJump results
		## Improved look of search box and current folder bar background to match standard theme backgrounds
		## [Bug 26694] Thunderbird 68 - Subfolder menus do not expand 
		## Thunderbird 68 - Fixed: creating new subfolders from QF menus fails because XPCOMUtils.generateQI was removed in Thunderbird 68
		## [Issue 4] - Thunderbird 68 - Entering text in quickMove / quickJump field doesn't show suggestions while typing 
		##             this was caused by removed xbl bindings for search boxes

  4.17 QuickFolders Pro - 04/11/2019
    ## [Bug 26703] Add option to hide mail commands popup menu
    ## [issue 7] font color in striped mode ignored on colored tabs
		## [Bug 26683] Advanced tab property: set moved emails to UNREAD. 
	  ## Tb68 regression: number fields are displayed too wide after preferences.css had to he removed
    ## The filter template dialog isn't shown properly in Thunderbird 68 - generally 
       I would recommend to install quickFilters instead.
       
  4.17.1 QuickFolders Pro - 06/11/2019
	  ## Tb68 regression: when the shortcuts combinations SHIFT+S, SHIFT+M, SHIFT+J are used in 
       the quick filter search field, they are accidentally executed. This is because some 
       input types have changed in Thunderbird 68 following deprecation of XUL elements.
	  ## [Issue 11] - in 4.17, Thunderbird 60.* the quickMove / quickJump function did not
       bring  up any search results. Caused by swapping out the type="search" attribute
       for is="search-textbox" (usage with the newer search-textbox control)
		
    
  4.17.2 QuickFolders Pro - 21/11/2019
    ## [issue 13] Setting Mail Headers according to advanced tab settings (such as from or to address) is not working since Thunderbird 68
       
  4.17.3 QuickFolders Pro - 26/11/2019
    ## [issue 14] Gray area shown below email list when starting Thunderbird in wide view
       with Current FOlder Toolbar hidden
    ## [issue 15] Current Folder Bar background styling is ignored in Thunderbird 68
    ## [issue 16] Avoid showing current folder toolbar at bottom of screen in column view
       ideally it should be shown as vertical bar between thread pane and preview.

  4.17.4 QuickFolders Pro - 29/11/2019
    ## Removed unnecessary error console warning from simplified setElementStyle() function
    ## Added Alt + Up as navigation shortcut to go to parent folder.
    ## Sometimes the current folder bar shows an incorrect subfolder menu (from a previously 
       visited folder) - fixed by forcing it to rebuild every time a differnt folder is visited.

  4.17.5 QuickFolders Pro - 27/12/2019
    ## [issue 18] Allow single-key keyboard shortcuts for Navigation
    ## [issue 3] Mark messages READ in folder and all its subfolders tree "in one click"
    
  4.18 QuickFolders Pro - 04/06/2020
    ## [issue 27] Drag to Create New Subfolders from tab, folder names with space fail, (encoded as %20 / leading to duplicates) 
    ## I also added trim() function to cut off spaces at end / start when email names are pasted
    
  4.18.1 QuickFolders Pro - 07/06/2020
    ## [issue 20] Change default for QuickFolders Toolbar to be on the bottom
    ## [issue 34] {Create Option to} make QuickFolders appear at the Bottom of Other Toolbars
    
  === FORKED CODE BASE FOR THUNDERBIRD 78 ===
  
=== 5.0 ===  
    
  5.0 QuickFolders Pro - 17/11/2020
    ## [issue 8] Make QuickFolders compatible with Thunderbird 78 ESR
    ##         - Converted to mail extension with experimental APIs (using WindowLoader) as required by the new Mozilla "non-legacy" model
    ##         - Removed nsIRDFService dependencies
    ##         - rewrote preference bindings in all dialogs
    ##         - Added new Thunderbird 78 compatible Icons (svg)
    ##         - rewrote search algorithm for missing mails in reading list
    ##         - Klaus Buecher (@Opto) did the initial conversion of all XUL interfaces
    ##           and fixed some bugs. John Bieling (funded my Mozilla) helped with 
    ##           the WindowLoader implementation and fixin the broken preferences
    ## Known issues:
    ##  - any dragover styling (special color, dropmarkers when moving tabs around) is now removed
    ##
    
  5.1 QuickFolders Pro - 10/12/2020
    ## [issue 72] Category "_Uncategorized" will show all categories after moving a folder to another category
    ## [issue 76] Recent Folders List does not updated until TB closed and reopened
    ## [issue 80] Recent Folders list not updated when moving email using drag and drop
    ## [issue 79] Drag over color + Dropmarkers when reordering Tabs not working
    ## [issue 81] Current Folder Toolbar display - text is always black
    ## [issue 84] Can't drag envelope icon in Navigation bar (a.k.a. Current Folder) to a folder / QuickFolder drop target
                  also the Navigation Bar is hidden if multiple mails or a thread is selected.
    ## Hide option to extend license if it is already more than 1 year into the future.
    ## Hide popup screen for licensed users who have > 40 days left on their license
    ## removed Encryption test code from options.js
    ## validateFilterTargets moved to other module to avoid console errors
    ## In the dialog "change order of tabs" the Up and Down labels on the buttons were not rendered 
    ## Improved legibility of dropdown items in themed  QuickFolders options dialog
    ## Improved reopening any support sites already open in a tab by jumping to the correct place if necessary

  5.2 QuickFolders Pro - 22/01/2021
    ## [issue 91] Improvement: QF advanced properties setting "from identity" : set "Reply-to" address accordingly
                  also spawned some improvements in SmartTemplates [issue 108] where text blocks were duplicated
                  by setting the from identity
    ## [issue 92] do not apply To address from advanced tab propertiues when replying to an email!
    ## [issue 94] Tb78: fixed - Tab-specific properties were displayed in incorrect screen position 
    ## [issue 75] support moving folders using the quickMove button
    ## [issue 96] Drag'n'drop issue in TB 85 beta.
    ## [issue 23] quickMove aborts with "Nothing to do: Message is already in folder" if the first mail in the selection 
                  is already in target folder. 
                  This may happen if you drag mails from a multi-folder view such as a search results window.
                  It can also happen if you execute the quickMove command after a while and you (or a filter)
                  have moved some of the mails to the target folder already.
    ## Hide referrer field in license purchase window
    
    
  5.3 QuickFolders Pro - 22/02/2021
    ## [issue 106] Tb78: backup does not save general / advanced / layout settings
    ## [issue 108] Some changes in options window are ignored and not stored
    ## [issue 111] Paint Mode is not working in Thunderbird 78
    
    ## [issue 101] If multiple categories are selected, closing QuickFolders settings reverts to "Show All"
    ## [issue 88]  Fixed highlighting of drop targets when dragging mails into a subfolder. This used to work in Thunderbird 68
    ## [issue 107] Restoring general / layout Settings only works if option for restoring folders also active
    ## [issue 109] Mark Messages read in Folder and the subfolders recursively not displayed as expected
    ## [issue 37] When no match is found using the "/" in quickMove box, display "No matching parent folders!" instead of "..."
    ## [issue 82] Improved sorting of search results during quickMove / quickJump
    ## [issue 110] "Tab-specific Properties" overwrites To Address when selecting to from AB
    ## [issue 112] Reading List menu - Add current Item not working
    
    ## [issue 114] Make QuickFolders compatible with Thunderbird beta 86.0b3
                   Removed grids from options screen to suport Thunderbird 86 and higher.
                   Using renamed function FtvItem for creating Recent folders list.

  5.4.1 QuickFolders Pro - 19/03/2021
    ## [issue 115] fix restoring of config values
    ## [issue 116] Custom Text color in tab-specific is not set on tab
    ## [issue 117] Add color picker for text color in tab-specific properties
    ## [issue 74] QuickMove: easily enable silent mode / disable notification
    ## [issue 118] Restrict quickMove results to current server
    ## [issue 119] quickJump list - option to list more than 25 search results, persistently
    ## [issue 103] quickMove now also supports copying folders. To copy a folder, 
                   hold down the CTRL key while you drop it on the quickMove button
                   
  5.4.2 QuickFolders Pro - 28/03/2021
    ## Added supoport for Thunderbird 88.0b1
    ## replaced Tb account-manager module with MailServices
    ## removed some of the excessive with from settings dialog
    
  5.5 QuickFolders Pro - 18/04/2021
    ## [issue 136] quickMove - no folder suggestions while viewing in searched list (search results / open msg in conversation)
    ## [issue 135] "/" for sub / parent folders should work for substring, not just prefix...
                   Added the possibility to ignore _ and space within folder names so that parent folders with 
                   prefixes such as "01_" or are composite of 2 terms with space e.g. "apple tree" can still be found.
    ## [issue 134] Feature Request: Escape key to "Cancel quickMove" completely
    ## changed folder tree shortcut from F7 to F9 (like in Thunderbird 68)
    ## [issue 132] In mail tab, quickMove reopens mail in new tab after moving -
                   this behavior is now disabled - see extensions.quickfolders.quickMove.reopenMsgTabAfterMove
                   instead Tb will open the next mail - see extensions.quickfolders.quickMove.gotoNextMsgAfterMove
                   
  5.5.1 QuickFolders Pro - 27/04/2021
    ## [issue 144] Mark folders + subfolders read stops at first generation (direct child folder) mails  
    ## Fixed tool dialog "change the order of tabs"
    ## Changed localization to web extension method. [mx-l10n]
    ##   removed the legacy way of localization
    ##   conversion of all dtd and properties files to messages.json
    ##   calling overlay localisation with i18n.js
    ## 	 replaced bundle strings - removed all instances of GetStringFromName
    ##   label dialog extra buttons manually after i18n.updateDocument

  5.5.2 QuickFolders Pro - 28/04/2021
    ## [issue 148] quickMove: parent folder containing an underscore not suggested as parent
    ## quickMove: character » is replaced with encoded unicode entry \u00BB in Create subfolder menu item (side effect 
       from converting localization to json in 5.5.1)
    ## In Thunderbird 89, the options menu item was not displayed in Add-ons Manager.
  
  5.6.4 QuickFolders Pro - 04/07/2021
    ## [issue 155] Support entering multiple words in a search string to find longer folder names that are composite
    ##             also support ">" for skipping folders.
    ##             added help panel for search
    ## [issue 150] New line characters "\n" displayed in some strings in version 5.5.2
    ## [issue 167] Unreadable colors of QuickFolders toolbar icons / font in Linux
    ## Added instruction text on empty toolbar which was missing since Thunderbird 78 migration
    ## licenser code migrated into background script
       TO DO: rename hasPremiumLicense() ==> hasValidProLicense()
              simplify Expired logic
    ## Removed many global functions that work in the last 3pane window and replaced them with event notifications
    ## uses the Notification Tool library and uses the background script (a mechanism of the new API based extensions model)
    ## this way all Thunderbird windows (if you work from multiple windows) will be update when you do one of the following actinos
    ## - rename a tab
    ## - move a tab position
    ## - delete a tab or remove it from or add it to a category
    ## - change the layout from the optiins dialog (themes, colors)
    ## - rename categories
    ## - change the theme / buttons of the Current Folder Bar
    ## - change options of where to display the Current Folder Bar (main window, message tab, single message window)
    ## - changes to the license when entered / validated
    ## All these actions now work simultaneously and update in multiple Thunderbird windows.
    
  5.6.5 QuickFolders Pro - 05/07/2021
    ## [issue 172] quickMove results pathes are only showing last 2 folders in path if only a single search word is entered.
    
  5.6.6 QuickFolders Pro - 11/07/2021
    ## [issue 177] Unreliable search if space and "-" characters are combined in the search string
    ## [issue 174] Fixed: QuickFolders toolbar was hidden in single message tabs by default.
       Removed obsolete setting extensions.quickfolders.toolbar.onlyShowInMailWindows and added UI for 
       hiding QuickFolders toolbar in single message tabs
    ## added experimental accounts which prevents a rare error on startup.
    ## [issue 176] Hide instructions on how to set up QuickFolders at startup (if tabs are already defined) 
    ## Proper removal of event listeners on shut down
    ## Improved icon for quickMove help
    ## [issue 179] use extensions.quickfolders.premium.findFolder.disableSpace=true to disable " " search + improve performance
    

  5.7 QuickFolders Pro - 10/08/2021
    ## [issue 187] Implement a QuickFolders Standard License
    ## [issue 184] Update Notice - "What's New button" is badly visible when using different QF theme than flat style
    ## [issue 166] 3rd party themes - Current folder toolbar colors are incorrect until Refresh visible tabs command
    ## [issue 186] Theming make some items in options screens hard / impossible to see 
       - improved visibility of dropdowns in options screen when using dark (and third party) themes
    ## [issue 185] On installation / sometimes restart or update of _other_ add-ons category is reset to "all"
                   Fixed by not removing the session store function when Add-on is removed within session (call to  QuickFolders.restoreSessionStore)
    ## Add keyboard support to selecting items from any recent folders menu.
    ## Added dedicated path for Thunderbird 91 specific style rules. (content/skin/tb91) - qf-options.css
    ## Removed old rsa module 
    ## default event for popupmenus changed from click to command to better support keyboard only navigation. [extensions.quickfolders.debug.popupmenus.folderEventType]
    ## [issue 114] Make QuickFolders compatible with Thunderbird 91. (ESR 2021/22)
    ## - Fixed the missing (and badly styled) [Buy License] button at the bottom of the options dialog. 
         this is done by loading a separate style sheet link element into the shadow DOM.
    ## - Fixed: showing the debug settings (and other advanced settings) via a small window that 
                filters "about:config" stopped working in Tb91.  
    ## - Fixed: missing icons on sliding notification bars
    ## - Removed deprecated fixIterators
    ## - [issue 189] Fixed: No longer able to move a message by dropping it on a quick folder tab
                     the function copyMessages was renamed in Tb91
    ## - [issue 190] Fixed dragging the envelope from current folder toolbar (Navigation bar)
    ## TO DO: review qf.notification.premium.text (remove "using it -permanently-") 

  5.7.1 QuickFolders Pro - WIP
    ## [issue 197] Instructions on empty toolbar get duplicated on folder change https://github.com/RealRaven2000/QuickFolders/issues/197
    ## [issue 198] Tb91 regression: Junk folder tab doesn't get focus when clicked (IMAP) - 
    ## [issue 199] Subfolders with with length of 1 character omitted from quickJump search results
    ## removed "workaround" experimental APIs (notifications, accounts)
    

    -=-----------------=-    PLANNED
    ## [issue 103] Feature Request: Support copying folders

   	TODOs
	=========
	qf-messenger: 68 load tools.xul, 78: load tools69 
	platform-css copy to content (not content/skin/something)
	CSS: textbox replace with html:input
	js: get by tag: replace textbox
    
	Future Work
	===========
  
    ## [issue 20] Add option to show QuickFolders tabs below main toolbar
    
	  ## [Bug 26400] Option to show QuickFolders toolbar at bottom of mail window
		## [Issue 3] mark messages READ in folder and all its subfolders tree "in one click"
		

    
    
	Known Issues
	============
		Thunderbird 66 compatibility - more to do for 67! https://privatebin.net/?2c1a1bcc9bebca9c#9Z15ZXr7zj+AOM4CUMDyQBasYCRPb8or+X0nvYcxzHM=
	
		## To Do: without quickFilters installed - the filter mode icon is not 
		          working with full themes (TT deepdark) and neither is filter assistant triggered when a mail
							is dropped in the folder tree.
		## in some themes / languages the icons on the advanced options tab may appear stretched vertically
		   styling max-height for #mailCommandsCustomize .checkbox-icon will also negativeely affect the
			 height for the attached .checkbox-label causing vertical overflows
	  ## changing palette of uncolored folder doesn't update font color (test with TT deepdark)
    ## [Bug 26559] Drag Menu Item to toolbar not creating new QF tab  (Phoenity)
    ## [Bug 26560] Drag Current folder to toolbar not creating new QF tab  (Phoenity)
		## currently you can only drag single emails to a file using the envelope icon in Current Folder Toolbar.
		## when using the DOWN key to go to the search results of find folder, DOWN has to be pressed twice. (Tb+Pb only)
		## search in SeaMonkey delays highlighting the current tab when switching to the folder.
		## when deleting the current folder we should change into the parent folder to avoid confusion 
		##      at the moment we are in the folder after it's moved to trash which makes it look as if 
		##      it still a useful folder (Postbox)
	
###VERSION###

  PRESS
	=====
 
  www.makeuseof.com/tag/10-must-have-thunderbird-addons-25-more/


  KNOWN ISSUES
  ============


  OPEN BUGS
  ============


	A complete list of bugs can be viewed at https://quickfolders.org/bugs.html
  PLANNED FEATURES
  ================
	- persist categories in separate JSON list for more flexibility (e.g. rename)
	- size of category dropdown should expand with length of list

  WISHLIST
  ========
	- drag to thread finds quickfolder with correct thread and drops message there


*/


// not sure whether (and how) to use defineModuleGetter() - does it work in Tb68??
if (typeof DeferredTask == "undefined")
  var {DeferredTask} = ChromeUtils.import("resource://gre/modules/DeferredTask.jsm");  
if (typeof DeferredTask == "undefined")
  var {Task} = ChromeUtils.import("resource://gre/modules/Task.jsm");  

	
/* GLOBAL VARIABLES */
var QuickFolders_globalHidePopupId="",
    QuickFolders_globalLastChildPopup=null,
    QuickFolders_globalWin=Components.classes["@mozilla.org/appshell/window-mediator;1"]
				.getService(Components.interfaces.nsIWindowMediator)
				.getMostRecentWindow("mail:3pane"),
    QuickFolders_globalDoc=document;

var QuickFolders_getWindow = function() {
	return QuickFolders_globalWin;
}

var QuickFolders_getDocument= function() {
	return QuickFolders_globalDoc;
}

var QuickFolders = {
	doc: null,
	win: null,
	WL: {},
  RenameFolders_Tb: null,
	isQuickFolders: true, // to verify this
	_folderTree: null,
	get mailFolderTree() {
	  // replaces TB2 only helper method GetFolderTree()
		if (!this._folderTree)
		  this._folderTree = QuickFolders.Util.$("folderTree");
		return this._folderTree;
	},
	// keyListen: EventListener,
  folderPaneListen: false,
	_tabContainer: null,
	get tabContainer() {
		if (!this._tabContainer) {
			const util = QuickFolders.Util;
      let d = this.doc || document;
      this._tabContainer = 
        d.getElementById('tabmail').tabContainer || d.getElementById('tabmail-tabs');
				
		}
		return this._tabContainer;
	},
	currentURI: '',
	lastTreeViewMode: null,
	initDone: false,
	compactReportFolderCompacted: false,
	compactReportCommandType: '',
	compactLastFolderSize: 0,
	compactLastFolderUri: null,
	selectedOptionsTab : -1,// preselect a tab -1 = default; remember last viewed tab!

	//for testing
	debug_log: function debug_log(ev) {
    const prefs = QuickFolders.Preferences;
    if (prefs.isDebug)
      console.log("DnD " + ev);
	},
  
	// helper function to do init from options dialog!
	initDocAndWindow: function initDocAndWindow(win) {
    let util = QuickFolders.Util,
		    mainWindow;
    if (win && win.document && win.document.documentURI.indexOf('/messenger.xhtml')>0)
      mainWindow = win;
    else if (win && win.document.documentURI.indexOf('/messageWindow.xhtml')>0)
      mainWindow = win; // allow passing in single message window also
    else {
      if (win || (!win && window.documentURI.indexOf('/messageWindow.xhtml')==-1))
        mainWindow = util.getMail3PaneWindow();
    }

		if (mainWindow) {
			QuickFolders_globalDoc = mainWindow.document;
			QuickFolders_globalWin = mainWindow;
		}
		else {
			QuickFolders_globalDoc = document;
			QuickFolders_globalWin = window;
		}
    this.doc = QuickFolders_globalDoc;
    this.win = QuickFolders_globalWin;

		util.logDebug ("initDocAndWindow()\nQuickFolders_globalDoc = " + QuickFolders_globalDoc.location);
	},

	initDelayed: async function initDelayed(WLorig) {
    const Cc = Components.classes,
					Ci = Components.interfaces,
					prefs = QuickFolders.Preferences,
					util = QuickFolders.Util,
					QI = QuickFolders.Interface;
	  if (this.initDone) return;
    
    // from the time we passed in the window as win
    let win = window;
    
    if (WLorig)
      QuickFolders.WL = WLorig;
      
    let sWinLocation,
	      nDelay = prefs.getIntPref('initDelay');
	  
    QuickFolders.initDocAndWindow(win);
	  nDelay = nDelay? nDelay: 750;
	  sWinLocation = new String(win.location);
        
    if (QuickFolders.isCorrectWindow(win)) {
			util.logDebug ("initDelayed ==== correct window: " + sWinLocation + " - " + win.document.title + "\nwait " + nDelay + " msec until init()...");

			win.setTimeout(function() { 
        QuickFolders.init(); 
      }, nDelay);
      
      let folderTree = QuickFolders.mailFolderTree;
      // add an onSelect event!
      folderTree.addEventListener("select", QuickFolders.FolderTreeSelect, false);
			// [Bug 26566] - Folder Tree doesn't show icons
			let vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
      let time = prefs.getIntPref('treeIconsDelay');
      util.logDebug("Repair Icons for "  + util.Application  + " " + util.ApplicationVersion + " in " + time/1000 + " sec...");
      win.setTimeout(
        function () {
          util.logDebug("Repair Icons:");
          QI.repairTreeIcons(true); // silently
        }, time
      );
			
      util.logDebug("Adding Search Input event handler...");
      let findFolderBox = QI.FindFolderBox; // #QuickFolders-FindFolder
      if (findFolderBox) {
        findFolderBox.addEventListener("input", function() {
            QI.findFolderName(findFolderBox);
          }
        );
      }
      else {
        util.logDebug("element not found: QuickFolders-FindFolder");
      }
			
			this.initDone=true;
		}
	} ,


  initSingleMsg: async function(WLorig) {
    const prefs = QuickFolders.Preferences,
					util = QuickFolders.Util,
					QI = QuickFolders.Interface;
    let win = window;
    
    if (WLorig)
      QuickFolders.WL = WLorig;    
    
    try {
      
      let doc = win.document; // in case a stand alone messageWindow is opened (e..g double clicking an eml file)
      let wt = doc.getElementById('messengerWindow').getAttribute('windowtype');
      util.logDebug ("initSingleMsg() window type(messengerWindow): "
          + wt
          + "\ndocument.title: " + doc.title )

      if (wt === 'mail:messageWindow') {
        util.logDebug("QuickFolders.initSingleMsg() - Calling displayNavigationToolbar()");
        QuickFolders.Interface.displayNavigationToolbar(prefs.isShowCurrentFolderToolbar('messageWindow'));
        // set current folder tab label
        if (win.arguments) {
          let args = win.arguments,
              fld;
          // from messageWindow.js actuallyLoadMessage()
          if (args.length && args[0] instanceof Components.interfaces.nsIMsgDBHdr) {
            let msgHdr= args[0];
            fld = msgHdr.folder;
          }
          
          let cF = QuickFolders.Interface.CurrentFolderTab;
          // force loading main stylesheet (for single message window)
          QI.ensureStyleSheetLoaded('quickfolders-layout.css', 'QuickFolderStyles');
          if (fld)
            QI.initCurrentFolderTab(cF, fld);
          QI.updateUserStyles();
        }
      }
      else {
        util.logDebug('window type : ' + wt);
      }
    }
    catch(e) { 
      if (prefs.isDebug)
        util.logException('QuickFolders.initDelayed()', e) ;
    }  //-- always thrown when options dialog is up!
  },
  
	isCorrectWindow: function isCorrectWindow(win) {
		try {
			return win.document.getElementById('messengerWindow').getAttribute('windowtype') === "mail:3pane";
		}
		catch(e) { return false; }
	} ,
  
  // rename folder - Thunderbird
  renameFolder: function qf_rename(aFolder) {
    let folder = aFolder || gFolderTreeView.getSelectedFolders()[0];

    //xxx no need for uri now
    let controller = gFolderTreeController; // this
    function renameCallback(aName, aUri) {
      if (aUri != folder.URI)
        Components.utils.reportError("got back a different folder to rename!");

      controller._tree.view.selection.clearSelection();
      // QuickFolders specific, payload on RenameCompleted
      QuickFolders.FolderListener.newFolderName = aName;
      QuickFolders.FolderListener.oldFolderUri = folder.URI;
      // Actually do the rename
      folder.rename(aName, msgWindow);
    }
    window.openDialog("chrome://messenger/content/renameFolderDialog.xhtml",
                      "",
                      "chrome,modal,centerscreen",
                      {preselectedURI: folder.URI,
                       okCallback: renameCallback, 
                       name: folder.prettyName});
  },
     
	initKeyListeners: function () {
			const win = window,
			      prefs = QuickFolders.Preferences;
			// only add event listener on startup if necessary as we don't
			// want to consume unnecessary performance during keyboard presses!
			if (prefs.isKeyboardListeners) {
				if(!QuickFolders.Interface.boundKeyListener) {
					win.addEventListener("keypress", this.keyListen = function(e) {
						QuickFolders.Interface.windowKeyPress(e,'down');
					}, true);
					win.addEventListener("keyup", function(e) {
						QuickFolders.Interface.windowKeyPress(e,'up');
					}, true);
					QuickFolders.Interface.boundKeyListener = true;
				}
			}
	},
	
	initTabsFromEntries: function initTabsFromEntries(folderEntries) {
    const util = QuickFolders.Util,
		      that = this.isQuickFolders ? this : QuickFolders,
					QI = that.Interface; // main window Interface!
		
    util.logDebug("initTabsFromEntries()");
		if (folderEntries.length) try {
			let currentFolder = util.CurrentFolder;
			that.Model.selectedFolders = folderEntries;
			QI.updateUserStyles();

			let tabmail = document.getElementById("tabmail"),
					idx = QuickFolders.tabContainer.selectedIndex || 0,
			    tab = util.getTabInfoByIndex(tabmail, idx),
          tabMode = null; 
			if (tab) {
				tabMode = util.getTabMode(tab);
				// is this a new Thunderbird window?
				let cats;
				if (typeof (tab.QuickFoldersCategory) == 'undefined') {
					let lc = QuickFolders.Preferences.lastActiveCats;
					// if (currentFolder) {
						// select first (or all?) category of any tab referencing this folder
						// if there is an originating window, try to inherit the categories from the last one
						if (lc) 
							cats = lc;
						else
							cats = QuickFolders.FolderCategory.ALL; // retrieve list!
					// }
				}
				else
				  cats = tab.QuickFoldersCategory;
				
				util.logDebug("init: setting categories to " + cats);
				if (tabMode == "folder" || tabMode == "message") {
					// restore categories of first tab; set to "all" if not set
					QI.currentActiveCategories = cats;
				}
			}
			else {
				util.logDebug('init: could not retrieve tab / tabMode\n tab=' + tab);
      }
				
		}
		catch(ex) {
			util.logException('init: folderEntries', ex);
		}
    finally {
      QuickFolders.Util.notifyTools.notifyBackground({ func: "updateMainWindow", minimal: "false" }); 
      // selectCategory already called updateFolders!  was that.Interface.updateFolders(true,false)
      // make sure tabs not in active category are hidden - this at least doesn't happen if we load the extension from the debugging tab
      if (QI.currentActiveCategories) {
        util.logDebugOptional('categories', "forcing selectCategory");
        let bkCat = QI.currentActiveCategories; // force redraw by deleting it
        QI._selectedCategories = null;
        QI.selectCategory(bkCat);
      }
    }
	},

	init: function init() {
    const util = QuickFolders.Util,
		      that = this.isQuickFolders ? this : QuickFolders,
					QI = that.Interface, // main window Interface!
					Cc = Components.classes,
					Ci = Components.interfaces;
		let myver = that.Util.Version, 
		    ApVer, ApName,
        prefs = that.Preferences; 
    try{ ApVer=that.Util.ApplicationVersion} catch(e){ApVer="?"};
    try{ ApName=that.Util.Application} catch(e){ApName="?"};

    if (!QuickFolders.RenameFolders_Tb) {
      util.logDebug("Wrapping renameFolder...");
      // overwrite original function - we won't actualy use or restore this
			if (typeof gFolderTreeController !== 'undefined' && gFolderTreeController.renameFolder) {
				QuickFolders.RenameFolders_Tb = gFolderTreeController.renameFolder; 
				gFolderTreeController.renameFolder = QuickFolders.renameFolder.bind(gFolderTreeController);
			}
    }
    
		if (prefs && prefs.isDebug)
			that.LocalErrorLogger("QuickFolders.init() - QuickFolders Version " + myver + "\n" + "Running on " + ApName + " Version " + ApVer);

		// moved into Version Proxy!
		// that.Util.FirstRun.init();
		that.addTabEventListener();
		
		QuickFolders.initKeyListeners();
		
		// move out to allow reload / editing feature
		let folderEntries = prefs.loadFolderEntries();
		this.initTabsFromEntries(folderEntries);
		
		// only load in main window(?)
		if (QuickFolders.FolderTree)
			QuickFolders.FolderTree.init();

		that.Util.logDebug("QuickFolders.Init() - call displayNavigationToolbar.");
		// remember whether toolbar was shown, and make invisible or initialize if necessary
    // default to folder view
		QI.displayNavigationToolbar(prefs.isShowCurrentFolderToolbar(), ''); 
		// single Message
		QI.displayNavigationToolbar(prefs.isShowCurrentFolderToolbar('messageWindow'), 'messageWindow');

		// new function to automatically main toolbar when it is not needed
		that.Util.logDebug("call initToolbarHiding.");
		QI.initToolbarHiding();
		that.Util.logDebug("QF.init() ends.");
		// now make it visible!
		QuickFolders.Interface.Toolbar.style.display = '-moz-inline-box';
		
		if (QuickFolders.Preferences.getBoolPref('contextMenu.hideFilterMode')) {
			if (QuickFolders.Interface.FilterToggleButton)
				QuickFolders.Interface.FilterToggleButton.collapsed=true;
		}
    QuickFolders.addFolderPaneListener();
    
    // Reading list
    if (QuickFolders.bookmarks) {
      QuickFolders.bookmarks.load();
    }
    QuickFolders.initLicensedUI();
    QuickFolders.Interface.updateMainWindow(false);
    
	},
  
  // all main window elements that change depending on license status (e.g. display "Expired" instead of QuickFolders label)
  initLicensedUI: function initLicensedUI() {
    let State = QuickFolders.Util.licenseInfo.status,
        hasLicense = QuickFolders.Util.hasValidLicense();
    QuickFolders.Util.logDebug ("initLicensedUI - hasLicense = " + hasLicense + "\n licenseInfo:", QuickFolders.Util.licenseInfo);
    if (hasLicense) {  // reset licenser (e.g. in new window)
      QuickFolders.Util.logDebug ("License found - removing Animations()...");
      QuickFolders.Interface.removeAnimations('quickfolders-layout.css');
    }
    let menuRegister = document.getElementById('QuickFolders-ToolbarPopup-register');
    if (menuRegister) {
      switch (State) {
        case "Valid":
          menuRegister.classList.add('paid');
          menuRegister.classList.remove('free');
          menuRegister.label = QuickFolders.Util.getBundleString("qf.menuitem.quickfolders.register");
          break;
        case "Expired":
          menuRegister.label = "QuickFolders Pro: " + QuickFolders.Util.getBundleString("qf.notification.premium.btn.renewLicense") + "\u2026";
          menuRegister.classList.add('expired');
          menuRegister.classList.remove('free');
          break;
        default:
          menuRegister.label = QuickFolders.Util.getBundleString("qf.menuitem.quickfolders.register");
          menuRegister.classList.add('free');
      }
    }
    QuickFolders.Interface.updateQuickFoldersLabel.call(QuickFolders.Interface); // this is also called when udpating the main toolbar with QI.updateFolders()
  } ,

	sayHello: function sayHello() {
		QuickFolders.Util.alert("Hello from QuickFolders");
	} ,

	// handler for dropping folder shortcuts
	toolbarDragObserver: {
		get util() { return  QuickFolders.Util; } ,
		get prefs() { return QuickFolders.Preferences; } ,
		win: QuickFolders_getWindow(),
		doc: QuickFolders_getDocument(),
		debug_log: function debug_log(ev) {
      let type = ev.type || "",
          id = ev.target ? (ev.target.id || "") : "no target",
          txt  = ev ? (type + " " + id) : "";
			console.log("toolbarDragObserver:DnD " + txt) ;
		},
	
		canHandleMultipleItems: false,
		
		getSupportedFlavours : function () {
			let flavours = new FlavourSet();
			flavours.appendFlavour("text/x-moz-folder"); // folder tree items
			flavours.appendFlavour("text/x-moz-newsfolder");
			flavours.appendFlavour("text/unicode"); // buttons
			flavours.appendFlavour("text/currentfolder"); // custom flavour for dragging current
			return flavours;
		},
		

		dragExit: function dragExit(evt) {
      if (!evt)
        debugger;
			this.util.logDebugOptional("dnd","toolbarDragObserver.dragExit");
			if (QuickFolders_globalHidePopupId) {
				QuickFolders.Interface.removeLastPopup(QuickFolders_globalHidePopupId, this.doc);
			}
		} ,
		
		dragEnter: function qftoolbar_dragEnter(evt) {
      if (!evt)
        debugger;
			let t = evt.currentTarget,
          dTxt = "target: " + t.nodeName + "  '" + t.id + "'",
          ot = evt.originalTarget;
      if (ot) {
        dTxt += "\noriginal target:" + ot.nodeName + "  '" + ot.id + "'";
      }
			this.util.logDebugOptional("dnd","toolbarDragObserver.dragEnter - \n" + dTxt);
			if (ot && ot.nodeName.includes('arrowscrollbox')) {
        this.util.logDebugOptional("dnd","dragEnter on arrowscrollbox - creating scroll event");
        let event = document.createEvent('Event');
        setTimeout(
          function() {
            event.initEvent('scroll', true, true);
            ot.dispatchEvent(event);
          });
        return true;
      }
			evt.preventDefault();
			return false;
		},

		dragOver: function qftoolbar_dragOver(evt){
      if (!evt)
        debugger;
      evt.preventDefault();
	  
	  let dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession();

			let types = Array.from(evt.dataTransfer.mozTypesAt(0)),
          contentType = types[0];
			// [Bug 26560] add text/plain
			if (contentType=="text/x-moz-folder" || contentType=="text/unicode" || contentType=="text/plain" || contentType=="text/x-moz-newsfolder" || contentType=="text/currentfolder") { // only allow folders or  buttons!
				dragSession.canDrop = true;
			}
			else {
				dragSession.canDrop = false;
			}
		},
		
		canDrop: function canDropHelper(e,s) {
			try {
				// this.util.logDebugOptional("dnd","toolbarDragObserver.canDrop - Session.canDrop = " +  s.canDrop);
				if (this.prefs.isDebugOption('dnd') && (!s || s && !s.canDrop)) debugger;
				if (s) {
					s.canDrop = true;
				}
			}
			catch(ex) {};
			return true;
		},

		drop: function drop(evt, dragSession) {
      if (!evt) debugger;
      
      if (!dragSession) dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession();
      
			if (this.prefs.isDebugOption('dnd')) {
        debugger;
        QuickFolders.Util.logToConsole("toolbarDragObserver.drop() - dragSession = ", dragSession);
      }
			// let contentType = dropData.flavour ? dropData.flavour.contentType : dragSession.dataTransfer.items[0].type;
      let types = Array.from(evt.dataTransfer.mozTypesAt(0)),
          contentType = types[0];

			this.util.logDebugOptional("dnd","toolbarDragObserver.drop - " + contentType);
 			function addFolder(src) {
        if(src) {
          let msg="", maxTabs, warnLevel;
          if (!QuickFolders.Util.hasValidLicense()) { // max tab
            maxTabs = QuickFolders.Model.MAX_UNPAID_TABS;
            msg = QuickFolders.Util.getBundleString("license_restriced.unpaid.maxtabs",[maxTabs]);
            warnLevel = 2;
          }
          else if (QuickFolders.Util.hasStandardLicense()) {
            maxTabs = QuickFolders.Model.MAX_STANDARD_TABS;
            msg = QuickFolders.Util.getBundleString("license_restriced.standard.maxtabs",[maxTabs]);
            warnLevel = 0;
          }
          if (QuickFolders.Model.selectedFolders.length >= maxTabs
              && 
              !QuickFolders.Model.getFolderEntry(src)) {
            if (msg) { 
              // allow adding folder (to different category if tab already exists)
              // otherwise, restrictions apply
              QuickFolders.Util.popupRestrictedFeature("tabs>" + maxTabs, msg, warnLevel);
              QuickFolders.Interface.viewSplash(msg);
              return false;
            }         
          }
          
          let cat = QuickFolders.Interface.CurrentlySelectedCategories;
          if (QuickFolders.Model.addFolder(src, cat)) {
            let s = "Added shortcut " + src + " to QuickFolders"
            if (cat !== null) s = s + " Category " + cat;
            try{ QuickFolders.Util.showStatusMessage(s); } catch (e) {};
          }
        }
        return true;
			};

			QuickFolders.Util.logDebugOptional("dnd", "toolbarDragObserver.drop " + contentType);
			let msgFolder, sourceUri;

			switch (contentType) {
				case "text/x-moz-folder":
				case "text/x-moz-newsfolder":

					if (evt.dataTransfer && evt.dataTransfer.mozGetDataAt) { 
            let count = evt.dataTransfer.mozItemCount ? evt.dataTransfer.mozItemCount : 1;
            for (let i=0; i<count; i++) { // allow multiple folder drops...
              msgFolder = evt.dataTransfer.mozGetDataAt(contentType, i);
              if (msgFolder.QueryInterface)
                sourceUri = msgFolder.QueryInterface(Components.interfaces.nsIMsgFolder).URI;
              else
                sourceUri = QuickFolders.Util.getFolderUriFromDropData(evt, dragSession); // Postbox
              if (!addFolder(sourceUri)) break;
            }
					}
					else {
						sourceUri = QuickFolders.Util.getFolderUriFromDropData(evt, dragSession); // older gecko versions.
            addFolder(sourceUri);
					}

					break;
				case "text/currentfolder":
					// sourceUri = dropData.data;
          sourceUri = evt.dataTransfer.mozGetDataAt(contentType, 0);
					addFolder(sourceUri);
					break;
				case "text/plain":  // [Bug 26560]
				case "text/unicode":  // plain text: button was moved OR: a menuitem was dropped!!
					// sourceUri = dropData.data;
          sourceUri = evt.dataTransfer.mozGetDataAt(contentType, 0);
					let eType = dragSession.dataTransfer.mozSourceNode.tagName,
					    myDragPos,
					    target = evt.currentTarget;
					if (evt.pageX<120) // should find this out by checking whether "Quickfolders" label is hit
						myDragPos="LeftMost"
					else
						myDragPos="RightMost"
					if (eType === "menuitem" || eType === "menu") {
						addFolder(sourceUri);
					}
					else {
						if (!QuickFolders.Model.insertAtPosition(sourceUri, "", myDragPos)) {
							//a menu item for a tab that does not exist was dropped!
							addFolder(sourceUri);
						}
					}
					break;
			}
		}
	} ,

	// recursive popups have to react to drag mails!
	popupDragObserver: {
		win: QuickFolders_getWindow(),
		doc: QuickFolders_getDocument(),
		newFolderMsgUris: [],
		dragAction: null,

		getSupportedFlavours : function menuObs_getSupportedFlavours() {
			let flavours = new FlavourSet();
			flavours.appendFlavour("text/x-moz-message");
			flavours.appendFlavour("text/unicode");  // test
			flavours.appendFlavour("text/plain");  // [Bug 26560]
			
			// MOVE FOLDER SUPPORT
			flavours.appendFlavour("text/x-moz-folder"); // folder tree items
			return flavours;
		},
    
		dragOverTimer: null,
    
		dragEnter: function menuObs_dragEnter(evt, dragSession) {
      if (!evt) debugger;
      if (!dragSession) dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession();


			let popupStart = evt.target;
			const prefs = QuickFolders.Preferences,
			      util = QuickFolders.Util;
      
			util.logDebugOptional("dnd","popupDragObserver.dragEnter " + popupStart.nodeName + " - " + popupStart.getAttribute('label'));
			try {
				evt.preventDefault(); // fix layout issues in TB3 + Postbox!

				let pchild = 
				  Array.from(popupStart.children).find(e => e.tagName.toLowerCase()=="menupopup");
				  // popupStart.firstChild; Thunderbird 60
				if (pchild) {
					// hide all sibling popup menus
					let psib = popupStart.nextSibling;
					while (psib) {
						if (psib.label) util.logDebugOptional("dnd", "check next sibling + " + psib.nodeName + " '" + psib.label +"' ...");
						if (psib.nodeName === 'menu' && popupStart !== psib) {
							if (psib.label) util.logDebugOptional("dnd", "Hiding previous popup menu.");
              // HTMLCollection
              for (let x of psib.children) {
                if (x.tagName=='menupopup') x.hidePopup();
              }
							// psib.children.forEach(x => { if (x.tagName=='menupopup') x.hidePopup(); });
						}
						psib = psib.nextSibling;
					}
					psib = popupStart.previousSibling;
					while (psib) {
						if (psib.label) util.logDebugOptional("dnd", "check previous sibling + " + psib.nodeName + " '" + psib.label +"' ...");
						if (psib.nodeName === 'menu' && popupStart !== psib) {
							if (psib.label) util.logDebugOptional("dnd", "Hiding previous popup menu.");
              for (let x of psib.children) {
                if (x.tagName=='menupopup') x.hidePopup();
              }
              // psib.children.forEach(x => { if (x.tagName=='menupopup') x.hidePopup(); });
						}
						psib = psib.previousSibling;
					}
					// only show popup if they have at least one menu item!
					if (pchild.children && pchild.children.length > 0)
						pchild.openPopup(popupStart, 'end_before', 0, -1, "context", false);  // showPopup() has been deprecated ages ago!!
					util.logDebugOptional("dnd","Displayed popup " + popupStart.getAttribute('label'));
				}
			}
			catch(e) {
				QuickFolders.Util.logDebug ("dragEnter: failure - " + e);
			}
		},

		// deal with old folder popups
		dragExit: function menuObs_dragExit(evt, dragSession) {
			const util = QuickFolders.Util;
			let popupStart = evt.target;
      if (!evt) debugger;
      if (!dragSession) dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession();
      
			// find parent node!
			util.logDebugOptional("dnd","popupDragObserver.dragExit " + popupStart.nodeName + " - " + popupStart.getAttribute('label'));
			try {
				if (popupStart.nodeName=='menu') {
					QuickFolders_globalLastChildPopup = popupStart; // remember to destroy!
				}
			}
			catch (e) {
				util.logDebugOptional("dnd","CATCH popupDragObserver.dragExit: \n" + e);
			}
		} ,

		dragOver: function menuObs_dragOver(evt, flavour, dragSession){
      if (!dragSession) 
        dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession();
      
      let types = Array.from(evt.dataTransfer.mozTypesAt(0)),
          contentType = types[0];

      if (dragSession) {
        dragSession.canDrop = (contentType === "text/x-moz-message");
        if (null !== QuickFolders_globalLastChildPopup) {
          QuickFolders_globalLastChildPopup=null;
        }
      }
		},

		// drop mails on popup: move mail, like in buttondragobserver
		// NOT USED DURING MESSAGE DROPS! IT IS USING THE buttonDragObserver.drop INSTEAD!
		drop: function menuObs_drop(evt, dropData, dragSession) {
			const Ci = Components.interfaces,
            Cc = Components.classes,
				    util = QuickFolders.Util,
            model = QuickFolders.Model,
            QI = QuickFolders.Interface,
            QFFW = QuickFolders.FilterWorker;
      if (!dragSession) {
        dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession(); 
      }
      
			let isThread = evt.isThread,
			    isCopy = (QuickFolders.popupDragObserver.dragAction === Ci.nsIDragService.DRAGDROP_ACTION_COPY),
			    menuItem = evt.target,
          messageUriList = QuickFolders.popupDragObserver.newFolderMsgUris,
          types = Array.from(evt.dataTransfer.mozTypesAt(0)),
          contentType = types[0];
          
					
			let moveOrCopy = function moveOrCopy(newFolder, sourceURI) {
				let sourceFolder,
				   	step='3. ' + (isCopy ? 'copy' : 'move') + ' messages: ' + newFolder.URI + ' thread:' + isThread;
				util.logDebugOptional("dragToNew", step);
				
				if (QFFW.FilterMode) {
					sourceFolder = model.getMsgFolderFromUri(sourceURI, true);
					let virtual = util.isVirtual(sourceFolder);
					if (!sourceFolder || virtual)
					{
						let msgHdr = messenger.msgHdrFromURI(QuickFolders.popupDragObserver.newFolderMsgUris[0].toString());
						sourceFolder = msgHdr.folder;
					}
				}
				let msgList = util.moveMessages(newFolder, messageUriList, isCopy)

				// have the filter created with a delay so that filters can adapt to the new folder!!
				if (QFFW.FilterMode) {
					// if user has quickFilters installed, use that instead!!
					QFFW.createFilterAsync(sourceFolder, newFolder, msgList, isCopy, true);
				}

				util.logDebugOptional("dragToNew", "4. updateFolders...");
				util.touch(newFolder);
				QI.updateFolders(false, false); // update context menus   
			}
			
			// helper function for creating a new subfolder => TODO implement filter learn for this case!
			// FolderParam = parent folder [uri in Postbox] passed back by the create folder dialog
			function newFolderCallback(aName, FolderParam) {
        const model = QuickFolders.Model,
              prefs = QuickFolders.Preferences,
              isEncodeUri = prefs.getBoolPref("newFolderCallback.encodeURI");
              
        
				let step = '',
				    isManyFolders = false,
				    sourceFolder = null;
            
        aName = aName.trim(); 
				if (aName) try {
          
					let currentURI, aFolder,
					    uriName = isEncodeUri ? encodeURI(aName) : aName;
					// we're dragging, so we are interested in the folder currently displayed in the threads pane
					if (typeof GetSelectedFolderURI === 'function') {
						// old Postbox
						currentURI = GetSelectedFolderURI();
						aFolder = model.getMsgFolderFromUri(FolderParam, true).QueryInterface(Ci.nsIMsgFolder); // inPB case this is just the URI, not the folder itself??
					}
					else {
						if (gFolderDisplay.displayedFolder)
							currentURI = gFolderDisplay.displayedFolder.URI;
						else
							isManyFolders = true;
						aFolder = FolderParam.QueryInterface(Ci.nsIMsgFolder);
					}
          
					step='1. create sub folder: ' + aName;
					util.logDebugOptional("dragToNew", step);
          let newFolderUri = aFolder.URI + "/" + uriName,
              encodedUri = isEncodeUri ? uriName : encodeURI(uriName); // already encoded?
          util.getOrCreateFolder(
            newFolderUri, 
            Ci.nsMsgFolderFlags.Mail).then(
              function createFolderCallback(f) {
                let fld = f || model.getMsgFolderFromUri(newFolderUri, true);
                moveOrCopy(fld, currentURI);
                
              },
              function failedCreateFolder(ex) {
                util.logException('getOrCreateFolder() ', ex);	
                util.alert("Something unforeseen happened trying to create the folder, for detailed info please check tools / developer tools / error console!\n"
                  + "To add more detail, enable debug mode in QuickFolders advanced settings.");
              }
            );
						
					return true;
				}
				catch(ex) {
					util.alert("Exception in newFolderCallback, step [" + step + "]: " + ex);
				}
				return false;
			}

			try {
				util.logDebugOptional("dnd","popupDragObserver.drop " + contentType);
				util.logDebugOptional("dnd","target's parent folder: " + menuItem.folder.URI);
				let targetFolder = menuItem.folder.QueryInterface(Ci.nsIMsgFolder);

				if (!targetFolder.canCreateSubfolders) {
					util.alert("You can not create a subfolder in " + targetFolder.prettyName);
					return false;
				}

				let trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
				trans.addDataFlavor("text/x-moz-message");

				// let's store the Msg URIs from drag session before we do anything else!!
				QuickFolders.popupDragObserver.dragAction = dragSession.dragAction; // remember copy or move?
				// reset in case there is already data there; only move mails of the last dnd operation!
				while (QuickFolders.popupDragObserver.newFolderMsgUris.length)
					QuickFolders.popupDragObserver.newFolderMsgUris.pop();
				
        let txtUris ='',
						dt = evt.dataTransfer,
					  types = dt.mozTypesAt(0);

        // types is a DOMStringList not an Arry, use contains, not includes
				if (types.contains("text/x-moz-message")) {
					for (let i=0; i < dt.mozItemCount; i++) {
						let messageUri = dt.mozGetDataAt("text/x-moz-message", i);
						txtUris += 'dataTransfer [' + i + '] ' + messageUri + '\n';
						QuickFolders.popupDragObserver.newFolderMsgUris.push(messageUri);
					}
					util.logDebugOptional('dnd', txtUris);
				}				
				else {
					// LEGACY CODE!
					util.logDebugOptional('dnd', 'LEGACY drag+drop code: using dragSession!');
					for (let i = 0; i < dragSession.numDropItems; i++) {
						dragSession.getData (trans, i);
						let dataObj = new Object(),
								flavour = new Object(),
								len = new Object();
						try {
							trans.getAnyTransferData(flavour, dataObj, len);

							if ((flavour.value === "text/x-moz-message") && dataObj) {
								dataObj = dataObj.value.QueryInterface(Ci.nsISupportsString);
								let messageUri = dataObj.data.substring(0, len.value);
								QuickFolders.popupDragObserver.newFolderMsgUris.push(messageUri);
							}
						}
						catch (e) {
							QuickFolders.LocalErrorLogger("Exception in drop item " + i + " of " + dragSession.numDropItems + "\nException: " + e);
						}
					}
				}


/**
 http://mozilla-xp.com/mozilla.dev.apps.thunderbird/How-To-Get-Highlighted-Folder-in-TB3
 As a general rule,
 anything to do with the folder pane is an attribute of gFolderTreeView,
 anything to do with the thread pane is an attribute of gFolderDisplay,
 and anything to do with the message pane is an attribute of gMessageDisplay.
**/

				let dualUseFolders = true;
				if (targetFolder.server instanceof Ci.nsIImapIncomingServer)
					dualUseFolders = targetFolder.server.dualUseFolders;

				util.logDebugOptional('dnd,dragToNew',
				  "window.openDialog (newFolderDialog.xhtml)\n"
					+ "folder/preselectedURI:" + targetFolder + " (URI: " + targetFolder.URI + ")\n"
					+ "dualUseFolders:" + dualUseFolders);
        window.openDialog("chrome://messenger/content/newFolderDialog.xhtml",
            "",
            "chrome,modal,resizable=no,centerscreen",
            {folder: targetFolder, dualUseFolders: dualUseFolders, okCallback: newFolderCallback});
			} catch(e) { QuickFolders.LocalErrorLogger("Exception in OnDrop event: " + e); return false}
			return true;
		}
	},
 
	messageDragObserver: {
		getSupportedFlavours : function msgObs_getSupportedFlavours() {
			let flavours = new FlavourSet();
			flavours.appendFlavour("text/x-moz-message"); // emails only (find out whether a thread is covered by this)
			return flavours;
		},

		startDrag: function msgObs_startDrag(event, transferData, action) {
      if (!event || !transferData) debugger;
			// transferData.data = new TransferData(); // legacy code
			// check event.originalTarget and event.target
			QuickFolders.Util.threadPaneOnDragStart(event);
		}
	},

	buttonDragObserver: {
		win: QuickFolders_getWindow(),
		doc: QuickFolders_getDocument(),
		getSupportedFlavours : function btnObs_getFlavors() {
			let flavours = new FlavourSet();
			flavours.appendFlavour("text/x-moz-message"); // emails
			flavours.appendFlavour("text/unicode");  // tabs
			flavours.appendFlavour("text/plain"); // [Bug 26560]
			// MOVE FOLDER SUPPORT
			flavours.appendFlavour("text/x-moz-folder"); // folder tree items
			return flavours;
		},

		dragOverTimer: null,

		dragEnter: function btnObs_dragEnter(evt, dragSession) {
      if (!evt) debugger;
      
      if (!dragSession) dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession(); 
      
      const util = QuickFolders.Util,
						prefs = QuickFolders.Preferences,
			      QI = QuickFolders.Interface,
			      removeLastPopup = QI.removeLastPopup.bind(QI);
			try {
				if (null==dragSession.sourceNode) {
					util.logDebugOptional("dnd", "UNEXPECTED ERROR QuickFolders.OnDragEnter - empty sourceNode!");
					return;
				}
				// add a function to MOVE folders (using the treechildren sourceNode + modifier key SHIFT)
				let isAlt = evt.altKey,
				    isCtrl = evt.ctrlKey,
				    isShift = evt.shiftKey;
				util.logDebugOptional("dnd","buttonDragObserver.dragEnter - sourceNode = " + dragSession.sourceNode.nodeName + "\n"
					+ "  ALT = " + isAlt 
					+ "  CTRL = " + isCtrl 
					+ "  SHIFT = " + isShift);
				if (dragSession.sourceNode.nodeName === 'toolbarpaletteitem') {
					util.logDebug("trying to drag a toolbar palette item - not allowed.");
					dragSession.canDrop=false;
					return;
				}
				let button = evt.target;
				
        // [issue 79] dragover colors not working to deprecated -moz-drag-over pseudoclass
        if (button) {
          button.classList.add("dragover");
        }
        
				// somehow, this creates a duplication in linux
				// delete previous drag folders popup!
        if (button.id && button.id =="QuickFolders-quickMove" || button.id =="QuickFolders-readingList") {
					if (prefs.isDebugOption('dnd')) debugger;
					dragSession.canDrop = false;
					if (dragSession.dataTransfer.items.length) {
						let firstItem = dragSession.dataTransfer.items[0];
						if (firstItem.type == "text/x-moz-message") {
							dragSession.canDrop=true;
							removeLastPopup(QuickFolders_globalHidePopupId, this.doc);
						}
					}
          if (prefs.isShowRecentTab)
            removeLastPopup('moveTo_QuickFolders-folder-popup-Recent', this.doc);
          return;
        }

				if (button.tagName === "toolbarbutton") {
          // new quickMove
					// highlight drop target
					if (dragSession.numDropItems==1) {
						if (dragSession.isDataFlavorSupported("text/unicode")
							  ||
							  dragSession.isDataFlavorSupported("text/plain")) {
              // show reordering target position!
              // right or left of current button! (try styling button with > OR < to show on which side the drop will happen)
              let node = dragSession.sourceNode;

              // find out whether drop target button is right or left from source button:
              if (node && node.hasAttributes()) {
                // check previous siblings to see if target button is found - then it's to the left. otherwise it's to the right
                let i = null,
                    sib = node;
                let sDirection="",
                    sOther="";
                while( (sib = sib.previousSibling) != null ) {
                  if (sib == button) {
                    sDirection = "dragLEFT";
                    sOther = "dragRIGHT";
                    break;
                  }
                }
                if(!sDirection) {
                  sDirection = "dragRIGHT";
                  sOther = "dragLEFT";
                }
                button.classList.add(sDirection); // add style for drop arrow (remove onDragEnd)
                button.classList.remove(sOther);
							}
						}
					}

					//show context menu if dragged over a button which has subfolders
					let targetFolder = button.folder || null,
					    otherPopups = QI.menuPopupsByOffset;
					for (let i = 0; i < otherPopups.length; i++) {
						if (otherPopups[i].folder) {
							if (otherPopups[i].folder !== targetFolder && otherPopups[i].hidePopup)
								otherPopups[i].hidePopup();
						}
						else if (targetFolder) { // there is a targetfolder but the other popup doesn't have one (special tab!).
							if (otherPopups[i].hidePopup)
								otherPopups[i].hidePopup();
							else
								util.logDebug("otherPopups[" + i + "] (" + otherPopups[i].id + ") does not have a hidePopup method!");
						}
					}

					let dt = evt.dataTransfer,
					    types = dt.mozTypesAt(0);
					if (prefs.isDebugOption('dnd')) {
						// http://mxr.mozilla.org/comm-central/source/mail/base/content/folderPane.js#677
						let txt = 'Drag types from event.dataTransfer:';
						for (let i=0; i<types.length; i++) {
							txt +='\n' + types[i];
						}
						util.logDebugOptional("dnd", "dragSession.isDataFlavorSupported(text/x-moz-message): " + dragSession.isDataFlavorSupported("text/x-moz-message")
						                     +'\n' + txt);
					}
					
					let isFlavorMail = types.contains("text/x-moz-message"),  // dragSession.isDataFlavorSupported("text/x-moz-message") 
					    isFlavorFolder = types.contains("text/x-moz-folder"), // dragSession.isDataFlavorSupported("text/x-moz-folder")
							isFlavorUnicode = types.contains("text/unicode") || types.contains("text/plain");   // context menu ??
							

					// only show popups when dragging messages!
					// removed && targetFolder.hasSubFolders as we especially need the new folder submenu item for folders without subfolders!
					// also add  treechildren when SHIFT is pressed => move a folder! ....  isShift && button.tagName === "treechildren"
					if(isFlavorMail || isFlavorFolder)  // MOVE FOLDER support
					try {
						//close any other context menus
						if (isFlavorUnicode) {
							removeLastPopup(QuickFolders_globalHidePopupId, this.doc);
							return;  // don't show popup when reordering tabs
						}

						if (targetFolder)
							util.logDebugOptional("recentFolders", "creating popupset for " + targetFolder.name );

						// instead of using the full popup menu (containing the 3 top commands)
						// try to create droptarget menu that only contains the target subfolders "on the fly"
						// haven't found a way to tidy these up, yet (should be done in onDragExit?)
						// Maybe they have to be created at the same time as the "full menus" and part of another menu array like menuPopupsByOffset
						// no menus necessary for folders without subfolders!
						let popupset = this.doc.createXULElement ? this.doc.createXULElement('popupset') : this.doc.createElement('popupset'),
						    menupopup = this.doc.createXULElement ? this.doc.createXULElement('menupopup') : this.doc.createElement('menupopup'),
						    popupId;
						QI.FoldersBox.appendChild(popupset);
            
            let isDisabled = (button && targetFolder) ? (button.getAttribute("disabled") || false) : false;

						if (targetFolder) {
							popupId = 'moveTo_'+targetFolder.URI;
              let oldMenu = this.doc.getElementById(popupId);
							// excluding TB 2 from "drag to new folder" menu for now
							if (QuickFolders_globalHidePopupId !== popupId || !oldMenu) {
                if (oldMenu) {
                  // remove old menu from DOM
                  oldMenu.parentNode.removeChild(oldMenu);
                }
								menupopup.setAttribute('id', popupId);
								menupopup.className = 'QuickFolders-folder-popup';
								menupopup.folder = targetFolder;
								popupset.appendChild(menupopup);
								removeLastPopup(QuickFolders_globalHidePopupId, this.doc);
                
                if (isDisabled) {
                  let mi = QI.createMenuItem_disabled();
                  menupopup.appendChild(mi);
                }
                else
                  QI.addSubFoldersPopup(menupopup, targetFolder, true);
							}
						}
						else { // special folderbutton: recent
              if (button.id == 'QuickFolders-Recent-CurrentFolderTool' || button.id == 'QuickFolders-Recent') {
                popupId = 'moveTo_QuickFolders-folder-popup-Recent';
                if(QuickFolders_globalHidePopupId !== popupId) {
                  menupopup.setAttribute('id', popupId);
                  popupset.appendChild(menupopup);
                  removeLastPopup(QuickFolders_globalHidePopupId, this.doc);
                  QI.createRecentTab(menupopup, true, button);
                }
              }
              else {
                if (prefs.isShowRecentTab)
                  removeLastPopup('moveTo_QuickFolders-folder-popup-Recent', this.doc);
              }
						}
            if (!popupId)
              return;

						// a bug in showPopup when used with coordinates makes it start from the wrong origin
						//document.getElementById(popupId).showPopup(button, button.boxObject.screenX, Number(button.boxObject.screenY) + Number(button.boxObject.height));
						// AG fixed, 19/11/2008 - showPopup is deprecated in FX3!
						util.logDebugOptional("dnd", "showPopup with id " + popupId );
						let p =  this.doc.getElementById(popupId);
						if (!p) {
              util.logDebug('Document did not return the popup: ' + popupId);
            }
						// avoid showing empty popup
						if (p && p.children && p.children.length) {
						
							// from a certain size, make sure to shift menu to right to allow clicking the tab
							let minRealign = prefs.getIntPref("folderMenu.realignMinTabs"),
                  isShift = false;
							if (minRealign) {
							  let c,
                    isDebug = prefs.isDebugOption('popupmenus.drag');
								// count top level menu items
								for (c = 0; c < p.children.length; c++) {
									if (isDebug) {
										util.logDebugOptional("popupmenus.drag", 
											c + ': ' + p.children[c].tagName + ' - ' +  p.children[c].getAttribute('label'));
									}
									if (c > minRealign) {
										isShift = true;
										if (!isDebug) break;
									}
								}
								if (isDebug) {
									util.logDebugOptional("popupmenus.drag", 
                    "count = " + c +"\nminRealign = " + minRealign + "\nisShift = " + isShift);
								}
							}
						
							this.doc.popupNode = button;
							if (p.openPopup) {
                if (isShift) {
                  p.openPopup(button,'end_before', 0,-1,"context",false);
                }
                else {
                  p.openPopup(button,'after_start', 0,-1,"context",false);
                }
              }
							else
								p.showPopup(button, -1,-1,"context","bottomleft","topleft"); // deprecated
							
							util.logDebugOptional("dnd", "set global popup id = " + popupId);
							QuickFolders_globalHidePopupId = popupId;
						}

						// if (popupId==QuickFolders_globalHidePopupId) QuickFolders_globalHidePopupId=""; // avoid hiding "itself". QuickFolders_globalHidePopupId is not cleared if previous drag cancelled.

					}
					catch(e) { util.logException("Exception creating folder popup: ", e);};
					
				}
				
			}
			catch(ex) {
				util.logException ("EXCEPTION buttonDragObserver.dragEnter: ", ex);
			}
		} ,
		
		// deal with old folder popups
		dragExit: function btnObs_dragExit(event, dragSession) {
      if (!event) debugger;
      
      if (!dragSession) dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession();
			const util = QuickFolders.Util;
			util.logDebugOptional("dnd", "buttonDragObserver.dragExit\n" + 
			  "sourceNode=" + (dragSession ? dragSession.sourceNode : "[no dragSession]\n") +
				"event.target=" + event.target || "[none]");
			let button = event.target;
      
      // [issue 79] dragover colors not working to deprecated -moz-drag-over pseudoclass
      if (button) {
        button.classList.remove("dragover");
      }      
        
			if (!dragSession.sourceNode) { 
				util.logDebugOptional("dnd", "buttonDragObserver.dragExit - session without sourceNode! exiting dragExit handler...");
				if (!dragSession.dataTransfer)
				  event.preventDefault();
				return; 
			}
			try {
				let src = dragSession.sourceNode.nodeName || "unnamed node";
				util.logDebugOptional("dnd", "buttonDragObserver.dragExit - sourceNode = " + src);
			} catch(e) { util.logDebugOptional("dnd", "buttonDragObserver.dragExit - " + e); }
      
			if (dragSession.sourceNode.nodeName === 'toolbarpaletteitem') {
				util.logDebugOptional("dnd", "trying to drag a toolbar palette item - ignored.");
				dragSession.canDrop=false;
				return;
			}
			if (dragSession.isDataFlavorSupported("text/unicode") || dragSession.isDataFlavorSupported("text/plain")) { // drag buttons
				// remove dragdrop marker:
				button.classList.remove("dragLEFT");
				button.classList.remove("dragRIGHT");
				QuickFolders_globalHidePopupId = "";
				return;  // don't remove popup when reordering tabs
			}
			else {
				//  the target of the complementary event (the mouseleave target in the case of a mouseenter event). null otherwise.
				let rt = event.relatedTarget;
				util.logDebugOptional("dnd", "relatedTarget = " + (rt ? (rt.nodeName + "  " + rt.id) : "null" ) + "\n"
				  + "QuickFolders_globalHidePopupId = " + QuickFolders_globalHidePopupId);
				if (rt && (rt.nodeName=='box' || rt.nodeName=='hbox'))
					QuickFolders.Interface.removeLastPopup(QuickFolders_globalHidePopupId, this.doc);
			}

			// problem: event also fires when dragging into the menu, so we can not remove it then!
			let targetFolder = button.folder,
			    popupId = 'moveTo_'+targetFolder.URI;

			// this popup needs to be removed if we drag into another button.
			try {
				if (this.doc.getElementById(popupId))
					QuickFolders_globalHidePopupId = popupId; // arm for hiding! GLOBAL VAR!!
				else
					QuickFolders_globalHidePopupId = ""; // consume?
			}
			catch(ex) {
				window.dump("Cannot setup for delete: popup \n" + ex);
			}
		} ,
    
    dragLeave: function btnObs_dragLeave(event) {
			let button = event.target;
      const util = QuickFolders.Util;
      // [issue 79] dragover colors not working to deprecated -moz-drag-over pseudoclass
      if (button) {
        util.logDebugOptional("dnd", "dragLeave event!");
        button.classList.remove("dragover");
      }      
    } ,


		dragOver: function btnObs_dragOver(evt, flavour, dragSession){
      if (!evt) debugger;
      
      if (!dragSession) dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession();
			//QuickFolders.Util.logDebug("buttonDragObserver.dragOver flavour=" + flavour.contentType);
			// dragSession.canDrop = true;
      
      let types = Array.from(evt.dataTransfer.mozTypesAt(0)); // replace flavour param
      if (   types.includes("text/x-moz-message") 
          || types.includes("text/unicode") 
          || types.includes("text/plain")
          || types.includes("text/x-moz-folder")
          || types.includes("text/x-moz-newsfolder")
         )
        dragSession.canDrop = true;
			else {
				QuickFolders.Util.logDebugOptional("dnd", "buttonDragObserver.dragOver - can not drop " + types[0]);
				dragSession.canDrop = false;
			}
		} ,

		drop: function btnObs_drop(evt){
			const util = QuickFolders.Util,
          QI = QuickFolders.Interface,
          prefs = QuickFolders.Preferences,
					Ci = Components.interfaces,
					Cc = Components.classes;
      let dragSession = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession();
          
			let isShift = evt.shiftKey,
          isCtrl = evt.ctrlKey,
			    debugDragging = false,
			    DropTarget = evt.target,
			    targetFolder = DropTarget.folder,
					lastAction = "",
					types = Array.from(evt.dataTransfer.mozTypesAt(0)),
          contentType = types[0];
          
      // [issue 79] dragover colors not working to deprecated -moz-drag-over pseudoclass
      if (DropTarget) {
        DropTarget.classList.remove("dragover");
      }      

          
			if (prefs.isDebugOption("dnd")) debugger;
      try {
        util.logDebugOptional("dnd", "buttonDragObserver.drop flavour=" + contentType);
        util.logToConsole("dragSession = ", dragSession);
      } catch(ex) { util.logDebugOptional("dnd", ex); }
			QuickFolders_globalHidePopupId = "";

      let isPreventDefault = true,
          isMoveFolderQuickMove = false;
			switch (contentType) {
				case  "text/x-moz-folder": 
          // [issue 75] support moving folders through quickMove
          if (DropTarget.id && DropTarget.id =="QuickFolders-quickMove") {
            isMoveFolderQuickMove = true;
          }
					if (!isShift && !isMoveFolderQuickMove) {
            let sPrompt = util.getBundleString("qfMoveFolderOrNewTab", 
                "Please drag new folders to an empty area of the toolbar! If you want to MOVE the folder, please hold down SHIFT while dragging.");
            util.alert(sPrompt);
            break;
					}
					// handler for dropping folders
					try {
						if (evt.dataTransfer && evt.dataTransfer.mozGetDataAt) { 
							let count = evt.dataTransfer.mozItemCount ? evt.dataTransfer.mozItemCount : 1,
									foldersArray = [];
							for (let i=0; i<count; i++) { // allow multiple folder drops...
								let msgFolder = evt.dataTransfer.mozGetDataAt(contentType, i);
								if (!msgFolder.QueryInterface) // Postbox
									msgFolder = QuickFolders.Model.getMsgFolderFromUri(
                    util.getFolderUriFromDropData(evt, dragSession), 
                    false);
								foldersArray.push(msgFolder);
							}
              if (!isMoveFolderQuickMove) {
                let IsCopy = [];
                for (let f of foldersArray) {
                  IsCopy.push(false); // only support move this way at the moment
                }
                QI.moveFolders(foldersArray, IsCopy, targetFolder);
              }
              else {
                // stash folders away for the next quickMove
                // foldersArray -- 
                QuickFolders.quickMove.addFolders(foldersArray, evt.ctrlKey);
                QuickFolders.quickMove.update();
              }
						}					
						else {
							let sourceFolder = 
                util.getFolderFromDropData(evt, dragSession);
							QI.moveFolders([sourceFolder], [isCtrl], targetFolder);
						}
					}
					catch(e) {
            QuickFolders.LocalErrorLogger("Exception in QuickFolders.drop:" + e); 
           };
					break;
				case  "text/x-moz-message":
				  // use dropData to retrieve the messages!
					// http://mxr.mozilla.org/comm-central/source/mail/base/content/folderPane.js#823
					let messageUris = [],
							sourceFolder = null,
							txtUris ='',
							dt = evt.dataTransfer,
					    types = dt.mozTypesAt(0);
              
          if (DropTarget.getAttribute("disabled")) {
            let msg="", maxTabs;
            if (!util.hasValidLicense()) { // max tab
              maxTabs = QuickFolders.Model.MAX_UNPAID_TABS;
              msg = util.getBundleString("license_restriced.unpaid.maxtabs",[maxTabs]);
            }
            else if (util.hasStandardLicense()) {
              maxTabs = QuickFolders.Model.MAX_STANDARD_TABS;
              msg = util.getBundleString("license_restriced.standard.maxtabs",[maxTabs]);
            }
            if (msg) {
              util.popupRestrictedFeature("tabs>" + maxTabs, msg, 2);
              QuickFolders.Interface.viewSplash(msg);
              return;
            }
          }
							
					if (types.contains("text/x-moz-message")) {
					  lastAction = "get data from event.dataTransfer"
						for (let i=0; i < dt.mozItemCount; i++) {
							let messageUri = dt.mozGetDataAt("text/x-moz-message", i);
							txtUris += 'dataTransfer [' + i + '] ' + messageUri + '\n';
							messageUris.push(messageUri);
						}
						util.logDebugOptional('dnd', txtUris);
					}
					else {  // legacy code
						util.logDebugOptional('dnd', 'LEGACY drag+drop code: using dragSession!');
						let trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
					  lastAction = "iterate dragSession"
						//alert('trans.addDataFlavor: trans=' + trans + '\n numDropItems=' + dragSession.numDropItems);
						trans.addDataFlavor("text/x-moz-message");

						for (let i = 0; i < dragSession.numDropItems; i++) {
							//alert('dragSession.getData ... '+(i+1));
							dragSession.getData (trans, i);
							let dataObj = new Object(),
									flavour = new Object(),
									len = new Object();
							if (debugDragging ) util.alert('trans.getAnyTransferData ... '+(i+1));
							try {
								trans.getAnyTransferData(flavour, dataObj, len);

								if (flavour.value === "text/x-moz-message" && dataObj) {

									dataObj = dataObj.value.QueryInterface(Ci.nsISupportsString);
									if (debugDragging ) util.alert('getting data from dataObj...');
									let messageUri = dataObj.data.substring(0, len.value);

									if (debugDragging ) util.alert('messageUris.push: messageUri=' + messageUri) ;
									messageUris.push(messageUri);
								}
							}
							catch (e) {
								QuickFolders.LocalErrorLogger("Exception in drop item " + i + " of " + dragSession.numDropItems + "\nException: " + e);
							}
						}
					}
          
          lastAction = "Determine sourceFolder from 1st dropped mail";
          // note: get CurrentFolder fails when we are in a search results window!!
          // [Bug 25204] => fixed in 3.10
          
          let msgHdr = messenger.msgHdrFromURI(messageUris[0].toString());
          sourceFolder = msgHdr.folder;
          //let virtual = util.isVirtual(sourceFolder);
          if (!sourceFolder) {
            sourceFolder = util.CurrentFolder;
          }
          
					// handler for dropping messages
					lastAction = "drop action payload";
          
          // quickMove menu
          if (DropTarget.id && DropTarget.id =="QuickFolders-quickMove") {
            util.logDebugOptional("dnd", "drop: quickMove button - added " + messageUris.length + " message URIs");
            // copy message list into "holding area"
            while (messageUris.length) {
              let newUri = messageUris.pop();
              QuickFolders.quickMove.add(newUri, sourceFolder, evt.ctrlKey); // CTRL = copy
            }
            QuickFolders.quickMove.update();
            return;
          }
          
          // reading List menu
          if (DropTarget.id && DropTarget.id =="QuickFolders-readingList") {
            let bm = QuickFolders.bookmarks;
            util.logDebugOptional("dnd", "drop: readingList button - added " + messageUris.length + " message URIs");
            // copy message list 
            while (messageUris.length) {
              let newUri = messageUris.pop();
              // addMail can cause removal of an invalid item (sets bookmarks.dirty = true)
              // this will cause a reload in order to rebuild the menu
              bm.addMail(newUri, sourceFolder);
            }
            bm.persist(); // only 1 save is more efficient.
            
            return;
          }
          
					try {
						util.logDebugOptional("dnd", "drop: " + messageUris.length + " messageUris to " + targetFolder.URI);
						if(messageUris.length > 0) {
							
							lastAction = "moveMessages";
							let msgList = util.moveMessages(
								targetFolder,
								messageUris,
								dragSession.dragAction === Ci.nsIDragService.DRAGDROP_ACTION_COPY
							);
							if (QuickFolders.FilterWorker.FilterMode) {
                lastAction = "createFilterAsync(" + sourceFolder.prettyName + ", " + targetFolder.prettyName + ", " + (msgList ? msgList[0] : "no Messages returned!") + ")";
                QuickFolders.FilterWorker.createFilterAsync(sourceFolder, targetFolder, msgList, false);
							}
						}

					}
					catch(e) {QuickFolders.LocalErrorLogger("Exception in drop -" + lastAction + "... " + e); };
					// close any top level menu items after message drop!

					//hide popup's menus!
					util.logDebug ("buttonDragObserver.drop DropTarget = " + DropTarget.tagName + 
            + (DropTarget.id ? '[' + DropTarget.id + ']' : '')
            + '  Target Folder:' + targetFolder.name );

					QI.collapseParentMenus(DropTarget);

					if (evt.shiftKey) {
						QuickFolders_MySelectFolder(targetFolder.URI);
					}

					break;
        case "text/plain":    // newsgroup names
				case "text/unicode":  // dropping another tab on this tab inserts it before
          // let buttonURI = dropData.data;
          let buttonURI = evt.dataTransfer.mozGetDataAt(contentType, 0);
					QuickFolders.Model.insertAtPosition(buttonURI, DropTarget.folder.URI, "");
					break;
        default:
          isPreventDefault = false;
			}
      if (isPreventDefault) {
        evt.preventDefault();
        evt.stopPropagation();
      }
		},

		// new handler for starting drag of buttons (re-order)
		startDrag: function btnObs_startDrag(event, transferData, action) {
			const util = QuickFolders.Util;
			let button = event.target;
			util.logDebugOptional('dnd', 'buttonDragObserver.startDrag\n' 
			                           + 'button.folder=' + button.folder + '\n' 
																 + 'button.id=' + button.id);
			if(!button.folder)
				 return;
			// transferData.data = new TransferData();
      // if current folder button is started to drag, use a different flavour
			if (button.id && button.id === "QuickFoldersCurrentFolder") {
				// transferData.data.addDataForFlavour("text/currentfolder", button.folder.URI);
        event.dataTransfer.mozSetDataAt("text/currentfolder", button.folder.URI, 0);
      }
			else {
				// transferData.data.addDataForFlavour("text/unicode", button.folder.URI);
        event.dataTransfer.mozSetDataAt("text/unicode", button.folder.URI, 0);
      }
		}

	},

  addFolderPaneListener: function addFolderPaneListener() {
    if (!this.folderPaneListen) {
      let menu = document.getElementById('folderPaneContext');
      if (menu) {
        menu.addEventListener("popupshowing", QuickFolders.Interface.folderPanePopup, false);
      }
    }
    this.folderPaneListen= true;
  },
  
  removeFolderPaneListener: function() {
    let menu = document.getElementById('folderPaneContext');
    if (menu) {
      menu.removeEventListener("popupshowing", QuickFolders.Interface.folderPanePopup);
    }
  },
  
  TabEventListeners: {},

	addTabEventListener: function addTabEventListener() {
		try {
		  let tabContainer = QuickFolders.tabContainer;
      this.TabEventListeners["select"] = function(event) { QuickFolders.TabListener.select(event); }
      this.TabEventListeners["TabClose"] = function(event) { QuickFolders.TabListener.closeTab(event); }
      this.TabEventListeners["TabOpen"] = function(event) { QuickFolders.TabListener.newTab(event); }
      this.TabEventListeners["TabMove"] = function(event) { QuickFolders.TabListener.moveTab(event); }
      for (let key in this.TabEventListeners) {
        tabContainer.addEventListener(key, this.TabEventListeners[key], false);
      }
		}
		catch (e) {
			QuickFolders.LocalErrorLogger("No tabContainer available! " + e);
			QuickFolders._tabContainer = null;
		}
	},
	removeTabEventListener: function removeTabEventListener() {
    let tabContainer = QuickFolders.tabContainer;
    for (let key in this.TabEventListeners) {
      tabContainer.removeEventListener(key, this.TabEventListeners[key]);
    }
  }
}; // QuickFolders main object


// wrap function for session store: persist / restore categories	
QuickFolders.prepareSessionStore = function () {
	const util = QuickFolders.Util,
        model = QuickFolders.Model,
		    CI = Components.interfaces;
  util.logDebug("=============================\nPreparing Session Store - for QuickFolders Categories...\n========================");
	if (!util) {
		return;
	}
	if (typeof mailTabType == "undefined") { // Thunderbird - defined in mailTab.js
    return;
  }
  
  if (mailTabType.QuickFolders_SessionStore) return; // avoid multiple modifications.
  mailTabType.QuickFolders_SessionStore = {};
  // overwrite persist 
  let orgPersist = mailTabType.modes["folder"].persistTab;
  mailTabType.QuickFolders_SessionStore.persistTab = orgPersist;
  mailTabType.modes["folder"].persistTab = function(aTab) {
    let retval = orgPersist(aTab);
    if (retval) {
      retval.QuickFoldersCategory = aTab.QuickFoldersCategory; // add category from the tab to persisted info object
      util.logDebug("Persisted tab category: " + aTab.QuickFoldersCategory);
    }
    return retval; 
  }
  // overwrite restoreTab
  let orgRestore = mailTabType.modes["folder"].restoreTab;
  mailTabType.QuickFolders_SessionStore.restoreTab = orgRestore;
  mailTabType.modes["folder"].restoreTab = function(aTabmail, aPersistedState) {
    orgRestore(aTabmail, aPersistedState);
    let txt;
    try {
      txt = aPersistedState.QuickFoldersCategory || "(no category)";
    } catch(ex) {;}
    // let folder = model.getMsgFolderFromUri(aPersistedState.folderURI); 
    util.logDebug("restore tab: QuickFoldersCategory = " + txt + " persisted State = ", aPersistedState);
    if (aPersistedState.QuickFoldersCategory) {
      let tabInfo, theUri;
      // Thunderbird only code, so it is fine to use tabInfo here:
      for (let i = 0; i < aTabmail.tabInfo.length; i++) {
        tabInfo = aTabmail.tabInfo[i];
        if (tabInfo && tabInfo.folderDisplay && tabInfo.folderDisplay.view && tabInfo.folderDisplay.view.displayedFolder) {
          theUri = tabInfo.folderDisplay.view.displayedFolder.URI;
          if (theUri == aPersistedState.folderURI) {
            // util.logDebug("restore category to tabInfo folder [" + theUri + "] + " +  aPersistedState.QuickFoldersCategory);
            let cat = aPersistedState.QuickFoldersCategory;
            if (cat) {
              util.logDebug("Restored category " + cat);
              tabInfo.QuickFoldersCategory = aPersistedState.QuickFoldersCategory;
            }
            return;
          }
        }
      }
    }
  }
	
};

QuickFolders.restoreSessionStore = function() {
  if (!mailTabType.QuickFolders_SessionStore) return;
  mailTabType.modes["folder"].persistTab = mailTabType.QuickFolders_SessionStore.persistTab;
  mailTabType.modes["folder"].restoreTab = mailTabType.QuickFolders_SessionStore.restoreTab;
}


function QuickFolders_MyEnsureFolderIndex(tree, msgFolder) {
	// try to get the index of the folder in the tree
	try {
		let index ;

		if (typeof tree.getIndexOfFolder !== 'undefined')
			index = tree.getIndexOfFolder(msgFolder);
		else
			if (typeof tree.builderView !== 'undefined' && typeof tree.builderView.getIndexOfResource !== 'undefined')
				index = tree.builderView.getIndexOfResource(msgFolder);
			else
				if (typeof EnsureFolderIndex !== 'undefined')
					index = EnsureFolderIndex(msgFolder);
				else
					return -1;

		QuickFolders.Util.logDebugOptional ("folders.select", "QuickFolders_MyEnsureFolderIndex - index of " + msgFolder.name + ": " + index);

		if (index === -1) {
			if (null==msgFolder.parent)
				return -1;
			let parentIndex = QuickFolders_MyEnsureFolderIndex(tree, msgFolder.parent);

			// if we couldn't find the folder, open the parent
			if (parentIndex !== -1 && !tree.builderView.isContainerOpen(parentIndex)) {
				tree.builderView.toggleOpenState(parentIndex);
			}

			if (typeof tree.getIndexOfFolder !== 'undefined')
				index = tree.getIndexOfFolder(msgFolder);
			else
				if (tree.builderView !== 'undefined')
					index = tree.builderView.getIndexOfResource(msgFolder);
				else
					if (typeof EnsureFolderIndex !== 'undefined')
						index = EnsureFolderIndex(msgFolder);
					else
						return -1;
		}
		return index;
	}
	catch(e) {
		QuickFolders.Util.logException('Exception in QuickFolders_MyEnsureFolderIndex', e);
		return -1;
	}

}

function QuickFolders_MyChangeSelection(tree, newIndex) {
  if(newIndex >= 0)
  {
		QuickFolders.Util.logDebugOptional("folders.select", "ChangeSelection of folder tree.index " + tree.currentIndex + " to " + newIndex);
		tree.view.selection.select(newIndex);
		if (tree.ensureRowIsVisible)
			tree.ensureRowIsVisible(newIndex);  // Tb 68
		else
			tree.treeBoxObject.ensureRowIsVisible(newIndex);
  }
}

// the core function for selecting a folder
// adding re-use of mail tabs if the folder is open in another mail tab, switch to that one!
function QuickFolders_MySelectFolder(folderUri, highlightTabFirst) {
	const util = QuickFolders.Util,
        prefs = QuickFolders.Preferences,
        model = QuickFolders.Model,
        QI = QuickFolders.Interface,
				Ci = Components.interfaces,
				Cc = Components.classes;
	function getTabURI(info) {
	  // note: tabmail is declared further down - it is in scope.
		if (!info)
			return null;
		if (info.msgSelectedFolder)
			return info.msgSelectedFolder.URI; // SM
		if (    info.folderDisplay
		     && info.folderDisplay.view
		     && info.folderDisplay.view.displayedFolder
		     && info.folderDisplay.view.displayedFolder.URI
		   )
		   return info.folderDisplay.view.displayedFolder.URI; //Tb
		if (info.type 
		    && info.type == 'folder' 
		    && info._folderURI)
				return info._folderURI;  // Postbox
		return '';
	}
  //during QuickFolders_MySelectFolder, disable the listener for tabmail "select"
	util.logDebugOptional("folders.select", "QuickFolders_MySelectFolder: " + folderUri);
 	if (prefs.isDebugOption("folders.select")) debugger;
	
	if (!folderUri) return false;

	let folderTree = QuickFolders.mailFolderTree,
	    msgFolder,
	    isInvalid = false;
	try {
	  msgFolder = model.getMsgFolderFromUri(folderUri, true);  
		if (prefs.getBoolPref("autoValidateFolders")) {
		  isInvalid = (!util.doesMailFolderExist(msgFolder));
		}
	}
	catch (ex) {
	  util.logException("Exception validating folder: ", ex);
	  isInvalid = true;
	}
	
	if (isInvalid) {
	  // invalid folder; suggest to correct this!
    util.logDebugOptional("folders.select","detected invalid folder, trying to correct entry table.");
		let folderEntry = model.getFolderEntry(folderUri);
    if (!folderEntry) return false;
    if (folderEntry.disableValidation) {
      ; // do nothing. a pending rename invalidated this entry
    }
    else {
			switch(QI.deleteFolderPrompt(folderEntry, false)) {
			  case 1: // delete 
				  // save changes right away!
					prefs.storeFolderEntries(model.selectedFolders);
          // update the model
          QI.updateFolders(true, true);
				  break;
				case 0: // don't delete
				  break;
			};
      return false;
		}
	}
	QuickFolders.currentURI = folderUri;
	
	let folderIndex, i,
	    isExistFolderInTab = false,
	    tabmail = document.getElementById("tabmail");
	if (tabmail) {
    util.logDebugOptional("folders.select","try to find open tab with folder...");
	  let len = util.getTabInfoLength(tabmail);
		for (i = 0; i < len; i++) {
		  let info = util.getTabInfoByIndex(tabmail, i);
			let tabURI = getTabURI(info);
			if (!tabURI)
				continue; 
			// SM seems to have "false" tabs (without any info in them) we are not interested in them
			if (  folderUri === tabURI
			   && util.getTabMode(info) == "folder"
			   && i !== QuickFolders.tabContainer.selectedIndex)
			{
        util.logDebugOptional("folders.select","matched folder to open tab, switching to tab " + i);
        // strangely switching to tab 0 causes an unnecessary updateFolders call
				if (tabmail.switchToTab)
					tabmail.switchToTab(i); // switch to first tab with this URI
				else {
					QuickFolders.tabContainer.selectedIndex = i;
				}
				isExistFolderInTab = true;
				break;
			}
		}
    util.logDebugOptional("folders.select", isExistFolderInTab ? "...found folder in existing mail Tab." : "...folder is currently not open in any Tab.");
	}

  if (!msgFolder) {
    util.logDebugOptional("folders.select", "No valid folder found for this Uri - maybe caused by a pending rename on IMAP Server.");
    return false; // no valid folder (may be from rename)
  }
	// new behavior: OPEN NEW TAB
	// if single message is shown, open folder in a new Tab...
	if (QI.CurrentTabMode == 'message' || QI.CurrentTabMode =='glodaList') {
	  if (!isExistFolderInTab) {
		  if (prefs.getBoolPref('behavior.nonFolderView.openNewTab')) {
        util.logDebugOptional("folders.select", "calling openFolderInNewTab()");
				QI.openFolderInNewTab(msgFolder);
			}
			else {  // switch to first tab
        util.logDebugOptional("folders.select", "tab is not selected, openNewTab disabled, switching to tab 0");
			  tabmail.switchToTab(0);
			}
		}
		else
	    return true; // avoid closing the single message
	}

	let Flags = util.FolderFlags,
			isRoot = (msgFolder.rootFolder.URI == msgFolder.URI);

  util.logDebugOptional("folders.select", "folder [" +  msgFolder.prettyName  + "] flags = " + msgFolder.flags
	  + (isRoot ? "\nThis is a ROOT folder" : ""));
  // find out if parent folder is smart and collapsed (bug in TB3!)
  // in this case getIndexOfFolder returns a faulty index (the parent node of the inbox = the mailbox account folder itself)
  // therefore, ensureRowIsVisible does not work!
  let isSelected = false,
      forceSelect = prefs.isChangeFolderTreeViewEnabled;
  const theTreeView = gFolderTreeView;
  
  if (theTreeView.mode)
    QuickFolders.lastTreeViewMode = theTreeView.mode; // backup of view mode. (TB78)

  folderIndex = theTreeView.getIndexOfFolder(msgFolder);
  if (null == folderIndex) {
    util.logDebugOptional("folders.select","theTreeView.selectFolder(" + msgFolder.prettyName + ", " + forceSelect + ")");
    isSelected = theTreeView.selectFolder(msgFolder, forceSelect); // forceSelect
    folderIndex = theTreeView.getIndexOfFolder(msgFolder);
  }
  util.logDebugOptional("folders.select","folderIndex = " + folderIndex);
  
  if (msgFolder.parent) {
    util.logDebugOptional("folders.select","ensureFolderViewTab()");
    util.ensureFolderViewTab(); // let's always do this when a folder is clicked!

    if (null==folderIndex) {
      util.logDebugOptional("folders.select","ensureNormalFolderView()");
      util.ensureNormalFolderView();
      folderIndex = theTreeView.getIndexOfFolder(msgFolder);
      util.logDebugOptional("folders.select","folderIndex = " + folderIndex);
    }

    let parentIndex = theTreeView.getIndexOfFolder(msgFolder.parent);
    util.logDebugOptional("folders.select","parent index: " + parentIndex);
    // flags from: mozilla 1.8.0 / mailnews/ base/ public/ nsMsgFolderFlags.h
    let specialFlags = Flags.MSG_FOLDER_FLAG_INBOX + Flags.MSG_FOLDER_FLAG_QUEUE + Flags.MSG_FOLDER_FLAG_SENTMAIL 
                     + Flags.MSG_FOLDER_FLAG_TRASH + Flags.MSG_FOLDER_FLAG_DRAFTS + Flags.MSG_FOLDER_FLAG_TEMPLATES 
                     + Flags.MSG_FOLDER_FLAG_JUNK + Flags.MSG_FOLDER_FLAG_ARCHIVES ; 
    if (msgFolder.flags & specialFlags) {
      // is this folder a smartfolder?
      let isSmartView = (theTreeView.activeModes && theTreeView.activeModes.includes("smart")) ||
                        (theTreeView.mode && theTreeView.mode=="smart");
      
      if (folderUri.indexOf("nobody@smart")>0 && null==parentIndex && !isSmartView) {
        util.logDebugOptional("folders.select","smart folder detected, switching treeview mode...");
        // toggle to smartfolder view and reinitalize folder variable!
        if (theTreeView.activeModes)
          theTreeView.activeModes.push("smart");
        else if (theTreeView.mode)
          theTreeView.mode="smart"; // after changing the view, we need to get a new parent!!
        //let rdf = Cc['@mozilla.org/rdf/rdf-service;1'].getService(Ci.nsIRDFService),
        //    folderResource = rdf.GetResource(folderUri);
        msgFolder = model.getMsgFolderFromUri(folderUri);   // folderResource.QueryInterface(Ci.nsIMsgFolder);
        parentIndex = theTreeView.getIndexOfFolder(msgFolder.parent);
      }
      
      isSmartView = (theTreeView.mode && theTreeView.mode=="smart") ||
                    (theTreeView.activeModes && theTreeView.activeModes.includes("smart"));

      // a special folder, its parent is a smart folder?
      if (msgFolder.parent.flags & Flags.MSG_FOLDER_FLAG_VIRTUAL || isSmartView) {
        if (null === folderIndex || parentIndex > folderIndex) {
          // if the parent appears AFTER the folder, then the "real" parent is a smart folder.
          let smartIndex=0;
          // we can have "non-folder" items here
          while (!theTreeView._rowMap[smartIndex]._folder || 
                 0x0 === (specialFlags & (theTreeView._rowMap[smartIndex]._folder.flags & msgFolder.flags)))
            smartIndex++;
          if (!(theTreeView._rowMap[smartIndex]).open) {
            theTreeView._toggleRow(smartIndex, false);
          }
        }
      }
      else { // all other views:
        if (null !== parentIndex) {
          if (!(theTreeView._rowMap[parentIndex]).open)
            theTreeView._toggleRow(parentIndex, true); // server
        }
        else {
          util.logDebugOptional("folders.select", "Can not make visible: " + msgFolder.URI + " - not in current folder view?");
        }
      }
    }
  }

  if (folderIndex != null) {
    try {
      util.logDebugOptional("folders.select","Selecting folder via treeview.select(" + msgFolder.prettyName + ")..\n" +
        msgFolder.URI);
      // added forceSelect = true
      theTreeView.selectFolder (msgFolder, true);
      util.logDebugOptional("folders.select","ensureRowIsVisible()..");
      
      if (theTreeView._treeElement.ensureRowIsVisible)
        theTreeView._treeElement.ensureRowIsVisible(folderIndex); // Thunderbird 68
      else
        theTreeView._treeElement.treeBoxObject.ensureRowIsVisible(folderIndex);
    }
    catch(e) { util.logException("Exception selecting via treeview: ", e);};
  }

  // reset the view mode.
  if (!prefs.isChangeFolderTreeViewEnabled) {
    // this only works in Thunderbird 78 - Tb91 has the activeModes array... 
    if (QuickFolders.lastTreeViewMode !== null && theTreeView.mode !== QuickFolders.lastTreeViewMode) {
      util.logDebugOptional("folders.select","Restoring view mode to " + QuickFolders.lastTreeViewMode + "...");
      theTreeView.mode = QuickFolders.lastTreeViewMode;
    }
  }

  //folderTree.treeBoxObject.ensureRowIsVisible(gFolderTreeView.selection.currentIndex); // folderTree.currentIndex
  if ((msgFolder.flags & Flags.MSG_FOLDER_FLAG_VIRTUAL)) // || folderUri.indexOf("nobody@smart")>0
    QuickFolders.Interface.onTabSelected();
	
	// could not find folder!
	if (null == folderIndex || folderIndex<0) {
    util.logDebugOptional("folders.select", 'Could not find folder in tree (folderIndex = ' + folderIndex + ')');
		return false;
	}

	if (prefs.isFocusPreview && !(QuickFolders.Interface.getThreadPane().collapsed)) {
    util.logDebugOptional("folders.select", 'setFocusThreadPane()');
		QuickFolders.Interface.setFocusThreadPane();
		document.commandDispatcher.advanceFocus();
		document.commandDispatcher.rewindFocus();
	}
	
	// speed up the highlighting... - is this only necessary on MAC ?
	if (highlightTabFirst) {
	  let entry = model.getFolderEntry(folderUri);
		if (entry) {
      util.logDebugOptional("folders.select", 'onTabSelected() - highlighting speed hack');
		  QuickFolders.Interface.onTabSelected();  
		}
	}	
	
	return true;
}; // MySelectFolder


QuickFolders.FolderTreeSelect = function FolderTreeSelect(event) {
  // onSelect in Folder Tree
  let util = QuickFolders.Util,
      logDO = util.logDebugOptional.bind(util),
      logEx = util.logException.bind(util),
      QI = QuickFolders.Interface,
      folders = GetSelectedMsgFolders();
  try {
    logDO("events", "FolderTreeSelect: event target = " + event.target);
    if (folders.length) {
      let selFolder = folders[0];
      logDO("events", "FolderTreeSelect selecting folder  " + selFolder.prettyName);
      QI.onTabSelected(null, selFolder);
    }
  }
  catch(ex) {
    logEx('FolderTreeSelect failed', ex);
  }
  
};

// set up the folder listener to point to the above function
QuickFolders.FolderListener = {
	lastRemoved: null, // MsgFolder was removed
	lastAdded: null,   // MsgFolder was added
  newFolderName: null,
  oldFolderUri: null,
	ELog: function errLogFallback(msg) {
    try {
      try {Components.utils.reportError(msg);}
      catch(e) {
        let Cc = Components.classes,
            Ci = Components.interfaces,
            cserv = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
        cserv.logStringMessage("QuickFolders:" + msg);
      }
    }
    catch(e) {
      // write to TB status bar??
      try{QuickFolders.Util.logToConsole("Error: " + msg);} catch(e) {;};
    };
	},

	OnItemAdded: function fldListen_OnItemAdded(parent, item, viewString) {
		try {
			if (!QuickFolders) return;
      const util = QuickFolders.Util,
            Ci = Components.interfaces,
            Model = QuickFolders.Model,
            ADVANCED_FLAGS = util.ADVANCED_FLAGS;
            
      if (item.hasOwnProperty('folderURL')) {
        let f = item.QueryInterface(Ci.nsIMsgFolder);
        util.logDebugOptional("listeners.folder", "OnItemAdded\n" + f.prettyName + "\n"  + f.URI);
        let fld = Model.getMsgFolderFromUri(f.URI, true);
        if (!parent.flags & util.FolderFlags.MSG_FOLDER_FLAG_TRASH) {
          util.touch(fld || f); // set MRUTime, unless folder was deleted.
        }
        QuickFolders.FolderListener.lastAdded = f;
      }
      
      // [Bug 26683] flag to set moved mail to unread.
      if (item.hasOwnProperty('subject')) {
        let m = item.QueryInterface(Components.interfaces.nsIMsgDBHdr),
            tabEntry = Model.getFolderEntry(parent.folderURL);
            
        if (tabEntry &&  tabEntry.flags & ADVANCED_FLAGS.SETMAIL_UNREAD) {
          let messageList;
          if (util.versionGreaterOrEqual(util.ApplicationVersion, "85")) {
            messageList = [item];
          }
          else {
            messageList = Components.classes["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
            messageList.appendElement(item , false);
          }
          parent.markMessagesRead(messageList, false);
        }
        
      }
		}
		catch(e) { };
	},

	OnItemRemoved: function fldListen_OnItemRemoved(parent, item, viewString) {
		try {
			if (!QuickFolders)
				return;
      const util = QuickFolders.Util,
			      Model = QuickFolders.Model,
            listener = QuickFolders.FolderListener,
						QI = QuickFolders.Interface;
			let f = item.QueryInterface(Components.interfaces.nsIMsgFolder),
			    fromURI = f.URI,
			    toURI = listener.lastAdded ? listener.lastAdded.URI : "",
          logDebug = util.logDebug.bind(util),
          logDebugOptional = util.logDebugOptional.bind(util),
          logToConsole = util.logToConsole.bind(util);
			logDebugOptional("listeners.folder", "OnItemRemoved\n" + f.prettyName + "\nFROM " + fromURI);
			listener.lastRemoved = f;
			// check if QuickFolders references this message folder:
			if (fromURI !== toURI && toURI) {
				if (listener.lastAdded && (f.name === listener.lastAdded.name)) {
					// the folder was moved, we need to make sure to update any corresponding quickfolder:
					if (toURI)  {
						// we should not do this when deleting, we need to delete the Tab!
						let newParent = Model.getMsgFolderFromUri(toURI).parent;
						if (newParent && (newParent.flags & util.FolderFlags.MSG_FOLDER_FLAG_TRASH)) {
							logDebug ("Folder  " + f.name + " moved to Trash. Leaving Tab URI unchanged for deletion.");
						}
						else {
							logDebugOptional("folders,listeners.folder","Trying to move Tab " + f.name + " from URI \n" + fromURI + "\n to URI \n" + toURI);
							let ct = Model.moveFolderURI(fromURI, toURI);
							logDebug ("Successfully updated " + ct + " URIs for folder " + f.name);
							QuickFolders.Interface.updateFolders(true, true);
						}
					}
					else {
						let s = "Failed to update URI of folder: " + f.name + " please remove it manually and add to QuickFolders bar";
						logToConsole (s);
						util.alert(s);
					}
				}
				else {
					let entry = Model.getFolderEntry(folderUri);
					if (entry) {
						QI.deleteFolderPrompt(entry);
					}
				}
			}
			listener.lastAdded = null;
      // listener.lastRemoved = null;
		}
		catch(e) { };
	},

	// parent, item, viewString
	OnItemPropertyChanged: function fldListen_OnItemPropertyChanged(item, property, oldValue, newValue) {
		//var x=property.toString();
	},

	OnItemIntPropertyChanged: function fldListen_OnItemIntPropertyChanged(item, property, oldValue, newValue) {
		function add1000Separators( sValue ) {
			let sRegExp = new RegExp('(-?[0-9]+)([0-9]{3})');
			while(sRegExp.test(sValue.toString())) { sValue = sValue.replace(sRegExp, '$1,$2'); }
			return sValue;
		}
		try {
			if (typeof QuickFolders === 'undefined')
				return;
      const util = QuickFolders.Util;
			let prop = property ? property.toString() : '',
          log = util.logDebugOptional.bind(util),
          isTouch = false;
			log("listeners.folder", "OnItemIntPropertyChanged - property = " + prop);
			if (prop === "TotalUnreadMessages" ||
				(QuickFolders.Preferences.isShowTotalCount && prop === "TotalMessages")) {
					QuickFolders.Interface.setFolderUpdateTimer(item);
					let cF = QuickFolders.Interface.CurrentFolderTab;
					if (cF && cF.folder && cF.folder==item) { // quick update of CurrentFolder tab:
					  QuickFolders.Interface.initCurrentFolderTab(cF, item);
					}
          if (newValue > oldValue)
            isTouch = true;
			}
      if (prop === "TotalMessages" && (newValue > oldValue)) {
        isTouch = true;
      }
      // [issue 80] add folder to recent list if item was added (via d+d)
      if (isTouch) {
        util.touch(item);
      }

			if (QuickFolders.compactReportFolderCompacted && prop === "FolderSize") {
				try
				{
					QuickFolders.compactReportFolderCompacted = false;
					let size1 = QuickFolders.compactLastFolderSize,
					    size2 = item.sizeOnDisk,
					    message = "";
					if (item.URI && QuickFolders.compactLastFolderUri !== item.URI) {
						// should we reset it, in case the real message got lost ?
						return;
					}

					// describe the action that caused the compacting
					switch (QuickFolders.compactReportCommandType) {
						case 'compactFolder':
							message = util.getBundleString("qfCompactedFolder") + " '" + item.prettyName + "'";
							break;
						case 'emptyJunk':
							message = util.getBundleString("qfEmptiedJunk") + " '" + item.prettyName + "'";
							if (!item.URI)
								size2 = 0;
							break;
						case 'emptyTrash':
							message = util.getBundleString("qfEmptiedTrash");
							if (!item.URI)
								size2 = 0;
							break;
						default:
							message = "unknown compactReportCommandType: [" + compactReportCommandType + "]";
							break;
					}
					let originalSize= util.getBundleString("qfCompactedOriginalFolderSize"),
					    newSize = util.getBundleString("qfCompactedNewFolderSize"),
					    expunged = util.getBundleString("qfCompactedBytesFreed"),
					    out = message + " :: "
						+ (size1 ? (originalSize + ": " + add1000Separators(size1.toString()) + " ::  "
								   + expunged + ":" + add1000Separators((size1-size2).toString()) + " :: ")
								 : " ")
						+ newSize + ": " + add1000Separators(size2.toString()) ;
					//make sure it displays straight away and overwrite the compacting done message as well.

					setTimeout(function() { 
            QuickFolders.Util.slideAlert("QuickFolders",out); QuickFolders.Util.logDebug(out); 
          }, 250); // display "after compacting"

					QuickFolders.compactLastFolderUri = null;
					QuickFolders.compactLastFolderSize = 0;
          
				} catch(e) {;};
			}
		}
		catch(e) {this.ELog("Exception in Item OnItemIntPropertyChanged - TotalUnreadMessages: " + e);};
	},
	OnItemBoolPropertyChanged: function fldListen_OnItemBoolPropertyChanged(item, property, oldValue, newValue) {},
	OnItemUnicharPropertyChanged: function fldListen_OnItemUnicharPropertyChanged(item, property, oldValue, newValue) {},
	OnItemPropertyFlagChanged: function fldListen_OnItemPropertyFlagChanged(item, property, oldFlag, newFlag) {},
	OnItemEvent: function fldListen_OnItemEvent(item, event) {
    const listener = QuickFolders.FolderListener;
		let eString = event.toString();
		try {
			if (!QuickFolders || !QuickFolders.Util)
				return;
      let util = QuickFolders.Util,
          QI = QuickFolders.Interface,
          log = util.logDebugOptional.bind(util);
			log("listeners.folder", "OnItemEvent - evt = " + eString);
			switch (eString) {
        // a better option might be to hok into 
        // folderTree.onSelect 
        // which in Tb calls FolderPaneSelectionChange()
        // which uses GetSelectedMsgFolders()
				case "FolderLoaded": // DeleteOrMoveMsgCompleted
					try {
            log("events","event: " + eString + " item:" + item.prettyName);
						if (QI) {
              // make sure this event is not a "straggler"
							try {
								let folders = GetSelectedMsgFolders(),
										itemFound = util.iterateFolders(folders, item, QI.onTabSelected);
								if (!itemFound) {
									log("events", "FolderLoaded - belated on folder " + item.prettyName + " - NOT shown in current folder bar!");
								}
							}
							catch (ex) {
								// cannot  get selected folders: new windows maybe?
							}
              // use shim to avoid foreach warning
            }
					}
					catch(e) {this.ELog("Exception in FolderListener.OnItemEvent {" + event + "} during calling onTabSelected:\n" + e)};
					break;
				case "RenameCompleted":
					// item.URI;=> is this the old folder uri ? - what's the new one.
          
          let newFolderName = listener.newFolderName || '',
              oldUri = listener.oldFolderUri;
					if (!item || (item.URI == oldUri && newFolderName)) {
						log("events,listeners.folder","event: " + eString + 
								"\nNEW item.URI = " + (item && item.URI ? item.URI : "?") +
								"\nold URI = " + oldUri +
								"\nstored newFolderName = " + newFolderName);
						QuickFolders.Model.moveFolderURI(oldUri, newFolderName);
            listener.newFolderName = null;
            listener.oldFolderUri = null;
					}
					else { // [Bug 26645]  moving folders in IMAP tree - check referential integrity of model
					  let movedFolder = listener.lastRemoved || item;
						if (movedFolder) {
							// if folder was moved, the prettyName is the same:
							// if (movedFolder.prettyName == item.prettyName ) { // && item.server.type=='imap'
								QuickFolders.Model.moveFolderURI(movedFolder.URI, item.URI);
							// }
						}
						listener.lastRemoved = null;
						listener.oldFolderUri = null;
					}
					break;
        default:
          log("events","event: " + eString);
          break;
			}
		}
		catch(e) {this.ELog("Exception in FolderListener.OnItemEvent {" + eString + "}:\n" + e)};
	},
	OnFolderLoaded: function fldListen_OnFolderLoaded(aFolder) { 
    let log = QuickFolders.Util.logDebugOptional.bind(QuickFolders.Util);
		log("listeners.folder", "OnFolderLoaded - folder = " + aFolder.prettyName);
	},
	OnDeleteOrMoveMessagesCompleted: function fldListen_OnDeleteOrMoveMessagesCompleted(aFolder) {
    let log = QuickFolders.Util.logDebugOptional.bind(QuickFolders.Util);
		log("listeners.folder", "OnDeleteOrMoveMessagesCompleted - folder = " + aFolder.prettyName);
	}
}

QuickFolders.CopyListener = {
  OnStartCopy: function copyLst_OnStartCopy() { },
  OnProgress: function copyLst_OnProgress(Progress, ProgressMax) { },
  SetMessageKey: function copyLst_SetMessageKey(key) { },
  GetMessageId: function copyLst_GetMessageId(msgId) { // out ACString aMessageId 
  },
  OnStopCopy: function copyLst_OnStopCopy(status) { // in nsresult aStatus
    if (QuickFolders.bookmarks && Components.isSuccessCode(status)) {
      let bm = QuickFolders.bookmarks;
      if (bm.dirty) {
        let invalidCount = 0;
        for (let i=0; i<bm.Entries.length; i++) {
          let entry = bm.Entries[i];
          if (entry.invalid) {
            invalidCount++;
          }
        }
        if (invalidCount)
          bm.persist();  // save & update menu with new Uris (we flagged them as invalid during Util.moveMessages!)
      }
    }
  }
  
}

QuickFolders.LocalErrorLogger = function(msg) {
	let Cc = Components.classes,
	    Ci = Components.interfaces,
	    cserv = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
	cserv.logStringMessage("QuickFolders:" + msg);
}

