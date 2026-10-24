# Maintainer: zeteref <zeteref@gmail.com>

pkgname=mdview
pkgver=1.0.0
pkgrel=1
pkgdesc="Markdown viewer (Electron) with a TOC and adjustable text/width"
arch=('any')
url="https://github.com/zeteref/mdview"
license=('MIT')
depends=('electron' 'pandoc' 'bash')

# write the built package to /tmp instead of cluttering the source dir
PKGDEST=/tmp

package() {
  local appdir="$pkgdir/usr/lib/$pkgname"

  install -dm755 "$appdir" "$pkgdir/usr/bin" "$appdir/vendor"

  install -m644 \
    "$startdir/main.js" \
    "$startdir/preload.js" \
    "$startdir/inject.css" \
    "$startdir/inject.js" \
    "$startdir/package.json" \
    "$appdir/"

  install -m644 "$startdir/vendor/markdown-it.min.js" "$appdir/vendor/"
  install -Dm644 "$startdir/LICENSE" "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
  install -m755 "$startdir/$pkgname" "$pkgdir/usr/bin/$pkgname"
}
