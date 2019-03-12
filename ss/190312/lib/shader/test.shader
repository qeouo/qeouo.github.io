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
uniform mat4 projectionMatrix;
uniform vec3 anglePos; 
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);
	vUv = aUv;
	vEye = aPos - anglePos ;
	vView = mat3(normalize(aSvec - dot(aNormal,aSvec)*aNormal)
		,normalize(aTvec - dot(aNormal,aTvec)*aNormal)
		,aNormal);
}

[fragmentshader]
precision lowp float;
varying vec2 vUv;
varying vec3 vEye;
varying mat3 vView;
uniform sampler2D uBaseColMap;
uniform sampler2D uNormalMap;
const float sqrt3 = 1.7320508;
[common]
void main(void){
	vec3 r = vView * normalize(vEye);
	vec3 uvw = vec3(fract(vUv)*2.0-1.0,1.0);
	vec3 eye = (sign(r) - uvw) / r;

	vec3 a = uvw + r * min(min(eye.x,eye.y),eye.z)*1.0;
	vec4 nrmmap ;
	float l;
	for(int i = 0;i<4;i++){
		nrmmap = texture2D(uNormalMap,(a.xy * sqrt3/(sqrt3+1.0-a.z))*0.5+0.5);
		l = ((nrmmap.w*2.0 -1.0  - a.z)/r.z)*0.4;
		a = a + r * l;
	}
	gl_FragColor = encode(texture2D(uBaseColMap,(a.xy * sqrt3/(sqrt3+1.0-a.z))*0.5+0.5));
}
