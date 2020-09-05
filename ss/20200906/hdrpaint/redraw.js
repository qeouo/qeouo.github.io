
var flg_active_layer_only=false;
var horizon_img=null;
var bloomed_img=null;
var bloom_img=null;
var preview,preview_ctx,preview_ctx_imagedata;
var refreshoff=0;
var refreshpen_flg=true;

var disableRefresh=function(){
	refreshoff=true;
}
var enableRefresh=function(){
	refreshoff=false;
}


var refreshLayerThumbnail = function(layer){
	refresh_thumbnail.push(layer);
}

var refreshThumbnails=function(layer){
	Layer.bubble_func(layer,
		function(l){
			refreshLayerThumbnail(l);
		}
	);
}

var refresh_thumbnail=[] ;
var refresh_stack=[] ;
var animation_frame_id=null; 
var refreshMain=function(_step,_x,_y,_w,_h,_layer){
	if(refreshoff){
		//更新禁止フラグが立っている場合は処理しない
		return;
	}
	if(refresh_stack.length === 1){
		//全更新がある場合は無視
		if(refresh_stack[0].step===0 
		&& refresh_stack[0].w === 0){
			return;
		}
	}
	if(_step===0 && !_w){
		//全更新の場合はコレまでのは無視する
		refresh_stack=[];
	}
	var refresh_data={};
	refresh_data.step=_step;
	refresh_data.x=_x;
	refresh_data.y=_y;
	refresh_data.w=_w;
	refresh_data.h=_h;
	refresh_data.layer=_layer;
	refresh_stack.push(refresh_data);
}
var refreshMain_=function(){
	for(var ri=0;ri<refresh_stack.length;ri++){
		var r= refresh_stack[ri];
		refreshMain_sub(r.step,r.x,r.y,r.w,r.h);
	}

	for(var ri=0;ri<refresh_thumbnail.length;ri++){
		var r= refresh_thumbnail[ri];
		r.refreshThumbnail();
	}
	refresh_stack=[];
	refresh_thumbnail=[];
	animation_frame_id=null;

	if(refreshpen_flg){
		Brush.refreshPen();
		refreshpen_flg=false;
	}

	animation_frame_id=window.requestAnimationFrame(function(e){
		refreshMain_();
	});
}

var refreshMain_sub=function(step,x,y,w,h){
	//プレビュー画面を更新
	
	if( typeof step === 'undefined'){
		step=0;
	}
	var bloom_size = parseFloat(inputs["bloom_size"].value);
	var joined_img = root_layer.img;

	

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

	if(step<=0){
		//全レイヤ更新
		var f = function(layer,left,top,right,bottom){
			var lower_layers = layer.children;
			for(var li=0;li<lower_layers.length;li++){
				lower_layer = lower_layers[li];
				if(lower_layer.type){
					f(lower_layer,left,top,right,bottom);
				}
			}
			layer.composite(left,top,right,bottom);

		}
		f(root_layer,left,top,right,bottom);

		if(inputs["ch_bloom"].checked ){
			//ブルーム処理ありの場合は前処理を行う
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
	if(flg_active_layer_only){
		var img = bloom_img;
		var img_data = img.data;
		var img_width = img.width;
		var layer = selected_layer;
		
		for(var yi=top;yi<bottom;yi++){
			var idx = yi * img_width + left << 2;
			var max = yi * img_width + right << 2;
			for(;idx<max;idx+=4){
				img_data[idx+0]=0;
				img_data[idx+1]=0;
				img_data[idx+2]=0;
				img_data[idx+3]=0;
			}
		}

		var layer_img_data = layer.img.data;
		var layer_alpha=layer.alpha;
		var layer_power=Math.pow(2,layer.power);
		var layer_img_width = layer.img.width;
		var func = funcs[layer.blendfunc];
		var layer_position_x= layer.position[0];
		var layer_position_y= layer.position[1];

		//レイヤごとのクランプ
		var left2 = Math.max(left,layer.position[0]);
		var top2 = Math.max(top,layer.position[1]);
		var right2 = Math.min(layer.img.width + layer_position_x ,right);
		var bottom2 = Math.min(layer.img.height + layer_position_y ,bottom);

		for(var yi=top2;yi<bottom2;yi++){
			var idx = yi * img_width + left2 << 2;
			var max = yi * img_width + right2 << 2;
			var idx2 = (yi-layer_position_y) * layer_img_width + left2 - layer_position_x << 2;
			for(;idx<max;idx+=4){
				func(img_data,idx,layer_img_data,idx2,layer_alpha,layer_power);
				idx2+=4;
			}
		}
	}

	if(step<=2){
		//ガンマ補正とトーンマッピング
		var ctx_imagedata_data = preview_ctx_imagedata.data;
		var ev = parseFloat(inputs["ev"].value);
		var gamma = 1.0/parseFloat(inputs["gamma"].value);

		joined_img_data = bloom_img.data;

		if(inputs["ch_gamma"].checked){
			var r = Math.pow(2,-ev);
			for(var yi=top;yi<bottom;yi++){
				var idx = yi * joined_img_width + left << 2;
				var max = yi * joined_img_width + right << 2;
				for(;idx<max;idx+=4){
					ctx_imagedata_data[idx+0]=Math.pow(joined_img_data[idx+0]*r,gamma)*255;
					ctx_imagedata_data[idx+1]=Math.pow(joined_img_data[idx+1]*r,gamma)*255;
					ctx_imagedata_data[idx+2]=Math.pow(joined_img_data[idx+2]*r,gamma)*255;
					ctx_imagedata_data[idx+3]=joined_img_data[idx+3]*255;
				}
			}
		}else{
			var r = Math.pow(2,-ev)*255;
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
	var src= root_layer.img;
	var dst= horizon_img;
	var joined_img_data=src.data;
	

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

	var height = src.height;
	var width = src.width;
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

var refreshActiveLayerParam = function(){
	//アクティブレイヤパラメータ更新
	var layer = selected_layer;
	if(!layer){
		return;
	}
	var layer_inputs = Array.prototype.slice.call(document.getElementById("layer_param").getElementsByTagName("input"));
	layer_inputs = layer_inputs.concat(Array.prototype.slice.call(document.getElementById("layer_param").getElementsByTagName("select")));
	for(var i=0;i<layer_inputs.length;i++){
		var input = layer_inputs[i];
		switch(input.id){
			case "layer_x":
			input.value = layer.position[0];
			break;
		case "layer_y":
			input.value = layer.position[1];
			break;
		case "layer_width":
			input.value = layer.img.width;
			break;
		case "layer_height":
			input.value = layer.img.height;
			break;
		default:
			var member = input.id.replace("layer_","");
			if(member in layer){
				if(input.getAttribute("type")==="checkbox"){
					input.checked=layer[member];
				}else{
					input.value=layer[member];
				}
				Util.fireEvent(input,"input");
			}
		}
	}
	
}


var refreshPreviewStatus = function(e){
	//カーソル下情報表示
	var img = root_layer.img;
	var data = img.data;

	var x = doc.cursor_pos[0];
	var y = doc.cursor_pos[1];
	var width=img.width;
	var height=img.height;
	var status2= document.getElementById("status2");

	var r=0; 
	var g=0; 
	var b= 0;
	var a= 0;
	if(x<0 || y<0 || x>=width || y>=height){
		var str="倍率[scale]% X:[x],Y:[y]";
		str=str.replace(/\[scale\]/,doc.scale);
		str=str.replace(/\[x\]/,"-");
		str=str.replace(/\[y\]/,"-");
		Util.setText(status2,str);


		Util.setText(document.getElementById("pos_R"),"-");
		Util.setText(document.getElementById("pos_G"),"-");
		Util.setText(document.getElementById("pos_B"),"-");
		Util.setText(document.getElementById("pos_A"),"-");

	}else{
		var idx=((y|0)*preview.width+(x|0))*4;
		r= data[idx];
		g= data[idx+1];
		b= data[idx+2];
		a= data[idx+3];

		x.toFixed(2);
		y.toFixed(2);

		var str="倍率[scale]% X:[x],Y:[y]";
		str=str.replace(/\[scale\]/,doc.scale);
		str=str.replace(/\[x\]/,x);
		str=str.replace(/\[y\]/,y);

		Util.setText(status2,str );

		Util.setText(document.getElementById("pos_R"),r.toFixed(3));
		Util.setText(document.getElementById("pos_G"),g.toFixed(3));
		Util.setText(document.getElementById("pos_B"),b.toFixed(3));
		Util.setText(document.getElementById("pos_A"),a.toFixed(3));


	}



}
