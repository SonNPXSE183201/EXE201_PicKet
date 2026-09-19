import '../../domain/usecases/category_actions.dart';
import 'package:flutter/material.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';
import 'entry_detail_screen.dart';

class BulkEntriesScreen extends StatefulWidget {
  const BulkEntriesScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<BulkEntriesScreen> createState() => _BulkEntriesScreenState();
}

class _BulkEntriesScreenState extends State<BulkEntriesScreen> {
  final selected = <String>{};
  String? category;
  bool busy = false;
  Future<void> apply(bool delete) async {
    if (selected.isEmpty || (!delete && category == null)) return;
    if (delete &&
        !await confirmDelete(
          context,
          'Xoá ${selected.length} giao dịch đã chọn?',
        )) {
      return;
    }
    if (!mounted) return;
    setState(() => busy = true);
    final ok = await performSave(
      context,
      () => widget.controller.update((data) {
        var next = data;
        for (final id in selected) {
          if (delete) {
            next = widget.controller.actions.removeEntry(next, id);
          } else {
            final entry = next.entries.firstWhere((e) => e.id == id);
            next = widget.controller.actions.upsertEntry(
              next,
              entry.copyWith(category: category, parts: const []),
            );
          }
        }
        return next;
      }),
    );
    if (mounted) {
      setState(() {
        busy = false;
        if (ok) selected.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text('Đã chọn ${selected.length}')),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          DropdownButtonFormField<String>(
            initialValue: category,
            decoration: const InputDecoration(labelText: 'Đổi sang danh mục'),
            items: allCategories(
              widget.controller.data,
            ).map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
            onChanged: (v) => setState(() => category = v),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            children: [
              FilledButton(
                onPressed: busy ? null : () => apply(false),
                child: const Text('Đổi danh mục'),
              ),
              OutlinedButton(
                onPressed: busy ? null : () => apply(true),
                child: const Text('Xoá đã chọn'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          for (final e in widget.controller.data.entries)
            CheckboxListTile(
              value: selected.contains(e.id),
              title: Text(e.title),
              subtitle: Text('${money(e.amount)} · ${shortDate(e.date)}'),
              onChanged: busy
                  ? null
                  : (v) => setState(() {
                      if (v == true) {
                        selected.add(e.id);
                      } else {
                        selected.remove(e.id);
                      }
                    }),
            ),
        ],
      ),
    ),
  );
}

class ReviewInboxScreen extends StatelessWidget {
  const ReviewInboxScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Hộp thư cần kiểm tra')),
    body: ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final entries = controller.data.entries;
        final flagged = entries
            .where(
              (e) =>
                  e.category == 'Khác' ||
                  entries.any(
                    (other) =>
                        other.id != e.id &&
                        other.title.toLowerCase() == e.title.toLowerCase() &&
                        other.amount == e.amount &&
                        other.walletId == e.walletId &&
                        other.date.difference(e.date).abs() <
                            const Duration(days: 1),
                  ),
            )
            .toList();
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (flagged.isEmpty)
              const EmptyState(
                title: 'Mọi thứ đã gọn gàng',
                description:
                    'Không có giao dịch chưa phân loại hoặc nghi trùng.',
              ),
            for (final entry in flagged)
              ListTile(
                leading: const Icon(Icons.rule_folder_outlined),
                title: Text(entry.title),
                subtitle: Text(
                  entry.category == 'Khác'
                      ? 'Cần phân loại'
                      : 'Nghi trùng · kiểm tra trước khi xoá',
                ),
                trailing: Text(money(entry.amount)),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) =>
                        EntryDetailScreen(controller: controller, id: entry.id),
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  Future<void> rename(String category) async {
    final value = TextEditingController(text: category);
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đổi tên danh mục'),
        content: TextField(
          controller: value,
          maxLength: 80,
          decoration: const InputDecoration(labelText: 'Tên danh mục'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    if (accepted == true && mounted) {
      await performSave(
        context,
        () => widget.controller.update(
          (data) => renameCategory(data, category, value.text),
        ),
      );
    }
    value.dispose();
  }

  final name = TextEditingController();
  @override
  void dispose() {
    name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Danh mục')),
    body: ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Danh mục mới'),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: widget.controller.saving
                ? null
                : () async {
                    final value = name.text.trim();
                    if (value.isEmpty) return;
                    final ok = await performSave(
                      context,
                      () => widget.controller.update((data) {
                        if (allCategories(
                          data,
                        ).any((c) => c.toLowerCase() == value.toLowerCase())) {
                          throw ArgumentError('Danh mục đã tồn tại.');
                        }
                        return data.copyWith(
                          customCategories: [...data.customCategories, value],
                        );
                      }),
                    );
                    if (ok) name.clear();
                  },
            child: const Text('Thêm danh mục'),
          ),
          const SizedBox(height: 20),
          for (final category in allCategories(widget.controller.data))
            ListTile(
              leading: Icon(categoryIcon(category)),
              title: Text(category),
              trailing: categories.contains(category)
                  ? null
                  : PopupMenuButton<String>(
                      onSelected: (action) async {
                        if (action == 'rename') {
                          await rename(category);
                          return;
                        }
                        if (await confirmDelete(context, 'Xóa danh mục này?') &&
                            context.mounted) {
                          await performSave(
                            context,
                            () => widget.controller.update(
                              (data) => deleteCategory(data, category),
                            ),
                          );
                        }
                      },
                      itemBuilder: (_) => const [
                        PopupMenuItem(value: 'rename', child: Text('Đổi tên')),
                        PopupMenuItem(value: 'delete', child: Text('Xóa')),
                      ],
                    ),
              subtitle: Text(
                categories.contains(category)
                    ? 'Danh mục mặc định'
                    : 'Danh mục của bạn',
              ),
            ),
        ],
      ),
    ),
  );
}
