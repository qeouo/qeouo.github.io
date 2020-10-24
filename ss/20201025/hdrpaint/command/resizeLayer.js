//リサイズレイヤ
Command["resizeLayer"] = (function(){
	return function(log,undo_flg){

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
				dif = Hdrpaint.createDif(layer,width,0,dx,old_height);
				log.undo_data.difs.push(dif);
			}
			if(dy>0){
				dif= Hdrpaint.createDif(layer,0,height,old_width,dy);
				log.undo_data.difs.push(dif);
			}
		}
		var old_img = img;

		layer.img=new Img(width,height);
		layer.size[0]=width;
		layer.size[1]=height;
		Img.copy(layer.img,0,0,old_img,0,0,old_img.width,old_img.height);
		layer.refreshDiv();
		layer.registRefreshThumbnail();
		if(layer.parent){
			layer.parent.bubbleComposite();
		}
	}
})();
