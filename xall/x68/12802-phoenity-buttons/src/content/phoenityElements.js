phb_context = document.getElementById("header-toolbar-context-menu");
phb_separator = document.createXULElement("menuseparator");
phb_separator.setAttribute("id", "phb_CompactHeader-separator");
phb_separator.setAttribute("insertafter", "phb_viewNormalHeaders");
phb_separator.setAttribute("hidden", "true");
phb_context.appendChild(phb_separator);
