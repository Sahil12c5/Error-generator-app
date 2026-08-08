#!/bin/bash
echo "[AUTO-HEALING] Triggering flush-redis-cache.sh..."
echo "Simulating Redis cache flush to fix RedisCacheException..."
sleep 2
echo "[AUTO-HEALING] Success! Redis cache has been flushed."
