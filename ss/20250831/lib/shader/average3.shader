[vertexshader]
attribute vec2 aPos;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
varying vec2 vUv;
void main(void){
	gl_Position = vec4(aPos,1.0,1.0);
	vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset;
}
[fragmentshader]
precision lowp float;
#include(common)
varying lowp vec2 vUv;
uniform sampler2D uSampler;

mediump vec2 decode2(vec4 src){
	return vec2(unpackUFP16(src.rg),unpackUFP16(src.ba));
}
void main(void){
	vec2 a = decode2(texture2D(uSampler,vUv));
	vec2 b = decode2(texture2D(uSampler,vec2(0.0,0.0)));
	a =  a*0.9 + b*0.1;
	gl_FragColor= vec4(packUFP16(a.r),packUFP16(a.g));
}
