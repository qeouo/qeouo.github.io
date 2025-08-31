[vertexshader]#version 300 es
in vec3 aPos;
in vec2 aUv;
uniform mat4 projectionMatrix; 
out vec2 vUv;
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0); 
	vUv = aUv; 
}
[fragmentshader]#version 300 es
precision lowp float;
precision highp sampler2D;
#include(../../lib/shader/common)
in lowp vec2 vUv;
uniform sampler2D uSampler;

layout (location = 0) out vec4 out_color;
void main(void){
	vec4 a = texture(uSampler,vUv);
	if(a.a == 0.0){
		discard;
	}
	out_color = a;
}
