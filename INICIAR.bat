@echo off
title Sangucheria Inteligente - Panel de Control
color 0A

echo.
echo  ================================================
echo    LA LUCHA SANGUCHERIA CRIOLLA INTELIGENTE
echo    Iniciando Servidor Backend y Cliente Web...
echo  ================================================
echo.

:: Detectar ejecutable de Python (entorno virtual o global)
set "PYTHON_EXE=python"
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
    echo  [INFO] Utilizando entorno virtual local (.venv)
) else if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
    echo  [INFO] Utilizando entorno virtual local (venv)
)

:: --- BACKEND ---
echo  [1/2] Iniciando Backend FastAPI en http://127.0.0.1:8000 ...
start "BACKEND - FastAPI" cmd /k "cd /d "%~dp0backend" && "%PYTHON_EXE%" -m uvicorn servidor:app --reload --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

:: --- FRONTEND ---
echo  [2/2] Iniciando Servidor Web Frontend en http://127.0.0.1:5500 ...
start "FRONTEND - HTTP Server" cmd /k "cd /d "%~dp0frontend" && "%PYTHON_EXE%" -m http.server 5500"

timeout /t 2 /nobreak >nul

:: --- ABRIR NAVEGADOR ---
echo  [3/3] Abriendo carta digital interactiva en tu navegador...
start http://127.0.0.1:5500

echo.
echo  ================================================
echo   Todo listo y operativo!
echo   Frontend : http://127.0.0.1:5500
echo   API Docs : http://127.0.0.1:8000/docs
echo  ================================================
echo.
pause
