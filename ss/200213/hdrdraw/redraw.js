
var joined_img=null;
var horizon_img=null;
var bloomed_img=null;
var bloom_img=null;
var funcs=[];
var preview,preview_ctx,preview_ctx_imagedata;

var resizeCanvas=function(width,height){
	preview_ctx_imagedata=preview_ctx.createImageData(width,height);
	joined_img = new Img(width,height);
	horizon_img = new Img(width,height);
	bloomed_img = new Img(width,height);
	bloom_img = new Img(width,height);
}

funcs["normal"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var alpha=src[src_idx+3]*alpha;
	var dst_alpha = dst[dst_idx+3];
	var dst_r = dst_alpha*(1-alpha);
	var src_r = power*alpha;

	dst[dst_idx+0]=dst[dst_idx+0] * dst_r +  src[src_idx+0]*src_r;
	dst[dst_idx+1]=dst[dst_idx+1] * dst_r +  src[src_idx+1]*src_r;
	dst[dst_idx+2]=dst[dst_idx+2] * dst_r +  src[src_idx+2]*src_r;
	dst[dst_idx+3]=dst_r+alpha;
}
funcs["mul"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var alpha=src[src_idx+3]*alpha;
	var dst_alpha = dst[dst_idx+3];
	var dst_r = dst_alpha*(1-alpha);
	var src_r = power*alpha;

	dst[dst_idx+0]=dst[dst_idx+0] * (dst_r +  src[src_idx+0]*src_r);
	dst[dst_idx+1]=dst[dst_idx+1] * (dst_r +  src[src_idx+1]*src_r);
	dst[dst_idx+2]=dst[dst_idx+2] * (dst_r +  src[src_idx+2]*src_r);
	dst[dst_idx+3]=dst_r+alpha;
}
funcs["add"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var alpha=src[src_idx+3]*alpha;
	var dst_alpha = dst[dst_idx+3];
	var dst_r = dst_alpha*(1-alpha);
	var src_r = power*alpha;

	dst[dst_idx+3]=dst_r+alpha;
	dst_r = dst_r + alpha;
	dst[dst_idx+0]=dst[dst_idx+0] * dst_r + src[src_idx+0]*src_r;
	dst[dst_idx+1]=dst[dst_idx+1] * dst_r + src[src_idx+1]*src_r;
	dst[dst_idx+2]=dst[dst_idx+2] * dst_r + src[src_idx+2]*src_r;
}

funcs["sub"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var alpha=src[src_idx+3]*alpha;
	var dst_alpha = dst[dst_idx+3];
	var dst_r = dst_alpha*(1-alpha);
	var src_r = power*alpha;

	dst[dst_idx+3]=dst_r+alpha;
	dst_r = dst_r + alpha;
	dst[dst_idx+0]=dst[dst_idx+0] * dst_r - src[src_idx+0]*src_r;
	dst[dst_idx+1]=dst[dst_idx+1] * dst_r - src[src_idx+1]*src_r;
	dst[dst_idx+2]=dst[dst_idx+2] * dst_r - src[src_idx+2]*src_r;
}
var refreshMain=function(step,x,y,w,h){
	//プレビュー画面を更新
	
	if(refreshoff){
		//更新禁止フラグが立っている場合は処理しない
		return;
	}
	if( typeof step === 'undefined'){
		step=0;
	}
	var bloom_size = parseFloat(inputs["bloom_size"].value);

	//引数無しの場合、デフォルトで更新領域は全域
	var left = 0;
	var right = joined_img.width; 
	var top = 0;
	var bottom = joined_img.height;

	if(w){
		left=x;
		right=x+w;
		top=y;
		bottom=y+h;

		//更新領域設定、はみ出している場合はクランプする
		left-=bloom_size;
		right+=bloom_size;
		top-=bloom_size;
		bottom+=bloom_size;
		
		left=Math.max(0,left);
		right=Math.min(joined_img.width,right);
		top=Math.max(0,top);
		bottom=Math.min(joined_img.height,bottom);

		left=Math.floor(left);
		right=Math.ceil(right);
		top=Math.floor(top);
		bottom=Math.ceil(bottom);
	}

	var joined_img_data = joined_img.data;
	var joined_img_width = joined_img.width;

	//0で初期化
	if(step<=0){
		for(var yi=top;yi<bottom;yi++){
			var idx = yi * joined_img_width + left << 2;
			var max = yi * joined_img_width + right << 2;
			for(;idx<max;idx+=4){
				joined_img_data[idx+0]=0;
				joined_img_data[idx+1]=0;
				joined_img_data[idx+2]=0;
				joined_img_data[idx+3]=0;
			}
		}

		//レイヤ合成
		for(var li=0;li<layers.length;li++){
			var layer = layers[li];

			if(!layer.display){
				//非表示の場合スルー
				continue;
			}
			if(!layer.img){
				continue;
			}
			var layer_img_data = layer.img.data;
			var layer_alpha=layer.alpha;
			var layer_power=Math.pow(2,layer.power);
			var layer_img_width = layer.img.width;
			var func = funcs[layer.blendfunc];

			var left2 = Math.max(left,0);
			var top2 = Math.max(top,0);
			var right2 = Math.min(layer.img.width,right);
			var bottom2 = Math.min(layer.img.height,bottom);

			for(var yi=top2;yi<bottom2;yi++){
				var idx = yi * joined_img_width + left2 << 2;
				var max = yi * joined_img_width + right2 << 2;
				var idx2 = yi * layer_img_width + left2 << 2;
				for(;idx<max;idx+=4){
					func(joined_img_data,idx,layer_img_data,idx2,layer_alpha,layer_power);
					idx2+=4;
				}
			}
			
		}
		if(inputs["ch_bloom"].checked ){
		gauss(bloom_size,bloom_size,left,right,top,bottom);
		}
	}

	//ブルーム処理
	//ブルーム前の絵はjoined_imgに残し、結果はbloomed_imgに出力
	if(step<=1){
		var bloom = parseFloat(inputs["bloom_power"].value);
		var _bloom = 1- bloom;

		var bloom_img_data = bloom_img.data;
		var bloomed_img_data = bloomed_img.data;
		if(inputs["ch_bloom"].checked && bloom>0){
			for(var yi=top;yi<bottom;yi++){
				var idx = yi * joined_img_width + left << 2;
				var max = yi * joined_img_width + right<< 2;
				for(;idx<max;idx+=4){
					bloom_img_data[idx]=joined_img_data[idx]*_bloom + bloomed_img_data[idx]*bloom;
					bloom_img_data[idx+1]=joined_img_data[idx+1]*_bloom+ bloomed_img_data[idx+1]*bloom;
					bloom_img_data[idx+2]=joined_img_data[idx+2]*_bloom+bloomed_img_data[idx+2]*bloom;
					bloom_img_data[idx+3]=joined_img_data[idx+3];//*_bloom+bloomed_img_data[idx+3]*bloom;
				}
			}
		}else{
			for(var yi=top;yi<bottom;yi++){
				var idx = yi * joined_img_width + left << 2;
				var max = yi * joined_img_width + right<< 2;
				for(;idx<max;idx+=4){
					bloom_img_data[idx]=joined_img_data[idx];
					bloom_img_data[idx+1]=joined_img_data[idx+1];
					bloom_img_data[idx+2]=joined_img_data[idx+2];
					bloom_img_data[idx+3]=joined_img_data[idx+3];
				}
			}
		}
	}

	if(step<=2){
		//ガンマ補正とトーンマッピング
		var ctx_imagedata_data = preview_ctx_imagedata.data;
		var ev = parseFloat(inputs["ev"].value);
		var gamma = 1.0/parseFloat(inputs["gamma"].value);
		var r = Math.pow(2,-ev)*255;

		joined_img_data = bloom_img.data;

		if(inputs["ch_gamma"].checked){
			for(var yi=top;yi<bottom;yi++){
				var idx = yi * joined_img_width + left << 2;
				var max = yi * joined_img_width + right << 2;
				for(;idx<max;idx+=4){
					ctx_imagedata_data[idx+0]=Math.pow(joined_img_data[idx+0],gamma)*r;
					ctx_imagedata_data[idx+1]=Math.pow(joined_img_data[idx+1],gamma)*r;
					ctx_imagedata_data[idx+2]=Math.pow(joined_img_data[idx+2],gamma)*r;
					ctx_imagedata_data[idx+3]=joined_img_data[idx+3]*255;
				}
			}
		}else{
			for(var yi=top;yi<bottom;yi++){
				var idx = yi * joined_img_width + left << 2;
				var max = yi * joined_img_width + right << 2;
				for(;idx<max;idx+=4){
					ctx_imagedata_data[idx+0]=joined_img_data[idx+0]*r;
					ctx_imagedata_data[idx+1]=joined_img_data[idx+1]*r;
					ctx_imagedata_data[idx+2]=joined_img_data[idx+2]*r;
					ctx_imagedata_data[idx+3]=joined_img_data[idx+3]*255;
				}
			}
		}
	}

	//結果をキャンバスに表示
	preview_ctx.putImageData(preview_ctx_imagedata,0,0,left,top,right-left,bottom-top);

	
}

var gauss=function(d,size,left,right,top,bottom){
	var MAX = size|0;
	var src= joined_img;
	var dst= horizon_img;
	var joined_img_data=joined_img.data;
	

	//係数作成
	var weight = new Array(MAX);
	var t = 0.0;
	for(var i = 0; i < weight.length; i++){
		var r = 1.0 +  i;
		var we = Math.exp(- (r * r) / (2*d*10.0));
		weight[i] = we;
		if(i > 0){we *= 2.0;}
		t += we;
	}
	for(i = 0; i < weight.length; i++){
		weight[i] /= t;
	}

	var height = joined_img.height;
	var width = joined_img.width;
	var data = src.data;
	var dstdata = dst.data;
	//横ぼかし
	for(var y=top;y<bottom;y++){
		var yidx= y * width;
		var x = left;
		var idx = yidx + left <<2;
		var max = yidx + right <<2;
		var r = weight[0];
		for(;idx<max;idx+=4){
			dstdata[idx+0]=data[idx+0]*r;
			dstdata[idx+1]=data[idx+1]*r;
			dstdata[idx+2]=data[idx+2]*r;
		}
		max = Math.min(MAX,right);
		for(;x<max;x++){
	 		var idx= yidx + x <<2;
			for(var i=1;i<MAX;i++){
	 			var idx2= yidx + Math.max(x -i,0) <<2;
	 			var idx3= yidx + Math.min(x +i,width-1) <<2;
				var r = weight[i];
				dstdata[idx+0]+=(data[idx2+0] +data[idx3+0])*r;
				dstdata[idx+1]+=(data[idx2+1] +data[idx3+1])*r;
				dstdata[idx+2]+=(data[idx2+2] +data[idx3+2])*r;
			}
		}

		max = Math.min(width-MAX,right);
		for(;x<max;x++){
	 		var idx= yidx + x <<2;
	  		for(var i=1;i<MAX;i++){
				dstdata[idx+0]+=(data[idx+0+(i<<2)] + data[idx+0-(i<<2)])*weight[i];
				dstdata[idx+1]+=(data[idx+1+(i<<2)] + data[idx+1-(i<<2)])*weight[i];
				dstdata[idx+2]+=(data[idx+2+(i<<2)] + data[idx+2-(i<<2)])*weight[i];
			}
		}
		var max = Math.min(right,width);
		for(;x<max;x++){
	 		var idx= yidx + x <<2;
			for(var i=1;i<MAX;i++){
	 			var idx2= yidx + Math.max(x -i,0) <<2;
	 			var idx3= yidx + Math.min(x +i,width-1) <<2;
				var r = weight[i];
				dstdata[idx+0]+=(data[idx2+0] +data[idx3+0])*r;
				dstdata[idx+1]+=(data[idx2+1] +data[idx3+1])*r;
				dstdata[idx+2]+=(data[idx2+2] +data[idx3+2])*r;
			}
		}
	}

	//縦ぼかし
	data = dst.data;
	dstdata = bloomed_img.data;

	for(var x=left;x<right;x++){
		var max = Math.min(MAX,bottom);

		var idx = top*width + x<<2;
		var max = bottom*width+ x<<2;
		var r = weight[0];
		for(;idx<max;idx+=width*4){
			dstdata[idx+0]=data[idx+0]*r;
			dstdata[idx+1]=data[idx+1]*r;
			dstdata[idx+2]=data[idx+2]*r;
		}
	
		y=top
		max = Math.min(MAX,bottom);
		for(;y<max;y++){
	 		idx= y * width + x <<2;

			for(var i=1;i<MAX;i++){
	 			var idx2= Math.max(y-i,0) *width+ x  <<2;
	 			var idx3= Math.min(y+i,height-1)*width+x <<2;
				var r = weight[i];
				dstdata[idx+0]+=(data[idx2+0] +data[idx3+0])*r;
				dstdata[idx+1]+=(data[idx2+1] +data[idx3+1])*r;
				dstdata[idx+2]+=(data[idx2+2] +data[idx3+2])*r;
			}
		 }
		max = Math.min(height-MAX,bottom);
		for(;y<max;y++){
	 		idx= y * width + x <<2;

			for(var i=1;i<MAX;i++){
	 			var idx2= (y-i) *width+ x  <<2;
	 			var idx3= (y+i)*width+x <<2;
				var r = weight[i];
				dstdata[idx+0]+=(data[idx2+0] +data[idx3+0])*r;
				dstdata[idx+1]+=(data[idx2+1] +data[idx3+1])*r;
				dstdata[idx+2]+=(data[idx2+2] +data[idx3+2])*r;
			}
		}

		max = Math.min(height,bottom);
		for(;y<max;y++){
	 		idx= y * width + x <<2;

			for(var i=1;i<MAX;i++){
	 			var idx2= Math.max(y-i,0) *width+ x  <<2;
	 			var idx3= Math.min(y+i,height-1)*width+x <<2;
				var r = weight[i];
				dstdata[idx+0]+=(data[idx2+0] +data[idx3+0])*r;
				dstdata[idx+1]+=(data[idx2+1] +data[idx3+1])*r;
				dstdata[idx+2]+=(data[idx2+2] +data[idx3+2])*r;
			}
		}
	 }

}

