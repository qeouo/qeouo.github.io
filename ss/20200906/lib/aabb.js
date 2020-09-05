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

	var aabbBuf= new AABB();
	ret.aabbCast = function(ang,aabb1,aabb2){
		Vec3.sub(aabbBuf.min,aabb1.min,aabb2.max);
		Vec3.sub(aabbBuf.max,aabb1.max,aabb2.min);
		
		return this.hitCheckLine(aabbBuf,Vec3.ZERO,ang);

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
