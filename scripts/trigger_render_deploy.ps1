param(
  [Parameter(Mandatory=$false)] [string]$apiKey = $env:RENDER_API_KEY,
  [Parameter(Mandatory=$false)] [string]$serviceId = $env:RENDER_SERVICE_ID
)

if (-not $apiKey) {
  Write-Error "Render API key not provided. Set RENDER_API_KEY env var or pass -apiKey."
  exit 2
}
if (-not $serviceId) {
  Write-Error "Render service ID not provided. Set RENDER_SERVICE_ID env var or pass -serviceId."
  exit 2
}

$uri = "https://api.render.com/v1/services/$serviceId/deploys"
$headers = @{ "Authorization" = "Bearer $apiKey"; "Content-Type" = "application/json" }
$body = @{}

try {
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body (ConvertTo-Json $body)
  Write-Host "Triggered deploy for service $serviceId. Deploy id:" $resp.id
  Write-Host "Status:" $resp.state
  Write-Host "You can check the deploy on Render dashboard or use the deploy id above."
} catch {
  Write-Error "Failed to trigger deploy: $_"
  exit 1
}
