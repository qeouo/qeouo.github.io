
var Layer=(function(){
//レイヤ
	var Layer = function(){
		this.name="";
		this.display = true;
		this.power=0.0;
		this.alpha=1.0;
		this.blendfunc="normal";
		this.div=null;
		this.img=null;
		this.mask_alpha=0;
		this.position =new Vec2();
	};
	var ret = Layer;
	return ret;
})();

var thumbnail_ctx,thumbnail_canvas;
var layers=[];
var selected_layer = null;
var layers_container;
var layer_id_count=0;

var getLayerNum=function(div){
	//divからレイヤー番号取得
	return layers.findIndex(function(l){return l.div===div;});
}


var selectLayer=function(target_layer){
	//アクティブレイヤ変更
	
	selected_layer=target_layer;
	for(var li=0;li<layers.length;li++){
		var layer=layers[li];
		if(target_layer !== layer){
			//アクティブレイヤ以外の表示を非アクティブにする
			layer.div.classList.remove("active_layer");
		}else{
			layer.div.classList.add("active_layer");
		}
	}

	refreshActiveLayerParam();

}
var layerSelect= function(e){
//レイヤー一覧クリック時、クリックされたものをアクティブ化する

	var num=getLayerNum(e.currentTarget);

	selectLayer(layers[num]);

}

var drag_div=null;
function DragStart(event) {
	var num = getLayerNum(event.currentTarget);
	if(num<0)return;
     event.dataTransfer.setData("text", num);
	//var layers_container = document.getElementById("layers_container");
	//layers_container.removeChild(event.currentTarget);
	 drag_div=event.currentTarget;
	 selectLayer(layers[num]);
}
function dragover_handler(event) {
 event.preventDefault();
 event.dataTransfer.dropEffect = "move";
}	
function Drop(event) {
    var drag = parseInt(event.dataTransfer.getData("text"));
	var drag_div = layers[drag].div;
	//if(drag_div === event.currentTarget){
	//	return;
	//}
	var layer=layers[drag];
	//layers.splice(drag,1);
	var drop = getLayerNum(event.currentTarget);
	//var drop_div = layers[drop].div;

	var layers_container = document.getElementById("layers_container");

	var drop;
	if(event.offsetY<32){
		drop++;
	}
	if(drop>drag){
		drop--;
	}


	Command.executeCommand("moveLayer",{"layer_id":layer.id,"position":drop});
}
function dragend(event) {
}

Command.moveLayer=function(log,undo_flg){

	var param = log.param;
	var layer = layers.find(function(a){return a.id===param.layer_id;});
	var position = param.position;
	var layer_num = layers.indexOf(layer);

	if(undo_flg){
		position = log.undo_data.before;
	}
	
	if(position<0|| layers.length <= position){
		return;
	}	
	if(layer_num === position){
		return;
	}	

	layers.splice(layer_num,1);
	layers.splice(position,0,layer);

	var layers_container = document.getElementById("layers_container");

	layers_container.removeChild(layer.div);
	if(position===0){
		layers_container.insertBefore(layer.div,null);
	}else{
		layers_container.insertBefore(layer.div,layers_container.children[layers.length-1-position]);
	}
	


	refreshMain(0);

	if(!log.undo_data){
		log.undo_data = {"before":layer_num};
	}
}


var removeLayer=function(idx){
	var layer=layers[idx];
	layer.div.classList.remove("active_layer");
	layers[idx].div.parentNode.removeChild(layer.div);
	layers.splice(idx,1);
}
var appendLayer=function(idx,layer){
	layers.splice(idx,0,layer);

	var layers_container = document.getElementById("layers_container");
	for(var li=layers.length;li--;){
		layers_container.appendChild(layers[li].div);
	}
	refreshLayer(layer);
	refreshLayerThumbnail(layer);
	refreshMain();
}
var createLayer=function(img){
	if( typeof idx=== 'undefined'){
		idx=layers.length;
	}
	if(idx<0){
		idx=layers.length;
	}
	var layer_template= document.getElementById("layer_template");
	var layer = new Layer();
	var layer_div = layer_template.children[0].cloneNode(true);
	layer_div.addEventListener("click",layerSelect);
	layer.div=layer_div;

	layer.img=img;

	layer.id=layer_id_count;
	layer_id_count++;
	layer.name ="layer"+("0000"+layer.id).slice(-4);

	if(img){
		refreshLayerThumbnail(layer);
	}
	refreshLayer(layer);

	return layer;

}

