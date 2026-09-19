import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/widgets/picket_widgets.dart';
import '../data/admin_repository.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});
  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final repository = AdminRepository(Supabase.instance.client);
  final notice = TextEditingController();
  Map<String, dynamic>? data;
  String? error;
  int page = 0;
  String search = '';
  bool maskEmail = true;
  bool loading = false, maintenance = false;
  @override
  void initState() {
    super.initState();
    reload();
  }

  @override
  void dispose() {
    notice.dispose();
    super.dispose();
  }

  Future<void> reload() async {
    setState(() => loading = true);
    try {
      final next = await repository.overview(page);
      if (mounted) {
        setState(() {
          data = next;
          error = null;
          maintenance = next['settings']['maintenance'] == true;
          notice.text = next['settings']['notice'] as String;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Không tải được trang quản trị. Kiểm tra mạng và quyền tài khoản.',
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> editAd([Map<String, dynamic>? ad]) async {
    final title = TextEditingController(text: ad?['title'] as String? ?? '');
    final body = TextEditingController(text: ad?['body'] as String? ?? '');
    final url = TextEditingController(text: ad?['url'] as String? ?? '');
    bool active = ad?['active'] == true;
    final form = GlobalKey<FormState>();
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialog) => AlertDialog(
          title: const Text('Nội dung đối tác'),
          content: SingleChildScrollView(
            child: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: title,
                    maxLength: 120,
                    decoration: const InputDecoration(labelText: 'Tiêu đề'),
                    validator: (v) =>
                        v == null || v.trim().isEmpty ? 'Nhập tiêu đề' : null,
                  ),
                  TextFormField(
                    controller: body,
                    maxLength: 500,
                    decoration: const InputDecoration(labelText: 'Nội dung'),
                  ),
                  TextFormField(
                    controller: url,
                    decoration: const InputDecoration(
                      labelText: 'Liên kết HTTPS',
                    ),
                    validator: (v) {
                      final uri = Uri.tryParse(v ?? '');
                      return uri?.scheme == 'https' && uri!.host.isNotEmpty
                          ? null
                          : 'Nhập URL HTTPS hợp lệ';
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Hiển thị'),
                    value: active,
                    onChanged: (v) => setDialog(() => active = v),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () {
                if (form.currentState!.validate()) Navigator.pop(context, true);
              },
              child: const Text('Lưu'),
            ),
          ],
        ),
      ),
    );
    if (accepted == true && mounted) {
      await performSave(
        context,
        () => repository.saveAd({
          'id': ad?['id'],
          'title': title.text.trim(),
          'body': body.text.trim(),
          'url': url.text.trim(),
          'active': active,
        }),
      );
      await reload();
    }
    title.dispose();
    body.dispose();
    url.dispose();
  }

  Future<void> userAction(Map<String, dynamic> user, String action) async {
    final grant = action.startsWith('grant_');
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xác nhận thao tác quản trị'),
        content: Text(
          grant
              ? 'Cấp gói ưu đãi 30 ngày hoặc thu hồi ưu đãi. Gói Google Play đã mua không bị hủy.'
              : 'Thực hiện $action cho tài khoản ${user['id']}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
    if (accepted == true && mounted) {
      await performSave(
        context,
        () => repository.userAction(
          user['id'] as String,
          grant ? 'grant_plan' : action,
          tier: grant ? action.substring(6) : null,
        ),
      );
      await reload();
    }
  }

  Future<void> showLedger(String id) async {
    await performSave(context, () async {
      final ledger = await repository.ledger(id);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Giao dịch đã đồng bộ'),
          content: SizedBox(
            width: 600,
            height: 420,
            child: ListView(
              children: [
                const Text('Lượt xem này được ghi vào nhật ký quản trị.'),
                for (final entry in ledger['entries'] as List? ?? [])
                  ListTile(
                    title: Text('${entry['title']}'),
                    subtitle: Text('${entry['date']} · ${entry['category']}'),
                    trailing: Text('${entry['amount']} đ'),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Đóng'),
            ),
          ],
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 5,
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Quản trị Picket'),
        actions: [
          IconButton(
            onPressed: loading ? null : reload,
            icon: const Icon(Icons.refresh),
            tooltip: 'Tải lại',
          ),
        ],
        bottom: const TabBar(
          isScrollable: true,
          tabs: [
            Tab(text: 'Người dùng'),
            Tab(text: 'OCR'),
            Tab(text: 'Đối tác'),
            Tab(text: 'Cài đặt'),
            Tab(text: 'Nhật ký'),
          ],
        ),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
          ? Center(child: Text(error!))
          : data == null
          ? const SizedBox.shrink()
          : TabBarView(
              children: [
                ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Text(
                      '${data!['total_users']} tài khoản · ${data!['total_ledgers']} sổ đã đồng bộ',
                    ),
                    TextField(
                      decoration: const InputDecoration(
                        labelText: 'Tìm trong trang hiện tại',
                      ),
                      onChanged: (value) => setState(() => search = value),
                    ),
                    SwitchListTile(
                      title: const Text('Che email'),
                      value: maskEmail,
                      onChanged: (value) => setState(() => maskEmail = value),
                    ),
                    for (final user in (data!['users'] as List).where(
                      (u) => '${u['email']} ${u['id']}'.toLowerCase().contains(
                        search.toLowerCase(),
                      ),
                    ))
                      ListTile(
                        title: Text(
                          maskEmail
                              ? 'Tài khoản ${user['id'].toString().substring(0, 8)}'
                              : '${user['email']}',
                        ),
                        subtitle: Text(
                          '${user['entry_count']} giao dịch · ${user['created_at']}',
                        ),
                        trailing: PopupMenuButton<String>(
                          onSelected: (action) => userAction(
                            Map<String, dynamic>.from(user as Map),
                            action,
                          ),
                          itemBuilder: (_) => const [
                            PopupMenuItem(
                              value: 'suspend',
                              child: Text('Tạm khóa'),
                            ),
                            PopupMenuItem(
                              value: 'restore',
                              child: Text('Mở khóa'),
                            ),
                            PopupMenuItem(
                              value: 'reset_password',
                              child: Text('Gửi email đặt lại mật khẩu'),
                            ),
                            PopupMenuItem(
                              value: 'grant_plus',
                              child: Text('Tặng Plus 30 ngày'),
                            ),
                            PopupMenuItem(
                              value: 'grant_pro',
                              child: Text('Tặng Pro 30 ngày'),
                            ),
                            PopupMenuItem(
                              value: 'grant_free',
                              child: Text('Thu hồi gói ưu đãi'),
                            ),
                          ],
                        ),
                        onTap: () => showLedger(user['id'] as String),
                      ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton(
                          onPressed: page == 0
                              ? null
                              : () {
                                  page--;
                                  reload();
                                },
                          child: const Text('Trang trước'),
                        ),
                        Text('${page + 1}'),
                        TextButton(
                          onPressed: (data!['users'] as List).length < 25
                              ? null
                              : () {
                                  page++;
                                  reload();
                                },
                          child: const Text('Trang sau'),
                        ),
                      ],
                    ),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    const Text(
                      'Thống kê OCR trên thiết bị trong 30 ngày. Không tải ảnh hoặc nội dung hóa đơn vào nhật ký. Thiết bị ngoại tuyến có thể chưa gửi số liệu.',
                    ),
                    for (final row in data!['ocr'] as List)
                      ListTile(
                        title: Text('${row['day']}'),
                        subtitle: Text(
                          '${row['successful']}/${row['scans']} lượt thành công · ${row['average_ms']} ms',
                        ),
                      ),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    FilledButton(
                      onPressed: () => editAd(),
                      child: const Text('Thêm nội dung đối tác'),
                    ),
                    for (final ad in data!['ads'] as List)
                      ListTile(
                        title: Text('${ad['title']}'),
                        subtitle: Text(
                          ad['active'] == true ? 'Đang hiển thị' : 'Đang ẩn',
                        ),
                        onTap: () =>
                            editAd(Map<String, dynamic>.from(ad as Map)),
                      ),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    SwitchListTile(
                      title: const Text('Bảo trì đồng bộ'),
                      subtitle: const Text(
                        'Tạm dừng ghi lên máy chủ. Người dùng vẫn lưu được trên thiết bị.',
                      ),
                      value: maintenance,
                      onChanged: (v) => setState(() => maintenance = v),
                    ),
                    TextField(
                      controller: notice,
                      maxLength: 1000,
                      decoration: const InputDecoration(
                        labelText: 'Thông báo hệ thống',
                      ),
                    ),
                    FilledButton(
                      onPressed: () => performSave(
                        context,
                        () => repository.saveSettings(
                          maintenance,
                          notice.text.trim(),
                        ),
                      ),
                      child: const Text('Lưu cài đặt'),
                    ),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    for (final row in data!['audit'] as List)
                      ListTile(
                        title: Text('${row['action']}'),
                        subtitle: Text(
                          '${row['created_at']} · ${row['target'] ?? ''}',
                        ),
                      ),
                  ],
                ),
              ],
            ),
    ),
  );
}
