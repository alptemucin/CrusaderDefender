using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using LabirentTd;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
public class Program
{
    public static void Main(string[] args)
    {
        CreateApp(args).Run();
    }
    public static WebApplication CreateApp(string[] args)
    {
        var builder=WebApplication.CreateBuilder(args);
        builder.Services.AddSingleton<ResultStore>();
        builder.Services.AddSingleton<GameSessions>();
        builder.Services.AddHostedService(provider=>provider.GetRequiredService<GameSessions>());
        var app=builder.Build();
        app.Use(async(context,next)=>{
            context.Response.Headers.CacheControl="no-store";
            if(HttpMethods.IsPost(context.Request.Method)&&context.Request.Headers.Origin.Count>0&&
                (!Uri.TryCreate(context.Request.Headers.Origin.ToString(),UriKind.Absolute,out var origin)||
                 origin.Authority!=context.Request.Host.Value||origin.Scheme!=context.Request.Scheme))
            {context.Response.StatusCode=403;return;}
            try{await next(context);}
            catch(RuleViolation error){context.Response.StatusCode=409;await context.Response.WriteAsJsonAsync(new{error=error.Message});}
        });
        app.UseStaticFiles();
        app.MapGet("/",()=>Results.File(Path.Combine(app.Environment.ContentRootPath,"Game","Labirent-TD.html"),"text/html; charset=utf-8"));
        app.MapGet("/Labirent-TD.html",()=>Results.Redirect("/"));
        app.MapGet("/api/health",()=>Results.Ok(new{status="ok"}));
        app.MapGet("/api/results",async(ResultStore store)=>Results.Ok(await store.Read()));
        app.MapPost("/api/game",(HttpContext context,GameSessions games)=>games.Snapshot(games.GetOrCreate(context)));
        app.MapGet("/api/game",(HttpContext context,GameSessions games)=>{
            var session=games.Find(context);
            return session!=null?games.Snapshot(session):Results.Json(new{error="Oyun oturumu sona erdi."},statusCode:410);
        });
        app.MapPost("/api/game/commands",(GameCommand command,HttpContext context,GameSessions games)=>{
            var session=games.Find(context);
            return session!=null?games.Snapshot(session,command):Results.Json(new{error="Oyun oturumu sona erdi."},statusCode:410);
        });
        return app;
    }
}
