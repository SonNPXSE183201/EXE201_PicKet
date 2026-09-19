import 'dart:async';
import 'dart:convert';
import 'package:cryptography/cryptography.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:in_app_purchase_android/billing_client_wrappers.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final billingProvider = Provider<BillingController>((ref) {
  final controller = BillingController(Supabase.instance.client);
  ref.onDispose(controller.dispose);
  unawaited(controller.initialize());
  return controller;
});

class BillingController extends ChangeNotifier {
  BillingController(this.client);
  final SupabaseClient client;
  InAppPurchase get store => InAppPurchase.instance;
  static const productsIds = {
    'picket_plus_monthly',
    'picket_plus_yearly',
    'picket_pro_monthly',
    'picket_pro_yearly',
  };
  StreamSubscription<List<PurchaseDetails>>? subscription;
  List<ProductDetails> products = [];
  bool _loading = false,
      _initializing = false,
      available = false,
      disposed = false;
  final Set<String> pendingProducts = {};
  bool get busy =>
      _loading || pendingProducts.isNotEmpty || processing.isNotEmpty;
  String tier = 'free';
  String? message;
  GooglePlayPurchaseDetails? _activePurchase;
  final Set<String> processing = {};
  @override
  void notifyListeners() {
    if (!disposed) super.notifyListeners();
  }

  Future<String> accountId() async {
    final id = client.auth.currentUser?.id;
    if (id == null) throw StateError('Sign in required');
    return (await Sha256().hash(
      utf8.encode(id),
    )).bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  Future<void> initialize() async {
    if (_initializing || disposed) return;
    _initializing = true;
    _loading = true;
    notifyListeners();
    subscription ??= store.purchaseStream.listen(
      (purchases) {
        for (final purchase in purchases) {
          unawaited(verify(purchase));
        }
      },
      onError: (Object _) {
        message =
            'Không nhận được kết quả Google Play. Hãy khôi phục giao dịch để thử lại.';
        pendingProducts.clear();
        notifyListeners();
      },
    );
    try {
      available = await store.isAvailable();
      if (available) {
        final response = await store.queryProductDetails(productsIds);
        products = response.productDetails;
        if (response.error != null || products.isEmpty) {
          message = 'Chưa tải được gói từ Google Play. Hãy thử lại sau.';
        }
        await store.restorePurchases(applicationUserName: await accountId());
      } else {
        message = 'Google Play Billing chưa khả dụng trên thiết bị này.';
      }
      tier = await client.rpc('current_plan') as String;
    } catch (_) {
      message = 'Chưa kết nối được dịch vụ gói sử dụng. Hãy thử lại.';
    } finally {
      _initializing = false;
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> buy(ProductDetails product) async {
    if (busy) return;
    if (_activePurchase?.productID == product.id) {
      message = 'Bạn đang sử dụng gói này. Quản lý gia hạn trong Google Play.';
      notifyListeners();
      return;
    }
    if (tier != 'free' && _activePurchase == null) {
      message =
          'Hãy khôi phục gói hiện tại trước khi đổi gói, hoặc quản lý gói ưu đãi với quản trị viên.';
      notifyListeners();
      return;
    }
    pendingProducts.add(product.id);
    message = null;
    notifyListeners();
    try {
      final fresh = await store.queryProductDetails({product.id});
      if (fresh.error != null || fresh.productDetails.isEmpty) {
        throw StateError('Product is unavailable');
      }
      final launched = await store.buyNonConsumable(
        purchaseParam: GooglePlayPurchaseParam(
          productDetails: fresh.productDetails.first,
          applicationUserName: await accountId(),
          changeSubscriptionParam: _activePurchase == null
              ? null
              : ChangeSubscriptionParam(
                  oldPurchaseDetails: _activePurchase!,
                  replacementMode: ReplacementMode.withTimeProration,
                ),
        ),
      );
      if (!launched) {
        pendingProducts.remove(product.id);
        message = 'Không mở được thanh toán Google Play.';
      }
    } catch (_) {
      pendingProducts.remove(product.id);
      message = 'Không mở được thanh toán Google Play.';
    }
    notifyListeners();
  }

  Future<void> verify(PurchaseDetails purchase) async {
    if (disposed) return;
    if (purchase.status == PurchaseStatus.pending) {
      pendingProducts.add(purchase.productID);
      message = 'Đang chờ Google Play xử lý.';
      notifyListeners();
      return;
    }
    if (purchase.status == PurchaseStatus.error ||
        purchase.status == PurchaseStatus.canceled) {
      pendingProducts.remove(purchase.productID);
      message = purchase.status == PurchaseStatus.canceled
          ? 'Đã hủy thanh toán.'
          : 'Thanh toán chưa thành công.';
      notifyListeners();
      return;
    }
    if (!productsIds.contains(purchase.productID)) return;
    pendingProducts.remove(purchase.productID);
    final token = purchase.verificationData.serverVerificationData;
    if (!processing.add(token)) return;
    notifyListeners();
    try {
      final result = await client.functions.invoke(
        'verify-purchase',
        body: {'productId': purchase.productID, 'purchaseToken': token},
      );
      if (result.status != 200 || result.data['verified'] != true) {
        throw StateError('Verification failed');
      }
      if (result.data['active'] == true &&
          purchase is GooglePlayPurchaseDetails) {
        _activePurchase = purchase;
      } else if (_activePurchase?.verificationData.serverVerificationData ==
          token) {
        _activePurchase = null;
      }
      tier = await client.rpc('current_plan') as String;
      if (purchase.pendingCompletePurchase) {
        await store.completePurchase(purchase);
      }
      message = tier == 'free'
          ? 'Gói chưa hoạt động hoặc đã hết hạn.'
          : 'Gói $tier đã được máy chủ xác minh.';
    } catch (_) {
      message =
          'Chưa xác minh được giao dịch. Không cần mua lại; chọn Khôi phục giao dịch khi có mạng.';
    } finally {
      processing.remove(token);
      notifyListeners();
    }
  }

  Future<void> restore() async {
    if (_loading || disposed) return;
    _loading = true;
    notifyListeners();
    try {
      await store.restorePurchases(applicationUserName: await accountId());
    } catch (_) {
      message = 'Chưa khôi phục được giao dịch. Hãy thử lại.';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    disposed = true;
    subscription?.cancel();
    super.dispose();
  }
}
