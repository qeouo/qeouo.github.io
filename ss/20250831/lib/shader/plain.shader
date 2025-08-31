[vertexshader]
attribute vec3 aPos;
uniform mat4 projectionMatrix;
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);
	gl_Position = vec4(gl_Position.xy,gl_Position.z,gl_Position.w);
}
[fragmentshader]
precision lowp float; 
#include(common)
uniform highp vec4 uColor; 
void main(void){ 
	gl_FragColor = encode(uColor.rgb);
}
