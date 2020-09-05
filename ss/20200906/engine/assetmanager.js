var AssetManager=(function(){
	var AssetManager={};
	var ret=AssetManager;
	var ono3d;

	ret.assetList=[];
	ret.texture=function(path,func){
		if(!this.assetList[path]){
			this.assetList[path]=Ono3d.loadTexture(path,func);
		}
		return this.assetList[path];
	}
	ret.bumpTexture=function(path,func){
		if(!this.assetList[path]){
			this.assetList[path]=Ono3d.loadBumpTexture(path,func);
		}
		return this.assetList[path];
	}

	ret.o3o=function(path,func){
		if(!this.assetList[path]){
			this.assetList[path]=O3o.load(path,func);
		}
		return this.assetList[path];
	}


	return ret;
})();
