using Microsoft.AspNetCore.Builder;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace CrusaderDefenderDesktop;

internal static class DesktopProgram
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new GameWindow(args.Contains("--smoke-test")));
    }
}

internal sealed class GameWindow : Form
{
    private readonly WebView2 browser = new() { Dock = DockStyle.Fill };
    private readonly bool smokeTest;
    private WebApplication? server;
    private bool stopping;
    private readonly string data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrusaderDefender");

    public GameWindow(bool smokeTest)
    {
        this.smokeTest = smokeTest;
        Text = "CrusaderDefender";
        Size = new Size(1440, 960);
        MinimumSize = new Size(960, 640);
        StartPosition = FormStartPosition.CenterScreen;
        Controls.Add(browser);
        Shown += StartGame;
        FormClosing += StopGame;
    }

    private async void StartGame(object? sender, EventArgs e)
    {
        try
        {
            Directory.CreateDirectory(data);
            server = global::Program.CreateApp(new[] { "--urls", "http://127.0.0.1:0", "--contentRoot", AppContext.BaseDirectory, "--GameDataDirectory", data });
            await server.StartAsync();
            var url = server.Urls.Single();
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: Path.Combine(data, "Browser"));
            await browser.EnsureCoreWebView2Async(environment);
            browser.CoreWebView2.Settings.AreDevToolsEnabled = false;
            browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            browser.CoreWebView2.NavigationStarting += (_, navigation) =>
            {
                if (!navigation.Uri.StartsWith(url + "/", StringComparison.OrdinalIgnoreCase)) navigation.Cancel = true;
            };
            if (smokeTest)
            {
                browser.CoreWebView2.NavigationCompleted += async (_, navigation) =>
                {
                    try
                    {
                        if (!navigation.IsSuccess) throw new Exception("Navigation failed: " + navigation.WebErrorStatus);
                        await browser.ExecuteScriptAsync("window.desktopCheck=setInterval(()=>fetch('/api/game').then(r=>r.json()).then(s=>{window.desktopGameReady=Boolean(s.map && s.map.grid && s.map.grid.length===63);if(window.desktopGameReady)clearInterval(window.desktopCheck);}),200);");
                        var result = "false";
                        for (int i = 0; i < 100 && result != "true"; i++)
                        {
                            result = await browser.ExecuteScriptAsync("Boolean(document.querySelector('canvas') && window.desktopGameReady && document.querySelector('[data-tool=\"soul\"]') && document.body.textContent.includes('0/5 ruh kondu'))");
                            if (result != "true") await Task.Delay(100);
                        }
                        if (result != "true") throw new Exception("Game did not initialize.");
                        File.WriteAllText(Path.Combine(data, "desktop-smoke.txt"), "PASS: WebView2 loaded a real 63x63 game. " + url);
                    }
                    catch (Exception error)
                    {
                        Environment.ExitCode = 1;
                        File.WriteAllText(Path.Combine(data, "desktop-smoke.txt"), "FAIL: " + error);
                    }
                    Close();
                };
            }
            browser.CoreWebView2.Navigate(url + "/");
        }
        catch (Exception error)
        {
            Environment.ExitCode = 1;
            File.WriteAllText(Path.Combine(data, "desktop-error.txt"), error.ToString());
            if (!smokeTest) MessageBox.Show("Oyun başlatılamadı.\n" + error.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private async void StopGame(object? sender, FormClosingEventArgs e)
    {
        if (stopping || server == null) return;
        e.Cancel = true;
        stopping = true;
        browser.Dispose();
        try { await server.StopAsync(); await server.DisposeAsync(); }
        finally { Close(); }
    }
}
