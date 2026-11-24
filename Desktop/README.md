# Windows desktop application

Run `DesktopApp/CrusaderDefender.exe`. Keep the entire DesktopApp folder together when copying the game.

The WinForms window uses Microsoft WebView2 and runs the existing game server in the same process, on an automatically allocated loopback port. Closing the window stops the server. The browser version on port 5080 remains independent.

The package includes the .NET runtime. Microsoft Edge WebView2 Runtime must be installed on the target PC. Browser profile, results and startup error logs are stored in `%LOCALAPPDATA%/CrusaderDefender`. Active matches are held in memory and reset when the application closes.

Build: `powershell -NoProfile -ExecutionPolicy Bypass -File .\Build-Desktop.ps1` from the repository root.

Validation: run `DesktopApp/CrusaderDefender.exe --smoke-test`; the window checks that the real 63x63 game initializes, writes `%LOCALAPPDATA%/CrusaderDefender/desktop-smoke.txt` and exits. Exit code 0 means success.

WebView2 reference: https://learn.microsoft.com/en-us/microsoft-edge/webview2/get-started/winforms
