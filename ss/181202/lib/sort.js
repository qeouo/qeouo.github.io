"use strict"
var Sort = (function(){
	var ret=function(){
	};

	var backet= new Array(16);//2^4
	var backetIndex=new Array(16);
	for(var i=0;i<backet.length;i++){
		backet[i]=new Array(1024);
	}
	ret.backetSort=function(arr,n,func){
		for(var i=0;i<backet.length;i++){
			backetIndex[i]=0;
		}

		if(!func){
			for(var i=0;i<arr.length;i++){
				var a=arr[i];
				if(a<0){
					break;
				}
				a=(a>>(n))&15;
				backet[a][backetIndex[a]]=arr[i];
				backetIndex[a]++;
			}
		}else{

			for(var i=0;i<arr.length;i++){
				//var a=arr[i].pairId;
				var a=func(arr[i]);
				if(a<0){
					break;
				}
				a=(a>>(n))&15;
				backet[a][backetIndex[a]]=arr[i];
				backetIndex[a]++;
			}
		}
		var arrIndex=0;
		for(var i=0;i<backet.length;i++){
			for(var j=0;j<backetIndex[i];j++){
				arr[arrIndex]=backet[i][j];
				arrIndex++;
			}
		}
	}
	ret.kisu=function(arr,func){
		for(var n=0;n<8;n++){
			this.backetSort(arr,n*4,func);
		}
	}
	ret.qSort = function(target,first,last,func){
		if(last<=first){
			return;
		}
		
		var 
		i=first
		,j=last
		,p=target[last+1+first>>1]
		,buf
	
		while(1){
			while(func(target[i],p)<0)i++;
			while(func(target[j],p)>0)j--;
			if(i>=j)break;
			buf=target[i];
			target[i]=target[j];
			target[j]=buf;
			i++;
			j--;
			if(i>last || j<first){
				break;
			}
		}
	
		this.qSort(target,first,i-1,func);
		this.qSort(target,j+1,last,func);
		return
	}
	return ret;
})();

