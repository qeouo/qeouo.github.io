
"use strict"
var OnoPhy = (function(){
	var MIN = Math.min;
	var MAX = Math.max;

	var DIMENSION=3; //次元
	var GRAVITY = 9.81; //重力加速度
	var REPETITION_MAX=10; //繰り返しソルバ最大回数
	var _dt; //ステップ時間
	var LINDAMP = 0;
	var ANGDAMP = 0;
	var CFM=0.99;
	var ERP= 0.2*60.0;
	
	var OnoPhy = function(){
		this.rigidBodies = []; //剛体
		this.springs= []; //ばね
		this.clothes =[]; //布
		this.joints = []; //ジョイント
		this.repetition=0; //ソルバ繰り返した回数

		this.collider=new Collider(); //コライダ
		this.hitInfos=[]; //コリジョン接触情報
		this.disableList=new Array(1024); //コリジョン無効リスト
	}
	var ret = OnoPhy;

	var i=0;
	var RIGID = ret.RIGID = i++
		,CLOTH =ret.CLOTH = i++
		,FACE = ret.FACE = i++
	;

	var PhyObj = (function(){
		var PhyObj = function(){
			this.rotV = new Vec3();//回転速度
			this.oldrotV = new Vec3(); //角運動量(古い)
			this.type = 0;
		}
		var ret = PhyObj;
		
		ret.prototype.addImpulse = function(){};
		ret.prototype.addImpulseR = function(){};

		return ret;
	})();

		ret.prototype.init = function(){
			//剛体削除
			var rigidBodies = this.rigidBodies;
			for(var i=rigidBodies.length;i--;){
				var rigidBody = rigidBodies[i];
				//コリジョンを削除
				if(rigidBody.collision){
					this.collider.deleteCollision(rigidBody.collision);
				}
				rigidBodies.splice(i,1);
			}
			//ジョイント削除
			var joints=this.joints;
			for(var i=joints.length;i--;){
				joints.splice(i,1);
			}
			//スプリングオブジェクト削除
			var springs=this.springs;
			for(var i=springs.length;i--;){
				springs.splice(i,1);
			}
		}

	var RigidBody = (function(){
		var RigidBody = function(){
			PhyObj.call(this);
			//物理オブジェクト
			this.fix=1; //1固定 0挙動計算対象
			this.moveflg=1;
			this.matrix =new Mat43(); //オブジェクトの姿勢等
			this.inv_matrix=new Mat43(); //逆行列
			this.name; //オブジェクト名称
			this.type = RIGID;

			this.mass=1.0; //質量
			this.inertiaTensorBase=new Mat33(); //慣性テンソル
			this.inertiaTensor=new Mat33;
			this.inv_inertiaTensor=new Mat33;
			this.friction=0.2; //摩擦力(動摩擦力)
			this.restitution= 0; //反発係数

			this.v = new Vec3(); //速度
			this.oldv = new Vec3(); //速度

			this.location=new Vec3(); //位置
			this.scale=new Vec3(); //スケール
			this.rotq=new Vec4(); //回転状態(クォータニオン)
			this.oldloc=new Vec3();
			this.oldrotq=new Vec4();
			this.inv_mass = 0; //質量の逆数

			this.collision=null;
			this.collisionSize = new Vec3();
			this.COMBase = new Vec3();
			this.COM = new Vec3();
		}
		var ret=RigidBody;
		inherits(ret,PhyObj);


		ret.prototype.calcPre = function(){
			var rotL = Vec3.poolAlloc();
			var r = Mat33.poolAlloc();

			var m=this.matrix;
			Mat43.fromQuat(m,this.rotq);
			//合成行列
			Mat43.fromLSR(m,this.location,this.scale,this.rotq);

			Mat43.getInv(this.inv_matrix,m);

			Mat33.dotVec3(rotL,this.inertiaTensor,this.rotV);
			//現在の傾きと直交慣性モーメントから慣性テンソルを求める
			Vec4.toMat33(r,this.rotq);
			Mat33.dot(this.inertiaTensor,r,this.inertiaTensorBase);
			Mat33.getInv(r,r);
			Mat33.dot(this.inertiaTensor,this.inertiaTensor,r);
			Mat33.getInv(this.inv_inertiaTensor,this.inertiaTensor);
			//前ステップの角運動量から角速度を求める
			Mat33.dotVec3(this.rotV,this.inv_inertiaTensor,rotL);


			//コリジョンの状態を更新
			var collision=this.collision;
			var sx=this.collisionSize[0]*this.scale[0];
			var sy=this.collisionSize[1]*this.scale[1];
			var sz=this.collisionSize[2]*this.scale[2];
			var bold = 0;
			switch(collision.type){
			case Collider.SPHERE:
				bold = MAX(MAX(sx,sy),sz);
				sx=sy=sz=0;
				break;
			case Collider.CAPSULE:
				bold = Math.max(sx,sy);
				sz=Math.max(this.collisionSize[2]-bold,0)*this.scale[2];
				break;
			case Collider.MESH:
			case Collider.CONVEX_HULL:
				var vertices = this.mesh.vertices;
				for(var i=0;i<vertices.length;i++){
					Mat43.dotVec3(collision.poses[i],m,vertices[i].pos);
				}
				sx=this.scale[0];
				sy=this.scale[1];
				sz=this.scale[2];
				break;
			}
			var scale = Vec3.poolAlloc();
			Vec3.set(scale,sx,sy,sz);
			Mat43.fromLSR(collision.matrix,this.location,scale,this.rotq);
			Vec3.poolFree(1);
			collision.bold = bold;

			if(collision.type !== Collider.MESH || !collision.AABBTreeRoot){
				collision.update();
			}

			//重心位置
			Vec4.rotVec3(this.COM,this.rotq,this.COMBase);
			Vec3.add(this.COM,this.COM,this.location);

			Vec3.poolFree(1);
			Mat33.poolFree(1);
		}

		ret.prototype.update=function(dt){
			if(this.fix){
				Vec3.copy(this.oldloc,this.location);
				Vec4.copy(this.oldrotq,this.rotq);
				return;
			}

			var rq= Vec4.poolAlloc();
			var bV0=Vec3.poolAlloc();

			Vec3.mul(this.rotV,this.rotV,ANGDAMP);
			var l=Vec3.scalar(this.rotV);
			if(l>0){
				var d=1/l;
				Vec4.fromRotVector(rq,l*dt,this.rotV[0]*d,this.rotV[1]*d,this.rotV[2]*d);
				Vec4.qdot(this.rotq,rq,this.rotq);
				
				//オブジェクト中心と重心のズレ補正
				Vec3.sub(bV0,this.COM,this.location);
				Vec4.rotVec3(bV0,rq,bV0);
				Vec3.sub(bV0,this.COM,bV0);
				Vec3.sub(bV0,bV0,this.location);
				Vec3.add(this.location,this.location,bV0);
			}

			Vec3.mul(this.v,this.v,LINDAMP);
			Vec3.madd(this.location,this.location,this.v,dt);

			Vec3.copy(this.oldloc,this.location);
			Vec3.copy(this.oldrotq,this.rotq);

			this.impFlg=0;

			Vec4.poolFree(1);
			Vec3.poolFree(1);
		}

		ret.prototype.calcEfficM= (function(){
			return function(m,r1){
				var r = Vec3.poolAlloc();
				var R1 = Mat33.poolAlloc();

				Vec3.sub(r,r1,this.COM);
				Mat33.set(R1,0,r[2],-r[1],-r[2],0,r[0],r[1],-r[0],0);

				Mat33.dot(m,R1,this.inv_inertiaTensor);
				Mat33.dot(m,m,R1);
				Mat33.mul(m,m,-1);
				m[0]+=this.inv_mass;
				m[4]+=this.inv_mass;
				m[8]+=this.inv_mass;

				Vec3.poolFree(1);
				Mat33.poolFree(1);
			}
		})();
		ret.prototype.calcVelocity = function(v,pos){
			Vec3.sub(v,pos,this.COM);
			Vec3.cross(v,this.rotV,v);
			Vec3.add(v,v,this.v);
		}
		ret.prototype.addImpulse = function(pos,impulse){
			//衝撃を与える
			if(this.fix){
				//固定の場合は無視
				return;
			}

			Vec3.madd(this.v,this.v,impulse, this.inv_mass);//並行

			var addimpulseBuf = Vec3.poolAlloc();
			Vec3.sub(addimpulseBuf,pos,this.COM);
			Vec3.cross(addimpulseBuf,addimpulseBuf,impulse); 
			Mat33.dotVec3(addimpulseBuf,this.inv_inertiaTensor,addimpulseBuf);
			Vec3.add(this.rotV,this.rotV,addimpulseBuf); //回転

			Vec3.poolFree(1);
		}
		

		ret.prototype.addImpulseR = function(impulse){
			//衝撃を与える(回転のみ
			if(this.fix){
				//固定の場合は無視
				return;
			}
			var addimpulseBuf = Vec3.poolAlloc();
			Mat33.dotVec3(addimpulseBuf,this.inv_inertiaTensor,impulse);
			Vec3.add(this.rotV,this.rotV,addimpulseBuf);
			Vec3.poolFree(1);
		}

		ret.prototype.getExPos = function(a,b){
			Mat43.dotVec3(a,this.inv_matrix,b);
		}
		ret.prototype.getFriction= function(){
			return this.friction;
		}
		ret.prototype.getRestitution= function(){
			return this.restitution;
		}
		ret.prototype.getInvInertiaTensor = function(){
			return this.inv_inertiaTensor;
		}

		ret.prototype.refresh = function(){
			//剛体の細かいパラメータを計算する
			if(!this.collision){
				return;
			}
			var type = this.collision.type;
			var obj = this .parent;
			var sx = obj.bound_box[3]*obj.scale[0];
			var sy = obj.bound_box[4]*obj.scale[1];
			var sz = obj.bound_box[5]*obj.scale[2];
				
			//慣性テンソルベースの計算
			Mat33.mul(this.inertiaTensorBase,this.inertiaTensorBase,0);
			Vec3.set(this.COMBase,0,0,0 );
			switch(type){
			case Collider.CAPSULE:
			case Collider.CYLINDER:
				var a =MAX(sx,sy);
				var l = sz*2;
				var xy=(a*a/4.0 + l*l/12.0);
				this.inertiaTensorBase[0]=xy;
				this.inertiaTensorBase[4]=xy;
				this.inertiaTensorBase[8]=1/2*a*a;
				break;
			case Collider.CUBOID:
				this.inertiaTensorBase[0]=1/3*(sy*sy+sz*sz);
				this.inertiaTensorBase[4]=1/3*(sx*sx+sz*sz);
				this.inertiaTensorBase[8]=1/3*(sx*sx+sy*sy);
				break;
			case Collider.CONE:
				var r = MAX(sx,sy);
				var xy=3/80*(4.0*r*r + 4*sz*sz);
				var z=3/10*r*r;
				this.inertiaTensorBase[0]=xy;
				this.inertiaTensorBase[4]=xy;
				this.inertiaTensorBase[8]=z;
				Vec3.set(this.COMBase,0,0,-sz*0.5 );
				break;
			case Collider.CONVEX_HULL:
			case Collider.MESH:
				var faces=this.mesh.faces;
				var vertices=this.mesh.vertices;
				var S=0; //総体積
				var PS = Vec3.poolAlloc(); //体積*重心
				var p = Vec3.poolAlloc(); //部分の重心
				var p1 = Vec3.poolAlloc(); //四面体の頂点(４つ目は原点)
				var p2 = Vec3.poolAlloc();
				var p3 = Vec3.poolAlloc();
				var I = Mat33.poolAlloc(); //慣性モーメント
				for(var i=0;i<faces.length;i++){ //ポリゴン数分ループ
					for(var j=0;j<faces[i].idxnum-2;j++){ //trianglefan対応
						Vec3.vecmul(p1,vertices[faces[i].idx[0]].pos,obj.scale);
						Vec3.vecmul(p2,vertices[faces[i].idx[1+j]].pos,obj.scale);
						Vec3.vecmul(p3,vertices[faces[i].idx[2+j]].pos,obj.scale);
						var s = (p1[1]*p2[2]*p3[0]
							+ p1[2]*p2[0]*p3[1]
							+ p1[0]*p2[1]*p3[2]
							- p1[2]*p2[1]*p3[0]
							- p1[0]*p2[2]*p3[1]
							-  p1[1]*p2[0]*p3[2]) * (1/6); //部分体積
						Vec3.add(p,p1,p2);
						Vec3.add(p,p,p3);
						Vec3.mul(p,p,0.25);//部分重心
						calcInertia(I,p1,p2,p3); //慣性テンソル係数

						Vec3.madd(PS,PS,p,s);//重心*体積 の合計
						S+=s; //体積の合計

						//慣性テンソル比*体積
						//慣性テンソル係数*質量としたいところだが質量を求めるためには
						//体積比が必要だが総体積がわからないため先に部分体積だけを掛けておく
						Mat33.madd(this.inertiaTensorBase,this.inertiaTensorBase,I,s);
					}
				}
				Vec3.mul(this.COMBase,PS,1/S); //重心
				Mat33.mul(this.inertiaTensorBase,this.inertiaTensorBase,1/S);//重心を中心とした慣性テンソル
				calcTranslateInertia(I,this.COMBase); //重心ズレ分の慣性テンソル
				Mat33.madd(this.inertiaTensorBase,this.inertiaTensorBase,I,-1); //慣性テンソル
				
				Vec3.poolFree(5);
				Mat33.poolFree(1);
				break;
			case Collider.SPHERE:
			default:
				var a =MAX(sx,MAX(sy,sz));
				var i=(2.0/5.0)*a*a;
				this.inertiaTensorBase[0]=i;
				this.inertiaTensorBase[4]=i;
				this.inertiaTensorBase[8]=i;
				break;
			}

			this.inv_mass = 1.0/this.mass;
			if(this.fix===1){
				this.mass=9999999;
				this.inv_mass = 0;
			}
			Mat33.mul(this.inertiaTensorBase,this.inertiaTensorBase,this.mass);
		}
		var calcTranslateInertia = function(I,v){
			//平行移動の慣性テンソルを求める
			var x =v[0];
			var y =v[1];
			var z =v[2];
			I[0] = y*y+z*z;
			I[1] = -x*y;
			I[2] = -x*z;
			I[3] = -y*x;
			I[4] = x*x+z*z;
			I[5] = -y*z;
			I[6] = -z*x;
			I[7] = -z*y;
			I[8] = x*x+y*y;
		}
		var calcInertia=function(I,a,b,c){
			//頂点a,b,c,原点で構成される四面体(1グラム)の慣性テンソルを求める
			var kx=a[0]+b[0]+c[0];
			var kxx=a[0]*a[0]+b[0]*b[0]+c[0]*c[0];
			var kxy=a[0]*a[1]+b[0]*b[1]+c[0]*c[1];
			var ky=a[1]+b[1]+c[1];
			var kyy=a[1]*a[1]+b[1]*b[1]+c[1]*c[1];
			var kyz=a[1]*a[2]+b[1]*b[2]+c[1]*c[2];
			var kz=a[2]+b[2]+c[2];
			var kzz=a[2]*a[2]+b[2]*b[2]+c[2]*c[2];
			var kxz=a[2]*a[0]+b[2]*b[0]+c[2]*c[0];

			I[0]=ky*ky + kyy + kz*kz + kzz;
			I[1]=- (kx*ky + kxy);
			I[2]=- (kx*kz + kxz);
			I[3]=- (kx*ky + kxy);
			I[4]=kx*kx + kxx + kz*kz + kzz;
			I[5]=- (ky*kz + kyz);
			I[6]=- (kx*kz + kxz);
			I[7]=- (ky*kz + kyz);
			I[8]=kx*kx + kxx + ky*ky + kyy;

			Mat33.mul(I,I,1/20);
		}
		return ret;
	})();
	

	var Constraint=(function(){
		//拘束クラス
		var Constraint=function(){
			this.obj1 = null; //接触物体1
			this.obj2 = null; //接触物体2
			this.pos1= new Vec3(); //接触位置1
			this.pos2 = new Vec3(); //接触位置2
		}
		var ret=Constraint;

		ret.prototype.calcDiffVelocity = function(dv){
			//二点間の速度差を求める
			var calcBuf = Vec3.poolAlloc();
			this.obj1.calcVelocity(dv,this.pos1);
			this.obj2.calcVelocity(calcBuf,this.pos2);
			Vec3.sub(dv,calcBuf,dv);
			Vec3.poolFree(1);
		}

		ret.prototype.addImpulse = function(impulse){
			var mem = Vec3.poolAlloc();
			//二点に力を加える
			this.obj1.addImpulse(this.pos1,impulse);
			Vec3.mul(mem,impulse,-1);
			this.obj2.addImpulse(this.pos2,mem);
			Vec3.poolFree(1);
		}
		ret.prototype.addImpulseR = function(impulse){
			//二点に力を加える
			var mem = Vec3.poolAlloc();
			this.obj1.addImpulseR(impulse);
			Vec3.mul(mem,impulse,-1);
			this.obj2.addImpulseR(mem);
			Vec3.poolFree(1);
		}

		var calcEffic = ret.calcEffic =function(v,m,X){
			// 制限1軸の場合
			// F=(vX/((MX)X)X
			Mat33.dotVec3(v,m,X);
			Vec3.mul(v,X,1/Vec3.dot(v,X));
		}
			
		var calcEffic2 = ret.calcEffic2 =function(v1,v2,m,X,Y){
			// 制限2軸の場合
			//F = ((vX*MYY-vYMYX)X - (vxMXY-vYMXX)Y) / (MXX*MYY - MXY*MYX) 
			Mat33.dotVec3(v1,m,X);
			var mxx=Vec3.dot(v1,X);
			var mxy=Vec3.dot(v1,Y);
			Mat33.dotVec3(v1,m,Y);
			var myx=Vec3.dot(v1,X);
			var myy=Vec3.dot(v1,Y);

			var denom = 1/ (mxx*myy  - mxy*myx);
			v1[0]=(myy*X[0] - myx*Y[0])  *denom;
			v1[1]=(myy*X[1] - myx*Y[1])  *denom;
			v1[2]=(myy*X[2] - myx*Y[2])  *denom;
			v2[0]=(- mxy*X[0] + mxx*Y[0])  *denom;
			v2[1]=(- mxy*X[1] + mxx*Y[1])  *denom;
			v2[2]=(- mxy*X[2] + mxx*Y[2])  *denom;
		}
		var calcEffic3 = ret.calcEffic3 =function(v1,v2,v3,m,X,Y,Z){
			// 制限3軸の場合
			//F = M^-1 v
			Mat33.getInv(m,m);
			Mat33.calcTranspose(m,m);
			Mat33.dotVec3(v1,m,X);
			Mat33.dotVec3(v2,m,Y);
			Mat33.dotVec3(v3,m,Z);
		}
		ret.prototype.calcEfficM= (function(){
			return function(m){
				var mat1 = Mat33.poolAlloc();
				this.obj1.calcEfficM(mat1,this.pos1);
				this.obj2.calcEfficM(m,this.pos2);
				Mat33.add(m,m,mat1);
				Mat33.poolFree(1);
			}
		})();
		return ret;
	})();

	var HitInfo = (function(){
		//物体の接触
		var HitInfo = function() {
			Constraint.apply(this);

			this.pos1ex = new Vec3(); //接触相対位置1
			this.pos2ex = new Vec3(); //接触相対位置2

			this.impulse=new Vec3(); //衝撃
			this.axes = []; //3軸
			this.coeff = []; 
			for(var i=0;i<DIMENSION;i++){
				this.axes.push(new Vec3());
				this.coeff.push(new Vec3());
			}

			this.impulseR=new Vec3(); //回転摩擦関係
			this.rM=new Mat33();

			this.offset=new Vec3(); //補正用
			this.fricCoe = 0; //2物体間の摩擦係数
		}
		var ret = HitInfo;
		inherits(ret,Constraint);

		ret.prototype.calcPre = function(){
			var obj1=this.obj1;
			var obj2=this.obj2;
			var dv=Vec3.poolAlloc();
			var nM=Mat33.poolAlloc();

			if(!obj1.fix){
				obj1.impFlg=1;
			}
			if(!obj2.fix){
				obj2.impFlg=1;
			}

			//法線方向と従法線方向
			Vec3.sub(this.axes[0],this.pos2,this.pos1);
			Vec3.norm(this.axes[0]);
			this.axes[1][0] = this.axes[0][1];
			this.axes[1][1] = -this.axes[0][2];
			this.axes[1][2] = -this.axes[0][0];
			Vec3.cross(this.axes[1],this.axes[1],this.axes[0]);
			Vec3.cross(this.axes[2],this.axes[1],this.axes[0]);
			Vec3.norm(this.axes[1]);
			Vec3.norm(this.axes[2]);
			

			Mat33.add(this.rM,obj1.getInvInertiaTensor(),obj2.getInvInertiaTensor());
			Mat33.getInv(this.rM,this.rM);

			Vec3.set(this.offset,0,0,0);
			if(this.counter==0 || 1){
				//位置補正
				Vec3.sub(this.offset,this.pos2,this.pos1);
				Vec3.nrm(dv,this.offset);
				Vec3.madd(this.offset,this.offset,dv,-0.005);
				Vec3.mul(this.offset,this.offset,ERP);
			}

			this.fricCoe = obj1.getFriction() * obj2.getFriction(); 

			//反発力
			this.calcDiffVelocity(dv);
			Vec3.madd(this.offset,this.offset,this.axes[0]
				, Vec3.dot(dv, this.axes[0])
				*(obj1.getRestitution() * obj2.getRestitution()));//反発分

			//加速に必要な力を求めるための行列
			this.calcEfficM(nM);
			Constraint.calcEffic(this.coeff[0],nM,this.axes[0]);
			Constraint.calcEffic2(this.coeff[1],this.coeff[2],nM,this.axes[1],this.axes[2]);

			//次のフレームで持続判定で使うための相対位置
			obj1.getExPos(this.pos1ex,this.pos1);
			obj2.getExPos(this.pos2ex,this.pos2);

			this.counter++;

			Vec3.poolFree(1);
			Mat33.poolFree(1);
		}
		ret.prototype.calcConstraintPre=function(){
			var impulse = Vec3.poolAlloc();
			Vec3.set(impulse,0,0,0);
			for(var i=0;i<DIMENSION;i++){
				Vec3.madd(impulse,impulse,this.axes[i],this.impulse[i]);
			}
			this.addImpulse(impulse);
			this.addImpulseR(this.impulseR);

			Vec3.poolFree(1);
		}

		ret.prototype.calcConstraint=function(){
			var dv = Vec3.poolAlloc();
			var impulse = Vec3.poolAlloc();
			//法線方向
			var o = this.impulse[0]; //前の値
			this.calcDiffVelocity(dv); //衝突点の速度差
			Vec3.add(dv,dv,this.offset);//位置補正分
			this.impulse[0]+=Vec3.dot(this.coeff[0],dv); //必要撃力更新
			this.impulse[0]= MAX(this.impulse[0],0); //撃力が逆になった場合は無しにする
			this.impulse[0]*=CFM;
			Vec3.mul(impulse, this.axes[0], this.impulse[0]-o); 
			this.addImpulse(impulse); //撃力差分を剛体の速度に反映

			//従法線方向(摩擦力)
			o= this.impulse[1];
			var old2 = this.impulse[2]; //前の値
			this.calcDiffVelocity(dv);
			this.impulse[1]+=Vec3.dot(this.coeff[1],dv); //必要摩擦力更新
			this.impulse[2]+=Vec3.dot(this.coeff[2],dv); //必要摩擦力更新

			var max =this.impulse[0] * this.fricCoe; //法線撃力から摩擦最大量を算出
			var maxr = max * 0.01; //法線撃力から最大転がり抵抗を算出
			if(dv[0]*dv[0]+dv[1]*dv[1]+dv[2]*dv[2]>0.0001){
				max*=0.9; //静止していない場合はちょっと減らす
			}
			
			var l =this.impulse[1]*this.impulse[1]+this.impulse[2]*this.impulse[2];
			if (l > max*max) { //摩擦力が最大量を上回る場合は最大量でセーブ
				l = max/Math.sqrt(l);
				this.impulse[1]*=l;
				this.impulse[2]*=l;
			}
			Vec3.mul(impulse,this.axes[1],this.impulse[1]-o);
			Vec3.madd(impulse,impulse,this.axes[2],this.impulse[2]-old2);
			this.addImpulse(impulse); //差分摩擦力を速度に反映

			//転がり抵抗
			var old = Vec3.poolAlloc();
			Vec3.copy(old,this.impulseR);
			Vec3.sub(dv,this.obj2.rotV,this.obj1.rotV);
			Vec3.madd(dv,dv,this.axes[0],-Vec3.dot(dv,this.axes[0])); //摩擦方向の力
			Mat33.dotVec3(impulse,this.rM,dv);
			Vec3.add(this.impulseR,this.impulseR,impulse);
			Vec3.copy(impulse,this.impulseR);
			var l =Vec3.dot(impulse,impulse);
			if (l > maxr*maxr) { //摩擦力が最大量を上回る場合は最大量でセーブ
				Vec3.madd(this.impulseR,this.impulseR,impulse,maxr/Math.sqrt(l) - 1);
			}
			Vec3.mul(this.impulseR,this.impulseR,CFM);
			Vec3.sub(impulse,this.impulseR,old);
			this.addImpulseR(impulse);
			
			Vec3.poolFree(3);
		}

		return ret;
	})();

	var disableHitInfos=[];
	for(var i=0;i<1024;i++){
		disableHitInfos.push(new HitInfo());
	}

	var LinConstraint = (function(){
		//並進速度拘束
		var LinConstraint = function() {
			Constraint.apply(this);

			this.impulse = new Vec3(); //オブジェクトに与える力
			this.axes = []; //力の方向軸
			this.axesM = new Mat33();
			this.fvM = new Mat33();
			for(var i=0;i<3;i++){
				this.axes.push(new Vec3()); 
			}
			this.flgs= new Array(3); 
			this.motorMax=0; //モーター最大力
			this.offset=new Vec3();
		}
		var ret = LinConstraint ;
		inherits(ret,Constraint);

		ret.prototype.calcPre=function(){
			for(var i=0;i<DIMENSION;i++){
				this.axesM[i*3]=this.axes[i][0];
				this.axesM[i*3+1]=this.axes[i][1];
				this.axesM[i*3+2]=this.axes[i][2];
			}
			var m=Mat33.poolAlloc();
			this.calcEfficM(m);

			this.calcFvm(m);
			
			Mat33.poolFree(1);
			return;
		};

		ret.prototype.calcConstraintPre=function(){
			var impulse = Vec3.poolAlloc();
			Mat33.dotVec3(impulse,this.axesM,this.impulse);
			this.addImpulse(impulse);
			Vec3.poolFree(1);
		}

		ret.prototype.calcConstraint=function(){
			var old = Vec3.poolAlloc();
			var impulse = Vec3.poolAlloc();

			Vec3.copy(old,this.impulse);
			this.calcDiffVelocity(impulse); //速度差
			Vec3.add(impulse,impulse,this.offset); //補正
			Mat33.dotVec3(impulse,this.fvM,impulse);
			Vec3.add(this.impulse,this.impulse,impulse);
			Vec3.mul(this.impulse,this.impulse,CFM);

			for(var i=0;i<DIMENSION;i++){
				//与える力の制限
				if(this.flgs[i] == 0){
					this.impulse[i]=0;
				}else{
					var a =this.impulse[i];
					if(this.motorMax!==0 && i===0){
						//モーター最大力積を超えないようにする
						if(a > this.motorMax){
							this.impulse[i]=this.motorMax;
						}
						if(a < -this.motorMax){
							this.impulse[i]=-this.motorMax;
						}
					}else{
						//逆方向の力は加えない
						if(a*this.flgs[i] < 0){
							this.impulse[i]=0;
						}
					}
				}
			}
			Vec3.sub(impulse,this.impulse,old);
			Mat33.dotVec3(impulse,this.axesM,impulse);
			this.addImpulse(impulse);
			
			Vec3.poolFree(2);
		}

		var fv=[];
		for(var i=0;i<3;i++){
			fv.push(new Vec3());
		}
		ret.prototype.calcFvm=function(m){
			var a=[];
			var count=0;
			var b=[];
			for(var i=0;i<DIMENSION;i++){
				if(this.flgs[i]){
					a.push(this.axes[i]);
					b.push(fv[i]);
				}else{
					Vec3.set(fv[i],0,0,0);
				}
			}

			if(a.length==1){
				Constraint.calcEffic(b[0],m,a[0]);
			}else if(a.length==2){
				Constraint.calcEffic2(b[0],b[1],m,a[0],a[1]);
			}else if(a.length==3){
				Constraint.calcEffic3(b[0],b[1],b[2],m,a[0],a[1],a[2]);
			}

			for(var i=0;i<DIMENSION;i++){
				this.fvM[i]=fv[i][0];
				this.fvM[i+3]=fv[i][1];
				this.fvM[i+6]=fv[i][2];
			}
		}
		return ret;
	})();

	var AngConstraint = (function(){
		//回転速度拘束
		var AngConstraint = function() {
			LinConstraint.apply(this);
		}
		var ret = AngConstraint;
		inherits(ret,LinConstraint);

		var vec=new Vec3();
		var m = new Mat33();
		var impulse = new Vec3();
		ret.prototype.calcPre=function(){
			for(var i=0;i<DIMENSION;i++){
				this.axesM[i*3]=this.axes[i][0];
				this.axesM[i*3+1]=this.axes[i][1];
				this.axesM[i*3+2]=this.axes[i][2];
			}
			Mat33.add(m,this.obj1.inv_inertiaTensor,this.obj2.inv_inertiaTensor);

			this.calcFvm(m);
			return;
		};

		ret.prototype.calcConstraintPre=function(){
			var impulse = Vec3.poolAlloc();
			Mat33.dotVec3(impulse,this.axesM,this.impulse);
			this.addImpulseR(impulse);
			Vec3.poolFree(1);
		}
		ret.prototype.calcConstraint=function(){
			var old = Vec3.poolAlloc();
			var imp= Vec3.poolAlloc();
			Vec3.copy(old,this.impulse);
			Vec3.sub(imp,this.obj2.rotV,this.obj1.rotV); //回転速度差
			Vec3.add(imp,imp,this.offset); //補正
			Mat33.dotVec3(imp,this.fvM,imp);
			Vec3.add(this.impulse,this.impulse,imp);
			Vec3.mul(this.impulse,this.impulse,CFM);

			for(var i=0;i<DIMENSION;i++){
				//与える力の制限
				if(this.flgs[i] == 0){
					this.impulse[i]=0;
				}else{
					var a =this.impulse[i];
					if(this.motorMax!==0 && i===0){
						//モーター最大力積を超えないようにする
						if(a > this.motorMax){
							this.impulse[i]=this.motorMax;
						}
						if(a < -this.motorMax){
							this.impulse[i]=-this.motorMax;
						}
					}else{
						//逆方向の力は加えない
						if(a*this.flgs[i] < 0){
							this.impulse[i]=0;
						}
					}
				}
			}
			Vec3.sub(imp,this.impulse,old);
			Mat33.dotVec3(imp,this.axesM,imp);
			this.addImpulseR(imp);
			
			Vec3.poolFree(2);
		}
		return ret;
	})();

	var Joint = (function(){
		var Joint = function(){
			this.breaking_threshold=0.0;
			this.disable_collisions=false;
			this.enabled= false;
			this.limit_ang_lower=new Vec3();
			this.limit_ang_upper=new Vec3();
			this.limit_lin_lower=new Vec3();
			this.limit_lin_upper=new Vec3();
			this.motor_ang_max_impulse=1;
			this.motor_ang_target_velocity=1;
			this.motor_lin_max_impulse=1;
			this.motor_lin_target_velocity=1;
			this.object1=null;
			this.object2=null;
			this.spring_damping=new Vec3();
			this.spring_stiffness=new Vec3();
			this.spring_damping_ang=new Vec3();
			this.spring_stiffness_ang=new Vec3();
			this.use_breaking=0;
			this.use_limit_ang=new Vec3();
			this.use_limit_lin=new Vec3();
			this.use_motor_ang=0;
			this.use_motor_lin=0;
			this.use_spring=new Vec3();
			this.use_spring_ang=new Vec3();

			this.linConstraint = new LinConstraint();
			this.angConstraint = new AngConstraint();
			this.matrix = new Mat43();
		}
		var ret = Joint;


		var vecs = [];
		for(var i=0;i<3;i++){
			vecs.push(new Vec3());
		}

		ret.prototype.setConstraint=function(){

			var vec= Vec3.poolAlloc();
			var dp = Vec3.poolAlloc();
			var dv = Vec3.poolAlloc();
			var drs= Vec3.poolAlloc();
			var obj1p = Vec3.poolAlloc();
			var obj2p = Vec3.poolAlloc();
			var trueq= Vec4.poolAlloc();
			var quat = Vec4.poolAlloc();
			var obj1m = Mat33.poolAlloc();
			var obj2m = Mat33.poolAlloc();
			var rotmat= Mat33.poolAlloc();
			var bM = Mat43.poolAlloc();

			var axis;
			var object1= this.object1;
			var object2= this.object2;

			//ジョイント位置
			Mat43.dot(bM,this.parent.matrix,this.matrix);

			if(object1 === this.parent){
				Vec3.set(obj1p,bM[9],bM[10],bM[11]);
				Vec3.copy(obj2p,object2.location);
			}else{
				Vec3.copy(obj1p,object1.location);
				Vec3.set(obj2p,bM[9],bM[10],bM[11]);
			}

			//ジョイント角度
			for(var i=0;i<3;i++){
				var j=i*3;
				var l = 1/Math.sqrt(bM[j]*bM[j]+bM[j+1]*bM[j+1]+bM[j+2]*bM[j+2]);
				rotmat[i*3]=bM[j]*l;
				rotmat[i*3+1]=bM[j+1]*l;
				rotmat[i*3+2]=bM[j+2]*l;
			}
			if(this.parent===this.object1){
				Mat33.copy(obj1m,rotmat);
				Vec4.toMat33(obj2m,this.object2.rotq);
			}else{
				Vec4.toMat33(obj1m,this.object1.rotq);
				Mat33.copy(obj2m,rotmat);
			}

			this.linConstraint.obj1=object1;
			this.linConstraint.obj2=object2;
			Vec3.copy(this.linConstraint.pos1,obj1p);
			Vec3.copy(this.linConstraint.pos2,obj2p);
			this.angConstraint.obj1=object1;
			this.angConstraint.obj2=object2;

			//差
			Vec3.sub(dp,obj2p,obj1p); //位置差
			this.linConstraint.calcDiffVelocity(dv);//速度差

			//位置制限
			Vec3.set(this.linConstraint.offset,0,0,0);
			for(var i=0;i<DIMENSION;i++){
				//軸
				axis = this.linConstraint.axes[i];
				Vec3.set(axis,obj1m[i*3]
					,obj1m[i*3+1]
					,obj1m[i*3+2]);
				//ばね
				if(this.use_spring[i]){
					Vec3.mul(vec,axis,_dt*Vec3.dot(axis,dp)*this.spring_stiffness[i]);
					Vec3.madd(vec,vec,axis,_dt*Vec3.dot(axis,dv)*this.spring_damping[i]);
					this.linConstraint.addImpulse(vec);
				}
				this.linConstraint.flgs[i]=0;

				if(this.use_limit_lin[i]){
					//位置差
					var l = Vec3.dot(axis,dp);
					if(l < this.limit_lin_lower[i]
					|| l > this.limit_lin_upper[i]){
						//制限範囲を超えている場合
						if(l< this.limit_lin_lower[i]){
							l= l - this.limit_lin_lower[i];
							this.linConstraint.flgs[i]=-1;
						}else{
							l= l - this.limit_lin_upper[i];
							this.linConstraint.flgs[i]=1;
						}
						Vec3.madd(this.linConstraint.offset
							,this.linConstraint.offset,axis,l);//本来の位置
					}
				}
				if(this.use_motor_lin && i===0){
					this.linConstraint.motorMax=this.motor_lin_max_impulse;
				}
			}

			Vec3.mul(this.linConstraint.offset,this.linConstraint.offset,ERP);
			if(this.use_motor_lin){
				Vec3.madd(this.linConstraint.offset,
					this.linConstraint.offset
					,this.linConstraint.axes[0],this.motor_lin_target_velocity); //モータ影響
			}


			//角度制限
			Mat33.getInv(rotmat,obj1m);
			Mat33.dot(rotmat,rotmat,obj2m); //差分回転行列
			Mat33.getEuler(drs,rotmat); //オイラー角に変換
			Vec3.mul(drs,drs,-1); //逆になる

			Vec3.sub(dv,this.object2.rotV,this.object1.rotV);//回転差
			Vec4.set(trueq,1,0,0,0);
			for(var i=0;i<DIMENSION;i++){
				axis = this.angConstraint.axes[i];
				//軸の向き
				if(i===0){
					Vec3.set(axis,obj2m[0],obj2m[1],obj2m[2]);
				}else if(i===1){
					Vec3.set(axis,obj1m[6],obj1m[7],obj1m[8]);
					Vec3.set(vec,obj2m[0],obj2m[1],obj2m[2]);
					Vec3.cross(axis,axis,vec);
				}else if(i===2){
					Vec3.cross(axis,this.angConstraint.axes[0],this.angConstraint.axes[1]);
				}
				Vec3.norm(axis);
				this.angConstraint.flgs[i]=0;

				//角度
				var dr = drs[i];
				if(this.use_spring_ang[i]){
					//ばね
					Vec3.mul(vec,axis,-dr*this.spring_stiffness_ang[i]*_dt);//角度差
					Vec3.madd(vec,vec,axis,Vec3.dot(dv,axis)*this.spring_damping_ang[i]*_dt);
					this.angConstraint.addImpulseR(vec);
				}

				if(this.use_limit_ang[i]){

					if(dr < this.limit_ang_lower[i]
					|| dr > this.limit_ang_upper[i]){
						//制限範囲を超えている場合
						if(dr< this.limit_ang_lower[i]){
							dr= dr - this.limit_ang_lower[i];
							this.angConstraint.flgs[i]=1;
						}else{
							dr= dr - this.limit_ang_upper[i];
							this.angConstraint.flgs[i]=-1;
						}

						Vec4.fromRotVector(quat,-dr,axis[0],axis[1],axis[2]);
						Vec4.qdot(trueq,quat,trueq);
					}
				}
				if(this.use_motor_ang && i===0){
					//回転モーター
					this.angConstraint.motorMax=this.motor_ang_max_impulse;
				}
			}

			Vec4.toTorque(this.angConstraint.offset,trueq); //クォータニオンから回転ベクトルを求める
			Vec3.mul(this.angConstraint.offset,this.angConstraint.offset,ERP);

			if(this.use_motor_ang){
				Vec3.madd(this.angConstraint.offset,
				this.angConstraint.offset
				,this.angConstraint.axes[0],this.motor_ang_target_velocity); //モータ影響
			}

			if(!object1.fix){
				object1.impFlg=true;
			}
			if(!object2.fix){
				object2.impFlg=true;
			}
			this.linConstraint.calcPre();
			this.angConstraint.calcPre();

			Vec3.poolFree(6);
			Vec4.poolFree(2);
			Mat33.poolFree(3);
			Mat43.poolFree(1);
		}
		ret.prototype.calcConstraintPre=function(){
			this.linConstraint.calcConstraintPre();
			this.angConstraint.calcConstraintPre();
		}
		ret.prototype.calcConstraint=function(){
			this.linConstraint.calcConstraint();
			this.angConstraint.calcConstraint();
		}
		return ret;
	})();

	var Spring =  (function(){
		var Spring = function(){
			//ばね
			this.defaultLength=0; //デフォルト長さ
			this.k=1; //ばね定数
			this.c=0; //ダンパ係数
			this.p0 = new Vec3(); //ばね先端1座標
			this.p1 = new Vec3(); //ばね先端2座標
			this._p0 = new Vec3(); //前回の座標
			this._p1 = new Vec3(); //前回の座標
			this.con1Obj = null; //接続オブジェクト1
			this.con1Pos = new Vec3(); //オブジェクト接続座標
			this.con2Obj = null; //接続オブジェクト2
			this.con2Pos = new Vec3(); //オブジェクト接続座標
		}
		var ret = Spring;

		ret.prototype.calc =function(){
			var dv= Vec3.poolAlloc();
			var dp=Vec3.poolAlloc();
			var n=Vec3.poolAlloc();
			//接続点
			if(this.con1){
				Mat43.dotVec3(this.p0,this.con1.matrix,this.con1Pos);
				this.con1.calcVelocity(dp,this.p0);
			}else{
				Vec3.sub(dp,this.p0,this._p0);
			}
			if(this.con2){
				if(this.con2.type===FACE){
					Vec3.set(this.p1,0,0,0);
					for(var i=0;i<3;i++){
						Vec3.madd(this.p1,this.p1,this.con2.p[i].location,this.con2.ratio[i]);
					}
				}else{
					Mat43.dotVec3(this.p1,this.con2.matrix,this.con2Pos);
				}
				this.con2.calcVelocity(dv,this.p1);
			}else{
				Vec3.sub(dv,this.p1,this._p1);
			}
			//速度差
			Vec3.sub(dv,dv,dp);

			//位置差
			Vec3.sub(dp,this.p1,this.p0);
			//バネ長さ
			var defaultLength = this.defaultLength;
			
			//バネのび量
			var l = -defaultLength + Vec3.scalar(dp);
			Vec3.nrm(n,dp);//バネ向き

			var damp=this.c*Vec3.dot(dv,n); //ダンパ力
			var spr = l*this.f; //バネ力
			Vec3.mul(n,n,(damp+spr)*_dt);

			if(this.con1){
				//Vec3.sub(dp,this.p0,this.con1.location);
				this.con1.addImpulse(this.p0,n);
			}
			if(this.con2){
				//Vec3.sub(dp,this.p1,this.con2.location);
				Vec3.mul(n,n,-1);
				this.con2.addImpulse(this.p1,n);
			}

			Vec3.copy(this._p0,this.p0);
			Vec3.copy(this._p1,this.p1);

			Vec3.poolFree(3);
		}
		return ret;
	})();
	
	var Cloth = ret.Cloth = (function(){
		//クロスシミュ

		var AIR_DAMPER=1;

		var Cloth=function(v,e,f){
			RigidBody.apply(this);
			this.type=CLOTH;
			this.bold=0.015;
			this.points=[]; //頂点位置
			this.edges= []; //エッジ
			this.bends=[];
			this.faces = []; //面
			this.facesSort =[];

			this.structual_stiffness= 0;//構造
			this.bending_stiffness = 0; //まげ
			this.spring_damping = 5;//ばね抵抗
			this.air_damping = 0;//空気抵抗
			this.vel_damping = 0;//速度抵抗

			this.restitution=0;//反発係数
			this.friction=0.1;
			this.inv_pointMass;


			for(var i=0;i<v;i++){
				this.points.push(new Point());
			}
			for(var i=0;i<e;i++){
				this.edges.push(new Edge());
				this.edges[i].cloth=this;
			}
			for(var i=0;i<f;i++){
				this.faces.push(new Face());
				this.faces[i].cloth=this;
				this.facesSort.push(this.faces[i]);
			}
			
			this.AABB= new AABB();
		}
		var ret = Cloth;
		inherits(ret,RigidBody);

		ret.prototype.addBend=function(point1,point2){
			var bends=this.bends;
			if(point1===point2){
				return 0;
			}
			var i,imax;
			for(i=0,imax=bends.length;i<imax;i++){
				if((bends[i].point1===point1 && bends[i].point2===point2)
				|| (bends[i].point1===point2 && bends[i].point2===point1)){
					return 0;
				}
			}
			for(i=0,imax=this.edges.length;i<imax;i++){
				if((this.edges[i].point1===point1 && this.edges[i].point2===point2)
				|| (this.edges[i].point1===point2 && this.edges[i].point2===point1)){
					return 0;
				}
			}
			var bend= new Edge();
			bends.push(bend);
			bend.cloth=this;
			bend.point1=point1;
			bend.point2=point2;
			return 1;
		}

		ret.prototype.init = function(){
			var edges=this.edges;

			for(var i=0;i<edges.length;i++){
				for(var j=i+1;j<edges.length;j++){
					if(edges[i].point1 === edges[j].point1){
						this.addBend(edges[i].point2,edges[j].point2);
					}else if(this.edges[i].point1 === edges[j].point2){
						this.addBend(edges[i].point2,edges[j].point1);
					}else if(edges[i].point2 === edges[j].point1){
						this.addBend(edges[i].point1,edges[j].point2);
					}else if(this.edges[i].point2 === edges[j].point2){
						this.addBend(edges[i].point1,edges[j].point1);
					}
				}
			}
			for(var i =0;i<this.bends.length;i++){
				this.bends[i].len=Vec3.len(this.bends[i].point1.location
					,this.bends[i].point2.location);
			}
			this.inv_pointMass = 1/(this.mass/this.points.length);
		}

		var Point = ret.Point = (function(){
			var Point = function(){
				this.v = new Vec3();
				this.oldv = new Vec3();
				this.location = new Vec3();
				this.rotV = new Vec3();
				this.rotq= new Vec4();
				this.fix = false;
			}
			var ret = Point;

			ret.prototype.update=function(dt){
				if(this.fix){
					return ;
				}

				var rq = Vec4.poolAlloc();
				var l=Vec3.scalar(this.rotV);
				if(l>0){
					var d=1/l;
					Vec4.fromRotVector(rq,l*dt,this.rotV[0]*d,this.rotV[1]*d,this.rotV[2]*d);
					Vec4.qdot(this.rotq,rq,this.rotq);
				}
				Vec4.poolFree(1);
				Vec3.madd(this.location,this.location,this.v,dt);
				Vec3.mul(this.v,this.v,AIR_DAMPER);
				this.v[1]-=GRAVITY*dt;
			}
			return ret;
		})()
		var  Edge = ret.Edge = (function(){
			var Edge = function(){
				this.point1 = null;
				this.point2 = null;
				this.impulse = 0;
				this.len;
				this.n = new Vec3();
				this.offset = 0;
				this.cloth=null;
			};
			var ret=Edge;

			ret.prototype.calcPre=function(flg){
				var dv = Vec3.poolAlloc();
				Vec3.sub(dv,this.point2.location,this.point1.location);
				var l = Vec3.scalar(dv);
				Vec3.nrm(this.n,dv);
				if(flg){
					l = -(this.len - l)*this.cloth.bending_stiffness; 
					Vec3.mul(dv,this.n,l*_dt*this.cloth.inv_pointMass);

					if(!this.point1.fix){
						Vec3.add(this.point1.v,this.point1.v,dv);
					}
					if(!this.point2.fix){
						Vec3.sub(this.point2.v,this.point2.v,dv);
					}
				}else{
					this.offset = -(this.len - l)*this.cloth.structual_stiffness; //位置補正
				}

				Vec3.poolFree(1);
			}
			ret.prototype.calcConstraintPre=function(){
				var impulse = Vec3.poolAlloc();
				Vec3.mul(impulse,this.n,this.impulse*this.cloth.inv_pointMass);
				if(!this.point1.fix){
					Vec3.add(this.point1.v,this.point1.v,impulse);
				}
				if(!this.point2.fix){
					Vec3.sub(this.point2.v,this.point2.v,impulse);
				}
				Vec3.poolFree(1);
			}
			ret.prototype.calcConstraint=function(m){
				var dv = Vec3.poolAlloc();
				var impulse = Vec3.poolAlloc();
				var old = this.impulse;

				Vec3.sub(dv,this.point2.v,this.point1.v);
				this.impulse += (Vec3.dot(dv,this.n)+this.offset)*(m*m/(m+m));
				this.impulse*=0.98; //やわらか拘束

				Vec3.mul(impulse,this.n,(this.impulse-old)*this.cloth.inv_pointMass);

				if(!this.point1.fix){
					Vec3.add(this.point1.v,this.point1.v,impulse);
				}
				if(!this.point2.fix){
					Vec3.sub(this.point2.v,this.point2.v,impulse);
				}
				Vec3.poolFree(2);
			}
			return ret;
		})();
		var Face = ret.Face = (function(){
			var Face = function(){
				this.points = [null,null,null];
				this.AABB=new AABB();
				this.cloth=null;
			}
			var ret = Face;

			return ret;
		})();
		var PhyFace = ret.PhyFace = (function(){
			var PhyFace = function(){
				PhyObj.call(this);
				this.p=new Vec3();
				this.face=null;
				this.bold = 0;
				this.cloth=null;
				this.ratio=new Vec3();
				this.type = FACE;
			}
			var ret = PhyFace;
			inherits(ret,PhyObj);

			ret.prototype.calcVelocity = function(dv){
				Vec3.mul(dv,this.p[0].v,this.ratio[0]);
				Vec3.madd(dv,dv,this.p[1].v,this.ratio[1]);
				Vec3.madd(dv,dv,this.p[2].v,this.ratio[2]);
			}

			ret.prototype.addImpulse = function(pos,impulse){
				for(var i=0;i<DIMENSION;i++){
					if(!this.p[i].fix){
						Vec3.madd(this.p[i].v
							,this.p[i].v,impulse,this.ratio[i]*this.cloth.inv_pointMass);
					}
				}
			}
			ret.prototype.calcEfficM= function(m){
				var r = 0;
				for(var i=0;i<DIMENSION;i++){
					if(!this.p[i].fix){
						r += this.ratio[i]*this.ratio[i];
					}
				}
				r*=this.cloth.inv_pointMass;
				m[0]=m[4]=m[8]=r;
				m[1]=m[2]=m[3]=m[5]=m[6]=m[7]=0;
			}

			ret.prototype.getFriction=function(){
				return this.cloth.friction;
			}
			ret.prototype.getRestitution=function(){
				return this.cloth.restitution;
			}
			var ZERO=new Mat33();
			ZERO[0]=ZERO[4]=ZERO[8]=0;
			ret.prototype.getInvInertiaTensor=function(){
				return ZERO;
			}
			ret.prototype.getExPos=function(a,b){
				Vec3.copy(a,this.ratio);
			}

			return ret;
		})();

		var disablePhyFace=ret.disablePhyFace=[]; //接触時のダミー板
		for(var i=0;i<1024;i++){
			disablePhyFace.push(new PhyFace());
		}

		ret.prototype.ray=function(res,p0,p1){
			var faces =this.faces;
			var poses = this.points999;
			var min=9999999;

			for(var i=0;i<faces.length;i++){
				var face = faces[i];

				if(!AABB.hitCheckLine(face.AABB,p0,p1)){
					continue;
				}
				var t0=face.points[0].location;
				var t1=face.points[1].location;
				var t2=face.points[2].location;

				var l =Geono.TRIANGLE_LINE(face.points[0].location
							,face.points[1].location
							,face.points[2].location
							,p0,p1);
				if(l<min){
					min=l;
					res.face= face;
					res.p1= face.points[0];
					res.p2= face.points[1];
					res.p3= face.points[2];
				}

				if(face.idxnum===4){
					l =Geono.TRIANGLE_LINE(face.points[0].location
							,face.points[2].location
							,face.points[3].location
							,p0,p1);
					if(l<min){
						min=l;
						res.face= face;
						res.p1= face.points[0];
						res.p2= face.points[2];
						res.p3= face.points[3];
					}
				}
			}
			
			return min;
		}
		ret.prototype.getPhyFace = function(p1,p2,p3,face,ans2){
			var phyFace = disablePhyFace.pop();
			var v1=Vec3.poolAlloc();
			var v2=Vec3.poolAlloc();
			phyFace.cloth=this;
			phyFace.face = face;
			phyFace.p[0]=p1;
			phyFace.p[1]=p2;
			phyFace.p[2]=p3;

			//ポリゴン接点から各頂点の影響比率を求める
			Vec3.sub(v1,p2.location,p1.location);
			Vec3.sub(v2,p3.location,p1.location);
			Vec3.cross(v1,v1,v2);
			var p=[p1.location
				,p2.location
				,p3.location
				,p1.location
				,p2.location];
			for(var k=0;k<DIMENSION;k++){
				Vec3.sub(v2,p[k+2],p[k+1]);
				Vec3.cross(v2,v1,v2);
				var a=Vec3.dot(v2,p[k+1]);
				var b=Vec3.dot(v2,p[k]);
				var c=Vec3.dot(v2,ans2);

				phyFace.ratio[k]=(a-c)/(a-b);
			}
			
			Vec3.poolFree(2);
			return phyFace;
		}

		ret.prototype.calcPre=function(onophy){
			//AABB計算
			Vec3.copy(this.AABB.min,this.points[0].location);
			Vec3.copy(this.AABB.max,this.points[0].location);
			for(var i=0;i<this.faces.length;i++){
				//ポリゴン毎のAABB計算
				var face = this.faces[i];
				if(face.idxnum===4){
					AABB.createFromPolygon(face.AABB
						,face.points[0].location
						,face.points[1].location
						,face.points[2].location
						,face.points[3].location);
				}else{
					AABB.createFromPolygon(face.AABB
						,face.points[0].location
						,face.points[1].location
						,face.points[2].location);
				}
				for(var j=0;j<DIMENSION;j++){
					face.AABB.min[j]-=this.bold;
					face.AABB.max[j]+=this.bold;
				}

				for(var j=0;j<DIMENSION;j++){
					this.AABB.min[j]=MIN(this.AABB.min[j],face.AABB.min[j]);
					this.AABB.max[j]=MAX(this.AABB.max[j],face.AABB.max[j]);
				}
			}
			this.facesSort.sort(function(a,b){return a.AABB.min[0]-b.AABB.min[0]});

			//剛体との衝突判定
			var list = onophy.collider.AABBSorts[0];
			var triangle = new Collider.Triangle();
			triangle.bold=this.bold;
			var ans1=Vec3.poolAlloc();
			var ans2=Vec3.poolAlloc();
			var v1=Vec3.poolAlloc();
			var v2=Vec3.poolAlloc();
			for(var i=0;i<list.length;i++){
				if(list[i].type==Collider.MESH){
				   continue;
				}   
				if(list[i].AABB.min[0]>this.AABB.max[0]){
					break;
				}
				if(!AABB.hitCheck(list[i].AABB,this.AABB)){
					continue;
				}

				for(var j=0;j<this.faces.length;j++){
					var face = this.faces[j];

					if(!AABB.hitCheck(face.AABB,list[i].AABB)){
						continue;
					}
					Vec3.copy(triangle.poses[0],face.points[0].location);
					Vec3.copy(triangle.poses[1],face.points[1].location);
					Vec3.copy(triangle.poses[2],face.points[2].location);
					triangle.AABB = face.AABB;

					var l = Collider.calcClosest(ans1,ans2,list[i],triangle);
					if(l<0){
						var phyFace = this.getPhyFace(face.points[0],face.points[1],face.points[2],face,ans2); //衝突計算用の板ポリ
						//phyFace.bold = triangle.bold;
						onophy.registHitInfo(list[i].parent,ans1,phyFace,ans2);
					}

					if(face.idx===4){
						Vec3.copy(triangle.poses[0],face.points[0].location);
						Vec3.copy(triangle.poses[1],face.points[2].location);
						Vec3.copy(triangle.poses[2],face.points[3].location);
						triangle.AABB = face.AABB;

						var l = Collider.calcClosest(ans1,ans2,list[i],triangle);
						if(l<0){
							var phyFace = this.getPhyFace(face.points[0],face.points[2],face.points[3],ans2); //衝突計算用の板ポリ
							//phyFace.bold = triangle.bold;

							onophy.registHitInfo(list[i].parent,ans1,phyFace,ans2);
						}
					}
				}
			}

			this.inv_pointMass = 1/(this.mass/this.points.length);
			for(var i=0;i<this.edges.length;i++){
				//エッジ拘束
				this.edges[i].calcPre();
			}
			for(var i=0;i<this.bends.length;i++){
				this.bends[i].calcPre(1);
			}

			Vec3.poolFree(4);
		}

		ret.prototype.calcCollision=function(target,onophy){
			//衝突判定
			var triangle = new Collider.Triangle();
			var triangle2 = new Collider.Triangle();
			triangle.bold=this.bold;
			triangle2.bold=target.bold;

			if(!AABB.hitCheck(target.AABB,this.AABB)){
				return;
			}
			var ans1=Vec3.poolAlloc();
			var ans2=Vec3.poolAlloc();

			var trueans1=Vec3.poolAlloc();
			var trueans2=Vec3.poolAlloc();
			var trueface,trueface2;
			var sflg1,sflg2;
			var ii=0;
			for(var i=0;i<this.facesSort.length;i++){
				var min=99999;
				var face = this.facesSort[i];
				//if(!AABB.hitCheck(face.AABB,target.AABB)){
				//	continue;
				//}
				triangle.AABB = face.AABB;
				for(var j=ii;j<target.facesSort.length;j++){
					var face2= target.facesSort[j]
					if(face.AABB.min[0]>face2.AABB.max[0]){
						ii=j;
						continue;
					}	
					if(face.AABB.max[0]<face2.AABB.min[0]){
						break;
					}	
					if(!AABB.hitCheck(face.AABB,face2.AABB)){
						continue;
					}
					triangle2.AABB = face2.AABB;

					for(var fan=0;fan<(face.idxnum-2);fan++){
						triangle.poses[0]=face.points[0].location;
						triangle.poses[1]=face.points[1+fan].location;
						triangle.poses[2]=face.points[2+fan].location;

						for(var fan2=0;fan2<(face2.idxnum-2);fan2++){
							triangle2.poses[0]=face2.points[0].location;
							triangle2.poses[1]=face2.points[1+fan2].location;
							triangle2.poses[2]=face2.points[2+fan2].location;

							var l = Collider.calcClosest(ans1,ans2,triangle,triangle2);
							if(l<min){
								min=l;
								trueface=face;
								trueface2=face2;
								sflg1=fan;
								sflg2=fan2;
								Vec3.copy(trueans1,ans1);
								Vec3.copy(trueans2,ans2);
							}
						}
					}
				}
				if(min<0){
					var face = trueface;
					var face2 = trueface2;
					var phyFace = this.getPhyFace(face.points[0],face.points[1+sflg1],face.points[2+sflg1]
						,face,trueans1);
					var phyFace2 = this.getPhyFace(face2.points[0],face2.points[1+sflg2],face2.points[2+sflg2]
						,face2,trueans2);
					onophy.registHitInfo(phyFace,trueans1,phyFace2,trueans2);
				}
			}

			Vec3.poolFree(4);
		}
		ret.prototype.calcConstraintPre=function(){
			var mass = (this.mass/this.points.length);
			for(var i=0;i<this.edges.length;i++){
				this.edges[i].calcConstraintPre(mass);
			}
		}
		ret.prototype.calcConstraint=function(){
			var mass = (this.mass/this.points.length);
			for(var i=0;i<this.edges.length;i++){
				this.edges[i].calcConstraint(mass);
			}
		}
		ret.prototype.update =function(dt){
			var mass = (this.mass/this.points.length);
			AIR_DAMPER=Math.pow(1-0.24*this.air_damping,dt);
			for(var i=0;i<this.points.length;i++){
				this.points[i].update(dt,mass);
			}
		}

		return ret;
	})();

	var SoftBody = ret.SoftBody = (function(){
		var SoftBody=function(v,e,f){
			//Cloth.apply(this,[v,e,f]);
			RigidBody.apply(this);
			this.type=CLOTH;
			this.bold=0.015;
			this.points=[]; //頂点位置
			this.edges= []; //エッジ
			this.bends= []; //曲がり抵抗
			this.faces = []; //面
			this.facesSort=[];

			this.structual_stiffness= 400;//構造
			this.bending_stiffness = 0; //まげ
			this.spring_damping = 5;//ばね抵抗
			this.air_damping = 0;//空気抵抗
			this.vel_damping = 0;//速度抵抗

			this.restitution=0;//反発係数
			this.friction=0.1;


			for(var i=0;i<v;i++){
				this.points.push(new Cloth.Point());
			}
			for(var i=0;i<e;i++){
				this.edges.push(new SoftBody.Edge());
				this.edges[i].cloth=this;
			}
			for(var i=0;i<f;i++){
				this.faces.push(new Cloth.Face());
				this.faces[i].cloth=this;
				this.facesSort.push(this.faces[i]);
			}
			
			this.AABB= new AABB();
		}
		var ret=SoftBody;
		inherits(ret,Cloth);

		ret.prototype.init = function(){
			var edges=this.edges;

			for(var i=0;i<edges.length;i++){
				Vec3.sub(edges[i].sabun,edges[i].point2.location
					,edges[i].point1.location);
				Vec3.mul(edges[i].sabun,edges[i].sabun,0.5);
				edges[i].point1.rotq[0]*=-1;
				Vec4.rotVec3(edges[i].sabun,edges[i].point1.rotq,edges[i].sabun);
				edges[i].point1.rotq[0]*=-1;
			}
			this.inv_pointMass = 1/(this.mass/this.points.length);
		}
		ret.prototype.calcPre=function(onophy){
			Cloth.prototype.calcPre.call(this,onophy);
		}

		ret.prototype.calcConstraintPre=function(){
		}
		ret.prototype.calcConstraint=function(){
		}

		var  Edge = ret.Edge = (function(){
			var Edge = function(){
				this.point1 = null;
				this.point2 = null;
				this.len;
				this.sabun = new Vec4();
				this.cloth=null;
			};
			var ret=Edge;

			ret.prototype.calcPre=function(){
				var pos1=Vec3.poolAlloc();
				var pos2=Vec3.poolAlloc();
				var dv = Vec3.poolAlloc();
				var impulse = Vec3.poolAlloc();
				var rotq = Vec4.poolAlloc();

				Vec4.rotVec3(pos1,this.point1.rotq,this.sabun);
				Vec4.rotVec3(pos2,this.point2.rotq,this.sabun);
				Vec3.add(dv,pos1,pos2);
				Vec3.sub(dv,this.point2.location,dv);
				Vec3.sub(dv,dv,this.point1.location);
				var l = Vec3.scalar(dv);
				if(l!==0){
					Vec3.mul(impulse,dv,1/l);
					l*= this.cloth.push*30;
					Vec3.sub(dv,this.point2.v,this.point1.v);
					l += Vec3.dot(dv,impulse)* this.cloth.damping;

					Vec3.mul(impulse,impulse,l*this.cloth.inv_pointMass*_dt);

					if(!this.point1.fix){
						Vec3.add(this.point1.v,this.point1.v,impulse);

						Vec3.cross(dv,pos1,impulse); 
						Vec3.add(this.point1.rotV,this.point1.rotV,dv); //回転
					}
					if(!this.point2.fix){
						Vec3.mul(impulse,impulse,-1);
						Vec3.add(this.point2.v,this.point2.v,impulse);

						Vec3.mul(dv,pos2,-1);
						Vec3.cross(dv,dv,impulse); 
						Vec3.add(this.point2.rotV,this.point2.rotV,dv); //回転
					}
				}

				Vec4.qmdot(rotq,this.point2.rotq,this.point1.rotq,-1);
				Vec4.toTorque(impulse,rotq);
				Vec3.mul(impulse,impulse,_dt*this.cloth.inv_pointMass*this.cloth.bending_stiffness*2);
				Vec3.add(this.point1.rotV,this.point1.rotV,impulse);
				Vec3.sub(this.point2.rotV,this.point2.rotV,impulse);

				Vec3.mul(this.point1.rotV,this.point1.rotV,0.999);
				Vec3.mul(this.point2.rotV,this.point2.rotV,0.999);

				Vec4.poolFree(1);


				Vec3.poolFree(4);
			}
			return ret;
		})();
		return ret;
	})();
	


	ret.prototype.createRigidBody = function(shape,mesh){
		var phyobj=new RigidBody();
		this.rigidBodies.push(phyobj);

		var collision=null;
		if(shape == "SPHERE"){
			//collision = this.collider.createCollision(Collider.SPHERE);
			collision = new Collider.Sphere();
		}else if(shape=="BOX"){
			collision = new Collider.Cuboid();
			//collision = this.collider.createCollision(Collider.CUBOID);
		}else if(shape=="CYLINDER"){
			collision = new Collider.Cylinder();
			//collision = this.collider.createCollision(Collider.CYLINDER);
		}else if(shape=="CONE"){
			collision = new Collider.Cone();
			//collision = this.collider.createCollision(Collider.CONE);
		}else if(shape=="CAPSULE"){
			collision = new Collider.Capsule();
			//collision = this.collider.createCollision(Collider.CAPSULE);
		}else if(shape=="CONVEX_HULL"){
			collision = new Collider.ConvexHull();
			//collision = this.collider.createConvexHull();
			for(var i=0;i<mesh.vertices.length;i++){
				collision.poses.push(new Vec3());
			}
			phyobj.mesh = mesh;
		}else if(shape=="MESH"){
			collision = new Collider.Mesh();
			//collision = this.collider.createMesh();
			for(var i=0;i<mesh.vertices.length;i++){
				collision.poses.push(new Vec3());
			}
			for(var i=0;i<mesh.faces.length;i++){
				var triangle = new Collider.Triangle();
				triangle.poses[0] = collision.poses[mesh.faces[i].idx[0]];
				triangle.poses[1] = collision.poses[mesh.faces[i].idx[1]];
				triangle.poses[2] = collision.poses[mesh.faces[i].idx[2]];
				collision.triangles.push(triangle);
			}
			phyobj.mesh = mesh;
		}
		phyobj.collision=collision;
		if(collision){
			this.collider.addCollision(collision);
			collision.parent=phyobj;
		}
		return phyobj;
	}

	ret.prototype.deleteRigidBody = function(object){
		//オブジェクト削除
		var rigidBodies=this.rigidBodies;
		for(var i=rigidBodies.length;i--;){
			if(rigidBodies[i]===object){
				//コリジョンを削除
				if(object.collision){
					this.deleteCollision(object.collision);
				}
				rigidBodies.splice(i,1);
				break;
			}
		}
	}
	ret.prototype.createJoint= function(){
		var joint =new Joint();
		this.joints.push(joint);
		return joint;
	}
	ret.prototype.deleteJoint= function(joint){
		//ジョイント削除
		var joints=this.joints;
		for(var i=joints.length;i--;){
			if(joints[i]===joint){
				joints.splice(i,1);
				break;
			}
		}
	}

	ret.prototype.createSpring = function(){
		//スプリングオブジェクト作成
		var res=new Spring();
		this.springs.push(res)
		return res
	}
	ret.prototype.deleteSpring = function(obj){
		//スプリングオブジェクト削除
		var springs=this.springs;
		for(var i=0;i<springs.length;i++){
			if(springs[i]===obj){
				springs.splice(i,1);
				break;
			}
		}
	}

	ret.prototype.readjustHitInfo=function(target){
		var obj1 = target.obj1;
		var obj2 = target.obj2;
		var pos1= target.pos1;
		var pos2= target.pos2;
		var hitInfo;
		var hitInfos = this.hitInfos;

		//座標が近いやつはまとめる
		for(var i=hitInfos.length;i--;){
			hitInfo=hitInfos[i];
			if(hitInfo === target){
				continue;
			}
			if(obj2.type===FACE){
				if(hitInfo.obj1!== obj1|| hitInfo.obj2.face!==obj2.face){
					continue;
				}

			}else{
				if(hitInfo.obj1!== obj1|| hitInfo.obj2!==obj2){
					continue;
				}
			}

			if(Vec3.len2(hitInfo.pos1,pos1)<0.01
			&& Vec3.len2(hitInfo.pos2,pos2)<0.01){
				//力をまとめる
				Vec3.add(target.impulse,target.impulse,hitInfo.impulse);
				Vec3.add(target.impulseR,target.impulseR,hitInfo.impulseR);

				//削除
				hitInfos.splice(i,1);
				if(obj2.type===FACE){
					Cloth.disablePhyFace.push(hitInfo.obj2);
				}
				disableHitInfos.push(hitInfo);
			}
		}

		//同一の組み合わせが5以上の場合は古いやつから消して一定数以下にする
		var count=0;
		var max=8;
		for(var i=hitInfos.length;i--;){
			hitInfo=hitInfos[i];

			if(obj2.type===FACE){
				if(hitInfo.obj1!== obj1|| hitInfo.obj2.face!==obj2.face){
					continue;
				}

			}else{
				if(hitInfo.obj1!== obj1|| hitInfo.obj2!==obj2){
					continue;
				}
			}

			count++;
			if(count>max){
				//削除
				hitInfos.splice(i,1);

				if(obj2.type===FACE){
					Cloth.disablePhyFace.push(hitInfo.obj2);
				}
				disableHitInfos.push(hitInfo);

			}
		}
	}
	ret.prototype.registHitInfo = (function(){
		return function(obj1,pos1,obj2,pos2,hitInfo){

			if(Vec3.len2(pos1,pos2)===0 ){
				return;

			}
			var hitInfos = this.hitInfos;

			if(!hitInfo){
				//新しく取得する場合
				hitInfo = disableHitInfos.pop();
				hitInfos.push(hitInfo);
				hitInfo.obj1 = obj1;
				hitInfo.obj2 = obj2;
				Vec3.set(hitInfo.impulse,0,0,0);
				Vec3.set(hitInfo.impulseR,0,0,0);
			}

			Vec3.copy(hitInfo.pos1,pos1);
			Vec3.copy(hitInfo.pos2,pos2);
			
			hitInfo.counter=0;

			this.readjustHitInfo(hitInfo);

			return hitInfo;

		};
	})();

	ret.prototype.calc=function(dt){
		_dt=dt
		var rigidBodies = this.rigidBodies ;

		var dv=Vec3.poolAlloc();
		var start=Date.now();

		for(i = this.rigidBodies.length;i--;){
			//判定用行列更新
			this.rigidBodies[i].calcPre();
		}

		var idx=0;
		for(var i=0;i<this.joints.length;i++){
			//コリジョン無効リスト作成
			if(this.joints[i].disable_collisions){
				var id1=this.joints[i].object1.collision.id;
				var id2=this.joints[i].object2.collision.id;
				var pairId=-1;
				if(id1<id2){
					pairId = (id1<<16) | id2;
				}else{
					pairId = (id2<<16) | id1;
				}
				this.disableList[idx]=pairId
				idx++;

			}
		}
		this.disableList[idx]=-1;

		//すべてのコリジョンの衝突判定
		this.collider.All(this.disableList);

		var hitList = this.collider.hitList;
		for(var i=0;hitList[i].col1;i++){
			//接触拘束作成
			var hit = hitList[i];
			//if(!hit.col1.parent.moveflg && !hit.col2.parent.moveflg){
			//	continue;
			//}
			if(hit.col1.parent && hit.col2.parent){
				this.registHitInfo(hit.col1.parent,hit.pos1,hit.col2.parent,hit.pos2);
			}
		}

		for(i = this.springs.length;i--;){
			//バネ処理
			this.springs[i].calc();
		}

		for(var i=0;i<this.joints.length;i++){
			//ジョイント拘束セット+ばね
			this.joints[i].setConstraint();
		}

		for(i = this.clothes.length;i--;){
			//クロス処理
			this.clothes[i].calcPre(this);
		}
		for(var i = 0;i<this.clothes.length;i++){
			for(var j = i+1;j<this.clothes.length;j++){
				//クロス同士の接触処理
				this.clothes[i].calcCollision(this.clothes[j],this);
			}
		}
		

		//衝突情報の持続判定
		var ans1=Vec3.poolAlloc();
		var ans2=Vec3.poolAlloc();
		var ans4=Vec3.poolAlloc();
		var t=Vec3.poolAlloc();
		for(var i=0;i<this.hitInfos.length;i++){
			var hitInfo = this.hitInfos[i];

			var obj1=hitInfo.obj1;
			var obj2=hitInfo.obj2;
			//if(!obj1.moveflg && !obj2.moveflg){
			//	continue;
			//}
			if(hitInfo.counter==0){
				continue;
			}

			if(obj1.type!= RIGID || obj2.type !=RIGID){
				if(obj1.type===FACE){
					Cloth.disablePhyFace.push(hitInfo.obj1);
				}
				if(obj2.type===FACE){
					Cloth.disablePhyFace.push(hitInfo.obj2);
				}
				this.hitInfos.splice(i,1);
				disableHitInfos.push(hitInfo);
				i--;
				continue;
			}

			//前回の衝突点の現在位置を求めてめり込み具合を調べる
			var l,l2;
			Mat43.dotVec3(ans1,obj1.matrix,hitInfo.pos1ex);
			Vec3.sub(t,ans1,hitInfo.axes[0]);
			if(obj2.collision.type==Collider.MESH){
				l=Collider.MESH_LINE2(ans1,t,obj2.collision);
				if(l<-0.03){
					l=999;
				}
			}else{
				l=obj2.collision.ray(ans1,t);
			}
			Vec3.madd(ans2,ans1,hitInfo.axes[0],-l);

			Mat43.dotVec3(ans4,obj2.matrix,hitInfo.pos2ex);
			Vec3.add(t,ans4,hitInfo.axes[0]);
			if(obj1.collision.type==Collider.MESH){
				l2=Collider.MESH_LINE2(ans4,t,obj1.collision);
				if(l2<-0.03){
					l2=999;
				}
			}else{
				l2=obj1.collision.ray(ans4,t);
			}
			if(l2<l){
				//めり込みが大きい方を採用
				Vec3.copy(ans2,ans4);
				Vec3.madd(ans1,ans2,hitInfo.axes[0],l2);
				l=l2;
			}

			if(l>=0){
				//めり込んでいない場合は削除
				this.hitInfos.splice(i,1);
				disableHitInfos.push(hitInfo);
				i--;
			}else{
				//持続処理
				this.registHitInfo(obj1,ans1,obj2,ans2,hitInfo);
			}
		}	
		for(i = this.rigidBodies.length;i--;){
			//重力
			var obj = rigidBodies[i];
			if(obj.fix)continue
			obj.v[1]-=GRAVITY*dt;
		}

		//事前処理
		for (var i = 0;i<this.hitInfos.length; i++) {
			this.hitInfos[i].calcPre();
		}

		//繰り返しソルバ
		start=Date.now();
		var repetition;
		var constraints = [];
		Array.prototype.push.apply(constraints,this.hitInfos);
		Array.prototype.push.apply(constraints,this.joints);
		Array.prototype.push.apply(constraints,this.clothes);
		

		for (var i = 0;i<constraints.length; i++) {
			//ウォームスタート処理
			constraints[i].calcConstraintPre();
		}

		for (repetition = 0; repetition < REPETITION_MAX; repetition++) {
			//繰り返し最大数まで繰り返して撃力を収束させる
			var impnum=0;
			for(i = rigidBodies.length;i--;){
				//現在の速度を保存
				var o = rigidBodies[i];
				if(!o.impFlg){continue;}
				Vec3.copy(o.oldv,o.v);
				Vec3.copy(o.oldrotV,o.rotV);
				impnum++;
			}

			for (var i = 0;i<constraints.length; i++) {
				constraints[i].calcConstraint();
			}
			
			//収束チェック
			var sum= 0;
			for(i = rigidBodies.length;i--;){
				var o = rigidBodies[i];
				if(!o.impFlg){continue;}
				Vec3.sub(dv,o.oldv,o.v);
				sum+=(dv[0]*dv[0]+dv[1]*dv[1]+dv[2]*dv[2]);
				Vec3.sub(dv,o.oldrotV,o.rotV);
				sum+=(dv[0]*dv[0]+dv[1]*dv[1]+dv[2]*dv[2]);
				
			}
			if ( sum<= 0.000001*impnum && repetition>1) {
				break;
			}
		}
		this.repetition=repetition;
		this.impulseTime=Date.now()-start;

		LINDAMP = Math.pow(1.0-0.04,dt);
		ANGDAMP = Math.pow(1.0-0.1,dt);
		for(i = rigidBodies.length;i--;){
			rigidBodies[i].update(dt);
		}
		for(i = this.clothes.length;i--;){
			this.clothes[i].update(dt);
		}

		Vec3.poolFree(5);
		return;
	}

	return ret
})()

