package com.grassland.doudizhubase;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import android.util.Log;
import java.io.*;
import java.util.*;

/** Runs the upstream web build using packaged assets. No network permission. */
public final class MainActivity extends Activity {
  private WebView web;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    getWindow().getDecorView().setSystemUiVisibility(5894);
    web = new WebView(this);
    WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
    setContentView(web);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setMediaPlaybackRequiresUserGesture(false);
    web.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onConsoleMessage(ConsoleMessage m) {
        Log.i("DDZBaseline", m.messageLevel()+" "+m.message());
        return true;
      }
    });
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
        return !"offline.local".equals(r.getUrl().getHost());
      }
      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
        if (!"https".equals(r.getUrl().getScheme()) || !"offline.local".equals(r.getUrl().getHost())) {
          Log.w("DDZBaseline", "Blocked external resource: "+r.getUrl());
          return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
        }
        String path = r.getUrl().getPath();
        if (path == null || path.contains("..")) return missing();
        if (path.equals("/")) path = "/index.html";
        try {
          InputStream data = getAssets().open("web"+path);
          String ext = path.substring(path.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
          String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
          if (ext.equals("js")) mime="application/javascript";
          if (ext.equals("json")) mime="application/json";
          if (mime==null) mime="application/octet-stream";
          return new WebResourceResponse(mime, "UTF-8", 200, "OK", Collections.singletonMap("Access-Control-Allow-Origin", "https://offline.local"), data);
        } catch (IOException e) { Log.e("DDZBaseline", "Missing asset: "+path); return missing(); }
      }
    });
    web.loadUrl("https://offline.local/index.html");
  }
  private static WebResourceResponse missing() {
    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
  }
  @Override protected void onPause() { super.onPause(); web.onPause(); web.pauseTimers(); }
  @Override protected void onResume() { super.onResume(); if (web!=null) {web.onResume();web.resumeTimers();} }
  @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
