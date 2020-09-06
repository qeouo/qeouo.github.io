
Util.loadJs("../lib/deflate.js");
var OpenEXR=(function(){
	var OpenEXR=function(){};
	var ret=OpenEXR;

	ret.toArrayBuffer = function(obj){
		
		var channels=obj.attributes.channels;
		var width = obj.attributes.dataWindow.xMax-obj.attributes.dataWindow.xMin+1;
		var height= obj.attributes.dataWindow.yMax-obj.attributes.dataWindow.yMin+1;
		var dv = new DataStream(height*(8+8+width*2*channels.length)+400);
		//Magic Number
		dv.setUint32(20000630,true);

		//Version Field
		dv.setUint16(2,true);
		dv.setUint16(0,true);

		//header
		var attributes=obj.attributes;
		
		var keys=Object.keys(attributes);
		for(var ai=0;ai<keys.length;ai++){
			var attribute_name = keys[ai];
			var attribute = attributes[attribute_name];
			dv.setTextBuf(attribute_name,true);

			var attribute_type="";
			var attribute_size_index=0;
			switch(attribute_name){
			case "channels":
				attribute_type="chlist";
				break;
			case "compression":
				attribute_type="compression";
				break;
			case "dataWindow":
			case "displayWindow":
				attribute_type="box2i";
				break;
			case "lineOrder":
				attribute_type="lineOrder";
				break;
			case "pixelAspectRatio":
				attribute_type="float";
				break;
			case "screenWindowCenter":
				attribute_type="v2f";
				break;
			case "screenWindowWidth":
				attribute_type="float";
				break;
			case "chromaticities":
				attribute_type="chromaticities";
				break;
			}

			dv.setTextBuf(attribute_type,true);
			attribute_size_index=dv.idx;
			dv.idx+=32;

			if(attribute_type==="box2i"){
				dv.setInt32(attribute.xMin,true); 
				dv.setInt32(attribute.yMin,true); 
				dv.setInt32(attribute.xMax,true); 
				dv.setInt32(attribute.yMax,true); 
			}else if(attribute_type==="box2f"){
				dv.setFloat32(attribute.xMin,true); 
				dv.setFloat32(attribute.yMin,true); 
				dv.setFloat32(attribute.xMax,true); 
				dv.setFloat32(attribute.yMax,true); 
			}else if(attribute_type==="chlist"){
				channels=attribute;
				for(var ci=0;ci<channels.length;ci++){
					var channel =channels[ci];
					dv.setTextBuf(channel.name,true);
					dv.setInt32(channel.pixel_type,true);//pixel type
					dv.setUint8(channel.pLiner,true);//pliner
					dv.setUint8(0,true);//reserved
					dv.setUint8(0,true);//reserved
					dv.setUint8(0,true);//reserved
					dv.setInt32(channel.xSampling,true);//xSampling
					dv.setInt32(channel.ySampling,true);//YSampling
				}
				dv.setTextBuf("",true);
			}else if(attribute_type==="compression"){
				dv.setUint8(attribute);
			}else if(attribute_type==="double"){
				dv.setFloat64(attribute,true);
			}else if(attribute_type==="float"){
				dv.setFloat32(attribute,true);
			}else if(attribute_type==="int"){
				dv.setInt32(attribute,true);
			}else if(attribute_type==="lineOrder"){
				dv.getUint8(0,true);
			}else if(attribute_type==="string"){
				dv.setTextBuf(attribute,true);
			}else if(attribute_type==="v2i"){
				dv.setInt32(attribute[0],true);
				dv.setInt32(attribute[1],true);
			}else if(attribute_type==="v2f"){
				dv.setFloat32(attribute[0],true);
				dv.setFloat32(attribute[1],true);
			}else if(attribute_type==="chromaticities"){
				for(var vi=0;vi<8;vi++){
					dv.setFloat32(attribute[vi],true);
				}
			}
			var a=dv.idx;
			dv.idx=attribute_size_index;
			dv.setUint32(((a-attribute_size_index)>>3)-4,true);
			dv.idx=a;
		}
		dv.setTextBuf("",true);

		var offset_scan_line_idx = dv.idx;
		dv.idx+=64*obj.height;
		var data_idx=dv.idx;
		var line_size=obj.width*2*channels.length;
		var linemax = 1;
		if(obj.attributes.compression===3){
			linemax=16;
		}
		var data_stream = new DataStream(new ArrayBuffer(line_size * linemax));
		for(var li=0;li<height;){
			data_idx=dv.idx;
			dv.idx=offset_scan_line_idx;
			dv.setUint64(data_idx>>3,true);
			offset_scan_line_idx=dv.idx;

			dv.idx=data_idx;
			dv.setUint32(li,true);

			data_stream.idx=0;

			var linemax_ = Math.min(linemax,height-li);
			for(var l=0;l<linemax_;l++){
				var idx = li*width;
				for(var ci=0;ci<channels.length;ci++){
					var channel_data =channels[ci].data;
					for(var xi=0;xi<width;xi++){
						data_stream.setFloat16(channel_data[idx+xi],true);
					}
				}	
				li++;
			}
			var data =new Uint8Array(data_stream.dv.buffer,0,linemax_*line_size);
			if(obj.attributes.compression){
				var offset = data.length>>1;
				var data2=new Uint8Array(data.length);
				for(var di=0;di<offset;di++){
					//上位バイトと下位バイトを分ける
					data2[di]=data[(di<<1)]
					data2[di+offset]=data[(di<<1)+1]
				}
				for(var di=data2.length-1;di>0;di--){
					//差分情報作成
					data2[di]=(data2[di]-data2[di-1]+128)&0xff;
				}

				data = Zlib.compress(data2,1);

			}
			dv.setUint32(data.length,true);
			dv.setBytes(data);
		}

		return dv.byteBuffer.buffer.slice(0,dv.idx>>3);

	}
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
			}else if(attribute_type==="chromaticities"){
				value=[];
				for(var vi=0;vi<8;vi++){
					value.push(dv.getFloat32(true));
				}
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
			var oldIdx= dv.idx;


			dv.idx=offset<<3;
			var y = dv.getUint32(true);
			var pixel_data_size = dv.getUint32(true);


			var linedata;
			var linemax=1;
			if(attributes.compression===0){
				linedata = new DataStream(dv.dv.buffer,(dv.idx>>3),pixel_data_size);

			} if(attributes.compression===2 || attributes.compression===3){
				//zip展開
				var data = Zlib.expand(dv.dv.buffer,dv.idx>>3,pixel_data_size);
			}
			if(attributes.compression===3){
				linemax = Math.min(obj.height-y,16);//compression=3のときは16行固定
			}

			if(attributes.compression===3 || attributes.compression===2  ){
				//zip圧縮されていた場合はデータが加工されているので復元
				var data2=new Uint8Array(data.length);
				for(var di=1;di<data.length;di++){
					//差分情報から実際の値を復元
					data[di]=(data[di-1]-128+data[di])&0xff;
				}
				var offset = data.length>>1;
				for(var di=0;di<offset;di++){
					//上位バイトと下位バイトをくっつける
					data2[(di<<1)]=data[di];
					data2[(di<<1)+1]=data[di+offset];
				}

				linedata = new DataStream(data2.buffer);
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
