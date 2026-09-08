# Keep WebView JS interface if we add one later
-keepclassmembers class com.suraksha360.app.* {
    @android.webkit.JavascriptInterface <methods>;
}
