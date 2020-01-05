Engine.goClass.main= (function(){
	var GoMain=function(){};
	var ret = GoMain;
	inherits(ret,Engine.defObj);

	var ono3d = Engine.ono3d;
	var onoPhy = Engine.onoPhy;
	var WIDTH = Engine.WIDTH;
	var HEIGHT = Engine.HEIGHT;

	var material=new Ono3d.Material();
	Vec3.set(material.baseColor,0,0,0);
	ret.prototype.init=function(){
		var objMan = this.scene.objMan;

		for(var i=objMan.objs.length;i--;){
			if(this == objMan.objs[i])continue;
			objMan.deleteObj(objMan.objs[i]);
		}

		Engine.onoPhy.init();

		Engine.go.camera= objMan.createObj(Engine.goClass.camera);
		Engine.go.field=objMan.createObj(Engine.goClass.field);

		this.bane = null;
	
	}
	ret.prototype.move=function(){

		var bane = this.bane;
		var mat44 = Mat44.poolAlloc();
		var vec4 = Vec4.poolAlloc();
		var cursorr = Vec2.poolAlloc();

		cursorr[0] =Util.cursorX/WIDTH*2-1;
		cursorr[1] =Util.cursorY/HEIGHT*2-1;
		if(globalParam.stereomode!=0){
			cursorr[0]*=2;
			if(cursorr[0]<0){
				cursorr[0]+=1;

				ono3d.projectionMatrix[12]=globalParam.stereo;
				Mat44.dot(ono3d.pvMatrix,ono3d.projectionMatrix,ono3d.viewMatrix);
			}else{
				cursorr[0]-=1;
			}
		}

		var p0 = Vec3.poolAlloc();
		var p1 = Vec3.poolAlloc();
		var bV2 = Vec3.poolAlloc();

		Mat44.getInv(mat44,ono3d.pvMatrix);
		Vec4.set(vec4,cursorr[0],-cursorr[1],-1,1);
		Vec4.mul(vec4,vec4,ono3d.znear);
		Mat44.dotVec4(vec4,mat44,vec4);
		Vec3.set(p0,vec4[0],vec4[1],vec4[2]);

		Vec4.set(vec4,cursorr[0],-cursorr[1],1,1);
		Vec4.mul(vec4,vec4,ono3d.zfar);
		Mat44.dotVec4(vec4,mat44,vec4);
		Vec3.set(p1,vec4[0],vec4[1],vec4[2]);

		if(Util.pressCount == 1){
			tsukamiZ= 1;
			var targetPhyObj = null;
			var res2={};
			var goField = Engine.go.field;

			var instance = goField.instance;
			for(var i=0;i<instance.objectInstances.length;i++){
				var phyObj = instance.objectInstances[i].phyObj;
				if(!phyObj)continue;
				if(phyObj.type===OnoPhy.CLOTH){
					var res={};
					var z = phyObj.rayCast(res,p0,p1);
					if(z>0){
						if(z<tsukamiZ){
							tsukamiZ = z;
							res2.face=res.face;
							res2.p1=res.p1;
							res2.p2=res.p2;
							res2.p3=res.p3;
							targetPhyObj = phyObj;
						}
					}

				}else{
					if(phyObj.fix){
						continue;
					}
					var collision= phyObj.collision;
					if(!collision){
						continue;
						
					}
					var z = collision.rayCast(p0,p1);
					if(z>0 && z<tsukamiZ){
						tsukamiZ = z;
						targetPhyObj = phyObj;
					}
				}
			}
			if(targetPhyObj){
				bane = onoPhy.createSpring();
				bane.con1 = null;
				bane.defaultLength=0;
				bane.f=50*targetPhyObj.mass;
				bane.c=3*targetPhyObj.mass;

				Vec3.sub(bV2,p1,p0);
				Vec3.madd(bV2,p0,bV2,tsukamiZ);

				if(targetPhyObj.type===OnoPhy.CLOTH){
					bane.con2=targetPhyObj.getPhyFace(res2.p1,res2.p2,res2.p3,res2.face,bV2);
					Vec3.set(bane.con2Pos,0,0,0);
				}else{
					bane.con2 = targetPhyObj;
					var im=Mat43.poolAlloc();
					Mat43.getInv(im,targetPhyObj.matrix);
					Mat43.dotVec3(bane.con2Pos,im,bV2);
					Mat43.poolFree(1);
				}

			}
		}
		Vec3.poolFree(3);

		if(bane){
			if(!Util.pressOn){
				if(bane.con2.type===OnoPhy.FACE){
					OnoPhy.Cloth.disablePhyFace.push(bane.con2);
				}
				onoPhy.deleteSpring(bane);
				bane= null;

			}else{
				Mat44.getInv(mat44,ono3d.pvMatrix);
		
				var w=(tsukamiZ*(ono3d.zfar-ono3d.znear)+ono3d.znear);
				var z =  -ono3d.projectionMatrix[10] + ono3d.projectionMatrix[14]/w;
				Vec4.set(vec4,cursorr[0],-cursorr[1],z,1);
				Vec4.mul(vec4,vec4,w);
				Mat44.dotVec4(vec4,mat44,vec4);
				Vec3.copy(bane.p0,vec4);

				if(Util.pressCount==1){
					Vec3.copy(bane._p0,vec4);
				}
			}
			
		}
		this.bane = bane;
		Vec4.poolFree(1);
		Vec2.poolFree(1);
		Mat44.poolFree(1);
	}
	ret.prototype.delete=function(){
	}
	ret.prototype.draw=function(){
		var p0 = Vec3.poolAlloc();
		var p1 = Vec3.poolAlloc();
		var mat44 = Mat44.poolAlloc();
		var cursorr = Vec2.poolAlloc();
		var vec4 = Vec4.poolAlloc();

		cursorr[0] =Util.cursorX/WIDTH*2-1;
		cursorr[1] =Util.cursorY/HEIGHT*2-1;

		Mat44.dot(ono3d.pvMatrix,ono3d.projectionMatrix,ono3d.viewMatrix);
		if(globalParam.stereomode!=0){
			cursorr[0]*=2;
			if(cursorr[0]<0){
				cursorr[0]+=1;

				ono3d.projectionMatrix[12]=globalParam.stereo;
				Mat44.dot(ono3d.pvMatrix,ono3d.projectionMatrix,ono3d.viewMatrix);
			}else{
				cursorr[0]-=1;
			}
		}

		Mat44.getInv(mat44,ono3d.pvMatrix);
		Vec4.set(vec4,cursorr[0],-cursorr[1],-1,1);
		Vec4.mul(vec4,vec4,ono3d.znear);
		Mat44.dotVec4(vec4,mat44,vec4);
		Vec3.set(p0,vec4[0],vec4[1],vec4[2]);

		Vec4.set(vec4,cursorr[0],-cursorr[1],1,1);
		Vec4.mul(vec4,vec4,ono3d.zfar);
		Mat44.dotVec4(vec4,mat44,vec4);
		Vec3.set(p1,vec4[0],vec4[1],vec4[2]);


		var renderMaterial = ono3d.materials[ono3d.materials_index];
	  	renderMaterial.name ="aaa";
		ono3d.materials_index++;
		
		Vec3.copy(renderMaterial.baseColor,material.baseColor);


		Vec3.sub(p1,p1,p0);
		var list = onoPhy.collider.rayCastAll(p0,p1);
		var ii=-1;
		var l=0;
		for(var i=0;i<onoPhy.collider.hitListIndex;i++){
			var hitdata= onoPhy.collider.hitList[i];
			if(hitdata.len<l || ii==-1){
				ii=i;
				l=hitdata.len;
			}

		}
		if(ii>=0){
			var hitdata= onoPhy.collider.hitList[ii];
			Vec3.add(p0,hitdata.pos1,hitdata.pos2);
			ono3d.setLine(hitdata.pos1,p0,renderMaterial);
		}

		Vec2.poolFree(1);
		Vec3.poolFree(2);
		Vec4.poolFree(1);
	Mat44.poolFree(1);
	}
	
	return ret;
})();
