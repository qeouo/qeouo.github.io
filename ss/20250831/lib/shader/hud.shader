[vertexshader]
attribute vec3 aPos;
attribute lowp vec2 aUv; 
uniform mat4 projectionMatrix;
varying lowp vec2 vUv; 
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);
	vUv = aUv;
}
[fragmentshader]
precision lowp float; 
#include(common)
uniform highp vec4 uColor; 
varying lowp vec2 vUv; 
uniform vec3 uBaseCol; 
uniform sampler2D uBaseColMap; 
void main(void){ 
	/*ベースカラー*/ 
	vec4 baseCol = vec4(uBaseCol,1.0) * texture2D(uBaseColMap,vUv); 
	gl_FragColor = baseCol;
}
