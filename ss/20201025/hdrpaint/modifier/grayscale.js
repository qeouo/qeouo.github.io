
Hdrpaint.modifier["grayscale"] = (function(){
	var GrayScale= function(){
		Layer.apply(this);
		this.scale=128;
		this.octave=1;
		this.betsu=false;
		this.func="perlin";
		this.children=null;
	};
	var ret = GrayScale;
	inherits(ret,Layer);

	var img;
	var img_data;
	ret.prototype.init=function(x,y,w,h){
		 img = this.parent.img;
		 img_data = img.data;
		
	}

	ret.prototype.getPixel = function(ret,x,y){
		var idx = img.getIndex(x,y)<<2;
		var total = img_data[idx]+ img_data[idx+1] + img_data[idx+2];
		total *=0.33333;
		ret[0] = total;
		ret[1] = total;
		ret[2] = total;
		ret[3] = img_data[idx+3];
	}
	return GrayScale;
})();
