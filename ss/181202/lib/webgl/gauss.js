"use strict"
var Gauss=(function(){
var gauss={};
var gl;
var ret= function(){};
ret.init= function(){
	gl = Rastgl.gl;
	var program= Rastgl.setShaderProgram(
" \
attribute vec2 aPos; \
varying lowp vec2 vUv; \
void main(void){ \
	gl_Position = vec4(aPos,1.0,1.0); \
	vUv = (aPos+1.0)*0.5 ; \
} \
"
			,
" \
precision lowp float; \
uniform sampler2D uSampler; \
uniform lowp float weight[5]; \
uniform highp vec2 uAxis; \
uniform lowp vec2 uOffset; \
uniform lowp vec2 uSize; \
varying lowp vec2 vUv; \
 " + Rastgl.commonFunction + " \n \
 " + Rastgl.textureRGBE+ " \n \
void main(void){ \
	lowp vec4 col=vec4(0.); \
	lowp vec2 fc = vUv ; \
	lowp vec2 scale = uAxis; \
	lowp vec2 size =vec2(1024,1024); \
	col += (textureRGBE(uSampler,size,(fc+scale*-4.)*uSize+uOffset))*weight[4]; \
	col += (textureRGBE(uSampler,size,(fc+scale*-3.)*uSize+uOffset))*weight[3]; \
	col += (textureRGBE(uSampler,size,(fc+scale*-2.)*uSize+uOffset))*weight[2]; \
	col += (textureRGBE(uSampler,size,(fc+scale*-1.)*uSize+uOffset))*weight[1]; \
	col += (textureRGBE(uSampler,size,(fc+scale*-0.)*uSize+uOffset))*weight[0]; \
	col += (textureRGBE(uSampler,size,(fc+scale*1.)*uSize+uOffset))*weight[1]; \
	col += (textureRGBE(uSampler,size,(fc+scale*2.)*uSize+uOffset))*weight[2]; \
	col += (textureRGBE(uSampler,size,(fc+scale*3.)*uSize+uOffset))*weight[3]; \
	col += (textureRGBE(uSampler,size,(fc+scale*4.)*uSize+uOffset))*weight[4]; \
	gl_FragColor= encode(col); \
} \
"
	);
	gl.useProgram(program);
	var args=[];
	args["aPos"]=Rastgl.initAtt(program,"aPos",2,gl.FLOAT);
	args["uSampler"]=gl.getUniformLocation(program,"uSampler");
	args["weight"]=gl.getUniformLocation(program,"weight");
	args["uAxis"]=gl.getUniformLocation(program,"uAxis");
	args["uOffset"]=gl.getUniformLocation(program,"uOffset");
	args["uSize"]=gl.getUniformLocation(program,"uSize");
	gauss.program=program;
	gauss.args=args;

}
ret.filter=function(width,height,d,src,x,y,w,h,srcWidth,srcHeight){
	if(x==null){
		if(x==null){ x=0;y=0;w=1;h=1;
			srcWidth = width;srcHeight=height;
		}
	}
	var weight = new Array(5);
var t = 0.0;
for(var i = 0; i < weight.length; i++){
    var r = 1.0 + 2.0 * i;
    var we = Math.exp(-0.5 * (r * r) / d);
    weight[i] = we;
    if(i > 0){we *= 2.0;}
    t += we;
}
for(i = 0; i < weight.length; i++){
    weight[i] /= t;
}
	var args=gauss.args;

	gl.useProgram(gauss.program);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D,src);
	gl.uniform1i(args["uSampler"],0);

	gl.uniform2f(args["uAxis"],1/width,0);
	gl.uniform2f(args["uOffset"],x-0.0/1024,y-0.0/1024);
	gl.uniform2f(args["uSize"],w,h);
	gl.uniform1fv(args["weight"],weight);

	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
	gl.vertexAttribPointer(args["aPos"].att, args["aPos"].size,args["aPos"].type , false, 0, 0);

	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	gl.bindTexture(gl.TEXTURE_2D,src);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,width,height);


	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D,src);
	gl.uniform1i(args["uSampler"],0);

	gl.uniform2f(args["uAxis"],0,1/height);
	gl.uniform2f(args["uOffset"],-0.0/1024,-0.0/1024);
	gl.uniform2f(args["uSize"],width/srcWidth,height/srcHeight);

	
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	
}
ret.init();
	return ret;
})();

