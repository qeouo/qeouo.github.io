
var History = (function(){
	var History = function(){};
	var ret = History;

	var log_id=0;

Log=function(){
	this.command="";
	this.param={};
	this.undo_data=null;
	
}
var logs=[];
var undo_max=10;
var history_cursor=-1;
var enable_log=false;

ret.disableLog=function(){
	enable_log=false;
}
ret.enableLog=function(){
	enable_log=true;
}
ret.isEnableLog=function(){
	return enable_log;
}

ret.rest=function(target){
	if(history_cursor<target){
		for(;target > history_cursor;){
			History.redo();
		}
	}
	if(history_cursor>target){
		for(;target < history_cursor;){
			if(History.undo()){
				break;
			}
		}
	}
}
ret.getCurrent=function(){
	if(history_cursor>=0){
		return logs[history_cursor];
	}else{
		return null;
	};
}
ret.redo=function(){
	if(history_cursor>=logs.length-1){
		//最新状態の場合は無効
		return;
	}
	History.disableLog();
	
	history_cursor++;

	var log = logs[history_cursor];

	var param = log.param;
	var layer_id= param.layer_id;
	var layer = layers.find(function(a){return a.id===layer_id;});
	switch(log.command){
	case "fill":
		Command.fill(layer,param.x,param.y,param.color,param.is_layer);
		break;
	case "pen":
		Command.pen(layer,param.points,param.weight,param.color,layer.mask_alpha,param.pressure_mask);
		break;
	case "moveLayer":
		Command.moveLayer(layer,log.param.position);
		break;
	case "createNewLayer":
		Command.createNewLayer(param.width,param.height,param.position);
		break;
	case "loadImageFile":
		Command.loadImageFile(log.undo_data.file,param.position);
		break;
	case "deleteLayer":
		Command.deleteLayer(layer);
		break;
	case "changeLayerAttribute":
		Command.changeLayerAttribute(layer,param.name,param.value);
		break;
	case "translateLayer":
		Command.translateLayer(layer,param.x,param.y);
		break;
	case "resizeCanvas":
		Command.resizeCanvas(param.width,param.height);
		break;
	case "resizeLayer":
		Command.resizeLayer(layer,param.width,param.height);
		break;
	}

	inputs["history"].selectedIndex=history_cursor;

	History.enableLog();
}
ret.undo=function(){
	if(history_cursor<0){
		//最古の場合は無効
		return true;
	}
	if(!logs[history_cursor].undo_data){
		//アンドゥ情報が無い場合は無効
		return true;
	}
	History.disableLog();

	var log = logs[history_cursor];
	var undo_data = log.undo_data;

	var param = log.param;
	var layer_id= param.layer_id;
	var layer = layers.find(function(a){return a.id===layer_id;});

	switch(log.command){
	case "createNewLayer":
	case "loadImageFile":
		var idx = layers.indexOf(layer);
		layers.splice(idx,1);
		layer.div.remove();
		layer.div.classList.remove("active_layer");
		
		layer_id_count--;
		if(selected_layer===layer){
			if(idx>0)idx-=1;
			if(layers.length>0){
				selectLayer(layers[idx]);
			}else{
				selectLayer(null);
			}
				
		}
		refreshMain();

		break;
	case "deleteLayer":
		var layer = undo_data.layer;
		var idx = log.param.idx;

		layers.splice(idx,0,layer);

		var layers_container = document.getElementById("layers_container");
		for(var li=layers.length;li--;){
			layers_container.appendChild(layers[li].div);
		}
		refreshMain();
		break;
	case "moveLayer":
		Command.moveLayer(layer,log.undo_data.before);
		break;
	case "changeLayerAttribute":
		Command.changeLayerAttribute(layer,log.param.name,undo_data.before);
		break;
	case "translateLayer":
		Command.translateLayer(layer,-log.param.x,-log.param.y);
		break;
	case "resizeCanvas":
		Command.resizeCanvas(undo_data.width,undo_data.height);
		break;
	case "resizeLayer":
		Command.resizeLayer(layer,undo_data.width,undo_data.height);
		break;
	default:
		break;
	}
	var difs = undo_data.difs;
	if(difs){

		for(var di=difs.length;di--;){
			var dif = difs[di];
			copyImg(layer.img,dif.x,dif.y,dif.img,0,0,dif.img.width,dif.img.height);
		}
		refreshMain();
		refreshLayerThumbnail(layer);
	}
		
	history_cursor--;

	inputs["history"].selectedIndex=history_cursor;

	History.enableLog();

	return false;
}

ret.createLog=function(command,param,label,undo_data){
	if(!enable_log){
		return null;
	}
	var log = null;
	if(history_cursor>=0){
		var current_log=logs[history_cursor];
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
	if(!log){
		//ログ情報を作成しヒストリーに追加
		log=new Log();
		log.id=log_id;
		log_id++;
		log.option=document.createElement("option");
		history_cursor++;
		log.command=command;
	}
	if(param){
		log.param=param;
	}
	if(undo_data){
		log.undo_data = undo_data;
	}
	
	if( typeof label === 'undefined'){
		label = command+"{"+param+"}";
	}
	log.label="[" + ("0000" + log.id).substr(-4) + "]" + label;
	Util.setText(log.option, log.label);


	//カーソル以降のヒストリ削除
	var m = logs.length - (history_cursor );
	for(var hi=history_cursor;hi<logs.length;hi++){
		//logs.pop();
		inputs["history"].removeChild(logs[hi].option);
	}
	logs.splice(history_cursor,logs.length-(history_cursor));


	//ヒストリ追加
	logs.push(log);
	inputs["history"].appendChild(log.option);
	inputs["history"].selectedIndex=history_cursor;


	if(history_cursor>undo_max){
		//アンドゥ制限超えた部分を無効化
		logs[history_cursor-undo_max-1].option.setAttribute("disabled","disabled");
		logs[history_cursor-undo_max].undo_data=null;
	}
	return log;
}
ret.deleteLog=function(){
	for(var hi=0;hi<history_cursor+1;hi++){

		logs[hi].undo_data=null;
		//inputs["history"].removeChild(logs[hi].option);
	}
	//logs.splice(0,history_cursor+1);
	//history_cursor=-1;
	
}
	return ret;
})();
