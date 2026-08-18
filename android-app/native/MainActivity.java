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
    private final Handler appShellHandler = new Handler(Looper.getMainLooper());

    private final Runnable appShellInjector = new Runnable() {
        @Override
        public void run() {
            injectAppShell();
            appShellHandler.postDelayed(this, 1000);
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

        appShellHandler.postDelayed(appShellInjector, 500);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null
                        && bridge.getWebView() != null
                        && bridge.getWebView().canGoBack()) {
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
        appShellHandler.removeCallbacks(appShellInjector);
        appShellHandler.postDelayed(appShellInjector, 250);
    }

    @Override
    public void onPause() {
        appShellHandler.removeCallbacks(appShellInjector);
        super.onPause();
    }

    @Override
    public void onDestroy() {
        appShellHandler.removeCallbacks(appShellInjector);
        super.onDestroy();
    }

    private void injectAppShell() {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        WebView view = bridge.getWebView();
        String url = view.getUrl();

        if (url == null
                || (!url.startsWith("https://www.svenskehockey.se/")
                && !url.startsWith("https://svenskehockey.se/"))) {
            return;
        }

        if (appShellScript.isEmpty()) {
            appShellScript = readAsset("app-shell.js");
        }

        if (appShellScript.isEmpty()) {
            return;
        }

        view.evaluateJavascript(appShellScript, null);
    }

    private String readAsset(String name) {
        StringBuilder sb = new StringBuilder();

        try (InputStream input = getAssets().open(name);
             BufferedReader reader = new BufferedReader(new InputStreamReader(input))) {

            String line;

            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }

        } catch (Exception ignored) {
        }

        return sb.toString();
    }
}
