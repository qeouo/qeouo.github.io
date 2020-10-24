var Delaunay=(function(){
	var Delaunay = {};
	var ret=Delaunay;

	var Triangle=function(){
		this.pIdx=[-1,-1,-1,-1];
		this.p=[-1,-1,-1,-1];
		this.center = new Vec3();
		this.r=0;
	}
	Triangle.prototype.calcSupport=function(axis){
		var m= Vec3.dot(this.p[0],axis);
		for(var j=1;j<4;j++){
			m = Math.min(m,Vec3.dot(this.p[j],axis));
		}
		return m;
		
	}

	ret.create=function(points){
		var triangles=[];

		//内包矩形算出
		var min = new Vec3();
		var max = new Vec3();
		Vec3.copy(min,points[0]);
		Vec3.copy(max,points[0]);
		for(var i=1;i<points.length;i++){
			min[0]=Math.min(min[0],points[i][0]);
			min[1]=Math.min(min[1],points[i][1]);
			min[2]=Math.min(min[2],points[i][2]);
			max[0]=Math.max(max[0],points[i][0]);
			max[1]=Math.max(max[1],points[i][1]);
			max[2]=Math.max(max[2],points[i][2]);
		}

		//最外三角作成
		var ans = new Vec3();
		Vec3.sub(ans,max,min);
		var r = Vec3.scalar(ans)*10;
		Vec3.madd(ans,min,ans,0.5);
		points.push(new Vec3());
		Vec3.set(points[points.length-1],ans[0]+r,ans[1]-r,ans[2]+r);
		points.push(new Vec3());
		Vec3.set(points[points.length-1],ans[0]-r,ans[1]-r,ans[2]+r);
		points.push(new Vec3());
		Vec3.set(points[points.length-1],ans[0],ans[1]+r,ans[2]+r);
		points.push(new Vec3());
		Vec3.set(points[points.length-1],ans[0],ans[1],ans[2]-r);

		var t= new Triangle();
		var l=points.length;
		t.pIdx[0]=l-4;
		t.pIdx[1]=l-3;
		t.pIdx[2]=l-2;
		t.pIdx[3]=l-1;
		Geono.getOuterCenter3(t.center,points[t.pIdx[0]],points[t.pIdx[1]],points[t.pIdx[2]],points[t.pIdx[3]]);
		t.r=Vec3.len2(t.center,points[t.pIdx[0]]);
		triangles.push(t);

		var addlist;
		var checkList= function(n){
			for(var k=0;k<addlist.length;k++){
				var e = addlist[k];
				if(( e.pIdx[0]==n.pIdx[2] && e.pIdx[1]==n.pIdx[1] && e.pIdx[2]==n.pIdx[0])
				|| ( e.pIdx[0]==n.pIdx[1] && e.pIdx[1]==n.pIdx[0] && e.pIdx[2]==n.pIdx[2])
				|| ( e.pIdx[0]==n.pIdx[0] && e.pIdx[1]==n.pIdx[2] && e.pIdx[2]==n.pIdx[1])
				|| ( e.pIdx[2]==n.pIdx[2] && e.pIdx[1]==n.pIdx[1] && e.pIdx[0]==n.pIdx[0])
				|| ( e.pIdx[2]==n.pIdx[1] && e.pIdx[1]==n.pIdx[0] && e.pIdx[0]==n.pIdx[2])
				|| ( e.pIdx[2]==n.pIdx[0] && e.pIdx[1]==n.pIdx[2] && e.pIdx[0]==n.pIdx[1])){
					addlist.splice(k,1);
					return;
				};
			}
			addlist.push(n);
		}
		for(var i=0;i<points.length-4;i++){
			addlist=[];
			for(var j=triangles.length;j--;){
				var t=triangles[j];
				if(Vec3.len2(t.center,points[i])<t.r-0.01){
					var idx=[0,1,2,3,0,1];
					for(var k=0;k<4;k++){
						var n= new Triangle();
						n.pIdx[0]=t.pIdx[idx[k]];
						n.pIdx[1]=t.pIdx[idx[k+1]];
						n.pIdx[2]=t.pIdx[idx[k+2]];
						n.pIdx[3]=i;
						checkList(n);
					}
					triangles.splice(j,1);
				}
			}
			for(var j=0;j<addlist.length;j++){
				var t=addlist[j];
				Geono.getOuterCenter3(t.center,points[t.pIdx[0]],points[t.pIdx[1]],points[t.pIdx[2]],points[t.pIdx[3]]);
				if(!isNaN(t.center[0])){
					t.r=Vec3.len2(t.center,points[t.pIdx[0]]);
					triangles.push(t);
				}
			}
		}

		//最外三角削除
		l=points.length-4;
		for(var j=triangles.length;j--;){
			var t=triangles[j];
			if(t.pIdx[0]>=l || t.pIdx[1]>=l || t.pIdx[2]>=l|| t.pIdx[3]>=l){
				triangles.splice(j,1);
			}
		}
		points.splice(l,4);
		
		
		
		//三角錘の法線が外に向くように修正
		var n= new Vec3();
		var n2= new Vec3();
		for(var j=triangles.length;j--;){
			var t=triangles[j];
			Vec3.cross2(n,points[t.pIdx[0]],points[t.pIdx[1]],points[t.pIdx[2]]);
			Vec3.sub(n2,points[t.pIdx[3]],points[t.pIdx[0]]);
			if(Vec3.dot(n,n2)>0){
				var s = t.pIdx[0];
				t.pIdx[0]=t.pIdx[1];
				t.pIdx[1]=s;
			}
			for(var i=0;i<4;i++){
				t.p[i]=points[t.pIdx[i]];
			}
		}
		return triangles;
	}
	return Delaunay;
})();
