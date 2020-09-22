
var PenPoint=function(){
	this.pos=new Vec2();
	this.pressure=1;
}
var Command = (function(){
	var  Command = function(){};
	var ret = Command;

	ret.onlyExecute= function(command,param){
		if(param.layer_id && command !=="changeLayerAttribute"){
			var layer = Layer.findById(param.layer_id);
			if(layer){
				if(layer.lock || !layer.display){
					return;
				}
			}
		}
	
		var log ={"param":param};
		Command[command](log);
	}
	ret.executeCommand = function(command,param,flg){

		if(param.layer_id && command !=="changeLayerAttribute" && command!=="moveLayer"){
			var layer = Layer.findById(param.layer_id);
			if(layer){
				if(layer.lock || !layer.display){
					return null;
				}
			}
		}

		var log = CommandLog.createLog(command,param,flg);
		CommandLog.appendOption();
		Command[log.command](log);
		return log;
	}

	var createDif=function(layer,left,top,width,height){
		//更新領域の古い情報を保存
		var img = new Img(width,height);
		Img.copy(img,0,0,layer.img,left,top,width,height);
		var dif={};
		dif.img=img;
		dif.x=left;
		dif.y=top;
		return dif;
	}

	ret.createDif = createDif;


	Command.loadImageFile_=function(file,n){
		var position = n;
		var fu =function(img){
			var log =Command.executeCommand("loadImageFile",{"file":file.name,"position":position,"img":img});
		}
	 	if(/.*exr$/.test(file.name)){
			Img.loadExr(file,0,fu);
	 	}else if(/^image\//.test(file.type)){
			Img.loadImg(file,0,fu);
	 	}
	}

	var removeNewLayer = function(layer){
		var parent_layer = Layer.findParent(layer);
		var layers = parent_layer.children;
		var idx = layers.indexOf(layer);
		layers.splice(idx,1);
		layer.div.classList.remove("active_layer");
		
		//layer_id_count--;
		if(selected_layer===layer){
			if(idx>0)idx-=1;
			if(layers.length>0){
				layers[idx].select();
			}else{
				Layer.select(null);
			}
				
		}
		parent_layer.refreshDiv();
		parent_layer.refreshImg();
	}
	Command.createNewCompositeLayer=function(log,undo_flg){
		Command.createNewLayer(log,undo_flg);
	}
	Command.createNewLayer=function(log,undo_flg){
		var param = log.param;
		var width = param.width;
		var height= param.height;
		var n= param.position;

		var layer;
		if(undo_flg){
			removeNewLayer(log.undo_data.layer);
			return;
		}
		if(!log.undo_data){
			var img = new Img(width,height);
			var data = img.data;
			for(var i=0;i<data.length;i+=4){
				data[i+0]= 1;
				data[i+1]= 1;
				data[i+2]= 1;
				data[i+3]= 0;
			}

			layer =Layer.create(img,param.composite_flg);
			log.undo_data={"layer":layer};
		}else{
			layer = log.undo_data.layer;
		}
		var parentLayer = Layer.findById(param.parent);

		parentLayer.append(n,layer);
		Layer.select(layer);

		return layer;

	}


	Command.moveLayer=function(log,undo_flg){

		var param = log.param;
		var layer = Layer.findById(param.layer_id);
		var now_parent_layer= Layer.findParent(layer);
		var layers =now_parent_layer.children;
		var next_parent_layer = param.parent_layer_id;
		var position = param.position;
		var layer_num = layers.indexOf(layer);

		if(undo_flg){
			position = log.undo_data.before;
			next_parent_layer= log.undo_data.before_parent;
		}
		next_parent_layer = Layer.findById(next_parent_layer);
		
		if(position<0|| layers.length < position){
			return;
		}	
		if(layer_num === position && now_parent_layer === next_parent_layer){
			return;
		}	

		now_parent_layer.children.splice(layer_num,1);
		now_parent_layer.bubbleComposite();

		var layers_container = layer.div.parentNode;

		next_parent_layer.append(position,layer);

		if(!log.undo_data){
			log.undo_data = {"before":layer_num,"before_parent":now_parent_layer.id};
		}
	}


	Command.changeLayerAttribute=function(log,undo_flg){
		var param = log.param;
		var name = param.name;
		var value = param.value;
		var layer = Layer.findById(param.layer_id);

		if(undo_flg){
			value = log.undo_data.value;
		}
		if(!log.undo_data){
			log.undo_data = {"value" :layer[name]};
		}
		layer[name] = value;

		layer.refreshDiv();
		layer.refreshImg();
	}

	Command.loadImageFile=function(log,undo_flg){
		var param = log.param;
		var n  = param.position;
		var img = log.param.img;
		var file  = param.file;

		var pos_layer = Layer.findById(n);
		var parent_layer = pos_layer;
		if(pos_layer.type === 1){
			parent_layer = pos_layer;
			n = parent_layer.children.length;
		}else{
			parent_layer = Layer.findParent(pos_layer);
			n = parent_layer.children.indexOf(pos_layer)+1;
		}


		var layer;
		if(undo_flg){
			removeNewLayer(log.undo_data.layer);
			return;
		}
		if(!log.undo_data){
			log.param.img=null;
			layer=Layer.create(img);
			log.undo_data={"layer":layer};
		}else{
			layer=log.undo_data.layer;
		}
		parent_layer.append(n,layer);

		//layer.img=img;
		layer.name = file;

		layer.refreshDiv();
		Layer.select(layer);
		layer.registRefreshThumbnail();

		return layer;
	}

	var flgdata=[];
	Command.resizeCanvas=function(log,undo_flg){
		var width = log.param.width;
		var height = log.param.height;
		var old_width=preview.width;
		var old_height=preview.height;

		if(undo_flg){
			width = log.undo_data.width;
			height = log.undo_data.height;
		}
		if(!log.undo_data){
			log.undo_data = {"width":old_width,"height":old_height};
		}

		preview.width=width;
		preview.height=height

		preview_ctx_imagedata=preview_ctx.createImageData(width,height);
		horizon_img = new Img(width,height);
		bloomed_img = new Img(width,height);
		bloom_img = new Img(width,height);

		root_layer.img=new Img(width,height);

		inputs["canvas_width"].value = root_layer.img.width;
		inputs["canvas_height"].value = root_layer.img.height;

		root_layer.composite();
	}


	Command.composite=function(log,undo_flg){
		//グループレイヤの子レイヤをすべて結合して通常レイヤにする

		var param = log.param;

		if(undo_flg){
			var undo_data=log.undo_data;
			var layer = undo_data.layer;
			layer.children = undo_data.children;
			layer.type=1;
			layer.refreshDiv();
			return;
		}
		var layer = Layer.findById(param.layer_id);

		//差分ログ作成
		if(!log.undo_data){
			log.undo_data={"layer":layer,"children":layer.children};
		}
		layer.type=0;
		layer.children=[];

		layer.refreshDiv();
		//layer.refreshImg();
	}
	Command.joinLayer=function(log,undo_flg){
		//レイヤ結合

		var param = log.param;

		if(undo_flg){
			var undo_data=log.undo_data;
			//width=log.undo_data.width;
			//height=log.undo_data.height;
			removeNewLayer(undo_data.layer);
			root_layer.append(undo_data.position,undo_data.layerA);
			root_layer.append(undo_data.positionB,undo_data.layerB);
			return;
		}

		var layer;
		var layerA = Layer.findById(param.layer_id);
		var layerB = Layer.findById(param.layer_id2);
		var parent_layer = Layer.findParent(layerA);
		var layers = parent_layer.children;
		var ls=[layerA,layerB];

		if(!log.undo_data){

			var x=Math.min(layerA.position[0] ,layerB.position[0]);
			var y=Math.min(layerA.position[1] ,layerB.position[1]);
			var right = Math.max(layerA.position[0]+layerA.img.width,layerB.position[0]+layerB.img.width);
			var bottom = Math.max(layerA.position[1]+layerA.img.height,layerB.position[1]+layerB.img.height);
			var width  = right-x;
			var height= bottom-y;
			var position = layers.indexOf(layerA);
			var position2 = layers.indexOf(layerB);
			log.undo_data={"layerA":layerA,"position":position,"layerB":layerB,"positionB":position2};

			var img = new Img(width,height);
			layer =Layer.create(img,1);
			layer.position[0]=x;
			layer.position[1]=y;
			layer.append(0,layerB);
			Vec2.sub(layerB.position,layerB.position,layer.position);
			Vec2.sub(layerA.position,layerA.position,layer.position);
			layer.append(1,layerA);
			layer.composite();
			layer.type=0;
			layer.children=[];


//			//レイヤ合成
//			for(var li=0;li<ls.length;li++){
//				var layer = ls[li];
//
//				var layer_img_data = layer.img.data;
//				var layer_alpha=layer.alpha;
//				var layer_power=Math.pow(2,layer.power);
//				var layer_img_width = layer.img.width;
//				var func = funcs["normal"];
//				var layer_position_x= layer.position[0] -x;
//				var layer_position_y= layer.position[1] -y;
//
//				//レイヤごとのクランプ
//				var left2 = Math.max(0,layer.position[0]);
//				var top2 = Math.max(0,layer.position[1]);
//				var right2 = Math.min(layer.img.width + layer_position_x ,width);
//				var bottom2 = Math.min(layer.img.height + layer_position_y ,height);
//
//				for(var yi=top2;yi<bottom2;yi++){
//					var idx = yi * width + left2 << 2;
//					var max = yi * width + right2 << 2;
//					var idx2 = (yi-layer_position_y) * layer_img_width + left2 - layer_position_x << 2;
//					for(;idx<max;idx+=4){
//						func(img.data,idx,layer_img_data,idx2,layer_alpha,layer_power);
//						idx2+=4;
//					}
//				}
//			}
			layer.name=layerA.name + "+" + layerB.name;

			log.undo_data.layer=layer;
		}else{
			layer = log.undo_data.layer;
		}
		for(var li=0;li<ls.length;li++){
			var n=layers.indexOf(ls[li]);
			layers.splice(n,1);
		}

		parent_layer.append(n,layer);
		layer.refreshDiv();
		parent_layer.refreshDiv();

		refreshMain(0,layer.position[0],layer.position[1],layer.img.width,layer.img.height);

		Layer.select(layer);

	}
	Command.resizeLayer=function(log,undo_flg){

		var param = log.param;

		if(param.layer_id===-1){
			//全レイヤ一括の場合バッチ化
			var logs =[];
			var layers = Layer.layerArray();
			for(var li=0;li<layers.length;li++){
				var layer = layers[li];
				if(layer === root_layer){continue;}
				var _log = new CommandLog();
				_log.command="resizeLayer";
				_log.param={"layer_id":layer.id,"width":param.width,"height":param.height};
				logs.push(_log);
			}
			log.command="multiCommand";
			log.param={"logs":logs};

			Command[log.command](log);
			return;
		}

		var layer = Layer.findById(param.layer_id);
		var img = layer.img;
		if(!img){
			return;
		}
		var old_width=img.width;
		var old_height=img.height;
		var width  = param.width;
		var height= param.height;

		if(undo_flg){
			width=log.undo_data.width;
			height=log.undo_data.height;
		}
		
		//差分ログ作成
		if(!log.undo_data){
			log.undo_data = {"width":old_width,"height":old_height};
			var dx = old_width-width;
			var dy = old_height-height;
			log.undo_data.difs=[];
			
			var dif;
			if(dx>0){
				dif=createDif(layer,width,0,dx,old_height);
				log.undo_data.difs.push(dif);
			}
			if(dy>0){
				dif=createDif(layer,0,height,old_width,dy);
				log.undo_data.difs.push(dif);
			}
		}
		var old_img = img;

		layer.img=new Img(width,height);
		Img.copy(layer.img,0,0,old_img,0,0,old_img.width,old_img.height);
		layer.refreshDiv();
		layer.registRefreshThumbnail();
		if(layer.parent){
			layer.parent.bubbleComposite();
		}
	}

	Command.multiCommand=function(_log,undo_flg){
		var logs = _log.param.logs
		if(undo_flg){
			for(var li=logs.length;li--;){
				var log = logs[li];
				Command[log.command](log,true);

				var difs = log.undo_data.difs;
				if(difs){
					//画像戻す
					var param = log.param;
					var layer_id= param.layer_id;
					var layer = Layer.findById(param.layer_id);

					for(var di=difs.length;di--;){
						var dif = difs[di];
						Img.copy(layer.img,dif.x,dif.y,dif.img,0,0,dif.img.width,dif.img.height);
					}
				}
			}
		}else{
			if(!_log.undo_data){
				_log.undo_data={};
			}
			for(var li=0;li<logs.length;li++){
				var log = logs[li];
				Command[log.command](log);
			}
		}

	}
	Command.deleteLayer=function(log,undo_flg){

		if(undo_flg){
			var layer = log.undo_data.layer;
			var idx = log.undo_data.position;
			var parent_layer = Layer.findById(log.undo_data.parent);

			parent_layer.append(idx,layer);
			return;
		}
		var layer_id = log.param.layer_id;

		var layer = Layer.findById(layer_id);
		var parent_layer = Layer.findParent(layer);
		if(parent_layer){
			var layers = parent_layer.children;
			var idx=  layers.indexOf(layer);

			if(!log.undo_data){
				log.undo_data ={"layer":layer,"position":idx,"parent":parent_layer.id};
			}

			//レイヤ削除
			 if(idx<0){
				 return;
			 }
			 

			layers.splice(idx,1);
			layer.div.classList.remove("active_layer");
			parent_layer.refreshDiv();


			if(layer === selected_layer){
				idx = Math.max(idx-1,0);
				if(layers.length){
					Layer.select(layers[idx]);
				}
			}else{
				Layer.select(null);
			}
		}
		if(parent_layer){
			parent_layer.bubbleComposite();
		}
	}

	var commands=["fill","translate","clear","brush"];
	for(var i=0;i<commands.length;i++){
		Util.loadJs("./command/" + commands[i] +".js");
	}
	return ret;
})();

