formOne.addEventListener('click', function () {
var whiteTheme = {
"colors": {
"frame": "white",
"bookmark_text": "black",
"popup": "white",
"popup_text": "black",
"popup_border": "black",
"popup_highlight": "lightgray",
"popup_highlight_text": "black",
"sidebar": "white",
"sidebar_text": "black",
"sidebar_highlight": "lightgray",
"sidebar_highlight_text": "black",
"sidebar_border": "black",
"tab_text": "black",
"tab_line": "blue",
"tab_loading": "white",
"tab_background_text": "black",
"toolbar_field": "white",
"toolbar_field_text": "black",
"toolbar_field_highlight": "lightgray",
"toolbar_field_highlight_text": "black",
"toolbar_field_focus": "white",
"toolbar_field_text_focus": "black",
"toolbar_field_border": "black",
"toolbar_field_border_focus": "red",
"toolbar_top_separator": "black",
"toolbar_bottom_separator": "black",
"toolbar_vertical_separator": "black",
"tab_selected": "white",
"toolbar": "white"
        }
    }
browser.theme.update(whiteTheme);
});

formTwo.addEventListener('click', function () {
var blackTheme = {
"colors": {
"frame": "black",
"bookmark_text": "white",
"popup": "#303030",
"popup_text": "white",
"popup_border": "gray",
"popup_highlight": "gray",
"popup_highlight_text": "white",
"sidebar": "#303030",
"sidebar_text": "white",
"sidebar_highlight": "gray",
"sidebar_highlight_text": "white",
"sidebar_border": "gray",
"tab_text": "white",
"tab_line": "blue",
"tab_loading": "#303030",
"tab_background_text": "white",
"toolbar_field": "#303030",
"toolbar_field_text": "white",
"toolbar_field_highlight": "gray",
"toolbar_field_highlight_text": "white",
"toolbar_field_focus": "blue",
"toolbar_field_text_focus": "white",
"toolbar_field_border": "gray",
"toolbar_field_border_focus": "black",
"toolbar_top_separator": "black",
"toolbar_bottom_separator": "black",
"toolbar_vertical_separator": "black",
"tab_selected": "#303030",
"toolbar": "#303030"
        }
    }
browser.theme.update(blackTheme);
});
