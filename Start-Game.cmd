@echo off
cd /d "%~dp0"
echo CrusaderDefender - http://localhost:5080
echo Open the URL in your browser. Press Ctrl+C to stop.
dotnet LabirentTd.Web.dll --urls http://localhost:5080 --contentRoot "%~dp0."
if errorlevel 1 pause