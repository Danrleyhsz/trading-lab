param([string]$src,[string]$out)
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
public static class DayArt2 {
  static byte C(double v){ return (byte)Math.Max(0, Math.Min(255, Math.Round(v))); }
  // Converts night window glass (sky and skyline) inside the given rectangles to a daytime palette.
  public static void Windows(byte[] px, int stride, int[] rects){
    for(int k=0;k<rects.Length;k+=4){
      int x0=rects[k], y0=rects[k+1], x1=rects[k+2], y1=rects[k+3];
      for(int y=y0;y<y1;y++){
        double t=(double)(y-y0)/Math.Max(1,y1-y0);
        for(int x=x0;x<x1;x++){
          int i=y*stride+x*4; double b=px[i], g=px[i+1], r=px[i+2];
          double L=0.299*r+0.587*g+0.114*b, blueness=b-Math.Max(r,g);
          bool warm = r>150 && g>110 && b<140;           // lit windows / lamps: keep
          bool green = g>r+15 && g>b;                     // plants: keep
          if(warm||green) continue;
          if(blueness>18 || (r>b && b>g+25 && L<150)){      // navy sky, blue/purple buildings, magenta haze
            if(L<58 || t<0.28){                                      // open sky
              px[i+2]=C(88+50*t+L*0.3); px[i+1]=C(168+40*t+L*0.3); px[i]=C(246);
            } else {                                       // buildings in daylight: pale blue-grey
              double l=Math.Min(1,(L-58)/80.0);
              px[i+2]=C(112+70*l); px[i+1]=C(146+62*l); px[i]=C(196+40*l);
            }
          }
        }
      }
    }
  }
  // Mild daylight on the whole scene (warm, brighter shadows); windows were handled above.
  public static void Ambient(byte[] px){
    for(int i=0;i<px.Length;i+=4){
      double b=px[i], g=px[i+1], r=px[i+2];
      px[i+2]=C(r*1.08+14); px[i+1]=C(g*1.08+12); px[i]=C(b*1.02+6);
    }
  }
}
"@
$img=[System.Drawing.Bitmap]::FromFile($src)
$bmp=New-Object System.Drawing.Bitmap $img.Width,$img.Height,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g=[System.Drawing.Graphics]::FromImage($bmp); $g.DrawImage($img,0,0,$img.Width,$img.Height); $g.Dispose(); $img.Dispose()
$rect=New-Object System.Drawing.Rectangle 0,0,$bmp.Width,$bmp.Height
$data=$bmp.LockBits($rect,[System.Drawing.Imaging.ImageLockMode]::ReadWrite,$bmp.PixelFormat)
$bytes=New-Object byte[] ($data.Stride*$bmp.Height)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0,$bytes,0,$bytes.Length)
[DayArt2]::Ambient($bytes)
[DayArt2]::Windows($bytes,$data.Stride,[int[]]@(235,12,628,92, 645,12,1250,92, 1265,12,1778,92))
[System.Runtime.InteropServices.Marshal]::Copy($bytes,0,$data.Scan0,$bytes.Length)
$bmp.UnlockBits($data)
$bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
"saved $out"

