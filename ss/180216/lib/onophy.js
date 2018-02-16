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
	
	var ret = function(){
		this.rigidBodies = []; //剛体
		this.springs= []; //ばね
		this.clothes =[]; //布
		this.springMeshes= []; //ばねメッシュ
		this.joints = []; //ジョイント
		this.repetition=0; //ソルバ繰り返した回数

		this.collider=new Collider(); //コライダ
		this.hitInfos=[]; //コリジョン接触情報
		this.disableList=new Array(1024); //コリジョン無効リスト
	}

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

	var RigidBody = (function(){
		var RigidBody = function(){
			PhyObj.call(this);
			//物理オブジェクト
			this.fix=1; //1固定 0挙動計算対象
			this.moveflg=1;
			this.matrix =new Mat43(); //オブジェクトの姿勢等
			this.inv_matrix=new Mat44(); //逆行列
			this.oldmat = new Mat43();
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

			this.rotmat=new Mat33(); //回転状態
			this.scale=new Vec3(); //スケール
			this.location=new Vec3(); //位置
			this.inv_mass = 0; //質量の逆数

			this.collision=null;
			this.COGBase = new Vec3();
			this.COG = new Vec3();
		}
		var ret=RigidBody;
		inherits(ret,PhyObj);

		var rotL = new Vec3();
		ret.prototype.calcPre = function(){
			var m=this.matrix;
			var r=this.rotmat;

			//合成行列
			var sx=this.scale[0];
			var sy=this.scale[1];
			var sz=this.scale[2];

			m[0]=r[0]*sx;
			m[1]=r[1]*sx;
			m[2]=r[2]*sx;
			m[3]=0;
			m[4]=r[3]*sy;
			m[5]=r[4]*sy;
			m[6]=r[5]*sy;
			m[7]=0;
			m[8]=r[6]*sz;
			m[9]=r[7]*sz;
			m[10]=r[8]*sz;
			m[11]=0;
			m[12]=this.location[0];
			m[13]=this.location[1];
			m[14]=this.location[2];
			m[15]=1;

			Mat44.getInv(this.inv_matrix,m);

			Mat33.dotVec3(rotL,this.inertiaTensor,this.rotV);
			//現在の傾きと直交慣性モーメントから慣性テンソルを求める
			Mat33.getInv(bM,r);
			Mat33.dot(this.inertiaTensor,this.inertiaTensorBase,bM);
			Mat33.dot(this.inertiaTensor,r,this.inertiaTensor);
			Mat33.getInv(this.inv_inertiaTensor,this.inertiaTensor);
			//前ステップの角運動量から角速度を求める
			Mat33.dotVec3(this.rotV,this.inv_inertiaTensor,rotL);

			//コリジョンの状態を更新
			var collision=this.collision;
			Vec3.copy(collision.location,this.location);
			Mat33.copy(collision.rotmat,this.rotmat);
			Mat44.copy(collision.scale,this.scale);

			//重心位置
			Mat33.dotVec3(this.COG,this.rotmat,this.COGBase);
			Vec3.add(this.COG,this.COG,this.location);
		}

		ret.prototype.update=function(dt){
			if(this.fix)return;

			Vec3.mul(this.rotV,this.rotV,ANGDAMP);
			var l=Vec3.scalar(this.rotV);
			if(l>0){
				var d=1/l;
				Mat33.getRotMat(bM,l*dt,this.rotV[0]*d,this.rotV[1]*d,this.rotV[2]*d);
				Mat33.dot(this.rotmat,bM,this.rotmat);
				
				//オブジェクト中心と重心のズレ補正
				Mat33.sub(bV0,this.COG,this.location);
				Mat33.dotVec3(bV0,bM,bV0);
				Vec3.sub(bV0,this.COG,bV0);
				Vec3.sub(bV0,bV0,this.location);
				Vec3.add(this.location,this.location,bV0);
			}

			Vec3.mul(this.v,this.v,LINDAMP);
			Vec3.muladd(this.location,this.location,this.v,dt);

			this.impFlg=0;
		}
		var addimpulseBuf =new Vec3();

		ret.prototype.calcEfficM= (function(){
			var R1 = new Mat33;
			var calcBuf = new Vec3();
			return function(m,r1){
				var r = calcBuf;
				Vec3.sub(calcBuf,r1,this.COG);
				Mat33.set(R1,0,r[2],-r[1],-r[2],0,r[0],r[1],-r[0],0);

				Mat33.dot(m,R1,this.inv_inertiaTensor);
				Mat33.dot(m,m,R1);
				Mat33.mul(m,m,-1);
				m[0]+=this.inv_mass;
				m[4]+=this.inv_mass;
				m[8]+=this.inv_mass;
			}
		})();
		ret.prototype.calcVelocity = function(v,pos){
			Vec3.sub(v,pos,this.COG);
			Vec3.cross(v,this.rotV,v);
			Vec3.add(v,v,this.v);
		}
		ret.prototype.addImpulse = function(pos,impulse){
			//衝撃を与える
			if(this.fix){
				//固定の場合は無視
				return;
			}

			Vec3.muladd(this.v,this.v,impulse, this.inv_mass);//並行

			Vec3.sub(addimpulseBuf,pos,this.COG);
			Vec3.cross(addimpulseBuf,addimpulseBuf,impulse); 
			Mat33.dotVec3(addimpulseBuf,this.inv_inertiaTensor,addimpulseBuf);
			Vec3.add(this.rotV,this.rotV,addimpulseBuf); //回転
		}
		

		ret.prototype.addImpulseR = function(impulse){
			//衝撃を与える(回転のみ
			if(this.fix){
				//固定の場合は無視
				return;
			}
			Mat33.dotVec3(addimpulseBuf,this.inv_inertiaTensor,impulse);
			Vec3.add(this.rotV,this.rotV,addimpulseBuf);
		}

		ret.prototype.getExPos = function(a,b){
			Mat43.dotMat43Vec3(a,this.inv_matrix,b);
		}
		ret.prototype.getFriction= function(){
			return this.friction;
		}
		ret.prototype.getRestitution= function(){
			return this.restitution;
		}
		ret.prototype.getInvInertiaTensor= function(){
			return this.inv_inertiaTensor;
		}

		ret.prototype.refresh = function(){
			if(!this.collision){
				return;
			}
			var type = this.collision.type;
			var obj = this .parent;
			var sx = obj.bound_box[3]*obj.scale[0];
			var sy = obj.bound_box[4]*obj.scale[1];
			var sz = obj.bound_box[5]*obj.scale[2];
				
			Mat33.mul(this.inertiaTensorBase,this.inertiaTensorBase,0);
			Vec3.set(this.COGBase,0,0,0 );
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
				Vec3.set(this.COGBase,0,0,-sz*0.5 );
				break;
			case Collider.CONVEX:
				var m= this.mesh;
				var faces=m.faces;
				var vertices=m.vertices;
				var Ssum=0;
				var P = new Vec3();
				var p = new Vec3();
				var I = new Mat33();
				for(var i=0;i<faces.length;i++){
					var p1 = vertices[faces[i].idx[0]].pos;
					var p2 = vertices[faces[i].idx[1]].pos;
					var p3 = vertices[faces[i].idx[2]].pos;
					var S = 1/6 * (p1[1]*p2[2]*p3[0] + p1[2]*p2[0]*p3[1] + p1[0]*p2[1]*p3[2]
						- p1[2]*p2[1]*p3[0] - p1[0]*p2[2]*p3[1] -  p1[1]*p2[0]*p3[2]);
					Vec3.add(p,p1,p2);
					Vec3.add(p,p,p3);
					Vec3.mul(p,p,1/4);
					Vec3.muladd(P,P,p,S);
					
					Ssum+=S;

					calcInertia(I,p1,p2,p3);
					Mat33.add(this.inertiaTensorBase,this.inertiaTensorBase,I);
				}
				Vec3.mul(this.COGBase,P,1/Ssum );
				Mat33.mul(this.inertiaTensorBase,this.inertiaTensorBase,1/Ssum );
				calcTranslateInertia(I,this.offset);
				Mat33.mul(I,I,-1);
				Mat33.add(this.inertiaTensorBase,this.inertiaTensorBase,I);
				
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
			var S =(a[1]*b[2]*c[0] + a[2]*b[0]*c[1] + a[0]*b[1]*c[2]
				- a[2]*b[1]*c[0] - a[0]*b[2]*c[1] -  a[1]*b[0]*c[2]);
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

			Mat33.mul(I,I,S/120);
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

		var calcBuf = new Vec3();
		ret.prototype.calcDiffVelocity = function(dv){
			//二点間の速度差を求める
			this.obj1.calcVelocity(dv,this.pos1);
			this.obj2.calcVelocity(calcBuf,this.pos2);
			Vec3.sub(dv,calcBuf,dv);
		}

		var addimpulseBuf = new Vec3();
		ret.prototype.addImpulse = function(impulse){
			//二点に力を加える
			this.obj1.addImpulse(this.pos1,impulse);
			Vec3.mul(addimpulseBuf,impulse,-1);
			this.obj2.addImpulse(this.pos2,addimpulseBuf);
			
		}
		ret.prototype.addImpulseR = function(impulse){
			//二点に力を加える
			this.obj1.addImpulseR(impulse);
			Vec3.mul(addimpulseBuf,impulse,-1);
			this.obj2.addImpulseR(addimpulseBuf);
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
			var mat1 = new Mat33;
			return function(m){
				this.obj1.calcEfficM(mat1,this.pos1);
				this.obj2.calcEfficM(m,this.pos2);
				Mat33.add(m,m,mat1);
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

		var dv=new Vec3();
		var impulse = new Vec3();
		var nM=new Mat33();
		ret.prototype.calcPre = function(){
			var obj1=this.obj1;
			var obj2=this.obj2;

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
				Vec3.muladd(this.offset,this.offset,dv,-0.005);
				Vec3.mul(this.offset,this.offset,ERP);
			}

			this.fricCoe = obj1.getFriction() * obj2.getFriction(); 

			//反発力
			this.calcDiffVelocity(dv);
			Vec3.muladd(this.offset,this.offset,this.axes[0]
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
		}
		var old=new Vec3();
		ret.prototype.calcConstraintPre=function(){
			Vec3.set(impulse,0,0,0);
			for(var i=0;i<DIMENSION;i++){
				Vec3.muladd(impulse,impulse,this.axes[i],this.impulse[i]);
			}
			this.addImpulse(impulse);
			this.addImpulseR(this.impulseR);
		}

		ret.prototype.calcConstraint=function(){
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
			Vec3.muladd(impulse,impulse,this.axes[2],this.impulse[2]-old2);
			this.addImpulse(impulse); //差分摩擦力を速度に反映

			//転がり抵抗
			Vec3.copy(old,this.impulseR);
			Vec3.sub(dv,this.obj2.rotV,this.obj1.rotV);
			Vec3.muladd(dv,dv,this.axes[0],-Vec3.dot(dv,this.axes[0])); //摩擦方向の力
			Mat33.dotVec3(impulse,this.rM,dv);
			Vec3.add(this.impulseR,this.impulseR,impulse);
			Vec3.copy(impulse,this.impulseR);
			var l =Vec3.scalar2(impulse);
			if (l > maxr*maxr) { //摩擦力が最大量を上回る場合は最大量でセーブ
				Vec3.muladd(this.impulseR,this.impulseR,impulse,maxr/Math.sqrt(l) - 1);
			}
			Vec3.mul(this.impulseR,this.impulseR,CFM);
			Vec3.sub(impulse,this.impulseR,old);
			this.addImpulseR(impulse);
			
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

		var vec=new Vec3();
		var m = new Mat33();
		var impulse = new Vec3();
		ret.prototype.calcPre=function(){
			for(var i=0;i<DIMENSION;i++){
				this.axesM[i*3]=this.axes[i][0];
				this.axesM[i*3+1]=this.axes[i][1];
				this.axesM[i*3+2]=this.axes[i][2];
			}
			this.calcEfficM(m);

			this.calcFvm(m);
			
			return;
		};

		var old = new Vec3();
		ret.prototype.calcConstraintPre=function(){
			Mat33.dotVec3(impulse,this.axesM,this.impulse);
			this.addImpulse(impulse);
		}
		ret.prototype.calcConstraint=function(){

			Vec3.copy(old,this.impulse);
			this.calcDiffVelocity(vec); //速度差
			Vec3.add(vec,vec,this.offset); //補正
			Mat33.dotVec3(impulse,this.fvM,vec);
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

		var old = new Vec3();
		ret.prototype.calcConstraintPre=function(){
			Mat33.dotVec3(impulse,this.axesM,this.impulse);
			this.addImpulseR(impulse);
		}	
		ret.prototype.calcConstraint=function(){
			Vec3.copy(old,this.impulse);
			Vec3.sub(vec,this.obj2.rotV,this.obj1.rotV); //回転速度差
			Vec3.add(vec,vec,this.offset); //補正
			Mat33.dotVec3(impulse,this.fvM,vec);
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
			this.addImpulseR(impulse);
			
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
			this.matrix = new Mat44();
		}
		var ret = Joint;

		var vec= new Vec3();
		var dp = new Vec3();
		var dv = new Vec3();
		var drs= new Vec3();

		var bM = new Mat44();
		var jointp = new Vec3();
		var mat33=new Mat33();
		var rotmat= new Mat33();

		var vecs = [];
		for(var i=0;i<3;i++){
			vecs.push(new Vec3());
		}

		var truemat=new Mat33();
		ret.prototype.setConstraint=function(){
			var axis;
			var object1= this.object1;
			var object2= this.object2;

			var obj1p;
			var obj2p;

			//ジョイント位置
			Mat44.dot(bM,this.parent.matrix,this.matrix);
			Vec3.set(jointp,bM[12],bM[13],bM[14]);

			if(object1 === this.parent){
				obj1p=jointp;
				obj2p=object2.location;
			}else{
				obj1p=object1.location;
				obj2p=jointp;
			}

			//ジョイント角度
			var obj1m;
			var obj2m;
			for(var i=0;i<3;i++){
				var j=i*4;
				var l = 1/Math.sqrt(bM[j]*bM[j]+bM[j+1]*bM[j+1]+bM[j+2]*bM[j+2]);
				mat33[i*3]=bM[j]*l;
				mat33[i*3+1]=bM[j+1]*l;
				mat33[i*3+2]=bM[j+2]*l;
			}
			if(this.parent===this.object1){
				obj1m= mat33;
				obj2m= this.object2.rotmat;
			}else{
				obj1m = this.object1.rotmat;
				obj2m = mat33;
			}


			this.linConstraint.obj1=object1;
			this.linConstraint.obj2=object2;
			Vec3.copy(this.linConstraint.pos1,obj1p);
			Vec3.copy(this.linConstraint.pos2,obj2p);
			//Vec3.sub(this.linConstraint.pos1,obj1p,object1.location);
			//Vec3.sub(this.linConstraint.pos2,obj2p,object2.location);
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
					Vec3.muladd(vec,vec,axis,_dt*Vec3.dot(axis,dv)*this.spring_damping[i]);
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
						Vec3.muladd(this.linConstraint.offset
							,this.linConstraint.offset,axis,l);//本来の位置
					}
				}
				if(this.use_motor_lin && i===0){
					this.linConstraint.motorMax=this.motor_lin_max_impulse;
				}
			}

			Vec3.mul(this.linConstraint.offset,this.linConstraint.offset,ERP);
			if(this.use_motor_lin){
				Vec3.muladd(this.linConstraint.offset,
					this.linConstraint.offset
					,this.linConstraint.axes[0],this.motor_lin_target_velocity); //モータ影響
			}


			//角度制限
			Mat33.getInv(rotmat,obj1m);
			Mat33.dot(rotmat,rotmat,obj2m); //差分回転行列
			Mat33.getEuler(drs,rotmat); //オイラー角に変換
			Vec3.mul(drs,drs,-1); //逆になる

			Mat33.setInit(truemat);
			Vec3.sub(dv,this.object2.rotV,this.object1.rotV);//回転差
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
					//Vec3.set(axis,obj1m[6],obj1m[7],obj1m[8]);
					//Vec3.set(vec,obj2m[0],obj2m[1],obj2m[2]);
					//Vec3.cross(axis,vec,axis);
					//Vec3.cross(axis,axis,vec);
				}
				Vec3.norm(axis);
				this.angConstraint.flgs[i]=0;

				//角度
				var dr = drs[i];
				if(this.use_spring_ang[i]){
					//ばね
					Vec3.mul(vec,axis,-dr*this.spring_stiffness_ang[i]*_dt);//角度差
					Vec3.muladd(vec,vec,axis,Vec3.dot(dv,axis)*this.spring_damping_ang[i]*_dt);
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

						Mat33.getRotMat(rotmat,-dr,axis[0],axis[1],axis[2]);
						Mat33.dot(truemat,rotmat,truemat);

					}
				}
				if(this.use_motor_ang && i===0){
					//回転モーター
					this.angConstraint.motorMax=this.motor_ang_max_impulse;
				}
			}

			Mat33.getRotVec(this.angConstraint.offset,truemat); //回転行列から回転軸ベクトルを求める
			Vec3.mul(this.angConstraint.offset,this.angConstraint.offset,ERP);

			if(this.use_motor_ang){
				Vec3.muladd(this.angConstraint.offset,
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
			var dv=bV0;
			var dp=bV1;
			var n=bV2;
			//接続点
			if(this.con1){
				Mat43.dotMat43Vec3(this.p0,this.con1.matrix,this.con1Pos);
				this.con1.calcVelocity(dp,this.p0);
			}else{
				Vec3.sub(dp,this.p0,this._p0);
			}
			if(this.con2){
				Mat43.dotMat43Vec3(this.p1,this.con2.matrix,this.con2Pos);
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
				Vec3.sub(dp,this.p0,this.con1.location);
				this.con1.addImpulse(this.p0,n);
			}
			if(this.con2){
				Vec3.sub(dp,this.p1,this.con2.location);
				Vec3.mul(n,n,-1);
				this.con2.addImpulse(this.p1,n);
			}

			Vec3.copy(this._p0,this.p0);
			Vec3.copy(this._p1,this.p1);
		}
		return ret;
	})();
	
	var Cloth = ret.Cloth = (function(){
		//クロスシミュ

		var AIR_DAMPER=1;
		var Point = (function(){
			var Point = function(){
				this.v = new Vec3();
				this.oldv = new Vec3();
				this.location = new Vec3();
				this.fix = false;
			}
			var ret = Point;

			ret.prototype.update=function(dt){
				if(this.fix){
					return ;
				}
				Vec3.muladd(this.location,this.location,this.v,dt);
				Vec3.mul(this.v,this.v,AIR_DAMPER);
				this.v[1]-=GRAVITY*dt;
			}
			return ret;
		})()
		var  Edge = (function(){
			var Edge = function(){
				this.point1 = null;
				this.point2 = null;
				this.impulse = 0;
				this.len;
				this.n = new Vec3();
				this.offset = 0;
			};
			var ret=Edge;

			var dv = new Vec3();
			var impulse = new Vec3();
			ret.prototype.calcPre=function(m){
				Vec3.sub(dv,this.point2.location,this.point1.location);
				var l = Vec3.scalar(dv);
				Vec3.nrm(this.n,dv);
				this.offset = -(this.len - l)*ERP; //位置補正
				Vec3.sub(dv,this.point2.v,this.point1.v);

			}
			ret.prototype.calcConstraintPre=function(m){
				Vec3.mul(impulse,this.n,this.impulse/m);
				if(!this.point1.fix){
					Vec3.add(this.point1.v,this.point1.v,impulse);
				}
				if(!this.point2.fix){
					Vec3.sub(this.point2.v,this.point2.v,impulse);
				}
			}
			ret.prototype.calcConstraint=function(m){
				var old = this.impulse;

				Vec3.sub(dv,this.point2.v,this.point1.v);
				this.impulse += (Vec3.dot(dv,this.n)+this.offset)*(m*m/(m+m));
				this.impulse*=0.95; //やわらか拘束

				Vec3.mul(impulse,this.n,(this.impulse-old)/m);

				if(!this.point1.fix){
					Vec3.add(this.point1.v,this.point1.v,impulse);
				}
				if(!this.point2.fix){
					Vec3.sub(this.point2.v,this.point2.v,impulse);
				}
			}
			return ret;
		})();
		var Face = (function(){
			var Face = function(){
				this.points = [null,null,null];
				this.AABB=new AABB();
				this.cloth=null;
			}
			var ret = Face;

			return ret;
		})();

		var Cloth=function(v,e,f){
			RigidBody.apply(this);
			this.type=CLOTH;
			this.bold=0.015;
			this.points=[]; //頂点位置
			this.edges= []; //エッジ
			this.faces = []; //面

			this.structual_stiffness= 0;//構造
			this.bending_stiffness = 0; //まげ
			this.spring_damping = 5;//ばね抵抗
			this.air_damping = 0;//空気抵抗
			this.vel_damping = 0;//速度抵抗

			this.restitution=0;//反発係数
			this.friction=0.1;


			for(var i=0;i<v;i++){
				this.points.push(new Point());
			}
			for(var i=0;i<e;i++){
				this.edges.push(new Edge());
			}
			for(var i=0;i<f;i++){
				this.faces.push(new Face());
				this.faces[i].cloth=this;
			}
			
			this.AABB= new AABB();
		}
		var ret = Cloth;
		inherits(ret,RigidBody);

		var PhyFace = ret.PhyFace = (function(){
			var PhyFace = function(){
				PhyObj.call(this);
				this.face=null;
				this.ratio=new Vec3();
				this.type = FACE;
			}
			var ret = PhyFace;
			inherits(ret,PhyObj);

			ret.prototype.calcVelocity = function(dv){
				Vec3.mul(dv,this.face.points[0].v,this.ratio[0]);
				Vec3.muladd(dv,dv,this.face.points[1].v,this.ratio[1]);
				Vec3.muladd(dv,dv,this.face.points[2].v,this.ratio[2]);
			}

			ret.prototype.addImpulse = function(pos,impulse){
				for(var i=0;i<DIMENSION;i++){
					if(!this.face.points[i].fix){
						Vec3.muladd(this.face.points[i].v
							,this.face.points[i].v,impulse,this.ratio[i]*this.face.cloth.inv_mass);
					}
				}
			}
			ret.prototype.calcEfficM= function(m){
				var r = 0;
				for(var i=0;i<DIMENSION;i++){
					if(!this.face.points[i].fix){
						r += this.ratio[i]*this.ratio[i];
					}
				}
				r*=this.face.cloth.inv_mass;
				m[0]=m[4]=m[8]=r;
				m[1]=m[2]=m[3]=m[5]=m[6]=m[7]=0;
			}

			ret.prototype.getFriction=function(){
				return this.face.cloth.friction;
			}
			ret.prototype.getRestitution=function(){
				return this.face.cloth.restitution;
			}
			ret.prototype.getInvInertiaTensor=function(){
				return Mat33.ZERO;
			}
			ret.prototype.getExPos=function(a,b){
				Vec3.copy(a,this.ratio);
			}

			return ret;
		})();

		var disablePhyFace=ret.disablePhyFace=[];
		for(var i=0;i<1024;i++){
			disablePhyFace.push(new PhyFace());
		}

		ret.prototype.calcPre=function(onophy){
			//AABB計算
			Vec3.copy(this.AABB.min,this.points[0].location);
			Vec3.copy(this.AABB.max,this.points[0].location);
			for(var i=0;i<this.faces.length;i++){
				//ポリゴン毎のAABB計算
				var face = this.faces[i];
				AABB.createFromPolygon(face.AABB
					,face.points[0].location
					,face.points[1].location
					,face.points[2].location);

				for(var j=0;j<DIMENSION;j++){
					this.AABB.min[j]=MIN(this.AABB.min[j],face.AABB.min[j]);
					this.AABB.max[j]=MAX(this.AABB.max[j],face.AABB.max[j]);
				}
			}

			//剛体との衝突判定
			var list = onophy.collider.AABBSorts[0];
			var triangle = new Collider.Triangle();
			triangle.bold=this.bold;
			var ans1=new Vec3();
			var ans2=new Vec3();
			var impulse=new Vec3();
			this.inv_mass = 1/(this.mass/this.points.length);
			var v1=new Vec3();
			var v2=new Vec3();
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
					triangle.v[0]=face.points[0].location;
					triangle.v[1]=face.points[1].location;
					triangle.v[2]=face.points[2].location;
					triangle.AABB = face.AABB;

					var l = Collider.calcClosest(ans1,ans2,list[i],triangle);
					if(l<0){
						var phyFace = disablePhyFace.pop();
						phyFace.face=face;

						var obj2=phyFace;
						//ポリゴン接点から各頂点の影響比率を求める
						Vec3.sub(v1,obj2.face.points[1].location,obj2.face.points[0].location);
						Vec3.sub(v2,obj2.face.points[2].location,obj2.face.points[0].location);
						Vec3.cross(v1,v1,v2);
						var p=[obj2.face.points[0].location
							,obj2.face.points[1].location
							,obj2.face.points[2].location
							,obj2.face.points[0].location
							,obj2.face.points[1].location];
						for(var k=0;k<DIMENSION;k++){
							Vec3.sub(v2,p[k+2],p[k+1]);
							Vec3.cross(v2,v1,v2);
							var a=Vec3.dot(v2,p[k+1]);
							var b=Vec3.dot(v2,p[k]);
							var c=Vec3.dot(v2,ans2);

							obj2.ratio[k]=(a-c)/(a-b);
						}
						onophy.registHitInfo(list[i].parent,ans1,phyFace,ans2);
					}
				}
			}

			var mass = (this.mass/this.points.length);
			for(var i=0;i<this.edges.length;i++){
				//エッジ拘束
				this.edges[i].calcPre(mass);
			}
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
	

	var bV0 = new Vec3()
	,bV1 = new Vec3()
	,bV2 = new Vec3()
	,bV3 = new Vec3()
	,bM = new Mat43()

	ret.prototype.createRigidBody = function(shape,mesh){
		var phyobj=new RigidBody();
		this.rigidBodies.push(phyobj);

		var collision=null;
		if(shape == "SPHERE"){
			collision = this.collider.createCollision(Collider.SPHERE);
		}else if(shape=="BOX"){
			collision = this.collider.createCollision(Collider.CUBOID);
		}else if(shape=="CYLINDER"){
			collision = this.collider.createCollision(Collider.CYLINDER);
		}else if(shape=="CONE"){
			collision = this.collider.createCollision(Collider.CONE);
		}else if(shape=="CAPSULE"){
			collision = this.collider.createCollision(Collider.CAPSULE);
		}else if(shape=="CONVEX_HULL"){
			collision = this.collider.createConvex(mesh);
			phyobj.mesh=mesh;
		}else if(shape=="MESH"){
			collision = this.collider.createMesh(mesh);
			phyobj.mesh=mesh;
		}
		phyobj.collision=collision;
		if(collision){
			collision.parent=phyobj;
		}
		return phyobj;
	}

	ret.prototype.deleteRigidBodyect = function(object){
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
	ret.prototype.createSpringMesh = function(){
		//スプリングメッシュオブジェクト作成
		var obj=new SpringMesh()
		this.springMeshes.push(obj)
		return obj; 
	}
	ret.prototype.deleteSpringMesh = function(obj){
		//スプリングメッシュオブジェクト削除
		var springsMeshes=this.springMeshes;
		for(var i=0;i<springMeshes.length;i++){
			if(springMeshes[i]===obj){
				springMeshes.splice(i,1);
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
		var vec3 = new Vec3();
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

		var dv=new Vec3();
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
			this.registHitInfo(hit.col1.parent,hit.pos1,hit.col2.parent,hit.pos2);
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
		

		//衝突情報の持続判定
		var ans1=new Vec3();
		var ans2=new Vec3();
		var ans4=new Vec3();
		var t=new Vec3();
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
				if(obj2.type===FACE){
					this.hitInfos.splice(i,1);
					Cloth.disablePhyFace.push(hitInfo.obj2);
					disableHitInfos.push(hitInfo);
					i--;
				}
				continue;
			}

			//前回の衝突点の現在位置を求めてめり込み具合を調べる
			var l,l2;
			Mat43.dotMat43Vec3(ans1,obj1.matrix,hitInfo.pos1ex);
			Vec3.sub(t,ans1,hitInfo.axes[0]);
			if(obj2.collision.type==Collider.MESH){
				l=Collider.MESH_LINE2(ans1,t,obj2.collision);
				if(l<-0.03){
					l=999;
				}
			}else{
				l=obj2.collision.ray(ans1,t);
			}
			Vec3.muladd(ans2,ans1,hitInfo.axes[0],-l);

			Mat43.dotMat43Vec3(ans4,obj2.matrix,hitInfo.pos2ex);
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
				Vec3.muladd(ans1,ans2,hitInfo.axes[0],l2);
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
			if ( sum<= 0.000001*impnum) {
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

		for(i = this.springMeshes.length;i--;){
			this.springMeshes[i].update(dt);
		}
		return;
	}

	return ret
})()

