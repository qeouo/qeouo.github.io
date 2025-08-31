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
	float size = 512.0;
	highp vec2 a = decode2(texture2D(uSampler,vUv));
	highp vec2 b = decode2(texture2D(uSampler,vUv-vec2(1.0,0.0)/size));
	highp vec2 c = decode2(texture2D(uSampler,vUv-vec2(0.0,1.0)/size));
	highp vec2 d = decode2(texture2D(uSampler,vUv-vec2(1.0)/size));
	a.r = (a.r + b.r + c.r + d.r)/4.0;
	a.g = max(max(max(a.g ,b.g) ,c.g), d.g);
	gl_FragColor= vec4(packUFP16(a.r),packUFP16(a.g));
}
