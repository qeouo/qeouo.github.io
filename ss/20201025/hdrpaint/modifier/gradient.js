Hdrpaint.modifier["gradient"] = (function(){
	var Gradient = function(dst,src,x,y,w,h){
	var img = dst.img;
		var img_data = img.data;
		var max = 1.0/src.size[0];

		for(var yi=0;yi<h;yi++){
			idx = img.getIndex(x,yi+y)<<2;
			for(var xi=0;xi<w;xi++){
				var v = (xi + x ) * max;
				img_data[idx] = v;
				img_data[idx+1] = v;
				img_data[idx+2] = v;
				img_data[idx+3] = 1;
				idx+=4;
			}
		}
	}
	var ret = Gradient;
	return ret;
})();
