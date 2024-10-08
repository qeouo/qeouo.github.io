
var joined_img=null;
var horizon_img=null;
var bloomed_img=null;
var bloom_img=null;
var funcs=[];
var preview,preview_ctx,preview_ctx_imagedata;
var refreshoff=0;

var disableRefresh=function(){
	refreshoff=true;
}
var enableRefresh=function(){
	refreshoff=false;
}


funcs["normal"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var src_alpha=src[src_idx+3]*alpha;
	var dst_r = (1 - src_alpha);
	var src_r = power*src_alpha;

	dst[dst_idx+0]=dst[dst_idx+0] * dst_r +  src[src_idx+0]*src_r;
	dst[dst_idx+1]=dst[dst_idx+1] * dst_r +  src[src_idx+1]*src_r;
	dst[dst_idx+2]=dst[dst_idx+2] * dst_r +  src[src_idx+2]*src_r;
	dst[dst_idx+3]=dst[dst_idx+3] * dst_r +  src_alpha;
}
funcs["mul"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var alpha=src[src_idx+3]*alpha;
	var dst_r = (1-alpha);
	var src_r = power*src_alpha;

	dst[dst_idx+0]=dst[dst_idx+0] * (dst_r +  src[src_idx+0]*src_r);
	dst[dst_idx+1]=dst[dst_idx+1] * (dst_r +  src[src_idx+1]*src_r);
	dst[dst_idx+2]=dst[dst_idx+2] * (dst_r +  src[src_idx+2]*src_r);
}
funcs["add"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var alpha=src[src_idx+3]*alpha;
	var dst_r = (1-alpha);
	var src_r = power*src_alpha;

	dst[dst_idx+0]=dst[dst_idx+0]  + src[src_idx+0]*src_r;
	dst[dst_idx+1]=dst[dst_idx+1]  + src[src_idx+1]*src_r;
	dst[dst_idx+2]=dst[dst_idx+2]  + src[src_idx+2]*src_r;
}

funcs["sub"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var alpha=src[src_idx+3]*alpha;
	var dst_r = (1-alpha);
	var src_r = power*alpha;

	dst[dst_idx+0]=dst[dst_idx+0]  - src[src_idx+0]*src_r;
	dst[dst_idx+1]=dst[dst_idx+1]  - src[src_idx+1]*src_r;
	dst[dst_idx+2]=dst[dst_idx+2]  - src[src_idx+2]*src_r;
}

var refresh_stack=[] ;
var refreshMain=function(_step,_x,_y,_w,_h){
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
	if(refresh_stack.length===0){
		window.requestAnimationFrame(function(e){
			refreshMain_();
		});
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
	refresh_stack.push(refresh_data);
}
var refreshMain_=function(){
	for(var ri=0;ri<refresh_stack.length;ri++){
		var r= refresh_stack[ri];
		refreshMain_sub(r.step,r.x,r.y,r.w,r.h);
	}
	refresh_stack=[];
}
var refreshMain_sub=function(step,x,y,w,h){
	//プレビュー画面を更新
	
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
			var layer_position_x= layer.position[0];
			var layer_position_y= layer.position[1];

			//レイヤごとのクランプ
			var left2 = Math.max(left,layer.position[0]);
			var top2 = Math.max(top,layer.position[1]);
			var right2 = Math.min(layer.img.width + layer_position_x ,right);
			var bottom2 = Math.min(layer.img.height + layer_position_y ,bottom);

			for(var yi=top2;yi<bottom2;yi++){
				var idx = yi * joined_img_width + left2 << 2;
				var max = yi * joined_img_width + right2 << 2;
				var idx2 = (yi-layer_position_y) * layer_img_width + left2 - layer_position_x << 2;
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
var refreshLayer = function(layer){
	var div= layer.div.getElementsByTagName("div")[0];
	div.innerHTML=layer.name;
	var span = layer.div.getElementsByClassName("layer_attributes")[0];
	var txt="";
	txt += "blendfunc: "+layer.blendfunc +"<br>";
	if(layer.img){
		txt += "offset:("+layer.position[0]+","+layer.position[1] +")"
			+ "size:(" + layer.img.width + "," + layer.img.height +")<br>";
	}
	layer.power=parseFloat(layer.power);
	txt += "power: "+layer.power.toFixed(4)+"<br>";
	layer.alpha=parseFloat(layer.alpha);
	txt += "alpha: "+layer.alpha.toFixed(4)+"<br>";
	
	 if(!layer.display){
		layer.div.classList.add("disable_layer");
	 }else{
		layer.div.classList.remove("disable_layer");
	 }

	span.innerHTML = txt;

	if(layer === selected_layer){
		refreshActiveLayerParam();
	}


}

var refreshLayerThumbnail = function(layer){
	//レイヤサムネイル更新
	if(!layer){
		return;
	}
	layer.img.createThumbnail(thumbnail_ctx);
	var layer_img=layer.div.getElementsByTagName("img")[0];
	layer_img.src=thumbnail_canvas.toDataURL("image/png");
	
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

	var pen_preview,pen_preview_ctx;
	var pen_log=null;
	var pen_preview_img;
		var pen_preview_log;
var initPenPreview=function(){
	pen_preview=  document.getElementById('pen_preview');
	pen_preview_ctx =  pen_preview.getContext('2d')
	pen_preview_img= new Img(pen_preview.width,pen_preview.height);
	pen_preview_log = new Log.CommandLog();
	var points=[];
	pen_preview_log.param.points=points;
	var MAX = 17;
	for(var i=0;i<MAX;i++){
		var x = 2*i/(MAX-1)-1;
		var point={"pos":new Vec2(),"pressure":0};
		point.pos[0]=(x*0.8+1)*(pen_preview.width>>>1);
		point.pos[1]=(Math.sin(x*Math.PI)*0.5+1)*(pen_preview.height>>>1);
		//point.pressure= (1-Math.abs(x));
		point.pressure= 1-(i/(MAX-1));//(1-Math.abs(x));
		
		points.push(point);
	}
}


	var createRGBA=function(){
		var base = new Vec3();
		var lumi = Math.pow(2,parseFloat(inputs["color_lumi"].value));
		Util.hex2rgb(base ,inputs["color_base"].value);

		inputs["color_R"].value = base[0]*lumi;
		inputs["color_G"].value = base[1]*lumi;
		inputs["color_B"].value = base[2]*lumi;

		Util.fireEvent(color_R,"change");
		Util.fireEvent(color_G,"change");
		Util.fireEvent(color_B,"change");
		
	}
	var refreshColor=function(){
		var col=new Vec4();
		Vec4.set(col,color_R.value,color_G.value,color_B.value,color_A.value);
		Vec4.copy(doc.draw_col,col);

		var gamma = 1.0/parseFloat(inputs["gamma"].value);
		var ev = parseFloat(inputs["ev"].value);
		var r = Math.pow(2,-ev)*255;

		if(inputs["ch_gamma"].checked){
			col[0]=Math.pow(col[0],gamma)*r;
			col[1]=Math.pow(col[1],gamma)*r;
			col[2]=Math.pow(col[2],gamma)*r;
		}else{
			col[0]*=r;
			col[1]*=r;
			col[2]*=r;
		}
		col[3]=col[3]*255;
		refreshPen();
	}
	var refreshPen=function(){
//		refreshColor();
		var weight=parseFloat(inputs["weight"].value);
	  	var points = pen_preview_log.param.points;

		var pressure_effect_flg= 0;
		if(inputs["weight_pressure_effect"].checked){
			pressure_effect_flg|=1;
		}
		if(inputs["alpha_pressure_effect"].checked){
			pressure_effect_flg|=2;
		}


		var alpha_direct=inputs["pen_alpha_direct"].checked;
		pen_preview_img.clear();
		for(var li=0;li<points.length-1;li++){
			drawPen(pen_preview_img,points[li],points[li+1],doc.draw_col,0,weight,pressure_effect_flg,alpha_direct);
		}

		//結果をキャンバスに表示
	  	var dst_data  = preview_ctx_imagedata.data;
	  	var src_data = pen_preview_img.data;
	  var r=255;
		for(var yi=0;yi<pen_preview.height;yi++){
			for(var xi=0;xi<pen_preview.width;xi++){
			  var dst_idx = preview_ctx_imagedata.width * yi + xi <<2;
			  var src_idx = pen_preview_img.width * yi + xi <<2;
	  			dst_data[dst_idx+0] = src_data[src_idx +0]*r;
	  			dst_data[dst_idx+1] = src_data[src_idx +1]*r;
	  			dst_data[dst_idx+2] = src_data[src_idx +2]*r;
	  			dst_data[dst_idx+3] = src_data[src_idx +3]*r;
			}
		}
		pen_preview_ctx.putImageData(preview_ctx_imagedata,0,0
	  		,0,0,pen_preview_img.width,pen_preview_img.height);

	}

var refreshToolTab = function(){
	var tool_radios = document.getElementById("tools").getElementsByTagName("input");
	for(var i=0;i<tool_radios.length;i++){
		var input = tool_radios[i];
		var div=document.getElementById("status_"+input.id);
		if(!div)continue;
		if(input.checked){
			div.style.display="inline-block";
			}else{
			div.style.display="none";
		}
	}
}

var refreshPreviewStatus = function(e){
	//カーソル下情報表示
	var data = joined_img.data;

	var x = doc.cursor_pos[0];
	var y = doc.cursor_pos[1];
	var width=joined_img.width;
	var height=joined_img.height;
	var output = document.getElementById("status");

	var r=0; 
	var g=0; 
	var b= 0;
	var a= 0;
	if(x<0 || y<0 || x>=width || y>=height){}else{


		var idx=((y|0)*preview.width+(x|0))*4;
		r= data[idx];
		g= data[idx+1];
		b= data[idx+2];
		a= data[idx+3];
	}

	var str="キャンバス倍率[scale]% X:[x],Y:[y]  R:[r], G:[g], B:[b], A:[a] ";
	str=str.replace(/\[scale\]/,doc.scale);
	str=str.replace(/\[x\]/,x.toFixed(2));
	str=str.replace(/\[y\]/,y.toFixed(2));
	str=str.replace(/\[r\]/,r.toFixed(2));
	str=str.replace(/\[g\]/,g.toFixed(4));
	str=str.replace(/\[b\]/,b.toFixed(4));
	str=str.replace(/\[a\]/,a.toFixed(4));

	if(e.buttons & 2){
		inputs["color_R"].value=r;
		inputs["color_G"].value=g;
		inputs["color_B"].value=b;
		inputs["color_A"].value=a;

		Util.fireEvent(inputs["color_R"],"change");
		Util.fireEvent(inputs["color_G"],"change");
		Util.fireEvent(inputs["color_B"],"change");
		Util.fireEvent(inputs["color_A"],"change");
	}
	Util.setText(output,str);
}
