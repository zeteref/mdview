# Maintainer: zeteref <zeteref@gmail.com>

pkgname=mdview-git
_pkgname=mdview
pkgver=r1.0000000
pkgrel=1
pkgdesc="Markdown viewer (Electron) with a TOC and adjustable text/width"
arch=('any')
url="https://github.com/zeteref/mdview"
license=('MIT')
depends=('electron' 'pandoc' 'bash')
makedepends=()
provides=("$_pkgname")
conflicts=("$_pkgname")
replaces=("$_pkgname")
source=("$_pkgname::git+https://github.com/zeteref/mdview.git")
sha256sums=('SKIP')

pkgver() {
  cd "$_pkgname"
  printf "r%s.%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short=7 HEAD)"
}

package() {
  local appdir="$pkgdir/usr/lib/$_pkgname"

  install -dm755 "$appdir" "$pkgdir/usr/bin" "$appdir/vendor"

  install -m644 \
    "$_pkgname/main.js" \
    "$_pkgname/preload.js" \
    "$_pkgname/inject.css" \
    "$_pkgname/inject.js" \
    "$_pkgname/package.json" \
    "$appdir/"

  install -m644 "$_pkgname/vendor/markdown-it.min.js" "$appdir/vendor/"
  install -Dm644 "$_pkgname/LICENSE" "$pkgdir/usr/share/licenses/$_pkgname/LICENSE"
  install -m755 "$_pkgname/$_pkgname" "$pkgdir/usr/bin/$_pkgname"
}
