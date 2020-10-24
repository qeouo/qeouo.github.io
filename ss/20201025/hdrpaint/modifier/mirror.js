Hdrpaint.modifier["mirror"] = (function(){
	var Mirror = function(dst,src,x,y,w,h){
	var img = dst.img;
		var img_data = img.data;
		var width = dst.size[0];
		var half = width>>1;

		if(x<half){
			var a = Math.max(width-x-w,half);
			dst.composite(a,y,Math.min(a+w,width-1),y+h);
		}

		for(var yi=0;yi<h;yi++){
			idx = img.getIndex(x,yi+y)<<2;
			for(var xi=0;xi<w;xi++){
				if(half<xi+x){
					var idx2 = img.getIndex(width- (x+xi),yi+y)<<2;
					img_data[idx] = img_data[idx2];
					img_data[idx+1] = img_data[idx2+1];
					img_data[idx+2] = img_data[idx2+2];
					img_data[idx+3] = img_data[idx2+3];
				}
				idx+=4;
			}
		}
	}
	var ret = Mirror;
	return ret;
})();
