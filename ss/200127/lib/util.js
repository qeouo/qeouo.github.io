"use strict"
var globalParam = {};
var Util=(function(){
	var myIE = document.all; //IEflg
	var ua = window.navigator.userAgent.toLowerCase();
	if(ua.indexOf("windows" !== -1)){
		globalParam.windows=1;
	}


	var ret =function(){}

	var loadingCount =0
		,imagedatacanvas
		,imagedatacontext
		
		,fps=30
		,spf=0
		,nextsleep=0
		,fpserror=0
		,fpserrordelta=0
		,mainfunc
		
		,SCREEN_W
		,SCREEN_H
	;
	
	var i=0
		,keymap=new Array(256)
	;
	keymap[37]=i++;
	keymap[38]=i++;
	keymap[39]=i++;
	keymap[40]=i++;
	keymap[' '.charCodeAt(0)]=i++;
	keymap['X'.charCodeAt(0)]=i++;
	keymap['C'.charCodeAt(0)]=i++;
	keymap['V'.charCodeAt(0)]=i++;
	
	keymap['A'.charCodeAt(0)]=i++;
	keymap['W'.charCodeAt(0)]=i++;
	keymap['D'.charCodeAt(0)]=i++;
	keymap['S'.charCodeAt(0)]=i++;
	keymap['F'.charCodeAt(0)]=i++;
	keymap['G'.charCodeAt(0)]=i++;
	keymap['H'.charCodeAt(0)]=i++;
	keymap['J'.charCodeAt(0)]=i++;
	
	ret.ctx=null;
	ret.canvas=null;
	ret.canvasgl=null;
	ret.cursorX=0;
	ret.cursorY=0;
	ret.padX =0;
	ret.padY =0;
	ret.wheelDelta=0;
	ret.pressOn=0;
	ret.pressCount=0;
	ret.pressOnRight=0;
	ret.pressCountRight=0;
	ret.oldcursorX=0;
	ret.oldcursorY=0;
	ret.screenscale=1;
	ret.tap=0;
	ret.keyflag=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	ret.keyflagOld=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	ret.keymap=keymap;
	ret.enablePad = 1;
	
	var virtualPad = null;
	var virtualPadP = null;
	var virtualBtn = null;

	ret.createCanvas= function(width,height){
		var canvas= document.createElement("canvas")
		if(typeof G_vmlCanvasManager !== 'undefined'){
			canvas = G_vmlCanvasManager.initElement(canvas);
		}
		canvas.setAttribute('width',width)
		canvas.setAttribute('height',height)
		return canvas
	}
	var mainloop=function(){
		var dx,dy
		ret.tap=0
	
		if(ret.pressOn){
			ret.pressCount = ret.pressCount + 1
			if(ret.pressCount==1){
	
				ret.oldcursorX2= ret.cursorX
				ret.oldcursorY2= ret.cursorY
				ret.oldcursorX = ret.cursorX
				ret.oldcursorY = ret.cursorY
			}
		}else if(ret.pressCount > 0){
			
			dx=ret.cursorX-ret.oldcursorX2
			dy=ret.cursorY-ret.oldcursorY2
			if(ret.pressCount<10 && dx*dx+dy*dy<16){
				ret.tap=1
			}
			ret.pressCount = -1
			
		}else ret.pressCount = 0
		if(ret.pressOnRight){
			ret.pressCountRight += 1
		}else{
			ret.pressCountRight =0
		}

		if(loadingCount ==0){
			mainfunc()
		}
		ret.oldcursorX = ret.cursorX
		ret.oldcursorY = ret.cursorY
		
		var i 
		for(i=ret.keyflag.length;i--;){
			ret.keyflagOld[i]=ret.keyflag[i]
		}

	}
	
	ret.loadImage=function(url,norepeat,func){
		var image = new Image();

		var flg=true
		if(globalParam.files)
		for (var i = 0, f; f = globalParam.files[i]; i++) {
			if(escape(f.name)==url){
				//ローカルファイルの場合
				var reader = new FileReader()
				
				reader.onload =  function(e){
					image.src=e.target.result;
				}
				reader.readAsDataURL(f);
				flg=false;
				break;
			}
		}
		if(flg){
			//リモートファイルの場合
			image.src = url
		}

		//ロードカウンタを増やす
		loadingCount++
		image.onerror=function(){
			//エラーの場合減らす
			loadingCount--
		}
		console.log("load start",url);
		
		//読み込みが終わっていない場合はイベントリスナ登録
		image.addEventListener("load",function(e) {
			if(!image.pat){
				console.log("load end",image);
				//ロード処理(1回のみ)
				//ロードカウンタを減らす
				loadingCount--;
				if(norepeat){
					image.pat =ret.ctx.createPattern(image,"no-repeat")
				}else{
					image.pat =ret.ctx.createPattern(image,"repeat")
				}
				imagedatacontext.clearRect(0,0,imagedatacanvas.width,imagedatacanvas.height);
				imagedatacontext.drawImage(image,0,0)

				if(imagedatacontext.getImageData){
					image.imagedata = imagedatacontext.getImageData(0,0,image.width,image.height)
				}
			}

			if(func){
				//コールバック指定がある場合は行う
				func(image);
			}
		});
		
		return image
	}
	ret.loadText=function(url,callback){
		var flg=true
		var filename_ex = url.match("([^/]+?)([\?#;].*)?$")[1];
		if(globalParam.files){
			for (var i = 0, f; f = globalParam.files[i]; i++) {
				if(escape(f.name)== filename_ex){
					var reader = new FileReader()
					reader.onload=function(e){
						var buf=e.target.result
						if(callback){
							callback(buf);
						}
					}
					reader.readAsText(f)
					flg=false;
					break;
				}
			}
		}
		if(flg){

			var request = createXMLHttpRequest()
			request.open("GET", url, true)
			request.onload=function(e){
				if(request.status == 200 || request.status ==304){
					var buf =request.responseText;
					if(callback){
						callback(buf);
					}
				}
				loadingCount--;
				console.log("loadtext end",loadingCount);
			}
			console.log("loadtext start",url);
			loadingCount++;
			request.send("")
		}
		return null;
	}

	ret.loadBinary=function(url,callback){
		var flg=true
		var filename_ex = url.match("([^/]+?)([\?#;].*)?$")[1];
		if(globalParam.files){
			for (var i = 0, f; f = globalParam.files[i]; i++) {
				if(escape(f.name)== filename_ex){
					var reader = new FileReader()
					reader.onload=function(e){
						var buf=e.target.result
						if(callback){
							callback(buf);
						}
					}
					reader.readAsDataURL(f);
					flg=false;
					break;
				}
			}
		}
		if(flg){

			var request = createXMLHttpRequest()
			request.open("GET", url, true)
			request.responseType="arraybuffer";
			request.onload=function(e){
				var buf =request.response;
				if(callback){
					callback(buf);
				}
				loadingCount--;
				console.log("loadbinary end",loadingCount);
			}
			console.log("loadbinary start");
			//console.log("loadbinary start",url);
			loadingCount++;
			request.send("")
		}
		return null;
	}

	ret.rgb=function(r,g,b){
		r = (0x100|r*255).toString(16)
		g = (0x100|g*255).toString(16)
		b = (0x100|b*255).toString(16)
		return "#" + r.slice(-2) + g.slice(-2) + b.slice(-2)
	}
ret.hex2rgb=function(rgb,hex){
	hex=hex+"000000";
	rgb[0] = parseInt(hex.slice(0,2),16)/255;
	rgb[1] = parseInt(hex.slice(2,4),16)/255;
	rgb[2] = parseInt(hex.slice(4,6),16)/255;
	return rgb;
}
	ret.rgba=function(r,g,b,a){
		return 'rgba(' +r +','+ g +','+ b +','+ a+')'
	}
		
	var createXMLHttpRequest=ret.createXMLHttpRequest = function() {
	  if (window.XMLHttpRequest) {
	    return new XMLHttpRequest()
	  } else if (window.ActiveXObject) {
	    try {
	      return new ActiveXObject("Msxml2.XMLHTTP")
	    } catch (e) {
	      try {
	        return new ActiveXObject("Microsoft.XMLHTTP")
	      } catch (e2) {
	        return null
	      }
	    }
	  } else {
	    return null
	  }
	}
	ret.init=function(canvas,canvasgl,_inputarea){

		ret.canvasgl =canvasgl;
		ret.canvas =canvas;
		if( !ret.canvas || !ret.canvas.getContext){
			return false
		}
		
		SCREEN_W = ret.canvas.getAttribute('width')
		SCREEN_H = ret.canvas.getAttribute('height')

		ret.ctx = ret.canvas.getContext('2d')
		ret.ctx.clearRect(0,0,SCREEN_W,SCREEN_H)

		imagedatacanvas =ret.createCanvas(1024,1024)
		imagedatacontext = imagedatacanvas.getContext('2d')
		
		var inputarea =_inputarea;

		if(inputarea){
		inputarea.onselect=function(){return false;}
		inputarea.onselectstart=function(){return false;}
		}
		
		var setCursor = function(x,y){
			var target = ret.canvasgl;
			var scalex=target.width/target.clientWidth;
			var scaley=target.height/target.clientHeight;
			ret.cursorX = (x-target.offsetLeft)*scalex;
			ret.cursorY = (y-target.offsetTop)*scaley;

		}
		var tap = function(){
		}
		var tapout = function(){
			ret.padX=0;
			ret.padY=0;
			virtualPad.style.display="none";
		}


		var rela = function(e){
			if(e.currentTarget.getBoundingClientRect){
				var rect = e.currentTarget.getBoundingClientRect();
				e.relativeX = e.clientX - rect.left;
				e.relativeY = e.clientY - rect.top;
			}
		}
		var relo = function(e,t){
			e.pageX = t.pageX;
			e.pageY = t.pageY;
			e.layerX= t.layerX;
			e.layerY= t.layerY;
			e.clientX = t.clientX;
			e.clientY = t.clientY;
		}
		ret.mouseMove = function(elem,func){
			if(!elem)return;
			if (navigator.userAgent.match(/iPhone/i)
			||navigator.userAgent.match(/iPod/i) 
			||navigator.userAgent.match(/Android/i) ){
				elem.addEventListener("touchmove",function(e) {
					relo(e,e.touches[0]);
					rela(e);
					func(e);

				});
			}else{
				elem.addEventListener("mousemove",function(e) {
					e = e || window.event;
					rela(e);
					func(e);

				},false);
			}
		}
		ret.mouseDown = function(elem,func){
			if(!elem)return;

			if (navigator.userAgent.match(/iPhone/i)
			||navigator.userAgent.match(/iPod/i) 
			||navigator.userAgent.match(/Android/i) ){
				elem.addEventListener("touchstart",function(e) {
					relo(e,e.touches[0]);
					rela(e);
					e.button=0;
					func(e);

				});
			}else{
				elem.addEventListener("mousedown",function(e) {
					e = e || window.event;
					rela(e);
					func(e);
				});
			}
		}

		ret.mouseUp = function(elem,func){
			if (navigator.userAgent.match(/iPhone/i)
			||navigator.userAgent.match(/iPod/i) 
			||navigator.userAgent.match(/Android/i) ){
				elem.addEventListener("touchend",function(e) {
					relo(e,e.changedTouches[0]);
					rela(e);
					e.button=0;
					func(e);

				});
			}else{
				elem.addEventListener("mouseup",function(e) {
					e = e || window.event;
					rela(e);
					func(e);
				});
			}
		}
		ret.mouseMove(inputarea, function(e){
			setCursor(e.pageX,e.pageY);

			if(virtualPad.style.display === "block"){
			var target = e.currentTarget;
				ret.padX= (e.relativeX - virtualPad.offsetLeft)/virtualPad.offsetWidth *2-1;
				ret.padY= (e.relativeY - virtualPad.offsetTop)/virtualPad.offsetHeight *2-1;
				var l = ret.padX * ret.padX + ret.padY * ret.padY ;
				if(l > 1.0){
					l = Math.sqrt(l);
					ret.padX = ret.padX/l;
					ret.padY = ret.padY/l;
					
					virtualPad.style.left = e.relativeX - ret.padX * virtualPad.offsetWidth*0.5 + "px";
					virtualPad.style.top= e.relativeY - ret.padY * virtualPad.offsetHeight*0.5 + "px";

				}

				setPad();
				}
		});
		ret.mouseDown(inputarea, function(e){
			setCursor(e.pageX,e.pageY);
			switch(e.button){
			case 0:
				ret.pressOn = 1;
				break
			case 2:
				ret.pressOnRight=1;
				break
			}
		});
		ret.mouseUp(window, function(e){
			setCursor(e.pageX,e.pageY);
			switch(e.button){
			case 0:
				ret.pressOn = 0;

				tapout();
				break
			case 2:
				ret.pressOnRight=0;
				break
			}
			ret.keyflag[4]=0;
		});

		//バーチャルパッド
		var setPad = function(){

			virtualPadP.style.left = (ret.padX+1.0)*50 +"%";
			virtualPadP.style.top= (ret.padY+1.0)*50+"%";
		}
		var varea = document.getElementById("vertualPadArea");
		ret.mouseDown(varea,function(e){
			switch(e.button){
			case 0:
				virtualPad.style.display="block";
				ret.padX=0;
				ret.padY=0;
				virtualPad.style.left = e.relativeX+"px";
				virtualPad.style.top= e.relativeY+ "px";
				setPad();
				e.stopPropagation();
				break
			}
		});

		if (navigator.userAgent.match(/iPhone/i)
		||navigator.userAgent.match(/iPod/i) 
		||navigator.userAgent.match(/Android/i) ){

		}else{
			var wheelfunc = function(e){
				e = e || window.event;
				if(e.wheelDelta){
					ret.wheelDelta = e.wheelDelta/120;
					if(window.opera) ret.wheelDelta = -ret.wheelDelta;
				}else if(e.detail){
					ret.wheelDelta = -e.detail/3;
				}

				if (e.preventDefault)
					e.preventDefault();
				//e.returnValue = false
			}
			if(window.addEventListener) window.addEventListener('DOMMouseScroll',wheelfunc,{passive: true});
			else if(document.attachEvent) document.attachEvent('onmousewheel',wheelfunc);
			else if(inputarea) inputarea.onmousewheel = wheelfunc;
				

			document.body.onkeydown = function(e){
				e = e ||  window.event;
				var code = e.keyCode
				if(ret.keymap[code]!=null){
					ret.keyflag[ret.keymap[code]]=1
				}
				if(code == 13){
					ret.canvasgl.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
					if(window.parent.screen.width/ret.canvasgl.width> window.parent.screen.height/ret.canvasgl.height){
						canvasgl.style.width="auto";
						canvasgl.style.height="100%";
					}else{
						canvasgl.style.width="100%";
						canvasgl.style.height="auto";
					}
				}
			}
			document.body.onkeyup = function(e){
				e = e ||  window.event;
				var code = e.keyCode
				if(ret.keymap[code]!=null){
					ret.keyflag[ret.keymap[code]]=0
				}
			}
			document.body.onblur = function(e){
				e = e ||  window.event;
				var code = e.keyCode;
				for(var i=0;i<ret.keyflag.length;i++){
					ret.keyflag[i]=0
				}
			}
		}

		virtualPad = document.createElement("div");
		virtualPad.style.backgroundColor="#ff0000";
		virtualPad.style.opacity="0.3";
		virtualPad.style.width="256px";
		virtualPad.style.height="256px";
		virtualPad.style.position="absolute";
		virtualPad.style.left = "10px";
		virtualPad.style.top= "10px";
		virtualPad.style.borderRadius="50%";
		virtualPad.style.zIndex="10";
		virtualPad.style.display="none";
		virtualPad.style.marginLeft="-128px";
		virtualPad.style.marginTop="-128px";
		if(inputarea) inputarea.appendChild(virtualPad);

		virtualPadP = document.createElement("div");
		virtualPadP.style.backgroundColor="#00ff00";
		virtualPadP.style.width="32px";
		virtualPadP.style.height="32px";
		virtualPadP.style.position="absolute";
		virtualPadP.style.borderRadius="50%";
		virtualPadP.style.marginLeft="-16px";
		virtualPadP.style.marginTop="-16px";
		virtualPad.appendChild(virtualPadP);

		virtualBtn = document.createElement("div");
		virtualBtn.style.backgroundColor="#0000ff";
		virtualBtn.style.opacity="0.25";
		virtualBtn.style.width="256px";
		virtualBtn.style.height="256px";
		virtualBtn.style.position="absolute";
		virtualBtn.style.right= "10%";
		virtualBtn.style.bottom= "20%";
		virtualBtn.style.borderRadius="50%";
		virtualBtn.style.zIndex="100";
		virtualBtn.style.display="none";
		virtualBtn.innerHTML="jump";
		if(inputarea)inputarea.appendChild(virtualBtn);

		if(Util.enableVirtualBtn){
			virtualBtn.style.display="inline";
		}

		if (navigator.userAgent.match(/iPhone/i)
		||navigator.userAgent.match(/iPod/i) 
		||navigator.userAgent.match(/Android/i) ){
			virtualBtn.addEventListener("touchstart",function(e) {
				e = e ||  window.event;
				ret.keyflag[4]=1;
			},false);
			window.addEventListener("touchend",function(e) {
				e = e ||  window.event;
				ret.keyflag[4]=0;
			},false);
			virtualBtn.addEventListener("touchmove",function(e) {
			},false);
			virtualBtn.addEventListener("touchend",function(e) {
				ret.keyflag[4]=0;
			},false);
		}else{
			virtualBtn.onmousedown = function(e){
				e = e ||  window.event;
				ret.keyflag[4]=1;
				//e.stopPropagation();
			}
			virtualBtn.onmouseup= function(e){
				e = e ||  window.event;
				ret.keyflag[4]=0;
			}
		}
	}
	ret.setFps=function(argfps,mf){
		fps=argfps|0;
		spf=(1000/fps)|0;
		fpserror = 0;
		fpserrordelta= 1000%fps;
		nextsleep=performance.now();//Date.now();
		mainfunc=mf;
	
		ret.pressCount = 0

	}
	
	var fpsman = ret.fpsman= function(){
		var nowTime = performance.now();//Date.now();
		var dt = nextsleep - nowTime;

//		if(0<dt>>1){
//			setTimeout(fpsman,dt>>1);
//			return;
//		}
		
		//端数処理
		fpserror +=fpserrordelta;
		if(dt>spf)dt=spf
		if(dt<-spf)dt=-spf
		if(fpserror>=fps){
			//時間誤差が1msを超えたら次回1ms増やす
			fpserror-=fps
			dt+=1
		}
		
		nextsleep = nowTime + spf + dt;
		mainloop()
		nowTime = performance.now();//Date.now();
		dt=nextsleep-nowTime;
		if(dt<=0)dt=1;
		setTimeout(fpsman,dt);

	}
	ret.drawText=function(target,x,y,text,img,sizex,sizey){
	
		var dx = x
		var dy = y
		var i,max
		var sx,sy
		for(i=0,max=text.length;i<max;i++){
			sx = text.charCodeAt(i)-32
			sy = (sx>>4) * sizex
			sx =(sx & 0xf) * sizey
			target.drawImage(img,sx,sy,sizex,sizey,dx,dy,sizex,sizey)
			dx = dx + sizex
		}
	}
	ret.convertURLcode =function(str){
		var imax=str.length
		,jmax
		,i,j
		,charcode
		,percent='%'.charCodeAt(0)
		,decode=""
		,sub
		for(i=0;i<imax;i++){
			charcode=str.charCodeAt(i)
			if(charcode==percent){
				i++
				charcode = parseInt(str.slice(i,i+2),16)
				if((charcode&0xF0)==0xE0){
					jmax=2
					charcode=charcode&0xf
				}else if((charcode&0xE0)==0xC0){
					jmax=1
					charcode=charcode&0x1f
				}else {
					jmax=0
				}
				i+=1
				for(j=0;j<jmax;j++){
					i+=2
					charcode<<=6
					charcode |= parseInt(str.slice(i,i+2),16)&0x3f
					i+=1
				}
			}
			decode+=String.fromCharCode(charcode)
		}
		return decode
	}
	
	ret.getCurrent = function(){
		var current="/";
		if (document.currentScript) {
			current=document.currentScript.src;
		} else {
			var scripts = document.getElementsByTagName('script'),
			script = scripts[scripts.length-1];
			if (script.src) {
				current=script.src;
			}
		}
		current = current.substring(0,current.lastIndexOf('/')+1);
		return current;
	};
	ret.loadJs= function(path,func){
		var script = document.createElement('script');
		script.src = path;
		if(func){
			script.onload=func;
		}
		document.head.appendChild(script);
	}

	ret.fireEvent = function (elem,eventname){
		if(document.all){
			elem.fireEvent("on"+"change")
		}else{
			var evt = document.createEvent("MouseEvents");
			evt.initMouseEvent(eventname,true,false,window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
			elem.dispatchEvent(evt)
		}
	}
	ret.setText = function(elem,text){
		if(elem.innerText){
			elem.innerText=text
		}else{
			elem.innerHTML=text
		}
	}
	ret.getText = function(elem){
		return (elem.textContent)?elem.textContent:elem.innerText
	}
	ret.getLoadingCount=function(){
		return loadingCount;
	}

	return ret
})()


var DataStream =(function(){
	var DataStream =function(arraybuffer,offset,length){
		if(!offset){
			this.byteBuffer=new Uint8Array(arraybuffer);
			this.dv=new DataView(this.byteBuffer.buffer);
		}else{
			this.byteBuffer=new Uint8Array(arraybuffer,offset,length);
			this.dv=new DataView(arraybuffer,offset,length);
		}
		this.idx=0;
	};
	var ret  =DataStream;

	ret.prototype.setInt32= function(value,le){
		this.dv.setInt32(this.idx>>3,value,le);
		this.idx+=32;
		return;
	}
	ret.prototype.getInt32= function(le){
		var ret =this.dv.getInt32(this.idx>>3,le);
		this.idx+=32;
		return ret;
	}

	ret.prototype.setUint8 = function(value){
		this.dv.setUint8(this.idx>>3,value);
		this.idx+=8;
	}
	ret.prototype.getUint8 = function(le){
		var ret=this.dv.getUint8(this.idx>>3,le);
		this.idx+=8;
		return ret;
	}

	ret.prototype.setUint32= function(value,le){
		this.dv.setUint32(this.idx>>3,value,le);
		this.idx+=32;
		return;
	}
	ret.prototype.getUint32 = function(le){
		var ret=this.dv.getUint32(this.idx>>3,le);
		this.idx+=32;
		return ret;
	}
	ret.prototype.setUint16= function(value,le){
		this.dv.setUint16(this.idx>>3,value,le);
		this.idx+=16;
		return;
	}
	ret.prototype.getUint16= function(le){
		var ret=this.dv.getUint16(this.idx>>3,le);
		this.idx+=16;
		return ret;
	}

	ret.prototype.setUint64= function(value,le){
		var h=value/(65536*65536)|0;
		var l=value&0xffffffff;
		if(le){
			this.setUint32(l,le);
			this.setUint32(h,le);
		}else{
			this.setUint32(h,le);
			this.setUint32(l,le);
		}
	}
	ret.prototype.getUint64= function(le){
		var ret=this.getUint32(le);
		var ret2=this.getUint32(le);
		if(le){
			return (ret2<<32)+ret;
		}else{
			return (ret<<32)+ret2;
		}
	}
	ret.prototype.setFloat32 = function(value,le){
		this.dv.setFloat32(this.idx>>3,value,le);
		this.idx+=32;
	}
	ret.prototype.getFloat32 = function(le){
		var ret=this.dv.getFloat32(this.idx>>3,le);
		this.idx+=32;
		return ret;
	}

	ret.prototype.setTextBuf=function(str){
		var utf8str = unescape(encodeURIComponent(str));
		var utf8array=[];
		for(var i=0;i<utf8str.length;i++){
			utf8array.push(utf8str.charCodeAt(i));
		}
		var dv = this.dv;
		var a;
		for(var si=0;si<utf8array.length;si++){
			this.setUint8(utf8array[si]);
		}
		this.setUint8(0);
		return ;
	}
	ret.prototype.readTextBuf=function(){
		var dv = this.dv;
		var str="";
		var a;
		while((a=dv.getUint8(this.idx>>3)) !== 0){
			str+=String.fromCharCode(a);
			this.idx+=1<<3;
		}
		this.idx+=1<<3;
		return str;
	}

	ret.prototype.setFloat16=function(value,le){
		var dv = this.dv;
		var s = (-Math.sign(value)+1)>>1;
		var val = Math.abs(value);
		var e = Math.floor(Math.log2(val));
		val = val/Math.pow(2,e)-1;
		
		var u = (s<<15) | ((e+15)<<10) | (val*1024 & 1023);

		this.setUint16(u,le);

		this.idx-=16;
		var val2= this.readFloat16(le);
	}
	ret.prototype.readFloat16=function(le){
		var dv = this.dv;
		var data = this.getUint16(this.idx>>3,le);
		if(data === 0)return 0.0; 
		var sign = (data>>15) &1;
		sign = 1-sign*2 ;

		var idx = ((data>>10)&31) -15;
		var b = (data & 1023)*1.0/1024.0+ 1.0;
		return sign * b * Math.pow(2.0,idx);
	}




	ret.prototype.outputBit=function(bit){ 
		//1ビットouput_bufferに書き込む
		//書き込んだあとindexを1ビットすすめる
		this.byteBuffer[this.idx>>3] &=  ~(1<<(this.idx&7));
		this.byteBuffer[this.idx>>3] |=bit<<(this.idx&7);

		this.idx++;
	}
	ret.prototype.outputBits=function(bits,len){
		//ビット列をoutput_bufferに書き込む
		for(var i=0;i<len;i++){
			this.outputBit((bits>>i)&1);
		}
	}
	ret.prototype.outputBitsReverse=function(bits,len){
		//ビット列を逆順(上位ビットから順番)にoutput_bufferに書き込む
		//ハフマン符号格納用

		for(var i=len-1;i>=0;i--){
			this.outputBit((bits>>i)&1);
		}
	}

	ret.prototype.readBit=function(){
		//圧縮情報output_bufferからoutput_indexの位置のビットを読み込み
		//読み込んだあとoutput_indexを1つすすめる
		var bit=(this.byteBuffer[this.idx>>3] >> (this.idx&7))&1;
		this.idx++;
		return bit;

	}

	ret.prototype.readBits=function(len){
		//output_bufferからlen分読み込み
		var bits=0;
		for(var i=0;i<len;i++){
			bits=bits | (this.readBit()<<i);
		}
		return bits;
	}
	ret.prototype.readBitsReverse=function(len){
		//output_bufferからlen分読み込み
		//読み込んだビットは高次ビットから格納される
		//ハフマン符号読み込み用
		var bits=0;
		for(var i=0;i<len;i++){
			bits=(bits<<1) | this.readBit();
		}
		return bits;
	}

	return ret;
})();

