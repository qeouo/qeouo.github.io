[vertexshader]
uniform mat4 projectionMatrix;
attribute vec3 aPos;
varying highp float aZ; 
varying highp float aW; 
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);

	aZ=gl_Position.z;
}
[fragmentshader]
precision lowp float; 
[common]
varying highp float aZ; 
varying highp float aW; 
void main(void){
	float z=aZ;
	z=(z+1.0)*0.5;
	gl_FragColor= vec4(packUFP16(z),0.0,0.0);
	
	if(abs(gl_FragCoord.x-512.)>510. || abs(gl_FragCoord.y-512.)>510.){
		gl_FragColor= vec4(1.,1.,1.,1.);
	}
}
