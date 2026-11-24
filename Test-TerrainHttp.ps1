param([string]$BaseUrl='http://localhost:5081')
$ErrorActionPreference='Stop'
$snapshot=Invoke-RestMethod -Method Post -Uri ($BaseUrl+'/api/game') -SessionVariable terrainSession
if($snapshot.rules.n -ne 63 -or $snapshot.map.grid.Count -ne 63){throw 'Map size mismatch'}
if(@($snapshot.map.features | Where-Object kind -EQ gate).Count -ne 5){throw 'Gate features missing'}
function Send-Command($command){
  $command.revision=$script:snapshot.revision
  $script:snapshot=Invoke-RestMethod -Method Post -Uri ($BaseUrl+'/api/game/commands') -WebSession $terrainSession -ContentType 'application/json' -Body ($command | ConvertTo-Json -Compress)
}
function Assert-Rejected($command){
  $command.revision=$script:snapshot.revision
  try{Invoke-RestMethod -Method Post -Uri ($BaseUrl+'/api/game/commands') -WebSession $terrainSession -ContentType 'application/json' -Body ($command | ConvertTo-Json -Compress) | Out-Null}
  catch{if([int]$_.Exception.Response.StatusCode -eq 409){return};throw}
  throw 'Forbidden command was accepted'
}
$tiles=@($snapshot.map.grid | ForEach-Object {$_})
foreach($kind in @('water','tree','mountain','gate')){
  $tile=$tiles | Where-Object terrain -EQ $kind | Select-Object -First 1
  Assert-Rejected @{action='tile';x=$tile.x;y=$tile.y}
}
$bridge=$tiles | Where-Object bridge -EQ $true | Select-Object -First 1
Assert-Rejected @{action='tile';x=$bridge.x;y=$bridge.y}
Send-Command @{action='tool';tool='remove'}
foreach($kind in @('tree','mountain')){
  $tile=$tiles | Where-Object terrain -EQ $kind | Select-Object -First 1
  Assert-Rejected @{action='tile';x=$tile.x;y=$tile.y}
}
Send-Command @{action='tool';tool='soul'}
$placed=$false
foreach($tile in $tiles | Where-Object {$_.terrain -eq 'ground' -and !$_.obs -and $_.cp -lt 0 -and $_.x -gt 21}){
  try{Send-Command @{action='tile';x=$tile.x;y=$tile.y};$placed=$true;break}catch{if([int]$_.Exception.Response.StatusCode -ne 409){throw}}
}
if(!$placed){throw 'Failed to place on expanded map'}
if(!$snapshot.map.grid[$tile.y][$tile.x].unit){throw 'Unit missing after placement'}
$featuresBefore=$snapshot.map.features | ConvertTo-Json -Depth 8 -Compress
Send-Command @{action='again'}
if(($snapshot.map.features | ConvertTo-Json -Depth 8 -Compress) -ne $featuresBefore){throw 'Replay changed permanent terrain'}
if($snapshot.state.pending.Count -ne 0){throw 'Replay did not clear player units'}
Write-Output 'PASS: HTTP 63x63 map, immutable terrain, water and bridge placement rejection, expanded coordinates and persistent replay terrain.'
