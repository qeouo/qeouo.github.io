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
#include(../../lib/shader/common)
varying lowp vec2 vUv;
uniform sampler2D uSampler;

void main(void){
	vec2 unit = vec2(1.0/128.0,1.0/128.0);
	vec2 uv = (vUv.xy); 
	gl_FragColor = packFloat(
		unpackFloat(texture2D(uSampler,uv)) 
		+ unpackFloat(texture2D(uSampler,uv-vec2(1.0,0.0)*unit))
		+ unpackFloat(texture2D(uSampler,uv-vec2(0.0,1.0)*unit))
		+ unpackFloat(texture2D(uSampler,uv-unit))
	);
}
