[vertexshader]
uniform mat4 projectionMatrix;
attribute vec3 aPos;
varying highp float aZ; 
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);
	aZ=(projectionMatrix*vec4(aPos,1.0)).z;
}
[fragmentshader]
precision lowp float; 
[common]
varying highp float aZ; 
void main(void){
	gl_FragColor= encodeFull_((aZ+1.0)*0.5);
	if(abs(gl_FragCoord.x-512.)>510. || abs(gl_FragCoord.y-512.)>510.){
		gl_FragColor= vec4(1.,1.,1.,1.);
	}
}
