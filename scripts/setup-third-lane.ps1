# Third Lane Setup Script for Windows PowerShell
# This script sets up the environment for the Third Lane architecture

Write-Host "🚀 Setting up Third Lane Architecture" -ForegroundColor Green

# Copy environment file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "📋 Creating .env file from env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Write-Host "`n🔧 Third Lane Configuration:" -ForegroundColor Cyan
Write-Host "Lane A (Fuzzy Detection): gemma-fc-test:latest on 127.0.0.1:123" -ForegroundColor White
Write-Host "Lane B (MCP Data): No AI model (deterministic)" -ForegroundColor White  
Write-Host "Lane C (Analysis): qwen2.5:7b on 127.0.0.1:124" -ForegroundColor White

Write-Host "`n📝 Required Ollama Models:" -ForegroundColor Cyan
Write-Host "1. Terminal 1: `$env:OLLAMA_HOST='127.0.0.1:123'; ollama serve" -ForegroundColor Yellow
Write-Host "2. Terminal 2: ollama run gemma-fc-test:latest" -ForegroundColor Yellow
Write-Host "3. Terminal 3: `$env:OLLAMA_HOST='127.0.0.1:124'; ollama serve" -ForegroundColor Yellow
Write-Host "4. Terminal 4: ollama run qwen2.5:7b" -ForegroundColor Yellow

Write-Host "`n🎯 Test Commands:" -ForegroundColor Cyan
Write-Host "pnpm dev                                  # Start the server" -ForegroundColor Yellow
Write-Host "node scripts/test-third-lane.js          # Test the implementation" -ForegroundColor Yellow

Write-Host "`n🔍 Expected Architecture:" -ForegroundColor Cyan
Write-Host "User Query → Lane A (Intent) → Lane B (Data) → Lane C (Analysis) → Response" -ForegroundColor White

Write-Host "`n✨ Setup complete! Ready for Third Lane testing." -ForegroundColor Green
