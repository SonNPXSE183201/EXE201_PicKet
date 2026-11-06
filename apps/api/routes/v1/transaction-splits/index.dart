import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/transaction_split_query.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get},
  action: (gateway, token, request) async {
    final ids = parseTransactionSplitIds(request.uri.queryParameters['ids']);
    final splits = await gateway.listTransactionSplitsByIds(token, ids);
    return Response.json(
      body: {'splits': splits.map((item) => item.toJson()).toList()},
    );
  },
);
