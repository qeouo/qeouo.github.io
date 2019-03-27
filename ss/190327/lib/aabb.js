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
		//2‚Â‚ÌAABB‚ğ“à•ï‚·‚éAABB‚ğì¬
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
		//2‚Â‚ÌAABB‚ªd‚È‚Á‚Ä‚¢‚é‚©
		for(var i=0; i<DIMENSION; i++){
			if(a.min[i]>b.max[i]
			|| a.max[i]<b.min[i]){
				return false;
			}
		}
		return true;
	}

	ret.hitCheckLine= function(a,p0,p1){
		//AABB‚Æü•ªp0p1‚ªÚG‚µ‚Ä‚¢‚é‚©
		var min=-99999;
		var max=99999;
		var t = Vec3.poolAlloc();
		Vec3.sub(t,p1,p0); //ü‚ÌŒX‚«

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
				//•½s‚Èê‡
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
		//•¡”‚ÌÀ•W‚ğ“à•ï‚·‚éAABB‚ğ‹‚ß‚é
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
