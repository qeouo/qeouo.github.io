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

	var bV0 = new Vec3()
	,bV1=new Vec3()
	,bV2=new Vec3()
	,bM=new Array(16)
	;
var VERTEX_MAX=ret.VERTEX_MAX = 4096*2;

var gl;
var ono3d;
var renderBuffer;
var frameBuffer;
var fTexture;
var fTexture2;
ret.dummyTexture;
var normal= new Float32Array(3*3);
var calcLighting;
var calcSpc;


var idxGlBuffer;
var glbuffer;
var fullposbuffer;

var faceflg = ret.faceflg=new Array(4096);

var uniSampler;
var uniEnvSampler;
var uniEnv;
var uniFlg;
var uniLight;
var uniAmb;
var uniPersW;
var uniPersH;
var uniNrmSampler;
var uniMatT;
var uniNrmMap;
var uniSpc;
var uniSpca;


var stereoDraw=ret.stereoDraw = function(ono3d,func){
	var WIDTH=ono3d.viewport[2];
	var HEIGHT=ono3d.viewport[3];
	var p=1.0;
	var q=(1-p)*0.5;
	var stereo;

	if(globalParam.stereomode==0){
		globalParam.gl.viewport(0,0,WIDTH,HEIGHT);
		ono3d.setPers(ono3d.aov,HEIGHT/WIDTH);
		Mat44.dot(ono3d.pvMat,ono3d.projectionMat,ono3d.viewMatrix);
		func();
	}else{
		WIDTH =WIDTH/2;
		globalParam.gl.viewport(WIDTH*q,HEIGHT*q,WIDTH*p,HEIGHT*p);
		stereo=globalParam.stereo;
		ono3d.setPers(ono3d.aov,HEIGHT/WIDTH);
		ono3d.projectionMat[8]=0;//stereo/10;
		ono3d.projectionMat[12]=stereo;
		Mat44.dot(ono3d.pvMat,ono3d.projectionMat,ono3d.viewMatrix);
		func();

		ono3d.projectionMat[12]*=-1;
		Mat44.dot(ono3d.pvMat,ono3d.projectionMat,ono3d.viewMatrix);
		globalParam.gl.viewport(WIDTH+WIDTH*q,HEIGHT*q,WIDTH*p,HEIGHT*p);
		func();
	}
}





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
	gl.bufferData(target, jsbuffer, gl.STATIC_DRAW);
	buffer.glbuffer=glbuffer;
	buffer.jsbuffer=jsbuffer;
	buffer.target=target;
	buffer.size=size;
	return buffer;
}
var _offset=0;
ret.initAttReset=function(){
	_offset=0;
}
var initAtt= ret.initAtt = function(program,attName,size,type){
	var arg={};
	arg.att = gl.getAttribLocation(program,attName); 
	arg.size=size;
	arg.type=type;
	arg.offset=_offset;
	_offset+=VERTEX_MAX*size;
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
varying vec2 vUv; \
void main(void){ \
	gl_Position = vec4(aPos,1.0,1.0); \
	vUv = aUv; \
} \
"," \
varying highp vec2 vUv; \
uniform sampler2D uSampler; \
void main(void){ \
	gl_FragColor= texture2D(uSampler,vec2(vUv.s,vUv.t)); \
} \
");
		gl.useProgram(program);
		args=[];
		_offset=0;
		args["aPos"]=initAtt(program,"aPos",2,gl.FLOAT);
		args["aUv"]=initAtt(program,"aUv",2,gl.FLOAT);
		args["uSampler"]=gl.getUniformLocation(program,"uSampler");
		buffer[0]=-1;
		buffer[1]=-1;
		buffer[2]=1;
		buffer[3]=-1;
		buffer[4]=1;
		buffer[5]=1;
		buffer[6]=-1;
		buffer[7]=1;
	}	

	 ret.copyframe =function(src,x,y,w,h,u,v,u2,v2){
		if(u==null){
			ret.copyframe(src,0,0,2,2,x,y,w,h);
			return;
		}
		gl.disable(gl.DEPTH_TEST);

		buffer[0]=x-w*0.5;
		buffer[1]=y-h*0.5;
		buffer[2]=x+w*0.5;
		buffer[3]=y-h*0.5;
		buffer[4]=x+w*0.5;
		buffer[5]=y+h*0.5;
		buffer[6]=x-w*0.5;
		buffer[7]=y+h*0.5;
		buffer[8]=u;
		buffer[9]=v//*480/1024;
		buffer[10]=u+u2//*720/1024;
		buffer[11]=v//*480/1024;
		buffer[12]=u+u2//*720/1024;
		buffer[13]=v+v2;
		buffer[14]=u;
		buffer[15]=v+v2;

		gl.useProgram(program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,src);
		gl.uniform1i(args["uSampler"],0);
				
		gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, buffer);
		var arg=args["aPos"];
		gl.vertexAttribPointer(arg.att, arg.size,arg.type, false, 0, 0);
		arg=args["aUv"];
		gl.vertexAttribPointer(arg.att, arg.size,arg.type, false, 0, 8*4);

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
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
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
			cubemap.images.push(Util.loadImage(truePath,0,function(image){
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

					}
				})
			);
		}
		return cubemap;
	}


ret.init=function(_gl,_ono3d){

	ret.gl = gl = _gl;
	ret.ono3d = ono3d = _ono3d;
	try{
		ret.idxGlBuffer = idxGlBuffer=createArrayBuffer(gl.ELEMENT_ARRAY_BUFFER,VERTEX_MAX);

		var buffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);

		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clearDepth(1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.CULL_FACE);

		calcLighting=Ono3d.calcLighting;
		calcSpc=Ono3d.calcSpc;

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

		ret.fTexture2 =fTexture2 = createTexture(null,1024,1024);
		
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
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(VERTEX_MAX*20), gl.STATIC_DRAW);

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

	var loadjs=["mainshader","shadow","gauss","normalmap","emishader","environment","plainshader"];
	for(var i=0;i<loadjs.length;i++){
		var script = document.createElement('script');
		script.src = currentpath+"webgl/"+loadjs[i] + ".js";
		document.head.appendChild(script);
	}
	return false;

}
	return ret;
})();
