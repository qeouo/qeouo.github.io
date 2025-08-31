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

const mediump float coef = 1.0;
void main(void){
	highp float l = length(vec3(fract(vUnit.s* 4.0)*2.0-1.0 ,fract(vUnit.t*2.0)*2.0-1.0,1.0));
	l = coef/(l*l*l);

  	gl_FragColor = packFloat(textureDecode( uSampler,vec2(1024.0,512.0),vUv) * l);
}

