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
precision highp float;
#include(common)
#include(rgbe)
varying lowp vec2 vUv;
uniform sampler2D uSampler;
uniform mediump vec2 uUnit;

void main(void){
	vec2 unit = uUnit;
	vec2 uv = vUv; 
	gl_FragColor = encode(textureDecode(uSampler,1.0/uUnit,vUv));
}

