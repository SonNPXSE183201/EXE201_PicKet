/// A queue lease contains only a fixed educational case, never user text.
class LearningJob {
  const LearningJob(this.id, this.leaseToken, this.scenarioId, this.locale);

  final String id;
  final String leaseToken;
  final String scenarioId;
  final String locale;
}

/// Implementations must atomically enforce consent generation and lease token.
/// Dispatched jobs must never be claimed again, including after lease expiry.
abstract interface class LearningJobGateway {
  Future<LearningJob?> claim();
  Future<bool> markDispatched(LearningJob job);
  Future<void> complete(LearningJob job, List<String> statementIds);
  Future<void> fail(LearningJob job);
}

typedef LearningExplanation =
    Future<List<String>> Function(
      String scenarioId,
      String locale,
    );

/// One provider attempt per acknowledged durable dispatch. Uncertainty
/// never causes another invocation. Queue expiry handles abandoned work.
class LearningWorker {
  const LearningWorker({required this.gateway, required this.explain});

  final LearningJobGateway gateway;
  final LearningExplanation explain;

  Future<bool> runOnce() async {
    final job = await gateway.claim();
    if (job == null) return false;
    if (job.id.isEmpty ||
        job.leaseToken.isEmpty ||
        job.scenarioId != 'cash-gap-v1' ||
        !{'vi', 'en'}.contains(job.locale)) {
      await _fail(job);
      return true;
    }
    try {
      if (!await gateway.markDispatched(job)) return true;
    } on Object {
      // The transition may have committed. Never invoke the provider without
      // a positive acknowledgement, and never reset this job to queued.
      return true;
    }

    final List<String> ids;
    try {
      ids = await explain(job.scenarioId, job.locale);
      if (ids.isEmpty ||
          ids.length > 3 ||
          ids.toSet().length != ids.length ||
          ids.any(
            (id) => !{'timing', 'buffer', 'incomplete-records'}.contains(id),
          )) {
        await _fail(job);
        return true;
      }
    } on Object {
      await _fail(job);
      return true;
    }
    try {
      // The database must recheck consent here; an in-flight provider request
      // cannot be recalled when the owner revokes consent or deletes history.
      await gateway.complete(job, List.unmodifiable(ids));
    } on Object {
      // Completion may already have committed. Do not overwrite or retry it.
    }
    return true;
  }

  Future<void> _fail(LearningJob job) async {
    try {
      await gateway.fail(job);
    } on Object {
      // Leave uncertain state to expiry. Never log provider bodies or secrets.
    }
  }
}
