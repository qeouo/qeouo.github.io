[vertexshader]
uniform mat4 projectionMatrix;
attribute vec3 aPos;
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);
}
[fragmentshader]
precision lowp float; 
[common]
void main(void){
	gl_FragColor= vec4(gl_FragCoord.z,gl_FragCoord.z,gl_FragCoord.z,1.0);
	if(abs(gl_FragCoord.x-512.)>510. || abs(gl_FragCoord.y-512.)>510.){
		gl_FragColor= vec4(1.,1.,1.,1.);
	}
}
