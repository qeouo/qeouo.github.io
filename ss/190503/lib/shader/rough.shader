[vertexshader]
attribute vec2 aPos;
varying vec2 vUv;
void main(void){
	gl_Position = vec4(aPos,1.0,1.0);
	vUv = vec2(1.0-aPos.x,aPos.y);
}

[fragmentshader]
precision lowp float;
varying highp vec2 vUv;
uniform sampler2D uSampler;
uniform sampler2D uDst;
uniform highp float uPow;
uniform float uRough ;
uniform highp float uSeed;
highp float rndcount=uSeed*0.1234;
[common]
highp float random(){
	rndcount = (rndcount+0.123);
	return fract(sin(dot(vUv*rndcount,vec2(12.9898,78.233))) * 43758.5453);
}
highp vec3 randvec(vec3 vecN,vec3 vecS,vec3 vecT,float rand){
	highp float r=acos(1.0-random()*rand);
	highp float r2=random()*PI*2.0;
	highp float n=cos(r);
	highp float s=sin(r);
	highp float t=s*cos(r2);
	s=s*sin(r2);

	return n*vecN + s*vecS + t*vecT;
}
const int MAX = 32;
const highp float _PI =1.0/3.14159265359;
uniform vec2 uUvOffset;
uniform vec2 uUvScale;
void main(void){
	vec3 svec,tvec;
	vec3 vAngle2;
	highp vec4 col;
	highp vec4 col2;
	highp vec3 color = vec3(0.0,0.0,0.0);
	vec3 va;
	va.y = -sin(vUv.y*PI*0.5);
	float l = sqrt(1.0-va.y*va.y);
	va.x = sin(vUv.x*PI)*l;
	va.z = cos(vUv.x*PI)*l;
    if(abs(va.y)<0.75){
		svec=vec3(va.z/length(va.xz)
		,0.0
		,-va.x/length(va.xz));

		tvec=vec3(-svec.z*va.y
		,svec.z*va.x-svec.x*va.z
		,svec.x*va.y);
	}else{
		svec=vec3(0.0
		,-va.z/length(va.yz)
		,va.y/length(va.yz));

		tvec=vec3(svec.y*va.z-svec.z*va.y
		,svec.z*va.x
		,-svec.y*va.x);
	}
	for(int i=0;i<MAX;i++){
		vAngle2 = randvec(va,svec,tvec,uRough);
		col = decode(texture2D(uSampler
			,vec2(atan2(vAngle2.x,-vAngle2.z)*_PI*0.5 + 0.5
			,-atan2(vAngle2.y,length(vAngle2.xz))*_PI + 0.5)*uUvScale + uUvOffset));
		color = color + col.rgb;
	}
	color = color / (float(MAX));
	col2 = decode(texture2D(uDst,vec2(1.0-vUv.x,vUv.y)*0.5+0.5));
	color = mix(col2.rgb,color,uPow);
	gl_FragColor = encode(vec4(color,1.0));
}
