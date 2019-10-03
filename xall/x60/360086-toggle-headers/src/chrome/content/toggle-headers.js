var com_mattsch_toggleHeaders = {
    compactHeadersWasCollapsed: false,
}

com_mattsch_toggleHeaders.toggleHeadersView = function() {
    // Get the preferences mail branch...
    var mailPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("mail.");
    
    var currentHeaderSetting = mailPrefs.getIntPref("show_headers");
    
    // Switch from normal to all headers.
    if (currentHeaderSetting == 1) {
        goDoCommand('cmd_viewAllHeader');
    }
    // Switch from all to normal headers.
    else if (currentHeaderSetting == 2) {
        goDoCommand('cmd_viewNormalHeader');
    }
    
    // Handle aditional necessary behaviour if CompactHeaders is installed.
    com_mattsch_toggleHeaders.handleCompactHeader(currentHeaderSetting);    
}

// If compact headers is installed and the headers view is collapsed
// changing the headers setting has no (visual) effect.
// In that case the view has to be expanded and once normal headers
// will be viewed again it will be switched back to the collapsed view.
// (this solution only works when Thunderbird is not started with all headers shown)
com_mattsch_toggleHeaders.handleCompactHeader = function(oldHeaderSetting) {
    // Check if CompactHeaders is installed...
    var compactHeaders = com_mattsch_toggleHeaders.getCompactHeaders();
    
    if (compactHeaders != null) {
        var compactHeadersView = document.getElementById('CompactHeader_collapsedHeaderView');
        
        // Somehow collapsed means the opposite:
        // collapsed = true: expanded
        // collapsed = false: collapsed
        if (!compactHeadersView.collapsed) {
            // If normal headers were enabled before, just expand the headers view...
            if (oldHeaderSetting == 1) {
                compactHeaders.pane.coheToggleHeaderView();
                com_mattsch_toggleHeaders.compactHeadersWasCollapsed = true;
            }
            // If the headers view was collapsed and all headers enabled,
            // normal headers will be shown now which would be wrong behavior.
            // Just show expand the headers view instead.
            else if (oldHeaderSetting == 2) {
                compactHeaders.pane.coheToggleHeaderView();
                goDoCommand('cmd_viewAllHeader');
                com_mattsch_toggleHeaders.compactHeadersWasCollapsed = true;
            }
        }
        // Header view is expanded, but was previously collapsed.
        // This means we need to collapse it back again.
        else if (compactHeadersView.collapsed && com_mattsch_toggleHeaders.compactHeadersWasCollapsed) {
            compactHeaders.pane.coheToggleHeaderView();
            
            // Workaround for bug in CH 2.1.0 that prevents to properly collapse back.
            if (typeof org_mozdev_compactHeader !== 'undefined') {
                compactHeaders.pane.coheToggleHeaderView();
                compactHeaders.pane.coheToggleHeaderView();
            }
                        
            com_mattsch_toggleHeaders.compactHeadersWasCollapsed = false;
        }    
    }
}

/**
 * Returns the reference to CompactHeaders supporting both CompactHeaders <= 2.9.0 and higher.
 */
com_mattsch_toggleHeaders.getCompactHeaders = function() {
    // Check for CompactHeaders v2.0.9 and lower.
    if (typeof org !== 'undefined' && typeof org.mozdev !== 'undefined'
          && typeof org.mozdev.compactHeader !== 'undefined') {
              return org.mozdev.compactHeader;
    } 
    // Check for CompactHeaders v2.1.0 and higher.
    else if (typeof org_mozdev_compactHeader !== 'undefined') {
        return org_mozdev_compactHeader;
    }
    
    return null;
}