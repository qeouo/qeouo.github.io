[vertexshader]
precision lowp float;
attribute vec3 aPos;
attribute vec2 aUv;
varying vec2 vUv;
uniform mat4 projectionMatrix;
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);
	vUv = aUv;
}

[fragmentshader]
precision lowp float;
varying vec2 vUv;
uniform sampler2D uBaseColMap;
uniform sampler2D uNormalMap;
#include(common)
void main(void){

	vec4 tex = texture2D(uBaseColMap,vUv);
	tex = vec4(step(0.5,tex.r));
	gl_FragColor = encode(tex);
}
