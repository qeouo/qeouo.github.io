"use strict"
//plainShader
var Plain=(function(){
	var ret={};
	var args;
	var attributes;
	var gl;
	var program;
	ret.init= function(){
		gl=Rastgl.gl;

		program= Rastgl.setShaderProgram(" \
attribute vec3 aPos; \
uniform mat4 projectionMat; \
void main(void){ \
	gl_Position = projectionMat * vec4(aPos,1.0); \
	gl_Position = vec4(gl_Position.xy,gl_Position.z*0.9997,gl_Position.w); \
} ","  \
uniform lowp vec4 uColor; \n \
void main(void){ \n \
    highp float m = max(1.0,max(uColor.r,max(uColor.g,uColor.b))); \n \
	gl_FragColor = vec4(uColor.rgb/m,(m-1.0)/3.0); \n \
	\ //gl_FragColor = uColor; \n \
} ");

		gl.useProgram(program);
		args=[];
		args["uColor"]=gl.getUniformLocation(program,"uColor");
		args["projectionMat"]=(gl.getUniformLocation(program,"projectionMat"));

		attributes=[
			{name:"aPos",size:3}
		];
		Rastgl.initAttReset();
		for(var i=0;i<attributes.length;i++){
			args[attributes[i].name]=Rastgl.initAtt(program,attributes[i].name,attributes[i].size,gl.FLOAT);
			attributes[i].arg=args[attributes[i].name];
		}
	}

	var jsbuffer=new Float32Array(Rastgl.VERTEX_MAX*3);
	ret.draw=function(ono3d){
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		//gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE);

		var faceindex=0;
		var renderface;
		var material;
		var faces=ono3d.renderFaces;
		var facessize=ono3d.renderFaces_index;
		var vertices=ono3d.renderVertices;
		var verticessize=ono3d.renderVertices_index;
		var idxbuffer=Rastgl.idxGlBuffer.jsbuffer;

		var faceflg=Rastgl.faceflg;
		for(var i=0;i<facessize;i++){
			faceflg[i]=false;
		}
		if(!globalParam.windows){
			gl.lineWidth(ono3d.lineWidth);
		}
		gl.useProgram(program);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Rastgl.idxGlBuffer.glbuffer);
		gl.uniformMatrix4fv(args["projectionMat"],false,new Float32Array(ono3d.pvMat));
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
//		gl.vertexAttribPointer(args["aPos"].att, args["aPos"].size,args["aPos"].type, false, 0,0);
		for(var i=0;i<attributes.length;i++){
			var arg=attributes[i].arg;
			gl.vertexAttribPointer(arg.att, arg.size,arg.type, false, 0, arg.offset*4);
		}

		var vertex;
		for(var i=0;i<verticessize;i++){
			vertex=vertices[i]
			jsbuffer[i*3]=vertex.pos[0]
			jsbuffer[i*3+1]=vertex.pos[1]
			jsbuffer[i*3+2]=vertex.pos[2]
		}
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, jsbuffer);

		while(1){
			faceindex=0;
			for(var i=0;i<facessize;i++){
				if(faceflg[i])continue;
				renderface=faces[i];
				if( renderface.operator !== Ono3d.OP_LINE){
					continue;
				}
				if(faceindex !== 0 && renderface.material !== material)continue;
				material = renderface.material;
				faceflg[i]=true;

				idxbuffer[faceindex]=renderface.vertices[0].idx;
				idxbuffer[faceindex+1]=renderface.vertices[1].idx;
				faceindex+=2;
			}
			if(faceindex === 0)break;

			gl.uniform4f(args["uColor"],material.r,material.g,material.b,material.a);

			gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, idxbuffer);
			Rastgl.stereoDraw(ono3d,function(){
				gl.uniformMatrix4fv(args["projectionMat"],false,new Float32Array(ono3d.pvMat));
				gl.drawElements(gl.LINES, faceindex, gl.UNSIGNED_SHORT, 0);
			});
		}
	}

	ret.init();
	return ret;
})();
