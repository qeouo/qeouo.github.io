[vertexshader]
attribute vec2 aPos;
varying vec3 vAngle;
uniform mat4 projectionMatrix;
void main(void){
	gl_Position = vec4(aPos ,1.0,1.0);
	vAngle = (projectionMatrix * gl_Position).xyz;
}
[fragmentshader]
precision lowp float;
varying highp vec3 vAngle;
uniform sampler2D uSampler;
uniform vec2 uUvOffset;
uniform vec2 uUvScale;
const highp float _PI = 1.0/3.141592;
[common]
void main(void){
	vec4 src= textureRGBE(uSampler,vec2(1024.0,512.0)
		,vec2(atan2(vAngle.x,-vAngle.z)*_PI*0.5 + 0.5
		,-atan2(vAngle.y,length(vAngle.xz))*_PI + 0.5)*uUvScale+uUvOffset);
	gl_FragColor = encode(src);
}
