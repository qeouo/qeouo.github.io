var CommandLog = (function(){
	//ログ制御
	
	var CommandLog = function(){
		this.command="";
		this.param={};
		this.undo_data=null;
	}
	var ret = CommandLog;

	var log_id=0;

	ret.prototype.refreshLabel=function(){
		var log = this;
		//optionのテキストをセット
		var param_txt="";
		var param= log.param;
		var keys=Object.keys(param);
		for(var ki=0;ki<keys.length;ki++){
			var key = keys[ki];
			if(ki){
				param_txt+=",";
			}
			param_txt+=param[key];
		}
		var label="" + ("0000" + log.id).substr(-4) + "| " 
			+ log.command+"("+param_txt+")";
		Util.setText(this.option, label);
	}
	var command_logs=[];
	ret.command_logs = command_logs;
	var undo_max=10; //undo情報最大保持ステップ数
	var command_log_cursor=-1; //現在のログ位置(undo redoで移動する)

	ret.reset=function(){
		//コマンドログとヒストリをすべて削除
		log_id=0;

		var options = inputs["history"].options;
		for(var i=options.length;i--;){
			inputs["history"].removeChild(options[i]);
		}
		command_logs.length=0;
		command_log_cursor=-1;
	}

	ret.moveLog=function(n){
		//現在の処理を強制終了
		pen_log=null;
		if(pen_func){
			pen_func.end_flg=1;
			pen_func.pen_log.param.points.length=pen_func.idx;
			pen_func=null;
		}


		//指定された番号のコマンドログが実行された状態にする
		for(;command_log_cursor<n;){
			//リドゥ
			command_log_cursor++
			var log = command_logs[command_log_cursor];
			Command[log.command](log);
		}

		for(;command_log_cursor>n;){
			//アンドゥ
			var log = command_logs[command_log_cursor];
			if(!log.undo_data){
				break;
			}

			Command[log.command](log,true);

			var difs = log.undo_data.difs;
			if(difs){
				//画像戻す
				var param = log.param;
				var layer_id= param.layer_id;
				var layer = Layer.findById(layer_id);

				for(var di=difs.length;di--;){
					var dif = difs[di];
					Img.copy(layer.img,dif.x,dif.y,dif.img,0,0,dif.img.width,dif.img.height);
				}
				//Layer.bubble_func(layer,
				//	function(layer){
				//		refreshLayerThumbnail(layer);
				//	}
				//);
			}

			command_log_cursor--;
		}
		
		compositeAll();

	}

	ret.createLog=function(command,param,flg){
		//ログオブジェクトを作成する
		var log = null;

		if(command_log_cursor>=0 && !flg){
			var current_log=command_logs[command_log_cursor];
			if(command === current_log.command){
				if(command === "changeLayerAttribute"){
					if(current_log.param.layer_id === param.layer_id
					&& current_log.param.name === param.name){
						log = current_log;
					}
				}else if(command === "translateLayer"){
					if(current_log.param.layer_id === param.layer_id){
						log = current_log;
					}
				}else if(command === "moveLayer"){
					if(current_log.param.layer_id === param.layer_id){
						log = current_log;
					}
				}
			}
		}
		//カーソル以降のヒストリ削除
		command_logs.splice(command_log_cursor+1,command_logs.length-(command_log_cursor+1));
		if(!log){
			log=new CommandLog();
			log.id=log_id;
			log_id++;

			command_log_cursor++;
			command_logs.push(log);
		}

		log.command=command;
		
		if(param){
			log.param=param;
		}
		
		return log;
	}
	ret.appendOption=function(){
		//ヒストリ追加
		
		var options = inputs["history"].options;

		//現在のカーソル以降で一番小さいoptionを探す
		var option=null;
		var idx=options.length;
		for(;idx--;){
			if(options[idx].value<command_log_cursor){
				break;
			}
			option = options[idx];
		}
		idx++;

		for(var oi=options.length-1;oi>idx;oi--){
			//カーソル以降のoptionを1こ残して削除
			inputs["history"].removeChild(options[oi]);
		}


		if(!option){
			//optionがない場合は新規追加
			option = document.createElement("option");
			inputs["history"].appendChild(option);
		}

		var log = command_logs[command_log_cursor];
		option.value = command_log_cursor;

		log.option = option;
		log.refreshLabel();
//		var label="" + ("0000" + log.id).substr(-4) + "| " 
//			+ log.command+"("+param_txt+")";
//		Util.setText(option, label);

		//選択状態にする
		inputs["history"].selectedIndex=options.length-1;
		
		if(options.length>undo_max){
			//アンドゥ制限超えた部分を無効化
			var old_option = options[options.length-undo_max-1];
			var old_log = command_logs[old_option.value];
			old_option.setAttribute("disabled","disabled");
			old_log.undo_data=null;
		}

		if(options.length>10){
			inputs["history"].removeChild(options[0]);
		}

		return option;

	}

	return ret;
})();
