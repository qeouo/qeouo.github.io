"use strict"
var Sort = (function(){
	var ret=function(){};

	//バケットソート用バッファ
	var backet= new Array(16);//2^4
	var backetIndex=new Array(16);
	for(var i=0;i<backet.length;i++){
		backet[i]=new Array(1024);//大きさは適当(良くない)
	}
	ret.backetSort=function(arr,n,func,first,last){
		//基数ソートのためのバケットソート
		//
		for(var i=0;i<backet.length;i++){
			//バケツインデックス初期化
			backetIndex[i]=0;
		}
		if(!func){
			func=function(a){return a;};
		}

		for(var i=first;i<=last;i++){
			//基数を求めそのバケツに入れる
			var a=(func(arr[i])>>n)&15;
			backet[a][backetIndex[a]]=arr[i];
			backetIndex[a]++;
		}

		var arrIndex=first;
		for(var i=0;i<backet.length;i++){
			//バケツから取り出して並べる
			for(var j=0;j<backetIndex[i];j++){
				arr[arrIndex]=backet[i][j];
				arrIndex++;
			}
		}
	}
	ret.kisu=function(arr,func,first,last){
		//基数ソート
		for(var n=0;n<32;n+=4){
			//下から4ビットずつを基底に計8回バケツソートする
			this.backetSort(arr,n,func,first,last);
		}
	}

	//クイックソート
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

