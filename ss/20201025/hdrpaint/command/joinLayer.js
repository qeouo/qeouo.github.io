commandObjs["joinLayer"] = (function(){
	var JoinLayer= function(){
		CommandBase.apply(this);
		this.name ="joinLayer";
	}
	var ret = JoinLayer;
	inherits(ret,CommandBase);

	ret.prototype.undo = function(){
		var undo_data=this.undo_data;
		var layer = undo_data.layer;
		var parent_layer = layer.parent;
		parent_layer.append(undo_data.position,undo_data.layerA);
		parent_layer.append(undo_data.positionB,undo_data.layerB);
		Hdrpaint.removeLayer(layer);
		return;
	}
	ret.prototype.func=function(){
		var param = this.param;
		var layer;
		var layerA = Layer.findById(param.layer_id);
		var layerB = Layer.findById(param.layer_id2);
		var parent_layer = layerA.parent;
		var layers = parent_layer.children;
		var ls=[layerA,layerB];

		if(!this.undo_data){

			//２つのレイヤが収まるサイズのグループレイヤを作成
			var x=Math.min(layerA.position[0] ,layerB.position[0]);
			var y=Math.min(layerA.position[1] ,layerB.position[1]);
			var right = Math.max(layerA.position[0]+layerA.size[0],layerB.position[0]+layerB.size[0]);
			var bottom = Math.max(layerA.position[1]+layerA.size[1],layerB.position[1]+layerB.size[1]);
			var width  = right-x;
			var height= bottom-y;
			var position = layers.indexOf(layerA);
			var position2 = layers.indexOf(layerB);
			var img = new Img(width,height);
			layer =Layer.create(img,1);
			layer.position[0]=x;
			layer.position[1]=y;
			layer.name=layerA.name + "," + layerB.name;

			//２つのレイヤを子レイヤとしてセット
			layer.append(0,layerA);
			layer.append(1,layerB);
			Vec2.sub(layerB.position,layerB.position,layer.position);
			Vec2.sub(layerA.position,layerA.position,layer.position);

			//結合
			layer.composite();
			layer.type=0;
			layer.children=[];

			Vec2.add(layerB.position,layerB.position,layer.position);
			Vec2.add(layerA.position,layerA.position,layer.position);

			layer.refreshDiv();
			this.undo_data={"layerA":layerA,"position":position,"layerB":layerB,"positionB":position2,"layer":layer};
		}else{
			layer = this.undo_data.layer;
		}


		//結合元レイヤを削除
		for(var li=0;li<ls.length;li++){
			var n=layers.indexOf(ls[li]);
			layers.splice(n,1);
		}

		//結合したレイヤを挿入
		parent_layer.append(n,layer);
		layer.select();
	}

	return ret;
})();
