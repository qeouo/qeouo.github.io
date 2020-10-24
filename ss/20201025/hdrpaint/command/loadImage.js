
commandObjs["loadImage"]= (function(){
	var LoadImage = function(){
		CommandBase.apply(this);
		this.name ="loadImage";
	}
	var ret = LoadImage;
	inherits(ret,CommandBase);

	ret.prototype.undo = function(){
		Hdrpaint.removeLayer(this.undo_data.layer);
		return;
	}
	ret.prototype.func=function(){
		var param = this.param;
		var n  = param.position;
		var img = this.param.img;
		var file  = param.file;
		var parent_layer = Layer.findById(param.parent_layer_id);

		var layer;
		if(!this.undo_data){
			param.img=null;
			layer=Layer.create(img);
			this.undo_data={"layer":layer};
		}else{
			layer = this.undo_data.layer;
		}
		parent_layer.append(param.position,layer);
		
		layer.select();
	}

	return ret;
})();
