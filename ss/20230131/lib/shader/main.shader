[vertexshader]#version 300 es
precision lowp float; 
in lowp vec3 aPos; 
in lowp vec3 aNormal; 
in lowp vec2 aUv; 
in lowp float aEnvRatio;  
uniform int uEnvIndex;  
uniform mat4 projectionMatrix; 
uniform vec3 anglePos;  
out lowp vec3 vEye; 
out lowp vec3 vPos; 
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
uniform float uNormpow; 
out mediump float vNormpow; 
[height]*/

/*[lightprobe]
out vec3 vLightProbe; 
[lightprobe]*/

void main(void){ 
	gl_Position = projectionMatrix * vec4(aPos,1.0); 
	vUv = aUv; 
	vNormal=aNormal;
	vEnvRatio= 1.0- aEnvRatio + float(uEnvIndex)*(2.0*aEnvRatio - 1.0);
	vPos = aPos; 
	
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
//	vSvec=aSvec - dot(aNormal,aSvec)*aNormal;
//	vTvec=aTvec - dot(aNormal,aTvec)*aNormal;
	//vSvec=normalize(aSvec)/vS;
	//vTvec=normalize(aTvec)/vT;
	vSvec=aSvec/(vS);
	vTvec=aTvec/(vT);

	vNormpow=  uNormpow;
[height]*/

}



[fragmentshader]#version 300 es
in lowp vec3 vPos; 
in lowp vec2 vUv; 
in lowp vec3 vEye; 
in mediump vec3 vNormal; 
in lowp float vEnvRatio;  
uniform float uEnvRatio; 
uniform lowp float uEmi; 
uniform lowp mat4 lightMat; 
uniform lowp vec3 uLight; 
uniform lowp vec3 uLightColor; 
uniform sampler2D uShadowmap; 
uniform sampler2D uEnvMap;  
uniform highp vec2 uResolution;

 
/*[reflect]
uniform lowp float uMetallic; 
[reflect]*/

/*[pbr]
uniform sampler2D uPbrMap; 
[pbr]*/

/*[lightprobe]
in lowp vec3 vLightProbe; 
[lightprobe]*/


/*[transmission]
uniform sampler2D uTransMap; 
uniform lowp float uOpacity; 
[transmission]*/

uniform vec4 uPbr; 
uniform mat3 uViewMat; 
uniform vec3 uBaseCol; 
uniform sampler2D uBaseColMap; 
/*[height]
uniform sampler2D uNormalMap; 
in mediump vec3 vSvec; 
in mediump vec3 vTvec; 
in mediump float vNormpow; 
uniform lowp float uHeightBase;
[height]*/
//uniform lowp float lightThreshold1; 
//uniform lowp float lightThreshold2; 

/*[lightmap]
uniform sampler2D uLightMap;  
in lowp vec2 vUv2; 
[lightmap]*/

layout (location = 0) out vec4 out_color;
layout (location = 1) out vec4 out_normal;
float checkShadow(sampler2D shadowmap,vec2 uv,float z){
	return max(0.0,sign(unpackUFP16(texture(shadowmap,uv).rg) - z)); 
}
void main(void){ 
	lowp vec3 eye = normalize(vEye); 
	lowp vec4 q;
	lowp vec2 uv = vUv;
	lowp vec3 eye_v2 = vec3(0.0);
	mediump float depth=0.0;
	highp vec3 nrm = vNormal;

/*[height]
	/*視差*/ 
	vec3 norm2 = normalize(cross(vSvec,vTvec));
	if(dot(norm2,vNormal)<0.0){
		norm2 *= -1.0;
	}
	eye_v2 = (eye/dot(norm2 ,eye)  - norm2)*vNormpow; //面と水平方向の視差
	vec2 hoge = vec2(dot(vSvec,eye_v2),dot(vTvec,eye_v2))*0.05;
	//vec2 hoge = (mat3(vSvec,vTvec,vec3(0.0))*eye_v2).xy;

	float height_offset=uHeightBase;
	const int loop_max = 8;
	float step = 1.0/float(loop_max);
	depth = -height_offset;
	float truedepth=depth+1.0;
	float prev_depth;
	float prev_truedepth;
	truedepth = (1.0-texture(uNormalMap, uv+ hoge  * depth).w)-height_offset;
	for(int i=0;i<loop_max ;i++){
		if(depth<truedepth ){
			prev_truedepth=truedepth;
			prev_depth=depth;
			depth +=step;
			truedepth = (1.0-texture(uNormalMap, uv+ hoge  * depth).w)-height_offset;
		}
	}
	
	depth += -step*((depth-truedepth)/((prev_truedepth -prev_depth)+(depth-truedepth)));

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

	/*乱反射強度*/ 
	float diffuse = max(-dot(nrm,uLight),0.0); 

	/*影判定*/ 
	vec4 lightPos=  vec4(vPos - depth*(eye_v2),1.0); 
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
	vec3 vColor2 = diffuse*uLightColor* shadow_a + uEmi;


	q = uPbr; 
/*[pbr]
	/*pbr*/ 
	q *= texture(uPbrMap,uv) ; 
[pbr]*/
	float specular= q.x; 
	float roughness = q.y; 
	float transparent_roughness = q.z; 
	float refractPower = q.w; 


	/*ベースカラー*/ 
	q= texture(uBaseColMap,uv); 
	vec4 color_map_data =  texture(uBaseColMap,uv); 
	float occlusion = color_map_data.a;
	vec3 baseCol = uBaseCol * color_map_data.rgb; 

/*[transmission]
	float opacity = uOpacity * q.a;
[transmission]*/


	float refx,refa;
	vec3 angle;
	vec2 refV;



/*[lightprobe]
	vColor2+=vLightProbe;
[lightprobe]*/

/*[lightmap]
	vColor2 +=textureDecode(uLightMap,vec2(128.0),uv); 
[lightmap]*/

	vColor2 = vColor2 * baseCol;

/*[transmission]
	/*透過合成*/ 
	/*屈折*/ 
	refx = min(floor(transparent_roughness/0.2),3.0); 
	refa = (transparent_roughness-refx*0.2)/0.2; 
	refa = min(refa,1.0); 
	angle = nrm;//normalize(uViewMat * nrm); 
	vec2 reso = vec2(1.0,0.5);
	refV = gl_FragCoord.xy/uResolution * reso+ angle.xy*(1.0-refractPower)*0.2; 
	highp vec3 transCol = textureTri(uTransMap,vec2(1024.0),refV,refx+refa); 
	vColor2 = mix(vColor2, transCol * baseCol,1.0 - opacity); 
[transmission]*/

/*[reflect]

/*[transmission]
	/* フレネル */ 
	specular +=  max(specular,1.0-opacity)*(1.0 - specular)*pow(1.0 + min(dot(eye,nrm),0.0),5.0); 
[transmission]*/

	/*全反射*/ 
	angle = reflect(eye,nrm); 
	refx = floor((roughness*4.0)); 
	refa = (roughness -refx/4.0)/((((1.0+refx))-refx)/4.0); 
	refa = min(refa,1.0); 
	refV = angle2uv(angle) * vec2(1.0,0.5); 
	vec3 refCol = textureTri(uEnvMap,vec2(256.0),refV,refx+refa) ;

	/*全反射合成*/ 
	vColor2 = mix(mix(vColor2,baseCol *refCol ,uMetallic),refCol,specular); 
[reflect]*/


	/*スケーリング*/ 
	out_color = encode(vColor2 * occlusion * vEnvRatio); 
	out_normal = encode(vec3(0.5,0.5,0.5));
} 
