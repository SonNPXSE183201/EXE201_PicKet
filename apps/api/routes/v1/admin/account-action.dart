import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  maxContentLength: 4000,
  action: (gateway, token, request) async {
    final raw = await readLimitedBody(request, 4000);
    if (raw.length > 4000) return apiError(413, 'Request too large');
    final input = jsonDecode(raw);
    if (input is! Map) throw const FormatException('Invalid account action.');
    final action = input['action'];
    if (!{'suspend', 'restore', 'reset_password'}.contains(action)) {
      throw const FormatException('Invalid account action.');
    }
    if (input['userId'] is! String || input['requestId'] is! String) {
      throw const FormatException('Invalid account identifier.');
    }
    final target = validateUuid(input['userId'] as String);
    final key = validateUuid(input['requestId'] as String);
    final actor = await gateway.authenticate(token);
    final prepared = await gateway.adminRpc(token, 'admin_prepare_auth', {
      'p_action': action,
      'p_user': target,
      'p_reason': input['reason'],
      'p_request_id': key,
    });
    if (prepared['state'] == 'applied') {
      return Response.json(body: {'updated': true});
    }
    if (prepared['state'] != 'execute') {
      return apiError(409, 'Account action is already in progress.');
    }
    final service = AdminService(gateway.config);
    try {
      await service.userAction(
        action as String,
        target,
        prepared['email'] as String? ?? '',
      );
      await service.rpc('admin_finish_auth', {
        'p_actor': actor,
        'p_request_id': key,
        'p_success': true,
      });
    } catch (_) {
      await service.rpc('admin_finish_auth', {
        'p_actor': actor,
        'p_request_id': key,
        'p_success': false,
      });
      rethrow;
    } finally {
      service.close();
    }
    return Response.json(
      body: {'updated': true},
      headers: {'cache-control': 'no-store'},
    );
  },
);
