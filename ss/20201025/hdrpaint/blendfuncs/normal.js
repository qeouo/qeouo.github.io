Hdrpaint.blendfuncs["normal"] = function(dst,d_idx,src,s_idx,alpha,power){
	var src_alpha=src[s_idx+3]*alpha;
	var sa = src[s_idx+3]*alpha;
	var da = dst[d_idx+3]*(1-sa);
	var dst_r = (1 - sa);

	var r = da+sa;
	if(r==0){
	   return;
	}
	r=1/r;
	da*=r;
	sa*=r;

	sa = power*sa;

	dst[d_idx+0]=dst[d_idx+0] * da  +  src[s_idx+0]*sa;
	dst[d_idx+1]=dst[d_idx+1] * da  +  src[s_idx+1]*sa;
	dst[d_idx+2]=dst[d_idx+2] * da  +  src[s_idx+2]*sa;
	dst[d_idx+3]=dst[d_idx+3] * dst_r +  src_alpha;

}
