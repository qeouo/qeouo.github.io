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
	vec4 a = decode(texture2D(uSampler,vUv));
	a.r = (a.r + a.g + a.b)/3.0;
	a.g = (a.r + a.g + a.b)/3.0;
	gl_FragColor= encode2(a);
}
