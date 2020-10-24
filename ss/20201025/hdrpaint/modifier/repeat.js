Hdrpaint.modifier["repeat"] = (function(){
	var Repeat = function(dst,src,x,y,w,h){
		if(src.children.length===0)return;
		var src_img = src.children[0].img;
		var img = dst.img;
		var img_data = img.data;
		var max = 1.0/src.size[0];

		var src_img_data = src_img.data;

		for(var yi=0;yi<h;yi++){
			idx = img.getIndex(x,yi+y)<<2;
			for(var xi=0;xi<w;xi++){
				idx2 = src_img.getIndexLoop(xi+x,yi+y)<<2;
				img_data[idx] = src_img_data[idx2];
				img_data[idx+1] = src_img_data[idx2+1] ;
				img_data[idx+2] = src_img_data[idx2+2];
				img_data[idx+3] = src_img_data[idx2+3];
				idx+=4;
			}
		}
	}
	var ret = Repeat;
	return ret;
})();
