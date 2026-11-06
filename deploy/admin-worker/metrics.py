"""Parsers are pure; external input is validated before any database write."""
import csv
import datetime as dt
import io
import re
from decimal import Decimal, InvalidOperation
import zipfile


def newest_database_backup(directory):
    """Only database dump formats count; config files must not imply backup health."""
    files = [p for p in directory.rglob('*') if p.is_file() and p.name.lower().endswith(('.dump', '.backup', '.sql', '.sql.gz'))] if directory.exists() else []
    return max((p.stat().st_mtime for p in files), default=None)

PLAY_METRICS = ('Daily Device Installs', 'Daily Device Uninstalls', 'Daily Device Upgrades', 'Daily User Installs', 'Daily User Uninstalls', 'Current User Installs', 'Total User Installs', 'Installs on Active Devices')


def parse_play_installs(payload, month):
    if len(payload) > 25_000_000:
        raise ValueError('Report too large')
    text = payload.decode('utf-16' if payload.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))
    if not {'Date', 'Package Name', 'Country', 'Daily Device Installs'}.issubset(reader.fieldnames or []):
        raise ValueError('Report schema changed')
    month_start = dt.date.fromisoformat(month)
    if month_start.day != 1:
        raise ValueError('Month must start on day one')
    seen = set()
    result = []
    for row in reader:
        if row['Package Name'] != 'com.picket.mobile':
            raise ValueError('Wrong package')
        day = dt.date.fromisoformat(row['Date'])
        if (day.year, day.month) != (month_start.year, month_start.month):
            raise ValueError('Date outside report month')
        country = row['Country']
        if not re.fullmatch(r'[A-Z]{2}|ZZ|Unknown|Other', country):
            raise ValueError('Invalid country dimension')
        for metric in PLAY_METRICS:
            raw = row.get(metric)
            if raw in (None, ''):
                continue
            if not re.fullmatch(r'\d{1,16}', raw):
                raise ValueError('Invalid metric value')
            key = (day, country, metric)
            if key in seen:
                raise ValueError('Duplicate report row')
            seen.add(key)
            result.append({'day': day.isoformat(), 'dimension': country, 'metric': metric, 'value': int(raw), 'timezone': 'America/Los_Angeles'})
            if len(result) > 20000:
                raise ValueError('Report exceeds import batch limit')
    return result


def apk_log_metric(row):
    if row.get('request', {}).get('method') != 'GET' or row.get('status') not in (200, 206) or str(row.get('bot', '')).lower() == 'true':
        return None
    path = row.get('path', '')
    if not re.fullmatch(r'/downloads/[a-zA-Z0-9_.-]+\.apk', path):
        return None
    timestamp = row.get('ts')
    if not isinstance(timestamp, (int, float)):
        return None
    day = dt.datetime.fromtimestamp(timestamp, dt.timezone.utc).date().isoformat()
    return {'day': day, 'metric': 'served_requests', 'dimension': path.split('/')[-1], 'value': 1, 'timezone': 'UTC'}


def parse_sales_zip(payload, month):
    result = {}
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        files = [entry for entry in archive.infolist() if entry.filename.endswith('.csv')]
        if not files or len(files) > 10 or sum(entry.file_size for entry in files) > 25_000_000:
            raise ValueError('Invalid financial report archive')
        for entry in files:
            content = archive.read(entry)
            reader = csv.DictReader(io.StringIO(content.decode('utf-16' if content.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig')))
            if not {'Package ID', 'Order Charged Date', 'Financial Status', 'Currency of Sale', 'Charged Amount'}.issubset(reader.fieldnames or []):
                raise ValueError('Financial report schema changed')
            for row in reader:
                if row['Package ID'] != 'com.picket.mobile':
                    continue
                day = dt.date.fromisoformat(row['Order Charged Date'])
                if day.isoformat()[:7] != month[:7]:
                    raise ValueError('Financial row outside report month')
                currency = row['Currency of Sale']
                if not re.fullmatch(r'[A-Z]{3}', currency):
                    raise ValueError('Invalid currency')
                status = row['Financial Status'].strip().lower()
                if status not in ('charged', 'refund', 'partial refund', 'chargeback'):
                    raise ValueError('Unsupported financial state')
                try:
                    if not re.fullmatch(r'-?(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)(?:[.][0-9]+)?', row['Charged Amount']):
                        raise ValueError('Invalid financial number format')
                    amount = Decimal(row['Charged Amount'].replace(',', ''))
                except InvalidOperation as error:
                    raise ValueError('Invalid financial amount') from error
                if not amount.is_finite() or abs(amount) > Decimal('1000000000000') or (status == 'charged' and amount < 0):
                    raise ValueError('Invalid financial amount')
                metric = 'estimated_gross_sales' if status == 'charged' else 'estimated_refunds'
                key = (day.isoformat(), currency, metric)
                result[key] = result.get(key, Decimal(0)) + abs(amount)
    return [{'day': day, 'dimension': currency, 'metric': metric, 'value': str(value), 'timezone': 'UTC'} for (day, currency, metric), value in result.items()]


ORDER_NUMBER = re.compile(r'GPA\.[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{5}(?:\.\.[0-9]+)?')


def parse_sales_orders(payload, month):
    """Per-order rows for the revenue ledger (source of truth for Google amounts).

    Reuses the aggregate parser's validation, so a malformed report is rejected
    atomically before anything is written. Reports without an Order Number
    column produce no ledger rows (aggregates still work).
    """
    parse_sales_zip(payload, month)
    orders = []
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        for entry in [item for item in archive.infolist() if item.filename.endswith('.csv')]:
            content = archive.read(entry)
            reader = csv.DictReader(io.StringIO(content.decode('utf-16' if content.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig')))
            if 'Order Number' not in (reader.fieldnames or []):
                continue
            for row in reader:
                if row['Package ID'] != 'com.picket.mobile':
                    continue
                number = row['Order Number'].strip()
                if not ORDER_NUMBER.fullmatch(number):
                    raise ValueError('Invalid order number')
                stamp = (row.get('Order Charged Timestamp') or '').strip()
                charged = (dt.datetime.fromtimestamp(int(stamp), dt.timezone.utc).isoformat()
                           if stamp.isdigit() else f"{row['Order Charged Date']}T00:00:00+00:00")
                orders.append({
                    'orderNumber': number,
                    'status': row['Financial Status'].strip().lower(),
                    'currency': row['Currency of Sale'],
                    'amount': row['Charged Amount'].replace(',', ''),
                    'chargedAt': charged,
                    'sku': (row.get('SKU ID') or '').strip() or None,
                })
    return orders
