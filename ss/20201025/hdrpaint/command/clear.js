
Command["clear"] = (function(){
	return function(log,undo_flg){
		//全クリア
		if(undo_flg){
			return;
		}

		var param = log.param;
		var layer = Layer.findById(param.layer_id);
		if(!log.undo_data){
			log.undo_data={};
			var layer_img= layer.img;
			var dif=Hdrpaint.createDif(layer,0,0,layer_img.width,layer_img.height);
			layer.img=layer_img;
			log.undo_data.difs=[];
			log.undo_data.difs.push(dif);
		}
		//layer.img.clear();
		layer.img.data.fill(0);
		layer.refreshImg();
	}
})();
