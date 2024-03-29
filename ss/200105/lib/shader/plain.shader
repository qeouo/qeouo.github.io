[vertexshader]
attribute vec3 aPos;
uniform mat4 projectionMatrix;
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);
	gl_Position = vec4(gl_Position.xy,gl_Position.z*0.9997,gl_Position.w);
	gl_PointSize = 2.0;
}
[fragmentshader]
precision lowp float; 
[common]
uniform highp vec4 uColor; 
void main(void){ 
	gl_FragColor = encode(uColor.rgb);
}
