
Util.loadJs("../lib/deflate.js");
var OpenEXR=(function(){
	var OpenEXR=function(){};
	var ret=OpenEXR;

	ret.fromArrayBuffer = function(obj,arrayBuffer){
		var dv = new DataStream(arrayBuffer);
		

		//Magic Number
		var c=dv.getUint32(true);
		if(c !== 20000630){
			alert("exrファイルのマジックナンバーと違う");
			return;
		}

		//Version Field
		c=dv.getUint16(true);
		//if(c !== 2){
		//	alert("SIngle-part scan line 以外は対応してません");
		//	return;
		//}
		var cc = dv.getUint16(true);
		//dv.idx+=2<<3;

		//header
		var attributes=[];
		
		while(1){
			var attribute_name = dv.readTextBuf();

			if(attribute_name ===""){
				//空文字ならヘッダー終了
				break;
			}

			var attribute_type= dv.readTextBuf();
			var value=null;

			var attribute_size=dv.getUint32(true);
			var idxOld=dv.idx;

			if(attribute_type==="box2i"){
				value={};
				value.xMin=dv.getInt32(true); 
				value.yMin=dv.getInt32(true); 
				value.xMax=dv.getInt32(true); 
				value.yMax=dv.getInt32(true); 
			}else if(attribute_type==="box2f"){
				value={};
				value.xMin=dv.getFloat32(true);
				value.yMin=dv.getFloat32(true);
				value.xMax=dv.getFloat32(true);
				value.yMax=dv.getFloat32(true);
			}else if(attribute_type==="chlist"){
				value=[];
				while(1){
					var ch=[];
					ch.name = dv.readTextBuf();
					if(ch.name===""){
						break;
					}
					ch.pixel_type=dv.getInt32(true);
					ch.pLinear = dv.getUint8(true);
					ch.reserved= dv.getUint8(true);
					dv.idx+=2<<3;
					ch.xSampling = dv.getInt32(true);
					ch.ySampling = dv.getInt32(true);
					value.push(ch);
				}
			}else if(attribute_type==="compression"){
				value = dv.getUint8(true);
			}else if(attribute_type==="double"){
				value = dv.getFloat64(true);
			}else if(attribute_type==="float"){
				value = dv.getFloat32(true);
			}else if(attribute_type==="int"){
				value = dv.getInt32(true);
			}else if(attribute_type==="lineOrder"){
				value = dv.getUint8(true);
			}else if(attribute_type==="string"){
				value ="";
				for(var i=0;i<attribute_size;i++){
					value+=String.fromCharCode(dv.getUint8(true));
				}
	//			idx+=value.length+1;
			}else if(attribute_type==="v2i"){
				value=[];
				value.push(dv.getInt32(true));
				value.push(dv.getInt32(true));
			}else if(attribute_type==="v2f"){
				value=[];
				value.push(dv.getFloat32(true));
				value.push(dv.getFloat32(true));
			}
			attributes[attribute_name] = value;
			dv.idx = idxOld + (attribute_size<<3);
		}

		//データ部
		var channels = attributes.channels;
		obj.width=attributes.dataWindow.xMax -attributes.dataWindow.xMin+1;
		obj.height=attributes.dataWindow.yMax -attributes.dataWindow.yMin+1;
		var datasize=obj.width*obj.height;
		//メモリ確保
		for(var i=0;i<channels.length;i++){
			var channel = channels[i];
			if(channel.pixel_type===0){
				channel.data=new Uint8Array(datasize);
			}if(channel.pixel_type===1){
				channel.data=new Float32Array(datasize);
			}if(channel.pixel_type===2){
				channel.data=new Float32Array(datasize);
			}
		}
		//ライン読み込み
		for(var i=0;i<obj.height;i++){
			var offset = dv.getUint64(true);
			console.log(offset);
			var oldIdx= dv.idx;


			dv.idx=offset<<3;
			var y = dv.getUint32(true);
			var pixel_data_size = dv.getUint32(true);


			var linedata;
			var linemax=1;
			if(attributes.compression===0){
				linedata = new DataStream(dv.dv.buffer,(dv.idx>>3),pixel_data_size);

				var aa=1,bb=0;
				for(var ai=0;ai<linedata.byteBuffer.length;ai++){
					aa+=linedata.byteBuffer[ai];
					bb+=aa;
				}
				aa %= 65521;
				bb %= 65521;
				linemax=1;

			} if(attributes.compression===2){
				var data = Deflate.expand(dv.dv.buffer,(dv.idx>>3)+2,pixel_data_size-2);
				var aa=1,bb=0;
				for(var ai=0;ai<data.length;ai++){
					aa+=data[ai];
					bb+=aa;
				}
				aa %= 65521;
				bb %= 65521;


				linemax=1;
			} if(attributes.compression===3){
				var data = Deflate.expand(dv.dv.buffer,(dv.idx>>3)+2,pixel_data_size-2);
				linedata = new DataStream(data);
				linemax=16;
				if(y+linemax>=obj.height){
					linemax=obj.height-y;
				}
			}

			if(attributes.compression===3 || attributes.compression===2  ){
				var data2=new Array(data.length);
				for(var di=1;di<data.length;di++){
					data[di]=(data[di-1]+128+data[di])&0xff;
				}
				for(var di=0;di<(data.length>>1);di++){
					data2[(di<<1)]=data[di];
					data2[(di<<1)+1]=data[di+(data.length>>1)];
				}

				linedata = new DataStream(data2);
			}
			for(var line=0;line<linemax;line++){
				for(var ci=0;ci<channels.length;ci++){
					var channel = channels[ci];
					var data = channel.data;
					var didx = (y+line) * obj.width;
					if(channel.pixel_type== 0){
						for(var xi=0;xi<obj.width;xi++){
							channel.data[didx + xi] = linedata.getUint8(true);
						}
					}else if(channel.pixel_type== 1){
						for(var xi=0;xi<obj.width;xi++){
							channel.data[didx + xi] = linedata.readFloat16(true);
						}
					}else if(channel.pixel_type== 2){
						for(var xi=0;xi<obj.width;xi++){
							channel.data[didx + xi] = linedata.getFloat32(true);
						}
					}
				}
			}
			dv.idx=oldIdx;
			i+=linemax-1;


		}
		obj.attributes = attributes;

	}
	return ret;
})();
