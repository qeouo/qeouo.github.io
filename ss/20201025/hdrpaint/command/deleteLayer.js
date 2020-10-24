//ƒŒƒCƒ„íœ
Command["deleteLayer"] = (function(){
	return function(log,undo_flg){

		if(undo_flg){
			var layer = log.undo_data.layer;
			var idx = log.undo_data.position;
			var parent_layer = Layer.findById(log.undo_data.parent);

			parent_layer.append(idx,layer);
			layer.select();
			return;
		}
		var layer_id = log.param.layer_id;

		var layer = Layer.findById(layer_id);
		var parent_layer = layer.parent;
		if(parent_layer){
			var layers = parent_layer.children;
			var idx=  layers.indexOf(layer);

			if(!log.undo_data){
				log.undo_data ={"layer":layer,"position":idx,"parent":parent_layer.id};
			}

			var index = layers.indexOf(layer);
			//ƒŒƒCƒ„íœ
			Hdrpaint.removeLayer(layer);
			if(layer === selected_layer){
				if(layers.length===0){
					parent_layer.select();
				}else{
					if(index<layers.length){
						layers[index].select();
					}else{
						layers[layers.length-1].select();
					}
				}
			}

		}
		if(parent_layer){
			parent_layer.bubbleComposite();
		}
	}
})();
