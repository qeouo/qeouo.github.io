[vertexshader]#version 300 es
in vec2 aPos;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
out vec2 vUv;
void main(void){
		gl_Position = vec4(aPos,1.0,1.0);
			vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset;
}
[fragmentshader]#version 300 es
precision lowp float;
precision highp usampler2D;
#include(common)
in lowp vec2 vUv;
uniform sampler2D uSampler;
uniform sampler2D uSampler2;
uniform float uAL; //平均値
uniform float uLw; //最大値
float uA = 0.18;

layout (location = 0) out vec4 out_color;
mediump vec2 decode2(vec4 src){
	return vec2(unpackUFP16(src.rg),unpackUFP16(src.ba));
}
void main(void){
	vec4 src = texture(uSampler,vUv);
	highp vec3 a = decode(src);
	highp vec2 c = decode2(texture(uSampler2,vec2(0.0,511.0)/512.0));
	float aL = max(c.r,0.1); //平均値
	float Lw = c.g; //最大値
	a.rgb= a.rgb * uA / aL;
	Lw = Lw*uA/aL;
	a.rgb= a.rgb / (1.0 + a.rgb)*(1.0+a.rgb/(Lw*Lw));
	a.r= pow(a.r , 1.0/2.2);
	a.g= pow(a.g , 1.0/2.2);
	a.b= pow(a.b , 1.0/2.2);

	out_color= vec4(a,1.0);
}
