[vertexshader]#version 300 es
in vec2 aPos;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
out vec2 vUv;
void main(void){
	gl_Position = vec4(aPos ,1.0,1.0); \
	vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset; \
}
[fragmentshader]#version 300 es
precision lowp float;
precision highp sampler2D;
#include(common)
in lowp vec2 vUv;
uniform sampler2D uSampler;

layout (location = 0) out vec4 out_color;
void main(void){
	float d = texture(uSampler,vUv).r;
	//float u_near = 10.0;
	//float u_far = 100.0;
	//d = (2.0 * u_near) / (u_far + u_near - d * (u_far - u_near));
	d = d * 2.0 - 1.0;
	out_color = vec4(d,0.0,0.0,1.0);
}
