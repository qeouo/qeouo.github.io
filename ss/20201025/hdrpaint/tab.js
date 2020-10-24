
var refreshTab = function(target_id){
	var tool_radios = document.getElementById(target_id).getElementsByTagName("input");
	for(var i=0;i<tool_radios.length;i++){
		var input = tool_radios[i];
		var div=document.getElementById("tab_"+input.id);
		if(!div)continue;
		if(input.checked){
			div.style.display="inline-block";
			}else{
			div.style.display="none";
		}
	}
}
