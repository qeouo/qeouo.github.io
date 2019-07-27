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
[common]
varying lowp vec2 vUv;
uniform sampler2D uSampler;
uniform sampler2D uSampler2;
uniform float uAL; //平均値
uniform float uLw; //最大値
float uA = 0.18;
void main(void){
	vec4 a = decode(texture2D(uSampler,vUv));
	vec4 b = texture2D(uSampler,vUv);
	vec4 c = decode2(texture2D(uSampler2,vec2(0.0,511.0)/512.0));
	float aL = c.r; //平均値
	float Lw = c.g*1.1; //最大値
	a.rgb= a.rgb * uA / aL;
	Lw = Lw*uA/aL;
	a.rgb= a.rgb / (1.0 + a.rgb)*(1.0+a.rgb/(Lw*Lw));
	a.r= pow(a.r , 1.0/2.2);
	a.g= pow(a.g , 1.0/2.2);
	a.b= pow(a.b , 1.0/2.2);
	gl_FragColor= a;
}
