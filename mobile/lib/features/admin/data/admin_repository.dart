import 'package:supabase_flutter/supabase_flutter.dart';

class AdminRepository {
  AdminRepository(this.client);
  final SupabaseClient client;
  Future<void> userAction(String id, String action, {String? tier}) async {
    final result = await client.functions.invoke(
      'admin-user-action',
      body: {'targetUser': id, 'action': action, 'tier': tier},
    );
    if (result.status != 200 || result.data['updated'] != true) {
      throw StateError('Admin action failed');
    }
  }

  Future<bool> isStaff() async => await client.rpc('is_staff') == true;
  Future<Map<String, dynamic>> overview(int page) async =>
      Map<String, dynamic>.from(
        await client.rpc('admin_overview', params: {'page_number': page})
            as Map,
      );
  Future<Map<String, dynamic>> ledger(String id) async =>
      Map<String, dynamic>.from(
        await client.rpc('admin_ledger', params: {'target_user': id}) as Map,
      );
  Future<void> saveSettings(bool maintenance, String notice) async {
    await client.rpc(
      'admin_save_settings',
      params: {'p_maintenance': maintenance, 'p_notice': notice},
    );
  }

  Future<void> saveAd(Map<String, dynamic> ad) async {
    await client.rpc(
      'admin_save_ad',
      params: {
        'p_id': ad['id'],
        'p_title': ad['title'],
        'p_body': ad['body'],
        'p_url': ad['url'],
        'p_active': ad['active'],
      },
    );
  }
}
