
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
uniform lowp vec3 uLight; 
uniform lowp vec3 uLightColor; 
uniform lowp mat4 lightMat; 

layout (location = 0) out vec4 out_color;

#include(common)

float checkShadow(sampler2D shadowmap,vec2 uv,float z){
	return max(0.0,sign(unpackUFP16(texture(shadowmap,uv).rg) - z)); 
}

void main(void){ 
	/*ノーマルマップ*/ 
	vec3 normal = (texture(uNormalMap,vUv).rgb-0.5)*2.0; 

	if(normal.x <-0.9 && normal.y <=-0.9 && normal.z <=0.9){
		discard;
	}

	vec3 result;
	
	uvec4 ueye = texture(uPosMap,vUv);
	vec3 eye;
	eye.xy = unpackHalf2x16(ueye.x);
	eye.z = unpackHalf2x16(ueye.y).x;
	vec3 pos = eye + anglePos;
	eye = normalize(eye);

	/*カラーマップ*/ 
	vec3 basecol = decode(texture(uBaseColMap,vUv)); 

	float opacity = texture(uNormalMap,vUv).a;

	/*pbr*/ 
	vec4 pbr = texture(uPbrMap,vUv); 
	float specular= pbr.x; 
	float roughness = pbr.y; 
	float transparent_roughness = pbr.z; 
	float refractPower = pbr.w; 
	float metallic = 0.0;


	/*影判定*/ 
	vec4 lightPos=  vec4(pos,1.0); 
	lightPos= lightMat* lightPos;
	lightPos.xy/=lightPos.w;
	highp vec2 smap=decodeVec2(uShadowmap,vec2(1024.0),(lightPos.xy+1.0)*0.5); 

	highp float shadow_a = 1.0;
	highp float nowz = (lightPos.z+1.0)*0.5;
	//nowz = exp(nowz);
	if(nowz   > smap.r+0.00001){
		float offset=3.0/1024.0;
		//float offset=(nowz -smap.r)*0.05;
		vec2 current = (lightPos.xy+1.0)*0.5;
		//float c = 
		//	checkShadow(uShadowmap,current+vec2(-1.0,0.0)*offset,nowz)
		//	+checkShadow(uShadowmap,current+vec2(1.0,0.0)*offset,nowz)
		//	+checkShadow(uShadowmap,current+vec2(0.0,-1.0)*offset,nowz)
		//	+checkShadow(uShadowmap,current+vec2(0.0,1.0)*offset,nowz);
		//if(c>0.0){
		//	highp float sq = smap.r * smap.r;
		//	highp float v = max(smap.g - sq-0.0,0.0);
		//	shadow_a = max(0.0,min(1.0,v/(v+pow(nowz-smap.r-0.005,2.0))));
		//}else{
			shadow_a=0.0;
		//}
		//shadow_a=c/4.0;
	}
	//diffuse = shadow_a * diffuse; 

	/*拡散反射+環境光+自己発光*/ 
	//vec3 vColor2 = diffuse*uLightColor* shadow_a + uEmi;
	result = basecol * (max(-dot( normal ,uLight),0.0)* uLightColor*shadow_a);
	result *= (1.0-specular);
		

	/*スケーリング*/ 
	//out_color = encode(vec3(0.5).rgb); 
	out_color = vec4(result*opacity,1.0); 
} 
