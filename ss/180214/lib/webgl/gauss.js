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
void main(void){ \
	gl_Position = vec4(aPos,1.0,1.0); \
} \
"
			,
" \
uniform sampler2D uSampler; \
uniform lowp float weight[10]; \
uniform highp vec2 scale; \
uniform highp float scale2; \
highp vec3 decColor(lowp vec4 src){ \
	return src.rgb * (src.a*3.0+1.0); \
} \
highp vec4 encColor(lowp vec3 src){ \
    highp float m = max(1.0,max(src.r,max(src.g,src.b))); \n \
	return vec4(src / m ,(m-1.0)/3.0); \n \
} \
void main(void){ \
	lowp vec3 col=vec3(0.); \
	lowp vec2 fc = gl_FragCoord.st *scale2; \
	col += decColor(texture2D(uSampler,(fc+scale*-4.)))*weight[4]; \
	col += decColor(texture2D(uSampler,(fc+scale*-3.)))*weight[3]; \
	col += decColor(texture2D(uSampler,(fc+scale*-2.)))*weight[2]; \
	col += decColor(texture2D(uSampler,(fc+scale*-1.)))*weight[1]; \
	col += decColor(texture2D(uSampler,(fc+scale*-0.)))*weight[0]; \
	col += decColor(texture2D(uSampler,(fc+scale*1.)))*weight[1]; \
	col += decColor(texture2D(uSampler,(fc+scale*2.)))*weight[2]; \
	col += decColor(texture2D(uSampler,(fc+scale*3.)))*weight[3]; \
	col += decColor(texture2D(uSampler,(fc+scale*4.)))*weight[4]; \
	gl_FragColor= encColor(col); \
} \
"
	);
	gl.useProgram(program);
	var args=[];
	args["aPos"]=Rastgl.initAtt(program,"aPos",2,gl.FLOAT);
	args["uSampler"]=gl.getUniformLocation(program,"uSampler");
	args["weight"]=gl.getUniformLocation(program,"weight");
	args["scale"]=gl.getUniformLocation(program,"scale");
	args["scale2"]=gl.getUniformLocation(program,"scale2");
	gauss.program=program;
	gauss.args=args;

}	
ret.filter=function(dst,src,d,scale,scale2){
	var weight = new Array(5);
var t = 0.0;
for(i = 0; i < weight.length; i++){
    var r = 1.0 + 2.0 * i;
    var w = Math.exp(-0.5 * (r * r) / d);
    weight[i] = w;
    if(i > 0){w *= 2.0;}
    t += w;
}
for(i = 0; i < weight.length; i++){
    weight[i] /= t;
}
	var args=gauss.args;
	gl.bindFramebuffer(gl.FRAMEBUFFER, Rastgl.frameBuffer);
	gl.viewport(0,0,scale2,scale2);
	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);


	gl.useProgram(gauss.program);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D,src);
	gl.uniform1i(args["uSampler"],0);

	gl.uniform2f(args["scale"],scale,0);
	gl.uniform1f(args["scale2"],1/scale2);
	gl.uniform1fv(args["weight"],weight);

	gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.fullposbuffer);
	gl.vertexAttribPointer(args["aPos"].att, args["aPos"].size,args["aPos"].type , false, 0, 0);

	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	
	gl.bindTexture(gl.TEXTURE_2D,dst);
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,scale2,scale2);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D,dst);
	gl.uniform1i(args["uSampler"],0);

	gl.uniform2f(args["scale"],0,scale);
	

	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	
	gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,scale2,scale2);
}
ret.init();
	return ret;
})();

