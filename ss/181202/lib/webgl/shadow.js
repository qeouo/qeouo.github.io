"use strict"
var Shadow=(function(){
var gl;
var shader;
var ret= function(){};
var bM= new Array(16);
var f32a = new Float32Array(16);
var glbuffer;
var _offset;

	ret.init= function(){
		gl=Rastgl.gl;
		shader = Ono3d.createShader("shadow",
" \
uniform mat4 projectionMatrix; \
attribute vec3 aPos; \
void main(void){ \
	gl_Position = projectionMatrix * vec4(aPos,1.0); \
} \
"
		,
" \
void main(void){ \
	gl_FragColor= vec4(gl_FragCoord.z,gl_FragCoord.z,gl_FragCoord.z,1.0); \
	if(abs(gl_FragCoord.x-512.)>510. || abs(gl_FragCoord.y-512.)>510.){ \
		gl_FragColor= vec4(1.,1.,1.,1.); \
	} \
} "
,["aPos"],["projectionMatrix"]);
	}	

	ret.draw=function(ono3d,matrix){
		var renderface
		var posindex=0;
		var faces=ono3d.faces;
		var facessize=ono3d.faces_index;
		var vertices=ono3d.vertices;
		var verticessize=ono3d.vertices_index;
		var faceindex=0;
		var idxbuffer = Rastgl.getJsIdxBuffer(facessize*3);



		var args = shader.args;

		gl.useProgram(shader.program);
		gl.depthMask(true);
		gl.enable(gl.DEPTH_TEST);
		gl.cullFace(gl.BACK);
		gl.disable(gl.BLEND);

		for(var i=0;i<16;i++){
			f32a[i] = matrix[i];
		}

		gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,f32a);

		for(var i=0;i<facessize;i++){
			renderface=faces[i];
			if(renderface.operator == Ono3d.OP_TRIANGLES){
				idxbuffer[faceindex]=renderface.vertices[0].idx;
				idxbuffer[faceindex+1]=renderface.vertices[1].idx;
				idxbuffer[faceindex+2]=renderface.vertices[2].idx;
				faceindex+=3;
			}
		}
		var jsbuffer = Rastgl.getJsBuffer(verticessize*3);
		var vertex;
		for(var i=0;i<verticessize;i++){
			vertex=vertices[i]
			jsbuffer[i*3]=vertex.pos[0]
			jsbuffer[i*3+1]=vertex.pos[1]
			jsbuffer[i*3+2]=vertex.pos[2]
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, jsbuffer);


		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Rastgl.glIdxBuffer);
		gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, idxbuffer);

		gl.vertexAttribPointer(shader.atts["aPos"], 3,gl.FLOAT, false,0 , 0);
		//Rastgl.vertexAttribPointers(shader);

		gl.drawElements(gl.TRIANGLES, faceindex, gl.UNSIGNED_SHORT, 0);
	
	}

	ret.init();
	return ret;

})();
