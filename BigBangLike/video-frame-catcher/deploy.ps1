# Video Frame Catcher Docker deployment script (PowerShell version)
# For Windows PowerShell + Docker Desktop environment

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("deploy", "start", "stop", "restart", "logs", "cleanup", "status")]
    [string]$Action = "deploy"
)

# Color output functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [ConsoleColor]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" -Color Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" -Color Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" -Color Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" -Color Red
}

# Check Docker environment
function Test-DockerEnvironment {
    Write-Info "Checking Docker environment..."

    try {
        $null = Get-Command docker -ErrorAction Stop
        $null = docker --version
        $null = docker compose version
        Write-Success "Docker environment check passed"
        return $true
    }
    catch {
        Write-Error "Docker not installed or not running"
        return $false
    }
}

# Check port usage
function Test-PortUsage {
    Write-Info "Checking port usage..."

    # Check common ports
    $ports = @(5432, 8080, 80)
    foreach ($port in $ports) {
        try {
            $connection = New-Object System.Net.Sockets.TcpClient
            $connection.Connect("localhost", $port)
            $connection.Close()
            Write-Warning "Port $port is already in use"
        }
        catch {
            # Port not in use
        }
    }
}

# Create required directories
function New-RequiredDirectories {
    Write-Info "Creating required directories..."

    $directories = @("storage", "logs", "temp", "postgres_data")
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }

    Write-Success "Directory creation completed"
}

# Build Docker images
function Build-DockerImages {
    Write-Info "Building Docker images..."

    try {
        Write-Info "Building backend image..."
        docker compose build backend

        if ($LASTEXITCODE -ne 0) {
            throw "Backend image build failed"
        }

        Write-Info "Building frontend image..."
        docker compose build frontend

        if ($LASTEXITCODE -ne 0) {
            throw "Frontend image build failed"
        }

        Write-Success "Image build completed"
    }
    catch {
        Write-Error "Image build failed: $($_.Exception.Message)"
        throw
    }
}

# Start services
function Start-Services {
    Write-Info "Starting services..."

    try {
        # Start database first
        Write-Info "Starting PostgreSQL database..."
        docker compose up -d postgres

        if ($LASTEXITCODE -ne 0) {
            throw "PostgreSQL startup failed"
        }

        # Wait for database startup
        Write-Info "Waiting for database startup..."
        Start-Sleep -Seconds 15

        # Check database health status
        $maxAttempts = 30
        $attempt = 0
        $healthy = $false
        do {
            $attempt++
            $healthy = docker compose ps postgres | Select-String "healthy"
            if ($healthy) {
                Write-Success "Database startup completed"
                break
            }
            Write-Info "Waiting for database startup... ($attempt/$maxAttempts)"
            Start-Sleep -Seconds 2
        } while ($attempt -lt $maxAttempts)

        if (!$healthy) {
            throw "Database startup timeout"
        }

        # Start backend service
        Write-Info "Starting backend service..."
        docker compose up -d backend

        if ($LASTEXITCODE -ne 0) {
            throw "Backend service startup failed"
        }

        # Wait for backend startup
        Write-Info "Waiting for backend service startup..."
        Start-Sleep -Seconds 30

        # Check backend health status
        $maxAttempts = 30
        $attempt = 0
        do {
            $attempt++
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8080/api/actuator/health" -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    Write-Success "Backend service startup completed"
                    break
                }
            }
            catch {
                # Continue waiting
            }
            Write-Info "Waiting for backend service startup... ($attempt/$maxAttempts)"
            Start-Sleep -Seconds 2
        } while ($attempt -lt $maxAttempts)

        # Start frontend service
        Write-Info "Starting frontend service..."
        docker compose up -d frontend

        if ($LASTEXITCODE -ne 0) {
            throw "Frontend service startup failed"
        }

        Write-Success "All services startup completed"
    }
    catch {
        Write-Error "Service startup failed: $($_.Exception.Message)"
        throw
    }
}

# Check service status
function Test-Services {
    Write-Info "Checking service status..."

    $services = @(
        @{ Name = "PostgreSQL"; Service = "postgres" },
        @{ Name = "Backend Service"; Service = "backend" },
        @{ Name = "Frontend Service"; Service = "frontend" }
    )

    foreach ($svc in $services) {
        $status = docker compose ps $svc.Service | Select-String "Up"
        if ($status) {
            Write-Success "$($svc.Name) is running normally"
        } else {
            Write-Error "$($svc.Name) is running abnormally"
        }
    }
}

# Show access information
function Show-AccessInfo {
    Write-Info "Service access information:"
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "Frontend Application: http://localhost" -ForegroundColor Green
    Write-Host "Backend API: http://localhost/api" -ForegroundColor Green
    Write-Host "API Documentation: http://localhost:8080/swagger-ui.html" -ForegroundColor Green
    Write-Host "Health Check: http://localhost:8080/api/actuator/health" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Cyan
}

# Cleanup function
function Invoke-Cleanup {
    Write-Warning "Cleaning up services..."
    docker compose down -v
    Write-Success "Cleanup completed"
}

# Show logs
function Show-Logs {
    Write-Info "Showing service logs..."
    docker compose logs -f
}

# Main function
function Main {
    Write-Info "Starting deployment of Video Frame Catcher..."

    if (!(Test-DockerEnvironment)) {
        exit 1
    }

    Test-PortUsage
    New-RequiredDirectories

    switch ($Action) {
        "deploy" {
            Build-DockerImages
            Start-Services
            Test-Services
            Show-AccessInfo
        }
        "start" {
            Start-Services
            Test-Services
            Show-AccessInfo
        }
        "stop" {
            Write-Info "Stopping services..."
            docker compose down
            Write-Success "Services stopped"
        }
        "restart" {
            Write-Info "Restarting services..."
            docker compose restart
            Test-Services
            Show-AccessInfo
        }
        "logs" {
            Show-Logs
        }
        "cleanup" {
            Invoke-Cleanup
        }
        "status" {
            Test-Services
        }
        default {
            Write-Error "Unknown action: $Action"
            Write-Host "Usage: ./deploy.ps1 -Action {deploy|start|stop|restart|logs|cleanup|status}" -ForegroundColor Yellow
            Write-Host "" -ForegroundColor Yellow
            Write-Host "Command descriptions:" -ForegroundColor Yellow
            Write-Host "  deploy  - Full deployment (build images + start services)" -ForegroundColor White
            Write-Host "  start   - Start services" -ForegroundColor White
            Write-Host "  stop    - Stop services" -ForegroundColor White
            Write-Host "  restart - Restart services" -ForegroundColor White
            Write-Host "  logs    - Show logs" -ForegroundColor White
            Write-Host "  cleanup - Clean up all services and data" -ForegroundColor White
            Write-Host "  status  - Check service status" -ForegroundColor White
            exit 1
        }
    }
}

# Capture errors
try {
    Main
}
catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    exit 1
}