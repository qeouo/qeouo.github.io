var Bsp= (function(){
	var Bsp= function(){
		this.m = 0;//平面と原点との距離
		this.v =new Vec3();//平面の法線
	}
	var ret = Bsp;

	var MAX = Math.max,
		MIN = Math.min;

	ret.prototype.hitCheck = function(p){
		return this.m <=Vec3.dot(p,this.v);
	}
	ret.Tree=function(){
		this.nodes=[];
		this.rootNode;
	}

	ret.Node = function(){
		this.child1=null;
		this.child2=null;
		this.element=null;
		this.collision = new Bsp();
	}
	var searchCount=0;
	ret.Tree.prototype.getItem=function(p){
		searchCount=0;
		var result = this.rootNode.getItem(p);
		this.searchCount=searchCount;

		return result;

	}
	ret.Node.prototype.getItem=function(p){

		var result=null;
		if(this.element){
			if(Geono.TETRA_POINT(null,p,this.element.p)){
				return this.element;
			}
			return null;
		}
		searchCount++;
		if(this.child1){
			if(this.child1.collision.hitCheck(p)){
				result = this.child1.getItem(p);
			}
		}
		if(result)return result;
		if(this.child2){
			if(this.child2.collision.hitCheck(p)){
				return this.child2.getItem(p);
			}
		}
	}
	ret.createBspTree = function(items){
		var tree=new Bsp.Tree();

		for(var i=0;i<items.length;i++){
			var node = new Bsp.Node();
			node.element=items[i];
			tree.nodes.push(node);
		}
		
		var axis=new Vec3(1,0,0);
		tree.rootNode=tree._createBspTree(0,tree.nodes.length-1,axis);
		return tree;
	}
	ret.Tree.prototype._createBspTree = function(first,last,aaa){
		var list = this.nodes;
		var node;
		if(first === last){
			node = list[first];
		}else{
			node = new Bsp.Node();
			this.nodes.push(node);
		}
		var m = list[first].element.calcSupport(aaa);
		for(var i=first+1;i<=last;i++){
			m = Math.min(m,list[i].element.calcSupport(aaa));
		}
		node.collision.m=m;
		Vec3.copy(node.collision.v,aaa);

		if(first === last){
			return node;
		}
		
		var axis = new Vec3();
		var t=list[first].element;
		Vec3.cross2(axis,t.p[2],t.p[1],t.p[0]);
		Vec3.norm(axis,axis);
		for(var i=first;i<=last;i++){
			var n = list[i];
			n.collision.m = n.element.calcSupport(axis);
		}
		Sort.qSort(list,first,last,function(a,b){return a.collision.m - b.collision.m});
		var center = (last+first)/2|0;

		node.child2=this._createBspTree(center+1,last,axis);

		Vec3.mul(axis,axis,-1);
		node.child1=this._createBspTree(first,center,axis);



		return node;
	}
	
	return ret;
})();
