(function() {
	var project = com.namespace("com.github.shimamu.asbcustom.abContactsPanelOverlay");

    function init() {
		var tree = AbResultsTree.create();
		var fields = AdditionalFields.create();
		fields.appendTo(tree);
    }

	var AdditionalFields = {
		create() {
			var fields = Object.create(AdditionalFields.prototype);
			fields.list = new Array(
				AbField.create("_AimScreenName", gLocalString._AimScreenName),
				AbField.create("Company"       , gLocalString.Company       ),
				AbField.create("NickName"      , gLocalString.NickName      ),
				AbField.create("SecondEmail"   , gLocalString.SecondEmail   ),
				AbField.create("Department"    , gLocalString.Department    ),
				AbField.create("JobTitle"      , gLocalString.JobTitle      ),
				AbField.create("CellularNumber", gLocalString.CellularNumber),
				AbField.create("PagerNumber"   , gLocalString.PagerNumber   ),
				AbField.create("FaxNumber"     , gLocalString.FaxNumber     ),
				AbField.create("HomePhone"     , gLocalString.HomePhone     ),
				AbField.create("WorkPhone"     , gLocalString.WorkPhone     )
			);
			return fields;
		},
		prototype: {
			appendTo(tree) {
				this.list.forEach(function(field) {
					tree.add(field);
				});
			}
		}
	}

	var AbResultsTree = {
		create() {
			var tree = Object.create(AbResultsTree.prototype);
			tree.element = document.getElementById("abResultsTree");
			return tree;
		},
		prototype: {
			append(component) {
				var treecols = this.element.childNodes[0];
				treecols.appendChild(component.element);
			},
			add(field) {
				var splitter = AbFieldSplitter.create();
				this.append(splitter);
				this.append(field);
			}
		}
	};

	var AbField = {
		create(id, label) {
			var field = Object.create(AbField.prototype);
			field.element = this._createElement(id, label);
			return field;
		},
		_createElement(id, label) {
			var element = document.createElement("treecol");
			element.setAttribute("id"     , id                                  );
			element.setAttribute("class"  , "sortDirectionIndicator"            );
			element.setAttribute("persist", "hidden ordinal width sortDirection");
			element.setAttribute("hidden" , "true"                              );
			element.setAttribute("flex"   , "1"                                 );
			element.setAttribute("label"  , label                               );
			return element;
		},
		prototype: {
		}
	};

	var AbFieldSplitter = {
		create() {
			var splitter = Object.create(AbFieldSplitter.prototype);
			splitter.element = this._createElement();
			return splitter;
		},
		_createElement() {
			var element = document.createElement("splitter");
			element.setAttribute("class", "tree-splitter");
			return element;
		},
		prototype: {
		}
	};

	init();
}());
