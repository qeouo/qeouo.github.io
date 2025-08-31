[vertexshader]#version 300 es
in vec2 aPos;
uniform vec2 uPosScale; \
uniform vec2 uPosOffset; \
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
out vec2 vUv;
void main(void){
	gl_Position = vec4(aPos * uPosScale + uPosOffset,1.0,1.0); \
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
	out_color = texture(uSampler,vUv);
}
