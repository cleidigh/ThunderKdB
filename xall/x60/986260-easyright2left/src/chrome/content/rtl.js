function change_direction(direction) {
    var editor = GetCurrentEditor();
    var editor_type = GetCurrentEditorType();
    if (editor_type == "htmlmail" || editor_type == "html") {
        if (direction == 'rtl') {
            var txt = "<p style='text-align:right;' dir='" + direction + "'>" + "</p>";
        }
        if (direction == 'ltr') {
            var txt = "<p style='text-align:left;' dir='" + direction + "'>" + "</p>";
        }
        editor.insertHTML(txt);
        var selObj = window.getSelection();
    }
}
