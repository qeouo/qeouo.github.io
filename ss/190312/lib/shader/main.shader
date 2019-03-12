[vertexshader]
precision lowp float; 
attribute vec3 aPos; 
attribute vec3 aNormal; 
attribute vec3 aSvec; 
attribute vec3 aTvec; 
attribute vec2 aUv; 
attribute vec2 aUv2; 
attribute float aEnvRatio;  
varying vec2 vUv; 
varying vec2 vUv2; 
varying vec3 vEye; 
varying mat3 vView; 
varying vec3 vLightPos; 
varying float vEnvRatio;  
uniform int uEnvIndex;  
uniform mat4 projectionMatrix; 
uniform mat4 lightMat; 
uniform vec3 anglePos;  
void main(void){ 
	gl_Position = projectionMatrix * vec4(aPos,1.0); 
	vUv = aUv; 
	vUv2 = aUv2; 
	vLightPos= (lightMat * vec4(aPos,1.0)).xyz; 
	vEye = aPos - anglePos ; 
	vView = mat3(normalize(aSvec - dot(aNormal,aSvec)*aNormal) 
		,normalize(aTvec - dot(aNormal,aTvec)*aNormal) 
		,aNormal); 
	vEnvRatio= 1.0- aEnvRatio + float(uEnvIndex)*(2.0*aEnvRatio - 1.0);
} 

[fragmentshader]
precision lowp float; 
varying vec2 vUv; 
varying vec2 vUv2; 
varying vec3 vEye; 
varying mat3 vView; 
varying vec3 vLightPos; 
varying float vEnvRatio;  

uniform vec3 uLight; 
uniform vec3 uLightColor; 
uniform vec3 uAmbColor; 
uniform sampler2D uShadowmap; 
uniform sampler2D uEnvMap;  
uniform sampler2D uTransMap; 
uniform float uEnvRatio; 
uniform sampler2D uLightMap;  

uniform sampler2D uPbrMap; 
uniform vec4 uPbr; 
uniform mat3 uViewMat; 
uniform vec3 uBaseCol; 
uniform sampler2D uBaseColMap; 
uniform float uNormpow; 
uniform sampler2D uNormalMap; 
uniform float uOpacity; 
uniform float uEmi; 
uniform float lightThreshold1; 
uniform float lightThreshold2; 
uniform vec3 uReflectionColor; 
const highp float _PI =1.0/3.14159265359; 

[common]
vec4 textureTri(sampler2D texture,vec2 size,vec2 uv,float w){
	float refx = pow(0.5,floor(w)); 
	uv.t = max(min(uv.t,0.5-0.5/(refx*size.y)),0.5/(refx*size.y));
	vec4 refCol = textureRGBE(texture,size,uv*refx + vec2(0.0,1.0-refx)); 
	vec4 q = textureRGBE(texture,size,uv*refx*0.5 + vec2(0.0,1.0-refx*0.5)); 
	return mix(refCol,q,fract(w));
}
void main(void){ 
	vec3 eye = normalize(vEye); 

	/*視差*/ 
	vec4 q = texture2D(uNormalMap,vUv); 
	vec2 hoge = vec2(dot(vView[0],eye),dot(vView[1],eye)); 
	vec2 uv = vUv + hoge.xy * (q.w /256.0)   * uNormpow; 

	/*pbr*/ 
	q = texture2D(uPbrMap,uv) * uPbr; 
	float reflectPower = q.x; 
	float rough = q.y; 
	float transRough = q.z; 
	float refractPower = q.w; 

	/*ノーマルマップ*/ 
	q = texture2D(uNormalMap,uv); 
	vec3 nrm = vec3(( q.rg*2.0 - 1.0 ) * uNormpow,q.b) ; 
	nrm = normalize( vView* nrm); 

	/*ベースカラー*/ 
	vec3 baseCol = uBaseCol * texture2D(uBaseColMap,uv).rgb; 

	/*全反射*/ 
	vec3 angle = reflect(eye,nrm); 
	float refx = floor(sqrt(rough/0.06)); 
	float refa = (rough -refx*refx*0.06)/((((1.0+refx)*(1.0+refx))-refx*refx)*0.06); 
	refa = min(refa,1.0); 
	vec2 refV = vec2(atan2(angle.x,-angle.z)*_PI*0.5 + 0.5 
		,(-atan2(angle.y,length(angle.xz))*_PI*0.5  + 0.25)); 
	vec4 refCol = textureTri(uEnvMap,vec2(256.0),refV,refx+refa) ;
	refCol.rgb *=  uReflectionColor; 

	/*屈折*/ 
	refx = min(floor(transRough/0.2),3.0); 
	refa = (transRough-refx*0.2)/0.2; 
	refa = min(refa,1.0); 
	angle = normalize(uViewMat * nrm); 
	refV = gl_FragCoord.xy/1024.0+angle.xy*(1.0-refractPower)*0.2; 
	vec4 transCol = textureTri(uTransMap,vec2(1024.0),refV,refx+refa); 
	transCol.rgb *=  baseCol; 

	/*乱反射強度*/ 
	float diffuse = max(-dot(nrm,uLight),0.0); 
	diffuse = clamp((diffuse-lightThreshold1)*lightThreshold2,0.0,1.0); 

	/*影判定*/ 
	vec4 shadowmap; 
	shadowmap=texture2D(uShadowmap,vLightPos.xy*0.5+0.5); 
	float lightz = max(min(vLightPos.z,1.0),-1.); 
	diffuse = (1.0-sign(lightz*0.5+0.5-0.01 -shadowmap.z))*0.5 * diffuse; 

	/*拡散反射+環境光+自己発光*/ 
	refx = pow(0.5,4.0); 
	refV = vec2(atan(nrm.x,-nrm.z)*_PI*0.5 + 0.5
		,(-atan(nrm.y,length(nrm.xz))*_PI*0.95 + 0.5)*0.5); 
	refV = refV*refx + vec2(0.0,1.0-refx);

	vec3 vColor2 = diffuse*uLightColor
		//+ uAmbColor*textureRGBE(uEnvMap,vec2(256.0),refV).rgb
		+ texture2D(uLightMap,vUv2).rgb
		+ uEmi;
	vColor2 = vColor2 * baseCol;

	/*透過合成*/ 
	vColor2 = mix(vColor2,transCol.rgb,1.0 - uOpacity); 

	/* フレネル */ 
	reflectPower +=  (1.0 - reflectPower)*pow(1.0 + min(dot(eye,nrm),0.0),5.0)*(1.0-uOpacity); 

	/*全反射合成*/ 
	vColor2 = mix(vColor2,refCol.rgb,reflectPower); 

	/*スケーリング*/ 
	gl_FragColor = encode(vec4(vColor2 * vEnvRatio,0.0)); 
} 
