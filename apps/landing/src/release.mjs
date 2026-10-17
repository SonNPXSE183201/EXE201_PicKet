import { createHash } from 'node:crypto';

export function validateRelease(release) {
  const validDate = typeof release.publishedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(release.publishedAt)
    && !Number.isNaN(Date.parse(release.publishedAt))
    && new Date(release.publishedAt).toISOString().slice(0,10) === release.publishedAt;
  if (!/^\d+\.\d+\.\d+$/.test(release.version)
    || !Number.isSafeInteger(release.versionCode) || release.versionCode < 1
    || !/^[a-z0-9][a-z0-9.-]*\.apk$/.test(release.filename)
    || release.filename.includes('..')
    || release.abi !== 'arm64-v8a' || release.packageName !== 'com.picket.mobile'
    || ![24,25,26,27,28,29,30,31,32,33,34,35,36].includes(release.minSdk)
    || !Number.isSafeInteger(release.bytes) || release.bytes <= 0
    || !/^[a-f0-9]{64}$/.test(release.sha256) || !validDate) {
    throw new Error('Invalid production Android release metadata.');
  }
  return { ...release, downloadUrl: '/downloads/' + release.filename };
}

export function verifyApkBytes(release, bytes) {
  validateRelease(release);
  if (bytes.length !== release.bytes || createHash('sha256').update(bytes).digest('hex') !== release.sha256) {
    throw new Error('APK size or SHA-256 does not match the approved release.');
  }
}

export function renderRelease(template, release) {
  const data = validateRelease(release);
  const android = {24:'7.0',25:'7.1',26:'8.0',27:'8.1',28:'9',29:'10',30:'11',31:'12',32:'12L',33:'13',34:'14',35:'15',36:'16'};
  const values = {
    VERSION: data.version, DOWNLOAD_URL: data.downloadUrl,
    SIZE_MB: (data.bytes / 1_000_000).toFixed(1).replace('.',','),
    ANDROID_VERSION: 'Android ' + android[data.minSdk], SHA256: data.sha256,
    PUBLISHED_AT: data.publishedAt.split('-').reverse().join('/'),
  };
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error('Unknown release template token: ' + key);
    return values[key];
  });
}
