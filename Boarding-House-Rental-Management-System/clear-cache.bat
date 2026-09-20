@echo off
echo Clearing cache and restarting...
rd /s /q .expo 2>nul
rd /s /q node_modules\.cache 2>nul
echo Cache cleared!
echo.
echo Starting Expo with clear cache...
npx expo start -c
