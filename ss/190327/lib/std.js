"use strict"
var Std;
if(!Std){
	Std = (function(){
		var ret=function(){};
		ret.getCurrent = function(){
			var current="/";
			if (document.currentScript) {
				current=document.currentScript.src;
			} else {
				var scripts = document.getElementsByTagName('script'),
				script = scripts[scripts.length-1];
				if (script.src) {
					current=script.src;
				}
			}
			current = current.substring(0,current.lastIndexOf('/')+1);
			return current;
		};
		ret.loadJs= function(path){
			var script = document.createElement('script');
			script.src = path;
			document.head.appendChild(script);
		}
		return ret;
	})();
//	var currentpath = Std.getCurrent();
//	Std.loadJs(currentpath+"inherits.js");
	var inherits= function(childCtor, parentCtor) {
		// ES6
		if (Object.setPrototypeOf) {
			Object.setPrototypeOf(childCtor.prototype, parentCtor.prototype);
		}
		// ES5
		else if (Object.create) {
			childCtor.prototype = Object.create(parentCtor.prototype);
		}
		// legacy platform
		else {
			function tempCtor() {};
			tempCtor.prototype = parentCtor.prototype;
			childCtor.superClass_ = parentCtor.prototype;
			childCtor.prototype = new tempCtor();
			childCtor.prototype.constructor = childCtor;
		}
	}
	if (!Array.prototype.find) {
	  Array.prototype.find = function(predicate) {
		if (this === null) {
		  throw new TypeError('Array.prototype.find called on null or undefined');
		}
		if (typeof predicate !== 'function') {
		  throw new TypeError('predicate must be a function');
		}
		var list = Object(this);
		var length = list.length >>> 0;
		var thisArg = arguments[1];
		var value;
		for (var i = 0; i < length; i++) {
		  value = list[i];
		  if (predicate.call(thisArg, value, i, list)) {
			return value;
		  }
		}
		return undefined;
	  };
	}
};
