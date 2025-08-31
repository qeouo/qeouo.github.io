var c = document.getElementById("c")
var ctx = c.getContext("2d");
var textarea = document.getElementById("text");
var outtext = document.getElementById("outtext");
var alphabet = document.getElementById("alphabet");
var txt_width = document.getElementById("width");
var txt_height = document.getElementById("height");
var image_width = document.getElementById("image_width");
var image_height = document.getElementById("image_height");

class CharData{
 constructor(){
  this.code=0;
  this.u =0;
  this.v=0;
  this.u2=0;
  this.v2=0;
  this.offsetx = 0;
  this.offsety = 0;
  this.width=0;
  this.height=0;
 }
}
function convertCodePoints(str){
 return Array.from(str).map(char=>{
    return char.codePointAt(0);
 });
}

function codePointsToString(codepoints){
return codepoints.map(point=> {
 return String.fromCodePoint(point);
 }).join("");
}
function a(){
	var txt=textarea.value;
	var width =Number(txt_width.value);
	var height =Number(txt_height.value);
	var im_width =Number(image_width.value);
	var im_height =Number(image_height.value);
	c.width=im_width;
	c.height=im_height;
	 var points = convertCodePoints(txt);

	if(alphabet.checked){
	   var a = [];
	   for(var i=32 ;i<128;i++){
		a.push(i);
	   }
	   points = a.concat(points);
	}

	const txt2 = Array.from(new Set(points));

	chardatas = [];
	var size = Math.floor(Number(c.width)/width);
	for(var i=0;i<txt2.length;i++){
	  var chardata = [
		txt2[i]
	,(i%size)*width
	,Math.floor(i/size)*height
	,width
	,height
	,0
	,0
	,width
	,height];
	 chardatas.push(chardata);
	}
	var font={
	image:"//font.png"
	,chars:chardatas
	};

	var outstr =JSON.stringify(font);
	outstr = outstr.replaceAll(",[",'\n,[');
	outtext.value = outstr;

	ctx.font =`${height}px monospace`;
	ctx.clearRect(0,0,512,512);

	ctx.fillStyle="white";
	var n = Math.floor(txt2.length/size+1);
	for(var i=0;i<n;i++){
	  var t=txt2.slice(i*size,(i+1)*size);
	txt3 = codePointsToString(t);
	 console.log(txt3);
	ctx.fillText(txt3,0,(i+1)*height);
	}
}

