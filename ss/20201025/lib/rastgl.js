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

var ShaderCompileException = function(message){
	this.message = message;
	this.name = "UserException";
}
var setShaderProgram = ret.setShaderProgram = function(vs,fs){
	//シェーダをコンパイルする
	
  // Vertex shader
  var vshader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vshader, vs);
  gl.compileShader(vshader);
  if(!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)){
    throw new ShaderCompileException(gl.getShaderInfoLog(vshader));
  }

  // Fragment shader
  var fshader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fshader, fs);
  gl.compileShader(fshader);
  if(!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)){
    throw new ShaderCompileException(gl.getShaderInfoLog(fshader));
  }
  // Create shader program
  var program = gl.createProgram();
  gl.attachShader(program, vshader);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
    throw new ShaderCompileException(gl.getProgramInfoLog(program));
  }
	gl.useProgram(program);

  return program;
}

var createTexture = ret.createTexture= function(image,x,y){
	var neheTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, neheTexture);
	if(image){
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	}else{
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, x, y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	}
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return neheTexture;
}
ret.subTexture=function(texture,x,y,w,h,data){
	gl.bindTexture(gl.TEXTURE_2D,texture);
	gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y,w,h, gl.RGBA, gl.UNSIGNED_BYTE, data);
}


ret.init=function(_gl){

	gl = _gl;
	ret.gl = _gl;
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
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(VERTEX_MAX), gl.DYNAMIC_DRAW);

	ret.glbuffer=gl.createBuffer();
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

	this.plainShader =  Ono3d.createShader(" \
	[vertexshader] \
	attribute vec2 aPos; \
	uniform vec2 uPosScale; \
	uniform vec2 uPosOffset; \ uniform vec2 uUvScale; \
	uniform vec2 uUvOffset; \
	varying vec2 vUv; \
	void main(void){ \
		gl_Position = vec4(aPos * uPosScale + uPosOffset,1.0,1.0); \
		vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset; \
	} \
	[fragmentshader] \
	varying lowp vec2 vUv; \
	uniform sampler2D uSampler; \
	void main(void){ \
		gl_FragColor= texture2D(uSampler,vUv); \
	} ");



	return false;

}
	var idx=new Vec3();
	var num=new Vec3();
	ret.packR11G11B10=function(result,raw){
		idx[0]= Math.floor(Math.log(Math.max(raw[0],0.00001)));
		idx[1]= Math.floor(Math.log(Math.max(raw[1],0.00001)));
		idx[2]= Math.floor(Math.log(Math.max(raw[2],0.00001)));
		idx[0] = Math.max(Math.min(idx[0],16.0),-15.0); 
		idx[1] = Math.max(Math.min(idx[1],16.0),-15.0); 
		idx[2] = Math.max(Math.min(idx[2],16.0),-15.0); 
		num[0] = Math.max((raw[0]*Math.pow(2,-idx[0]) -1.0),0.0) ;
		num[1] = Math.max((raw[1]*Math.pow(2,-idx[1]) -1.0),0.0) ;
		num[2] = Math.max((raw[2]*Math.pow(2,-idx[2]) -1.0),0.0) ;
		//return (vec4((idx +geta),floor(num.b * 32.0))*8.0
		//+ floor(vec4(num.rg,fract(num.rg * 8.0))*8.0) 
		//)/255.0; 
	}

	ret.commonFunction=" \n \
		precision mediump float;  \n \
		const mediump float geta = 15.0; \n \
		lowp vec4 packR11G11B10(mediump vec3 raw){ \n \
			mediump vec3 idx = floor(log2(max(raw,0.00001))); \n \
			idx = max(min(idx,16.0),-15.0); \n \
			mediump vec3 num = max((raw*exp2(-idx) -1.0),0.0) ;\n \
			return (vec4((idx +geta),floor(num.b * 32.0))*8.0\n \
				+ floor(vec4(num.rg,fract(num.rg * 8.0))*8.0) \n \
			)/255.0; \n \
		} \n \
		mediump vec3 unpackR11G11B10(lowp vec4 raw){ \n \
			mediump vec4 lo = floor(raw*255.0+0.5)/8.0; \n \
			mediump vec4 hi= floor(lo); \n \
			lo -=  hi; \n \
			return  (vec3(lo.rg + lo.ba/8.0,hi.a/32.0) +1.0) \n \
				* exp2(hi.rgb-geta); \n \
		} \n \
		lowp vec4 packRGBE(mediump vec3 src){ \n \
			mediump float idx = ceil(log2(max(max(src.r,max(src.g,src.b)),0.000001))); \n \
			return vec4(src/ exp2(idx),(idx+128.0)/255.0); \n \
		} \n \
		mediump vec3 unpackRGBE(lowp vec4 src){ \n \
			return src.rgb * exp2(floor(src.a*255.5 - 128.0)); \n \
		} \n \
		const mediump vec3 v1286432 = vec3(128.0,64.0,32.0); \n\
		lowp vec4 packFloat(mediump vec3 src){ \n \
			mediump vec3 abs_src= abs(src) ; \n \
			float idx = clamp(ceil(log2( \n \
				max(max(abs_src.r,max(abs_src.g,abs_src.b)),0.0002) \n \
				)),-geta,31.0-geta); \n \
			return vec4(abs_src / exp2(idx) \n \
				,(dot(max(-sign(src),0.0),v1286432)+(idx+geta))/255.0); \n \
		} \n \
		mediump vec3 unpackFloat(lowp vec4 src){ \n \
			mediump float e = floor(src.a*255.5); \n \
			return src.rgb \n \
				* (1.0 -mod(floor(e/v1286432),2.0)*2.0)  \n \
				* exp2(mod(e,32.0) - geta); \n \
		} \n \
		lowp vec2 packUFP16(mediump float raw){ \n \
			if(raw==0.0)return vec2(0.0,0.0); \n \
			mediump float idx = clamp(floor(log2(raw)),-geta,31.0-geta);  \n \
			mediump float f = (raw /exp2(idx) -1.0)*256.0; \n \
			return vec2(floor(f),floor(fract(f)*8.0)*32.0 + (idx+geta))/255.0; \n \
		} \n \
		mediump float unpackUFP16(lowp vec2 src){ \n \
			if(src.r==0.0 && src.g==0.0)return 0.0; \n \
			return (dot(floor(src.rg* vec2(255.5,255.5/32.0)) \n \
				,vec2(1.0/256.0,1.0/(256.0*8.0))) +1.0) \n \
				* exp2(mod(floor(src.g*255.5),32.0)-geta); \n \
		} \n \
		lowp vec2 packUXP16(mediump float ff){ \n \
			lowp vec2 color; \n \
			mediump float f = ff*255.0; \n \
			color.r = floor(f); \n \
			f=(f-color.r)*255.0; \n \
			color.g = floor(f); \n \
 \n \
			return color*(1.0/255.0); \n \
		} \n \
		mediump float unpackUXP16(lowp vec2 src){ \n \
			return (src.r*256.0  + src.g)/256.0; \n \
		} \n \
		mediump vec2 decodeFull_(lowp vec4 src){ \n \
			return vec2(unpackUXP16(src.rg),unpackUFP16(src.ba)); \n \
		} \n \
		mediump float decodeShadow(sampler2D tex,vec2 texsize,vec2 uv){ \n \
			vec2 unit = 1.0/texsize; \
			uv += - 0.5 * unit; \
	 		vec2 r = fract(uv*texsize); \n \
			return mix(mix(unpackUFP16(texture2D(tex,uv).rg) \n \
					,unpackUFP16(texture2D(tex,uv+vec2(unit.x,0.0)).rg),r.x) \n \
				,mix(unpackUFP16(texture2D(tex,uv+vec2(0.0,unit.y)).rg) \n \
					,unpackUFP16(texture2D(tex,uv+unit).rg),r.x) \n \
				,r.y); \n \
		} \n \
		const mediump float PI =3.14159265359;  \n \
		float atan2(in float y, in float x) { \n \
			return x == 0.0 ? sign(y)*PI/2.0 : atan(y, x); \n \
		} \n \
		const mediump float _PI =1.0/3.14159265359; \n \
		vec2 angle2uv(vec3 angle) { \n \
			return vec2(atan2(angle.z,angle.x)*_PI*0.5 + 0.5  \n \
				,-atan2(angle.y,length(angle.xz))*_PI + 0.5); \n \
		} \n \
		vec3 uv2angle(vec2 uv) { \n \
			vec3 va; \n \
			va.y = sin((0.5-uv.y)*PI); \n \
			float l = sqrt(1.0-va.y*va.y); \n \
			float r = (-uv.x*2.0-0.5)* PI; \n \
			va.x = sin(r)*l; \n \
			va.z = cos(r)*l; \n \
			return va; \n \
		} \n \
		lowp vec4 encode(mediump vec3 src){ \n \
			return packR11G11B10(src); \n \
		} \n \
		mediump vec3 decode(vec4 src){ \n \
			return unpackR11G11B10(src); \n \
		} \n \
	";

	ret.textureRGBE=" \n \
		mediump vec3 textureRGBE(sampler2D tex,vec2 texsize,vec2 uv){ \n \
			vec2 unit = 1.0/texsize; \
			uv = uv - 0.5 * unit; \
	 		vec2 r = fract(uv*texsize); \n \
			return mix(mix(unpackRGBE(texture2D(tex,uv)) \n \
					,unpackRGBE(texture2D(tex,uv+unit*vec2(1.0,0.0))),r.x) \n \
				,mix(unpackRGBE(texture2D(tex,uv+unit*vec2(0.0,1.0))) \n \
					,unpackRGBE(texture2D(tex,uv+unit)),r.x) \n \
				,r.y); \n \
		} \n \
		mediump vec3 textureR11G11B10(sampler2D tex,vec2 texsize,vec2 uv){ \n \
			vec2 unit = 1.0/texsize; \
			uv = uv - 0.5 * unit; \
	 		vec2 r = fract(uv*texsize); \n \
			return mix(mix(unpackR11G11B10(texture2D(tex,uv)) \n \
					,unpackR11G11B10(texture2D(tex,uv+vec2(unit.x,0.0))),r.x) \n \
				,mix(unpackR11G11B10(texture2D(tex,uv+vec2(0.0,unit.y))) \n \
					,unpackR11G11B10(texture2D(tex,uv+unit)),r.x) \n \
				,r.y); \n \
		} \n \
		mediump vec3 textureDecode(sampler2D tex,vec2 texsize,vec2 uv){ \n \
			vec2 unit = 1.0/texsize; \
			uv = uv - 0.5 * unit; \
	 		vec2 r = fract(uv*texsize); \n \
			return mix(mix(decode(texture2D(tex,uv)) \n \
					,decode(texture2D(tex,uv+vec2(unit.x,0.0))),r.x) \n \
				,mix(decode(texture2D(tex,uv+vec2(0.0,unit.y))) \n \
					,decode(texture2D(tex,uv+unit)),r.x) \n \
				,r.y).rgb; \n \
		} \n \
		mediump vec3 textureTri(sampler2D texture,vec2 size,vec2 uv,float w){ \n \
			float refx = pow(0.5,floor(w));  \n \
			uv.t = max(min(uv.t,0.5-0.5/(refx*size.y)),0.5/(refx*size.y)); \n \
			mediump vec3 refCol = textureDecode(texture,size,uv*refx + vec2(0.0,1.0-refx));  \n \
			mediump vec3 q = textureDecode(texture,size,uv*refx*0.5 + vec2(0.0,1.0-refx*0.5));  \n \
			return mix(refCol,q,fract(w)); \n \
		} \n \
	";

	return ret;
})();

