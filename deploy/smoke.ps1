param(
  [Parameter(Mandatory = $true)][string]$WebUrl,
  [Parameter(Mandatory = $true)][string]$ApiUrl
)

$ErrorActionPreference = "Stop"
$webBase = $WebUrl.TrimEnd('/')
$apiBase = $ApiUrl.TrimEnd('/')
$webUri = [Uri]$webBase
$apiUri = [Uri]$apiBase
if ($webUri.Scheme -ne "https" -or $apiUri.Scheme -ne "https") {
  throw "Production smoke requires HTTPS web and API URLs."
}
$webOrigin = $webUri.GetLeftPart([UriPartial]::Authority)

$healthResponse = Invoke-WebRequest -Uri "$apiBase/health" -SkipHttpErrorCheck -TimeoutSec 15
if ($healthResponse.StatusCode -ne 200) {
  throw "API health check failed with HTTP $($healthResponse.StatusCode)."
}
$health = $healthResponse.Content | ConvertFrom-Json
if ($health.status -ne "ok") {
  throw "API health check did not return status=ok."
}

$web = Invoke-WebRequest -Uri $webBase -MaximumRedirection 0 -SkipHttpErrorCheck -TimeoutSec 20
if ($web.StatusCode -lt 200 -or $web.StatusCode -ge 400) {
  throw "Web smoke test failed with HTTP $($web.StatusCode)."
}

$anonymous = Invoke-WebRequest -Uri "$apiBase/v1/me" -SkipHttpErrorCheck -TimeoutSec 15
if ($anonymous.StatusCode -ne 401) {
  throw "Protected API route must reject anonymous requests with HTTP 401; got $($anonymous.StatusCode)."
}

$preflight = Invoke-WebRequest `
  -Uri "$apiBase/v1/me" `
  -Method Options `
  -Headers @{
    Origin = $webOrigin
    "Access-Control-Request-Method" = "GET"
    "Access-Control-Request-Headers" = "authorization,content-type"
  } `
  -SkipHttpErrorCheck `
  -TimeoutSec 15
if ($preflight.StatusCode -lt 200 -or $preflight.StatusCode -ge 300) {
  throw "API CORS preflight failed with HTTP $($preflight.StatusCode)."
}
if ($preflight.Headers["Access-Control-Allow-Origin"] -ne $webOrigin) {
  throw "API CORS does not allow the production web origin."
}

foreach ($response in @($web, $healthResponse)) {
  if (-not $response.Headers["Strict-Transport-Security"]) {
    throw "Missing Strict-Transport-Security response header."
  }
  if ($response.Headers["X-Content-Type-Options"] -ne "nosniff") {
    throw "Missing X-Content-Type-Options=nosniff response header."
  }
}

Write-Host "Production smoke passed: API=$($health.status), Web=$($web.StatusCode), Auth=401, CORS=ok, TLS headers=ok"
