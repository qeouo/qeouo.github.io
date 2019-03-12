"use strict"
var WebAudio= (function(){
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var context = new AudioContext();

	var ret=function(){}
	ret.loadSound= function(url, func) {
		// 音声ファイルロード
		var res = {};

		var req = new XMLHttpRequest();
		req.responseType = 'arraybuffer';

		req.onreadystatechange = function() {
			if (req.readyState === 4) {
				if (req.status === 0 || req.status === 200) {
					context.decodeAudioData(req.response,function(buffer){
						res.audioBuffer=buffer;
						if(func){
							func(res);
						}
					});

				}
			}
		};

		req.open('GET', url, true);
		req.send('');
		return res;
	};

	ret.playSound = function(data) {
		// 再生
		var source = context.createBufferSource();
		source.buffer = data.audioBuffer;
		source.connect(context.destination);
		source.start(context.currentTime + 2,0,10);
	};
	return ret;
})();
