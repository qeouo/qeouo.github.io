var tab_cs_base=(function(){
	var obj={};
	obj.setRGB = function(rgb){
		var color=new Vec3();
		var max = Math.max(rgb[0],Math.max(rgb[1],rgb[2]));
		if(max==0){max=1};
		Vec3.mul(color,rgb,1/max);
		inputs["color_base"].value=Util.rgb(color[0],color[1],color[2]).substr(1);
		inputs["color_lumi"].value = Math.log2(max);
		Util.fireEvent(inputs["color_base"],"input");
		Util.fireEvent(inputs["color_lumi"],"input");
	}

	var changeBase = function(){
		var base = new Vec3();
		var lumi = Math.pow(2,parseFloat(inputs["color_lumi"].value));
		Util.hex2rgb(doc.draw_col,inputs["color_base"].value);

		Vec3.mul(doc.draw_col,doc.draw_col,lumi);

		changeColor(tab_cs_base);
	}
	document.getElementById("color_base").addEventListener("change",changeBase);
	document.getElementById("color_lumi").addEventListener("change",changeBase);
	return obj;
})();
