(function() {

	root = this;

	var previousUnderscore = root._;

	// 原生原型链
	var ArrayProto = Array.prototype,ObjectProto = Object.prototype;

	// 原型链上原生方法快捷方式
	var hasOwnProperty = ObjectProto.hasOwnProperty;

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
			// 目前不太清楚这个accumulator是什么
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
	* value 空返回一个直接reutrn value的方法
	* 为function 返回标准化后的callback
	* 为object 返回
	* */
	var cb = function(value,context,argCount){
		if(value == null) return _.identity;
		if(_.isFunction(value)) return optimizeCb(value,context,argCount);
		if(_.isObject(value)) return _.matcher(value);
		return _.property;
	};

	var createAssigner = function(keysFunc, undefinedOnly){

	};

	// TODO:待实现
	var isArrayLike = function(arr){
		return true;
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

	/*
	* 校验obj是否拥有自有键
	* */
	_.has = function(obj,key){
		return obj != null && hasOwnProperty.call(obj,key);
	};

	/*
	* 功能和Object.assign相同
	* TODO: 调通createAssigner
	* */
	_.extendOwn = _.assign = createAssigner(_.keys);

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