


var save_hdr= function(e){
	var a = e.target;
	var buffer = joined_img.createExr();
    var blob = new Blob([buffer], {type: "application/octet-stream"});
    var url = window.URL.createObjectURL(blob);

    a.href = url;
    a.target = '_blank';
    a.download = "preview_hdr.exr";
}
var save_ldr= function(e){
	var a = e.target;
	var url=preview.toDataURL("image/png");

    a.href = url;
    a.target = '_blank';
    a.download = "preview_ldr.png";
}
