

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
		delete layer2.parent;
		delete layer2.div;
		delete layer2.aaadiv;

		doc_data.layers.push(layer2);
	}
	//ブラシ情報セット
	doc_data.brushes =[];
	for(var bi=0;bi<brushes.length;bi++){
		var brush = brushes[bi];
		var brush2 = {};

		//情報収集
		var keys=Object.keys(brush);
		for(var ki=0;ki<keys.length;ki++){
			brush2[keys[ki]]=brush[keys[ki]];
		}
		//不要なデータを削除
		delete brush2.div;

		doc_data.brushes.push(brush2);
	}

	//その他情報をセット
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
	doc_data.layer_id_count = Layer.layer_id_count;

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

var setParam = function(dst,src){
	var keys=Object.keys(src);
	for(var ki=0;ki<keys.length;ki++){
		var key = keys[ki];
		if(typeof dst[key] ==="number"){
			dst[key]=Number(src[key]);
		}else{
			dst[key]=src[key];
		}
	}
}
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
	Layer.layer_id_count = doc_data.layer_id_count;

	
	brushes=[];
	for(var bi=0;bi<doc_data.brushes.length;bi++){
		//ブラシ読み込み
		var doc_brush=doc_data.brushes[bi];
		var brush=Brush.create();
		brushes.push(brush);

		//パラメータ設定
		var id = brush.id;
		setParam(brush,doc_brush);
		brush.id=id;
		
		brush.refresh();
	}
	Brush.refreshBrush();

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

		var layer =Layer.create(img,parseInt(doc_layer.type));
		layers.push(layer);

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
			layer.append(ki,child);
			//layer.children[ki]=layers.find(
		}
	}
	enableRefresh();


	compositeAll();
	refreshTab("tools");
	root_layer.children[root_layer.children.length-1].select();
	
	//refreshTab("color_selector_tab");
	//createRGBA();
	changeColor(null);
	
	CommandLog.reset();

	if(brushes.length>0){
		brushes[0].select();
	}
}
var addBrush = function(buffer){
	var files=Zip.read(buffer);
	var doc_file = files.find(function(f){return f.name==="doc.txt";});
	if(!doc_file){
		return;
	}
	var doc_data = JSON.parse(Util.utf8ToString(doc_file.data));

	for(var bi=0;bi<doc_data.brushes.length;bi++){
		//ブラシ読み込み
		var doc_brush=doc_data.brushes[bi];
		var brush=Brush.create();
		brushes.push(brush);

		//パラメータ設定
		var id = brush.id;
		setParam(brush,doc_brush);
		brush.id=id;
		
		brush.refresh();
	}
	Brush.refreshBrush();
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
