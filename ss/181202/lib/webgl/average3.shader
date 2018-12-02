[vertexshader]
attribute vec2 aPos;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
varying vec2 vUv;
void main(void){
	gl_Position = vec4(aPos,1.0,1.0);
	vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset;
}
[fragmentshader]
precision lowp float;
[common]
varying lowp vec2 vUv;
uniform sampler2D uSampler;
void main(void){
	float size = 512.0;
	vec4 a = decode(texture2D(uSampler,vUv));
	vec4 b = decode(texture2D(uSampler,vec2(0.0,0.0)));
	a =  a*0.95 + b*0.05;
	gl_FragColor= encode(a);

}
