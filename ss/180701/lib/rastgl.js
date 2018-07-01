"use strict"
var Rastgl= (function(){
	var currentpath = Util.getCurrent();
	var ret=function(){}
	var i;
	var OP_DOT=i=1
		,OP_LINE=++i
		,OP_LINES=++i
		,OP_TRIANGLES=++i
		,OP_POLYGON=++i
		,OP_POINT=++i
		,OP_LINELOOP=++i
		,RF_SHADE=1<<(i=0)
		,RF_SMOOTH=1<<(++i)
		,RF_TOON=1<<(++i)
		,RF_LINE=1<<(++i)
		,RF_TEXTURE=1<<(++i)
		,RF_OUTLINE=1<<(++i)
		,RF_ENVMAP=1<<(++i)
		,RF_DOUBLE_SIDED = 1<<(++i)
		,RF_DEPTHTEST = 1<<(++i)
		,RF_PERSCOLLECT = 1<<(++i)
		,RF_PHONGSHADING= 1<<(++i)

		,LT_DIRECTION=i=1
		,LT_AMBIENT=++i
	;
	ret.LT_DIRECTION=LT_DIRECTION;
	ret.LT_AMBIENT=LT_AMBIENT;

var VERTEX_MAX=ret.VERTEX_MAX = 4096*2;

var gl;
var ono3d;
var renderBuffer;
var frameBuffer;
var fTexture;
ret.dummyTexture;

var idxGlBuffer;
var glbuffer;
var fullposbuffer;

var faceflg = ret.faceflg=new Array(4096);


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
var setShaderProgram2 = ret.setShaderProgram2 = function(vs,fs,attributes,uniforms){
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

	var shader={};
	shader.program = program;
	shader.args={};
	shader.attributes=attributes;

	_offset=0;
	for(var i=0;i<shader.attributes.length;i++){
		shader.args[shader.attributes[i].name]=initAtt(shader.program
			,shader.attributes[i].name
			,shader.attributes[i].size,gl.FLOAT);
		shader.attributes[i].arg=shader.args[shader.attributes[i].name];
	}
	shader.amax=_offset;

	for(var i=0;i<uniforms.length;i++){
		var name = uniforms[i];
		shader.args[name]=gl.getUniformLocation(shader.program,name);
	}

  return shader;
}
var createArrayBuffer= function(target,size){
	var buffer={};
	var glbuffer;
	var jsbuffer;
	glbuffer=gl.createBuffer();
	gl.bindBuffer(target, glbuffer);
	if(target==gl.ARRAY_BUFFER){
		jsbuffer=new Float32Array(size);
	}else{
		jsbuffer=new Int16Array(size);
	}
	gl.bufferData(target, jsbuffer, gl.DYNAMIC_DRAW);
	buffer.glbuffer=glbuffer;
	buffer.jsbuffer=jsbuffer;
	buffer.target=target;
	buffer.size=size;
	return buffer;
}
ret.initAttReset=function(){
	_offset=0;
}
var initAtt= ret.initAtt = function(program,attName,size,type){
	var arg={};
	arg.att = gl.getAttribLocation(program,attName); 
	arg.size=size;
	arg.type=type;
	arg.offset=_offset;
	_offset+=size;
	gl.bindBuffer(gl.ARRAY_BUFFER,glbuffer);
	gl.enableVertexAttribArray(arg.att);
	gl.vertexAttribPointer(arg.att, arg.size,arg.type, false, 0, 0);

  return arg;
}
var initAtts= ret.initAtts = function(program,attributes,args){
	_offset=0;
	for(var i=0;i<attributes.length;i++){
		args[attributes[i].name]=initAtt(program,attributes[i].name,attributes[i].size,gl.FLOAT);
		attributes[i].arg=args[attributes[i].name];
	}
	return;
}
ret.vertexAttribPointers = function(shader){

	for(var i=0;i<shader.attributes.length;i++){
		var arg=shader.attributes[i].arg;
		gl.vertexAttribPointer(arg.att, arg.size,arg.type, false, shader.amax*4., arg.offset*4);
	}
}
	

//paste shader
var Paste=(function(){
	var ret={};
	var buffer=new Float32Array(16);
	var args;
	var program;
	ret.init= function(){
		program= setShaderProgram(" \
attribute vec2 aPos; \
attribute vec2 aUv; \
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
} \
");
		gl.useProgram(program);
		var uniforms=[
			"uPosScale",
			"uPosOffset",
			"uUvScale",
			"uUvOffset"
		];
		args=[];
		for(var i=0;i<uniforms.length;i++){
			var name = uniforms[i];
			args[name]=gl.getUniformLocation(program,name);
		}
		args["aPos"]=initAtt(program,"aPos",2,gl.FLOAT);
		args["uSampler"]=gl.getUniformLocation(program,"uSampler");
		_offset=0;
	}	

	 ret.copyframe =function(src,x,y,w,h,u,v,u2,v2){
		if(u==null){
			ret.copyframe(src,0,0,2,2,x,y,w,h);
			return;
		}
		gl.disable(gl.DEPTH_TEST);
		gl.depthMask(false);

		gl.useProgram(program);

		gl.uniform2f(args["uPosScale"],w*0.5,h*0.5);
		gl.uniform2f(args["uPosOffset"],x,y);
		gl.uniform2f(args["uUvScale"],u2,v2);
		gl.uniform2f(args["uUvOffset"],u,v);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,src);
		gl.uniform1i(args["uSampler"],0);
				
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
		gl.vertexAttribPointer(args["aPos"].att, args["aPos"].size,args["aPos"].type , false, 0, 0);

		//gl.bufferSubData(gl.ARRAY_BUFFER, 0, buffer);
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
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
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


ret.init=function(_gl,_ono3d){

	ret.gl = gl = _gl;
	ret.ono3d = ono3d = _ono3d;
	try{
		ret.idxGlBuffer = idxGlBuffer=createArrayBuffer(gl.ELEMENT_ARRAY_BUFFER,VERTEX_MAX);

//		var buffer = gl.createBuffer();
//		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);

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

	ret.glbuffer=gl.createBuffer();
	glbuffer=ret.glbuffer;
	gl.bindBuffer(gl.ARRAY_BUFFER, ret.glbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(VERTEX_MAX*20), gl.DYNAMIC_DRAW);

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
		//"mainshader"
		//,"mainshader2"
		"mainshader3"
		,"mainshader4"
		,"shadow","gauss","normalmap","emishader","environment","plainshader"
	];
	for(var i=0;i<loadjs.length;i++){
		var script = document.createElement('script');
		script.src = currentpath+"webgl/"+loadjs[i] + ".js";
		document.head.appendChild(script);
	}
	return false;

}
	return ret;
})();
