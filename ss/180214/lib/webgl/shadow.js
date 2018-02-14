"use strict"
var Shadow=(function(){
var gl;
var ret= function(){};
var args;
var attributes;
var program;
var bM= new Array(16);
var glbuffer;
var jsbuffer;
var _offset;

	ret.init= function(){
		gl=Rastgl.gl;
		glbuffer=Rastgl.glbuffer;
		program= Rastgl.setShaderProgram(
" \
uniform mat4 projectionMat; \
attribute vec3 aPos; \
void main(void){ \
	gl_Position = projectionMat * vec4(aPos,1.0); \
} \
"
		,
" \
void main(void){ \
	gl_FragColor= vec4(gl_FragCoord.z,gl_FragCoord.z,gl_FragCoord.z,1.0); \
	if(abs(gl_FragCoord.x-512.)>510. || abs(gl_FragCoord.y-512.)>510.){ \
		gl_FragColor= vec4(1.,1.,1.,1.); \
	} \
} \
"
	);
	gl.useProgram(program);
	args={};
	args["projectionMat"]=gl.getUniformLocation(program,"projectionMat");
	attributes=[
		{name:"aPos",size:3}
	];

	Rastgl.initAttReset();
	for(var i=0;i<attributes.length;i++){
		args[attributes[i].name]=Rastgl.initAtt(program,attributes[i].name,attributes[i].size,gl.FLOAT);
		attributes[i].arg=args[attributes[i].name];
	}

	var size=0;
	for(var i=0;i<attributes.length;i++){
		size+=attributes[i].size;
	}
	jsbuffer=new Float32Array(Rastgl.VERTEX_MAX*size);
}	
ret.draw=function(ono3d){
		var renderface
		var posindex=0;
		var faces=ono3d.renderFaces;
		var facessize=ono3d.renderFaces_index;
		var vertices=ono3d.renderVertices;
		var verticessize=ono3d.renderVertices_index;
		var faceindex=0;
		var idxbuffer=Rastgl.idxGlBuffer.jsbuffer;

		gl.useProgram(program);
		gl.depthMask(true);
		gl.enable(gl.DEPTH_TEST);
		gl.cullFace(gl.BACK);
		gl.disable(gl.BLEND);

		gl.uniformMatrix4fv(args["projectionMat"],false,new Float32Array(ono3d.pvMat));

		for(var i=0;i<facessize;i++){
			renderface=faces[i];
			if(renderface.operator == Ono3d.OP_TRIANGLES){
				idxbuffer[faceindex]=renderface.vertices[0].idx;
				idxbuffer[faceindex+1]=renderface.vertices[1].idx;
				idxbuffer[faceindex+2]=renderface.vertices[2].idx;
				faceindex+=3;
			}
		}
		var vertex;
		for(var i=0;i<verticessize;i++){
			vertex=vertices[i]
			jsbuffer[i*3]=vertex.pos[0]
			jsbuffer[i*3+1]=vertex.pos[1]
			jsbuffer[i*3+2]=vertex.pos[2]
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, jsbuffer);
		for(var i=0;i<attributes.length;i++){
			var arg=attributes[i].arg;
			gl.vertexAttribPointer(arg.att, arg.size,arg.type, false, 0, arg.offset*4);
		}

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Rastgl.idxGlBuffer.glbuffer);
		gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, idxbuffer);

		gl.drawElements(gl.TRIANGLES, faceindex, gl.UNSIGNED_SHORT, 0);
	
	}

	ret.init();
	return ret;

})();
