/* List.js is required to make this table work. */

var options = {
	//   valueNames: [ { data: ['date'] }, { data: ['description'] }, { data: ['yearly']} ],
	valueNames: ['date', 'description', 'yearly', 'test', { data: ['id']}],
	item: '<tr class="list-row"><td class="date"></td><td class="description"></td><td class="yearly"></td><td class="test"></td></tr>',
};

console.debug('Start');
// var tableList = new List('tableID',  {plugins: ListController()});
var tableList = new List('tableID', options);

var lst = document.getElementById('tableID');
// lst.addEventListener('click', onClick);
// lst.addEventListener('keydown', onKey);

tableList.controller = new ListController(tableList);

var Test1 = function(list) {
	test_property1: list;

	var init = function(l) {
		console.debug('initialize '+l);
	}
	
};


// Test1('hello');


tableList.add({
	date: "11-6",
	description: "my birthday",
	yearly: "True",
	test: "hello",
	id: "1"
});


tableList.add({
	date: "11-6",
	description: "my holiday",
	yearly: "True",
	test: "hello",
	id: "2"
});
