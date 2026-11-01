# WebKit mobile verification

The checks use Playwright WebKit build 2370 on Linux WPE with mobile viewports at 375, 390 and 430 CSS pixels. This is a WebKit engine check, not a physical iPhone or the Safari application.

The installed browser could not launch because the container lacks shared libraries. Official Debian 13 packages were downloaded and extracted under `/tmp/mya-webkit-userland` without root access, package installation or application configuration changes:

- `libgraphene-1.0-0`, `libgtk-4-1`, `libharfbuzz-icu0`, `libhyphen0`, `libgles2`, `libmanette-0.2-0`, `libhidapi-hidraw0`.

The ordinary bundled shell launcher replaces `LD_LIBRARY_PATH`. The temporary launcher preserves the installed browser's three resource locations and adds the extracted libraries:

```sh
#!/bin/sh
export WEBKIT_EXEC_PATH=/home/agent/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin
export WEBKIT_INJECTED_BUNDLE_PATH=/home/agent/.cache/ms-playwright/webkit-2370/minibrowser-wpe/lib
export WEBKIT_INSPECTOR_RESOURCES_PATH=/home/agent/.cache/ms-playwright/webkit-2370/minibrowser-wpe/share
export LD_LIBRARY_PATH=/tmp/mya-webkit-userland/root/usr/lib/x86_64-linux-gnu:/home/agent/.cache/ms-playwright/webkit-2370/minibrowser-wpe/lib:/home/agent/.cache/ms-playwright/webkit-2370/minibrowser-wpe/sys/lib
exec /home/agent/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser "$@"
```

Saved as `/tmp/mya-webkit-userland/run-webkit.sh`, executable by the current user. The exact Playwright launch is:

```js
const browser = await webkit.launch({
  headless: true,
  executablePath: '/tmp/mya-webkit-userland/run-webkit.sh',
});
```

The test command, run from the application repository, is:

```sh
node /tmp/mya-webkit-userland/verify.mjs
```

The temporary script targets `http://127.0.0.1:3000`; all HTTP methods except GET, HEAD and OPTIONS are blocked. Cart changes are isolated browser storage. It checks home, menu, real Lattafa Asad edition selection and the cart drawer at all three requested widths. Separate navigation checks at 320, 390 and 430 also verify Tab/Shift+Tab containment, Escape and trigger restoration, page inert/scroll lock restoration, actual Medicube search and real subcategory navigation. No order, payment, account or database write is performed.

Results and screenshots are in `webkit-results.json`, `webkit-390.png`, `webkit-menu-390.png`, `webkit-pdp-390.png` and `webkit-cart-390.png`. The temporary dependencies and script are not part of the storefront runtime.

`webkit-navigation-results.json` records the separate detailed navigation run. All requested checks passed: zero runtime page errors and no horizontal overflow. The selected real edition, **Asad Zanzibar (Sal Marina & Agua de Coco)**, was asserted in the cart at each of the three requested widths.

To download and unpack the libraries again with an already configured temporary APT list directory:

```sh
cd /tmp/mya-webkit-userland/debs
APT_CONFIG=/tmp/mya-webkit-userland/apt.conf /usr/bin/apt-get download \
  libgraphene-1.0-0 libgtk-4-1 libharfbuzz-icu0 libhyphen0 libgles2 \
  libmanette-0.2-0 libhidapi-hidraw0
for package in *.deb; do
  dpkg-deb -x "$package" /tmp/mya-webkit-userland/root
done
```

The APT configuration and lists used by that command are isolated in `/tmp/mya-webkit-userland`; they do not replace system APT configuration. Package downloads and extraction never execute installation scripts.
