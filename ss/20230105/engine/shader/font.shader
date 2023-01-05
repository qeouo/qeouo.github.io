[vertexshader]
precision lowp float; 

attribute lowp vec2 aPos; 
attribute highp float aNum ; 
attribute highp float aCode; 
uniform float uXfontnum; 
varying lowp vec2 vUv; 
varying lowp vec2 vCurrent; 
varying highp vec4 vEff; 

void main(void){ 
	gl_Position = vec4(aPos.xy,0.0,1.0); 

	float code = floor(aCode/32.0);

	float offset = aCode - code*32.0+1.0;
	vEff = vec4( 0.0 ,8.0 ,16.0 ,24.0);
	vEff = exp2(vEff -offset);

	vCurrent.x = fract(code/uXfontnum)*uXfontnum;
	vCurrent.y = floor(code/uXfontnum);
	vUv.x = floor(aNum *0.5) ;
	vUv.y = fract(aNum *0.5)*2.0;

}

[fragmentshader]

varying highp vec4 vEff; 
varying lowp vec2 vUv; 
varying lowp vec2 vCurrent; 
uniform vec2 uFontsize; 
uniform vec4 uBaseColor; 
uniform float uGradient; 
uniform sampler2D uFontImage; 
 
void main(void){ 
	lowp vec2 uv = (vUv+vCurrent)*uFontsize;


	/* ビット判定 */
	highp vec4 tex = floor(texture2D(uFontImage,uv)*255.0); 
	tex = step(0.5,fract(tex * vEff));
	lowp float a = sign(length(tex));

	/*ベースカラー*/ 

	gl_FragColor = vec4(uBaseColor.rgb*(1.0-vUv.y*uGradient),uBaseColor.a * a);
} 
