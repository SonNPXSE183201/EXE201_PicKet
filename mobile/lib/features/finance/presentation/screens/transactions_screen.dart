import '../../domain/usecases/finance_actions.dart';
import 'package:flutter/material.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../state/finance_controller.dart';
import '../widgets/entry_tile.dart';
import 'entry_detail_screen.dart';
import 'entry_form_screen.dart';
import 'activity_tools_screen.dart';
import 'reconcile_screen.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({
    super.key,
    required this.controller,
    this.walletId,
    this.category,
    this.month,
  });
  final FinanceController controller;
  final String? walletId, category;
  final DateTime? month;
  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  String query = '';
  EntryType? filter;
  @override
  Widget build(BuildContext context) {
    final entries =
        widget.controller.data.entries
            .where(
              (e) =>
                  (widget.walletId == null ||
                      e.walletId == widget.walletId ||
                      e.destinationId == widget.walletId) &&
                  (widget.month == null || inMonth(e.date, widget.month!)) &&
                  (widget.category == null ||
                      categoryAmount(e, widget.category!) != 0) &&
                  (filter == null || e.type == filter) &&
                  '${e.title} ${e.category} ${e.note}'.toLowerCase().contains(
                    query.toLowerCase(),
                  ),
            )
            .toList()
          ..sort((a, b) => b.date.compareTo(a.date));
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Dòng tiền của bạn',
          style: TextStyle(fontSize: 27, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const Text('Từng khoản nhỏ, một bức tranh rõ hơn.'),
        Wrap(
          spacing: 8,
          children: [
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) =>
                      BulkEntriesScreen(controller: widget.controller),
                ),
              ),
              child: const Text('Hàng loạt'),
            ),
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) =>
                      ReconcileScreen(controller: widget.controller),
                ),
              ),
              child: const Text('Đối soát'),
            ),
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) =>
                      ReviewInboxScreen(controller: widget.controller),
                ),
              ),
              child: const Text('Cần kiểm tra'),
            ),
          ],
        ),
        const SizedBox(height: 22),
        TextField(
          decoration: const InputDecoration(
            hintText: 'Tìm giao dịch, danh mục, ghi chú',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (v) => setState(() => query = v),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          children: [
            ChoiceChip(
              label: const Text('Tất cả'),
              selected: filter == null,
              onSelected: (_) => setState(() => filter = null),
            ),
            for (final type in EntryType.values)
              ChoiceChip(
                label: Text(switch (type) {
                  EntryType.expense => 'Chi tiêu',
                  EntryType.income => 'Thu nhập',
                  EntryType.transfer => 'Chuyển ví',
                }),
                selected: filter == type,
                onSelected: (_) => setState(() => filter = type),
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (entries.isEmpty)
          EmptyState(
            title: 'Chưa có giao dịch phù hợp',
            description: 'Thử thay đổi bộ lọc hoặc ghi lại khoản đầu tiên.',
            icon: Icons.swap_horiz,
            action: 'Thêm giao dịch',
            onAction: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => EntryFormScreen(controller: widget.controller),
              ),
            ),
          )
        else
          Card(
            child: Column(
              children: entries
                  .map(
                    (e) => EntryTile(
                      entry: e,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => EntryDetailScreen(
                            controller: widget.controller,
                            id: e.id,
                          ),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
        const SizedBox(height: 90),
      ],
    );
  }
}
