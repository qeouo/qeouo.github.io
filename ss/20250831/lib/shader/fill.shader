[vertexshader]
attribute vec2 aPos;
void main(void){
		gl_Position = vec4(aPos,1.0,1.0);
}
[fragmentshader]
precision lowp float;
#include(common)
uniform vec4 uColor;
void main(void){
	gl_FragColor= uColor;
}
