
Command["resizeCanvas"] = (function(){
	return function(log,undo_flg){
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

		root_layer.width=width;
		root_layer.height=height;
		root_layer.img=new Img(width,height);

		Vec2.set(root_layer.size,width,height);

		inputs["canvas_width"].value = root_layer.img.width;
		inputs["canvas_height"].value = root_layer.img.height;

		root_layer.composite();
	}
})();
