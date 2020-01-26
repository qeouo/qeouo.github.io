[vertexshader]
attribute vec2 aPos;
varying lowp vec2 vUv;
void main(void){
	gl_Position = vec4(aPos,1.0,1.0);
	vUv = (aPos+1.0)*0.5 ;
}
[fragmentshader]
precision lowp float;
uniform sampler2D uSampler;
uniform lowp float weight[5];
uniform highp vec2 uAxis;
uniform lowp vec2 uUvOffset;
uniform lowp vec2 uUvScale;
varying lowp vec2 vUv;
[common]
void main(void){
	highp vec2 col=vec2(0.);
	lowp vec2 fc = vUv ;
	lowp vec2 scale = uAxis;
	col += decodeFull_(texture2D(uSampler,(fc+scale*-4.)*uUvScale+uUvOffset))*weight[4];
	col += decodeFull_(texture2D(uSampler,(fc+scale*-3.)*uUvScale+uUvOffset))*weight[3];
	col += decodeFull_(texture2D(uSampler,(fc+scale*-2.)*uUvScale+uUvOffset))*weight[2];
	col += decodeFull_(texture2D(uSampler,(fc+scale*-1.)*uUvScale+uUvOffset))*weight[1];
	col += decodeFull_(texture2D(uSampler,(fc+scale*-0.)*uUvScale+uUvOffset))*weight[0];
	col += decodeFull_(texture2D(uSampler,(fc+scale*1.)*uUvScale+uUvOffset))*weight[1];
	col += decodeFull_(texture2D(uSampler,(fc+scale*2.)*uUvScale+uUvOffset))*weight[2];
	col += decodeFull_(texture2D(uSampler,(fc+scale*3.)*uUvScale+uUvOffset))*weight[3];
	col += decodeFull_(texture2D(uSampler,(fc+scale*4.)*uUvScale+uUvOffset))*weight[4];
	gl_FragColor= vec4(packUFP16(col.r),packUFP16(col.g));
	//gl_FragColor= vec4(texture2D(uSampler,fc).rg,vec2(encodeShadow(col.g)));
}
