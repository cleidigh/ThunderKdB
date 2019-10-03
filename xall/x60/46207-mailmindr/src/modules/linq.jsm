let EXPORTED_SYMBOLS = ["Enumerable"];

var debugMode = true;
var print = (text) => { if (debugMode) { console.log('#> ' + text); } };

if (!console) var console = {
    log : function(aText) { },
    info : function(aText) { }
}

class Linq {
    constructor() {
        var self = this;

        function LinqEnumerable(iterable) {
            this[Symbol.iterator] = function*() { for (var item of iterable) { yield item;} }

        // 
        // 
        // 
        // 
        // 
        // 
        // 
        // 
        }
        
        this.from$$ = function(src) {
            var it = src;
            return self.wireUpObject(it);
        }

        this.from = function(src) {
            var it = self.ensureGenerator(src);
            return self.wireUpObject(it);
        }

        var is = this.is = o => false || { 
            "null" : o === null, 
            "undefined" : typeof o === 'undefined', 
            "empty" : 
                o === null 
                || typeof o === 'undefined' 
                || o === '' 
                || o === false
                || (o instanceof Array && o.length == 0), 
            "numeric" : typeof o === 'number', 
            "callable" : typeof o === 'function',
            "string" : typeof o === 'string',
            "array" : typeof o === 'object' && o instanceof Array,
            "generatorFunction" : typeof o === 'function' && o.constructor.name == 'GeneratorFunction',
            "generator" : typeof o === 'object' && o.constructor.name == 'GeneratorFunctionPrototype',
            "iterator" : typeof o === 'object' && o[Symbol.iterator]
        };

        function hasProperty(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
        }

        this.doZip$ = function*(first, second, resultSelector) {
            if (!is(first).array) {
                first = first.toArray();
            }
            if (!is(second).array) {
                second = second.toArray();
            }
            var minLength = Math.min(first.length, second.length);
            for (var idx = 0; idx < minLength; idx++ ) {
                yield resultSelector(first[idx], second[idx]);
            }
        }

        this.doJoin$ = function*(innerList, outerList, innerKeySelector, outerKeySelector, resultSelector) {
            if (!is(innerList).array) {
                innerList = innerList.toArray();
            }
            if (!is(outerList).array) {
                outerList = outerList.toArray();
            }

            if (true
                && is(innerList).array 
                && is(outerList).array 
                && is(innerKeySelector).callable 
                && is(outerKeySelector).callable 
                && is(resultSelector).callable) {
                var value;
                for (var innerIndex in innerList) {
                    var itemInner = [innerKeySelector(value = innerList[innerIndex]), innerIndex, value];

                    for (var outerIndex in outerList) {
                    if (outerKeySelector(outerList[outerIndex]) == itemInner[0]) {
                            print(itemInner[2]);
                        yield resultSelector(itemInner[2], outerList[outerIndex]);
                    }
                    }
                }
            } else {
                print('doJoin$: criteria failed');
            }
        }

        this.doWhere$ = function*(list, filter) {
            var fltr = filter || (() => true);
            for (var item of list) {
                if (fltr(item)) {
                    yield item;
                }
            }
        }

        this.doSelect$ = function*(what, projection) {
            for (var item of what) {
                yield projection(item);
            }
        }

        this.doSkip$$ = function* (what, num) {
            var idx = 0;
            for (var value of what) {
                idx++;
                if (idx > num) yield value;
            }
        }

        this.doTake$ = function* (what, num) {
            var idx = 0;
            for (var value of what) {
                idx++;
                yield value;
                if (idx == num) break;
            }
        }

        this.doSkipWhile$ = function* (what, condition) {
            var ret = false;
            for (var value of what) {
                if (!(ret = condition(value))) {
                    yield value;
                }
            }
        }

        this.doTakeWhile$ = function* (what, condition) {
            var ret = false;
            var idx = 0;
            for (var value of what) {
                if (ret = condition(value, idx)) {
                    yield value;
                    idx++;
                }
            }
        }

        this.doSort$ = function* (what, sortFunction) {
            if (!is(what).array) {
                what = what.toArray();
            }

            var sorted = what.sort(sortFunction);
            for (var value of sorted) {
                yield value;
            }
        }

        this.doAggregate = function(list, aggregator) {
            var collector;
            for (var item of list) {
                collector = aggregator(collector, item);
            }
            return collector;
        }

        this.doDistinct = function(list) {
            var list = is(list).array ? list : list.toArray();
            return self.wireUpObject(list.filter((item, index, arr) => arr.indexOf(item) == index));
        }

        this.doZip = function(first, second, resultSelector) {
            var gen = self.doZip$(first, second, resultSelector);
            return self.wireUpObject(gen);
        }

        this.doJoin = function(innerList, outerList, innerKeySelector, outerKeySelector, resultSelector) {
            var gen = self.doJoin$(innerList, outerList, innerKeySelector, outerKeySelector, resultSelector);
            return self.wireUpObject(gen);
        }

        this.doWhere = function(list, filter) {

            
            // 
            // 
            // 

            //var resultlist = self.ensureGenerator(list);
            return self.wireUpObject(self.doWhere$(list, filter));
        }

        this.doSelect = function(what, projection) {
            var result = self.doSelect$(what, projection); 
            return self.wireUpObject(self.toArray(result));
        }

        this.doSum = function(list, projection) {
            var result = 0;
            
            for (var x of list) { 
                result += is(projection).callable 
                    ? projection(x) 
                    : x 
            }

            return result;
        }

        this.doTake = function(list, num) {
            return self.wireUpObject(self.doTake$(list, num));
        }

        this.doTakeWhile = function(list, condition) {
            return self.wireUpObject(self.doTakeWhile$(list, condition));
        }

        this.doSkip = function(list, num) {
            return self.wireUpObject(self.doSkip$$(list, num));
        }

        this.doSkipWhile = function(list, condition) {
            return self.wireUpObject(self.doSkipWhile$(list, condition));
        }

        this.doSort = function(list, sortFunction) {
            return self.wireUpObject(self.doSort$(list, sortFunction));
        }

        this.toArray = function(iterator) {
            var result = [];
            for (var value of iterator) {
                result.push(value);
            }
            return result;
        }

        this.ensureGenerator = function(what) {
            if (is(what).iterator) {
                return what;
            }

            what.__iterator__ = function* () {
                console.log('got no generator');
                for (var item of what) {
                    yield item;
                }
            }

            // 
            // 
            // 
        }

        this.wireUpObject = function(whatObject) {
            
            //if (is(whatObject).array) {

                console.info('wire up..');

                var obj =  new LinqEnumerable(whatObject);

                if (!hasProperty(obj, 'aggregate')) {
                    Object.defineProperty(obj, 'aggregate', { enumerable : false, configurable: false, writable : false, value: (aggregator) => self.doAggregate(obj, aggregator) });
                }
                if (!hasProperty(obj, 'distinct')) {
                    Object.defineProperty(obj, 'distinct', { enumerable : false, configurable: false, writable : false, value: (aggregator) => self.doDistinct(obj) });
                }
                if (!hasProperty(obj, 'where')) {
                    Object.defineProperty(obj, 'where', { enumerable : false, configurable: false, writable : false, value: (filter) => self.doWhere(obj, filter) });
                }
                if (!hasProperty(obj, 'join')) {
                    Object.defineProperty(obj, 'join', { enumerable : false, configurable: false, writable : false, value: 
                        (outerList, innerKeySelector, outerKeySelector, resultSelector) => self.doJoin(obj, outerList, innerKeySelector, outerKeySelector, resultSelector) });
                }
                if (!hasProperty(obj, 'zip')) {
                    Object.defineProperty(obj, 'zip', { enumerable : false, configurable: false, writable : false, value: (second, resultSelector) => self.doZip(obj, second, resultSelector) });
                }
                if (!hasProperty(obj, 'select')) {
                    Object.defineProperty(obj, 'select', { enumerable : false, configurable: false, writable : false, value: (projection) => self.doSelect(obj, projection) });
                }
                if (!hasProperty(obj, 'sum')) {
                    Object.defineProperty(obj, 'sum', { enumerable : false, configurable: false, writable : false, value: (projection) => self.doSum(obj, projection) });
                }
                if (!hasProperty(obj, 'toArray')) {
                    Object.defineProperty(obj, 'toArray', { enumerable : false, configurable : false, writable : false, value : () => self.toArray(obj) });
                }
                if (!hasProperty(obj, 'take')) {
                    Object.defineProperty(obj, 'take', { enumerable : false, configurable : false, writable : false, value : (num) => self.doTake(obj, num) });
                }
                if (!hasProperty(obj, 'takeWhile')) {
                    Object.defineProperty(obj, 'takeWhile', { enumerable : false, configurable : false, writable : false, value : (condition) => self.doTakeWhile(obj, condition) });
                }
                if (!hasProperty(obj, 'skip')) {
                    Object.defineProperty(obj, 'skip', { enumerable : false, configurable : false, writable : false, value : (num) => self.doSkip(obj, num) });
                }
                if (!hasProperty(obj, 'skipWhile')) {
                    Object.defineProperty(obj, 'skipWhile', { enumerable : false, configurable : false, writable : false, value : (condition) => self.doSkipWhile(obj, condition) });
                }

                // 
                if (!hasProperty(obj, 'sort')) {
                    Object.defineProperty(obj, 'sort', { enumerable : false, configurable : false, writable : false, value : (sortFunction) => self.doSort(obj, sortFunction) });
                }
            //}

            // 

            return obj;
        }
    }
}

function _dump(o) {
    for (var i of o) {
        console.log(' >> ' + i);
    }
}

var Enumerable = new Linq();
