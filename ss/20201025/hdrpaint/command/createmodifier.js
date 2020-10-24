commandObjs["createmodifier"] = (function(){
	var CreateModifier= function(){
		CommandBase.apply(this);
	}
	var ret = CreateModifier;
	inherits(ret,CommandBase);

	ret.prototype.name ="createmodifier";

	ret.prototype.undo = function(){
		var undo_data=this.undo_data;
		var layer = undo_data.layer;
		Hdrpaint.removeLayer(layer);
		return;
	}
	ret.prototype.func=function(){
		var param = this.param;
		var src_layer= param.src_layer;
		var n= param.position;

		var layer;
		if(!this.undo_data){
			layer = Layer.createModifier(param.modifier);
			Vec2.set(layer.size,param.width,param.height);

			this.undo_data={"layer":layer};
		}else{
			layer = this.undo_data.layer;
		}
		var parentLayer = Layer.findById(param.parent_layer_id);

		parentLayer.append(n,layer);
		Layer.select(layer);

		return layer;
	}

	return ret;
})();
