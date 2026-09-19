import 'package:flutter/material.dart';
import '../theme/picket_theme.dart';

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.action, this.onTap});
  final String title;
  final String? action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 24, bottom: 12),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
          ),
        ),
        if (action != null) TextButton(onPressed: onTap, child: Text(action!)),
      ],
    ),
  );
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    required this.description,
    this.icon = Icons.spa_outlined,
    this.action,
    this.onAction,
  });
  final String title, description;
  final IconData icon;
  final String? action;
  final VoidCallback? onAction;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 20),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 34,
          backgroundColor: PicketColors.peach,
          child: Icon(icon, size: 30, color: PicketColors.ink),
        ),
        const SizedBox(height: 16),
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Text(
          description,
          textAlign: TextAlign.center,
          style: const TextStyle(color: PicketColors.muted, height: 1.5),
        ),
        if (action != null)
          Padding(
            padding: const EdgeInsets.only(top: 18),
            child: FilledButton(onPressed: onAction, child: Text(action!)),
          ),
      ],
    ),
  );
}

class Surface extends StatelessWidget {
  const Surface({super.key, required this.child, this.color});
  final Widget child;
  final Color? color;
  @override
  Widget build(BuildContext context) => Card(
    color: color,
    child: Padding(padding: const EdgeInsets.all(20), child: child),
  );
}

Future<bool> confirmDelete(BuildContext context, String description) async =>
    await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xoá dữ liệu này?'),
        content: Text(description),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Giữ lại'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xoá'),
          ),
        ],
      ),
    ) ??
    false;
Future<bool> performSave(
  BuildContext context,
  Future<void> Function() action,
) async {
  try {
    await action();
    return true;
  } catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is ArgumentError
                ? error.message.toString()
                : 'Chưa lưu được thay đổi. Vui lòng thử lại.',
          ),
        ),
      );
    }
    return false;
  }
}

IconData categoryIcon(String category) => switch (category) {
  'Ăn uống' => Icons.restaurant_rounded,
  'Mua sắm' => Icons.shopping_bag_outlined,
  'Di chuyển' => Icons.directions_bus_outlined,
  'Nhà ở' => Icons.home_outlined,
  'Hoá đơn' => Icons.receipt_long_outlined,
  'Giải trí' => Icons.headphones_outlined,
  'Sức khoẻ' => Icons.favorite_outline,
  'Giáo dục' => Icons.school_outlined,
  'Lương' => Icons.work_outline,
  _ => Icons.category_outlined,
};
