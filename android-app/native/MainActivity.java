package se.svenskehockey.app;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

public class MainActivity extends BridgeActivity {
    private String appShellScript = "";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                injectAppShell(view);
            }

            @Override
            public void onPageLoaded(WebView view) {
                injectAppShell(view);
            }
        });

        super.onCreate(savedInstanceState);

        int appBlack = Color.parseColor("#02030A");
        getWindow().setStatusBarColor(appBlack);
        getWindow().setNavigationBarColor(appBlack);

        WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insets.setAppearanceLightStatusBars(false);
        insets.setAppearanceLightNavigationBars(false);

        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.setBackgroundColor(appBlack);
            webView.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        }

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

    private void injectAppShell(WebView view) {
        String url = view.getUrl();
        if (url == null || (!url.startsWith("https://www.svenskehockey.se/") && !url.startsWith("https://svenskehockey.se/"))) {
            return;
        }
        if (appShellScript.isEmpty()) appShellScript = readAsset("app-shell.js");
        if (appShellScript.isEmpty()) return;
        view.postDelayed(() -> view.evaluateJavascript(appShellScript, null), 80);
        view.postDelayed(() -> view.evaluateJavascript(appShellScript, null), 650);
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
