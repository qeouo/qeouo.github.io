"use strict"
var TestShader=(function(){
var ret= function(){};

ret.init= function(){
	return Ono3d.loadShader("testshader"," \
precision lowp float; \
attribute vec3 aPos; \
attribute vec3 aNormal; \
attribute vec3 aSvec; \
attribute vec3 aTvec; \
attribute vec2 aUv; \
varying vec2 vUv; \
varying vec3 vEye; \
varying mat3 vView; \
varying vec3 vLightPos; \
uniform mat4 projectionMatrix; \
uniform mat4 lightMat; \
uniform vec3 anglePos;  \
void main(void){ \
	gl_Position = projectionMatrix * vec4(aPos,1.0); \
	vUv = aUv; \
	vLightPos= (lightMat * vec4(aPos,1.0)).xyz; \
	vEye = aPos - anglePos ; \
	vView = mat3(normalize(aSvec - dot(aNormal,aSvec)*aNormal) \
		,normalize(aTvec - dot(aNormal,aTvec)*aNormal) \
		,aNormal); \
} \
" , " \
precision lowp float; \
uniform sampler2D uPbrMap; \
uniform float uPbrPow; \
uniform vec4 uPbr; \
varying vec2 vUv; \
varying vec3 vEye; \
uniform mat3 uViewMat; \
varying mat3 vView; \
uniform vec3 uBaseCol; \
uniform sampler2D uBaseColMap; \
uniform float uNormpow; \
uniform sampler2D uNormalMap; \
uniform sampler2D uTransMap; \
uniform float uOpacity; \
uniform sampler2D uShadowmap; \
varying vec3 vLightPos; \
uniform vec3 uLight; \
uniform vec3 uLightColor; \
uniform vec3 uAmbColor; \
uniform float uEmi; \
uniform float lightThreshold1; \
uniform float lightThreshold2; \
uniform sampler2D uEnvMap; \
uniform vec3 uReflectionColor; \
 \
const highp float _PI =1.0/3.14159265359; \n \
 \
highp float rndcount=0.1234; \n \
highp float random(vec2 uv){ \n \
	rndcount = (rndcount+0.123); \n \
	return fract(sin(dot(uv*rndcount,vec2(12.9898,78.233))) * 43758.5453); \n \
} \n \
 \
void main(void){ \
	vec3 a = vView * normalize(vEye); \
	vec3 uvw = vec3(fract(vUv)*2.0-1.0,1.0); \
	vec3 eye = (sign(a) - uvw) / a; \
 \
	a = uvw + a * min(min(eye.x,eye.y),eye.z); \
	vec4 roomCol = texture2D(uBaseColMap,(a.xy * sqrt(2.0)/(sqrt(2.0)+1.0-a.z))*0.5+0.5); \
 \
	eye = normalize(vEye); \
	/*視差*/ \
	vec4 q = texture2D(uNormalMap,vUv); \
	vec2 hoge = vec2(dot(vView[0],eye),dot(vView[1],eye)); \
	vec2 uv = vUv + hoge.xy * q.w*0.5  * uNormpow*0.1; \
	/*pbr*/ \
	q = texture2D(uPbrMap,uv) * uPbr; \
	float reflectPower = q.x; \
	float rough = q.y; \
	float transRough = q.z; \
	float refractPower = q.w; \
	/*ノーマルマップ*/ \
	q = texture2D(uNormalMap,uv); \
	vec3 nrm = vec3(( q.rg*2.0 - 1.0 ) * uNormpow*0.1,q.b) ; \
	nrm[0] +=(random(floor(uv))*2.0-1.0)*0.01; \
	nrm[1] +=(random(floor(uv)+1.0)*2.0-1.0)*0.01; \
	nrm = normalize( vView* nrm); \
	/*ベースカラー*/ \
	vec3 baseCol = uBaseCol; \
	/*全反射*/ \
	vec3 angle = reflect(eye,nrm); \
	float refx = floor(sqrt(rough/0.06)); \
	float refa = (rough -refx*refx*0.06)/((((1.0+refx)*(1.0+refx))-refx*refx)*0.06); \
	refa = min(refa,1.0); \
	refx = pow(0.5,refx); \
	vec2 refV = vec2(atan(angle.x,-angle.z)*_PI*0.5 + 0.5 \
		,(-atan(angle.y,length(angle.xz))*_PI*0.5  + 0.25)); \
	vec4 refCol = texture2D(uEnvMap,refV*refx + vec2(0.0,1.0-refx)); \
	refCol.rgb *= (refCol.a * 3.0 + 1.0); \
	q = texture2D(uEnvMap,refV*refx*0.5 + vec2(0.0,1.0-refx*0.5)); \
	q.rgb *= (q.a * 3.0 + 1.0); \
	refCol.rgb = mix(refCol.rgb,q.rgb,refa) * uReflectionColor; \
	/*屈折*/ \
	vec4 transCol = roomCol; \
	/*拡散反射+環境光+自己発光*/ \
	refx = pow(0.5,4.0); \
	refV = vec2(atan(nrm.x,-nrm.z)*_PI*0.5 + 0.5 \
		,(-atan(nrm.y,length(nrm.xz))*_PI*0.95 + 0.5)*0.5); \
	q= texture2D(uEnvMap,refV*refx + vec2(0.0,1.0-refx)); \
	q.rgb *= (q.a * 3.0 + 1.0); \
	/*表面色*/ \
	vec3 vColor2 = baseCol* (1.0+ uEmi); \
	/*透過合成*/ \
	vColor2 = mix(vColor2,transCol.rgb,1.0 - uOpacity); \
	/* フレネル */ \
	reflectPower +=  (1.0 - reflectPower)*pow(1.0 + min(dot(eye,nrm),0.0),5.0)*(1.0-uOpacity); \
	/*全反射合成*/ \
	vColor2 = mix(vColor2,refCol.rgb,reflectPower); \
	/*スケーリング*/ \
    highp float m = max(1.0,max(vColor2.r,max(vColor2.g,vColor2.b))); \n \
	gl_FragColor = vec4(vColor2/m,(m-1.0)/3.0); \
} \
");
}
	return ret;

})();

