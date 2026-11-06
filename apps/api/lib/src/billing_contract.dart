const playSubscriptionProductIds = {
  'picket_plus_monthly',
  'picket_plus_yearly',
  'picket_pro_monthly',
  'picket_pro_yearly',
};

class VerifyPlayPurchaseRequest {
  const VerifyPlayPurchaseRequest({
    required this.productId,
    required this.purchaseToken,
  });

  factory VerifyPlayPurchaseRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.length != 2 ||
        !json.containsKey('productId') ||
        !json.containsKey('purchaseToken')) {
      throw const FormatException('Invalid purchase verification request.');
    }
    final productId = json['productId'];
    final purchaseToken = json['purchaseToken'];
    if (productId is! String ||
        !playSubscriptionProductIds.contains(productId)) {
      throw const FormatException('Invalid Google Play product.');
    }
    if (purchaseToken is! String ||
        purchaseToken.isEmpty ||
        purchaseToken.length > 10000 ||
        purchaseToken.trim() != purchaseToken) {
      throw const FormatException('Invalid Google Play purchase token.');
    }
    return VerifyPlayPurchaseRequest(
      productId: productId,
      purchaseToken: purchaseToken,
    );
  }

  final String productId;
  final String purchaseToken;

  Map<String, dynamic> toFunctionJson() => {
    'productId': productId,
    'purchaseToken': purchaseToken,
  };
}

class PlayPurchaseVerification {
  const PlayPurchaseVerification({
    required this.verified,
    required this.active,
    required this.tier,
    required this.expiresAt,
  });

  factory PlayPurchaseVerification.fromJson(Object? value) {
    if (value is! Map) {
      throw const FormatException('Invalid purchase verification response.');
    }
    final json = Map<String, dynamic>.from(value);
    final verified = json['verified'];
    final active = json['active'];
    final tier = json['tier'];
    final expiresAt = json['expiresAt'];
    if (verified != true ||
        active is! bool ||
        tier is! String ||
        !{'free', 'plus', 'pro'}.contains(tier) ||
        expiresAt is! String ||
        DateTime.tryParse(expiresAt) == null ||
        (active && tier == 'free') ||
        (!active && tier != 'free')) {
      throw const FormatException('Invalid purchase verification response.');
    }
    return PlayPurchaseVerification(
      verified: true,
      active: active,
      tier: tier,
      expiresAt: expiresAt,
    );
  }

  final bool verified;
  final bool active;
  final String tier;
  final String expiresAt;

  Map<String, dynamic> toJson() => {
    'verified': verified,
    'active': active,
    'tier': tier,
    'expiresAt': expiresAt,
  };
}
