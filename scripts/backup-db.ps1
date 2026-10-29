# ====================================================================
# SCRIPT DE COPIA DE SEGURIDAD (BACKUP) - ZONA FITNESS (PostgreSQL 18)
# ====================================================================

param (
    [string]$DbName = "zona_fitness_db",
    [string]$DbHost = "127.0.0.1",
    [string]$Port = "5432",
    [string]$User = "postgres",
    [string]$BackupDir = "$PSScriptRoot\..\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$OutputFile = "$BackupDir\${DbName}_backup_${Timestamp}.sql"
$PgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"

if (-not (Test-Path $PgDumpPath)) {
    Write-Error "No se encontró pg_dump en $PgDumpPath"
}

Write-Host "Iniciando respaldo de base de datos $DbName..." -ForegroundColor Cyan
Write-Host "Destino: $OutputFile" -ForegroundColor Yellow

# Usar pg_dump
& $PgDumpPath -h $DbHost -p $Port -U $User -F p -b -v -f $OutputFile $DbName

if ($LASTEXITCODE -eq 0) {
    Write-Host "[EXITO] Respaldo generado correctamente en: $OutputFile" -ForegroundColor Green
} else {
    Write-Error "[ERROR] Falló la creación del respaldo con código $LASTEXITCODE"
}
