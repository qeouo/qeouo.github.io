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
[common]
varying lowp vec2 vUv;
uniform sampler2D uSampler;

vec2 boxAngle2Uv(vec3 angle){
	float x=angle.x;
	float y=angle.y;
	float z=angle.z;
	float u,v;
	if(y*y>x*x && y*y>z*z){
		x/=abs(y);
		z/=abs(y);
		if(x>0.99)x=0.99;
		if(x<-0.99)x=-0.99;
		if(z>0.99)z=0.99;
		if(z<-0.99)z=-0.99;
		if(y>0.0){
			u=0.25+0.125-x*0.125;
			v=0.5+0.25+z*0.25;
		}else{
			u=0.125-x*0.125;
			v=0.5+0.25-z*0.25;
		}
	}else{
		if(x*x>z*z){
			z/=abs(x);
			y/=abs(x);
			if(y>0.99)y=0.99;
			if(y<-0.99)y=-0.99;
			if(z>0.99)z=0.99;
			if(z<-0.99)z=-0.99;
			if(x<0.0){
				u=0.25+0.125-z*0.125;
				v=0.25-y*0.25;
			}else{
				u=0.25+0.5+0.125+z*0.125;
				v=0.25-y*0.25;
			}
		}else{
			x/=abs(z);
			y/=abs(z);
			if(y>0.99)y=0.99;
			if(y<-0.99)y=-0.99;
			if(x>0.99)x=0.99;
			if(x<-0.99)x=-0.99;
			if(z>0.0){
				u=0.125-x*0.125;
				v=0.25-y*0.25;
			}else{
				u=0.5+0.125+x*0.125;
				v=0.25-y*0.25;
			}
		}
	}
	return vec2(u,v);
}
void main(void){
	vec3 angle;
	angle.y=-sin((vUv.y-0.5)*PI);
	angle.y=max(-1.0,min(1.0,angle.y));
	float l=sqrt(1.0-angle.y*angle.y);
	float r=-vUv.x*PI*2.0;
	angle.x=sin(r)*l;
	angle.z=cos(r)*l;

    gl_FragColor = encode(textureRGBE( uSampler,vec2(1024.0,512.0),boxAngle2Uv(angle)));
}

