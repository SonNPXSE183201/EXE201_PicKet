import 'package:flutter/material.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';

class EntryTile extends StatelessWidget {
  const EntryTile({super.key, required this.entry, required this.onTap});
  final Entry entry;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final color = entry.type == EntryType.income
        ? PicketColors.income
        : entry.type == EntryType.expense
        ? PicketColors.expense
        : PicketColors.muted;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      leading: CircleAvatar(
        backgroundColor: PicketColors.cream,
        foregroundColor: PicketColors.ink,
        child: Icon(
          entry.type == EntryType.transfer
              ? Icons.swap_horiz
              : categoryIcon(entry.category),
        ),
      ),
      title: Text(
        entry.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        '${entry.category} · ${shortDate(entry.date)}',
        style: const TextStyle(fontSize: 12),
      ),
      trailing: Text(
        '${entry.type == EntryType.income
            ? '+'
            : entry.type == EntryType.expense
            ? '-'
            : ''}${money(entry.amount)}',
        style: TextStyle(color: color, fontWeight: FontWeight.w700),
      ),
      onTap: onTap,
    );
  }
}
