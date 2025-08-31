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
precision lowp float;
#include(common)
varying lowp vec2 vUv;
uniform sampler2D uSampler;

const float r = 3.141592;
void main(void){
	vec2 unit = vec2(1.0/1024.0,1.0/512.0);
	int i = int(floor(vUv.s * 6.0));
	highp vec3 res;
	if(i==0) {
		//front
		res = 
			 decode(texture2D(uSampler,vec2(0.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(7.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,3.0)*unit)) 

			+decode(texture2D(uSampler,vec2(0.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(7.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(0.0,2.0)*unit)) 

			+decode(texture2D(uSampler,vec2(1.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,3.0)*unit)) 

			+decode(texture2D(uSampler,vec2(1.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(1.0,2.0)*unit)) ;
	}else if(i ==1){
		//right
		res = 
			decode(texture2D(uSampler,vec2(1.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,3.0)*unit)) 

			+decode(texture2D(uSampler,vec2(1.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(1.0,2.0)*unit)) 

			+decode(texture2D(uSampler,vec2(4.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,2.0)*unit)) 

			+decode(texture2D(uSampler,vec2(4.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(1.0,3.0)*unit))
			;
	}else if(i ==2){
		//back
		res = 
			 decode(texture2D(uSampler,vec2(4.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,2.0)*unit)) 

			+decode(texture2D(uSampler,vec2(4.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(1.0,3.0)*unit)) 

			+decode(texture2D(uSampler,vec2(5.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(6.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,2.0)*unit)) 

			+decode(texture2D(uSampler,vec2(5.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(6.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(0.0,3.0)*unit))
			;
	}else if(i ==3){
		//left
		res = 
			 decode(texture2D(uSampler,vec2(5.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(6.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,2.0)*unit)) 

			+decode(texture2D(uSampler,vec2(5.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(6.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(0.0,3.0)*unit)) 

			+decode(texture2D(uSampler,vec2(0.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(7.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,3.0)*unit)) 

			+decode(texture2D(uSampler,vec2(0.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(7.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(0.0,2.0)*unit)) 
			;
	}else if(i ==4){
		//bottom
		res = 
			 decode(texture2D(uSampler,vec2(0.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(7.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(0.0,2.0)*unit)) 

			+decode(texture2D(uSampler,vec2(1.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(1.0,2.0)*unit)) 

			+decode(texture2D(uSampler,vec2(4.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(1.0,3.0)*unit)) 

			+decode(texture2D(uSampler,vec2(5.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(6.0,1.0)*unit)) 
			+decode(texture2D(uSampler,vec2(0.0,3.0)*unit)) 
			;
	}else if(i ==5){
		//top
		res = 
			 decode(texture2D(uSampler,vec2(0.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(7.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,3.0)*unit)) 

			+decode(texture2D(uSampler,vec2(1.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,3.0)*unit)) 
			
			+decode(texture2D(uSampler,vec2(4.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(3.0,2.0)*unit)) 

			+decode(texture2D(uSampler,vec2(5.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(6.0,0.0)*unit)) 
			+decode(texture2D(uSampler,vec2(2.0,2.0)*unit))
			;
	}
	gl_FragColor = encode(res/(2.0*PI ) );
}

