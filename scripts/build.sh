#!/usr/bin/env bash
set -e

# script -> root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build"

# ========================
# Resolve app name from go.mod
# ========================
if [ ! -f "$ROOT_DIR/go.mod" ]; then
  echo "error: go.mod not found in project root"
  exit 1
fi

MODULE_PATH="$(grep '^module ' "$ROOT_DIR/go.mod" | awk '{print $2}')"
APP_NAME="${MODULE_PATH##*/}"

# ========================
# Build frontend first (only once)
# ========================
build_frontend() {
  echo "==> Building frontend..."
  cd "$ROOT_DIR/frontend"
  npm ci
  npm run build
  touch dist/.keep
  cd "$ROOT_DIR"
}

# ========================
# Build single target
# ========================
build_single() {
  local os=$1
  local arch=$2
  
  local ext=""
  if [ "$os" = "windows" ]; then
    ext=".exe"
  fi
  
  local out_name="${APP_NAME}-${os}-${arch}${ext}"
  
  echo "==> Building $out_name..."
  
  GOOS="$os" GOARCH="$arch" CGO_ENABLED=0 \
    go build \
      -trimpath \
      -ldflags="-s -w -X main.Version=${VERSION:-dev}" \
      -o "$BUILD_DIR/$out_name"
  
  echo "    Built: $BUILD_DIR/$out_name"
}

# ========================
# Build all platforms
# ========================
build_all() {
  echo "Building for all platforms..."
  
  # Windows
  build_single windows 386
  build_single windows amd64
  build_single windows arm64
  
  # macOS
  build_single darwin amd64
  build_single darwin arm64
  
  # Linux
  build_single linux 386
  build_single linux amd64
  build_single linux arm64
}

# ========================
# Main
# ========================
mkdir -p "$BUILD_DIR"

echo "module : $MODULE_PATH"
echo "app    : $APP_NAME"
echo "version: ${VERSION:-dev}"

# Build frontend
build_frontend

# Check if building all platforms or single target
if [ "$1" = "all" ]; then
  build_all
else
  # Single target build (default to current platform)
  GOOS="${GOOS:-$(go env GOOS)}"
  GOARCH="${GOARCH:-$(go env GOARCH)}"
  echo "target : $GOOS / $GOARCH"
  build_single "$GOOS" "$GOARCH"
fi

echo ""
echo "==> Build complete!"
ls -la "$BUILD_DIR/"
