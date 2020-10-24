Hdrpaint.modifier["shift"] = (function(){
	var Shift= function(){
		Layer.apply(this);
		this.effect=0;
		this.children=[];
	};
	var ret = Shift;
	inherits(ret,Layer);

	var ret_pixel = new Vec4();
	var bufimg = new Img(1024,1024);
	var layer;
	var xmod=1;
var ymod=1;
	ret.prototype.init  = function(x,y,w,h){
		dst = this.parent;
		var img = dst.img;
		var img_data = img.data;
		bufimg.width = dst.size[0];
		bufimg.height = dst.size[1];
		Img.copy(bufimg,0,0,img,0,0,img.width,img.height);

		if(this.children.length>=1){
			this.children[0].init();
		}


		xmod = (1<<Math.ceil(Math.log2(img.width)))-1;
		ymod = (1<<Math.ceil(Math.log2(img.height)))-1;
	}

	ret.prototype.getPixel = function(ret_pixel,x,y){
		var img = bufimg;

		var sx = 0;
		var sy = 0;
		if(this.children.length>=1){
			this.children[0].getPixel(ret_pixel,x,y);
			sx = ret_pixel[0]-0.5;
			sy = ret_pixel[1]-0.5;
			//sz = ret_pixel[2]-0.5;

			var pow = this.effect;
			sx = sx* pow|0;
			sy = sy* pow|0;
			//sz = sz* pow|0;
		}

		var d_idx2 = img.getIndex(x+sx&xmod,y+sy&ymod)<<2;

		ret_pixel[0]=img.data[d_idx2+0] ;
		ret_pixel[1]=img.data[d_idx2+1] ;
		ret_pixel[2]=img.data[d_idx2+2] ;
		ret_pixel[3]=img.data[d_idx2+3] ;
	}

	var html = `
			影響度:<input type="text" class="slider modifier_effect" title="effect" value="0.5" min="0" max="100">
		`;
	Hdrpaint.addModifierControl("shift",html);
	return ret;
})();
