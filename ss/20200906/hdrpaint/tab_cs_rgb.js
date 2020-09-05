
	
var tab_cs_rgb=(function(){
	var obj ={};
	obj.setRGB =function(rgb){
		inputs["color_R"].value = rgb[0];
		inputs["color_G"].value = rgb[1];
		inputs["color_B"].value = rgb[2];

		Util.fireEvent(inputs["color_R"],"input");
		Util.fireEvent(inputs["color_G"],"input");
		Util.fireEvent(inputs["color_B"],"input");
	}

	var changeRGB= function(){
		doc.draw_col[0] = parseFloat(inputs["color_R"].value);
		doc.draw_col[1] = parseFloat(inputs["color_G"].value);
		doc.draw_col[2] = parseFloat(inputs["color_B"].value);

		changeColor(tab_cs_rgb);


		refreshPen();
	}

	document.getElementById("color_R").addEventListener("change",changeRGB);
	document.getElementById("color_G").addEventListener("change",changeRGB);
	document.getElementById("color_B").addEventListener("change",changeRGB);
	return obj;
})();
