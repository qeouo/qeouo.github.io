"use strict"
//AABB -----------------
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
		//すべての頂点を内包するAABBを求める
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

	
	return ret;
})();
var AABBTree= (function(){
	var AABBTree= function(){
		this.root;
	}
	var ret = AABBTree;

	var Node = ret.Node = function(){
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
		var node = new Node();
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


//ここから基本図形-----------------------------------------------------

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
			var l =SPHERE_LINE2(p0,p1,p,this.bold);
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
		var m_sqrt5 = -1/Math.sqrt(5);
		ret.prototype.calcSupport=function(ans,v){
			Mat43.dotMat33Vec3(ans,this.inv_matrix,v);
			Vec3.norm(ans);
			if(ans[2]<m_sqrt5){
				//頂点
				Vec3.set(ans,0,0,1);
			}else{
				//底面
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

			var pn = p[2]; //距離
			if(d[2]===0){
				//レイが水平な場合
				if(pn*pn>1){
					//高さが+-1より大きい場合は接触しない
					min=99999;
				}else{
					var r=(1-p)*0.5; //レイのある高さの半径

					var A = d[0]*d[0] + d[1]*d[1];
					var B = p[0]*d[0] + p[1]*d[1];
					var C = p[0]*p[0] + p[1]*p[1] - r*r;
					if(A===0){
						//レイが0ベクトルの場合
						if(p[0]*p[0]+p[1]*p[1]>r*r){
							//半径より外なら接触していない
							min = 999999;
						}
					}else{
						var l = B*B-A*C;
						if(l<0){
							//判別式負の場合接触しない
							min=999999;
						}else{
							min=Math.max(min,(-B - Math.sqrt(l))/A);
						}
					}
				}
			}else{

				//コーンの側面
				p[2]-=1;
				var A = (4/5)*(d[0]*d[0] + d[1]*d[1]+d[2]*d[2]) - d[2]*d[2];
				var B = (4/5)*(p[0]*d[0] + p[1]*d[1] + p[2]*d[2]) - p[2]*d[2];
				var C = (4/5)*(p[0]*p[0] + p[1]*p[1] + p[2]*p[2]) - p[2]*p[2];

				var l = B*B-A*C;
				if(l<0){
					//判別式が負の場合接触しない
					min=99999;
				}else{

					if(A>0){
						min=(-B - Math.sqrt(l))/A;
						max=(-B + Math.sqrt(l))/A;
					}else if(A<0){
						if(d[2]>0){
							//max = Math.min(max,(-B-Math.sqrt(l))/A);
							max = (-B+Math.sqrt(l))/A;
						}else{
							//min= Math.max(min,(-B+Math.sqrt(l))/A);
							min= (-B-Math.sqrt(l))/A;
						}
					}else{
						if(B<0){
							min=-C/(2*B);
						}else{
							max=-C/(2*B);
						}
					}

					//高さ接触範囲 +-1
					var invz=1/d[2];
					if(invz>0){
						max = Math.min(max,(1-pn)*invz);
						min = Math.max(min,(-1-pn)*invz);
					}else{
						max = Math.min(max,(-1-pn)*invz);
						min = Math.max(min,(1-pn)*invz);
					}
				}
			}

			if(min>max){
				//範囲逆転の場合接触していない
				min=99999;
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
			min=Math.min(min,SPHERE_LINE2(p0,p1,p,this.bold));
			Vec3.set(p,-m[6]+m[9],-m[7]+m[10],-m[8]+m[11]);
			min=Math.min(min,SPHERE_LINE2(p0,p1,p,this.bold));

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
				if(l2<l){
					l=l2;
					Vec3.copy(ans,poses[i]);
				}
			}
		}

		ret.prototype.ray= function(p0,p1){
			var t=Vec3.poolAlloc();
			var axis=Vec3.poolAlloc();
			var v=[];
			for(var i=0;i<DIMENSION+1+1;i++){
				v.push(Vec3.poolAlloc());
			}
			var vbuf=Vec3.poolAlloc();

			Vec3.sub(axis,p1,p0);
			Vec3.sub(t,p1,p0);


			var idx=1;
			var counter=0;
			var ret = 9999999999;

			//最初の点を求める
			this.calcSupport(v[0],axis);
			Vec3.sub(v[0],v[0],p0);
			Vec3.cross(axis,v[0],t);
			Vec3.cross(axis,t,axis);
			if(Vec3.dot(axis,v[0])>0){
				Vec3.mul(axis,axis,-1);
			}

			var min=Vec3.dot(axis,v[0]);
			var vloop=[v[0],v[1],v[2],v[0],v[1],v[2]];
			while(1){
				//axisの向きで一番近い点をとる
				this.calcSupport(v[idx],axis);
				Vec3.sub(v[idx],v[idx],p0);
			
				min=Vec3.dot(axis,v[0]);
				for(var i=1;i<idx;i++){
					min=Math.min(min,Vec3.dot(axis,v[i]));
				}	
				//取得した点が現在の最短と一致するかチェック
				if(Vec3.dot(v[idx],axis)>min-0.001){
					break;
				}

				if(idx===1){
					Vec3.sub(vbuf,v[0],v[1]);
					Vec3.cross(axis,vbuf,t);
					if(Vec3.dot(v[0],axis)<0){
						Vec3.mul(axis,axis,-1);
					}
					idx++;
				}else if(idx===2){
					ret =TRIANGLE_LINE(t,v[0],v[1],v[2]);
					if(ret===0){
						Vec3.cross2(axis,v[0],v[1],v[2]);
						if(Vec3.dot(axis,t)<0){
							Vec3.mul(axis,axis,-1);
						}
						idx++;
					}else{
						Vec3.copy(vloop[ret+1],vloop[2]);
						Vec3.sub(vbuf,v[0],v[1]);
						Vec3.cross(axis,vbuf,t);
						if(Vec3.dot(v[0],axis)<0){
							Vec3.mul(axis,axis,-1);
						}

					}
				}else{
					
					//四面体の手前3つの面のどれを貫通しているか調べる
					var next=-1;
					var min;
					for (var i=0;i<3;i++){
						if(TRIANGLE_LINE(t,v[i],vloop[i+1],v[3])){
							continue;
						}
						Vec3.cross(vbuf,v[i],vloop[i+1],v[3]);
						var l=Vec3.dot(vbuf,v[3])/Vec3.dot(vbuf,t);
						if(next<0 || l<min){
							next=i;
							min=l;
						}
					}
					if(next>=0){
						Vec3.copy(vloop[next+2],v[3]);
						Vec3.cross2(axis,v[0],v[1],v[2]);
						if(Vec3.dot(t,axis)<0){
							Vec3.mul(axis,axis,-1);
						}
					}else{
						//console.log("B");
						Vec3.copy(axis,t);
						min=Vec3.dot(v[3],axis);
						break;
						
					}
				}

				//無限ループ対策
				counter++;
				if(counter===20){
					console.log("lo!!");
				}
				if(counter>21){
					console.log("loooop!!");
					break;
				}

			}

			//その時点が最短
			if(idx>2){
				ret=min/Vec3.dot(axis,t);
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
				var node = new AABBTree.Node();
				node.element=triangles[i];
				nodes.push(node);
				triangles[i].calcAABB(node.AABB);
				//triangles[i].calcAABB(AABB);
			}

			this.AABBTreeRoot=AABBTree.createAABBTree(nodes);
		}

		ret.prototype.ray = function(p0,p1) {
			var min=-999999;

			var triangles = this.triangles;
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

	var Triangle = ret.Triangle = function(){
		ConvexHull.apply(this);
		this.poses.push(new Vec3());
		this.poses.push(new Vec3());
		this.poses.push(new Vec3());
	}
	inherits(Triangle,ConvexHull);
//----------------------------------------------------------------------------------------


	ret.prototype.sortList=function(){
		for(var i=0;i<DIMENSION;i++){
			//ソート
			this.AABBSorts[i].sort(function(a,b){return a.AABB.min[i] - b.AABB.min[i]});
		}
	}
	ret.prototype.calcAABBHitList=(function(){
		var aabbHitList=new Array(DIMENSION);
		var aabbHitListIdx=new Array(DIMENSION);
		for(var i=0;i<aabbHitList.length;i++){
			aabbHitList[i]=new Array(1024);
		}

		return function(){
			var aabbHitListAll=this.AABBHitListAll;

			this.sortList();

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


	//コリジョンリストと引数のコリジョンの距離判定
	ret.prototype.checkClosestAll= function(col){
		var AABBSort = this.AABBSorts[0];
		this.hitListIndex = 0;
		var ans1 = Vec3.poolAlloc();
		var ans2 = Vec3.poolAlloc();
		for(var j=0;j<AABBSort.length;j++){
			if(col.AABB.max[0]<AABBSort[j].AABB.min[0])break;
			if(col.AABB.min[0]>AABBSort[j].AABB.max[0])continue;

			if(Collider.calcClosest(ans1,ans2,col,AABBSort[j])<0){
				var elem = this.hitList[this.hitListIndex];
				Vec3.copy(elem.pos1,ans1);
				Vec3.copy(elem.pos2,ans2);
				elem.col1=col;
				elem.col2=AABBSort[j];
				//elem.pairId = aabbHitList[i].pairId;
				this.hitListIndex++;
			}
		}
		Vec3.poolFree(2);
		return this.hitList;
	}

	//コリジョンリストと引数のコリジョンの接触判定
	ret.prototype.checkHitAll = function(col){
		var AABBSort = this.AABBSorts[0];
		this.hitListIndex = 0;
		for(var j=0;j<AABBSort.length;j++){
			if(col.AABB.max[0]<AABBSort[j].AABB.min[0])break;
			if(col.AABB.min[0]>AABBSort[j].AABB.max[0])continue;

			if(Collider.calcClosest(null,null,col,AABBSort[j],1)<0){
				var elem = this.hitList[this.hitListIndex];
				elem.col1=col;
				elem.col2=AABBSort[j];
				//elem.pairId = aabbHitList[i].pairId;
				this.hitListIndex++;
			}
		}
		return this.hitList;

	}
	
	//col1とcol2の接触チェック
	ret.checkHit = function(col1,col2){
		return Collider.calcClosest(null,null,col1,col2);
	}

	//col1とcol2の最小距離もしくは最大めり込み距離を求める
	ret.calcClosest = function(ans1,ans2,col1,col2){
		var l = calcClosestWithoutBold(ans1,ans2,col1,col2);
		var flg=0;
		if(l>0){
			//接触していない
			flg=1;
		}
		//距離からそれぞれのオブジェクトの太さ分を考慮したものにする
		l -= (col1.bold + col2.bold);

		if(!ans1 || !ans2){
			//位置が不要な場合は終わり
			return l;
		}

		var n = Vec3.poolAlloc();
		Vec3.sub(n,ans2,ans1);
		if(!flg){
			//接触していない場合はベクトルを逆にする
			Vec3.mul(n,n,-1);
		}
		//接触位置を太さ分ずらす
		Vec3.norm(n);
		Vec3.madd(ans1,ans1,n,col1.bold);
		Vec3.madd(ans2,ans2,n,-col2.bold);

		Vec3.poolFree(1);
		return l;
	}

	//最小距離もしくは最大めり込み距離を求める(太さ未考慮）
	var calcClosestWithoutBold = (function(){
		return function(ans1,ans2,col1,col2){
			var l = 9999;
			if(col1.type===MESH){
				//col1がメッシュの場合
				l = MESH_ANY(ans1,ans2,col1,col2);
			}else if(col2.type===MESH){
				//col2がメッシュの場合
				l = MESH_ANY(ans2,ans1,col2,col1);
			}else{
				var func=hantei[col1.type*8+col2.type];
				if(func){
					//専用の関数のある組み合わせの場合
					if(!ans1 || !ans2){
						ans1 = Vec3.poolAlloc();
						ans2 = Vec3.poolAlloc();
						l=func(ans1,ans2,col1,col2);
						Vec3.poolFree(2);
					}else{
						l=func(ans1,ans2,col1,col2);
					}
				}else{
					//専用の関数がない場合は汎用関数(GJK-EPA)
					l=calcClosestPrimitive(ans1,ans2,col1,col2);
				}
			}
			return l;
		}
	})();

	//GJKとEPA
	var calcClosestPrimitive = (function(){

		var checkLINE_LINE_=function(a1,a2,b1,b2,axis){
			var cross= Vec3.poolAlloc();
			var cross2= Vec3.poolAlloc();
			var ret=-1;
			
			Vec3.sub(cross2,b2,b1);
			Vec3.cross(cross,cross2,axis);
			Vec3.sub(cross2,a1,b1);
			var l =Vec3.dot(cross,cross2);
			Vec3.sub(cross2,a2,b1);
			var l2 =Vec3.dot(cross,cross2);

			ret = l/(l-l2);
				
			Vec3.poolFree(2);
			return ret;
		}
		var checkLINE_LINE=function(a1,a2,b1,b2,axis){
			var cross= Vec3.poolAlloc();
			var cross2= Vec3.poolAlloc();
			var ret=-1;
			Vec3.sub(cross2,a2,a1);
			Vec3.cross(cross,cross2,axis);
			Vec3.sub(cross2,b1,a1);
			var l =Vec3.dot(cross,cross2);
			Vec3.sub(cross2,b2,a1);
			var l2 =Vec3.dot(cross,cross2);
			
			if(l*l2<=0){
				Vec3.sub(cross2,b2,b1);
				Vec3.cross(cross,cross2,axis);
				Vec3.sub(cross2,a1,b1);
				l =Vec3.dot(cross,cross2);
				Vec3.sub(cross2,a2,b1);
				l2 =Vec3.dot(cross,cross2);
				if(l*l2<0){
					ret = l/(l-l2);
				}
			}
			
				
			Vec3.poolFree(2);
			return ret;
		}
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
		var TRIANGLE_TRIANGLE__=function(ans1,ans2,axis,A1,A2,A3,B1,B2,B3){
			//GJKorEPAの結果から得た三角形の組の最近点を求める

			if(Vec3.len2(A1,A2)<0.0001 &&  Vec3.len2(A1,A3)<0.0001){
				//A側が点の場合
				Vec3.copy(ans1,A1);
				Vec3.sub(ans2,ans1,axis);
				return;
			}else if(Vec3.len2(B1,B2)<0.0001 && Vec3.len2(B1,B3)<0.0001){
				//B側が点の場合
				Vec3.copy(ans2,B1);
				Vec3.add(ans1,ans2,axis);
				return;
			}

			var idxa=3;
			var idxb=3;
			if(Vec3.len2(A2,A3)<0.0001){
				idxa=1;
			}
			if(Vec3.len2(A1,A3)<0.0001){
				idxa=1;
			}
			if(Vec3.len2(A1,A2)<0.0001){
				Vec3.copy(A2,A3);
				idxa=1;
			}

			if(Vec3.len2(B2,B3)<0.0001){
				idxb=1;
			}
			if(Vec3.len2(B1,B3)<0.0001){
				idxb=1;
			}
			if(Vec3.len2(B1,B2)<0.0001){
				Vec3.copy(B1,B3);
				idxb=1;
			}

			var cross = Vec3.poolAlloc();
			var cross2 = Vec3.poolAlloc();

			if(idxa===1 && idxb===1){
				//どっちも線分の場合
				Vec3.sub(cross2,A2,A1);
				Vec3.madd(ans1,A1,cross2,checkLINE_LINE_(A1,A2,B1,B2,axis));
				Vec3.sub(ans2,ans1,axis);
				Vec3.poolFree(2);
				return;
			}

			var As=[A1,A2,A3,A1];
			var Bs=[B1,B2,B3,B1];

			if(idxb===3){
				Vec3.cross2(cross,B1,B2,B3);
				Vec3.norm(cross);
				//三角B1B2B3の上にA1A2A3のどれかがあるか
				for(var j=0;j<idxa;j++){
					var p = As[j];
					for(var i=0;i<3;i++){
						var v1 = Bs[i];
						var v2 = Bs[i+1];
						Vec3.sub(cross2,v2,v1);
						Vec3.cross(cross2,cross,cross2);
						if(Vec3.dot(cross2,v1)>Vec3.dot(cross2,p)){
							break;
						}
					}
					if(i===3){
						Vec3.copy(ans1,p);
						Vec3.sub(ans2,ans1,axis);
						Vec3.poolFree(2);
						return;
					}
				}

				
			}

			if(idxa===3){
				//三角A1A2A3の上にB1B2B3のどれかがあるか
				Vec3.cross2(cross,A1,A2,A3);

				Vec3.norm(cross);
				for(var j=0;j<idxb;j++){
					var p = Bs[j];
					for(var i=0;i<3;i++){
						var v1 = As[i];
						var v2 = As[i+1];
						Vec3.sub(cross2,v2,v1);
						Vec3.cross(cross2,cross,cross2);
						if(Vec3.dot(cross2,v1)>Vec3.dot(cross2,p)){
							break;
						}
					}
					if(i===3){
						Vec3.copy(ans2,p);
						Vec3.add(ans1,ans2,axis);
						Vec3.poolFree(2);
						return;
					}
				}
			}

			//線分同士が交差するか
			if(idxa===2)idxa===1;
			if(idxb===2)idxb===1;
			for(var j=0;j<idxa;j++){
				var a1=As[j];
				var a2=As[j+1];
				for(var i=0;i<idxb;i++){
					var b1=Bs[i];
					var b2=Bs[i+1];

					var l=checkLINE_LINE(a1,a2,b1,b2,axis);
					if(l>=0 && l<=1){
						Vec3.sub(cross2,a2,a1);
						Vec3.madd(ans1,a1,cross2,l);
						Vec3.sub(ans2,ans1,axis);
						Vec3.poolFree(2);
						return;
					}
					
				}
			}

			//普通はここに到達しない
			//精度か何かの問題があるとここまでくる
			Vec3.add(ans1,A1,A2);
			Vec3.add(ans1,ans1,A3);
			Vec3.mul(ans1,ans1,0.333333);
			Vec3.sub(ans2,ans1,axis);

			Vec3.poolFree(2);
			return 0;

		}

		var closestFace=function(){
			this.v=new Array(3);
			this.cross = new Vec3();
			this.len = 0;
		}
		var vertices=[];
		var vertices1=[];
		var faces=[];
		var edges=[];
		var edgesIndex;
		var faceIndex;
		var idx;
		for(var i=0;i<256;i++){
			vertices.push(new Vec3());
			vertices1.push(new Vec3());
			faces.push(new closestFace());
			var edge=[-1,-1];
			edges.push(edge);
		}

		var line_zero = function(ans,l1,l2){
			var ret;
			var dir =Vec3.poolAlloc();
			Vec3.sub(dir,l2,l1); //線分の向き
			var r = -Vec3.dot(dir,l1);
			if(r <= 0){
				//始点未満
				Vec3.copy(ans,l1);
				ret=-1;
			}else{
				var r2 = Vec3.scalar2(dir);
				if( r > r2){
					//終点超え
					Vec3.copy(ans,l2);
					ret=1;
				}else{
					Vec3.madd(ans,l1,dir, r/r2);
					ret=0;
				}
			}
			Vec3.poolFree(1);
			return ret;
		}
		var triangleCheck=function(t1,t2,t3){
			var cross = Vec3.poolAlloc();
			var cross2 = Vec3.poolAlloc();

			Vec3.cross2(cross,t1,t2,t3);

			var ts=[t1,t2,t3,t1];
			var ret=0;

			for(var i=0;i<3;i++){
				var v1 = ts[i];
				var v2 = ts[i+1];
				Vec3.sub(cross2,v2,v1);
				Vec3.cross(cross2,cross,cross2);
				if(Vec3.dot(cross2,v1)>0){
					ret=(i+1)<<1;
					break;
				}
			}
			Vec3.poolFree(2);
			return ret;

		}

		var triangle_zero=function(ans,t1,t2,t3){
			var dir = Vec3.poolAlloc(); 
			var cross = Vec3.poolAlloc();
			Vec3.cross2(cross,t1,t2,t3);

			var ts=[t1,t2,t3,t1,t2];

			var res =triangleCheck(t1,t2,t3);
			if(res===0){
				//面の上にいる場合
				Vec3.mul(ans,cross,Vec3.dot(cross,t1)/Vec3.scalar2(cross));
			}else{
				//辺の外側にいる場合
				var r = (res>>1) -1;

				var v1 = ts[r];
				var v2 = ts[r+1];
				var v3 = ts[r+2];
				Vec3.sub(dir,v2,v1); //線分の向き

				var l=-Vec3.dot(v1,dir);
				var _l=Vec3.dot(dir,dir);
				if(l<0){
					//辺の始点より外の場合
					res+=line_zero(ans,v1,v3);

				}else  if(l>_l){
					//辺の終点より外の場合
					res+=line_zero(ans,v3,v2);
				}else{
					Vec3.madd(ans,v1,dir,l/_l);
				}
				
			}
			Vec3.poolFree(2);
			return res;

		}
		var addFaceBuf=new Vec3();
		var addFace = function(v1,v2,v3,obj1,obj2){
			var vs = vertices;
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

			//現状4つの距離を計算
			Vec3.set(face.v,v1,v2,v3);
			Vec3.cross2(face.cross,vs[v1],vs[v2],vs[v3]);
			Vec3.norm(face.cross);
			face.len = Vec3.dot(face.cross,vs[v1]);

			if(face.len<0){
				face.len*=-1;
			}else{
				Vec3.mul(face.cross,face.cross,-1);
			}

			return face;
		}
		for(var i=0;i<128;i++){
			var edge=[-1,-1];
			edges.push(edge);
		}
		var addEdge = function(v1,v2){
			for(var j=0;j< edgesIndex;j++){
				if((edges[j][0]===v1 && edges[j][1]===v2)
				|| (edges[j][0]===v2 && edges[j][1]===v1)){
					//既に同一エッジがある場合は追加せず既存のも無効化
					edges[j][0]=-1;
					return;
					
				}
			}
			//無効インデックスを探す
			for(var j=0;j< edgesIndex;j++){
				if(edges[j][0]<0){
					break;
				}
			}
			if(j>=edgesIndex){
				//エッジ増えたらインデックスを増やす
				edgesIndex++;
			}
			var edge=edges[j];
			edge[0]=v1;
			edge[1]=v2;
		}
	return function(ans1,ans2,obj1,obj2){
		var s= Vec3.poolAlloc();
		var s1= Vec3.poolAlloc();
		var vbuf= Vec3.poolAlloc();
		var axis= Vec3.poolAlloc();
		var v=vertices;
		var v1=vertices1;
		var distance=-1;

		//中心
		Vec3.add(axis,obj1.AABB.min,obj1.AABB.max);
		Vec3.sub(axis,axis,obj2.AABB.min);
		Vec3.sub(axis,axis,obj2.AABB.max);
		Vec3.mul(axis,axis,0.5);


		//1個目の頂点を取る
		obj1.calcSupport(v1[0],axis);
		Vec3.mul(axis,axis,-1);
		obj2.calcSupport(v[0],axis);
		Vec3.sub(v[0],v1[0],v[0]);
		Vec3.mul(axis,v[0],1);
		idx=1;

		var counter=0;
		var hitflg=false ;
		while(1){
			//axisの向きで一番近い点をとる

			obj1.calcSupport(s1,axis);
			Vec3.mul(axis,axis,-1);
			obj2.calcSupport(s,axis);
			Vec3.sub(s,s1,s);
			Vec3.mul(axis,axis,-1);

			//現状の最短を求める
			var min=Vec3.dot(v[0],axis);
			for(var i=1;i<idx;i++){
				var l =Vec3.dot(v[i],axis);
				if(l<min){
					min=l;
				}
			}
		
			if(Vec3.dot(s,axis)>min-0.0001){
				//取得した点が最短と同じなら外判定
				break;
			}


			//現在の取得点から目標点までの最短点を求める
			if(idx===1){
				Vec3.copy(v[idx],s);
				Vec3.copy(v1[idx],s1);
				line_zero(axis,v[0],v[1]);

				min=Vec3.scalar2(axis);
				if(min<0.00001){
					//接触している場合は適当に垂直な方向をとる
					axis[0]=-(v[0][1]-v[1][1]);
					axis[1]=v[0][2]-v[1][2];
					axis[2]=v[0][0]-v[1][0];

					if(Vec3.dot(axis,v[0])<0){
						Vec3.mul(axis,axis,-1);
					}
				}
				idx++;
			}else if(idx===2){
				Vec3.copy(v[idx],s);
				Vec3.copy(v1[idx],s1);

				triangle_zero(axis,v[0],v[1],v[2]);
				min=Vec3.scalar2(axis);
				if(min<0.00001){
					//接触している場合は適当に垂直な方向をとる
					Vec3.cross2(axis,v[0],v[1],v[2]);
					if(Vec3.dot(axis,v[0])<0){
						Vec3.mul(axis,axis,-1);
					}
				}
				idx++;
			}else{
				if(idx===3){
					Vec3.copy(v[idx],s);
					Vec3.copy(v1[idx],s1);
					idx++;
				}else{
					Vec3.copy(v[3],s);
					Vec3.copy(v1[3],s1);
				}
				var farIndex=-1;
				var min=-1;
				for(var i=0;i<4;i++){
					var t4=v[i];
					var t1=v[(i+1)&3];
					var t2=v[(i+2)&3];
					var t3=v[(i+3)&3];
					Vec3.cross2(vbuf,t1,t2,t3);
					var l1=Vec3.dot(t1,vbuf); //原点から面までの距離
					var l2=Vec3.dot(t4,vbuf)-l1; //面からもうひとつの頂点までの距離

					if( l1*l2>0){
						//四面体に内包されない
						var l=triangle_zero(vbuf,t1,t2,t3);
						var m=Vec3.scalar2(vbuf);
						if(farIndex<0 || m<min | l===0){
							min=m;
							farIndex=i;
							Vec3.copy(axis,vbuf);
						}
						if(l===0){
							break;
						}
					}
				}
				if(farIndex<0){
					//内包する場合
					hitflg=true;
					break;
				}
				Vec3.copy(v[farIndex],v[3]);
				Vec3.copy(v1[farIndex],v1[3]);

			}

			//無限ループ対策
			counter++;
			if(counter === 32){
				console.log("l!!");
			}
			if(counter>33){
				console.log("loooop!!");
				break;
			}

		}

		if(!hitflg){
			//内包してない場合の処理

			//ミンコフスキー差の一番近いとこを再計算する
			if(idx===1){
				Vec3.copy(axis,v[0]);
			}else if(idx===2){
				var ret= line_zero(axis,v[0],v[1]);
				if(ret===-1){
					idx=1;
				}else if(ret===1){
					idx=1;
					Vec3.copy(v[0],v[1]);
					Vec3.copy(v1[0],v1[1]);
				}
			}else{
				var ret=triangle_zero(axis,v[0],v[1],v[2]);
				if(ret&1){
					//最近が角の場合
					idx=1;
					ret = ret>>1;
					Vec3.copy(axis,v[ret]);
				}else if(ret){
					//最近が辺の場合
					idx=2;
					ret = (ret>>1)-1;
					Vec3.copy(v[0],v[ret]);
					Vec3.copy(v1[0],v1[ret]);
				}

			}
			if(!ans1 || !ans2){
				//接触判定のみの場合は距離だけ求める
			}else{
				//両オブジェクトの最近点算出
				var v2=[];
				for(var i=0;i<idx;i++){
					v2.push(new Vec3());
					Vec3.sub(v2[i],v1[i],v[i]);
				}
				if(idx===1){
					//頂点が1個の場合はそれぞれの頂点が最近点
					Vec3.copy(ans1,v1[0]);
					Vec3.copy(ans2,v2[0]);
				}else if(idx===2){
					//頂点が2個の場合はどっちかが点
					if(Vec3.len2(v1[0],v1[1])<Vec3.len2(v2[0],v2[1])){
						Vec3.copy(ans1,v1[0]);
						Vec3.sub(ans2,ans1,axis);
					}else{
						Vec3.copy(ans2,v2[0]);
						Vec3.add(ans1,axis,ans2);
					}
				}else{

					TRIANGLE_TRIANGLE__(ans1,ans2,axis,v1[0],v1[1],v1[2]
						,v2[0],v2[1],v2[2]);
				}
			}
			distance=Vec3.scalar(axis);
			
		}else if(ans1 || ans2){

			//内包する場合
			faceIndex=0;
			idx=4;
			counter=0;
			for(var i=0;i<idx;i++){ 
				//現状4つの面を追加
				addFace(i,(i+1)&3,(i+2)&3,obj1,obj2);
			}
			var face;
			var min;
			while(1){
				//最短面探索
				for(var i=0;i<faceIndex;i++){
					if(faces[i].len>=0){
						face=faces[i];
						min=face.len;
						break;
					}
				}
				for(;i<faceIndex;i++){
					if(faces[i].len<min && faces[i].len>=0){
						face=faces[i];
						min=face.len;
					}
				}

				//最短面の法線取得
				Vec3.copy(axis,face.cross);
				//サポ射
				obj1.calcSupport(s1,axis);
				Vec3.mul(axis,axis,-1);
				obj2.calcSupport(s,axis);
				Vec3.sub(s,s1,s);


				//終了チェック
				if(Vec3.dot(s,axis) < face.len + 0.00001){
					
					break;
				}

				//終了しなかった場合はその点を追加
				Vec3.copy(v[idx],s);
				Vec3.copy(v1[idx],s1);

				edgesIndex=0;
				for(var i=0;i<faceIndex;i++){
					//追加した頂点に関係する面を探す
					var face=faces[i];
					if(face.len<0){
						//無効面はスルー
						continue;
					}
					Vec3.sub(vbuf,s,v[face.v[0]]);
					if(Vec3.dot(vbuf,face.cross)<0){
						//面のエッジを追加
						addEdge(face.v[0],face.v[1]);
						addEdge(face.v[1],face.v[2]);
						addEdge(face.v[2],face.v[0]);
						//face削除
						face.len=-1;
					}
				}
				for(var i=0;i<edgesIndex;i++){
					if(edges[i][0]<0){
						continue;
					}
					//新たなfaceを追加、
					addFace(edges[i][0],edges[i][1],idx,obj1,obj2);
				}
				idx++;


				//無限ループ対策
				counter++;
				if(counter === 32){
					console.log("l!!");
				}
				if(counter>33){
					console.log("loooop!!");
					Vec3.poolFree(4);
					return 0;
				}
			}

			//最短faceを探す
			for(var i=0;i<faceIndex;i++){
				var f=faces[i];
				if(f.len<0){
					//無効面はスルー
					continue;
				}
				if(triangleCheck(v[f.v[0]],v[f.v[1]],v[f.v[2]])){
					continue;
				}
				min =f.len;
				face = f;
				break;
			}
			for(;i<faceIndex;i++){
				var f=faces[i];
				if(f.len<0){
					//無効面はスルー
					continue;
				}
				if(triangleCheck(v[f.v[0]],v[f.v[1]],v[f.v[2]])){
					continue;
				}
				if(min>f.len){
					min =f.len;
					face = f;
				}
			}
			//両三角のめり込み点を求める
			var V1=[v1[face.v[0]],v1[face.v[1]],v1[face.v[2]]];
			var V2=[];
			for(var i=0;i<3;i++){
				V2.push(new Vec3());
				Vec3.sub(V2[i],v1[face.v[i]],v[face.v[i]]);
			}
			Vec3.mul(axis,face.cross,-face.len);

			TRIANGLE_TRIANGLE__(ans1,ans2,axis
					,V1[0],V1[1],V1[2]
					,V2[0],V2[1],V2[2]);
			
			distance=-Vec3.len(ans1,ans2);
		}
		Vec3.poolFree(4);
		return distance;
	};
	})();

	var AABBNode_ANY =function(ans1,ans2,node,col2){
		//AABBツリーと何かの判定
		if(!AABB.hitCheck(node.AABB,col2.AABB)){
			return 9999999;
		}
		if(node.element){
			return calcClosestWithoutBold(ans1,ans2,node.element,col2);
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


	//特定の組み合わせ用最近計算アルゴリズム
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

	
	var SPHERE_LINE2 = function(p0,p1,p2,r) {
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

	var TRIANGLE_LINE=function(p1,t0,t1,t2){
		var cross=Vec3.poolAlloc();
		var dt=Vec3.poolAlloc();
		var ret=0;
		Vec3.sub(dt,t1,t0);

		var vs=[t0,t1,t2,t0,t1];
		for(var j=0;j<3;j++){
			Vec3.cross(cross,p1,dt); //線と辺に垂直なベクトル
			Vec3.sub(dt,vs[j+2],vs[j+1]);
			if(Vec3.dot(cross,vs[j])*Vec3.dot(cross,dt)>0){
				//辺の外の場合はずれ
				ret=j+1;
				break;
			}
		}
		Vec3.poolFree(2);
		return ret;
	}


	return ret;
})();
