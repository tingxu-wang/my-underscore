(function() {

	root = this;

	/*
	 * 建立成函数的原因暂时未知
	 * */
	var _ = function (obj) {
		if (obj instanceof _) return obj;
		if (!(this instanceof _)) return new _(obj);
		this._wrapped = obj;
	};

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

	/*
	* 真正用于处理用户回调的方法
	* 由于用户可能不止传入function类型的参数，会有字符串，对象等多种情况
	* */
	var cb = function(value,context,argCount){
		if(value == null) return _.identity;
		if(_.isFunction(value)) return optimizeCb(value,context,argCount);
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
	}

}.call(this));