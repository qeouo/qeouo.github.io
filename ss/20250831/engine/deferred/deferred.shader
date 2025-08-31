[vertexshader]#version 300 es
precision mediump float; 
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
precision mediump float; 
precision mediump usampler2D;
#include(../../lib/shader/common)
#include(../../lib/shader/rgbe)
in vec2 vPos; 
in vec2 vUv; 
uniform vec3 anglePos;  
uniform mat4 projectionMatrix; 
 

uniform sampler2D uBaseColMap; 
uniform sampler2D uNormalMap; 
uniform sampler2D uPbrMap; 
uniform sampler2D uEnvMap;  
uniform sampler2D uDepthMap; 
uniform usampler2D uPosMap; 
uniform sampler2D uTransMap; 
uniform mat4 lightMat; 
uniform vec2 uResolution;

layout (location = 0) out vec4 out_color;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

int maxstep=8;
float STEP_SIZE= 1.0/8.0;
int NIBUN = 16;
float[] bayer = float[](
    0.0,      0.5,      0.125,    0.625,    0.03125,  0.53125,  0.15625,  0.65625,
    0.75,     0.25,     0.875,    0.375,    0.78125,  0.28125,  0.90625,  0.40625,
    0.1875,   0.6875,   0.0625,   0.5625,   0.21875,  0.71875,  0.09375,  0.59375,
    0.9375,   0.4375,   0.8125,   0.3125,   0.96875,  0.46875,  0.84375,  0.34375,
    0.046875, 0.546875, 0.171875, 0.671875, 0.015625, 0.515625, 0.140625, 0.640625,
    0.796875, 0.296875, 0.921875, 0.421875, 0.765625, 0.265625, 0.890625, 0.390625,
    0.234375, 0.734375, 0.109375, 0.609375, 0.203125, 0.703125, 0.078125, 0.578125,
    0.984375, 0.484375, 0.859375, 0.359375, 0.953125, 0.453125, 0.828125, 0.328125
);
 vec3 raytrace( vec3 pos, vec3 angle,float rough){
	// pos レイ始点
	// angle レイ発射方向
	// rough 表面粗度
	vec4 ray;
	vec2 ray2;

	//始点を[-1,1]の座標系に変換
	ray = projectionMatrix * vec4(pos,1.0);
	vec3 start = ray.xyz/ray.w;

	//視点からレイを飛ばした際のスクリーン上での距離
	ray = projectionMatrix * vec4(pos+angle,1.0);
	vec3 dir = ray.xyz/ray.w - start;
	ray2 = sign(dir.xy) - start.xy;
	ray2 = (ray2/dir.xy);
	dir *= min(ray2.x,ray2.y);


	ivec2 pixel = ivec2(gl_FragCoord.xy);
	float dither = bayer[(pixel.x & 7) << 3 | (pixel.y & 7)];
	float n;
	float step_size = STEP_SIZE;
	n = dither * step_size;

	float last_z=1.0;
	vec3 last_ray;
	vec2 reso = 0.5 * uResolution /1024.0;
	for(int i=0;i<maxstep;i++){
		vec3 vppos = dir* n + start; 
		float z = texture(uDepthMap,(vppos.xy+1.0)*reso).r;
		last_z = z;

		if(vppos.z -z >=0.0 ){
			break;
		}
		n+=step_size;
	}

	for(int i=0;i<NIBUN;i++){
		step_size*=0.5;
		vec3 vppos =dir* (n -step_size) + start; 
		float z = texture(uDepthMap,(vppos.xy+1.0)*reso).r;

		if(vppos.z -z >=0.0 ){
			last_z = z;
			n-=step_size;
		}
	}
	ray.xyz =dir* (n ) + start; 

	float ratio = clamp(1.0-(ray.z -last_z)*100.0,0.0,1.0);
	ratio *= 1.0-clamp((last_z-0.99)*100.0,0.0,1.0);

	// レンダリング結果参照
	ray2 = (ray.xy+ 1.0) * 0.5 * vec2(1.0,0.5)   ;
	vec3 ref_col = textureTri(uTransMap,vec2(1024.0),ray2,rough); 
	
	// 反射プローブ参照
	ray2 = angle2uv(angle) * vec2(1.0,0.5); 
	vec3 env_col = textureTri(uEnvMap,vec2(256.0),ray2,rough) ;

	ray2 = abs(ray.xy);
	n =clamp((1.0 - max(ray2.x,ray2.y))*9.0,0.0,1.0); 
	ratio *=n;
	return mix(env_col,ref_col,ratio);
}
void main(void){ 

	vec3 result;
	

	/*カラーマップ*/ 
	vec3 basecol = decode(texture(uBaseColMap,vUv)); 

	/*ノーマルマップ*/ 
	vec3 normal = (texture(uNormalMap,vUv).rgb-0.5)*2.0; 
	if(normal.x <-0.9 && normal.y <=-0.9 && normal.z <=0.9){
		out_color = vec4(basecol,0.0);
		return;
	}
	float opacity = texture(uNormalMap,vUv).a;

	/**/ 
	//vec3 eye = (texture(uPosMap,vUv).rgb-0.5)*2.0;
	uvec4 ueye = texture(uPosMap,vUv);
	vec3 relativePos;
	relativePos.xy = unpackHalf2x16(ueye.x);
	relativePos.z = unpackHalf2x16(ueye.y).x;
	 vec3 eye;
	eye = normalize(relativePos);
	//eye = uintBitsToFloat(ueye.rgb);
	//depth =  ((100.0+ 1.0 - depth * (100.0 - 1.0)))/(2.0 * 1.0) ;
	//depth = 1.0/depth;
	//depth = depth*5.0-0.8;
	/*vec4 pos = projectionMatrix * vec4(vPos,depth,1.0);*/

	//vec3 eye = normalize(anglePos);


	/*pbr*/ 
	vec4 pbr = texture(uPbrMap,vUv); 
	float specular= pbr.x; 
	float roughness = pbr.y; 
	float transparent_roughness = pbr.z; 
	float refractPower = pbr.w+1.0; 
	float metallic = 0.0;


	float refx,refa;
	vec3 angle;
	vec2 refV;
	vec3 pos;

	/*透過合成*/ 
	/*屈折*/ 

		pos =( relativePos + anglePos);
	if(opacity < 1.0){
		transparent_roughness=0.0;
		refx = min(floor(transparent_roughness/0.2),3.0); 
		refa = (transparent_roughness-refx*0.2)/0.2; 
		refa = min(refa,1.0); 

		//angle = refract(eye,normal,1.0/refractPower);
		angle = refract(eye,normal,1.0/1.05);
		vec3 transCol = raytrace(pos,angle,refx+refa);
		result = mix(transCol*basecol,result, opacity); 
	}

	/*全反射*/ 
	angle = reflect(eye,normal); 

	refx = floor((roughness*4.0)); 
	refa = (roughness -refx/4.0)/((((1.0+refx))-refx)/4.0); 
	refa = min(refa,1.0); 


	if(specular>0.0){
		vec3 refcol = raytrace(pos,angle,refx+refa);


		/*全反射合成*/ 
		result = mix(mix(result,basecol *refcol ,metallic),refcol,specular); 
	}
		

	/*スケーリング*/ 
	//out_color = encode(result); 
	//out_color = uvec4(result*65536.0,0.0); 

	//out_color = vec4(vec3(dot(relativePos,viewPos)-20.0)*0.1,0.0) ;
	out_color = vec4(result,0.0) ;
	//out_color = vec4(result,0.0) ;
	//out_color = uvec4(result.rgb*65536.0,0); 
} 
