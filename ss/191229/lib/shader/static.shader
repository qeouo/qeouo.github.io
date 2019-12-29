[vertexshader]
precision lowp float; 
attribute vec3 aPos; 
attribute vec3 aNormal; 
attribute vec3 aSvec; 
attribute vec3 aTvec; 
attribute vec2 aUv; 
attribute vec2 aUv2; 
attribute float aEnvRatio;  
attribute vec3 aLightProbe;  
varying vec2 vUv; 
varying vec2 vUv2; 
varying vec3 vEye; 
varying vec3 vPos; 
varying mediump vec3 vNormal; 
varying mediump vec3 vSvec; 
varying mediump vec3 vTvec; 
varying float vEnvRatio;  
varying vec3 vLightProbe; 
varying mediump float vNormpow; 
uniform int uEnvIndex;  
uniform mat4 projectionMatrix; 
uniform vec3 anglePos;  
uniform float uNormpow; 
void main(void){ 
	gl_Position = projectionMatrix * vec4(aPos,1.0); 
	vUv = aUv; 
	vUv2 = aUv2; 
	vEye = aPos - anglePos ; 
	float vS=length(aSvec);
	float vT=length(aTvec);
	vSvec=aSvec - dot(aNormal,aSvec)*aNormal;
	vTvec=aTvec - dot(aNormal,aTvec)*aNormal;
	vNormpow=  max(vS,vT)*uNormpow;
	vSvec=normalize(vSvec)/vS;
	vTvec=normalize(vTvec)/vT;
	vNormal=aNormal;

	vEnvRatio= 1.0- aEnvRatio + float(uEnvIndex)*(2.0*aEnvRatio - 1.0);
	vPos = aPos; 
	vLightProbe = aLightProbe;
} 

[fragmentshader]
precision lowp float; 
varying vec3 vPos; 
varying vec2 vUv; 
varying vec2 vUv2; 
varying vec3 vEye; 
varying mediump vec3 vNormal; 
varying mediump vec3 vSvec; 
varying mediump vec3 vTvec; 
varying float vEnvRatio;  
varying vec3 vLightProbe; 
varying mediump float vNormpow; 

uniform float uHeightBase;
uniform mat4 lightMat; 
uniform vec3 uLight; 
uniform vec3 uLightColor; 
uniform sampler2D uShadowmap; 
uniform sampler2D uLightMap;  
uniform sampler2D uEnvMap;  
uniform sampler2D uTransMap; 
uniform float uEnvRatio; 
uniform sampler2D uPbrMap; 
uniform vec4 uPbr; 
uniform mat3 uViewMat; 
uniform vec3 uBaseCol; 
uniform sampler2D uBaseColMap; 
uniform sampler2D uNormalMap; 
uniform float uOpacity; 
uniform float uEmi; 
uniform float lightThreshold1; 
uniform float lightThreshold2; 
uniform float uMetallic; 

[common]
float checkShadow(sampler2D shadowmap,vec2 uv,float z){
	//return max(0.0,sign(decodeShadow(shadowmap,vec2(1024.0),uv).r - z)); 
	return max(0.0,sign(unpackUFP16(texture2D(shadowmap,uv).rg) - z)); 
}
void main(void){ 
	vec3 eye = normalize(vEye); 
	vec4 q;

	/*視差*/ 
	vec3 eye_v2 = (eye / dot(vNormal,eye) - vNormal)*vNormpow;
	vec2 hoge = vec2(dot(vSvec,eye_v2),dot(vTvec,eye_v2));

	float hight_offset=uHeightBase;
	float step = -1.0/4.0;
	float depth = (1.0-hight_offset)-step;
	float truedepth=hight_offset;
	float prev_depth;
	float prev_truedepth;
	for(int i=0;i<4+1 ;i++){
		if(depth>truedepth ){
			prev_truedepth=truedepth;
			prev_depth=depth;
			depth +=step;
			truedepth = texture2D(uNormalMap, vUv + hoge  * (depth)).w-hight_offset;
		}
	}
	
	depth = depth+(prev_depth-depth)*((depth-truedepth)/((prev_truedepth -prev_depth)+(depth-truedepth)));

	vec2 uv = vUv + hoge  * depth;



	/*pbr*/ 
	q = texture2D(uPbrMap,uv) * uPbr; 
	float specular= q.x; 
	float rough = q.y; 
	float transRough = q.z; 
	float refractPower = q.w; 

	/*ノーマルマップ*/ 
	q = texture2D(uNormalMap,uv); 
	vec3 nrm = normalize(mat3(vSvec*vNormpow,vTvec*vNormpow,vNormal)* (q*2.0-1.0).rgb); 

	/*ベースカラー*/ 
	q= texture2D(uBaseColMap,uv); 
	vec3 baseCol = uBaseCol * texture2D(uBaseColMap,uv).rgb; 
	float opacity = uOpacity * q.a;


	/*全反射*/ 
	vec3 angle = reflect(eye,nrm); 
	float refx = floor(sqrt(rough/0.06)); 
	float refa = (rough -refx*refx*0.06)/((((1.0+refx)*(1.0+refx))-refx*refx)*0.06); 
	refa = min(refa,1.0); 
	vec2 refV = angle2uv(angle) * vec2(1.0,0.5); 
	highp vec3 refCol = textureTri(uEnvMap,vec2(256.0),refV,refx+refa) ;

	/*屈折*/ 
	refx = min(floor(transRough/0.2),3.0); 
	refa = (transRough-refx*0.2)/0.2; 
	refa = min(refa,1.0); 
	angle = normalize(uViewMat * nrm); 
	refV = gl_FragCoord.xy/1024.0+angle.xy*(1.0-refractPower)*0.2; 
	highp vec3 transCol = textureTri(uTransMap,vec2(1024.0),refV,refx+refa); 
	transCol *=  baseCol; 

	/*乱反射強度*/ 
	float diffuse = max(-dot(nrm,uLight),0.0); 
	diffuse = clamp((diffuse-lightThreshold1)*lightThreshold2,0.0,1.0); 

	/*影判定*/ 
	vec4 lightPos=  vec4(vPos + depth*(eye_v2),1.0); 
	lightPos= lightMat* lightPos;
	lightPos.xy/=lightPos.w;
	highp float shadowmap; 
	//shadowmap=decodeFull_(texture2D(uShadowmap,(lightPos.xy+1.0)*0.5)); 
	shadowmap=decodeShadow(uShadowmap,vec2(1024.0),(lightPos.xy+1.0)*0.5); 
	highp float shadow_a = (1.0-sign((lightPos.z+1.0)*0.5 -(1.0/65535.0) -shadowmap))*0.5;
	highp float nowz = (lightPos.z+1.0)*0.5;
	if(nowz   < shadowmap ){
		shadow_a=1.0;
	}else{
		float offset= (nowz -shadowmap)*0.1;
		float sum=checkShadow(uShadowmap,(lightPos.xy+1.0)*0.5+vec2(1.0,0.0)*offset, nowz)
			+checkShadow(uShadowmap,(lightPos.xy+1.0)*0.5+vec2(-1.0,0.0)*offset, nowz)
			+checkShadow(uShadowmap,(lightPos.xy+1.0)*0.5+vec2(0.0,1.0)*offset, nowz) 
			+checkShadow(uShadowmap,(lightPos.xy+1.0)*0.5+vec2(0.0,-1.0)*offset, nowz)

			+checkShadow(uShadowmap,(lightPos.xy+1.0)*0.5+vec2(0.7,-0.7)*offset, nowz)
			+checkShadow(uShadowmap,(lightPos.xy+1.0)*0.5+vec2(-0.7,-0.7)*offset, nowz)
			+checkShadow(uShadowmap,(lightPos.xy+1.0)*0.5+vec2(0.7,0.7)*offset, nowz) 
			+checkShadow(uShadowmap,(lightPos.xy+1.0)*0.5+vec2(-0.7,0.7)*offset, nowz); 
		shadow_a=sum/9.0;
		shadow_a=min(1.0,shadow_a*2.0);
	}

	diffuse = shadow_a * diffuse; 


	/*拡散反射+環境光+自己発光*/ 
	vec3 vColor2 = diffuse*uLightColor
		+ textureRGBE(uLightMap,vec2(256.0),vUv2).rgb
		;
	vColor2 = vColor2 * baseCol;


	/*透過合成*/ 
	vColor2 = mix(vColor2,transCol,1.0 - opacity); 

	/* フレネル */ 
	specular +=  max(specular,1.0-opacity)*(1.0 - specular)*pow(1.0 + min(dot(eye,nrm),0.0),5.0); 

	/*全反射合成*/ 
	vColor2 = mix(vColor2,refCol,specular); 

	/*スケーリング*/ 
	gl_FragColor = encode(vColor2 * vEnvRatio); 
} 
