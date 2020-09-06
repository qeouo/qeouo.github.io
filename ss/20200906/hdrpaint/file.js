
var loadHpd=function(buffer){

	var fu =function(img){
		
		refreshLayerThumbnail(layer);
		refreshLayer(layer);
		refreshMain(0);

	}
	var files=Zip.read(buffer);

	var doc_file = files.find(function(f){return f.name==="doc.txt";});
	if(!doc_file){
		return;
	}

	disableRefresh();
//	for(var li=layers.length;li--;){
//		Command.deleteLayer({param:{"layer_id":layers[li].id}});
//	}
	if(root_layer){
		Command.deleteLayer({param:{"layer_id":root_layer.id}});
	}

	var doc_data = JSON.parse(Util.utf8ToString(doc_file.data));

	//情報セット
	var keys=Object.keys(doc_data);
	for(var ki=0;ki<keys.length;ki++){
		var id = keys[ki];
		var input = inputs[id];
		if(!input){
			continue;
		}
		input.value = doc_data[id];
		if(input.type==="checkbox" && input.value==="1"){
			input.checked = true;
		}
	}
	layer_id_count = doc_data.layer_id_count;

	

	var layers=[];
	for(var li=0;li<doc_data.layers.length;li++){
		//レイヤ画像読み込み
		var doc_layer=doc_data.layers[li];
		var img_file_name = doc_data.layers[li].id + ".exr";
		var img_file = files.find(function(f){return f.name===img_file_name;});
		var img ;
		if(doc_layer.type){
			img = new Img(doc_layer.width,doc_layer.height);
		}else{
			img = Img.loadExr(img_file.data);
		}

		var layer =createLayer(img,parseInt(doc_layer.type));
		layers.push(layer);
		//appendLayer(li,layer);

		//レイヤパラメータ設定
		var keys=Object.keys(doc_layer);
		for(var ki=0;ki<keys.length;ki++){
			if(typeof layer[keys[ki]] ==="number"){
				layer[keys[ki]]=parseFloat(doc_layer[keys[ki]]);
			}else{
				layer[keys[ki]]=doc_layer[keys[ki]];
			}
		}
		
	}
	root_layer=layers[0];
	Command.onlyExecute("resizeCanvas",{"width":root_layer.img.width,"height":root_layer.img.height});
	for(var li=0;li<layers.length;li++){
		//レイヤ親子復元
		var layer = layers[li];
		var doc_layer=doc_data.layers[li];
		layer.children=[];
		for(var ki=0;ki<doc_layer.children.length;ki++){
			var child_id = doc_layer.children[ki];
			var child = layers.find(
				function(a){return a.id===child_id;});
			appendLayer(layer,ki,child);
			//layer.children[ki]=layers.find(
		}

		layer.refresh();
	}
	//selectLayer(layer);


	enableRefresh();


	refreshMain();
	refreshTab("tools");
	selectLayer(root_layer.children[root_layer.children.length-1]);
	
	//refreshTab("color_selector_tab");
	//createRGBA();
	changeColor(null);
	

	Log.reset();

}
var saveHpd= function(e){
	//ドキュメントファイル保存
	var files=[];
	var doc_data={};

	var layers = Layer.layerArray();
	doc_data.layers=[];

	for(var li=0;li<layers.length;li++){
		var layer = layers[li];
		var layer2={};

		//レイヤをopneExrファイル化
		if(layer.type===0){
			var file={};
			files.push(file);
			file.data= new Uint8Array(layer.img.createExr(3));
			file.name = layer.id+".exr";
		}else{
			layer2.width=layer.img.width;
			layer2.height=layer.img.height;

		}

		//レイヤ情報収集
		var keys=Object.keys(layer);
		for(var ki=0;ki<keys.length;ki++){
			layer2[keys[ki]]=layer[keys[ki]];
		}
		//親子関係をid化
		layer2.children=[];
		for(var ki=0;ki<layer.children.length;ki++){
			layer2.children.push(layer.children[ki].id);
		}
		//不要なデータを削除
		delete layer2.img;
		delete layer2.div;
		delete layer2.aaadiv;

		doc_data.layers.push(layer2);
	}
	//レイヤ以外の情報をセット
	doc_data.canvas_width = preview.width;
	doc_data.canvas_height= preview.height;
	var keys=Object.keys(inputs);
	for(var i=0;i<keys.length;i++){
		var id = keys[i]
		var input = inputs[id];
		doc_data[id] = input.value;
		if(input.type==="checkbox"){
			if(input.checked){
				doc_data[id] =1;
			}else{
				doc_data[id] =0;
			}
		}
	}
	doc_data.layer_id_count = layer_id_count;

	//ドキュメント情報をdoc.txtとして書き込む
	var file = {}
	file.data = Util.stringToUtf8(JSON.stringify(doc_data));
	file.name="doc.txt"
	files.push(file);

	//doc.txtと画像ファイルを無圧縮zipにする
	var buffer = Zip.create(files);
    var blob = new Blob([buffer], {type: "application/octet-stream"});

	var a = e.target;
    a.href =  window.URL.createObjectURL(blob);
    a.target = '_blank';
    a.download = "project.hpd";
}

var saveHdr= function(e){
	var a = e.target;
	var buffer = root_layer.img.createExr(2);
    var blob = new Blob([buffer], {type: "application/octet-stream"});

    a.href =  window.URL.createObjectURL(blob);
    a.target = '_blank';
    a.download = "preview_hdr.exr";
}
var saveLdr= function(e){
	var a = e.target;

    a.href = preview.toDataURL("image/png");
    a.target = '_blank';
    a.download = "preview_ldr.png";
}
