# Run once before starting the backend, using its SUPABASE_SECRET_KEY environment variable.
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($env:SUPABASE_SECRET_KEY)) {
    throw 'Set SUPABASE_SECRET_KEY in this PowerShell session first.'
}
$projectUrl = if ($env:SUPABASE_URL) { $env:SUPABASE_URL.TrimEnd('/') } else { 'https://uivnbvywcyqkgzgusyai.supabase.co' }
$endpoint = "$projectUrl/storage/v1/bucket"
$headers = @{ apikey = $env:SUPABASE_SECRET_KEY }
$buckets = @(Invoke-RestMethod -Method Get -Uri $endpoint -Headers $headers)
foreach ($spec in @(
    @{ id = 'raceforge-images'; limit = 5242880; types = @('image/jpeg', 'image/png', 'image/webp') }
    @{ id = 'raceforge-documents'; limit = 10485760; types = @('application/pdf', 'text/plain') }
)) {
    $settings = @{ public = $false; file_size_limit = $spec.limit; allowed_mime_types = $spec.types }
    if ($buckets | Where-Object { $_.id -eq $spec.id }) {
        $uri = "$endpoint/$($spec.id)"
        $method = 'Put'
    } else {
        $settings.id = $spec.id
        $settings.name = $spec.id
        $uri = $endpoint
        $method = 'Post'
    }
    Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -ContentType 'application/json' -Body ($settings | ConvertTo-Json) | Out-Null
    $bucket = Invoke-RestMethod -Uri "$endpoint/$($spec.id)" -Headers $headers
    if ($bucket.public -ne $false -or $bucket.file_size_limit -ne $spec.limit -or
        (Compare-Object $spec.types $bucket.allowed_mime_types)) { throw "Unexpected settings for $($spec.id)" }
    Write-Host "$($spec.id) ready (private)."
}
