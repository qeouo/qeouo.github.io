
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
	for(var li=layers.length;li--;){
		Command.deleteLayer({param:{"layer_id":layers[li].id}});
	}

	var doc_data = JSON.parse(Util.utf8ToString(doc_file.data));

	//情報セット
	Command.onlyExecute("resizeCanvas",{"width":doc_data.canvas_width,"height":doc_data.canvas_height});
	var keys=Object.keys(doc_data);
	for(var ki=0;ki<keys.length;ki++){
		var id = keys[ki];
		var input = inputs[id];
		if(!input){
			continue;
		}
		input.value = doc_data[id];
	}

	

	for(var li=0;li<doc_data.layers.length;li++){
		//レイヤ画像読み込み
		var doc_layer=doc_data.layers[li];
		var img_file_name = doc_data.layers[li].id + ".exr";
		var img_file = files.find(function(f){return f.name===img_file_name;});
		var img = Img.loadExr(img_file.data);

		var layer =createLayer(img);
		appendLayer(li,layer);

		//レイヤパラメータ設定
		var keys=Object.keys(doc_layer);
		for(var ki=0;ki<keys.length;ki++){
			if(keys[ki]==="id"){
				continue;
			}
			if(typeof layer[keys[ki]] ==="number"){
				layer[keys[ki]]=parseFloat(doc_layer[keys[ki]]);
			}else{
				layer[keys[ki]]=doc_layer[keys[ki]];
			}
		}
		refreshLayer(layer);
		selectLayer(layer);
	}

	enableRefresh();


	refreshMain();
	refreshLayer(layer);
	refreshToolTab();
	createRGBA();
	

	Log.reset();

}
var saveHpd= function(e){
	//ドキュメントファイル保存
	var files=[];
	var doc_data={};

	doc_data.layers=[];

	for(var li=0;li<layers.length;li++){
		//レイヤをopneExrファイル化
		var layer = layers[li];
		var file={};
		files.push(file);
		file.data= new Uint8Array(layer.img.createExr());
		file.name = layer.id+".exr";

		//レイヤ情報収集
		var layer2={};
		var keys=Object.keys(layer);
		for(var ki=0;ki<keys.length;ki++){
			layer2[keys[ki]]=layer[keys[ki]];
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
	}

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
	var buffer = joined_img.createExr();
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
