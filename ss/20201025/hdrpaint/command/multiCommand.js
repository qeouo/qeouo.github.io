//複数コマンドバッチ
Command["multiCommand"] = (function(){
	return function(_log,undo_flg){
		var logs = _log.param.logs
		if(undo_flg){
			for(var li=logs.length;li--;){
				var log = logs[li];
				Command[log.command](log,true);

				var difs = log.undo_data.difs;
				if(difs){
					//画像戻す
					var param = log.param;
					var layer_id= param.layer_id;
					var layer = Layer.findById(param.layer_id);

					for(var di=difs.length;di--;){
						var dif = difs[di];
						Img.copy(layer.img,dif.x,dif.y,dif.img,0,0,dif.img.width,dif.img.height);
					}
				}
			}
		}else{
			if(!_log.undo_data){
				_log.undo_data={};
			}
			for(var li=0;li<logs.length;li++){
				var log = logs[li];
				Command[log.command](log);
			}
		}

	}

})();
