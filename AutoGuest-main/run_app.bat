@echo off
title AutoGuest - Iniciar App
color 0E

REM Asegurarse de que Flutter este en el PATH (por si la terminal no lo reconoce)
SET PATH=C:\flutter\bin;%PATH%

echo.
echo  ============================================
echo    AutoGuest - Lanzador de App Flutter
echo  ============================================
echo.

REM 1. Iniciar el backend en una ventana separada
echo [1/3] Iniciando el servidor backend...
start "AutoGuest Backend" cmd /k "cd /d c:\AutoGuest-3.05-master && npm start"
timeout /t 3 /nobreak >nul

REM 2. Redirigir el puerto del celular al backend de la laptop
echo [2/3] Configurando redireccion de puerto (adb reverse)...
adb reverse tcp:3000 tcp:3000
if %errorlevel% neq 0 (
    echo.
    echo  [ADVERTENCIA] No se pudo conectar via ADB.
    echo  Asegurate de que:
    echo    - El celular esta conectado por USB
    echo    - USB Debugging esta activado en el celular
    echo    - Autorizaste la conexion en la pantalla del celular
    echo.
    pause
    exit /b 1
)
echo  Puerto 3000 redirigido correctamente!
echo.

REM 3. Correr la app Flutter en el dispositivo conectado
echo [3/3] Instalando y corriendo la app en tu celular...
echo.
cd /d c:\AutoGuest-3.05-master\autoguest_app
flutter run --dart-define=API_URL=http://localhost:3000

pause
