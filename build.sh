#!/bin/bash
# ympd build script
set -e

echo "=== Building ympd ==="

BUILD_DIR="build"

if [ ! -d "$BUILD_DIR" ]; then
    mkdir -p "$BUILD_DIR"
fi

cd "$BUILD_DIR"

echo "Configuring with CMake..."
cmake ..

echo "Compiling with Make..."
make -j$(nproc 2>/dev/null || echo 2)

echo "=== Build completed successfully! Executable generated at: ${BUILD_DIR}/ympd ==="
