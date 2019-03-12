var RastC2D = (function(){
	var bV0 = new Vec3()
	,bV1=new Vec3()
	,bV2=new Vec3()

	var OP_DOT=i=1
		,OP_LINE=++i
		,OP_LINES=++i
		,OP_TRIANGLES=++i
		,OP_POLYGON=++i
		,OP_POINT=++i
		,OP_LINELOOP=++i
	var RF_SHADE=1<<(i=0)
		,RF_SMOOTH=1<<(++i)
		,RF_TOON=1<<(++i)
		,RF_LINE=1<<(++i)
		,RF_TEXTURE=1<<(++i)
		,RF_OUTLINE=1<<(++i)
		,RF_ENVMAP=1<<(++i)
		,RF_DOUBLE_SIDED = 1<<(++i)
		,RF_DEPTHTEST = 1<<(++i)
		,RF_PERSCOLLECT = 1<<(++i)
		
	var LT_DIRECTION=i=1
		,LT_AMBIENT=++i
	var ret = new Function()
	var calcLighting
	var calcSpc
	var calcUv = function(target,x0,y0,x1,y1,x2,y2,u0,v0,u1,v1,u2,v2){
		var Ax,Ay,Bx,By,det
		,_Ax = x1 - x0
		,_Ay = y1 - y0
		,_Bx = x2 - x0
		,_By = y2 - y0
		,trans_a,trans_b,trans_c,trans_d
		if(Math.abs(_Ax*_By - _Bx*_Ay)<2)return 1

		By = (u1 - u0) 
		Ay = -(v1 - v0) 
		Bx = -(u2 - u0) 
		Ax = (v2 - v0) 
		det = Ax*By -Ay*Bx
		if(det*det <0.0001)return 1

		det = 1.0/det

		trans_a = (Ax * _Ax + Ay * _Bx)*det
		trans_c = (Bx * _Ax + By * _Bx)*det

		trans_b = (Ax * _Ay + Ay * _By)*det
		trans_d = (Bx * _Ay + By * _By)*det

		target.setTransform(trans_a,trans_b,trans_c,trans_d,
			x0 - (trans_a * u0 + trans_c * v0 ),
			y0 - (trans_b * u0 + trans_d * v0 ))

		return 0
	}
	
	ret.drawPolygon = function(ono3d,renderFace){
		drawPolygon_(ono3d,renderFace,0)
	}
	ret.drawPolygon1 = function(ono3d,renderFace){
		drawPolygon_(ono3d,renderFace,1)
	}
	ret.drawPolygon2 = function(ono3d,renderFace){
		drawPolygon_(ono3d,renderFace,2)
	}
	var drawPolygon_ = function(ono3d,renderFace,drawMethod){
		var vertices=renderFace.vertices
		,left,right,top,bottom
		,_left,_right,_top,_bottom
		,lightSources
		,uv,img,imgw,imgh
		,u0,v0,u1,v1,u2,v2
		,context
		,normal=renderFace.normal
		,pos=renderFace.pos
		,nx,ny,nz
		,renderTarget=ono3d.renderTarget
		,smoothing=renderFace.smoothing
		,shading=renderFace.rf&RF_SHADE
		,light=renderFace.light
		,r=renderFace.r
		,g=renderFace.g
		,b=renderFace.b
		,rgb=Util.rgb(r,g,b)//"#" + ((0x1000000|(r<<16)|(g<<8)|(b<<0)).toString(16)).slice(-6)
		,alpha=renderFace.a
		,texture=null
		,dx1,dx2,dy1,dy2,det
		,vnormal0,vnormal1,vnormal2
		,ior
		,rf = renderFace.rf
		,spc=renderFace.spc
		,spchard=renderFace.spchard
		,vtx0=vertices[0]
		,vtx1=vertices[1]
		,vtx2=vertices[2]
		if(renderFace.operator != OP_TRIANGLES){
			vtx2=vertices[1];
		}
		var p0=vtx0.pos
		,p1=vtx1.pos
		,p2=vtx2.pos

		,x0=vtx0.screenx
		,y0=vtx0.screeny
		,x1=vtx1.screenx
		,y1=vtx1.screeny
		,x2=vtx2.screenx
		,y2=vtx2.screeny
		,trans_a,trans_b,trans_c,trans_d
		,dx1 = x1 - x0
		,dy1 = y1 - y0
		,dx2 = x2 - x0
		,dy2 = y2 - y0

		if(renderFace.operator == OP_TRIANGLES){
			if((x1-x0)*(y2-y0)-(x2-x0)*(y1-y0)>0){
				if(!(rf&RF_DOUBLE_SIDED))return
				Vec3.mult(bV0,vtx0.normal,-1)
				Vec3.mult(bV1,vtx1.normal,-1)
				Vec3.mult(bV2,vtx2.normal,-1)
			}else{
				Vec3.copy(bV0,vtx0.normal)
				Vec3.copy(bV1,vtx1.normal)
				Vec3.copy(bV2,vtx2.normal)
			}
		}
		vnormal0=bV0
		vnormal1=bV1
		vnormal2=bV2
		if(smoothing==0){
			vnormal0= normal
			vnormal1= vnormal0
			vnormal2= vnormal0
		}else{
			nx=normal[0]*(1-smoothing)
			ny=normal[1]*(1-smoothing)
			nz=normal[2]*(1-smoothing)
			vnormal0[0]= nx+vnormal0[0]* smoothing
			vnormal0[1]= ny+vnormal0[1]* smoothing
			vnormal0[2]= nz+vnormal0[2]* smoothing
			vnormal1[0]= nx+vnormal1[0]* smoothing
			vnormal1[1]= ny+vnormal1[1]* smoothing
			vnormal1[2]= nz+vnormal1[2]* smoothing
			vnormal2[0]= nx+vnormal2[0]* smoothing
			vnormal2[1]= ny+vnormal2[1]* smoothing
			vnormal2[2]= nz+vnormal2[2]* smoothing
			Vec3.norm(vnormal0)
			Vec3.norm(vnormal1)
			Vec3.norm(vnormal2)
		}
	
		if(x0<x1){
			_left=x0
			_right=x1
		}else{
			_left=x1
			_right=x0
		}
		if(_left>x2) _left=x2
		else if(_right<x2)_right=x2
		if(y0<y1){
			_top=y0
			_bottom=y1
		}else{
			_top=y1
			_bottom=y0
		}
		if(_top>y2) _top=y2
		else if(_bottom<y2)_bottom=y2

		_left-=3
		_right=_right-_left+3
		_top-=3
		_bottom=_bottom-_top+3

		renderTarget.save();
		if(renderFace.operator == OP_TRIANGLES){
			if(Math.abs(dx1*dy2 - dx2*dy1)<2)return 1
			renderTarget.beginPath()
			renderTarget.moveTo(x0,y0)
			renderTarget.lineTo(x1,y1)
			renderTarget.lineTo(x2,y2)
			renderTarget.closePath()
			if(drawMethod!=2) renderTarget.clip()
		}else{
			renderTarget.beginPath()
			renderTarget.moveTo(x0,y0)
			renderTarget.lineTo(x1,y1)
			renderTarget.closePath()
		}


		renderTarget.globalCompositeOperation='source-over'

		if(renderFace.rf&RF_TEXTURE && ono3d.backTexture && alpha<1 && renderFace.ior!=1.0){
			//texture=ono3d.backTexture
			ior=renderFace.ior

			nx=vnormal0[0]
			ny=vnormal0[1]
			nz=vnormal0[2]
			det= -(p0[0]*nx+p0[1]*ny+p0[2]*nz)
			nx= (nx*det+p0[0])*ior-nx*det
			ny= (ny*det+p0[1])*ior-ny*det
			nz= (nz*det+p0[2])*ior-nz*det
			det=-100/Math.sqrt(nx*nx+ny*ny+nz*nz)
			u0=nx*det+x0
			v0=ny*det+y0

			nx=vnormal1[0]
			ny=vnormal1[1]
			nz=vnormal1[2]
			det= -(p1[0]*nx+p1[1]*ny+p1[2]*nz)
			nx= (nx*det+p1[0])*ior-nx*det
			ny= (ny*det+p1[1])*ior-ny*det
			nz= (nz*det+p1[2])*ior-nz*det
			det=-100/Math.sqrt(nx*nx+ny*ny+nz*nz)
			u1=nx*det+x1
			v1=ny*det+y1

			nx=vnormal2[0]
			ny=vnormal2[1]
			nz=vnormal2[2]
			det= -(p2[0]*nx+p2[1]*ny+p2[2]*nz)
			nx= (nx*det+p2[0])*ior-nx*det
			ny= (ny*det+p2[1])*ior-ny*det
			nz= (nz*det+p2[2])*ior-nz*det
			det=-100/Math.sqrt(nx*nx+ny*ny+nz*nz)
			u2=nx*det+x2
			v2=ny*det+y2
			
			if(
				calcUv(renderTarget,x0,y0,x1,y1,x2,y2
					,u0,v0
					,u1,v1
					,u2,v2)
			){
			}else{
				if(u0<u1){
					left=u0
					right=u1
				}else{
					left=u1
					right=u0
				}
				if(left>u2) left=u2
				else if(right<u2)right=u2
				if(v0<v1){
					top=v0
					bottom=v1
				}else{
					top=v1
					bottom=v0
				}
				if(top>v2) top=v2
				else if(bottom<v2)bottom=v2
			
				right=right-left+7
				left=left-4
				bottom=bottom-top+7
				top=top-4

				renderTarget.globalAlpha=1

				switch(drawMethod){
				case 0:
					if(ono3d.nowz-0.4>renderFace.z){
						ono3d.pat=renderTarget.createPattern(ono3d.canvasTarget,"repeat")
						ono3d.nowz=renderFace.z
					}

					renderTarget.fillStyle= ono3d.pat
					renderTarget.fillRect(left,top,right,bottom)
					break
				case 1:
					renderTarget.drawImage(ono3d.canvasTarget,0,0)
					break
				case 2:
					if(ono3d.nowz-0.4>renderFace.z){
						ono3d.pat=renderTarget.createPattern(ono3d.canvasTarget,"repeat")
						ono3d.nowz=renderFace.z
					}
					renderTarget.fillStyle= ono3d.pat
					renderTarget.fill()
					break
				}
					
			}
		}
		if(renderFace.rf&RF_TEXTURE){
			texture=renderFace.texture
		}
		if(texture){
			imgw=texture.width
			imgh=texture.height
			uv=renderFace.uv
			u0=uv[0][0]*imgw
			v0=uv[0][1]*imgh
			u1=uv[1][0]*imgw
			v1=uv[1][1]*imgh
			u2=uv[2][0]*imgw
			v2=uv[2][1]*imgh
			
			if(
				calcUv(renderTarget,x0,y0,x1,y1,x2,y2
					,u0,v0
					,u1,v1
					,u2,v2)
			){
				texture=null
			}else{

				if(u0<u1){
					left=u0
					right=u1
				}else{
					left=u1
					right=u0
				}
				if(left>u2) left=u2
				else if(right<u2)right=u2
				if(v0<v1){
					top=v0
					bottom=v1
				}else{
					top=v1
					bottom=v0
				}
				if(top>v2) top=v2
				else if(bottom<v2)bottom=v2
			
				left=left-4
				right=right-left+4
				top=top-4
				bottom=bottom-top+4
			
				renderTarget.globalAlpha=alpha
				switch(drawMethod){
				case 0:
					renderTarget.fillStyle= texture.pat
					renderTarget.fillRect(left,top,right,bottom)
					break
				case 1:
					renderTarget.drawImage(texture,0,0)
					break
				case 2:
					renderTarget.fillStyle= texture.pat
					renderTarget.fill()
					break
				}
					

			}
		}
		renderTarget.setTransform(1,0,0,1,0,0)
		if(shading){
			lightSources=ono3d.lightSources

			if(smoothing){
				u0=calcLighting(vnormal0,lightSources)
				u1=calcLighting(vnormal1,lightSources)
				u2=calcLighting(vnormal2,lightSources)

				u1=u1-u0
				u2=u2-u0


				if(u1*u2<0){
					v1=1
					v2=1
				}else if(u1*u1<u2*u2){
					v1=1
					v2=0
				}else{
					v1=0
					v2=1
				}

				det = v2*u1 -v1*u2

				if(det*det <0.00001){
					light=u0
					smoothing=0
				}else{
					det = 1.0/det

					trans_a = (v2 * dx1 - v1 * dx2)
					trans_c = (-u2 * dx1 + u1 * dx2)

					trans_b = (v2 * dy1 - v1 * dy2)
					trans_d = (-u2 * dy1 + u1 * dy2)

					u0*=-det
					nx= trans_a*u0+x0
					ny= trans_b*u0+y0 
					nz=(trans_d * trans_a -trans_c*trans_b)
						/(trans_d*trans_d+trans_c*trans_c)*det

					grad = renderTarget.createLinearGradient(
						nx,ny
						,nx+trans_d*nz
						,ny-trans_c*nz)

					if(texture){
						grad.addColorStop(0,'rgba(0,0,0,1)')
						grad.addColorStop(1,'rgba(0,0,0,0)')
						renderTarget.fillStyle=grad
						renderTarget.globalAlpha=alpha
					}else{

						grad.addColorStop(0,'#000000')
						grad.addColorStop(1,rgb)
						renderTarget.fillStyle=grad
						renderTarget.globalAlpha=alpha

					}
				}
			}
			if(!smoothing){
				light = calcLighting(vnormal0,lightSources)
				if(texture){
					renderTarget.fillStyle="#000000"
					renderTarget.globalAlpha=(1-light)*alpha 
				}else{
					renderTarget.fillStyle=Util.rgb(
						light*r
						,light*g
						,light*b)
					renderTarget.globalAlpha=alpha
				}
			}
			switch(drawMethod){
			case 0:
			case 1:
				renderTarget.fillRect(_left,_top,_right,_bottom)
				break
			case 2:
				renderTarget.fill()
				break
			}
		}else{
			if(!texture){
				renderTarget.globalAlpha=alpha

				if(renderFace.operator == OP_TRIANGLES){
					renderTarget.fillStyle=rgb;
					switch(drawMethod){
					case 0:
					case 1:
						renderTarget.fillRect(_left,_top,_right,_bottom)
						break
					case 2:
						renderTarget.fill()
						break
					}
				}else{
					renderTarget.lineWidth= renderFace.bold;
					renderTarget.strokeStyle=rgb;
					renderTarget.stroke()
				}
			}
		}
		while(shading && spc){
			lightSources=ono3d.lightSources
			smoothing=renderFace.smoothing

			if(smoothing){
				u0=calcSpc(vnormal0,vtx0.angle,spchard,lightSources)
				u1=calcSpc(vnormal1,vtx1.angle,spchard,lightSources)
				u2=calcSpc(vnormal2,vtx2.angle,spchard,lightSources)

				if(u0==0 && u1==0 && u2==0)break
				u1=u1-u0
				u2=u2-u0


				if(u1*u2<0){
					v1=1
					v2=1
				}else if(u1*u1<u2*u2){
					v1=1
					v2=0
				}else{
					v1=0
					v2=1
				}

				det = v2*u1 -v1*u2

				if(det*det <0.00001){
					light=u0
					smoothing=0
				}else{
					det = 1.0/det

					trans_a = (v2 * dx1 - v1 * dx2)
					trans_c = (-u2 * dx1 + u1 * dx2)

					trans_b = (v2 * dy1 - v1 * dy2)
					trans_d = (-u2 * dy1 + u1 * dy2)

					u0*=-det
					nx= trans_a*u0+x0
					ny= trans_b*u0+y0 
					nz=(trans_d * trans_a -trans_c*trans_b)
						/(trans_d*trans_d+trans_c*trans_c)*det

					grad = renderTarget.createLinearGradient(
						nx,ny
						,nx+trans_d*nz
						,ny-trans_c*nz)

					grad.addColorStop(0,'#000000')
					grad.addColorStop(1,'#ffffff')
					renderTarget.fillStyle=grad
					renderTarget.globalAlpha=spc

				}
			}else{
				light = calcSpc(normal,renderFace.angle,spchard,lightSources)
			}
			if(!smoothing){
				renderTarget.fillStyle=Util.rgb(
					light
					,light
					,light)
				renderTarget.globalAlpha=spc
				
			}
			renderTarget.globalCompositeOperation='lighter'

			if(renderFace.operator == OP_TRIANGLES){
				switch(drawMethod){
				case 0:
				case 1:
					renderTarget.fillRect(_left,_top,_right,_bottom)
					break
				case 2:
					renderTarget.fill()
					break
				}
			}else{
				renderTarget.lineWidth= render.bold;
				renderTarget.stroke()
			}
			break
		}

		if(renderFace.rf&RF_TEXTURE && renderFace.mrr){
			texture=ono3d.envTexture
			imgw=texture.width
			imgh=texture.height

			nx=vnormal0[0]
			ny=vnormal0[1]
			nz=vnormal0[2]
			det= -2*(p0[0]*nx+p0[1]*ny+p0[2]*nz)
			nx= nx*det+p0[0]
			ny= ny*det+p0[1]
			nz= nz*det+p0[2]
			det=0.5/Math.sqrt(nx*nx+ny*ny+nz*nz)
			u0=(nx*det+0.5)*imgw
			v0=(ny*det+0.5)*imgh

			nx=vnormal1[0]
			ny=vnormal1[1]
			nz=vnormal1[2]
			det= -2*(p1[0]*nx+p1[1]*ny+p1[2]*nz)
			nx= nx*det+p1[0]
			ny= ny*det+p1[1]
			nz= nz*det+p1[2]
			det=0.5/Math.sqrt(nx*nx+ny*ny+nz*nz)
			u1=(nx*det+0.5)*imgw
			v1=(ny*det+0.5)*imgh

			nx=vnormal2[0]
			ny=vnormal2[1]
			nz=vnormal2[2]
			det= -2*(p2[0]*nx+p2[1]*ny+p2[2]*nz)
			nx= nx*det+p2[0]
			ny= ny*det+p2[1]
			nz= nz*det+p2[2]
			det=0.5/Math.sqrt(nx*nx+ny*ny+nz*nz)
			u2=(nx*det+0.5)*imgw
			v2=(ny*det+0.5)*imgh
			
			if(
				calcUv(renderTarget,x0,y0,x1,y1,x2,y2
					,u0,v0
					,u1,v1
					,u2,v2)
			){
			}else{
				if(u0<u1){
					left=u0
					right=u1
				}else{
					left=u1
					right=u0
				}
				if(left>u2) left=u2
				else if(right<u2)right=u2
				if(v0<v1){
					top=v0
					bottom=v1
				}else{
					top=v1
					bottom=v0
				}
				if(top>v2) top=v2
				else if(bottom<v2)bottom=v2
			
				right=right-left+7
				left=left-4
				bottom=bottom-top+7
				top=top-4

				renderTarget.globalCompositeOperation='lighter'
				renderTarget.globalAlpha=renderFace.mrr*renderFace.a
				switch(drawMethod){
				case 0:
					renderTarget.fillStyle= texture.pat
					renderTarget.fillRect(left,top,right,bottom)
					break
				case 1:
					renderTarget.drawImage(texture,0,0)
					break
				case 2:
					renderTarget.fillStyle= texture.pat
					renderTarget.fill()
					break
				}
			}
		}
		renderTarget.restore()
	}
	
	var init = function(e){
		RF_SHADE=Ono3d.RF_SHADE
		RF_SMOOTH=Ono3d.RF_SMOOTH
		RF_LINE=Ono3d.RF_LINE
		RF_TEXTURE=Ono3d.RF_TEXTURE
		RF_OUTLINE=Ono3d.RF_OUTLINE
		RF_ENVMAP=Ono3d.RF_ENVMAP
		RF_DOUBLE_SIDED=Ono3d.RF_DOUBLE_SIDED
		RF_DEPTHTEST=Ono3d.DEPTHTEST
		RF_PERSCOLLECT=Ono3d.RF_PERSCOLLECT
		calcLighting=Ono3d.calcLighting
		calcSpc=Ono3d.calcSpc
	}
	if(window.addEventListener) window.addEventListener('load',init,false)
	if(window.attachEvent) window.attachEvent('onload', init)

	return ret

	
})()
