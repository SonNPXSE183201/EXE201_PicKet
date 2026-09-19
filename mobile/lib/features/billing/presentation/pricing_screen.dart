import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/billing_controller.dart';

class PricingScreen extends ConsumerWidget {
  const PricingScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final billing = ref.watch(billingProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Gói Picket')),
      body: ListenableBuilder(
        listenable: billing,
        builder: (context, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              'Gói hiện tại: ${billing.tier.toUpperCase()}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            const Text(
              'Giá, thời hạn và ưu đãi được Google Play xác nhận trước khi thanh toán. Quản lý hoặc hủy gia hạn trong mục Gói đăng ký của Google Play.',
            ),
            const SizedBox(height: 16),
            if (billing.message != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(billing.message!),
              ),
            if (billing.busy) const LinearProgressIndicator(),
            for (final product in billing.products)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.title,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(product.description),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: billing.busy
                            ? null
                            : () => billing.buy(product),
                        child: Text(product.price),
                      ),
                    ],
                  ),
                ),
              ),
            TextButton(
              onPressed: billing.busy ? null : billing.initialize,
              child: const Text('Tải lại danh sách gói'),
            ),
            TextButton(
              onPressed: () => launchUrl(
                Uri.parse(
                  'https://play.google.com/store/account/subscriptions?package=com.picket.mobile',
                ),
                mode: LaunchMode.externalApplication,
              ),
              child: const Text('Quản lý gia hạn trên Google Play'),
            ),
            OutlinedButton(
              onPressed: billing.busy ? null : billing.restore,
              child: const Text('Khôi phục giao dịch'),
            ),
          ],
        ),
      ),
    );
  }
}
