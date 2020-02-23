
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
	
	selected_layer=-1;
	for(var li=0;li<layers.length;li++){
	  var layer=layers[li];
	  if(target_layer === layer){
		//パラメータ変更による再描画を一時的に無効にする
		refreshoff=true;

	  	selected_layer=layer;
	var layer_inputs = Array.prototype.slice.call(document.getElementById("layer_param").getElementsByTagName("input"));
	layer_inputs = layer_inputs.concat(Array.prototype.slice.call(document.getElementById("layer_param").getElementsByTagName("select")));
		for(var i=0;i<layer_inputs.length;i++){
			var input = layer_inputs[i];
			var member = input.id.replace("layer_","");
			if(member in layer){
	  			if(input.getAttribute("type")==="checkbox"){
	  				input.checked=layer[member];
				}else{
					input.value=layer[member];
				}
				Util.fireEvent(input,"input");
	   		}
		}

		layer.div.classList.add("active_layer");
		refreshoff=false;
	  }else{
		layer.div.classList.remove("active_layer");
	  }
	}

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
// console.log(drop);
//
// drop = getLayerNum(event.currentTarget);
// var layers_container = document.getElementById("layers_container");
// layers_container.insertBefore(drag_div,event.currentTarget);
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


	Command.moveLayer(layer,drop);
}
function dragend(event) {
}

Command.moveLayer=function(layer,position){
	var layer_num = layers.indexOf(layer);
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
	
	History.createLog("moveLayer",{"layer_id":layer.id,"position":position},"moveLayer(id:"+layer.id+"("+layer.name+"), "+position+")",{"before":layer_num});


	refreshMain(0);
}

	Command.createNewLayer=function(width,height,n){
		var img = new Img(width,height);
		
		var layer =createLayer(img,n);
		History.createLog("createNewLayer",{"layer_id":layer.id,"position":n,"width":width,"height":height},"createNewLayer ⇒ id:"+layer.id+"("+layer.name+")",{});
	refreshMain(0);
		return layer;

	}
	var createLayer=function(img,idx){
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


		if(!selected_layer){
			Util.fireEvent(layer_div,"click");
		}

		layers.splice(idx,0,layer);

		var layers_container = document.getElementById("layers_container");
		for(var li=layers.length;li--;){
			layers_container.appendChild(layers[li].div);
		}



		layer.id=layer_id_count;
		layer_id_count++;
		layer.name ="layer"+("0000"+layer.id).slice(-4);

		if(img){
			refreshLayerThumbnail(layer);
		}
		refreshLayer(layer);

		selectLayer(layer);
		return layer;

	}

 //レイヤ削除
Command.deleteLayer=function(layer){
	var li=layers.indexOf(layer);
	 if(li<0){
		 return;
	 }
	 

	layers.splice(li,1);
	layer.div.parentNode.removeChild(layer.div);
	layer.div.classList.remove("active_layer");

	History.createLog("deleteLayer",{"layer_id":layer.id,"idx":li},"deleteLayer ⇒ id:"+layer.id+"("+layer.name+")",{"layer":layer});

	if(layer === selected_layer){
		li = Math.max(li-1,0);
		if(layers.length){
			selectLayer(layers[li]);
		}
	}else{
		selected_layer = null;
	}
	refreshMain();
}

Command.changeLayerAttribute=function(layer,name,value){
	//var flg = true;
	//if(History.isEnableLog()){
	//	var log =History.getCurrent();
	//	if(log){
	//		if(log.param.layer_id === layer.id
	//			&& log.param.name === name){
	//			log.param.after = value;
	//			log.label = "layer"+layer.id + "."+name + "=" + value;
	//			log.label="[" + ("0000" + log.id).slice(-4) + "]" + log.label;
	//			Util.setText(log.option, log.label);
	//			flg = false;
	//		}
	//	}
	//}

	//if(flg){
		History.createLog("changeLayerAttribute",{"layer_id":layer.id,"name":name,"value":value},"layer"+layer.id + "."+name + "=" + value,{"before":layer[name]});
	//}
	layer[name] = value;

	refreshLayer(layer);
	refreshMain(0);

}
