# Running Backend Script - Quick Guide

## Issue: Logs Not Showing

If logs are not appearing when running `python backend_script.py`, here are the solutions:

## Solution 1: Run with Unbuffered Output (Recommended)

```bash
python -u backend_script.py
```

The `-u` flag forces unbuffered output, so logs will appear immediately.

## Solution 2: Set Environment Variable

```bash
export PYTHONUNBUFFERED=1
python backend_script.py
```

## Solution 3: Check Log Files

Even if console logs don't show, logs are always written to files:

```bash
# View today's log file
tail -f logging/backend_YYYYMMDD.log

# Or view the latest log file
ls -lt logging/ | head -2
tail -f logging/$(ls -t logging/ | head -1)
```

## Running on New Server

### Option 1: Direct Run (for testing)

```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
python -u backend_script.py
```

### Option 2: Using Systemd Service (for production)

The backend should run as a systemd service. Check status:

```bash
# Check service status
systemctl status crickcoach-backend

# View logs
journalctl -u crickcoach-backend -f

# Restart service
systemctl restart crickcoach-backend
```

### Option 3: Run in Background (for testing)

```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
nohup python -u backend_script.py > backend_output.log 2>&1 &
```

Then view logs:
```bash
tail -f backend_output.log
tail -f logging/backend_*.log
```

## Troubleshooting

### 1. Check if script is running
```bash
ps aux | grep backend_script.py
netstat -tlnp | grep 3000
```

### 2. Check for errors
```bash
# Check Python errors
python -u backend_script.py 2>&1 | tee error.log

# Check log files
ls -la logging/
cat logging/backend_*.log | tail -50
```

### 3. Verify dependencies
```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
pip list
```

### 4. Test imports
```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
python -c "import backend_script; print('Imports successful')"
```

## What Changed

The backend script has been updated to:
- ✅ Force unbuffered output for immediate log visibility
- ✅ Add custom StreamHandler that flushes immediately
- ✅ Add better error handling with visible error messages
- ✅ Add explicit flush calls at critical points

## Log Locations

- **Console**: Standard output (if run directly)
- **Log Files**: `logging/backend_YYYYMMDD.log` (daily rotation)
- **Systemd Logs**: `journalctl -u crickcoach-backend` (if running as service)

## Quick Test

```bash
# Test if backend starts
cd /root/CricketCoachinAI
source myenv/bin/activate
timeout 10 python -u backend_script.py || echo "Script started (timeout expected)"
```

If you see the startup logs, the script is working correctly!

