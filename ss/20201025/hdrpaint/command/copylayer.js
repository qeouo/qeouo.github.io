commandObjs["copylayer"] = (function(){
	var CopyLayer= function(){
		CommandBase.apply(this);
	}
	var ret = CopyLayer;
	inherits(ret,CommandBase);

	ret.prototype.name ="copylayer";

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
			var src_layer = Layer.findById(param.src_layer_id);
			var img = new Img(src_layer.size[0],src_layer.size[1]);
			Img.copy(img,0,0,src_layer.img,0,0,img.width,img.height);

			layer =Layer.create(img,0);

			var keys=Object.keys(layer);
			for(var i=0;i<keys.length;i++){
				var key = keys[i];
				if(["id","div","img","children"].indexOf(key)>=0)continue;
				if(layer[key] instanceof Vec2){
					Vec2.copy(layer[key],src_layer[key]);
				}
				layer[key] = src_layer[key];
			}

			layer.refreshDiv();
			this.undo_data={"layer":layer};
		}else{
			layer = this.undo_data.layer;
		}
		var parentLayer = Layer.findById(param.parent);

		parentLayer.append(n,layer);
		Layer.select(layer);

		return layer;
	}

	return ret;
})();
