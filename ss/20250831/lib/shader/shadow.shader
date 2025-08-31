[vertexshader]#version 300 es
uniform mat4 projectionMatrix;
in vec3 aPos;
in lowp vec2 aUv; 
out highp float aZ; 
out highp float aW; 
out lowp vec2 vUv; 
void main(void){
	gl_Position = projectionMatrix * vec4(aPos,1.0);

	aZ=gl_Position.z;
	aW=gl_Position.w;
	vUv = aUv; 
}
[fragmentshader]#version 300 es
precision lowp float; 
#include(common)
in highp float aZ; 
in highp float aW; 
uniform sampler2D uBaseColMap; 
in lowp vec2 vUv; 
layout (location = 0) out vec4 out_base_color;
void main(void){
	lowp vec4 q;
	q= texture(uBaseColMap,vUv); 
	if(q.a==0.0){
		discard;
	}

	float z=aZ;
	z=(z+1.0)*0.5;
	//z = exp(z);
	out_base_color = vec4(packUFP16(z),packUFP16(z*z));
	
	if(abs(gl_FragCoord.x-512.)>510. || abs(gl_FragCoord.y-512.)>510.){
		out_base_color = vec4(1.,1.,1.,1.);
	}
}
