# SDR BT.709 (BT.1886) -> HDR10 (BT.2020 / PQ) inverse tone-mapping 3D LUT
import numpy as np, sys
N=65; peak=1000.0; ref=203.0
k=peak/ref-1.0; p=4.0
g=np.linspace(0,1,N)
b,gg,r=np.meshgrid(g,g,g,indexing='ij')   # cube order: R fastest
rgb=np.stack([r,gg,b],-1).reshape(-1,3)
lin=rgb**2.4
Y=lin@np.array([0.2126,0.7152,0.0722])
gain=ref*(1+k*Y**p)                         # nits per unit linear
nits=lin*gain[:,None]
M=np.array([[0.6274,0.3293,0.0433],[0.0691,0.9195,0.0114],[0.0164,0.0880,0.8956]])
n2020=np.clip(nits@M.T,0,10000)/10000.0
m1,m2,c1,c2,c3=0.1593017578125,78.84375,0.8359375,18.8515625,18.6875
y=n2020**m1; pq=((c1+c2*y)/(1+c3*y))**m2
with open(sys.argv[1],'w') as f:
    f.write(f"LUT_3D_SIZE {N}\n")
    np.savetxt(f,pq,fmt="%.6f")
