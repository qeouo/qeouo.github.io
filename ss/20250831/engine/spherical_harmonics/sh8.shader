[vertexshader]
attribute vec2 aPos;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
varying vec2 vUv;
varying lowp vec2 vUnit;
void main(void){
	gl_Position = vec4(aPos ,1.0,1.0);
	vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset;
	vUnit = (aPos+ 1.0) * 0.5;
}
[fragmentshader]
precision lowp float;
#include(../../lib/shader/common)
#include(../../lib/shader/rgbe)
varying lowp vec2 vUv;
varying lowp vec2 vUnit;
uniform sampler2D uSampler;

const mediump float coef = 15.0/4.0;
void main(void){
	float u=(fract(vUnit.s*4.0)*2.0-1.0);
	float v=(fract(vUnit.t*2.0)*2.0-1.0);
	vec3 n;

	if(vUnit.t >0.5){
		if(vUnit.s <0.25){
			n=vec3(-u,-1.0,-v);
		}else{
			n=vec3(-u,1.0,v);
		}
	}else{
		if(vUnit.s <0.25){
			n=vec3(-u,-v,1.0);
		}else if(vUnit.s <0.5){
			n=vec3(-1.0,-v,-u);
		}else if(vUnit.s <0.75){
			n=vec3(u,-v,-1.0);
		}else{
			n=vec3(1.0,-v,u);
		}
	}
	highp float l = length(n);
	n=n/l;
	l = coef/(l*l*l);

  	gl_FragColor = packFloat(textureDecode( uSampler,vec2(1024.0,512.0),vUv) * l * (n.z*n.z - n.x*n.x));
}
