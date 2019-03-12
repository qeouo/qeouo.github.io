"use strict"
var globalParam = new Object()
var Util=(function(){
	
	var myIE = document.all             // IE

	var ret =function(){}

	var lIcount =0
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
	,keymap=new Array(256)
	
	var i=0;
	keymap[37]=i++;
	keymap[38]=i++;
	keymap[39]=i++;
	keymap[40]=i++;
	keymap['Z'.charCodeAt(0)]=i++;
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
	
	ret.ctx=null
	ret.canvas=null
	ret.canvasgl=null
	ret.cursorX=0
	ret.cursorY=0
	ret.wheelDelta=0
	ret.pressOn=0
	ret.pressCount=0
	ret.pressOnRight=0
	ret.pressCountRight=0
	ret.oldcursorX=0
	ret.oldcursorY=0
	ret.screenscale=1
	ret.tap=0
	ret.keyflag=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	ret.keyflagOld=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	ret.keymap=keymap
	

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
		
		if(lIcount ==0){
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
		var image = new Image()
		image.onload =  function(e){
			lIcount--;
			if(norepeat){
				image.pat =ret.ctx.createPattern(image,"no-repeat")
			}else{
				image.pat =ret.ctx.createPattern(image,"repeat")
			}
			imagedatacontext.clearRect(0,0,imagedatacanvas.width,imagedatacanvas.height);
			imagedatacontext.drawImage(image,0,0)

			if(imagedatacontext.getImageData)
				image.imagedata = imagedatacontext.getImageData(0,0,image.width,image.height)

//					var width=image.width;
//					var height=image.height;
//					var data=image.imagedata.data;
//					var data2=imagedatacontext.getImageData(0,0,image.width,image.height);
//					data2=data2.data;
//					var height1=height-1;
//					var width1=width-1;
//					for(var y=0;y<height;y++){
//						for(var x=0;x<width;x++){
//							var d=(data2[y*width+x<<2] -data2[y*width+(x+1&width1)<<2])
//							if(Math.abs(d)<1){
//								d=(data2[y*width+(x-1&width1)<<2] -data2[y*width+(x+1&width1)<<2])
//							}
//							data[(y*width+x<<2)]=(d*width/1+255)>>1
//							d=data2[y*width+x<<2] -data2[(y+1&height1)*width+x<<2]
//							if(Math.abs(d)<1){
//								d=(data2[((y-1&height1)*width+x)<<2] -data2[(y+1&height1)*width+x<<2])
//							}
//							data[(y*width+x<<2)+1]=(d*width/1+255)>>1
//							data[(y*width+x<<2)+2]=0;//255;
//							data[(y*width+x<<2)+3]=255;
//						}
//					}
			if(func){
				func(image);
			}
		}
		image.onerror=function(){
			lIcount--
		}

		var flg=true
		if(globalParam.files)
		for (var i = 0, f; f = globalParam.files[i]; i++) {
			if(escape(f.name)==url){
				var reader = new FileReader()
				
				reader.onload =  function(e){
					var buf=e.target.result
					image.src=buf
				}
				reader.readAsDataURL(f)
				flg=false
				break
			}
		}
		if(flg){
			image.src = url
		}
		
		lIcount++
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
			//request.responseType="arraybuffer"
			request.onload=function(e){
				var buf =request.responseText
						if(callback){
							callback(buf);
						}
			}
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

		inputarea.onselect=function(){return false;}
		inputarea.onselectstart=function(){return false;}
		
		var setCursor = function(x,y){
			var target = ret.canvasgl;
			var scalex=target.width/target.clientWidth;
			var scaley=target.height/target.clientHeight;
			ret.cursorX = (x-target.offsetLeft)*scalex;
			ret.cursorY = (y-target.offsetTop)*scaley;
		}
		if (navigator.userAgent.match(/iPhone/i)
		||navigator.userAgent.match(/iPod/i) 
		||navigator.userAgent.match(/Android/i) ){
			inputarea.ontouchmove = function(e) {
				//e.stopPropagation();
				e.preventDefault()
				setCursor(e.touches[0].pageX,e.touches[0].pageY);
			}

			inputarea.ontouchstart = function(e){
				//	e.preventDefault()
				ret.pressOn = 1;
				setCursor(e.touches[0].pageX,e.touches[0].pageY);
			}

			inputarea.ontouchend = function(e){
				ret.pressOn = 0;
			}
		}else{
			inputarea.onmousemove = function(e){
				e = e || window.event;
				setCursor(e.pageX,e.pageY);
			}
			inputarea.onmouseout = function(e){
				if(e.toElement != null){
					return;
				}
				ret.pressOn = 0;
				ret.pressOnRight = 0;
				
			}
			inputarea.onmouseover = function(e){
				if(e.fromElement != null){
					return;
				}
				ret.pressOn = 0;
				ret.pressOnRight = 0;
			}
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
			if(window.addEventListener) window.addEventListener('DOMMouseScroll',wheelfunc,false)
			if(document.attachEvent) document.attachEvent('onmousewheel',wheelfunc)
			inputarea.onmousewheel = wheelfunc;
				
			var leftbutton=0
			,rightbutton=2;
			if(myIE)leftbutton=1
			inputarea.onmousedown = function(e){
				e = e || window.event;
				switch(e.button){
				case leftbutton:
					ret.pressOn = 1;
					break
				case rightbutton:
					ret.pressOnRight=1;
					break
				}
			}
			inputarea.onmouseup = function(e){
				e = e ||  window.event;
				switch(e.button){
				case leftbutton:
					ret.pressOn = 0;
					break
				case rightbutton:
					ret.pressOnRight=0;
					break
				}
			}

			inputarea.onkeydown = function(e){
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
			inputarea.onkeyup = function(e){
				e = e ||  window.event;
				var code = e.keyCode
				if(ret.keymap[code]!=null){
					ret.keyflag[ret.keymap[code]]=0
				}
			}
		}
	}
	ret.setFps=function(argfps,mf){
		fps=argfps|0;
		spf=(1000/fps)|0;
		fpserror = 0;
		fpserrordelta= 1000%fps;
		nextsleep=Date.now();
		mainfunc=mf;
	
		ret.pressCount = 0

	}
	
	var fpsman = ret.fpsman= function(){
		var nowTime = Date.now();
		var dt = nextsleep - nowTime;

//		if(0<dt>>1){
//			setTimeout(fpsman,dt>>1);
//			return;
//		}
		
		fpserror +=fpserrordelta;
		if(dt>spf)dt=spf
		if(dt<-spf)dt=-spf
		if(fpserror>=fps){
			fpserror-=fps
			dt+=1
		}
		
		nextsleep = nowTime + spf + dt;
		mainloop()
		nowTime = Date.now();
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
	ret.loadJs= function(path){
		var script = document.createElement('script');
		script.src = path;
		document.head.appendChild(script);
	}
//	if(window.addEventListener) window.addEventListener('load',init,false)
//	if(window.attachEvent) window.attachEvent('onload', init)

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
	return ret
})()


