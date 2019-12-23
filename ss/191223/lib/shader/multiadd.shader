
[vertexshader]
attribute vec2 aPos;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
varying vec2 vUv;
void main(void){
		gl_Position = vec4(aPos ,1.0,1.0);
			vUv = (aPos+ 1.0) * 0.5 * uUvScale +  uUvOffset;
}
[fragmentshader]
precision highp float;
[common]
varying lowp vec2 vUv;
uniform mediump vec2 uUnit;
uniform sampler2D uSampler;

void main(void){
	vec2 uv = vUv; 
	highp vec3 total;
	for(int i=0;i<2;i++){
		float ii=exp2(float(i));
		total +=textureDecode(uSampler,1.0/uUnit,uv/ii+vec2(0.0,1.0-1.0/ii))*0.1*ii; 
	}
	gl_FragColor = encode(total);
}

