"use strict"
var OnoPhy = (function(){
	var MIN = Math.min;
	var MAX = Math.max;

	var DIMENSION=3; //次元
	var GRAVITY = 9.81; //重力加速度
	var REPETITION_MAX=10; //繰り返しソルバ最大回数
	var DT; //ステップ時間
	var LINDAMP = 0; //平行移動摩擦
	var ANGDAMP = 0; //回転摩擦
	var CFM=0.99; //柔らかい拘束
	var ERP= 0.1*60.0;//めり込み補正値
	
	var OnoPhy = function(){
		this.rigidBodies = []; //剛体
		this.springs= []; //ばね
		this.clothes =[]; //布
		this.joints = []; //ジョイント
		this.repetition=0; //ソルバ繰り返した回数

		this.collider=new Collider(); //コライダ
		this.hitConstraints=[]; //コリジョン接触情報
		this.disableList=new Array(1024); //コリジョン無効リスト
	}
	var ret = OnoPhy;

	var i=0;
	var RIGID = ret.RIGID = i++ //剛体
		,CLOTH =ret.CLOTH = i++ //布およびソフトボディ（バネメッシュ）
		,FACE = ret.FACE = i++ //メッシュのうちの1フェイス
	;

	var PhyObj = (function(){
		//物理オブジェクト
		var PhyObj = function(){
			this.rotV = new Vec3();//回転速度
			this.oldrotV = new Vec3(); //角運動量(古い)
			this.type = 0;
			this.impFlg=false;
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
		//剛体オブジェクト
		var RigidBody = function(){
			PhyObj.call(this);
			//物理オブジェクト
			this.name; //オブジェクト名称
			this.type = RIGID;
			this.fix=1; //1固定 0挙動計算対象
			this.moveflg=1;
			this.matrix =new Mat43(); //オブジェクトの姿勢等
			this.inv_matrix=new Mat43(); //逆行列

			this.collision=null; //コリジョン
			this.collisionSize = new Vec3(); //コリジョンの大きさ

			this.mass=1.0; //質量
			this.inv_mass = 0; //質量の逆数
			this.COMBase = new Vec3(); //初期姿勢での重心
			this.COM = new Vec3(); //重心
			this.inertiaTensorBase=new Mat33(); //初期姿勢での慣性テンソル
			this.inertiaTensor=new Mat33; //慣性テンソル
			this.inv_inertiaTensor=new Mat33;//慣性テンソルの逆行列
			this.friction=0.2; //摩擦力(動摩擦力)
			this.restitution= 0; //反発係数

			this.location=new Vec3(); //位置
			this.scale=new Vec3(); //スケール
			this.rotq=new Vec4(); //回転状態(クォータニオン)

			this.v = new Vec3(); //速度
			this.oldv = new Vec3(); //計算前の速度
		}
		var ret=RigidBody;
		inherits(ret,PhyObj);


		ret.prototype.calcPre = function(){
			//ステップ前処理
			var rotL = Vec3.poolAlloc();
			var r = Mat33.poolAlloc();

			var m=this.matrix;
			//位置サイズクォータニオンから行列と逆行列をつくる
			Mat43.fromLSR(m,this.location,this.scale,this.rotq);

			//慣性テンソルと角速度から前ステップの角運動量を求める
			Mat33.dotVec3(rotL,this.inertiaTensor,this.rotV);
			//現在の傾きと直交慣性モーメントから慣性テンソルを求める
			Vec4.toMat33(r,this.rotq);
			Mat33.dot(this.inertiaTensor,r,this.inertiaTensorBase);
			Mat33.getInv(r,r);
			Mat33.dot(this.inertiaTensor,this.inertiaTensor,r);
			Mat33.getInv(this.inv_inertiaTensor,this.inertiaTensor);
			//前ステップの角運動量から角速度を求める
			Mat33.dotVec3(this.rotV,this.inv_inertiaTensor,rotL);


			//重心位置
			Vec4.rotVec3(this.COM,this.rotq,this.COMBase);
			Vec3.add(this.COM,this.COM,this.location);

			this.refreshCollision();

			Vec3.poolFree(1);
			Mat33.poolFree(1);
		}

		ret.prototype.refreshInertia = function(){
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
				var a =MAX(sx,sz);
				var l = sy*2;
				var xz=(a*a/4.0 + l*l/12.0);
				this.inertiaTensorBase[0]=xz;
				this.inertiaTensorBase[4]=1/2*a*a;
				this.inertiaTensorBase[8]=xz;
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
				Vec3.set(PS,0,0,0);
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
				if(S!==0){
					S = 1/S;
				}
				Vec3.mul(this.COMBase,PS,S); //重心
				Mat33.mul(this.inertiaTensorBase,this.inertiaTensorBase,S);//重心周りの慣性テンソル
				calcTranslateInertia(I,this.COMBase); //重心ズレ分の慣性テンソル
				Mat33.madd(this.inertiaTensorBase,this.inertiaTensorBase,I,-1); //中心周りの慣性テンソル
				
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
		ret.prototype.refreshCollision= function(){
			//コリジョンの状態を更新
			//
			var m=this.matrix;
			var collision=this.collision;
			if(!collision)return;
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
				bold = Math.max(sx,sz);
				sy=Math.max(this.collisionSize[1]*this.scale[1]-bold,0)
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

			if(collision.type !== Collider.MESH || !collision.aabbTreeRoot){
				collision.refresh();
			}
		}

		ret.prototype.update=function(dt){
			//状態更新
			if(this.fix){
				//固定オブジェクトは何もしない
				return;
			}

			var rq= Vec4.poolAlloc();
			var bV0=Vec3.poolAlloc();

			Vec3.mul(this.rotV,this.rotV,ANGDAMP);//回転摩擦
			var l=Vec3.scalar(this.rotV);
			if(l>0){
				//角速度がある場合回転処理を行う
				
				//角速度ベクトルから今回回転分のクォータニオンを求める
				var d=1/l;
				Vec4.fromRotVector(rq,l*dt,this.rotV[0]*d,this.rotV[1]*d,this.rotV[2]*d);
				Vec4.qdot(this.rotq,rq,this.rotq);//姿勢のクォータニオンにかける
				
				//オブジェクト中心と重心のズレ補正
				Vec3.sub(bV0,this.COM,this.location);
				Vec4.rotVec3(bV0,rq,bV0);
				Vec3.sub(bV0,this.COM,bV0);
				Vec3.sub(bV0,bV0,this.location);
				Vec3.add(this.location,this.location,bV0);
			}

			Vec3.mul(this.v,this.v,LINDAMP);//平行移動摩擦
			Vec3.madd(this.location,this.location,this.v,dt);//移動量を足す


			this.impFlg=0;

			Vec4.poolFree(1);
			Vec3.poolFree(1);

			//this.calcPre();
		}

		ret.prototype.calcEfficM= function(m,r1){
			//点r1に力を加えたとき点がどれだけ加速するかを計算するための行列を求める
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

			//回転
			var addimpulseBuf = Vec3.poolAlloc();
			Vec3.sub(addimpulseBuf,pos,this.COM);//重心からの差
			Vec3.cross(addimpulseBuf,addimpulseBuf,impulse); //角運動量
			Mat33.dotVec3(addimpulseBuf,this.inv_inertiaTensor,addimpulseBuf);//角加速度
			Vec3.add(this.rotV,this.rotV,addimpulseBuf); //角速度に加える

			Vec3.poolFree(1);
		}
		
		ret.prototype.addImpulse2 = function(pos,impulse){
			//衝撃を与える
			if(this.fix){
				//固定の場合は無視
				return;
			}
			var v1= Vec3.poolAlloc();
			var v2= Vec3.poolAlloc();
			var dpos= Vec3.poolAlloc();
			var l1,l2;

			Vec3.mul(v1,impulse, this.inv_mass);//並行
			l1 = Vec3.scalar(v1);

			//回転
			Vec3.sub(dpos,pos,this.COM);//重心からの差
			Vec3.cross(v2,dpos,impulse); //角運動量
			Mat33.dotVec3(v2,this.inv_inertiaTensor,v2);//角加速度
			Vec3.cross(dpos,dpos,v2);
			l2 = Vec3.scalar(dpos);


			if(l1+l2){
				var l=1/(l1+l2);
				l1*=l;
				l2*=l;
				Vec3.madd(this.v,this.v,v1,l1);//並行
				Vec3.madd(this.rotV,this.rotV,v2,l2); //角速度に加える
			}
			

			Vec3.poolFree(3);
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
			//ワールド座標を剛体のローカル座標にする
			Mat43.getInv(this.inv_matrix,this.matrix);
			Mat43.dotVec3(a,this.inv_matrix,b);
		}
		ret.prototype.getFriction= function(){
			//摩擦力を返す
			return this.friction;
		}
		ret.prototype.getRestitution= function(){
			//反発係数を返す
			return this.restitution;
		}
		ret.prototype.getInvInertiaTensor = function(){
			//逆慣性テンソルを返す
			return this.inv_inertiaTensor;
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
			//頂点a,b,c,0で構成される単位重量(1グラム)の
			//四面体の慣性テンソルを求める
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
	
	ret.RigidBody = RigidBody;

	var Constraint=(function(){
		//拘束クラス
		var Constraint=function(){
			this.obj1 = null; //接触物体1
			this.obj2 = null; //接触物体2
			this.pos1= new Vec3(); //接触位置1
			this.pos2 = new Vec3(); //接触位置2

			this.impulse=new Vec3(); //衝撃
			this.axisM = new Mat33();
			this.axis = []; //接触法線と従法線
			this.axis[0]=new Float32Array(this.axisM.buffer,0,3);
			this.axis[1]=new Float32Array(this.axisM.buffer,4*3,3);
			this.axis[2]=new Float32Array(this.axisM.buffer,4*6,3);

			this.coeffM=new Mat33(); // impulse = coeffM x a

			this.offset=new Vec3(); //めり込み位置補正用
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
			//二点に直線の力を加える
			var mem = Vec3.poolAlloc();
			this.obj1.addImpulse(this.pos1,impulse);
			Vec3.mul(mem,impulse,-1);
			this.obj2.addImpulse(this.pos2,mem);
			Vec3.poolFree(1);
		}
		ret.prototype.addImpulse2 = function(impulse){
			//二点に直線の力を加える
			var mem = Vec3.poolAlloc();
			this.obj1.addImpulse2(this.pos1,impulse);
			Vec3.mul(mem,impulse,-1);
			this.obj2.addImpulse2(this.pos2,mem);
			Vec3.poolFree(1);
		}
		ret.prototype.addImpulseR = function(impulse){
			//二点に回転の力を加える
			var mem = Vec3.poolAlloc();
			this.obj1.addImpulseR(impulse);
			Vec3.mul(mem,impulse,-1);
			this.obj2.addImpulseR(mem);
			Vec3.poolFree(1);
		}

		var calcEffic = ret.calcEffic =function(v,m,X){
			// 制限1軸の場合の係数行列を求める
			// F=(vX/((MX)X)X
			Mat33.dotVec3(v,m,X);
			Vec3.mul(v,X,1/Vec3.dot(v,X));
		}
			
		var calcEffic2 = ret.calcEffic2 =function(v1,v2,m,X,Y){
			// 制限2軸の場合の係数行列を求める
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
			// 制限3軸の場合の係数行列を求める
			//F = M^-1 v
			Mat33.getInv(m,m);
			Mat33.calcTranspose(m,m);
			Mat33.dotVec3(v1,m,X);
			Mat33.dotVec3(v2,m,Y);
			Mat33.dotVec3(v3,m,Z);
		}
		ret.prototype.calcEfficM= function(m){
			//接触点に力を加えたときどれだけ加速するかを計算するための行列を求める
			var mat1 = Mat33.poolAlloc();
			this.obj1.calcEfficM(mat1,this.pos1);
			this.obj2.calcEfficM(m,this.pos2);
			Mat33.add(m,m,mat1);
			Mat33.poolFree(1);
		}

		return ret;
	})();

	var HitConstraint = (function(){
		//物体の接触拘束
		var HitConstraint = function() {
			Constraint.apply(this);

			this.pos1ex = new Vec3(); //接触相対位置1
			this.pos2ex = new Vec3(); //接触相対位置2

			this.impulseR=new Vec3(); //回転摩擦関係
			this.rM=new Mat33();

			this.fricCoe = 0; //2物体間の摩擦係数
		}
		var ret = HitConstraint;
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
			//Vec3.sub(this.axis[0],this.pos2,this.pos1);
			Vec3.norm(this.axis[0]);
			this.axis[1][0] = this.axis[0][2];
			this.axis[1][1] = this.axis[0][0];
			this.axis[1][2] = -this.axis[0][1];
			this.axis[2][0] = -this.axis[0][1];
			this.axis[2][1] = this.axis[0][2];
			this.axis[2][2] = this.axis[0][0];
			//for(var i=0;i<3;i++){
			//	for(var j=0;j<3;j++){
			//		this.axisM[i*3+j]=this.axis[i][j];
			//	}
			//}


			Mat33.add(this.rM,obj1.getInvInertiaTensor(),obj2.getInvInertiaTensor());
			Mat33.getInv(this.rM,this.rM);

			//位置補正
			Vec3.sub(this.offset,this.pos2,this.pos1);
			Vec3.nrm(dv,this.offset);
			Vec3.madd(this.offset,this.offset,dv,-0.005); //少しだけめりこみを残す
			Vec3.mul(this.offset,this.offset,ERP); //めり込み補正係数
			
			//2物体間の摩擦係数
			this.fricCoe = obj1.getFriction() * obj2.getFriction(); 

			//反発力
			this.calcDiffVelocity(dv);//速度差
			Vec3.madd(this.offset,this.offset,this.axis[0]
				, Vec3.dot(dv, this.axis[0])
				*(obj1.getRestitution() * obj2.getRestitution()));//反発分

			//加速に必要な力を求めるための行列
			this.calcEfficM(nM);
			//垂直方向
			var coeff = Vec3.poolAlloc();
			var coeff2 = Vec3.poolAlloc();
			Constraint.calcEffic(coeff,nM,this.axis[0]);
			for(var i=0;i<3;i++){
				this.coeffM[i*3] =coeff[i];
			}
			//水平方向
			Constraint.calcEffic2(coeff,coeff2,nM,this.axis[1],this.axis[2]);
			for(var i=0;i<3;i++){
				this.coeffM[i*3+1] =coeff[i];
				this.coeffM[i*3+2] =coeff2[i];
			}
			Vec3.poolFree(2);

			//次のフレームでの持続判定に使うための相対位置
			obj1.getExPos(this.pos1ex,this.pos1);
			obj2.getExPos(this.pos2ex,this.pos2);

			this.counter++;

			Vec3.poolFree(1);
			Mat33.poolFree(1);
		}
		ret.prototype.calcConstraintPre=function(){
			//前処理
			this.calcPre();

			var impulse = Vec3.poolAlloc();
			Vec3.set(impulse,0,0,0);
			Mat33.dotVec3(impulse,this.axisM,this.impulse);
			this.addImpulse(impulse);
			this.addImpulseR(this.impulseR);

			Vec3.poolFree(1);
		}

		ret.prototype.calcConstraint=function(){
			var dv = Vec3.poolAlloc();
			var impulse = Vec3.poolAlloc();
			//法線方向
			var o = this.impulse[0]; //前の値
			var old2 = this.impulse[1]; //前の値
			var old3 = this.impulse[2]; //前の値
			this.calcDiffVelocity(dv); //衝突点の速度差
			Vec3.add(dv,dv,this.offset);//位置補正分
			Mat33.dotVec3(impulse,this.coeffM,dv);
			Vec3.add(this.impulse,this.impulse,impulse);

			this.impulse[0]= MAX(this.impulse[0],0); //撃力が逆になった場合は無しにする
			this.impulse[0]*=CFM; //やわらか拘束補正
			Vec3.mul(impulse, this.axis[0], this.impulse[0]-o); 
			this.addImpulse(impulse); //撃力差分を剛体の速度に反映

			//従法線方向(摩擦力)

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
			Vec3.mul(impulse,this.axis[1],this.impulse[1]-old2);
			Vec3.madd(impulse,impulse,this.axis[2],this.impulse[2]-old3);
			this.addImpulse(impulse); //差分摩擦力を速度に反映

			//転がり抵抗
			var old = Vec3.poolAlloc();
			Vec3.copy(old,this.impulseR);
			Vec3.sub(dv,this.obj2.rotV,this.obj1.rotV);
			Vec3.madd(dv,dv,this.axis[0],-Vec3.dot(dv,this.axis[0])); //摩擦方向の力
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

	var disableHitConstraints=[];
	for(var i=0;i<1024;i++){
		disableHitConstraints.push(new HitConstraint());
	}

	var LinConstraint = (function(){
		//並進速度拘束
		var LinConstraint = function() {
			Constraint.apply(this);

			this.lim=new Array(3);
			this.motorMax=0; //モーター最大力
			this.bane=new Vec3();
		}
		var ret = LinConstraint ;
		inherits(ret,Constraint);

		ret.prototype.calcPre=function(){
			var m=Mat33.poolAlloc();
			this.calcEfficM(m);

			this.calcCoeffM(m);
			
			Mat33.poolFree(1);
			return;
		};

		ret.prototype.calcConstraintPre=function(){
			this.calcPre();

			//ウォームスタート
			var impulse = Vec3.poolAlloc();
			Mat33.dotVec3(impulse,this.axisM,this.impulse);
			this.addImpulse(impulse);
			Vec3.poolFree(1);

		}

		ret.prototype.calcConstraint=function(){
			var old = Vec3.poolAlloc();
			var impulse = Vec3.poolAlloc();

			Vec3.copy(old,this.impulse); //現在の拘束力保存
			this.calcDiffVelocity(impulse); //速度差
			Vec3.add(impulse,impulse,this.offset); //位置差(めり込み)補正分追加
			Mat33.dotVec3(impulse,this.coeffM,impulse);//速度差位置差0にするための力算出
			Vec3.add(this.impulse,this.impulse,impulse);//合計の力に加える
			Vec3.mul(this.impulse,this.impulse,CFM);//やわらか拘束補正

			for(var i=0;i<DIMENSION;i++){
				//与える力の制限
				if(this.motorMax!==0 && i===0){
					//モーター最大力積を超えないようにする
					this.impulse[i]= MAX(this.impulse[i],this.motorMax);
				}else{
					//片方のみ制限の場合は逆方向の力は加えない
					if(!this.lim[i]){
						this.impulse[i]= MAX(this.impulse[i],0); 
					}
				}
			}
			Vec3.sub(impulse,this.impulse,old); //前回との力の差
			Mat33.dotVec3(impulse,this.axisM,impulse); //力を向きをワールド座標に変換
			this.addImpulse(impulse); //オブジェクトに力を加える

			Vec3.poolFree(2);
		}

		var fv=[];
		for(var i=0;i<3;i++){
			fv.push(new Vec3());
		}
		var a=new Array(3);
		var b=new Array(3);
		ret.prototype.calcCoeffM=function(m){
			var idx=0;
			for(var i=0;i<DIMENSION;i++){
				if( Vec3.scalar(this.axis[i])){
					a[idx]=this.axis[i];
					b[idx]=fv[i];
					idx++;
				}else{
					fv[i].fill(0);
				}
			}

			if(idx==1){
				Constraint.calcEffic(b[0],m,a[0]);
			}else if(idx==2){
				Constraint.calcEffic2(b[0],b[1],m,a[0],a[1]);
			}else if(idx==3){
				Constraint.calcEffic3(b[0],b[1],b[2],m,a[0],a[1],a[2]);
			}

			for(var i=0;i<DIMENSION;i++){
				this.coeffM[i]=fv[i][0];
				this.coeffM[i+3]=fv[i][1];
				this.coeffM[i+6]=fv[i][2];
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
			Mat33.add(m,this.obj1.inv_inertiaTensor,this.obj2.inv_inertiaTensor);

			this.calcCoeffM(m);
			return;
		};

		ret.prototype.calcConstraintPre=function(){
			this.calcPre();

			var impulse = Vec3.poolAlloc();
			Mat33.dotVec3(impulse,this.axisM,this.impulse);
			this.addImpulseR(impulse);
			Vec3.poolFree(1);
		}
		ret.prototype.calcConstraint=function(){
			var old = Vec3.poolAlloc();
			var imp= Vec3.poolAlloc();
			Vec3.copy(old,this.impulse);
			Vec3.sub(imp,this.obj2.rotV,this.obj1.rotV); //回転速度差
			Vec3.add(imp,imp,this.offset); //補正
			Mat33.dotVec3(imp,this.coeffM,imp);
			Vec3.add(this.impulse,this.impulse,imp);
			Vec3.mul(this.impulse,this.impulse,CFM);

			for(var i=0;i<DIMENSION;i++){
				//与える力の制限
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
					if(a< 0){
						this.impulse[i]=0;
					}
				}
				
			}
			Vec3.sub(imp,this.impulse,old);
			Mat33.dotVec3(imp,this.axisM,imp);
			this.addImpulseR(imp);
			
			Vec3.poolFree(2);
		}
		return ret;
	})();

	var Joint = (function(){
		var Joint = function(){
			this.use_breaking=0;
			this.breaking_threshold=0.0; //これ以上力が加わるとジョイントがなくなる(未実装)
			this.disable_collisions=false; //ジョイントされたオブジェクト同士の衝突可否
			this.enabled= false; //有効無効
			this.object1=null; //被ジョイントオブジェクト
			this.object2=null;
			this.matrix = new Mat43(); //ジョイントとオブジェクトとのオフセット行列
			this.matrix2 = new Mat43();

			//位置制限
			this.use_limit_lin=new Vec3();
			this.limit_lin_lower=new Vec3(); 
			this.limit_lin_upper=new Vec3();
			this.use_spring=new Vec3();
			this.spring_damping=new Vec3(); //バネダンパ
			this.spring_stiffness=new Vec3(); //バネ力
			this.use_motor_lin=0;
			this.motor_lin_max_impulse=1; //直線モーター力上限
			this.motor_lin_target_velocity=1; //モーター速度
			//角度制限
			this.use_limit_ang=new Vec3();
			this.limit_ang_lower=new Vec3(); //角度制限
			this.limit_ang_upper=new Vec3();
			this.use_spring_ang=new Vec3();
			this.spring_damping_ang=new Vec3();　//角度バネダンパ
			this.spring_stiffness_ang=new Vec3();　
			this.use_motor_ang=0;
			this.motor_ang_max_impulse=1; //角度モーター力上限
			this.motor_ang_target_velocity=1; //モーター角速度

			//拘束オブジェクト
			this.linConstraint = new LinConstraint();
			this.angConstraint = new AngConstraint();
		}
		var ret = Joint;

		ret.prototype.setConstraint=function(){

			var vec= Vec3.poolAlloc();
			var dp = Vec3.poolAlloc();
			var dv = Vec3.poolAlloc();
			var trueq= Vec4.poolAlloc();
			var quat = Vec4.poolAlloc();
			var rotmat= Mat33.poolAlloc();
			var bM = Mat43.poolAlloc();
			var bM2 = Mat43.poolAlloc();

			var axis;
			var object1= this.object1;
			var object2= this.object2;

			//ジョイント位置
			Mat43.dot(bM,this.object1.matrix,this.matrix);
			Mat43.dot(bM2,this.object2.matrix,this.matrix2);

			Vec3.set(this.linConstraint.pos1,bM[9],bM[10],bM[11]);
			Vec3.set(this.linConstraint.pos2,bM2[9],bM2[10],bM2[11]);

			//ジョイント角度
			for(var i=0;i<3;i++){
				var j=i*3;
				var l = 1/Math.sqrt(bM[j]*bM[j]+bM[j+1]*bM[j+1]+bM[j+2]*bM[j+2]);
				bM[i*3]=bM[j]*l;
				bM[i*3+1]=bM[j+1]*l;
				bM[i*3+2]=bM[j+2]*l;
				l = 1/Math.sqrt(bM2[j]*bM2[j]+bM2[j+1]*bM2[j+1]+bM2[j+2]*bM2[j+2]);
				bM2[i*3]=bM2[j]*l;
				bM2[i*3+1]=bM2[j+1]*l;
				bM2[i*3+2]=bM2[j+2]*l;
			}
			if(this.parent===this.object1){
				//Mat33.copy(rotmat,bM);
				//Mat33.copy(bM,bM2);
				//Mat33.copy(bM2,rotmat);
			}else{
//				Vec4.toMat33(obj1m,bM2);
//				Mat33.copy(obj2m,bM);
			}

			this.linConstraint.obj1=object1;
			this.linConstraint.obj2=object2;
			this.angConstraint.obj1=object1;
			this.angConstraint.obj2=object2;

			//差
			Vec3.sub(dp,this.linConstraint.pos2,this.linConstraint.pos1); //位置差
			this.linConstraint.calcDiffVelocity(dv);//速度差

			//位置制限
			Vec3.set(this.linConstraint.offset,0,0,0);
			for(var i=0;i<DIMENSION;i++){
				//軸
				axis = this.linConstraint.axis[i];
				Vec3.set(axis,bM[i*3]
					,bM[i*3+1]
					,bM[i*3+2]);
				//ばね
				if(this.use_spring[i]){
					Vec3.mul(vec,axis,DT*Vec3.dot(axis,dp)*this.spring_stiffness[i]);
					Vec3.madd(vec,vec,axis,DT*Vec3.dot(axis,dv)*this.spring_damping[i]);
					this.linConstraint.addImpulse2(vec);
				}

				if(this.use_limit_lin[i]){
					//位置差
					var l = Vec3.dot(axis,dp);
					//制限範囲を超えている場合
					if(l< this.limit_lin_lower[i]){
						l= this.limit_lin_lower[i] - l;
						Vec3.mul(axis,axis,-1);
					}else if(l> this.limit_lin_upper[i]){
						l= l - this.limit_lin_upper[i];
					}else{
						Vec3.mul(axis,axis,0);
					}
					if(this.limit_lin_lower[i]==this.limit_lin_upper[i]){
						//両制限の場合フラグを立てる
						this.linConstraint.lim[i]=1;
					}else{
						this.linConstraint.lim[i]=0;
					}
					Vec3.madd(this.linConstraint.offset
						,this.linConstraint.offset,axis,l);//本来の位置
				}else{
					Vec3.mul(axis,axis,0);
				}
				if(this.use_motor_lin && i===0){
					this.linConstraint.motorMax=this.motor_lin_max_impulse;
				}
			}

			Vec3.mul(this.linConstraint.offset,this.linConstraint.offset,ERP);
			if(this.use_motor_lin){
				Vec3.madd(this.linConstraint.offset,
					this.linConstraint.offset
					,this.linConstraint.axis[0],this.motor_lin_target_velocity); //モータ影響
			}


			//角度制限
			Mat33.getInv(rotmat,bM);
			Mat33.dot(rotmat,rotmat,bM2); //差分回転行列
			Mat33.getEuler(dp,rotmat); //オイラー角に変換

			Vec3.sub(dv,this.object2.rotV,this.object1.rotV);//回転速度差
			Vec4.set(trueq,1,0,0,0);
			Vec3.set(this.angConstraint.bane,0,0,0);
			for(var ii=0;ii<DIMENSION;ii++){
				var i=ii;
				//if(ii==1)i=2;
				//if(ii==2)i=1;

				axis = this.angConstraint.axis[i];
				//軸の向き
				if(i===0){
					Vec3.set(axis,bM2[0],bM2[1],bM2[2]);
				}else if(i===2){
					Vec3.set(axis,bM[3],bM[4],bM[5]);
					Vec3.set(vec,bM2[0],bM2[1],bM2[2]);
					Vec3.cross(axis,vec,axis);
				}else if(i===1){
					Vec3.set(axis,bM[3],bM[4],bM[5]);
					//Vec3.set(vec,bM2[0],bM2[1],bM2[2]);
					//Vec3.cross(axis,vec,axis);
					//Vec3.cross(axis,axis,vec);
				}
				Vec3.norm(axis);
				//Vec3.mul(axis,axis,-1);

				//角度
				var d = dp[i];
				if(this.use_spring_ang[i]){
					//ばね
					var vv=this.angConstraint.bane;
					Vec3.madd(vv,vv,axis,d*this.spring_stiffness_ang[i]*DT);//角度差
					Vec3.madd(vv,vv,axis,Vec3.dot(dv,axis)*this.spring_damping_ang[i]*DT);
					//this.angConstraint.addImpulseR(vec);
				}

				if(this.use_limit_ang[i]){
					//制限範囲を超えている場合
					if(d< this.limit_ang_lower[i]){
						d=  this.limit_ang_lower[i] - d ;
						Vec3.mul(axis,axis,-1);
					}else if(d > this.limit_ang_upper[i]){
						d= d - this.limit_ang_upper[i];
					}else{
						Vec3.mul(axis,axis,0);
					}
					Vec4.fromRotVector(quat,d,axis[0],axis[1],axis[2]);
					Vec4.qdot(trueq,trueq,quat);
				}else{
					Vec3.mul(axis,axis,0);
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
				,this.angConstraint.axis[0],this.motor_ang_target_velocity); //モータ影響
			}

			if(!object1.fix){
				object1.impFlg=true;
			}
			if(!object2.fix){
				object2.impFlg=true;
			}

			Vec3.poolFree(3);
			Vec4.poolFree(2);
			Mat33.poolFree(1);
			Mat43.poolFree(2);
		}
		ret.prototype.calcConstraintPre=function(){
			this.linConstraint.calcConstraintPre();
			this.angConstraint.calcConstraintPre();
		}
		ret.prototype.calcConstraint=function(){
			this.linConstraint.calcConstraint();
			this.angConstraint.calcConstraint();
		}
		ret.prototype.bane=function(){

			this.angConstraint.addImpulseR(this.angConstraint.bane);
		}
		return ret;
	})();
	ret.Joint = Joint;

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
			Vec3.mul(n,n,(damp+spr)*DT);

			if(this.con1){
				//Vec3.sub(dp,this.p0,this.con1.location);
				this.con1.addImpulse2(this.p0,n);
			}
			if(this.con2){
				//Vec3.sub(dp,this.p1,this.con2.location);
				Vec3.mul(n,n,-1);
				this.con2.addImpulse2(this.p1,n);
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
			
			this.aabb= new AABB();
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
					Vec3.mul(dv,this.n,l*DT*this.cloth.inv_pointMass);

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
				this.aabb=new AABB();
				this.cloth=null;
			}
			var ret = Face;

			return ret;
		})();
		var PhyFace = ret.PhyFace = (function(){
			var PhyFace = function(){
				PhyObj.call(this);
				this.p=new Array(3);//new Vec3();
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
			ret.prototype.addImpulse2 = function(pos,impulse){
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
			ret.prototype.getInvInertiaTensor=function(){
				return Mat33.ZERO;
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

		ret.prototype.rayCast=function(res,p0,p1){
			var faces =this.faces;
			var poses = this.points999;
			var min=9999999;

			for(var i=0;i<faces.length;i++){
				var face = faces[i];

				if(!AABB.hitCheckLine(face.aabb,p0,p1)){
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
			this.aabb.min.set(this.points[0].location);
			this.aabb.max.set(this.points[0].location);
			for(var i=0;i<this.faces.length;i++){
				//ポリゴン毎のAABB計算
				var face = this.faces[i];
				if(face.idxnum===4){
					AABB.createFromPolygon(face.aabb
						,face.points[0].location
						,face.points[1].location
						,face.points[2].location
						,face.points[3].location);
				}else{
					AABB.createFromPolygon(face.aabb
						,face.points[0].location
						,face.points[1].location
						,face.points[2].location);
				}
				for(var j=0;j<DIMENSION;j++){
					face.aabb.min[j]-=this.bold;
					face.aabb.max[j]+=this.bold;
				}

				for(var j=0;j<DIMENSION;j++){
					this.aabb.min[j]=MIN(this.aabb.min[j],face.aabb.min[j]);
					this.aabb.max[j]=MAX(this.aabb.max[j],face.aabb.max[j]);
				}
			}
			this.facesSort.sort(function(a,b){return a.aabb.min[0]-b.aabb.min[0]});

			//剛体との衝突判定
			var list = onophy.collider.aabbSorts[0];
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
				if(list[i].aabb.min[0]>this.aabb.max[0]){
					break;
				}
				if(!AABB.hitCheck(list[i].aabb,this.aabb)){
					continue;
				}

				for(var j=0;j<this.faces.length;j++){
					var face = this.faces[j];

					if(!AABB.hitCheck(face.aabb,list[i].aabb)){
						continue;
					}
					for(var k=0;k<face.idxnum-2;k++){
						Vec3.copy(triangle.poses[0],face.points[0].location);
						Vec3.copy(triangle.poses[1],face.points[1].location);
						Vec3.copy(triangle.poses[2],face.points[2].location);
						triangle.aabb = face.aabb;

						var l = Collider.calcClosest(ans1,ans2,list[i],triangle);
						if(l<0){
							var phyFace = this.getPhyFace(face.points[0],face.points[1+k],face.points[2+k],face,ans2); //衝突計算用の板ポリ
							onophy.registHitConstraint(list[i].parent,ans1,phyFace,ans2);
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

			if(!AABB.hitCheck(target.aabb,this.aabb)){
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
				//if(!AABB.hitCheck(face.aabb,target.aabb)){
				//	continue;
				//}
				triangle.aabb = face.aabb;
				for(var j=ii;j<target.facesSort.length;j++){
					var face2= target.facesSort[j]
					if(face.aabb.min[0]>face2.aabb.max[0]){
						ii=j;
						continue;
					}	
					if(face.aabb.max[0]<face2.aabb.min[0]){
						break;
					}	
					if(!AABB.hitCheck(face.aabb,face2.aabb)){
						continue;
					}
					triangle2.aabb = face2.aabb;

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
					onophy.registHitConstraint(phyFace,trueans1,phyFace2,trueans2);
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
			
			this.aabb= new AABB();
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

					Vec3.mul(impulse,impulse,l*this.cloth.inv_pointMass*DT);

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
				Vec3.mul(impulse,impulse,DT*this.cloth.inv_pointMass*this.cloth.bending_stiffness*2);
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
	

	ret.prototype.createRigidBody = function(){
		var phyobj=new RigidBody();
		this.rigidBodies.push(phyobj);

		return phyobj;
	}
	ret.prototype.addPhyObj= function(phyObj){
		if(phyObj.type===RIGID){
			this.rigidBodies.push(phyObj);
			this.collider.addCollision(phyObj.collision);
		}else{
			this.clothes.push(phyObj);
		}

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
	ret.prototype.addJoint= function(joint){
		this.joints.push(joint);
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

	ret.prototype.removeHitConstraint=function(i){
		//削除
		var hitConstraint = this.hitConstraints[i];
		this.hitConstraints.splice(i,1);
		if(hitConstraint.obj1.type===FACE){
			Cloth.disablePhyFace.push(hitConstraint.obj1);
		}
		if(hitConstraint.obj2.type===FACE){
			Cloth.disablePhyFace.push(hitConstraint.obj2);
		}
		disableHitConstraints.push(hitConstraint);
	}

	ret.prototype.readjustHitConstraint=function(target){
		var obj1 = target.obj1;
		var obj2 = target.obj2;
		var pos1= target.pos1;
		var pos2= target.pos2;
		var hitConstraint;
		var hitConstraints = this.hitConstraints;

		//座標が近いやつはまとめる
		for(var i=hitConstraints.length;i--;){
			hitConstraint=hitConstraints[i];

			if(Vec3.len2(hitConstraint.pos1,pos1)<0.01
			&& Vec3.len2(hitConstraint.pos2,pos2)<0.01){

				if(hitConstraint === target){
					continue;
				}
				//力をまとめる
				Vec3.add(target.impulse,target.impulse,hitConstraint.impulse);
				Vec3.add(target.impulseR,target.impulseR,hitConstraint.impulseR);

				//削除
				this.removeHitConstraint(i);
			}
		}

		if(!(obj1.type === RIGID &&  obj2.type === RIGID)){
			return;
		}

		//同一の組み合わせが一定以上の場合は古いやつから消して一定数以下にする
		var count=0;
		var max=8;
		for(var i=hitConstraints.length;i--;){
			hitConstraint=hitConstraints[i];

			if(hitConstraint.obj1!== obj1|| hitConstraint.obj2!==obj2){
				continue;
			}

			if(Vec3.dot(hitConstraint.axis[0],target.axis[0])<0){
				//めり込み方向が反対の場合は削除
				this.removeHitConstraint(i);
				continue;
			}

			count++;
			if(count>max){
				//一定数以上なので削除
				this.removeHitConstraint(i);
			}
		}
	}
	ret.prototype.registHitConstraint = (function(){
		return function(obj1,pos1,obj2,pos2,hitConstraint){

			if(Vec3.len2(pos1,pos2) === 0 ){
				//例外
				return null;
			}

			if(!hitConstraint){
				//新しく取得する場合
				hitConstraint = disableHitConstraints.pop();
				this.hitConstraints.push(hitConstraint);
				hitConstraint.obj1 = obj1;
				hitConstraint.obj2 = obj2;
				Vec3.set(hitConstraint.impulse,0,0,0);
				Vec3.set(hitConstraint.impulseR,0,0,0);

			}

			Vec3.copy(hitConstraint.pos1,pos1);
			Vec3.copy(hitConstraint.pos2,pos2);

			Vec3.sub(hitConstraint.axis[0],pos2,pos1);
			Vec3.norm(hitConstraint.axis[0]);
			
			hitConstraint.counter=0;


			return hitConstraint;

		};
	})();


	/** dt秒シミュレーションを進める **/
	ret.prototype.calc=function(dt){

		DT=dt; //ステップ時間をグローバルに格納
		var rigidBodies = this.rigidBodies ; //剛体配列

		var dv=Vec3.poolAlloc();

		for(i = this.rigidBodies.length;i--;){
			//判定用行列更新
			this.rigidBodies[i].calcPre();
		}

		var idx=0;
		for(var i=0;i<this.joints.length;i++){
			//コリジョン無効リスト作成
			if(this.joints[i].disable_collisions){
				//ジョイント接続されたもの同士の接触無効
				this.disableList[idx]=Collider.getPairId(
					this.joints[i].object1.collision.id
					,this.joints[i].object2.collision.id);
				idx++;

			}
		}
		this.disableList[idx]=-1;

		//すべてのコリジョンの衝突判定
		this.collider.All(this.disableList,idx);
		var hitList = this.collider.hitList;

		for(var i=0;hitList[i].col1;i++){
			//接触拘束作成
			var hit = hitList[i];
			//if(!hit.col1.parent.moveflg && !hit.col2.parent.moveflg){
			//	continue;
			//}
			if(hit.col1.parent && hit.col2.parent){
				var hitConstraint = this.registHitConstraint(hit.col1.parent,hit.pos1,hit.col2.parent,hit.pos2);
				if(hitConstraint){
					this.readjustHitConstraint(hitConstraint);
				}
			}
		}


		for(var i=0;i<this.joints.length;i++){
			//ジョイント拘束セット+ばね
			this.joints[i].setConstraint();
		}

		for(i = this.springs.length;i--;){
			//バネ処理
			this.springs[i].calc();
		}
		for(var i=0;i<this.joints.length;i++){
			//バネ処理
			this.joints[i].bane();
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
		for(var i=0;i<this.hitConstraints.length;i++){
			var hitConstraint = this.hitConstraints[i];

			var obj1=hitConstraint.obj1;
			var obj2=hitConstraint.obj2;
			//if(!obj1.moveflg && !obj2.moveflg){
			//	continue;
			//}
			if(hitConstraint.counter === 0){
				//接触1フレーム目は無視
				continue;
			}

			if(obj1.type !== RIGID || obj2.type !== RIGID){
				if(obj1.type===FACE){
					Cloth.disablePhyFace.push(hitConstraint.obj1);
				}
				if(obj2.type===FACE){
					Cloth.disablePhyFace.push(hitConstraint.obj2);
				}
				this.hitConstraints.splice(i,1);
				disableHitConstraints.push(hitConstraint);
				i--;
				continue;
			}

			//前回の衝突点の現在位置を求めてめり込み具合を調べる
			var l,l2;
			Mat43.dotVec3(ans1,obj1.matrix,hitConstraint.pos1ex);
			Vec3.sub(t,ans1,hitConstraint.axis[0]);
			if(obj2.collision.type==Collider.MESH){
				l=obj2.collision.rayCast(ans1,t);
				if(l<-0.03){
					l=999;
				}
			}else{
				l=obj2.collision.rayCast(ans1,t);
			}
			if(l === Collider.INVALID){
				l = 999;
			}
			Vec3.madd(ans2,ans1,hitConstraint.axis[0],-l);

			Mat43.dotVec3(ans4,obj2.matrix,hitConstraint.pos2ex);
			Vec3.add(t,ans4,hitConstraint.axis[0]);
			if(obj1.collision.type==Collider.MESH){
				l2=obj1.collision.rayCast(ans4,t);
				if(l2<-0.03){
					l2=999;
				}
			}else{
				l2=obj1.collision.rayCast(ans4,t);
			}
			if(l2 === Collider.INVALID){
				l2 = 999;
			}
			
			if(l2<l){
				//めり込みが大きい方を採用
				Vec3.copy(ans2,ans4);
				Vec3.madd(ans1,ans2,hitConstraint.axis[0],l2);
				l=l2;
			}

			if(l>=0){
				//めり込んでいない場合は削除
				this.hitConstraints.splice(i,1);
				disableHitConstraints.push(hitConstraint);
				i--;
			}else{
				//持続処理
				this.registHitConstraint(obj1,ans1,obj2,ans2,hitConstraint);
			}
		}	
		for(i = this.rigidBodies.length;i--;){
			//重力
			var obj = rigidBodies[i];
			if(obj.fix)continue
			obj.v[1]-=GRAVITY*dt;
		}


		//繰り返しソルバ
		performance.mark("impulseStart");
		var repetition;
		var constraints = [];
		//拘束を一つの配列にまとめる
		Array.prototype.push.apply(constraints,this.hitConstraints);
		Array.prototype.push.apply(constraints,this.joints);
		var clothes=this.clothes;
		//Array.prototype.push.apply(constraints,this.clothes);
		

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
		
		for (var i = 0;i<clothes.length; i++) {
			//ウォームスタート処理
			clothes[i].calcConstraintPre();
		}
		for(var j=0;j<4;j++){
			for (var i = 0;i<clothes.length; i++) {
				clothes[i].calcConstraint();
			}
		}

		this.repetition=repetition;
		performance.mark("impulseEnd");

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

