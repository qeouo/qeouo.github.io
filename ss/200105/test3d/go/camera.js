Engine.goClass.camera= (function(){
	var GoCamera=function(){};
	var ret = GoCamera;
	inherits(ret,Engine.defObj);

	var ono3d = Engine.ono3d;

	var camera = Engine.camera;

	ret.prototype.init=function(){
		Vec3.set(this.p,0,0,20);
		this.target = new Vec3();
		Vec3.set(this.target,0,0,0);
		this.cameralen=8;


	}
	ret.prototype.move=function(){
		var vec3=this.target;




		if(Util.pressOn && !Engine.go.main.bane){
			this.a[1]-=(Util.cursorX-Util.oldcursorX)/Engine.WIDTH;
			this.a[0]-=((Util.cursorY-Util.oldcursorY)/Engine.HEIGHT);

		}
		this.a[0] =Math.min(this.a[0],Math.PI/2);
		this.a[0] =Math.max(this.a[0],-Math.PI/2);
		this.p[2]=Math.cos(this.a[0]);
		this.p[1]=-Math.sin(this.a[0]);
		this.p[0]=-Math.sin(this.a[1])*this.p[2];
		this.p[2]=-Math.cos(this.a[1])*this.p[2];

		Vec3.mul(this.p,this.p,this.cameralen);

		Vec3.add(this.p,this.p,this.target);


		camera.p[0]+=(this.p[0]-camera.p[0])*0.3
		camera.p[1]+=(this.p[1]-camera.p[1])*0.3
		camera.p[2]+=(this.p[2]-camera.p[2])*0.3


		homingCamera(camera.a,vec3,camera.p);

		

		var light = Engine.ono3d.environments[0].sun;
		Mat44.dot(light.viewmatrix2,ono3d.projectionMatrix,ono3d.viewMatrix);

	}
	ret.prototype.draw=function(){
	}


	var homingCamera = ret.homingCamera=function(angle,target,camera){
		var dx=target[0]-camera[0]
		var dy=target[1]-camera[1]
		var dz=target[2]-camera[2]
		angle[0]=Math.atan2(dy,Math.sqrt(dz*dz+dx*dx));
		angle[1]=Math.atan2(dx,dz);
		angle[2]=0;
		
	}
	return ret;
})();

