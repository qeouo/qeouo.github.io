"use strict"
var AABB = (function(){
	var AABB = function(){
		this.min=new Vec3();
		this.max=new Vec3();
	}
	var ret = AABB;

	var DIMENSION=3
		,MIN = Math.min
		,MAX = Math.max;

	ret.add=function(a,b,c){
		//2つのAABBを内包するAABBを作成
		for(var i=0;i<DIMENSION;i++){
			if(b.min[i]<c.min[i]){
				a.min[i]=b.min[i];
			}else{
				a.min[i]=c.min[i];
			}
			if(b.max[i]>c.max[i]){
				a.max[i]=b.max[i];
			}else{
				a.max[i]=c.max[i];
			}
		}
	}

	ret.hitCheck = function(a,b){
		//2つのAABBが重なっているか
		for(var i=0; i<DIMENSION; i++){
			if(a.min[i]>b.max[i]
			|| a.max[i]<b.min[i]){
				return false;
			}
		}
		return true;
	}

	ret.hitCheckLine= function(a,p0,p1){
		//AABBと線分p0p1が接触しているか
		var min=-99999;
		var max=99999;
		var t = Vec3.poolAlloc();
		Vec3.sub(t,p1,p0); //線の傾き

		for(var i=0;i<DIMENSION;i++){
			var n = t[i];
			if(n>0){
				var n3 = (a.min[i]-p0[i])/n;
				if(n3 > min){
					min=n3;
				}
				n3 = (a.max[i]-p0[i])/n;
				if(n3 < max){
					max=n3;
				}
			}else if(n<0){
				var n3 = (a.max[i]-p0[i])/n;
				if(n3 > min){
					min=n3;
				}
				n3 = (a.min[i]-p0[i])/n;
				if(n3 < max){
					max=n3;
				}
			}else{
				//平行な場合
				if(a.min[i]>p0[i] ||  a.max[i]<p0[i]){
					Vec3.poolFree(1);
					return false;
				}
			}
		}
		Vec3.poolFree(1);
		return (min<=max);
	}

	ret.createFromPolygon = function(aabb,v1,v2,v3,v4){
		//複数の座標を内包するAABBを求める
		if(v4){
			for(var i=0;i<DIMENSION;i++){
				aabb.min[i]=MIN(MIN(MIN(v1[i],v2[i]),v3[i]),v4[i]);
				aabb.max[i]=MAX(MAX(MAX(v1[i],v2[i]),v3[i]),v4[i]);
			}
		}else{
			for(var i=0;i<DIMENSION;i++){
				aabb.min[i]=(MIN(MIN(v1[i],v2[i]),v3[i]));
				aabb.max[i]=(MAX(MAX(v1[i],v2[i]),v3[i]));
			}
		}
	}

	ret.Node = function(){
		this.child1=null;
		this.child2=null;
		this.element=null;
		this.AABB = new AABB();
	}
	ret.createAABBTree = function(list){
		return _createAABBTree(list,0,list.length-1,0);

	}
	var _createAABBTree = function(list,first,last,axis){
		if(first === last){
			return list[first];
		}
		var node = new AABB.Node();
		Sort.qSort(list,first,last,function(a,b){return a.AABB.min[axis] - b.AABB.min[axis]});
		var center = (last+first)/2|0;
		axis=[1,2,0][axis];
		node.child1=_createAABBTree(list,first,center,axis);
		node.child2=_createAABBTree(list,center+1,last,axis);
		node.element=null;
		AABB.add(node.AABB,node.child1.AABB,node.child2.AABB);

		return node;
	}
	ret.createAABBTree2 = function(list){
		var sortx = [];
		var sorty = [];
		var sortz = [];
		for(var i=0;i<list.length;i++){
		}
		return _createAABBTree(list,0,list.length-1,0);

	}
	var _createAABBTree = function(list,first,last,axis){
		if(first === last){
			return list[first];
		}
		var node = new AABB.Node();
		Sort.qSort(list,first,last,function(a,b){return a.AABB.min[axis] - b.AABB.min[axis]});
		var center = (last+first)/2|0;
		axis=[1,2,0][axis];
		node.child1=_createAABBTree(list,first,center,axis);
		node.child2=_createAABBTree(list,center+1,last,axis);
		node.element=null;
		AABB.add(node.AABB,node.child1.AABB,node.child2.AABB);

		return node;
	}
	
	return ret;
})();
var AABBTree= (function(){
	var AABBTree= function(){
		this.root;
	}
	var ret = AABBTree;
	return ret;
})();
var Collider = (function(){

	var DIMENSION = 3; //次元数
	var MIN=Math.min
		,MAX=Math.max
	;
	var HitListElem=function(){
		//接触情報
		this.pairId=-1; //重なったコリジョン組のID  id1+id2
		this.col1=null; //コリジョン1
		this.col2=null; //コリジョン2
	}
	var HitListElemEx=(function(){
		//接触情報(接触座標つき)
		var HitListElemEx = function(){
			HitListElem.call(this);
			this.pos1=new Vec3(); //コリジョン1の接触点
			this.pos2=new Vec3(); //コリジョン2の接触点
		}
		inherits(HitListElemEx,HitListElem);
		return HitListElemEx;
	})();

	var Collider = function(){
		this.collisions = []; //コリジョンリスト
		this.collisionIndexList=[]; //ID保管リスト
		for(var i=1023;i--;){
			this.collisionIndexList.push(i);
		}
		this.AABBSorts=[]; //AABBソートリスト
		this.AABBHitListAll=[]; //AABB接触リスト
		this.hitList=[]; //接触情報
		this.hitListIndex=0; //接触数
		for(var i=0;i<1024;i++){
			this.AABBHitListAll.push(new HitListElem);
			this.hitList.push(new HitListElemEx);
		}
		for(var i=0;i<DIMENSION;i++){
			this.AABBSorts.push([]);
		}
	}
	var ret=Collider;
	
	var i=0;
	var MESH = ret.MESH = i++
		,CUBOID = ret.CUBOID = i++
		,SPHERE = ret.SPHERE = i++
		,CYLINDER= ret.CYLINDER= i++
		,CAPSULE = ret.CAPSULE = i++
		,CONE= ret.CONE= i++
		,CONVEX_HULL= ret.CONVEX_HULL= i++
		,TRIANGLE = ret.TRIANGLE= i++
	;
	var Collision=(function(){
		var ret = function(){
			this.AABB= new AABB();
			this.bold = 0; //太さ
			this.parent=null;
			this.matrix=new Mat43();
			this.inv_matrix=new Mat43();
			this.groups=1;
			this.notgroups=0;
			this.callbackFunc=null;
			this.parent=null;
			this.name="";
		}
		ret.prototype.calcSupport=function(ret,axis){
			return;
		}
		ret.prototype.calcAABB=function(aabb){
			if(!aabb){
				aabb=this.AABB;
			}
			//AABBを求める
			var axis = Vec3.poolAlloc();
			var ret = Vec3.poolAlloc();

			for(var i=0;i<DIMENSION;i++){
				Vec3.set(axis,0,0,0);
				axis[i]=-1;
				this.calcSupport(ret,axis);
				aabb.max[i]=ret[i]+this.bold;
				axis[i]=1;
				this.calcSupport(ret,axis);
				aabb.min[i]=ret[i]-this.bold;
			}
			Vec3.poolFree(2);
		}
		ret.prototype.update=function(){
			//衝突判定前処理
			Mat43.getInv(this.inv_matrix,this.matrix);
			this.calcAABB();
		};
		ret.prototype.ray=function(p0,p1){
			return 99999;
		}
		return ret;
	})();
	var collisionIndexList;

	ret.prototype.addCollision= function(collision){
		//コリジョン登録
		collision.id=this.collisionIndexList.pop();
		this.collisions.push(collision)
		for(var i=0;i<DIMENSION;i++){
			this.AABBSorts[i].push(collision)
		}
		return;
	}

	ret.prototype.deleteCollision = function(obj){
		var collisions=this.collisions;
		for(var i=0;i<collisions.length;i++){
			if(collisions[i] === obj){
				this.collisionIndexList.push(collisions[i].id);
				collisions.splice(i,1);
				break;
			}
		}
		for(var j=0;j<3;j++){
			var aabbSort = this.AABBSorts[j];
			for(var i=0;i<aabbSort.length;i++){
				if(aabbSort[i] === obj){
					aabbSort.splice(i,1);
					break;
				}
			}
		}
	}

	var Sphere = ret.Sphere = (function(){
		//球
		var Sphere = function(){
			Collision.apply(this);
			this.type=SPHERE;
		};
		var ret = Sphere;
		inherits(ret,Collision);
		ret.prototype.calcSupport=function(ans,v){
			ans[0]=this.matrix[9];
			ans[1]=this.matrix[10];
			ans[2]=this.matrix[11];
		};
		ret.prototype.ray = function(p0,p1) {
			var p = Vec3.poolAlloc();
			Vec3.set(p,this.matrix[9],this.matrix[10],this.matrix[11]);
			var l =Collider.SPHERE_LINE2(p0,p1,p,this.bold);
			Vec3.poolFree(1);
			return l;
		}
		return ret;
	})();

	var Cylinder= ret.Cylinder= (function(){
		//シリンダ
		var Cylinder= function(){
			Collision.apply(this);
			this.type=CYLINDER;
		};
		var ret = Cylinder;
		inherits(ret,Collision);
		ret.prototype.calcSupport=function(ans,v){
			var m = this.matrix;

			var l = v[0]*m[6]+v[1]*m[7]+v[2]*m[8];
			if(l>0){
				ans[2]=-1;
			}else{
				ans[2]=1;
			}
			var x = v[0]*m[0]+v[1]*m[1]+v[2]*m[2];
			var y = v[0]*m[3]+v[1]*m[4]+v[2]*m[5];
			l = Math.sqrt(x*x+y*y);
			if(l!==0){
				l=-1/l;
			}
			ans[0]=x*l;
			ans[1]=y*l;

			Mat43.dotVec3(ans,m,ans);
		};

		ret.prototype.ray= function(p0,p1) {
			//シリンダと直線
			var min=-99999;
			var max=99999;

			var d = Vec3.poolAlloc();
			var p = Vec3.poolAlloc();
			Mat43.dotVec3(p,this.inv_matrix,p0);
			Mat43.dotVec3(d,this.inv_matrix,p1);
			Vec3.sub(d,d,p);


			//円柱縦の向き
			var n = d[2];  //傾き
			var pn = p[2]; //距離
			if(n===0){
				if(pn*pn>1){
					Vec3.poolFree(2);
					return 99999;
				}
			}
			n=1/n;
			if(n>0){
				max = Math.min(max,(1-pn)*n);
				min = Math.max(min,(-1-pn)*n);
			}else{
				max = Math.min(max,(-1-pn)*n);
				min = Math.max(min,(1-pn)*n);
			}

			//円柱の水平方向
			var A = d[0]*d[0] + d[1]*d[1];
			var B = p[0]*d[0] + p[1]*d[1];
			var C = p[0]*p[0] + p[1]*p[1] - 1*1;
			if(A===0){
				if(p[0]*p[0]+p[1]*p[1]>1){
					Vec3.poolFree(2);
					return 9999;
				}
			}else{
				var l = B*B-A*C;
				if(l<0){
					Vec3.poolFree(2);
					return 99999;
				}
				min=Math.max(min,(-B - Math.sqrt(l))/A);
				max=Math.min(max,(-B + Math.sqrt(l))/A);
			}

			if(min>max){
				Vec3.poolFree(2);
				return 99999;
			}
			Vec3.poolFree(2);
			return min;
		}
		return ret;
	})();

	var Cone= ret.Cone= (function(){
		//円錐
		var Cone= function(){
			Collision.apply(this);
			this.type=CONE;
		};
		var ret = Cone;
		inherits(ret,Collision);
		ret.prototype.calcSupport=function(ans,v){
			Mat43.dotMat33Vec3(ans,this.inv_matrix,v);
			Vec3.norm(ans);
			if(ans[2]<-(1/Math.sqrt(5))){
				Vec3.set(ans,0,0,1);
			}else{
				ans[2]=0;
				Vec3.nrm(ans,ans);
				ans[2]=1;
				Vec3.mul(ans,ans,-1);
			}
			Mat43.dotVec3(ans,this.matrix,ans);
		};

		ret.prototype.ray= function(p0,p1) {
			//コーンと直線
			var min=-99999;
			var max=99999;

			var d = Vec3.poolAlloc();
			var p = Vec3.poolAlloc();
			Mat43.dotVec3(p,this.inv_matrix,p0);
			Mat43.dotVec3(d,this.inv_matrix,p1);
			Vec3.sub(d,d,p);

			//コーン縦の向き
			var n = d[2];  //傾き
			var pn = p[2]; //距離
			if(n===0){
				if(pn*pn>1){
					Vec3.poolFree(2);
					return 99999;
				}
			}
			n=1/n;
			if(n>0){
				max = Math.min(max,(1-pn)*n);
				min = Math.max(min,(-1-pn)*n);
			}else{
				max = Math.min(max,(-1-pn)*n);
				min = Math.max(min,(1-pn)*n);
			}

			//コーンの水平方向
			p[2]-=1;
			var A = 4/5*(d[0]*d[0] + d[1]*d[1]+d[2]*d[2]) - d[2]*d[2];
			var B = 4/5*(p[0]*d[0] + p[1]*d[1] + p[2]*d[2]) - p[2]*d[2];
			var C = 4/5*(p[0]*p[0] + p[1]*p[1] + p[2]*p[2]) - p[2]*p[2];

			var l = B*B-A*C;
			if(l<0){
				Vec3.poolFree(2);
				return 99999;
			}
			if(A>0){
				min=Math.max(min,(-B - Math.sqrt(l))/A);
				max=Math.min(max,(-B + Math.sqrt(l))/A);
			}else if(A<0){
				if(d[2]>0){
					max = Math.min(max,(-B-Math.sqrt(l))/A);
				}else{
					min= Math.max(min,(-B+Math.sqrt(l))/A);
				}
			}else{
				if(B<0){
					min=Math.max(min,-C/(2*B));
				}else{
					max=Math.min(max,-C/(2*B));
				}
			}

			if(min>max){
				Vec3.poolFree(2);
				return 99999;
			}
			Vec3.poolFree(2);
			return min;
		}
		return ret;
	})();

	var Capsule = ret.Capsule = (function(){
		//カプセル
		var Capsule = function(){
			Collision.apply(this);
			this.type=CAPSULE;
		};
		var ret = Capsule;
		inherits(ret,Collision);
		ret.prototype.calcSupport=function(ans,v){
			var m=this.matrix;
			Vec3.set(ans,m[6],m[7],m[8]);
			if(Vec3.dot(ans,v)>0){
				Vec3.mul(ans,ans,-1);
			}
			ans[0]+=m[9];
			ans[1]+=m[10];
			ans[2]+=m[11];

		}

		ret.prototype.ray = function(p0,p1) {
			//カプセルと線分
			var min=-99999;
			var max=99999;
			var p = Vec3.poolAlloc();

			min=Cylinder.prototype.ray.call(this,p0,p1);
			var m = this.matrix;
			Vec3.set(p,m[6]+m[9],m[7]+m[10],m[8]+m[11]);
			min=Math.min(min,Collider.SPHERE_LINE2(p0,p1,p,this.bold));
			Vec3.set(p,-m[6]+m[9],-m[7]+m[10],-m[8]+m[11]);
			min=Math.min(min,Collider.SPHERE_LINE2(p0,p1,p,this.bold));

			Vec3.poolFree(1);
			if(min<max){
				return min;
			}
			return 99999;
		}
		return ret;
	})();

	var Cuboid = ret.Cuboid = (function(){
		//直方体
		var Cuboid = function(){
			Collision.apply(this);
			this.type=CUBOID;
			this.bold=0;
		}
		var ret = Cuboid;
		ret.prototype.calcSupport=function(ans,v){
			var m=this.matrix;
			if(m[0]*v[0] + m[1]*v[1] + m[2]*v[2] > 0){
				ans[0]=-1;
			}else{
				ans[0]=1;
			}
			if(m[3]*v[0] + m[4]*v[1] + m[5]*v[2] > 0){
				ans[1]=-1;
			}else{
				ans[1]=1;
			}
			if(m[6]*v[0] + m[7]*v[1] + m[8]*v[2] > 0){
				ans[2]=-1;
			}else{
				ans[2]=1;
			}

			Mat43.dotVec3(ans,m,ans);
		}
		ret.prototype.ray= function(p0,p1) {
			var min=-99999;
			var max=99999;
			var d = Vec3.poolAlloc();
			var p = Vec3.poolAlloc();
			Mat43.dotVec3(p,this.inv_matrix,p0);
			Mat43.dotVec3(d,this.inv_matrix,p1);
			Vec3.sub(d,d,p);

			for(var i=0;i<DIMENSION;i++){
				var n = d[i];  //傾き
				var pn = p[i]; //距離
				
				if(n===0){
					if(pn*pn>1){
						Vec3.poolFree(2);
						return 99999;
					}
					continue;
				}
				n=1/n;
				if(n>0){
					max = Math.min(max,(1-pn)*n);
					min = Math.max(min,(-1-pn)*n);
				}else{
					max = Math.min(max,(-1-pn)*n);
					min = Math.max(min,(1-pn)*n);
				}
			}
			if(min<max){
				Vec3.poolFree(2);
				return min;
			}
			Vec3.poolFree(2);
			return 99999;
		}
		return ret;
	})();
	inherits(Cuboid,Collision);

	var ConvexHull = ret.ConvexHull= (function(){
		//凸包
		var ConvexHull = function(){
			Collision.apply(this);
			this.type=CONVEX_HULL;
			//this.mesh=null; //メッシュ情報
			this.poses=[]; //頂点座標
		}
		var ret=ConvexHull;
		inherits(ConvexHull,Collision);

		ret.prototype.calcSupport=function(ans,v){
			var poses=this.poses;
			Vec3.copy(ans,poses[0]);
			var l = Vec3.dot(v,poses[0]);
			for(var i=1;i<poses.length;i++){
				var l2 = Vec3.dot(v,poses[i]);
				if(l>l2){
					l=l2;
					Vec3.copy(ans,poses[i]);
				}
			}
		}

		ret.prototype.ray= function(p0,p1){
			var t=Vec3.poolAlloc();
			var axis=Vec3.poolAlloc();
			var s = Vec3.poolAlloc();
			var v=[];
			for(var i=0;i<DIMENSION+1;i++){
				v.push(Vec3.poolAlloc());
			}
			var vbuf=Vec3.poolAlloc();

			Vec3.sub(axis,p0,p1);
			Vec3.sub(t,p0,p1);
			var idx=0;
			var counter=0;
			var next=0;
			var min=9999999999;
			var ret = 9999999999;
			var ref={};
			var flg=false;
			while(1){
				counter++;
				//axisの向きで一番近い点をとる
				this.calcSupport(s,axis);
				Vec3.sub(s,s,p0);
			
				//取得した点が重複するかチェック
				if(-Vec3.dot(s,axis)+min<0.00000001){
					//重複する場合はその時点が最短
					if(flg){
						ret=-min/Vec3.dot(axis,t);
					}

					break;
				}

				if(counter>999){
					//無限ループ対策
					console.log("loooop!!");
					break;
				}

				//点をセット
				Vec3.copy(v[next],s);
				if(idx<DIMENSION+1){
					idx++;
				}
				

				if(idx===1){
					Vec3.cross(axis,v[0],t);
					Vec3.cross(axis,axis,t);
					if(Vec3.dot(v[0],axis)<0){
						Vec3.mul(axis,axis,-1);
					}
					min=Vec3.dot(axis,v[0]);
					next=1;
				}else if(idx===2){
					Vec3.sub(vbuf,v[0],v[1]);
					Vec3.cross(axis,vbuf,t);
					//Vec3.cross(axis,axis,t);
					if(Vec3.dot(v[0],axis)<0){
						Vec3.mul(axis,axis,-1);
					}
					min=Vec3.dot(axis,v[0]);
					next=2;
				}else if(idx===3){
					Collider.TRIANGLE_LINE(Vec3.ZERO,t,v[0],v[1],v[2],ref);
					if(ref.out===0){
						Vec3.sub(vbuf,v[1],v[0]);
						Vec3.sub(axis,v[2],v[0]);
						Vec3.cross(axis,vbuf,axis);
						if(Vec3.dot(axis,t)>0){
							Vec3.mul(axis,axis,-1);
						}
						min=Vec3.dot(axis,v[0]);
						next=3;
						flg=true;
					}else{
						Vec3.sub(vbuf,v[ref.out%3],v[(ref.out+2)%3]);
						Vec3.cross(axis,vbuf,t);
						//Vec3.cross(axis,axis,t);
						if(Vec3.dot(v[(ref.out+1)%3],axis)<0){
							Vec3.mul(axis,axis,-1);
						}
						idx--;
						min=Vec3.dot(axis,v[ref.out%3]);
						next=(ref.out+1)%3;
					}
				}else{
					for(var i=0;i<3;i++){
						var t1=v[i];
						var t2=v[(i+1)%3];
						var t3=v[3];
						Collider.TRIANGLE_LINE(Vec3.ZERO,t,t1,t2,t3,ref);
						if(ref.out===0){
							Vec3.sub(axis,t2,t1);
							Vec3.sub(vbuf,t3,t1);
							Vec3.cross(axis,axis,vbuf);
							if(Vec3.dot(t,axis)>0){
								Vec3.mul(axis,axis,-1);
							}
							Vec3.copy(v[(i+2)%3],v[3]);
							next=3;
							min=Vec3.dot(axis,t1);
							break;
						}
					}
				}

			}
			Vec3.poolFree(8);
			return ret;
		};
		return ret;
	})();

	ret.Mesh = (function(){
		//メッシュ
		var Mesh= function(){
			//メッシュ
			ConvexHull.apply(this);
			this.type=MESH;
			this.triangles=[]; //三角ポリゴンセット
			this.AABBTreeRoot= null;
		};
		var ret = Mesh;
		inherits(ret,ConvexHull);

		ret.prototype.update=function(){
			this.calcAABB();

			//三角AABB
			var triangles = this.triangles;
			var nodes = [];
			for(var i=0;i<triangles.length;i++){
				var node = new AABB.Node();
				node.element=triangles[i];
				nodes.push(node);
				triangles[i].calcAABB(node.AABB);
			}

			this.AABBTreeRoot=AABB.createAABBTree(nodes);
		}

		ret.prototype.ray = function(p0,p1) {
			var t = Vec3.poolAlloc();
			var dpos = Vec3.poolAlloc();
			var cross=Vec3.poolAlloc();
			var pos2= Vec3.poolAlloc();
			var cross2= Vec3.poolAlloc();

			var faces =this.faces;
			var poses = this.poses;
			var faceAABBs = this.faceAABBs;//フェイスAABB
			var min=999999;

			Vec3.sub(t,p1,p0);
			for(var i=0;i<faces.length;i++){
				var face = faces[i];

				if(!Geono.AABB_LINEhit(faceAABBs[i],p0,p1)){
					continue;
				}
				var t0=poses[face[0]];
				var t1=poses[face[1]];
				var t2=poses[face[2]];

				Vec3.sub(dpos,t1,t0);
				Vec3.sub(cross2,t2,t0);
				Vec3.cross(cross,dpos,cross2);
				Vec3.norm(cross);//ポリゴン法線
				Vec3.sub(dpos,t0,p0); //線開始点とポリゴンの距離

				var l = Vec3.dot(cross,dpos)/Vec3.dot(cross,t);
				//if(l<0 || l>1){
				//	//面を線が貫通していない場合
				//	continue;
				//}

				Vec3.madd(pos2,p0,t,l);

				var ts=[t0,t1,t2,t0];
				for(var j=0;j<3;j++){
					var v1 = ts[j];
					var v2 = ts[j+1];
					Vec3.sub(dpos,v2,v1); //線分の向き
					Vec3.cross(cross2,cross,dpos); //法線と線分に垂直なベクトル
					Vec3.sub(dpos,pos2,v1);
					
					if(Vec3.dot(cross2,dpos)<=0){
						//辺の外の場合はずれ
						l=99999;
						break;
					}
				}
				if(l<min){
					min=l;
				}
			}
			
			Vec3.poolFree(5);
			return min;
		}
		return ret;
	})();

	var Triangle = ret.Triangle = function(){
		ConvexHull.apply(this);
		this.poses.push(new Vec3());
		this.poses.push(new Vec3());
		this.poses.push(new Vec3());
	}
	inherits(Triangle,ConvexHull);

	ret.prototype.calcAABBHitList=(function(){
		var aabbHitList=new Array(DIMENSION);
		var aabbHitListIdx=new Array(DIMENSION);
		for(var i=0;i<aabbHitList.length;i++){
			aabbHitList[i]=new Array(1024);
		}


		return function(){
			var aabbHitListAll=this.AABBHitListAll;
			for(var i=0;i<DIMENSION;i++){
				//ソート
				var AABBSort = this.AABBSorts[i];
				AABBSort.sort(function(a,b){return a.AABB.min[i] - b.AABB.min[i]});
			}

			//AABBの重なりチェックx軸
			var aabbHitListAllIdx=0;
			var AABBSort = this.AABBSorts[0];
			for(var j=0;j<AABBSort.length;j++){
				var end=AABBSort[j].AABB.max[0];
				for(var k=j+1;k<AABBSort.length;k++){
					if(end<=AABBSort[k].AABB.min[0]){
						//AABBの先頭が判定元AABBの終端を超えていたら終了
						break;
					}

					if(!(AABBSort[j].groups & AABBSort[k].groups)){
						//グループが一致しない場合は無視
						continue;
					}
					if((AABBSort[j].notgroups & AABBSort[k].notgroups)){
						//notグループが一致する場合は無視
						continue;
					}

					//重なっているAABBを追加
					var pairId = 0;
					if(AABBSort[j].id<AABBSort[k].id){
						pairId = (AABBSort[j].id<<16) | AABBSort[k].id;
						aabbHitListAll[aabbHitListAllIdx].col1=AABBSort[j];
						aabbHitListAll[aabbHitListAllIdx].col2=AABBSort[k];
					}else{
						pairId = (AABBSort[k].id<<16) | AABBSort[j].id;
						aabbHitListAll[aabbHitListAllIdx].col1=AABBSort[k];
						aabbHitListAll[aabbHitListAllIdx].col2=AABBSort[j];
					}
					aabbHitListAll[aabbHitListAllIdx].pairId=pairId;
					aabbHitListAllIdx++;
				}
			}
			aabbHitListAll[aabbHitListAllIdx].pairId=-1;
			Sort.kisu(aabbHitListAll,function(a){return a.pairId});

			for(var i=1;i<DIMENSION;i++){
				//y,z軸それぞれで計算
				aabbHitListIdx[i]=0;
				var AABBSort = this.AABBSorts[i];

				//AABBの重なりチェック
				for(var j=0;j<AABBSort.length;j++){
					var end=AABBSort[j].AABB.max[i];
					for(var k=j+1;k<AABBSort.length;k++){
						if(end<=AABBSort[k].AABB.min[i]){
							//AABBの先頭が判定元AABBの終端を超えていたら終了
							break;
						}
						//重なっているAABBを追加
						var pairId = 0;
						if(AABBSort[j].id<AABBSort[k].id){
							pairId = (AABBSort[j].id<<16) | AABBSort[k].id;
						}else{
							pairId = (AABBSort[k].id<<16) | AABBSort[j].id;
						}
						aabbHitList[i][aabbHitListIdx[i]]=pairId;
						aabbHitListIdx[i]++;
					}
				}

				aabbHitList[i][aabbHitListIdx[i]]=-1;
				Sort.kisu(aabbHitList[i]);
			}

			//3つの軸すべて重なっているものを抽出
			var idx=0;
			aabbHitListIdx[1]=0;
			aabbHitListIdx[2]=0;
			for(var i=0;aabbHitListAll[i].pairId>=0;i++){
				var pairId = aabbHitListAll[i].pairId;
				var flg=1;
				
				//x軸と同じペアIDがy,zにあるか
				for(var j=1;j<3;j++){
					var aabbHitF=aabbHitList[j];
					var k=aabbHitListIdx[j];
					if(!flg){
						break;
					}
					for(;aabbHitF[k]>=0;k++){
						if(aabbHitF[k]>=pairId){
							break;
						}
					}
					if(aabbHitF[k]!==pairId){
						flg=0;
					}

					if(k>0 && aabbHitF[k]<0){
						aabbHitListIdx[j]=k-1;
					}else{
						aabbHitListIdx[j]=k;
					}
						

				}

				if(flg){
					//あった場合追加
					aabbHitListAll[idx].pairId=aabbHitListAll[i].pairId;
					aabbHitListAll[idx].col1=aabbHitListAll[i].col1;
					aabbHitListAll[idx].col2=aabbHitListAll[i].col2;
					idx++;
				}
			}
			aabbHitListAll[idx].pairId=-1;

			return aabbHitListAll;
		};
	})();


	ret.checkHit = (function(){
		return function(col1,col2){
			var l = calcClosest(null,null,col1,col2,1);
			var flg=0;
			if(l>0){
				flg=1;
			}
			l -= (col1.bold + col2.bold);
			return l;
		}
	})();
	ret.calcClosest = function(ans1,ans2,col1,col2,noflg){
		var l = calcClosest(ans1,ans2,col1,col2,noflg);
		var flg=0;
		if(l>0){
			flg=1;
		}
		l -= (col1.bold + col2.bold);
		if(noflg){
			return l;
		}

		var n = Vec3.poolAlloc();
		Vec3.sub(n,ans2,ans1);
		if(!flg){
		Vec3.mul(n,n,-1);
		}
		Vec3.norm(n);
		Vec3.madd(ans1,ans1,n,col1.bold);
		Vec3.madd(ans2,ans2,n,-col2.bold);

		Vec3.poolFree(1);
		return l;
	}

	var calcClosest = (function(){
		return function(ans1,ans2,col1,col2,noflg){
			var l = 9999;
			if(col1.type===MESH){
				l = MESH_ANY(ans1,ans2,col1,col2);
			}else if(col2.type===MESH){
				l = MESH_ANY(ans2,ans1,col2,col1);
			}else{
				var func=hantei[col1.type*8+col2.type];
				if(func){
					if(!noflg){
						l=func(ans1,ans2,col1,col2);
					}
				}else{
					l=calcClosestPrimitive(ans1,ans2,col1,col2,noflg);
				}
			}
			return l;
		}
	})();
	var calcClosestPrimitive = (function(){
		var TRIANGLE_TRIANGLE=function(ans1,ans2,t1,t2,t3,t4,t5,t6){
			var ts1=[t1,t2,t3,t1];
			var ts2=[t4,t5,t6,t4];
			var min=-1;
			var ret1=Vec3.poolAlloc();
			var ret2=Vec3.poolAlloc();

			for(var i=0;i<3;i++){
				for(var j=0;j<3;j++){
					Geono.LINE_LINE(ret1,ret2,ts1[i],ts1[i+1],ts2[i],ts2[i+1]);
					if(min<0 || Vec3.len2(ret1,ret2)<min){
						min=Vec3.len2(ret1,ret2);
						Vec3.copy(ans1,ret1);
						Vec3.copy(ans2,ret2);
					}
				}
			}
			for(var i=0;i<3;i++){
				Geono.TRIANGLE_POINT(ret1,ts1[0],ts1[1],ts1[2],ts2[i]);
				if(min<0 || Vec3.len2(ret1,ts2[i])<min){
					min=Vec3.len2(ret1,ts2[i]);
					Vec3.copy(ans1,ret1);
					Vec3.copy(ans2,ts2[i]);
				
				}
				Geono.TRIANGLE_POINT(ret1,ts2[0],ts2[1],ts2[2],ts1[i]);
				if(min<0 || Vec3.len2(ret1,ts1[i])<min){
					min=Vec3.len2(ret1,ts1[i]);
					Vec3.copy(ans1,ts1[i]);
					Vec3.copy(ans2,ret1);
				
				}
			}
			Vec3.poolFree(2);

		}
		var closestFace=function(){
			this.v=new Array(3);
			this.cross = new Vec3();
			this.len = 0;
		}
		var vertices=[];
		var vertices1=[];
		var vertices2=[];
		var faces=[];
		var _edges=[];
		var _edgesIndex;
		var faceIndex;
		var idx;
		for(var i=0;i<256;i++){
			vertices.push(new Vec3());
			vertices1.push(new Vec3());
			vertices2.push(new Vec3());
			faces.push(new closestFace());
			var edge=[-1,-1];
			_edges.push(edge);
		}

		var addFaceBuf=new Vec3();
		var _addFace = function(v1,v2,v3,obj1,obj2){
			var vs = vertices;
			//現状4つの距離を計算
			var face;
			var i;
			for(i=0;i<faceIndex;i++){
				if(faces[i].len<0){
					break;
				}
			}
			if(i===faceIndex){
				faceIndex++;
			}
			face=faces[i];
			face.v[0]=v1;
			face.v[1]=v2;
			face.v[2]=v3;
			var dx1=vs[v2][0] - vs[v1][0];
			var dy1=vs[v2][1] - vs[v1][1];
			var dz1=vs[v2][2] - vs[v1][2];
			var dx2=vs[v3][0] - vs[v1][0];
			var dy2=vs[v3][1] - vs[v1][1];
			var dz2=vs[v3][2] - vs[v1][2];
			face.cross[0]=dy1*dz2 - dz1*dy2;
			face.cross[1]=dz1*dx2 - dx1*dz2;
			face.cross[2]=dx1*dy2 - dy1*dx2;
			Vec3.norm(face.cross);
			face.len = Vec3.dot(face.cross,vs[v1]);

			if(face.len<0){
				face.len*=-1;
				Vec3.mul(face.cross,face.cross,-1);
			}

			if(face.len<0.000001){

				for(var i=0;i<idx;i++){
					if(i===v1 || i===v2 || i===v3){
						continue;
					}
					Vec3.sub(addFaceBuf,vs[i],vs[v1]);

					var a=Vec3.dot(face.cross,addFaceBuf);
					var b=Vec3.dot(face.cross,vs[i])-face.len;
					if((a>0.0000001) !== (b>0.0000001)){
						console.log(a,b);
						}
					if(b>0.0000000001){
						Vec3.mul(face.cross,face.cross,-1);
						break;
					}
				}
				
			}

			Geono.TRIANGLE_POINT(addFaceBuf,vs[v1],vs[v2],vs[v3],Vec3.ZERO);
			face.len = Vec3.dot(addFaceBuf,addFaceBuf);
			return face;
		}
		for(var i=0;i<128;i++){
			var edge=[-1,-1];
			_edges.push(edge);
		}
		var _addEdge = function(v1,v2){
			for(var j=0;j< _edgesIndex;j++){
				if((_edges[j][0]===v1 && _edges[j][1]===v2)
				|| (_edges[j][0]===v2 && _edges[j][1]===v1)){
					//_edges.splice(j,1);
					_edges[j][0]=-1;
					return;
					
				}
			}
			var idx;
			for(idx=0;idx<_edgesIndex;idx++){
				if(_edges[idx][0]<0){
					break;
				}
			}
			if(idx===_edgesIndex){
				_edgesIndex++;
			}
			var edge=_edges[idx];//[v1,v2];
			edge[0]=v1;
			edge[1]=v2;
			//_edges.push(edge);
		}
		var buf2=new Vec3();
		var buf3=new Vec3();
		var buf4=new Vec3();
		var buf5=new Vec3();
		var buf7=new Vec3();
	return function(ans1,ans2,obj1,obj2,noflg){
		var s= buf2;
		var s1= buf3;
		var s2= buf4;
		var v=vertices;
		var v1=vertices1;
		var v2=vertices2;
		var vbuf= buf5;
		var axis= buf7;
		var sup1=obj1.calcSupport;
		var sup2=obj2.calcSupport;

		//中心
		axis[0]=(obj1.AABB.min[0]+obj1.AABB.max[0] - obj2.AABB.min[0] - obj2.AABB.max[0])*0.5;
		axis[1]=(obj1.AABB.min[1]+obj1.AABB.max[1] - obj2.AABB.min[1] - obj2.AABB.max[1])*0.5;
		axis[2]=(obj1.AABB.min[2]+obj1.AABB.max[2] - obj2.AABB.min[2] - obj2.AABB.max[2])*0.5;

		idx=0;
		var counter=0;
		var next=3;
		var min=9999999999;
		while(1){
			counter++;
			//axisの向きで一番近い点をとる
			obj1.calcSupport(s1,axis);
			axis[0]*=-1;
			axis[1]*=-1;
			axis[2]*=-1;
			obj2.calcSupport(s2,axis);
			s[0]=s1[0]-s2[0];
			s[1]=s1[1]-s2[1];
			s[2]=s1[2]-s2[2];
		
			//取得した点が重複するかチェック
			if(Vec3.dot(s,axis)+min<0.000001){
				if(!ans1 || !ans2){
					//接触判定のみの場合は距離だけ求める
					return Math.sqrt(min);
				}
				//重複する場合はその時点での点が最短
				if(idx===1){
					Vec3.copy(ans1,v1[0]);
					Vec3.copy(ans2,v2[0]);
				}else if(idx===2){
					Geono.LINE_LINE(ans1,ans2,v1[0],v1[1],v2[0],v2[1]);
				}else if(idx===3){
					TRIANGLE_TRIANGLE(ans1,ans2,v1[0],v1[1],v1[2]
						,v2[0],v2[1],v2[2]);
				}else{
					//頂点が4つある場合は最も遠い点を無視する
					Vec3.copy(v1[next],v1[3]);
					Vec3.copy(v2[next],v2[3]);
					TRIANGLE_TRIANGLE(ans1,ans2,v1[0],v1[1],v1[2]
						,v2[0],v2[1],v2[2]);
				}
				//console.log(v1[0],v1[1],v1[2],obj2.location
				//		,v2[0],v2[1],v2[2]);
					//console.log(v[0],v[1],v[2],va,idx);
				return Vec3.len(ans1,ans2);
			}
			
			if(counter>999){
				//無限ループ対策
				console.log("loooop!!");
				return 0;
			}

			if(idx<DIMENSION+1){
				//点が揃っていない場合は追加する
				next=idx;
				idx++;
			}
			//点が揃っている場合は一番遠いの？と入れ替える
			Vec3.copy(v[next],s);
			Vec3.copy(v1[next],s1);
			Vec3.copy(v2[next],s2);
			

			//現在の取得点から目標点までの最短点を求める
			if(idx===1){
				Vec3.copy(axis,v[0]);
				min=Vec3.dot(axis,axis);
			}else if(idx===2){
				Geono.LINE_POINT(axis,v[0],v[1],Vec3.ZERO);
				min=Vec3.dot(axis,axis);
				if(!(axis[0] || axis[1] || axis[2])){
					//接触している場合は適当に垂直な方向をとる
					axis[0]=-(v[0][1]-v[1][1]);
					axis[1]=v[0][2]-v[1][2];
					axis[2]=v[0][0]-v[1][0];
				}
			}else if(idx===3){
				Geono.TRIANGLE_POINT(axis,v[0],v[1],v[2],Vec3.ZERO);
				min=Vec3.dot(axis,axis);
				if(!(axis[0] || axis[1] || axis[2])){
					//接触している場合は適当に法線をとる
					Vec3.sub(vbuf,v[1],v[0]);
					Vec3.sub(axis,v[2],v[0]);
					Vec3.cross(axis,vbuf,axis);
				}
			}else{
				//console.log(v1[0],v1[1],v1[2],v1[3]
				//		,v2[0],v2[1],v2[2],v2[3]);
				min=-1;
				var flg=true;
				for(var i=0;i<4;i++){
					var t1=v[i];
					var t2=v[(i+1)&3];
					var t3=v[(i+2)&3];
					var t4=v[(i+3)&3];
					Vec3.sub(vbuf,t2,t1);
					Vec3.sub(s,t3,t1);
					Vec3.cross(vbuf,s,vbuf);
					var l1=-Vec3.dot(t1,vbuf); //面から原点までの距離
					Vec3.sub(s,t4,t1);
					var l2=Vec3.dot(s,vbuf); //面からもうひとつの頂点までの距離

					if(l2*l2<=0.0000000001
					|| l1*l2<0){
						flg=false;
						Geono.TRIANGLE_POINT(vbuf,t1,t2,t3,Vec3.ZERO);
						var l=vbuf[0]*vbuf[0]+vbuf[1]*vbuf[1]+vbuf[2]*vbuf[2];//面と原点との距離^2
						if(min<0 || l<min){
							min=l;
							Vec3.copy(axis,vbuf);
							next=(i+3)&3;
						}
					}
				}
				if(flg){
					//内包する場合
					break;
				}
			}

		}
		if(!ans1 || !ans2){
			//接触判定のみの場合はさっさと抜ける
			return -1;
		}

		//内包する場合
		var addFace = _addFace;
		var addEdge=_addEdge;
		var edges=_edges;
		faceIndex=0;
		for(var i=0;i<idx;i++){ 
			//現状4つの距離を計算
			addFace(i,(i+1)&3,(i+2)&3,obj1,obj2);
		}
		while(1){
			var min=faces[0].len;
			var minn=0;
			//最短面探索
			for(var i=1;i<faceIndex;i++){
				if(faces[i].len<min && faces[i].len>=0){
					min=faces[i].len;
					minn=i;
				}
			}
			var face = faces[minn];
			//最短面の法線取得
			Vec3.mul(axis,face.cross,-1);
			//サポ射
			obj1.calcSupport(s1,axis);
			Vec3.mul(axis,axis,-1);
			obj2.calcSupport(s2,axis);
			Vec3.sub(s,s1,s2);

			//終了チェック
			if((Vec3.dot(s,axis) - Vec3.dot(v[face.v[0]],axis)<0.0000001)
			|| faceIndex>=200){
				TRIANGLE_TRIANGLE(ans1,ans2
						,v1[face.v[0]],v1[face.v[1]],v1[face.v[2]]
						,v2[face.v[0]],v2[face.v[1]],v2[face.v[2]]);
				//console.log(v1[face.v[0]],v1[face.v[1]],v1[face.v[2]]
				//		,v2[face.v[0]],v2[face.v[1]],v2[face.v[2]]);
				//console.log(v[face.v[0]],v[face.v[1]],v[face.v[2]]);
				//console.log(face.len);

				return -Vec3.len(ans1,ans2);
			}

			//終了しなかった場合はその点を追加
			Vec3.copy(v[idx],s);
			Vec3.copy(v1[idx],s1);
			Vec3.copy(v2[idx],s2);

			_edgesIndex=0;
			for(var i=0;i<faceIndex;i++){
				var face=faces[i];
				if(face.len<0){
					continue;
				}
				Vec3.sub(vbuf,s,v[face.v[0]]);
				if(Vec3.dot(vbuf,face.cross)>0){
					//エッジ追加
					addEdge(face.v[0],face.v[1]);
					addEdge(face.v[1],face.v[2]);
					addEdge(face.v[2],face.v[0]);
					//face削除
					//faces.splice(i,1);
					face.len=-1;
				}
			}
			for(var i=0;i<_edgesIndex;i++){
				if(edges[i][0]<0){
					continue;
				}
				//新たなfaceを追加、
				addFace(edges[i][0],edges[i][1],idx,obj1,obj2);
			}
			idx++;
		}

		return 1;
	};
	})();

	var AABBNode_ANY =function(ans1,ans2,node,col2){
		//AABBツリーと何かの判定
		if(!AABB.hitCheck(node.AABB,col2.AABB)){
			return 9999999;
		}
		if(node.element){
			return calcClosest(ans1,ans2,node.element,col2);
		}else{
			var ans3 = Vec3.poolAlloc();
			var ans4 = Vec3.poolAlloc();
			var l = AABBNode_ANY(ans1,ans2,node.child1,col2);
			var l2 = AABBNode_ANY(ans3,ans4,node.child2,col2);

			if(l2<l){
				Vec3.copy(ans1,ans3);
				Vec3.copy(ans2,ans4);
				l =l2;
			}
			Vec3.poolFree(2);
			return l;
		}
	}
	var MESH_ANY=function(ans1,ans2,col1,col2){
		//メッシュと何かの判定
		return AABBNode_ANY(ans1,ans2,col1.AABBTreeRoot,col2);
	}
	var hantei=new Array(8*8);
	for(var i=0;i<8*8;i++){
		hantei[i]=null;
	}
	var setHantei = function(a,b,c){
		hantei[b*8+a]=function(ans1,ans2,col1,col2){
			return c(ans2,ans1,col2,col1);
		}
		hantei[a*8+b]=c;
	}
	
	setHantei(SPHERE, SPHERE, function(ans1,ans2,col1,col2){
		Vec3.set(ans1,col1.matrix[9],col1.matrix[10],col1.matrix[11]);
		Vec3.set(ans2,col2.matrix[9],col2.matrix[10],col2.matrix[11]);
		return Vec3.len(ans1,ans2);
	});

	setHantei(CAPSULE, SPHERE, function(ans1,ans2,col1,col2){
		var m = col1.matrix;
		var bV0 = Vec3.poolAlloc();
		var bV1 = Vec3.poolAlloc();
		Vec3.set(bV0,m[9]+m[6],m[10]+m[7],m[11]+m[8]);
		Vec3.set(bV1,m[9]-m[6],m[10]-m[7],m[11]-m[8]);
		Vec3.set(ans2,col2.matrix[9],col2.matrix[10],col2.matrix[11]);
		Geono.LINE_POINT(ans1,bV0,bV1,ans2);
		Vec3.poolFree(2);
		return Vec3.len(ans1,ans2);
	});
	setHantei(TRIANGLE, SPHERE, function(ans1,ans2,col1,col2){
		Vec3.set(ans2,col2.matrix[9],col2.matrix[10],col2.matrix[11]);
		Geono.TRIANGLE_POINT(ans1,col1.v[0],col1.v[1],col1.v[2],ans2);
		return Vec3.len(ans1,ans2);
	});

	setHantei(CUBOID,SPHERE,function(ans1,ans2,cuboid,sphere){
		var axis= Vec3.poolAlloc();
		var dVec = Vec3.poolAlloc();
		var len = Vec3.poolAlloc();

		//中心差分
		dVec[0]=sphere.matrix[9] - cuboid.matrix[9];
		dVec[1]=sphere.matrix[10] - cuboid.matrix[10];
		dVec[2]=sphere.matrix[11] - cuboid.matrix[11];

		var insideFlg=1; //内包フラグ

		Vec3.set(ans1,sphere.matrix[9],sphere.matrix[10],sphere.matrix[11]); 
		Vec3.set(ans2,sphere.matrix[9],sphere.matrix[10],sphere.matrix[11]); //球は中心固定
		
		for(var i=0;i<DIMENSION;i++){
			Vec3.set(axis,cuboid.matrix[i*3+0],cuboid.matrix[i*3+1],cuboid.matrix[i*3+2]); //軸
			var d = Vec3.dot(axis,dVec); //軸に対する差分
			var size = Vec3.dot(axis,axis); //軸の長さ^2
			if(d >  size){ //軸より外の場合(正)
				Vec3.madd(ans1,ans1,axis,1-d/size);
				insideFlg = 0;
			}else if( d< -size){//軸より外の場合(負)
				Vec3.madd(ans1,ans1,axis,-(1+d/size));
				insideFlg = 0;
			}else{ //内側の場合
				if(d>0){
					len[i] = (size - d)/Vec3.scalar(axis);
				}else{
					len[i] = (-size - d)/Vec3.scalar(axis);
				}
			}
		}
		if(insideFlg){ //内側の場合
			var min=0;
			for(var i=1;i<DIMENSION;i++){
				if(len[min]*len[min]>len[i]*len[i]){
					min=i;
				}
			}
			Vec3.set(axis,cuboid.matrix[min*3+0],cuboid.matrix[min*3+1],cuboid.matrix[min*3+2]); //軸
			Vec3.madd(ans1,ans2,axis,len[min]/Vec3.scalar(axis));

			Vec3.poolFree(3);
			return -Vec3.len(ans1,ans2);
		}else{ //外側の場合
			Vec3.poolFree(3);
			return Vec3.len(ans1,ans2);
		}
	});

	ret.prototype.All = function(disableList){
		//総当り
		var ans1 = Vec3.poolAlloc();
		var ans2 = Vec3.poolAlloc();
		var n = Vec3.poolAlloc();

		var collisions = this.AABBSorts[0];

		var start=Date.now();
		//AABBで重なっているペアを抽出
		var aabbHitList = this.calcAABBHitList();
		this.AABBTime=Date.now()-start;

		var dIdx= 0;

		Sort.kisu(disableList);
		start=Date.now();
		this.hitListIndex=0;
		for(var i=0;aabbHitList[i].pairId>0;i++){
			var aabbHit=aabbHitList[i];

			//コリジョン無効チェック
			var flg=false;
			for(;disableList[dIdx]>0;dIdx++){
				if(disableList[dIdx]===aabbHit.pairId){
					flg=true;
					break;
				}
				if(disableList[dIdx]>aabbHit.pairId){
					break;
				}
			}

			if(flg){
				continue;
			}
			var col1=aabbHit.col1;
			var col2=aabbHit.col2;

			var l = Collider.calcClosest(ans1,ans2,col1,col2);
			if(l<0){
				var elem = this.hitList[this.hitListIndex];
				Vec3.copy(elem.pos1,ans1);
				Vec3.copy(elem.pos2,ans2);
				elem.col1=col1;
				elem.col2=col2;
				elem.pairId = aabbHitList[i].pairId;
				this.hitListIndex++;

				if(col1.callbackFunc){
					col1.callbackFunc(col1,col2,elem.pos1,elem.pos2);
				}
				if(col2.callbackFunc){
					col2.callbackFunc(col2,col1,elem.pos2,elem.pos1);
				}
			}
		}
		this.hitList[this.hitListIndex].col1=null;

		this.collisionCount=i;
		this.collisionTime=Date.now()-start;

		Vec3.poolFree(3);
	}

	
	ret.SPHERE_LINE2 = function(p0,p1,p2,r) {
		var p = Vec3.poolAlloc();
		var d = Vec3.poolAlloc();
		Vec3.sub(p,p0,p2);
		Vec3.sub(d,p1,p0);
		var A = Vec3.dot(d,d);
		var B = Vec3.dot(p,d);
		var C = Vec3.dot(p,p) - r*r;

		Vec3.poolFree(2);
		if(A===0){
			return 9999;
		}
		var l = B*B-A*C;
		if(l<0){
			return 99999;
		}
		return (-B - Math.sqrt(l))/A;

	}


	ret.TRIANGLE_LINE=function(p0,p1,t0,t1,t2,ref){
		var t = Vec3.poolAlloc();
		var dpos=Vec3.poolAlloc();
		var cross2=Vec3.poolAlloc();
		var cross=Vec3.poolAlloc();
		var pos2=Vec3.poolAlloc();

		Vec3.sub(t,p1,p0);

		Vec3.sub(dpos,t1,t0);
		Vec3.sub(cross2,t2,t0);
		Vec3.cross(cross,dpos,cross2);
		Vec3.norm(cross);//ポリゴン法線
		Vec3.sub(dpos,t0,p0); //線開始点とポリゴンの距離

		var l = Vec3.dot(cross,dpos)/Vec3.dot(cross,t);

		Vec3.madd(pos2,p0,t,l);

		if(ref){
			ref.out=0;
		}

		var ts=[t0,t1,t2,t0];
		for(var j=0;j<3;j++){
			var v1 = ts[j];
			var v2 = ts[j+1];
			Vec3.sub(dpos,v2,v1); //線分の向き
			Vec3.cross(cross2,cross,dpos); //法線と線分に垂直なベクトル
			Vec3.sub(dpos,pos2,v1);
			
			if(Vec3.dot(cross2,dpos)<=0){
				//辺の外の場合はずれ
				if(ref){
					ref.out=j+1;
				}
				l = 99999;
				break;
			}
		}
		Vec3.poolFree(5);
		return l;
	}
	ret.MESH_LINE2 = function(p0,p1,obj) {
		var min=-999999;

		var triangles = obj.triangles;
		for(var i=0;i<triangles.length;i++){
			if(!AABB.hitCheckLine(triangles[i].AABB,p0,p1)){
				continue;
			}
			var l=triangles[i].ray(p0,p1);
			if(l>min && l<0){
				min=l;
			}
		}
		
		return min;
	}

	return ret;
})();
