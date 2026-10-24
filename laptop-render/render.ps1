# AI 4K60 render for Windows: Real-ESRGAN -> de-plasticize blend -> RIFE 2x -> scene-cut fix
# -> H.265 10-bit HDR10 + SDR. Works on NVIDIA / AMD / Intel GPUs via Vulkan.
#
# Usage: drag a video onto run.bat, or:
#   powershell -ExecutionPolicy Bypass -File render.ps1 -Video "C:\path\video.mp4"
param(
    [Parameter(Mandatory = $true)][string]$Video,
    [string]$Model = "realesr-animevideov3",  # or realesrgan-x4plus (more detail, slower, 4x only)
    [double]$Blend = 0.30,                    # fraction of the original laid back over the AI output
    [int]$Grain = 5,
    [int]$Crf = 12,
    [string]$Preset = "slow",
    [int]$Gpu = -1                            # -1 = pick automatically
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Tools = Join-Path $Root "tools"
$In    = (Resolve-Path -LiteralPath $Video).Path
$Name  = [IO.Path]::GetFileNameWithoutExtension($In)
$OutDir = Split-Path -Parent $In
$Work  = Join-Path $Root "work_$Name"

function Step($msg) { Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Cyan }
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" } }

function Get-Tool($name, $url, $exe) {
    $dir = Join-Path $Tools $name
    $found = Get-ChildItem $dir -Recurse -Filter $exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
    Write-Host "Downloading $name ..."
    New-Item -ItemType Directory -Force $dir | Out-Null
    $zip = Join-Path $Tools "$name.zip"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $dir -Force
    Remove-Item $zip
    $found = Get-ChildItem $dir -Recurse -Filter $exe | Select-Object -First 1
    if (-not $found) { throw "$exe not found after downloading $name" }
    return $found.FullName
}

function Count-Png($dir) { (Get-ChildItem $dir -Filter *.png).Count }

# ------------------------------------------------------------------ tools
Step "Preparing tools (first run downloads ~600 MB)"
New-Item -ItemType Directory -Force $Tools | Out-Null
$ff      = Get-Tool "ffmpeg"  "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" "ffmpeg.exe"
$ffprobe = Join-Path (Split-Path $ff) "ffprobe.exe"
$esrgan  = Get-Tool "realesrgan" "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip" "realesrgan-ncnn-vulkan.exe"
$esrModels = Join-Path (Split-Path $esrgan) "models"
$rife    = Get-Tool "rife" "https://github.com/nihui/rife-ncnn-vulkan/releases/download/20221029/rife-ncnn-vulkan-20221029-windows.zip" "rife-ncnn-vulkan.exe"

# ------------------------------------------------------------------ probe
$fpsR = (& $ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 $In).Trim()
$p = $fpsR.Split("/"); $fps = [double]$p[0] / $(if ($p.Count -gt 1) { [double]$p[1] } else { 1 })
$Inv = [Globalization.CultureInfo]::InvariantCulture
$fpsS = $fps.ToString($Inv); $fps2 = ($fps * 2).ToString($Inv); $BlendS = $Blend.ToString($Inv)
$hasAudio = [bool](& $ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 $In)
Write-Host "Input: $In  ($fpsR fps, audio=$hasAudio)"

New-Item -ItemType Directory -Force $Work | Out-Null
Copy-Item (Join-Path $Root "sdr2hdr10.cube") $Work -Force
Set-Location $Work
foreach ($d in "in", "up", "bl", "rf") { New-Item -ItemType Directory -Force $d | Out-Null }

# ------------------------------------------------------------------ 1. frames
Step "1/6 Extracting frames"
if ((Count-Png "in") -eq 0) {
    & $ff -hide_banner -loglevel error -y -i $In -fps_mode passthrough "in/%08d.png"; Check "frame extract"
}
$N = Count-Png "in"
Write-Host "$N frames"

# ------------------------------------------------------------------ GPU pick
if ($Gpu -lt 0) {
    $probeDir = Join-Path $Work "gpuprobe"; New-Item -ItemType Directory -Force $probeDir | Out-Null
    # ncnn prints every Vulkan device at startup as "[id name]  ..."
    $ErrorActionPreference = "Continue"
    $log = & $esrgan -i "in/00000001.png" -o "$probeDir/x.png" -m $esrModels -n realesr-animevideov3 -s 2 -g 0 2>&1 | Out-String
    $ErrorActionPreference = "Stop"
    $gpus = [regex]::Matches($log, "\[(\d+) ([^\]]+)\]") | ForEach-Object { [pscustomobject]@{ Id = [int]$_.Groups[1].Value; Name = $_.Groups[2].Value } } |
        Group-Object Id | ForEach-Object { $_.Group[0] }
    $best = $gpus | Where-Object { $_.Name -match "NVIDIA|GeForce|RTX|GTX|Radeon RX|Arc" } | Select-Object -First 1
    if (-not $best) { $best = $gpus | Where-Object { $_.Name -notmatch "llvmpipe|SwiftShader|Basic Render" } | Select-Object -First 1 }
    $Gpu = if ($best) { $best.Id } else { 0 }
    Write-Host "GPUs found:"; $gpus | ForEach-Object { Write-Host "  [$($_.Id)] $($_.Name)" }
    Write-Host "Using GPU $Gpu" -ForegroundColor Green
    Remove-Item $probeDir -Recurse -Force
}

# ------------------------------------------------------------------ 2. ESRGAN
Step "2/6 AI upscale (Real-ESRGAN, $Model)"
$scale = if ($Model -match "x4") { 4 } else { 2 }
if ((Count-Png "up") -ne $N) {
    & $esrgan -i in -o up -m $esrModels -n $Model -s $scale -f png -g $Gpu; Check "Real-ESRGAN"
}
if ((Count-Png "up") -ne $N) { throw "Real-ESRGAN produced $(Count-Png 'up') of $N frames" }

# ------------------------------------------------------------------ 3. blend
Step "3/6 De-plasticize blend ($([int]($Blend*100))% original)"
if ((Count-Png "bl") -ne $N) {
    $fc = "[1:v]scale=3840:2160:flags=lanczos+accurate_rnd+full_chroma_int,format=rgb48le[lz];" +
          "[0:v]scale=3840:2160:flags=lanczos,format=rgb48le[up];" +
          "[lz][up]blend=all_opacity=$BlendS,format=rgb24"
    & $ff -hide_banner -loglevel error -y -framerate $fpsS -i "up/%08d.png" -framerate $fpsS -i "in/%08d.png" -filter_complex $fc -start_number 1 "bl/%08d.png"
    Check "blend"
}

# ------------------------------------------------------------------ 4. RIFE
Step "4/6 60fps interpolation (RIFE v4.6)"
if ((Count-Png "rf") -ne 2 * $N) {
    & $rife -i bl -o rf -m (Join-Path (Split-Path $rife) "rife-v4.6") -u -g $Gpu; Check "RIFE"
}
if ((Count-Png "rf") -ne 2 * $N) { throw "RIFE produced $(Count-Png 'rf') of $(2 * $N) frames" }

# scene cuts: RIFE would morph between two different shots, so repeat the previous frame instead
Step "5/6 Fixing scene cuts"
$ErrorActionPreference = "Continue"
$sc = & $ff -hide_banner -i $In -vf "scdet=threshold=10" -f null - 2>&1 | Out-String
$ErrorActionPreference = "Stop"
$cuts = [regex]::Matches($sc, "lavfi\.scd\.time: ([0-9.]+)") | ForEach-Object { [int][math]::Round([double]$_.Groups[1].Value * $fps) }
foreach ($c in $cuts) {
    if ($c -lt 1) { continue }
    Copy-Item ("rf/{0:D8}.png" -f (2 * $c - 1)) ("rf/{0:D8}.png" -f (2 * $c)) -Force
}
Write-Host "$($cuts.Count) cuts fixed"

# ------------------------------------------------------------------ 6. encode
Step "6/6 Encoding H.265 10-bit (HDR10 + SDR) - takes a while on a laptop CPU"
$audio = if ($hasAudio) { @("-map", "1:a:0", "-c:a", "aac", "-b:a", "256k") } else { @("-an") }
$common = @("-hide_banner", "-loglevel", "error", "-stats", "-y", "-framerate", $fps2, "-i", "rf/%08d.png", "-i", $In, "-map", "0:v")

$hdrVf = "noise=alls=${Grain}:allf=t+u,scale=in_range=pc:flags=accurate_rnd+full_chroma_int,format=rgb48le," +
         "lut3d=file=sdr2hdr10.cube:interp=tetrahedral," +
         "scale=out_color_matrix=bt2020:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p10le," +
         "setparams=color_primaries=bt2020:color_trc=smpte2084:colorspace=bt2020nc:range=tv"
$hdrX = "aq-mode=3:psy-rd=2.0:psy-rdoq=1.0:deblock=-1,-1:keyint=120:hdr10=1:hdr10-opt=1:repeat-headers=1:" +
        "colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:" +
        "master-display=G(13250,34500)B(7500,3000)R(34000,16000)WP(15635,16450)L(10000000,1):max-cll=1000,400:log-level=error"
$outHdr = Join-Path $OutDir "${Name}_4k60_ai_HDR10.mp4"
& $ff @common -vf $hdrVf -c:v libx265 -preset $Preset -crf $Crf -profile:v main10 -x265-params $hdrX -tag:v hvc1 `
    -color_primaries bt2020 -color_trc smpte2084 -colorspace bt2020nc @audio -shortest -movflags +faststart $outHdr
Check "HDR encode"

$sdrVf = "noise=alls=${Grain}:allf=t+u,scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p10le"
$outSdr = Join-Path $OutDir "${Name}_4k60_ai_SDR.mp4"
& $ff @common -vf $sdrVf -c:v libx265 -preset $Preset -crf $Crf -profile:v main10 `
    -x265-params "aq-mode=3:psy-rd=2.0:psy-rdoq=1.0:deblock=-1,-1:keyint=120:log-level=error" -tag:v hvc1 `
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 @audio -shortest -movflags +faststart $outSdr
Check "SDR encode"

Set-Location $Root
Remove-Item $Work -Recurse -Force
Step "Done"
Write-Host $outHdr -ForegroundColor Green
Write-Host $outSdr -ForegroundColor Green
