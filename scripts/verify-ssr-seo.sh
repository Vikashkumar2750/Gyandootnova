#!/usr/bin/env bash
# Repeatable SSR/SEO verification via curl (no JS execution).
# Confirms brand-entity signals are baked into the raw HTML that Googlebot &
# social crawlers see: Organization JSON-LD, BreadcrumbList JSON-LD, About text,
# titles, meta description, canonical, and og:* tags.
#
# Usage:
#   ./scripts/verify-ssr-seo.sh                       # default host
#   ./scripts/verify-ssr-seo.sh https://gyandootnova.in
#   BASE=https://gyandootnova.in ./scripts/verify-ssr-seo.sh
#
# Exit code is non-zero if any required signal is missing.

set -u

BASE="${1:-${BASE:-https://gyandootnova.in}}"
BASE="${BASE%/}"
UA="Mozilla/5.0 (compatible; GyandootNovaSEOCheck/1.0; +https://gyandootnova.in)"
TMP="$(mktemp -d)"
FAILS=0
CHECKS=0

trap 'rm -rf "$TMP"' EXIT

c_red()   { printf '\033[31m%s\033[0m' "$1"; }
c_green() { printf '\033[32m%s\033[0m' "$1"; }
c_dim()   { printf '\033[2m%s\033[0m' "$1"; }

fetch() {
  local url="$1" out="$2"
  # curl bypasses service workers entirely (SW runs only in browsers), so raw
  # HTML here always reflects what the CDN/origin returns — not a hydrated /
  # SW-cached response. We still send explicit no-cache headers + a per-request
  # cache-buster query so no intermediary (Cloudflare, browser proxy, corporate
  # proxy) can serve a stale copy.
  local sep='?'; [[ "$url" == *\?* ]] && sep='&'
  curl -sSL --compressed \
    -A "$UA" \
    -H "Cache-Control: no-cache, no-store, max-age=0" \
    -H "Pragma: no-cache" \
    -H "Expires: 0" \
    -H "Accept: text/html,application/xhtml+xml" \
    -H "Accept-Language: hi-IN,hi;q=0.9,en;q=0.8" \
    -H "Service-Worker: script" \
    "${url}${sep}_nocache=$(date +%s%N)" -o "$out"
}


# check <path> <label> <grep-pattern> [--regex]
check() {
  local path="$1" label="$2" pattern="$3" flag="${4:-}"
  CHECKS=$((CHECKS + 1))
  local file="$TMP/$(echo "$path" | tr '/' '_').html"
  [ -s "$file" ] || fetch "${BASE}${path}" "$file"

  if [ ! -s "$file" ]; then
    printf '  %s %s  %s\n' "$(c_red '✗')" "$label" "$(c_dim '(empty response)')"
    FAILS=$((FAILS + 1)); return
  fi

  local grep_cmd=(grep -q)
  [ "$flag" = "--regex" ] && grep_cmd=(grep -Eq)

  if "${grep_cmd[@]}" -- "$pattern" "$file"; then
    printf '  %s %s\n' "$(c_green '✓')" "$label"
  else
    printf '  %s %s  %s\n' "$(c_red '✗')" "$label" "$(c_dim "pattern: $pattern")"
    FAILS=$((FAILS + 1))
  fi
}

section() { printf '\n%s\n' "$1"; }

echo "SSR/SEO verification against $BASE"
echo "(raw HTML only — no JavaScript executed)"

section "Homepage  /"
check "/" "title contains GyandootNova"          '<title>[^<]*GyandootNova' --regex
check "/" "meta description contains GyandootNova" 'name="description"[^>]*GyandootNova' --regex
check "/" "canonical points at gyandootnova.in"  'rel="canonical"[^>]*gyandootnova\.in' --regex
check "/" "og:title present"                     'property="og:title"'
check "/" "og:url present"                       'property="og:url"'
check "/" "og:type present"                      'property="og:type"'
check "/" "twitter:card present"                 'name="twitter:card"'
check "/" "Organization JSON-LD"                 '"@type":"Organization"'
check "/" "WebSite JSON-LD"                      '"@type":"WebSite"'
check "/" "sameAs present in JSON-LD"            '"sameAs"'
check "/" "About brand section (Gyandoot Nova)"  'also known as Gyandoot Nova'

section "Books listing  /books"
check "/books" "title present"                    '<title>[^<]+</title>' --regex
check "/books" "meta description present"         'name="description"'
check "/books" "canonical /books"                 'rel="canonical"[^>]*/books"' --regex
check "/books" "og:url /books"                    'property="og:url"[^>]*/books' --regex
check "/books" "BreadcrumbList JSON-LD"           '"@type":"BreadcrumbList"'
check "/books" "Breadcrumb item GyandootNova"     '"name":"GyandootNova"'
check "/books" "Breadcrumb item Books"            '"name":"Books"'
check "/books" "visible GyandootNova anchor"      '>GyandootNova<'

section "Articles listing  /articles"
check "/articles" "title present"                 '<title>[^<]+</title>' --regex
check "/articles" "canonical /articles"           'rel="canonical"[^>]*/articles"' --regex
check "/articles" "BreadcrumbList JSON-LD"        '"@type":"BreadcrumbList"'
check "/articles" "Breadcrumb item Articles"      '"name":"Articles"'
check "/articles" "visible GyandootNova anchor"   '>GyandootNova<'

# Optional: check a real book/article detail slug if provided
if [ -n "${BOOK_SLUG:-}" ]; then
  section "Book detail  /books/$BOOK_SLUG"
  check "/books/$BOOK_SLUG" "BreadcrumbList JSON-LD" '"@type":"BreadcrumbList"'
  check "/books/$BOOK_SLUG" "visible GyandootNova anchor" '>GyandootNova<'
  check "/books/$BOOK_SLUG" "canonical present"      'rel="canonical"'
fi
if [ -n "${ARTICLE_SLUG:-}" ]; then
  section "Article detail  /articles/$ARTICLE_SLUG"
  check "/articles/$ARTICLE_SLUG" "BreadcrumbList JSON-LD" '"@type":"BreadcrumbList"'
  check "/articles/$ARTICLE_SLUG" "visible GyandootNova anchor" '>GyandootNova<'
  check "/articles/$ARTICLE_SLUG" "canonical present" 'rel="canonical"'
fi

echo
echo "─────────────────────────────────────────────"
if [ "$FAILS" -eq 0 ]; then
  printf '%s  %d/%d checks passed against %s\n' "$(c_green 'PASS')" "$CHECKS" "$CHECKS" "$BASE"
  exit 0
else
  printf '%s  %d/%d checks failed against %s\n' "$(c_red 'FAIL')" "$FAILS" "$CHECKS" "$BASE"
  exit 1
fi
