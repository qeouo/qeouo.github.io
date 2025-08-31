[vertexshader]#version 300 es
precision lowp float; 
in lowp vec3 aPos; 
in lowp vec3 aNormal; 
in lowp vec2 aUv; 
in lowp float aEnvRatio;  
uniform int uEnvIndex;  
uniform mat4 projectionMatrix; 
uniform highp vec3 anglePos;  
out lowp vec3 vEye; 
out lowp vec2 vUv; 
out mediump vec3 vNormal; 
out float vEnvRatio;  

/*[lightprobe]
in lowp vec3 aLightProbe;  
[lightprobe]*/

/*[lightmap]
in vec2 aUv2; 
out lowp vec2 vUv2; 
[lightmap]*/

/*[height]
in vec3 aSvec; 
in vec3 aTvec; 
out mediump vec3 vSvec; 
out mediump vec3 vTvec; 
[height]*/

/*[lightprobe]
out vec3 vLightProbe; 
[lightprobe]*/

out vec4 position;
out highp float vz;
void main(void){ 
	gl_Position = projectionMatrix * vec4(aPos,1.0); 
	position = gl_Position;
	vz = (gl_Position.z / gl_Position.w + 1.0) * 0.5;
	vUv = aUv; 
	vNormal=aNormal;
	vEnvRatio= 1.0- aEnvRatio + float(uEnvIndex)*(2.0*aEnvRatio - 1.0);
	
/*[lightmap]
	vUv2 = aUv2; 
[lightmap]*/
	
/*[lightprobe]
	vLightProbe = aLightProbe;
[lightprobe]*/

	vEye = aPos - anglePos ; 

/*[height]
	float vS=length(aSvec);
	float vT=length(aTvec);
	//vSvec=normalize(aSvec)/vS;
	//vTvec=normalize(aTvec)/vT;
	vSvec=aSvec/(vS);
	vTvec=aTvec/(vT);

[height]*/

}

[fragmentshader]#version 300 es
precision lowp float; 
#include(../../lib/shader/common)
#include(../../lib/shader/rgbe)
in lowp vec2 vUv; 
in lowp vec3 vEye; 
in mediump vec3 vNormal; 
in highp float vz;
in lowp float vEnvRatio;  
uniform float uEnvRatio; 
uniform lowp float uEmi; 
uniform lowp mat4 lightMat; 
uniform lowp vec3 uLight; 
uniform lowp vec3 uLightColor; 
uniform sampler2D uShadowmap; 
uniform sampler2D uEnvMap;  
uniform highp vec2 uResolution;
uniform highp vec3 anglePos;  
uniform mat4 projectionMatrix; 


in vec4 position;

/*[pbr]
uniform sampler2D uPbrMap; 
[pbr]*/

/*[lightprobe]
in lowp vec3 vLightProbe; 
[lightprobe]*/


uniform lowp float uOpacity; 

uniform vec4 uPbr; 
uniform mat3 uViewMat; 
uniform vec3 uBaseCol; 
uniform sampler2D uBaseColMap; 
/*[height]
uniform sampler2D uNormalMap; 
in mediump vec3 vSvec; 
in mediump vec3 vTvec; 
uniform float uNormpow; 
uniform lowp float uHeightBase;
[height]*/
//uniform lowp float lightThreshold1; 
//uniform lowp float lightThreshold2; 

/*[lightmap]
uniform sampler2D uLightMap;  
in lowp vec2 vUv2; 
[lightmap]*/

layout (location = 0) out vec4 out_base_color;
layout (location = 1) out vec4 out_normal;
layout (location = 2) out vec4 out_pbr;
layout (location = 3) out uvec4 out_color;
layout (location = 4) out float out_depth;

float checkShadow(sampler2D shadowmap,vec2 uv,float z){
	return max(0.0,sign(unpackUFP16(texture(shadowmap,uv).rg) - z)); 
}
void main(void){ 
	lowp vec3 eye = normalize(vEye); 
	lowp vec3 true_eye = vEye;
	lowp vec4 q;
	lowp vec2 uv = vUv;
	lowp vec3 eye_v2 = vec3(0.0);
	mediump float depth=0.0;
	highp vec3 nrm = vNormal;

/*[height]
	/*視差*/ 
	vec3 norm2 = -normalize(cross(vSvec,vTvec));
	vec2 hoge;
	float scale = uNormpow *0.1/ dot(norm2,eye);
	scale /= max(length(vSvec),length(vTvec));
	hoge.x = dot(vSvec,eye)*scale;
	hoge.y = dot(vTvec,eye)*scale;
	float hogez = 0.0;

	const int loop_max = 4;
	float step = 1.0/float(loop_max);
	depth = -uHeightBase;
	float last_depth = depth;
	float last_true_depth = (1.0-texture(uNormalMap, uv+ hoge  * depth).w)-uHeightBase;
	float over_true_depth;

	for(int i=0;i<loop_max ;i++){
		depth +=step;
		float true_depth = (1.0-texture(uNormalMap,uv+ hoge  * depth).w)-uHeightBase;
		if(depth>true_depth ){
			over_true_depth = true_depth;
			break;
		}
		last_depth = depth;
		last_true_depth =  true_depth;
	}
	for(int i=0;i<4;i++){
		step*=0.5;
		float true_depth = (1.0-texture(uNormalMap, uv+ hoge  * (depth-step)).w)-uHeightBase;
		if(depth>true_depth ){
			over_true_depth = true_depth;
			depth -=step;
		}else{
			last_depth = depth - step;
			last_true_depth = true_depth;
		}
	}
	depth = last_depth + (depth - last_depth)*((depth-over_true_depth)/(last_true_depth-last_depth));
	
	true_eye+= -eye * depth*scale;

	uv +=  hoge  * depth;

	/*ノーマルマップ*/ 
	q = texture(uNormalMap,uv); 
	q.x=1.0-q.x;

	nrm = (q*2.0-1.0).rgb;
	nrm.z = sqrt(1.0-nrm.x*nrm.x-nrm.y*nrm.y);
	//nrm.xy *= vNormpow;
	nrm = mat3(normalize(vSvec),normalize(vTvec) ,vNormal)*nrm; 
	nrm = normalize(nrm);

[height]*/


	vec4 pbr;
	pbr = uPbr; 
/*[pbr]
	/*pbr*/ 
	pbr *= texture(uPbrMap,uv) ; 
[pbr]*/
	float specular= pbr.x; 
	float roughness = pbr.y; 
	float transparent_roughness = pbr.z; 
	float refractPower = pbr.w; 


	/*ベースカラー*/ 
	vec4 color_map_data =  texture(uBaseColMap,uv); 
	vec3 baseCol = uBaseCol * color_map_data.rgb; 

	float opacity = 1.0;
	opacity = uOpacity * color_map_data.a;
	if(opacity==0.0){
		discard;
	}


vec3 lightmap;
/*[lightprobe]
	lightmap=vLightProbe;
[lightprobe]*/

/*[lightmap]
	lightmap=textureDecode(uLightMap,vec2(128.0),uv); 
[lightmap]*/
    lightmap += uEmi;

	vec4 ray;
	ray = projectionMatrix * vec4(true_eye+ anglePos,1.0);
	float vzz = (ray.z/ray.w);


	out_base_color = encode(baseCol);
	out_normal = vec4(nrm*0.5+0.5,opacity);
	pbr.w = pbr.w - 1.0;
	out_pbr = pbr;
	out_color = uvec4(packHalf2x16((true_eye).xy),packHalf2x16(vec2(true_eye.z,lightmap.b))
,floatBitsToUint(vzz),packHalf2x16(lightmap.rg));
	out_depth = vzz;

	gl_FragDepth = vzz*0.5+0.5;
} 
