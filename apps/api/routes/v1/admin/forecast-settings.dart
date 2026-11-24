import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

const _plans = {'free', 'plus', 'pro'};

/// End-of-month forecast settings. Permission (forecast.manage), MFA,
/// revision check and audit are enforced by the database functions.
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      return Response.json(
        body: await gateway.paymentRpc(token, 'forecast_settings_get', {}),
        headers: {'cache-control': 'no-store'},
      );
    }
    final input = jsonDecode(await readLimitedBody(request, 1024));
    final plans = input is Map ? input['scenarioPlans'] : null;
    final access = input is Map ? input['accessPlans'] : null;
    if (input is! Map ||
        input.keys.any(
          (k) => !{
            'enabled',
            'minHistoryDays',
            'lookbackMonths',
            'scenarioPlans',
            'accessPlans',
            'revision',
            'reason',
          }.contains(k),
        ) ||
        input['enabled'] is! bool ||
        input['minHistoryDays'] is! int ||
        input['lookbackMonths'] is! int ||
        plans is! List ||
        plans.any((p) => !_plans.contains(p)) ||
        (access != null &&
            (access is! List || access.any((p) => !_plans.contains(p)))) ||
        input['revision'] is! int ||
        input['reason'] is! String) {
      throw const FormatException('Invalid forecast settings.');
    }
    return Response.json(
      body: await gateway.paymentRpc(token, 'forecast_settings_save', {
        'p_enabled': input['enabled'],
        'p_min_history_days': input['minHistoryDays'],
        'p_lookback_months': input['lookbackMonths'],
        'p_scenario_plans': plans,
        'p_revision': input['revision'],
        'p_reason': input['reason'],
        if (access != null) 'p_access_plans': access,
      }),
      headers: {'cache-control': 'no-store'},
    );
  },
);
