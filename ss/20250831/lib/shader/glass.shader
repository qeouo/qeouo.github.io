[vertexshader]
precision lowp float;
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec3 aSvec;
attribute vec3 aTvec;
attribute vec2 aUv;
varying vec2 vUv;
varying vec3 vEye;
varying mat3 vView;
varying vec3 vLightPos;
uniform mat4 projectionMatrix;
uniform mat4 lightMat;
uniform vec3 anglePos; 
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);
	vUv = aUv;
	vLightPos= (lightMat * vec4(aPos,1.0)).xyz;
	vEye = aPos - anglePos ;
	vView = mat3(normalize(aSvec - dot(aNormal,aSvec)*aNormal)
		,normalize(aTvec - dot(aNormal,aTvec)*aNormal)
		,aNormal);
}

[fragmentshader]
precision lowp float;
uniform sampler2D uPbrMap;
uniform float uPbrPow;
uniform vec4 uPbr;
varying vec2 vUv;
varying vec3 vEye;
uniform mat3 uViewMat;
varying mat3 vView;
uniform vec3 uBaseCol;
uniform sampler2D uBaseColMap;
uniform float uNormpow;
uniform sampler2D uNormalMap;
uniform sampler2D uTransMap;
uniform float uOpacity;
uniform sampler2D uShadowmap;
varying vec3 vLightPos;
uniform vec3 uLight;
uniform vec3 uLightColor;
uniform vec3 uAmbColor;
uniform float uEmi;
uniform float lightThreshold1;
uniform float lightThreshold2;
uniform sampler2D uEnvMap; 
uniform vec3 uReflectionColor;
const highp float _PI =1.0/3.14159265359;
#include(common)
void main(void){
	vec3 eye = normalize(vEye);
	/*視差*/
	vec4 q = texture2D(uNormalMap,vUv);
	vec2 hoge = vec2(dot(vView[0],eye),dot(vView[1],eye));
	vec2 uv = vUv + hoge.xy * q.w*0.5  * uNormpow*0.1;
	/*pbr*/
	q = texture2D(uPbrMap,uv) * uPbr;
	float reflectPower = q.x;
	float rough = q.y;
	float transRough = q.z;
	float refractPower = q.w;
	/*ノーマルマップ*/
	q = texture2D(uNormalMap,uv);
	vec3 nrm = vec3(( q.rg*2.0 - 1.0 ) * uNormpow*0.1,q.b) ;
	nrm = normalize( vView* nrm);
	/*ベースカラー*/
	vec3 baseCol = uBaseCol;
	/*全反射*/
	vec3 angle = reflect(eye,nrm);
	float refx = floor(sqrt(rough/0.06));
	float refa = (rough -refx*refx*0.06)/((((1.0+refx)*(1.0+refx))-refx*refx)*0.06);
	refa = min(refa,1.0);
	refx = pow(0.5,refx);
	vec2 refV = vec2(atan(angle.x,-angle.z)*_PI*0.5 + 0.5
		,(-atan(angle.y,length(angle.xz))*_PI*0.5  + 0.25));
	vec4 refCol = decode(texture2D(uEnvMap,refV*refx + vec2(0.0,1.0-refx)));
	q = decode(texture2D(uEnvMap,refV*refx*0.5 + vec2(0.0,1.0-refx*0.5)));
	refCol.rgb = mix(refCol.rgb,q.rgb,refa) * uReflectionColor;
	/*屈折*/
	refx = min(floor(transRough/0.2),3.0);
	refa = (transRough-refx*0.2)/0.2;
	refa = min(refa,1.0);
	refx = pow(0.5,refx);
	angle = normalize(uViewMat * nrm);
	vec2 tes = -(vView*vec3(uv*2.0-1.0,0.0)).xy;
	refV = gl_FragCoord.xy/1024.0+ (angle.xy*0.05 + (tes-angle.xy)*0.1)*(1.0-refractPower)/length(vEye);
	vec4 transCol = decode(texture2D(uTransMap,refV*refx + vec2(0.0,1.0-refx)));
	q = decode(texture2D(uTransMap,refV*refx*0.5 + vec2(0.0,1.0-refx*0.5)));
	transCol.rgb = mix(transCol.rgb,q.rgb,refa).rgb * baseCol;
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
	q= texture2D(uEnvMap,refV*refx + vec2(0.0,1.0-refx));
	q.rgb *= (q.a * 3.0 + 1.0);
	/*表面色*/
	vec3 vColor2 = baseCol* (diffuse * uLightColor + uAmbColor*q.rgb  + uEmi);
	/*透過合成*/
	vColor2 = mix(vColor2,transCol.rgb,1.0 - uOpacity);
	/* フレネル */
	reflectPower +=  (1.0 - reflectPower)*pow(1.0 + min(dot(eye,nrm),0.0),5.0)*(1.0-uOpacity);
	/*全反射合成*/
	vColor2 = mix(vColor2,refCol.rgb,reflectPower);
	/*スケーリング*/
	gl_FragColor = encode(vec4(vColor2,1.0));
}
