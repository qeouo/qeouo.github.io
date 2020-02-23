
var load_hdw=function(buffer){

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

	History.disableLog();
	disableRefresh();
	for(var li=layers.length;li--;){
		Command.deleteLayer(layers[li]);
	}
	resizeCanvas(256,256);

	var doc_data = JSON.parse(Util.utf8ToString(doc_file.data));
	for(var li=0;li<doc_data.layers.length;li++){
		var doc_layer=doc_data.layers[li];
		var img_file_name = doc_data.layers[li].id + ".exr";
		var img_file = files.find(function(f){return f.name===img_file_name;});
		var img = Img.loadExr(img_file.data);

		if(img.width>preview.width || img.height>preview.height){
			//�J�����摜���L�����o�X���傫���ꍇ�͍L����
			preview.width=Math.max(img.width,preview.width);
			preview.height=Math.max(img.height,preview.height);
			resizeCanvas(preview.width,preview.height);
		}

		var layer =createLayer(img);

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
	}

	enableRefresh();
	History.enableLog();

	History.reset();
	History.createLog("loadDocumentFile",{},"loadDocumentFile",null);

	refreshMain(0);

}
var save_hpd= function(e){
	var files=[];
	var doc_data={};

	doc_data.layers=[];

	for(var li=0;li<layers.length;li++){
		//���C���摜��
		var layer = layers[li];
		var file={};
		files.push(file);
		file.data= new Uint8Array(layer.img.createExr());
		file.name = layer.id+".exr";

		//���C�������W
		var layer2={};
		var keys=Object.keys(layer);
		for(var ki=0;ki<keys.length;ki++){
			layer2[keys[ki]]=layer[keys[ki]];
		}
		delete layer2.img;
		delete layer2.div;
		delete layer2.aaadiv;
		doc_data.layers.push(layer2);
	}

	var file = {}
	file.data = Util.stringToUtf8(JSON.stringify(doc_data));
	file.name="doc.txt"
	files.push(file);

	var buffer = Zip.create(files);
    var blob = new Blob([buffer], {type: "application/octet-stream"});

	var a = e.target;
    a.href =  window.URL.createObjectURL(blob);
    a.target = '_blank';
    a.download = "project.hpd";
}

var save_hdr= function(e){
	var a = e.target;
	var buffer = joined_img.createExr();
    var blob = new Blob([buffer], {type: "application/octet-stream"});

    a.href =  window.URL.createObjectURL(blob);
    a.target = '_blank';
    a.download = "preview_hdr.exr";
}
var save_ldr= function(e){
	var a = e.target;

    a.href = preview.toDataURL("image/png");
    a.target = '_blank';
    a.download = "preview_ldr.png";
}
