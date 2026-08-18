package se.svenskehockey.app;

import android.graphics.Color;
import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
            bridge.getWebView().setBackgroundColor(appBlack);
            bridge.getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        }
    }
}
