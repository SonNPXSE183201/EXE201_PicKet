import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/category_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.patch, HttpMethod.delete},
      action: (gateway, token, request) async {
        final categoryId = validateUuid(id);
        if (request.method == HttpMethod.patch) {
          final input = UpdateCategoryRequest.fromJson(await request.json());
          final category = await gateway.updateCategory(
            token,
            categoryId,
            input,
          );
          return Response.json(body: {'category': category.toJson()});
        }
        final expectedVersion = int.tryParse(
          request.uri.queryParameters['expectedVersion'] ?? '',
        );
        if (expectedVersion == null || expectedVersion < 1) {
          throw const FormatException('Invalid expected version.');
        }
        final category = await gateway.archiveCategory(
          token,
          categoryId,
          expectedVersion,
        );
        return Response.json(body: {'category': category.toJson()});
      },
    );
