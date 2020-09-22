
Command["translateLayer"] = (function(){
	return function(log,undo_flg){
		var param = log.param;
		var layer = Layer.findById(param.layer_id);

		var x = param.x;
		var y = param.y;
		if(undo_flg){
			x*=-1;
			y*=-1;
		}
		if(!log.undo_data){
			log.undo_data={};
		}

		if(!layer){
			//レイヤ指定無しの場合はルート直下のレイヤすべてを移動
			var layers = root_layer.children;
			for(var li=0;li<layers.length;li++){
				var l = layers[li];
				l.position[0]+=x;
				l.position[1]+=y;
				if(isNaN(l.position[0])){
					l.position[0]=0;
				}
				if(isNaN(l.position[1])){
					l.position[1]=0;
				}
				l.refreshDiv();

			}
			root_layer.composite();
		}else{
			layer.position[0]+=x;
			layer.position[1]+=y;
			if(isNaN(layer.position[0])){
				layer.position[0]=0;
			}
			if(isNaN(layer.position[1])){
				layer.position[1]=0;
			}
			layer.refreshDiv();
			layer.refreshImg();
		}
	}
})();
