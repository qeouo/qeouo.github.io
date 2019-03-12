"use strict"

var Env2D=(function(){
var gl;
var ret= {};

var shader;

ret.init= function(){
	gl = Rastgl.gl;

	shader = Ono3d.createShader2("env2d"
," \
[vertexshader] \
attribute vec2 aPos; \
varying vec3 vAngle; \
uniform mat4 projectionMatrix; \
void main(void){ \
	gl_Position = vec4(aPos,1.0,1.0); \
	vAngle = (projectionMatrix * gl_Position).xyz; \
} \
[fragmentshader] \
precision lowp float; \
varying highp vec3 vAngle; \
uniform sampler2D uSampler; \
uniform vec2 uOffset; \
uniform vec2 uSize; \
const highp float _PI = 1.0/3.141592; \
[common] \
void main(void){ \
	vec4 src= textureRGBE(uSampler,vec2(1024.0,1024.0) \
		,vec2(atan(vAngle.x,-vAngle.z)*_PI*0.5 + 0.5 \
		,-atan(vAngle.y,length(vAngle.xz))*_PI*.995 + 0.5)*uSize+uOffset); \
	gl_FragColor = encode(src); \
} \
");
}	
var mat44 = new Array(16);
ret.draw=function(src,x,y,w,h){
	if(x==null){ x=0;y=0;w=1;h=1; }

	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
	gl.useProgram(shader.program);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D,src);
	gl.uniform1i(shader.unis["uSampler"],0);

	gl.uniform2f(shader.unis["uOffset"],x,y);
	gl.uniform2f(shader.unis["uSize"],w,h);
	gl.vertexAttribPointer(shader.atts["aPos"], 2,gl.FLOAT, false,0 , 0);

	var ono3d = Rastgl.ono3d;
	Mat44.copy(mat44,ono3d.viewMatrix);
	mat44[12]=0;
	mat44[13]=0;
	mat44[14]=0;
	Mat44.dot(mat44,ono3d.projectionMatrix,mat44);
	Mat44.getInv(mat44,mat44);

	gl.disable(gl.BLEND);
	gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,new Float32Array(mat44));

	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	
}

	ret.init();
	return ret;
})();


var EnvSet2D=(function(){
	var gl;
	var ret =function(){};
	var shader;
	ret.init= function(){
		gl = Rastgl.gl;
		shader = Ono3d.createShader2("envset2d"
," \
[vertexshader] \
precision lowp float; \
attribute vec2 aPos; \
varying vec2 vUv; \
void main(void){ \
	gl_Position = vec4(aPos,1.0,1.0); \
	vUv = (aPos.xy +1.0)*0.5; \
} \
[fragmentshader] \
precision lowp float; \
varying vec2 vUv; \
uniform sampler2D uSampler; \
[common] \
void main(void){ \n \
	highp vec4 col; \n \
    col = texture2D(uSampler,vUv); \n \
	col.r = pow(col.r,2.2); \
	col.g = pow(col.g,2.2); \
	col.b = pow(col.b,2.2); \
	if(col.r> 0.94 && col.g > 0.94 && col.b>0.94){ \
		float a = length(col.rgb); \
	    col = ((col-0.94)*100.0+0.94); \n \
	} \
	gl_FragColor = encode(col); \n \
}");
}	

	ret.draw=function(src,x,y){
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		gl.viewport(0,0,x,y);
		gl.activeTexture(gl.TEXTURE0); 

		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
		gl.useProgram(shader.program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,src);
		gl.uniform1i(shader.unis["uSampler"],0);
		gl.vertexAttribPointer(shader.atts["aPos"], 2,gl.FLOAT, false,0 , 0);


		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		
	}
		

	ret.init();
	return ret;
})();

var Rough2D=(function(){
	var gl;
	var ret =function(){};
	var shader;
	ret.init= function(){
		gl = Rastgl.gl;
			
		shader = Ono3d.createShader2("rough2d"
," \
[vertexshader] \
attribute vec2 aPos; \
varying vec2 vUv; \
void main(void){ \
	gl_Position = vec4(aPos,1.0,1.0); \
	vUv = vec2(1.0-aPos.x,aPos.y); \
} \
[fragmentshader] \
precision lowp float; \
varying highp vec2 vUv; \n \
uniform sampler2D uSampler; \n \
uniform sampler2D uDst; \n \
uniform highp float uPow; \n \
uniform float uRough ; \n \
const highp float PI =3.14159265359; \n \
uniform highp float uSeed; \n \
highp float rndcount=uSeed*0.1234; \n \
highp float random(){ \n \
	rndcount = (rndcount+0.123); \n \
	return fract(sin(dot(vUv*rndcount,vec2(12.9898,78.233))) * 43758.5453); \n \
} \n \
highp vec3 randvec(vec3 vecN,vec3 vecS,vec3 vecT,float rand){ \n \
	highp float r=acos(1.0-random()*rand); \n \
	highp float r2=random()*PI*2.0; \n \
	highp float n=cos(r); \n \
	highp float s=sin(r); \n \
	highp float t=s*cos(r2); \n \
	s=s*sin(r2); \n \
 \n \
	return n*vecN + s*vecS + t*vecT; \n \
} \n \
const int MAX = 32; \n \
const highp float _PI =1.0/3.14159265359; \n \
uniform vec2 uOffset; \
uniform vec2 uSize; \
[common] \
void main(void){ \n \
	vec3 svec,tvec; \n \
	vec3 vAngle2; \n \
	highp vec4 col; \n \
	highp vec4 col2; \n \
	highp vec3 color = vec3(0.0,0.0,0.0); \n \
	vec3 va; \
	va.y = -sin(vUv.y*PI*0.5); \
	float l = sqrt(1.0-va.y*va.y); \
	va.x = sin(vUv.x*PI)*l; \
	va.z = cos(vUv.x*PI)*l; \
    if(abs(va.y)<0.75){ \n \
		svec=vec3(va.z/length(va.xz) \n \
		,0.0 \n \
		,-va.x/length(va.xz)); \n \
 \n \
		tvec=vec3(-svec.z*va.y \n \
		,svec.z*va.x-svec.x*va.z \n \
		,svec.x*va.y); \n \
	}else{ \n \
		svec=vec3(0.0 \n \
		,-va.z/length(va.yz) \n \
		,va.y/length(va.yz)); \n \
 \n \
		tvec=vec3(svec.y*va.z-svec.z*va.y \n \
		,svec.z*va.x \n \
		,-svec.y*va.x); \n \
	} \n \
	for(int i=0;i<MAX;i++){ \n \
		vAngle2 = randvec(va,svec,tvec,uRough); \n \
		col = decode(texture2D(uSampler \
			,vec2(atan(vAngle2.x,-vAngle2.z)*_PI*0.5 + 0.5 \
			,-atan(vAngle2.y,length(vAngle2.xz))*_PI + 0.5)*uSize + uOffset)); \
		color = color + col.rgb; \
	} \n \
	color = color / (float(MAX)); \n \
	col2 = decode(texture2D(uDst,vec2(-vUv.x*0.5,(vUv.y+1.0)*0.5))); \n \
	color = mix(col2.rgb,color,uPow); \n \
	gl_FragColor = encode(vec4(color,1.0)); \n \
} ");
	}

	ret.draw=function(width,height,rough,src,x,y,w,h){
		if(x==null){ x=0;y=0;w=1;h=1; }

		gl.viewport(0,0,width,height);
		
		gl.disable(gl.BLEND);
		gl.clearColor(0., 0., 0.,0.0);
		gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);

		var dst = Rastgl.createTexture(null,width,height);


		gl.useProgram(shader.program);
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
		gl.vertexAttribPointer(shader.atts["aPos"], 2,gl.FLOAT, false,0 , 0);
		var unis = shader.unis;
		var max =64;
		if(rough==0.0){
			max=1;
		}
		if(rough>=1.0){
			rough=0.999;
		}
		gl.activeTexture(gl.TEXTURE0);
	 	gl.uniform1i(unis["uSampler"],0);
	 	gl.bindTexture(gl.TEXTURE_2D,src);
		gl.uniform2f(unis["uSize"],w,h);
		gl.uniform2f(unis["uOffset"],x,y);

		gl.activeTexture(gl.TEXTURE1);
	 	gl.uniform1i(shader.unis["uDst"],1);
	 	gl.bindTexture(gl.TEXTURE_2D,dst);
		
		
		gl.uniform1f(shader.unis["uRough"],1.0-Math.cos(rough*Math.PI*0.5));
		//gl.uniform1f(shader.unis["uRough"],0.0);
		for(var i=0;i<max;i++){


			gl.uniform1f(shader.unis["uSeed"],Math.random()*15.7);
			gl.uniform1f(shader.unis["uPow"],1.0/(i+1.0));
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			gl.bindTexture(gl.TEXTURE_2D,dst);
			gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,width,height);
	
		}
		
		gl.deleteTexture(dst);

	}
	ret.init();
	return ret;
})();
