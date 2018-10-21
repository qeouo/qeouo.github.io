"use strict"
var Rastgl= (function(){
	var currentpath = Util.getCurrent();
	var ret=function(){}

var FACE_MAX=ret.FACE_MAX = 4096*2;
var VERTEX_MAX=ret.VERTEX_MAX = FACE_MAX*3;

var gl;

var renderBuffer;
var frameBuffer;
var fTexture;
ret.dummyTexture;

var fullposbuffer;

var initAtt= ret.initAtt = function(program,attName,size,type){
	var arg={};
	arg.att = gl.getAttribLocation(program,attName); 
	arg.size=size;
	arg.type=type;
	arg.offset=_offset;
	_offset+=size;
	gl.enableVertexAttribArray(arg.att);
	gl.vertexAttribPointer(arg.att, arg.size,arg.type, false, 0, 0);

  return arg;
}

var jsBuffers = ret.jsBuffers = [];
for(var i=0;i<8;i++){
	jsBuffers.push(new Float32Array((VERTEX_MAX*20)/(2<<(7-i))|0));
}
ret.getJsBuffer = function(n){
	var limit =  jsBuffers[jsBuffers.length-1].length;
	if(n<limit){
		n=limit;
	}

	for(var i=0;i<jsBuffers.length;i++){
		if(n<=jsBuffers[i].length){
			return jsBuffers[i];
		}
	}
	return null;
}

var jsIdxBuffers = ret.jsIdxBuffers = [];
for(var i=0;i<8;i++){
	jsIdxBuffers.push(new Int16Array((VERTEX_MAX)/(2<<(7-i))|0));
}
ret.getJsIdxBuffer = function(n){
	var limit =  jsIdxBuffers[jsIdxBuffers.length-1].length;
	if(n<limit){
		n=limit;
	}

	for(var i=0;i<jsIdxBuffers.length;i++){
		if(n<=jsIdxBuffers[i].length){
			return jsIdxBuffers[i];
		}
	}
	return null;
}

ret.viewport=function(x,y,w,h){
	gl.viewport(x,y,w,h);
}
var _offset=0;

var setShaderProgram = ret.setShaderProgram = function(vs,fs){
  // Vertex shader
  var vshader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vshader, vs);
  gl.compileShader(vshader);
  if(!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)){
    alert(gl.getShaderInfoLog(vshader));
    return null;
  }

  // Fragment shader
  var fshader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fshader, fs);
  gl.compileShader(fshader);
  if(!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)){
    alert(gl.getShaderInfoLog(fshader));
    return null;
  }
  // Create shader program
  var program = gl.createProgram();
  gl.attachShader(program, vshader);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
    alert(gl.getProgramInfoLog(program));
    return null;
  }
	gl.useProgram(program);

  return program;
}

var Paste=(function(){
	var ret={};
	var buffer=new Float32Array(16);
	var args;
	var shader;
	ret.init= function(){
		shader = Ono3d.createShader("paste"," \
attribute vec2 aPos; \
uniform vec2 uPosScale; \
uniform vec2 uPosOffset; \
uniform vec2 uUvScale; \
uniform vec2 uUvOffset; \
varying vec2 vUv; \
void main(void){ \
	gl_Position = vec4(aPos * uPosScale + uPosOffset,1.0,1.0); \
	vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset; \
} \
"," \
varying lowp vec2 vUv; \
uniform sampler2D uSampler; \
void main(void){ \
	gl_FragColor= texture2D(uSampler,vUv); \
} "
,["aPos"],[ "uPosScale", "uPosOffset", "uUvScale", "uUvOffset","uSampler"]);
	}	

	 ret.copyframe =function(src,x,y,w,h,u,v,u2,v2){
		if(u==null){
			ret.copyframe(src,0,0,2,2,x,y,w,h);
			return;
		}
		gl.disable(gl.DEPTH_TEST);
		gl.depthMask(false);

		gl.useProgram(shader.program);

		var unis = shader.unis;
		gl.uniform2f(unis["uPosScale"],w*0.5,h*0.5);
		gl.uniform2f(unis["uPosOffset"],x,y);
		gl.uniform2f(unis["uUvScale"],u2,v2);
		gl.uniform2f(unis["uUvOffset"],u,v);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,src);
		gl.uniform1i(unis["uSampler"],0);
				
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
		gl.vertexAttribPointer(shader.atts["aPos"], 2,gl.FLOAT, false,0 , 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);

		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}
	return ret;
})();
var copyframe=ret.copyframe =function(src,x,y,w,h,u,v,u2,v2){
	Paste.copyframe(src,x,y,w,h,u,v,u2,v2);
}
var createTexture = ret.createTexture= function(image,x,y){
	var neheTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, neheTexture);
	if(image){
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	}else{
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, x, y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	}
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return neheTexture;
}

	ret.loadTexture = function(path,func){
		return  Util.loadImage(path,0
			,function(image){
				image.gltexture = Rastgl.createTexture(image);
				if(func){
					func(image);
				}
			}
		);
	}
	ret.loadBumpTexture = function(path,func){
		return Util.loadImage(path,0
			,function(image){
				gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
				gl.viewport(0,0,image.width,image.height);
				var tex=Rastgl.createTexture(null,image.width,image.height);
				var tex2= Rastgl.createTexture(image);
				Nrm.draw(tex2,image.width,image.height);
				gl.bindTexture(gl.TEXTURE_2D, tex);
				gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGBA,0,0,image.width,image.height,0);
				image.gltexture=tex;
				gl.bindTexture(gl.TEXTURE_2D, null);

				if(func){
					func(image);
				}
			}
		);
	}
	ret.loadCubemap = function(path,func){
		var cubepaths= [
			'_front'
			,'_right'
			,'_back'
			,'_left'
			,'_top'
			,'_bottom'
		];
		var count = 0;
		var cubemap = {};
		cubemap.images = [];

		var idx = path.lastIndexOf(".");
		var pathA=path;
		var pathB="";
		if(idx>=0){
			pathA= path.substring(0,idx);
			pathB= path.substring(idx);
		}

		for(var i = 0;i<6;i++){
			var truePath= pathA+ cubepaths[i] + pathB; 
			var image = Util.loadImage(truePath,0,function(image){
				count++;
				if(count==6){
					var gl=Rastgl.gl;
					var targets=[
						gl.TEXTURE_CUBE_MAP_POSITIVE_Z
						,gl.TEXTURE_CUBE_MAP_NEGATIVE_X
						,gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
						,gl.TEXTURE_CUBE_MAP_POSITIVE_X
						,gl.TEXTURE_CUBE_MAP_POSITIVE_Y
						,gl.TEXTURE_CUBE_MAP_NEGATIVE_Y
					];
					var tex = gl.createTexture();
					gl.bindTexture(gl.TEXTURE_CUBE_MAP,tex);
					
					for(i=0;i<6;i++){
						gl.texImage2D(targets[i],0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cubemap.images[i]);
					}
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
					
					var tex2 = gl.createTexture();
					gl.bindTexture(gl.TEXTURE_CUBE_MAP,tex2);
					var envsize = cubemap.images[0].width;
					EnvSet.draw(tex2,tex,envsize,envsize);
					gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
					cubemap.gltexture = tex2;
					
					if(func){
						func(cubemap);
					}
					gl.deleteTexture(tex);

				}
			})
			cubemap.images.push(image);
		}
		return cubemap;
	}


ret.init=function(_gl){

	ret.gl = gl = _gl;
	try{

		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clearDepth(1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.CULL_FACE);


		ret.frameBuffer =frameBuffer=gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		renderBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 1024, 1024);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);

		ret.fTexture=fTexture = createTexture(null,1024,1024);
		gl.bindTexture(gl.TEXTURE_2D, fTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
		ret.dummyTexture = createTexture(null,1,1);
		gl.bindTexture(gl.TEXTURE_2D, ret.dummyTexture);
		gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGBA,0,0,1,1,0);
		
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
	}
	catch(e){
		return true;
	}
	
	ret.glIdxBuffer=gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ret.glIdxBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, jsIdxBuffers[jsIdxBuffers.length-1], gl.DYNAMIC_DRAW);

	ret.glbuffer=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, ret.glbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, jsBuffers[jsBuffers.length-1], gl.DYNAMIC_DRAW);

	ret.fullposbuffer=gl.createBuffer();
	fullposbuffer=ret.fullposbuffer;
	gl.bindBuffer(gl.ARRAY_BUFFER, ret.fullposbuffer);
	var buffer=new Float32Array(8);
	buffer[0]=-1;
	buffer[1]=-1;
	buffer[2]=1;
	buffer[3]=-1;
	buffer[4]=1;
	buffer[5]=1;
	buffer[6]=-1;
	buffer[7]=1;
	gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);


	Paste.init();

	var loadjs=[
		//"mainshader2"
		"shadow","gauss","normalmap","environment","plainshader"
	];
	for(var i=0;i<loadjs.length;i++){
		Util.loadJs(currentpath+"webgl/"+loadjs[i] + ".js");
	}


	return false;

}
	return ret;
})();
