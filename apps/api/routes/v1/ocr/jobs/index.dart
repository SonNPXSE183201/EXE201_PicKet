import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/ocr_job_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final jobs = await gateway.listOcrFallbackJobs(token);
      return Response.json(
        body: {'jobs': jobs.map((job) => job.toJson()).toList()},
      );
    }
    final job = await gateway.createOcrFallbackJob(
      token,
      CreateOcrFallbackJobRequest.fromJson(await request.json()),
    );
    return Response.json(
      statusCode: HttpStatus.accepted,
      body: {'job': job.toJson()},
    );
  },
);
