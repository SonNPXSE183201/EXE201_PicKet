"""Publish an already-built static landing on the VPS; never deploy web/API.

Called by apps/landing/scripts/deploy.ps1 over SSH. Python 3.12+ required.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
from datetime import datetime, timezone


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', required=True)
    args = parser.parse_args()
    base = Path('/opt/picket')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    task = base / 'deploy/backups' / ('landing-' + stamp)
    stage = task / 'stage'
    backup = task / 'before'
    stage.mkdir(parents=True)
    backup.mkdir()
    with tarfile.open(args.archive) as archive:
        archive.extractall(stage, filter='data')
    manifest = json.loads((stage / 'release.json').read_text())
    filename = manifest['filename']
    if not re.fullmatch(r'[a-z0-9][a-z0-9.-]*\.apk', filename) or '..' in filename:
        raise ValueError('Invalid APK filename')
    if manifest['packageName'] != 'com.picket.mobile' or manifest['abi'] != 'arm64-v8a':
        raise ValueError('Production ARM64 package required')
    apk = stage / 'downloads' / filename
    if apk.stat().st_size != manifest['bytes'] or digest(apk) != manifest['sha256']:
        raise ValueError('APK verification failed')
    for name in ['index.html', 'privacy.html', 'account-deletion.html', 'release.json']:
        if not (stage / name).is_file() or '{{' in (stage / name).read_text():
            raise ValueError('Incomplete landing build: ' + name)
    if (stage / 'downloads' / (filename + '.sha256')).read_text().split()[0] != manifest['sha256']:
        raise ValueError('Checksum file mismatch')
    target = base / 'apps/landing/dist'
    current_apk = target / 'downloads' / filename
    if current_apk.exists() and digest(current_apk) != manifest['sha256']:
        raise ValueError('Refusing to overwrite an immutable APK URL')
    names = ['index.html', 'privacy.html', 'account-deletion.html', 'release.json', 'launch-assets']
    for name in names:
        source = target / name
        if source.is_dir():
            shutil.copytree(source, backup / name)
        elif source.exists():
            shutil.copy2(source, backup / name)
    caddy = base / 'deploy/Caddyfile'
    shutil.copy2(caddy, backup / 'Caddyfile')
    protected = ['picket-web-1', 'picket-api-1', 'picket-ocr-worker-1', 'picket-ocr-provider-1']
    inspect = ['docker', 'inspect', '--format', '{{.Id}} {{.State.StartedAt}}'] + protected
    before = subprocess.check_output(inspect, text=True)
    (task / 'protected-services-before.txt').write_text(before)
    try:
        # Assets and APK first; HTML and release metadata are published last.
        shutil.copytree(stage / 'launch-assets', target / 'launch-assets', dirs_exist_ok=True)
        (target / 'downloads').mkdir(exist_ok=True)
        for source in (stage / 'downloads').iterdir():
            if source.name not in [filename, filename + '.sha256']:
                raise ValueError('Unexpected download in archive')
            if source.name != filename or not current_apk.exists():
                shutil.copy2(source, target / 'downloads' / source.name)
        config = caddy.read_text()
        old = "style-src 'self'; base-uri"
        font_only = "style-src 'self'; font-src 'self'; base-uri"
        new = "style-src 'self'; font-src 'self'; script-src 'self'; base-uri"
        with_telemetry = "style-src 'self'; font-src 'self'; script-src 'self'; connect-src 'self'; base-uri"
        if old in config:
            caddy.write_text(config.replace(old, new))
        elif font_only in config:
            caddy.write_text(config.replace(font_only, new))
        elif new not in config and with_telemetry not in config:
            raise ValueError('Unrecognized landing CSP; review Caddy configuration')
        subprocess.run(['docker', 'exec', 'picket-caddy-1', 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile'], check=True)
        for name in names[:-1]:
            temporary = target / (name + '.landing-new')
            shutil.copy2(stage / name, temporary)
            temporary.replace(target / name)
        subprocess.run(['docker', 'exec', 'picket-caddy-1', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile'], check=True)
        if subprocess.check_output(inspect, text=True) != before:
            raise RuntimeError('Protected service identity/start time changed')
        print(json.dumps({'deployed': True, 'backup': str(backup), 'version': manifest['version'], 'versionCode': manifest['versionCode'], 'sha256': manifest['sha256'], 'protectedServicesUnchanged': True}))
    except Exception:
        for name in names:
            saved = backup / name
            if saved.is_dir():
                shutil.copytree(saved, target / name, dirs_exist_ok=True)
            elif saved.exists():
                shutil.copy2(saved, target / name)
        shutil.copy2(backup / 'Caddyfile', caddy)
        subprocess.run(['docker', 'exec', 'picket-caddy-1', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile'], check=True)
        print('Landing restored from ' + str(backup))
        raise


if __name__ == '__main__':
    main()
