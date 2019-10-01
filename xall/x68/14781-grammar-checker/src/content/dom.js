/* globals GetCurrentEditor */
/* exported NodesMapping */

var NodesMapping = function() {

    this.nodes = {};
    this.counterY = 0;
    this.counterX = 0;

    this.trim = function(string) {
        return string.replace(/(^[\n\r]+)|([\n\r]+$)/g, "");
    };

    this.init = function() {
        this.nodes = {};
        this.counterX = 0;
        this.counterY = 0;
        this.nodes[0] = {};
        let editor = GetCurrentEditor();
        let root = editor.rootElement;
        return this.parseNodes("", root);
    };

    this.parseNodes = function(result, root) {
        let i = 0, value = result;
        for (i = 0; i < root.childNodes.length; ++i) {
            let item = root.childNodes[i];
            if (item.nodeType == Node.TEXT_NODE) {
                let text = this.trim(item.textContent);
                if (text.length > 0) {
                    value += text;
                    let previousX = this.counterX;
                    this.counterX = previousX + text.length;
                    let currentNodes = this.nodes[this.counterY];
                    currentNodes[previousX + "," + this.counterX] = item;
                }
            } else if (Boolean(item.localName) && item.localName.toUpperCase() == "BR")  {
                if (this.counterX > 0) {
                    value += "\n";
                    this.counterY += 1;
                    this.counterX = 0;
                    this.nodes[this.counterY] = {};
                }
            } else {
                value = this.parseNodes(value, item);
            }
        }
        return value;
    };

    this.findNode = function(x, y) {
        var currentNodes = this.nodes[y];
        if (typeof currentNodes !== 'undefined') {
            for (var i = 0; i < currentNodes.length; i++) {
                var key = currentNodes[i];
                let range = key.split(",");
                let left = parseInt(range[0]);
                let right = parseInt(range[1]);
                if (x >= left && x < right) {
                    return {
                        node: currentNodes[key],
                        offset: x - left
                    };
                }
            }
        }
        return null;
    };
}
