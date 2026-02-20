# Fix: setuptools installed but pkg_resources still not found

## Problem
Even though `setuptools` is installed, the systemd service still can't find `pkg_resources`. This usually means:
1. The service is using a different Python environment
2. The virtual environment path in the service file is incorrect
3. The PATH environment variable doesn't include the venv

## Diagnostic Steps

### Step 1: Check if setuptools is in the correct venv
```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
python -c "import pkg_resources; print('pkg_resources found')"
which python
pip show setuptools
```

### Step 2: Check what Python the service is using
```bash
# Check the service file
cat /etc/systemd/system/crickcoach-backend.service | grep ExecStart
```

### Step 3: Test the exact command the service uses
```bash
cd /root/CricketCoachinAI
/root/CricketCoachinAI/myenv/bin/python3 -c "import pkg_resources; print('Success')"
```

## Solution 1: Reinstall setuptools in the venv

```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
pip uninstall setuptools -y
pip install setuptools
pip install --upgrade setuptools wheel
```

## Solution 2: Update the service file to ensure correct PATH

The service file should have the venv in the PATH. Update it:

```bash
nano /etc/systemd/system/crickcoach-backend.service
```

Make sure the Environment line includes the venv bin:
```ini
Environment=PATH=/root/CricketCoachinAI/myenv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

Then reload:
```bash
systemctl daemon-reload
systemctl restart crickcoach-backend.service
```

## Solution 3: Install setuptools using the exact Python path

```bash
/root/CricketCoachinAI/myenv/bin/pip install --upgrade setuptools
```

## Solution 4: Check Python version compatibility

Python 3.12 might have issues. Check:
```bash
/root/CricketCoachinAI/myenv/bin/python3 --version
```

If it's Python 3.12, you might need to ensure compatibility:
```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
pip install --upgrade pip setuptools wheel
pip install --force-reinstall setuptools
```

## Solution 5: Verify the import works manually

```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
python3 -c "import tensorflow_hub as hub; print('tensorflow_hub imported successfully')"
```

If this works but the service doesn't, the issue is with the service configuration.

## Check Service Logs

After trying the fixes:
```bash
journalctl -u crickcoach-backend.service -n 100 --no-pager
```

Look for the exact error message to see what's happening.

