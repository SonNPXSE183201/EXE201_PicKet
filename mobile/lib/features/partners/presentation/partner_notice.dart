import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../billing/data/billing_controller.dart';

class PartnerNotice extends ConsumerStatefulWidget {
  const PartnerNotice({super.key});
  @override
  ConsumerState<PartnerNotice> createState() => _PartnerNoticeState();
}

class _PartnerNoticeState extends ConsumerState<PartnerNotice> {
  late final Future<Map<String, dynamic>> content = load();
  Future<Map<String, dynamic>> load() async {
    final client = Supabase.instance.client;
    final settings = await client
        .from('app_settings')
        .select('notice')
        .single();
    final ads = await client
        .from('partner_ads')
        .select('title,body,url')
        .eq('active', true)
        .order('created_at', ascending: false)
        .limit(1);
    return {'notice': settings['notice'], 'ads': ads};
  }

  @override
  Widget build(BuildContext context) {
    final billing = ref.watch(billingProvider);
    return ListenableBuilder(
      listenable: billing,
      builder: (context, _) => FutureBuilder<Map<String, dynamic>>(
        future: content,
        builder: (context, snapshot) {
          final data = snapshot.data;
          if (data == null) return const SizedBox.shrink();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if ((data['notice'] as String).isNotEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(data['notice'] as String),
                  ),
                ),
              for (final ad in (data['ads'] as List).where(
                (_) => billing.tier == 'free' && !billing.busy,
              ))
                Card(
                  child: ListTile(
                    title: Text('${ad['title']}'),
                    subtitle: Text('Nội dung đối tác · ${ad['body']}'),
                    trailing: const Icon(Icons.open_in_new),
                    onTap: () async {
                      final uri = Uri.tryParse(ad['url'] as String);
                      if (uri == null ||
                          uri.scheme != 'https' ||
                          uri.host.isEmpty) {
                        return;
                      }
                      if (!await launchUrl(
                            uri,
                            mode: LaunchMode.externalApplication,
                          ) &&
                          context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Không mở được liên kết.'),
                          ),
                        );
                      }
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
