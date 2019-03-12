"use strict"
var EmiShader=(function(){
var gl;
var ret= function(){};
var args;
var attributes;
var program;
var jsbuffer;
var _offset;

ret.init= function(){
	gl = Rastgl.gl;

	program= Rastgl.setShaderProgram(
" \
precision mediump float; \
attribute vec3 aPos; \
attribute vec4 aColor; \
attribute highp vec2 aUv; \
varying vec4 vColor; \
varying highp vec2 vUv; \
uniform mat4 projectionMat; \
void main(void){ \
	gl_Position = projectionMat * vec4(aPos,1.0); \
	vColor = vec4(aColor.xyz,aColor.w); \
	vUv = aUv; \
} \
"
," \
precision mediump float; \
varying lowp vec4 vColor; \
varying highp vec2 vUv; \
uniform sampler2D uSampler; \
uniform int uTex; \
uniform lowp float uEmi; \
void main(void){ \
	vec4 vColor2=vColor; \
	if(uTex==1){ \
		vColor2 = vColor2 * texture2D(uSampler,vec2(vUv.s,vUv.t)); \
	} \
	gl_FragColor = vec4(vColor2.rgb * uEmi,1.) ; \
} \
"
)
	gl.useProgram(program);
	_offset=0;
	args={};
	attributes=[
		{name:"aPos",size:3}
		,{name:"aColor",size:4}
		,{name:"aUv",size:2}
	];
	for(var i=0;i<attributes.length;i++){
		args[attributes[i].name]=initAtt(program,attributes[i].name,attributes[i].size,gl.FLOAT);
		attributes[i].arg=args[attributes[i].name];
	}
	args["uEmi"]=gl.getUniformLocation(program,"uEmi");
	args["uSampler"]=gl.getUniformLocation(program,"uSampler");
	args["uTex"]=gl.getUniformLocation(program,"uTex");
	args["projectionMat"]=(gl.getUniformLocation(program,"projectionMat"));

	var size=0;
	for(var i=0;i<attributes.length;i++){
		size+=attributes[i].size;
	}
	jsbuffer=new Float32Array(Rastgl.VERTEX_MAX*size);
}

	ret.draw=function(ono3d,shadowTex,envtexes,camerap){

	var faceflg=Rastgl.faceflg;
	var renderface
	var posindex=0;
	var colorindex=0;
	var uvindex=0;
	var faces=ono3d.renderFaces;
	var facessize=ono3d.renderFaces_index;
	var vertices=ono3d.renderVertices;
	var verticessize=ono3d.renderVertices_index;
	var index;

	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	gl.useProgram(program);
	gl.cullFace(gl.BACK);
	gl.uniformMatrix4fv(args["projectionMat"],false,new Float32Array(ono3d.pvMat));

	for(var i=0;i<facessize;i++){
		faceflg[i]=false;
	}
	var material;
	while(1){
		colorindex=args["aColor"].offset;
		uvindex=args["aUv"].offset;
		posindex=0;
		index=0;
		for(var i=0;i<facessize;i++){
			if(faceflg[i])continue;
			renderface=faces[i];
			if(renderface.operator !== Ono3d.OP_TRIANGLES){
				continue;
			}
			if(renderface.material.emt<=0)continue;
			if(index !== 0 && renderface.material !== material)continue;
			material = renderface.material;

			faceflg[i]=true;
			var smoothing=renderface.smoothing
			var vertices = renderface.vertices;
			var r=material.r;
			var g=material.g;
			var b=material.b;
			var a=material.a;
			var vertex=vertices[0];
			jsbuffer[posindex]=vertex.pos[0]
			jsbuffer[posindex+1]=vertex.pos[1]
			jsbuffer[posindex+2]=vertex.pos[2]
			jsbuffer[colorindex]=r;
			jsbuffer[colorindex+1]=g;
			jsbuffer[colorindex+2]=b;
			jsbuffer[colorindex+3]=a;;
			posindex+=3;
			colorindex+=4;

			vertex=vertices[1]
			jsbuffer[posindex]=vertex.pos[0]
			jsbuffer[posindex+1]=vertex.pos[1]
			jsbuffer[posindex+2]=vertex.pos[2]
			jsbuffer[colorindex]=r;
			jsbuffer[colorindex+1]=g;
			jsbuffer[colorindex+2]=b;
			jsbuffer[colorindex+3]=a;;
			posindex+=3;
			colorindex+=4;

			vertex=vertices[2]
			jsbuffer[posindex]=vertex.pos[0]
			jsbuffer[posindex+1]=vertex.pos[1]
			jsbuffer[posindex+2]=vertex.pos[2]
			jsbuffer[colorindex]=r;
			jsbuffer[colorindex+1]=g;
			jsbuffer[colorindex+2]=b;
			jsbuffer[colorindex+3]=a;;

			if(material.texture){
				jsbuffer[uvindex]=renderface.uv[0][0]
				jsbuffer[uvindex+1]=renderface.uv[0][1]
				jsbuffer[uvindex+2]=renderface.uv[1][0]
				jsbuffer[uvindex+3]=renderface.uv[1][1]
				jsbuffer[uvindex+4]=renderface.uv[2][0]
				jsbuffer[uvindex+5]=renderface.uv[2][1]
			}
			posindex+=3;
			colorindex+=4;
			uvindex+=6;

			index+=3;
		}
		if(index === 0)break;
		if(material.texture){
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D,material.texture.gltexture);
			gl.uniform1i(args["uSampler"],0);
			gl.uniform1i(args["uTex"],1);
		}else{
			gl.uniform1i(args["uTex"],0);
			gl.activeTexture(gl.TEXTURE0);
		}
		gl.uniform1f(args["uEmi"],(material.emt-1.)*0.2);
			
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, jsbuffer);
		for(var i=0;i<attributes.length;i++){
			var arg=attributes[i].arg;
			gl.vertexAttribPointer(arg.att, arg.size,arg.type, false, 0, arg.offset*4);
		}

		Rastgl.stereoDraw(ono3d,function(){
			gl.uniformMatrix4fv(args["projectionMat"],false,new Float32Array(ono3d.pvMat));
			gl.drawArrays(gl.TRIANGLES, 0, posindex/3);
		});
		
	}
}
var initAtt= function(program,attName,size,type){
	var arg={};
	arg.att = gl.getAttribLocation(program,attName); 
	arg.size=size;
	arg.type=type;
	arg.offset=_offset;
	_offset+=Rastgl.VERTEX_MAX*size;

  return arg;
}
	ret.init();
	return ret;

})();
