//レイヤ結合
Command["composite"] = (function(){
	return function(log,undo_flg){
		//グループレイヤの子レイヤをすべて結合して通常レイヤにする

		var param = log.param;

		if(undo_flg){
			var undo_data=log.undo_data;
			var layer = undo_data.layer;
			layer.children = undo_data.children;
			layer.type=1;
			layer.refreshDiv();
			return;
		}
		var layer = Layer.findById(param.layer_id);

		//差分ログ作成
		if(!log.undo_data){
			log.undo_data={"layer":layer,"children":layer.children};
		}
		layer.type=0;
		layer.children=null;

		layer.refreshDiv();
	}
})();
