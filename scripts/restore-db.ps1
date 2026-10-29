# ====================================================================
# SCRIPT DE RESTAURACIÓN - ZONA FITNESS (PostgreSQL 18)
# ====================================================================

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$TargetDb = "zona_fitness_db_test_restore",
    [string]$DbHost = "127.0.0.1",
    [string]$Port = "5432",
    [string]$User = "postgres"
)

$ErrorActionPreference = "Stop"
$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $BackupFile)) {
    Write-Error "El archivo de respaldo no existe: $BackupFile"
}

Write-Host "Iniciando restauración en base de datos de prueba: $TargetDb..." -ForegroundColor Cyan

# 1. Crear base de datos de prueba si no existe
Write-Host "Comprobando existencia de $TargetDb..." -ForegroundColor Yellow
$checkSql = "SELECT 1 FROM pg_database WHERE datname = '$TargetDb'"
$exists = & $PsqlPath -h $DbHost -p $Port -U $User -d postgres -t -c $checkSql

if ($exists -notmatch "1") {
    Write-Host "Creando base de prueba $TargetDb..." -ForegroundColor Yellow
    & $PsqlPath -h $DbHost -p $Port -U $User -d postgres -c "CREATE DATABASE $TargetDb WITH ENCODING 'UTF8';"
}

# 2. Restaurar contenido
Write-Host "Aplicando respaldo $BackupFile sobre $TargetDb..." -ForegroundColor Cyan
& $PsqlPath -h $DbHost -p $Port -U $User -d $TargetDb -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "[EXITO] Restauración completada satisfactoriamente en: $TargetDb" -ForegroundColor Green
} else {
    Write-Error "[ERROR] Falló la restauración con código $LASTEXITCODE"
}
