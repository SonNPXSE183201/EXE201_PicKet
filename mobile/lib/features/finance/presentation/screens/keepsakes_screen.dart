import 'package:share_plus/share_plus.dart';
import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../state/finance_controller.dart';
import 'keepsake_form_screen.dart';

class KeepsakesScreen extends StatefulWidget {
  const KeepsakesScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<KeepsakesScreen> createState() => _KeepsakesScreenState();
}

class _KeepsakesScreenState extends State<KeepsakesScreen> {
  FinanceController get controller => widget.controller;
  String query = '';
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Bộ sưu tập'),
      actions: [
        IconButton(
          tooltip: 'Thêm món đồ',
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute<void>(
              builder: (_) => KeepsakeFormScreen(controller: controller),
            ),
          ),
          icon: const Icon(Icons.add),
        ),
      ],
    ),
    body: ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final items =
            controller.data.keepsakes
                .where(
                  (item) => '${item.title} ${item.note} ${item.category}'
                      .toLowerCase()
                      .contains(query.toLowerCase()),
                )
                .toList()
              ..sort((a, b) => b.date.compareTo(a.date));
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'Những điều mình yêu',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            const Text('Một món đồ. Một câu chuyện. Chỉ riêng bạn.'),
            const SizedBox(height: 24),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Tìm món đồ, danh mục, ghi chú',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (value) => setState(() => query = value),
            ),
            const SizedBox(height: 16),
            if (items.isEmpty)
              const EmptyState(
                title: 'Góc kỷ niệm còn trống',
                description: 'Chụp một món đồ hoặc thêm câu chuyện đầu tiên.',
                icon: Icons.photo_album_outlined,
              ),
            for (final item in items)
              Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (item.photoPath != null)
                        Image.file(
                          File(item.photoPath!),
                          height: 230,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const SizedBox(
                            height: 120,
                            child: Center(
                              child: Icon(Icons.broken_image_outlined),
                            ),
                          ),
                        )
                      else
                        Container(
                          height: 120,
                          color: PicketColors.peach,
                          alignment: Alignment.center,
                          child: const Icon(
                            Icons.shopping_bag_outlined,
                            size: 52,
                            color: PicketColors.mauve,
                          ),
                        ),
                      Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: const TextStyle(
                                fontSize: 21,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${money(item.amount)} · ${shortDate(item.date)}',
                              style: const TextStyle(color: PicketColors.muted),
                            ),
                            Text(item.category),
                            if (item.returnUntil != null)
                              Text(
                                'Đổi trả đến ${shortDate(item.returnUntil!)}',
                              ),
                            if (item.warrantyUntil != null)
                              Text(
                                'Bảo hành đến ${shortDate(item.warrantyUntil!)}',
                              ),
                            if (item.note.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: Text(item.note),
                              ),
                            Row(
                              children: [
                                const Icon(Icons.lock_outline, size: 14),
                                const SizedBox(width: 6),
                                const Expanded(
                                  child: Text(
                                    'Chỉ mình tôi',
                                    style: TextStyle(fontSize: 12),
                                  ),
                                ),
                                IconButton(
                                  tooltip: 'Chia sẻ món đồ',
                                  onPressed: () =>
                                      performSave(context, () async {
                                        await SharePlus.instance.share(
                                          ShareParams(
                                            text: '${item.title}\n${item.note}',
                                            files: item.photoPath == null
                                                ? null
                                                : [XFile(item.photoPath!)],
                                          ),
                                        );
                                      }),
                                  icon: const Icon(Icons.share_outlined),
                                ),
                                IconButton(
                                  tooltip: 'Sửa món đồ',
                                  onPressed: () => Navigator.push(
                                    context,
                                    MaterialPageRoute<void>(
                                      builder: (_) => KeepsakeFormScreen(
                                        controller: controller,
                                        keepsake: item,
                                      ),
                                    ),
                                  ),
                                  icon: const Icon(Icons.edit_outlined),
                                ),
                                IconButton(
                                  tooltip: 'Xoá món đồ',
                                  onPressed: () async {
                                    if (!await confirmDelete(
                                      context,
                                      'Xoá món đồ khỏi bộ sưu tập?',
                                    )) {
                                      return;
                                    }
                                    if (context.mounted) {
                                      await performSave(
                                        context,
                                        () => controller.update(
                                          (data) => data.copyWith(
                                            keepsakes: data.keepsakes
                                                .where((i) => i.id != item.id)
                                                .toList(),
                                          ),
                                        ),
                                      );
                                    }
                                  },
                                  icon: const Icon(Icons.delete_outline),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}
