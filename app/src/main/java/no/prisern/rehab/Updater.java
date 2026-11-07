package no.prisern.rehab;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Self-updater: looks at the latest GitHub Release of this repo and, if it is newer
 * than the installed version, downloads the APK and hands it to Android's installer.
 */
final class Updater {

    static final class Result {
        final String status;   // available | latest | offline
        final String version;
        Result(String status, String version) { this.status = status; this.version = version; }
    }

    interface Callback { void done(Result r); }

    private static volatile String latestApkUrl;
    private static volatile String latestVersion;
    private static volatile boolean installing;

    private Updater() { }

    static void check(Activity a, Callback cb) {
        new Thread(() -> {
            Result r;
            try {
                JSONObject rel = new JSONObject(get("https://api.github.com/repos/" + BuildConfig.UPDATE_REPO + "/releases/latest"));
                String v = rel.getString("tag_name").replaceFirst("^v", "");
                String apk = null;
                JSONArray assets = rel.getJSONArray("assets");
                for (int i = 0; i < assets.length(); i++) {
                    JSONObject as = assets.getJSONObject(i);
                    if (as.getString("name").endsWith(".apk")) { apk = as.getString("browser_download_url"); break; }
                }
                if (apk != null && newer(v, BuildConfig.VERSION_NAME)) {
                    latestApkUrl = apk;
                    latestVersion = v;
                    r = new Result("available", v);
                } else {
                    r = new Result("latest", BuildConfig.VERSION_NAME);
                }
            } catch (Exception e) {
                r = new Result("offline", "");
            }
            final Result res = r;
            a.runOnUiThread(() -> cb.done(res));
        }).start();
    }

    static void install(Activity a) {
        if (latestApkUrl == null) { toast(a, "No update found yet – try “Check for updates”"); return; }
        if (installing) { toast(a, "Update is already downloading…"); return; }
        if (!a.getPackageManager().canRequestPackageInstalls()) {
            toast(a, "Allow “Install unknown apps” for Back Rehab, then tap Update again");
            a.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.getPackageName())));
            return;
        }
        installing = true;
        toast(a, "Downloading version " + latestVersion + "…");
        new Thread(() -> {
            PackageInstaller.Session session = null;
            try {
                PackageInstaller pi = a.getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(a.getPackageName());
                if (Build.VERSION.SDK_INT >= 31) {
                    params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                }
                int id = pi.createSession(params);
                session = pi.openSession(id);

                HttpURLConnection c = open(latestApkUrl);
                long len = c.getContentLengthLong();
                try (InputStream in = c.getInputStream(); OutputStream out = session.openWrite("base.apk", 0, len)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    session.fsync(out);
                }

                Intent done = new Intent(a, InstallReceiver.class);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
                PendingIntent pending = PendingIntent.getBroadcast(a, id, done, flags);
                session.commit(pending.getIntentSender());
                session.close();
            } catch (Exception e) {
                if (session != null) session.abandon();
                toast(a, "Update failed: " + e.getMessage());
            } finally {
                installing = false;
            }
        }).start();
    }

    private static void toast(Activity a, String msg) {
        a.runOnUiThread(() -> Toast.makeText(a, msg, Toast.LENGTH_LONG).show());
    }

    private static HttpURLConnection open(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(60000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "BackRehab/" + BuildConfig.VERSION_NAME);
        if (url.startsWith("https://api.github.com/")) c.setRequestProperty("Accept", "application/vnd.github+json");
        int code = c.getResponseCode();
        if (code >= 300 && code < 400) { // cross-host redirect (GitHub → CDN)
            String loc = c.getHeaderField("Location");
            c.disconnect();
            return open(loc);
        }
        if (code != 200) throw new Exception("HTTP " + code);
        return c;
    }

    private static String get(String url) throws Exception {
        HttpURLConnection c = open(url);
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
            return bo.toString("UTF-8");
        }
    }

    /** true if version a is newer than b (semantic versions like 1.2.3). */
    static boolean newer(String a, String b) {
        String[] x = a.split("\\.");
        String[] y = b.split("\\.");
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            int p = i < x.length ? parse(x[i]) : 0;
            int q = i < y.length ? parse(y[i]) : 0;
            if (p != q) return p > q;
        }
        return false;
    }

    private static int parse(String s) {
        try { return Integer.parseInt(s.replaceAll("[^0-9].*$", "")); } catch (NumberFormatException e) { return 0; }
    }
}
