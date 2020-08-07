var Colorpicker=(function(){
	//カラーピッカー
	var Colorpicker={};
	var rgb=new Vec3();
	var hsv=new Vec3();
	var parentInput=null;//カラーピッカーが表示されている親コントロール
	var dragflg=0;//カラーピッカー操作状態 1でHS 2でV

	var rgb2hex=function(rgb){
		//rgbを16進数の文字列に変換
		var r = (0x100|rgb[0]*255).toString(16)
		var g = (0x100|rgb[1]*255).toString(16)
		var b = (0x100|rgb[2]*255).toString(16)
		return r.slice(-2) + g.slice(-2) + b.slice(-2)
	}

	var hex2rgb=function(rgb,hex){
		//16進数の文字列をrgbに変換
		rgb[0] = parseInt(hex.slice(0,2),16)/255;
		rgb[1] = parseInt(hex.slice(2,4),16)/255;
		rgb[2] = parseInt(hex.slice(4,6),16)/255;
		if(isNaN(rgb[0])){rgb[0]=0};
		if(isNaN(rgb[1])){rgb[1]=0};
		if(isNaN(rgb[2])){rgb[2]=0};
		return rgb;
	}

	var hsv2rgb=function(rgb,hsv){
		//hsvをrgbに変換
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
		//rgbをhsvに変換
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
		//カラーピッカーメインタグ
		var div=document.createElement("div");
		div.classList.add("colorpicker");
		div.style.position="absolute";
		div.style.width="auto";
		div.style.zIndex="100"

		//色相・彩度選択エリア
		var divHS=document.createElement("div");
		divHS.style.float="left"
		divHS.style.touchAction="none"
		divHS.style.width="128px"
		divHS.style.height="128px"
		divHS.style.border="inset 2px"
		divHS.style.position="relative"

		var cvsHS=document.createElement("canvas");
		cvsHS.setAttribute("width","128")
		cvsHS.setAttribute("height","128")

		var imgHS=document.createElement("img");
		imgHS.setAttribute("width","128")
		imgHS.setAttribute("height","128")

		var cursorHS=document.createElement("div");
		cursorHS.style.position="absolute"
		cursorHS.style.border="solid 1px black"
		cursorHS.style.width="3px"
		cursorHS.style.height="3px"

		//divHS.appendChild(cvsHS);
		divHS.appendChild(imgHS);
		divHS.appendChild(cursorHS);

		//明度選択エリア
		var divV=document.createElement("div");
		divV.style.float="left"
		divV.style.width="8px"
		divV.style.height="128px"
		divV.style.border="inset 2px"
		divV.style.position="relative"


		var imgV=document.createElement("img");
		imgV.setAttribute("width","8")
		imgV.setAttribute("height","128")

		var cursorV=document.createElement("div");
		cursorV.style.position="absolute"
		cursorV.style.border="solid 1px black"
		cursorV.style.width="10px"
		cursorV.style.height="1px"

		divV.appendChild(imgV);
		divV.appendChild(cursorV);

		div.appendChild(divHS);
		div.appendChild(divV);
		
		//色相・彩度選択エリアの画像作成
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
		imgHS.src = cvsHS.toDataURL("image/png");

		//明度選択エリアの画像作成
		cvsHS.width=8;
		cvsHS.height=128;
		ctx=cvsHS.getContext("2d");
		imgdata=ctx.getImageData(0,0,cvsHS.width,cvsHS.height);
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
		imgV.src = cvsHS.toDataURL("image/png");

		//HS選択エリアドラッグ開始
		divHS.addEventListener("pointerdown",function(evt){dragflg=1;},false);
		//V選択エリアドラッグ開始
		divV.addEventListener("pointerdown",function(evt){dragflg=2;},false);
		//ドラッグ時カーソル移動
		div.addEventListener("pointerdown",function(evt){
			evt.preventDefault();
			move(evt);
		},false);

		//ドラッグ終了時フラグ初期化
		document.addEventListener("pointerup",function(evt){dragflg=0;},false);

		var move=function(evt){
			//ドラッグ中処理
			switch(dragflg){
			case 1:
				//色計算
				var rect = imgHS.getClientRects()[0];
				var x=(evt.clientX-rect.left)/(imgHS.clientWidth)*2-1.;
				var y=(evt.clientY-rect.top)/(imgHS.clientHeight)*2-1.;
				hsv[1]=Math.sqrt(x*x+y*y);
				if(hsv[1]>1){
					x/=hsv[1];
					y/=hsv[1];
					hsv[1]=1;
				}
				hsv[0]=(Math.atan2(y,-x)+Math.PI)/(Math.PI*2);

				//カーソル位置移動
				cursorHS.style.left=(x+1)*64-2+"px";
				cursorHS.style.top=(y+1)*64-2+"px";
				break;
			case 2:
				//色計算
				var rect = imgV.getBoundingClientRect();
				var y=(evt.clientY-rect.top)/(imgV.height);
				y=Math.min(1,Math.max(0,y));
				hsv[2]=y;

				//カーソル移動
				cursorV.style.left="-2px";
				cursorV.style.top=y*128-1+"px";
				break;
			default:
				return;
			}

			//色変更をテキストボックスに反映しchangeイベント実行
			hsv2rgb(rgb,hsv);
			parentInput.value=rgb2hex(rgb);
			Util.fireEvent(parentInput,"change");
		}
		document.addEventListener("pointermove",move,false);

		//デフォルトタッチイベントを無視
		divHS.addEventListener("touchmove",function(e){e.preventDefault();},false);
		divHS.addEventListener("pointermove",function(e){e.preventDefault();},false);
		divV.addEventListener("touchmove",function(e){e.preventDefault();},false);
		divV.addEventListener("pointermove",function(e){e.preventDefault();},false);

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
			//テキストの内容を背景色にセット
			textArea.style.backgroundColor="#"+textArea.value;
			hex2rgb(rgb,textArea.value);
			textArea.style.color=(0.3*rgb[0]+0.6*rgb[1]+0.1*rgb[2]<0.5)?"white":"black";
		}

		//ページ読み込み時に className="colorpicker"のinputタグを対象に
		//カラーピッカーコントロール対応させる
		var e = document.getElementsByClassName('colorpicker');
		for(var i=0; i<e.length; i+=1) {
			var node=e[i];
			node.addEventListener("blur",function(evt){
				//フォーカスアウト時、子のカラーピッカーを消す
				if(div.parentNode){
					div.parentNode.removeChild(div);
				}
			},false);
			node.addEventListener("click",function(evt){
				//クリック時、カラーピッカーを子として追加
				parentInput=this;

				this.parentNode.appendChild(div);
				div.style.left=this.offsetLeft+"px";
				div.style.top=this.offsetTop+ this.offsetHeight +"px";

				setCursor(this.value);
			},false);
			node.addEventListener("change",function(evt){
				//内容変更時、背景色とカーソルをリフレッシュする
				updateTextArea(this);
				setCursor(this.value);
			},false);
			
		}
	}
	return Colorpicker;
})();
window.addEventListener("load",Colorpicker.init,false);
