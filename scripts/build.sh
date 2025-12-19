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
# Target platform
# ========================
GOOS="${GOOS:-$(go env GOOS)}"
GOARCH="${GOARCH:-$(go env GOARCH)}"

EXT=""
if [ "$GOOS" = "windows" ]; then
  EXT=".exe"
fi

OUT_NAME="${APP_NAME}-${GOOS}-${GOARCH}${EXT}"

echo "module : $MODULE_PATH"
echo "app    : $APP_NAME"
echo "target : $GOOS / $GOARCH"
echo "output : build/$OUT_NAME"

mkdir -p "$BUILD_DIR"

# ========================
# Build frontend
# ========================
echo "build frontend"
cd "$ROOT_DIR/frontend"
npm install
npm run build
touch dist/.keep

# ========================
# Build backend
# ========================
echo "build backend"
cd "$ROOT_DIR"
GOOS="$GOOS" GOARCH="$GOARCH" \
CGO_ENABLED=0 \
go build \
  -trimpath \
  -ldflags="-s -w" \
  -o "$BUILD_DIR/$OUT_NAME"

echo "build success"
echo "$BUILD_DIR/$OUT_NAME"
