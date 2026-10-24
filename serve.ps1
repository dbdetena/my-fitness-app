param(
    [int]$Port = 8080,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = (Get-Item $PSScriptRoot).FullName

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Error al iniciar en puerto $Port. Intentando puerto 8081..." -ForegroundColor Yellow
    $Port = 8081
    $prefix = "http://localhost:$Port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Servidor local Fitness App activo" -ForegroundColor Cyan
Write-Host "  URL: $prefix" -ForegroundColor Yellow
Write-Host "  Carpeta raíz: $root" -ForegroundColor Gray
Write-Host "  Pulsa Ctrl+C para detener el servidor" -ForegroundColor DarkGray
Write-Host "==========================================" -ForegroundColor Green

# Abrir el navegador automáticamente si no se indica -NoBrowser
if (-not $NoBrowser) {
    Start-Process $prefix
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path)) {
            $path = "index.html"
        }

        # Evitar path traversal
        $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $path))
        if (-not $filePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $filePath -PathType Leaf)) {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            Write-Host "404 - $path" -ForegroundColor Red
            continue
        }

        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

        $response.ContentType = $contentType
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $bytes.Length
        try {
            if ($context.Request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $response.Close()
            Write-Host "200 OK - $path ($contentType)" -ForegroundColor Green
        } catch {
            Write-Host "Warn: $($_.Exception.Message)" -ForegroundColor DarkGray
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "`nServidor detenido." -ForegroundColor Yellow
}
