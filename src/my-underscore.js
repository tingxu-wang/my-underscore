/*
* 个人学习underscore源码的过程中实现的个人版本，基本上是看到一块搞得差不多明白了就写一段
* 刚开始的时候有照着写的情况，后来主要采用理解之后自己实现，所以有些函数的具体实现和原作不相同
* 但是我自认为自己的写法又没有什么问题，所以就保留了下来，不过会做出注释说明
* 同时一些处理浏览器兼容性的hack我也都没有加入，只关心主要的实现思路
* */

(function() {

	root = this;

	var previousUnderscore = root._;

	// 原生原型链
	var ArrayProto = Array.prototype,ObjectProto = Object.prototype;

	// 原型链上原生方法快捷方式
	var hasOwnProperty = ObjectProto.hasOwnProperty,
		toString = ObjectProto.toString;

	// 本体上原生方法快捷方式
	var nativeCreate = Object.create;


	/*
	* 所有创建构造函数的操作都在这个对象上进行，提升性能
	* 使用后释放原型链对象避免内存泄漏
	* */
	var Ctrl = function(){};

	/*
	 * 建立成函数的原因暂时未知
	 * */
	var _ = function (obj) {
		if (obj instanceof _) return obj;
		if (!(this instanceof _)) return new _(obj);
		this._wrapped = obj;
	};


	var nativeKeys = Object.keys;

	/*
	 * 判断执行环境挂载根对象
	 */
	if (typeof exports !== 'undefined') {
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = _;
		}
		exports = _;
	} else {
		root._ = _;
	}

	/*
	* 交还原有环境的underscore并令函数本身返回本库的_
	* */
	_.noConflict = function () {
		root._ = 	previousUnderscore;
		return _;
	};

	/*
	* 格式化用户传入的回调函数
	* @param func 用户的回调函数
	* @param context 执行上下文
	* @param argLength 传参个数
	* */
	var optimizeCb = function(func,context,argLength){
		if (context === null) return func;

		switch(argLength ? argLength : 3){
			case 1:
				return function(item){
					return func.call(context,item);
				};
			case 2:
				return function(item,index){
					return func.call(context,item,index);
				};
			case 3:
				return function(item,index,collction){
					return func.call(context,item,index,collction)
				};
			// 这个accumulator是累加器的意思，用于reducer
			case 4: return function(accumulator, item, index, collection) {
				return func.call(context, accumulator, item, index, collection);
			};
		}
		/*
		* 这里这么写看似啰嗦其实是一种性能上的优化策略，call方法比apply方法在运算性能上要高出很多倍
		* */
		return function(){
			return func.apply(context,arguments);
		}
	};

	// Object.create的简化版本实现
	var baseCreate = function(proto){
		if(!_.isObject) return {};
		if(nativeCreate) return nativeCreate(proto);
		Ctrl.prototype = proto;
		var obj = new Ctrl();
		Ctrl.prototype = null;
		return obj;
	};

	/*
	* 真正用于处理用户回调的方法
	* 由于用户可能不止传入function类型的参数，会有字符串，对象等多种情况
	* value为空 返回一个直接return value的方法
	* 为function 返回标准化后的callback
	* 为object 返回比较对象是否有共有键值对属性
	* 为基础类型 返回获取obj里相对应值的函数
	* */
	var cb = function(value,context,argCount){
		if(value == null) return _.identity;
		if(_.isFunction(value)) return optimizeCb(value,context,argCount);
		if(_.isObject(value)) return _.matcher(value);
		return _.property(value);
	};

	/*
	* @param keysFunc 获取对象键的方法
	* @param undefinedOnly 设置在源对象没有属性才赋值的boolean
	* */
	var createAssigner = function(keysFunc, undefinedOnly){
		return function(obj){
			var length = arguments.length;

			for(var i = 1;i<length;i++){
				var currentSource = arguments[i],
					keys = keysFunc(currentSource),
					l = keys.length;

				_.each(keys,function(key){
					obj[key] = currentSource[key];
				})
			}

			return obj;
		};
	};

	var property = function(key){
		return function(obj){
			return obj === null ? void 0 : obj[key];
		}
	};

	var createReduce = function(dir){
		var reducer = function(obj, iteratee, memo, initial){
			var keys = !isArrayLike(obj) && _.keys(obj),
				length = (keys || obj).length,
				index = dir>0 ? 0 : length - 1;

			if(!initial){
				memo = keys ? obj[keys[index]] : obj[index];
				index += dir;
			}

			for(;index>=0 && index<length;index+=dir){
				var currentKey = keys ? keys[index] : index;
				// var current = keys ? obj[keys[index]] : obj[index];
				iteratee = optimizeCb(iteratee,memo,obj,4);
				// memo += iteratee(current,index,obj); //我写的错误代码
				memo = iteratee(memo,obj[currentKey],currentKey,obj);
			}

			return memo;
		};


		return function(obj, iteratee, memo, initial){
			return reducer(obj, iteratee, memo, initial);
		}
	};

	_.reduce = createReduce(1);
	_.reduceRight = createReduce(-1);

	var createPredicateIndexFinder = function(dir){
		return function(obj,predicate,context){
			predicate = cb(predicate,context);
			var length = getLength(obj);
			var index = dir > 0 ? 0 : length - 1;

			for(;index>=0 && index<length;index+=dir){
				if(predicate(obj[index],index,obj) === true){
					return index;
				}
			}
			return -1;
		}
	};

	_.findIndex = createPredicateIndexFinder(1);
	_.findLastIndex = createPredicateIndexFinder(-1);

	// Generator function to create the indexOf and lastIndexOf functions
	// 暂时没看懂
	function createIndexFinder(dir, predicateFind, sortedIndex) {
		return function(array, item, idx) {
			var i = 0, length = getLength(array);
			if (typeof idx == 'number') { //根据方向设置迭代信息
				if (dir > 0) {
					i = idx >= 0 ? idx : Math.max(idx + length, i);
				} else {
					length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
				}
			} else if (sortedIndex && idx && length) {
				idx = sortedIndex(array, item);
				return array[idx] === item ? idx : -1;
			}
			if (item !== item) {
				idx = predicateFind(slice.call(array, i, length), _.isNaN);
				return idx >= 0 ? idx + i : -1;
			}
			for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
				if (array[idx] === item) return idx;
			}
			return -1;
		};
	}

	// Return the position of the first occurrence of an item in an array,
	// or -1 if the item is not included in the array.
	// If the array is large and already in sort order, pass `true`
	// for **isSorted** to use binary search.
	_.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
	_.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

	/*
	* 利用二分法对比obj中的特定值，按照array中的值的大小插入合适的位置
	* */
	_.sortedIndex = function (array, obj, iteratee, context) {
		/*
		* 这里可以看出cb函数设计的巧妙之处，这个方法的目的是得到回调函数
		* 并不简单的是标准化用户传过来的原始信息，如果用户传参过来的是
		* function那确实是得到标准化的回调函数，做了"标准化处理"，
		* 但是当用户传递的是别的数据形式的时候，其实是利用原始信息
		* 生成回调函数，这里如果iteratee不传也就是空值的时候，
		* 直接生成了返回实参的函数因为在这时obj为基本类型数据，
		* 这样标准化后只要再次调用得到原始值就可以了。
		* 另一种情况，当obj为对象时，iteratee传入的是比较依据的key名称
		* 这时cb处理后的函数就是获取对应键值对的值的方法
		*
		* */
		iteratee = cb(iteratee,context,1); //调用后返回对象对应键的值
		var value = iteratee(obj);
		var min = 0,
			max = array.length;
		// var mid = Math.floor((max + min)/2);  // 放在这里是不对的，利用while修改完边界值之后中间值自然是要重新计算

		while(min < max){//二分法比较
			var mid = Math.floor((max + min)/2);
			var midValue = iteratee(array[mid]);

			if(midValue >= value){//数组中间项大于给定项
				max = mid;
			}else{
				min = mid + 1;
			}
		}
		return mid
	};

	/*
	* 通过对象的length属性判断是否为一个类数组
	* */
	var getLength = property('length');
	var isArrayLike = function(arr){
		var length = getLength(arr);

		// 原作的写法是 typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
		return typeof arr === 'object' && length>=0;
	};


	// collection functions
	// -------

	_.map = function (obj,iteratee,context) {
		iteratee = cb(iteratee,context);
		var keys = !isArrayLike(obj) && _.keys(obj);
		var length = (keys || obj).length;
		var result = Array(length);

		for(var i = 0;i<length;i++){
			var currentKey = keys ? keys[i] : i;
			result[i] = iteratee(obj[currentKey],currentKey,obj);
		}
		return result;
	};

	/*
	* 相较于_.map 返回的是map后的对象而非数组
	* */
	_.mapObject = function (obj,iteratee,context) {
		iteratee = cb(iteratee,context);
		var keys = _.keys(obj),
			length = keys.length;
		var result = {};

		for(var i = 0;i<length;i++){
			var key = keys[i];
			result[key] =  iteratee(obj[key],key,obj);
		}

		return result;
	};

	_.each = function (obj,iteratee,context) {
		iteratee = cb(iteratee,context);
		var keys = !isArrayLike(obj) && _.keys(obj);
		var length = (keys || obj).length;
		for(var i = 0;i<length;i++){
			var currentItem = keys ? obj[keys[i]] : obj[i];
			iteratee(currentItem,i,obj);
		}
	};

	/*
	* @param predicate 检测函数
	* */
	_.filter = _.select = function (obj,predicate,context) {
		var results = [];
		predicate = cb(predicate,context);
		_.each(obj,function(item,index,context){
			if(predicate(item,index,context)) results.push(item);
		});
		return results;
	};

	_.negate = function (predicate) {
		return function () {
			return !predicate.apply(this,arguments);
		}
	};

	_.reject = function (obj,predicate,context) {
		return _.filter(obj,_.negate(cb(predicate)),context);
	};

	_.every = _.all = function (obj,predicate,context) {
		predicate = cb(predicate,context);

		var keys = !isArrayLike(obj) && _.keys(obj),
			length = (keys || obj).length;

		for(var index = 0;index<length;index++){
			var currentKey = keys ? keys[index] : index;
			if(!predicate(obj[currentKey],currentKey,obj)) return false;
		}
		return true;

		/*
		* 我写的第一个版本，问题在于每次都必须迭代完所有的项
		* 所以性能肯定没有for循环return的方式性能好
		* */
		// var result = true;
		// _.each(obj,function(item,index,collection){
		// 	if(!predicate(item,index,collection)){
		// 		result = false;
		// 	}
		// });
		// return result;
	};

	_.some = function (obj,predicate,context) {
		predicate = cb(predicate,context);
		var keys = !isArrayLike(obj) && _.keys(obj),
			length = (keys || obj).length;

		for(var i = 0;i<length;i++){
			var key = keys ? keys[i] : i;
			if(predicate(obj[key],key,obj)){
				return true;
			}
		}
		return false;
	};

	_.indexOf = function (obj,value) {
		var keys = !isArrayLike(obj) && _.keys(obj),
			length = (keys || obj).length;

		for(var i = 0;i<length;i++){
			var key = keys ? keys[i] : i;
			if(obj[key] === value){
				return i;
			}
		}
		return -1;
	};

	/*
	* Utils 方法
	* */

	_.identity = function(value){
		return value;
	};

	_.isFunction = function(fn){
		return typeof fn === 'function';
	};

	_.isObject = function(obj){
		var type = typeof obj;
		return type === 'function' || type === 'object' && !!obj;
	};

	/*
	* 模拟Object.keys
	* */
	_.keys = function(obj){
		if(!_.isObject(obj)) return [];
		var keys = [];
		for(var key in obj) if(_.has(obj,key)) keys.push(key);
		return keys;
	};

	_.allKeys = function(obj){
		if(!_.isObject(obj)) return [];
		var keys = [];
		for(var key in obj) keys.push(key);
		return keys;
	};

	_.values = function(obj){
		var keys = _.keys(obj),
			length = keys.length;
		var result = Array(length);
		for(var i = 0;i<length;i++){
			result[i]=obj[keys[i]];
		}
		return result;
	};

	// 批量添加引用类型的校验方法
	_.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'],function(item){
		_['is'+item] = function(obj){
			return toString.call(obj) === '[object ' + item + ']';
		}
	});

	_.isNaN = function(obj){
		return _.isNumber(obj) && obj !== obj;
	};

	_.isUndefined = function (obj) {
		return obj === void 0; // 与可信任的undefined作比较
	};

	_.now = Date.now || function () { // 两者得到的结果相同，但是Date.now的性能更好
		return new Date().getTime();
	};

	/*
	* 校验obj是否拥有自有键
	* */
	_.has = function(obj,key){
		return obj != null && hasOwnProperty.call(obj,key);
	};

	/*
	* 功能和Object.assign相同
	* */
	_.extendOwn = _.assign = createAssigner(_.keys);

	/*
	* 单方向的match匹配，只要obj里的所有键以及值attrs里面都相同
	* 就返回true,attrs里面多出的部分不考虑
	* */
	_.isMatch = function (object,attrs) {
		var keys = _.keys(attrs),
			length = keys.length;
		var obj = Object(object);  //使用这种方式可以过滤掉__proto__键上的属性，只留下自身属性

		for(var i = 0;i<length;i++){
			var key = keys[i];

			/*
			* 我对原作这里的写法有点不认同，没有搞明白为什么要多一步key in object判断
			* _.keys本身已经进行了hasOwnProperty过滤了
			* */
			if(attrs[key] !== obj[key] || !(key in obj)){
				return false
			}
		}
		return true;
	};

	/*
	* 检查传入的obj是否拥有所有的attrs
	* */
	_.matcher = _.matches = function(attrs){
		attrs = _.extendOwn({},attrs);
		return function(obj){
			return _.isMatch(obj,attrs);
		}
	};

	_.property = function(key){
		return function(obj){
			return obj===null ? void 0 : obj[key];
		}
	};

}.call(this));