# Fix: ModuleNotFoundError: No module named 'pkg_resources'

## Problem
The error occurs because `tensorflow-hub` requires `pkg_resources` which comes from `setuptools`, but `setuptools` is not installed in your Python 3.12 virtual environment.

## Solution

### Step 1: SSH into your server
```bash
ssh root@139.59.1.59
```

### Step 2: Navigate to project directory and activate virtual environment
```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
```

### Step 3: Install setuptools
```bash
pip install setuptools
```

Or install with upgrade:
```bash
pip install --upgrade setuptools
```

### Step 4: Verify installation
```bash
python -c "import pkg_resources; print('pkg_resources installed successfully')"
```

### Step 5: Test the backend script
```bash
python -c "import tensorflow_hub as hub; print('tensorflow_hub imported successfully')"
```

### Step 6: Restart the service
```bash
systemctl restart crickcoach-backend.service
systemctl status crickcoach-backend.service
```

## Alternative: Reinstall all requirements

If the above doesn't work, reinstall all requirements:

```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

## Why this happens

- Python 3.12+ doesn't include `setuptools` by default in virtual environments
- `tensorflow-hub` depends on `pkg_resources` from `setuptools`
- The `requirements.txt` has been updated to include `setuptools`, but you need to install it on your server

## Verify the fix

After installing, check the service logs:
```bash
journalctl -u crickcoach-backend.service -n 50 --no-pager
```

You should see the backend starting without the `pkg_resources` error.

