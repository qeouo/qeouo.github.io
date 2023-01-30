[vertexshader]
precision mediump float;
attribute vec2 aPos;
varying lowp vec2 vUv;
void main(void){
	gl_Position = vec4(aPos,1,1.0);
	vUv= aPos*0.5 + vec2(0.5,0.5);
}
[fragmentshader]
varying lowp vec2 vUv;
uniform sampler2D uSampler;
uniform mediump vec2 uUnit;
void main(void){
	lowp vec2 unit = uUnit*4.0;
	highp vec4 def= texture2D(uSampler ,vUv);
	highp vec4 xm= texture2D(uSampler ,vUv + unit * vec2(-1.0,0.0));
	highp vec4 ym= texture2D(uSampler ,vUv + unit * vec2(0.0,-1.0));
	highp vec4 xp= texture2D(uSampler ,vUv + unit * vec2(1.0,0.0));
	highp vec4 yp= texture2D(uSampler ,vUv + unit * vec2(0.0,1.0));
	highp vec3 aa=vec3(-(xp.r-xm.r),-(yp.r-ym.r),unit.x*2.0); //勾配から法線算出
	aa = normalize(aa);
	gl_FragColor = vec4(aa.xyz*0.5+0.5,pow(def.r,1.0/2.2)); //rgb=法線,a=高さ
}
