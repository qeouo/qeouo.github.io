var Slider=(function(){
	//スライダーコントロール
	var Slider={};
	var replace= function(node){
		//対象のノードオブジェクトをスライダに置き換える
		var id=node.id;
		var dragging = false; //ドラッグ状態

		//テキストエリア+スライダー
		var div=document.createElement("span");
		div.setAttribute("class","js-slider");
		node.parentNode.replaceChild(div,node);

		//テキストボックス
		var output= node;
		output.setAttribute("type","text");
		output.setAttribute("class","js-text");
		output.id=id;
		div.appendChild(output);

		//スライダー部
		var span=document.createElement('div');
		span.setAttribute("class","js-slider3");
		div.appendChild(span);

		//溝
		var slider=document.createElement('span');
		slider.max=1.;
		slider.min=0.;
		//設定値があればその値をセットする
		if(node.max){
			slider.max=parseFloat(node.max);
		}
		if(node.min){
			slider.min=parseFloat(node.min);
		}
		if(node.step){
			slider.step=parseInt(node.step);
		}
		if(node.value){
			output.value=node.value;
		}else{
			output.value=slider.min;
		}
		slider.setAttribute("class","js-slider2");
		span.appendChild(slider);

		//ツマミ
		var input=document.createElement('input');
		input.setAttribute("type","button");
		span.appendChild(input);

		var setValue = function (value){
			if(slider.step){
				value = Math.floor(value/slider.step)*slider.step;
			}
			output.value = value;
			value = (value - slider.min)/(slider.max-slider.min)
			var max=slider.offsetWidth;
			var w = input.offsetWidth;
			if(w==0)w=15;
			if(max==0)max=100;
			input.style.left = (value*max - w/2) + 'px';
			//input.style.top = (-input.offsetHeight/2+2) + 'px';
		};
		var drag=function(evt){
			if(!evt){ evt = window.event; }

			var left = evt.clientX;
			var rect = slider.getBoundingClientRect();
			var width = input.offsetWidth / 2 * 0;
			var value = Math.round(left - rect.left- width);
			value/=slider.clientWidth;
			value=Math.max(Math.min(value,1),0);
			value=value * (slider.max-slider.min) + slider.min;
			setValue(value);
			//output.value = value;
			Util.fireEvent(output,"change")
			return false;
		};
		
		//ドラッグ開始
		input.addEventListener("pointerdown",function(evt){dragging=true;});
		//ドラッグ終了時フラグ解除
		document.addEventListener("pointerup",function(evt){dragging=false;});

		//ドラッグ時処理
		document.addEventListener("pointermove",function(evt){if(dragging){drag(evt);}});

		//デフォルト処理無効
		input.addEventListener("touchmove",function(evt){ evt.preventDefault();});

		//クリック時ツマミ移動
		span.addEventListener("click",drag,false);

		//値直接変更時にツマミ反映
		output.addEventListener("input",function(evt){setValue(evt.target.value);});

		setValue(output.value);

		return div;
	};

var newStyle = document.createElement('style');
newStyle.type = "text/css";
document.getElementsByTagName('head').item(0).appendChild(newStyle);
		var stylesheet = document.styleSheets.item(document.styleSheets.length-1);

stylesheet.insertRule(" \
	.js-slider{ \
	  white-space:nowrap; \
	} ", stylesheet.cssRules.length);
stylesheet.insertRule(" \
	.js-slider input.js-text{ \
	  width:32px; \
	  margin:0px 8px; \
	} ", stylesheet.cssRules.length);

stylesheet.insertRule(" \
	.js-slider3{ \
		display:inline-block; \
	  	position:relative; \
		vertical-align: middle; \
		width:100px; \
		height:20px; \
} ", stylesheet.cssRules.length);
stylesheet.insertRule(" \
	.js-slider2{ \
		display:inline-block; \
		vertical-align: middle; \
		width:100%; \
		background:#ddd; \
		height:3px; \
		border:1px inset #aaa; \
} ", stylesheet.cssRules.length);
stylesheet.insertRule(" \
	.js-slider3 input{ \
	  position:absolute; \
	  width:15px; \
	  height:100%; \
	  border-width:1px; \
	  touch-action:none; \
	} ", stylesheet.cssRules.length);

	Slider.init=function(){
//		var e = document.getElementsByTagName('input');
		var e = document.querySelectorAll('input.slider');
		for(var i=0; i<e.length; i+=1) {
			var node=e[i];
//			if( (node.className !== "slider")) {
//				continue;
//			}
			replace(node);
			
		}
	}
	return Slider;
})();
window.addEventListener("load",Slider.init,false);
