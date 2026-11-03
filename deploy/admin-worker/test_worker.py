import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import worker


class LogCursorTests(unittest.TestCase):
    def test_resume_rotation_partial_and_replay(self):
        row = {'ts':1793102400,'path':'/downloads/picket-1.0.9.apk','request':{'method':'GET'},'status':200,'bot':'false'}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'landing.json'
            path.write_text(json.dumps(row)+'\n'+json.dumps(row)[:20])
            state = {}
            captured=[]
            with patch.object(worker.glob,'glob',side_effect=lambda pattern:[str(path)] if pattern.endswith('.json') else []), patch.object(worker,'ingest',side_effect=lambda source,rows,**kw:captured.append(copy.deepcopy(rows))):
                worker.apk_logs(state)
                self.assertEqual(captured[-1][0]['value'],1)
                worker.apk_logs(state)
                self.assertEqual(captured[-1][0]['value'],1)
                with path.open('a') as stream:
                    stream.write(json.dumps(row)[20:]+'\n')
                worker.apk_logs(state)
                self.assertEqual(captured[-1][0]['value'],2)
                rotated=Path(directory)/'landing-old.log'
                path.rename(rotated)
                path.write_text(json.dumps({**row,'status':206})+'\n')
            with patch.object(worker.glob,'glob',side_effect=lambda pattern:[str(path)] if pattern.endswith('.json') else [str(rotated)]),patch.object(worker,'ingest',side_effect=lambda source,rows,**kw:captured.append(copy.deepcopy(rows))):
                worker.apk_logs(state)
                self.assertEqual(captured[-1][0]['value'],3)
                worker.apk_logs(state)
                self.assertEqual(captured[-1][0]['value'],3)

    def test_missing_logs_report_unconfigured(self):
        with patch.object(worker.glob,'glob',return_value=[]),patch.object(worker,'source_failure') as failure:
            worker.apk_logs({})
            failure.assert_called_once_with('apk_access','No sanitized access logs found','not_configured')

class BackupSourceTests(unittest.TestCase):
    def test_config_and_manifest_are_not_database_backups(self):
        from metrics import newest_database_backup
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'compose.production.yml').write_text('config')
            (root/'backup-manifest.json').write_text('{}')
            self.assertIsNone(newest_database_backup(root))
            (root/'database.sql.gz').write_bytes(b'qa')
            self.assertIsNotNone(newest_database_backup(root))


class PaymentReconciliationTests(unittest.TestCase):
    def test_worker_uses_internal_api_and_never_creates_a_payment(self):
        from unittest.mock import MagicMock
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"reconciled":1,"failed":0}'
        with patch.dict(worker.os.environ, {'PAYOS_WORKER_SECRET': 'x' * 32}), patch.object(worker.urllib.request, 'urlopen', return_value=response) as send:
            result = worker.reconcile_payos()
            request = send.call_args.args[0]
            self.assertEqual(request.full_url, 'http://api:8080/v1/billing/payos/reconcile')
            self.assertEqual(request.get_method(), 'POST')
            self.assertEqual(request.data, b'{}')
            self.assertEqual(result['reconciled'], 1)

    def test_missing_worker_secret_never_contacts_api(self):
        with patch.dict(worker.os.environ, {'PAYOS_WORKER_SECRET': ''}), patch.object(worker.urllib.request, 'urlopen') as send:
            with self.assertRaises(ValueError):
                worker.reconcile_payos()
            send.assert_not_called()
