@echo off
title SAVDO ERP - Boshqaruv Dasturi
echo ========================================================
echo       SAVDO VA OMBOR BOSHQARUVI ERP DASTURI
echo ========================================================
echo.
echo Dastur ishga tushirilmoqda, iltimos kuting...
echo.

start "" "http://localhost:5173"
call npm.cmd run dev

pause
