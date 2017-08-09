var obj = {a:'value a',b:'value b'};
var arr = ['a']

var result=_.map(arr,function(item){
	return item + ' map'
});

console.log(result)