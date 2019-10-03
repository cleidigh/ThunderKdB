var mapaPlus;
window.addEventListener("load", function()
{
let { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components,
		log = mapaPlus.core.log,
		_args = "arguments" in window && window.arguments.length ? window.arguments[0] : {},
		args = {};

function $(id)
{
	return document.getElementById(id);
}
function mergeObj(obj1, obj2)
{
	try
	{
		Object.assign(obj1, obj2);
	}
	catch(e)
	{
		for (let key in obj2)
		{
			if (obj2.hasOwnProperty(key))
			{
				obj1[key] = obj2[key];
			}
		}
	}
}

mergeObj(mapaPlus, {
	load: function load()
	{
		mapaPlus.init();
	},//load()

	action: function action(button)
	{
		args.button = button;
		if (button)
		{
			let list = {};
			let children = this.treeView.visibleData;

			for(let i = 0; i < children.length; i++)
			{
				if (children[i].sel != 2)
					continue;

					list[children[i].id] = children[i]._value;
			}

			for(let i in args.data)
			{
				if (!(i in list))
					delete args.data[i];
			}
		}
	},//action()

	unload: function unload()
	{
		$("tree").removeEventListener("keypress", this.treeKeypress, true);
		$("tree").removeEventListener("click", this.treeClick, true);
		window.close();
	},//unload()

	init: function init()
	{
		if (this.inited)
			return;

		if (!args.data)
			return this.unload();

		this.buildList(args.data, "pref", 0);
		$("tree").view = this.treeView;
		for(let i = this.treeView.visibleData.length - 1; i >= 0; i--)
		{
			this.treeView.toggleOpenState(i);
		}
		$("tree").addEventListener("keypress", this.treeKeypress, true);
		$("tree").addEventListener("select", this.treeClick, true);
		$("tree").addEventListener("click", this.treeClick, true);
		this.selColumn();
		this.inited = true;
	},//init()

	treeClick: function treeClick(e)
	{
		if (e.type != "click")
			return;

		if (e.target.id == "sel")
		{
			mapaPlus.selectAllToggle(e.button);
			return;
		}
		else
		{
		}
	},

	selectAllToggle: function selectAllToggle(button)
	{
		if (button == 2)
			return this.invertSelection();

		if (button)
			return;

		let list = this.treeView.visibleData,
				state = 0;

		for(let i = 0; i < list.length; i++)
		{
			state |= list[i].sel;
			if (state > 2)
				break;
		}
		if (state > 2)
			state = 1;

		state  ^= 3;
		for (let i = 0; i < list.length; i++)
		{
			list[i].sel = state;
		}

		this.treeView.treeBox.invalidateRange(this.treeView.treeBox.getFirstVisibleRow(), this.treeView.treeBox.getLastVisibleRow())
		this.selColumn();
	},//selectAllToggle()

	invertSelection: function invertSelection()
	{
		let list = this.treeView.visibleData;

		for (let i = 0; i < list.length; i++)
		{
			list[i].sel ^= 3;
		}
		this.treeView.treeBox.invalidateRange(this.treeView.treeBox.getFirstVisibleRow(), this.treeView.treeBox.getLastVisibleRow());
		this.selColumn();
	},//invertSelection()

	selColumn: function selColumn()
	{
		let list = this.treeView.visibleData;
				state = 0;

		for (let i = 0; i < list.length; i++)
		{
			state |= list[i].sel;
			if (state > 2)
				break;
		}
		$("sel").setAttribute("checked", state);
	},//selColumn()

	getTreeSelections: function getTreeSelections(tree)
	{
		let selections = [],
				select;

		try
		{
			if (tree.treeBoxObject.view && tree.treeBoxObject.view.selection)
				select = tree.treeBoxObject.view.selection;
		}
		catch(e){};


		if (select)
		{
			let count = select.getRangeCount(),
					min = new Object(),
					max = new Object();
			for (let i = 0; i < count; i++)
			{
				select.getRangeAt(i, min, max);
				for (let k = min.value; k <= max.value; k++)
				{
					if (k != -1)
						selections[selections.length] = k;
				}
			}
		}
		return selections;
	},//getTreeSelections()

	treeKeypress: function treeKeypress(e)
	{
		if (e.charCode == e.DOM_VK_SPACE)
		{
			let self = mapaPlus,
					sel = self.getTreeSelections($("tree")),
					idx = self.treeView.selection.currentIndex,
					list = self.treeView.visibleData,
					state = self.treeView.getCheckboxState(list[idx]);
			if (state > 2)
				state = 2;
			else
				state ^= 3;

			for(let i = 0; i < sel.length; i++)
			{
				list[sel[i]].sel = state;
			}
			self.treeView.treeBox.invalidateRange(self.treeView.treeBox.getFirstVisibleRow(),self.treeView.treeBox.getLastVisibleRow())
		}
	},//treeKeypress()

	buildList: function buildList(data, id, objName)
	{
		let obj = $("main");
		if (!obj)
			return;

		for(let i in data)
		{
			let value = typeof(data[i]) == "object" && data[i].constructor.name != "Array" ? null : data[i];

			if (!(i in this.core.pref.prefs))
				continue;

			this.treeView.visibleData.push({
				name: this.strings["optionsRestore_" + i] || i,
				id: i,
				value: value,
				_value: data[i],
				sel: 2
			})
		}
		this.treeView.visibleData.sort(function(a,b)
		{
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		})
		this.selColumn();
	},//buildList()

	treeView: {

		visibleData : [
		],

		treeBox: null,
		selection: null,

		get rowCount()                     { return this.visibleData.length; },
		setTree: function(treeBox)         { this.treeBox = treeBox; },
		getCellText: function(row, col)
		{
			if (col.id != "sel")
				return this.visibleData[row][col.id];
		},
		isContainer: function(row)         { return false; },
		isContainer: function(row)         { return false; },
		isContainerOpen: function(row)     { return false; },
		isContainerEmpty: function(row)    { return false; },
		isSeparator: function(row)         { return false; },
		isSorted: function()               { return false; },
		isEditable: function(row, col)  { return col.id == "sel"; },

		getParentIndex: function(row) { return -1;},
		getLevel: function(row) { return -1; },
		hasNextSibling: function(row, after) {},
		toggleOpenState: function(row) {},

		getImageSrc: function(row, col) {},
		getProgressMode : function(row,col) {},
		getCellValue: function(row, col){},
		setCellValue: function(row, col, val )
		{
			let state = this.getCheckboxState(this.visibleData[row]);
			if (state == 3)
				state = 2;
			else
				state ^= 3;

			this.visibleData[row][col.id] = state;
			mapaPlus.selColumn();
		},
		cycleHeader: function(col, elem) {},
		cycleCell: function(row, col) {},
		performAction: function(action) {},
		performActionOnCell: function(action, index, col){},
		getRowProperties: function(row, props) {},
		getCheckboxState: function(obj)
		{
			return obj.sel;
		},
		getCellProperties: function(row, col, props)
		{
			let old = typeof(props) != "undefined",
					aserv;

			let state = 0;
			if (col.id == "sel")
				state = this.getCheckboxState(this.visibleData[row]);

			if (old)
			{
				aserv = Cc["@mozilla.org/atom-service;1"].getService(Ci.nsIAtomService);

				if (col.id == "sel")
					props.AppendElement(aserv.getAtom("checked" + state));
			}
			else
			{
				props = "";
				if (col.id == "sel")
					props += " checked" + state;
			}
			return props;
		},
		getColumnProperties: function(col, element, props) {},
	},//treeView

});//mapaPlus

if (typeof(_args) == "object" && _args.wrappedJSObject)
	args = _args.wrappedJSObject;

delete _args;
}, false);
