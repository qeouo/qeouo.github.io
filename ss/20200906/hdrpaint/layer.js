
var thumbnail_ctx,thumbnail_canvas;

//レイヤサムネイル作成用キャンバス
thumbnail_canvas =  document.createElement('canvas');
thumbnail_canvas.width=64;
thumbnail_canvas.height=64;
thumbnail_ctx =  thumbnail_canvas.getContext('2d')
thumbnail_img = new Img(64,64,1);


var Layer=(function(){
//レイヤ
	var Layer = function(){
		this.name="";
		this.display = true;
		this.lock = false;
		this.power=0.0;
		this.alpha=1.0;
		this.blendfunc="normal";
		this.div=null;
		this.img=null;
		this.mask_alpha=0;
		this.position =new Vec2();

		this.type=0; //1なら階層レイヤ
		this.children=[]; //子供レイヤ
	};
	var ret = Layer;

	ret.prototype.refresh= function(){
	var layer = this;
	var layers_container = null;

	if(layer === root_layer){
		layers_container = document.getElementById("layers_container");
	}else{
		layer.div.classList.remove("group");
		if(layer.type===1){
			layer.div.classList.add("group");
		}
		var div= layer.div.getElementsByClassName("name")[0];
		var name=layer.name;
		if(!this.display){
			name +="(非表示)";
		}
		if(this.lock){
			name +="(lock)";
		}
		if(this.mask_alpha){
			name +="(αlock)";
		}
		div.innerHTML=name;
		
		var span = layer.div.getElementsByClassName("layer_attributes")[0];
		var txt="";
		txt += "blendfunc: "+layer.blendfunc +"<br>";
		if(layer.img){
			txt += "offset:("+layer.position[0]+","+layer.position[1] +")"
				+ "size:(" + layer.img.width + "," + layer.img.height +")<br>";
		}
		layer.power=parseFloat(layer.power);
		txt += "power: "+layer.power.toFixed(4)+"";
		layer.alpha=parseFloat(layer.alpha);
		txt += "alpha: "+layer.alpha.toFixed(4)+"<br>";
		
		 if(!layer.display){
			layer.div.classList.add("disable_layer");
		 }else{
			layer.div.classList.remove("disable_layer");
		 }

		span.innerHTML = txt;

		layers_container = layer.div.getElementsByClassName("children")[0];
	}

	//子レイヤ設定
	while (layers_container.firstChild) layers_container.removeChild(layers_container.firstChild);
	for(var li=layer.children.length;li--;){
		layers_container.appendChild(layer.children[li].div);
	}


	if(layer === selected_layer){
		refreshActiveLayerParam();
	}



}

	ret.prototype.refreshThumbnail=function(){
		//レイヤサムネイル更新
		var layer=this;
		if(!layer){
			return;
		}
		if(!layer.img){
			return;
		}
		var img = layer.img;
		var img_data=img.data;

		var layer_img=layer.div.getElementsByTagName("img")[0];
		thumbnail_ctx.globalCompositeOperation = "copy";

		var can = img.toCanvas();
		var ctx = Img.ctx;
		var xr = img.width/64;
		var yr = img.height/64;
		var r=xr;
		if(xr<yr){
			r = yr;
			layer_img.style.width="auto";
			layer_img.style.height="100%";
		}else{
			layer_img.style.width="100%";
			layer_img.style.height="auto";
		}
		//if(r>1){
		//	ctx.globalCompositeOperation = "copy";
		//	var ii=Math.log2(r)|0;
		//	var r = r/(1<<ii);
		//	ctx.drawImage(can,0,0,img.width/r,img.height/r
		//		,0,0,img.width,img.height);
		//	for(var i=0;i<ii;i++){
		//		ctx.drawImage(can,0,0,img.width/(r),img.height/(r)
		//			,0,0,img.width/(r*2),img.height/(r*2));
		//		r*=2;
		//	}
		//}else if(r<1){
		//	ctx.drawImage(can,0,0,img.width/r,img.height/r
		//		,0,0,img.width,img.height);
		//}
		var newx = img.width/r|0;
		var newy = img.height/r|0;
		var data = img.data;
		var dst_data = thumbnail_img.data;
		var sum=new Vec4();
		var _255 = 1/255;
		var ev = parseFloat(inputs["ev"].value);
		var ev2  = Math.pow(2,-ev)*255;
		var rr255 = 255/(r*r);
		for(var yi=0;yi<newy;yi++){
			for(var xi=0;xi<newx;xi++){
				Vec4.set(sum,0,0,0,0);
				for(var yii=0;yii<r;yii++){
					for(var xii=0;xii<r;xii++){
						var idx = img.getIndex(xi*r+xii|0,yi*r+yii|0)<<2;
						var alpha = data[idx+3];
						sum[0]+=data[idx+0]*alpha;
						sum[1]+=data[idx+1]*alpha;
						sum[2]+=data[idx+2]*alpha;
						sum[3]+=alpha;
					}
				}
				var idx = thumbnail_img.getIndex(xi,yi)<<2;
				var _r = ev2/sum[3];
				dst_data[idx]=sum[0]*_r;
				dst_data[idx+1]=sum[1]*_r;
				dst_data[idx+2]=sum[2]*_r;
				dst_data[idx+3]=sum[3]*rr255;
			}
		}
		thumbnail_canvas.width=(img.width/r)|0;
		thumbnail_canvas.height=(img.height/r)|0;

		thumbnail_ctx.putImageData(thumbnail_img.toImageData(),0,0);
		//thumbnail_ctx.drawImage(img.toCanvas()
		//	,0,0,thumbnail_canvas.width
		//	,thumbnail_canvas.height
		//	,0,0,thumbnail_canvas.width
		//	,thumbnail_canvas.height);

		layer_img.src=thumbnail_canvas.toDataURL();

	}
	return ret;
})();

var funcs=[];
funcs["normal"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var src_alpha=src[src_idx+3]*alpha;
	var sa = src[src_idx+3]*alpha;
	var da = dst[dst_idx+3]*(1-sa);
	var dst_r = (1 - sa);

	var r = da+sa;
	if(r==0){
	   return;
	}
	r=1/r;
	da*=r;
	sa*=r;

	sa = power*sa;

	dst[dst_idx+0]=dst[dst_idx+0] * da  +  src[src_idx+0]*sa;
	dst[dst_idx+1]=dst[dst_idx+1] * da  +  src[src_idx+1]*sa;
	dst[dst_idx+2]=dst[dst_idx+2] * da  +  src[src_idx+2]*sa;
	dst[dst_idx+3]=dst[dst_idx+3] * dst_r +  src_alpha;

}
funcs["mul"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var src_alpha=src[src_idx+3]*alpha;
	var dst_r = (1-src_alpha);
	var src_r = power*src_alpha;

	dst[dst_idx+0]=dst[dst_idx+0] * (dst_r +  src[src_idx+0]*src_r);
	dst[dst_idx+1]=dst[dst_idx+1] * (dst_r +  src[src_idx+1]*src_r);
	dst[dst_idx+2]=dst[dst_idx+2] * (dst_r +  src[src_idx+2]*src_r);
}
funcs["transmit"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var src_alpha=src[src_idx+3]*alpha;
	var dst_r = (1-src_alpha);
	var src_r = power*src_alpha;

	dst[dst_idx+0]=dst[dst_idx+0] * dst_r * src[src_idx+0]+  src[src_idx+0]*src_r;
	dst[dst_idx+1]=dst[dst_idx+1] * dst_r * src[src_idx+1]+  src[src_idx+1]*src_r;
	dst[dst_idx+2]=dst[dst_idx+2] * dst_r * src[src_idx+2]+  src[src_idx+2]*src_r;
	dst[dst_idx+3]=dst[dst_idx+3] * dst_r +  src_alpha;
}
funcs["add"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var src_alpha=src[src_idx+3]*alpha;
	var dst_r = (1-src_alpha);
	var src_r = power*src_alpha;

	dst[dst_idx+0]=dst[dst_idx+0]  + src[src_idx+0]*src_r;
	dst[dst_idx+1]=dst[dst_idx+1]  + src[src_idx+1]*src_r;
	dst[dst_idx+2]=dst[dst_idx+2]  + src[src_idx+2]*src_r;
}

funcs["sub"] = function(dst,dst_idx,src,src_idx,alpha,power){
	var src_alpha=src[src_idx+3]*alpha;
	var dst_r = (1-src_alpha);
	var src_r = power*alpha;

	dst[dst_idx+0]=dst[dst_idx+0]  - src[src_idx+0]*src_r;
	dst[dst_idx+1]=dst[dst_idx+1]  - src[src_idx+1]*src_r;
	dst[dst_idx+2]=dst[dst_idx+2]  - src[src_idx+2]*src_r;
}
Layer.prototype.composite=function(left,top,right,bottom){

	var layers=this.children;
	if(!layers){
		return;
	}
	var img = this.img;
	var img_data = img.data;
	var img_width = img.width;
	
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

	for(var li=0;li<layers.length;li++){
		var layer = layers[li];

		if(!layer.img
		|| !layer.display ){
			//非表示の場合スルー
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
			var idx = yi * img_width + left2 << 2;
			var max = yi * img_width + right2 << 2;
			var idx2 = (yi-layer_position_y) * layer_img_width + left2 - layer_position_x << 2;
			for(;idx<max;idx+=4){
				func(img_data,idx,layer_img_data,idx2,layer_alpha,layer_power);
				idx2+=4;
			}
		}
		
	}
	

}


var root_layer=null;
var selected_layer = null;
var layers_container;
var layer_id_count=0;


Layer.bubble_func=function(layer,f){
	f(layer);
	var parent_layer= Layer.findParent(layer);
	if(parent_layer){
		Layer.bubble_func(parent_layer,f);
	}

}
each_layers=function(f){
	if(!root_layer){
		return;
	}
	var cb = function(layer){
		if(f(layer)){
			return true;
		}
		if(layer.type !== 1){
			return false;
		}
		var layers = layer.children;
		for(var i=0;i<layers.length;i++){
			if(cb(layers[i])){
				return true;
			}
		}
		return false;
	}
	return cb(root_layer);
}
Layer.eachLayers=each_layers;
getLayerFromDiv=function(div){
	var result_layer = null;
	each_layers(function(layer){
		if(layer.div == div){
			result_layer = layer;

			return true;
		}

	});
	return result_layer;
}
Layer.findById=function(layer_id){
	var result_layer = null;
	each_layers(function(layer){
		if(layer.id== layer_id){
			result_layer = layer;

			return true;
		}

	});
	return result_layer;
}
Layer.layerArray=function(){
	var layers=[];
	each_layers(function(layer){
		layers.push(layer);
	});
	return layers;

}
	Layer.findParent = function(target_layer){
		var result_layer = null;
		each_layers(function(layer){
			for(var li=0;li<layer.children.length;li++){
				if(target_layer === layer.children[li]){
					result_layer = layer;
					return true;
				}
			}
		});
		return result_layer;
	}


var selectLayer=function(target_layer){
	//アクティブレイヤ変更
	
	selected_layer=target_layer;
	each_layers(function(layer){
		if(target_layer !== layer){
			//アクティブレイヤ以外の表示を非アクティブにする
			layer.div.classList.remove("active");
		}else{
			layer.div.classList.add("active");
		}
	});

	refreshActiveLayerParam();

	if(selected_layer){
		if(selected_layer.type ===1){
			inputs["join_layer"].value="結合し通常レイヤにする";
		}else{
			inputs["join_layer"].value="下のレイヤと結合";
		}
	}

}
var layerSelect= function(e){
//レイヤー一覧クリック時、クリックされたものをアクティブ化する

	var layer=getLayerFromDiv(e.currentTarget);

	selectLayer(layer);

	e.stopPropagation();

}

//ドラッグ＆ドロップによるレイヤ順編集
var drag_layer=null;
function DragStart(event) {
	//ドラッグ開始
	drag_layer= getLayerFromDiv(event.currentTarget);
//     event.dataTransfer.setData("text", drag_layer.id);
	 selectLayer(drag_layer);

	event.stopPropagation();
}
function dragover_handler(event) {
 event.preventDefault();
 event.dataTransfer.dropEffect = "move";
}	
function dragend(event) {
}

function DragEnter(event) {
	//ドラッグ移動時
	var drop_layer = getLayerFromDiv(event.currentTarget);

	event.stopPropagation();
	if(drag_layer=== drop_layer){
		//自分自身の場合は無視
		return;
	}

	if(drag_layer.type ===1){
		//グループレイヤドラッグ時は、自身の子になるかチェックし、その場合は無視
		var flg = false;
		Layer.bubble_func(drop_layer,
			function(layer){
				if(layer === drag_layer){
					flg=true;
					return true;
				}
			}
		);
		if(flg){
			return;
		}
	}

	var parent_layer = Layer.findParent(drop_layer);
	var position= parent_layer.children.indexOf(drop_layer);

	Command.executeCommand("moveLayer",{"layer_id":drag_layer.id
		,"parent_layer_id":parent_layer.id,"position":position});
}

function DragEnterChild(event) {
	//ドラッグ移動時
	
	event.stopPropagation();

    var drag = parseInt(event.dataTransfer.getData("text"));
	var parent_layer= getLayerFromDiv(event.currentTarget.parentNode);


	if(drag_layer.type ===1){
		//グループレイヤドラッグ時は、自身の子になるかチェックし、その場合は無視
		var flg = false;
		Layer.bubble_func(parent_layer,
			function(layer){
				if(layer === drag_layer){
					flg=true;
					return true;
				}
			}
		);
		if(flg){
			return;
		}
	}

	var position= 0;

	Command.executeCommand("moveLayer",{"layer_id":drag_layer.id
		,"parent_layer_id":parent_layer.id,"position":position});
}

var appendLayer=function(root,idx,layer){
	var layers = root.children;
	layers.splice(idx,0,layer);

	root.refresh();
	refreshMain();
}
var createLayer=function(img,composite_flg){
	var layer_template= document.getElementById("layer_template");
	var layer = new Layer();

	if(composite_flg){
		//グループレイヤの場合
		layer.type=1;
		layer.children=[];
	}

	var layer_div = layer_template.children[0].cloneNode(true);
	if(layer.type == 1){
		layer_div.classList.add("group");
	}

	layer_div.addEventListener("click",layerSelect);
	layer.div=layer_div;

	layer.img=img;

	layer.id=layer_id_count;
	layer_id_count++;
	layer.name ="layer"+("0000"+layer.id).slice(-4);

	Layer.bubble_func(layer,
		function(layer){
			refreshLayerThumbnail(layer);
		}
	);
	layer.refresh();

	return layer;

}

