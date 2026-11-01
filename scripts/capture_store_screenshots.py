import os
import sys
import time
import subprocess
from PIL import Image

SCRATCH_DIR = os.path.join(os.path.dirname(__file__), "..", "scratch")
APKPURE_DIR = os.path.join(os.path.dirname(__file__), "..", ".artifacts", "apkpure-store-20261101", "screenshots")
PLAY_DIR = os.path.join(os.path.dirname(__file__), "..", ".artifacts", "google-play-assets", "play-screenshots-v2")

os.makedirs(SCRATCH_DIR, exist_ok=True)
os.makedirs(APKPURE_DIR, exist_ok=True)
os.makedirs(PLAY_DIR, exist_ok=True)

PACKAGE = "com.picket.mobile.bugqa"

def run_adb(cmd):
    full_cmd = f"adb {cmd}"
    res = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
    return res.stdout.strip()

def capture_screen(save_path):
    run_adb("shell screencap -p /sdcard/picket_cap.png")
    run_adb(f"pull /sdcard/picket_cap.png \"{save_path}\"")
    if os.path.exists(save_path):
        return Image.open(save_path)
    return None

def navigate(route):
    url = f"com.picket.mobile://--{route}"
    run_adb(f"shell am start -W -a android.intent.action.VIEW -d \"{url}\" {PACKAGE}")
    time.sleep(1.2)

def is_locked(im):
    # Check if lock card or lock screen is present
    # Lock screen has a large black or centered card with solid button at y=1190
    w, h = im.size
    # Check if navbar is visible at y = h - 60
    nav_colors = set()
    for x in range(50, w - 50, 40):
        nav_colors.add(im.getpixel((x, h - 50))[:3])
    # If all nav sample points are identical black/dark, it might be locked or subscreen
    return False

def make_apkpure_image(im, out_path):
    # Target: 1080x2160 JPEG
    # im is 720x1520. Aspect ratio = 1520 / 720 = 2.111. 2160 / 1080 = 2.0
    # Scale width to 1080 -> height = 1080 * 1520 // 720 = 2280.
    # Center-crop or fit into 1080x2160
    target_w, target_h = 1080, 2160
    # Scale to fill width
    scaled = im.resize((target_w, int(im.height * target_w / im.width)), Image.Resampling.LANCZOS)
    if scaled.height > target_h:
        # crop top/bottom slightly or keep from top
        top = (scaled.height - target_h) // 2
        final_im = scaled.crop((0, top, target_w, top + target_h))
    else:
        final_im = scaled.resize((target_w, target_h), Image.Resampling.LANCZOS)
    final_im.convert("RGB").save(out_path, "JPEG", quality=95)
    print(f"Saved APKPure screenshot: {out_path} ({os.path.getsize(out_path):,} bytes)")

def make_play_image(im, out_path, bg_color):
    # Target: 1170x2340 JPEG (Play Store phone screenshot, <= 2:1 ratio)
    target_w, target_h = 1170, 2340
    # Canvas with matching theme color
    canvas = Image.new("RGB", (target_w, target_h), bg_color)
    # Scale im to 1080 width
    scaled_w = 1080
    scaled_h = int(im.height * scaled_w / im.width)
    scaled = im.resize((scaled_w, min(scaled_h, target_h)), Image.Resampling.LANCZOS).convert("RGB")
    # Paste centered horizontally (margin = (1170 - 1080) / 2 = 45px each side)
    x_offset = (target_w - scaled_w) // 2
    y_offset = (target_h - scaled.height) // 2
    canvas.paste(scaled, (x_offset, y_offset))
    canvas.save(out_path, "JPEG", quality=95)
    print(f"Saved Play screenshot: {out_path} ({os.path.getsize(out_path):,} bytes)")

if __name__ == "__main__":
    print("Capturing live screen...")
    test_cap = os.path.join(SCRATCH_DIR, "live_check.png")
    im = capture_screen(test_cap)
    if im is None:
        print("ERROR: Failed to capture screen from adb.")
        sys.exit(1)
    print(f"Current screen captured: {im.size}")
