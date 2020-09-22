
"use strict"
var root_layer=null;
var selected_layer = null;

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

	ret.enableRefreshThumbnail=true;


	ret.init=function(){
	}

	ret.bubble_func=function(layer,f){
		//親に伝搬する処理
		f(layer);
		//var parent_layer= Layer.findParent(layer);
		var parent_layer=layer.parent;

		if(parent_layer){
			Layer.bubble_func(parent_layer,f);
		}

	}
	var getLayerFromDiv=function(div){
		var result_layer = null;
		Layer.eachLayers(function(layer){
			if(layer.div == div){
				result_layer = layer;

				return true;
			}

		});
		return result_layer;
	}


	ret.eachLayers=function(f){
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

	ret.findById=function(layer_id){
		var result_layer = null;
		Layer.eachLayers(function(layer){
			if(layer.id== layer_id){
				result_layer = layer;

				return true;
			}

		});
		return result_layer;
	}


	ret.layerArray=function(){
		var layers=[];
		Layer.eachLayers(function(layer){
			layers.push(layer);
		});
		return layers;

	}

	ret.findParent = function(target_layer){
		var result_layer = null;
		Layer.eachLayers(function(layer){
			for(var li=0;li<layer.children.length;li++){
				if(target_layer === layer.children[li]){
					result_layer = layer;
					return true;
				}
			}
		});
		return result_layer;
	}

	ret.click = function(e){
	//レイヤー一覧クリック時、クリックされたものをアクティブ化する
		var layer=getLayerFromDiv(e.currentTarget);
		layer.select();
		e.stopPropagation();
	}

	//ドラッグ＆ドロップによるレイヤ順編集
	var drag_layer=null;
	ret.DragStart = function(event) {
		//ドラッグ開始
		drag_layer= getLayerFromDiv(event.currentTarget);
	//     event.dataTransfer.setData("text", drag_layer.id);
		 drag_layer.select;

		event.stopPropagation();
	}
	ret.DragOver =function(event) {
	 event.preventDefault();
	// event.dataTransfer.dropEffect = "move";
	}	

	ret.DragEnter = function(event) {
		//ドラッグ移動時
		var drop_layer = getLayerFromDiv(event.currentTarget.parentNode);

		if(!drop_layer){
			return;
		}

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

	ret.DragEnterChild = function(event) {
		//ドラッグ移動時
		var drop_layer = getLayerFromDiv(event.currentTarget);
		
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

		if(parent_layer ===null){
			console.log("NUL");
		}
		Command.executeCommand("moveLayer",{"layer_id":drag_layer.id
			,"parent_layer_id":parent_layer.id,"position":position});
	}

	ret.prototype.refreshImg=function(x,y,w,h){
		var layer = this;

		var left = 0;
		var right = layer.img.width-1;
		var top = 0;
		var bottom = layer.img.height-1;
		
		if( typeof w !== 'undefined'){
			//更新領域設定、はみ出している場合はクランプする
			left=Math.max(left,x);
			right=Math.min(right,x+w-1);
			top=Math.max(top,y);
			bottom=Math.min(bottom,y+h-1);
		}
		left=Math.floor(left);
		right=Math.ceil(right);
		top=Math.floor(top);
		bottom=Math.ceil(bottom);
		var width=right-left+1;
		var height=bottom-top+1;

		if(layer.parent){
			if(typeof w === 'undefined'){
				layer.parent.bubbleComposite();

			}else{
				layer.parent.bubbleComposite(left+layer.position[0]
					,top + layer.position[1]
					,right -left +1
					,bottom -top +1);
			}
		}
		this.registRefreshThumbnail();
	}
	ret.prototype.bubbleComposite=function(x,y,w,h){
		if(typeof x === 'undefined'){
			x = 0;
			y = 0;
			w = this.img.width;
			h = this.img.height;
		}
		var left = Math.max(0,x);
		var top = Math.max(0,y);
		var right = Math.min(this.img.width-1,x+w-1);
		var bottom = Math.min(this.img.height-1,y+h-1);
		left=Math.floor(left);
		right=Math.ceil(right);
		top=Math.floor(top);
		bottom=Math.ceil(bottom);

		if(left == right || top == bottom){
			return;
		}

		if(typeof x === 'undefined'){
			this.composite();
		}else{
			this.composite(left,top,right,bottom);
		}
		if(this.parent){
			this.parent.bubbleComposite(left+this.position[0]
				,top + this.position[1]
				,right-left+1
				,bottom-top+1);
		}
	}
	ret.prototype.refreshDiv= function(){
		var layer = this;
		var layers_container = null;

		if(layer === root_layer){
			layers_container = document.getElementById("layers_container");
		}else{
			//layer.div.className="layer";
			if(selected_layer === layer){
				layer.div.classList.add("active");
			}else{
				layer.div.classList.remove("active");
			}

			if(layer.type===1){
				layer.div.classList.add("group");
			}else{
				layer.div.classList.remove("group");
			}
			var div= layer.div.getElementsByClassName("name")[0];
			var name=layer.name;
			if(!this.display){
				name +="(非表示)";
				layer.div.classList.add("invisible");
			}else{
				layer.div.classList.remove("invisible");
			}
			if(this.lock){
				name +="(lock)";
				layer.div.classList.add("lock");
			}else{
				layer.div.classList.remove("lock");
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

	ret.prototype.append=function(idx,layer){
		var layers = this.children;
		layers.splice(idx,0,layer);

		layer.parent = this;

		this.refreshDiv();
		//refreshMain();
		this.bubbleComposite();
	}

	//レイヤサムネイル作成用
	var thumbnail_img = new Img(64,64,1);
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
		var newx = img.width/r|0;
		var newy = img.height/r|0;
		thumbnail_img.clear(0,0,newx,newy);
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
		thumbnail_img.width=newx;
		thumbnail_img.height=newy;
		layer_img.src = thumbnail_img.toDataURL();
		thumbnail_img.width=64;
		thumbnail_img.height=64;

	}

	ret.select=function(target_layer){
		//アクティブレイヤ変更
		
		selected_layer=target_layer;
		Layer.eachLayers(function(layer){
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
				inputs["join_layer"].value="全ての子を結合";
			}else{
				inputs["join_layer"].value="下のレイヤと結合";
			}
		}




	}
	ret.prototype.getAbsolutePosition=function(p){
		Vec2.set(p,0,0);

		ret.bubble_func(this,function(layer){
			Vec2.add(p,p,layer.position);
		});
	}
	ret.prototype.select=function(){
		Layer.select(this);

	}

	ret.layer_id_count=0;
	ret.create=function(img,composite_flg){
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

		//layer_div.addEventListener("click",layerSelect);
		layer.div=layer_div;

		layer.img=img;

		layer.id=this.layer_id_count;
		this.layer_id_count++;
		layer.name ="layer"+("0000"+layer.id).slice(-4);

		layer.refreshDiv();
		layer.registRefreshThumbnail();

		return layer;

	}

	var funcs=[];
	ret.funcs=funcs;
	funcs["normal"] = function(dst,d_idx,src,s_idx,alpha,power){
		var src_alpha=src[s_idx+3]*alpha;
		var sa = src[s_idx+3]*alpha;
		var da = dst[d_idx+3]*(1-sa);
		var dst_r = (1 - sa);

		var r = da+sa;
		if(r==0){
		   return;
		}
		r=1/r;
		da*=r;
		sa*=r;

		sa = power*sa;

		dst[d_idx+0]=dst[d_idx+0] * da  +  src[s_idx+0]*sa;
		dst[d_idx+1]=dst[d_idx+1] * da  +  src[s_idx+1]*sa;
		dst[d_idx+2]=dst[d_idx+2] * da  +  src[s_idx+2]*sa;
		dst[d_idx+3]=dst[d_idx+3] * dst_r +  src_alpha;

	}
	funcs["mul"] = function(dst,d_idx,src,s_idx,alpha,power){
		var src_alpha=src[s_idx+3]*alpha;
		var dst_r = (1-src_alpha);
		var src_r = power*src_alpha;

		dst[d_idx+0]=dst[d_idx+0] * (dst_r +  src[s_idx+0]*src_r);
		dst[d_idx+1]=dst[d_idx+1] * (dst_r +  src[s_idx+1]*src_r);
		dst[d_idx+2]=dst[d_idx+2] * (dst_r +  src[s_idx+2]*src_r);
	}
	funcs["transmit"] = function(dst,d_idx,src,s_idx,alpha,power){
		var src_alpha=src[s_idx+3]*alpha;
		var dst_r = (1-src_alpha);
		var src_r = power*src_alpha;

		dst[d_idx+0]=dst[d_idx+0] * dst_r * src[s_idx+0]+  src[s_idx+0]*src_r;
		dst[d_idx+1]=dst[d_idx+1] * dst_r * src[s_idx+1]+  src[s_idx+1]*src_r;
		dst[d_idx+2]=dst[d_idx+2] * dst_r * src[s_idx+2]+  src[s_idx+2]*src_r;
		dst[d_idx+3]=dst[d_idx+3] * dst_r +  src_alpha;
	}
	funcs["add"] = function(dst,d_idx,src,s_idx,alpha,power){
		var src_alpha=src[s_idx+3]*alpha;
		var dst_r = (1-src_alpha);
		var src_r = power*src_alpha;

		dst[d_idx+0]=dst[d_idx+0]  + src[s_idx+0]*src_r;
		dst[d_idx+1]=dst[d_idx+1]  + src[s_idx+1]*src_r;
		dst[d_idx+2]=dst[d_idx+2]  + src[s_idx+2]*src_r;
	}

	funcs["sub"] = function(dst,d_idx,src,s_idx,alpha,power){
		var src_alpha=src[s_idx+3]*alpha;
		var dst_r = (1-src_alpha);
		var src_r = power*alpha;

		dst[d_idx+0] = dst[d_idx+0]  - src[s_idx+0]*src_r;
		dst[d_idx+1] = dst[d_idx+1]  - src[s_idx+1]*src_r;
		dst[d_idx+2] = dst[d_idx+2]  - src[s_idx+2]*src_r;
	}

	var stackThumbnail=[];
	var refreshThumbnail=function(){
		if(Layer.enableRefreshThumbnail){
			var layer = stackThumbnail.shift();
			layer.refreshThumbnail();
		}
		if(stackThumbnail.length>0){
			window.requestAnimationFrame(function(e){
				refreshThumbnail();
			});
		}
	}
	ret.prototype.registRefreshThumbnail = function(){
		if(stackThumbnail.indexOf(this)>=0){
			return;
		}
		stackThumbnail.push(this);

		if(stackThumbnail.length===1){
			window.requestAnimationFrame(function(e){
				refreshThumbnail();
			});
		}
	}
	

	ret.prototype.composite=function(left,top,right,bottom){

		if(typeof left === 'undefined'){
			left=0;
			top=0;
			right = this.img.width-1;
			bottom= this.img.height-1;
		}

		if(this === root_layer){
			refreshPreview(0,left,top,right-left+1,bottom-top+1);
		}else{
			this.registRefreshThumbnail();
		}
		if(this.type !==1){
			return;
		}
		var layers=this.children;
		var img = this.img;
		var img_data = img.data;
		var img_width = img.width;
		


		img.clear(left,top,right-left+1,bottom-top+1);

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
			var right2 = Math.min(layer.img.width + layer_position_x -1,right);
			var bottom2 = Math.min(layer.img.height + layer_position_y-1 ,bottom);

			for(var yi=top2;yi<=bottom2;yi++){
				var idx = yi * img_width + left2 << 2;
				var max = yi * img_width + right2 << 2;
				var idx2 = (yi-layer_position_y) * layer_img_width + left2 - layer_position_x << 2;
				for(;idx<=max;idx+=4){
					func(img_data,idx,layer_img_data,idx2,layer_alpha,layer_power);
					idx2+=4;
				}
			}
			
		}

	}
	ret.opencloseClick = function(e){
		var layer= getLayerFromDiv(event.target.parentNode);
		layer.div.classList.toggle("open");
		return false;
	}
	
	return ret;
})();

