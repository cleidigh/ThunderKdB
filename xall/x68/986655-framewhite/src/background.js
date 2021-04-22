var white = function() {
    var theme = {
        "colors": {
            "frame": "white",
            "bookmark_text": "black",
            "popup": "white",
            "popup_text": "black",
            "popup_border": "black",
            "popup_highlight": "LightGray",
            "popup_highlight_text": "Black",
            "sidebar": "white",
            "sidebar_text": "black",
            "sidebar_highlight": "LightGray",
            "sidebar_highlight_text": "Black",
            "sidebar_border": "black",
            "tab_text": "black",
            "tab_line": "blue",
            "tab_loading": "white",
            "tab_background_text": "black",
            "toolbar_field": "white",
            "toolbar_field_text": "black",
            "toolbar_field_highlight": "blue",
            "toolbar_field_highlight_text": "white",
            "toolbar_field_focus": "white",
            "toolbar_field_text_focus": "black",
            "toolbar_field_border": "black",
            "toolbar_field_border_focus": "red",
            "toolbar_top_separator": "black",
            "toolbar_bottom_separator": "black",
            "toolbar_vertical_separator": "black",
            "tab_selected": "white",
            "toolbar": "white",
            "box_bg": "white",
            "box_text": "black"
        }
    }
    browser.theme.update(theme);
};

white();