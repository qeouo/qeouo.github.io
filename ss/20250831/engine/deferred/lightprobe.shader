
[vertexshader]#version 300 es
precision lowp float; 
in lowp vec2 aPos; 

uniform vec2 uUvScale;
uniform vec2 uUvOffset;
out vec2 vUv;
out lowp vec2 vPos; 
void main(void){
		gl_Position = vec4(aPos,1.0,1.0);
		vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset;
		vPos = aPos;
}

[fragmentshader]#version 300 es
precision highp usampler2D;
in lowp vec2 vPos; 
in lowp vec2 vUv; 
uniform vec3 anglePos;  
 
uniform sampler2D uBaseColMap; 
uniform sampler2D uNormalMap; 
uniform sampler2D uPbrMap; 
uniform sampler2D uShadowmap; 
uniform usampler2D uPosMap; 

layout (location = 0) out vec4 out_color;

#include(../../lib/shader/common)

void main(void){ 

	vec3 result;
	uvec4 ueye = texture(uPosMap,vUv);
	
	/*ベースカラー*/ 
	vec3 basecol = decode(texture(uBaseColMap,vUv)); 
	float opacity = texture(uNormalMap,vUv).a;

	/*pbr*/ 
	vec4 pbr = texture(uPbrMap,vUv); 
	float specular= pbr.x; 

	/*環境光*/ 
	vec3 lightprobe = vec3(unpackHalf2x16(ueye.a),unpackHalf2x16(ueye.y).g);
		
	out_color = vec4(basecol * lightprobe * (1.0-specular)*opacity,1.0); 
} 
