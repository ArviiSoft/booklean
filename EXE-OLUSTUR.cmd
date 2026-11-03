@echo off
cd /d "%~dp0"
call npm.cmd run dist
if errorlevel 1 (
  echo Derleme basarisiz. Yukaridaki hata mesajini kontrol edin.
  pause
  exit /b 1
)
echo.
echo Booklean hazir. Yeni portable.exe dosyasi release klasorunde.
pause
