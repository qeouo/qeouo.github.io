[vertexshader]#version 300 es
precision mediump float; 
in lowp vec3 aPos; 
in lowp vec3 aNormal; 
in lowp vec2 aUv; 
in lowp float aEnvRatio;  
uniform int uEnvIndex;  
uniform mat4 projectionMatrix; 
uniform highp vec3 anglePos;  
uniform float uNormpow; 
out lowp vec3 vEye; 
out lowp vec2 vUv; 
out mediump vec3 vNormal; 
out float vEnvRatio;  
out float vNormpow; 

in lowp vec3 aLightProbe;  


in vec3 aSvec; 
in vec3 aTvec; 
out mediump vec3 vSvec; 
out mediump vec3 vTvec; 

out vec3 vLightProbe; 

out highp float vz;

void main(void){ 
	gl_Position = projectionMatrix * vec4(aPos,1.0); 
	vz = (gl_Position.z / gl_Position.w + 1.0) * 0.5;
	vUv = aUv; 
	vNormal=aNormal;
	vEnvRatio= 1.0- aEnvRatio + float(uEnvIndex)*(2.0*aEnvRatio - 1.0);
	
	
	vLightProbe = aLightProbe;

	vEye = aPos - anglePos ; 

	//float vS=length(aSvec);
	//float vT=length(aTvec);
	vSvec=aSvec;
	vTvec=aTvec;

	vNormpow = uNormpow *0.1/ max(length(vSvec),length(vTvec));

}


[fragmentshader]#version 300 es
precision mediump float; 
#include(common)
in lowp vec2 vUv; 
in lowp vec3 vEye; 
in mediump vec3 vNormal; 
in highp float vz;
in lowp float vEnvRatio;  
in float vNormpow; 
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

 
uniform lowp float uMetallic; 

uniform sampler2D uPbrMap; 

in lowp vec3 vLightProbe; 


uniform sampler2D uTransMap; 
uniform lowp float uOpacity; 

uniform vec4 uPbr; 
uniform mat3 uViewMat; 
uniform vec3 uBaseCol; 
uniform sampler2D uBaseColMap; 

uniform sampler2D uNormalMap; 
in mediump vec3 vSvec; 
in mediump vec3 vTvec; 
uniform lowp float uHeightBase;


layout (location = 0) out uvec4 out_color;
layout (location = 1) out vec4 out_normal;
layout (location = 2) out vec4 out_pbr;
layout (location = 3) out vec4 out_base_color;
layout (location = 4) out float out_depth;

 float rand(vec2 p) {
     return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
 }
   const float B = (sqrt(3.0)-3.0)/6.0;
   const float B_ = (sqrt(3.0)-1.0)*0.5;
   const float SCALE = sqrt(1.0 + 2.0*B +2.0*B *B);
   const float BLEND_WIDTH = 0.2;
   const float DIVNUM = 1.0;


vec4 calcParam(vec2 uv,vec2 idx){
		vec2 pos = (idx + (idx.x+idx.y)*B);
		  vec2 fraction = uv - pos;
      float rot = rand(idx) * 6.28 ;
	  mat2 mat = mat2(cos(rot), sin(rot), -sin(rot), cos(rot));
      vec2 u = vec2(rand(idx), rand(idx * 100.0)) + mat * (fraction) / DIVNUM;
      float l = clamp((1.0+BLEND_WIDTH-(length(fraction) *2.0/ SCALE))/ BLEND_WIDTH, 0.0, 1.0); 
	  return vec4(u.x,u.y,rot,l);
}

vec4[3] calcHexParams(vec2 uv){
      vec2 idx = floor((uv+ (uv.x + uv.y) * B_) );
	vec2 pos = (idx + (idx.x+idx.y)*B);
      float flg = step((uv-pos).x-(uv-pos).y,0.0); 
	  vec4[3] uvs;

	  uvs[0] = calcParam(uv,idx);
	  uvs[1] = calcParam(uv,idx+1.0);
	  uvs[2] = calcParam(uv,idx+vec2(1.0-flg,flg));
	  float p = 1.0/(uvs[0].w + uvs[1].w+uvs[2].w);
	  uvs[0].w *= p;
	  uvs[1].w *= p;
	  uvs[2].w *= p;

//	  uvs[1].w = 0.0;
//	  uvs[2].w = 0.0;
//	  uvs[0] = vec4(uv.x,uv.y,0.0,1.0);
	  return uvs;
}

float getHeight(vec2 uv){

	vec4[3] hexParams = calcHexParams(uv);
	float height  = 0.0;
	for(int i=0;i<3;i++){
		height += texture(uNormalMap,hexParams[i].xy).w * hexParams[i].w; 
	}
	//height = texture(uNormalMap,uv).w;
	return height;
}
vec3 getNormal(vec2 uv){

	vec4[3] hexParams = calcHexParams(uv);
	vec3 ret = vec3(0.0);
	mat3 m = mat3(normalize(vSvec),normalize(vTvec) ,vNormal);
	for(int i=0;i<3;i++){

		vec3 q = texture(uNormalMap,hexParams[i].xy).xyz; 
		float rot = -hexParams[i].z;
		q.x = 1.0-q.x;
		mat2 mat = mat2(cos(rot), sin(rot), -sin(rot), cos(rot));
		q.xy = mat * (q*2.0-1.0).rg;
		ret += q.xyz * hexParams[i].w;
	}
	//ret.z = sqrt(1.0-ret.x*ret.x-ret.y*ret.y);
	ret = m*ret; 
	ret = normalize(ret);
	return ret;
}
void main(void){ 
	lowp vec3 eye = normalize(vEye); 
	lowp vec3 true_eye = vEye;
	lowp vec4 q;
	lowp vec2 uv = vUv;
	lowp vec3 eye_v2 = vec3(0.0);
	mediump float depth=0.0;
	highp vec3 nrm = vNormal;

	/*視差*/ 
	vec3 norm2 = -normalize(cross(vSvec,vTvec));
	vec2 hoge;
	float scale = vNormpow / dot(norm2,eye);
	hoge.x = dot(vSvec,eye)*scale;
	hoge.y = dot(vTvec,eye)*scale;
	float hogez = 0.0;

	const int loop_max = 4;
	float step = 1.0/float(loop_max);
	depth = -uHeightBase;
	float last_depth = depth;
	float last_true_depth = (1.0-getHeight( uv+ hoge  * depth))-uHeightBase;
	float over_true_depth;

	for(int i=0;i<loop_max ;i++){
		depth +=step;
		float true_depth = (1.0-getHeight(uv+ hoge  * depth))-uHeightBase;
		if(depth>true_depth ){
			over_true_depth = true_depth;
			break;
		}
		last_depth = depth;
		last_true_depth =  true_depth;
	}
	for(int i=0;i<4;i++){
		step*=0.5;
		float true_depth = (1.0-getHeight( uv+ hoge  * (depth-step)))-uHeightBase;
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

	vec4[3] hexParams = calcHexParams(uv);

	/*ノーマルマップ*/ 
	nrm = getNormal(uv);

	vec4 pbr;
	pbr = uPbr; 

	pbr *= texture(uPbrMap,uv) ; 

	float specular= pbr.x; 
	float roughness = pbr.y; 
	float transparent_roughness = pbr.z; 
	float refractPower = pbr.w; 


	/*ベースカラー*/ 
	q = vec4(0.0);
	for(int i=0;i<3;i++){
		q += texture(uBaseColMap,hexParams[i].xy) * hexParams[i].w; 
	}
	//q =  texture(uBaseColMap,uv); 
	float occlusion = q.a;
	vec3 baseCol = uBaseCol * q.rgb*occlusion; 

	float opacity = 1.0;
	//opacity = uOpacity * q.a;


vec3 lightmap;
	lightmap=vLightProbe;


	vec4 ray;
	ray = projectionMatrix * vec4(true_eye+ anglePos,1.0);
	float vzz = (ray.z/ray.w);
	out_color = uvec4(packHalf2x16((true_eye).xy),packHalf2x16(vec2(true_eye.z,lightmap.b))
,floatBitsToUint(vzz),packHalf2x16(lightmap.rg));
	out_base_color = encode(baseCol);
	out_normal = vec4(nrm*0.5+0.5,opacity);
	pbr.w = pbr.w - 1.0;
	out_pbr = pbr;
	out_depth = vzz*0.5+0.5;
} 
