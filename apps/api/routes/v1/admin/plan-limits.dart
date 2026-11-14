import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

const _plans = {'free', 'plus', 'pro'};

/// Daily cloud-OCR limit per plan. Permission (plans.manage), MFA, revision
/// check and audit are enforced by the database functions.
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      return Response.json(
        body: await gateway.paymentRpc(token, 'plan_limits_list', {}),
        headers: {'cache-control': 'no-store'},
      );
    }
    final input = jsonDecode(await readLimitedBody(request, 1024));
    if (input is! Map ||
        input.keys.any(
          (k) => !{'plan', 'limit', 'revision', 'reason'}.contains(k),
        ) ||
        !_plans.contains(input['plan']) ||
        input['limit'] is! int ||
        input['revision'] is! int ||
        input['reason'] is! String) {
      throw const FormatException('Invalid plan limit.');
    }
    return Response.json(
      body: await gateway.paymentRpc(token, 'plan_limits_save', {
        'p_plan': input['plan'],
        'p_limit': input['limit'],
        'p_revision': input['revision'],
        'p_reason': input['reason'],
      }),
      headers: {'cache-control': 'no-store'},
    );
  },
);
