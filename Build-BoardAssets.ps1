$ErrorActionPreference='Stop'
$root=$PSScriptRoot
# Published routes retain their existing filenames. Category folders are the source.
$themeSource=[IO.File]::ReadAllText((Join-Path $root 'wwwroot/board/themes/seljuk.js'))
foreach($mapping in [regex]::Matches($themeSource,"file:'([^']+)',url:'/([^']+)'")){
  $source=Join-Path $root ('wwwroot/'+$mapping.Groups[1].Value)
  $target=Join-Path $root ('wwwroot/'+$mapping.Groups[2].Value)
  if(!(Test-Path -LiteralPath $source)){throw "Missing board image: $source"}
  if($source -ne $target){Copy-Item -LiteralPath $source -Destination $target}
}
$sources=@(
  'wwwroot/board/registry.js',
  'wwwroot/board/themes/seljuk.js',
  'wwwroot/board/themes/winter.js',
  'wwwroot/board/terrain/geometry.js',
  'wwwroot/board/terrain/sight.js',
  'wwwroot/board/terrain/renderer.js',
  'wwwroot/board/towers/animation.js',
  'wwwroot/board/towers/renderer.js',
  'wwwroot/board/enemies/renderer.js',
  'wwwroot/game.js'
)
$bundle=($sources | ForEach-Object {[IO.File]::ReadAllText((Join-Path $root $_))}) -join "`n"
# New PNGs are embedded because this published server exposes only existing routes.
foreach($mapping in [regex]::Matches($themeSource,"file:'([^']+)',url:'/([^']+)'[^\r\n]*?embedded:true")){
  $source=Join-Path $root ('wwwroot/'+$mapping.Groups[1].Value)
  $data=[Convert]::ToBase64String([IO.File]::ReadAllBytes($source))
  $bundle=$bundle.Replace("url:'/"+$mapping.Groups[2].Value+"'","url:'data:image/png;base64,"+$data+"'")
}
$htmlPath=Join-Path $root 'Game/Labirent-TD.html'
$html=[IO.File]::ReadAllText($htmlPath)
$start=$html.IndexOf('<script>')
$end=$html.IndexOf('</script>',$start)
if($start -lt 0 -or $end -lt 0){throw 'Game script block not found.'}
$html=$html.Substring(0,$start)+"<script>`n"+$bundle+"`n"+$html.Substring($end)
[IO.File]::WriteAllText($htmlPath,$html,[Text.UTF8Encoding]::new($false))
Write-Output 'Board asset modules bundled into Game/Labirent-TD.html.'
