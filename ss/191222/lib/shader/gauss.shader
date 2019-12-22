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
	highp vec3 col=vec3(0.);
	lowp vec2 fc = vUv ;
	lowp vec2 scale = uAxis;
	lowp vec2 size =vec2(1024,1024);
	col += (textureDecode(uSampler,size,(fc+scale*-4.)*uUvScale+uUvOffset))*weight[4];
	col += (textureDecode(uSampler,size,(fc+scale*-3.)*uUvScale+uUvOffset))*weight[3];
	col += (textureDecode(uSampler,size,(fc+scale*-2.)*uUvScale+uUvOffset))*weight[2];
	col += (textureDecode(uSampler,size,(fc+scale*-1.)*uUvScale+uUvOffset))*weight[1];
	col += (textureDecode(uSampler,size,(fc+scale*-0.)*uUvScale+uUvOffset))*weight[0];
	col += (textureDecode(uSampler,size,(fc+scale*1.)*uUvScale+uUvOffset))*weight[1];
	col += (textureDecode(uSampler,size,(fc+scale*2.)*uUvScale+uUvOffset))*weight[2];
	col += (textureDecode(uSampler,size,(fc+scale*3.)*uUvScale+uUvOffset))*weight[3];
	col += (textureDecode(uSampler,size,(fc+scale*4.)*uUvScale+uUvOffset))*weight[4];
	gl_FragColor= encode(col);
}
