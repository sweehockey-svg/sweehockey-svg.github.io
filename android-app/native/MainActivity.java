package se.svenskehockey.app;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

public class MainActivity extends BridgeActivity {
    private String appShellScript = "";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean reloadAttempted = false;
    private boolean fallbackShown = false;

    private final Runnable shellInjector = new Runnable() {
        @Override
        public void run() {
            injectAppShell();
            handler.postDelayed(this, 1200);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        int appBlack = Color.parseColor("#02030A");
        getWindow().setStatusBarColor(appBlack);
        getWindow().setNavigationBarColor(appBlack);

        WindowInsetsControllerCompat insets =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insets.setAppearanceLightStatusBars(false);
        insets.setAppearanceLightNavigationBars(false);

        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.setBackgroundColor(appBlack);
            webView.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
            webView.addJavascriptInterface(new SehNativeBridge(), "SehNative");
        }

        // Re-inject after SPA route changes or full navigation to /SEC/.
        handler.postDelayed(shellInjector, 1100);

        // Avoid a permanent black screen if the remote page fails.
        handler.postDelayed(() -> checkPageHealth(false), 7500);
        handler.postDelayed(() -> checkPageHealth(true), 15000);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null && bridge.getWebView() != null && bridge.getWebView().canGoBack()) {
                    bridge.getWebView().goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        handler.removeCallbacks(shellInjector);
        handler.postDelayed(shellInjector, 500);
    }

    @Override
    public void onPause() {
        handler.removeCallbacks(shellInjector);
        super.onPause();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    private boolean isSehUrl(String url) {
        return url != null && (
                url.startsWith("https://www.svenskehockey.se/") ||
                url.startsWith("https://svenskehockey.se/")
        );
    }

    private void injectAppShell() {
        if (bridge == null || bridge.getWebView() == null || fallbackShown) return;
        WebView view = bridge.getWebView();
        if (!isSehUrl(view.getUrl())) return;

        if (appShellScript.isEmpty()) appShellScript = readAsset("app-shell.js");
        if (appShellScript.isEmpty()) return;

        String guarded = "(function(){" +
                "if(!document.body||document.readyState==='loading')return;" +
                appShellScript +
                "})();";
        view.evaluateJavascript(guarded, null);
    }

    private void checkPageHealth(boolean finalCheck) {
        if (bridge == null || bridge.getWebView() == null || fallbackShown) return;
        WebView view = bridge.getWebView();
        String js = "(function(){try{return !!document.body && (document.body.innerText||'').trim().length>40;}catch(e){return false;}})();";
        view.evaluateJavascript(js, result -> {
            if ("true".equalsIgnoreCase(result)) return;
            if (!reloadAttempted && !finalCheck) {
                reloadAttempted = true;
                view.loadUrl("https://www.svenskehockey.se/#/");
            } else if (finalCheck) {
                fallbackShown = true;
                handler.removeCallbacks(shellInjector);
                view.loadUrl("file:///android_asset/public/index.html");
            }
        });
    }

    private String readAsset(String name) {
        StringBuilder sb = new StringBuilder();
        try (InputStream input = getAssets().open(name);
             BufferedReader reader = new BufferedReader(new InputStreamReader(input))) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line).append('\n');
        } catch (Exception ignored) {}
        return sb.toString();
    }

    public class SehNativeBridge {
        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null || url.trim().isEmpty()) return;
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void share(String title, String url) {
            runOnUiThread(() -> {
                try {
                    Intent sendIntent = new Intent(Intent.ACTION_SEND);
                    sendIntent.setType("text/plain");
                    String text = ((title == null || title.isEmpty()) ? "Svensk eHockey" : title) + "\n" + url;
                    sendIntent.putExtra(Intent.EXTRA_TEXT, text);
                    startActivity(Intent.createChooser(sendIntent, "Dela via"));
                } catch (Exception ignored) {}
            });
        }
    }
}
