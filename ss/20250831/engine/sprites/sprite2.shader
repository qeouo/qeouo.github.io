[vertexshader]#version 300 es
in vec3 aPos;
in vec2 aUv;
uniform vec2 uvScale; 
out vec2 vUv;
void main(void){
	gl_Position = vec4(vec2(aPos.x-160.0,120.0-aPos.y)/vec2(160.0,120.0),0.5,1.0); 
	vUv = aUv * uvScale; 
}
[fragmentshader]#version 300 es
precision lowp float;
precision highp sampler2D;
#include(../../lib/shader/common)
in lowp vec2 vUv;
uniform sampler2D uSampler;
uniform vec4 uBaseColor;

layout (location = 0) out vec4 out_color;
void main(void){
	vec4 a = texture(uSampler,vUv);
	out_color = a;
}
