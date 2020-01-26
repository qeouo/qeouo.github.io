//worker
var f = function(){
 	self.postMessage({}); 
	requestAnimationFrame(f);
}
//requestAnimationFrame(f);
var onmessage = function(e) {
  console.log(e.data);
}
