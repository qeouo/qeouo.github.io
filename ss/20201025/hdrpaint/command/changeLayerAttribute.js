//レイヤパラメータ変更
Command["changeLayerAttribute"] = (function(){
	return function(log,undo_flg){
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
		//layer.refreshImg();
		layer.parent.bubbleComposite();
	}
})();
