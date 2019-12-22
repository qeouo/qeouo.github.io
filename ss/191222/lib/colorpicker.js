var Colorpicker=(function(){
	var Colorpicker={};
	var rgb=new Vec3();
	var hsv=new Vec3();
	var parentInput=null;
	var dragflg=0;

var rgb2hex=function(rgb){
	var r = (0x100|rgb[0]*255).toString(16)
	var g = (0x100|rgb[1]*255).toString(16)
	var b = (0x100|rgb[2]*255).toString(16)
	return r.slice(-2) + g.slice(-2) + b.slice(-2)
}
var hex2rgb=function(rgb,hex){
	rgb[0] = parseInt(hex.slice(0,2),16)/255;
	rgb[1] = parseInt(hex.slice(2,4),16)/255;
	rgb[2] = parseInt(hex.slice(4,6),16)/255;
	if(isNaN(rgb[0])){rgb[0]=0};
	if(isNaN(rgb[1])){rgb[1]=0};
	if(isNaN(rgb[2])){rgb[2]=0};
	return rgb;
}
var hsv2rgb=function(rgb,hsv){
	var f;
		var i, p, q, t;
		var v = hsv[2];
		var h =hsv[0];
		var s =hsv[1];
		i = (h*6|0) % 6;
		f = h*6-(h*6|0);
		p = v * (1.0 - s );
		q = v * (1.0 - s  * f);
		t = v * (1.0 - s  * (1.0 - f));
		
		switch(i){
			case 0 : rgb[0] = v; rgb[1] = t; rgb[2] = p; break;
			case 1 : rgb[0] = q; rgb[1] = v; rgb[2] = p; break;
			case 2 : rgb[0] = p; rgb[1] = v; rgb[2] = t; break;
			case 3 : rgb[0] = p; rgb[1] = q; rgb[2] = v; break;
			case 4 : rgb[0] = t; rgb[1] = p; rgb[2] = v; break;
			case 5 : rgb[0] = v; rgb[1] = p; rgb[2] = q; break;
		}

		return rgb;
}
var rgb2hsv=function(hsv,rgb){
	var max = Math.max(rgb[0], Math.max(rgb[1], rgb[2]));
	var min = Math.min(rgb[0], Math.min(rgb[1], rgb[2]));

	if(max == min){
		hsv[0] = 0;
	} else if(max == rgb[0]){
		hsv[0] = (1/6* (rgb[1] - rgb[2]) / (max - min) + 1);
	} else if(max == rgb[1]){
		hsv[0] = (1/6* (rgb[2] - rgb[0]) / (max - min)) + 2/6;
	} else if(max == rgb[2]){
		hsv[0] = (1/6* (rgb[0] - rgb[1]) / (max - min)) + 4/6;   
	}
	hsv[0]-=hsv[0]|0;

	if(max == 0){
		hsv[1] = 0;
	} else{
		hsv[1] = (max - min) / max;
	}

	hsv[2] = max;
    return hsv;
}

	Colorpicker.init=function(){
		var div=document.createElement("div");
		div.classList.add("colorpicker");
		div.style.position="absolute";
		div.style.zIndex="100"
		var divHS=document.createElement("div");
		var cvsHS=document.createElement("canvas");
		var cursorHS=document.createElement("div");
		divHS.style.float="left"
		divHS.style.width="128px"
		divHS.style.height="128px"
		divHS.style.border="inset 2px"
		divHS.style.position="relative"
		divHS.appendChild(cvsHS);
		divHS.appendChild(cursorHS);
		cursorHS.style.position="absolute"
		cursorHS.style.border="solid 1px black"
		cursorHS.style.width="3px"
		cursorHS.style.height="3px"
		cvsHS.setAttribute("width","128")
		cvsHS.setAttribute("height","128")

		var divV=document.createElement("div");
		var cvsV=document.createElement("canvas");
		var cursorV=document.createElement("div");
		divV.style.float="left"
		divV.style.width="8px"
		divV.style.height="128px"
		divV.style.border="inset 2px"
		divV.style.position="relative"
		divV.appendChild(cvsV);
		divV.appendChild(cursorV);
		cursorV.style.position="absolute"
		cursorV.style.border="solid 1px black"
		cursorV.style.width="10px"
		cursorV.style.height="1px"
		cvsV.setAttribute("width","8")
		cvsV.setAttribute("height","128")

		div.appendChild(divHS);
		div.appendChild(divV);
		
		var ctx=cvsHS.getContext("2d");
		var imgdata=ctx.getImageData(0,0,128,128);
		var data=imgdata.data;
		for(var i=0;i<128;i++){
			for(var j=0;j<128;j++){
				hsv[0]=(Math.atan2(i-64,-(j-64))+Math.PI)/(Math.PI*2);
				hsv[1]=Math.sqrt(((i-64)*(i-64)+(j-64)*(j-64))/64/64)
				hsv[2]=1;
				if(hsv[1]>1){
					rgb[0]=0;
					rgb[1]=0;
					rgb[2]=0;
				}else{
					hsv2rgb(rgb,hsv);
				}
				data[(i*128+j)*4]=rgb[0]*255;
				data[(i*128+j)*4+1]=rgb[1]*255;
				data[(i*128+j)*4+2]=rgb[2]*255;
				data[(i*128+j)*4+3]=255;
			}
		}
		ctx.putImageData(imgdata,0,0);

		ctx=cvsV.getContext("2d");
		imgdata=ctx.getImageData(0,0,8,128);
		var data=imgdata.data;
		for(var i=0;i<128;i++){
			hsv[0]=0
			hsv[1]=0
			hsv[2]=i/128.0;
			hsv2rgb(rgb,hsv);
			for(var j=0;j<8;j++){
				data[(i*8+j)*4]=rgb[0]*255;
				data[(i*8+j)*4+1]=rgb[1]*255;
				data[(i*8+j)*4+2]=rgb[2]*255;
				data[(i*8+j)*4+3]=255;
			}
		}
		ctx.putImageData(imgdata,0,0);

		divHS.addEventListener("mousedown",function(evt){dragflg=1;},false);
		divV.addEventListener("mousedown",function(evt){dragflg=2;},false);
		div.addEventListener("mousedown",function(evt){
			evt.preventDefault();
			move(evt);

		},false);
		document.addEventListener("mouseup",function(evt){dragflg=0;},false);
		var move=function(evt){
			if(dragflg==0){
				return;
			}
			if(dragflg==1){
				var rect = cvsHS.getBoundingClientRect();
				var x=(evt.clientX-rect.left)/(rect.right-rect.left)*2-1.;
				var y=(evt.clientY-rect.top)/(rect.bottom-rect.top)*2-1.;
				hsv[1]=Math.sqrt(x*x+y*y);
				if(hsv[1]>1){
					x/=hsv[1];
					y/=hsv[1];
					hsv[1]=1;
				}
				hsv[0]=(Math.atan2(y,-x)+Math.PI)/(Math.PI*2);
			}else if(dragflg==2){
				var rect = cvsV.getBoundingClientRect();
				var y=(evt.clientY-rect.top)/(rect.bottom-rect.top);
				y=Math.min(1,Math.max(0,y));
				hsv[2]=y;
			}
			hsv2rgb(rgb,hsv);
			parentInput.value=rgb2hex(rgb);
			Util.fireEvent(parentInput,"change");
			if(dragflg==1){
				cursorHS.style.left=(x+1)*64-2+"px";
				cursorHS.style.top=(y+1)*64-2+"px";
			}else if(dragflg==2){
				cursorV.style.left="-2px";
				cursorV.style.top=y*128-1+"px";
			}
		}
		document.addEventListener("mousemove",move,false);

		var setCursor=function(value){
			hex2rgb(rgb,value);
			rgb2hsv(hsv,rgb);
			var x=Math.cos(-hsv[0]*Math.PI*2)*hsv[1];
			var y=Math.sin(-hsv[0]*Math.PI*2)*hsv[1];
			cursorHS.style.left=(x+1)*64-2+"px";
			cursorHS.style.top=(y+1)*64-2+"px";

			y=hsv[2];
			cursorV.style.left="-2px";
			cursorV.style.top=y*128-1+"px";
		}

		var updateTextArea=function(textArea){
			textArea.style.backgroundColor="#"+textArea.value;
			hex2rgb(rgb,textArea.value);
			textArea.style.color=(0.3*rgb[0]+0.6*rgb[1]+0.1*rgb[2]<0.5)?"white":"black";
		}
		var e = document.getElementsByTagName('input');
		for(var i=0; i<e.length; i+=1) {
			var node=e[i];
			if( node.className && (node.className == "colorpicker")) {
				node.addEventListener("blur",function(evt){
					if(div.parentNode){
						div.parentNode.removeChild(div);
					}
				},false);
				node.addEventListener("click",function(evt){
					parentInput=this;

					var rect = this.getBoundingClientRect();
					this.parentNode.appendChild(div);
					div.style.left=rect.left+"px";
					div.style.top=rect.bottom+"px";

					setCursor(this.value);
				},false);
				node.addEventListener("change",function(evt){
					updateTextArea(this);
					setCursor(this.value);
				},false);
			}
		}
	}
	return Colorpicker;
})();
window.addEventListener("load",Colorpicker.init,false);
