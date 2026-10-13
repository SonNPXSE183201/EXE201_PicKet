import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:picket_api/src/account_contract.dart';
import 'package:picket_api/src/admin_action_contract.dart';
import 'package:picket_api/src/admin_contract.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/billing_contract.dart';
import 'package:picket_api/src/budget_contract.dart';
import 'package:picket_api/src/category_contract.dart';
import 'package:picket_api/src/entitlement_contract.dart';
import 'package:picket_api/src/finance_contract.dart';
import 'package:picket_api/src/ocr_job_contract.dart';
import 'package:picket_api/src/profile_contract.dart';
import 'package:picket_api/src/receipt_contract.dart';
import 'package:picket_api/src/transaction_contract.dart';

class GatewayException implements Exception {
  const GatewayException(this.statusCode, this.message);
  final int statusCode;
  final String message;
}

class SupabaseGateway {
  SupabaseGateway(this.config, {http.Client? client})
    : _client = client ?? http.Client();

  final ApiConfig config;
  final http.Client _client;

  Map<String, String> _headers(String accessToken) => {
    HttpHeaders.authorizationHeader: 'Bearer $accessToken',
    'apikey': config.supabasePublishableKey,
    HttpHeaders.acceptHeader: ContentType.json.mimeType,
    HttpHeaders.contentTypeHeader: ContentType.json.mimeType,
  };

  Uri _uri(String path, [Map<String, String>? query]) =>
      config.supabaseUrl.resolve(path).replace(queryParameters: query);

  Future<String> authenticate(String accessToken) async {
    final response = await _client
        .get(_uri('/auth/v1/user'), headers: _headers(accessToken))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode != HttpStatus.ok) {
      throw const GatewayException(HttpStatus.unauthorized, 'Unauthorized');
    }
    final body = jsonDecode(response.body);
    if (body is! Map || body['id'] is! String) {
      throw const GatewayException(HttpStatus.unauthorized, 'Unauthorized');
    }
    return body['id'] as String;
  }

  Future<FinanceSnapshotEnvelope> loadSnapshot(String accessToken) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/load_normalized_finance'),
          headers: _headers(accessToken),
          body: '{}',
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body == null) {
      return const FinanceSnapshotEnvelope(revision: 0, payload: null);
    }
    if (body is! Map) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid finance data.',
      );
    }
    final row = Map<String, dynamic>.from(body);
    return FinanceSnapshotEnvelope(
      revision: row['revision'] as int,
      payload: Map<String, dynamic>.from(row['payload'] as Map),
    );
  }

  Future<int> saveSnapshot(
    String accessToken,
    SaveSnapshotRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/save_normalized_finance'),
          headers: _headers(accessToken),
          body: jsonEncode({
            'expected_revision': request.expectedRevision,
            'new_payload': request.payload,
          }),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final revision = jsonDecode(response.body);
    if (revision is! int) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned an invalid revision.',
      );
    }
    return revision;
  }

  Future<EntitlementsResource> currentEntitlements(String accessToken) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/current_entitlements'),
          headers: _headers(accessToken),
          body: '{}',
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return EntitlementsResource.fromDatabase(jsonDecode(response.body));
  }

  Future<PlayPurchaseVerification> verifyPlayPurchase(
    String accessToken,
    VerifyPlayPurchaseRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/functions/v1/verify-purchase'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toFunctionJson()),
        )
        .timeout(const Duration(seconds: 35));
    _ensureSuccess(response);
    try {
      return PlayPurchaseVerification.fromJson(jsonDecode(response.body));
    } on FormatException {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned an invalid purchase verification result.',
      );
    }
  }

  Future<AdminOverviewResource> adminOverview(
    String accessToken,
    int page,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/admin_overview'),
          headers: _headers(accessToken),
          body: jsonEncode({'page_number': page}),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return AdminOverviewResource.fromDatabase(jsonDecode(response.body));
  }

  Future<void> adminUserAction(
    String accessToken,
    String targetUser,
    AdminUserActionRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/functions/v1/admin-user-action'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toFunctionJson(targetUser)),
        )
        .timeout(const Duration(seconds: 30));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body is! Map || body['updated'] != true) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned an invalid admin action result.',
      );
    }
  }

  static const _accountColumns =
      'id,name,kind,currency_code,opening_balance,row_version,'
      'archived_at,created_at,updated_at';

  Future<List<AccountResource>> listAccounts(String accessToken) async {
    await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/wallets', {
            'select': _accountColumns,
            'archived_at': 'is.null',
            'order': 'created_at.asc,id.asc',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _accountList(response.body);
  }

  Future<AccountResource> createAccount(
    String accessToken,
    CreateAccountRequest request,
    String idempotencyKey,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/create_finance_account'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson(idempotencyKey)),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return AccountResource.fromDatabase(_rpcRow(response.body, 'account'));
  }

  Future<AccountResource> updateAccount(
    String accessToken,
    String accountId,
    UpdateAccountRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/wallets', {
            'id': 'eq.$accountId',
            'row_version': 'eq.${request.expectedVersion}',
            'archived_at': 'is.null',
            'select': _accountColumns,
          }),
          headers: {
            ..._headers(accessToken),
            'Prefer': 'return=representation',
          },
          body: jsonEncode(request.patch),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _singleAccount(response.body, conflictOnEmpty: true);
  }

  Future<AccountResource> archiveAccount(
    String accessToken,
    String accountId,
    int expectedVersion,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/wallets', {
            'id': 'eq.$accountId',
            'row_version': 'eq.$expectedVersion',
            'archived_at': 'is.null',
            'select': _accountColumns,
          }),
          headers: {
            ..._headers(accessToken),
            'Prefer': 'return=representation',
          },
          body: jsonEncode({
            'archived_at': DateTime.now().toUtc().toIso8601String(),
          }),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _singleAccount(response.body, conflictOnEmpty: true);
  }

  List<AccountResource> _accountList(String responseBody) {
    final body = jsonDecode(responseBody);
    if (body is! List) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid account data.',
      );
    }
    return body
        .map(
          (row) => AccountResource.fromDatabase(
            Map<String, dynamic>.from(row as Map),
          ),
        )
        .toList();
  }

  AccountResource _singleAccount(
    String responseBody, {
    bool conflictOnEmpty = false,
  }) {
    final accounts = _accountList(responseBody);
    if (accounts.length == 1) return accounts.single;
    if (accounts.isEmpty && conflictOnEmpty) {
      throw const GatewayException(
        HttpStatus.conflict,
        'Account version conflict.',
      );
    }
    throw const GatewayException(
      HttpStatus.badGateway,
      'Supabase returned invalid account data.',
    );
  }

  static const _budgetColumns =
      'id,category_id,name,default_limit,alert_percent,active,row_version,'
      'archived_at,created_at,updated_at';

  Future<List<BudgetResource>> listBudgets(String accessToken) async {
    await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/budgets', {
            'select': _budgetColumns,
            'archived_at': 'is.null',
            'order': 'created_at.asc,id.asc',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _budgetList(response.body);
  }

  Future<BudgetResource> createBudget(
    String accessToken,
    CreateBudgetRequest request,
    String idempotencyKey,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/create_finance_budget'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson(idempotencyKey)),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return BudgetResource.fromDatabase(_rpcRow(response.body, 'budget'));
  }

  Future<BudgetResource> updateBudget(
    String accessToken,
    String id,
    UpdateBudgetRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/budgets', {
            'id': 'eq.$id',
            'row_version': 'eq.${request.expectedVersion}',
            'archived_at': 'is.null',
            'select': _budgetColumns,
          }),
          headers: {
            ..._headers(accessToken),
            'Prefer': 'return=representation',
          },
          body: jsonEncode(request.patch),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _singleBudget(response.body, conflictOnEmpty: true);
  }

  Future<BudgetResource> archiveBudget(
    String accessToken,
    String id,
    int expectedVersion,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/budgets', {
            'id': 'eq.$id',
            'row_version': 'eq.$expectedVersion',
            'archived_at': 'is.null',
            'select': _budgetColumns,
          }),
          headers: {
            ..._headers(accessToken),
            'Prefer': 'return=representation',
          },
          body: jsonEncode({
            'archived_at': DateTime.now().toUtc().toIso8601String(),
            'active': false,
          }),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _singleBudget(response.body, conflictOnEmpty: true);
  }

  List<BudgetResource> _budgetList(String responseBody) {
    final body = jsonDecode(responseBody);
    if (body is! List) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid budget data.',
      );
    }
    return body
        .map(
          (row) => BudgetResource.fromDatabase(
            Map<String, dynamic>.from(row as Map),
          ),
        )
        .toList();
  }

  BudgetResource _singleBudget(
    String responseBody, {
    bool conflictOnEmpty = false,
  }) {
    final budgets = _budgetList(responseBody);
    if (budgets.length == 1) return budgets.single;
    if (budgets.isEmpty && conflictOnEmpty) {
      throw const GatewayException(
        HttpStatus.conflict,
        'Budget version conflict.',
      );
    }
    throw const GatewayException(
      HttpStatus.badGateway,
      'Supabase returned invalid budget data.',
    );
  }

  static const _categoryColumns =
      'id,name,kind,color,icon,is_custom,row_version,'
      'archived_at,created_at,updated_at';

  Future<List<CategoryResource>> listCategories(String accessToken) async {
    await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/categories', {
            'select': _categoryColumns,
            'archived_at': 'is.null',
            'order': 'kind.asc,name.asc,id.asc',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _categoryList(response.body);
  }

  Future<CategoryResource> createCategory(
    String accessToken,
    CreateCategoryRequest request,
    String idempotencyKey,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/create_finance_category'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson(idempotencyKey)),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return CategoryResource.fromDatabase(_rpcRow(response.body, 'category'));
  }

  Future<CategoryResource> updateCategory(
    String accessToken,
    String categoryId,
    UpdateCategoryRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/categories', {
            'id': 'eq.$categoryId',
            'row_version': 'eq.${request.expectedVersion}',
            'is_custom': 'eq.true',
            'archived_at': 'is.null',
            'select': _categoryColumns,
          }),
          headers: {
            ..._headers(accessToken),
            'Prefer': 'return=representation',
          },
          body: jsonEncode(request.patch),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _singleCategory(response.body, conflictOnEmpty: true);
  }

  Future<CategoryResource> archiveCategory(
    String accessToken,
    String categoryId,
    int expectedVersion,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/categories', {
            'id': 'eq.$categoryId',
            'row_version': 'eq.$expectedVersion',
            'is_custom': 'eq.true',
            'archived_at': 'is.null',
            'select': _categoryColumns,
          }),
          headers: {
            ..._headers(accessToken),
            'Prefer': 'return=representation',
          },
          body: jsonEncode({
            'archived_at': DateTime.now().toUtc().toIso8601String(),
          }),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _singleCategory(response.body, conflictOnEmpty: true);
  }

  List<CategoryResource> _categoryList(String responseBody) {
    final body = jsonDecode(responseBody);
    if (body is! List) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid category data.',
      );
    }
    return body
        .map(
          (row) => CategoryResource.fromDatabase(
            Map<String, dynamic>.from(row as Map),
          ),
        )
        .toList();
  }

  CategoryResource _singleCategory(
    String responseBody, {
    bool conflictOnEmpty = false,
  }) {
    final categories = _categoryList(responseBody);
    if (categories.length == 1) return categories.single;
    if (categories.isEmpty && conflictOnEmpty) {
      throw const GatewayException(
        HttpStatus.conflict,
        'Category version conflict.',
      );
    }
    throw const GatewayException(
      HttpStatus.badGateway,
      'Supabase returned invalid category data.',
    );
  }

  static const _transactionColumns =
      'id,wallet_id,destination_wallet_id,category_id,refund_of,title,amount,'
      'kind,occurred_at,note,row_version,deleted_at,created_at,updated_at';

  Future<List<TransactionResource>> listTransactions(
    String accessToken, {
    int limit = 100,
  }) async {
    await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/transactions', {
            'select': _transactionColumns,
            'deleted_at': 'is.null',
            'order': 'occurred_at.desc,id.desc',
            'limit': '$limit',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _transactionList(response.body);
  }

  Future<TransactionResource> createTransaction(
    String accessToken,
    CreateTransactionRequest request,
    String idempotencyKey,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/create_finance_transaction'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson(idempotencyKey)),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _transactionFromRpc(response.body);
  }

  Future<TransactionResource> createTransfer(
    String accessToken,
    CreateTransferRequest request,
    String idempotencyKey,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/create_finance_transfer'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson(idempotencyKey)),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _transactionFromRpc(response.body);
  }

  Future<TransactionResource> createRefund(
    String accessToken,
    String originalTransactionId,
    CreateRefundRequest request,
    String idempotencyKey,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/create_finance_refund'),
          headers: _headers(accessToken),
          body: jsonEncode(
            request.toRpcJson(idempotencyKey, originalTransactionId),
          ),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _transactionFromRpc(response.body);
  }

  static const _transactionSplitColumns =
      'id,transaction_id,category_id,amount,row_version,created_at,updated_at';

  Future<List<TransactionSplitResource>> listTransactionSplits(
    String accessToken,
    String transactionId,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/transaction_splits', {
            'select': _transactionSplitColumns,
            'transaction_id': 'eq.$transactionId',
            'order': 'created_at.asc,id.asc',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _transactionSplitList(response.body);
  }

  Future<
    ({TransactionResource transaction, List<TransactionSplitResource> splits})
  >
  setTransactionSplits(
    String accessToken,
    String transactionId,
    SetTransactionSplitsRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/set_transaction_splits'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson(transactionId)),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final transaction = _transactionFromRpc(response.body);
    final splits = await listTransactionSplits(accessToken, transactionId);
    return (transaction: transaction, splits: splits);
  }

  Future<TransactionResource> updateTransaction(
    String accessToken,
    String transactionId,
    UpdateTransactionRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/transactions', {
            'id': 'eq.$transactionId',
            'row_version': 'eq.${request.expectedVersion}',
            'kind': 'in.(expense,income)',
            'deleted_at': 'is.null',
            'select': _transactionColumns,
          }),
          headers: {
            ..._headers(accessToken),
            'Prefer': 'return=representation',
          },
          body: jsonEncode(request.patch),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _singleTransaction(response.body, conflictOnEmpty: true);
  }

  Future<TransactionResource> archiveTransaction(
    String accessToken,
    String transactionId,
    int expectedVersion,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/transactions', {
            'id': 'eq.$transactionId',
            'row_version': 'eq.$expectedVersion',
            'deleted_at': 'is.null',
            'select': _transactionColumns,
          }),
          headers: {
            ..._headers(accessToken),
            'Prefer': 'return=representation',
          },
          body: jsonEncode({
            'deleted_at': DateTime.now().toUtc().toIso8601String(),
          }),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _singleTransaction(response.body, conflictOnEmpty: true);
  }

  List<TransactionResource> _transactionList(String responseBody) {
    final body = jsonDecode(responseBody);
    if (body is! List) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid transaction data.',
      );
    }
    return body
        .map(
          (row) => TransactionResource.fromDatabase(
            Map<String, dynamic>.from(row as Map),
          ),
        )
        .toList();
  }

  TransactionResource _singleTransaction(
    String responseBody, {
    bool conflictOnEmpty = false,
  }) {
    final transactions = _transactionList(responseBody);
    if (transactions.length == 1) return transactions.single;
    if (transactions.isEmpty && conflictOnEmpty) {
      throw const GatewayException(
        HttpStatus.conflict,
        'Transaction version conflict.',
      );
    }
    throw const GatewayException(
      HttpStatus.badGateway,
      'Supabase returned invalid transaction data.',
    );
  }

  TransactionResource _transactionFromRpc(String responseBody) {
    final body = jsonDecode(responseBody);
    if (body is Map) {
      return TransactionResource.fromDatabase(
        Map<String, dynamic>.from(body),
      );
    }
    if (body is List && body.length == 1 && body.single is Map) {
      return TransactionResource.fromDatabase(
        Map<String, dynamic>.from(body.single as Map),
      );
    }
    throw const GatewayException(
      HttpStatus.badGateway,
      'Supabase returned invalid transaction data.',
    );
  }

  Map<String, dynamic> _rpcRow(String responseBody, String resource) {
    final body = jsonDecode(responseBody);
    if (body is Map) return Map<String, dynamic>.from(body);
    if (body is List && body.length == 1 && body.single is Map) {
      return Map<String, dynamic>.from(body.single as Map);
    }
    throw GatewayException(
      HttpStatus.badGateway,
      'Supabase returned invalid $resource data.',
    );
  }

  List<TransactionSplitResource> _transactionSplitList(String responseBody) {
    final body = jsonDecode(responseBody);
    if (body is! List) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid transaction split data.',
      );
    }
    return body
        .map(
          (row) => TransactionSplitResource.fromDatabase(
            Map<String, dynamic>.from(row as Map),
          ),
        )
        .toList();
  }

  Future<Map<String, dynamic>?> currentProfile(String accessToken) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/current_profile'),
          headers: _headers(accessToken),
          body: '{}',
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body == null) return null;
    if (body is! Map) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned an invalid profile.',
      );
    }
    return Map<String, dynamic>.from(body);
  }

  Future<void> deleteAccount(String accessToken) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/functions/v1/delete-account'),
          headers: _headers(accessToken),
          body: '{}',
        )
        .timeout(const Duration(seconds: 30));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body is! Map || body['deleted'] != true) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned an invalid account deletion result.',
      );
    }
  }

  Future<String> completeOnboarding(
    String accessToken,
    CompleteOnboardingRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/complete_onboarding'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson()),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final walletId = jsonDecode(response.body);
    if (walletId is! String) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned an invalid wallet.',
      );
    }
    return walletId;
  }

  Future<void> updateProfile(
    String accessToken,
    Map<String, dynamic> patch,
  ) async {
    final userId = await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/profiles', {'id': 'eq.$userId'}),
          headers: _headers(accessToken),
          body: jsonEncode(patch),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
  }

  Future<void> updatePreferences(
    String accessToken,
    Map<String, dynamic> patch,
  ) async {
    final userId = await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/user_preferences', {'user_id': 'eq.$userId'}),
          headers: _headers(accessToken),
          body: jsonEncode(patch),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
  }

  static const _ocrFallbackJobColumns =
      'id,storage_path,local_confidence,status,result,error_code,'
      'created_at,updated_at,started_at,completed_at,expires_at';

  Future<List<OcrFallbackJobResource>> listOcrFallbackJobs(
    String accessToken, {
    int limit = 20,
  }) async {
    await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/ocr_fallback_jobs', {
            'select': _ocrFallbackJobColumns,
            'order': 'created_at.desc,id.desc',
            'limit': '$limit',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _ocrFallbackJobList(response.body);
  }

  Future<OcrFallbackJobResource> getOcrFallbackJob(
    String accessToken,
    String id,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/ocr_fallback_jobs', {
            'select': _ocrFallbackJobColumns,
            'id': 'eq.$id',
            'limit': '1',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final jobs = _ocrFallbackJobList(response.body);
    if (jobs.length == 1) return jobs.single;
    throw const GatewayException(HttpStatus.notFound, 'OCR job not found.');
  }

  Future<OcrFallbackJobResource> createOcrFallbackJob(
    String accessToken,
    CreateOcrFallbackJobRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/create_ocr_fallback_job'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson()),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body is Map) {
      return OcrFallbackJobResource.fromDatabase(
        Map<String, dynamic>.from(body),
      );
    }
    throw const GatewayException(
      HttpStatus.badGateway,
      'Supabase returned invalid OCR job data.',
    );
  }

  List<OcrFallbackJobResource> _ocrFallbackJobList(String responseBody) {
    final body = jsonDecode(responseBody);
    if (body is! List) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid OCR job data.',
      );
    }
    return body
        .map(
          (row) => OcrFallbackJobResource.fromDatabase(
            Map<String, dynamic>.from(row as Map),
          ),
        )
        .toList();
  }

  static const _receiptColumns =
      'id,transaction_id,storage_path,merchant,detected_total,purchased_at,'
      'currency_code,confidence,ocr_provider,review_required,raw_text,'
      'image_sha256,status,row_version,created_at,updated_at,archived_at';
  static const _receiptLineColumns =
      'id,receipt_id,name,quantity,unit_price,total,confidence,row_version,'
      'created_at,updated_at';

  Future<List<ReceiptResource>> listReceipts(
    String accessToken, {
    int limit = 50,
  }) async {
    await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/receipts', {
            'select': _receiptColumns,
            'archived_at': 'is.null',
            'order': 'created_at.desc,id.desc',
            'limit': '$limit',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    return _receiptList(response.body);
  }

  Future<ReceiptResource> getReceipt(
    String accessToken,
    String id,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/receipts', {
            'select': _receiptColumns,
            'id': 'eq.$id',
            'archived_at': 'is.null',
            'limit': '1',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final receipts = _receiptList(response.body);
    if (receipts.length != 1) {
      throw const GatewayException(HttpStatus.notFound, 'Receipt not found.');
    }
    final lines = await _listReceiptLines(accessToken, id);
    return receipts.single.withLineItems(lines);
  }

  Future<ReceiptResource> createReceipt(
    String accessToken,
    CreateReceiptRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/create_receipt_record'),
          headers: _headers(accessToken),
          body: jsonEncode(request.rpcJson),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body is! Map) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid receipt data.',
      );
    }
    final receipt = ReceiptResource.fromDatabase(
      Map<String, dynamic>.from(body),
    );
    final lines = await _listReceiptLines(accessToken, receipt.id);
    return receipt.withLineItems(lines);
  }

  Future<ReceiptResource> updateReceipt(
    String accessToken,
    String id,
    UpdateReceiptRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/update_receipt_record'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson(id)),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body is! Map) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid receipt data.',
      );
    }
    final receipt = ReceiptResource.fromDatabase(
      Map<String, dynamic>.from(body),
    );
    final lines = await _listReceiptLines(accessToken, receipt.id);
    return receipt.withLineItems(lines);
  }

  Future<List<Map<String, String>>> findDuplicateReceipts(
    String accessToken,
    FindDuplicateReceiptRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/find_duplicate_receipts'),
          headers: _headers(accessToken),
          body: jsonEncode(request.rpcJson),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body is! List) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid duplicate receipt data.',
      );
    }
    return body
        .map(
          (item) => {
            'id': (item as Map)['id'] as String,
            'matchType': item['match_type'] as String,
          },
        )
        .toList();
  }

  Future<List<ReceiptLineItemResource>> _listReceiptLines(
    String accessToken,
    String receiptId,
  ) async {
    final response = await _client
        .get(
          _uri('/rest/v1/receipt_line_items', {
            'select': _receiptLineColumns,
            'receipt_id': 'eq.$receiptId',
            'order': 'position.asc',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body is! List) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid receipt line data.',
      );
    }
    return body
        .map(
          (item) => ReceiptLineItemResource.fromDatabase(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList();
  }

  List<ReceiptResource> _receiptList(String responseBody) {
    final body = jsonDecode(responseBody);
    if (body is! List) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid receipt data.',
      );
    }
    return body
        .map(
          (item) => ReceiptResource.fromDatabase(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList();
  }

  void _ensureSuccess(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    try {
      final body = jsonDecode(response.body);
      if (body is Map && body['code'] == '40001') {
        throw const GatewayException(
          HttpStatus.conflict,
          'Resource version conflict.',
        );
      }
      if (body is Map && body['code'] == '23514') {
        throw const GatewayException(
          HttpStatus.conflict,
          'Business rule conflict.',
        );
      }
      if (body is Map && body['code'] == '23505') {
        throw const GatewayException(
          HttpStatus.conflict,
          'Resource already exists.',
        );
      }
      if (body is Map && body['message'] == 'OCR_QUOTA_EXCEEDED') {
        throw const GatewayException(
          HttpStatus.tooManyRequests,
          'OCR fallback quota exceeded.',
        );
      }
      if (body is Map && body['message'] == 'OCR_IMAGE_NOT_FOUND') {
        throw const GatewayException(
          HttpStatus.notFound,
          'OCR source image not found.',
        );
      }
      if (body is Map && body['message'] == 'OCR_INVALID_REQUEST') {
        throw const GatewayException(
          HttpStatus.badRequest,
          'Invalid OCR fallback request.',
        );
      }
      if (body is Map && body['message'] == 'RECEIPT_NOT_FOUND') {
        throw const GatewayException(
          HttpStatus.notFound,
          'Receipt not found.',
        );
      }
    } on GatewayException {
      rethrow;
    } on FormatException {
      // Keep the sanitized default message.
    }
    throw GatewayException(
      response.statusCode >= 500 ? HttpStatus.badGateway : response.statusCode,
      'Supabase request failed.',
    );
  }

  void close() => _client.close();
}
