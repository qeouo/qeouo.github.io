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

varying lowp vec2 vUv;
uniform sampler2D uSampler;
[common]
void main(void){
	highp float s=decodeShadow(uSampler,vec2(1024.0),vUv); 
	gl_FragColor= vec4(vec3(s),1.0);
	
}
