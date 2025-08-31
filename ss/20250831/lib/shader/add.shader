[vertexshader]
attribute vec2 aPos;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
varying vec2 vUv;
void main(void){
		gl_Position = vec4(aPos ,1.0,1.0);
			vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset;
}
[fragmentshader]
precision lowp float;
#include(common)
varying lowp vec2 vUv;
uniform sampler2D uSampler;
uniform sampler2D uSampler2;
uniform float v1;
uniform float v2;
void main(void){
	highp vec3 a = decode(texture2D(uSampler,vUv));
	highp vec3 a2 = decode(texture2D(uSampler2,vUv));
	gl_FragColor= encode(a*v1+a2*v2);
}

