
var Img = (function(){
	var ctx,canvas,ctx_imagedata;
	canvas =  document.createElement('canvas');
	canvas.width=1;
	canvas.height=1;
	ctx =  canvas.getContext('2d');
	ctx_imagedata=ctx.createImageData(canvas.width,canvas.height);


	//イメージ
	var Img = function(x,y,format){
		if(!x){
			x=0;
			y=0;
		}
		this.width=x;
		this.height=y;
		this.data=null;
		this.format=format;
		if(this.width){
			switch(this.format){
			case ret.FORMAT_UINT8:
				this.imagedata=ctx.createImageData(this.width,this.height);
				this.data=this.imagedata.data;//new Uint8Array(this.width*this.height<<2);
				this.rgba=new Uint32Array(this.data.buffer);
				break;
			default:
				this.data=new Float32Array(this.width*this.height<<2);
				break;
			}
		}
	};
	var ret = Img;

	ret.ctx = ctx;

	ret.FORMAT_FLOAT32=0;
	ret.FORMAT_UINT8=1;


	ret.copy = function(dst,dst_x,dst_y,src,src_x,src_y,src_w,src_h,f){
		var dst_data = dst.data;
		var dst_width = dst.width;
		var src_data = src.data;
		var src_width = src.width;

		if(src_w + src_x>src.width){
			src_w = src.width- src_x;
		}
		if(src_h + src_y>src.height){
			src_h = src.height- src_y;
		}

		var left = dst_x;
		var right = dst_x + src_w ;
		var top = dst_y;
		var bottom = dst_y + src_h ;

		if(src_x<0){
			left-=src_x;
			src_x=0;
		}
		if(src_y<0){
			top-=src_y;
			src_y=0;
		}

		if(left<0){
			src_x -=left;
			left=0;
		}
		if(top<0){
			src_y -=top;
			top=0;
		}
		if(right>dst.width){
			right =dst.width;
		}
		if(bottom>dst.height){
			bottom =dst.height;
		}

		if(dst.type===ret.FORMAT_UINT8 && src.type===ret.FORMAT_UINT8){
			for(var yi=top;yi<bottom;yi++){
				var dst_idx= dst.getIndex(left,yi);
				var src_idx= src.getIndex(src_x,src_y+yi-top);
				for(var xi=left;xi<right;xi++){
					dst.rgba[dst_idx] = src.rgba[src_idx];
					dst_idx++;
					src_idx++;
				}
			}
		}else{
			for(var yi=top;yi<bottom;yi++){
				var dst_idx= dst.getIndex(left,yi);
				var src_idx= src.getIndex(src_x,src_y+yi-top);
				dst_idx<<=2;
				src_idx<<=2;
				for(var xi=left;xi<right;xi++){
					dst_data[dst_idx+0] = src_data[src_idx+0];
					dst_data[dst_idx+1] = src_data[src_idx+1];
					dst_data[dst_idx+2] = src_data[src_idx+2];
					dst_data[dst_idx+3] = src_data[src_idx+3];
					dst_idx+=4;
					src_idx+=4;
				}
			}
		}
	}
	ret.prototype.copy = function(dst,dst_x,dst_y,src,src_x,src_y,src_w,src_h){
		ret.copy(this,dst,dst_x,dst_y,src,src_x,src_y,src_w,src_h);
	}

	ret.prototype.getIndex=function(x,y){
		return y * this.width + x;
	}
	ret.prototype.getIndexLoop=function(x,y){
		var xx = (x+this.width) % this.width;
		var yy = (y+this.height) % this.height;
		return yy * this.width + xx;
	}

	ret.prototype.createExr=function(compression){
		var img = this;
		var obj={};
		obj.width =img.width;
		obj.height=img.height;
		
		obj.attributes=[];
		obj.attributes["compression"]=compression;
		obj.attributes["dataWindow"]={xMin:0,yMin:0,xMax:img.width-1,yMax:img.height-1};
		obj.attributes["displayWindow"]={xMin:0,yMin:0,xMax:img.width-1,yMax:img.height-1};
		obj.attributes["lineOrder"]=0;
		obj.attributes["pixelAspectRatio"]=1;
		obj.attributes["screenWindowCenter"]=[0,0];
		obj.attributes["screenWindowWidth"]=1;
//		obj.attributes["chromaticities"]=[0.1,0.1,0.1,0.2,0.3,0.4,0.5,0.6];

		var size = img.width*img.height;
		var channels=[];
		for(var i=0;i<4;i++){
			var channel={};
			channel.data=new Float32Array(size);
			channel.pixel_type=1;
			channel.pLiner=0;
			channel.reserved=0;
			channel.xSampling=1;
			channel.ySampling=1;
			channels.push(channel);
		}
		channels[0].name="A";
		channels[1].name="B";
		channels[2].name="G";
		channels[3].name="R";

		var img_data = img.data;
		for(var i=0;i<size;i++){
			var idx=i<<2;
			channels[0].data[i]=img_data[idx+3];
			channels[1].data[i]=img_data[idx+2];
			channels[2].data[i]=img_data[idx+1];
			channels[3].data[i]=img_data[idx+0];
		}
		obj.attributes.channels=channels;


		return OpenEXR.toArrayBuffer(obj);
	}

	ret.prototype.createThumbnail=function(thumbnail_ctx){
	}
	ret.loadImg=function(url,format,func){
		if(typeof url !== "string"){
			Util.loadFile(url,function(url){
				Img.loadImg(url,format,func);

			});
			return null;
		}
		var image = new Image();
		image.src=url;
		var img=new Img();
		img.name=url;
		img.format=format;
		image.onload=function(e){
			img.width=image.width;
			img.height=image.height;

			if(canvas.width<img.width || canvas.height<img.height){
				//開いた画像がキャンバスより大きい場合は広げる
				if(canvas.width<img.width){
					canvas.width=img.width;
				}
				if(canvas.height<img.height){
					canvas.height=img.height;
				}
				ctx_imagedata=ctx.createImageData(canvas.width,canvas.height);
			}



			//ピクセルデータ取得
			ctx.clearRect(0,0,canvas.width,canvas.height);
			ctx.drawImage(image,0,0);
			var data=ctx.getImageData(0,0,img.width,img.height).data;

			switch(img.format){
				case 1:
					img.data=new Uint8Array(img.width*img.height*4);
					img.rgba=new Uint32Array(img.data.buffer);
					for(var di=0;di<img.width*img.height*4;di++){
						img.data[di]=data[di] ;
					}
					break;
				default:
					img.data=new Float32Array(img.width*img.height*4);
					var r = 1.0/255.0;
					for(var di=0;di<img.width*img.height*4;di++){
						img.data[di]=data[di] * r;
					}
			}

			if(func){
				func(img);
			}
		}
		return img;
	}

	ret.loadExr=function(url,format,func){
		var img = new Img();
		var f=function(buffer){
			var obj={};
			OpenEXR.fromArrayBuffer(obj,buffer);

			img.width =obj.width;
			img.height=obj.height;
			img.data=new Float32Array(img.width*img.height*4);
			
			//RGBAチャンネルの情報をdataにセットする
			var channels=obj.attributes.channels;
			var data = img.data;
			var cindex={};
			cindex["R"]=-1;
			cindex["G"]=-1;
			cindex["B"]=-1;
			cindex["A"]=-1;
			for(var i=0;i<channels.length;i++){
				cindex[channels[i].name]=i;
			}
			var r = cindex["R"];
			var g = cindex["G"];
			var b = cindex["B"];
			var size = img.width*img.height*4;
			for(var i=0;i<size;i+=4){
				data[i]=channels[r].data[i>>2];
				data[i+1]=channels[g].data[i>>2];
				data[i+2]=channels[b].data[i>>2];
			}
			var a = cindex["A"];
			if(a>=0){
				for(var i=0;i<size;i+=4){
					data[i+3]=channels[a].data[i>>2];
				}
			}else{
				for(var i=0;i<size;i+=4){
					data[i+3]=1;
				}
			}
			if(func){
				func(img);
			}
		};
		if(typeof url === "string"){
			Util.loadBinary(url,function(buffer){
				f(buffer);
			});
		}else{	

			if(url.byteLength){
				f(url);
			}else{
				Util.loadBinary(url,function(buffer){
					f(buffer);
				});
			}
		}
		
		return img;
	}
	ret.prototype.clear=function(x,y,w,h){
		//透明でクリア
		var data = this.data;
		if(x === undefined){
			var size = data.length;
			for(var i=3;i<size;i+=4){
				data[i]=0;
			}
		}else{
			var img_width = this.width;
			var bottom = Math.min(this.height, y+h);
			var right = Math.min(img_width,x+w);
			for(var yi=y;yi<bottom;yi++){
				var idx = yi * img_width + x << 2;
				var max = yi * img_width + right << 2;
				for(;idx<max;idx+=4){
					data[idx+3]=0;
				}
			}
		}
	}
	ret.prototype.toCanvas = function(p1,p2){
		canvas.width=this.width;
		canvas.height=this.height;
		
		ctx.putImageData(this.toImageData(),0,0);
		return canvas;
	}
	ret.prototype.toDataURL= function(p1,p2){
		return this.toCanvas().toDataURL(p1,p2);
		
	}
	ret.prototype.toBlob= function(f,p1,p2){
		return this.toCanvas().toBlob(f,p1,p2);
		
	}

	ret.prototype.toBMP= function(){
		var height=this.height;
		var width=this.width;
		var l= height*(((width*4+1)>>>2)<<2)*2+14+40;
		var dv = new DataStream(l);
		//0x0000　(2)	bfType	ファイルタイプ　通常は'BM'
		dv.setTextBuf("BM",0);
		//0x0002　(4)	bfSize	ファイルサイズ (byte)
		dv.setUint32(l,true);
		//0x0006　(2)	bfReserved1	予約領域　常に 0
		dv.setUint16(0,true);
		//0x0008　(2)	bfReserved2	予約領域　常に 0
		dv.setUint16(0,true);
		//0x000A　(4)	bfOffBits	ファイル先頭から画像データまでのオフセット (byte)
		dv.setUint32(12+42,true);

//ヘッダサイズ
		dv.setUint32(40,true);
		//画像幅
		dv.setUint32(this.width,true);
		//画像高さ
		dv.setUint32(this.height,true);
		//プレーン数
		dv.setUint16(1,true);
		//1画素あたり
		dv.setUint16(32,true);
		//圧縮
		dv.setUint32(0,true);
		//画像サイズ
		dv.setUint32(this.data.length,true);
		//横解像度
		dv.setUint32(0,true);
		//縦解像度
		dv.setUint32(0,true);
		//パレット
		dv.setUint32(0,true);
		//重要パレット
		dv.setUint32(0,true);


		var data= this.data;
		switch(this.format){
		case 1:
			for(var yi=height;yi--;){
				var idx = yi*width<<2;
				for(var xi=0;xi<width;xi++){
					dv.setUint8(data[idx+2],true);
					dv.setUint8(data[idx+1],true);
					dv.setUint8(data[idx+0],true);
					dv.setUint8(data[idx+3],true);
					idx+=4;
				}
			}
			break;
		default:
			break;
		}
		//var blob = new Blob([dv.byteBuffer], {type: "application/octet-stream"});
		//return  window.URL.createObjectURL(blob);
		return dv.byteBuffer;
		//var b64= btoa(String.fromCharCode.apply(null,dv.byteBuffer));
		//return "data:image/bmp;base64,"+b64;
	}
	ret.prototype.toImageData = function(){
		var ctx_imagedata;
		var data = this.data;
		switch(this.format){
		case 1:
			ctx_imagedata =this.imagedata;
			//for(var yi=0;yi<this.height;yi++){
			//	for(var xi=0;xi<this.width;xi++){
			//		var idx=yi*this.width + xi<<2;
			//		for(var ii=0;ii<4;ii++){
			//			ctx_imagedata.data[idx+ii]=data[idx+ii];
			//		}
			//	}
			//}
			break;
		default:
			ctx_imagedata=ctx.createImageData(this.width,this.height);
			for(var yi=0;yi<this.height;yi++){
				for(var xi=0;xi<this.width;xi++){
					var idx=yi*this.width + xi<<2;
					for(var ii=0;ii<4;ii++){
						ctx_imagedata.data[idx+ii]=data[idx+ii]*255.0;
					}
				}
			}
			break;
		}
		return ctx_imagedata;
	}
	return ret;
})();
