import 'package:dart_frog/dart_frog.dart';

/// Retired: all account mutations require the portal MFA and audit contract.
Response onRequest(RequestContext context, String id) => Response.json(
  statusCode: 410,
  body: {
    'error': 'Use /v1/admin/account-action with MFA, reason and requestId.',
  },
  headers: {'cache-control': 'no-store'},
);
