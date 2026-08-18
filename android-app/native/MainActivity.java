package se.svenskehockey.app;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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
            injectShellWhenReady();
            handler.postDelayed(this, 1800);
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
        }

        // Vänta tills fjärrsidan faktiskt är laddad innan appskalet läggs in.
        handler.postDelayed(shellInjector, 1800);

        // Watchdog: svart/tom WebView ska inte kunna bli permanent.
        handler.postDelayed(() -> checkPageHealth(false), 7000);
        handler.postDelayed(() -> checkPageHealth(true), 14000);

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
        handler.postDelayed(shellInjector, 900);
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
        return url != null && (url.startsWith("https://www.svenskehockey.se/") ||
                url.startsWith("https://svenskehockey.se/"));
    }

    private void injectShellWhenReady() {
        if (bridge == null || bridge.getWebView() == null || fallbackShown) return;

        WebView view = bridge.getWebView();
        if (!isSehUrl(view.getUrl())) return;

        if (appShellScript.isEmpty()) appShellScript = readAsset("app-shell.js");
        if (appShellScript.isEmpty()) return;

        String guarded = "(function(){" +
                "if(document.readyState!=='complete'||!document.body||document.body.children.length===0)return;" +
                appShellScript +
                "})();";
        view.evaluateJavascript(guarded, null);
    }

    private void checkPageHealth(boolean finalCheck) {
        if (bridge == null || bridge.getWebView() == null || fallbackShown) return;

        WebView view = bridge.getWebView();
        String js = "(function(){try{return !!document.body && (document.body.innerText||'').trim().length>40;}catch(e){return false;}})();";
        view.evaluateJavascript(js, result -> {
            boolean healthy = "true".equalsIgnoreCase(result);
            if (healthy) return;

            if (!reloadAttempted && !finalCheck) {
                reloadAttempted = true;
                view.loadUrl("https://www.svenskehockey.se/#/");
                return;
            }

            if (finalCheck) showFallback();
        });
    }

    private void showFallback() {
        if (bridge == null || bridge.getWebView() == null || fallbackShown) return;
        fallbackShown = true;
        handler.removeCallbacks(shellInjector);
        bridge.getWebView().loadUrl("file:///android_asset/public/index.html");
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
}
