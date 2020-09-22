[vertexshader]
precision lowp float; 
attribute lowp vec3 aPos; 
attribute lowp vec3 aNormal; 
attribute lowp vec2 aUv; 
attribute lowp float aEnvRatio;  
uniform int uEnvIndex;  
uniform mat4 projectionMatrix; 
uniform vec3 anglePos;  
varying lowp vec3 vEye; 
varying lowp vec3 vPos; 
varying lowp vec2 vUv; 
varying mediump vec3 vNormal; 
varying float vEnvRatio;  

/*[lightprobe]
attribute lowp vec3 aLightProbe;  
[lightprobe]*/

/*[lightmap]
attribute vec2 aUv2; 
varying lowp vec2 vUv2; 
[lightmap]*/

/*[height]
attribute vec3 aSvec; 
attribute vec3 aTvec; 
varying mediump vec3 vSvec; 
varying mediump vec3 vTvec; 
uniform float uNormpow; 
varying mediump float vNormpow; 
[height]*/

/*[lightprobe]
varying vec3 vLightProbe; 
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
	vSvec=aSvec - dot(aNormal,aSvec)*aNormal;
	vTvec=aTvec - dot(aNormal,aTvec)*aNormal;
	vNormpow=  max(vS,vT)*uNormpow;
	vSvec=normalize(vSvec)/vS;
	vTvec=normalize(vTvec)/vT;
[height]*/

}



[fragmentshader]
varying lowp vec3 vPos; 
varying lowp vec2 vUv; 
varying lowp vec3 vEye; 
varying mediump vec3 vNormal; 
varying lowp float vEnvRatio;  
uniform float uEnvRatio; 
uniform lowp float uEmi; 
uniform lowp mat4 lightMat; 
uniform lowp vec3 uLight; 
uniform lowp vec3 uLightColor; 
uniform sampler2D uShadowmap; 
uniform sampler2D uEnvMap;  

 
/*[reflect]
uniform lowp float uMetallic; 
[reflect]*/

/*[pbr]
uniform sampler2D uPbrMap; 
[pbr]*/

/*[lightprobe]
varying lowp vec3 vLightProbe; 
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
varying mediump vec3 vSvec; 
varying mediump vec3 vTvec; 
varying mediump float vNormpow; 
uniform lowp float uHeightBase;
[height]*/
//uniform lowp float lightThreshold1; 
//uniform lowp float lightThreshold2; 

/*[lightmap]
uniform sampler2D uLightMap;  
varying lowp vec2 vUv2; 
[lightmap]*/

float checkShadow(sampler2D shadowmap,vec2 uv,float z){
	return max(0.0,sign(unpackUFP16(texture2D(shadowmap,uv).rg) - z)); 
}
void main(void){ 
	lowp vec3 eye = normalize(vEye); 
	lowp vec4 q;
	lowp vec2 uv = vUv;
	lowp vec3 eye_v2 = vec3(0.0);
	mediump float depth=0.0;
	lowp vec3 nrm = vNormal;

/*[height]
	/*視差*/ 
	eye_v2 = (eye/dot(vNormal,eye)  - vNormal)*vNormpow; //面と水平方向の視差
	//vec2 hoge = vec2(dot(vSvec,eye_v2),dot(vTvec,eye_v2));
	vec2 hoge = (mat3(vSvec,vTvec,vec3(0.0))*eye_v2).xy;

	float height_offset=uHeightBase;
	float step = -1.0/4.0;
	depth = (1.0-height_offset)-step;
	float truedepth=height_offset;
	float prev_depth;
	float prev_truedepth;
	for(int i=0;i<4+1 ;i++){
		if(depth>truedepth ){
			prev_truedepth=truedepth;
			prev_depth=depth;
			depth +=step;
			truedepth = texture2D(uNormalMap, uv+ hoge  * depth).w-height_offset;
		}
	}
	
	depth = depth+(prev_depth-depth)*((depth-truedepth)/((prev_truedepth -prev_depth)+(depth-truedepth)));

	uv +=  hoge  * depth;

	/*ノーマルマップ*/ 
	q = texture2D(uNormalMap,uv); 
	nrm = normalize(mat3(vSvec*vNormpow,vTvec*vNormpow,vNormal)* (q*2.0-1.0).rgb); 

[height]*/

	/*乱反射強度*/ 
	float diffuse = max(-dot(nrm,uLight),0.0); 

	/*影判定*/ 
	vec4 lightPos=  vec4(vPos + depth*(eye_v2),1.0); 
	lightPos= lightMat* lightPos;
	lightPos.xy/=lightPos.w;
	highp float shadowmap=decodeShadow(uShadowmap,vec2(1024.0),(lightPos.xy+1.0)*0.5); 
	highp float nowz = (lightPos.z+1.0)*0.5;
	if(nowz   < shadowmap){
		shadowmap=1.0;
	}else{
		float offset= (nowz -shadowmap)*0.1;
		vec2 current = (lightPos.xy+1.0)*0.5;
		shadowmap=checkShadow(uShadowmap,current+vec2(1.0,0.0)*offset, nowz)
			+checkShadow(uShadowmap,current+vec2(-1.0,0.0)*offset, nowz)
			+checkShadow(uShadowmap,current+vec2(0.0,1.0)*offset, nowz) 
			+checkShadow(uShadowmap,current+vec2(0.0,-1.0)*offset, nowz)

			+checkShadow(uShadowmap,current+vec2(0.7,-0.7)*offset, nowz)
			+checkShadow(uShadowmap,current+vec2(-0.7,-0.7)*offset, nowz)
			+checkShadow(uShadowmap,current+vec2(0.7,0.7)*offset, nowz) 
			+checkShadow(uShadowmap,current+vec2(-0.7,0.7)*offset, nowz); 
		shadowmap=min(1.0,shadowmap*2.0/9.0);
	}
	diffuse *= shadowmap;

	/*拡散反射+環境光+自己発光*/ 
	vec3 vColor2 = diffuse*uLightColor + uEmi;


	q = uPbr; 
/*[pbr]
	/*pbr*/ 
	q *= texture2D(uPbrMap,uv) ; 
[pbr]*/
	float specular= q.x; 
	float roughness = q.y; 
	float transparent_roughness = q.z; 
	float refractPower = q.w; 


	/*ベースカラー*/ 
	q= texture2D(uBaseColMap,uv); 
	vec3 baseCol = uBaseCol * texture2D(uBaseColMap,uv).rgb; 

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
	vColor2+=textureRGBE(uLightMap,vec2(256.0),vUv2).rgb ;
[lightmap]*/

	vColor2 = vColor2 * baseCol;

/*[transmission]
	/*透過合成*/ 
	/*屈折*/ 
	refx = min(floor(transparent_roughness/0.2),3.0); 
	refa = (transparent_roughness-refx*0.2)/0.2; 
	refa = min(refa,1.0); 
	angle = nrm;normalize(uViewMat * nrm); 
	refV = gl_FragCoord.xy/1024.0+angle.xy*(1.0-refractPower)*0.2; 
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
	refx = floor(sqrt(roughness/0.06)); 
	refa = (roughness -refx*refx*0.06)/((((1.0+refx)*(1.0+refx))-refx*refx)*0.06); 
	refa = min(refa,1.0); 
	refV = angle2uv(angle) * vec2(1.0,0.5); 
	vec3 refCol = textureTri(uEnvMap,vec2(256.0),refV,refx+refa) ;

	/*全反射合成*/ 
	vColor2 = mix(mix(vColor2,baseCol *refCol ,uMetallic),refCol,specular); 
[reflect]*/


	/*スケーリング*/ 
	gl_FragColor = encode(vColor2 * vEnvRatio); 
} 
