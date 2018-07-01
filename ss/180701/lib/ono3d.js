"use strict"
var Ono3d = (function(){
	var
		i
		
		,nearClip = 1
		,farClip = 6

		,OP_POINT=i=1
		,OP_LINE=++i
		,OP_LINES=++i
		,OP_TRIANGLES=++i
		,OP_POLYGON=++i
		,OP_LINELOOP=++i

		,RF_SHADE=1<<(i=0)
		,RF_SMOOTH=1<<(++i)
		,RF_TOON=1<<(++i)
		,RF_LINE=1<<(++i)
		,RF_TEXTURE=1<<(++i)
		,RF_OUTLINE=1<<(++i)
		,RF_ENVMAP=1<<(++i)
		,RF_DOUBLE_SIDED = 1<<(++i)
		,RF_DEPTHTEST = 1<<(++i)
		,RF_PERSCOLLECT = 1<<(++i)
		,RF_PHONGSHADING= 1<<(++i)
		
		,LT_DIRECTION=i=1
		,LT_AMBIENT=++i
		
		,drawMethod=0
		,drawPolygon
	;

	var RenderMaterial =function(){
		this.name="";
		this.normalmap=null; //法線マップ
		this.normalmapvalue=0.0; //法線マップ強度
		this.r=1.0; //ベースカラー
		this.g=1.0;
		this.b=1.0;
		this.a=1.0;
		this.texture=null; //ベースカラーテクスチャ
		this.offsetx=0.0; //uvオフセット
		this.offsety=0.0; //

		this.emt=0.0; //自己発光強度
		this.spc=0.0; //スペキュラ強度
		this.mrr=0.0; //反射強度
		this.rough=1.0; //反射粗度

		this.opacity = 1.0; //不透明度
		this.transRough = 0.0; //透明粗度
		this.ior = 0.0; //屈折率


		this.bold=1.0; //太さ
	}
	var RenderFace = function(){
		this.operator;
		this.bold=1;
		this.uv = new Array(3);
		this.uv[0]=new Vec2();
		this.uv[1]=new Vec2();
		this.uv[2]=new Vec2();
		this.normalmap=null;
		this.normalmapvalue=0;
		this.nuv = new Array(3);
		this.nuv[0]=new Vec2();
		this.nuv[1]=new Vec2();
		this.nuv[2]=new Vec2();
		this.vertices=new Array(3);
		this.normal=new Vec3();
		this.angle=new Vec3();
	}
	var RenderVertex = function(){
		this.pos = new Vec3()
		this.normal = new Vec3()
		this.screenx=0
		this.screeny=0
		this.screenz=0
		this.angle = new Vec3()
	}
	
	var bV0 = new Vec3()
	,bV1=new Vec3()
	,bV2=new Vec3()
	,bV3=new Vec3()
	,bM=new Mat44()
	,bufuv1=new Vec2()
	,bufuv2=new Vec2()
	,bufvertex1=new RenderVertex()
	,bufvertex2=new RenderVertex()
	,poses = new Array(4)
	,uvs = new Array(4)


	var qSort = function(target,first,last,rev){
		var i,j,p,buf
		
		if(last<=first)return
		
		i=first;j=last;p=target[last+1+first>>1].z
	
		if(rev){
			while(1){
				while(target[i].z>p)i++
				while(target[j].z<p)j--
				if(i>=j)break
				buf=target[i]
				target[i]=target[j]
				target[j]=buf
				i++;j--
				if(i>last || j<first)break
			}
		}else{
			while(1){
				while(target[i].z<p)i++
				while(target[j].z>p)j--
				if(i>=j)break
				buf=target[i]
				target[i]=target[j]
				target[j]=buf
				i++;j--
				if(i>last || j<first)break
			}
		}
	
		qSort(target,first,i-1,rev)
		qSort(target,j+1,last,rev)
	}

	function caling(a,d,renderFace,n0,n1,persx,persy,width,height){
		var b = renderFace.vertices[n0]
		,c = renderFace.vertices[n1]
		,bz=b.pos[2]
		,cz=c.pos[2]
		,retio = (bz-nearClip)/(bz-cz)
		,retio2=1-retio
		
		a.pos[0] = c.pos[0]*retio + b.pos[0]*retio2
		a.pos[1] = c.pos[1]*retio + b.pos[1]*retio2
		a.pos[2] = nearClip

		a.screenx = (-a.pos[0]/persx + 0.5)*width
		a.screeny = (-a.pos[1]/persy + 0.5)*height

		a.light = c.light* retio + b.light*retio2

		b=renderFace.uv[n0]
		c=renderFace.uv[n1]
		d[0] = c[0]*retio + b[0]*retio2
		d[1] = c[1]*retio + b[1]*retio2
	}
	
	
	
	var Ono3d = function(){
		this.rf = 0
		this.smoothing = 0
		this.viewMatrix=new Mat44()
		this.worldMatrix=new Mat44()
		this.targetMatrix = this.worldMatrix
		this.projectionMatrix=new Mat44();
		this.pvMatrix=new Array(16);//new Mat44()
		this.persx
		this.persy
		this.renderFaces_index = 0
		this.renderVertices_index = 0
		this.renderVertex_carent = 0
		this.viewport = new Array(4);
		this.znear=1;
		this.zfar=80;
		this.aov=1;

		this.renderTarget
		this.canvasTarget

		this.lightSources = new Array()
		
		this.color=0
		this.dif=0
		this.spc=0
		this.bold=1.0
		this.texture=null
		this.uv_u=0
		this.uv_v=0
		this.zoffset=0
		this.envTexture=null
		this.backTexture=null
		this.lineColor=new Vec4();

		var i
		,RENDERFACES_MAX=4096
		
		this.renderMaterials=[];
		for(i=0;i<RENDERFACES_MAX;i++)this.renderMaterials.push(new RenderMaterial());

		this.renderFaces = new Array(RENDERFACES_MAX)
		for(i=this.renderFaces.length;i--;){
			this.renderFaces[i] = new RenderFace()
				this.renderFaces[i].material = this.renderMaterials[0];
		}


		this.renderVertices = new Array(RENDERFACES_MAX)
		for(i=this.renderVertices.length;i--;){
			this.renderVertices[i] = new RenderVertex()
			this.renderVertices[i].idx=i;
		}


		this.stackTransMatrix=new Array()
		this.stackIndex=0
		for(var i=32;i--;)this.stackTransMatrix.push(new Mat44())

		this.clear()

	}
	var ret = Ono3d;


	var calcSpcVec3=new Vec3()
	var calcSpc= ret.calcSpc =function(normal,angle,spca,lightSources){
		var i
		,light=0
		,dot1
		,lightSource
		,bv=calcSpcVec3
		,dot

		for(i=lightSources.length;i--;){
			lightSource = lightSources[i]
			if(lightSource.type ===LT_DIRECTION){
				dot1=-Vec3.dot(lightSource.viewAngle,normal)
				if(dot1<0)continue
				Vec3.mult(bv,normal,2*dot1)
				Vec3.add(bv,lightSource.viewAngle,bv)

				dot=-Vec3.dot(angle,bv)
				if(dot<0)continue
				light +=Math.pow(dot,spca)*lightSource.power* dot1;
			}
		}
		if(light<0)return 0
		else if(light>1)return 1

		return light
	}
	var calcLighting = ret.calcLighting = function(normal,lightSources){
		var i
		,light=0
		,dot
		,lightSource

		for(i=lightSources.length;i--;){
			lightSource = lightSources[i]
			if(lightSource.type ===LT_DIRECTION){
				dot=(1-Vec3.dot(lightSource.viewAngle,normal))*0.5;
				light +=dot*lightSource.power;
			}else if(lightSource.type === LT_AMBIENT){
				light += lightSource.power
			}
		}
		if(light<0)return 0
		else if(light>1)return 1

		return light
	}


	ret.OP_POINT=OP_POINT
	ret.OP_LINE=OP_LINE
	ret.OP_LINES=OP_LINES
	ret.OP_LINELOOP=OP_LINELOOP
	ret.OP_TRIANGLES=OP_TRIANGLES
	ret.OP_POLYGON=OP_POLYGON

	ret.RF_SHADE=RF_SHADE
	ret.RF_SMOOTH=RF_SMOOTH
	ret.RF_TOON=RF_TOON
	ret.RF_LINE=RF_LINE
	ret.RF_OUTLINE=RF_OUTLINE
	ret.RF_TEXTURE=RF_TEXTURE
	ret.RF_ENVMAP=RF_ENVMAP
	ret.RF_DEPTHTEST=RF_DEPTHTEST
	ret.RF_PERSCOLLECT=RF_PERSCOLLECT
	ret.RF_DOUBLE_SIDED=RF_DOUBLE_SIDED
	ret.RF_PHONGSHADING=RF_PHONGSHADING

	ret.LT_DIRECTION = LT_DIRECTION
	ret.LT_AMBIENT=LT_AMBIENT
	
	ret.setDrawMethod=function(n){
		if(drawMethod===n){ return; }

		drawMethod=parseInt(n)
		if(drawMethod===0){
			drawPolygon=RastC2D.drawPolygon
		}else if(drawMethod===1){
			drawPolygon=RastC2D.drawPolygon1
		}else if(drawMethod===2){
			drawPolygon=RastC2D.drawPolygon2
		}else if(drawMethod===3){
			drawPolygon=Rastgl.drawMethod;
		}else if(drawMethod===9){
			drawPolygon=Rastono.drawMethod;
		}

	}
	ret.getDrawMethod=function(){
		return drawMethod
	}
	ret.setTrueRefract=function(n){
		trueRefract=n
	}
	ret.prototype= {

		begin:function(operator){
			var renderFace=this.renderFaces[this.renderFaces_index]
			renderFace.operator =operator
			renderFace.vertices[0]=null
			renderFace.vertices[1]=null
			renderFace.z=0
			renderFace.spc=0;
			if(operator===OP_LINELOOP){
				this.renderVertex_carent=this.renderVertices[this.renderVertices_index]
			}
		}
		,end:function(){
			if(this.renderVertex_carent){
				this.begin(OP_LINE)
				var renderFace=this.renderFaces[this.renderFaces_index]
				renderFace.vertices[0] = this.renderVertices[this.renderVertices_index-1]
				renderFace.vertices[1] = this.renderVertex_carent
				renderFace.argb = this.color
				renderFace.bold = this.bold
				renderFace.alpha=1
				renderFace.z*=0.5
				renderFace.z+=this.zoffset+this.renderFaces_index*0.00001
				this.renderFaces_index ++

				this.renderVertex_carent=null
			}	
		}
		,setUv:function(u,v){
			var renderFace=this.renderFaces[this.renderFaces_index]
			var uv
			if(!renderFace.vertices[0]){
				uv=renderFace.uv[0]
			}else if(!renderFace.vertices[1]){
				uv=renderFace.uv[1]
			}else{
				uv=renderFace.uv[2]
			}

			uv[0]=u
			uv[1]=v
		}
		,getPos:function(pos,x,y,z){
			pos[0]=x
			pos[1]=y
			pos[2]=z
			Mat44.dotMat44Vec3(pos,this.targetMatrix,pos)

			pos[0] = -pos[0]/(pos[2]*this.persx)+0.5
			pos[1] = -pos[1]/(pos[2]*this.persy)+0.5
			
		}
		,setVertex:function(x,y,z){
			var 
			renderVertex= this.renderVertices[this.renderVertices_index]
			,renderFace=this.renderFaces[this.renderFaces_index]
			,pos = renderVertex.pos
			
			pos[0]=x
			pos[1]=y
			pos[2]=z
			Mat44.dotMat44Vec3(pos,this.targetMatrix,pos)

			
			renderFace.z+=pos[2]
			
			switch(renderFace.operator){
			case OP_POINT:
				renderFace.vertices[0] = renderVertex
				renderFace.r = this.r
				renderFace.g = this.g
				renderFace.b = this.b
				renderFace.a = this.a
				renderFace.bold = this.bold
				renderFace.z+=this.zoffset
				renderFace.rf=this.rf
				this.renderFaces_index ++
				this.begin(OP_POINT)
				break

			case OP_LINE:
			case OP_LINELOOP:
				if(renderFace.vertices[0] === null){
					renderFace.vertices[0] = renderVertex
				}else{
					renderFace.vertices[1] = renderVertex
					renderFace.r = ((this.color>>16)&0xff)/255.0
					renderFace.g = ((this.color>>8)&0xff)/255.0
					renderFace.b = ((this.color>>0)&0xff)/255.0
					renderFace.a = ((this.color>>24)&0x7f)/127.0
					renderFace.bold = this.bold
					renderFace.z*=0.5
					renderFace.z+=this.zoffset+this.renderFaces_index*0.00001
					renderFace.operator=OP_LINE
					renderFace.rf=this.rf
					this.renderFaces_index ++
					renderFace = this.renderFaces[this.renderFaces_index]
					this.begin(OP_LINE)
					renderFace.vertices[0] = renderVertex
				}
				break
			case OP_LINES:
				if(renderFace.vertices[0] === null){
					renderFace.vertices[0] = renderVertex
				}else{
					renderFace.vertices[1] = renderVertex
					renderFace.r = ((this.color>>16)&0xff)/255.0
					renderFace.g = ((this.color>>8)&0xff)/255.0
					renderFace.b = ((this.color>>0)&0xff)/255.0
					renderFace.a = ((this.color>>24)&0x7f)/127.0
					renderFace.bold = this.bold
					renderFace.operator = OP_LINE
					renderFace.z*=0.5
					renderFace.z+=this.zoffset
					renderFace.rf=this.rf
					renderFace.texture=this.texture
					renderFace.mrr=this.mrr;
					renderFace=this.renderFaces[this.renderFaces_index]
					this.renderFaces_index ++
					this.begin(OP_LINES)
					
				}
				break
			case OP_TRIANGLES:
				if(renderFace.vertices[0] === null){
					renderFace.vertices[0] = renderVertex
				}else if(renderFace.vertices[1] === null){
					renderFace.vertices[1] = renderVertex
				}else{
					renderFace.vertices[2] = renderVertex
					renderFace.argb = this.color
					renderFace.bold = this.bold
					renderFace.alpha=1
					renderFace.operator = OP_TRIANGLES
					renderFace.z*=0.333333
					renderFace.z+=this.zoffset
					renderFace.texture=this.texture
					renderFace.envTexture=this.envTexture
					renderFace.rf=this.rf
					this.renderFaces_index ++
					this.begin(OP_TRIANGLES)
				}
				break
			case OP_POLYGON:
				if(renderFace.vertices[0] === null){
					renderFace.vertices[0] = renderVertex
				}else if(renderFace.vertices[1] === null){
					renderFace.vertices[1] = renderVertex
				}else{
					renderFace.vertices[2] = renderVertex
					renderFace.argb = this.color
					renderFace.bold = this.bold
					renderFace.alpha=1
					renderFace.operator = OP_TRIANGLES
					renderFace.z*=0.333333
					renderFace.z+=this.zoffset
					renderFace.texture=this.texture
					renderFace.envTexture=this.envTexture
					renderFace.rf=this.rf
					this.renderFaces_index ++
					this.begin(OP_TRIANGLES)
					var old=renderFace
					renderFace=this.renderFaces[this.renderFaces_index]
					renderFace.vertices[0]=old.vertices[0]
					renderFace.vertices[1]=old.vertices[2]
					renderFace.uv[0][0]=old.uv[0][0]
					renderFace.uv[0][1]=old.uv[0][1]
					renderFace.uv[1][0]=old.uv[2][0]
					renderFace.uv[1][1]=old.uv[2][1]
					renderFace.z=(old.z-this.zoffset)*3-pos[2]
				}
				break
			}
			this.renderVertices_index ++
		}
		,setVertexV:function(x){
			this.setVertex(x[0],x[1],x[2])
		}	
		//
		,LightSource: function(){
			this.matrix= new Mat44()
			this.viewmatrix= new Mat44()
			this.color = new Vec3()
			this.type
			this.power =1
		}
		,render_lineonly:function(target){
			var renderFace
			var vertices
			var a,b,c
			var count=0
			var i
			var pos
			var width=this.rendercanvas.width
			,height=this.rendercanvas.height
			,persx = this.persx
			,persy=this.persy

			for(i=this.renderVertices_index;i--;){
				a = this.renderVertices[i]
				pos = a.pos
				a.screenx = (-pos[0]/(pos[2]*this.persx)+0.5)*width
				a.screeny = (-pos[1]/(pos[2]*this.persy)+0.5)*height
			}
			target.lineWidth=this.bold
			target.strokeStyle="#" + ("000000"+this.color.toString(16)).slice(-6)
			target.globalAlpha=(this.color>>>24) / 0x7f
			target.beginPath()
			
			if(drawMethod===9){
				var imagedata=this.targetImageData
				for(i=this.renderFaces_index;i--;){
					count = 0
					renderFace = this.renderFaces[i]
					vertices= renderFace.vertices
					
					switch(renderFace.operator){
					case OP_DOT:
						a = vertices[0].pos
						b = renderFace.bold>>1
						Rastono.drawLine(imagedata,a.screenx-b,a.screeny-b,a.screenx+b,a.screeny+b)
						Rastono.drawLine(imagedata,a.screenx+b,a.screeny+b,a.screenx-b,a.screeny-b)
						break
					case OP_LINE:
						if(vertices[0].pos[2] >= nearClip){
							count ++
							a = 0
							b = 1
							if(vertices[1].pos[2] >= nearClip){
								count ++
							}
						}else{
							if(vertices[1].pos[2] >= nearClip){
								count ++
								a = 1
								b = 0
							}
						}
						Rastono.setUV(null)
						if(count===2){
							Rastono.setXYZ2(vertices[0].screenx,vertices[0].screeny,vertices[0].pos[2]
								,vertices[1].screenx,vertices[1].screeny,vertices[1].pos[2])
							Rastono.setRGB(0,1,0,0,1,0,0,1,0)
							Rastono.drawLine(imagedata)
						}else if(count ===1){
							caling(bufvertex1,bufuv1,renderFace,a,b,persx,persy,width,height)
							Rastono.setXYZ2(vertices[a].screenx,vertices[a].screeny,vertices[a].pos[2]
								,bufvertex1.screenx,bufvertex1.screeny,1)
							Rastono.setRGB(0,1,0,0,1,0,0,1,0)
							Rastono.drawLine(imagedata)
						}
						break
					}
				}
			}else{
				for(i=this.renderFaces_index;i--;){
					count = 0
					renderFace = this.renderFaces[i]
					vertices= renderFace.vertices
					switch(renderFace.operator){
					case OP_DOT:
						a = vertices[0].pos
						b = renderFace.bold>>1
						target.moveTo(a.screenx-b,a.screeny-b)
						target.lineTo(a.screenx+b,a.screeny+b)
						target.moveTo(a.screenx+b,a.screeny-b)
						target.lineTo(a.screenx-b,a.screeny+b)
						break
					case OP_LINE:
						if(vertices[0].pos[2] >= nearClip){
							count ++
							a = 0
							b = 1
							if(vertices[1].pos[2] >= nearClip){
								count ++
							}
						}else{
							if(vertices[1].pos[2] >= nearClip){
								count ++
								a = 1
								b = 0
							}
						}
						if(count===2){
							target.moveTo(vertices[0].screenx,vertices[0].screeny)
							target.lineTo(vertices[1].screenx,vertices[1].screeny)
						}else if(count ===1){
							caling(bufvertex1,bufuv1,renderFace,a,b,persx,persy,width,height)
							target.moveTo(vertices[a].screenx,vertices[a].screeny)
							target.lineTo(bufvertex1.screenx,bufvertex1.screeny)
						}
						break
					}
				}
				target.closePath()
				target.stroke()
			}
		}
		,render:function(target){
			var renderFace
			,vertices
			,a,b,c
			,count=0
			,bufuv = bV1
			,ret,ret2
			,pos
			,i
			,width
			,height
			,persx=this.persx
			,persy=this.persy
			,R,G,B,A
			this.renderTarget=target
			if(drawMethod!==3){
				width=this.rendercanvas.width
				height=this.rendercanvas.height

				for(i=this.renderVertices_index;i--;){
					a = this.renderVertices[i]
					pos = a.pos
					a.screenx = (-pos[0]/(pos[2]*persx)+0.5)*width +0.5
					a.screeny = (-pos[1]/(pos[2]*persy)+0.5)*height + 0.5
					Vec3.nrm(a.angle,pos)
				}
			}
			if(drawMethod===3 || drawMethod===9){
//				qSort(this.renderFaces,0,this.renderFaces_index-1,1);
			}else{
				qSort(this.renderFaces,0,this.renderFaces_index-1,0);
			}


			if(drawMethod!==3){
			for(i=this.renderFaces_index;i--;){
				count = 0
				renderFace = this.renderFaces[i]
				vertices= renderFace.vertices
				switch(renderFace.operator){
				case OP_DOT:
//					a = vertices[0].pos
//					target.fillStyle=Util.rgb(renderFace.r,renderFace.g,renderFace.b)
//					target.globalAlpha=renderFace.a
//					b = renderFace.bold
//					target.fillRect(vertices[0].screenx-(b>>1)-0.5,vertices[0].screeny-(b>>1)-0.5,b,b)
					break
				case OP_LINE:
					if(vertices[0].pos[2] >= nearClip){
						count ++
						a = 0
						b = 1
						if(vertices[1].pos[2] >= nearClip){
							count ++
						}
					}else{
						if(vertices[1].pos[2] >= nearClip){
							count ++
							a = 1
							b = 0
						}
					}
					if(count===2){
						drawPolygon(this,renderFace)
					}else if(count ===1){
						caling(bufvertex1,bufuv1,renderFace,a,b,persx,persy,width,height)

						pos = bufvertex1.pos
						bufvertex1.screenx = (-pos[0]/(pos[2]*persx))*2
						bufvertex1.screeny = (-pos[1]/(pos[2]*persy))*2
						bufvertex1.screenz = pos[2]/100;
						Vec3.nrm(bufvertex1.angle,pos)
						poses[0] = vertices[a];
						uvs[0] = renderFace.uv[a];
						poses[1] = bufvertex1;
						uvs[1] = bufuv1;
						ret= renderFace.vertices
						ret2= renderFace.uv
						renderFace.uv =uvs
						renderFace.vertices = poses
						drawPolygon(this,renderFace)
						renderFace.vertices =ret 
						renderFace.uv = ret2
					}
					break
				case OP_TRIANGLES:
					poses[3] = null
					if(vertices[0].pos[2] >= nearClip){
						poses[0] = vertices[0]
						uvs[0] = renderFace.uv[0]
						if(vertices[1].pos[2] >= nearClip){
							poses[1] = vertices[1]
							uvs[1] = renderFace.uv[1]
							if(vertices[2].pos[2] >= nearClip){
								poses[2] = vertices[2]
								uvs[2] = renderFace.uv[2]
							}else{
								poses[2]=bufvertex1
								poses[3]=bufvertex2
								uvs[2]=bufuv1
								uvs[3]=bufuv2
								caling(bufvertex1,bufuv1,renderFace,1,2,persx,persy,width,height)
								caling(bufvertex2,bufuv2,renderFace,2,0,persx,persy,width,height)
							}
								
						}else{
							if(vertices[2].pos[2] >= nearClip){
								poses[1]=bufvertex1
								poses[2]=bufvertex2
								uvs[1]=bufuv1
								uvs[2]=bufuv2
								
								caling(bufvertex1,bufuv1,renderFace,0,1,persx,persy,width,height)
								caling(bufvertex2,bufuv2,renderFace,1,2,persx,persy,width,height)
								poses[3] = vertices[2]
								uvs[3] = renderFace.uv[2]
							}else{
								poses[1]=bufvertex1
								poses[2]=bufvertex2
								uvs[1]=bufuv1
								uvs[2]=bufuv2
								caling(bufvertex1,bufuv1,renderFace,0,1,persx,persy,width,height)
								caling(bufvertex2,bufuv2,renderFace,2,0,persx,persy,width,height)
							}
						}
					}else{
						if(vertices[1].pos[2] >= nearClip){
							if(vertices[2].pos[2] >= nearClip){
								poses[1] = vertices[1]
								uvs[1] = renderFace.uv[1]
								poses[2] = vertices[2]
								uvs[2] = renderFace.uv[2]
								poses[0]=bufvertex1
								poses[3]=bufvertex2
								uvs[0]=bufuv1
								uvs[3]=bufuv2
								caling(bufvertex1,bufuv1,renderFace,0,1,persx,persy,width,height)
								caling(bufvertex2,bufuv2,renderFace,2,0,persx,persy,width,height)
							}else{
								poses[0]=bufvertex1
								uvs[0]=bufuv1
								poses[1] = vertices[1]
								uvs[1] = renderFace.uv[1]
								poses[2] = bufvertex2
								uvs[2] = bufuv2
								caling(bufvertex1,bufuv1,renderFace,0,1,persx,persy,width,height)
								caling(bufvertex2,bufuv2,renderFace,1,2,persx,persy,width,height)
							}
						}else{
							if(vertices[2].pos[2] >= nearClip){
								poses[0]=bufvertex1
								uvs[0]=bufuv1
								poses[1] = vertices[2]
								uvs[1] = renderFace.uv[2]
								poses[2] = bufvertex2
								uvs[2] = bufuv2
								caling(bufvertex1,bufuv1,renderFace,1,2,persx,persy,width,height)
								caling(bufvertex2,bufuv2,renderFace,2,0,persx,persy,width,height)
							}else{
								continue
							}
						}
					}
					drawPolygon(this,renderFace)
					if(poses[3]){
					ret= renderFace.vertices
					ret2= renderFace.uv
					renderFace.uv =uvs
					renderFace.vertices = poses
						uvs[1]=uvs[2]
						poses[1]=poses[2]
						uvs[2]=uvs[3]
						poses[2]=poses[3]
						drawPolygon(this,renderFace)
					renderFace.vertices =ret 
					renderFace.uv = ret2
					}
				
				}
			}
			}else{
				//Rastgl.set(this);
				Rastgl.flush(this);
			}
		}
		,framebuffer:function(){
			Rastgl.framebuffer(this);
		}
		,init:function(_canvas,_ctx){
			this.clear()

			this.renderTarget=_ctx
			this.canvasTarget=_canvas

		}
		,setTargetMatrix:function(target){
			if(target===0){
				this.targetMatrix = this.worldMatrix
			}else{
				this.targetMatrix = this.viewMatrix
			}
		}
		,setViewport:function(x,y,width,height){
			this.viewport[0]=x;
			this.viewport[1]=y;
			this.viewport[2]=width;
			this.viewport[3]=height;
			Rastgl.viewport(x,y,width,height);
		}
		,setNearFar:function(zn,zf){
			this.znear=zn;
			this.zfar=zf;
		}
		,setAov:function(aov){
			this.aov=aov;
		}

		,setPers:function(x,y,zn,zf){
			if(zn==null){
				zn=this.znear;
				zf=this.zfar;
			}
			
			if(x>0)this.persx = x;
			if(y>0)this.persy = this.persx*y;
			Mat44.set(this.projectionMatrix
				,1/this.persx,0,0,0
				,0,1/this.persy,0,0
				,0,0,-(zn+zf)/(zf-zn),-1.0
				,0,0,-2*zn*zf/(zf-zn),0);
		}
		,ortho:function(mat,x,y,zn,zf){
			
			Mat44.set(mat
			,-1.0/x,0,0,0
			,0,1.0/y,0,0.0
			,0,0,2.0/(zf-zn),0.0
			,0,0,-(zf+zn)/(zf-zn),1.0);
		}
		,setOrtho:function(x,y,zn,zf){
			
			Mat44.set(this.projectionMatrix
			,-1.0/x,0,0,0
			,0,1.0/y,0,0.0
			,0,0,2.0/(zf-zn),0.0
			,0,0,-(zf+zn)/(zf-zn),1.0);
		}
		,push:function(){
			if(this.stackIndex>=32)return
			var stm=this.stackTransMatrix[this.stackIndex]
			var tm=this.targetMatrix
			stm[0]=tm[0]
			stm[1]=tm[1]
			stm[2]=tm[2]
			stm[4]=tm[4]
			stm[5]=tm[5]
			stm[6]=tm[6]
			stm[8]=tm[8]
			stm[9]=tm[9]
			stm[10]=tm[10]
			stm[12]=tm[12]
			stm[13]=tm[13]
			stm[14]=tm[14]
			this.stackIndex++
		}
		,pop:function(){
			if(this.stackIndex<=0)return
			this.stackIndex--
			var stm=this.stackTransMatrix[this.stackIndex]
			var tm=this.targetMatrix
			tm[0]=stm[0]
			tm[1]=stm[1]
			tm[2]=stm[2]
			tm[4]=stm[4]
			tm[5]=stm[5]
			tm[6]=stm[6]
			tm[8]=stm[8]
			tm[9]=stm[9]
			tm[10]=stm[10]
			tm[12]=stm[12]
			tm[13]=stm[13]
			tm[14]=stm[14]
		}
		,loadIdentity:function(){
			var mat = this.targetMatrix
			mat[0] = 1.0
			mat[1] = 0
			mat[2] = 0
			mat[4] = 0
			mat[5] = 1.0
			mat[6] = 0
			mat[8] = 0
			mat[9] = 0
			mat[10] = 1.0
			mat[12] = 0
			mat[13] = 0
			mat[14] = 0
		}
		,rotate:function(r,x,y,z){
			var SIN=Math.sin(r)
			var COS=Math.cos(r)
			var a = bM
			a[0]=x*x*(1-COS)+COS;a[4]=x*y*(1-COS)-z*SIN;a[8]=z*x*(1-COS)+y*SIN;a[12]=0
			a[1]=x*y*(1-COS)+z*SIN;a[5]=y*y*(1-COS)+COS;a[9]=y*z*(1-COS)-x*SIN;a[13]=0
			a[2]=z*x*(1-COS)-y*SIN;a[6]=y*z*(1-COS)+x*SIN;a[10]=z*z*(1-COS)+COS;a[14]=0
			Mat44.dot(this.targetMatrix,this.targetMatrix,a)
		}
		,scale:function(x,y,z){
			var m = this.targetMatrix;
			m[0]=m[0]*x;
			m[1]*=x;
			m[2]*=x;
			m[4]*=y;
			m[5]*=y;
			m[6]*=y;
			m[8]*=z;
			m[9]*=z;
			m[10]*=z;
		}
		,translate:function(x,y,z){
			var m = this.targetMatrix
			m[12]=m[0]*x+m[4]*y+m[8]*z+m[12]
			m[13]=m[1]*x+m[5]*y+m[9]*z+m[13]
			m[14]=m[2]*x+m[6]*y+m[10]*z+m[14]
		}
		,transmat:function(m){
			Mat44.dot(this.targetMatrix,this.targetMatrix,m);
		}

		,clear: function(){
			this.renderFaces_index=0
			this.renderVertices_index=0
			this.renderMaterials_index=0;
		}

	}
	ret.prototype.stereoDraw = function(func){
		var WIDTH=this.viewport[2];
		var HEIGHT=this.viewport[3];
		var p=1.0;
		var q=(1-p)*0.5;
		var stereo;

		if(globalParam.stereomode==0){
			globalParam.gl.viewport(0,0,WIDTH,HEIGHT);
			this.setPers(this.aov,HEIGHT/WIDTH);
			Mat44.dot(this.pvMatrix,this.projectionMatrix,this.viewMatrix);
			func();
		}else{
			WIDTH =WIDTH/2;
			globalParam.gl.viewport(WIDTH*q,HEIGHT*q,WIDTH*p,HEIGHT*p);
			stereo=globalParam.stereo;
			this.setPers(this.aov,HEIGHT/WIDTH);
			this.projectionMatrix[8]=0;//stereo/10;
			this.projectionMatrix[12]=stereo;
			Mat44.dot(this.pvMatrix,this.projectionMatrix,this.viewMatrix);
			func();

			this.projectionMatrix[12]*=-1;
			Mat44.dot(this.pvMatrix,this.projectionMatrix,this.viewMatrix);
			globalParam.gl.viewport(WIDTH+WIDTH*q,HEIGHT*q,WIDTH*p,HEIGHT*p);
			func();
		}
	}

	ret.loadTexture = function(path,func){
		return Rastgl.loadTexture(path,func);
	}
	ret.loadBumpTexture = function(path){
		return Rastgl.loadBumpTexture(path);
	}
	ret.loadCubemap = function(path,func){
		return Rastgl.loadCubemap(path,func);
	}
	return ret

})()
