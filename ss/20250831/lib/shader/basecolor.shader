[vertexshader]
precision lowp float;
attribute vec2 aPos;
varying vec2 vUv;
void main(void){
	gl_Position = vec4(aPos,1.0,1.0);
	vUv = (aPos.xy +1.0)*0.5;
}
[fragmentshader]
precision mediump float;
varying vec2 vUv;
uniform sampler2D uSampler;
#include(common)
void main(void){
	highp vec4 col;
    col = texture2D(uSampler,vUv);
	col.r = pow(col.r,2.2);
	col.g = pow(col.g,2.2);
	col.b = pow(col.b,2.2);

	gl_FragColor = col;
}
