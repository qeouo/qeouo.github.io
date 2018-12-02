"use strict"
//plainShader
var Plain=(function(){
	var ret={};
	var gl;
	var shader;

	ret.init= function(){
		gl=Rastgl.gl;

		shader = Ono3d.createShader("plain"," \
attribute vec3 aPos; \
uniform mat4 projectionMatrix; \
void main(void){ \
	gl_Position = projectionMatrix * vec4(aPos,1.0); \
	gl_Position = vec4(gl_Position.xy,gl_Position.z*0.9997,gl_Position.w); \
} ","  \
uniform lowp vec4 uColor; \n \
void main(void){ \n \
    highp float m = max(1.0,max(uColor.r,max(uColor.g,uColor.b))); \n \
	gl_FragColor = vec4(uColor.rgb/m,(m-1.0)/3.0); \n \
} "
,["aPos"],["uColor","projectionMatrix"]);

	}

	var arr;
	var arrIndexes;
	ret.draw=function(ono3d,oflg){

		var renderface;
		var material;
		var faces=ono3d.faces;
		var facessize=ono3d.faces_index;
		var vertices=ono3d.vertices;
		var verticessize=ono3d.vertices_index;

		arr=[];
		for(var i=0;i<facessize;i++){
			if(faces[i].operator !== Ono3d.OP_LINE){
				continue;
			}
			arr.push(faces[i]);
		}
		arr.sort(function(a,b){return a.materialIndex-b.materialIndex;});


		var bsize = 3 * verticessize;

		var a = verticessize;
		var buff = Rastgl.getJsBuffer(bsize);
		if(buff.length<bsize){
			bsize = buff.length;
			a = (bsize/3)|0
		}
		var idxbuffer = Rastgl.getJsIdxBuffer(facessize*2);
		if(idxbuffer.length<facessize*2){
			facessize = idxbuffer.length/2;
		}

		var vertex;
		for(var i=0;i<a;i++){
			vertex=vertices[i]
			buff[i*3]=vertex.pos[0]
			buff[i*3+1]=vertex.pos[1]
			buff[i*3+2]=vertex.pos[2]
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, Rastgl.glbuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, buff);

		var i=0;
		var materialIndex=-1;
		arrIndexes=[];
		var arrlength = arr.length;
		while(i<arrlength){
			materialIndex = arr[i].materialIndex;
			var j=i+1;
			for(j;j<arrlength;j++){
				if(arr[j].materialIndex !== materialIndex){break;}
			}
			arrIndexes.push({start:i,size:j-i,material:arr[i].material});
			i=j;
		}

		for(var i=0;i<arrlength;i++){
			renderface=arr[i];

			idxbuffer[i*2]=renderface.vertices[0].idx;
			idxbuffer[i*2+1]=renderface.vertices[1].idx;
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Rastgl.glIdxBuffer);
		gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, idxbuffer);


		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		gl.useProgram(shader.program);
		var args = shader.args;
		gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
		gl.vertexAttribPointer(shader.atts["aPos"], 3,gl.FLOAT, false,0 , 0); 
		for(var i=0;i<arrIndexes.length;i++){
			var material = arrIndexes[i].material;
			if(!globalParam.windows){
				gl.lineWidth(material.bold);
			}

			gl.uniform4f(shader.unis["uColor"],material.r,material.g,material.b,material.a);

			ono3d.stereoDraw(function(){
				gl.uniformMatrix4fv(shader.unis["projectionMatrix"],false,new Float32Array(ono3d.pvMatrix));
				gl.drawElements(gl.LINES, arrIndexes[i].size*2, gl.UNSIGNED_SHORT, arrIndexes[i].start*2*2);
			});
		}
	}

	ret.init();
	return ret;
})();
