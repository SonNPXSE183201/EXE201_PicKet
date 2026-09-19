import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';

class SplitEntryScreen extends StatefulWidget {
  const SplitEntryScreen({
    super.key,
    required this.controller,
    required this.entry,
  });
  final FinanceController controller;
  final Entry entry;
  @override
  State<SplitEntryScreen> createState() => _SplitEntryScreenState();
}

class _SplitRow {
  _SplitRow(this.category, int amount)
    : amount = TextEditingController(text: '$amount');
  String category;
  final TextEditingController amount;
}

class _SplitEntryScreenState extends State<SplitEntryScreen> {
  final form = GlobalKey<FormState>();
  final rows = <_SplitRow>[];
  bool busy = false;
  @override
  void initState() {
    super.initState();
    if (widget.entry.parts.isNotEmpty) {
      rows.addAll(
        widget.entry.parts.map((p) => _SplitRow(p.category, p.amount)),
      );
    } else {
      rows.add(_SplitRow(widget.entry.category, widget.entry.amount));
    }
  }

  @override
  void dispose() {
    for (final row in rows) {
      row.amount.dispose();
    }
    super.dispose();
  }

  int get assigned =>
      rows.fold(0, (sum, r) => sum + (int.tryParse(r.amount.text) ?? 0));
  void equalize() {
    final share = widget.entry.amount ~/ rows.length;
    setState(() {
      for (var i = 0; i < rows.length; i++) {
        rows[i].amount.text =
            '${share + (i == rows.length - 1 ? widget.entry.amount % rows.length : 0)}';
      }
    });
  }

  Future<void> percentages() async {
    final values = List.generate(rows.length, (_) => TextEditingController());
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Phân bổ theo phần trăm'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Nhập tỷ lệ nguyên; tổng phải bằng 100%. Phần cuối nhận số lẻ làm tròn.',
              ),
              for (var i = 0; i < rows.length; i++)
                TextField(
                  controller: values[i],
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: InputDecoration(
                    labelText: rows[i].category,
                    suffixText: '%',
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () {
              final percentages = values
                  .map((v) => int.tryParse(v.text) ?? 0)
                  .toList();
              if (percentages.any((p) => p <= 0) ||
                  percentages.fold(0, (a, b) => a + b) != 100) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Mỗi tỷ lệ phải lớn hơn 0 và tổng bằng 100%.',
                    ),
                  ),
                );
                return;
              }
              var allocated = 0;
              setState(() {
                for (var i = 0; i < rows.length; i++) {
                  final amount = i == rows.length - 1
                      ? widget.entry.amount - allocated
                      : widget.entry.amount * percentages[i] ~/ 100;
                  rows[i].amount.text = '$amount';
                  allocated += amount;
                }
              });
              Navigator.pop(dialogContext);
            },
            child: const Text('Áp dụng'),
          ),
        ],
      ),
    );
    for (final value in values) {
      value.dispose();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Tách danh mục giao dịch')),
    body: SafeArea(
      child: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              widget.entry.title,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            Text(
              'Tổng ${money(widget.entry.amount)} · Còn ${money(widget.entry.amount - assigned)}',
            ),
            const SizedBox(height: 20),
            for (final row in rows)
              Padding(
                key: ValueKey(row),
                padding: const EdgeInsets.only(bottom: 16),
                child: Surface(
                  child: Column(
                    children: [
                      DropdownButtonFormField<String>(
                        initialValue: row.category,
                        items: allCategories(widget.controller.data)
                            .map(
                              (c) => DropdownMenuItem(value: c, child: Text(c)),
                            )
                            .toList(),
                        onChanged: (v) => row.category = v!,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: row.amount,
                        decoration: const InputDecoration(
                          labelText: 'Số tiền',
                          suffixText: 'VND',
                        ),
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        validator: validateMoney,
                        onChanged: (_) => setState(() {}),
                      ),
                      if (rows.length > 1)
                        TextButton(
                          onPressed: () => setState(() {
                            rows.remove(row);
                            row.amount.dispose();
                          }),
                          child: const Text('Bỏ phần này'),
                        ),
                    ],
                  ),
                ),
              ),
            Wrap(
              spacing: 12,
              children: [
                OutlinedButton(
                  onPressed: () => setState(
                    () => rows.add(
                      _SplitRow(allCategories(widget.controller.data).first, 0),
                    ),
                  ),
                  child: const Text('Thêm phần'),
                ),
                OutlinedButton(
                  onPressed: percentages,
                  child: const Text('Theo phần trăm'),
                ),
                OutlinedButton(
                  onPressed: equalize,
                  child: const Text('Chia đều'),
                ),
              ],
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: busy
                  ? null
                  : () async {
                      if (!form.currentState!.validate()) return;
                      if (assigned != widget.entry.amount) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Tổng các phần phải bằng tổng giao dịch.',
                            ),
                          ),
                        );
                        return;
                      }
                      setState(() => busy = true);
                      final ok = await performSave(
                        context,
                        () => widget.controller.saveEntry(
                          widget.entry.copyWith(
                            parts: rows
                                .map(
                                  (r) => EntryPart(
                                    category: r.category,
                                    amount: int.parse(r.amount.text),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                      );
                      if (!context.mounted) return;
                      if (ok) {
                        Navigator.pop(context);
                      } else {
                        setState(() => busy = false);
                      }
                    },
              child: const Text('Lưu phân bổ'),
            ),
          ],
        ),
      ),
    ),
  );
}
