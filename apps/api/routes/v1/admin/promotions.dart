import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

const _fields = {
  'id',
  'revision',
  'name',
  'description',
  'code',
  'discountPercent',
  'skus',
  'channels',
  'startsAt',
  'endsAt',
  'maxRedemptions',
  'perUserLimit',
  'enabled',
  'priority',
  'playOfferId',
};

/// Promotions on the existing plans. Permission (promotions.manage), MFA for
/// changes, revision checks and audit are enforced by the database.
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      return Response.json(
        body: await gateway.paymentRpc(token, 'promotion_list', {}),
        headers: {'cache-control': 'no-store'},
      );
    }
    final input = jsonDecode(await readLimitedBody(request, 4096));
    if (input is! Map ||
        input['reason'] is! String ||
        input['promotion'] is! Map ||
        (input['promotion'] as Map).keys.any((k) => !_fields.contains(k))) {
      throw const FormatException('Invalid promotion.');
    }
    return Response.json(
      body: await gateway.paymentRpc(token, 'promotion_save', {
        'p_body': input['promotion'],
        'p_reason': input['reason'],
      }),
      headers: {'cache-control': 'no-store'},
    );
  },
);
