var obj = {a:'value a',b:'value b'};
var arr = ['a','b','c'];



var result = _.each(obj,function(item,index,collection){
	console.log(item,index,collection)
})