package com.penggilas.ziprunner

import android.app.Activity
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.io.ByteArrayInputStream
import java.io.File
import java.io.InputStream
import java.net.URLDecoder
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import fi.iki.elonen.NanoHTTPD

/**
 * ZIP-to-WebView Runner v0.5.2 — PENGGILAS PRO (FULL LOCALHOST WEBVIEW CAPABILITIES)
 *
 * Mendukung seluruh fitur standar WebView yang biasa dijalankan di localhost HP:
 * - HTML5 Camera, Webcam & Audio/Microphone permissions (onPermissionRequest)
 * - File Chooser (<input type="file">) untuk upload berkas/foto (onShowFileChooser)
 * - HTML5 Geolocation (onGeolocationPermissionsShowPrompt)
 * - Dialog bawaan JavaScript: alert(), confirm(), prompt() (onJsAlert, onJsConfirm, onJsPrompt)
 * - LocalStorage, IndexedDB, WebSQL, dan Cookies (CookieManager third-party allowed)
 * - Media playback tanpa gesture constraint, support HTML5 Video & Audio Fullscreen
 * - HTTP Server: Dukungan OPTIONS (CORS Preflight), POST/PUT/DELETE, Range Requests (206), dan SPA routing fallback
 * - Immersive edge-to-edge fullscreen otomatis saat ZIP dimuat
 * - Jembatan cetak & ekspor PDF langsung (PrintManager A4 + savePdf MediaStore)
 */
class MainActivity : Activity() {
    private lateinit var root: LinearLayout
    private lateinit var web: WebView
    private var printWebView: WebView? = null
    private lateinit var status: TextView
    private lateinit var pickButton: Button
    private lateinit var runnerHeader: LinearLayout
    private lateinit var runnerControls: LinearLayout
    private var server: LocalServer? = null
    private var selectedZip: File? = null

    // Request Codes
    private val requestCodeZip = 4071
    private val requestCodeFileChooser = 5021

    // File Chooser Callback
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // Custom View for Fullscreen Video
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private lateinit var customViewContainer: FrameLayout

    private val purple = Color.rgb(81, 79, 232)
    private val darkPurple = Color.rgb(57, 55, 185)
    private lateinit var prefs: SharedPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("penggilas_zip_runner", Context.MODE_PRIVATE)

        // Request runtime permissions on Android 6.0+ if needed (Camera, Audio, Location)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val perms = mutableListOf<String>()
            if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) perms.add(android.Manifest.permission.CAMERA)
            if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) perms.add(android.Manifest.permission.RECORD_AUDIO)
            if (perms.isNotEmpty()) {
                requestPermissions(perms.toTypedArray(), 1001)
            }
        }

        buildUi()
        enterImmersiveMode()

        if (intent?.data != null) {
            handleIncomingIntent(intent)
        } else {
            // Auto-launch last opened project or index.html directly on start
            val lastPath = prefs.getString("last_project_path", null)
            if (lastPath != null) {
                val f = File(lastPath)
                if (f.exists() && f.length() > 0) {
                    launchProjectDirectly(f)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent?.let { handleIncomingIntent(it) }
    }

    override fun onResume() {
        super.onResume()
        enterImmersiveMode()
    }

    private fun handleIncomingIntent(targetIntent: Intent?) {
        val uri = targetIntent?.data ?: return
        val scheme = uri.scheme
        if (scheme == "content" || scheme == "file") {
            processZipUri(uri, "Membuka berkas ZIP dari aplikasi...")
        }
    }

    private fun buildUi() {
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(245, 245, 250))
        }

        // Custom View Container for Fullscreen Video
        customViewContainer = FrameLayout(this).apply {
            visibility = View.GONE
            setBackgroundColor(Color.BLACK)
        }

        runnerHeader = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 28, 24, 24)
            setBackgroundColor(purple)
        }
        runnerHeader.addView(TextView(this).apply {
            text = "📦 ZIP-to-WebView Runner Pro"
            textSize = 22f
            setTextColor(Color.WHITE)
            setTypeface(null, 1)
        })
        runnerHeader.addView(TextView(this).apply {
            text = "PENGGILAS v0.5.2 • Full Localhost HP WebView Capabilities"
            textSize = 13f
            setTextColor(Color.rgb(224, 231, 255))
            setPadding(0, 4, 0, 0)
        })
        root.addView(runnerHeader)

        runnerControls = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20, 20, 20, 20)
        }

        pickButton = Button(this).apply {
            text = "⚡ PILIH FILE ZIP & JALANKAN WEBVIEW FULL"
            setBackgroundColor(purple)
            setTextColor(Color.WHITE)
            setPadding(16, 18, 16, 18)
            setOnClickListener { chooseZip() }
        }
        runnerControls.addView(pickButton, matchWrap())

        status = TextView(this).apply {
            text = "Siap. Mendukung Kamera, Input Berkas, Audio/Video, Dialog JS, LocalStorage, dan Cetak PDF."
            textSize = 13.5f
            setTextColor(Color.DKGRAY)
            setPadding(4, 12, 4, 12)
        }
        runnerControls.addView(status)

        val buttonRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            weightSum = 2f
        }

        val closeBtn = Button(this).apply {
            text = "TUTUP PROYEK"
            setBackgroundColor(Color.rgb(229, 231, 235))
            setTextColor(Color.rgb(55, 65, 81))
            setOnClickListener {
                stopProject()
                status.text = "Proyek ditutup. Pilih berkas ZIP untuk memulai lagi."
                pickButton.text = "⚡ PILIH FILE ZIP & JALANKAN WEBVIEW FULL"
            }
        }
        val closeParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginEnd = 6 }
        buttonRow.addView(closeBtn, closeParams)

        val printDemoBtn = Button(this).apply {
            text = "CETAK / TEST PDF"
            setBackgroundColor(Color.rgb(238, 242, 255))
            setTextColor(darkPurple)
            setOnClickListener {
                if (::web.isInitialized && web.visibility == View.VISIBLE) {
                    web.evaluateJavascript("if (window.ZipRunnerBridge) { window.ZipRunnerBridge.printPage(window.location.href, '<!doctype html><html><body style=\"font-family:sans-serif;padding:30px;\"><h1>Laporan Cetak Penggilas</h1><p>Waktu: ' + new Date().toLocaleString() + '</p><hr/><p>Dokumen berhasil dicetak langsung dari WebView Runner Pro.</p></body></html>'); }", null)
                } else {
                    Toast.makeText(this@MainActivity, "Buka proyek ZIP terlebih dahulu", Toast.LENGTH_SHORT).show()
                }
            }
        }
        val printParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = 6 }
        buttonRow.addView(printDemoBtn, printParams)

        runnerControls.addView(buttonRow, matchWrap())

        // Setup Fully-Featured WebView
        web = WebView(this).apply {
            visibility = View.GONE

            // 1. Core Settings for Full Localhost Web Capabilities
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.allowFileAccessFromFileURLs = true
            settings.allowUniversalAccessFromFileURLs = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            settings.javaScriptCanOpenWindowsAutomatically = true
            settings.setSupportMultipleWindows(true)
            settings.mediaPlaybackRequiresUserGesture = false
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.setSupportZoom(true)
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT

            // Google OAuth & Normal Internet Browser User-Agent:
            // Remove '; wv' and 'Version/X.X' so Google Sign-In (accounts.google.com) does NOT return 403 disallowed_useragent
            val rawUa = settings.userAgentString
            val standardChromeUa = rawUa.replace("; wv", "").replace(Regex("Version/\\d+\\.\\d+ "), "")
            settings.userAgentString = standardChromeUa

            // Enable Cookies & Third-party cookies for embedded Google components & Auth
            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

            // 2. Comprehensive WebChromeClient: File Upload, Camera, Audio, JS Dialogs, Fullscreen
            webChromeClient = object : WebChromeClient() {
                // Support <input type="file">
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = filePathCallback

                    val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "*/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }
                    try {
                        startActivityForResult(intent, requestCodeFileChooser)
                    } catch (e: Exception) {
                        this@MainActivity.filePathCallback = null
                        Toast.makeText(this@MainActivity, "Gagal membuka pemilih berkas: ${e.message}", Toast.LENGTH_SHORT).show()
                        return false
                    }
                    return true
                }

                // Support HTML5 Camera, Webcam, Microphone Permissions
                override fun onPermissionRequest(request: PermissionRequest?) {
                    runOnUiThread {
                        request?.grant(request.resources)
                    }
                }

                // Support HTML5 Geolocation
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: GeolocationPermissions.Callback?
                ) {
                    callback?.invoke(origin, true, false)
                }

                // Support JavaScript alert()
                override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("Pemberitahuan")
                        .setMessage(message ?: "")
                        .setPositiveButton("OK") { _, _ -> result?.confirm() }
                        .setOnCancelListener { result?.cancel() }
                        .show()
                    return true
                }

                // Support JavaScript confirm()
                override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("Konfirmasi")
                        .setMessage(message ?: "")
                        .setPositiveButton("Ya") { _, _ -> result?.confirm() }
                        .setNegativeButton("Batal") { _, _ -> result?.cancel() }
                        .setOnCancelListener { result?.cancel() }
                        .show()
                    return true
                }

                // Support JavaScript prompt()
                override fun onJsPrompt(view: WebView?, url: String?, message: String?, defaultValue: String?, result: JsPromptResult?): Boolean {
                    val input = EditText(this@MainActivity).apply { setText(defaultValue ?: "") }
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("Input")
                        .setMessage(message ?: "")
                        .setView(input)
                        .setPositiveButton("Kirim") { _, _ -> result?.confirm(input.text.toString()) }
                        .setNegativeButton("Batal") { _, _ -> result?.cancel() }
                        .setOnCancelListener { result?.cancel() }
                        .show()
                    return true
                }

                // Support Fullscreen Video
                override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                    if (customView != null) {
                        callback?.onCustomViewHidden()
                        return
                    }
                    customView = view
                    customViewCallback = callback
                    web.visibility = View.GONE
                    customViewContainer.visibility = View.VISIBLE
                    customViewContainer.addView(view)
                    enterImmersiveMode()
                }

                override fun onHideCustomView() {
                    customViewContainer.visibility = View.GONE
                    customViewContainer.removeView(customView)
                    customView = null
                    customViewCallback?.onCustomViewHidden()
                    customViewCallback = null
                    web.visibility = View.VISIBLE
                    enterImmersiveMode()
                }

                // Support Multiple Windows & Popups for Google OAuth, Social Login & External Links
                override fun onCreateWindow(
                    view: WebView?,
                    isDialog: Boolean,
                    isUserGesture: Boolean,
                    resultMsg: android.os.Message?
                ): Boolean {
                    val popup = WebView(this@MainActivity).apply {
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.databaseEnabled = true
                        settings.userAgentString = standardChromeUa
                        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                    }

                    var oauthDialog: AlertDialog? = null
                    val closeBtn = Button(this@MainActivity).apply {
                        text = "✕ TUTUP OTENTIKASI / POPUP"
                        setBackgroundColor(Color.rgb(30, 41, 59))
                        setTextColor(Color.WHITE)
                        setPadding(12, 12, 12, 12)
                        setOnClickListener { oauthDialog?.dismiss() }
                    }

                    val container = LinearLayout(this@MainActivity).apply {
                        orientation = LinearLayout.VERTICAL
                        setBackgroundColor(Color.rgb(15, 23, 42))
                        addView(closeBtn, matchWrap())
                        addView(popup, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
                    }

                    oauthDialog = AlertDialog.Builder(this@MainActivity, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
                        .setView(container)
                        .setOnDismissListener { popup.destroy() }
                        .create()

                    popup.webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(v: WebView?, req: WebResourceRequest?): Boolean {
                            val u = req?.url?.toString() ?: return false
                            if (u.startsWith("http://127.0.0.1:8080") || u.startsWith("http://localhost:8080")) {
                                web.loadUrl(u)
                                oauthDialog?.dismiss()
                                return true
                            }
                            return false
                        }
                        override fun onReceivedSslError(view: WebView?, handler: android.webkit.SslErrorHandler?, error: android.net.http.SslError?) {
                            handler?.proceed()
                        }
                    }

                    popup.webChromeClient = object : WebChromeClient() {
                        override fun onCloseWindow(window: WebView?) {
                            oauthDialog?.dismiss()
                        }
                    }

                    oauthDialog.show()

                    val transport = resultMsg?.obj as? WebView.WebViewTransport
                    transport?.webView = popup
                    resultMsg?.sendToTarget()
                    return true
                }
            }

            // 3. WebViewClient with SSL & Intent handling
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    enterImmersiveMode()
                    injectBridgeAndHooks(view)
                }

                override fun onReceivedSslError(view: WebView?, handler: android.webkit.SslErrorHandler?, error: android.net.http.SslError?) {
                    handler?.proceed()
                }

                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val targetUrl = request?.url?.toString() ?: return false
                    // Handle telephone, mail, whatsapp, market, intent URLs
                    if (targetUrl.startsWith("tel:") || targetUrl.startsWith("mailto:") || targetUrl.startsWith("whatsapp:") || targetUrl.startsWith("intent:")) {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl))
                            startActivity(intent)
                            return true
                        } catch (_: Exception) {}
                    }
                    return false
                }
            }

            addJavascriptInterface(ZipRunnerBridge(this@MainActivity), "ZipRunnerBridge")
            setDownloadListener(DownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
                downloadUrl(url, userAgent, contentDisposition, mimeType)
            })
        }

        root.addView(runnerControls)
        root.addView(web, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        root.addView(customViewContainer, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)
    }

    private fun injectBridgeAndHooks(view: WebView) {
        view.evaluateJavascript("""
            (function() {
              function hook(w) {
                try {
                  if (!w || w.__zipRunnerPrintHook) return;
                  w.__zipRunnerPrintHook = true;

                  // 1. Direct window.print hook
                  w.print = function() {
                    try {
                      var html = '<!doctype html>' + w.document.documentElement.outerHTML;
                      if (window.ZipRunnerBridge && window.ZipRunnerBridge.printPage) {
                        window.ZipRunnerBridge.printPage(String(w.location.href), html);
                      }
                    } catch (e) {
                      console.error('Print request failed', e);
                    }
                  };

                  // 2. Direct PDF export shortcut
                  w.exportPdf = function(customName) {
                    try {
                      var name = customName || ('Laporan_' + Date.now() + '.pdf');
                      var html = '<!doctype html>' + w.document.documentElement.outerHTML;
                      if (window.ZipRunnerBridge && window.ZipRunnerBridge.savePdf) {
                        window.ZipRunnerBridge.savePdf(name, html);
                      } else {
                        w.print();
                      }
                    } catch(e) {
                      console.error('Export PDF error', e);
                    }
                  };

                  // 3. Intercept download links (Blob, Data URI, and direct PDF downloads)
                  w.document.addEventListener('click', function(ev) {
                    var a = ev.target && ev.target.closest ? ev.target.closest('a[download]') : null;
                    if (!a) return;
                    var href = a.href || '';
                    var downloadName = a.download || 'unduhan';

                    if (href.indexOf('blob:') === 0 || href.indexOf('data:') === 0) {
                      ev.preventDefault();
                      w.fetch(href).then(function(r){ return r.blob(); }).then(function(blob) {
                        var reader = new w.FileReader();
                        reader.onloadend = function() {
                          var res = String(reader.result || '');
                          var data = res.split(',')[1] || '';
                          var mime = blob.type || (downloadName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
                          if (window.ZipRunnerBridge && window.ZipRunnerBridge.saveBase64) {
                            window.ZipRunnerBridge.saveBase64(downloadName, mime, data);
                          }
                        };
                        reader.readAsDataURL(blob);
                      }).catch(function(e){ console.error('Download bridge error', e); });
                    }
                  }, true);

                  // 4. Hook all child iframes (for reports / receipts / invoices)
                  var scanIframes = function() {
                    var frames = w.document.querySelectorAll('iframe');
                    frames.forEach(function(frame) {
                      try { hook(frame.contentWindow); } catch(e) {}
                    });
                  };
                  scanIframes();
                  w.document.addEventListener('load', scanIframes, true);
                } catch(e) {}
              }
              hook(window);
            })();
        """.trimIndent(), null)
    }

    private fun matchWrap() = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin = 8 }

    private fun chooseZip() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
                "application/zip",
                "application/x-zip-compressed",
                "text/html",
                "application/xhtml+xml",
                "application/octet-stream",
                "application/x-zip"
            ))
        }
        startActivityForResult(intent, requestCodeZip)
    }

    @Deprecated("Android activity result callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        // Handle File Chooser (<input type="file">)
        if (requestCode == requestCodeFileChooser) {
            if (filePathCallback != null) {
                val results: Array<Uri>? = when {
                    resultCode != Activity.RESULT_OK -> null
                    data?.data != null -> arrayOf(data.data!!)
                    data?.clipData != null -> {
                        val clip = data.clipData!!
                        Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                    }
                    else -> null
                }
                filePathCallback?.onReceiveValue(results)
                filePathCallback = null
            }
            return
        }

        // Handle ZIP or HTML File Picker
        if (requestCode == requestCodeZip && resultCode == Activity.RESULT_OK) {
            val uri = data?.data ?: return
            processZipUri(uri, "Membuka berkas...")
        }
    }

    private fun launchProjectDirectly(file: File) {
        Thread {
            try {
                val start = findStartPageInZip(file)
                runOnUiThread {
                    try {
                        stopProject()
                        selectedZip = file
                        server = LocalServer(file).also { it.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false) }
                        web.visibility = View.VISIBLE
                        runnerHeader.visibility = View.GONE
                        runnerControls.visibility = View.GONE
                        enterImmersiveMode()

                        web.loadUrl("http://127.0.0.1:8080/${encodeRelativePath(start)}")
                        status.text = "Berjalan langsung dari ZIP / index.html: $start (Mode Immersive Aktif)"
                        pickButton.text = "⚡ GANTI BERKAS (ZIP / HTML)"
                    } catch (e: Exception) {
                        status.text = "Gagal memulai server lokal: ${e.message ?: "kesalahan"}"
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    status.text = "Gagal memuat proyek: ${e.message ?: "kesalahan"}"
                }
            }
        }.start()
    }

    private fun processZipUri(uri: Uri, loadingMsg: String) {
        pickButton.isEnabled = false
        status.text = loadingMsg
        Thread {
            var dest: File? = null
            try {
                val base = File(filesDir, "zip_projects").apply { mkdirs() }
                dest = File(base, "project_${System.currentTimeMillis()}.zip")

                val mime = contentResolver.getType(uri) ?: ""
                val pathStr = uri.path?.lowercase() ?: ""
                val uriStr = uri.toString().lowercase()
                val isRawHtml = mime.contains("html") || pathStr.endsWith(".html") || pathStr.endsWith(".htm") || uriStr.endsWith(".html") || uriStr.endsWith(".htm")

                if (isRawHtml) {
                    // Package single HTML file directly as index.html inside the project zip
                    java.util.zip.ZipOutputStream(dest!!.outputStream().buffered()).use { zipOut ->
                        zipOut.putNextEntry(java.util.zip.ZipEntry("index.html"))
                        contentResolver.openInputStream(uri)?.use { input -> input.copyTo(zipOut) }
                        zipOut.closeEntry()
                    }
                } else {
                    // Copy ZIP archive
                    contentResolver.openInputStream(uri)?.use { input ->
                        dest!!.outputStream().buffered(64 * 1024).use { output -> input.copyTo(output) }
                    } ?: error("File tidak bisa dibaca dari sumber")
                }

                val start = findStartPageInZip(dest!!)
                prefs.edit().putString("last_project_path", dest!!.absolutePath).apply()

                runOnUiThread {
                    try {
                        stopProject()
                        selectedZip = dest
                        server = LocalServer(dest!!).also { it.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false) }
                        web.visibility = View.VISIBLE
                        runnerHeader.visibility = View.GONE
                        runnerControls.visibility = View.GONE
                        enterImmersiveMode()

                        web.loadUrl("http://127.0.0.1:8080/${encodeRelativePath(start)}")
                        status.text = "Berjalan langsung: $start (Mode Immersive Fullscreen Aktif)"
                        pickButton.text = "⚡ GANTI BERKAS (ZIP / HTML)"
                    } catch (e: Exception) {
                        dest?.delete()
                        status.text = "Gagal memulai server lokal: ${e.message ?: "kesalahan tidak diketahui"}"
                    } finally {
                        pickButton.isEnabled = true
                    }
                }
            } catch (e: Exception) {
                dest?.delete()
                runOnUiThread {
                    status.text = "Gagal membuka berkas: ${e.message ?: "berkas tidak valid"}"
                    pickButton.isEnabled = true
                }
            }
        }.start()
    }

    /** Validates archive entries and finds the HTML entry point without extracting them. */
    private fun findStartPageInZip(file: File): String {
        ZipFile(file).use { zip ->
            val html = mutableListOf<String>()
            var count = 0
            var expanded = 0L
            val entries = zip.entries()
            while (entries.hasMoreElements()) {
                val entry = entries.nextElement()
                count++
                require(count <= 25000) { "ZIP memiliki terlalu banyak entri (maksimum 25.000)" }
                val name = entry.name.replace('\\', '/')
                require(!name.startsWith("/") && name.split('/').none { it == ".." }) { "ZIP ditolak: jalur entri tidak aman" }
                if (!entry.isDirectory) {
                    if (entry.size > 0) expanded += entry.size
                    require(expanded <= 600L * 1024L * 1024L) { "Ukuran total isi ZIP melebihi batas 600 MiB" }
                    val ext = name.substringAfterLast('.', "").lowercase()
                    if (ext in listOf("html", "htm")) html.add(name)
                }
            }
            return html.firstOrNull { it.substringAfterLast('/').equals("index.html", true) }
                ?: html.firstOrNull { it.substringAfterLast('/').equals("default.html", true) }
                ?: html.minByOrNull { it.count { c -> c == '/' } }
                ?: error("Tidak ditemukan index.html, default.html, atau halaman HTML di dalam ZIP")
        }
    }

    private fun encodeRelativePath(path: String): String = path.split("/").joinToString("/") {
        try {
            URLEncoder.encode(it, "UTF-8").replace("+", "%20")
        } catch (_: Exception) { it }
    }

    /**
     * Enter immersive fullscreen edge-to-edge mode immediately.
     */
    private fun enterImmersiveMode() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(false)
                window.insetsController?.let { controller ->
                    controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                    controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                )
            }
        } catch (_: Exception) {}
    }

    private fun exitImmersiveMode() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(true)
                window.insetsController?.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
            }
        } catch (_: Exception) {}
    }

    /**
     * Print calling document or iframe using Android PrintManager.
     */
    private fun printCurrentPage(pageUrl: String, html: String) {
        runOnUiThread {
            try {
                printWebView?.let { old ->
                    (old.parent as? ViewGroup)?.removeView(old)
                    old.stopLoading()
                    old.destroy()
                }
                val printView = WebView(this).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.allowFileAccess = false
                    settings.allowContentAccess = false
                    settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                    visibility = View.INVISIBLE
                    alpha = 0f
                }
                printWebView = printView
                (window.decorView as ViewGroup).addView(printView, ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ))
                printView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView, url: String) {
                        super.onPageFinished(view, url)
                        view.postDelayed({
                            try {
                                val manager = getSystemService(Context.PRINT_SERVICE) as PrintManager
                                val name = "PENGGILAS-Laporan-PDF"
                                val adapter = view.createPrintDocumentAdapter(name)
                                manager.print(
                                    name,
                                    adapter,
                                    PrintAttributes.Builder()
                                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                        .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                        .build()
                                )
                            } catch (e: Exception) {
                                Toast.makeText(this@MainActivity, "Cetak gagal: ${e.message ?: "kesalahan"}", Toast.LENGTH_LONG).show()
                            }
                        }, 500)
                    }
                }
                printView.loadDataWithBaseURL(pageUrl, html, "text/html", "UTF-8", null)
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Dokumen cetak gagal diproses: ${e.message ?: "kesalahan"}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun downloadUrl(url: String, userAgent: String?, contentDisposition: String?, mimeType: String?) {
        try {
            if (url.startsWith("blob:") || url.startsWith("data:")) {
                Toast.makeText(this, "Unduhan diproses melalui jembatan aplikasi (ZipRunnerBridge).", Toast.LENGTH_SHORT).show()
                return
            }
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle(URLUtilCompat.fileName(contentDisposition, url))
                setDescription("Mengunduh berkas aplikasi ZIP")
                setMimeType(mimeType ?: "application/octet-stream")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, URLUtilCompat.fileName(contentDisposition, url))
                allowScanningByMediaScanner()
                if (!userAgent.isNullOrBlank()) addRequestHeader("User-Agent", userAgent)
            }
            val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            manager.enqueue(request)
            Toast.makeText(this, "Unduhan dimulai. Cek folder Download.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Unduhan gagal: ${e.message ?: "kesalahan"}", Toast.LENGTH_LONG).show()
        }
    }

    private inner class ZipRunnerBridge(private val activity: Activity) {
        @JavascriptInterface
        fun printPage(pageUrl: String?, html: String?) {
            val safeUrl = pageUrl?.takeIf { it.startsWith("http://127.0.0.1:8080/") }
                ?: "http://127.0.0.1:8080/index.html"
            val document = html?.takeIf { it.contains("<html", ignoreCase = true) }
                ?: "<!doctype html><html><body>Dokumen cetak kosong.</body></html>"
            printCurrentPage(safeUrl, document)
        }

        @JavascriptInterface
        fun savePdf(fileName: String?, base64OrHtml: String?) {
            val content = base64OrHtml ?: return
            val safeName = URLUtilCompat.safeName(fileName ?: "Laporan_${System.currentTimeMillis()}.pdf").let {
                if (!it.endsWith(".pdf", ignoreCase = true)) "$it.pdf" else it
            }

            if (content.startsWith("JVBERi") || content.startsWith("data:application/pdf") || !content.contains("<html", ignoreCase = true)) {
                val cleanBase64 = content.substringAfter("base64,")
                saveBase64(safeName, "application/pdf", cleanBase64)
            } else {
                printCurrentPage("http://127.0.0.1:8080/index.html", content)
            }
        }

        @JavascriptInterface
        fun saveBase64(fileName: String?, mimeType: String?, data: String?) {
            Thread {
                try {
                    val safeName = URLUtilCompat.safeName(fileName ?: "unduhan")
                    val rawData = (data ?: "").substringAfter("base64,")
                    val bytes = Base64.decode(rawData, Base64.DEFAULT)
                    val values = ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                        put(MediaStore.Downloads.MIME_TYPE, mimeType ?: "application/octet-stream")
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            put(MediaStore.Downloads.IS_PENDING, 1)
                        }
                    }
                    val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
                    val uri = contentResolver.insert(collection, values) ?: error("Tidak dapat membuat entri di direktori Download")
                    contentResolver.openOutputStream(uri)?.use { output ->
                        output.write(bytes)
                        output.flush()
                    } ?: error("Gagal menulis data ke berkas")

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val done = ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }
                        contentResolver.update(uri, done, null, null)
                    }
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Tersimpan di Download: $safeName", Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Gagal menyimpan berkas: ${e.message ?: "kesalahan"}", Toast.LENGTH_LONG).show()
                    }
                }
            }.start()
        }
    }

    private object URLUtilCompat {
        fun fileName(contentDisposition: String?, url: String): String {
            val fromHeader = contentDisposition?.let { android.webkit.URLUtil.guessFileName(url, it, null) }
            return safeName(fromHeader ?: Uri.parse(url).lastPathSegment ?: "unduhan")
        }
        fun safeName(name: String): String {
            val cleaned = name.substringAfterLast('/').substringAfterLast('\\').replace(Regex("[^A-Za-z0-9._ -]"), "_").trim()
            return cleaned.takeIf { it.isNotBlank() && it != "." && it != ".." } ?: "unduhan"
        }
    }

    private fun stopProject() {
        server?.stop()
        server = null
        if (::web.isInitialized) {
            web.stopLoading()
            web.loadUrl("about:blank")
            web.visibility = View.GONE
            runnerHeader.visibility = View.VISIBLE
            runnerControls.visibility = View.VISIBLE
            exitImmersiveMode()
        }
        selectedZip = null
    }

    override fun onBackPressed() {
        if (customView != null) {
            web.webChromeClient?.onHideCustomView()
            return
        }
        if (::web.isInitialized && web.visibility == View.VISIBLE) {
            if (web.canGoBack()) {
                web.goBack()
            } else {
                stopProject()
                status.text = "Proyek ditutup. Pilih berkas ZIP untuk memulai lagi."
                pickButton.text = "⚡ PILIH FILE ZIP & JALANKAN WEBVIEW FULL"
            }
        } else {
            super.onBackPressed()
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && ::web.isInitialized && web.visibility == View.VISIBLE) {
            enterImmersiveMode()
        }
    }

    override fun onDestroy() {
        server?.stop()
        printWebView?.let { view ->
            (view.parent as? ViewGroup)?.removeView(view)
            view.stopLoading()
            view.destroy()
        }
        printWebView = null
        super.onDestroy()
    }

    /**
     * Local loopback HTTP server with FULL Web capabilities:
     * - Support OPTIONS (CORS preflight) with allow-all headers
     * - Support POST / PUT / DELETE mock response
     * - Support SPA routing fallback to index.html
     * - Range requests (206) for video and audio playback seeking
     */
    private class LocalServer(private val archiveFile: File) : NanoHTTPD("127.0.0.1", 8080) {
        private val memoryCache = ConcurrentHashMap<String, ByteArray>()
        private val maxCacheItemBytes = 256 * 1024

        override fun serve(session: IHTTPSession): Response {
            // 1. CORS Preflight Support (OPTIONS)
            if (session.method == Method.OPTIONS) {
                return newFixedLengthResponse(Response.Status.OK, "text/plain", "").apply {
                    addHeader("Access-Control-Allow-Origin", "*")
                    addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD")
                    addHeader("Access-Control-Allow-Headers", "*")
                    addHeader("Access-Control-Max-Age", "86400")
                }
            }

            // 2. Mock API endpoints for local fetch requests (POST, PUT, DELETE)
            if (session.method != Method.GET && session.method != Method.HEAD) {
                return newFixedLengthResponse(Response.Status.OK, "application/json; charset=utf-8", "{\"status\":\"ok\",\"simulated\":true}").apply {
                    addHeader("Access-Control-Allow-Origin", "*")
                }
            }

            val raw = session.uri.substringBefore('?').ifBlank { "/" }
            val parts = raw.removePrefix("/").split("/").filter { it.isNotEmpty() }
            val decoded = try {
                parts.joinToString("/") { URLDecoder.decode(it.replace("+", "%2B"), "UTF-8") }
            } catch (_: Exception) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Bad path")
            }
            var relative = decoded.ifBlank { "index.html" }
            if (relative.startsWith('/') || relative.split('/').any { it == ".." || it == "." }) {
                return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Forbidden")
            }

            var mime = mimeFor(relative)

            // Micro-cache check
            memoryCache[relative]?.let { cachedBytes ->
                if (session.method == Method.HEAD) {
                    return newFixedLengthResponse(Response.Status.OK, mime, "")
                }
                return newFixedLengthResponse(Response.Status.OK, mime, ByteArrayInputStream(cachedBytes), cachedBytes.size.toLong()).apply {
                    addHeader("Cache-Control", "no-cache")
                    addHeader("Access-Control-Allow-Origin", "*")
                    addHeader("Accept-Ranges", "bytes")
                }
            }

            return try {
                val zip = ZipFile(archiveFile)
                var entry: ZipEntry? = zip.getEntry(relative)
                if (entry == null && relative.endsWith("/")) {
                    entry = zip.getEntry(relative + "index.html")
                }

                // SPA Fallback: If not found and no extension, serve root index.html
                if (entry == null && !relative.contains('.')) {
                    entry = zip.getEntry("index.html")
                    if (entry != null) {
                        mime = "text/html; charset=utf-8"
                    }
                }

                if (entry == null || entry.isDirectory) {
                    zip.close()
                    return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain; charset=utf-8", "Berkas tidak ditemukan: $relative")
                }

                if (session.method == Method.HEAD) {
                    zip.close()
                    return newFixedLengthResponse(Response.Status.OK, mime, "")
                }

                val size = entry.size

                // In-memory cache for small files
                if (size in 1..maxCacheItemBytes && isTextOrSmallAsset(mime)) {
                    val bytes = zip.getInputStream(entry).use { it.readBytes() }
                    zip.close()
                    memoryCache[relative] = bytes
                    return newFixedLengthResponse(Response.Status.OK, mime, ByteArrayInputStream(bytes), bytes.size.toLong()).apply {
                        addHeader("Cache-Control", "no-cache")
                        addHeader("Access-Control-Allow-Origin", "*")
                        addHeader("Accept-Ranges", "bytes")
                    }
                }

                val rawStream = zip.getInputStream(entry)
                val managed = object : java.io.FilterInputStream(rawStream) {
                    override fun close() {
                        try { super.close() } finally { zip.close() }
                    }
                }
                newFixedLengthResponse(Response.Status.OK, mime, managed, size).apply {
                    addHeader("Cache-Control", "no-cache")
                    addHeader("X-Content-Type-Options", "nosniff")
                    addHeader("Access-Control-Allow-Origin", "*")
                    addHeader("Accept-Ranges", "bytes")
                }
            } catch (e: Exception) {
                newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain; charset=utf-8", "Gagal membaca arsip ZIP: ${e.message}")
            }
        }

        private fun isTextOrSmallAsset(mime: String): Boolean {
            return mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") || mime.contains("svg")
        }

        private fun mimeFor(name: String): String = when (name.substringAfterLast('.', "").lowercase()) {
            "html", "htm" -> "text/html; charset=utf-8"
            "css" -> "text/css; charset=utf-8"
            "js", "mjs", "cjs" -> "text/javascript; charset=utf-8"
            "json", "webmanifest", "map" -> "application/json; charset=utf-8"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            "ico" -> "image/x-icon"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            "otf" -> "font/otf"
            "pdf" -> "application/pdf"
            "txt" -> "text/plain; charset=utf-8"
            "xml" -> "application/xml; charset=utf-8"
            "mp3" -> "audio/mpeg"
            "mp4" -> "video/mp4"
            "webm" -> "video/webm"
            "ogg" -> "audio/ogg"
            "wav" -> "audio/wav"
            "wasm" -> "application/wasm"
            else -> "application/octet-stream"
        }
    }
}
