//ƒŒƒCƒ„ˆÊ’uˆÚ“®
Command["moveLayer"] = (function(){
	return function(log,undo_flg){

		var param = log.param;
		var layer = Layer.findById(param.layer_id);
//		var now_parent_layer= Layer.findParent(layer);
		var now_parent_layer= layer.parent;
		var layers =now_parent_layer.children;
		var next_parent_layer = param.parent_layer_id;
		var position = param.position;
		var layer_num = layers.indexOf(layer);

		if(undo_flg){
			position = log.undo_data.before;
			next_parent_layer= log.undo_data.before_parent;
		}
		next_parent_layer = Layer.findById(next_parent_layer);
		
		if(position<0|| next_parent_layer.children.length < position){
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
})();
