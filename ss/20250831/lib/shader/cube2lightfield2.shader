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

void main(void){
	vec2 unit = vec2(1.0/1024.0,1.0/512.0);
	vec2 uv = (gl_FragCoord.xy-1.0) * unit * 2.0; 
	gl_FragColor = encode(
		decode(texture2D(uSampler,uv)) 
		+ decode(texture2D(uSampler,uv+vec2(1.0,0.0)*unit))
		+ decode(texture2D(uSampler,uv+vec2(0.0,1.0)*unit))
		+ decode(texture2D(uSampler,uv+unit))
	);
}

