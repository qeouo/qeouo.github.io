"use strict"
var Objman=(function(){

	var hitmap=[0,1]
	,OBJ_NUM = 256
	var Obj = (function(){
		var ret=function(){
			this.p = new Vec3()
			this.v = new Vec3()
			this.a = 0
			this.t =0 
			this.pat=0
			this.flg=0
			this.id=0
			this.func=null
			this.z = 0
			this.hitarea=[0,0]
			this.kind=0
		}
		return ret
		
	})()

	var ret = function(){
		var i
		var objs=null
		var ID=0
		objs= new Array(OBJ_NUM)
		for(i = objs.length;i--;){
			objs[i] = new Obj()
		}
		this.objs=objs
		
		
		this.createObj = function(func){
			var i
			var obj
			var objs=this.objs
			for(i=OBJ_NUM;i--;){
				if(objs[i].flg)continue
				obj=objs[i]
				obj.func=func
				obj.flg=1
				obj.t=0
				obj.pat=0
				obj.id=ID
				obj.val=0
				obj.z=0
				obj.func.f_create(obj,0)
				ID++
				return objs[i]
			}
			return null
		}
		this.deleteObj = function(obj){
			obj.func=null
			obj.flg = 0
			obj.kind=0
		}
		this.createBullet = function(func,x,y,a,s,f){
			var obj_ = createObj(func)
			if(obj_==null)return
			obj_.p[0] = x
			obj_.p[1] = y
			obj_.val = f
			obj_.a = a
			obj_.v[0] = Math.cos(a/2048*Math.PI)
			obj_.v[1] = Math.sin(a/2048*Math.PI)
			Vec3.mult(obj_.v,obj_.v,s)
		}
		this.move = function(){
			var obj,i,j,obj2
			var objs=this.objs

			qSort(objs,0,OBJ_NUM-1)

			for(i = 0;i < OBJ_NUM ;i++){
				obj=objs[i]
				if(!obj.flg)continue
				obj.func.f_move(obj,0)
				obj.t++
				//obj.z=obj.p[2]*1024+(obj.id&1023)
			}
				for(i=OBJ_NUM;i--;){
					obj=objs[i]
					if(!obj.kind)continue
					for(j=i;j--;){
						obj2=objs[j]
						if(!(hitmap[obj.kind]&obj2.kind))continue
						if(Vec3.len(obj.p,obj2.p)>obj.hitarea[0]+obj2.hitarea[0])continue
						obj.func.f_hit(obj,obj2)
						obj2.func.f_hit(obj2,obj)
					}
				}
			Util.oldcursorX = Util.cursorX
			Util.oldcursorY = Util.cursorY
			Util.wheelDelta = 0
		}
		this.draw =function (){
			var obj,i,j,obj2
			var objs=this.objs
			for(i = OBJ_NUM; i--;){
				obj=objs[i]
				if(!obj.flg)continue
				obj.func.f_draw(obj,0)
			}
		}
	}
	function hcheckRect(p0,s0,p1,s1){
		if((Math.abs(p1[0]-p0[0])<=(s0[0]+s1[0]))
		&& (Math.abs(p1[1]-p0[1])<=(s0[1]+s1[1]))){
			return 1
		}
		return 0
	}

	ret.Obj=Obj
	ret.defObj = function(obj,msg,param){
		switch(msg){
		case OM_MOVE:
			break
		}
	}
	var qSort = function(target,first,last){
		if(last<=first)return
		
		var 
		i=first
		,j=last
		,p=target[last+1+first>>1].z
		,buf
	
		while(1){
			while(target[i].z<p)i++
			while(target[j].z>p)j--
			if(i>=j)break
			buf=target[i]
			target[i]=target[j]
			target[j]=buf
			i++,j--
			if(i>last || j<first)break
		}
	
		qSort(target,first,i-1)
		qSort(target,j+1,last)
		return
	}
	return ret
})()
