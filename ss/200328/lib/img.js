
var Img = (function(){
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
			case 1:
				this.data=new Uint8Array(this.width*this.height<<2);
				this.rgba=new Uint32Array(this.data.buffer);
				break;
			default:
				this.data=new Float32Array(this.width*this.height<<2);
				break;
			}
		}

	};
	var ret = Img;

	ret.copy=function(dst,dx,dy,src,x,y,w,h){
		if(dx<0){
			x-=dx;
			w+=dx;
			dx=0;
		}
		if(dy<0){
			y-=dy;
			h+=dy;
			dy=0;
		}
		if(dx+w>dst.width){
			w-=(dx+w)-dst.width;
		}
		if(dy+h>dst.height){
			h-=(dy+h)-dst.height;
		}
		for(var yi=0;yi<h;yi++){
			var idx0 = dst.getIndex(dx,dy+yi);
			var idx1 = src.getIndex(x,y+yi);
			for(var xi=0;xi<w;xi++){
				dst.rgba[idx0+xi] = src.rgba[idx1+xi];
			}
		}
	}
	ret.prototype.getIndex=function(x,y){
		var xx = (x+this.width) % this.width;
		var yy = (y+this.height) % this.height;
		return yy * this.width + xx;

	}

	ret.prototype.createExr=function(){
		var img = this;
		var obj={};
		obj.width =img.width;
		obj.height=img.height;
		
		obj.attributes=[];
		obj.attributes["compression"]=0;
		obj.attributes["dataWindow"]={xMin:0,yMin:0,xMax:img.width-1,yMax:img.height-1};
		obj.attributes["displayWindow"]={xMin:0,yMin:0,xMax:img.width-1,yMax:img.height-1};
		obj.attributes["lineOrder"]=0;
		obj.attributes["pixelAspectRatio"]=1;
		obj.attributes["screenWindowCenter"]=[0,0];
		obj.attributes["screenWindowWidth"]=1;

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

	var ctx,canvas,ctx_imagedata;
	canvas =  document.createElement('canvas');
	canvas.width=1;
	canvas.height=1;
	ctx =  canvas.getContext('2d')
	ctx_imagedata=ctx.createImageData(canvas.width,canvas.height);
	ret.prototype.createThumbnail=function(thumbnail_ctx){
			var img = this;
			var img_data=img.data;

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
			for(var yi=0;yi<img.height;yi++){
				for(var xi=0;xi<img.width;xi++){
					var idx=yi*img.width + xi<<2;
					var idx2=yi*canvas.width + xi<<2;
					for(var ii=0;ii<4;ii++){
						ctx_imagedata.data[idx2+ii]=img_data[idx+ii]*255.0;
					}
				}
			}
				
			ctx.putImageData(ctx_imagedata,0,0);
			thumbnail_ctx.clearRect(0,0,thumbnail_canvas.width,thumbnail_canvas.height);
			thumbnail_ctx.drawImage(canvas,0,0,img.width,img.height,0,0,thumbnail_canvas.width,thumbnail_canvas.height);
	}
	ret.loadImg=function(url,format,func){
		if(typeof url !== "string"){
			Util.loadFile(url,Img.loadImg,func);
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

	ret.loadExr=function(buffer){
		var img = new Img();
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
		
		return img;
	}
	ret.prototype.clear=function(){
		//透明でクリア
		var data = this.data;
		var size = data.length;
		for(var i=3;i<size;i+=4){
			data[i]=0;
		}
	}
	ret.prototype.toDataUrl = function(){
		canvas.width=this.width;
		canvas.height=this.height;
		
		ctx.putImageData(this.toImageData(),0,0);

    	return canvas.toDataURL("image/png");
		
	}
	ret.prototype.toImageData = function(){
		var ctx_imagedata=ctx.createImageData(this.width,this.height);
		var data = this.data;
		switch(this.format){
		case 1:
			for(var yi=0;yi<this.height;yi++){
				for(var xi=0;xi<this.width;xi++){
					var idx=yi*this.width + xi<<2;
					for(var ii=0;ii<4;ii++){
						ctx_imagedata.data[idx+ii]=data[idx+ii];
					}
				}
			}
			break;
		default:
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
