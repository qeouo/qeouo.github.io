var Slider=(function(){
	var Slider={};
	var replace= function(node){
		var id=node.id;
		var dragging = false;

		var div=document.createElement("nobr");
		node.parentNode.replaceChild(div,node);
//		var lbl= document.createElement('label');
//		lbl.innerHTML=id;
//		div.appendChild(lbl);
		var output= node;
		output.setAttribute("type","text");
		output.setAttribute("class","js-output");
		output.id=id;
		div.appendChild(output);

		var slider=document.createElement('div');
		slider.max=1.;
		slider.min=0.;
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
		slider.setAttribute("class","js-slider");
		div.appendChild(slider);

		var div2=document.createElement('div');
		slider.appendChild(div2);

		var input=document.createElement('input');
		input.setAttribute("type","button");
		slider.appendChild(input);

		var setValue = function (value){
			if(slider.step){
				value = Math.floor(value/slider.step)*slider.step;
			}
			output.value = value;
			value = (value - slider.min)/(slider.max-slider.min)
			var max=slider.clientWidth;
			var w = input.clientWidth;
			if(w==0)w=15;
			if(max==0)max=100;
			input.style.left = (value*max - w/2) + 'px';
		};
		var drag=function(evt){
			if(!evt){ evt = window.event; }

			var left = evt.clientX;
			var rect = slider.getBoundingClientRect();
			var width = input.clientWidth / 2;
			var value = Math.round(left - rect.left- width);
			value/=slider.clientWidth;
			value=Math.max(Math.min(value,1),0);
			value=value * (slider.max-slider.min) + slider.min;
			setValue(value);
			//output.value = value;
			Util.fireEvent(output,"change")
			return false;
		};
		
		document.addEventListener("mouseup",function(evt){dragging=false;},false);
		document.addEventListener("mousemove",function(evt){if(dragging){drag(evt);}},false);
		input.addEventListener("mousedown",function(evt){dragging=true;},false);
		slider.addEventListener("click",drag,false);
		output.addEventListener("change",function(evt){setValue(evt.target.value);},false);

		document.addEventListener("touchend",function(evt){dragging=false;},false);
		document.addEventListener("touchmove",function(evt){if(dragging){evt.preventDefault();
				evt.clientX = evt.touches[0].clientX;
				drag(evt);}},false);
		input.addEventListener("touchstart",function(evt){dragging=true;},{passive:true});
		setValue(output.value);

		return div;
	};

var newStyle = document.createElement('style');newStyle.type = "text/css";
document.getElementsByTagName('head').item(0).appendChild(newStyle);
		var stylesheet = document.styleSheets.item(document.styleSheets.length-1);

		stylesheet.insertRule(" \
input.js-output{ \
  display:inline-block; \
  width:32px; \
  margin:0px 8px; \
} ", stylesheet.cssRules.length);
		stylesheet.insertRule(" \
.js-slider{ \
  position:relative; \
  display:inline-block; \
  width:100px; \
  height:20px; \
} ", stylesheet.cssRules.length);
		stylesheet.insertRule(" \
.js-slider div{ \
  background:#ddd; \
  height:3px; \
  border:1px inset #aaa; \
  position:relative; \
  top:12px; \
  font-size:0px; \
} ", stylesheet.cssRules.length);
		stylesheet.insertRule(" \
.js-slider input{ \
  position:absolute; \
  width:15px; \
  height:20px; \
  border-width:1px; \
  display:block; \
} ", stylesheet.cssRules.length);
	Slider.init=function(){
		var matchClass = new RegExp('(^|\\s)(slider)(\\s*(\\{[^}]*\\})|\\s|$)', 'i');
		var e = document.getElementsByTagName('input');
		for(var i=0; i<e.length; i+=1) {
			var node=e[i];
			if( node.className && (node.className == "slider")) {
				replace(node);
			}
		}
	}
	return Slider;
})();
window.addEventListener("load",Slider.init,false);
